import type { ReactNode } from "react";

type StatusBadgeProps = {
  children?: ReactNode;
  status?: string;
};

export default function StatusBadge({ children, status }: StatusBadgeProps) {
  const value = children ?? formatStatus(status ?? "");

  return (
    <span className="inline-flex h-fit w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      {value}
    </span>
  );
}

function formatStatus(value: string) {
  return value === "InProgress" ? "In Progress" : value;
}
