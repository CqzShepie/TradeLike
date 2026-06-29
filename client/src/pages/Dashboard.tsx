import { Link } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import WelcomeBanner from "../components/dashboard/WelcomeBanner";
import QuickActions from "../components/dashboard/QuickActions";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import type { Job } from "../types/job";
import type { DashboardActivity } from "../types/dashboard";

function Dashboard() {
    const { summary, loading, error, refresh } = useDashboardSummary();

    return (
        <main className="flex min-h-screen bg-slate-50">
            <Sidebar />

            <section className="flex-1 p-10">
                <WelcomeBanner />

                {loading && (
                    <p className="text-slate-500">
                        Loading dashboard...
                    </p>
                )}

                {!loading && error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-medium text-red-700">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={refresh}
                            className="mt-3 rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {!loading && !error && summary && (
                    <>
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                            <StatCard
                                label="Total Jobs"
                                value={summary.totalJobs}
                            />

                            <StatCard
                                label="Scheduled"
                                value={summary.scheduledJobs}
                            />

                            <StatCard
                                label="In Progress"
                                value={summary.inProgressJobs}
                            />

                            <StatCard
                                label="Completed"
                                value={summary.completedJobs}
                            />
                        </div>

                        <div className="mt-8 grid gap-6 lg:grid-cols-2">
                            <DashboardPanel title="Today's Schedule">
                                <JobList
                                    jobs={summary.todayJobs}
                                    emptyText="No jobs scheduled for today."
                                />
                            </DashboardPanel>

                            <DashboardPanel title="Upcoming Jobs">
                                <JobList
                                    jobs={summary.upcomingJobs}
                                    emptyText="No upcoming jobs."
                                />
                            </DashboardPanel>
                        </div>

                        <div className="mt-8">
                            <DashboardPanel title="Recent Activity">
                                <ActivityList
                                    activity={summary.recentActivity}
                                />
                            </DashboardPanel>
                        </div>

                        <div className="mt-8">
                            <QuickActions />
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}

function StatCard({
    label,
    value
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
                {label}
            </p>

            <p className="mt-3 text-3xl font-bold text-slate-900">
                {value}
            </p>
        </div>
    );
}

function DashboardPanel({
    title,
    children
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
                {title}
            </h2>

            <div className="mt-4">
                {children}
            </div>
        </div>
    );
}

function JobList({
    jobs,
    emptyText
}: {
    jobs: Job[];
    emptyText: string;
}) {
    if (jobs.length === 0) {
        return (
            <p className="text-sm text-slate-500">
                {emptyText}
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {jobs.map(job => (
                <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="block rounded-lg border border-slate-100 p-3 transition hover:bg-slate-50"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">
                                {job.jobTitle}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                {job.customer}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                                {job.address}
                            </p>
                        </div>

                        <div className="text-right">
                            <p className="text-xs font-medium text-slate-600">
                                {formatTime(job.scheduledDate)}
                            </p>

                            <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                                {formatStatus(job.status)}
                            </p>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}

function ActivityList({
    activity
}: {
    activity: DashboardActivity[];
}) {
    if (activity.length === 0) {
        return (
            <p className="text-sm text-slate-500">
                No recent activity yet.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {activity.map(item => (
                <Link
                    key={`${item.jobId}-${item.timestamp}-${item.type}`}
                    to={`/jobs/${item.jobId}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition hover:bg-slate-50"
                >
                    <div>
                        <p className="text-sm font-medium text-slate-900">
                            {item.title}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            {item.description}
                        </p>
                    </div>

                    <p className="text-xs text-slate-400">
                        {formatDateTime(item.timestamp)}
                    </p>
                </Link>
            ))}
        </div>
    );
}

function formatTime(value: string) {
    return new Date(value).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDateTime(value: string) {
    return new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatStatus(value: string) {
    if (value === "InProgress") {
        return "In Progress";
    }

    return value;
}

export default Dashboard;