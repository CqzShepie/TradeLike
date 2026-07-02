import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Reports from "./Reports";
import { ApiError } from "../services/apiClient";
import { reportsService } from "../services/reportsService";
import { jobsService } from "../services/jobsService";
import { jobAssignmentsService } from "../services/jobAssignmentsService";
import { customerStaffService } from "../services/customerStaffService";

vi.mock("../components/layout/Sidebar", () => ({
  default: () => <aside>Sidebar</aside>,
}));

vi.mock("../services/reportsService", () => ({
  reportsService: {
    getSummary: vi.fn(),
    getJobs: vi.fn(),
    getTeam: vi.fn(),
    getBusiness: vi.fn(),
  },
}));

vi.mock("../services/jobsService", () => ({
  jobsService: {
    getAll: vi.fn(),
  },
}));

vi.mock("../services/jobAssignmentsService", () => ({
  jobAssignmentsService: {
    getAll: vi.fn(),
  },
}));

vi.mock("../services/customerStaffService", () => ({
  customerStaffService: {
    getWorkspace: vi.fn(),
  },
}));

describe("Reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setUser("Business");
    vi.mocked(jobsService.getAll).mockResolvedValue([]);
    vi.mocked(jobAssignmentsService.getAll).mockResolvedValue([]);
    vi.mocked(customerStaffService.getWorkspace).mockResolvedValue({
      teams: [],
      members: [],
      entitlements: {
        planName: "Business",
        maxUsers: 25,
        teamsEnabled: true,
        staffSchedulingEnabled: true,
        advancedPermissionsEnabled: true,
        reportingEnabled: true,
        apiAccessEnabled: true,
        supportLevel: "Priority",
      },
      roleOptions: [],
      futureSecurityItems: [],
      qualityOfLifeItems: [],
    });
    vi.mocked(reportsService.getSummary).mockResolvedValue({
      fromUtc: "2026-07-01T00:00:00.000Z",
      toUtc: "2026-08-01T00:00:00.000Z",
      jobsCompleted: 0,
      jobsCompletedPreviousPeriod: 0,
      jobsScheduled: 0,
      openJobs: 0,
      overdueJobs: 0,
      averageCompletedPerWeek: 0,
      averageCompletedPerMonth: 0,
      completionRatePercent: 0,
    });
    vi.mocked(reportsService.getJobs).mockResolvedValue([]);
    vi.mocked(reportsService.getTeam).mockResolvedValue({
      rows: [],
      unassignedJobs: 0,
      timeTrackingMessage: "Time tracking data not available yet.",
    });
    vi.mocked(reportsService.getBusiness).mockResolvedValue({
      quoteCount: 0,
      acceptedQuoteCount: 0,
      quoteConversionRatePercent: 0,
      quoteTotal: 0,
      acceptedQuoteTotal: 0,
      invoiceTotalPence: 0,
      paidInvoiceTotalPence: 0,
      unpaidInvoiceTotalPence: 0,
    });
  });

  it("renders empty report data cleanly", async () => {
    renderReports();

    expect(await screen.findByText("Jobs by status")).toBeInTheDocument();
    expect(screen.getByText("Not enough job data in this range yet.")).toBeInTheDocument();
    expect(screen.getByText("Business reports")).toBeInTheDocument();
  });

  it("renders chart rows and opens report detail modal", async () => {
    vi.mocked(reportsService.getJobs).mockResolvedValue([
      { status: "Completed", count: 4 },
      { status: "Scheduled", count: 2 },
    ]);

    renderReports();

    fireEvent.click(await screen.findByRole("button", { name: /Completed/i }));

    expect(screen.getByRole("heading", { name: "Jobs: Completed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();
  });

  it("keeps Solo reports basic and skips Team-gated data calls", async () => {
    setUser("Solo");

    renderReports();

    expect(await screen.findByText("Reporting: Basic")).toBeInTheDocument();
    expect(screen.queryByText("Team reports")).not.toBeInTheDocument();
    expect(screen.queryByText("Business reports")).not.toBeInTheDocument();
    expect(jobAssignmentsService.getAll).not.toHaveBeenCalled();
    expect(customerStaffService.getWorkspace).not.toHaveBeenCalled();
    expect(reportsService.getTeam).not.toHaveBeenCalled();
    expect(reportsService.getBusiness).not.toHaveBeenCalled();
  });

  it("shows Team advanced reports without Business custom reports", async () => {
    setUser("Team");
    vi.mocked(customerStaffService.getWorkspace).mockResolvedValue({
      teams: [],
      members: [],
      entitlements: {
        planName: "Team",
        maxUsers: 10,
        teamsEnabled: true,
        staffSchedulingEnabled: true,
        advancedPermissionsEnabled: false,
        reportingEnabled: true,
        apiAccessEnabled: false,
        supportLevel: "Email",
      },
      roleOptions: [],
      futureSecurityItems: [],
      qualityOfLifeItems: [],
    });
    vi.mocked(reportsService.getTeam).mockResolvedValue({
      rows: [],
      unassignedJobs: 0,
      timeTrackingMessage: "Time tracking data is not available yet.",
    });

    renderReports();

    expect(await screen.findByText("Reporting: Advanced")).toBeInTheDocument();
    expect(screen.getByText("Team reports")).toBeInTheDocument();
    expect(screen.getByText("Time tracking data is not available yet.")).toBeInTheDocument();
    expect(screen.queryByText("Business reports")).not.toBeInTheDocument();
    expect(reportsService.getBusiness).not.toHaveBeenCalled();
  });

  it.each(["Business", "Enterprise"] as const)(
    "shows Advanced + Custom reports for %s",
    async plan => {
      setUser(plan);

      renderReports();

      expect(await screen.findByText("Reporting: Advanced + Custom")).toBeInTheDocument();
      expect(screen.getByText("Business reports")).toBeInTheDocument();
      expect(reportsService.getTeam).toHaveBeenCalled();
      expect(reportsService.getBusiness).toHaveBeenCalled();
    }
  );

  it("hides raw stack traces in report errors", async () => {
    vi.mocked(reportsService.getSummary).mockRejectedValue(
      new ApiError(500, "System.InvalidOperationException at TradeLike.Api.Controllers.ReportsController")
    );

    renderReports();

    expect(await screen.findByText("Unable to load reports")).toBeInTheDocument();
    expect(screen.getByText("Reports could not be loaded. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/System\.InvalidOperationException|ReportsController/i)).not.toBeInTheDocument();
  });

  it("loads team and business reports for Enterprise users", async () => {
    setUser("Enterprise");

    renderReports();

    await waitFor(() => expect(reportsService.getTeam).toHaveBeenCalled());
    expect(reportsService.getBusiness).toHaveBeenCalled();
  });
});

function renderReports() {
  return render(
    <MemoryRouter>
      <Reports />
    </MemoryRouter>
  );
}

function setUser(plan: string) {
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
