import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Keycloak, { type KeycloakInstance } from "keycloak-js";
import { useLocation, useNavigate } from "react-router-dom";
import { DEMO_PASSWORD } from "./demoAccounts";

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
  /** Demo-only: signs in as a seeded account with zero user interaction (see demoAccounts.ts). */
  loginAsDemo: (username: string) => Promise<void>;
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

/** Minimal base64url JWT payload decode — avoids adding a jwt-decode dependency for this one path. */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join(""),
  );
  return JSON.parse(json) as Record<string, unknown>;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
}

/**
 * Demo-only: Resource Owner Password Credentials grant against Keycloak's token endpoint,
 * called directly from the browser (no redirect, no password prompt). This requires
 * `directAccessGrantsEnabled: true` on the public client (see infra/keycloak/realm-export.json)
 * — a deliberate relaxation of the "Authorization Code + PKCE only" posture documented in
 * ARCHITECTURE-SPINE.md, scoped to a convenience shortcut for the 4 seeded demo accounts whose
 * password is already shown in the UI. Do not reuse this path for real user credentials.
 */
async function fetchDemoTokens(username: string): Promise<TokenResponse> {
  const authUrl = (import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080").replace(/\/$/, "");
  const realm = import.meta.env.VITE_KEYCLOAK_REALM ?? "weather-bridge";
  const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "weather-bridge-fe";

  const res = await fetch(`${authUrl}/realms/${realm}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: clientId,
      username,
      password: DEMO_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`Demo login failed (${res.status})`);
  return (await res.json()) as TokenResponse;
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
  const navigate = useNavigate();
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
    loginAsDemo: async (username: string) => {
      const tokens = await fetchDemoTokens(username);

      if (keycloak.didInitialize) {
        keycloak.token = tokens.access_token;
        keycloak.refreshToken = tokens.refresh_token;
        keycloak.idToken = tokens.id_token;
        keycloak.tokenParsed = decodeJwtPayload(tokens.access_token);
        keycloak.authenticated = true;
      } else {
        initialization = keycloak
          .init({
            token: tokens.access_token,
            refreshToken: tokens.refresh_token,
            idToken: tokens.id_token,
            pkceMethod: "S256",
            checkLoginIframe: false,
          })
          .catch(() => false);
        await initialization;
      }

      setAuthenticated(true);
      setUser(mapUser());
      setInitialized(true);
      navigate("/workspace");
    },
    register: async () => {
      navigate("/login");
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
