import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, ClipboardList, PackagePlus, Truck } from "lucide-react";

import Sidebar from "../../components/layout/Sidebar";
import { apiClient } from "../../services/apiClient";

type Product = {
  id: number;
  branchId: number | null;
  sku: string;
  name: string;
  description?: string | null;
  unit: string;
  reorderLevel: number;
  onHand: number;
  isActive: boolean;
  createdAt: string;
};

type Supplier = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  leadTimeDays: number;
};

type StockMovement = {
  id: number;
  productId: number;
  productName: string;
  quantityChange: number;
  reason: string;
  reference?: string | null;
  createdAt: string;
};

type PurchaseOrder = {
  id: number;
  supplierName: string;
  status: string;
  expectedAt?: string | null;
  createdAt: string;
  total: number;
};

type ProductForm = {
  sku: string;
  name: string;
  description: string;
  unit: string;
  reorderLevel: string;
  openingStock: string;
};

type SupplierForm = {
  name: string;
  email: string;
  phone: string;
  leadTimeDays: string;
};

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [productForm, setProductForm] = useState<ProductForm>({
    sku: "",
    name: "",
    description: "",
    unit: "each",
    reorderLevel: "5",
    openingStock: "0",
  });
  const [supplierForm, setSupplierForm] = useState<SupplierForm>({
    name: "",
    email: "",
    phone: "",
    leadTimeDays: "3",
  });

  const lowStock = useMemo(
    () => products.filter(product => product.isActive && Number(product.onHand) <= Number(product.reorderLevel)),
    [products]
  );

  useEffect(() => {
    void loadInventory();
  }, []);

  async function loadInventory() {
    setLoading(true);
    setError("");
    try {
      const [productRows, supplierRows, movementRows, purchaseOrderRows] = await Promise.all([
        apiClient.get<Product[]>("/inventory/products"),
        apiClient.get<Supplier[]>("/inventory/suppliers"),
        apiClient.get<StockMovement[]>("/inventory/stock-movements"),
        apiClient.get<PurchaseOrder[]>("/inventory/purchase-orders"),
      ]);
      setProducts(productRows);
      setSuppliers(supplierRows);
      setMovements(movementRows);
      setPurchaseOrders(purchaseOrderRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inventory could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiClient.post<Product>("/inventory/products", {
      sku: productForm.sku,
      name: productForm.name,
      description: productForm.description,
      unit: productForm.unit,
      reorderLevel: Number(productForm.reorderLevel || 0),
      openingStock: Number(productForm.openingStock || 0),
    });
    setProductForm({ sku: "", name: "", description: "", unit: "each", reorderLevel: "5", openingStock: "0" });
    await loadInventory();
  }

  async function createSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiClient.post<Supplier>("/inventory/suppliers", {
      name: supplierForm.name,
      email: supplierForm.email,
      phone: supplierForm.phone,
      leadTimeDays: Number(supplierForm.leadTimeDays || 0),
    });
    setSupplierForm({ name: "", email: "", phone: "", leadTimeDays: "3" });
    await loadInventory();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="md:pl-64">
        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Inventory</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-950">Stock, suppliers, and purchase orders</h1>
            </div>
            <button
              type="button"
              onClick={() => void loadInventory()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
            >
              Refresh
            </button>
          </div>

          {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Stat icon={Boxes} label="Products" value={String(products.length)} />
            <Stat icon={AlertTriangle} label="Low stock" value={String(lowStock.length)} />
            <Stat icon={Truck} label="Suppliers" value={String(suppliers.length)} />
            <Stat icon={ClipboardList} label="POs" value={String(purchaseOrders.length)} />
          </div>

          {loading ? (
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading inventory...</div>
          ) : (
            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-6">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-950">Products</h2>
                  <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                    {products.map(product => (
                      <div key={product.id} className="grid gap-3 border-b border-slate-200 p-4 last:border-b-0 md:grid-cols-[1fr_100px_120px]">
                        <div>
                          <p className="font-bold text-slate-950">{product.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{product.sku} / {product.unit}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{product.onHand} on hand</p>
                        <p className={Number(product.onHand) <= Number(product.reorderLevel) ? "text-sm font-bold text-red-700" : "text-sm font-semibold text-emerald-700"}>
                          Reorder {product.reorderLevel}
                        </p>
                      </div>
                    ))}
                    {products.length === 0 && <p className="p-6 text-sm text-slate-500">No products yet.</p>}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-950">Recent stock movements</h2>
                  <div className="mt-4 divide-y divide-slate-200">
                    {movements.slice(0, 8).map(movement => (
                      <div key={movement.id} className="grid gap-2 py-3 md:grid-cols-[1fr_120px_160px]">
                        <p className="font-semibold text-slate-900">{movement.productName}</p>
                        <p className={movement.quantityChange >= 0 ? "font-bold text-emerald-700" : "font-bold text-red-700"}>
                          {movement.quantityChange > 0 ? "+" : ""}{movement.quantityChange}
                        </p>
                        <p className="text-sm text-slate-500">{movement.reason}</p>
                      </div>
                    ))}
                    {movements.length === 0 && <p className="py-4 text-sm text-slate-500">No movements recorded.</p>}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-950">Purchase orders</h2>
                  <div className="mt-4 divide-y divide-slate-200">
                    {purchaseOrders.map(order => (
                      <div key={order.id} className="grid gap-2 py-3 md:grid-cols-[1fr_120px_140px]">
                        <p className="font-semibold text-slate-900">PO-{order.id} / {order.supplierName}</p>
                        <p className="text-sm font-bold text-slate-700">{order.status}</p>
                        <p className="text-sm font-bold text-slate-900">{money.format(Number(order.total))}</p>
                      </div>
                    ))}
                    {purchaseOrders.length === 0 && <p className="py-4 text-sm text-slate-500">No purchase orders yet.</p>}
                  </div>
                </section>
              </div>

              <aside className="space-y-6">
                <form onSubmit={createProduct} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <PackagePlus className="h-5 w-5 text-blue-700" />
                    <h2 className="text-lg font-bold text-slate-950">Add product</h2>
                  </div>
                  <Field label="SKU" value={productForm.sku} onChange={value => setProductForm({ ...productForm, sku: value })} />
                  <Field label="Name" value={productForm.name} onChange={value => setProductForm({ ...productForm, name: value })} />
                  <Field label="Unit" value={productForm.unit} onChange={value => setProductForm({ ...productForm, unit: value })} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Reorder" value={productForm.reorderLevel} onChange={value => setProductForm({ ...productForm, reorderLevel: value })} />
                    <Field label="Opening stock" value={productForm.openingStock} onChange={value => setProductForm({ ...productForm, openingStock: value })} />
                  </div>
                  <button type="submit" className="mt-4 w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600">Create product</button>
                </form>

                <form onSubmit={createSupplier} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-700" />
                    <h2 className="text-lg font-bold text-slate-950">Add supplier</h2>
                  </div>
                  <Field label="Name" value={supplierForm.name} onChange={value => setSupplierForm({ ...supplierForm, name: value })} />
                  <Field label="Email" value={supplierForm.email} onChange={value => setSupplierForm({ ...supplierForm, email: value })} />
                  <Field label="Phone" value={supplierForm.phone} onChange={value => setSupplierForm({ ...supplierForm, phone: value })} />
                  <Field label="Lead time days" value={supplierForm.leadTimeDays} onChange={value => setSupplierForm({ ...supplierForm, leadTimeDays: value })} />
                  <button type="submit" className="mt-4 w-full rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">Create supplier</button>
                </form>
              </aside>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Boxes; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <Icon className="h-5 w-5 text-blue-700" />
      <p className="mt-3 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
