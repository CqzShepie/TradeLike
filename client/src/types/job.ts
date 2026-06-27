export type JobStatus =
  | "Scheduled"
  | "In Progress"
  | "Completed";

export interface Job {
  id: number;
  customer: string;
  job: string;
  address: string;
  phone: string;
  time: string;
  status: JobStatus;
}