import { render, screen, waitFor } from "@testing-library/react";
import AutomationsPage from "./AutomationsPage";
import { apiClient } from "../../../services/apiClient";
import type { AuthUser } from "../../../services/authService";

vi.mock("../../../components/layout/Sidebar", () => ({
  default: () => <aside>Sidebar</aside>,
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const teamManager: AuthUser = {
  id: 1,
  email: "manager@example.com",
  name: "Manager",
  role: "CustomerManager",
  plan: "Team",
  accountStatus: "Active",
  passwordResetRequired: false,
  canManageAccounts: false,
  canManageStaff: true,
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
  canViewStaff: true,
  canCreateStaff: true,
  canCancelStaff: false,
  canEditStaffPermissions: false,
  canViewSecurityLogs: false,
};

describe("AutomationsPage", () => {
  beforeEach(() => {
    localStorage.setItem("tradelike_user", JSON.stringify(teamManager));
    vi.mocked(apiClient.get).mockResolvedValue([
      { id: 1, name: "A", isActive: true, enabled: true, maxRunAttempts: 3 },
      { id: 2, name: "B", isActive: true, enabled: true, maxRunAttempts: 3 },
      { id: 3, name: "C", isActive: true, enabled: true, maxRunAttempts: 3 },
    ]);
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("blocks rule creation when the plan limit is exceeded", async () => {
    render(<AutomationsPage />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(await screen.findByText("Premium limit reached")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create automation" })).toBeDisabled();
  });
});
