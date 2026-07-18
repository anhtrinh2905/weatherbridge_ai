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
  username: string;
}

export const DEMO_PASSWORD = "Demo@12345";

// Display label per role comes from the i18n `role.*` catalog (shared/i18n/useLocalizedLabels)
// so the demo picker translates along with the rest of the UI.
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "admin", username: "admin@weather-bridge.local" },
  { role: "commune_officer", username: "canbo@weather-bridge.local" },
  { role: "village_head", username: "truongban@weather-bridge.local" },
  { role: "resident", username: "dan@weather-bridge.local" },
];
