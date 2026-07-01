import { useEffect, useState } from "react";

import RevenueLineChart from "../components/reports/RevenueLineChart";
import JobCompletionStacked from "../components/reports/JobCompletionStacked";
import {
  ErrorState,
  LoadingState,
  ProductPage,
  ProductPageHeader,
  ProductPanel,
  SelectInput,
} from "../components/ui";
import { analyticsService } from "../services/analyticsService";
import type { JobCompletionPoint, RevenuePoint } from "../services/analyticsService";

export default function ReportsOverview() {
  const [range, setRange] = useState("30");
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [completion, setCompletion] = useState<JobCompletionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - Number(range));

    setLoading(true);
    setError("");
    Promise.all([
      analyticsService.getRevenue(toDateOnly(from), toDateOnly(to)),
      analyticsService.getJobCompletion(toDateOnly(from), toDateOnly(to)),
    ])
      .then(([revenueRows, completionRows]) => {
        setRevenue(revenueRows);
        setCompletion(completionRows);
      })
      .catch(() => setError("Analytics could not be loaded."))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <ProductPage>
      <ProductPageHeader
        eyebrow="Analytics"
        title="Reports overview"
        description="Review revenue and job completion trends across the selected date range."
        actions={
          <label className="text-sm font-semibold text-slate-300">
            Date range
            <SelectInput value={range} onChange={event => setRange(event.target.value)} className="mt-2 border-white/10 bg-slate-950/60 text-white">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </SelectInput>
          </label>
        }
      />

      {loading && <LoadingState title="Loading analytics" description="Fetching revenue and job completion data." />}
      {!loading && error && <ErrorState title="Unable to load analytics" description={error} />}
      {!loading && !error && (
        <div className="grid gap-6 xl:grid-cols-2">
          <ProductPanel>
            <RevenueLineChart points={revenue} />
          </ProductPanel>
          <ProductPanel>
            <JobCompletionStacked points={completion} />
          </ProductPanel>
        </div>
      )}
    </ProductPage>
  );
}

function toDateOnly(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
