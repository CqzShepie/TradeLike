import { apiClient } from "./apiClient";
import type {
  CreateStaffCategoryRequest,
  CreateStaffRolePresetRequest,
  StaffSettings,
} from "../types/staffSettings";

const legacyPermissionLabels: Record<string, string> = {
  "Discounts and free months": "Offers and promotions",
};

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

function displayPermission(permission: string) {
  return legacyPermissionLabels[permission] ?? permission;
}

function toDisplaySettings(settings: StaffSettings): StaffSettings {
  return {
    ...settings,
    permissionGroups: settings.permissionGroups.map(displayPermission),
    rolePresets: settings.rolePresets.map(rolePreset => ({
      ...rolePreset,
      permissions: rolePreset.permissions.map(displayPermission),
    })),
  };
}

export const staffSettingsService = {
  async getSettings() {
    return toDisplaySettings(await apiClient.get<StaffSettings>("/staff-settings"));
  },

  async createCategory(request: CreateStaffCategoryRequest) {
    return toDisplaySettings(await apiClient.post<StaffSettings>("/staff-settings/categories", {
      name: clean(request.name),
      description: clean(request.description),
    }));
  },

  async deleteCategory(categoryId: number) {
    return toDisplaySettings(await apiClient.delete<StaffSettings>(`/staff-settings/categories/${categoryId}`));
  },

  async createRolePreset(request: CreateStaffRolePresetRequest) {
    return toDisplaySettings(await apiClient.post<StaffSettings>("/staff-settings/role-presets", {
      name: clean(request.name),
      categoryId: request.categoryId,
      permissions: request.permissions.map(displayPermission),
    }));
  },

  async deleteRolePreset(rolePresetId: number) {
    return toDisplaySettings(await apiClient.delete<StaffSettings>(`/staff-settings/role-presets/${rolePresetId}`));
  },
};
