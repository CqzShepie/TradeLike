import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("creates a product from the empty inventory state", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      id: 1,
      branchId: null,
      sku: "PIPE-15",
      name: "15mm pipe",
      unit: "m",
      reorderLevel: 5,
      onHand: 10,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    renderInventory();

    fireEvent.click(await screen.findByRole("button", { name: /add product/i }));
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "PIPE-15" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "15mm pipe" } });
    fireEvent.change(screen.getByLabelText("Opening stock"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /create product/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/inventory/products", expect.objectContaining({
        sku: "PIPE-15",
        name: "15mm pipe",
        openingStock: 10,
      }));
    });
  });

  it("edits an existing product", async () => {
    vi.mocked(apiClient.get).mockImplementation(endpoint => {
      if (endpoint === "/inventory/products") {
        return Promise.resolve([{
          id: 2,
          branchId: null,
          sku: "VALVE-1",
          name: "Valve",
          description: "",
          unit: "each",
          reorderLevel: 3,
          onHand: 8,
          isActive: true,
          createdAt: new Date().toISOString(),
        }]);
      }
      if (endpoint === "/inventory/suppliers") return Promise.resolve([]);
      if (endpoint === "/inventory/stock-movements") return Promise.resolve([]);
      if (endpoint === "/inventory/purchase-orders") return Promise.resolve([]);
      return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
    });
    vi.mocked(apiClient.put).mockResolvedValue({});

    renderInventory();

    fireEvent.click(await screen.findByRole("button", { name: /valve/i }));
    fireEvent.click(screen.getByRole("button", { name: /edit product/i }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Isolation valve" } });
    fireEvent.click(screen.getByRole("button", { name: /save product/i }));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith("/inventory/products/2", expect.objectContaining({
        sku: "VALVE-1",
        name: "Isolation valve",
      }));
    });
  });

  it("renders purchase order details and receive action", async () => {
    vi.mocked(apiClient.get).mockImplementation(endpoint => {
      if (endpoint === "/inventory/products") return Promise.resolve([]);
      if (endpoint === "/inventory/suppliers") return Promise.resolve([]);
      if (endpoint === "/inventory/stock-movements") return Promise.resolve([]);
      if (endpoint === "/inventory/purchase-orders") {
        return Promise.resolve([{
          id: 7,
          supplierId: 1,
          supplierName: "Acme Supplies",
          status: "Open",
          expectedAt: null,
          createdAt: new Date().toISOString(),
          total: 125,
        }]);
      }
      return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
    });

    renderInventory();

    fireEvent.click(await screen.findByRole("button", { name: /PO-0007/i }));

    expect(screen.getByRole("heading", { name: "PO-0007" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /receive stock/i })).toBeInTheDocument();
  });
});

function renderInventory() {
  return render(
    <MemoryRouter>
      <Inventory />
    </MemoryRouter>
  );
}
