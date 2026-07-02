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

export type UpdateBusinessSettingsRequest = Omit<
  BusinessSettings,
  "id" | "createdAt" | "updatedAt"
>;
