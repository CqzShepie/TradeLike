import { fireEvent, render, screen } from "@testing-library/react";

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
    render(
      <NewQuoteForm
        onAddQuote={vi.fn()}
        onUpdateQuote={vi.fn()}
        editingQuote={null}
        onCancelEdit={vi.fn()}
      />
    );

    const discountType = screen.getByRole("combobox", { name: /discount type/i });
    expect(discountType).toHaveClass("bg-slate-950/60");

    fireEvent.click(discountType);

    expect(screen.getByRole("listbox")).toHaveClass("bg-slate-950");
  });
});
