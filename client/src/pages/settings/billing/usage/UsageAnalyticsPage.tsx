import { useEffect, useMemo, useState } from "react";

import { apiClient } from "../../../../services/apiClient";

interface UsageDay {
  date: string;
  requests: number;
  exportCalls: number;
  automationRuns: number;
}

interface UsageSummary {
  plan: string;
  requestsPerSecond: number;
  dailyRequestLimit: number | null;
  days: UsageDay[];
}

export default function UsageAnalyticsPage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient.get<UsageSummary>("/usage")
      .then(setSummary)
      .catch(loadError => setError(loadError instanceof Error ? loadError.message : "Unable to load usage."));
  }, []);

  const maxRequests = useMemo(() => Math.max(1, ...(summary?.days.map(day => day.requests) ?? [1])), [summary]);
  const today = summary?.days.at(-1);
  const cap = summary?.dailyRequestLimit;
  const capPercent = cap && today ? Math.min(100, Math.round((today.requests / cap) * 100)) : 0;

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase text-blue-700">Billing</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Usage analytics</h1>
        {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {summary ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-900">Requests per day</h2>
              <svg role="img" aria-label="Requests per day chart" viewBox="0 0 640 240" className="mt-4 h-72 w-full">
                <polyline
                  fill="none"
                  points={summary.days.map((day, index) => {
                    const x = summary.days.length === 1 ? 0 : (index / (summary.days.length - 1)) * 620 + 10;
                    const y = 220 - (day.requests / maxRequests) * 200;
                    return `${x},${y}`;
                  }).join(" ")}
                  stroke="#2563eb"
                  strokeWidth="4"
                />
              </svg>
            </section>
            <aside className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-900">{summary.plan} limits</h2>
              <p className="mt-2 text-sm text-slate-600">{summary.requestsPerSecond} req/sec burst</p>
              <div className="mt-6">
                <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-blue-600" style={{ width: `${cap ? capPercent : 100}%` }} />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {cap ? `${today?.requests ?? 0} / ${cap} requests today` : "Unlimited daily requests"}
                </p>
              </div>
            </aside>
          </div>
        ) : <p className="mt-6 text-sm text-slate-500">Loading usage...</p>}
      </section>
    </main>
  );
}
