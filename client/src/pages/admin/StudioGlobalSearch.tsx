import type { AdminUser } from "../../types/admin";
import { Badge } from "./adminPortalComponents";
import { formatStatus } from "./adminPortalHelpers";
import { customerAccounts, customerDisplayName, healthLabel, matchesStudioCustomerSearch } from "./studioData";

export default function StudioGlobalSearch({
  users,
  query,
  onQueryChange,
  onOpenCustomer,
}: {
  users: AdminUser[];
  query: string;
  onQueryChange: (value: string) => void;
  onOpenCustomer: (user: AdminUser) => void;
}) {
  const trimmedQuery = query.trim();
  const results = customerAccounts(users)
    .filter(user => matchesStudioCustomerSearch(user, trimmedQuery))
    .slice(0, 6);

  return (
    <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Global Studio search</span>
        <input
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          placeholder="Search customers by name, business, owner, email, id, status or plan"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
        />
      </label>

      {trimmedQuery !== "" && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {results.length === 0 ? (
            <p className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">No matching customer accounts found.</p>
          ) : results.map(user => (
            <button
              key={user.id}
              type="button"
              onClick={() => onOpenCustomer(user)}
              className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-left hover:border-blue-500/60 hover:bg-slate-900"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{customerDisplayName(user)}</p>
                  <p className="mt-1 truncate text-xs text-slate-400">{user.ownerName || user.fullName} - {user.email}</p>
                </div>
                <Badge>{user.subscriptionPlan}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>{formatStatus(user.accountStatus)}</Badge>
                <Badge>{formatStatus(user.billingStatus)}</Badge>
                <Badge>{healthLabel(user.healthStatus)}</Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

