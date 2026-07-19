import { ChevronDown, MapPin, Phone, Plus, UserRound } from "lucide-react";
import { useState } from "react";
import {
  useAddContact,
  useAddLocation,
  useCreateResident,
  useProfile,
  useResident,
  useResidents,
} from "../../features/operations/hooks";
import type { ContactCreate, LocationCreate } from "../../features/operations/api";
import { Button } from "../../shared/ui/Button";
import { Card, PageHeader } from "../../shared/ui/PageHeader";
import { cn } from "../../shared/lib/cn";

const LIVELIHOOD_LABELS: Record<string, string> = {
  farmer: "Nông dân",
  livestock: "Chăn nuôi",
  forestry: "Lâm nghiệp",
  other: "Khác",
};

const CHANNEL_LABELS: Record<string, string> = {
  sms: "SMS",
  zalo: "Zalo",
  email: "Email",
  web_push: "Web push",
  webhook: "Webhook",
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
  home: "Nhà ở",
  farm: "Nương rẫy",
  livestock: "Chuồng trại",
  watch_point: "Điểm quan trắc",
};

const VERIFICATION_LABELS: Record<string, string> = {
  verified_by_official: "Cán bộ xác nhận",
  unverified: "Chưa xác nhận",
};

function ageFromBirthYear(birthYear: number | null): string {
  if (!birthYear) return "—";
  return `${new Date().getFullYear() - birthYear} tuổi`;
}

function CreateResidentForm({ villageCode, onDone }: { villageCode?: string; onDone: () => void }) {
  const create = useCreateResident();
  const [fullName, setFullName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [livelihoodType, setLivelihoodType] = useState("");
  const [contactChannel, setContactChannel] = useState<"sms" | "zalo" | "email">("sms");
  const [contactValue, setContactValue] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName || !villageCode) return;
    create.mutate(
      {
        full_name: fullName,
        village_code: villageCode,
        birth_year: birthYear ? Number(birthYear) : null,
        source: "official",
        simulated: true,
        livelihood_type: (livelihoodType || null) as "farmer" | "livestock" | "forestry" | "other" | null,
        livelihood_details: {},
        contacts: contactValue
          ? [{ channel: contactChannel, value: contactValue, is_primary: true, verified: false }]
          : [],
      },
      {
        onSuccess: () => {
          setFullName("");
          setBirthYear("");
          setLivelihoodType("");
          setContactValue("");
          onDone();
        },
      },
    );
  };

  return (
    <Card className="mb-5">
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
        <input
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Họ và tên"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={1900}
          max={2200}
          value={birthYear}
          onChange={(event) => setBirthYear(event.target.value)}
          placeholder="Năm sinh (VD: 1974)"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <select
          value={livelihoodType}
          onChange={(event) => setLivelihoodType(event.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Sinh kế (chưa chọn)</option>
          {Object.entries(LIVELIHOOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            value={contactChannel}
            onChange={(event) => setContactChannel(event.target.value as "sms" | "zalo" | "email")}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="sms">SMS</option>
            <option value="zalo">Zalo</option>
            <option value="email">Email</option>
          </select>
          <input
            value={contactValue}
            onChange={(event) => setContactValue(event.target.value)}
            placeholder="Số điện thoại / Zalo / email"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" isLoading={create.isPending} disabled={!villageCode}>
            Lưu cư dân
          </Button>
          {!villageCode && (
            <p className="mt-2 text-xs text-danger">Tài khoản chưa được gán bản — không thể thêm cư dân.</p>
          )}
        </div>
      </form>
    </Card>
  );
}

function AddContactForm({ residentId }: { residentId: string }) {
  const addContact = useAddContact();
  const [channel, setChannel] = useState<"sms" | "zalo" | "email">("sms");
  const [value, setValue] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!value) return;
    const payload: ContactCreate = { channel, value, is_primary: false, verified: false };
    addContact.mutate({ residentId, payload }, { onSuccess: () => setValue("") });
  };

  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
      <select
        value={channel}
        onChange={(event) => setChannel(event.target.value as "sms" | "zalo" | "email")}
        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
      >
        <option value="sms">SMS</option>
        <option value="zalo">Zalo</option>
        <option value="email">Email</option>
      </select>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Giá trị liên hệ"
        className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
      />
      <Button type="submit" variant="secondary" className="min-h-8 px-3 text-xs" isLoading={addContact.isPending}>
        <Plus size={12} /> Thêm liên hệ
      </Button>
    </form>
  );
}

