import { render, screen, waitFor } from "@testing-library/react";
import ExpensesSummary from "./ExpensesSummary";
import { apiClient } from "../../services/apiClient";

vi.mock("../../components/layout/Sidebar", () => ({
  default: () => <aside>Sidebar</aside>,
}));

vi.mock("../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("ExpensesSummary", () => {
  it("renders category totals", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([
      { category: "Fuel", totalPence: 12000 },
      { category: "Mileage", totalPence: 4500 },
    ]);

    render(<ExpensesSummary />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(await screen.findByText("Fuel")).toBeInTheDocument();
    expect(screen.getByText("Mileage")).toBeInTheDocument();
    expect(screen.getByText("£120")).toBeInTheDocument();
    expect(screen.getByText("£45")).toBeInTheDocument();
  });
});
