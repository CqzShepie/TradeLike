import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, LogOut, RotateCcw } from "lucide-react";

import {
  clearAccessSession,
  copyableAccessDiagnostics,
  getAccessReasonMessage,
  shouldShowAccessDiagnostics,
  type AccessDiagnostic,
} from "./accessDiagnostics";

type AccessDiagnosticsPanelProps = {
  diagnostic: AccessDiagnostic;
};

export default function AccessDiagnosticsPanel({ diagnostic }: AccessDiagnosticsPanelProps) {
  const [copyStatus, setCopyStatus] = useState("");
  const navigate = useNavigate();

  if (!shouldShowAccessDiagnostics(diagnostic)) {
    return null;
  }

  async function copyDiagnostics() {
    await navigator.clipboard?.writeText(copyableAccessDiagnostics(diagnostic));
    setCopyStatus("Copied");
  }

  function clearAndSignIn() {
    clearAccessSession();
    navigate(`/login?returnUrl=${encodeURIComponent(diagnostic.currentRoute)}`);
  }

  const loginAudience = diagnostic.reasonBlocked === "customer-trying-staff-area" ? "staff" : "customer";

  return (
    <aside className="mt-6 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-left text-amber-50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-amber-200">Access diagnostics</h2>
          <p className="mt-1 text-xs text-amber-100">{getAccessReasonMessage(diagnostic.reasonBlocked)}</p>
        </div>
        <span className="rounded-full bg-amber-200/15 px-3 py-1 text-xs font-semibold text-amber-100">
          {diagnostic.environmentMode}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        {diagnosticRows(diagnostic).map(row => (
          <div key={row.label} className="rounded-lg bg-slate-950/30 px-3 py-2">
            <dt className="font-semibold text-amber-200">{row.label}</dt>
            <dd className="mt-1 break-words text-slate-100">{row.value || "Not set"}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={clearAndSignIn} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500">
          <LogOut className="h-4 w-4" />
          Clear session and sign in again
        </button>
        <button type="button" onClick={() => void copyDiagnostics()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">
          <Copy className="h-4 w-4" />
          Copy diagnostics
        </button>
        <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">
          <RotateCcw className="h-4 w-4" />
          Back to dashboard
        </Link>
        <Link to={`/login?audience=${loginAudience}`} className="inline-flex rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">
          {loginAudience === "staff" ? "Staff login" : "Customer login"}
        </Link>
        {copyStatus && <span className="self-center text-xs font-bold text-emerald-200">{copyStatus}</span>}
      </div>
    </aside>
  );
}

function diagnosticRows(diagnostic: AccessDiagnostic) {
  return [
    { label: "Email", value: diagnostic.email },
    { label: "Role", value: diagnostic.role },
    { label: "Plan", value: diagnostic.plan },
    { label: "Billing status", value: diagnostic.billingStatus },
    { label: "Account status", value: diagnostic.accountStatus },
    { label: "Tenant", value: diagnostic.tenantId == null ? null : String(diagnostic.tenantId) },
    { label: "Feature", value: diagnostic.requiredFeature },
    { label: "Minimum plan", value: diagnostic.requiredMinimumPlan },
    { label: "Required roles", value: diagnostic.requiredRoles.join(", ") },
    { label: "Reason", value: diagnostic.reasonBlocked },
    { label: "Route", value: diagnostic.currentRoute },
  ];
}
