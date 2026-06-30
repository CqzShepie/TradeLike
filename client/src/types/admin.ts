export type AdminAccountStatus =
  | "Trial"
  | "Active"
  | "PastDue"
  | "Suspended"
  | "Cancelled";

export type AdminDiscountType = "None" | "Amount" | "Percentage";

export type AdminRole = "Customer" | "Director" | "Admin" | "Support";

export type AdminUser = {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: AdminRole;
  accountStatus: AdminAccountStatus;
  isEmailVerified: boolean;
  emailVerificationSentAt?: string | null;
  discountType: AdminDiscountType;
  discountValue: number;
  freeMonths: number;
  passwordResetRequired: boolean;
  canManageAccounts: boolean;
  canManageStaff: boolean;
  canManageBilling: boolean;
  canManageSecurity: boolean;
  canViewAuditLogs: boolean;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type CreateAdminUserRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  accountStatus: AdminAccountStatus;
  adminNotes: string;
};

export type UpdateAdminUserAccountRequest = {
  accountStatus: AdminAccountStatus;
  discountType: AdminDiscountType;
  discountValue: number;
  freeMonths: number;
  adminNotes: string;
};

export type ResetAdminUserPasswordRequest = {
  newPassword: string;
  requirePasswordReset: boolean;
};

export type CreateStaffUserRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "Director" | "Admin" | "Support";
  canManageAccounts: boolean;
  canManageStaff: boolean;
  canManageBilling: boolean;
  canManageSecurity: boolean;
  canViewAuditLogs: boolean;
  adminNotes: string;
};

export type UpdateStaffPermissionsRequest = {
  role: "Director" | "Admin" | "Support";
  accountStatus: AdminAccountStatus;
  canManageAccounts: boolean;
  canManageStaff: boolean;
  canManageBilling: boolean;
  canManageSecurity: boolean;
  canViewAuditLogs: boolean;
  adminNotes: string;
};

export type AdminAuditLog = {
  id: number;
  actorUserId: number;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: number | null;
  targetEmail?: string | null;
  summary: string;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};