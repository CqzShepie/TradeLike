import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Inventory from "./Inventory";
import { apiClient, ApiError } from "../../services/apiClient";

vi.mock("../../components/layout/Sidebar", () => ({
  default: () => <aside>Sidebar</aside>,
}));

vi.mock("../../services/apiClient", async () => {
  const actual = await vi.importActual<typeof import("../../services/apiClient")>("../../services/apiClient");

  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe("Inventory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockImplementation(endpoint => {
      if (endpoint === "/inventory/products") return Promise.resolve([]);
      if (endpoint === "/inventory/suppliers") return Promise.resolve([]);
      if (endpoint === "/inventory/stock-movements") return Promise.resolve([]);
      if (endpoint === "/inventory/purchase-orders") return Promise.resolve([]);
      return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
    });
  });

  it("renders clean empty states", async () => {
    renderInventory();

    expect(await screen.findByText("No products yet")).toBeInTheDocument();
    expect(screen.getByText("No suppliers yet")).toBeInTheDocument();
    expect(screen.getByText("No purchase orders yet")).toBeInTheDocument();
  });

  it("hides raw stack traces in inventory errors", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      new ApiError(500, "Invalid object name 'PurchaseOrders'. at Microsoft.Data.SqlClient.SqlCommand")
    );

    renderInventory();

    expect(await screen.findByText("Unable to load inventory")).toBeInTheDocument();
    expect(screen.getByText("Inventory could not be loaded. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/PurchaseOrders|SqlCommand/i)).not.toBeInTheDocument();
  });
});

function renderInventory() {
  return render(
    <MemoryRouter>
      <Inventory />
    </MemoryRouter>
  );
}
