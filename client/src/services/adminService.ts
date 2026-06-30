import { apiClient } from "./apiClient";
import type {
  AdminAuditLog,
  AdminUser,
  CreateAdminUserRequest,
  CreateStaffUserRequest,
  ResetAdminUserPasswordRequest,
  UpdateAdminUserAccountRequest,
  UpdateStaffPermissionsRequest,
} from "../types/admin";

export const adminService = {
  async getUsers(search = "") {
    const query = search.trim();

    const endpoint =
      query === ""
        ? "/admin/users"
        : `/admin/users?search=${encodeURIComponent(query)}`;

    return (await apiClient.get(endpoint)) as AdminUser[];
  },

  async createUser(request: CreateAdminUserRequest) {
    return (await apiClient.post("/admin/users", {
      firstName: request.firstName.trim(),
      lastName: request.lastName.trim(),
      email: request.email.trim().toLowerCase(),
      password: request.password,
      accountStatus: request.accountStatus,
      adminNotes: request.adminNotes.trim(),
    })) as AdminUser;
  },

  async updateAccount(userId: number, request: UpdateAdminUserAccountRequest) {
    return (await apiClient.put(`/admin/users/${userId}/account`, {
      accountStatus: request.accountStatus,
      discountType: request.discountType,
      discountValue: Number(request.discountValue || 0),
      freeMonths: Number(request.freeMonths || 0),
      adminNotes: request.adminNotes.trim(),
    })) as AdminUser;
  },

  async resetPassword(userId: number, request: ResetAdminUserPasswordRequest) {
    return (await apiClient.post(`/admin/users/${userId}/reset-password`, {
      newPassword: request.newPassword,
      requirePasswordReset: request.requirePasswordReset,
    })) as AdminUser;
  },

  async markEmailVerified(userId: number) {
    return (await apiClient.post(
      `/admin/users/${userId}/mark-email-verified`,
      {}
    )) as AdminUser;
  },

  async sendVerificationEmail(userId: number) {
    const response = (await apiClient.post(
      `/admin/users/${userId}/send-verification-email`,
      {}
    )) as {
      message: string;
      user: AdminUser;
    };

    return response;
  },

  async getStaff() {
    return (await apiClient.get("/admin/staff")) as AdminUser[];
  },

  async createStaff(request: CreateStaffUserRequest) {
    return (await apiClient.post("/admin/staff", {
      ...request,
      firstName: request.firstName.trim(),
      lastName: request.lastName.trim(),
      email: request.email.trim().toLowerCase(),
      adminNotes: request.adminNotes.trim(),
    })) as AdminUser;
  },

  async updateStaffPermissions(
    staffId: number,
    request: UpdateStaffPermissionsRequest
  ) {
    return (await apiClient.put(`/admin/staff/${staffId}/permissions`, {
      ...request,
      adminNotes: request.adminNotes.trim(),
    })) as AdminUser;
  },

  async getAuditLogs(search = "") {
    const query = search.trim();

    const endpoint =
      query === ""
        ? "/admin/audit-logs"
        : `/admin/audit-logs?search=${encodeURIComponent(query)}`;

    return (await apiClient.get(endpoint)) as AdminAuditLog[];
  },
};