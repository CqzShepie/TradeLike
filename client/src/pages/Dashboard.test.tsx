import { render, screen } from "@testing-library/react";
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

    expect(screen.getByText("No dashboard activity yet")).toBeInTheDocument();
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

    expect(screen.getByRole("heading", { name: "Today's schedule" })).toHaveClass("text-white");
    expect(screen.getByRole("heading", { name: "Upcoming jobs" })).toHaveClass("text-white");
    expect(screen.getByRole("heading", { name: "Recent activity" })).toHaveClass("text-white");
    expect(screen.getByRole("heading", { name: "Quick actions" })).toHaveClass("text-white");
    expect(screen.getByText("Total jobs")).toHaveClass("text-slate-100");
    expect(screen.getByText("New Job")).toHaveClass("text-white");
    expect(screen.getByText("Add Customer")).toHaveClass("text-white");
    expect(screen.getByText("Create Quote")).toHaveClass("text-white");
    expect(screen.getByText("Open Calendar")).toHaveClass("text-white");
  });
});

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}
