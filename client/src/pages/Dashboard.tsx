import Sidebar from "../components/layout/Sidebar";

import WelcomeBanner from "../components/dashboard/WelcomeBanner";
import TodaysSchedule from "../components/dashboard/TodaysSchedule";
import RecentActivity from "../components/dashboard/RecentActivity";
import QuickActions from "../components/dashboard/QuickActions";

import StatsGrid from "../components/ui/StatsGrid";

import { useJobs } from "../hooks/useJobs";
import { getJobStats } from "../utils/jobStats";

function Dashboard() {
  const { jobs, loading } = useJobs();

  const stats = getJobStats(jobs);

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <section className="flex-1 p-10">
        <WelcomeBanner />

        {loading ? (
          <p className="text-slate-500">Loading dashboard...</p>
        ) : (
          <>
            <StatsGrid stats={stats} />

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <TodaysSchedule jobs={jobs} />
              <RecentActivity />
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

export default Dashboard;