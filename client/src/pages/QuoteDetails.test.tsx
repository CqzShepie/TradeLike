import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import QuoteDetails from "./QuoteDetails";
import { quotesService } from "../services/quotesService";
import type { Quote } from "../types/quote";

vi.mock("../components/layout/Sidebar", () => ({
  default: () => <aside>Sidebar</aside>,
}));

vi.mock("../services/quotesService", () => ({
  quotesService: {
    getById: vi.fn(),
    update: vi.fn(),
    convertToJob: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("QuoteDetails delete", () => {
  beforeEach(() => {
    vi.mocked(quotesService.getById).mockResolvedValue(buildQuote());
    vi.mocked(quotesService.delete).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Delete quote in the detail danger zone", async () => {
    renderQuoteDetails();

    expect(await screen.findByRole("button", { name: /delete quote/i })).toBeInTheDocument();
  });

  it("asks for confirmation and navigates back to quotes after deleting", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderQuoteDetails();

    fireEvent.click(await screen.findByRole("button", { name: /delete quote/i }));

    await waitFor(() => expect(quotesService.delete).toHaveBeenCalledWith(101));
    expect(confirm).toHaveBeenCalledWith("Are you sure you want to delete this quote?");
    expect(await screen.findByText("Quotes index")).toBeInTheDocument();
  });
});

function renderQuoteDetails() {
  return render(
    <MemoryRouter initialEntries={["/quotes/101"]}>
      <Routes>
        <Route path="/quotes/:id" element={<QuoteDetails />} />
        <Route path="/quotes" element={<div>Quotes index</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function buildQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 101,
    customerId: 7,
    customerName: "Sarah Johnson",
    title: "Boiler service",
    description: "Annual service",
    amount: 120,
    subtotal: 100,
    vatTotal: 20,
    discountType: "Amount",
    discountValue: 0,
    discountTotal: 0,
    total: 120,
    status: "Sent",
    notes: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    lineItems: [],
    ...overrides,
  };
}
