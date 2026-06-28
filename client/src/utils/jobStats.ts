import type { Job } from "../types/job";

export function getJobStats(jobs: Job[]) {
  return [
    {
      title: "Total Jobs",
      value: jobs.length,
    },
    {
      title: "Scheduled",
      value: jobs.filter(
        (job) => job.status === "Scheduled"
      ).length,
    },
    {
      title: "In Progress",
      value: jobs.filter(
        (job) => job.status === "In Progress"
      ).length,
    },
    {
      title: "Completed",
      value: jobs.filter(
        (job) => job.status === "Completed"
      ).length,
    },
  ];
}