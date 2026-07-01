import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, ClipboardList, PackagePlus, Truck } from "lucide-react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  ProductPage,
  ProductPageHeader,
  ProductPanel,
  ProductStat,
  SecondaryButton,
  TextInput,
} from "../../components/ui";
import { apiClient, isApiError } from "../../services/apiClient";
import AccessDenied from "../AccessDenied";
import UpgradeRequired from "../UpgradeRequired";

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
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMessage, setSavingMessage] = useState("");
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
    setError(null);

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
      setError(err instanceof Error ? err : new Error("Inventory could not be loaded."));
    } finally {
      setLoading(false);
    }
  }

  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingMessage("");
    await apiClient.post<Product>("/inventory/products", {
      sku: productForm.sku,
      name: productForm.name,
      description: productForm.description,
      unit: productForm.unit,
      reorderLevel: Number(productForm.reorderLevel || 0),
      openingStock: Number(productForm.openingStock || 0),
    });
    setProductForm({ sku: "", name: "", description: "", unit: "each", reorderLevel: "5", openingStock: "0" });
    setSavingMessage("Product created.");
    await loadInventory();
  }

  async function createSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingMessage("");
    await apiClient.post<Supplier>("/inventory/suppliers", {
      name: supplierForm.name,
      email: supplierForm.email,
      phone: supplierForm.phone,
      leadTimeDays: Number(supplierForm.leadTimeDays || 0),
    });
    setSupplierForm({ name: "", email: "", phone: "", leadTimeDays: "3" });
    setSavingMessage("Supplier created.");
    await loadInventory();
  }

  if (isApiError(error) && error.status === 403) {
    return <AccessDenied />;
  }

  if (isApiError(error) && error.status === 402) {
    return <UpgradeRequired />;
  }

  return (
    <ProductPage>
      <ProductPageHeader
        eyebrow="Stock control"
        title="Inventory"
        description="Track products, low-stock alerts, suppliers, purchase orders, and stock movement from one workspace."
        actions={
          <SecondaryButton type="button" onClick={() => void loadInventory()} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
            Refresh
          </SecondaryButton>
        }
      />

      {savingMessage && (
        <ProductPanel className="border-emerald-400/30 bg-emerald-500/10">
          <p className="text-sm font-semibold text-emerald-100">{savingMessage}</p>
        </ProductPanel>
      )}

      {loading && <LoadingState title="Loading inventory" description="Fetching products, suppliers, stock movements and purchase orders." />}

      {!loading && error && (
        <ErrorState
          title="Unable to load inventory"
          description={error.message}
          action={
            <SecondaryButton type="button" onClick={() => void loadInventory()} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
              Try again
            </SecondaryButton>
          }
        />
      )}

      {!loading && !error && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ProductStat label="Products" value={products.length} helper="active catalogue" icon={<Boxes className="h-5 w-5" />} />
            <ProductStat label="Low stock" value={lowStock.length} helper="below reorder level" icon={<AlertTriangle className="h-5 w-5" />} />
            <ProductStat label="Suppliers" value={suppliers.length} helper="available vendors" icon={<Truck className="h-5 w-5" />} />
            <ProductStat label="Open purchase orders" value={purchaseOrders.length} helper="tracked POs" icon={<ClipboardList className="h-5 w-5" />} />
            <ProductStat label="Stock value" value={money.format(0)} helper="ready for valuation data" icon={<Boxes className="h-5 w-5" />} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-6">
              <ProductPanel>
                <h2 className="text-lg font-bold text-white">Products</h2>
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                  {products.length === 0 ? (
                    <EmptyState title="Add your first product" description="Products will appear here once stock is created." />
                  ) : (
                    products.map(product => (
                      <div key={product.id} className="grid gap-3 border-b border-white/10 p-4 last:border-b-0 md:grid-cols-[1fr_120px_140px]">
                        <div>
                          <p className="font-bold text-white">{product.name}</p>
                          <p className="mt-1 text-sm text-slate-400">{product.sku} / {product.unit}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-200">{product.onHand} on hand</p>
                        <p className={Number(product.onHand) <= Number(product.reorderLevel) ? "text-sm font-bold text-red-300" : "text-sm font-semibold text-emerald-300"}>
                          Reorder {product.reorderLevel}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ProductPanel>

              <ProductPanel>
                <h2 className="text-lg font-bold text-white">Recent stock movements</h2>
                <div className="mt-4 divide-y divide-white/10">
                  {movements.length === 0 ? (
                    <EmptyState title="No movements recorded" description="Stock adjustments and transfers will appear here." />
                  ) : (
                    movements.slice(0, 8).map(movement => (
                      <div key={movement.id} className="grid gap-2 py-3 md:grid-cols-[1fr_120px_160px]">
                        <p className="font-semibold text-white">{movement.productName}</p>
                        <p className={movement.quantityChange >= 0 ? "font-bold text-emerald-300" : "font-bold text-red-300"}>
                          {movement.quantityChange > 0 ? "+" : ""}{movement.quantityChange}
                        </p>
                        <p className="text-sm text-slate-400">{movement.reason}</p>
                      </div>
                    ))
                  )}
                </div>
              </ProductPanel>

              <ProductPanel>
                <h2 className="text-lg font-bold text-white">Purchase orders</h2>
                <div className="mt-4 divide-y divide-white/10">
                  {purchaseOrders.length === 0 ? (
                    <EmptyState title="No purchase orders yet" description="Supplier purchase orders will appear here once created." />
                  ) : (
                    purchaseOrders.map(order => (
                      <div key={order.id} className="grid gap-2 py-3 md:grid-cols-[1fr_120px_140px]">
                        <p className="font-semibold text-white">PO-{order.id} / {order.supplierName}</p>
                        <p className="text-sm font-bold text-slate-300">{order.status}</p>
                        <p className="text-sm font-bold text-white">{money.format(Number(order.total))}</p>
                      </div>
                    ))
                  )}
                </div>
              </ProductPanel>
            </div>

            <aside className="space-y-6">
              <InventoryForm title="Add product" icon={<PackagePlus className="h-5 w-5" />} onSubmit={createProduct}>
                <Field label="SKU" value={productForm.sku} onChange={value => setProductForm({ ...productForm, sku: value })} />
                <Field label="Name" value={productForm.name} onChange={value => setProductForm({ ...productForm, name: value })} />
                <Field label="Unit" value={productForm.unit} onChange={value => setProductForm({ ...productForm, unit: value })} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Reorder" value={productForm.reorderLevel} onChange={value => setProductForm({ ...productForm, reorderLevel: value })} />
                  <Field label="Opening stock" value={productForm.openingStock} onChange={value => setProductForm({ ...productForm, openingStock: value })} />
                </div>
                <PrimaryButton type="submit" fullWidth>Create product</PrimaryButton>
              </InventoryForm>

              <InventoryForm title="Add supplier" icon={<Truck className="h-5 w-5" />} onSubmit={createSupplier}>
                <Field label="Name" value={supplierForm.name} onChange={value => setSupplierForm({ ...supplierForm, name: value })} />
                <Field label="Email" value={supplierForm.email} onChange={value => setSupplierForm({ ...supplierForm, email: value })} />
                <Field label="Phone" value={supplierForm.phone} onChange={value => setSupplierForm({ ...supplierForm, phone: value })} />
                <Field label="Lead time days" value={supplierForm.leadTimeDays} onChange={value => setSupplierForm({ ...supplierForm, leadTimeDays: value })} />
                <PrimaryButton type="submit" fullWidth>Create supplier</PrimaryButton>
              </InventoryForm>
            </aside>
          </div>
        </>
      )}
    </ProductPage>
  );
}

function InventoryForm({
  title,
  icon,
  onSubmit,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <ProductPanel>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-center gap-2 text-blue-300">
          {icon}
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>
        {children}
      </form>
    </ProductPanel>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-300">{label}</span>
      <TextInput
        value={value}
        onChange={event => onChange(event.target.value)}
        className="border-white/10 bg-slate-950/60 text-white placeholder:text-slate-500"
      />
    </label>
  );
}
