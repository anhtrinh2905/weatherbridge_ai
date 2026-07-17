import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Keycloak, { type KeycloakInstance } from "keycloak-js";

export interface AuthUser {
  id: string;
  email?: string;
  displayName: string;
  username?: string;
  emailVerified: boolean;
  roles: string[];
}

interface AuthContextValue {
  keycloak: KeycloakInstance;
  initialized: boolean;
  authenticated: boolean;
  user: AuthUser | null;
  login: () => Promise<void>;
  register: () => Promise<void>;
  recoverPassword: () => Promise<void>;
  logout: () => Promise<void>;
}

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080",
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "vai-code",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "vai-code-fe",
});

let initialization: Promise<boolean> | undefined;
const AUTH_INIT_TIMEOUT_MS = 5_000;

function initializeKeycloak() {
  initialization ??= Promise.race([
    keycloak.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      checkLoginIframe: false,
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    }),
    new Promise<boolean>((resolve) => {
      window.setTimeout(() => resolve(false), AUTH_INIT_TIMEOUT_MS);
    }),
  ]);
  return initialization;
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
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
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
  }, []);

  const value: AuthContextValue = {
    keycloak,
    initialized,
    authenticated,
    user,
    login: async () => { await keycloak.login({ redirectUri: window.location.href }); },
    register: async () => { await keycloak.register({ redirectUri: `${window.location.origin}/workspace` }); },
    recoverPassword: async () => { await keycloak.login({ action: "UPDATE_PASSWORD", redirectUri: window.location.href }); },
    logout: async () => { await keycloak.logout({ redirectUri: window.location.origin }); },
  };

  if (!initialized) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">Connecting to identity provider...</div>;
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
