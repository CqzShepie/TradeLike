import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Customers from "./Customers";
import { useCustomers } from "../hooks/useCustomers";
import { GlobalSearchProvider } from "../contexts/GlobalSearchContext";

vi.mock("../hooks/useCustomers", () => ({
  useCustomers: vi.fn(),
}));

describe("Customers", () => {
  it("keeps Add customer in the header and removes the oversized Live directory hero", () => {
    vi.mocked(useCustomers).mockReturnValue({
      customers: [],
      loading: false,
      error: null,
      reloadCustomers: vi.fn(),
      editingCustomer: null,
      addCustomer: vi.fn(),
      deleteCustomer: vi.fn(),
      updateCustomer: vi.fn(),
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
    });

    render(
      <MemoryRouter>
        <GlobalSearchProvider>
          <Customers />
        </GlobalSearchProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /add customer/i })).toBeInTheDocument();
    expect(screen.queryByText(/Live directory/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Add your first customer/i)).toBeInTheDocument();
  });
});
