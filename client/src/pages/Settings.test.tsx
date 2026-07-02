import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Settings from "./Settings";
import { GlobalSearchProvider } from "../contexts/GlobalSearchContext";
import type { AuthUser } from "../services/authService";
import type { CustomerSettings } from "../types/settings";
import { settingsService } from "../services/settingsService";
import { billingService } from "../services/billingService";
import { storageService } from "../services/storageService";

vi.mock("../services/settingsService", () => ({
  settingsService: {
    getSettings: vi.fn(),
    updateAccount: vi.fn(),
    updateBusinessProfile: vi.fn(),
    updateJobDefaults: vi.fn(),
    updateDocumentDefaults: vi.fn(),
    updateReportDefaults: vi.fn(),
    updateInventoryDefaults: vi.fn(),
    updateTeamMember: vi.fn(),
  },
}));

vi.mock("../services/billingService", () => ({
  billingService: {
    requestPlanChange: vi.fn(),
  },
}));

vi.mock("../services/storageService", () => ({
  STORAGE_LIMIT_BLOCKED_MESSAGE: "Storage limit reached. Existing files remain available, but new uploads are blocked.",
  storageService: {
    getUsage: vi.fn(),
    requestAddOn: vi.fn(),
    cancelAddOn: vi.fn(),
  },
}));

const mockedSettingsService = vi.mocked(settingsService);
const mockedBillingService = vi.mocked(billingService);
const mockedStorageService = vi.mocked(storageService);

const baseUser: AuthUser = {
  id: 1,
  email: "owner@example.com",
  name: "Trade Owner",
  role: "CustomerDirector",
  plan: "Solo",
  accountStatus: "Active",
  passwordResetRequired: false,
  canManageAccounts: true,
  canManageStaff: true,
  canManageBilling: true,
  canManageSecurity: true,
  canViewAuditLogs: false,
  canCreateCustomers: true,
  canEditCustomers: true,
  canCancelCustomers: false,
  canResetPasswords: false,
  canVerifyEmails: false,
  canSendEmails: false,
  canManageDiscounts: false,
  canManageFreeMonths: false,
  canViewCustomerNotes: false,
  canEditCustomerNotes: false,
  canViewBilling: true,
  canManageSubscriptions: true,
  canExportData: true,
  canImpersonateCustomer: false,
  canDeleteData: false,
  canViewStaff: true,
  canCreateStaff: false,
  canCancelStaff: false,
  canEditStaffPermissions: false,
  canViewSecurityLogs: false,
};

