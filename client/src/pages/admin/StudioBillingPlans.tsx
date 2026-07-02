import { useMemo, useState } from "react";
import type { AdminUser } from "../../types/admin";
import { Badge, StatCard } from "./adminPortalComponents";
import { formatDateTime, formatStatus } from "./adminPortalHelpers";
import { countByPlan, customerAccounts, customerDisplayName } from "./studioData";

type BillingFilter = "all" | "pastDue" | "trials" | "business" | "enterprise" | "freeMonths" | "discounts";

const filters: { key: BillingFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pastDue", label: "Past due" },
  { key: "trials", label: "Trials" },
  { key: "business", label: "Business" },
  { key: "enterprise", label: "Enterprise" },
  { key: "freeMonths", label: "Free months active" },
  { key: "discounts", label: "Discount active" },
];

export default function StudioBillingPlans({
  users,
  onOpenCustomer,
}: {
  users: AdminUser[];
  onOpenCustomer: (user: AdminUser) => void;
}) {
  const [filter, setFilter] = useState<BillingFilter>("all");
  const customers = customerAccounts(users);
  const plans = countByPlan(customers);
  const watchlist = customers.filter(user => user.trialEndsAt || user.freeMonthsExpireAt).slice(0, 8);

  const visibleUsers = useMemo(() => {
    if (filter === "pastDue") return customers.filter(user => user.billingStatus === "PastDue" || user.accountStatus === "PastDue");
    if (filter === "trials") return customers.filter(user => user.accountStatus === "Trial" || user.billingStatus === "Trial");
    if (filter === "business") return customers.filter(user => user.subscriptionPlan === "Business");
    if (filter === "enterprise") return customers.filter(user => user.subscriptionPlan === "Enterprise");
    if (filter === "freeMonths") return customers.filter(user => user.freeMonths > 0);
    if (filter === "discounts") return customers.filter(user => user.discountType !== "None" && user.discountValue > 0);
    return customers;
  }, [customers, filter]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Solo" value={plans.Solo} />
        <StatCard label="Team" value={plans.Team} />
        <StatCard label="Business" value={plans.Business} />
        <StatCard label="Enterprise" value={plans.Enterprise} />
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Billing and plans</h2>
            <p className="mt-1 text-sm text-slate-400">Use Customer Accounts for edits. Every sensitive plan or billing change requires a reason and writes an audit log.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === item.key ? "bg-blue-600 text-white" : "border border-slate-700 text-slate-300 hover:bg-slate-800"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
            {visibleUsers.length === 0 ? <p className="p-4 text-sm text-slate-400">No customers match this billing filter.</p> : visibleUsers.map(user => (
              <button
                key={user.id}
                type="button"
                onClick={() => onOpenCustomer(user)}
                className="grid w-full gap-3 bg-slate-950 p-4 text-left hover:bg-slate-900 md:grid-cols-[minmax(0,1fr)_100px_120px_120px]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{customerDisplayName(user)}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <Badge>{user.subscriptionPlan}</Badge>
                <Badge>{formatStatus(user.billingStatus)}</Badge>
                <Badge>{user.freeMonths > 0 ? `${user.freeMonths} free mo.` : user.discountType !== "None" ? "Discount" : "Standard"}</Badge>
              </button>
            ))}
          </div>

          <aside className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <h3 className="text-sm font-bold text-white">Seat and plan rules</h3>
            <div className="mt-3 space-y-3 text-sm text-slate-400">
              <p>Solo: 1 seat.</p>
              <p>Team: 2 to 10 seats.</p>
              <p>Business: 11 to 25 seats.</p>
              <p>Enterprise: flexible.</p>
              <p>Internal is only for TradeLike staff accounts.</p>
            </div>
            <div className="mt-5 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs leading-5 text-blue-100">
              Plan consistency is enforced by the backend. The Studio customer editor shows the current account plan and billing status.
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-white">Trial and free-month watchlist</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {watchlist.length === 0 ? <p className="text-sm text-slate-400">No trial or free-month dates are set.</p> : watchlist.map(user => (
            <button key={user.id} type="button" onClick={() => onOpenCustomer(user)} className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-left hover:border-blue-500/60">
              <p className="truncate text-sm font-semibold text-white">{customerDisplayName(user)}</p>
              <p className="mt-1 text-xs text-slate-500">
                Trial: {user.trialEndsAt ? formatDateTime(user.trialEndsAt) : "not set"} | Free months: {user.freeMonthsExpireAt ? formatDateTime(user.freeMonthsExpireAt) : "not set"}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
