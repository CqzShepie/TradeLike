import type {
  AdminAccountStatus,
  AdminDiscountType,
  BillingStatus,
  StaffRole,
  SubscriptionPlan,
} from "../../types/admin";
import type { PermissionFlags, PermissionKey } from "./adminPortalTypes";

export const permanentDirectorEmail = "admin@tradelike.co.uk";

export const accountStatuses: AdminAccountStatus[] = [
  "Trial",
  "Active",
  "PastDue",
  "Suspended",
  "Cancelled",
];

export const staffStatuses: AdminAccountStatus[] = [
  "Active",
  "Suspended",
  "Cancelled",
];

export const discountTypes: AdminDiscountType[] = [
  "None",
  "Amount",
  "Percentage",
];

export const subscriptionPlans: SubscriptionPlan[] = [
  "Solo",
  "Team",
  "Business",
  "Enterprise",
  "Internal",
];

export const billingStatuses: BillingStatus[] = [
  "Trial",
  "Active",
  "PastDue",
  "GracePeriod",
  "Suspended",
  "Cancelled",
  "Internal",
];

export const staffRoles: StaffRole[] = [
  "Director",
  "Admin",
  "Support",
  "Junior Developer",
  "Developer",
  "Senior Developer",
  "Marketing",
  "Customer Service",
  "Operations Coordinator",
  "Personal Assistant",
];

export const permissionDefinitions: Array<{
  key: PermissionKey;
  label: string;
  group: string;
}> = [
  { key: "canManageAccounts", label: "Legacy: manage accounts", group: "Legacy access" },
  { key: "canManageStaff", label: "Legacy: manage staff", group: "Legacy access" },
  { key: "canManageBilling", label: "Legacy: manage billing", group: "Legacy access" },
  { key: "canManageSecurity", label: "Legacy: manage security", group: "Legacy access" },
  { key: "canViewAuditLogs", label: "View audit logs", group: "Security" },

  { key: "canCreateCustomers", label: "Create customers", group: "Customers" },
  { key: "canEditCustomers", label: "Edit customers", group: "Customers" },
  { key: "canCancelCustomers", label: "Cancel customers", group: "Customers" },
  { key: "canViewCustomerNotes", label: "View customer notes", group: "Customers" },
  { key: "canEditCustomerNotes", label: "Edit customer notes", group: "Customers" },

  { key: "canViewBilling", label: "View billing", group: "Billing" },
  { key: "canManageDiscounts", label: "Manage discounts", group: "Billing" },
  { key: "canManageFreeMonths", label: "Manage free months", group: "Billing" },
  { key: "canManageSubscriptions", label: "Manage subscriptions", group: "Billing" },

  { key: "canResetPasswords", label: "Reset passwords", group: "Security" },
  { key: "canVerifyEmails", label: "Verify emails", group: "Security" },
  { key: "canViewSecurityLogs", label: "View security logs", group: "Security" },

  { key: "canSendEmails", label: "Send emails", group: "Emails" },

  { key: "canViewStaff", label: "View staff", group: "Staff" },
  { key: "canCreateStaff", label: "Create staff", group: "Staff" },
  { key: "canCancelStaff", label: "Cancel staff", group: "Staff" },
  { key: "canEditStaffPermissions", label: "Edit staff permissions", group: "Staff" },

  { key: "canExportData", label: "Export data", group: "Data" },

  { key: "canImpersonateCustomer", label: "Impersonate customer", group: "Power permissions" },
  { key: "canDeleteData", label: "Delete data", group: "Power permissions" },
];

export const blankPermissions: PermissionFlags = {
  canManageAccounts: false,
  canManageStaff: false,
  canManageBilling: false,
  canManageSecurity: false,
  canViewAuditLogs: false,
  canCreateCustomers: false,
  canEditCustomers: false,
  canCancelCustomers: false,
  canResetPasswords: false,
  canVerifyEmails: false,
  canSendEmails: false,
  canManageDiscounts: false,
  canManageFreeMonths: false,
  canViewCustomerNotes: false,
  canEditCustomerNotes: false,
  canViewBilling: false,
  canManageSubscriptions: false,
  canExportData: false,
  canImpersonateCustomer: false,
  canDeleteData: false,
  canViewStaff: false,
  canCreateStaff: false,
  canCancelStaff: false,
  canEditStaffPermissions: false,
  canViewSecurityLogs: false,
};
