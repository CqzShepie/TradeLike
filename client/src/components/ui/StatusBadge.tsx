import type { JobStatus } from "../../types/job";

interface StatusBadgeProps {
  status: JobStatus;
}

const styles: Record<JobStatus, string> = {
  Scheduled: "bg-blue-100 text-blue-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

export default StatusBadge;