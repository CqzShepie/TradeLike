import { useState, useEffect } from "react";
import type { Quote } from "../../types/quote";
import type { NewQuote } from "../../types/newQuote";

type Props = {
  onAddQuote: (quote: NewQuote) => void;
  onUpdateQuote: (quote: Quote) => void;
  editingQuote: Quote | null;
  onCancelEdit: () => void;
};

function NewQuoteForm({
  onAddQuote,
  onUpdateQuote,
  editingQuote,
  onCancelEdit,
}: Props) {
  const emptyForm: NewQuote = {
    customerId: 1, // Temporary until customer selector is implemented
    customerName: "",
    title: "",
    description: "",
    amount: 0,
    status: "Draft",
  };

  const [form, setForm] = useState<NewQuote>(emptyForm);

  useEffect(() => {
    if (editingQuote) {
      setForm({
        customerId: editingQuote.customerId,
        customerName: editingQuote.customerName,
        title: editingQuote.title,
        description: editingQuote.description ?? "",
        amount: editingQuote.amount,
        status: editingQuote.status,
      });
    } else {
      setForm(emptyForm);
    }
  }, [editingQuote]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "amount"
          ? Number(value)
          : value,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.customerName.trim()) {
      alert("Customer name is required.");
      return;
    }

    if (!form.title.trim()) {
      alert("Quote title is required.");
      return;
    }

    if (form.amount <= 0) {
      alert("Amount must be greater than zero.");
      return;
    }

    if (editingQuote) {
      onUpdateQuote({
        ...editingQuote,
        ...form,
      });
    } else {
      onAddQuote(form);
    }

    setForm(emptyForm);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-xl border bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="customerName"
          placeholder="Customer Name"
          value={form.customerName}
          onChange={handleChange}
          className="rounded-lg border p-2"
          required
        />

        <input
          name="title"
          placeholder="Quote Title"
          value={form.title}
          onChange={handleChange}
          className="rounded-lg border p-2"
          required
        />

        <input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Amount"
          value={form.amount === 0 ? "" : form.amount}
          onChange={handleChange}
          className="rounded-lg border p-2"
          required
        />

        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="rounded-lg border p-2"
        >
          <option value="Draft">Draft</option>
          <option value="Sent">Sent</option>
          <option value="Accepted">Accepted</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <textarea
        name="description"
        placeholder="Description"
        value={form.description}
        onChange={handleChange}
        className="mt-4 w-full rounded-lg border p-2"
      />

      <div className="mt-4 flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          {editingQuote ? "Update Quote" : "Create Quote"}
        </button>

        {editingQuote && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-lg bg-gray-200 px-4 py-2"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default NewQuoteForm;