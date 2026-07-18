import { Bell, MapPin, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { WebPushPanel } from "../../features/notifications/WebPushPanel";
import { useAddContact, useAddLocation, useConsents, useCreateSubscription, useGrantConsent, useNotificationChannels, useResident, useResidents, useSubscriptions, useUpdateSubscription, useWithdrawConsent } from "../../features/operations/hooks";
import { Button } from "../../shared/ui/Button";
import { Card, PageHeader } from "../../shared/ui/PageHeader";

export function ResidentNotificationsPage() {
  const residents = useResidents();
  const residentId = residents.data?.[0]?.id;
  const resident = useResident(residentId);
  const channels = useNotificationChannels();
  const subscriptions = useSubscriptions();
  const consents = useConsents();
  const addContact = useAddContact();
  const addLocation = useAddLocation();
  const createSubscription = useCreateSubscription();
  const updateSubscription = useUpdateSubscription();
  const grantConsent = useGrantConsent();
  const withdrawConsent = useWithdrawConsent();
  const [contact, setContact] = useState("");
  const [channel, setChannel] = useState<"sms" | "zalo">("sms");
  const [location, setLocation] = useState({ latitude: "", longitude: "", label: "" });

  return <div className="space-y-5">
    <PageHeader eyebrow="Cư dân" title="Nhận cảnh báo" description="Quản lý điểm theo dõi và kênh nhận tin của bạn." />
    <WebPushPanel />
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <div className="flex items-center gap-2"><Bell size={18} className="text-accent" /><h2 className="font-semibold text-fg-strong">Kênh nhận tin</h2></div>
        <div className="mt-4 space-y-2 text-sm">
          {channels.data?.map((item) => <div key={item.channel} className="flex items-center justify-between rounded-lg border border-border-soft px-3 py-2"><span>{item.channel === "sms" ? "SMS" : item.channel === "zalo" ? "Zalo OA" : "Web Push"}</span><span className={item.available ? "text-positive" : "text-muted"}>{item.available ? "Sẵn sàng" : "Chưa cấu hình"}</span></div>)}
        </div>
        {resident.data && <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (contact) addContact.mutate({ residentId: resident.data.id, payload: { channel, value: contact, is_primary: true, verified: false } }, { onSuccess: () => setContact("") }); }}>
          <select value={channel} onChange={(event) => setChannel(event.target.value as "sms" | "zalo")} className="rounded-lg border border-border bg-surface px-2 text-sm"><option value="sms">SMS</option><option value="zalo">Zalo OA</option></select>
          <input value={contact} onChange={(event) => setContact(event.target.value)} placeholder={channel === "sms" ? "+84..." : "Zalo OA user ID"} className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm" />
          <Button type="submit" variant="secondary" className="px-3" aria-label="Thêm kênh"><Plus size={16} /></Button>
        </form>}
        <ul className="mt-4 divide-y divide-border-soft text-sm">{resident.data?.contacts.map((item) => <li key={item.id} className="flex justify-between py-2"><span>{item.channel}</span><span className="text-muted">{item.masked_value}</span></li>)}</ul>
      </Card>
      <Card>
        <div className="flex items-center gap-2"><MapPin size={18} className="text-accent" /><h2 className="font-semibold text-fg-strong">Điểm theo dõi</h2></div>
        {resident.data && <form className="mt-4 grid grid-cols-2 gap-2" onSubmit={(event) => { event.preventDefault(); const latitude = Number(location.latitude); const longitude = Number(location.longitude); if (Number.isFinite(latitude) && Number.isFinite(longitude)) addLocation.mutate({ residentId: resident.data.id, payload: { location_type: "watch_point", latitude, longitude, label: location.label || null } }, { onSuccess: () => setLocation({ latitude: "", longitude: "", label: "" }) }); }}>
          <input value={location.latitude} onChange={(event) => setLocation({ ...location, latitude: event.target.value })} placeholder="Vĩ độ" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input value={location.longitude} onChange={(event) => setLocation({ ...location, longitude: event.target.value })} placeholder="Kinh độ" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input value={location.label} onChange={(event) => setLocation({ ...location, label: event.target.value })} placeholder="Tên điểm" className="col-span-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <Button type="submit" variant="secondary" className="col-span-2"><Plus size={16} /> Thêm điểm</Button>
        </form>}
        <ul className="mt-4 divide-y divide-border-soft text-sm">{resident.data?.locations.map((item) => <li key={item.id} className="py-2"><span className="font-medium">{item.label ?? item.location_type}</span><span className="ml-2 text-muted">{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</span></li>)}</ul>
      </Card>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <h2 className="font-semibold text-fg-strong">Ngưỡng nhận cảnh báo</h2>
        <div className="mt-4 space-y-2">{subscriptions.data?.map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg border border-border-soft p-3 text-sm"><span>{item.hazard_type} · cấp {item.minimum_level} · {item.channel}</span><button type="button" onClick={() => updateSubscription.mutate({ id: item.id, payload: { is_active: !item.is_active } })} className={item.is_active ? "text-positive" : "text-muted"}>{item.is_active ? "Đang bật" : "Đang tắt"}</button></div>)}</div>
        <Button className="mt-4" variant="secondary" onClick={() => createSubscription.mutate({ hazard_type: "flash_flood", minimum_level: 3, channel: "web_push" })}>Theo dõi lũ quét từ cấp 3</Button>
      </Card>
      <Card>
        <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-accent" /><h2 className="font-semibold text-fg-strong">Đồng ý nhận cảnh báo</h2></div>
        {consents.data?.filter((item) => !item.withdrawn_at).map((item) => <div key={item.id} className="mt-4 flex items-center justify-between text-sm"><span>Phiên bản {item.policy_version}</span><Button variant="ghost" className="min-h-8 px-2 text-danger" onClick={() => withdrawConsent.mutate(item.id)}>Rút lại</Button></div>)}
        {!consents.data?.some((item) => !item.withdrawn_at) && <Button className="mt-4" onClick={() => grantConsent.mutate("v1")}>Đồng ý</Button>}
      </Card>
    </div>
  </div>;
}
