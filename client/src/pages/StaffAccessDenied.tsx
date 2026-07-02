import { Link } from "react-router-dom";

export default function StaffAccessDenied() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <section className="w-full rounded-lg border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/30">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
            Access denied
          </h2>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
            This login is for TradeLike staff only.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
            Customer users should use the customer app. If you need Studio
            access, ask a TradeLike Director or Admin to check your role.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            >
              Go to customer login
            </Link>
            <Link
              to="/staff-login"
              className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-slate-500 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            >
              Back to Studio login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
