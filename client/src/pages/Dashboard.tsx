import Sidebar from "../components/layout/Sidebar";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import StatsGrid from "../components/ui/StatsGrid";
import JobList from "../components/jobs/JobList";

import { useJobs } from "../hooks/useJobs";

function Dashboard() {
  const {
    jobs,
    loading,
    deleteJob,
    startEdit,
  } = useJobs();

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <section className="flex-1 p-10">
        <DashboardHeader
          title="Good morning 👋"
          subtitle="Here's what's happening in your business today."
        />

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <StatsGrid
              stats={[
                {
                  title: "Total Jobs",
                  value: jobs.length,
                },
                {
                  title: "Scheduled",
                  value: jobs.filter(
                    (j) => j.status === "Scheduled"
                  ).length,
                },
                {
                  title: "In Progress",
                  value: jobs.filter(
                    (j) => j.status === "In Progress"
                  ).length,
                },
                {
                  title: "Completed",
                  value: jobs.filter(
                    (j) => j.status === "Completed"
                  ).length,
                },
              ]}
            />

            <div className="mt-8">
              <JobList
                jobs={jobs}
                onDeleteJob={deleteJob}
                onEditJob={startEdit}
              />
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default Dashboard;