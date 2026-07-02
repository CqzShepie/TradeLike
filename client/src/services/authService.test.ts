import { authService, normalizeUserRole, type AuthUser } from "./authService";

describe("authService role canonicalisation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not elevate legacy Customer or internal Director to CustomerDirector", () => {
    expect(normalizeUserRole("Customer")).toBe("Customer");
    expect(normalizeUserRole("Director")).toBe("Director");
    expect(normalizeUserRole("CustomerDirector")).toBe("CustomerDirector");
  });

  it("treats internal Director as staff and legacy Customer as non-staff", () => {
    expect(authService.isStaffUser(user({ role: "Director", plan: "Internal" }))).toBe(true);
    expect(authService.isStaffUser(user({ role: "Customer", plan: "Solo" }))).toBe(false);
  });
});

function user(overrides: Partial<AuthUser>): AuthUser {
  return {
    id: 1,
    email: "user@example.com",
    name: "User",
    role: "CustomerEmployee",
    plan: "Solo",
    accountStatus: "Active",
    passwordResetRequired: false,
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
    ...overrides,
  };
}
