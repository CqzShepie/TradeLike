import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import DashboardActivityList from "../components/dashboard/DashboardActivityList";
import DashboardJobList from "../components/dashboard/DashboardJobList";
import DashboardPanel from "../components/dashboard/DashboardPanel";
import DashboardStats from "../components/dashboard/DashboardStats";
import QuickActions from "../components/dashboard/QuickActions";
import {
  Badge,
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
  PageLayout,
  SecondaryButton,
} from "../components/ui";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { authService } from "../services/authService";
import { isAtLeastPlan } from "../routes/planEntitlements";
import { friendlyErrorMessage } from "../utils/errorMessages";
import AccessDenied from "./AccessDenied";
import UpgradeRequired from "./UpgradeRequired";

type DashboardWidgetKey =
  | "stats"
  | "today"
  | "upcoming"
  | "activity"
  | "actionItems"
  | "quickActions"
  | "teamWorkload"
  | "reportsPreview"
  | "inventoryAlerts";

const preferenceKey = "tradelike_dashboard_widgets";
const defaultWidgetPreferences: Record<DashboardWidgetKey, boolean> = {
  stats: true,
  today: true,
  upcoming: true,
  activity: true,
  actionItems: true,
  quickActions: true,
  teamWorkload: true,
  reportsPreview: true,
  inventoryAlerts: true,
};

