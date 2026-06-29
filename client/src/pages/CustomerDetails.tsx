import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import type { Customer } from "../types/customer";
import { customersService } from "../services/customersService";

export default function CustomerDetails() {
    const { id } = useParams();

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [form, setForm] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadCustomer() {
            const customerId = Number(id);

            if (!Number.isFinite(customerId)) {
                setError("Invalid customer ID.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const data = await customersService.getById(customerId);

                setCustomer(data);
                setForm(data);
            } catch {
                setError("Unable to load customer.");
            } finally {
                setLoading(false);
            }
        }

        loadCustomer();
    }, [id]);

    async function handleSave(event: React.FormEvent) {
        event.preventDefault();

        if (!form) return;

        if (form.name.trim() === "") {
            setError("Customer name is required.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            const updated = await customersService.update({
                ...form,
                name: form.name.trim(),
                phone: form.phone.trim(),
                email: form.email.trim(),
                address: form.address.trim(),
                notes: form.notes?.trim() || null,
            });

            setCustomer(updated);
            setForm(updated);
        } catch {
            setError("Unable to save customer.");
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
                        to="/customers"
                        className="text-sm font-medium text-blue-600 hover:underline"
                    >
                        ← Back to Customers
                    </Link>
                </div>

                {loading && (
                    <p className="text-slate-500">
                        Loading customer...
                    </p>
                )}

                {!loading && error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
                        {error}
                    </div>
                )}

                {!loading && !error && customer && form && (
                    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                        <form
                            onSubmit={handleSave}
                            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                        >
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                                        Customer #{customer.id}
                                    </p>

                                    <h1 className="mt-1 text-3xl font-bold text-slate-900">
                                        {customer.name}
                                    </h1>
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
                                <Field label="Name">
                                    <input
                                        value={form.name}
                                        onChange={event =>
                                            setForm({ ...form, name: event.target.value })
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                    />
                                </Field>

                                <Field label="Phone">
                                    <input
                                        value={form.phone}
                                        onChange={event =>
                                            setForm({ ...form, phone: event.target.value })
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                    />
                                </Field>

                                <Field label="Email">
                                    <input
                                        value={form.email}
                                        onChange={event =>
                                            setForm({ ...form, email: event.target.value })
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                    />
                                </Field>

                                <Field label="Address">
                                    <input
                                        value={form.address}
                                        onChange={event =>
                                            setForm({ ...form, address: event.target.value })
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                    />
                                </Field>

                                <div className="md:col-span-2">
                                    <Field label="Notes">
                                        <textarea
                                            value={form.notes ?? ""}
                                            onChange={event =>
                                                setForm({ ...form, notes: event.target.value })
                                            }
                                            rows={8}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                                        />
                                    </Field>
                                </div>
                            </div>
                        </form>

                        <aside className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900">
                                Customer Snapshot
                            </h2>

                            <div className="mt-5 space-y-4 text-sm">
                                <Snapshot label="Phone" value={customer.phone || "Not added"} />
                                <Snapshot label="Email" value={customer.email || "Not added"} />
                                <Snapshot label="Address" value={customer.address || "Not added"} />
                            </div>

                            <div className="mt-6 rounded-lg bg-amber-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                    Notes
                                </p>

                                <p className="mt-2 text-sm text-amber-900">
                                    {customer.notes || "No notes added yet."}
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