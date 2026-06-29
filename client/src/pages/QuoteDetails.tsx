import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Sidebar from "../components/layout/Sidebar";
import type { Quote, QuoteLineItemType, QuoteStatus } from "../types/quote";
import { quotesService } from "../services/quotesService";
import { formatMoney } from "../utils/formatMoney";

const statuses: QuoteStatus[] = ["Draft", "Sent", "Accepted", "Rejected"];

const lineTypes: QuoteLineItemType[] = ["Labour", "Materials", "Other"];

const emptyLineItem: Quote["lineItems"][number] = {
  type: "Labour",
  description: "",
  quantity: 1,
  unitPrice: 0,
  vatRate: 20,
  lineTotal: 0,
};

export default function QuoteDetails() {
  const { id } = useParams();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [form, setForm] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadQuote() {
      const quoteId = Number(id);

      if (!Number.isFinite(quoteId)) {
        setError("Invalid quote ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await quotesService.getById(quoteId);
        const safeQuote: Quote = {
          ...data,
          lineItems:
            data.lineItems.length > 0 ? data.lineItems : [{ ...emptyLineItem }],
        };

        setQuote(data);
        setForm(safeQuote);
      } catch (err) {
        setError(getErrorMessage(err, "Unable to load quote."));
      } finally {
        setLoading(false);
      }
    }

    loadQuote();
  }, [id]);

  const totals = useMemo(() => {
    if (!form) {
      return {
        subtotal: 0,
        vatTotal: 0,
        discount: 0,
        total: 0,
      };
    }

    const subtotal = form.lineItems.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0
    );

    const vatTotal = form.lineItems.reduce((sum, item) => {
      const net = Number(item.quantity || 0) * Number(item.unitPrice || 0);

      return sum + net * (Number(item.vatRate || 0) / 100);
    }, 0);

    const discount = Number(form.discountTotal || 0);
    const total = Math.max(0, subtotal + vatTotal - discount);

    return {
      subtotal,
      vatTotal,
      discount,
      total,
    };
  }, [form]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    if (!form) {
      return;
    }

    if (!validateForm(form)) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const updated = await quotesService.update({
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() || null,
        notes: form.notes?.trim() || null,
        discountTotal: Number(form.discountTotal || 0),
        amount: totals.total,
        subtotal: totals.subtotal,
        vatTotal: totals.vatTotal,
        total: totals.total,
        lineItems: form.lineItems.map(item => {
          const net =
            Number(item.quantity || 0) * Number(item.unitPrice || 0);
          const vat = net * (Number(item.vatRate || 0) / 100);

          return {
            ...item,
            description: item.description.trim(),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            vatRate: Number(item.vatRate),
            lineTotal: net + vat,
          };
        }),
      });

      setQuote(updated);
      setForm(updated);
      setSuccessMessage("Quote saved successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save quote."));
    } finally {
      setSaving(false);
    }
  }

  function validateForm(currentForm: Quote) {
    if (currentForm.title.trim() === "") {
      setError("Quote title is required.");
      return false;
    }

    if (Number(currentForm.discountTotal || 0) < 0) {
      setError("Discount cannot be negative.");
      return false;
    }

    if (currentForm.lineItems.length === 0) {
      setError("At least one priced quote line item is required.");
      return false;
    }

    for (let index = 0; index < currentForm.lineItems.length; index++) {
      const item = currentForm.lineItems[index];
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

  function updateLineItem(
    index: number,
    updates: Partial<Quote["lineItems"][number]>
  ) {
    if (!form) {
      return;
    }

    setForm({
      ...form,
      lineItems: form.lineItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item
      ),
    });
  }

  function addLineItem() {
    if (!form) {
      return;
    }

    setForm({
      ...form,
      lineItems: [...form.lineItems, { ...emptyLineItem }],
    });
  }

  function removeLineItem(index: number) {
    if (!form) {
      return;
    }

    setForm({
      ...form,
      lineItems: form.lineItems.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 p-6">
        <section className="mx-auto max-w-7xl">
          <Link
            to="/quotes"
            className="mb-5 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            ← Back to Quotes
          </Link>

          {loading && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Loading quote...
            </div>
          )}

          {!loading && error && !form && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && quote && form && (
            <>
              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                      Quote #{quote.id}
                    </p>

                    <h1 className="mt-1 text-3xl font-bold text-slate-900">
                      {quote.title}
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                      {quote.customerName} · Created{" "}
                      {new Date(quote.createdAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 px-5 py-4 text-right">
                    <p className="text-sm font-semibold text-blue-900">
                      Quote total
                    </p>
                    <p className="text-3xl font-bold text-blue-700">
                      {formatMoney(totals.total)}
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                  {successMessage}
                </div>
              )}

              <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <form
                  noValidate
                  onSubmit={handleSave}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Edit quote
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Use the quote description for a simple overview. Use
                        priced line items for the actual labour, materials, VAT,
                        and quote total.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Field label="Customer">
                      <input
                        value={form.customerName}
                        readOnly
                        className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600 outline-none"
                      />
                    </Field>

                    <Field label="Customer ID">
                      <input
                        value={form.customerId}
                        readOnly
                        className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600 outline-none"
                      />
                    </Field>

                    <Field label="Quote title">
                      <input
                        value={form.title}
                        onChange={event =>
                          setForm({ ...form, title: event.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                      />
                    </Field>

                    <Field label="Quote status">
                      <select
                        value={form.status}
                        onChange={event =>
                          setForm({
                            ...form,
                            status: event.target.value as QuoteStatus,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                      >
                        {statuses.map(status => (
                          <option key={status} value={status}>
                            {status}
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
                          value={form.description ?? ""}
                          onChange={event =>
                            setForm({
                              ...form,
                              description: event.target.value,
                            })
                          }
                          rows={4}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-slate-200">
                    <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">
                          Priced line items
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                          Add the actual chargeable rows here. The line item
                          description sits neatly underneath the pricing fields.
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
                      {form.lineItems.map((item, index) => {
                        const net =
                          Number(item.quantity || 0) *
                          Number(item.unitPrice || 0);
                        const vat = net * (Number(item.vatRate || 0) / 100);
                        const lineTotal = net + vat;

                        return (
                          <div
                            key={item.id ?? index}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  Line {index + 1}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Fill in type, quantity, price and VAT first.
                                  Then describe this priced line below.
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeLineItem(index)}
                                disabled={form.lineItems.length === 1}
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
                                      type: event.target
                                        .value as QuoteLineItemType,
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

                  <div className="mt-6">
                    <Field
                      label="Internal quote notes"
                      hint="Pricing assumptions, exclusions, customer requests, and follow-up reminders."
                    >
                      <textarea
                        value={form.notes ?? ""}
                        onChange={event =>
                          setForm({
                            ...form,
                            notes: event.target.value,
                          })
                        }
                        rows={6}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                      />
                    </Field>
                  </div>
                </form>

                <aside className="space-y-6">
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">
                      Quote summary
                    </h2>

                    <div className="mt-5">
                      <Field label="Discount">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={form.discountTotal}
                          onChange={event =>
                            setForm({
                              ...form,
                              discountTotal: Number(event.target.value),
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"
                        />
                      </Field>
                    </div>

                    <div className="mt-5 space-y-3 text-sm">
                      <SummaryRow
                        label="Subtotal before VAT"
                        value={formatMoney(totals.subtotal)}
                      />
                      <SummaryRow
                        label="VAT total"
                        value={formatMoney(totals.vatTotal)}
                      />
                      <SummaryRow
                        label="Discount"
                        value={`-${formatMoney(totals.discount)}`}
                      />
                      <div className="border-t border-slate-200 pt-3">
                        <SummaryRow
                          label="Quote total"
                          value={formatMoney(totals.total)}
                          strong
                        />
                      </div>
                    </div>

                    <Link
                      to={`/customers/${quote.customerId}`}
                      className="mt-6 inline-flex rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                    >
                      View Customer
                    </Link>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">
                      Saved line items
                    </h2>

                    <div className="mt-4 space-y-3">
                      {form.lineItems.map((item, index) => {
                        const net =
                          Number(item.quantity || 0) *
                          Number(item.unitPrice || 0);
                        const vat = net * (Number(item.vatRate || 0) / 100);
                        const lineTotal = net + vat;

                        return (
                          <div
                            key={item.id ?? index}
                            className="rounded-lg border border-slate-200 p-3 text-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-900">
                                  Line {index + 1}:{" "}
                                  {item.description || "No description"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.type} · Qty {item.quantity} ·{" "}
                                  {formatMoney(item.unitPrice)} before VAT · VAT{" "}
                                  {item.vatRate}%
                                </p>
                              </div>

                              <p className="font-bold text-slate-900">
                                {formatMoney(lineTotal)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-950">
                      {form.notes || "No quote notes added yet."}
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== ""
    ? error.message
    : fallback;
}