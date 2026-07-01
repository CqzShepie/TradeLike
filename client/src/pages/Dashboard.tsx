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
import AccessDenied from "./AccessDenied";
import UpgradeRequired from "./UpgradeRequired";

function Dashboard() {
  const { summary, loading, error, refresh } = useDashboardSummary();
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
          description={error.message}
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
                  Review schedule pressure, upcoming work and recent updates from one calm workspace.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <HeroMetric label="Today" value={summary.todayJobs.length} />
                <HeroMetric label="Upcoming" value={summary.upcomingJobs.length} />
                <HeroMetric label="Activity" value={summary.recentActivity.length} />
              </div>
            </div>
          </Card>

          <DashboardStats summary={summary} />

          <div className="grid gap-6 xl:grid-cols-2">
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
          </div>

          <DashboardPanel
            title="Recent activity"
            subtitle="Recent changes and progress across your jobs."
          >
            <DashboardActivityList activity={summary.recentActivity} />
          </DashboardPanel>

          <QuickActions />
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
