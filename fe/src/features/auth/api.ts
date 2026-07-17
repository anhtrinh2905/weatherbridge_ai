import { apiClient } from "../../shared/lib/api-client";

export interface IdentityConfig {
  url: string;
  realm: string;
  client_id: string;
  issuer: string;
}

export function getIdentityConfig() {
  return apiClient.get<IdentityConfig>("/auth/config");
}
