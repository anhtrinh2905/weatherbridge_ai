import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Keycloak, { type KeycloakInstance } from "keycloak-js";
import { useLocation } from "react-router-dom";

export interface AuthUser {
  id: string;
  email?: string;
  displayName: string;
  username?: string;
  emailVerified: boolean;
  roles: string[];
  /** Assigned village scope for village_head/resident roles (from the village_id token claim). */
  villageId?: string;
}

interface AuthContextValue {
  keycloak: KeycloakInstance;
  initialized: boolean;
  authenticated: boolean;
  user: AuthUser | null;
  login: (loginHint?: string) => Promise<void>;
  register: () => Promise<void>;
  recoverPassword: () => Promise<void>;
  logout: () => Promise<void>;
}

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080",
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "weather-bridge",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "weather-bridge-fe",
});

let initialization: Promise<boolean> | undefined;

function initializeKeycloak() {
  initialization ??= keycloak
    .init({
      pkceMethod: "S256",
      checkLoginIframe: false,
    })
    .catch(() => false);
  return initialization;
}

function hasAuthCallback() {
  return /(?:^|[&#])(code|error|state)=/.test(window.location.hash);
}

function mapUser(): AuthUser | null {
  const claims = keycloak.tokenParsed;
  if (!claims?.sub) return null;
  const realmRoles = (claims.realm_access as { roles?: string[] } | undefined)?.roles ?? [];
  const resourceAccess = claims.resource_access as Record<string, { roles?: string[] }> | undefined;
  const clientRoles = keycloak.clientId ? resourceAccess?.[keycloak.clientId]?.roles ?? [] : [];
  return {
    id: claims.sub,
    email: claims.email as string | undefined,
    displayName: (claims.name as string | undefined) ?? (claims.preferred_username as string | undefined) ?? claims.sub,
    username: claims.preferred_username as string | undefined,
    emailVerified: Boolean(claims.email_verified),
    roles: [...new Set([...realmRoles, ...clientRoles])],
    villageId: claims.village_id as string | undefined,
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (location.pathname !== "/workspace" && !hasAuthCallback()) return;

    let mounted = true;
    keycloak.onTokenExpired = async () => {
      try {
        await keycloak.updateToken(30);
        if (mounted) setUser(mapUser());
      } catch {
        if (mounted) {
          setAuthenticated(false);
          setUser(null);
        }
      }
    };
    void initializeKeycloak()
      .then((isAuthenticated) => {
        if (!mounted) return;
        setAuthenticated(isAuthenticated);
        setUser(isAuthenticated ? mapUser() : null);
        setInitialized(true);
      })
      .catch(() => {
        if (mounted) setInitialized(true);
      });
    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  const value: AuthContextValue = {
    keycloak,
    initialized,
    authenticated,
    user,
    login: async (loginHint?: string) => {
      await initializeKeycloak();
      await keycloak.login({ redirectUri: `${window.location.origin}/workspace`, loginHint });
    },
    register: async () => {
      await initializeKeycloak();
      await keycloak.register({ redirectUri: `${window.location.origin}/workspace` });
    },
    recoverPassword: async () => {
      await initializeKeycloak();
      await keycloak.login({ action: "UPDATE_PASSWORD", redirectUri: window.location.href });
    },
    logout: async () => {
      await initializeKeycloak();
      await keycloak.logout({ redirectUri: window.location.origin });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
