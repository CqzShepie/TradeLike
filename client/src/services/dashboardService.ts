import { apiClient } from "./apiClient";
import type { DashboardSummary } from "../types/dashboard";

export const dashboardService = {
    getSummary: () =>
        apiClient.get<DashboardSummary>("/dashboard/summary")
};