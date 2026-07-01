import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import { apiClient } from "../../services/apiClient";

export default function NewExpense() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("Fuel");
  const [dateUtc, setDateUtc] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [miles, setMiles] = useState("");
  const [description, setDescription] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiClient.post("/expenses", {
        dateUtc,
        category,
        amountPence: category === "Mileage" ? null : Math.round(Number(amount) * 100),
        description,
        receiptFileId: null,
        miles: category === "Mileage" ? Number(miles) : null,
      });
      navigate("/expenses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <section className="min-w-0 flex-1 p-8">
        <form onSubmit={submit} className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Expenses</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">New expense</h1>
          <p className="mt-2 text-sm text-slate-600">Mileage is calculated automatically from your active mileage rate.</p>

          {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p>}

          <div className="mt-6 grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Date
              <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" type="date" value={dateUtc} onChange={event => setDateUtc(event.target.value)} />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Category
              <select className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" value={category} onChange={event => setCategory(event.target.value)}>
                <option value="Fuel">Fuel</option>
                <option value="Materials">Materials</option>
                <option value="Mileage">Mileage</option>
                <option value="Other">Other</option>
              </select>
            </label>
            {category === "Mileage" ? (
              <label className="text-sm font-medium text-slate-700">
                Miles
                <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" min="0" step="0.1" type="number" value={miles} onChange={event => setMiles(event.target.value)} />
              </label>
            ) : (
              <label className="text-sm font-medium text-slate-700">
                Amount
                <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" min="0" step="0.01" type="number" value={amount} onChange={event => setAmount(event.target.value)} />
              </label>
            )}
            <label className="text-sm font-medium text-slate-700">
              Description
              <textarea className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" rows={4} value={description} onChange={event => setDescription(event.target.value)} />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Receipt
              <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" type="file" onChange={event => setReceiptName(event.target.files?.[0]?.name ?? "")} />
              {receiptName && <span className="mt-1 block text-xs text-slate-500">{receiptName}</span>}
            </label>
          </div>

          <button type="submit" disabled={saving} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400">
            {saving ? "Saving..." : "Save expense"}
          </button>
        </form>
      </section>
    </main>
  );
}
