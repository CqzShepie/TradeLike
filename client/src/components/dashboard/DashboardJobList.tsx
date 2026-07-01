import { Link } from "react-router-dom";
import { EmptyState, StatusBadge } from "../ui";
import type { Job } from "../../types/job";

type DashboardJobListProps = {
  jobs: Job[];
  emptyTitle: string;
  emptyDescription: string;
};

export default function DashboardJobList({
  jobs,
  emptyTitle,
  emptyDescription,
}: DashboardJobListProps) {
  if (jobs.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {jobs.map(job => (
        <Link
          key={job.id}
          to={`/jobs/${job.id}`}
          className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-950">
                  {job.jobTitle}
                </h3>
                <StatusBadge status={job.status} />
              </div>

              <p className="mt-2 text-sm font-medium text-slate-700">
                {job.customer}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {job.address}
              </p>
            </div>

            <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Scheduled
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {formatTime(job.scheduledDate)}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
