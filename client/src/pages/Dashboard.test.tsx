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
});

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}
