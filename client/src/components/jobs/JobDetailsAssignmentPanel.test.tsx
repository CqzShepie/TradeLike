import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { AuthUser } from "../../services/authService";
import { customerStaffService } from "../../services/customerStaffService";
import { jobAssignmentsService } from "../../services/jobAssignmentsService";
import type { Job } from "../../types/job";
import JobDetailsAssignmentPanel from "./JobDetailsAssignmentPanel";

vi.mock("../../services/customerStaffService", () => ({
  customerStaffService: {
    getWorkspace: vi.fn(),
  },
}));

vi.mock("../../services/jobAssignmentsService", () => ({
  jobAssignmentsService: {
    getAll: vi.fn(),
    update: vi.fn(),
    clear: vi.fn(),
  },
}));

const user: AuthUser = {
  id: 1,
  email: "owner@example.com",
  name: "Owner",
  role: "CustomerManager",
  plan: "Team",
  accountStatus: "Active",
  passwordResetRequired: false,
  canManageAccounts: true,
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
  canCreateStaff: true,
  canCancelStaff: false,
  canEditStaffPermissions: true,
  canViewSecurityLogs: false,
};

const job: Job = {
  id: 44,
  customer: "Sarah Johnson",
  phone: "07981 125031",
  jobTitle: "Boiler service",
  address: "1 Trade Street",
  scheduledDate: "2026-07-02T09:00:00.000Z",
  status: "Scheduled",
  priority: "Normal",
};

describe("JobDetailsAssignmentPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("tradelike_user", JSON.stringify(user));
    vi.mocked(customerStaffService.getWorkspace).mockResolvedValue({
      members: [
        { id: 10, firstName: "Mia", lastName: "Kennington", email: "mia@example.com", phone: "", roleName: "Engineer", status: "Active" },
        { id: 11, firstName: "Ava", lastName: "Cole", email: "ava@example.com", phone: "", roleName: "Engineer", status: "Active" },
      ],
      teams: [{ id: 5, name: "Install team", description: "", colour: "green", teamLeadStaffId: null, defaultJobType: "", serviceArea: "", workingHours: "", createdAt: "2026-07-01T00:00:00.000Z" }],
    } as never);
    vi.mocked(jobAssignmentsService.getAll).mockResolvedValue([{
      jobId: 44,
      assignedTeamId: 5,
      leadStaffMemberId: 10,
      assignedStaffMemberIds: [11],
      scheduledEndDate: null,
      calendarColour: "green",
    }]);
    vi.mocked(jobAssignmentsService.update).mockResolvedValue([{
      jobId: 44,
      assignedTeamId: 5,
      leadStaffMemberId: null,
      assignedStaffMemberIds: [11],
      scheduledEndDate: null,
      calendarColour: "green",
    }]);
    vi.mocked(jobAssignmentsService.clear).mockResolvedValue([{
      jobId: 44,
      assignedTeamId: null,
      leadStaffMemberId: null,
      assignedStaffMemberIds: [],
      scheduledEndDate: null,
      calendarColour: "blue",
    }]);
  });

  it("does not render assignment controls for Solo users", () => {
    localStorage.setItem("tradelike_user", JSON.stringify({ ...user, plan: "Solo" }));

    render(<JobDetailsAssignmentPanel job={job} />);

    expect(screen.queryByText("Staff and Team")).not.toBeInTheDocument();
  });

  it("renders Team+ assignment controls with an unassigned lead option", async () => {
    render(<JobDetailsAssignmentPanel job={job} />);

    expect(await screen.findByText("Staff and Team")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear assignment" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Unassigned" })).toBeInTheDocument();
  });

  it("saves a null lead when Unassigned is selected", async () => {
    render(<JobDetailsAssignmentPanel job={job} />);

    const leadSelect = (await screen.findAllByRole("combobox"))[1];
    fireEvent.change(leadSelect, { target: { value: "" } });

    await waitFor(() => expect(jobAssignmentsService.update).toHaveBeenCalledWith(44, expect.objectContaining({
      leadStaffMemberId: null,
      assignedTeamId: 5,
      assignedStaffMemberIds: [11],
    })));
  });

  it("clears team, lead and extra staff from the UI", async () => {
    render(<JobDetailsAssignmentPanel job={job} />);

    fireEvent.click(await screen.findByRole("button", { name: "Clear assignment" }));

    await waitFor(() => expect(jobAssignmentsService.clear).toHaveBeenCalledWith(44));
    expect(await screen.findByText("Assignment cleared.")).toBeInTheDocument();
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No team").length).toBeGreaterThan(0);
    expect(screen.getByText("None")).toBeInTheDocument();
  });
});
