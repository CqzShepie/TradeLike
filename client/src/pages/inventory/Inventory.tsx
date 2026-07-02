import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { AlertTriangle, Boxes, History, Truck } from "lucide-react";

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
import { friendlyErrorMessage } from "../../utils/errorMessages";
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
  branchId?: number | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  leadTimeDays: number;
  createdAt?: string;
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

type Modal = "product" | "supplier" | "movement" | "product-detail" | "supplier-detail" | null;

type ProductForm = {
  sku: string;
  name: string;
  description: string;
  unit: string;
  reorderLevel: string;
  openingStock: string;
  isActive: boolean;
};

type SupplierForm = {
  name: string;
  email: string;
  phone: string;
  leadTimeDays: string;
};

type MovementForm = {
  productId: string;
  quantityChange: string;
  reason: string;
  reference: string;
};

const blankProductForm: ProductForm = {
  sku: "",
  name: "",
  description: "",
  unit: "each",
  reorderLevel: "5",
  openingStock: "0",
  isActive: true,
};

const blankSupplierForm: SupplierForm = {
  name: "",
  email: "",
  phone: "",
  leadTimeDays: "3",
};

const blankMovementForm: MovementForm = {
  productId: "",
  quantityChange: "",
  reason: "Adjustment",
  reference: "",
};

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(blankProductForm);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(blankSupplierForm);
  const [movementForm, setMovementForm] = useState<MovementForm>(blankMovementForm);

  const lowStock = useMemo(
    () => products.filter(product => product.isActive && Number(product.onHand) <= Number(product.reorderLevel)),
    [products]
  );
  const lastMovementByProduct = useMemo(() => {
    const map = new Map<number, StockMovement>();
    movements.forEach(movement => {
      if (!map.has(movement.productId)) map.set(movement.productId, movement);
    });
    return map;
  }, [movements]);

  useEffect(() => {
    void loadInventory();
  }, []);

  async function loadInventory() {
    setLoading(true);
    setError(null);

    try {
      const [productRows, supplierRows, movementRows] = await Promise.all([
        apiClient.get<Product[]>("/inventory/products"),
        apiClient.get<Supplier[]>("/inventory/suppliers"),
        apiClient.get<StockMovement[]>("/inventory/stock-movements"),
      ]);

      setProducts(productRows);
      setSuppliers(supplierRows);
      setMovements(movementRows);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Inventory could not be loaded."));
    } finally {
      setLoading(false);
    }
  }

  function openAddProduct() {
    setSelectedProduct(null);
    setProductForm(blankProductForm);
    setModal("product");
  }

  function openEditProduct(product: Product) {
    setSelectedProduct(product);
    setProductForm({
      sku: product.sku,
      name: product.name,
      description: product.description ?? "",
      unit: product.unit,
      reorderLevel: String(product.reorderLevel),
      openingStock: String(product.onHand),
      isActive: product.isActive,
    });
    setModal("product");
  }

  function openProductDetail(product: Product) {
    setSelectedProduct(product);
    setModal("product-detail");
  }

  function openAddSupplier() {
    setSelectedSupplier(null);
    setSupplierForm(blankSupplierForm);
    setModal("supplier");
  }

  function openEditSupplier(supplier: Supplier) {
    setSelectedSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      leadTimeDays: String(supplier.leadTimeDays),
    });
    setModal("supplier");
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        sku: productForm.sku,
        name: productForm.name,
        description: productForm.description,
        unit: productForm.unit,
        reorderLevel: Number(productForm.reorderLevel || 0),
        openingStock: Number(productForm.openingStock || 0),
        isActive: productForm.isActive,
      };

      if (selectedProduct) {
        await apiClient.put<Product>(`/inventory/products/${selectedProduct.id}`, payload);
        setMessage("Product updated.");
      } else {
        await apiClient.post<Product>("/inventory/products", payload);
        setMessage("Product created.");
      }

      setModal(null);
      await loadInventory();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unable to save product."));
    } finally {
      setSaving(false);
    }
  }

  async function saveSupplier(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        name: supplierForm.name,
        email: supplierForm.email,
        phone: supplierForm.phone,
        leadTimeDays: Number(supplierForm.leadTimeDays || 0),
      };

      if (selectedSupplier) {
        await apiClient.put<Supplier>(`/inventory/suppliers/${selectedSupplier.id}`, payload);
        setMessage("Supplier updated.");
      } else {
        await apiClient.post<Supplier>("/inventory/suppliers", payload);
        setMessage("Supplier created.");
      }

      setModal(null);
      await loadInventory();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unable to save supplier."));
    } finally {
      setSaving(false);
    }
  }

  async function createMovement(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const currentProduct = products.find(product => product.id === Number(movementForm.productId));
    const nextOnHand = currentProduct ? Number(currentProduct.onHand) + Number(movementForm.quantityChange || 0) : null;

    try {
      await apiClient.post<StockMovement>("/inventory/stock-movements", {
        productId: Number(movementForm.productId),
        quantityChange: Number(movementForm.quantityChange || 0),
        reason: movementForm.reason,
        reference: movementForm.reference,
      });
      setMovementForm(blankMovementForm);
      setModal(null);
      if (currentProduct && nextOnHand !== null && nextOnHand <= 0) {
        setMessage("Out of stock. This product has no stock remaining.");
      } else if (currentProduct && nextOnHand !== null && nextOnHand <= Number(currentProduct.reorderLevel)) {
        setMessage("Low stock. This product is at or below its low-stock threshold.");
      } else {
        setMessage("Stock movement recorded.");
      }
      await loadInventory();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unable to record stock movement."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(`Delete ${product.name}? This removes it from the inventory list.`);
    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    try {
      await apiClient.delete(`/inventory/products/${product.id}`);
      setMessage("Product deleted.");
      setModal(null);
      await loadInventory();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unable to delete product."));
    } finally {
      setSaving(false);
    }
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
        description="Track products, suppliers, stock movement and low-stock risk from one clean workspace."
        actions={
          <>
            <SecondaryButton type="button" onClick={() => void loadInventory()} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
              Refresh
            </SecondaryButton>
            <PrimaryButton type="button" onClick={openAddProduct}>Add product</PrimaryButton>
          </>
        }
      />

      {message && (
        <ProductPanel className="border-emerald-400/30 bg-emerald-500/10">
          <p className="text-sm font-semibold text-emerald-100">{message}</p>
        </ProductPanel>
      )}

      {loading && <LoadingState title="Loading inventory" description="Fetching products, suppliers and stock movements." />}

      {!loading && error && (
        <ErrorState
          title="Unable to load inventory"
          description={friendlyErrorMessage(error, "Inventory could not be loaded. Please try again.")}
          action={
            <SecondaryButton type="button" onClick={() => void loadInventory()} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
              Try again
            </SecondaryButton>
          }
        />
      )}

      {!loading && !error && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ProductStat label="Products" value={products.length} helper="catalogue items" icon={<Boxes className="h-5 w-5" />} />
            <ProductStat label="Low stock" value={lowStock.length} helper="at or below threshold" icon={<AlertTriangle className="h-5 w-5" />} />
            <ProductStat label="Suppliers" value={suppliers.length} helper="vendor records" icon={<Truck className="h-5 w-5" />} />
            <ProductStat label="Movements" value={movements.length} helper="recent stock history" icon={<History className="h-5 w-5" />} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <ProductPanel>
                <SectionHeading title="Products" action={<SecondaryButton type="button" onClick={openAddProduct} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">Add product</SecondaryButton>} />
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                  {products.length === 0 ? (
                    <EmptyState title="No products yet" description="Create your first stock item to start tracking quantity and reorder status." action={<PrimaryButton type="button" onClick={openAddProduct}>Add product</PrimaryButton>} />
                  ) : (
                    products.map(product => {
                      const lastMovement = lastMovementByProduct.get(product.id);
                      return (
                        <button key={product.id} type="button" onClick={() => openProductDetail(product)} className="grid w-full gap-3 border-b border-white/10 p-4 text-left transition hover:bg-white/[0.03] last:border-b-0 md:grid-cols-[1fr_120px_140px_160px]">
                          <div>
                            <p className="font-bold text-white">{product.name}</p>
                            <p className="mt-1 text-sm text-slate-400">{product.sku} / {product.unit}</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-200">{product.onHand} on hand</p>
                          <p className={Number(product.onHand) <= Number(product.reorderLevel) ? "text-sm font-bold text-red-300" : "text-sm font-semibold text-emerald-300"}>
                            {getStockStatus(product)}
                          </p>
                          <p className="text-sm text-slate-400">{lastMovement ? formatDate(lastMovement.createdAt) : "No movement"}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </ProductPanel>

              <ProductPanel>
                <SectionHeading title="Stock movement history" action={<SecondaryButton type="button" onClick={() => setModal("movement")} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">Adjust stock</SecondaryButton>} />
                <div className="mt-4 divide-y divide-white/10">
                  {movements.length === 0 ? (
                    <EmptyState title="No movements recorded" description="Manual adjustments and corrections appear here." />
                  ) : (
                    movements.slice(0, 12).map(movement => (
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
            </div>

            <aside className="space-y-6">
              <ProductPanel>
                <SectionHeading title="Low stock alerts" />
                <div className="mt-4 space-y-3">
                  {lowStock.length === 0 ? (
                    <p className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">No low-stock alerts.</p>
                  ) : (
                    lowStock.map(product => (
                      <button key={product.id} type="button" onClick={() => openProductDetail(product)} className="w-full rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-left">
                        <p className="font-bold text-red-100">{product.name}</p>
                        <p className="mt-1 text-sm text-red-100/80">{product.onHand} on hand, reorder at {product.reorderLevel}</p>
                      </button>
                    ))
                  )}
                </div>
              </ProductPanel>

              <ProductPanel>
                <SectionHeading title="Suppliers" action={<SecondaryButton type="button" onClick={openAddSupplier} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">Add supplier</SecondaryButton>} />
                <div className="mt-4 divide-y divide-white/10">
                  {suppliers.length === 0 ? (
                    <EmptyState title="No suppliers yet" description="Add supplier contact details for your stock records." action={<PrimaryButton type="button" onClick={openAddSupplier}>Add supplier</PrimaryButton>} />
                  ) : (
                    suppliers.map(supplier => (
                      <button key={supplier.id} type="button" onClick={() => { setSelectedSupplier(supplier); setModal("supplier-detail"); }} className="block w-full py-3 text-left">
                        <p className="font-semibold text-white">{supplier.name}</p>
                        <p className="text-sm text-slate-400">{supplier.email || supplier.phone || "No contact details"}</p>
                      </button>
                    ))
                  )}
                </div>
              </ProductPanel>
            </aside>
          </div>
        </>
      )}

      {modal === "product" && (
        <ModalShell title={selectedProduct ? "Edit product" : "Add product"} onClose={() => setModal(null)}>
          <form onSubmit={saveProduct} className="space-y-4">
            <Field label="SKU"><TextInput value={productForm.sku} onChange={event => setProductForm({ ...productForm, sku: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field>
            <Field label="Name"><TextInput value={productForm.name} onChange={event => setProductForm({ ...productForm, name: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field>
            <Field label="Description"><TextInput value={productForm.description} onChange={event => setProductForm({ ...productForm, description: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Unit"><TextInput value={productForm.unit} onChange={event => setProductForm({ ...productForm, unit: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field>
              <Field label="Reorder level"><TextInput type="number" value={productForm.reorderLevel} onChange={event => setProductForm({ ...productForm, reorderLevel: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field>
              {!selectedProduct && <Field label="Opening stock"><TextInput type="number" value={productForm.openingStock} onChange={event => setProductForm({ ...productForm, openingStock: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field>}
            </div>
            {selectedProduct && <Toggle checked={productForm.isActive} onChange={checked => setProductForm({ ...productForm, isActive: checked })}>Active product</Toggle>}
            <PrimaryButton type="submit" disabled={saving} fullWidth>{saving ? "Saving..." : selectedProduct ? "Save product" : "Create product"}</PrimaryButton>
          </form>
        </ModalShell>
      )}

      {modal === "supplier" && (
        <ModalShell title={selectedSupplier ? "Edit supplier" : "Add supplier"} onClose={() => setModal(null)}>
          <form onSubmit={saveSupplier} className="space-y-4">
            <Field label="Name"><TextInput value={supplierForm.name} onChange={event => setSupplierForm({ ...supplierForm, name: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field>
            <Field label="Email"><TextInput type="email" value={supplierForm.email} onChange={event => setSupplierForm({ ...supplierForm, email: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field>
            <Field label="Phone"><TextInput value={supplierForm.phone} onChange={event => setSupplierForm({ ...supplierForm, phone: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field>
            <Field label="Lead time days"><TextInput type="number" value={supplierForm.leadTimeDays} onChange={event => setSupplierForm({ ...supplierForm, leadTimeDays: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field>
            <PrimaryButton type="submit" disabled={saving} fullWidth>{saving ? "Saving..." : selectedSupplier ? "Save supplier" : "Create supplier"}</PrimaryButton>
          </form>
        </ModalShell>
      )}

      {modal === "movement" && (
        <ModalShell title="Adjust stock" onClose={() => setModal(null)}>
          <form onSubmit={createMovement} className="space-y-4">
            <Field label="Product"><Select value={movementForm.productId} onChange={value => setMovementForm({ ...movementForm, productId: value })}><option value="">Choose product</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</Select></Field>
            <Field label="Quantity change"><TextInput type="number" value={movementForm.quantityChange} onChange={event => setMovementForm({ ...movementForm, quantityChange: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field>
            <Field label="Reason"><TextInput value={movementForm.reason} onChange={event => setMovementForm({ ...movementForm, reason: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field>
            <Field label="Reference"><TextInput value={movementForm.reference} onChange={event => setMovementForm({ ...movementForm, reference: event.target.value })} className="border-white/10 bg-slate-950/60 text-white" /></Field>
            <PrimaryButton type="submit" disabled={saving || !movementForm.productId || !movementForm.quantityChange} fullWidth>Record movement</PrimaryButton>
          </form>
        </ModalShell>
      )}

      {modal === "product-detail" && selectedProduct && (
        <ModalShell title={selectedProduct.name} onClose={() => setModal(null)}>
          <DetailGrid rows={[
            ["SKU", selectedProduct.sku],
            ["Quantity on hand", String(selectedProduct.onHand)],
            ["Low stock threshold", String(selectedProduct.reorderLevel)],
            ["Stock status", getStockStatus(selectedProduct)],
            ["Last movement", lastMovementByProduct.get(selectedProduct.id) ? formatDate(lastMovementByProduct.get(selectedProduct.id)!.createdAt) : "No movement"],
          ]} />
          {selectedProduct.onHand <= 0 && <StockWarning title="Out of stock" description="This product has no stock remaining." />}
          {selectedProduct.onHand > 0 && selectedProduct.onHand <= selectedProduct.reorderLevel && <StockWarning title="Low stock" description="This product is at or below its low-stock threshold." />}
          <div className="mt-5 flex flex-wrap gap-2">
            <SecondaryButton type="button" onClick={() => openEditProduct(selectedProduct)} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">Edit product</SecondaryButton>
            <SecondaryButton type="button" onClick={() => { setMovementForm({ ...blankMovementForm, productId: String(selectedProduct.id) }); setModal("movement"); }} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">Adjust stock</SecondaryButton>
          </div>
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4">
            <p className="text-sm font-bold text-red-100">Danger zone</p>
            <p className="mt-1 text-sm text-red-100/80">Delete this product from the active inventory list.</p>
            <button type="button" disabled={saving} onClick={() => void deleteProduct(selectedProduct)} className="mt-3 rounded-lg border border-red-300/40 px-4 py-2 text-sm font-bold text-red-100 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60">
              Delete product
            </button>
          </div>
        </ModalShell>
      )}

      {modal === "supplier-detail" && selectedSupplier && (
        <ModalShell title={selectedSupplier.name} onClose={() => setModal(null)}>
          <DetailGrid rows={[
            ["Email", selectedSupplier.email || "No email"],
            ["Phone", selectedSupplier.phone || "No phone"],
            ["Lead time", `${selectedSupplier.leadTimeDays} days`],
          ]} />
          <div className="mt-5">
            <SecondaryButton type="button" onClick={() => openEditSupplier(selectedSupplier)} className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">Edit supplier</SecondaryButton>
          </div>
        </ModalShell>
      )}

    </ProductPage>
  );
}

function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {action}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-950/60">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded px-2 text-xl leading-none text-slate-400 hover:bg-white/10" aria-label="Close">
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40">
      {children}
    </select>
  );
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-slate-950" />
      {children}
    </label>
  );
}

function DetailGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 text-sm font-semibold text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleDateString("en-GB");
}

function getStockStatus(product: Product) {
  if (Number(product.onHand) <= 0) return "Out of stock";
  if (Number(product.onHand) <= Number(product.reorderLevel)) return "Low stock";
  return "In stock";
}

function StockWarning({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4">
      <p className="text-sm font-bold text-red-100">{title}</p>
      <p className="mt-1 text-sm text-red-100/80">{description}</p>
    </div>
  );
}
