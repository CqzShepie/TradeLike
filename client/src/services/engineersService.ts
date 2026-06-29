import { apiClient } from "./apiClient";

export interface Engineer {
    id: number;
    name: string;
    phone?: string;
    email?: string;
}

export const engineersService = {
    getAll: () => apiClient.get<Engineer[]>("/engineers")
};