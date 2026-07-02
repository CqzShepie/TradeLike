import { useState } from "react";

import { adminStorageService, type AdminStorageTenant } from "../../services/adminStorageService";

export default function StudioStorageTools() {
  const [tenantId, setTenantId] = useState("");
  const [overrideGb, setOverrideGb] = useState("");
  const [reason, setReason] = useState("");
  const [tenant, setTenant] = useState<AdminStorageTenant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const parsedTenantId = Number(tenantId);
    if (!Number.isFinite(parsedTenantId) || parsedTenantId <= 0) {
      setError("Enter a valid tenant id.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      setTenant(await adminStorageService.getTenantStorage(parsedTenantId));
    } catch (err) {
      setError(err instanceof Error ? friendlyError(err.message) : "Unable to load tenant storage.");
    } finally {
      setLoading(false);
    }
  }

  async function recalculate() {
    if (!tenant) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const usage = await adminStorageService.recalculateTenantStorage(tenant.tenantId);
      setTenant({ ...tenant, usage });
      setMessage("Storage usage recalculated.");
    } catch (err) {
      setError(err instanceof Error ? friendlyError(err.message) : "Unable to recalculate storage.");
    } finally {
      setLoading(false);
    }
  }

  async function saveOverride() {
    if (!tenant) return;
    if (reason.trim() === "") {
      setError("Reason is required for manual storage changes.");
      return;
    }

    const overrideBytes = overrideGb.trim() === "" ? null : Math.round(Number(overrideGb) * 1_000_000_000);
    if (overrideBytes !== null && (!Number.isFinite(overrideBytes) || overrideBytes < 0)) {
      setError("Enter a valid override in GB, or leave it blank to clear.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      const next = await adminStorageService.setManualOverride(tenant.tenantId, overrideBytes, reason);
      setTenant(next);
      setMessage("Manual storage override saved.");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? friendlyError(err.message) : "Unable to save storage override.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <h2 className="text-lg font-bold text-white">Storage governance</h2>
      <p className="mt-1 text-sm text-slate-400">Review tenant storage, recalculate usage, and set Enterprise/custom overrides with an audit reason.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-[160px_auto]">
        <input
          value={tenantId}
          onChange={event => setTenantId(event.target.value)}
          placeholder="Tenant id"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <button type="button" onClick={load} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-700">
          Load storage
        </button>
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
      {message && <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p>}

      {tenant && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Tenant" value={tenant.businessName || tenant.email || String(tenant.tenantId)} />
            <Metric label="Used" value={formatBytes(tenant.usage.usedStorageBytes)} />
            <Metric label="Allowance" value={formatBytes(tenant.usage.effectiveLimitBytes)} />
            <Metric label="Status" value={tenant.usage.warningLevel} />
          </div>

          <div className="grid gap-3 md:grid-cols-[160px_1fr_auto_auto]">
            <input
              value={overrideGb}
              onChange={event => setOverrideGb(event.target.value)}
              placeholder="Override GB"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <input
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder="Audit reason"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <button type="button" onClick={saveOverride} disabled={loading} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:text-slate-500">
              Save override
            </button>
            <button type="button" onClick={recalculate} disabled={loading} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:text-slate-500">
              Recalculate
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-white">{value}</p></div>;
}

function formatBytes(value: number) {
  if (value >= 1_000_000_000_000) return `${trim(value / 1_000_000_000_000)}TB`;
  return `${trim(value / 1_000_000_000)}GB`;
}

function trim(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function friendlyError(message: string) {
  if (/stack|exception|sql|trace|system\./i.test(message)) {
    return "Storage details could not be loaded. Please try again.";
  }

  return message || "Storage details could not be loaded.";
}
