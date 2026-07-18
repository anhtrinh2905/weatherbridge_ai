import type { Role } from "../../shared/domain/types";

/**
 * Demo-only shortcut for the 4 seeded accounts in infra/keycloak/realm-export.json. All 4 share
 * the same password so the login screen can pre-fill the username via Keycloak's `login_hint`
 * and the user only has to type the password once. This intentionally does NOT bypass OIDC
 * Authorization Code + PKCE (the client keeps directAccessGrantsEnabled: false) — it is a UX
 * shortcut on top of the same redirect flow, not a second auth path.
 */
export interface DemoAccount {
  role: Role;
  label: string;
  username: string;
}

export const DEMO_PASSWORD = "Demo@12345";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "admin", label: "Admin", username: "admin@weather-bridge.local" },
  { role: "commune_officer", label: "Cán bộ PCTT xã", username: "canbo@weather-bridge.local" },
  { role: "village_head", label: "Trưởng bản", username: "truongban@weather-bridge.local" },
  { role: "resident", label: "Người dân", username: "dan@weather-bridge.local" },
];
