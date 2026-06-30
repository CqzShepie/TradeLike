import { apiClient } from "./apiClient";
import type {
  AdminUser,
  CreateStaffUserRequest,
  StaffInviteResponse,
} from "../types/admin";

function cleanInviteRequest(request: CreateStaffUserRequest) {
  return {
    ...request,
    firstName: request.firstName.trim(),
    lastName: request.lastName.trim(),
    email: request.email.trim().toLowerCase(),
    password: request.password ?? "",
    personalAssistantTo: request.personalAssistantTo.trim(),
    adminNotes: request.adminNotes.trim(),
  };
}

export const staffInviteService = {
  async inviteStaff(request: CreateStaffUserRequest) {
    return (await apiClient.post(
      "/admin/staff/invite",
      cleanInviteRequest(request)
    )) as StaffInviteResponse;
  },

  async resendInvite(staffId: number) {
    return (await apiClient.post(
      `/admin/staff/${staffId}/resend-invite`,
      {}
    )) as StaffInviteResponse;
  },

  async forcePasswordReset(staffId: number) {
    return (await apiClient.post(
      `/admin/staff/${staffId}/force-password-reset`,
      {}
    )) as AdminUser;
  },

  async markInviteAccepted(staffId: number) {
    return (await apiClient.post(
      `/admin/staff/${staffId}/mark-invite-accepted`,
      {}
    )) as AdminUser;
  },
};
