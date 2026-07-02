import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ComponentProps } from "react";

import NewCustomerForm from "../components/customers/NewCustomerForm";
import NewJobForm from "../components/jobs/NewJobForm";
import NewQuoteForm from "../components/quotes/NewQuoteForm";
import CustomerList from "../components/customers/CustomerList";
import UpgradeRequired from "../pages/UpgradeRequired";
import StaffLogin from "../pages/StaffLogin";
import StaffRoute from "../routes/StaffRoute";
import { GlobalSearchProvider } from "../contexts/GlobalSearchContext";
import {
  getSettingsNavigation,
  getSidebarNavigation,
} from "../routes/navigationConfig";
import { customersService } from "../services/customersService";
import type { AuthUser } from "../services/authService";

vi.mock("../services/customersService", () => ({
  customersService: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

const baseUser: AuthUser = {
  id: 1,
  email: "owner@example.com",
  name: "Trade Owner",
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

describe("overnight regression smoke coverage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(customersService.getAll).mockResolvedValue([]);
  });

  it("keeps plan-gated settings out of top-level navigation while showing Business settings", () => {
    const soloSidebar = getSidebarNavigation({ ...baseUser, plan: "Solo" }).map(item => item.label);
    const businessSettings = getSettingsNavigation({ ...baseUser, plan: "Business" }).map(item => item.label);

    expect(soloSidebar).not.toEqual(expect.arrayContaining(["Team", "Inventory", "API & Webhooks", "Branding", "Import / Export"]));
    expect(businessSettings).toEqual(expect.arrayContaining(["API & Webhooks", "Branding", "Import / Export", "Full Data Export"]));
  });

  it("renders UpgradeRequired with a clean plan message", () => {
    localStorage.setItem("tradelike_user", JSON.stringify(baseUser));

    render(
      <MemoryRouter initialEntries={["/settings/full-data-export"]}>
        <GlobalSearchProvider>
          <UpgradeRequired featureName="Full Data Export" minimumPlan="Business" />
        </GlobalSearchProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /full data export is locked/i })).toBeInTheDocument();
    expect(screen.getByText(/Business plan/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /back to dashboard/i })[0]).toHaveAttribute("href", "/dashboard");
  });

  it("blocks customer users from staff routes", () => {
    setSession(baseUser);

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<StaffRoute><div>Admin shell</div></StaffRoute>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("This login is for TradeLike staff only.")).toBeInTheDocument();
    expect(screen.queryByText("Admin shell")).not.toBeInTheDocument();
  });

  it("renders the staff login page", () => {
    render(
      <MemoryRouter>
        <StaffLogin />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /sign in to studio/i })).toBeInTheDocument();
    expect(screen.getByText(/internal staff access/i)).toBeInTheDocument();
  });

  it("job form keeps Job needed wording and validates the required field", async () => {
    renderJobForm();

    const customerInput = screen.getByLabelText("Customer");
    await waitFor(() => expect(customerInput).not.toBeDisabled());
    fireEvent.change(customerInput, { target: { value: "Sarah Johnson" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "07981 125031" } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "1 Trade Street" } });
    fireEvent.change(screen.getByLabelText("Scheduled Date"), { target: { value: "2026-07-02T09:00" } });
    fireEvent.click(screen.getByRole("button", { name: /save job/i }));

    expect(await screen.findByText("Job needed is required.")).toBeInTheDocument();
  });

  it("customer form rejects a phone number with the wrong length", async () => {
    renderCustomerForm();

    await waitFor(() => expect(screen.getByLabelText(/customer name/i)).toHaveValue(""));
    fireEvent.change(screen.getByLabelText(/customer name/i), { target: { value: "Sarah Johnson" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: /create customer/i }));

    expect(await screen.findByText(/Customer phone number must be 11 digits/i)).toBeInTheDocument();
  });

  it("quote form shows pound discount copy and create validation", async () => {
    renderQuoteForm();

    const createButton = screen.getByRole("button", { name: /create quote/i });
    await waitFor(() => expect(createButton).not.toBeDisabled());

    fireEvent.click(screen.getByRole("combobox", { name: /discount type/i }));
    expect(screen.getByRole("option", { name: /\u00a3 discount/i })).toBeInTheDocument();

    fireEvent.click(createButton);
    expect(await screen.findByText(/select a customer/i)).toBeInTheDocument();
  });

  it("customer empty and note states stay support-friendly", () => {
    render(
      <MemoryRouter>
        <CustomerList
          customers={[]}
          onDeleteCustomer={vi.fn()}
          emptyAction={<button type="button">Add customer</button>}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /add customer/i })).toBeInTheDocument();

    render(
      <MemoryRouter>
        <CustomerList
          customers={[{
            id: 1,
            name: "Sarah Johnson",
            email: "sarah@example.com",
            phone: "07981 125031",
            address: "1 Trade Street",
            notes: null,
          }]}
          onDeleteCustomer={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getAllByText("Nothing recorded yet.").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Has notes/i)).not.toBeInTheDocument();
  });
});

function renderJobForm(overrides: Partial<ComponentProps<typeof NewJobForm>> = {}) {
  return render(
    <MemoryRouter>
      <NewJobForm onAddJob={vi.fn()} {...overrides} />
    </MemoryRouter>
  );
}

function renderCustomerForm(overrides: Partial<ComponentProps<typeof NewCustomerForm>> = {}) {
  return render(
    <NewCustomerForm
      onAddCustomer={vi.fn()}
      onUpdateCustomer={vi.fn()}
      editingCustomer={null}
      onCancelEdit={vi.fn()}
      {...overrides}
    />
  );
}

function renderQuoteForm(overrides: Partial<ComponentProps<typeof NewQuoteForm>> = {}) {
  return render(
    <MemoryRouter>
      <NewQuoteForm
        onAddQuote={vi.fn()}
        onUpdateQuote={vi.fn()}
        editingQuote={null}
        onCancelEdit={vi.fn()}
        {...overrides}
      />
    </MemoryRouter>
  );
}

function setSession(user: AuthUser) {
  localStorage.setItem("tradelike_user", JSON.stringify(user));
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
