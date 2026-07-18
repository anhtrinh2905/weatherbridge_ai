import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DEMO_PASSWORD } from "./demoAccounts";
import { AuthContext, type AuthContextValue, type AuthUser, keycloak } from "./auth-context";

function hasAuthCallback() {
  return /(?:^|[&#])(code|error|state)=/.test(window.location.hash);
}

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

let initialization: Promise<boolean> | undefined;

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
    displayName:
      (claims.name as string | undefined) ??
      (claims.preferred_username as string | undefined) ??
      claims.sub,
    username: claims.preferred_username as string | undefined,
    emailVerified: Boolean(claims.email_verified),
    roles: [...new Set([...realmRoles, ...clientRoles])],
    villageId: claims.village_id as string | undefined,
  };
}

function initialize() {
  initialization ??= keycloak
    .init({
      pkceMethod: "S256",
      checkLoginIframe: false,
    })
    .catch(() => false);
  return initialization;
}

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
    void initialize()
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
      await initialize();
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
      await initialize();
      await keycloak.register({ redirectUri: `${window.location.origin}/workspace` });
    },
    recoverPassword: async () => {
      await initialize();
      await keycloak.login({ action: "UPDATE_PASSWORD", redirectUri: window.location.href });
    },
    logout: async () => {
      await initialize();
      await keycloak.logout({ redirectUri: window.location.origin });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
