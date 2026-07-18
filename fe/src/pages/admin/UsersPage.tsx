import { useState } from "react";
import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { Alert } from "../../shared/ui/Alert";
import { ROLE_LABELS } from "../../shared/domain/labels";
import type { Role } from "../../shared/domain/types";

const MOCK_USERS: { username: string; displayName: string; role: Role; villageId?: string }[] = [
  { username: "admin@weather-bridge.local", displayName: "Admin Demo", role: "admin" },
  { username: "canbo@weather-bridge.local", displayName: "Can Bo PCTT Demo", role: "commune_officer" },
  { username: "truongban@weather-bridge.local", displayName: "Truong Ban Muong Pon 1 Demo", role: "village_head", villageId: "muong-pon-1" },
  { username: "dan@weather-bridge.local", displayName: "Nguoi Dan Demo", role: "resident", villageId: "muong-pon-1" },
];

export function AdminUsersPage() {
  const [users] = useState(MOCK_USERS);

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Người dùng & phân quyền" description="Gán vai qua Keycloak — mỗi user nên chỉ có đúng 1 trong 4 vai." />
      <Alert variant="info">
        Đây là UI quản trị gọi Keycloak Admin API (chưa nối thật) — 4 user demo bên dưới đã được
        seed sẵn trong <code>infra/keycloak/realm-export.json</code> để test từng vai ngay.
      </Alert>
      <Card className="mt-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted">
              <th className="pb-2">Tài khoản</th>
              <th className="pb-2">Tên hiển thị</th>
              <th className="pb-2">Vai</th>
              <th className="pb-2">Bản (nếu có)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {users.map((u) => (
              <tr key={u.username}>
                <td className="py-2.5 font-mono text-xs text-fg">{u.username}</td>
                <td className="py-2.5 text-fg">{u.displayName}</td>
                <td className="py-2.5 text-muted">{ROLE_LABELS[u.role]}</td>
                <td className="py-2.5 text-muted">{u.villageId ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
