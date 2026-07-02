export type CustomerSettingsRole =
  | "CustomerDirector"
  | "CustomerManager"
  | "CustomerEmployee"
  | "Customer"
  | "Director";

export type BusinessSettings = {
  id: number;
  tenantId: number;
  businessName: string;
  legalName?: string | null;
  logoUrl?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  town?: string | null;
  county?: string | null;
  postcode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  vatNumber?: string | null;
  companyNumber?: string | null;
  defaultVatRate: number;
  quotePrefix: string;
  invoicePrefix: string;
  paymentTerms?: string | null;
  quoteExpiryDays: number;
  defaultQuoteNotes?: string | null;
  defaultInvoiceNotes?: string | null;
  replyToEmail?: string | null;
  defaultJobPriority: string;
  defaultScheduleView: string;
  defaultReportRange: string;
  includeCompletedInReports: boolean;
  includeArchivedInReports: boolean;
  lowStockThreshold: number;
  purchaseOrderPrefix: string;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankSortCode?: string | null;
  bankAccountNumber?: string | null;
  emailFooter?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type CustomerSettingsAccount = {
  userId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: CustomerSettingsRole;
  businessName: string;
  ownerName?: string | null;
  ownerPhone?: string | null;
  accountStatus: string;
  planName: string;
  billingStatus: string;
  canEdit: boolean;
};

export type CustomerSettingsSecurity = {
  isEmailVerified: boolean;
  emailVerificationSentAt?: string | null;
  passwordResetRequired: boolean;
  lastLoginAtUtc?: string | null;
  sessionExpiresAtUtc?: string | null;
};

export type CustomerSettingsPlanBilling = {
  planName: string;
  billingStatus: string;
  monthlyPricePence?: number | null;
  maxIncludedUsers?: number | null;
  seatsPurchased: number;
  billingStartUtc?: string | null;
  nextInvoiceDateUtc?: string | null;
  trialEndsAtUtc?: string | null;
  accountStatus: string;
};

export type CustomerSettingsJobDefaults = {
  defaultJobPriority: string;
  defaultScheduleView: string;
  canEdit: boolean;
};

export type CustomerSettingsDocumentDefaults = {
  defaultVatRate: number;
  quotePrefix: string;
  invoicePrefix: string;
  quoteExpiryDays: number;
  paymentTerms?: string | null;
  defaultQuoteNotes?: string | null;
  defaultInvoiceNotes?: string | null;
  replyToEmail?: string | null;
  emailFooter?: string | null;
  canEdit: boolean;
};

export type CustomerSettingsReportDefaults = {
  defaultReportRange: string;
  includeCompletedInReports: boolean;
  includeArchivedInReports: boolean;
  canEdit: boolean;
};

export type CustomerSettingsInventoryDefaults = {
  lowStockThreshold: number;
  purchaseOrderPrefix: string;
  canEdit: boolean;
};

export type CustomerSettingsNotifications = {
  automatedSenderEmail: string;
  supportInboxEmail: string;
  salesInboxEmail: string;
  generalInboxEmail: string;
  businessReplyToEmail?: string | null;
  emailStatus: string;
};

export type CustomerSettingsTeamMember = {
  id: number;
  name: string;
  email: string;
  role: CustomerSettingsRole;
  status: string;
  isCurrentUser: boolean;
  canEditRole: boolean;
  canEditStatus: boolean;
};

export type CustomerSettings = {
  account: CustomerSettingsAccount;
  businessProfile: BusinessSettings;
  security: CustomerSettingsSecurity;
  planBilling: CustomerSettingsPlanBilling;
  jobDefaults: CustomerSettingsJobDefaults;
  documentDefaults: CustomerSettingsDocumentDefaults;
  reportDefaults: CustomerSettingsReportDefaults;
  inventoryDefaults: CustomerSettingsInventoryDefaults;
  notifications: CustomerSettingsNotifications;
  teamMembers: CustomerSettingsTeamMember[];
};

export type UpdateAccountSettingsRequest = {
  firstName: string;
  lastName: string;
  businessName?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
};

export type UpdateBusinessProfileSettingsRequest = {
  businessName: string;
  legalName?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  town?: string | null;
  county?: string | null;
  postcode?: string | null;
  country?: string | null;
  website?: string | null;
  vatNumber?: string | null;
  companyNumber?: string | null;
};

export type UpdateJobDefaultsSettingsRequest = {
  defaultJobPriority: string;
  defaultScheduleView: string;
};

export type UpdateDocumentDefaultsSettingsRequest = {
  defaultVatRate: number;
  quotePrefix: string;
  invoicePrefix: string;
  quoteExpiryDays: number;
  paymentTerms?: string | null;
  defaultQuoteNotes?: string | null;
  defaultInvoiceNotes?: string | null;
  replyToEmail?: string | null;
  emailFooter?: string | null;
};

export type UpdateReportDefaultsSettingsRequest = {
  defaultReportRange: string;
  includeCompletedInReports: boolean;
  includeArchivedInReports: boolean;
};

export type UpdateInventoryDefaultsSettingsRequest = {
  lowStockThreshold: number;
  purchaseOrderPrefix: string;
};

export type UpdateCustomerSettingsTeamMemberRequest = {
  role: "CustomerManager" | "CustomerEmployee";
  status: "Active" | "Suspended" | "Cancelled";
};
