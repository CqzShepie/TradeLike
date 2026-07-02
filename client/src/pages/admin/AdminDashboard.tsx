import type { AdminAuditLog, AdminUser } from "../../types/admin";
import { formatDateTime, formatStatus } from "./adminPortalHelpers";
import { countByPlan, customerAccounts } from "./studioData";

export default function AdminDashboard({
  users,
  staffUsers,
  auditLogs,
  onOpenAccounts,
  onOpenAudit,
}: {
  users: AdminUser[];
  staffUsers: AdminUser[];
  auditLogs: AdminAuditLog[];
  onOpenAccounts: () => void;
  onOpenAudit: () => void;
}) {
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(now.getDate() + 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const customers = customerAccounts(users);
  const planCounts = countByPlan(customers);

  const trialsEndingThisWeek = customers.filter(user => {
    if (user.accountStatus !== "Trial" || !user.trialEndsAt) return false;
    const trialEnd = new Date(user.trialEndsAt);
    return trialEnd >= now && trialEnd <= weekFromNow;
  });

  const pastDueCustomers = customers.filter(user => user.accountStatus === "PastDue" || user.billingStatus === "PastDue");
  const pendingVerification = customers.filter(user => !user.isEmailVerified);
  const onboardingMissing = customers.filter(user => !user.onboardingEmailSentAt);
  const recentSignups = customers.filter(user => new Date(user.createdAt) >= thirtyDaysAgo);
  const recentlyUpdated = customers.filter(user => user.updatedAt);
  const recentSupportNotes = customers.filter(user => user.supportNotes?.trim()).slice(0, 6);
  const staffActionsToday = auditLogs.filter(log => new Date(log.createdAt) >= todayStart);

  const accountStatusRows = [
    { label: "Trial", count: customers.filter(user => user.accountStatus === "Trial").length },
    { label: "Active", count: customers.filter(user => user.accountStatus === "Active").length },
    { label: "Past Due", count: customers.filter(user => user.accountStatus === "PastDue").length },
    { label: "Suspended", count: customers.filter(user => user.accountStatus === "Suspended").length },
    { label: "Cancelled", count: customers.filter(user => user.accountStatus === "Cancelled").length },
  ];

  const maxStatusCount = Math.max(1, ...accountStatusRows.map(row => row.count));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStat label="Total customers" value={customers.length} />
        <DashboardStat label="Active customers" value={customers.filter(user => user.accountStatus === "Active").length} />
        <DashboardStat label="Trial customers" value={customers.filter(user => user.accountStatus === "Trial").length} />
        <DashboardStat label="Suspended customers" value={customers.filter(user => user.accountStatus === "Suspended").length} tone={customers.some(user => user.accountStatus === "Suspended") ? "amber" : "normal"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStat label="Solo accounts" value={planCounts.Solo} />
        <DashboardStat label="Team accounts" value={planCounts.Team} />
        <DashboardStat label="Business accounts" value={planCounts.Business} />
        <DashboardStat label="Enterprise accounts" value={planCounts.Enterprise} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStat label="New customers last 30 days" value={recentSignups.length} />
        <DashboardStat label="Trials ending this week" value={trialsEndingThisWeek.length} tone={trialsEndingThisWeek.length > 0 ? "amber" : "normal"} />
        <DashboardStat label="Past-due customers" value={pastDueCustomers.length} tone={pastDueCustomers.length > 0 ? "red" : "normal"} />
        <DashboardStat label="Staff actions today" value={staffActionsToday.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardPanel title="Needs attention" actionLabel="Open accounts" onAction={onOpenAccounts}>
          <div className="grid gap-3 md:grid-cols-2">
            <AttentionCard label="Verification emails pending" value={pendingVerification.length} />
            <AttentionCard label="Onboarding emails not sent" value={onboardingMissing.length} />
            <AttentionCard label="Trials ending this week" value={trialsEndingThisWeek.length} />
            <AttentionCard label="Past-due customers" value={pastDueCustomers.length} danger={pastDueCustomers.length > 0} />
            <AttentionCard label="Recently updated accounts" value={recentlyUpdated.length} />
          </div>
        </DashboardPanel>

        <DashboardPanel title="Customer status trend">
          <div className="space-y-3">
            {accountStatusRows.map(row => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{row.label}</span>
                  <span>{row.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.max(4, (row.count / maxStatusCount) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardPanel title="Recent signups" actionLabel="Open accounts" onAction={onOpenAccounts}>
          <MiniUserList users={recentSignups.slice(0, 6)} emptyText="No customer signups in the last 30 days." />
        </DashboardPanel>
        <DashboardPanel title="Expiring trials"><MiniUserList users={trialsEndingThisWeek.slice(0, 6)} emptyText="No trials ending this week." /></DashboardPanel>
        <DashboardPanel title="Past-due customers"><MiniUserList users={pastDueCustomers.slice(0, 6)} emptyText="No past-due customers." /></DashboardPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardPanel title="Recent audit activity" actionLabel="Open audit" onAction={onOpenAudit}><AuditList logs={auditLogs.slice(0, 8)} /></DashboardPanel>
        <DashboardPanel title="Staff snapshot">
          <div className="grid gap-3 md:grid-cols-3">
            <AttentionCard label="Current staff" value={staffUsers.filter(user => user.accountStatus !== "Cancelled").length} />
            <AttentionCard label="Previous staff" value={staffUsers.filter(user => user.accountStatus === "Cancelled").length} />
            <AttentionCard label="Directors" value={staffUsers.filter(user => user.role === "Director").length} />
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel title="Recent support notes" actionLabel="Open accounts" onAction={onOpenAccounts}>
        <MiniUserList users={recentSupportNotes} emptyText="No recent support notes." />
      </DashboardPanel>
    </div>
  );
}

function DashboardStat({ label, value, tone = "normal" }: { label: string; value: number; tone?: "normal" | "amber" | "red" }) {
  const toneClass = tone === "red" ? "border-red-500/30 bg-red-500/10 text-red-100" : tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-100" : "border-slate-800 bg-slate-900 text-white";
  return <div className={`rounded-xl border p-5 shadow-sm ${toneClass}`}><p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>;
}

function AttentionCard({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <div className={`rounded-lg border p-4 ${danger ? "border-red-500/30 bg-red-500/10" : "border-slate-800 bg-slate-950"}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></div>;
}

function DashboardPanel({ title, children, actionLabel, onAction }: { title: string; children: React.ReactNode; actionLabel?: string; onAction?: () => void }) {
  return <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold text-white">{title}</h2>{actionLabel && onAction && <button type="button" onClick={onAction} className="shrink-0 text-xs font-semibold text-blue-300 hover:text-blue-200">{actionLabel}</button>}</div><div className="mt-4">{children}</div></section>;
}

function MiniUserList({ users, emptyText }: { users: AdminUser[]; emptyText: string }) {
  if (users.length === 0) {
    return <p className="text-sm text-slate-400">{emptyText}</p>;
  }
  return <div className="space-y-3">{users.map(user => <div key={user.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{user.businessName || user.fullName || user.email}</p><p className="mt-1 truncate text-xs text-slate-500">{user.email}</p></div><span className="max-w-[96px] shrink-0 truncate rounded-full bg-slate-800 px-2 py-1 text-center text-xs font-semibold text-slate-300">{formatStatus(user.accountStatus)}</span></div></div>)}</div>;
}

function AuditList({ logs, emptyText = "No audit activity yet." }: { logs: AdminAuditLog[]; emptyText?: string }) {
  if (logs.length === 0) {
    return <p className="text-sm text-slate-400">{emptyText}</p>;
  }
  return <div className="space-y-3">{logs.map(log => <div key={log.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3"><p className="text-sm font-semibold text-white">{log.summary}</p><p className="mt-1 text-xs text-slate-500">{log.actorName || log.actorEmail} - {log.action} - {formatDateTime(log.createdAt)}</p></div>)}</div>;
}

