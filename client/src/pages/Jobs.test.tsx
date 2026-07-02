import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Jobs from "./Jobs";
import { useJobs } from "../hooks/useJobs";
import { customersService } from "../services/customersService";
import { jobAssignmentsService } from "../services/jobAssignmentsService";

vi.mock("../components/layout/Sidebar", () => ({
  default: () => <aside>Sidebar</aside>,
}));

vi.mock("../hooks/useJobs", () => ({
  useJobs: vi.fn(),
}));

vi.mock("../services/customerStaffService", () => ({
  customerStaffService: {
    getWorkspace: vi.fn().mockResolvedValue({ members: [], teams: [] }),
  },
}));

vi.mock("../services/jobAssignmentsService", () => ({
  jobAssignmentsService: {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../services/customersService", () => ({
  customersService: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

describe("Jobs", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(customersService.getAll).mockResolvedValue([]);
    vi.mocked(customersService.create).mockReset();
    vi.mocked(jobAssignmentsService.getAll).mockResolvedValue([]);
    vi.mocked(jobAssignmentsService.update).mockResolvedValue([]);
  });

  it("renders an empty state when no jobs are returned", () => {
    vi.mocked(useJobs).mockReturnValue({
      jobs: [],
      loading: false,
      error: null,
      reloadJobs: vi.fn(),
      addJob: vi.fn(),
      deleteJob: vi.fn(),
      updateJob: vi.fn(),
      editingJob: null,
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>
    );

    expect(screen.getByText("No jobs found.")).toBeInTheDocument();
  });

  it("renders dark select filters and opens a dark listbox", () => {
    vi.mocked(useJobs).mockReturnValue({
      jobs: [],
      loading: false,
      error: null,
      reloadJobs: vi.fn(),
      addJob: vi.fn(),
      deleteJob: vi.fn(),
      updateJob: vi.fn(),
      editingJob: null,
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>
    );

    const statusFilter = screen.getByRole("combobox", { name: /job status filter/i });
    expect(statusFilter).toHaveClass("bg-slate-950/60");

    fireEvent.click(statusFilter);

    expect(screen.getByRole("listbox")).toHaveClass("bg-slate-950");
  });

  it("keeps Previous Job Records intentionally enabled", () => {
    vi.mocked(useJobs).mockReturnValue({
      jobs: [],
      loading: false,
      error: null,
      reloadJobs: vi.fn(),
      addJob: vi.fn(),
      deleteJob: vi.fn(),
      updateJob: vi.fn(),
      editingJob: null,
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>
    );

    const previousJobs = screen.getByRole("button", { name: /previous job records/i });
    expect(previousJobs).not.toBeDisabled();
    expect(previousJobs).toHaveClass("bg-white/5");
  });

  it("uses Job needed wording while submitting the existing jobTitle field", async () => {
    setStoredUser("Solo", "CustomerDirector");
    const addJob = vi.fn();
    vi.mocked(useJobs).mockReturnValue({
      jobs: [],
      loading: false,
      error: null,
      reloadJobs: vi.fn(),
      addJob,
      deleteJob: vi.fn(),
      updateJob: vi.fn(),
      editingJob: null,
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByRole("button", { name: /add new job/i })[0]);
    const customerInput = await screen.findByLabelText("Customer");
    await waitFor(() => expect(customerInput).not.toBeDisabled());
    fireEvent.change(customerInput, { target: { value: "Sarah Johnson" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "07981 125031" } });
    fireEvent.change(screen.getByLabelText("Job needed"), { target: { value: "Boiler service" } });
    fireEvent.change(screen.getByLabelText("Scheduled Date"), { target: { value: "2026-07-02T09:00" } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "1 Trade Street" } });
    fireEvent.click(screen.getByRole("button", { name: /save job/i }));

    expect(addJob).toHaveBeenCalledWith(expect.objectContaining({
      customer: "Sarah Johnson",
      jobTitle: "Boiler service",
    }));
  });

  it("renders View rather than Edit in the jobs list", () => {
    vi.mocked(useJobs).mockReturnValue({
      jobs: [
        {
          id: 1,
          customer: "Sarah Johnson",
          phone: "07981 125031",
          jobTitle: "Boiler service",
          address: "1 Trade Street",
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          status: "Scheduled",
          priority: "Normal",
        },
      ],
      loading: false,
      error: null,
      reloadJobs: vi.fn(),
      addJob: vi.fn(),
      deleteJob: vi.fn(),
      updateJob: vi.fn(),
      editingJob: null,
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>
    );

    expect(screen.getAllByText("View").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit job/i })).not.toBeInTheDocument();
  });

  it("creates and selects a customer from the new job form", async () => {
    setStoredUser("Solo", "CustomerDirector");
    const addJob = vi.fn();
    vi.mocked(customersService.getAll).mockResolvedValue([]);
    vi.mocked(customersService.create).mockResolvedValue({
      id: 44,
      name: "New Customer",
      email: "new@example.com",
      phone: "07981 125031",
      address: "44 New Street",
      notes: null,
    });
    vi.mocked(useJobs).mockReturnValue({
      jobs: [],
      loading: false,
      error: null,
      reloadJobs: vi.fn(),
      addJob,
      deleteJob: vi.fn(),
      updateJob: vi.fn(),
      editingJob: null,
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByRole("button", { name: /add new job/i })[0]);
    const customerInput = await screen.findByLabelText("Customer");
    await waitFor(() => expect(customerInput).not.toBeDisabled());
    fireEvent.change(customerInput, { target: { value: "New Customer" } });
    fireEvent.click(screen.getAllByRole("button", { name: /^add customer$/i }).at(-1)!);
    fireEvent.change(screen.getByLabelText("New customer name"), { target: { value: "New Customer" } });
    fireEvent.change(screen.getByLabelText("New customer phone"), { target: { value: "07981 125031" } });
    fireEvent.change(screen.getByLabelText("New customer email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("New customer address"), { target: { value: "44 New Street" } });
    fireEvent.click(screen.getByRole("button", { name: /create and select customer/i }));

    expect(await screen.findByText("Selected customer #44")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toHaveValue("07981 125031");
    expect(screen.getByLabelText("Address")).toHaveValue("44 New Street");

    fireEvent.change(screen.getByLabelText("Job needed"), { target: { value: "Leak repair" } });
    fireEvent.change(screen.getByLabelText("Scheduled Date"), { target: { value: "2026-07-02T09:00" } });
    fireEvent.click(screen.getByRole("button", { name: /save job/i }));

    await waitFor(() => expect(addJob).toHaveBeenCalledWith(expect.objectContaining({
      customer: "New Customer",
      phone: "07981 125031",
      address: "44 New Street",
      jobTitle: "Leak repair",
    })));
  });

  it("shows the linked quote section inside the job edit form", () => {
    setStoredUser("Solo", "CustomerDirector");
    vi.mocked(useJobs).mockReturnValue({
      jobs: [],
      loading: false,
      error: null,
      reloadJobs: vi.fn(),
      addJob: vi.fn(),
      deleteJob: vi.fn(),
      updateJob: vi.fn(),
      editingJob: {
        id: 1,
        customer: "Sarah Johnson",
        phone: "07981 125031",
        jobTitle: "Boiler service",
        address: "1 Trade Street",
        scheduledDate: "2026-07-02T09:00",
        status: "Scheduled",
        priority: "Normal",
        quoteId: null,
        sourceQuote: null,
      },
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>
    );

    expect(screen.getByText("Linked quote")).toBeInTheDocument();
    expect(screen.getByText("No quote linked")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /link quote/i })).toBeInTheDocument();
  });

  it("hides staff and team controls for Solo users in the job workspace", () => {
    setStoredUser("Solo", "CustomerDirector");
    vi.mocked(useJobs).mockReturnValue({
      jobs: [],
      loading: false,
      error: null,
      reloadJobs: vi.fn(),
      addJob: vi.fn(),
      deleteJob: vi.fn(),
      updateJob: vi.fn(),
      editingJob: null,
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByRole("button", { name: /add new job/i })[0]);

    expect(screen.queryByText(/staff and team/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /job team filter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /job engineer filter/i })).not.toBeInTheDocument();
    expect(screen.queryByText("All teams")).not.toBeInTheDocument();
    expect(screen.queryByText("All engineers")).not.toBeInTheDocument();
    expect(screen.queryByText("No team")).not.toBeInTheDocument();
    expect(screen.queryByText("No lead engineer")).not.toBeInTheDocument();
    expect(screen.queryByText("Extra staff")).not.toBeInTheDocument();
  });

  it("shows staff and team controls for Team managers", () => {
    setStoredUser("Team", "CustomerManager");
    vi.mocked(useJobs).mockReturnValue({
      jobs: [],
      loading: false,
      error: null,
      reloadJobs: vi.fn(),
      addJob: vi.fn(),
      deleteJob: vi.fn(),
      updateJob: vi.fn(),
      editingJob: null,
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>
    );

    expect(screen.getByRole("combobox", { name: /job team filter/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /job engineer filter/i })).toBeInTheDocument();
  });

  it.each(["Business", "Enterprise"] as const)(
    "shows staff and team filters for %s managers",
    plan => {
      setStoredUser(plan, "CustomerManager");
      vi.mocked(useJobs).mockReturnValue({
        jobs: [],
        loading: false,
        error: null,
        reloadJobs: vi.fn(),
        addJob: vi.fn(),
        deleteJob: vi.fn(),
        updateJob: vi.fn(),
        editingJob: null,
        startEdit: vi.fn(),
        cancelEdit: vi.fn(),
      });

      render(
        <MemoryRouter>
          <Jobs />
        </MemoryRouter>
      );

      expect(screen.getByRole("combobox", { name: /job team filter/i })).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: /job engineer filter/i })).toBeInTheDocument();
    }
  );

  it("shows assignment actions and assigned staff for Team+ job rows", async () => {
    setStoredUser("Team", "CustomerManager");
    vi.mocked(jobAssignmentsService.getAll).mockResolvedValue([
      {
        jobId: 1,
        assignedTeamId: null,
        leadStaffMemberId: 10,
        assignedStaffMemberIds: [],
      },
    ]);
    const { customerStaffService } = await import("../services/customerStaffService");
    vi.mocked(customerStaffService.getWorkspace).mockResolvedValue({
      members: [{ id: 10, firstName: "Ava", lastName: "Engineer", email: "ava@example.com", phone: "", roleName: "Engineer", status: "Active" }],
      teams: [],
    } as never);
    vi.mocked(useJobs).mockReturnValue({
      jobs: [
        {
          id: 1,
          customer: "Sarah Johnson",
          phone: "07981 125031",
          jobTitle: "Boiler service",
          address: "1 Trade Street",
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          status: "Scheduled",
          priority: "Normal",
        },
      ],
      loading: false,
      error: null,
      reloadJobs: vi.fn(),
      addJob: vi.fn(),
      deleteJob: vi.fn(),
      updateJob: vi.fn(),
      editingJob: null,
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>
    );

    expect((await screen.findAllByText("Ava Engineer")).length).toBeGreaterThan(0);
    const assignButtons = await screen.findAllByRole("button", { name: /change assignment/i });
    fireEvent.click(assignButtons[0]);

    expect(jobAssignmentsService.update).not.toHaveBeenCalled();
  });

  it("renders job stat cards", () => {
    vi.mocked(useJobs).mockReturnValue({
      jobs: [
        {
          id: 1,
          customer: "Sarah Johnson",
          phone: "07981 125031",
          jobTitle: "Boiler service",
          address: "1 Trade Street",
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          status: "Scheduled",
          priority: "Normal",
        },
      ],
      loading: false,
      error: null,
      reloadJobs: vi.fn(),
      addJob: vi.fn(),
      deleteJob: vi.fn(),
      updateJob: vi.fn(),
      editingJob: null,
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Jobs />
      </MemoryRouter>
    );

    expect(screen.getByText("Total jobs")).toBeInTheDocument();
    expect(screen.getAllByText("Scheduled").length).toBeGreaterThan(0);
    expect(screen.getAllByText("In progress").length).toBeGreaterThan(0);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
  });
});

function setStoredUser(plan: string, role: string) {
  localStorage.setItem("tradelike_user", JSON.stringify({
    id: 1,
    email: "owner@example.com",
    name: "Trade Owner",
    role,
    plan,
    accountStatus: "Active",
    passwordResetRequired: false,
  }));
}
