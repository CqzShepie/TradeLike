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
  const [form, setForm] = useState<NewQuote>({
    customerId: 0,
    customerName: "",
    title: "",
    description: "",
    amount: 0,
    status: "Draft",
  });

  useEffect(() => {
    if (editingQuote) {
      setForm({
        customerId: editingQuote.customerId,
        customerName: editingQuote.customerName,
        title: editingQuote.title,
        description: editingQuote.description || "",
        amount: editingQuote.amount,
        status: editingQuote.status,
      });
    }
  }, [editingQuote]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingQuote) {
      onUpdateQuote({
        ...editingQuote,
        ...form,
      });
    } else {
      onAddQuote(form);
    }

    setForm({
      customerId: 0,
      customerName: "",
      title: "",
      description: "",
      amount: 0,
      status: "Draft",
    });
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
        />

        <input
          name="title"
          placeholder="Quote Title"
          value={form.title}
          onChange={handleChange}
          className="rounded-lg border p-2"
        />

        <input
          name="amount"
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={handleChange}
          className="rounded-lg border p-2"
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