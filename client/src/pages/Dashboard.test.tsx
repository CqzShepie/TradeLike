import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import { ApiError } from "../services/apiClient";
import { useDashboardSummary } from "../hooks/useDashboardSummary";

vi.mock("../components/layout/Sidebar", () => ({
  default: () => <aside>Sidebar</aside>,
}));

vi.mock("../hooks/useDashboardSummary", () => ({
  useDashboardSummary: vi.fn(),
}));

const mockedUseDashboardSummary = vi.mocked(useDashboardSummary);

describe("Dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
    setStoredUser("Solo");
  });

  it("renders AccessDenied for a 403 API response", () => {
    mockedUseDashboardSummary.mockReturnValue({
      summary: null,
      loading: false,
      error: new ApiError(403, "Forbidden"),
      refresh: vi.fn(),
    });

    renderDashboard();

    expect(screen.getByRole("heading", { name: /access denied/i })).toBeInTheDocument();
  });

  it("renders UpgradeRequired for a 402 API response", () => {
    mockedUseDashboardSummary.mockReturnValue({
      summary: null,
      loading: false,
      error: new ApiError(402, "Upgrade required"),
      refresh: vi.fn(),
    });

    renderDashboard();

    expect(screen.getByRole("heading", { name: /upgrade required/i })).toBeInTheDocument();
  });

  it("renders an empty state when summary has no data", () => {
    mockedUseDashboardSummary.mockReturnValue({
      summary: {
        totalJobs: 0,
        scheduledJobs: 0,
        inProgressJobs: 0,
        completedJobs: 0,
        todayJobs: [],
        upcomingJobs: [],
        recentActivity: [],
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    renderDashboard();

    expect(screen.getByRole("heading", { name: "Create your first job" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create your first job" })).toHaveAttribute("href", "/jobs");
  });

  it("renders dashboard headings and stat labels with readable dark styling", () => {
    mockedUseDashboardSummary.mockReturnValue({
      summary: {
        totalJobs: 2,
        scheduledJobs: 1,
        inProgressJobs: 0,
        completedJobs: 1,
        todayJobs: [{
          id: 1,
          customer: "Sarah Johnson",
          phone: "07981 125031",
          jobTitle: "Boiler service",
          address: "1 Trade Street",
          scheduledDate: "2026-07-02T09:00:00.000Z",
          status: "Scheduled",
          priority: "Normal",
        }],
        upcomingJobs: [],
        recentActivity: [{
          jobId: 1,
          title: "Job scheduled",
          description: "Boiler service was scheduled.",
          type: "Scheduled",
          timestamp: "2026-07-02T09:00:00.000Z",
        }],
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    renderDashboard();

    expect(screen.getByRole("heading", { name: "Trade business at a glance" })).toBeInTheDocument();
    expect(screen.getByLabelText("Dashboard preview summary")).toBeInTheDocument();
    expect(screen.getByText("Today")).toHaveClass("text-slate-400");
    expect(screen.getByText("Upcoming")).toHaveClass("text-slate-400");
    expect(screen.getByText("Quotes")).toHaveClass("text-slate-400");
    expect(screen.getByText("Invoices")).toHaveClass("text-slate-400");
    expect(screen.getByText("Activity")).toHaveClass("text-slate-400");
    expect(screen.getByRole("heading", { name: "Today's schedule" })).toHaveClass("text-white");
    expect(screen.getByRole("heading", { name: "Upcoming jobs" })).toHaveClass("text-white");
    expect(screen.getByRole("heading", { name: "Recent activity" })).toHaveClass("text-white");
    expect(screen.getByRole("heading", { name: "Quick actions" })).toHaveClass("text-white");
    expect(screen.getByText("Total jobs")).toHaveClass("text-slate-100");
    expect(screen.getByText("New Job")).toHaveClass("text-white");
    expect(screen.getByText("Add Customer")).toHaveClass("text-white");
    expect(screen.getByText("Create Quote")).toHaveClass("text-white");
    expect(screen.getByText("Open Calendar")).toHaveClass("text-white");
    expect(screen.getByText("Send Invoice")).toHaveClass("text-white");
  });

  it("saves dashboard widget preferences locally", () => {
    mockSummary();

    renderDashboard();

    expect(screen.queryByLabelText("Recent activity")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Customise" }));
    fireEvent.click(screen.getByLabelText("Recent activity"));

    expect(JSON.parse(localStorage.getItem("tradelike_dashboard_widgets") || "{}").activity).toBe(false);
    expect(screen.queryByRole("heading", { name: "Recent activity" })).not.toBeInTheDocument();
  });

  it("uses tenant-facing job numbers in dashboard job cards", () => {
    mockSummary();

    renderDashboard();

    expect(screen.getByText("Job #44")).toBeInTheDocument();
  });

  it("keeps Team and Business widgets plan-aware", () => {
    mockSummary();
    setStoredUser("Solo");
    const { rerender } = renderDashboard();

    expect(screen.queryByRole("heading", { name: "Team workload" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Reports preview" })).not.toBeInTheDocument();

    setStoredUser("Team");
    rerender(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Team workload" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Reports preview" })).not.toBeInTheDocument();

    setStoredUser("Business");
    rerender(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Team workload" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reports preview" })).toBeInTheDocument();
  });
});

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

function mockSummary() {
  mockedUseDashboardSummary.mockReturnValue({
    summary: {
      totalJobs: 2,
      scheduledJobs: 1,
      inProgressJobs: 0,
      completedJobs: 1,
      todayJobs: [{
        id: 1,
        jobNumber: 44,
        customer: "Sarah Johnson",
        phone: "07981 125031",
        jobTitle: "Boiler service",
        address: "1 Trade Street",
        scheduledDate: "2026-07-02T09:00:00.000Z",
        status: "Scheduled",
        priority: "Normal",
      }],
      upcomingJobs: [],
      recentActivity: [{
        jobId: 1,
        title: "Job scheduled",
        description: "Boiler service was scheduled.",
        type: "Scheduled",
        timestamp: "2026-07-02T09:00:00.000Z",
      }],
    },
    loading: false,
    error: null,
    refresh: vi.fn(),
  });
}

function setStoredUser(plan: string) {
  localStorage.setItem("tradelike_user", JSON.stringify({
    id: 1,
    email: "owner@example.com",
    name: "Owner",
    role: "CustomerDirector",
    plan,
    accountStatus: "Active",
    passwordResetRequired: false,
  }));
}
