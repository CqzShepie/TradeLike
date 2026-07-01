import { apiClient } from "./apiClient";
import type { UserRole } from "./authService";

export type CustomerUser = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  status: string;
};

export const usersService = {
  async getUsers() {
    return (await apiClient.get("/users")) as CustomerUser[];
  },

  async updateRole(id: number, role: "CustomerManager" | "CustomerEmployee") {
    return (await apiClient.put(`/users/${id}/role`, { role })) as CustomerUser;
  },
};
