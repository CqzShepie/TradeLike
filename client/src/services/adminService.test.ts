import { apiClient } from "./apiClient";
import { adminService } from "./adminService";
import type { AdminUser, UpdateAdminUserAccountRequest } from "../types/admin";

vi.mock("./apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const adminUser: AdminUser = {
  id: 7,
  firstName: "Alex",
  lastName: "Trade",
  fullName: "Alex Trade",
  email: "alex@example.com",
  role: "CustomerDirector",
  accountStatus: "Active",
  isEmailVerified: true,
  discountType: "None",
  discountValue: 0,
  freeMonths: 0,
  passwordResetRequired: false,
  subscriptionPlan: "Solo",
  billingStatus: "Active",
  healthStatus: "Green",
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
  createdAt: "2026-07-01T10:00:00Z",
};

describe("adminService", () => {
  const clipboard = {
    writeText: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: clipboard,
    });
  });

  it("copies staff invite links without using browser alerts", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    vi.mocked(apiClient.post).mockResolvedValue({
      message: "Invite created",
      inviteLink: "https://app.tradelike.test/accept-staff-invite?token=abc",
      inviteExpiresAt: "2026-07-08T10:00:00Z",
      user: adminUser,
    });

    await adminService.createStaff({
      firstName: "Sam",
      lastName: "Support",
      email: "sam@example.com",
      role: "Support",
      personalAssistantTo: "",
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
      adminNotes: "",
    });

    expect(clipboard.writeText).toHaveBeenCalledWith(
      "https://app.tradelike.test/accept-staff-invite?token=abc"
    );
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("sends the Studio change reason when saving customer account changes", async () => {
    vi.mocked(apiClient.put).mockResolvedValue(adminUser);

    const request: UpdateAdminUserAccountRequest = {
      accountStatus: "Active",
      discountType: "None",
      discountValue: 0,
      freeMonths: 0,
      businessName: "Alex Trade Ltd",
      ownerName: "Alex Trade",
      ownerPhone: "07123456789",
      subscriptionPlan: "Solo",
      billingStatus: "Active",
      adminTags: "",
      supportNotes: "",
      healthStatus: "Green",
      accountSource: "Support",
      cancelReason: "",
      adminNotes: "",
      reason: "Customer requested account update",
    };

    await adminService.updateAccount(7, request);

    expect(apiClient.put).toHaveBeenCalledWith(
      "/admin/users/7/account",
      expect.objectContaining({
        reason: "Customer requested account update",
      })
    );
  });

  it("sends password recovery actions without a raw new password", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      message: "Password reset link sent.",
      user: adminUser,
    });

    await adminService.resetPassword(7, {
      sendResetLink: true,
      forcePasswordReset: true,
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/admin/users/7/reset-password",
      {
        sendResetLink: true,
        forcePasswordReset: true,
      }
    );
    expect(vi.mocked(apiClient.post).mock.calls[0]?.[1]).not.toHaveProperty("newPassword");
  });
});
