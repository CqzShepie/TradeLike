import { useEffect, useState, type FormEvent } from "react";

import {
  ActionBar,
  Card,
  FormField,
  InlineAlert,
  PrimaryButton,
  SecondaryButton,
  TextArea,
  TextInput,
} from "../ui";

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
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

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
      setPhone(formatPhone(editingCustomer.phone));
      setEmail(editingCustomer.email);
      setAddress(editingCustomer.address);
      setNotes(editingCustomer.notes ?? "");
      setError("");
    });

    return () => {
      cancelled = true;
    };
  }, [editingCustomer]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (name.trim() === "") {
      setError("Customer name is required.");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits && phoneDigits.length !== 11) {
      setError("Customer phone number must be 11 digits, for example 07981 125031.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const formattedPhone = formatPhone(phone);

      if (editingCustomer) {
        await onUpdateCustomer({
          ...editingCustomer,
          name: name.trim(),
          phone: formattedPhone,
          email: email.trim(),
          address: address.trim(),
          notes: notes.trim() || null,
        });
        return;
      }

      await onAddCustomer({
        name: name.trim(),
        phone: formattedPhone,
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
    <Card as="section" tone="dark" padding="lg" className="border-white/10 bg-slate-900/80 shadow-2xl shadow-slate-950/20">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">
          {editingCustomer ? "Edit customer" : "New customer"}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
          {editingCustomer ? editingCustomer.name : "Add customer"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Add contact details, address and notes in one place.
        </p>
      </div>

      {error && (
        <InlineAlert tone="error" title="Unable to save">
          {error}
        </InlineAlert>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Customer name" htmlFor="customer-name" required>
            <TextInput
              id="customer-name"
              value={name}
              hasError={Boolean(error)}
              onChange={event => setName(event.target.value)}
            />
          </FormField>

          <FormField
            label="Phone"
            htmlFor="customer-phone"
            helperText="Use a UK mobile or landline number."
          >
            <TextInput
              id="customer-phone"
              value={phone}
              placeholder="07981 125031"
              hasError={Boolean(error)}
              onChange={event => setPhone(formatPhone(event.target.value))}
            />
          </FormField>

          <FormField label="Email" htmlFor="customer-email">
            <TextInput
              id="customer-email"
              type="email"
              value={email}
              hasError={Boolean(error)}
              onChange={event => setEmail(event.target.value)}
            />
          </FormField>

          <FormField label="Address" htmlFor="customer-address">
            <TextInput
              id="customer-address"
              value={address}
              hasError={Boolean(error)}
              onChange={event => setAddress(event.target.value)}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField
              label="Notes"
              htmlFor="customer-notes"
              helperText="Access notes, preferences and reminders."
            >
              <TextArea
                id="customer-notes"
                rows={5}
                value={notes}
                hasError={Boolean(error)}
                onChange={event => setNotes(event.target.value)}
              />
            </FormField>
          </div>
        </div>

        <ActionBar>
          {editingCustomer && (
            <SecondaryButton type="button" onClick={onCancelEdit}>
              Cancel
            </SecondaryButton>
          )}
          <PrimaryButton type="submit" loading={saving}>
            {editingCustomer ? "Save customer" : "Create customer"}
          </PrimaryButton>
        </ActionBar>
      </form>
    </Card>
  );
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}
