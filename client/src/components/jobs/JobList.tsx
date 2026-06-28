import type { Job } from "../../types/job";
import JobCard from "./JobCard";

type JobListProps = {
  jobs: Job[];
  onViewJob?: (job: Job) => void;
  onDeleteJob?: (id: number) => void;
  onEditJob?: (job: Job) => void;
};

function JobList({
  jobs,
  onViewJob,
  onDeleteJob,
  onEditJob,
}: JobListProps) {
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
            onViewJob={onViewJob}
            onDeleteJob={onDeleteJob}
            onEditJob={onEditJob}
          />
        ))}
      </div>
    </>
  );
}

export default JobList;