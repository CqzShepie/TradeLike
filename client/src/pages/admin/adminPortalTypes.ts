export type AdminSection = "accounts" | "staff" | "audit";

export type PermissionKey =
  | "canManageAccounts"
  | "canManageStaff"
  | "canManageBilling"
  | "canManageSecurity"
  | "canViewAuditLogs"
  | "canCreateCustomers"
  | "canEditCustomers"
  | "canCancelCustomers"
  | "canResetPasswords"
  | "canVerifyEmails"
  | "canSendEmails"
  | "canManageDiscounts"
  | "canManageFreeMonths"
  | "canViewCustomerNotes"
  | "canEditCustomerNotes"
  | "canViewBilling"
  | "canManageSubscriptions"
  | "canExportData"
  | "canImpersonateCustomer"
  | "canDeleteData"
  | "canViewStaff"
  | "canCreateStaff"
  | "canCancelStaff"
  | "canEditStaffPermissions"
  | "canViewSecurityLogs";

export type PermissionFlags = Record<PermissionKey, boolean>;