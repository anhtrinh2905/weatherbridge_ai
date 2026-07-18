import {
  AlertTriangle,
  ClipboardList,
  FileWarning,
  GitBranch,
  Mountain,
  Radio,
  Users,
  type LucideIcon,
} from "lucide-react";

// Text lives in the i18n catalog (shared/i18n/locales/*.json) under the keys referenced below —
// these are data-shape + translation-key tables, not the translated strings themselves. Icons and
// place names (proper nouns — not translated, same convention as shared/domain data) stay literal.

export type Metric = {
  value: string;
  labelKey: string;
};

export type Pillar = {
  index: string;
  titleKey: string;
  textKey: string;
};

export type ProblemPoint = {
  icon: LucideIcon;
  titleKey: string;
  textKey: string;
};

export type Differentiator = {
  icon: LucideIcon;
  titleKey: string;
  textKey: string;
};

export type ScenarioTab = {
  id: string;
  label: string;
  elevation: string;
  hazardKey: string;
  descriptionKey: string;
  temperature?: string;
  confidenceKey?: string;
};

export type RoleView = {
  categoryKey: string;
  nameKey: string;
  descriptionKey: string;
  specKeys: [string, string, string];
};

export const heroMetrics: Metric[] = [
  { value: "5", labelKey: "landing.metric.1.label" },
  { value: "±300m", labelKey: "landing.metric.2.label" },
  { value: "15/30′", labelKey: "landing.metric.3.label" },
];

export const heroPillars: Pillar[] = [
  { index: "01", titleKey: "landing.pillar.1.title", textKey: "landing.pillar.1.text" },
  { index: "02", titleKey: "landing.pillar.2.title", textKey: "landing.pillar.2.text" },
  { index: "03", titleKey: "landing.pillar.3.title", textKey: "landing.pillar.3.text" },
];

export const problemPoints: ProblemPoint[] = [
  { icon: Mountain, titleKey: "landing.problem.1.title", textKey: "landing.problem.1.text" },
  { icon: FileWarning, titleKey: "landing.problem.2.title", textKey: "landing.problem.2.text" },
  { icon: Users, titleKey: "landing.problem.3.title", textKey: "landing.problem.3.text" },
];

export const differentiators: Differentiator[] = [
  { icon: Mountain, titleKey: "landing.differentiator.1.title", textKey: "landing.differentiator.1.text" },
  { icon: AlertTriangle, titleKey: "landing.differentiator.2.title", textKey: "landing.differentiator.2.text" },
  { icon: GitBranch, titleKey: "landing.differentiator.3.title", textKey: "landing.differentiator.3.text" },
  { icon: Users, titleKey: "landing.differentiator.4.title", textKey: "landing.differentiator.4.text" },
  { icon: ClipboardList, titleKey: "landing.differentiator.5.title", textKey: "landing.differentiator.5.text" },
  { icon: Radio, titleKey: "landing.differentiator.6.title", textKey: "landing.differentiator.6.text" },
];

export const scenarioTabs: ScenarioTab[] = [
  {
    id: "dien-bien-phu",
    label: "TP. Điện Biên Phủ",
    elevation: "~490m",
    hazardKey: "landing.scenario.dien-bien-phu.hazard",
    descriptionKey: "landing.scenario.dien-bien-phu.description",
  },
  {
    id: "muong-lay",
    label: "Mường Lay",
    elevation: "~250m",
    hazardKey: "landing.scenario.muong-lay.hazard",
    descriptionKey: "landing.scenario.muong-lay.description",
  },
  {
    id: "pha-din",
    label: "Đèo Pha Đin / Tuần Giáo",
    elevation: "~1.500m",
    hazardKey: "landing.scenario.pha-din.hazard",
    descriptionKey: "landing.scenario.pha-din.description",
  },
  {
    id: "tua-chua",
    label: "Tủa Chùa",
    elevation: "~1.400m",
    hazardKey: "landing.scenario.tua-chua.hazard",
    descriptionKey: "landing.scenario.tua-chua.description",
    temperature: "2°C",
    confidenceKey: "landing.scenario.tua-chua.confidence",
  },
  {
    id: "muong-nhe",
    label: "Mường Nhé",
    elevation: "600–1.800m",
    hazardKey: "landing.scenario.muong-nhe.hazard",
    descriptionKey: "landing.scenario.muong-nhe.description",
  },
];

export const roleViews: RoleView[] = [
  {
    categoryKey: "landing.role.1.category",
    nameKey: "landing.role.1.name",
    descriptionKey: "landing.role.1.description",
    specKeys: ["landing.role.1.spec1", "landing.role.1.spec2", "landing.role.1.spec3"],
  },
  {
    categoryKey: "landing.role.2.category",
    nameKey: "landing.role.2.name",
    descriptionKey: "landing.role.2.description",
    specKeys: ["landing.role.2.spec1", "landing.role.2.spec2", "landing.role.2.spec3"],
  },
  {
    categoryKey: "landing.role.3.category",
    nameKey: "landing.role.3.name",
    descriptionKey: "landing.role.3.description",
    specKeys: ["landing.role.3.spec1", "landing.role.3.spec2", "landing.role.3.spec3"],
  },
];

export const coverageLocations = [
  { name: "TP. Điện Biên Phủ", elevation: "~490m" },
  { name: "Mường Lay", elevation: "~250m" },
  { name: "Đèo Pha Đin / Tuần Giáo", elevation: "~1.500m" },
  { name: "Tủa Chùa", elevation: "~1.400m" },
  { name: "Mường Nhé", elevation: "600–1.800m" },
];
