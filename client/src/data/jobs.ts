import type { Job } from "../types/job";

export const initialJobs: Job[] = [
  {
    id: 1,
    customer: "John Williams",
    jobTitle: "Boiler Service",
    address: "London",
    phone: "07700 900123",
    time: "08:30",
    status: "Scheduled",
  },
  {
    id: 2,
    customer: "Sarah Smith",
    jobTitle: "Radiator Repair",
    address: "Manchester",
    phone: "07700 900456",
    time: "10:00",
    status: "Scheduled",
  },
  {
    id: 3,
    customer: "David Brown",
    jobTitle: "Pipe Fix",
    address: "Birmingham",
    phone: "07700 900789",
    time: "12:00",
    status: "Scheduled",
  },
];