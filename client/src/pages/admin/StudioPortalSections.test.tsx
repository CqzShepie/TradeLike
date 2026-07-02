import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AuthUser } from "../../services/authService";
import type { AdminUser } from "../../types/admin";
import AdminDashboard from "./AdminDashboard";
import StudioDiagnostics from "./StudioDiagnostics";
import StudioGlobalSearch from "./StudioGlobalSearch";
import StudioPermissionsMatrix from "./StudioPermissionsMatrix";
import StudioStorageTools from "./StudioStorageTools";
import StudioSupportNotes from "./StudioSupportNotes";
import { adminStorageService } from "../../services/adminStorageService";

vi.mock("../../services/adminService", () => ({
  adminService: {
    addCustomerSupportNote: vi.fn(),
  },
}));

vi.mock("../../services/adminStorageService", () => ({
  adminStorageService: {
    getTenantStorage: vi.fn(),
    recalculateTenantStorage: vi.fn(),
    setManualOverride: vi.fn(),
  },
}));

const mockedAdminStorageService = vi.mocked(adminStorageService);

describe("Studio portal sections", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders overview metrics without counting internal staff as customers", () => {
    render(
      <AdminDashboard
        users={[
          adminUser({ id: 1, email: "one@example.com", role: "CustomerDirector", subscriptionPlan: "Solo", accountStatus: "Active" }),
          adminUser({ id: 2, email: "two@example.com", role: "CustomerManager", subscriptionPlan: "Team", accountStatus: "Trial" }),
          adminUser({ id: 3, email: "support@tradelike.co.uk", role: "Support", subscriptionPlan: "Internal", billingStatus: "Internal" }),
        ]}
        staffUsers={[adminUser({ id: 3, email: "support@tradelike.co.uk", role: "Support", subscriptionPlan: "Internal", billingStatus: "Internal" })]}
        auditLogs={[]}
        onOpenAccounts={vi.fn()}
        onOpenAudit={vi.fn()}
      />
    );

    expect(screen.getByText("Total customers").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Solo accounts").parentElement).toHaveTextContent("1");
    expect(screen.getByText("Team accounts").parentElement).toHaveTextContent("1");
  });

  it("global search returns customer results but not internal staff accounts", () => {
    const openCustomer = vi.fn();

    render(
      <StudioGlobalSearch
        users={[
          adminUser({ id: 1, businessName: "Acme Plumbing", email: "owner@acme.test", role: "CustomerDirector" }),
          adminUser({ id: 2, fullName: "Studio Support", email: "support@tradelike.co.uk", role: "Support", subscriptionPlan: "Internal", billingStatus: "Internal" }),
        ]}
        query="acme"
        onQueryChange={vi.fn()}
        onOpenCustomer={openCustomer}
      />
    );

    expect(screen.getByText("Acme Plumbing")).toBeInTheDocument();
    expect(screen.queryByText("Studio Support")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Acme Plumbing"));
    expect(openCustomer).toHaveBeenCalledTimes(1);
  });

  it("renders a clean support notes empty state", () => {
    render(
      <MemoryRouter>
        <StudioSupportNotes users={[adminUser({ supportNotes: "" })]} onOpenCustomer={vi.fn()} onCustomerUpdated={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText("No support notes found.")).toBeInTheDocument();
  });

  it("renders staff permissions matrix", () => {
    render(
      <StudioPermissionsMatrix
        staffUsers={[adminUser({ id: 4, fullName: "Studio Admin", email: "admin@tradelike.co.uk", role: "Admin", canManageAccounts: true })]}
        onOpenStaff={vi.fn()}
      />
    );

    expect(screen.getByText("Permissions matrix")).toBeInTheDocument();
    expect(screen.getByText("Studio Admin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open staff editor/i })).toBeInTheDocument();
  });

  it("diagnostics does not show the JWT token value", () => {
    localStorage.setItem("tradelike_token", "secret.jwt.value");
    localStorage.setItem("tradelike_user", JSON.stringify({ id: 1 }));

    render(
      <MemoryRouter>
        <StudioDiagnostics currentUser={authUser()} />
      </MemoryRouter>
    );

    expect(screen.getByText("Present, hidden")).toBeInTheDocument();
    expect(screen.queryByText("secret.jwt.value")).not.toBeInTheDocument();
  });

  it("loads Studio storage usage tools", async () => {
    mockedAdminStorageService.getTenantStorage.mockResolvedValue({
      tenantId: 7,
      businessName: "Acme Plumbing",
      email: "owner@acme.test",
      usage: {
        includedStorageBytes: 50_000_000_000,
        purchasedStorageBytes: 0,
        manualStorageOverrideBytes: null,
        effectiveLimitBytes: 50_000_000_000,
        usedStorageBytes: 12_000_000_000,
        availableBytes: 38_000_000_000,
        usedPercent: 24,
        warningLevel: "OK",
        canUpload: true,
        addOnPlans: [],
        activeAddOns: [],
      },
    });

    render(<StudioStorageTools />);

    fireEvent.change(screen.getByPlaceholderText(/tenant id/i), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: /load storage/i }));

    await waitFor(() => expect(mockedAdminStorageService.getTenantStorage).toHaveBeenCalledWith(7));
    expect(await screen.findByText("Acme Plumbing")).toBeInTheDocument();
    expect(screen.getByText("12GB")).toBeInTheDocument();
    expect(screen.getByText("50GB")).toBeInTheDocument();
  });
});

function authUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 99,
    email: "support@tradelike.co.uk",
    name: "Studio Support",
    role: "Support",
    plan: "Internal",
    accountStatus: "Active",
    passwordResetRequired: false,
    canManageAccounts: true,
    canManageStaff: true,
    canManageBilling: true,
    canManageSecurity: false,
    canViewAuditLogs: true,
    canCreateCustomers: true,
    canEditCustomers: true,
    canCancelCustomers: false,
    canResetPasswords: true,
    canVerifyEmails: true,
    canSendEmails: true,
    canManageDiscounts: true,
    canManageFreeMonths: true,
    canViewCustomerNotes: true,
    canEditCustomerNotes: true,
    canViewBilling: true,
    canManageSubscriptions: true,
    canExportData: true,
    canImpersonateCustomer: false,
    canDeleteData: false,
    canViewStaff: true,
    canCreateStaff: true,
    canCancelStaff: false,
    canEditStaffPermissions: true,
    canViewSecurityLogs: false,
    ...overrides,
  };
}

function adminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 1,
    firstName: "Alex",
    lastName: "Owner",
    fullName: "Alex Owner",
    email: "alex@example.com",
    role: "CustomerDirector",
    personalAssistantTo: null,
    accountStatus: "Active",
    isEmailVerified: true,
    emailVerificationSentAt: null,
    discountType: "None",
    discountValue: 0,
    freeMonths: 0,
    freeMonthsExpireAt: null,
    passwordResetRequired: false,
    businessName: "Alex Trades",
    ownerName: "Alex Owner",
    ownerPhone: "07123456789",
    subscriptionPlan: "Solo",
    billingStatus: "Active",
    trialEndsAt: null,
    adminTags: null,
    supportNotes: null,
    healthStatus: "Green",
    lastLoginAt: null,
    accountSource: null,
    cancelReason: null,
    onboardingEmailSentAt: null,
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
    adminNotes: null,
    createdAt: "2026-07-01T10:00:00Z",
    updatedAt: null,
    ...overrides,
  };
}

