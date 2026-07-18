import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { Alert } from "../../shared/ui/Alert";
import { Spinner } from "../../shared/ui/Spinner";
import { ROLE_LABELS } from "../../shared/domain/labels";
import { VILLAGES } from "../../shared/domain/mockData";
import type { Role } from "../../shared/domain/types";
import { useSetUserRole, useSetUserVillage, useUsers } from "../../features/admin/hooks";
import type { DomainRole } from "../../features/admin/api";

const ROLE_OPTIONS: Role[] = ["admin", "commune_officer", "village_head", "resident"];

const selectClass =
  "min-h-9 rounded-lg border border-border-strong bg-surface-2 px-2 py-1 text-sm text-fg focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50";

export function AdminUsersPage() {
  const { data: users, isPending, isError, error } = useUsers();
  const setRole = useSetUserRole();
  const setVillage = useSetUserVillage();

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Người dùng & phân quyền" description="Gán vai qua Keycloak — mỗi user chỉ có đúng 1 trong 4 vai." />
      <Alert variant="info">
        Dữ liệu người dùng và vai được đọc/ghi trực tiếp qua Keycloak Admin API. Đổi vai sẽ thu hồi
        vai domain cũ và gán vai mới; vai nền <code>user</code> luôn được giữ.
      </Alert>

      {(setRole.isError || setVillage.isError) && (
        <div className="mt-4">
          <Alert variant="error">
            Cập nhật thất bại: {(setRole.error ?? setVillage.error)?.message}
          </Alert>
        </div>
      )}

      <Card className="mt-4">
        {isPending && <Spinner label="Đang tải danh sách người dùng" />}
        {isError && <Alert variant="error">Không tải được người dùng: {error.message}</Alert>}
        {users && users.length === 0 && <p className="py-3 text-sm text-muted">Chưa có người dùng nào.</p>}
        {users && users.length > 0 && (
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
              {users.map((u) => {
                const rolePending = setRole.isPending && setRole.variables?.userId === u.id;
                const villagePending = setVillage.isPending && setVillage.variables?.userId === u.id;
                return (
                  <tr key={u.id}>
                    <td className="py-2.5 font-mono text-xs text-fg">{u.username ?? u.id}</td>
                    <td className="py-2.5 text-fg">{u.display_name}</td>
                    <td className="py-2.5">
                      <select
                        className={selectClass}
                        value={u.domain_role ?? ""}
                        disabled={rolePending}
                        onChange={(e) =>
                          setRole.mutate({ userId: u.id, role: e.target.value as DomainRole })
                        }
                      >
                        {u.domain_role === null && <option value="">(chưa gán)</option>}
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5">
                      <select
                        className={selectClass}
                        value={u.village_id ?? ""}
                        disabled={villagePending}
                        onChange={(e) =>
                          setVillage.mutate({ userId: u.id, villageId: e.target.value || null })
                        }
                      >
                        <option value="">—</option>
                        {VILLAGES.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