function Dashboard() {
  const { summary, loading, error, refresh } = useDashboardSummary();
  const [widgetPreferences, setWidgetPreferences] = useState(defaultWidgetPreferences);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const user = authService.getUser();
  const isTeamPlus = isAtLeastPlan(user?.plan, "Team");
  const isBusinessPlus = isAtLeastPlan(user?.plan, "Business");
  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const isEmptySummary = summary &&
    summary.totalJobs === 0 &&
    summary.scheduledJobs === 0 &&
    summary.inProgressJobs === 0 &&
    summary.completedJobs === 0 &&
    summary.todayJobs.length === 0 &&
    summary.upcomingJobs.length === 0 &&
    summary.recentActivity.length === 0;

  useEffect(() => {
    setWidgetPreferences(readWidgetPreferences());
  }, []);

  function updateWidgetPreference(key: DashboardWidgetKey, value: boolean) {
    const next = { ...widgetPreferences, [key]: value };
    setWidgetPreferences(next);
    localStorage.setItem(preferenceKey, JSON.stringify(next));
  }

  if (error && "status" in error && error.status === 403) {
    return <AccessDenied />;
  }

  if (error && "status" in error && error.status === 402) {
    return <UpgradeRequired />;
  }

  return (
    <PageLayout>
      <PageHeader
        eyebrow="Command centre"
        title="Dashboard"
        description="Your trade business at a glance."
        actions={<Badge tone="blue">{todayLabel}</Badge>}
      />

      {loading && (
        <LoadingState
          title="Loading dashboard"
          description="Fetching the latest jobs, activity and schedule."
        />
      )}

      {!loading && error && (
        <ErrorState
          title="Unable to load dashboard"
          description={friendlyErrorMessage(error, "Dashboard could not be loaded. Please try again.")}
          action={
            <SecondaryButton type="button" onClick={refresh}>
              Try again
            </SecondaryButton>
          }
        />
      )}

      {!loading && !error && isEmptySummary && <DashboardEmptyWelcome />}

      {!loading && !error && summary && !isEmptySummary && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-xl shadow-slate-950/30 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Customer dashboard</p>
                <h2 className="mt-1 text-2xl font-bold text-white">Trade business at a glance</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">Review today, upcoming work and activity without jumping between pages.</p>
              </div>
              <button
                type="button"
                onClick={() => setPreferencesOpen(previous => !previous)}
                className="rounded-full border border-blue-300/30 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-100 hover:bg-blue-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
              >
                Customise
              </button>
            </div>

            {preferencesOpen && (
              <DashboardPreferences
                preferences={widgetPreferences}
                showTeamWorkload={isTeamPlus}
                showReportsPreview={isBusinessPlus}
                showInventoryAlerts={isBusinessPlus}
                onChange={updateWidgetPreference}
              />
            )}

            <DashboardMetricStrip summary={summary} />

            {widgetPreferences.stats && <DashboardStats summary={summary} />}

            <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
              <div className="space-y-5">
                {widgetPreferences.today && (
                  <DashboardPanel
                    title="Today's schedule"
                    subtitle="Jobs booked in for today."
                  >
                    <DashboardJobList
                      jobs={summary.todayJobs}
                      emptyTitle="No jobs scheduled today"
                      emptyDescription="Create your first job or check the calendar for future bookings."
                    />
                  </DashboardPanel>
                )}

                {widgetPreferences.upcoming && (
                  <DashboardPanel
                    title="Upcoming jobs"
                    subtitle="The next jobs your team needs to prepare for."
                  >
                    <DashboardJobList
                      jobs={summary.upcomingJobs}
                      emptyTitle="No upcoming jobs"
                      emptyDescription="Future scheduled jobs will appear here once they are added."
                    />
                  </DashboardPanel>
                )}

                {widgetPreferences.activity && (
                  <DashboardPanel
                    title="Recent activity"
                    subtitle="Recent changes and progress across your jobs."
                  >
                    <DashboardActivityList activity={summary.recentActivity} />
                  </DashboardPanel>
                )}
              </div>

              <div className="space-y-5">
                {widgetPreferences.quickActions && <QuickActions />}
                {widgetPreferences.actionItems && <ActionItems />}

                {isTeamPlus && widgetPreferences.teamWorkload && (
                  <DashboardPanel title="Team workload" subtitle="Team+ scheduling and capacity.">
                    <PreviewLink to="/team" title="Team scheduling is enabled" description="Open Team to check assignments, leave and daily capacity." />
                  </DashboardPanel>
                )}

                {isBusinessPlus && widgetPreferences.reportsPreview && (
                  <DashboardPanel title="Reports preview" subtitle="Business trends from real job activity.">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <MiniInsight label="Completed" value={summary.completedJobs} />
                      <MiniInsight label="Open" value={summary.scheduledJobs + summary.inProgressJobs} />
                      <MiniInsight label="Updates" value={summary.recentActivity.length} />
                    </div>
                    <Link to="/reports" className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-white/10">Open Reports</Link>
                  </DashboardPanel>
                )}

                {isBusinessPlus && widgetPreferences.inventoryAlerts && (
                  <DashboardPanel title="Inventory alerts" subtitle="Business+ stock follow-up.">
                    <PreviewLink to="/inventory" title="Review inventory" description="Open Inventory to check low-stock items, suppliers and purchase orders." />
                  </DashboardPanel>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </PageLayout>
  );
}

function DashboardMetricStrip({ summary }: { summary: NonNullable<ReturnType<typeof useDashboardSummary>["summary"]> }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Dashboard preview summary">
      <HeroMetric label="Today" value={String(summary.todayJobs.length)} helper="jobs scheduled today" />
      <HeroMetric label="Upcoming" value={String(summary.upcomingJobs.length)} helper="future jobs" />
      <HeroMetric label="Quotes" value="Review" helper="open quote follow-up" to="/quotes" />
      <HeroMetric label="Invoices" value="Review" helper="open invoice admin" to="/invoices" />
      <HeroMetric label="Activity" value={String(summary.recentActivity.length)} helper="recent updates" />
    </div>
  );
}

function HeroMetric({ label, value, helper, to }: { label: string; value: string; helper: string; to?: string }) {
  const content = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-300">{helper}</p>
    </>
  );

  const className = "block rounded-lg border border-white/10 bg-slate-950/60 p-4 transition hover:border-blue-300/50 hover:bg-slate-950/80";

  return to ? <Link to={to} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}

export default Dashboard;

function DashboardPreferences({
  preferences,
  showTeamWorkload,
  showReportsPreview,
  showInventoryAlerts,
  onChange,
}: {
  preferences: Record<DashboardWidgetKey, boolean>;
  showTeamWorkload: boolean;
  showReportsPreview: boolean;
  showInventoryAlerts: boolean;
  onChange: (key: DashboardWidgetKey, value: boolean) => void;
}) {
  const options: Array<{ key: DashboardWidgetKey; label: string; visible: boolean }> = [
    { key: "stats", label: "Summary cards", visible: true },
    { key: "today", label: "Today's jobs", visible: true },
    { key: "upcoming", label: "Upcoming jobs", visible: true },
    { key: "activity", label: "Recent activity", visible: true },
    { key: "actionItems", label: "Quote and invoice actions", visible: true },
    { key: "quickActions", label: "Quick actions", visible: true },
    { key: "teamWorkload", label: "Team workload", visible: showTeamWorkload },
    { key: "reportsPreview", label: "Reports preview", visible: showReportsPreview },
    { key: "inventoryAlerts", label: "Inventory alerts", visible: showInventoryAlerts },
  ];

  return (
    <Card tone="dark" padding="sm" className="mt-5 border-white/10 bg-slate-900/80">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Customise dashboard</h2>
          <p className="mt-1 text-sm text-slate-300">Choose which widgets appear on this device.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {options.filter(option => option.visible).map(option => (
            <label key={option.key} className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/45 px-3 py-2 text-sm font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={preferences[option.key]}
                onChange={event => onChange(option.key, event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-slate-950"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ActionItems() {
  return (
    <div className="grid gap-5">
      <DashboardPanel title="Quotes needing action" subtitle="Keep sent, draft and accepted quotes moving.">
        <ActionItemLink to="/quotes" title="Review quotes" description="Open your quote list to chase sent quotes, finish drafts or convert accepted work." />
      </DashboardPanel>
      <DashboardPanel title="Invoices needing action" subtitle="Send invoices and track billing admin.">
        <ActionItemLink to="/invoices" title="Review invoices" description="Open invoices to send drafts, record payment or follow up unpaid work." />
      </DashboardPanel>
    </div>
  );
}

function ActionItemLink({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link to={to} className="block rounded-xl border border-white/10 bg-slate-950/45 p-4 hover:border-blue-300/50 hover:bg-slate-950/70">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </Link>
  );
}

function MiniInsight({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-300">{label}</p>
    </div>
  );
}

function PreviewLink({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link to={to} className="block rounded-xl border border-white/10 bg-slate-950/45 p-4 hover:border-blue-300/50 hover:bg-slate-950/70">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </Link>
  );
}

function DashboardEmptyWelcome() {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-xl shadow-slate-950/30">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Customer dashboard</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Create your first job</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">No dashboard activity yet. Add customers and schedule jobs to start filling the workspace with real business activity.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/jobs" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500">Create your first job</Link>
          <Link to="/customers" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">Add customer</Link>
        </div>
      </div>
    </section>
  );
}

function readWidgetPreferences() {
  try {
    return {
      ...defaultWidgetPreferences,
      ...JSON.parse(localStorage.getItem(preferenceKey) ?? "{}"),
    } as Record<DashboardWidgetKey, boolean>;
  } catch {
    return defaultWidgetPreferences;
  }
}
