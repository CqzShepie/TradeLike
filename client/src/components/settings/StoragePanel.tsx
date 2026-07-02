import { useEffect, useState } from "react";
import { HardDrive, Plus } from "lucide-react";

import { Button, InlineAlert, PanelCard } from "../ui";
import {
  STORAGE_LIMIT_BLOCKED_MESSAGE,
  storageService,
  type StorageUsage,
} from "../../services/storageService";

export default function StoragePanel() {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    storageService.getUsage()
      .then(result => {
        if (!cancelled) setUsage(result);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? friendlyStorageError(err.message) : "Unable to load storage usage.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function requestAddOn(code: string) {
    setSavingCode(code);
    setError("");
    setMessage("");

    try {
      await storageService.requestAddOn(code);
      setMessage("Storage add-on request created. Your quota increases after payment is confirmed.");
      setUsage(await storageService.getUsage());
    } catch (err) {
      setError(err instanceof Error ? friendlyStorageError(err.message) : "Storage add-on request could not be saved.");
    } finally {
      setSavingCode(null);
    }
  }

  return (
    <PanelCard title="Storage">
      {loading && <p className="text-sm text-slate-300">Loading storage usage...</p>}
      {error && <InlineAlert tone="error">{error}</InlineAlert>}
      {message && <InlineAlert tone="success">{message}</InlineAlert>}

      {usage && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-blue-200">
                  <HardDrive className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-lg font-bold text-white">
                    {formatBytes(usage.usedStorageBytes)} of {formatBytes(usage.effectiveLimitBytes)} used
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {formatBytes(usage.availableBytes)} available across your account. Storage does not refresh monthly.
                  </p>
                </div>
              </div>
              <span className={warningClass(usage.warningLevel)}>{warningLabel(usage.warningLevel)}</span>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${usage.warningLevel === "Blocked" ? "bg-red-400" : usage.warningLevel === "Critical" ? "bg-amber-300" : "bg-blue-400"}`}
                style={{ width: `${Math.min(100, usage.usedPercent)}%` }}
                aria-label={`${usage.usedPercent}% storage used`}
              />
            </div>

            {!usage.canUpload && (
              <div className="mt-4">
                <InlineAlert tone="error">{STORAGE_LIMIT_BLOCKED_MESSAGE}</InlineAlert>
              </div>
            )}
            {usage.warningLevel === "Warning" && (
              <p className="mt-4 text-sm font-semibold text-amber-100">You have used more than 80% of your storage.</p>
            )}
            {usage.warningLevel === "Critical" && (
              <p className="mt-4 text-sm font-semibold text-amber-100">You have used more than 95% of your storage. Add storage soon to avoid blocked uploads.</p>
            )}
          </div>

          {usage.activeAddOns.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {usage.activeAddOns.map(addOn => (
                <div key={addOn.id} className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4">
                  <p className="font-bold text-white">{addOn.label}</p>
                  <p className="mt-1 text-sm text-blue-100">{formatCurrency(addOn.monthlyPricePence)} / month - {addOn.status}</p>
                  {addOn.cancelAtPeriodEnd && <p className="mt-2 text-xs font-semibold text-amber-100">Cancels at period end. Existing files remain available.</p>}
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-200">Storage add-ons</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {usage.addOnPlans.map(plan => (
                <div key={plan.code} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="font-bold text-white">{plan.label}</p>
                  <p className="mt-1 text-sm text-slate-300">{formatCurrency(plan.monthlyPricePence)} / month</p>
                  <p className="mt-2 text-xs text-slate-400">Adds {formatBytes(plan.extraStorageBytes)} to your account allowance after payment is confirmed.</p>
                  <Button className="mt-4" variant="secondary" loading={savingCode === plan.code} onClick={() => requestAddOn(plan.code)}>
                    <Plus className="h-4 w-4" />Add storage
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <p className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-slate-300">
            Storage is for normal business use inside TradeLike, including job files, customer documents, photos, PDFs, certificates and generated previews. It is not for public file hosting, bulk file sharing, unrelated backups or resale of storage.
          </p>
        </div>
      )}
    </PanelCard>
  );
}

function warningClass(level: string) {
  const base = "rounded-full border px-3 py-1 text-xs font-bold";
  if (level === "Blocked") return `${base} border-red-300/40 bg-red-500/15 text-red-100`;
  if (level === "Critical") return `${base} border-amber-300/40 bg-amber-500/15 text-amber-100`;
  if (level === "Warning") return `${base} border-amber-300/40 bg-amber-500/15 text-amber-100`;
  return `${base} border-emerald-300/30 bg-emerald-500/15 text-emerald-100`;
}

function warningLabel(level: string) {
  return level === "OK" ? "Healthy" : level;
}

function formatBytes(value: number) {
  if (value >= 1_000_000_000_000) return `${trim(value / 1_000_000_000_000)}TB`;
  return `${trim(value / 1_000_000_000)}GB`;
}

function trim(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatCurrency(valuePence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(valuePence / 100);
}

function friendlyStorageError(message: string) {
  if (/stack|exception|sql|trace|system\./i.test(message)) {
    return "Storage details could not be loaded. Please try again or contact support.";
  }

  return message || "Storage details could not be loaded.";
}
