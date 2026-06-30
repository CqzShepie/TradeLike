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
