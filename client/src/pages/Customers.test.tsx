import { fireEvent, render, screen } from "@testing-library/react";
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

    expect(screen.getAllByRole("button", { name: /add customer/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Live directory/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Add your first customer/i)).toBeInTheDocument();
  });

  it("opens the add customer form from the empty state CTA", () => {
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

    const addCustomerButtons = screen.getAllByRole("button", { name: /add customer/i });
    expect(addCustomerButtons).toHaveLength(2);

    fireEvent.click(addCustomerButtons[1]);

    expect(screen.getByRole("heading", { name: /add customer/i })).toBeInTheDocument();
  });

  it("renders View rather than Edit in the customer list", () => {
    vi.mocked(useCustomers).mockReturnValue({
      customers: [
        {
          id: 7,
          name: "Sarah Johnson",
          phone: "07981 125031",
          email: "sarah@example.com",
          address: "1 Trade Street",
          notes: null,
        },
      ],
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

    expect(screen.getAllByRole("link", { name: /view/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
  });
});
