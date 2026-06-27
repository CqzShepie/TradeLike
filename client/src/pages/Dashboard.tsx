import { useState } from "react";
import type { Job } from "../types/job";
import type { NewJob } from "../types/newJob";

import { initialJobs } from "../data/initialJobs";

import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";
import DashboardStats from "../components/DashboardStats";
import DashboardJobs from "../components/DashboardJobs";
import NewJobForm from "../components/NewJobForm";

function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);

  function handleAddJob(newJob: NewJob) {
    setJobs((currentJobs) => [
      ...currentJobs,
      {
        id: currentJobs.length + 1,
        customer: newJob.customer,
        job: newJob.job,
        address: "",
        phone: "",
        time: newJob.time,
        status: "Scheduled",
      },
    ]);
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <section className="flex-1 p-10">
        <DashboardHeader
          title="Good morning 👋"
          subtitle="Here's what's happening in your business today."
        />

        <DashboardStats jobCount={jobs.length} />

        <NewJobForm onAddJob={handleAddJob} />

        <DashboardJobs jobs={jobs} />
      </section>
    </main>
  );
}

export default Dashboard;