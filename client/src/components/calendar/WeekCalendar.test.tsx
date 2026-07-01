import { render, screen } from "@testing-library/react";

import type { AuthUser } from "../../services/authService";
import WeekCalendar from "./WeekCalendar";

vi.mock("./WeekGrid", () => ({ default: () => <div>Week grid</div> }));
vi.mock("./WeekNavigation", () => ({ default: () => <div>Week navigation</div> }));
vi.mock("./RouteMapModal", () => ({ default: () => <div>Route map modal</div> }));
vi.mock("../../hooks/useWeekJobs", () => ({
  useWeekJobs: () => ({ jobs: [] }),
}));
vi.mock("../../services/customerStaffService", () => ({
  customerStaffService: {
    getWorkspace: vi.fn(() => new Promise(() => {})),
  },
}));
vi.mock("../../services/jobAssignmentsService", () => ({
  jobAssignmentsService: {
    getAll: vi.fn(() => new Promise(() => {})),
  },
}));
vi.mock("../../services/staffLeaveService", () => ({
  staffLeaveService: {
    getAll: vi.fn(() => new Promise(() => {})),
  },
}));

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

describe("WeekCalendar plan controls", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hides staff scheduling controls for Solo users", () => {
    setUser(baseUser);

    render(<WeekCalendar />);

    expect(screen.queryByRole("button", { name: /optimise route/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Team dispatch tools unlock on Team/i)).toBeInTheDocument();
  });

  it("shows staff scheduling controls for Team CustomerManagers", () => {
    setUser({ ...baseUser, role: "CustomerManager", plan: "Team" });

    render(<WeekCalendar />);

    expect(screen.getByRole("button", { name: /optimise route/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).not.toBeDisabled();
  });
});

function setUser(user: AuthUser) {
  localStorage.setItem("tradelike_user", JSON.stringify(user));
}
