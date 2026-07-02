import { apiClient } from "./apiClient";
import { authService } from "./authService";
import type {
  CustomerSettings,
  CustomerSettingsAccount,
  CustomerSettingsDocumentDefaults,
  CustomerSettingsInventoryDefaults,
  CustomerSettingsJobDefaults,
  CustomerSettingsReportDefaults,
  CustomerSettingsTeamMember,
  UpdateAccountSettingsRequest,
  UpdateBusinessProfileSettingsRequest,
  UpdateCustomerSettingsTeamMemberRequest,
  UpdateDocumentDefaultsSettingsRequest,
  UpdateInventoryDefaultsSettingsRequest,
  UpdateJobDefaultsSettingsRequest,
  UpdateReportDefaultsSettingsRequest,
} from "../types/settings";

export const settingsService = {
  async getSettings() {
    return await apiClient.get<CustomerSettings>("/settings");
  },

  async updateAccount(request: UpdateAccountSettingsRequest) {
    const account = await apiClient.put<CustomerSettingsAccount>("/settings/account", {
      firstName: request.firstName.trim(),
      lastName: request.lastName.trim(),
      businessName: request.businessName?.trim() || null,
      ownerName: request.ownerName?.trim() || null,
      ownerPhone: request.ownerPhone?.trim() || null,
    });

    authService.updateStoredUser({
      name: account.fullName,
    });

    return account;
  },

  async updateBusinessProfile(request: UpdateBusinessProfileSettingsRequest) {
    return await apiClient.put<CustomerSettings["businessProfile"]>("/settings/business-profile", cleanRecord(request));
  },

  async updateJobDefaults(request: UpdateJobDefaultsSettingsRequest) {
    return await apiClient.put<CustomerSettingsJobDefaults>("/settings/job-defaults", request);
  },

  async updateDocumentDefaults(request: UpdateDocumentDefaultsSettingsRequest) {
    return await apiClient.put<CustomerSettingsDocumentDefaults>("/settings/document-defaults", cleanRecord(request));
  },

  async updateReportDefaults(request: UpdateReportDefaultsSettingsRequest) {
    return await apiClient.put<CustomerSettingsReportDefaults>("/settings/report-defaults", request);
  },

  async updateInventoryDefaults(request: UpdateInventoryDefaultsSettingsRequest) {
    return await apiClient.put<CustomerSettingsInventoryDefaults>("/settings/inventory-defaults", request);
  },

  async getTeamMembers() {
    return await apiClient.get<CustomerSettingsTeamMember[]>("/settings/team");
  },

  async updateTeamMember(id: number, request: UpdateCustomerSettingsTeamMemberRequest) {
    return await apiClient.put<CustomerSettingsTeamMember>(`/settings/team/${id}`, request);
  },
};

function cleanRecord<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        return [key, trimmed.length === 0 ? null : trimmed];
      }

      return [key, item];
    })
  ) as T;
}
