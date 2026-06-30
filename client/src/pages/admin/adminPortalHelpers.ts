import type { AdminUser, StaffRole } from "../../types/admin";
import { permissionDefinitions, staffRoles } from "./adminPortalConstants";
import type { PermissionFlags } from "./adminPortalTypes";

export function formatStatus(value: string) {
  if (value === "PastDue") {
    return "Past Due";
  }

  if (value === "GracePeriod") {
    return "Grace Period";
  }

  return value;
}

export function summarisePermissions(user: AdminUser) {
  if (user.role === "Director") {
    return "Full access";
  }

  const count = permissionDefinitions
    .map(permission => Boolean(user[permission.key]))
    .filter(Boolean).length;

  return `${count} permissions`;
}

export function toStaffRole(value: string): StaffRole {
  return staffRoles.includes(value as StaffRole)
    ? (value as StaffRole)
    : "Support";
}

export function getPermissionsFromUser(user: AdminUser): PermissionFlags {
  return {
    canManageAccounts: user.canManageAccounts,
    canManageStaff: user.canManageStaff,
    canManageBilling: user.canManageBilling,
    canManageSecurity: user.canManageSecurity,
    canViewAuditLogs: user.canViewAuditLogs,
    canCreateCustomers: user.canCreateCustomers,
    canEditCustomers: user.canEditCustomers,
    canCancelCustomers: user.canCancelCustomers,
    canResetPasswords: user.canResetPasswords,
    canVerifyEmails: user.canVerifyEmails,
    canSendEmails: user.canSendEmails,
    canManageDiscounts: user.canManageDiscounts,
    canManageFreeMonths: user.canManageFreeMonths,
    canViewCustomerNotes: user.canViewCustomerNotes,
    canEditCustomerNotes: user.canEditCustomerNotes,
    canViewBilling: user.canViewBilling,
    canManageSubscriptions: user.canManageSubscriptions,
    canExportData: user.canExportData,
    canImpersonateCustomer: user.canImpersonateCustomer,
    canDeleteData: user.canDeleteData,
    canViewStaff: user.canViewStaff,
    canCreateStaff: user.canCreateStaff,
    canCancelStaff: user.canCancelStaff,
    canEditStaffPermissions: user.canEditStaffPermissions,
    canViewSecurityLogs: user.canViewSecurityLogs,
  };
}

export function allPermissions(): PermissionFlags {
  return Object.fromEntries(
    permissionDefinitions.map(permission => [permission.key, true])
  ) as PermissionFlags;
}

export function toDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function formatDateTime(value: string) {
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  const normalisedValue = hasTimezone ? value : `${value}Z`;
  const date = new Date(normalisedValue);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== ""
    ? error.message
    : fallback;
}