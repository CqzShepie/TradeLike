import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { staffAuthService } from "../services/staffAuthService";

export default function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (email.trim() === "") {
      setError("Please enter your staff email address.");
      return;
    }

    if (password.trim() === "") {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await staffAuthService.login({ email, password });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[1fr_430px]">
        <section className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">
            TradeLike Studio
          </p>
          <h1 className="mt-5 text-5xl font-bold tracking-tight text-white sm:text-6xl">
            TradeLike Studio
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">
            For TradeLike staff only.
          </p>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900/85 p-6 shadow-2xl shadow-black/40">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Sign in to Studio
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-200">
                Email address
              </span>
              <input
                type="email"
                value={email}
                autoComplete="email"
                onChange={event => {
                  setEmail(event.target.value);
                  setError("");
                }}
                className="mt-2 block w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-200">
                Password
              </span>
              <input
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={event => {
                  setPassword(event.target.value);
                  setError("");
                }}
                className="mt-2 block w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
              />
            </label>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            >
              {loading ? "Signing in..." : "Sign in to Studio"}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-center text-sm">
            <Link
              to="/login"
              className="font-semibold text-blue-300 hover:text-blue-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            >
              Go to customer login
            </Link>
            <span className="text-xs text-slate-500">
              For TradeLike staff only.
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
