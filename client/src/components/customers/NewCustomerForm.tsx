import { useEffect, useState, type FormEvent } from "react";

import Card from "../ui/Card";

import type { Customer } from "../../types/customer";
import type { NewCustomer } from "../../types/newCustomer";

type NewCustomerFormProps = {
  onAddCustomer: (customer: NewCustomer) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  editingCustomer?: Customer | null;
  onCancelEdit?: () => void;
};

function NewCustomerForm({
  onAddCustomer,
  onUpdateCustomer,
  editingCustomer,
  onCancelEdit,
}: NewCustomerFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (editingCustomer) {
      setName(editingCustomer.name);
      setPhone(editingCustomer.phone);
      setEmail(editingCustomer.email);
      setAddress(editingCustomer.address);
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
    }
  }, [editingCustomer]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    if (editingCustomer && onUpdateCustomer) {
      onUpdateCustomer({
        ...editingCustomer,
        name,
        phone,
        email,
        address,
      });
    } else {
      onAddCustomer({
        name,
        phone,
        email,
        address,
      });
    }

    setName("");
    setPhone("");
    setEmail("");
    setAddress("");

    onCancelEdit?.();
  }

  return (
    <Card className="mt-10">
      <h2 className="mb-6 text-2xl font-bold">
        {editingCustomer ? "Edit Customer" : "New Customer"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Customer Name"
          className="w-full rounded-lg border px-4 py-3"
          required
        />

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone Number"
          className="w-full rounded-lg border px-4 py-3"
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          className="w-full rounded-lg border px-4 py-3"
        />

        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address"
          className="w-full rounded-lg border px-4 py-3"
        />

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            {editingCustomer ? "Update Customer" : "Save Customer"}
          </button>

          {editingCustomer && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg border px-6 py-3 text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}

export default NewCustomerForm;