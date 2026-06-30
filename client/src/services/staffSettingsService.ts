import { apiClient } from "./apiClient";
import type {
  CreateStaffCategoryRequest,
  CreateStaffRolePresetRequest,
  StaffSettings,
} from "../types/staffSettings";

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

export const staffSettingsService = {
  async getSettings() {
    return await apiClient.get<StaffSettings>("/staff-settings");
  },

  async createCategory(request: CreateStaffCategoryRequest) {
    return await apiClient.post<StaffSettings>("/staff-settings/categories", {
      name: clean(request.name),
      description: clean(request.description),
    });
  },

  async deleteCategory(categoryId: number) {
    return await apiClient.delete<StaffSettings>(`/staff-settings/categories/${categoryId}`);
  },

  async createRolePreset(request: CreateStaffRolePresetRequest) {
    return await apiClient.post<StaffSettings>("/staff-settings/role-presets", {
      name: clean(request.name),
      categoryId: request.categoryId,
      permissions: request.permissions,
    });
  },

  async deleteRolePreset(rolePresetId: number) {
    return await apiClient.delete<StaffSettings>(`/staff-settings/role-presets/${rolePresetId}`);
  },
};
