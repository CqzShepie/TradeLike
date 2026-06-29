import type { Job } from "../types/job";

export const initialJobs: Job[] = [
  {
    id: 1,
    customer: "John Williams",
    jobTitle: "Boiler Service",
    address: "London",
    phone: "07700 900123",
    scheduledDate: "2026-01-20T08:30:00",
    status: "Scheduled",
    priority: "Normal",
  },
  {
    id: 2,
    customer: "Sarah Smith",
    jobTitle: "Radiator Repair",
    address: "Manchester",
    phone: "07700 900456",
    scheduledDate: "2026-01-20T10:00:00",
    status: "InProgress",
    priority: "High",
  },
  {
    id: 3,
    customer: "David Brown",
    jobTitle: "Pipe Fix",
    address: "Birmingham",
    phone: "07700 900789",
    scheduledDate: "2026-01-20T12:00:00",
    status: "Scheduled",
    priority: "Low",
  },
];