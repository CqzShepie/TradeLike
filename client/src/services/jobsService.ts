import type { Job } from "../types/job";
import type { NewJob } from "../types/newJob";
import type { Quote, QuoteLineItem } from "../types/quote";
import { apiClient } from "./apiClient";

export const jobsService = {
  async getAll() {
    const jobs = (await apiClient.get("/jobs")) as Job[];
    return jobs.map(normaliseJob);
  },

  async getById(id: number) {
    const job = (await apiClient.get(`/jobs/${id}`)) as Job;
    return normaliseJob(job);
  },

  async create(job: NewJob) {
    const created = (await apiClient.post("/jobs", job)) as Job;
    return normaliseJob(created);
  },

  async update(job: Job) {
    const updated = (await apiClient.put(`/jobs/${job.id}`, {
      customer: job.customer,
      phone: job.phone,
      jobTitle: job.jobTitle,
      address: job.address,
      scheduledDate: job.scheduledDate,
      status: job.status,
      priority: job.priority,
      notes: job.notes ?? null,
      engineerId: job.engineerId ?? null,
    })) as Job;

    return normaliseJob(updated);
  },

  delete(id: number) {
    return apiClient.delete(`/jobs/${id}`);
  },

  async getToday() {
    const jobs = (await apiClient.get("/jobs/today")) as Job[];
    return jobs.map(normaliseJob);
  },

  async getWeek(start: string) {
    const jobs = (await apiClient.get(`/calendar/week?start=${start}`)) as Job[];
    return jobs.map(normaliseJob);
  },

  async linkQuote(jobId: number, quoteId: number) {
    const updated = (await apiClient.put(`/jobs/${jobId}/source-quote`, {
      quoteId,
    })) as Job;

    return normaliseJob(updated);
  },

  async unlinkQuote(jobId: number) {
    const updated = (await apiClient.delete(
      `/jobs/${jobId}/source-quote`
    )) as Job;

    return normaliseJob(updated);
  },
};

function normaliseJob(job: Job): Job {
  const sourceQuote = job.sourceQuote ? normaliseQuote(job.sourceQuote) : null;

  return {
    ...job,
    customerId: job.customerId ?? sourceQuote?.customerId ?? null,
    quoteId: job.quoteId ?? sourceQuote?.id ?? null,
    engineerId: job.engineerId ?? null,
    sourceQuote,
  };
}

function normaliseQuote(quote: Quote): Quote {
  return {
    ...quote,
    amount: Number(quote.amount ?? quote.total ?? 0),
    subtotal: Number(quote.subtotal ?? 0),
    vatTotal: Number(quote.vatTotal ?? 0),
    discountTotal: Number(quote.discountTotal ?? 0),
    total: Number(quote.total ?? quote.amount ?? 0),
    lineItems: (quote.lineItems ?? []).map(normaliseLineItem),
  };
}

function normaliseLineItem(item: QuoteLineItem): QuoteLineItem {
  return {
    ...item,
    description: item.description ?? "",
    quantity: Number(item.quantity ?? 0),
    unitPrice: Number(item.unitPrice ?? 0),
    vatRate: Number(item.vatRate ?? 0),
    lineTotal: Number(item.lineTotal ?? 0),
  };
}
