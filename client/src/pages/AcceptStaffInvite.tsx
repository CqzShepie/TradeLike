import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Logo from "../components/layout/Logo";
import { apiClient } from "../services/apiClient";

export default function AcceptStaffInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function goToLogin() {
    window.location.href = "/login";
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (token.trim() === "") {
      setError("This invite link is missing its token.");
      return;
    }

    if (pass.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (pass !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSaving(true);
      const body = Object.fromEntries([
        ["token", token],
        ["password", pass],
      ]);
      await apiClient.post<{ message: string }>("/admin/staff/accept-invite", body);
      window.location.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to accept invite.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="px-8 py-6"><Logo /></header>
      <div className="flex justify-center px-6">
        <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Staff invite</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Accept your TradeLike invite</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">Create your own password to activate your staff account.</p>

          {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

          <form onSubmit={submit} className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Create password</span>
              <input value={pass} onChange={event => setPass(event.target.value)} type="password" className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Confirm password</span>
              <input value={confirm} onChange={event => setConfirm(event.target.value)} type="password" className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600" />
            </label>
            <button type="submit" disabled={saving} className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400">{saving ? "Activating..." : "Accept Invite"}</button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600"><button type="button" onClick={goToLogin} className="font-semibold text-blue-600 hover:underline">Back to login</button></p>
        </div>
      </div>
    </main>
  );
}
