import type { Role } from "../../shared/domain/types";

/**
 * Seeded demo accounts shown on the login page as hints. Clicking one redirects to
 * Keycloak's Authorization Code + PKCE login with the username prefilled via `login_hint`;
 * the user still types the password themselves on the Keycloak form. No password grant
 * and no browser-side token exchange is involved — `DEMO_PASSWORD` is displayed only so
 * reviewers can copy it into the Keycloak form during local demos.
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
