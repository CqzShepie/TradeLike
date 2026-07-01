import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import PageLayout from "../components/ui/PageLayout";

export default function AccessDenied() {
  return (
    <PageLayout className="bg-slate-950 text-white" contentClassName="flex items-center justify-center">
      <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl shadow-slate-950/40">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          This area is restricted for your current role. Your TradeLike workspace is still available from the main navigation.
        </p>
        <Link className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500" to="/dashboard">
          Back to dashboard
        </Link>
      </section>
    </PageLayout>
  );
}
