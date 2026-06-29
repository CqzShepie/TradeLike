import { useEffect, useMemo, useState } from "react";
import type {
    Quote,
    QuoteLineItemType,
    QuoteStatus,
} from "../../types/quote";
import type {
    NewQuote,
    NewQuoteLineItem,
} from "../../types/newQuote";
import type { Customer } from "../../types/customer";
import { customersService } from "../../services/customersService";
import { formatMoney } from "../../utils/formatMoney";

interface NewQuoteFormProps {
    onAddQuote: (quote: NewQuote) => Promise<void>;
    onUpdateQuote: (quote: Quote) => Promise<void>;
    editingQuote: Quote | null;
    onCancelEdit: () => void;
}

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

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        if (!selectedCustomer) {
            setError("Please select a customer.");
            return;
        }

        if (title.trim() === "") {
            setError("Quote title is required.");
            return;
        }

        if (lineItems.length === 0) {
            setError("At least one line item is required.");
            return;
        }

        for (const item of lineItems) {
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

            if (editingQuote) {
                await onUpdateQuote({
                    ...editingQuote,
                    ...payload,
                    amount: totals.total,
                    subtotal: totals.subtotal,
                    vatTotal: totals.vatTotal,
                    total: totals.total,
                    lineItems: payload.lineItems.map(item => ({
                        ...item,
                        lineTotal:
                            item.quantity * item.unitPrice +
                            item.quantity * item.unitPrice * (item.vatRate / 100),
                    })),
                });

                return;
            }

            await onAddQuote(payload);

            resetForm();
        } catch {
            setError("Unable to save quote.");
        } finally {
            setSaving(false);
        }
    }

    function resetForm() {
        setSelectedCustomerId("");
        setTitle("");
        setDescription("");
        setDiscountTotal("0");
        setStatus("Draft");
        setNotes("");
        setLineItems([{ ...defaultLineItem }]);
        setError("");
    }

    function updateLineItem(
        index: number,
        updates: Partial<NewQuoteLineItem>
    ) {
        setLineItems(previous =>
            previous.map((item, itemIndex) =>
                itemIndex === index
                    ? { ...item, ...updates }
                    : item
            )
        );
    }

    function addLineItem() {
        setLineItems(previous => [
            ...previous,
            { ...defaultLineItem },
        ]);
    }

    function removeLineItem(index: number) {
        setLineItems(previous =>
            previous.filter((_, itemIndex) => itemIndex !== index)
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
            <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                    {editingQuote ? "Update Quote" : "New Quote"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Build a commercial quote with labour, materials, VAT, discounts, and notes.
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                    {error}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Customer">
                    <select
                        value={selectedCustomerId}
                        onChange={event => {
                            setSelectedCustomerId(event.target.value);
                            setError("");
                        }}
                        disabled={loadingCustomers || customers.length === 0}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100"
                    >
                        <option value="">
                            {loadingCustomers
                                ? "Loading customers..."
                                : "Select customer"}
                        </option>

                        {customers.map(customer => (
                            <option key={customer.id} value={customer.id}>
                                #{customer.id} — {customer.name}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Customer ID">
                    <input
                        value={
                            selectedCustomer
                                ? String(selectedCustomer.id)
                                : "Auto from selected customer"
                        }
                        disabled
                        className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                    />
                </Field>

                <Field label="Title">
                    <input
                        value={title}
                        onChange={event => setTitle(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </Field>

                <Field label="Status">
                    <select
                        value={status}
                        onChange={event =>
                            setStatus(event.target.value as QuoteStatus)
                        }
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
                    <Field label="Description">
                        <textarea
                            value={description}
                            onChange={event => setDescription(event.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                        />
                    </Field>
                </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <h3 className="text-sm font-bold text-slate-900">
                        Line Items
                    </h3>

                    <button
                        type="button"
                        onClick={addLineItem}
                        className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                        + Add Line
                    </button>
                </div>

                <div className="space-y-4 p-4">
                    {lineItems.map((item, index) => {
                        const net = Number(item.quantity || 0) * Number(item.unitPrice || 0);
                        const lineVat = net * (Number(item.vatRate || 0) / 100);
                        const lineTotal = net + lineVat;

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
                                        disabled={lineItems.length === 1}
                                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Remove
                                    </button>
                                </div>

                                <div className="mt-2 grid gap-3 text-xs text-slate-500 md:grid-cols-[140px_1fr_100px_120px_100px_110px_auto]">
                                    <span>Type</span>
                                    <span>Description</span>
                                    <span>Qty</span>
                                    <span>Unit Price</span>
                                    <span>VAT %</span>
                                    <span>Total</span>
                                    <span />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_320px]">
                <Field label="Quote Notes">
                    <textarea
                        value={notes}
                        onChange={event => setNotes(event.target.value)}
                        rows={5}
                        placeholder="Pricing assumptions, exclusions, customer requests, follow-up reminders, etc."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </Field>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <Field label="Discount">
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={discountTotal}
                            onChange={event => setDiscountTotal(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                        />
                    </Field>

                    <div className="mt-4 space-y-2 text-sm">
                        <SummaryRow label="Subtotal" value={formatMoney(totals.subtotal)} />
                        <SummaryRow label="VAT" value={formatMoney(totals.vatTotal)} />
                        <SummaryRow label="Discount" value={`-${formatMoney(totals.discount)}`} />
                        <div className="border-t border-slate-200 pt-2">
                            <SummaryRow
                                label="Total"
                                value={formatMoney(totals.total)}
                                strong
                            />
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
                    {saving
                        ? "Saving..."
                        : editingQuote
                            ? "Update Quote"
                            : "Create Quote"}
                </button>
            </div>
        </form>
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