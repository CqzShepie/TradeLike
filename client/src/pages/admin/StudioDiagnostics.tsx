import { Link } from "react-router-dom";
import { authService } from "../../services/authService";
import type { AuthUser } from "../../services/authService";
import { Badge } from "./adminPortalComponents";

const routeSummary = [
  "/admin",
  "/staff-login",
  "/dashboard",
  "/customers",
  "/jobs",
  "/quotes",
  "/calendar",
  "/settings",
];

const permissionKeys: (keyof AuthUser)[] = [
  "canManageAccounts",
  "canManageStaff",
  "canManageBilling",
  "canManageSecurity",
  "canViewAuditLogs",
  "canCreateCustomers",
  "canEditCustomers",
  "canResetPasswords",
  "canVerifyEmails",
  "canSendEmails",
  "canViewBilling",
  "canManageSubscriptions",
  "canExportData",
  "canViewStaff",
  "canEditStaffPermissions",
];

export default function StudioDiagnostics({ currentUser }: { currentUser: AuthUser | null }) {
  const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5001/api";
  const token = authService.getToken();
  const hasToken = Boolean(token);
  const tenantId = getTenantIdFromToken(token);
  const safeDiagnostics = {
    apiBaseUrl,
    mode: import.meta.env.MODE,
    userId: currentUser?.id ?? null,
    tenantId,
    email: currentUser?.email ?? null,
    role: currentUser?.role ?? null,
    plan: currentUser?.plan ?? null,
    accountStatus: currentUser?.accountStatus ?? null,
    hasToken,
    storage: {
      hasUser: Boolean(localStorage.getItem("tradelike_user")),
      hasToken,
    },
  };

  function copyDiagnostics() {
    navigator.clipboard?.writeText(JSON.stringify(safeDiagnostics, null, 2)).catch(() => undefined);
  }

  function clearSession() {
    authService.logout();
    window.location.href = "/staff-login";
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Diagnostics</h2>
            <p className="mt-1 text-sm text-slate-400">Safe client-side information for diagnosing access and routing issues. Secrets and tokens are never displayed.</p>
          </div>
          <button type="button" onClick={copyDiagnostics} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">Copy safe diagnostics</button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Current session">
          <Info label="API base URL" value={apiBaseUrl} />
          <Info label="Build mode" value={import.meta.env.MODE} />
          <Info label="Session token" value={hasToken ? "Present, hidden" : "Missing"} />
          <Info label="Stored user" value={localStorage.getItem("tradelike_user") ? "Present" : "Missing"} />
          <Info label="Authenticated user" value={currentUser?.email ?? "None"} />
          <Info label="Tenant ID" value={tenantId ?? "Unknown"} />
          <Info label="Role" value={currentUser?.role ?? "Unknown"} />
          <Info label="Plan" value={currentUser?.plan ?? "Unknown"} />
          <Info label="Account status" value={currentUser?.accountStatus ?? "Unknown"} />
        </Panel>

        <Panel title="Feature gates">
          <div className="grid gap-2 sm:grid-cols-2">
            {permissionKeys.map(key => (
              <div key={String(key)} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                <span className="truncate text-xs text-slate-400">{String(key).replace(/^can/, "Can ")}</span>
                <Badge>{currentUser?.[key] ? "On" : "Off"}</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Allowed routes summary">
        <div className="flex flex-wrap gap-2">
          {routeSummary.map(route => <Badge key={route}>{route}</Badge>)}
        </div>
      </Panel>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <h3 className="text-lg font-bold text-white">Session actions</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={clearSession} className="rounded-lg border border-red-500/50 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/10">Clear local session</button>
          <Link to="/staff-login" className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Go to staff login</Link>
          <Link to="/login" className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Go to customer login</Link>
        </div>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"><h3 className="text-lg font-bold text-white">{title}</h3><div className="mt-4 space-y-3">{children}</div></section>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="truncate font-semibold text-white">{value}</span>
    </div>
  );
}

function getTenantIdFromToken(token: string | null) {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const parsed = JSON.parse(window.atob(padded)) as Record<string, unknown>;
    const value = parsed.tid ?? parsed.tenantId;
    return typeof value === "string" || typeof value === "number" ? String(value) : null;
  } catch {
    return null;
  }
}
