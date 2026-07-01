import type { ReactNode } from "react";
import Badge from "./Badge";

type StatusBadgeProps = {
  children?: ReactNode;
  status?: string;
};

const toneByStatus: Record<string, "neutral" | "blue" | "green" | "amber" | "red"> = {
  active: "green",
  accepted: "green",
  completed: "green",
  scheduled: "blue",
  sent: "blue",
  draft: "neutral",
  trial: "blue",
  pastdue: "amber",
  suspended: "amber",
  urgent: "red",
  cancelled: "red",
  rejected: "red",
};

export default function StatusBadge({ children, status }: StatusBadgeProps) {
  const rawValue = String(children ?? status ?? "");
  const tone = toneByStatus[rawValue.replace(/\s/g, "").toLowerCase()] ?? "neutral";

  return <Badge tone={tone}>{formatStatus(rawValue)}</Badge>;
}

function formatStatus(value: string) {
  return value === "InProgress" ? "In Progress" : value;
}
