import { useState } from "react";
import { useParams } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import SectionHeader from "../components/ui/SectionHeader";

import JobHeader from "../components/jobs/workspace/JobHeader";
import CustomerCard from "../components/jobs/workspace/CustomerCard";
import JobInformationCard from "../components/jobs/workspace/JobInformationCard";
import NotesCard from "../components/jobs/workspace/NotesCard";
import TimelineCard from "../components/jobs/workspace/TimelineCard";
import EditJobModal from "../components/jobs/EditJobModal";

import type { Job } from "../types/job";

import { useJob } from "../hooks/useJob";
import { useUpdateJob } from "../hooks/useUpdateJob";

function JobDetails() {
  const { id } = useParams();

  const [editing, setEditing] = useState(false);

  const {
    job,
    loading,
    refresh,
  } = useJob(Number(id));

  const { update } = useUpdateJob();

  async function handleSave(updatedJob: Job) {
    await update(updatedJob);
    await refresh();
    setEditing(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen bg-slate-50">
        <Sidebar />

        <section className="flex-1 p-10">
          <p>Loading job...</p>
        </section>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="flex min-h-screen bg-slate-50">
        <Sidebar />

        <section className="flex-1 p-10">
          <p>Job not found.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <section className="flex-1 space-y-8 p-10">
        <SectionHeader
          title="Job Details"
          subtitle="View and manage this job."
        />

        <JobHeader
          job={job}
          onEdit={() => setEditing(true)}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <CustomerCard job={job} />
          <JobInformationCard job={job} />
        </div>

        <NotesCard jobId={job.id} />

        <TimelineCard />

        <EditJobModal
          open={editing}
          job={job}
          onClose={() => setEditing(false)}
          onSave={handleSave}
        />
      </section>
    </main>
  );
}

export default JobDetails;