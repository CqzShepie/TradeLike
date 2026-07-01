import { apiClient } from "./apiClient";

export type RevenuePoint = {
  date: string;
  revenuePence: number;
  invoiceCount: number;
  paidInvoiceCount: number;
};

export type JobCompletionPoint = {
  date: string;
  completed: number;
  inProgress: number;
  scheduled: number;
  cancelled: number;
};

export const analyticsService = {
  getRevenue(from: string, to: string) {
    return apiClient.get<RevenuePoint[]>(`/analytics/revenue?from=${from}&to=${to}`);
  },

  getJobCompletion(from: string, to: string) {
    return apiClient.get<JobCompletionPoint[]>(`/analytics/job-completion?from=${from}&to=${to}`);
  },
};
