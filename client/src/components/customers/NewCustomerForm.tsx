import { useEffect, useState } from "react";
import type { Customer } from "../../types/customer";
import type { NewCustomer } from "../../types/newCustomer";

interface NewCustomerFormProps {
    onAddCustomer: (customer: NewCustomer) => Promise<void>;
    onUpdateCustomer: (customer: Customer) => Promise<void>;
    editingCustomer: Customer | null;
    onCancelEdit: () => void;
}

export default function NewCustomerForm({
    onAddCustomer,
    onUpdateCustomer,
    editingCustomer,
    onCancelEdit,
}: NewCustomerFormProps) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!editingCustomer) {
            setName("");
            setPhone("");
            setEmail("");
            setAddress("");
            setNotes("");
            setError("");
            return;
        }

        setName(editingCustomer.name);
        setPhone(editingCustomer.phone);
        setEmail(editingCustomer.email);
        setAddress(editingCustomer.address);
        setNotes(editingCustomer.notes ?? "");
        setError("");
    }, [editingCustomer]);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        if (name.trim() === "") {
            setError("Customer name is required.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            if (editingCustomer) {
                await onUpdateCustomer({
                    ...editingCustomer,
                    name: name.trim(),
                    phone: phone.trim(),
                    email: email.trim(),
                    address: address.trim(),
                    notes: notes.trim() || null,
                });

                return;
            }

            await onAddCustomer({
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                address: address.trim(),
                notes: notes.trim() || null,
            });

            setName("");
            setPhone("");
            setEmail("");
            setAddress("");
            setNotes("");
        } catch {
            setError("Unable to save customer.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
            <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                    {editingCustomer ? "Update Customer" : "New Customer"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    Add contact details, address, and customer notes.
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                    {error}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name">
                    <input
                        value={name}
                        onChange={event => setName(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </Field>

                <Field label="Phone">
                    <input
                        value={phone}
                        onChange={event => setPhone(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </Field>

                <Field label="Email">
                    <input
                        type="email"
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </Field>

                <Field label="Address">
                    <input
                        value={address}
                        onChange={event => setAddress(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                </Field>

                <div className="md:col-span-2">
                    <Field label="Notes">
                        <textarea
                            value={notes}
                            onChange={event => setNotes(event.target.value)}
                            rows={4}
                            placeholder="Access notes, preferences, reminders, gate codes, parking, pets, etc."
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                        />
                    </Field>
                </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
                {editingCustomer && (
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
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                    {saving
                        ? "Saving..."
                        : editingCustomer
                            ? "Update Customer"
                            : "Create Customer"}
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