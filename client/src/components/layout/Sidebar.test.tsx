import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import Sidebar from "./Sidebar";
import type { AuthUser } from "../../services/authService";

const employeeUser: AuthUser = {
  id: 1,
  email: "employee@example.com",
  name: "Employee User",
  role: "CustomerEmployee",
  plan: "Team",
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
};

describe("Sidebar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hides manager navigation for customer employees", () => {
    localStorage.setItem("tradelike_user", JSON.stringify(employeeUser));

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(screen.queryByText("Team")).not.toBeInTheDocument();
    expect(screen.queryByText("Leave")).not.toBeInTheDocument();
    expect(screen.queryByText("Reports")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
