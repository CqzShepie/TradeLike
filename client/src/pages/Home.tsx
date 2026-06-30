import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="text-2xl font-bold text-blue-400">
          TradeLike
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Login
          </Link>

          <Link
            to="/signup"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Get Started
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-blue-400">
            Job management software for trades
          </p>

          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white md:text-6xl">
            Run your trade business without the admin chaos.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Manage jobs, customers, quotes, engineers, calendars, and daily
            scheduling from one simple dashboard built for UK tradespeople.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/signup"
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              Start Free
            </Link>

            <Link
              to="/login"
              className="rounded-lg border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              Login
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="rounded-xl bg-white p-6 text-slate-900">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Today</p>

                <h2 className="text-2xl font-bold">Dispatch Overview</h2>
              </div>

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Live
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureCard title="Jobs Today" value="8" />
              <FeatureCard title="Scheduled" value="21" />
              <FeatureCard title="Quotes Sent" value="14" />
              <FeatureCard title="Engineers" value="4" />
            </div>

            <div className="mt-6 space-y-3">
              <JobPreview
                title="Boiler service"
                customer="Sarah Thompson"
                time="09:30"
              />
              <JobPreview
                title="Bathroom leak repair"
                customer="Mark Wilson"
                time="12:00"
              />
              <JobPreview
                title="Consumer unit check"
                customer="Priya Patel"
                time="15:00"
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-900 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} TradeLike. Built for UK trades.</p>

          <Link
            to="/admin"
            className="text-xs font-medium text-slate-600 hover:text-slate-300"
          >
            Staff Admin Portal
          </Link>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{title}</p>

      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function JobPreview({
  title,
  customer,
  time,
}: {
  title: string;
  customer: string;
  time: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>

        <p className="text-xs text-slate-500">{customer}</p>
      </div>

      <p className="text-xs font-medium text-blue-600">{time}</p>
    </div>
  );
}