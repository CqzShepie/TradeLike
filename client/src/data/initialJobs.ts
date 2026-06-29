import type { Job } from "../types/job";

export const initialJobs: Job[] = [
  {
    id: 1,
    customer: "John Williams",
    jobTitle: "Boiler Service",
    address: "14 Oak Avenue, Liverpool",
    phone: "07700 900123",
    time: "08:30",
    status: "Scheduled",
    priority: "Normal",
  },
  {
    id: 2,
    customer: "John Williams",
    jobTitle: "Boiler Service",
    address: "14 Oak Avenue, Liverpool",
    phone: "07700 900123",
    time: "08:30",
    status: "Scheduled",
    priority: "High",
  },
  {
    id: 3,
    customer: "John Williams",
    jobTitle: "Boiler Service",
    address: "14 Oak Avenue, Liverpool",
    phone: "07700 900123",
    time: "08:30",
    status: "Scheduled",
    priority: "Low",
  },
];