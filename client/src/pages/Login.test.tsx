import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Login from "./Login";
import { authService } from "../services/authService";

vi.mock("../services/authService", () => ({
  authService: {
    login: vi.fn(),
    isStaffUser: vi.fn().mockReturnValue(false),
  },
}));

describe("Login", () => {
  beforeEach(() => {
    vi.mocked(authService.login).mockResolvedValue({
      token: "token",
      user: {
        id: 1,
        email: "user@example.com",
        name: "User",
        role: "CustomerDirector",
        plan: "Solo",
        accountStatus: "Active",
        passwordResetRequired: false,
        canManageAccounts: false,
        canManageStaff: false,
        canManageBilling: false,
        canManageSecurity: false,
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
      },
    });
  });

  it("uses dark input controls and still submits login", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const email = screen.getByLabelText(/email address/i);
    const password = screen.getByLabelText(/password/i);
    expect(email).toHaveClass("bg-slate-950/60");

    fireEvent.change(email, { target: { value: "user@example.com" } });
    fireEvent.change(password, { target: { value: "Password123!" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(authService.login).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "Password123!",
    }));
  });
});
