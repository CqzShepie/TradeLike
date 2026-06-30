import { Link, useSearchParams } from "react-router-dom";
import Logo from "../components/layout/Logo";

export default function AcceptStaffInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="px-8 py-6"><Logo /></header>
      <div className="flex justify-center px-6">
        <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Staff invite</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Accept your TradeLike invite</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Your invite link is ready. The password setup form is the next build step.
          </p>
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 break-all">
            {token ? `Invite token received: ${token.slice(0, 10)}...` : "No invite token found."}
          </div>
          <p className="mt-6 text-center text-sm text-slate-600"><Link to="/login" className="font-semibold text-blue-600 hover:underline">Back to login</Link></p>
        </div>
      </div>
    </main>
  );
}
