import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import type {
    Quote,
    QuoteLineItemType,
    QuoteStatus,
} from "../types/quote";
import { quotesService } from "../services/quotesService";
import { formatMoney } from "../utils/formatMoney";

const statuses: QuoteStatus[] = [
    "Draft",
    "Sent",
    "Accepted",
    "Rejected",
];

const lineTypes: QuoteLineItemType[] = [
    "Labour",
    "Materials",
    "Other",
];

export default function QuoteDetails() {
    const { id } = useParams();

    const [quote, setQuote] = useState<Quote | null>(null);
    const [form, setForm] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

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

                setQuote(data);
                setForm({
                    ...data,
                    lineItems: data.lineItems.length > 0
                        ? data.lineItems
                        : [
                            {
                                type: "Labour",
                                description: "",
                                quantity: 1,
                                unitPrice: 0,
                                vatRate: 20,
                                lineTotal: 0,
                            },
                        ],
                });
            } catch {
                setError("Unable to load quote.");
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

        const discount = Number(form.discountTotal || 0);
        const total = Math.max(0, subtotal + vatTotal - discount);

        return {
            subtotal,
            vatTotal,
            discount,
            total,
        };
    }, [form]);

    async function handleSave(event: React.FormEvent) {
        event.preventDefault();

        if (!form) return;

        if (form.title.trim() === "") {
            setError("Quote title is required.");
            return;
        }

        if (form.lineItems.length === 0) {
            setError("At least one line item is required.");
            return;
        }

        for (const item of form.lineItems) {
            if (item.description.trim() === "") {
                setError("Every line item needs a description.");
                return;
            }

            if (Number(item.quantity) <= 0) {
                setError("Line item quantity must be greater than zero.");
                return;
            }

            if (Number(item.unitPrice) < 0) {
                setError("Line item unit price cannot be negative.");
                return;
            }

            if (Number(item.vatRate) < 0) {
                setError("Line item VAT rate cannot be negative.");
                return;
            }
        }

        try {
            setSaving(true);
            setError("");

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
        } catch {
            setError("Unable to save quote.");
        } finally {
            setSaving(false);
        }
    }

    function updateLineItem(
        index: number,
        updates: Partial<Quote["lineItems"][number]>
    ) {
        if (!form) return;

        setForm({
            ...form,
            lineItems: form.lineItems.map((item, itemIndex) =>
                itemIndex === index
                    ? { ...item, ...updates }
                    : item
            ),
        });
    }

    function addLineItem() {
        if (!form) return;

        setForm({
            ...form,
            lineItems: [
                ...form.lineItems,
                {
                    type: "Labour",
                    description: "",
                    quantity: 1,
                    unitPrice: 0,
                    vatRate: 20,
                    lineTotal: 0,
                },
            ],
        });
    }

    function removeLineItem(index: number) {
        if (!form) return;

        setForm({
            ...form,
            lineItems: form.lineItems.filter((_, itemIndex) => itemIndex !== index),
        });
    }

    return (
        <main className="flex min-h-screen bg-slate-50">
            <Sidebar />

            <section className="flex-1 p-10">
                <div className="mb-6">
                    <Link
                        to="/quotes"
                        className="text-sm font-medium text-blue-600 hover:underline"
                    >
                        ← Back to Quotes
                    </Link>
                </div>

                {loading && (
                    <p className="text-slate-500">
                        Loading quote...
                    </p>
                )}

                {!loading && error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
                        {error}
                    </div>
                )}

                {!loading && !error && quote && form && (
                    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                        <form
                            onSubmit={handleSave}
                            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                        >
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                                        Quote #{quote.id}
                                    </p>

                                    <h1 className="mt-1 text-3xl font-bold text-slate-900">
                                        {quote.title}
                                    </h1>

                                    <p className="mt-2 text-sm text-slate-500">
                                        {quote.customerName}
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400"
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Title">
                                    <input
                                        value={form.title}
                                        onChange={event =>
                                            setForm({ ...form, title: event.target.value })
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                    />
                                </Field>

                                <Field label="Status">
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

                                <Field label="Customer">
                                    <input
                                        value={`#${form.customerId} — ${form.customerName}`}
                                        disabled
                                        className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                                    />
                                </Field>

                                <Field label="Discount">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.discountTotal}
                                        onChange={event =>
                                            setForm({
                                                ...form,
                                                discountTotal: Number(event.target.value),
                                            })
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                    />
                                </Field>

                                <div className="md:col-span-2">
                                    <Field label="Description">
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
                                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                                    <h2 className="text-sm font-bold text-slate-900">
                                        Line Items
                                    </h2>

                                    <button
                                        type="button"
                                        onClick={addLineItem}
                                        className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                    >
                                        + Add Line
                                    </button>
                                </div>

                                <div className="space-y-4 p-4">
                                    {form.lineItems.map((item, index) => {
                                        const net = Number(item.quantity || 0) * Number(item.unitPrice || 0);
                                        const vat = net * (Number(item.vatRate || 0) / 100);
                                        const lineTotal = net + vat;

                                        return (
                                            <div
                                                key={index}
                                                className="rounded-lg border border-slate-200 p-4"
                                            >
                                                <div className="grid gap-3 md:grid-cols-[140px_1fr_100px_120px_100px_110px_auto]">
                                                    <select
                                                        value={item.type}
                                                        onChange={event =>
                                                            updateLineItem(index, {
                                                                type: event.target.value as QuoteLineItemType,
                                                            })
                                                        }
                                                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                                    >
                                                        {lineTypes.map(type => (
                                                            <option key={type} value={type}>
                                                                {type}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    <input
                                                        value={item.description}
                                                        onChange={event =>
                                                            updateLineItem(index, {
                                                                description: event.target.value,
                                                            })
                                                        }
                                                        placeholder="Description"
                                                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                                    />

                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.quantity}
                                                        onChange={event =>
                                                            updateLineItem(index, {
                                                                quantity: Number(event.target.value),
                                                            })
                                                        }
                                                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                                    />

                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.unitPrice}
                                                        onChange={event =>
                                                            updateLineItem(index, {
                                                                unitPrice: Number(event.target.value),
                                                            })
                                                        }
                                                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                                    />

                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.vatRate}
                                                        onChange={event =>
                                                            updateLineItem(index, {
                                                                vatRate: Number(event.target.value),
                                                            })
                                                        }
                                                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                                    />

                                                    <div className="flex items-center text-sm font-semibold text-slate-900">
                                                        {formatMoney(lineTotal)}
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
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-6">
                                <Field label="Quote Notes">
                                    <textarea
                                        value={form.notes ?? ""}
                                        onChange={event =>
                                            setForm({
                                                ...form,
                                                notes: event.target.value,
                                            })
                                        }
                                        rows={6}
                                        placeholder="Internal notes, pricing assumptions, exclusions, follow-up reminders, materials, etc."
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                    />
                                </Field>
                            </div>
                        </form>

                        <aside className="space-y-6">
                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-900">
                                    Quote Summary
                                </h2>

                                <div className="mt-5 space-y-3 text-sm">
                                    <SummaryRow label="Subtotal" value={formatMoney(totals.subtotal)} />
                                    <SummaryRow label="VAT" value={formatMoney(totals.vatTotal)} />
                                    <SummaryRow label="Discount" value={`-${formatMoney(totals.discount)}`} />

                                    <div className="border-t border-slate-200 pt-3">
                                        <SummaryRow
                                            label="Total"
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

                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                    Notes
                                </p>

                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-950">
                                    {quote.notes || "No quote notes added yet."}
                                </p>
                            </div>
                        </aside>
                    </div>
                )}
            </section>
        </main>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
                {label}
            </span>

            {children}
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
        <div className="flex items-center justify-between">
            <span className={strong ? "font-bold text-slate-900" : "text-slate-600"}>
                {label}
            </span>

            <span className={strong ? "text-lg font-bold text-slate-900" : "font-semibold text-slate-900"}>
                {value}
            </span>
        </div>
    );
}