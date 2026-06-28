import { useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import StatsGrid from "../components/ui/StatsGrid";
import JobList from "../components/jobs/JobList";
import NewJobForm from "../components/jobs/NewJobForm";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

import { useJobs } from "../hooks/useJobs";

function Jobs() {
  const {
    jobs,
    loading,
    editingJob,
    addJob,
    deleteJob,
    startEdit,
    updateJob,
    cancelEdit,
  } = useJobs();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.customer.toLowerCase().includes(search.toLowerCase()) ||
      job.phone.toLowerCase().includes(search.toLowerCase()) ||
      job.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      job.address.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <section className="flex-1 p-10">
        <DashboardHeader
          title="Jobs"
          subtitle="View and manage all your jobs."
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

            {editingJob && (
              <p className="mb-4 text-sm text-blue-600">
                Editing: {editingJob.jobTitle}
              </p>
            )}

            <div className="mb-8">
              <Button onClick={() => setShowForm((prev) => !prev)}>
                {showForm ? "Close Form" : "+ New Job"}
              </Button>
            </div>

            {(showForm || editingJob) && (
              <NewJobForm
                onAddJob={addJob}
                onUpdateJob={updateJob}
                editingJob={editingJob}
                onCancelEdit={() => {
                  cancelEdit();
                  setShowForm(false);
                }}
              />
            )}

            <div className="my-8 flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="🔍 Search customer, phone, job or address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <JobList
              jobs={filteredJobs}
              onDeleteJob={deleteJob}
              onEditJob={(job) => {
                startEdit(job);
                setShowForm(true);
              }}
            />

            {filteredJobs.length === 0 && (
              <p className="mt-10 text-center text-slate-500">
                No matching jobs found.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default Jobs;