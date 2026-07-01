import type { JobCompletionPoint } from "../../services/analyticsService";

export default function JobCompletionStacked({ points }: { points: JobCompletionPoint[] }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/50 p-5 shadow-sm">
      <h2 className="text-lg font-bold text-white">Job completion</h2>
      <div className="mt-5 space-y-3" data-testid="job-completion-chart">
        {points.map(point => {
          const total = point.completed + point.inProgress + point.scheduled + point.cancelled || 1;
          return (
            <div key={point.date} data-testid="completion-point">
              <div className="mb-1 flex justify-between text-xs font-semibold text-slate-400">
                <span>{new Date(point.date).toLocaleDateString("en-GB")}</span>
                <span>{total} jobs</span>
              </div>
              <div className="flex h-5 overflow-hidden rounded-full bg-slate-800">
                <Bar label="Completed" value={point.completed} total={total} className="bg-emerald-500" />
                <Bar label="In progress" value={point.inProgress} total={total} className="bg-blue-500" />
                <Bar label="Scheduled" value={point.scheduled} total={total} className="bg-slate-400" />
                <Bar label="Cancelled" value={point.cancelled} total={total} className="bg-red-400" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Bar({ label, value, total, className }: { label: string; value: number; total: number; className: string }) {
  if (value === 0) return null;
  return <div aria-label={`${label}: ${value}`} className={className} style={{ width: `${(value / total) * 100}%` }} />;
}
