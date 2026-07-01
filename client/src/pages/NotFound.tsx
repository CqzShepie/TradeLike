import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import PageLayout from "../components/ui/PageLayout";

export default function NotFound() {
  return (
    <PageLayout className="bg-slate-950 text-white" contentClassName="flex items-center justify-center">
      <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl shadow-slate-950/40">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
          <SearchX className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          The page you requested is not available in this workspace.
        </p>
        <Link className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500" to="/dashboard">
          Back to dashboard
        </Link>
      </section>
    </PageLayout>
  );
}