describe("Settings", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it("renders Account, Business profile and Security sections", async () => {
    arrange("Solo");
    renderSettings();

    expect(await screen.findByRole("heading", { name: /account/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /business profile/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /security/i })).toBeInTheDocument();
  });

  it("does not show Team members for Solo", async () => {
    arrange("Solo");
    renderSettings();

    await screen.findByRole("heading", { name: /account/i });
    expect(screen.queryByRole("heading", { name: /team members/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /job defaults/i })).not.toBeInTheDocument();
  });

  it("shows Team members but not Job defaults for Team", async () => {
    arrange("Team");
    renderSettings();

    expect(await screen.findByRole("heading", { name: /team members/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /job defaults/i })).not.toBeInTheDocument();
  });

  it("shows Reports but not Branding for Business", async () => {
    arrange("Business");
    renderSettings();

    expect(await screen.findByRole("heading", { name: /reports/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /branding/i })).not.toBeInTheDocument();
  });

  it("shows Business sections without enterprise support marketing copy for Enterprise", async () => {
    arrange("Enterprise");
    renderSettings();

    expect(await screen.findByRole("heading", { name: /inventory/i })).toBeInTheDocument();
    expect(screen.queryByText(/enterprise workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/priority support and compliance/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /inventory/i })).toBeInTheDocument();
  });

  it("does not expose editable document or purchase order prefix fields", async () => {
    arrange("Business");
    renderSettings();

    await screen.findByRole("heading", { name: /quotes & invoices/i });

    expect(screen.queryByLabelText(/quote prefix/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/invoice prefix/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/purchase order prefix/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/quote and invoice prefixes are system-defined/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/purchase order prefix:/i)).not.toBeInTheDocument();
  });

  it("opens billing modal and requires confirmation before a plan change request", async () => {
    arrange("Solo");
    renderSettings();

    await screen.findByRole("heading", { name: /plan & billing/i });
    expect(screen.getByText("£32.95")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /manage billing/i }));
    fireEvent.click(screen.getByRole("button", { name: /team/i }));

    expect(screen.getByRole("heading", { name: /manage billing/i })).toBeInTheDocument();
    expect(screen.getByText(/current plan: solo/i)).toBeInTheDocument();
    expect(screen.getByText(/requested plan: team/i)).toBeInTheDocument();
    expect(screen.getByText(/requested seats: up to 10 users/i)).toBeInTheDocument();
    expect(screen.getByText(/£32\.95 \/ month/i)).toBeInTheDocument();
    expect(screen.getByText(/£119\.95 \/ month/i)).toBeInTheDocument();
    expect(screen.getByText(/£229\.95 \/ month/i)).toBeInTheDocument();
    expect(screen.getByText(/Contact Sales/i)).toBeInTheDocument();
    expect(screen.getByText(/26\+ users \/ Custom/i)).toBeInTheDocument();
    expect(screen.queryByText(/credit|proration|discount/i)).not.toBeInTheDocument();
    const pageText = document.body.textContent ?? "";
    [
      ["39", "95"],
      ["44", "95"],
      ["99", "95"],
      ["159", "95"],
      ["40", ""],
      ["40", "00"],
      ["199", ""],
      ["199", "00"],
    ].forEach(([pounds, pence]) => {
      expect(pageText).not.toContain(`£${pounds}${pence ? `.${pence}` : ""}`);
    });
    expect(screen.getByRole("button", { name: /submit request/i })).toBeDisabled();
  });

  it("shows storage usage, add-ons and fair usage copy", async () => {
    arrange("Team", {
      usedStorageBytes: 32_400_000_000,
      effectiveLimitBytes: 50_000_000_000,
      availableBytes: 17_600_000_000,
      usedPercent: 64.8,
      warningLevel: "OK",
      canUpload: true,
    });
    renderSettings();

    expect(await screen.findByText("32.4GB of 50GB used")).toBeInTheDocument();
    expect(screen.getByText(/17\.6GB available across your account/i)).toBeInTheDocument();
    expect(screen.getByText(/Extra 50GB/i)).toBeInTheDocument();
    expect(screen.getByText(/Extra 1TB/i)).toBeInTheDocument();
    expect(screen.getByText(/not for public file hosting, bulk file sharing, unrelated backups or resale of storage/i)).toBeInTheDocument();
  });

  it("shows blocked storage message at 100 percent usage", async () => {
    arrange("Solo", {
      usedStorageBytes: 10_000_000_000,
      effectiveLimitBytes: 10_000_000_000,
      availableBytes: 0,
      usedPercent: 100,
      warningLevel: "Blocked",
      canUpload: false,
    });
    renderSettings();

    expect(await screen.findByText("Storage limit reached. Existing files remain available, but new uploads are blocked.")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("creates a pending storage add-on request before quota increases", async () => {
    arrange("Solo");
    mockedStorageService.requestAddOn.mockResolvedValue({
      message: "Storage add-on request created. Your quota increases after payment is confirmed.",
    });
    renderSettings();

    await screen.findByText("2GB of 10GB used");
    fireEvent.click(screen.getAllByRole("button", { name: /add storage/i })[0]);

    await waitFor(() => expect(mockedStorageService.requestAddOn).toHaveBeenCalledWith("extra-50gb"));
    expect(await screen.findByText(/quota increases after payment is confirmed/i)).toBeInTheDocument();
  });

  it("submits a confirmed plan change request and keeps local billing state consistent", async () => {
    arrange("Solo");
    mockedBillingService.requestPlanChange.mockResolvedValue({
      message: "Plan change request saved. No payment has been taken in this preview flow.",
      planName: "Team",
      monthlyPricePence: 11995,
      maxIncludedUsers: 10,
      seatsPurchased: 2,
      billingStartUtc: new Date().toISOString(),
      nextInvoiceDateUtc: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      status: "Active",
    });
    renderSettings();

    await screen.findByRole("heading", { name: /plan & billing/i });
    fireEvent.click(screen.getByRole("button", { name: /manage billing/i }));
    fireEvent.click(screen.getByRole("button", { name: /team/i }));
    fireEvent.click(screen.getByLabelText(/i understand this submits/i));
    fireEvent.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => expect(mockedBillingService.requestPlanChange).toHaveBeenCalledWith("Team"));
    expect(await screen.findByText(/plan change request submitted/i)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("tradelike_user") || "{}").plan).toBe("Team");
  });

  it("shows friendly billing errors", async () => {
    arrange("Solo");
    mockedBillingService.requestPlanChange.mockRejectedValue(new Error("System.InvalidOperationException at SQL stack trace"));
    renderSettings();

    await screen.findByRole("heading", { name: /plan & billing/i });
    fireEvent.click(screen.getByRole("button", { name: /manage billing/i }));
    fireEvent.click(screen.getByRole("button", { name: /team/i }));
    fireEvent.click(screen.getByLabelText(/i understand this submits/i));
    fireEvent.click(screen.getByRole("button", { name: /submit request/i }));

    expect(await screen.findByText("Plan change request could not be saved. Please try again or contact support.")).toBeInTheDocument();
    expect(screen.queryByText(/InvalidOperationException|stack trace/i)).not.toBeInTheDocument();
  });

  it("contains accessibility preferences and saves them locally", async () => {
    arrange("Solo");
    renderSettings();

    await screen.findByRole("heading", { name: /accessibility/i });
    fireEvent.click(screen.getByLabelText(/reduce motion/i));
    fireEvent.click(screen.getByLabelText(/larger text/i));
    fireEvent.click(screen.getByRole("button", { name: /save accessibility preferences/i }));

    const saved = JSON.parse(localStorage.getItem("tradelike_accessibility_preferences") || "{}");
    expect(saved.reduceMotion).toBe(true);
    expect(saved.textSize).toBe("large");
    expect(screen.queryByText(/keyboard navigation is supported/i)).not.toBeInTheDocument();
  });

  it("uses clear notification copy without provider credential or support failure wording", async () => {
    arrange("Solo");
    renderSettings();

    await screen.findByRole("heading", { name: /notifications/i });
    expect(screen.getByText(/Replies go to support@tradelike\.co\.uk unless your business reply address is configured\./i)).toBeInTheDocument();
    expect(screen.queryByText(/sensitive provider credentials/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/support inbox failed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/business reply-to/i)).not.toBeInTheDocument();
  });

  it("uses Owner instead of Director in customer team labels", async () => {
    arrange("Team");
    renderSettings();

    expect((await screen.findAllByText("Owner")).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Director$/i)).not.toBeInTheDocument();
  });

  it("shows save success state when account settings save", async () => {
    const settings = arrange("Solo");
    mockedSettingsService.updateAccount.mockResolvedValue(settings.account);
    renderSettings();

    await screen.findByRole("heading", { name: /account/i });
    fireEvent.click(screen.getByRole("button", { name: /save account/i }));

    await waitFor(() => expect(screen.getByText("Settings saved.")).toBeInTheDocument());
  });
});

