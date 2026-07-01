import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();
    expect(screen.getAllByText("Paid").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /payment recorded/i })).toBeDisabled();
  });

  it("shows Delete draft invoice only inside invoice detail", async () => {
    localStorage.setItem("tradelike_invoices", JSON.stringify([
      buildInvoice({ status: "Draft" }),
    ]));

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    renderInvoices();

    expect(await screen.findByText("INV-00001 - Boiler service")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /view\/edit/i }));

    expect(screen.getByRole("button", { name: /delete draft invoice/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /delete draft invoice/i }));
    expect(confirm).toHaveBeenCalledWith("Delete this draft invoice?");
  });

  it("shows Void invoice for paid invoice detail", async () => {
    localStorage.setItem("tradelike_invoices", JSON.stringify([
      buildInvoice({ status: "Paid" }),
    ]));

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    renderInvoices();

    expect(await screen.findByText("INV-00001 - Boiler service")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /view\/edit/i }));

    expect(screen.getByRole("button", { name: /void invoice/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /void invoice/i }));
    expect(confirm).toHaveBeenCalledWith("Void this invoice? It will remain in your records.");
  });
});

function renderInvoices() {
  return render(
    <MemoryRouter>
      <GlobalSearchProvider>
        <Invoices />
      </GlobalSearchProvider>
    </MemoryRouter>
  );
}

function buildInvoice(overrides = {}) {
  return {
    id: 1,
    invoiceNumber: "INV-00001",
    customerName: "Sarah Johnson",
    title: "Boiler service",
    subtotal: 100,
    vatTotal: 20,
    total: 120,
    status: "Draft",
    dueDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
