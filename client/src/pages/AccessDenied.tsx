import { Link, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import PageLayout from "../components/ui/PageLayout";
import AccessDiagnosticsPanel from "../components/diagnostics/AccessDiagnosticsPanel";
import { buildAccessDiagnostic, getAccessReasonMessage, readRawStoredUser } from "../components/diagnostics/accessDiagnostics";
import { authService } from "../services/authService";
import { navigationConfig, isNavigationItemActive } from "../routes/navigationConfig";

type AccessDeniedProps = {
  requiredRoles?: string[];
  requiredFeature?: string;
};

export default function AccessDenied({ requiredRoles, requiredFeature }: AccessDeniedProps) {
  const location = useLocation();
  const rawUser = readRawStoredUser();
  const user = authService.getUser() ?? rawUser;
  const route = `${location.pathname}${location.search}`;
  const navigationItem = navigationConfig.find(item => isNavigationItemActive(item, location.pathname));
  const diagnostic = buildAccessDiagnostic({
    user,
    route,
    requiredFeature: requiredFeature ?? navigationItem?.feature,
    requiredMinimumPlan: navigationItem?.minimumPlan,
    requiredRoles: requiredRoles ?? navigationItem?.requiredRoles,
  });
  const reasonMessage = getAccessReasonMessage(diagnostic.reasonBlocked);

  return (
    <PageLayout className="bg-slate-950 text-white" contentClassName="flex items-center justify-center">
      <section className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl shadow-slate-950/40">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {reasonMessage}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500" to="/dashboard">
            Back to dashboard
          </Link>
          <Link className="inline-flex rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10" to={diagnostic.reasonBlocked === "customer-trying-staff-area" ? "/login?audience=staff" : "/login?audience=customer"}>
            {diagnostic.reasonBlocked === "customer-trying-staff-area" ? "Staff login" : "Customer login"}
          </Link>
        </div>
        <AccessDiagnosticsPanel diagnostic={diagnostic} />
      </section>
    </PageLayout>
  );
}
