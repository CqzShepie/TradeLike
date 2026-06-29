import { apiClient } from "./apiClient";

export interface EngineerWorkload {
    engineerId: number;
    date: string;
    jobCount: number;
}

export const engineerWorkloadService = {
    getWeek: (weekStart: string) =>
        apiClient.get<EngineerWorkload[]>(
            `/engineers/workload?weekStart=${weekStart}`
        )
};