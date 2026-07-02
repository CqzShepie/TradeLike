import type { AdminUser, HealthStatus } from "../../types/admin";
import { Badge, StatCard } from "./adminPortalComponents";
import { formatDateTime, formatStatus } from "./adminPortalHelpers";
import { customerAccounts, customerDisplayName, healthLabel, hasSupportNotes } from "./studioData";

const healthOrder: HealthStatus[] = ["Red", "Amber", "Green"];

export default function StudioCustomerHealth({
  users,
  onOpenCustomer,
}: {
  users: AdminUser[];
  onOpenCustomer: (user: AdminUser) => void;
}) {
  const customers = customerAccounts(users);
  const risky = customers.filter(user =>
    user.healthStatus !== "Green" ||
    user.accountStatus === "PastDue" ||
    user.accountStatus === "Suspended" ||
    user.billingStatus === "PastDue"
  );
  const unverified = customers.filter(user => !user.isEmailVerified);
  const recentUpdates = customers.filter(user => user.updatedAt).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Risky accounts" value={risky.length} />
        <StatCard label="Unverified emails" value={unverified.length} />
        <StatCard label="With support notes" value={customers.filter(hasSupportNotes).length} />
        <StatCard label="Healthy" value={customers.filter(user => user.healthStatus === "Green").length} />
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Customer health</h2>
            <p className="mt-1 text-sm text-slate-400">Risk, verification and billing signals from customer accounts only.</p>
          </div>
          <Badge>{customers.length} customers</Badge>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {healthOrder.map(status => (
            <HealthColumn
              key={status}
              status={status}
              users={customers.filter(user => user.healthStatus === status)}
              onOpenCustomer={onOpenCustomer}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-white">Needs attention</h2>
        <div className="mt-4 divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
          {risky.length === 0 ? <p className="p-4 text-sm text-slate-400">No risky customer accounts right now.</p> : risky.slice(0, 12).map(user => (
            <button key={user.id} type="button" onClick={() => onOpenCustomer(user)} className="grid w-full gap-3 bg-slate-950 p-4 text-left hover:bg-slate-900 md:grid-cols-[minmax(0,1fr)_120px_120px_120px]">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{customerDisplayName(user)}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
              </div>
              <Badge>{healthLabel(user.healthStatus)}</Badge>
              <Badge>{formatStatus(user.accountStatus)}</Badge>
              <Badge>{formatStatus(user.billingStatus)}</Badge>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-white">Recently updated</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {recentUpdates.length === 0 ? <p className="text-sm text-slate-400">No recent account updates found.</p> : recentUpdates.map(user => (
            <button key={user.id} type="button" onClick={() => onOpenCustomer(user)} className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-left hover:border-blue-500/60">
              <p className="truncate text-sm font-semibold text-white">{customerDisplayName(user)}</p>
              <p className="mt-1 text-xs text-slate-500">{user.updatedAt ? formatDateTime(user.updatedAt) : "No timestamp"}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function HealthColumn({
  status,
  users,
  onOpenCustomer,
}: {
  status: HealthStatus;
  users: AdminUser[];
  onOpenCustomer: (user: AdminUser) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-white">{healthLabel(status)}</h3>
        <Badge>{users.length}</Badge>
      </div>
      <div className="mt-3 space-y-2">
        {users.length === 0 ? <p className="text-sm text-slate-500">No accounts.</p> : users.slice(0, 5).map(user => (
          <button key={user.id} type="button" onClick={() => onOpenCustomer(user)} className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-left hover:border-blue-500/60">
            <p className="truncate text-xs font-semibold text-white">{customerDisplayName(user)}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

