import type { Customer } from "../types/customer";
import type { NewCustomer } from "../types/newCustomer";
import { apiClient } from "./apiClient";

export const customersService = {
  getAll: () => apiClient.get<Customer[]>("/customers"),

  create: (customer: NewCustomer) =>
    apiClient.post<Customer>("/customers", customer),

  update: (customer: Customer) =>
    apiClient.put<Customer>(`/customers/${customer.id}`, customer),

  delete: (id: number) =>
    apiClient.delete<void>(`/customers/${id}`),
};