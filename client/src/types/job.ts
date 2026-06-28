export type JobStatus =
  | "Scheduled"
  | "In Progress"
  | "Completed";

export interface Job {
  id: number;
  customer: string;
  jobTitle: string;   
  address: string;
  phone: string;
  time: string;
  status: JobStatus;
}