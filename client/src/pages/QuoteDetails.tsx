import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Sidebar from "../components/layout/Sidebar";
import type { JobPriority } from "../types/job";
import type {
  Quote,
  QuoteDiscountType,
  QuoteLineItemType,
  QuoteStatus,
} from "../types/quote";
import { quotesService } from "../services/quotesService";
import { formatMoney } from "../utils/formatMoney";

const statuses: QuoteStatus[] = ["Draft", "Sent", "Accepted", "Rejected"];
const lineTypes: QuoteLineItemType[] = ["Labour", "Materials", "Other"];
const discountTypes: QuoteDiscountType[] = ["Amount", "Percentage"];
const priorities: JobPriority[] = ["Low", "Normal", "High", "Urgent"];

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
  const navigate = useNavigate();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [form, setForm] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [conversionJobTitle, setConversionJobTitle] = useState("");
  const [conversionScheduledDate, setConversionScheduledDate] = useState(
    getDefaultDateTimeLocal()
  );
  const [conversionPhone, setConversionPhone] = useState("");
  const [conversionAddress, setConversionAddress] = useState("");
  const [conversionPriority, setConversionPriority] =
    useState<JobPriority>("Normal");
  const [conversionNotes, setConversionNotes] = useState("");
  const [conversionError, setConversionError] = useState("");
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    async function loadQuote() {
      const quoteId = Number(id);

      if (!Number.isFinite(quoteId) || quoteId <= 0) {
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
          discountType: data.discountType ?? "Amount",
          discountValue:
            Number(data.discountValue || 0) > 0
              ? data.discountValue
              : data.discountTotal ?? 0,
          lineItems:
            data.lineItems.length > 0 ? data.lineItems : [{ ...emptyLineItem }],
        };

        setQuote(data);
        setForm(safeQuote);
        setConversionJobTitle(data.title);
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
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0
    );

    const vatTotal = form.lineItems.reduce((sum, item) => {
      const net = Number(item.quantity || 0) * Number(item.unitPrice || 0);

      return sum + net * (Number(item.vatRate || 0) / 100);
    }, 0);

    const discount = calculateDiscountTotal(
      form.discountType,
      Number(form.discountValue || 0),
      subtotal,
      vatTotal
    );

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
        discountTotal: totals.discount,
        amount: totals.total,
        subtotal: totals.subtotal,
        vatTotal: totals.vatTotal,
        total: totals.total,
        lineItems: form.lineItems.map(item => {
          const net = Number(item.quantity || 0) * Number(item.unitPrice || 0);
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
      setConversionJobTitle(updated.title);
      setSuccessMessage("Quote saved successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save quote."));
    } finally {
      setSaving(false);
    }
  }

  async function handleConvertToJob(event: FormEvent) {
    event.preventDefault();

    if (!quote) {
      return;
    }

    if (quote.status !== "Accepted") {
      setConversionError("Mark and save this quote as Accepted before converting it to a job.");
      return;
    }

    if (conversionScheduledDate.trim() === "") {
      setConversionError("Choose a scheduled date and time for the job.");
      return;
    }

    try {
      setConverting(true);
      setConversionError("");

      const job = await quotesService.convertToJob(quote.id, {
        jobTitle: conversionJobTitle.trim() || quote.title,
        scheduledDate: conversionScheduledDate,
        phone: conversionPhone.trim() || null,
        address: conversionAddress.trim() || null,
        priority: conversionPriority,
        notes: conversionNotes.trim() || null,
        engineerId: null,
      });

      navigate(`/jobs/${job.id}`);
    } catch (err) {
      setConversionError(getErrorMessage(err, "Unable to convert quote to job."));
    } finally {
      setConverting(false);
    }
  }

  function validateForm(currentForm: Quote) {
    if (currentForm.title.trim() === "") {
      setError("Quote title is required.");
      return false;
    }

    if (Number(currentForm.discountValue || 0) < 0) {
      setError("Discount value cannot be negative.");
      return false;
    }

    if (
      currentForm.discountType === "Percentage" &&
      Number(currentForm.discountValue || 0) > 100
    ) {
      setError("Percentage discount cannot be more than 100%.");
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

  const canConvertSavedQuote = quote?.status === "Accepted";
  const hasUnsavedStatusChange = quote && form && quote.status !== form.status;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />

      <main className="md:pl-64">
        <section className="mx-auto max-w-7xl px-6 py-8 [&_.bg-blue-50]:!bg-blue-500/10 [&_.bg-green-50]:!bg-green-500/10 [&_.bg-red-50]:!bg-red-950/30 [&_.bg-slate-50]:!bg-slate-950/50 [&_.bg-white]:!bg-slate-900/80 [&_.border-blue-200]:!border-blue-400/30 [&_.border-green-200]:!border-green-400/30 [&_.border-red-200]:!border-red-400/30 [&_.border-slate-200]:!border-white/10 [&_.border-slate-300]:!border-white/10 [&_.divide-slate-200>*]:!border-white/10 [&_.text-blue-700]:!text-blue-200 [&_.text-green-700]:!text-green-200 [&_.text-red-700]:!text-red-200 [&_.text-slate-400]:!text-slate-500 [&_.text-slate-500]:!text-slate-400 [&_.text-slate-600]:!text-slate-300 [&_.text-slate-700]:!text-slate-200 [&_.text-slate-800]:!text-slate-100 [&_.text-slate-900]:!text-white [&_input]:!bg-slate-950/60 [&_input]:!text-white [&_select]:!bg-slate-950/60 [&_select]:!text-white [&_textarea]:!bg-slate-950/60 [&_textarea]:!text-white">
          <Link
            to="/quotes"
            className="text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            ← Back to Quotes
          </Link>

          {loading && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading quote...
            </div>
          )}

          {!loading && error && !form && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {!loading && quote && form && (
            <>
              <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Quote #{quote.id}
                  </p>
                  <h1 className="mt-1 text-3xl font-bold text-slate-900">
                    {quote.title}
                  </h1>
                  <p className="mt-2 text-sm text-slate-600">
                    {quote.customerName} · Created{" "}
                    {new Date(quote.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-right shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Quote total
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatMoney(totals.total)}
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                  {successMessage}
                </div>
              )}

              <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_420px]">
                <form
                  onSubmit={handleSave}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Edit quote
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Use the quote description for a simple overview. Use priced
                        line items for the actual labour, materials, VAT, and quote total.
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
                        hint="Optional overview only. Do not use this for priced rows."
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
                          Number(item.quantity || 0) * Number(item.unitPrice || 0);
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

                    <div className="mt-5 grid grid-cols-[130px_1fr] gap-3">
                      <Field label="Discount type">
                        <select
                          value={form.discountType}
                          onChange={event =>
                            setForm({
                              ...form,
                              discountType: event.target.value as QuoteDiscountType,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"
                        >
                          {discountTypes.map(type => (
                            <option key={type} value={type}>
                              {type === "Amount" ? "£ amount" : "% percentage"}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field
                        label={
                          form.discountType === "Amount"
                            ? "Discount value (£)"
                            : "Discount value (%)"
                        }
                      >
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max={form.discountType === "Percentage" ? 100 : undefined}
                          value={form.discountValue}
                          onChange={event =>
                            setForm({
                              ...form,
                              discountValue: Number(event.target.value),
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
                        label="Calculated discount"
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
                      className="mt-6 inline-flex rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      View Customer
                    </Link>
                  </div>

                  <form
                    onSubmit={handleConvertToJob}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <h2 className="text-lg font-bold text-slate-900">
                      Convert to job
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      The quote stays as a quote. Conversion creates a linked job
                      with Quote ID #{quote.id}.
                    </p>

                    {conversionError && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                        {conversionError}
                      </div>
                    )}

                    {!canConvertSavedQuote && (
                      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        Mark this quote as <strong>Accepted</strong> and save it
                        before converting it to a job.
                      </div>
                    )}

                    {hasUnsavedStatusChange && (
                      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                        Save your quote changes before converting.
                      </div>
                    )}

                    <div className="mt-5 space-y-4">
                      <Field label="Job title">
                        <input
                          value={conversionJobTitle}
                          onChange={event => setConversionJobTitle(event.target.value)}
                          disabled={!canConvertSavedQuote}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100"
                        />
                      </Field>

                      <Field label="Scheduled date and time">
                        <input
                          type="datetime-local"
                          value={conversionScheduledDate}
                          onChange={event =>
                            setConversionScheduledDate(event.target.value)
                          }
                          disabled={!canConvertSavedQuote}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100"
                        />
                      </Field>

                      <Field
                        label="Phone"
                        hint="Leave blank to use the customer record if it has one."
                      >
                        <input
                          value={conversionPhone}
                          onChange={event => setConversionPhone(event.target.value)}
                          disabled={!canConvertSavedQuote}
                          placeholder="Customer phone number"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100"
                        />
                      </Field>

                      <Field
                        label="Job address"
                        hint="Leave blank to use the customer record if it has one."
                      >
                        <input
                          value={conversionAddress}
                          onChange={event => setConversionAddress(event.target.value)}
                          disabled={!canConvertSavedQuote}
                          placeholder="Job address"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100"
                        />
                      </Field>

                      <Field label="Priority">
                        <select
                          value={conversionPriority}
                          onChange={event =>
                            setConversionPriority(event.target.value as JobPriority)
                          }
                          disabled={!canConvertSavedQuote}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100"
                        >
                          {priorities.map(priority => (
                            <option key={priority} value={priority}>
                              {priority}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Conversion notes">
                        <textarea
                          value={conversionNotes}
                          onChange={event => setConversionNotes(event.target.value)}
                          disabled={!canConvertSavedQuote}
                          rows={4}
                          placeholder="Example: Customer accepted by phone. Book for first available engineer."
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100"
                        />
                      </Field>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={
                            !canConvertSavedQuote ||
                            Boolean(hasUnsavedStatusChange) ||
                            converting
                          }
                          className="inline-flex rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {converting ? "Converting..." : "Convert to Job"}
                        </button>
                      </div>
                    </div>
                  </form>

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

function calculateDiscountTotal(
  discountType: QuoteDiscountType,
  discountValue: number,
  subtotal: number,
  vatTotal: number
) {
  const preDiscountTotal = subtotal + vatTotal;

  if (discountValue <= 0) {
    return 0;
  }

  if (discountType === "Percentage") {
    return Math.min(preDiscountTotal, preDiscountTotal * (discountValue / 100));
  }

  return Math.min(preDiscountTotal, discountValue);
}

function getDefaultDateTimeLocal() {
  const date = new Date();

  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);

  const offsetMs = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - offsetMs);

  return localDate.toISOString().slice(0, 16);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() !== ""
    ? error.message
    : fallback;
}
