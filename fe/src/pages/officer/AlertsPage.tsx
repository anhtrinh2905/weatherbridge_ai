import { Send, Plus, BarChart3 } from "lucide-react";
import { useState } from "react";
import { useAlerts, useCreateAlert, useDeliverySummary, useProfile, usePublishAlert, useSubmitAlert } from "../../features/operations/hooks";
import { Button } from "../../shared/ui/Button";
import { HazardLevelBadge, TierBadge } from "../../shared/ui/HazardBadge";
import { Card, PageHeader } from "../../shared/ui/PageHeader";

function DeliverySummary({ alertId }: { alertId: string }) {
  const summary = useDeliverySummary(alertId);
  return <div className="mt-3 rounded-lg bg-surface p-3 text-xs text-muted">{summary.isPending ? "Đang tải trạng thái gửi..." : summary.data?.length ? summary.data.map((item) => <span key={`${item.channel}-${item.status}`} className="mr-3">{item.channel}: {item.status} {item.count}</span>) : "Chưa có lượt gửi"}</div>;
}

export function OfficerAlertsPage() {
  const alerts = useAlerts();
  const profile = useProfile();
  const create = useCreateAlert();
  const submit = useSubmitAlert();
  const publish = usePublishAlert();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ hazard_type: "flash_flood", level: "3", tier: "prepare", what_happened: "", danger_description: "", action_instruction: "", deadline_at: "", expires_at: "" });
  const area = profile.data?.area_codes.find((code) => code.startsWith("village-")) ?? profile.data?.area_codes[0];
  return <div>
    <PageHeader eyebrow="Cán bộ xã" title="Cảnh báo theo địa bàn" description="Tạo bản nháp, gửi duyệt và phát cảnh báo trong phạm vi được phân công." actions={<Button onClick={() => setShowForm((value) => !value)}><Plus size={16} /> Tạo cảnh báo</Button>} />
    {showForm && <Card className="mb-5"><form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (!area) return; create.mutate({ source: "manual", hazard_type: form.hazard_type as "flash_flood" | "landslide" | "fog", level: Number(form.level), tier: form.tier as "prepare" | "go_now", confidence: 0.7, what_happened: form.what_happened, danger_description: form.danger_description, action_instruction: form.action_instruction, deadline_at: new Date(form.deadline_at).toISOString(), expires_at: new Date(form.expires_at).toISOString(), target_area_codes: [area] }, { onSuccess: () => setShowForm(false) }); }}><select value={form.hazard_type} onChange={(event) => setForm({ ...form, hazard_type: event.target.value })} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"><option value="flash_flood">Lũ quét</option><option value="landslide">Sạt lở</option><option value="fog">Sương mù</option></select><select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">{[1,2,3,4,5].map((level) => <option key={level}>{level}</option>)}</select><input required value={form.what_happened} onChange={(event) => setForm({ ...form, what_happened: event.target.value })} placeholder="Điều đang xảy ra" className="md:col-span-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm" /><input required value={form.danger_description} onChange={(event) => setForm({ ...form, danger_description: event.target.value })} placeholder="Mức độ nguy hiểm" className="md:col-span-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm" /><input required value={form.action_instruction} onChange={(event) => setForm({ ...form, action_instruction: event.target.value })} placeholder="Việc cần làm" className="md:col-span-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm" /><input required type="datetime-local" value={form.deadline_at} onChange={(event) => setForm({ ...form, deadline_at: event.target.value })} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" /><input required type="datetime-local" value={form.expires_at} onChange={(event) => setForm({ ...form, expires_at: event.target.value })} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" /><Button type="submit" isLoading={create.isPending} className="md:col-span-2"><Send size={16} /> Lưu bản nháp</Button></form></Card>}
    <Card><div className="space-y-3">{alerts.data?.map((alert) => <article key={alert.id} className="rounded-lg border border-border-soft p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-fg-strong">{alert.what_happened}</p><p className="mt-1 text-xs text-muted">{alert.target_area_codes.join(", ")} · {alert.status}</p></div><div className="flex items-center gap-2"><HazardLevelBadge level={alert.level as 1|2|3|4|5} compact /><TierBadge tier={alert.tier as "prepare" | "go_now"} size="sm" /></div></div><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" className="min-h-8 px-3 text-xs" disabled={alert.status !== "draft"} onClick={() => submit.mutate(alert.id)}>Gửi duyệt</Button><Button className="min-h-8 px-3 text-xs" disabled={!['draft','pending_review'].includes(alert.status)} onClick={() => publish.mutate(alert.id)}>Phát cảnh báo</Button><Button variant="ghost" className="min-h-8 px-3 text-xs" onClick={() => setSelected(selected === alert.id ? null : alert.id)}><BarChart3 size={14} /> Gửi tin</Button></div>{selected === alert.id && <DeliverySummary alertId={alert.id} />}</article>)}{alerts.data?.length === 0 && <p className="py-6 text-center text-sm text-muted">Chưa có cảnh báo trong phạm vi.</p>}</div></Card>
  </div>;
}
