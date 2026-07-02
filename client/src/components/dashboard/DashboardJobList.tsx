import { Link } from "react-router-dom";
import { StatusBadge } from "../ui";
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
    return <CompactDashboardEmpty title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {jobs.map(job => (
        <Link
          key={job.id}
          to={`/jobs/${job.id}`}
          className="block rounded-xl border border-white/10 bg-slate-950/45 p-4 transition hover:border-blue-300/50 hover:bg-slate-950/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-white">{job.jobTitle}</h3>
                <StatusBadge status={job.status} />
              </div>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-blue-200">
                Job #{job.jobNumber ?? job.id}
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-100">
                {job.customer}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                {job.address}
              </p>
            </div>

            <div className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Scheduled
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {formatTime(job.scheduledDate)}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CompactDashboardEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-slate-950/45 p-4">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
