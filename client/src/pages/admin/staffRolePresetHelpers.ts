import type { StaffRolePreset } from "../../services/staffSettingsService";
import type { StaffRole } from "../../types/admin";
import { allPermissions } from "./adminPortalHelpers";
import { blankPermissions } from "./adminPortalConstants";
import type { PermissionFlags } from "./adminPortalTypes";

const safeFullAccess: PermissionFlags = {
  ...allPermissions(),
  canImpersonateCustomer: false,
  canDeleteData: false,
};

const permissionPresetMap: Record<string, Partial<PermissionFlags>> = {
  "Customer records": {
    canManageAccounts: true,
    canCreateCustomers: true,
    canEditCustomers: true,
  },
  "Customer notes": {
    canViewCustomerNotes: true,
    canEditCustomerNotes: true,
  },
  "Jobs and scheduling": {
    canManageAccounts: true,
    canCreateCustomers: true,
    canEditCustomers: true,
    canViewCustomerNotes: true,
  },
  "Quotes and invoices": {
    canManageBilling: true,
    canViewBilling: true,
    canManageSubscriptions: true,
  },
  "Payments": {
    canManageBilling: true,
    canViewBilling: true,
    canManageSubscriptions: true,
  },
  "Offers and promotions": {
    canManageDiscounts: true,
    canManageFreeMonths: true,
  },
  "Staff password resets": {
    canResetPasswords: true,
    canManageSecurity: true,
  },
  "Email customers": {
    canSendEmails: true,
    canVerifyEmails: true,
  },
  "Staff management": {
    canManageStaff: true,
    canViewStaff: true,
    canCreateStaff: true,
    canCancelStaff: true,
    canEditStaffPermissions: true,
  },
  "Staff invites": {
    canManageStaff: true,
    canViewStaff: true,
    canCreateStaff: true,
  },
  "Business settings": {
    canManageAccounts: true,
    canManageBilling: true,
    canManageSecurity: true,
  },
  "Activity log": {
    canViewAuditLogs: true,
  },
  "Reports and exports": {
    canExportData: true,
  },
};

export function permissionsFromRolePreset(preset: StaffRolePreset): PermissionFlags {
  if (preset.permissions.some(permission => permission.toLowerCase() === "full access")) {
    return safeFullAccess;
  }

  return preset.permissions.reduce<PermissionFlags>((permissions, permission) => ({
    ...permissions,
    ...(permissionPresetMap[permission] ?? {}),
  }), { ...blankPermissions });
}

export function staffRoleFromPreset(preset: StaffRolePreset): StaffRole {
  const name = preset.name.toLowerCase();
  const category = preset.categoryName.toLowerCase();

  if (name.includes("director") || name.includes("owner") || category.includes("leadership")) return "Director";
  if (name.includes("personal assistant") || category.includes("personal assistant")) return "Personal Assistant";
  if (name.includes("marketing") || category.includes("marketing")) return "Marketing";
  if (name.includes("operations") || name.includes("scheduler") || name.includes("dispatcher") || category.includes("operations") || category.includes("scheduling")) return "Operations Coordinator";
  if (name.includes("customer") || category.includes("customer support")) return "Customer Service";
  if (name.includes("accounts") || name.includes("office manager") || category.includes("accounts")) return "Admin";

  return "Support";
}
