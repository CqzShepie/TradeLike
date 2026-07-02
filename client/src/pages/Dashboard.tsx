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
  EmptyState,
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
  | "reportsPreview";

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
};

function Dashboard() {
  const { summary, loading, error, refresh } = useDashboardSummary();
  const [widgetPreferences, setWidgetPreferences] = useState(defaultWidgetPreferences);
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

      {!loading && !error && isEmptySummary && (
        <EmptyState
          title="No dashboard activity yet"
          description="Add customers and schedule jobs to start filling your command centre with live business activity."
        />
      )}

      {!loading && !error && summary && !isEmptySummary && (
        <div className="space-y-8">
          <Card tone="dark" padding="lg" className="overflow-hidden">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <Badge tone="slate">Live overview</Badge>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-white">
                  Keep today moving without losing sight of the bigger picture.
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Review schedule pressure, upcoming work and recent updates from one focused workspace.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <HeroMetric label="Today" value={summary.todayJobs.length} />
                <HeroMetric label="Upcoming" value={summary.upcomingJobs.length} />
                <HeroMetric label="Activity" value={summary.recentActivity.length} />
              </div>
            </div>
          </Card>

          <DashboardPreferences
            preferences={widgetPreferences}
            showTeamWorkload={isTeamPlus}
            showReportsPreview={isBusinessPlus}
            onChange={updateWidgetPreference}
          />

          {widgetPreferences.stats && <DashboardStats summary={summary} />}

          <div className="grid gap-6 xl:grid-cols-2">
            {widgetPreferences.today && (
              <DashboardPanel
                title="Today's schedule"
                subtitle="Jobs booked in for today."
              >
                <DashboardJobList
                  jobs={summary.todayJobs}
                  emptyTitle="No jobs scheduled today"
                  emptyDescription="When jobs are booked for today they will appear here with customer, address and status details."
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
          </div>

          {widgetPreferences.actionItems && <ActionItems />}

          {isTeamPlus && widgetPreferences.teamWorkload && (
            <DashboardPanel title="Team workload" subtitle="Use the Team workspace to review assignments, leave and daily capacity.">
              <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-sm font-semibold text-white">Team scheduling is enabled for your plan.</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Open Team to check who is assigned, where capacity is tight and which jobs still need people.</p>
                <Link to="/team" className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-white/10">Open Team</Link>
              </div>
            </DashboardPanel>
          )}

          {isBusinessPlus && widgetPreferences.reportsPreview && (
            <DashboardPanel title="Reports preview" subtitle="Business reporting gives a cleaner view of trends and financial follow-up.">
              <div className="grid gap-3 md:grid-cols-3">
                <MiniInsight label="Completed jobs" value={summary.completedJobs} />
                <MiniInsight label="Open jobs" value={summary.scheduledJobs + summary.inProgressJobs} />
                <MiniInsight label="Recent updates" value={summary.recentActivity.length} />
              </div>
              <Link to="/reports" className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-white/10">Open Reports</Link>
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

          {widgetPreferences.quickActions && <QuickActions />}
        </div>
      )}
    </PageLayout>
  );
}

function HeroMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-lg bg-slate-950/40 px-3 py-2">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{label}</p>
    </div>
  );
}

export default Dashboard;

function DashboardPreferences({
  preferences,
  showTeamWorkload,
  showReportsPreview,
  onChange,
}: {
  preferences: Record<DashboardWidgetKey, boolean>;
  showTeamWorkload: boolean;
  showReportsPreview: boolean;
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
  ];

  return (
    <Card tone="dark" padding="md" className="border-white/10 bg-slate-900/80">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Dashboard preferences</h2>
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
    <div className="grid gap-6 xl:grid-cols-2">
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
