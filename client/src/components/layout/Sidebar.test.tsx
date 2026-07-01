import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

import Sidebar from "./Sidebar";
import { GlobalSearchProvider } from "../../contexts/GlobalSearchContext";
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
      <MemoryRouter>
        <GlobalSearchProvider>
          <Sidebar />
        </GlobalSearchProvider>
      </MemoryRouter>
    );

    expect(screen.queryByText("Team")).not.toBeInTheDocument();
    expect(screen.queryByText("Leave")).not.toBeInTheDocument();
    expect(screen.queryByText("Reports")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("navigates to jobs when Jobs is clicked", () => {
    localStorage.setItem("tradelike_user", JSON.stringify(employeeUser));

    renderSidebarWithLocation();

    fireEvent.click(screen.getByRole("link", { name: /jobs/i }));

    expect(screen.getByTestId("current-path")).toHaveTextContent("/jobs");
  });

  it("navigates to calendar when Calendar is clicked", () => {
    localStorage.setItem("tradelike_user", JSON.stringify(employeeUser));

    renderSidebarWithLocation();

    fireEvent.click(screen.getByRole("link", { name: /calendar/i }));

    expect(screen.getByTestId("current-path")).toHaveTextContent("/calendar");
  });

  it("navigates to settings when Settings is clicked", () => {
    localStorage.setItem("tradelike_user", JSON.stringify(employeeUser));

    renderSidebarWithLocation();

    fireEvent.click(screen.getByRole("link", { name: /settings/i }));

    expect(screen.getByTestId("current-path")).toHaveTextContent("/settings");
  });
});

function renderSidebarWithLocation() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <GlobalSearchProvider>
        <Sidebar />
        <LocationProbe />
      </GlobalSearchProvider>
    </MemoryRouter>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="current-path">{location.pathname}</span>;
}
