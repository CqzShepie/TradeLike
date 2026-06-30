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

function cleanDate(value?: string | null) {
  return value && value.trim() !== "" ? value : null;
}

async function copyInviteLink(inviteLink?: string) {
  if (!inviteLink) {
    return;
  }

  await navigator.clipboard?.writeText(inviteLink).catch(() => undefined);
  window.alert(`Invite link copied if your browser allowed it:\n\n${inviteLink}`);
}

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
      businessName: request.businessName.trim(),
      ownerName: request.ownerName.trim(),
      ownerPhone: request.ownerPhone.trim(),
      subscriptionPlan: request.subscriptionPlan,
      billingStatus: request.billingStatus,
      trialEndsAt: cleanDate(request.trialEndsAt),
      freeMonthsExpireAt: cleanDate(request.freeMonthsExpireAt),
      adminTags: request.adminTags.trim(),
      supportNotes: request.supportNotes.trim(),
      healthStatus: request.healthStatus,
      accountSource: request.accountSource.trim(),
      cancelReason: request.cancelReason.trim(),
      adminNotes: request.adminNotes.trim(),
    })) as AdminUser;
  },

  async updateAccount(userId: number, request: UpdateAdminUserAccountRequest) {
    return (await apiClient.put(`/admin/users/${userId}/account`, {
      accountStatus: request.accountStatus,
      discountType: request.discountType,
      discountValue: Number(request.discountValue || 0),
      freeMonths: Number(request.freeMonths || 0),
      freeMonthsExpireAt: cleanDate(request.freeMonthsExpireAt),
      businessName: request.businessName.trim(),
      ownerName: request.ownerName.trim(),
      ownerPhone: request.ownerPhone.trim(),
      subscriptionPlan: request.subscriptionPlan,
      billingStatus: request.billingStatus,
      trialEndsAt: cleanDate(request.trialEndsAt),
      adminTags: request.adminTags.trim(),
      supportNotes: request.supportNotes.trim(),
      healthStatus: request.healthStatus,
      accountSource: request.accountSource.trim(),
      cancelReason: request.cancelReason.trim(),
      adminNotes: request.adminNotes.trim(),
    })) as AdminUser;
  },

  async reactivateCustomer(userId: number) {
    return (await apiClient.post(`/admin/users/${userId}/reactivate`, {})) as AdminUser;
  },

  async getCustomerTimeline(userId: number) {
    return (await apiClient.get(`/admin/users/${userId}/timeline`)) as AdminAuditLog[];
  },

  async resetPassword(userId: number, request: ResetAdminUserPasswordRequest) {
    return (await apiClient.post(`/admin/users/${userId}/reset-password`, {
      newPassword: request.newPassword,
      requirePasswordReset: request.requirePasswordReset,
    })) as AdminUser;
  },

  async markEmailVerified(userId: number) {
    return (await apiClient.post(`/admin/users/${userId}/mark-email-verified`, {})) as AdminUser;
  },

  async sendVerificationEmail(userId: number) {
    return (await apiClient.post(`/admin/users/${userId}/send-verification-email`, {})) as {
      message: string;
      user: AdminUser;
    };
  },

  async sendOnboardingEmail(userId: number) {
    return (await apiClient.post(`/admin/users/${userId}/send-onboarding-email`, {})) as {
      message: string;
      user: AdminUser;
    };
  },

  async getStaff() {
    return (await apiClient.get("/admin/staff")) as AdminUser[];
  },

  async createStaff(request: CreateStaffUserRequest) {
    const response = (await apiClient.post("/admin/staff/invite", {
      ...request,
      firstName: request.firstName.trim(),
      lastName: request.lastName.trim(),
      email: request.email.trim().toLowerCase(),
      personalAssistantTo: request.personalAssistantTo.trim(),
      adminNotes: request.adminNotes.trim(),
    })) as {
      message: string;
      inviteLink?: string;
      inviteExpiresAt?: string | null;
      user: AdminUser;
    };

    await copyInviteLink(response.inviteLink);

    return response.user;
  },

  async resendStaffInvite(staffId: number) {
    const response = (await apiClient.post(`/admin/staff/${staffId}/resend-invite`, {})) as {
      message: string;
      inviteLink?: string;
      inviteExpiresAt?: string | null;
      user: AdminUser;
    };

    await copyInviteLink(response.inviteLink);

    return response.user;
  },

  async removeStaffRecord(staffId: number) {
    return (await apiClient.post(`/admin/staff/${staffId}/remove-record`, {})) as {
      message: string;
    };
  },

  async updateStaffPermissions(staffId: number, request: UpdateStaffPermissionsRequest) {
    return (await apiClient.put(`/admin/staff/${staffId}/permissions`, {
      ...request,
      personalAssistantTo: request.personalAssistantTo.trim(),
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
