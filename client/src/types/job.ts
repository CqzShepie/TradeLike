import type { Quote } from "./quote";

export type JobStatus = "Scheduled" | "InProgress" | "Completed" | "Cancelled";

export type JobPriority = "Low" | "Normal" | "High" | "Urgent";

export type Job = {
  id: number;
  customer: string;
  phone: string;
  jobTitle: string;
  address: string;
  scheduledDate: string;
  status: JobStatus;
  priority: JobPriority;
  notes?: string | null;
  quoteId?: number | null;
  engineerId?: number | null;
  sourceQuote?: Quote | null;
};