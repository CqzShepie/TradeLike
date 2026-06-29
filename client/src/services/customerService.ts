import { apiClient } from "./apiClient";

import type { Customer } from "../types/customer";
import type { NewCustomer } from "../types/newCustomer";

export const customerService = {
  getAll() {
    return apiClient.get<Customer[]>("/customers");
  },

  create(customer: NewCustomer) {
    return apiClient.post<Customer>("/customers", customer);
  },

  update(customer: Customer) {
    return apiClient.put<Customer>(
      `/customers/${customer.id}`,
      customer
    );
  },

  delete(id: number) {
    return apiClient.delete<void>(`/customers/${id}`);
  },
};