import { render, screen } from "@testing-library/react";
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
});

function renderQuotes() {
  return render(
    <MemoryRouter>
      <Quotes />
    </MemoryRouter>
  );
}
