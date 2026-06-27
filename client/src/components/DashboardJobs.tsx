import type { Job } from "../types/job";
import JobCard from "./JobCard";

type DashboardJobsProps = {
  jobs: Job[];
};

function DashboardJobs({ jobs }: DashboardJobsProps) {
  return (
    <>
      <h2 className="mt-12 mb-6 text-2xl font-bold">
        Today's Jobs
      </h2>

      <div className="space-y-4">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
          />
        ))}
      </div>
    </>
  );
}

export default DashboardJobs;