import { Link } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import PageLayout from "../components/ui/PageLayout";

export default function UpgradeRequired() {
  return (
    <PageLayout className="bg-slate-950 text-white" contentClassName="flex items-center justify-center">
      <section className="w-full max-w-xl rounded-2xl border border-blue-400/20 bg-slate-900/80 p-8 text-center shadow-2xl shadow-slate-950/40">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Upgrade required</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          This feature is available on a higher TradeLike plan. Directors can review billing and plan limits from Settings.
        </p>
        <Link className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500" to="/settings/billing">
          View billing
        </Link>
      </section>
    </PageLayout>
  );
}
