import { useEffect, useState } from "react";
import { routesService } from "../../services/routesService";
import type { DailyRoute } from "../../services/routesService";

type RouteMapModalProps = {
  date: Date;
  engineerId?: number | null;
  onClose: () => void;
};

export default function RouteMapModal({ date, engineerId, onClose }: RouteMapModalProps) {
  const [route, setRoute] = useState<DailyRoute | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    routesService.getDaily(toDateOnly(date), engineerId)
      .then(result => {
        if (!cancelled) setRoute(result);
      })
      .catch(() => {
        if (!cancelled) setError("Could not optimise this route.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date, engineerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Optimised route</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">{date.toLocaleDateString("en-GB")}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
        </div>

        {loading && <p className="mt-6 text-sm text-slate-500">Optimising route...</p>}
        {error && <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}

        {route && (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label="Stops" value={String(route.stopCount)} />
              <Stat label="Distance" value={`${(route.totalDistanceMeters / 1000).toFixed(1)} km`} />
            </div>
            <ol className="space-y-3">
              {route.stops.map((stop, index) => (
                <li key={stop.jobId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-blue-600">Stop {index + 1}</p>
                  <p className="mt-1 font-bold text-slate-900">{stop.jobTitle}</p>
                  <p className="text-sm text-slate-600">{stop.customer} · {stop.address}</p>
                </li>
              ))}
            </ol>
            {route.mapsUrl && <a href={route.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Open in Google Maps</a>}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>;
}

function toDateOnly(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
