import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Settings from "./Settings";
import { GlobalSearchProvider } from "../contexts/GlobalSearchContext";
import type { AuthUser } from "../services/authService";

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

const directorUser: AuthUser = {
  ...employeeUser,
  id: 2,
  email: "director@example.com",
  name: "Director User",
  role: "CustomerDirector",
  plan: "Business",
  canManageBilling: true,
  canManageSecurity: true,
  canManageStaff: true,
  canViewStaff: true,
  canExportData: true,
};

describe("Settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hides restricted settings from customer employees", () => {
    localStorage.setItem("tradelike_user", JSON.stringify(employeeUser));

    renderSettings();

    expect(screen.getByRole("heading", { name: /control centre/i })).toBeInTheDocument();
    expect(screen.queryByText("API & Webhooks")).not.toBeInTheDocument();
    expect(screen.queryByText("Billing")).not.toBeInTheDocument();
    expect(screen.queryByText("Branding")).not.toBeInTheDocument();
    expect(screen.queryByText("Import / Export")).not.toBeInTheDocument();
    expect(screen.getByText("Accessibility")).toBeInTheDocument();
  });

  it("shows director settings tools inside Settings", () => {
    localStorage.setItem("tradelike_user", JSON.stringify(directorUser));

    renderSettings();

    expect(screen.getByText("API & Webhooks")).toBeInTheDocument();
    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(screen.getByText("Branding")).toBeInTheDocument();
    expect(screen.getByText("Import / Export")).toBeInTheDocument();
  });
});

function renderSettings() {
  return render(
    <MemoryRouter>
      <GlobalSearchProvider>
        <Settings />
      </GlobalSearchProvider>
    </MemoryRouter>
  );
}
