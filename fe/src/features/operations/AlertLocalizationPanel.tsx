import { Check, Languages, Send, X } from "lucide-react";
import { useState } from "react";

import { Button } from "../../shared/ui/Button";
import type { Alert } from "./api";
import {
  useAlertTranslations,
  useCreateAlertTranslation,
  useGenerateAlertTranslation,
  usePublishAlertTranslation,
  useReviewAlertTranslation,
} from "./hooks";

type TranslationForm = {
  locale: string;
  what_happened: string;
  danger_description: string;
  action_instruction: string;
  deadline_instruction: string;
};

export function AlertLocalizationPanel({ alert }: { alert: Alert }) {
  const translations = useAlertTranslations(alert.id);
  const createDraft = useCreateAlertTranslation();
  const generateDraft = useGenerateAlertTranslation();
  const review = useReviewAlertTranslation();
  const publish = usePublishAlertTranslation();
  const [form, setForm] = useState<TranslationForm>({
    locale: "hmn-x-dienbien",
    what_happened: alert.what_happened,
    danger_description: alert.danger_description,
    action_instruction: alert.action_instruction,
    deadline_instruction: `Thực hiện trước ${new Date(alert.deadline_at).toLocaleString("vi-VN")}`,
  });
  const update = (key: keyof TranslationForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="mt-3 border-t border-border-soft pt-3">
      <div className="flex items-center gap-2">
        <Languages size={15} className="text-accent" />
        <h3 className="text-sm font-semibold text-fg-strong">Bản dịch đã kiểm định</h3>
      </div>
      <p className="mt-1 text-xs text-muted">
        Bản nháp không được gửi cho cư dân. Chỉ bản đã duyệt và locale đã bật mới được phát hành.
      </p>
      <form
        className="mt-3 grid gap-2 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          createDraft.mutate({ id: alert.id, payload: { ...form, translation_method: "manual" } });
        }}
      >
        <input value={form.locale} onChange={(event) => update("locale", event.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" aria-label="Mã ngôn ngữ" />
        <input value={form.what_happened} onChange={(event) => update("what_happened", event.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" placeholder="Điều đang xảy ra" />
        <input value={form.danger_description} onChange={(event) => update("danger_description", event.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" placeholder="Mức nguy hiểm" />
        <input value={form.action_instruction} onChange={(event) => update("action_instruction", event.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" placeholder="Hành động cần làm" />
        <input value={form.deadline_instruction} onChange={(event) => update("deadline_instruction", event.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" placeholder="Hạn chót" />
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" className="min-h-9 px-3 text-xs" isLoading={createDraft.isPending}><Send size={14} /> Lưu bản nháp</Button>
          <Button type="button" variant="primary" className="min-h-9 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" isLoading={generateDraft.isPending} onClick={() => generateDraft.mutate({ id: alert.id, locale: form.locale })}>Dịch bằng AI</Button>
        </div>
      </form>
      <div className="mt-3 space-y-2">
        {translations.data?.map((translation) => (
          <div key={translation.id} className="rounded-lg bg-surface p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-fg">{translation.locale} · v{translation.version}</span><span className="text-muted">{translation.translation_status}</span></div>
            <p className="mt-2 text-muted">{translation.what_happened}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" className="min-h-8 px-2 text-xs" disabled={!['draft', 'machine_draft'].includes(translation.translation_status)} onClick={() => review.mutate({ id: translation.id, decision: "approve" })}><Check size={13} /> Duyệt</Button>
              <Button variant="ghost" className="min-h-8 px-2 text-xs text-danger" disabled={!['draft', 'machine_draft'].includes(translation.translation_status)} onClick={() => review.mutate({ id: translation.id, decision: "reject" })}><X size={13} /> Từ chối</Button>
              <Button className="min-h-8 px-2 text-xs" disabled={translation.translation_status !== "human_reviewed"} onClick={() => publish.mutate(translation.id)}>Phát hành</Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
