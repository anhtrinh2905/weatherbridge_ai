import { Users } from "lucide-react";
import { HAZARD_META, RESIDENTS, residentExposure, triageScore, VILLAGES } from "../data";
import type { HazardType } from "../types";
import { LevelChip } from "./primitives";

/**
 * Officer / village-head triage list ranked by Exposure × Priority (FR18).
 * `villageScope` null = commune-wide (officer); a village id = that village only
 * (village head), which enforces the role scope check from FR17 in the UI.
 */
export function TriagePanel({
  type,
  dayOffset,
  villageScope,
}: {
  type: HazardType;
  dayOffset: number;
  villageScope: string | null;
}) {
  const rows = RESIDENTS.filter((r) => (villageScope ? r.villageId === villageScope : true))
    .map((r) => ({
      resident: r,
      exposure: residentExposure(r, type, dayOffset),
      score: triageScore(r, type, dayOffset),
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <section className="signal-panel">
      <div className="flex items-center justify-between">
        <div>
          <p className="signal-label">Phân loại ưu tiên · {HAZARD_META[type].label}</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-fg-strong">
            <Users size={18} className="text-accent" /> Triage = Phơi nhiễm × Ưu tiên
          </h2>
        </div>
        <span className="rounded-full border border-border bg-surface-2 px-3 py-1 font-mono text-xs text-muted">
          {rows.length} hộ (mô phỏng)
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="text-left font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
              <th className="pb-2 pr-3 font-medium">Hộ dân</th>
              <th className="pb-2 pr-3 font-medium">Bản</th>
              <th className="pb-2 pr-3 font-medium">Ưu tiên</th>
              <th className="pb-2 pr-3 font-medium">Phơi nhiễm</th>
              <th className="pb-2 text-right font-medium">Điểm triage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ resident, exposure, score }, i) => (
              <tr key={resident.id} className="border-t border-border-soft">
                <td className="py-2.5 pr-3">
                  <span className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-full bg-surface-3 font-mono text-[0.6rem] text-muted">{i + 1}</span>
                    <span>
                      <span className="block font-medium text-fg-strong">{resident.occupation}</span>
                      <span className="block text-xs text-muted-2">{resident.name.split(" · ")[0]} · {resident.age} tuổi</span>
                    </span>
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-muted">{VILLAGES.find((v) => v.id === resident.villageId)?.name}</td>
                <td className="py-2.5 pr-3">
                  {resident.priority >= 3 ? (
                    <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-semibold text-danger">Hộ ưu tiên</span>
                  ) : resident.priority === 2 ? (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">Cần chú ý</span>
                  ) : (
                    <span className="text-xs text-muted-2">Thường</span>
                  )}
                </td>
                <td className="py-2.5 pr-3"><LevelChip level={exposure} /></td>
                <td className="py-2.5 text-right font-mono text-base font-bold text-fg-strong">{score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
