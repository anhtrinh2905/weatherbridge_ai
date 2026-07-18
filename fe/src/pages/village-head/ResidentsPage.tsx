import { Plus, UserRound } from "lucide-react";
import { useState } from "react";
import { useCreateResident, useProfile, useResidents } from "../../features/operations/hooks";
import { Button } from "../../shared/ui/Button";
import { Card, PageHeader } from "../../shared/ui/PageHeader";

export function VillageHeadResidentsPage() {
  const residents = useResidents();
  const profile = useProfile();
  const create = useCreateResident();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const village = profile.data?.area_codes.find((code) => code.startsWith("village-"));
  return <div>
    <PageHeader eyebrow="Trưởng bản" title="Danh sách cư dân" description="Chỉ hiển thị cư dân trong địa bàn được phân công." actions={<Button onClick={() => setOpen((value) => !value)}><Plus size={16} /> Thêm cư dân</Button>} />
    {open && <Card className="mb-5"><form className="flex flex-wrap gap-3" onSubmit={(event) => { event.preventDefault(); if (name && village) create.mutate({ full_name: name, village_code: village, source: "official", simulated: true, contacts: [], locations: [], livelihood_details: {} }, { onSuccess: () => { setName(""); setOpen(false); } }); }}><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Họ và tên" className="min-w-56 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" /><Button type="submit" isLoading={create.isPending}>Lưu cư dân</Button></form></Card>}
    <Card><div className="divide-y divide-border-soft">{residents.data?.map((resident) => <div key={resident.id} className="flex items-center justify-between gap-4 py-3"><div className="flex items-center gap-3"><UserRound size={18} className="text-accent" /><div><p className="font-medium text-fg-strong">{resident.full_name}</p><p className="text-xs text-muted">{resident.village_code} · {resident.verification_status}</p></div></div><div className="text-right text-xs text-muted"><p>{resident.contact_channels.join(", ") || "Chưa có kênh nhận tin"}</p><p>{resident.livelihood_types.join(", ") || "Chưa khai báo sinh kế"}</p></div></div>)}{residents.data?.length === 0 && <p className="py-6 text-center text-sm text-muted">Chưa có cư dân trong phạm vi.</p>}</div></Card>
  </div>;
}
