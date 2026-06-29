import type { Job } from "../types/job";
import type { NewJob } from "../types/newJob";
import { apiClient } from "./apiClient";

export const jobsService = {
  // GET ALL
  getAll: () =>
    apiClient.get<Job[]>("/jobs"),

  // GET BY ID
  getById: (id: number) =>
    apiClient.get<Job>(`/jobs/${id}`),

  // CREATE
  create: (job: NewJob) =>
    apiClient.post<Job>("/jobs", job),

  // UPDATE
  update: (job: Job) =>
    apiClient.put<Job>(`/jobs/${job.id}`, job),

  // DELETE
  delete: (id: number) =>
    apiClient.delete<void>(`/jobs/${id}`),

  // 📅 TODAY'S JOBS
  getToday: () =>
    apiClient.get<Job[]>("/jobs/today"),

  // 📅 WEEK VIEW
  getWeek: () =>
    apiClient.get<Job[]>("/jobs/week"),
};