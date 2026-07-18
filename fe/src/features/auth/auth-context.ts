import { createContext, useContext } from "react";
import Keycloak, { type KeycloakInstance } from "keycloak-js";

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

export interface AuthContextValue {
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

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
