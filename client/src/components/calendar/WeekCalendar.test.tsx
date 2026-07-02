import { render, screen } from "@testing-library/react";
import { fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import type { AuthUser } from "../../services/authService";
import type { Job } from "../../types/job";
import WeekCalendar from "./WeekCalendar";

const weekCalendarState = vi.hoisted(() => ({ jobs: [] as Job[] }));

vi.mock("./WeekGrid", () => ({
  default: ({ jobs, onSelectJob }: { jobs: Job[]; onSelectJob: (job: Job) => void }) => (
    <div>
      Week grid
      {jobs.map(job => (
        <button key={job.id} type="button" onClick={() => onSelectJob(job)}>
          Open {job.jobTitle}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("./WeekNavigation", () => ({ default: () => <div>Week navigation</div> }));
vi.mock("./RouteMapModal", () => ({ default: () => <div>Route map modal</div> }));
vi.mock("../../hooks/useWeekJobs", () => ({
  useWeekJobs: () => ({ jobs: weekCalendarState.jobs }),
}));
vi.mock("../../services/customerStaffService", () => ({
  customerStaffService: {
    getWorkspace: vi.fn().mockResolvedValue({ members: [], teams: [] }),
  },
}));
vi.mock("../../services/jobAssignmentsService", () => ({
  jobAssignmentsService: {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("../../services/staffLeaveService", () => ({
  staffLeaveService: {
    getAll: vi.fn().mockResolvedValue([]),
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
    weekCalendarState.jobs = [];
  });

  it("hides staff scheduling controls for Solo users", () => {
    setUser(baseUser);

    render(<WeekCalendar />);

    expect(screen.queryByRole("button", { name: /optimise route/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /calendar dispatch filter/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Merged: everyone/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dispatch view/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Team dispatch tools unlock on Team/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Basic calendar is available on Solo/i)).not.toBeInTheDocument();
  });

  it("shows staff scheduling controls for Team CustomerManagers", () => {
    setUser({ ...baseUser, role: "CustomerManager", plan: "Team" });

    render(<WeekCalendar />);

    expect(screen.getByRole("button", { name: /optimise route/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).not.toBeDisabled();
  });

  it("shows assigned staff in the calendar job preview", async () => {
    setUser({ ...baseUser, role: "CustomerManager", plan: "Team" });
    weekCalendarState.jobs = [{
      id: 44,
      customer: "Sarah Johnson",
      phone: "07981 125031",
      jobTitle: "Boiler service",
      address: "1 Trade Street",
      scheduledDate: "2026-07-02T09:00:00.000Z",
      status: "Scheduled",
      priority: "High",
      quoteId: 12,
    }];
    const { customerStaffService } = await import("../../services/customerStaffService");
    const { jobAssignmentsService } = await import("../../services/jobAssignmentsService");
    vi.mocked(customerStaffService.getWorkspace).mockResolvedValue({
      members: [{ id: 9, firstName: "Ava", lastName: "Engineer", email: "ava@example.com", phone: "", roleName: "Engineer", status: "Active" }],
      teams: [{ id: 3, name: "Install team", description: "", colour: "blue", teamLeadStaffId: null, defaultJobType: "", serviceArea: "", workingHours: "", createdAt: "2026-07-01T00:00:00.000Z" }],
    } as never);
    vi.mocked(jobAssignmentsService.getAll).mockResolvedValue([{
      jobId: 44,
      assignedTeamId: 3,
      leadStaffMemberId: 9,
      assignedStaffMemberIds: [],
      scheduledEndDate: null,
      calendarColour: "blue",
    }]);

    render(
      <MemoryRouter>
        <WeekCalendar />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: /open boiler service/i }));

    await waitFor(() => expect(screen.getAllByText("Ava Engineer").length).toBeGreaterThan(0));
    expect(screen.getByText("Install team")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view job/i })).toHaveAttribute("href", "/jobs/44");
    expect(screen.getByRole("link", { name: /view quote/i })).toHaveAttribute("href", "/quotes/12");
  });
});

function setUser(user: AuthUser) {
  localStorage.setItem("tradelike_user", JSON.stringify(user));
}
