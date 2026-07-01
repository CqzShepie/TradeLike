import { apiClient } from "./apiClient";

export type StaffCategory = {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type StaffRolePreset = {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  permissions: string[];
  createdAt: string;
  updatedAt?: string | null;
};

export type StaffSettings = {
  categories: StaffCategory[];
  rolePresets: StaffRolePreset[];
  permissionGroups: string[];
};

export type CreateStaffCategoryRequest = {
  name: string;
  description?: string | null;
};

export type CreateStaffRolePresetRequest = {
  name: string;
  categoryId: number;
  permissions: string[];
};

const legacyPermissionLabels: Record<string, string | null> = {
  "Customer accounts": "Customer records",
  "Customer notes": "Add/View Customer Notes",
  "Billing and subscriptions": "Payments",
  "Discounts and free months": "Offers and promotions",
  "Password resets": "Staff password resets",
  "Security logs": "Business settings",
  "Audit logs": "Activity log",
  "Data exports": "Reports and exports",
  "Customer impersonation": null,
};

const allowedPermissions = [
  "Full access",
  "Customer records",
  "Add/View Customer Notes",
  "Manage Customer Notes",
  "Jobs and scheduling",
  "Quotes and invoices",
  "Payments",
  "Offers and promotions",
  "Staff password resets",
  "Email customers",
  "Staff management",
  "Staff invites",
  "Business settings",
  "Activity log",
  "Reports and exports",
];

const allowedPermissionSet = new Set(allowedPermissions.map(permission => permission.toLowerCase()));

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

function displayPermission(permission: string) {
  const cleaned = permission.trim();
  const mapped = Object.prototype.hasOwnProperty.call(legacyPermissionLabels, cleaned)
    ? legacyPermissionLabels[cleaned]
    : cleaned;

  if (mapped === null) {
    return null;
  }

  return allowedPermissionSet.has(mapped.toLowerCase()) ? mapped : null;
}

function uniquePermissions(permissions: string[]) {
  const seen = new Set<string>();

  return permissions
    .map(displayPermission)
    .filter((permission): permission is string => Boolean(permission))
    .filter(permission => {
      const key = permission.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function toDisplaySettings(settings: StaffSettings): StaffSettings {
  return {
    ...settings,
    permissionGroups: uniquePermissions([...allowedPermissions, ...settings.permissionGroups]),
    rolePresets: settings.rolePresets.map((rolePreset: StaffRolePreset) => ({
      ...rolePreset,
      permissions: uniquePermissions(rolePreset.permissions),
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
      permissions: uniquePermissions(request.permissions),
    }));
  },

  async deleteRolePreset(rolePresetId: number) {
    return toDisplaySettings(await apiClient.delete<StaffSettings>(`/staff-settings/role-presets/${rolePresetId}`));
  },
};

