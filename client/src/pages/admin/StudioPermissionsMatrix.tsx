import { useMemo, useState } from "react";
import type { AdminUser } from "../../types/admin";
import { Badge } from "./adminPortalComponents";
import { permissionDefinitions } from "./adminPortalConstants";
import { formatStatus, summarisePermissions } from "./adminPortalHelpers";
import type { PermissionKey } from "./adminPortalTypes";

const highlightedPermissions: PermissionKey[] = [
  "canManageAccounts",
  "canManageStaff",
  "canManageBilling",
  "canManageSecurity",
  "canViewAuditLogs",
  "canCreateCustomers",
  "canResetPasswords",
  "canEditStaffPermissions",
];

export default function StudioPermissionsMatrix({
  staffUsers,
  onOpenStaff,
}: {
  staffUsers: AdminUser[];
  onOpenStaff: (user: AdminUser) => void;
}) {
  const [search, setSearch] = useState("");
  const visibleStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query === "") return staffUsers;
    return staffUsers.filter(user =>
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      summarisePermissions(user).toLowerCase().includes(query)
    );
  }, [search, staffUsers]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
      <div className="border-b border-slate-800 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Permissions matrix</h2>
            <p className="mt-1 text-sm text-slate-400">Review internal staff access before opening the staff editor for changes.</p>
          </div>
          <Badge>{visibleStaff.length} staff</Badge>
        </div>
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search staff, role or permission"
          className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[920px] w-full divide-y divide-slate-800 text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Staff member</th>
              <th className="px-4 py-3">Role</th>
              {highlightedPermissions.map(key => (
                <th key={key} className="px-3 py-3">{permissionDefinitions.find(item => item.key === key)?.label ?? key}</th>
              ))}
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {visibleStaff.length === 0 ? (
              <tr><td colSpan={highlightedPermissions.length + 3} className="px-4 py-6 text-sm text-slate-400">No staff match this search.</td></tr>
            ) : visibleStaff.map(user => (
              <tr key={user.id} className="bg-slate-900 hover:bg-slate-800/60">
                <td className="px-4 py-3">
                  <p className="font-semibold text-white">{user.fullName || user.email}</p>
                  <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge>{user.role}</Badge>
                  <p className="mt-2 text-xs text-slate-500">{formatStatus(user.accountStatus)}</p>
                </td>
                {highlightedPermissions.map(key => (
                  <td key={key} className="px-3 py-3">
                    <span className={`inline-flex min-w-12 justify-center rounded-full px-2 py-1 text-xs font-semibold ${user[key] ? "bg-blue-500/20 text-blue-100" : "bg-slate-800 text-slate-500"}`}>
                      {user[key] ? "Yes" : "No"}
                    </span>
                  </td>
                ))}
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onOpenStaff(user)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">
                    Open staff editor
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

