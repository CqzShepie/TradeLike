type Status =
  | "Scheduled"
  | "In Progress"
  | "Completed"
  | "Draft"
  | "Sent"
  | "Accepted"
  | "Rejected";

interface StatusBadgeProps {
  status: Status;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<Status, string> = {
    Scheduled: "bg-blue-100 text-blue-700",
    "In Progress": "bg-amber-100 text-amber-700",
    Completed: "bg-green-100 text-green-700",

    Draft: "bg-slate-100 text-slate-700",
    Sent: "bg-blue-100 text-blue-700",
    Accepted: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default StatusBadge;