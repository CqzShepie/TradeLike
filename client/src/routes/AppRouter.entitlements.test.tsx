import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import type { AuthUser } from "../services/authService";
import AppRouter from "./AppRouter";

vi.mock("../pages/Home", () => ({ default: () => <h1>Home page</h1> }));
vi.mock("../pages/Dashboard", () => ({ default: () => <h1>Dashboard page</h1> }));
vi.mock("../pages/Jobs", () => ({ default: () => <h1>Jobs page</h1> }));
vi.mock("../pages/JobDetails", () => ({ default: () => <h1>Job details page</h1> }));
vi.mock("../pages/PreviousJobs", () => ({ default: () => <h1>Previous jobs page</h1> }));
vi.mock("../pages/Customers", () => ({ default: () => <h1>Customers page</h1> }));
vi.mock("../pages/CustomerDetails", () => ({ default: () => <h1>Customer details page</h1> }));
vi.mock("../pages/Calendar", () => ({ default: () => <h1>Calendar page</h1> }));
vi.mock("../pages/AccessibilitySettings", () => ({ default: () => <h1>Accessibility page</h1> }));
vi.mock("../pages/Signup", () => ({ default: () => <h1>Signup page</h1> }));
vi.mock("../pages/Login", () => ({ default: () => <h1>Login page</h1> }));
vi.mock("../pages/Quotes", () => ({ default: () => <h1>Quotes page</h1> }));
vi.mock("../pages/QuoteDetails", () => ({ default: () => <h1>Quote details page</h1> }));
vi.mock("../pages/Invoices", () => ({ default: () => <h1>Invoices page</h1> }));
vi.mock("../pages/AdminPortal", () => ({ default: () => <h1>Admin page</h1> }));
vi.mock("../pages/Settings", () => ({ default: () => <h1>Settings page</h1> }));
vi.mock("../pages/CompanyInvite", () => ({ default: () => <h1>Company invite page</h1> }));
vi.mock("../pages/AcceptCompanyStaffInvite", () => ({ default: () => <h1>Accept company staff invite page</h1> }));
vi.mock("../pages/AcceptStaffInvite", () => ({ default: () => <h1>Accept staff invite page</h1> }));
vi.mock("../pages/CustomerStaff", () => ({ default: () => <h1>Team page</h1> }));
vi.mock("../pages/Reports", () => ({ default: () => <h1>Reports page</h1> }));
vi.mock("../pages/ReportsOverview", () => ({ default: () => <h1>Advanced reports page</h1> }));
vi.mock("../pages/api-dev/ApiDeveloperPage", () => ({ default: () => <h1>API page</h1> }));
vi.mock("../pages/branding/BrandingPage", () => ({ default: () => <h1>Branding page</h1> }));
vi.mock("../pages/import/ImportExportPage", () => ({ default: () => <h1>Import export page</h1> }));
vi.mock("../pages/inventory/Inventory", () => ({ default: () => <h1>Inventory page</h1> }));
vi.mock("../pages/SupportCenter", () => ({ default: () => <h1>Support page</h1> }));
vi.mock("../pages/AccessDenied", () => ({ default: () => <h1>Access denied</h1> }));
vi.mock("../pages/NotFound", () => ({ default: () => <h1>Not found</h1> }));
vi.mock("../pages/UpgradeRequired", () => ({ default: () => <h1>Upgrade required</h1> }));
vi.mock("../pages/settings/SettingsSectionPage", () => ({ default: () => <h1>Settings section page</h1> }));

const soloDirector: AuthUser = {
  id: 1,
  email: "director@example.com",
  name: "Solo Director",
  role: "CustomerDirector",
  plan: "Solo",
  accountStatus: "Active",
  passwordResetRequired: false,
  canManageAccounts: false,
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

describe("AppRouter entitlement guards", () => {
  beforeEach(() => {
    localStorage.clear();
    window.scrollTo = vi.fn();
  });

  it.each([
    ["/dashboard", "Dashboard page"],
    ["/customers", "Customers page"],
    ["/jobs", "Jobs page"],
    ["/quotes", "Quotes page"],
    ["/invoices", "Invoices page"],
    ["/calendar", "Calendar page"],
    ["/reports", "Reports page"],
    ["/settings", "Settings page"],
  ])("allows a Solo CustomerDirector to visit %s", (path, expectedHeading) => {
    setSession(soloDirector);

    renderRouter(path);

    expect(screen.getByRole("heading", { name: expectedHeading })).toBeInTheDocument();
  });

  it.each(["Director", "Customer", "CustomerDirector"] as const)(
    "allows a Solo legacy %s user to visit /jobs",
    role => {
      setSession({ ...soloDirector, role });

      renderRouter("/jobs");

      expect(screen.getByRole("heading", { name: "Jobs page" })).toBeInTheDocument();
    }
  );

  it("shows UpgradeRequired when a Solo user visits Team directly", () => {
    setSession(soloDirector);

    renderRouter("/team");

    expect(screen.getByRole("heading", { name: /upgrade required/i })).toBeInTheDocument();
  });

  it("shows UpgradeRequired when a Solo user visits advanced reports directly", () => {
    setSession(soloDirector);

    renderRouter("/reports/overview");

    expect(screen.getByRole("heading", { name: /upgrade required/i })).toBeInTheDocument();
  });
});

function renderRouter(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>
  );
}

function setSession(authUser: AuthUser) {
  localStorage.setItem("tradelike_user", JSON.stringify(authUser));
  localStorage.setItem("tradelike_token", createValidToken());
}

function createValidToken() {
  const payload = window
    .btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `header.${payload}.signature`;
}
