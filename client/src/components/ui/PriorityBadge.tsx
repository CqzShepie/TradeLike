import type { JobPriority } from "../../types/job";

type PriorityBadgeProps = {
  priority: JobPriority;
};

const priorityStyles: Record<JobPriority, string> = {
  Low: "bg-slate-100 text-slate-700",
  Normal: "bg-sky-100 text-sky-700",
  High: "bg-amber-100 text-amber-700",
  Urgent: "bg-red-100 text-red-700",
};

function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
        priorityStyles[priority]
      }`}
    >
      {priority}
    </span>
  );
}

export default PriorityBadge;