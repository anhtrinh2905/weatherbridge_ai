import type { HazardType, Occupation, Role, Tier, VulnerabilityReason } from "../domain/types";
import { useTranslation } from "./I18nProvider";

export interface LocalizedLabels {
  hazardType: Record<HazardType, string>;
  hazardLevel: Record<1 | 2 | 3 | 4 | 5, string>;
  tier: Record<Tier, string>;
  occupation: Record<Occupation, string>;
  vulnerability: Record<VulnerabilityReason, string>;
  role: Record<Role, string>;
}

const HAZARD_TYPES: HazardType[] = ["flash_flood", "landslide"];
const HAZARD_LEVELS = [1, 2, 3, 4, 5] as const;
const TIERS: Tier[] = ["prepare", "go_now"];
const OCCUPATIONS: Occupation[] = ["nong_dan", "chan_nuoi", "tai_xe", "giao_vien", "khong_co"];
const VULNERABILITIES: VulnerabilityReason[] = [
  "gia_neo_don",
  "khong_dien_thoai",
  "mu_chu",
  "sat_vung_nguy_co",
];
const ROLES: Role[] = ["admin", "commune_officer", "village_head", "resident"];

function buildRecord<T extends string>(
  keys: readonly T[],
  t: (key: string) => string,
  prefix: string,
): Record<T, string> {
  return Object.fromEntries(keys.map((key) => [key, t(`${prefix}.${key}`)])) as Record<T, string>;
}

/** Locale-aware replacements for the Record<Enum,string> dictionaries in shared/domain/labels.ts. */
export function useLocalizedLabels(): LocalizedLabels {
  const { t } = useTranslation();
  return {
    hazardType: buildRecord(HAZARD_TYPES, t, "hazardType"),
    hazardLevel: Object.fromEntries(
      HAZARD_LEVELS.map((level) => [level, t(`hazardLevel.${level}`)]),
    ) as Record<1 | 2 | 3 | 4 | 5, string>,
    tier: buildRecord(TIERS, t, "tier"),
    occupation: buildRecord(OCCUPATIONS, t, "occupation"),
    vulnerability: buildRecord(VULNERABILITIES, t, "vulnerability"),
    role: buildRecord(ROLES, t, "role"),
  };
}
