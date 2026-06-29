import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Customer } from "../../types/customer";
import type { NewQuote, NewQuoteLineItem } from "../../types/newQuote";
import type { Quote, QuoteLineItemType, QuoteStatus } from "../../types/quote";
import { customersService } from "../../services/customersService";
import { formatMoney } from "../../utils/formatMoney";

interface NewQuoteFormProps {
  onAddQuote: (quote: NewQuote) => Promise<unknown>;
  onUpdateQuote: (quote: Quote) => Promise<unknown>;
  editingQuote: Quote | null;
  onCancelEdit: () => void;
}

const statuses: QuoteStatus[] = ["Draft", "Sent", "Accepted", "Rejected"];

const lineTypes: QuoteLineItemType[] = ["Labour", "Materials", "Other"];

const defaultLineItem: NewQuoteLineItem = {
  type: "Labour",
  description: "",
  quantity: 1,
  unitPrice: 0,
  vatRate: 20,
};

export default function NewQuoteForm({
  onAddQuote,
  onUpdateQuote,
  editingQuote,
  onCancelEdit,
}: NewQuoteFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountTotal, setDiscountTotal] = useState("0");
  const [status, setStatus] = useState<QuoteStatus>("Draft");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<NewQuoteLineItem[]>([
    { ...defaultLineItem },
  ]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      try {
        setLoadingCustomers(true);

        const data = await customersService.getAll();

        if (!cancelled) {
          setCustomers(data);
        }
      } catch {
        if (!cancelled) {
          setCustomers([]);
          setError("Unable to load customers. Create a customer first or try again.");
        }
      } finally {
        if (!cancelled) {
          setLoadingCustomers(false);
        }
      }
    }

    loadCustomers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editingQuote) {
      resetForm();
      return;
    }

    setSelectedCustomerId(String(editingQuote.customerId));
    setCustomerSearch(`#${editingQuote.customerId} — ${editingQuote.customerName}`);
    setTitle(editingQuote.title);
    setDescription(editingQuote.description ?? "");
    setDiscountTotal(String(editingQuote.discountTotal ?? 0));
    setStatus(editingQuote.status);
    setNotes(editingQuote.notes ?? "");
    setLineItems(
      editingQuote.lineItems.length > 0
        ? editingQuote.lineItems.map(item => ({
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
          }))
        : [{ ...defaultLineItem }]
    );
    setError("");
  }, [editingQuote]);

  const selectedCustomer = useMemo(() => {
    const id = Number(selectedCustomerId);

    if (!Number.isFinite(id)) {
      return null;
    }

    return customers.find(customer => customer.id === id) ?? null;
  }, [customers, selectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();

    if (search === "") {
      return customers.slice(0, 50);
    }

    return customers
      .filter(customer => {
        const id = String(customer.id);
        const name = customer.name.toLowerCase();

        return id.includes(search) || name.includes(search);
      })
      .slice(0, 50);
  }, [customers, customerSearch]);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0
    );

    const vatTotal = lineItems.reduce((sum, item) => {
      const net = Number(item.quantity || 0) * Number(item.unitPrice || 0);
      return sum + net * (Number(item.vatRate || 0) / 100);
    }, 0);

    const discount = Number(discountTotal || 0);
    const total = Math.max(0, subtotal + vatTotal - discount);

    return {
      subtotal,
      vatTotal,
      discount,
      total,
    };
  }, [lineItems, discountTotal]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!selectedCustomer) {
      setError("Please search for and select a customer from the customer list.");
      return;
    }

    const payload: NewQuote = {
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      title: title.trim(),
      description: description.trim() || null,
      discountTotal: Number(discountTotal || 0),
      status,
      notes: notes.trim() || null,
      lineItems: lineItems.map(item => ({
        type: item.type,
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        vatRate: Number(item.vatRate),
      })),
    };

    try {
      setSaving(true);
      setError("");

      if (editingQuote) {
        await onUpdateQuote({
          ...editingQuote,
          ...payload,
          amount: totals.total,
          subtotal: totals.subtotal,
          vatTotal: totals.vatTotal,
          discountTotal: totals.discount,
          total: totals.total,
          lineItems: payload.lineItems.map(item => ({
            ...item,
            lineTotal: calculateLineTotal(item),
          })),
        });

        return;
      }

      await onAddQuote(payload);
      resetForm();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save quote."));
    } finally {
      setSaving(false);
    }
  }

  function validateForm() {
    if (!selectedCustomer) {
      setError("Please search for and select a customer from the customer list.");
      return false;
    }

    if (title.trim() === "") {
      setError("Quote title is required.");
      return false;
    }

    if (Number(discountTotal || 0) < 0) {
      setError("Discount cannot be negative.");
      return false;
    }

    if (lineItems.length === 0) {
      setError("At least one priced quote line item is required.");
      return false;
    }

    for (let index = 0; index < lineItems.length; index++) {
      const item = lineItems[index];
      const lineNumber = index + 1;

      if (item.description.trim() === "") {
        setError(`Line ${lineNumber} needs a line item description.`);
        return false;
      }

      if (Number(item.quantity) <= 0) {
        setError(`Line ${lineNumber} quantity must be greater than zero.`);
        return false;
      }

      if (Number(item.unitPrice) < 0) {
        setError(`Line ${lineNumber} unit price cannot be negative.`);
        return false;
      }

      if (Number(item.vatRate) < 0 || Number(item.vatRate) > 100) {
        setError(`Line ${lineNumber} VAT rate must be between 0 and 100.`);
        return false;
      }
    }

    return true;
  }

  function selectCustomer(customer: Customer) {
    setSelectedCustomerId(String(customer.id));
    setCustomerSearch(`#${customer.id} — ${customer.name}`);
    setCustomerPickerOpen(false);
    setError("");
  }

  function resetForm() {
    setSelectedCustomerId("");
    setCustomerSearch("");
    setCustomerPickerOpen(false);
    setTitle("");
    setDescription("");
    setDiscountTotal("0");
    setStatus("Draft");
    setNotes("");
    setLineItems([{ ...defaultLineItem }]);
    setError("");
  }

  function updateLineItem(index: number, updates: Partial<NewQuoteLineItem>) {
    setLineItems(previous =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item
      )
    );
  }

  function addLineItem() {
    setLineItems(previous => [...previous, { ...defaultLineItem }]);
  }

  function removeLineItem(index: number) {
    setLineItems(previous => previous.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {editingQuote ? "Update Quote" : "New Quote"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Use the quote description for a simple overview. Use priced line items
            for the actual labour, materials, VAT, and quote total.
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm">
          <p className="font-semibold text-blue-900">Quote total</p>
          <p className="text-2xl font-bold text-blue-700">
            {formatMoney(totals.total)}
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field
          label="Customer"
          hint="Start typing a customer name or ID, then select the correct customer."
        >
          <div
            className="relative"
            onBlur={() => {
              window.setTimeout(() => setCustomerPickerOpen(false), 150);
            }}
          >
            <input
              value={customerSearch}
              onFocus={() => setCustomerPickerOpen(true)}
              onChange={event => {
                setCustomerSearch(event.target.value);
                setSelectedCustomerId("");
                setCustomerPickerOpen(true);
                setError("");
              }}
              disabled={loadingCustomers || customers.length === 0}
              placeholder={
                loadingCustomers
                  ? "Loading customers..."
                  : "Search customer name or ID"
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100"
            />

            {customerPickerOpen && !loadingCustomers && customers.length > 0 && (
              <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(customer => (
                    <button
                      key={customer.id}
                      type="button"
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => selectCustomer(customer)}
                      className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-blue-50 last:border-b-0"
                    >
                      <span>
                        <span className="font-semibold text-slate-900">
                          {customer.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          Customer ID #{customer.id}
                        </span>
                      </span>

                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        Select
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500">
                    No customers match that search.
                  </div>
                )}

                {customers.length > 50 && filteredCustomers.length === 50 && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                    Showing first 50 matches. Keep typing to narrow the list.
                  </div>
                )}
              </div>
            )}
          </div>
        </Field>

        <Field
          label="Customer ID"
          hint="Auto-filled from the database after you select a customer."
        >
          <input
            value={selectedCustomer?.id ?? ""}
            readOnly
            className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600 outline-none"
          />
        </Field>

        <Field label="Quote title" hint="Example: Bathroom refit estimate">
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Bathroom refit estimate"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
          />
        </Field>

        <Field label="Quote status">
          <select
            value={status}
            onChange={event => setStatus(event.target.value as QuoteStatus)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
          >
            {statuses.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>

        <div className="md:col-span-2">
          <Field
            label="Quote description"
            hint="Optional overview only. This is not a priced line item."
          >
            <textarea
              value={description}
              onChange={event => setDescription(event.target.value)}
              rows={3}
              placeholder="Example: Supply and fit new bathroom suite, including removal of existing fittings."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
            />
          </Field>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Priced line items
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Add the actual chargeable rows here. The line item description sits
              underneath the pricing fields so it is clear and easy to fill in.
            </p>
          </div>

          <button
            type="button"
            onClick={addLineItem}
            className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
          >
            + Add priced line
          </button>
        </div>

        <div className="space-y-4 p-4">
          {lineItems.map((item, index) => {
            const lineTotal = calculateLineTotal(item);

            return (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Line {index + 1}
                    </p>
                    <p className="text-xs text-slate-500">
                      Fill in type, quantity, price and VAT first. Then describe
                      this priced line below.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-[160px_120px_180px_120px_150px]">
                  <Field label="Type">
                    <select
                      value={item.type}
                      onChange={event =>
                        updateLineItem(index, {
                          type: event.target.value as QuoteLineItemType,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"
                    >
                      {lineTypes.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Quantity">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={item.quantity}
                      onChange={event =>
                        updateLineItem(index, {
                          quantity: Number(event.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                  </Field>

                  <Field label="Unit price before VAT">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={item.unitPrice}
                      onChange={event =>
                        updateLineItem(index, {
                          unitPrice: Number(event.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                  </Field>

                  <Field label="VAT %">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={item.vatRate}
                      onChange={event =>
                        updateLineItem(index, {
                          vatRate: Number(event.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                  </Field>

                  <Field label="Line total">
                    <div className="flex min-h-[38px] items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900">
                      {formatMoney(lineTotal)}
                    </div>
                  </Field>
                </div>

                <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4">
                  <Field
                    label="Line item description"
                    hint="Required. This describes this priced line only."
                  >
                    <input
                      value={item.description}
                      onChange={event =>
                        updateLineItem(index, {
                          description: event.target.value,
                        })
                      }
                      placeholder="Example: First-fix plumbing labour"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_340px]">
        <Field
          label="Internal quote notes"
          hint="For assumptions, exclusions, reminders, or internal context."
        >
          <textarea
            value={notes}
            onChange={event => setNotes(event.target.value)}
            rows={5}
            placeholder="Example: Customer wants work completed before half term. Excludes decorating."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
          />
        </Field>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Field label="Discount">
            <input
              type="number"
              step="1"
              min="0"
              value={discountTotal}
              onChange={event => setDiscountTotal(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"
            />
          </Field>

          <div className="mt-4 space-y-2 text-sm">
            <SummaryRow
              label="Subtotal before VAT"
              value={formatMoney(totals.subtotal)}
            />
            <SummaryRow label="VAT total" value={formatMoney(totals.vatTotal)} />
            <SummaryRow
              label="Discount"
              value={`-${formatMoney(totals.discount)}`}
            />
            <div className="border-t border-slate-200 pt-2">
              <SummaryRow label="Quote total" value={formatMoney(totals.total)} strong />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        {editingQuote && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={saving || loadingCustomers || customers.length === 0}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {saving ? "Saving..." : editingQuote ? "Update Quote" : "Create Quote"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "font-bold text-slate-900" : "text-slate-600"}>
        {label}
      </span>
      <span
        className={
          strong
            ? "text-lg font-bold text-slate-900"
            : "font-semibold text-slate-900"
        }
      >
        {value}
      </span>
    </div>
  );
}

function calculateLineTotal(item: NewQuoteLineItem) {
  const net = Number(item.quantity || 0) * Number(item.unitPrice || 0);
  const vat = net * (Number(item.vatRate || 0) / 100);

  return net + vat;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== ""
    ? error.message
    : fallback;
}