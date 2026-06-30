import type { Job } from "../types/job";
import type { NewJob } from "../types/newJob";
import { apiClient } from "./apiClient";

export const jobsService = {
  async getAll() {
    const jobs = await apiClient.get<Job[]>("/jobs");
    return jobs.map(normaliseJob);
  },

  async getById(id: number) {
    const job = await apiClient.get<Job>(`/jobs/${id}`);
    return normaliseJob(job);
  },

  async create(job: NewJob) {
    const created = await apiClient.post<Job>("/jobs", toPayload(job));
    return normaliseJob(created);
  },

  async update(job: Job) {
    const updated = await apiClient.put<Job>(`/jobs/${job.id}`, toPayload(job));
    return normaliseJob(updated);
  },

  async delete(id: number) {
    const deleted = await apiClient.delete<Job>(`/jobs/${id}`);
    return normaliseJob(deleted);
  },

  async getToday() {
    const jobs = await apiClient.get<Job[]>("/jobs/today");
    return jobs.map(normaliseJob);
  },

  async getWeek(start: string) {
    const jobs = await apiClient.get<Job[]>(
      `/jobs/week?start=${encodeURIComponent(start)}`
    );

    return jobs.map(normaliseJob);
  },
};

function toPayload(job: NewJob | Job) {
  return {
    customer: job.customer.trim(),
    phone: job.phone.trim(),
    jobTitle: job.jobTitle.trim(),
    address: job.address.trim(),
    scheduledDate: job.scheduledDate,
    status: job.status,
    priority: job.priority,
    notes: job.notes?.trim() || null,
    engineerId: job.engineerId ?? null,
  };
}

function normaliseJob(job: Job): Job {
  return {
    ...job,
    id: Number(job.id),
    customer: job.customer ?? "",
    phone: job.phone ?? "",
    jobTitle: job.jobTitle ?? "",
    address: job.address ?? "",
    scheduledDate: job.scheduledDate ?? "",
    status: job.status,
    priority: job.priority,
    notes: job.notes ?? null,
    quoteId: job.quoteId ?? null,
    engineerId: job.engineerId ?? null,
  };
}