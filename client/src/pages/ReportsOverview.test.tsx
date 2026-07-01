import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReportsOverview from "./ReportsOverview";
import { analyticsService } from "../services/analyticsService";

vi.mock("../components/layout/Sidebar", () => ({
  default: () => <aside>Sidebar</aside>,
}));

vi.mock("../services/analyticsService", () => ({
  analyticsService: {
    getRevenue: vi.fn(),
    getJobCompletion: vi.fn(),
  },
}));

const mockedAnalytics = vi.mocked(analyticsService);

describe("ReportsOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAnalytics.getRevenue.mockResolvedValue([
      { date: "2026-07-01", revenuePence: 12000, invoiceCount: 2, paidInvoiceCount: 1 },
      { date: "2026-07-02", revenuePence: 8000, invoiceCount: 1, paidInvoiceCount: 1 },
    ]);
    mockedAnalytics.getJobCompletion.mockResolvedValue([
      { date: "2026-07-01", completed: 2, inProgress: 1, scheduled: 3, cancelled: 0 },
    ]);
  });

  it("renders chart points", async () => {
    render(<ReportsOverview />);

    expect(await screen.findAllByTestId("revenue-point")).toHaveLength(2);
    expect(screen.getAllByTestId("completion-point")).toHaveLength(1);
  });

  it("reloads analytics when date range changes", async () => {
    render(<ReportsOverview />);

    await waitFor(() => expect(mockedAnalytics.getRevenue).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText(/date range/i), { target: { value: "7" } });

    await waitFor(() => expect(mockedAnalytics.getRevenue).toHaveBeenCalledTimes(2));
    expect(mockedAnalytics.getJobCompletion).toHaveBeenCalledTimes(2);
  });
});
