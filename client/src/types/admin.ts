export type AdminAccountStatus =
  | "Trial"
  | "Active"
  | "PastDue"
  | "Suspended"
  | "Cancelled";

export type AdminDiscountType = "None" | "Amount" | "Percentage";

export type AdminUser = {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: string;
  accountStatus: AdminAccountStatus;
  isEmailVerified: boolean;
  emailVerificationSentAt?: string | null;
  discountType: AdminDiscountType;
  discountValue: number;
  freeMonths: number;
  passwordResetRequired: boolean;
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