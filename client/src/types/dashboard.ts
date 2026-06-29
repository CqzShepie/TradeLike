import type { Job } from "./job";

export interface DashboardActivity {
    jobId: number;
    title: string;
    description: string;
    timestamp: string;
    type: string;
}

export interface DashboardSummary {
    totalJobs: number;
    scheduledJobs: number;
    inProgressJobs: number;
    completedJobs: number;
    todayJobs: Job[];
    upcomingJobs: Job[];
    recentActivity: DashboardActivity[];
}