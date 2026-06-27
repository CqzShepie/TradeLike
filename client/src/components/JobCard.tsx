import type { Job, JobStatus } from "../types/job";

type JobCardProps = {
  job: Job;
};

const statusClasses: Record<JobStatus, string> = {
  Scheduled: "bg-blue-100 text-blue-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
};

function JobCard({ job }: JobCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {job.job}
          </h3>

          <p className="mt-1 text-slate-600">
            👤 {job.customer}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            📍 {job.address || "No address"}
          </p>

          <p className="mt-3 text-sm font-medium text-slate-500">
            🕒 {job.time}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[job.status]}`}
        >
          {job.status}
        </span>
      </div>
    </div>
  );
}

export default JobCard;