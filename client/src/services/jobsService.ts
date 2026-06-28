import type { Job } from "../types/job";
import type { NewJob } from "../types/newJob";
import { apiClient } from "./apiClient";

export const jobsService = {
  getAll: () => apiClient.get<Job[]>("/jobs"),

  create: (job: NewJob) =>
    apiClient.post<Job>("/jobs", job),

  update: (job: Job) =>
    apiClient.put<Job>(`/jobs/${job.id}`, job),

  delete: (id: number) =>
    apiClient.delete<void>(`/jobs/${id}`),
};