import type { Job } from "../types/job";
import type { NewJob } from "../types/newJob";
import { apiClient } from "./apiClient";

export const jobsService = {
    getAll: () =>
        apiClient.get<Job[]>("/jobs"),

    getById: (id: number) =>
        apiClient.get<Job>(`/jobs/${id}`),

    create: (job: NewJob) =>
        apiClient.post<Job>("/jobs", job),

    update: (job: Job) =>
        apiClient.put<Job>(`/jobs/${job.id}`, {
            customer: job.customer,
            phone: job.phone,
            jobTitle: job.jobTitle,
            address: job.address,
            scheduledDate: job.scheduledDate,
            status: job.status,
            priority: job.priority,
            notes: job.notes ?? null,
            engineerId: job.engineerId ?? null,
        }),

    delete: (id: number) =>
        apiClient.delete<void>(`/jobs/${id}`),

    getToday: () =>
        apiClient.get<Job[]>("/jobs/today"),

    getWeek: (start: string) =>
        apiClient.get<Job[]>(`/jobs/week?start=${start}`),
};