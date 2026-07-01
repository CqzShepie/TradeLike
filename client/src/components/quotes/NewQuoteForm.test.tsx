import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ComponentProps } from "react";

import NewQuoteForm from "./NewQuoteForm";
import { customersService } from "../../services/customersService";

vi.mock("../../services/customersService", () => ({
  customersService: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

describe("NewQuoteForm", () => {
  beforeEach(() => {
    vi.mocked(customersService.getAll).mockResolvedValue([]);
  });

  it("renders discount type as a dark custom select", () => {
    renderForm();

    const discountType = screen.getByRole("combobox", { name: /discount type/i });
    expect(discountType).toHaveClass("bg-slate-950/60");

    fireEvent.click(discountType);

    expect(screen.getByRole("listbox")).toHaveClass("bg-slate-950");
    expect(screen.getByText("£ discount")).toBeInTheDocument();
    expect(screen.queryByText(/GBP amount/i)).not.toBeInTheDocument();
  });

  it("selects a customer from search results", async () => {
    vi.mocked(customersService.getAll).mockResolvedValue([
      { id: 12, name: "Sarah Johnson", email: "sarah@example.com", phone: "07981 125031", address: "1 Trade Street" },
    ]);

    renderForm();

    const search = await screen.findByPlaceholderText(/search customer name/i);
    fireEvent.change(search, { target: { value: "Sarah" } });
    fireEvent.click(await screen.findByRole("button", { name: /Sarah Johnson/i }));

    expect(screen.getByDisplayValue("12")).toBeInTheDocument();
    expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
  });

  it("shows validation when creating without a customer", async () => {
    renderForm();

    const createButton = screen.getByRole("button", { name: /create quote/i });
    await waitFor(() => expect(createButton).not.toBeDisabled());
    fireEvent.click(createButton);

    expect(await screen.findByText(/select a customer/i)).toBeInTheDocument();
  });

  it("calls create with valid quote data", async () => {
    const onAddQuote = vi.fn().mockResolvedValue(undefined);
    vi.mocked(customersService.getAll).mockResolvedValue([
      { id: 12, name: "Sarah Johnson", email: "sarah@example.com", phone: "07981 125031", address: "1 Trade Street" },
    ]);

    renderForm({ onAddQuote });

    fireEvent.change(await screen.findByPlaceholderText(/search customer name/i), { target: { value: "Sarah" } });
    fireEvent.click(await screen.findByRole("button", { name: /Sarah Johnson/i }));
    fireEvent.change(screen.getByPlaceholderText(/Bathroom refit estimate/i), { target: { value: "Boiler service quote" } });
    fireEvent.change(screen.getByPlaceholderText(/First-fix plumbing labour/i), { target: { value: "Boiler service labour" } });
    fireEvent.click(screen.getByRole("button", { name: /create quote/i }));

    await waitFor(() => expect(onAddQuote).toHaveBeenCalled());
    expect(onAddQuote.mock.calls[0][0]).toMatchObject({
      customerId: 12,
      customerName: "Sarah Johnson",
      title: "Boiler service quote",
      discountType: "Amount",
      discountValue: 0,
    });
  });
});

function renderForm(overrides: Partial<ComponentProps<typeof NewQuoteForm>> = {}) {
  return render(
    <MemoryRouter>
      <NewQuoteForm
        onAddQuote={vi.fn()}
        onUpdateQuote={vi.fn()}
        editingQuote={null}
        onCancelEdit={vi.fn()}
        {...overrides}
      />
    </MemoryRouter>
  );
}
