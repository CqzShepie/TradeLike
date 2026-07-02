export type AdminAccountStatus =
  | "Trial"
  | "Active"
  | "InvitePending"
  | "PastDue"
  | "Suspended"
  | "Cancelled";

export type AdminDiscountType = "None" | "Amount" | "Percentage";

export type AdminRole =
  | "Customer"
  | "CustomerDirector"
  | "CustomerManager"
  | "CustomerEmployee"
  | "Director"
  | "Admin"
  | "Support"
  | "Junior Developer"
  | "Developer"
  | "Senior Developer"
  | "Marketing"
  | "Customer Service"
  | "Operations Coordinator"
  | "Personal Assistant";

export type StaffRole = Exclude<
  AdminRole,
  "Customer" | "CustomerDirector" | "CustomerManager" | "CustomerEmployee"
>;

export type SubscriptionPlan =
  | "Solo"
  | "Team"
  | "Business"
  | "Enterprise"
  | "Internal";

export type BillingStatus =
  | "Trial"
  | "Active"
  | "PastDue"
  | "GracePeriod"
  | "Suspended"
  | "Cancelled"
  | "Internal";

export type HealthStatus = "Green" | "Amber" | "Red";

export type AdminUser = {
  id: number;
  tenantId?: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: AdminRole;
  personalAssistantTo?: string | null;
  accountStatus: AdminAccountStatus;
  isEmailVerified: boolean;
  emailVerificationSentAt?: string | null;
  discountType: AdminDiscountType;
  discountValue: number;
  freeMonths: number;
  freeMonthsExpireAt?: string | null;
  passwordResetRequired: boolean;

  businessName?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
  subscriptionPlan: SubscriptionPlan;
  billingStatus: BillingStatus;
  trialEndsAt?: string | null;
  adminTags?: string | null;
  supportNotes?: string | null;
  healthStatus: HealthStatus;
  lastLoginAt?: string | null;
  accountSource?: string | null;
  cancelReason?: string | null;
  onboardingEmailSentAt?: string | null;

  canManageAccounts: boolean;
  canManageStaff: boolean;
  canManageBilling: boolean;
  canManageSecurity: boolean;
  canViewAuditLogs: boolean;

  canCreateCustomers: boolean;
  canEditCustomers: boolean;
  canCancelCustomers: boolean;
  canResetPasswords: boolean;
  canVerifyEmails: boolean;
  canSendEmails: boolean;
  canManageDiscounts: boolean;
  canManageFreeMonths: boolean;
  canViewCustomerNotes: boolean;
  canEditCustomerNotes: boolean;
  canViewBilling: boolean;
  canManageSubscriptions: boolean;
  canExportData: boolean;
  canImpersonateCustomer: boolean;
  canDeleteData: boolean;
  canViewStaff: boolean;
  canCreateStaff: boolean;
  canCancelStaff: boolean;
  canEditStaffPermissions: boolean;
  canViewSecurityLogs: boolean;

  adminNotes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type CreateAdminUserRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  accountStatus: AdminAccountStatus;
  businessName: string;
  ownerName: string;
  ownerPhone: string;
  subscriptionPlan: SubscriptionPlan;
  billingStatus: BillingStatus;
  trialEndsAt?: string | null;
  freeMonthsExpireAt?: string | null;
  adminTags: string;
  supportNotes: string;
  healthStatus: HealthStatus;
  accountSource: string;
  cancelReason: string;
  adminNotes: string;
};

export type UpdateAdminUserAccountRequest = {
  accountStatus: AdminAccountStatus;
  discountType: AdminDiscountType;
  discountValue: number;
  freeMonths: number;
  freeMonthsExpireAt?: string | null;
  businessName: string;
  ownerName: string;
  ownerPhone: string;
  subscriptionPlan: SubscriptionPlan;
  billingStatus: BillingStatus;
  trialEndsAt?: string | null;
  adminTags: string;
  supportNotes: string;
  healthStatus: HealthStatus;
  accountSource: string;
  cancelReason: string;
  adminNotes: string;
  reason: string;
};

export type ResetAdminUserPasswordRequest = {
  sendResetLink: boolean;
  forcePasswordReset: boolean;
};

export type ResetAdminUserPasswordResponse = {
  message: string;
  resetLink?: string;
  expiresAtUtc?: string;
  user: AdminUser;
};

export type CreateStaffUserRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: StaffRole;
  personalAssistantTo: string;

  canManageAccounts: boolean;
  canManageStaff: boolean;
  canManageBilling: boolean;
  canManageSecurity: boolean;
  canViewAuditLogs: boolean;

  canCreateCustomers: boolean;
  canEditCustomers: boolean;
  canCancelCustomers: boolean;
  canResetPasswords: boolean;
  canVerifyEmails: boolean;
  canSendEmails: boolean;
  canManageDiscounts: boolean;
  canManageFreeMonths: boolean;
  canViewCustomerNotes: boolean;
  canEditCustomerNotes: boolean;
  canViewBilling: boolean;
  canManageSubscriptions: boolean;
  canExportData: boolean;
  canImpersonateCustomer: boolean;
  canDeleteData: boolean;
  canViewStaff: boolean;
  canCreateStaff: boolean;
  canCancelStaff: boolean;
  canEditStaffPermissions: boolean;
  canViewSecurityLogs: boolean;

  adminNotes: string;
};

export type StaffInviteResponse = {
  message: string;
  inviteLink?: string;
  inviteExpiresAt?: string | null;
  user: AdminUser;
};

export type UpdateCustomerPlanRequest = {
  plan: SubscriptionPlan;
  seatsPurchased: number;
  billingStatus?: BillingStatus;
  reason: string;
};

export type UpdateCustomerDiscountRequest = {
  discountType: AdminDiscountType | "FixedAmount";
  discountValue: number;
  expiresAtUtc?: string | null;
  reason: string;
};

export type UpdateCustomerFreeMonthsRequest = {
  freeMonths: number;
  expiresAtUtc?: string | null;
  reason: string;
};

export type UpdateCustomerStatusRequest = {
  accountStatus: AdminAccountStatus;
  billingStatus?: BillingStatus;
  reason: string;
};

export type AddCustomerSupportNoteRequest = {
  note: string;
  tags?: string[];
};

export type UpdateStaffPermissionsRequest = {
  role: StaffRole;
  personalAssistantTo: string;
  accountStatus: AdminAccountStatus;

  canManageAccounts: boolean;
  canManageStaff: boolean;
  canManageBilling: boolean;
  canManageSecurity: boolean;
  canViewAuditLogs: boolean;

  canCreateCustomers: boolean;
  canEditCustomers: boolean;
  canCancelCustomers: boolean;
  canResetPasswords: boolean;
  canVerifyEmails: boolean;
  canSendEmails: boolean;
  canManageDiscounts: boolean;
  canManageFreeMonths: boolean;
  canViewCustomerNotes: boolean;
  canEditCustomerNotes: boolean;
  canViewBilling: boolean;
  canManageSubscriptions: boolean;
  canExportData: boolean;
  canImpersonateCustomer: boolean;
  canDeleteData: boolean;
  canViewStaff: boolean;
  canCreateStaff: boolean;
  canCancelStaff: boolean;
  canEditStaffPermissions: boolean;
  canViewSecurityLogs: boolean;

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
