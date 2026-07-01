import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import ExpenseSummaryChart from "../../components/expenses/ExpenseSummaryChart";
import type { ExpenseSummaryItem } from "../../components/expenses/ExpenseSummaryChart";
import { apiClient } from "../../services/apiClient";

function isoDate(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export default function ExpensesSummary() {
  const [from, setFrom] = useState(isoDate(30));
  const [to, setTo] = useState(isoDate(0));
  const [items, setItems] = useState<ExpenseSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const total = useMemo(() => items.reduce((sum, item) => sum + item.totalPence, 0), [items]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    apiClient
      .get<ExpenseSummaryItem[]>(`/expenses/summary?from=${from}&to=${to}`)
      .then(result => {
        if (!cancelled) setItems(result);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load expense summary.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <section className="min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Expenses</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Expense summary</h1>
          <p className="mt-2 text-sm text-slate-600">Track spend by category for the selected period.</p>

          <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm font-medium text-slate-700">
              From
              <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" type="date" value={from} onChange={event => setFrom(event.target.value)} />
            </label>
            <label className="text-sm font-medium text-slate-700">
              To
              <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" type="date" value={to} onChange={event => setTo(event.target.value)} />
            </label>
            <div className="rounded-xl bg-slate-950 px-5 py-4 text-white">
              <span className="block text-xs text-slate-300">Total</span>
              <strong className="text-xl">£{(total / 100).toLocaleString("en-GB")}</strong>
            </div>
          </div>

          {loading && <p className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading expense summary...</p>}
          {error && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p>}
          {!loading && !error && <div className="mt-6"><ExpenseSummaryChart items={items} /></div>}
        </div>
      </section>
    </main>
  );
}
