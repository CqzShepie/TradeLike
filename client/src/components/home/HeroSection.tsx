import { Link } from "react-router-dom";

const highlights = [
  "Jobs",
  "Customers",
  "Quotes",
  "Engineers",
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-slate-900">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-24">
        <div>
          <p className="inline-flex rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
            Built for UK trade businesses
          </p>

          <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Run every job, quote and engineer from one simple trade dashboard.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            TradeLike helps plumbers, electricians, heating engineers, builders and maintenance teams manage customers, schedule jobs, send quotes and keep engineers organised without spreadsheets or admin chaos.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
            >
              Start 14-day free trial
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex justify-center rounded-lg border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
            >
              See how it works
            </a>
          </div>

          <p className="mt-4 text-sm text-slate-400">
            No card required to create your account. Start with your first customer, quote and job today.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/60 sm:p-5">
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">TradeLike command centre</p>
                <h2 className="mt-1 text-xl font-bold text-white">One view for the whole day</h2>
              </div>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Example dashboard
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {highlights.map(item => (
                <div key={item} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{item === "Jobs" ? "12" : item === "Quotes" ? "8" : item === "Engineers" ? "5" : "164"}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              <HeroJob time="08:30" title="Boiler service" detail="North Leeds, engineer assigned" />
              <HeroJob time="11:15" title="Leak investigation" detail="Quote accepted, parts noted" />
              <HeroJob time="15:00" title="Consumer unit check" detail="Customer notes attached" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroJob({ time, title, detail }: { time: string; title: string; detail: string }) {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3">
      <p className="rounded-md bg-blue-500/10 px-2 py-2 text-center text-xs font-bold text-blue-200">{time}</p>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{detail}</p>
      </div>
    </div>
  );
}
