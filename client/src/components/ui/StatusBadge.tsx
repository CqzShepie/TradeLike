import type { JobStatus } from "../../types/job";
import type { QuoteStatus } from "../../types/quote";

type StatusBadgeStatus = JobStatus | QuoteStatus;

interface StatusBadgeProps {
  status: StatusBadgeStatus;
}

const styles: Record<StatusBadgeStatus, string> = {
  Scheduled: "bg-blue-100 text-blue-700",
  InProgress: "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  Draft: "bg-slate-100 text-slate-700",
  Sent: "bg-blue-100 text-blue-700",
  Accepted: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
};

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
        styles[status]
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function formatStatus(status: StatusBadgeStatus) {
  return status === "InProgress" ? "In Progress" : status;
}

export default StatusBadge;