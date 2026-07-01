import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import CustomerDetails from "./CustomerDetails";
import { customerAuditService } from "../services/customerAuditService";
import { customersService } from "../services/customersService";
import { invoicesService, type Invoice } from "../services/invoicesService";
import { jobsService } from "../services/jobsService";
import { quotesService } from "../services/quotesService";
import type { AuthUser } from "../services/authService";
import type { Customer } from "../types/customer";
import type { Job } from "../types/job";
import type { Quote } from "../types/quote";

vi.mock("../components/layout/Sidebar", () => ({
  default: () => <aside>Sidebar</aside>,
}));

vi.mock("../services/customersService", () => ({
  customersService: {
    getById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../services/jobsService", () => ({
  jobsService: {
    getAll: vi.fn(),
  },
}));

vi.mock("../services/quotesService", () => ({
  quotesService: {
    getAll: vi.fn(),
  },
}));

vi.mock("../services/invoicesService", () => ({
  invoicesService: {
    getAll: vi.fn(),
    createFromQuote: vi.fn(),
    createFromJob: vi.fn(),
  },
}));

vi.mock("../services/customerAuditService", () => ({
  customerAuditService: {
    getForCustomer: vi.fn(),
    log: vi.fn(),
    deleteForCustomer: vi.fn(),
  },
}));

describe("CustomerDetails history", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(customersService.getById).mockResolvedValue(buildCustomer());
    vi.mocked(jobsService.getAll).mockResolvedValue([buildJob()]);
    vi.mocked(quotesService.getAll).mockResolvedValue([buildQuote()]);
    vi.mocked(invoicesService.getAll).mockReturnValue([buildInvoice()]);
    vi.mocked(customerAuditService.getForCustomer).mockReturnValue([]);
  });

  it("hides Timeline and Audit history for Solo users", async () => {
    setUser({ ...baseUser, plan: "Solo", role: "CustomerDirector" });

    renderCustomerDetails();

    expect(await screen.findByRole("heading", { name: "Sarah Johnson" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Timeline" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Audit history" })).not.toBeInTheDocument();
  });

  it("shows a readable Timeline for Team managers without mojibake", async () => {
    setUser({ ...baseUser, plan: "Team", role: "CustomerManager" });

    renderCustomerDetails();

    fireEvent.click(await screen.findByRole("button", { name: "Timeline" }));

    expect(await screen.findByText(/Boiler install - High priority/i)).toBeInTheDocument();
    expect(screen.getByText(/02 Jul 2026/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Ã¢|Â|â|ð/);
  });
});

function renderCustomerDetails() {
  return render(
    <MemoryRouter initialEntries={["/customers/7"]}>
      <Routes>
        <Route path="/customers/:id" element={<CustomerDetails />} />
      </Routes>
    </MemoryRouter>
  );
}

function setUser(user: AuthUser) {
  localStorage.setItem("tradelike_user", JSON.stringify(user));
}

const baseUser: AuthUser = {
  id: 1,
  email: "user@example.com",
  name: "Trade User",
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

function buildCustomer(): Customer {
  return {
    id: 7,
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "07981 125031",
    address: "1 Trade Street",
    notes: null,
  };
}

function buildJob(): Job {
  return {
    id: 42,
    customerId: 7,
    customer: "Sarah Johnson",
    phone: "07981 125031",
    jobTitle: "Boiler Ã¢ install",
    address: "1 Trade Street",
    scheduledDate: "2026-07-02T09:00:00.000Z",
    status: "Scheduled",
    priority: "High",
    notes: null,
    quoteId: null,
    engineerId: null,
    sourceQuote: null,
  };
}

function buildQuote(): Quote {
  return {
    id: 101,
    customerId: 7,
    customerName: "Sarah Johnson",
    title: "Quote Ã¢ cleanup",
    description: null,
    amount: 120,
    subtotal: 100,
    vatTotal: 20,
    discountType: "Amount",
    discountValue: 0,
    discountTotal: 0,
    total: 120,
    status: "Sent",
    notes: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    lineItems: [],
  };
}

function buildInvoice(): Invoice {
  return {
    id: 1,
    invoiceNumber: "INV-00001",
    customerId: 7,
    customerName: "Sarah Johnson",
    title: "Invoice Ã¢ cleanup",
    subtotal: 100,
    vatTotal: 20,
    total: 120,
    status: "Sent",
    dueDate: "2026-07-16T09:00:00.000Z",
    createdAt: "2026-07-03T09:00:00.000Z",
  };
}
