import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Currency from "../../components/ui/Currency";
import { apiClient } from "../../services/apiClient";

type Expense = {
  id: number;
  staffId: number;
  dateUtc: string;
  category: string;
  amountPence: number;
  description: string;
  miles?: number | null;
};

export default function ExpensesList() {
  const [category, setCategory] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const query = category ? `?category=${encodeURIComponent(category)}` : "";

    apiClient
      .get<Expense[]>(`/expenses${query}`)
      .then(rows => {
        if (!cancelled) setExpenses(rows);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load expenses.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <section className="min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Expenses</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-950">Expense tracking</h1>
              <p className="mt-2 text-sm text-slate-600">Fuel, materials, mileage and other team expenses.</p>
            </div>
            <div className="flex gap-3">
              <Link className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/expenses/summary">Summary</Link>
              <Link className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" to="/expenses/new">New expense</Link>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="text-sm font-medium text-slate-700">
              Category
              <select className="mt-2 w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2" value={category} onChange={event => setCategory(event.target.value)}>
                <option value="">All categories</option>
                <option value="Fuel">Fuel</option>
                <option value="Materials">Materials</option>
                <option value="Mileage">Mileage</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>

          {loading && <p className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading expenses...</p>}
          {error && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p>}
          {!loading && !error && expenses.length === 0 && <p className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No expenses found.</p>}
          {!loading && !error && expenses.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {expenses.map(expense => (
                <article key={expense.id} className="grid gap-3 border-b border-slate-200 p-4 last:border-b-0 md:grid-cols-[140px_120px_1fr_120px]">
                  <span className="text-sm text-slate-500">{new Date(expense.dateUtc).toLocaleDateString("en-GB")}</span>
                  <span className="text-sm font-semibold text-blue-700">{expense.category}</span>
                  <div>
                    <p className="font-semibold text-slate-900">{expense.description}</p>
                    {expense.miles ? <p className="text-xs text-slate-500">{expense.miles} miles</p> : null}
                  </div>
                  <strong className="text-right text-slate-950"><Currency valuePence={expense.amountPence} /></strong>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
