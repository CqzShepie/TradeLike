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
      return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
    });
  });

  it("renders clean empty states", async () => {
    renderInventory();

    expect(await screen.findByText("No products yet")).toBeInTheDocument();
    expect(screen.getByText("No suppliers yet")).toBeInTheDocument();
    expect(screen.getByText("No movements recorded")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create purchase order/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/purchase order prefix/i)).not.toBeInTheDocument();
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

  it("deletes a product after confirmation and refreshes the list", async () => {
    let products = [{
      id: 3,
      branchId: null,
      sku: "TAPE-1",
      name: "PTFE tape",
      description: "",
      unit: "each",
      reorderLevel: 2,
      onHand: 12,
      isActive: true,
      createdAt: new Date().toISOString(),
    }];

    vi.mocked(apiClient.get).mockImplementation(endpoint => {
      if (endpoint === "/inventory/products") return Promise.resolve(products);
      if (endpoint === "/inventory/suppliers") return Promise.resolve([]);
      if (endpoint === "/inventory/stock-movements") return Promise.resolve([]);
      return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
    });
    vi.mocked(apiClient.delete).mockImplementation(() => {
      products = [];
      return Promise.resolve(undefined);
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderInventory();

    fireEvent.click(await screen.findByRole("button", { name: /ptfe tape/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete product/i }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith("/inventory/products/3"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(await screen.findByText("Product deleted.")).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("shows low-stock and out-of-stock alerts", async () => {
    vi.mocked(apiClient.get).mockImplementation(endpoint => {
      if (endpoint === "/inventory/products") {
        return Promise.resolve([
          {
            id: 4,
            branchId: null,
            sku: "FILTER-1",
            name: "Filter",
            description: "",
            unit: "each",
            reorderLevel: 5,
            onHand: 2,
            isActive: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: 5,
            branchId: null,
            sku: "SEAL-1",
            name: "Seal",
            description: "",
            unit: "each",
            reorderLevel: 5,
            onHand: 0,
            isActive: true,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      if (endpoint === "/inventory/suppliers") return Promise.resolve([]);
      if (endpoint === "/inventory/stock-movements") return Promise.resolve([]);
      return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
    });

    renderInventory();

    expect(await screen.findAllByText("Low stock")).not.toHaveLength(0);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /filter/i })[0]);
    expect(screen.getByText("This product is at or below its low-stock threshold.")).toBeInTheDocument();
  });

  it("warns when a stock adjustment leaves a product below threshold", async () => {
    vi.mocked(apiClient.get).mockImplementation(endpoint => {
      if (endpoint === "/inventory/products") {
        return Promise.resolve([{
          id: 6,
          branchId: null,
          sku: "CLIP-1",
          name: "Pipe clip",
          description: "",
          unit: "each",
          reorderLevel: 5,
          onHand: 6,
          isActive: true,
          createdAt: new Date().toISOString(),
        }]);
      }
      if (endpoint === "/inventory/suppliers") return Promise.resolve([]);
      if (endpoint === "/inventory/stock-movements") return Promise.resolve([]);
      return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
    });
    vi.mocked(apiClient.post).mockResolvedValue({});

    renderInventory();

    fireEvent.click(await screen.findByRole("button", { name: /adjust stock/i }));
    fireEvent.change(screen.getByLabelText("Product"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("Quantity change"), { target: { value: "-2" } });
    fireEvent.click(screen.getByRole("button", { name: /record movement/i }));

    expect(await screen.findByText("Low stock. This product is at or below its low-stock threshold.")).toBeInTheDocument();
  });
});

function renderInventory() {
  return render(
    <MemoryRouter>
      <Inventory />
    </MemoryRouter>
  );
}