function AddLocationForm({ residentId }: { residentId: string }) {
  const addLocation = useAddLocation();
  const [locationType, setLocationType] = useState<"home" | "farm" | "livestock" | "watch_point">("home");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [label, setLabel] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!lat || !lon || Number.isNaN(latitude) || Number.isNaN(longitude)) return;
    const payload: LocationCreate = { location_type: locationType, latitude, longitude, label: label || null };
    addLocation.mutate({ residentId, payload }, { onSuccess: () => { setLat(""); setLon(""); setLabel(""); } });
  };

  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
      <select
        value={locationType}
        onChange={(event) => setLocationType(event.target.value as "home" | "farm" | "livestock" | "watch_point")}
        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
      >
        {Object.entries(LOCATION_TYPE_LABELS).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      <input value={lat} onChange={(event) => setLat(event.target.value)} placeholder="Vĩ độ" className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs" />
      <input value={lon} onChange={(event) => setLon(event.target.value)} placeholder="Kinh độ" className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs" />
      <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Ghi chú (tuỳ chọn)" className="min-w-32 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs" />
      <Button type="submit" variant="secondary" className="min-h-8 px-3 text-xs" isLoading={addLocation.isPending}>
        <Plus size={12} /> Thêm vị trí
      </Button>
    </form>
  );
}

function ResidentDetailPanel({ residentId }: { residentId: string }) {
  const detail = useResident(residentId);
  if (detail.isPending) return <p className="p-4 text-xs text-muted">Đang tải chi tiết…</p>;
  if (detail.isError || !detail.data) return <p className="p-4 text-xs text-danger">Không tải được chi tiết cư dân.</p>;

  return (
    <div className="space-y-4 border-t border-border-soft bg-surface/50 p-4">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <Phone size={13} /> Liên hệ
        </p>
        <div className="space-y-1.5">
          {detail.data.contacts.length === 0 && <p className="text-xs text-muted">Chưa có kênh liên hệ.</p>}
          {detail.data.contacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between rounded-lg border border-border-soft bg-surface px-3 py-1.5 text-xs">
              <span>
                {CHANNEL_LABELS[contact.channel] ?? contact.channel} · {contact.masked_value}
                {contact.is_primary && <span className="ml-1.5 rounded bg-accent/15 px-1.5 py-0.5 text-[0.65rem] font-semibold text-accent">Chính</span>}
              </span>
              <span className={contact.verified_at ? "text-positive" : "text-muted"}>{contact.verified_at ? "Đã xác thực" : "Chưa xác thực"}</span>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <AddContactForm residentId={residentId} />
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <MapPin size={13} /> Vị trí
        </p>
        <div className="space-y-1.5">
          {detail.data.locations.length === 0 && <p className="text-xs text-muted">Chưa có vị trí nào.</p>}
          {detail.data.locations.map((location) => (
            <div key={location.id} className="flex items-center justify-between rounded-lg border border-border-soft bg-surface px-3 py-1.5 text-xs">
              <span>
                {LOCATION_TYPE_LABELS[location.location_type] ?? location.location_type}
                {location.label ? ` · ${location.label}` : ""}
              </span>
              <span className="font-mono text-muted">{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <AddLocationForm residentId={residentId} />
        </div>
      </div>
    </div>
  );
}

export function VillageHeadResidentsPage() {
  const residents = useResidents();
  const profile = useProfile();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const village = profile.data?.area_codes.find((code) => code.startsWith("village-"));

  return (
    <div>
      <PageHeader
        eyebrow="Trưởng bản"
        title="Danh sách cư dân"
        description="Chỉ hiển thị cư dân trong địa bàn được phân công."
        actions={
          <Button onClick={() => setOpen((value) => !value)}>
            <Plus size={16} /> Thêm cư dân
          </Button>
        }
      />
      {open && <CreateResidentForm villageCode={village} onDone={() => setOpen(false)} />}
      <Card className="p-0">
        <div className="divide-y divide-border-soft">
          {residents.data?.map((resident) => {
            const isExpanded = expandedId === resident.id;
            return (
              <div key={resident.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : resident.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-surface-3/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserRound size={18} className="shrink-0 text-accent" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg-strong">{resident.full_name}</p>
                      <p className="text-xs text-muted">
                        {ageFromBirthYear(resident.birth_year)} · {resident.village_code} ·{" "}
                        {VERIFICATION_LABELS[resident.verification_status] ?? resident.verification_status}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="hidden text-right text-xs text-muted sm:block">
                      <p>{resident.contact_channels.map((c) => CHANNEL_LABELS[c] ?? c).join(", ") || "Chưa có kênh nhận tin"}</p>
                      <p>{resident.livelihood_types.map((l) => LIVELIHOOD_LABELS[l] ?? l).join(", ") || "Chưa khai báo sinh kế"}</p>
                    </div>
                    <ChevronDown size={16} className={cn("text-muted transition-transform", isExpanded && "rotate-180")} />
                  </div>
                </button>
                {isExpanded && <ResidentDetailPanel residentId={resident.id} />}
              </div>
            );
          })}
          {residents.data?.length === 0 && <p className="py-6 text-center text-sm text-muted">Chưa có cư dân trong phạm vi.</p>}
        </div>
      </Card>
    </div>
  );
}
