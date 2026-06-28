export type JobStatus =
  | "Scheduled"
  | "In Progress"
  | "Completed";

export type JobPriority =
  | "Low"
  | "Normal"
  | "High"
  | "Emergency";

export interface Job {
  id: number;
  customer: string;
  phone: string;
  jobTitle: string;
  address: string;

  time: string;

  status: JobStatus;
  priority: JobPriority;
}