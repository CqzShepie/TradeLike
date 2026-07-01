import type { Customer } from "../types/customer";
import type { NewCustomer } from "../types/newCustomer";
import { apiClient } from "./apiClient";

export const customersService = {
    async getAll() {
        const response = await apiClient.get<Customer[] | { items?: Customer[]; data?: Customer[]; customers?: Customer[] }>("/customers");

        if (Array.isArray(response)) {
            return response;
        }

        return response.items ?? response.data ?? response.customers ?? [];
    },

    getById: (id: number) =>
        apiClient.get<Customer>(`/customers/${id}`),

    create: (customer: NewCustomer) =>
        apiClient.post<Customer>("/customers", customer),

    update: (customer: Customer) =>
        apiClient.put<Customer>(`/customers/${customer.id}`, customer),

    delete: (id: number) =>
        apiClient.delete<void>(`/customers/${id}`),
};
