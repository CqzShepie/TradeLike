import { Link } from "react-router-dom";
import { Badge, EmptyState } from "../ui";
import type { DashboardActivity } from "../../types/dashboard";

type DashboardActivityListProps = {
  activity: DashboardActivity[];
};

export default function DashboardActivityList({
  activity,
}: DashboardActivityListProps) {
  if (activity.length === 0) {
    return (
      <EmptyState
        title="No recent activity"
        description="Completed jobs, updates and changes will appear here once your team starts moving through the day."
      />
    );
  }

  return (
    <div className="space-y-3">
      {activity.map(item => (
        <Link
          key={`${item.jobId}-${item.timestamp}-${item.type}`}
          to={`/jobs/${item.jobId}`}
          className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/45 p-4 transition hover:border-blue-300/50 hover:bg-slate-950/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                {item.title}
              </h3>
              <Badge tone="slate">{formatActivityType(item.type)}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {item.description}
            </p>
          </div>

          <time
            dateTime={item.timestamp}
            className="shrink-0 text-xs font-semibold text-slate-300"
          >
            {formatDateTime(item.timestamp)}
          </time>
        </Link>
      ))}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActivityType(value: string) {
  return value === "InProgress" ? "In Progress" : value;
}