function arrange(plan: "Solo" | "Team" | "Business" | "Enterprise", storagePatch: Partial<Awaited<ReturnType<typeof buildStorageUsage>>> = {}) {
  localStorage.setItem("tradelike_user", JSON.stringify({ ...baseUser, plan }));
  const settings = buildSettings(plan);
  mockedSettingsService.getSettings.mockResolvedValue(settings);
  mockedStorageService.getUsage.mockResolvedValue(buildStorageUsage(storagePatch));
  return settings;
}

function renderSettings() {
  return render(
    <MemoryRouter>
      <GlobalSearchProvider>
        <Settings />
      </GlobalSearchProvider>
    </MemoryRouter>
  );
}

function buildSettings(plan: "Solo" | "Team" | "Business" | "Enterprise"): CustomerSettings {
  return {
    account: {
      userId: 1,
      firstName: "Alex",
      lastName: "Owner",
      fullName: "Alex Owner",
      email: "owner@example.com",
      role: "CustomerDirector",
      businessName: "TradeLike Plumbing",
      ownerName: "Alex Owner",
      ownerPhone: "07123456789",
      accountStatus: "Active",
      planName: plan,
      billingStatus: "Active",
      canEdit: true,
    },
    businessProfile: {
      id: 1,
      tenantId: 1,
      businessName: "TradeLike Plumbing",
      legalName: "TradeLike Plumbing Ltd",
      logoUrl: "",
      addressLine1: "1 Trade Street",
      addressLine2: "",
      town: "London",
      county: "",
      postcode: "E1 1AA",
      country: "United Kingdom",
      phone: "02070000000",
      email: "office@example.com",
      website: "https://example.com",
      vatNumber: "GB123",
      companyNumber: "12345678",
      defaultVatRate: 20,
      quotePrefix: "Q",
      invoicePrefix: "INV",
      paymentTerms: "14 days",
      quoteExpiryDays: 30,
      defaultQuoteNotes: "Thanks",
      defaultInvoiceNotes: "Please pay",
      replyToEmail: "office@example.com",
      defaultJobPriority: "Normal",
      defaultScheduleView: "Week",
      defaultReportRange: "30d",
      includeCompletedInReports: true,
      includeArchivedInReports: false,
      lowStockThreshold: 5,
      purchaseOrderPrefix: "PO",
      bankName: "",
      bankAccountName: "",
      bankSortCode: "",
      bankAccountNumber: "",
      emailFooter: "Kind regards",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    security: {
      isEmailVerified: true,
      emailVerificationSentAt: null,
      passwordResetRequired: false,
      lastLoginAtUtc: new Date().toISOString(),
      sessionExpiresAtUtc: new Date(Date.now() + 3600_000).toISOString(),
    },
    planBilling: {
      planName: plan,
      billingStatus: "Active",
      monthlyPricePence: plan === "Enterprise" ? null : plan === "Business" ? 22995 : plan === "Team" ? 11995 : 3295,
      maxIncludedUsers: plan === "Enterprise" ? null : plan === "Business" ? 25 : plan === "Team" ? 10 : 1,
      seatsPurchased: plan === "Enterprise" ? 40 : plan === "Business" ? 12 : plan === "Team" ? 4 : 1,
      billingStartUtc: new Date().toISOString(),
      nextInvoiceDateUtc: new Date().toISOString(),
      trialEndsAtUtc: null,
      accountStatus: "Active",
    },
    jobDefaults: {
      defaultJobPriority: "Normal",
      defaultScheduleView: "Week",
      canEdit: plan !== "Solo",
    },
    documentDefaults: {
      defaultVatRate: 20,
      quotePrefix: "Q",
      invoicePrefix: "INV",
      quoteExpiryDays: 30,
      paymentTerms: "14 days",
      defaultQuoteNotes: "Thanks",
      defaultInvoiceNotes: "Please pay",
      replyToEmail: "office@example.com",
      emailFooter: "Kind regards",
      canEdit: true,
    },
    reportDefaults: {
      defaultReportRange: "30d",
      includeCompletedInReports: true,
      includeArchivedInReports: false,
      canEdit: plan === "Business" || plan === "Enterprise",
    },
    inventoryDefaults: {
      lowStockThreshold: 5,
      purchaseOrderPrefix: "PO",
      canEdit: plan === "Business" || plan === "Enterprise",
    },
    notifications: {
      automatedSenderEmail: "noreply@tradelike.co.uk",
      supportInboxEmail: "support@tradelike.co.uk",
      salesInboxEmail: "sales@tradelike.co.uk",
      generalInboxEmail: "hello@tradelike.co.uk",
      businessReplyToEmail: "office@example.com",
      emailStatus: "Configured",
    },
    teamMembers: plan === "Solo" ? [] : [
      {
        id: 1,
        name: "Alex Owner",
        email: "owner@example.com",
        role: "CustomerDirector",
        status: "Active",
        isCurrentUser: true,
        canEditRole: false,
        canEditStatus: false,
      },
      {
        id: 2,
        name: "Jamie Crew",
        email: "crew@example.com",
        role: "CustomerEmployee",
        status: "Active",
        isCurrentUser: false,
        canEditRole: true,
        canEditStatus: true,
      },
    ],
  };
}

function buildStorageUsage(patch = {}) {
  return {
    includedStorageBytes: 10_000_000_000,
    purchasedStorageBytes: 0,
    manualStorageOverrideBytes: null,
    effectiveLimitBytes: 10_000_000_000,
    usedStorageBytes: 2_000_000_000,
    availableBytes: 8_000_000_000,
    usedPercent: 20,
    warningLevel: "OK",
    canUpload: true,
    addOnPlans: [
      { code: "extra-50gb", label: "Extra 50GB", extraStorageBytes: 50_000_000_000, monthlyPricePence: 495, isActive: true },
      { code: "extra-100gb", label: "Extra 100GB", extraStorageBytes: 100_000_000_000, monthlyPricePence: 895, isActive: true },
      { code: "extra-250gb", label: "Extra 250GB", extraStorageBytes: 250_000_000_000, monthlyPricePence: 1795, isActive: true },
      { code: "extra-500gb", label: "Extra 500GB", extraStorageBytes: 500_000_000_000, monthlyPricePence: 2995, isActive: true },
      { code: "extra-1tb", label: "Extra 1TB", extraStorageBytes: 1_000_000_000_000, monthlyPricePence: 4995, isActive: true },
    ],
    activeAddOns: [],
    ...patch,
  };
}
