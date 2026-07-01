import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Invoices from "./Invoices";
import { GlobalSearchProvider } from "../contexts/GlobalSearchContext";
import { jobsService } from "../services/jobsService";
import { quotesService } from "../services/quotesService";

vi.mock("../services/jobsService", () => ({
  jobsService: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../services/quotesService", () => ({
  quotesService: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

describe("Invoices", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(jobsService.getAll).mockResolvedValue([]);
    vi.mocked(quotesService.getAll).mockResolvedValue([]);
  });

  it("does not render customer-facing Pay Now in the internal app", async () => {
    localStorage.setItem("tradelike_invoices", JSON.stringify([
      {
        id: 1,
        invoiceNumber: "INV-00001",
        customerName: "Sarah Johnson",
        title: "Boiler service",
        subtotal: 100,
        vatTotal: 20,
        total: 120,
        status: "Paid",
        dueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ]));

    render(
      <MemoryRouter>
        <GlobalSearchProvider>
          <Invoices />
        </GlobalSearchProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText("INV-00001 - Boiler service")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pay now/i })).not.toBeInTheDocument();
    expect(screen.getAllByText("Paid").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /payment recorded/i })).toBeDisabled();
  });
});
