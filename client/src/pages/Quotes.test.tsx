import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Quotes from "./Quotes";
import { useQuotes } from "../hooks/useQuotes";
import { ApiError } from "../services/apiClient";

vi.mock("../hooks/useQuotes", () => ({
  useQuotes: vi.fn(),
}));

vi.mock("../components/layout/Sidebar", () => ({
  default: () => <aside>Sidebar</aside>,
}));

const mockedUseQuotes = vi.mocked(useQuotes);

describe("Quotes", () => {
  it("renders AccessDenied for a 403 API response", () => {
    mockedUseQuotes.mockReturnValue({
      quotes: [],
      loading: false,
      error: new ApiError(403, "Forbidden"),
      addQuote: vi.fn(),
      updateQuote: vi.fn(),
      deleteQuote: vi.fn(),
      startEdit: vi.fn(),
      editingQuote: null,
      cancelEdit: vi.fn(),
      reloadQuotes: vi.fn(),
    });

    renderQuotes();

    expect(screen.getByRole("heading", { name: /access denied/i })).toBeInTheDocument();
  });

  it("renders ErrorState for a 500 API response", () => {
    mockedUseQuotes.mockReturnValue({
      quotes: [],
      loading: false,
      error: new ApiError(500, "Server exploded with a stack trace"),
      addQuote: vi.fn(),
      updateQuote: vi.fn(),
      deleteQuote: vi.fn(),
      startEdit: vi.fn(),
      editingQuote: null,
      cancelEdit: vi.fn(),
      reloadQuotes: vi.fn(),
    });

    renderQuotes();

    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load quotes");
    expect(screen.queryByText(/System\.|at TradeLike/i)).not.toBeInTheDocument();
  });

  it("renders a dark status filter and opens a dark listbox", () => {
    mockedUseQuotes.mockReturnValue({
      quotes: [],
      loading: false,
      error: null,
      addQuote: vi.fn(),
      updateQuote: vi.fn(),
      deleteQuote: vi.fn(),
      startEdit: vi.fn(),
      editingQuote: null,
      cancelEdit: vi.fn(),
      reloadQuotes: vi.fn(),
    });

    renderQuotes();

    const statusFilter = screen.getByRole("combobox", { name: /quote status filter/i });
    expect(statusFilter).toHaveClass("bg-slate-950/60");

    fireEvent.click(statusFilter);

    expect(screen.getByRole("listbox")).toHaveClass("bg-slate-950");
  });
});

function renderQuotes() {
  return render(
    <MemoryRouter>
      <Quotes />
    </MemoryRouter>
  );
}
