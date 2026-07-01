import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import RevenueLineChart from "../components/reports/RevenueLineChart";
import JobCompletionStacked from "../components/reports/JobCompletionStacked";
import { analyticsService } from "../services/analyticsService";
import type { JobCompletionPoint, RevenuePoint } from "../services/analyticsService";

export default function ReportsOverview() {
  const [range, setRange] = useState("30");
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [completion, setCompletion] = useState<JobCompletionPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - Number(range));

    setLoading(true);
    Promise.all([
      analyticsService.getRevenue(toDateOnly(from), toDateOnly(to)),
      analyticsService.getJobCompletion(toDateOnly(from), toDateOnly(to)),
    ])
      .then(([revenueRows, completionRows]) => {
        setRevenue(revenueRows);
        setCompletion(completionRows);
      })
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <section className="min-w-0 flex-1 p-10">
        <div className="max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Analytics</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">Reports overview</h1>
            </div>
            <label className="text-sm font-semibold text-slate-700">
              Date range
              <select value={range} onChange={event => setRange(event.target.value)} className="ml-3 rounded-lg border border-slate-300 px-3 py-2">
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </label>
          </div>

          {loading ? <p className="mt-8 text-sm text-slate-500">Loading analytics...</p> : (
            <div className="mt-8 grid gap-6 xl:grid-cols-2">
              <RevenueLineChart points={revenue} />
              <JobCompletionStacked points={completion} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function toDateOnly(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
