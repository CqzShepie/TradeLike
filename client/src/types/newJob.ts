import type { JobStatus } from "./job";

export interface NewJob {
  customer: string;
  phone: string;
  jobTitle: string;
  address: string;
  time: string;
  status: JobStatus;
}