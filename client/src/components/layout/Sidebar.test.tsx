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

const soloDirectorUser: AuthUser = {
  ...directorUser,
  id: 3,
  email: "solo-director@example.com",
  name: "Solo Director",
  plan: "Solo",
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

  it("does not show premium settings or Inventory as top-level Solo sidebar items", () => {
    localStorage.setItem("tradelike_user", JSON.stringify(soloDirectorUser));

    renderSidebarWithLocation();

    expect(screen.queryByRole("link", { name: /inventory/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /api/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /branding/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /import \/ export/i })).not.toBeInTheDocument();
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

  it("highlights Settings for settings subroutes", () => {
    localStorage.setItem("tradelike_user", JSON.stringify(directorUser));

    renderSidebarWithLocation("/settings/api");

    expect(screen.getByRole("link", { name: /settings/i })).toHaveClass("bg-blue-500/15");
  });
});

function renderSidebarWithLocation(initialPath = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
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
