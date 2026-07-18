import { useState } from "react";
import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { Alert } from "../../shared/ui/Alert";
import { Button } from "../../shared/ui/Button";
import { THRESHOLDS } from "../../shared/domain/mockData";
import { HAZARD_TYPE_LABELS } from "../../shared/domain/labels";
import type { ThresholdConfig } from "../../shared/domain/types";

export function AdminThresholdsPage() {
  const [config, setConfig] = useState<ThresholdConfig[]>(THRESHOLDS);
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Ngưỡng cảnh báo" description="Ngưỡng vận hành theo loại thiên tai — cấu hình tại đây, không đụng tới trọng số mô hình (calibration)." />

      <Alert variant="info">
        Đây là ngưỡng <strong>vận hành</strong> (khi nào cấp độ chuyển thành "đi ngay"), không phải
        trọng số khoa học của mô hình. Sửa calibration là publish artifact mới từ <code>ai/</code>,
        không phải form web này (AD-7).
      </Alert>

      <Card className="mt-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted">
              <th className="pb-2">Loại thiên tai</th>
              <th className="pb-2">Phạm vi</th>
              <th className="pb-2">Cấp bắt đầu "đi ngay"</th>
              <th className="pb-2">Ghi chú / căn cứ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {config.map((cfg, idx) => (
              <tr key={`${cfg.hazardType}-${cfg.villageId}`}>
                <td className="py-3 text-fg">{HAZARD_TYPE_LABELS[cfg.hazardType]}</td>
                <td className="py-3 text-muted">{cfg.villageId === "all" ? "Toàn xã" : cfg.villageId}</td>
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
                        Cấp {n}
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
          <Button onClick={() => setSaved(true)}>Lưu ngưỡng</Button>
          {saved && <span className="text-sm text-positive">Đã lưu (mock — chưa có PUT /threshold-configs thật).</span>}
        </div>
      </Card>
    </div>
  );
}
