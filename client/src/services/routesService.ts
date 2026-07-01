import { apiClient } from "./apiClient";

export type RouteStop = {
  jobId: number;
  jobTitle: string;
  customer: string;
  address: string;
  scheduledDate: string;
  engineerId?: number | null;
};

export type DailyRoute = {
  stops: RouteStop[];
  mapsUrl?: string | null;
  stopCount: number;
  totalDistanceMeters: number;
};

export const routesService = {
  getDaily(date: string, engineerId?: number | null) {
    const params = new URLSearchParams({ date });
    if (engineerId) params.set("engineerId", String(engineerId));
    return apiClient.get<DailyRoute>(`/routes/daily?${params.toString()}`);
  },
};
