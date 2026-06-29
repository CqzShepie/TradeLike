import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import type {
    Quote,
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
                setForm(data);
            } catch {
                setError("Unable to load quote.");
            } finally {
                setLoading(false);
            }
        }

        loadQuote();
    }, [id]);

    async function handleSave(event: React.FormEvent) {
        event.preventDefault();

        if (!form) return;

        if (form.title.trim() === "") {
            setError("Quote title is required.");
            return;
        }

        if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
            setError("Quote amount must be greater than zero.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            const updated = await quotesService.update({
                ...form,
                title: form.title.trim(),
                description: form.description?.trim() || null,
                amount: Number(form.amount),
                notes: form.notes?.trim() || null,
            });

            setQuote(updated);
            setForm(updated);
        } catch {
            setError("Unable to save quote.");
        } finally {
            setSaving(false);
        }
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

                                <Field label="Amount">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.amount}
                                        onChange={event =>
                                            setForm({
                                                ...form,
                                                amount: Number(event.target.value),
                                            })
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
                                            rows={5}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                        />
                                    </Field>
                                </div>

                                <div className="md:col-span-2">
                                    <Field label="Quote Notes">
                                        <textarea
                                            value={form.notes ?? ""}
                                            onChange={event =>
                                                setForm({
                                                    ...form,
                                                    notes: event.target.value,
                                                })
                                            }
                                            rows={8}
                                            placeholder="Internal notes, pricing assumptions, exclusions, follow-up reminders, materials, etc."
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                        />
                                    </Field>
                                </div>
                            </div>
                        </form>

                        <aside className="space-y-6">
                            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-900">
                                    Quote Snapshot
                                </h2>

                                <div className="mt-5 space-y-4 text-sm">
                                    <Snapshot label="Customer" value={quote.customerName} />
                                    <Snapshot label="Amount" value={formatMoney(quote.amount)} />
                                    <Snapshot label="Status" value={quote.status} />
                                    <Snapshot
                                        label="Created"
                                        value={new Date(quote.createdAt).toLocaleDateString("en-GB")}
                                    />
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

function Snapshot({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 font-medium text-slate-900">
                {value}
            </p>
        </div>
    );
}