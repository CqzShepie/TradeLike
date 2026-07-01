import Currency from "../ui/Currency";
import type { RevenuePoint } from "../../services/analyticsService";

export default function RevenueLineChart({ points }: { points: RevenuePoint[] }) {
  const max = Math.max(1, ...points.map(point => point.revenuePence));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Revenue</h2>
      <div className="mt-5 flex h-52 items-end gap-2" data-testid="revenue-chart">
        {points.map(point => (
          <div key={point.date} className="flex min-w-10 flex-1 flex-col items-center gap-2">
            <div
              data-testid="revenue-point"
              title={`${point.date}: ${point.revenuePence}`}
              className="w-full rounded-t-lg bg-blue-600"
              style={{ height: `${Math.max(8, (point.revenuePence / max) * 180)}px` }}
            />
            <span className="text-[10px] font-semibold text-slate-500">{formatDay(point.date)}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-700">
        Total: <Currency valuePence={points.reduce((sum, point) => sum + point.revenuePence, 0)} />
      </p>
    </section>
  );
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
