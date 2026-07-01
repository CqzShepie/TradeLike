import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Jobs from "./Jobs";
import { useJobs } from "../hooks/useJobs";

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
  },
}));

describe("Jobs", () => {
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

  it("uses Job needed wording while submitting the existing jobTitle field", () => {
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
    fireEvent.change(screen.getByLabelText("Customer"), { target: { value: "Sarah Johnson" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "07981 125031" } });
    fireEvent.change(screen.getByLabelText("Job needed"), { target: { value: "Boiler service" } });
    fireEvent.change(screen.getByLabelText("Scheduled Date"), { target: { value: "2026-07-02T09:00" } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "1 Trade Street" } });
    fireEvent.click(screen.getByRole("button", { name: /save job/i }));

    expect(addJob).toHaveBeenCalledWith(expect.objectContaining({
      jobTitle: "Boiler service",
    }));
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
