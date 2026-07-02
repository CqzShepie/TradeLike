import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Settings from "./Settings";
import { GlobalSearchProvider } from "../contexts/GlobalSearchContext";
import type { AuthUser } from "../services/authService";
import type { CustomerSettings } from "../types/settings";
import { settingsService } from "../services/settingsService";

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

const mockedSettingsService = vi.mocked(settingsService);

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

  it("shows Team members and Job defaults for Team", async () => {
    arrange("Team");
    renderSettings();

    expect(await screen.findByRole("heading", { name: /team members/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /job defaults/i })).toBeInTheDocument();
  });

  it("shows Reports and Branding for Business", async () => {
    arrange("Business");
    renderSettings();

    expect(await screen.findByRole("heading", { name: /reports/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /branding/i })).toBeInTheDocument();
  });

  it("shows Business sections plus enterprise support language for Enterprise", async () => {
    arrange("Enterprise");
    renderSettings();

    expect(await screen.findByText(/enterprise workspace/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /inventory/i })).toBeInTheDocument();
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

function arrange(plan: "Solo" | "Team" | "Business" | "Enterprise") {
  localStorage.setItem("tradelike_user", JSON.stringify({ ...baseUser, plan }));
  const settings = buildSettings(plan);
  mockedSettingsService.getSettings.mockResolvedValue(settings);
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
      monthlyPricePence: 3500,
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
