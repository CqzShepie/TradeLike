import { useEffect, useMemo, useState } from "react";
import type { Quote, QuoteStatus } from "../../types/quote";
import type { NewQuote } from "../../types/newQuote";
import type { Customer } from "../../types/customer";
import { customersService } from "../../services/customersService";

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
    const [amount, setAmount] = useState("");
    const [status, setStatus] = useState<QuoteStatus>("Draft");

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
            setSelectedCustomerId("");
            setTitle("");
            setDescription("");
            setAmount("");
            setStatus("Draft");
            setError("");
            return;
        }

        setSelectedCustomerId(String(editingQuote.customerId));
        setTitle(editingQuote.title);
        setDescription(editingQuote.description ?? "");
        setAmount(String(editingQuote.amount));
        setStatus(editingQuote.status);
        setError("");
    }, [editingQuote]);

    const selectedCustomer = useMemo(() => {
        const id = Number(selectedCustomerId);

        if (!Number.isFinite(id)) {
            return null;
        }

        return customers.find(customer => customer.id === id) ?? null;
    }, [customers, selectedCustomerId]);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const parsedAmount = Number(amount);

        if (!selectedCustomer) {
            setError("Please select a customer.");
            return;
        }

        if (title.trim() === "") {
            setError("Quote title is required.");
            return;
        }

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setError("Quote amount must be greater than zero.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            if (editingQuote) {
                await onUpdateQuote({
                    ...editingQuote,
                    customerId: selectedCustomer.id,
                    customerName: selectedCustomer.name,
                    title: title.trim(),
                    description: description.trim() || undefined,
                    amount: parsedAmount,
                    status,
                });

                return;
            }

            await onAddQuote({
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.name,
                title: title.trim(),
                description: description.trim() || undefined,
                amount: parsedAmount,
                status,
            });

            setSelectedCustomerId("");
            setTitle("");
            setDescription("");
            setAmount("");
            setStatus("Draft");
        } catch {
            setError("Unable to save quote.");
        } finally {
            setSaving(false);
        }
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
                    {editingQuote
                        ? "Update this customer quote."
                        : "Create a quote from an existing customer."}
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                    {error}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Customer
                    </label>

                    <select
                        value={selectedCustomerId}
                        onChange={(event) => {
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

                    {!loadingCustomers && customers.length === 0 && (
                        <p className="mt-1 text-xs text-red-600">
                            No customers found. Create a customer first.
                        </p>
                    )}
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Customer ID
                    </label>

                    <input
                        value={
                            selectedCustomer
                                ? String(selectedCustomer.id)
                                : "Auto from selected customer"
                        }
                        disabled
                        className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Title
                    </label>

                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Amount
                    </label>

                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Status
                    </label>

                    <select
                        value={status}
                        onChange={(event) =>
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
                </div>

                <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                        Description
                    </label>

                    <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
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