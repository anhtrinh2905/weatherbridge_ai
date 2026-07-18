import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { Alert } from "../../shared/ui/Alert";
import { BACKTEST_REPORT_MOCK, HAZARD_RUN_MOCK } from "../../shared/domain/mockData";
import { useTranslation } from "../../shared/i18n/I18nProvider";

export function AdminCalibrationPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader
        eyebrow={t("role.admin")}
        title={t("admin.calibration.title")}
        description={t("admin.calibration.description")}
      />

      <Card>
        <p className="text-sm font-semibold text-fg-strong">{t("admin.calibration.pinnedArtifact")}</p>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">{t("admin.calibration.featureStackVersion")}</dt>
            <dd className="font-mono text-fg">{HAZARD_RUN_MOCK.featureStackVersion}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t("admin.calibration.calibrationVersion")}</dt>
            <dd className="font-mono text-fg">{HAZARD_RUN_MOCK.calibrationVersion}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-5 text-muted-2">
          {t("admin.calibration.readOnlyNotePart1")} <code>ai/</code>
          {t("admin.calibration.readOnlyNotePart2")}
        </p>
      </Card>

      <Card className="mt-4">
        <p className="text-sm font-semibold text-fg-strong">
          {t("admin.calibration.backtestPrefix", { event: BACKTEST_REPORT_MOCK.event })}
        </p>
        <Alert variant="info">{t("admin.calibration.internalEvalNotice")}</Alert>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-muted">{t("admin.calibration.recall")}</dt>
            <dd className="text-2xl font-bold text-positive">{Math.round(BACKTEST_REPORT_MOCK.recallAtTau * 100)}%</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t("admin.calibration.falsePositiveRate")}</dt>
            <dd className="text-2xl font-bold text-accent">{Math.round(BACKTEST_REPORT_MOCK.falsePositiveRate * 100)}%</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-5 text-muted-2">{BACKTEST_REPORT_MOCK.note}</p>
      </Card>
    </div>
  );
}
