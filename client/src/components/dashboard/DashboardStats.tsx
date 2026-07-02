import { StatCard } from "../ui";
import type { DashboardSummary } from "../../types/dashboard";

type DashboardStatsProps = {
  summary: DashboardSummary;
};

const statCopy = [
  {
    key: "totalJobs",
    title: "Total jobs",
    description: "All jobs currently tracked",
  },
  {
    key: "scheduledJobs",
    title: "Scheduled",
    description: "Booked into the diary",
  },
  {
    key: "inProgressJobs",
    title: "In progress",
    description: "Currently being worked",
  },
  {
    key: "completedJobs",
    title: "Completed",
    description: "Finished and ready to review",
  },
] as const;

export default function DashboardStats({ summary }: DashboardStatsProps) {
  return (
    <section
      aria-label="Dashboard summary"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {statCopy.map(stat => (
        <StatCard
          key={stat.key}
          title={stat.title}
          value={String(summary[stat.key])}
          description={stat.description}
          tone="dark"
        />
      ))}
    </section>
  );
}
