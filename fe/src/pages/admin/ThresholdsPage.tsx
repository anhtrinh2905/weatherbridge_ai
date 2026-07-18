import { useState } from "react";
import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { Alert } from "../../shared/ui/Alert";
import { Button } from "../../shared/ui/Button";
import { THRESHOLDS } from "../../shared/domain/mockData";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { useLocalizedLabels } from "../../shared/i18n/useLocalizedLabels";
import type { ThresholdConfig } from "../../shared/domain/types";

export function AdminThresholdsPage() {
  const { t } = useTranslation();
  const labels = useLocalizedLabels();
  const [config, setConfig] = useState<ThresholdConfig[]>(THRESHOLDS);
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <PageHeader
        eyebrow={t("role.admin")}
        title={t("admin.thresholds.title")}
        description={t("admin.thresholds.description")}
      />

      <Alert variant="info">
        {t("admin.thresholds.alertPart1")} <strong>{t("admin.thresholds.alertOperating")}</strong>{" "}
        {t("admin.thresholds.alertPart2")} <code>ai/</code>
        {t("admin.thresholds.alertPart3")}
      </Alert>

      <Card className="mt-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted">
              <th className="pb-2">{t("admin.thresholds.colHazardType")}</th>
              <th className="pb-2">{t("admin.thresholds.colScope")}</th>
              <th className="pb-2">{t("admin.thresholds.colGoNowLevel")}</th>
              <th className="pb-2">{t("admin.thresholds.colNote")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {config.map((cfg, idx) => (
              <tr key={`${cfg.hazardType}-${cfg.villageId}`}>
                <td className="py-3 text-fg">{labels.hazardType[cfg.hazardType]}</td>
                <td className="py-3 text-muted">
                  {cfg.villageId === "all" ? t("admin.thresholds.wholeCommune") : cfg.villageId}
                </td>
                <td className="py-3">
                  <select
                    value={cfg.levelToTierCut}
                    onChange={(e) => {
                      const next = [...config];
                      next[idx] = { ...cfg, levelToTierCut: Number(e.target.value) };
                      setConfig(next);
                      setSaved(false);
                    }}
                    className="min-h-9 rounded-lg border border-border-strong bg-surface px-2 text-sm text-fg"
                  >
                    {[2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {t("admin.thresholds.levelOption", { level: n })}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 text-xs text-muted">{cfg.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={() => setSaved(true)}>{t("admin.thresholds.save")}</Button>
          {saved && <span className="text-sm text-positive">{t("admin.thresholds.savedMock")}</span>}
        </div>
      </Card>
    </div>
  );
}
