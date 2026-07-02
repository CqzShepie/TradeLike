import { Link, useLocation } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import PageLayout from "../components/ui/PageLayout";
import AccessDiagnosticsPanel from "../components/diagnostics/AccessDiagnosticsPanel";
import { buildAccessDiagnostic, getAccessReasonMessage, readRawStoredUser } from "../components/diagnostics/accessDiagnostics";
import { authService } from "../services/authService";
import { findNavigationItemByPath } from "../routes/navigationConfig";

type UpgradeRequiredProps = {
  featureName?: string;
  minimumPlan?: string;
};

export default function UpgradeRequired({ featureName, minimumPlan }: UpgradeRequiredProps) {
  const location = useLocation();
  const rawUser = readRawStoredUser();
  const user = authService.getUser() ?? rawUser;
  const route = `${location.pathname}${location.search}`;
  const navigationItem = findNavigationItemByPath(location.pathname);
  const featureLabel = featureName ? `${featureName} is locked` : "Upgrade required";
  const requiredMinimumPlan = minimumPlan ?? navigationItem?.minimumPlan;
  const planLabel = requiredMinimumPlan ? `${requiredMinimumPlan} plan` : "a higher TradeLike plan";
  const diagnostic = buildAccessDiagnostic({
    user,
    route,
    requiredFeature: navigationItem?.feature ?? featureName,
    requiredMinimumPlan,
    requiredRoles: navigationItem?.requiredRoles,
  });
  const reasonMessage = getAccessReasonMessage(diagnostic.reasonBlocked);

  return (
    <PageLayout className="bg-slate-950 text-white" contentClassName="flex items-center justify-center">
      <section className="w-full max-w-2xl rounded-2xl border border-blue-400/20 bg-slate-900/80 p-8 text-center shadow-2xl shadow-slate-950/40">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">{featureLabel}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {reasonMessage} This feature unlocks on {planLabel}. Directors can review billing and plan limits from Settings.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" to="/settings/billing">
            View plans / billing
          </Link>
          <Link className="inline-flex rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500" to="/dashboard">
            Back to dashboard
          </Link>
        </div>
        <AccessDiagnosticsPanel diagnostic={diagnostic} />
      </section>
    </PageLayout>
  );
}
