import { useMemo, useState } from "react";
import type { AdminAuditLog } from "../../types/admin";
import { AuditLogRow, Badge } from "./adminPortalComponents";

export default function StudioAuditLogCenter({
  auditLogs,
  loading,
  search,
  onSearchChange,
  onSearch,
}: {
  auditLogs: AdminAuditLog[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
}) {
  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const visibleLogs = useMemo(() => {
    const actor = actorFilter.trim().toLowerCase();
    const action = actionFilter.trim().toLowerCase();
    return auditLogs.filter(log => {
      const actorMatches = actor === "" || [log.actorName, log.actorEmail, log.actorRole].some(value => value.toLowerCase().includes(actor));
      const actionMatches = action === "" || [log.action, log.targetType, log.targetEmail ?? "", log.summary].some(value => value.toLowerCase().includes(action));
      const dateMatches = dateFilter === "" || log.createdAt.startsWith(dateFilter);
      return actorMatches && actionMatches && dateMatches;
    });
  }, [actionFilter, actorFilter, auditLogs, dateFilter]);

  function exportVisibleCsv() {
    const rows = [
      ["Created", "Actor", "Role", "Action", "Target", "Summary"],
      ...visibleLogs.map(log => [
        log.createdAt,
        log.actorEmail,
        log.actorRole,
        log.action,
        log.targetEmail ?? String(log.targetId ?? ""),
        log.summary,
      ]),
    ];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tradelike-studio-audit.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Audit log</h2>
            <p className="mt-1 text-sm text-slate-400">Search staff actions, customer targets, reasons and changed fields.</p>
          </div>
          <button type="button" onClick={exportVisibleCsv} disabled={visibleLogs.length === 0} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            Export visible CSV
          </button>
        </div>

        <form onSubmit={event => { event.preventDefault(); onSearch(); }} className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_150px_auto]">
          <input value={search} onChange={event => onSearchChange(event.target.value)} placeholder="Search server audit logs" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
          <input value={actorFilter} onChange={event => setActorFilter(event.target.value)} placeholder="Actor" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
          <input value={actionFilter} onChange={event => setActionFilter(event.target.value)} placeholder="Action or target" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
          <input value={dateFilter} onChange={event => setDateFilter(event.target.value)} type="date" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
          <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Search</button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <h3 className="text-lg font-bold text-white">Latest admin actions</h3>
          <Badge>{visibleLogs.length} shown</Badge>
        </div>
        {loading ? <div className="p-5 text-sm text-slate-400">Loading audit logs...</div> : visibleLogs.length === 0 ? (
          <div className="p-5 text-sm text-slate-400">No audit logs match these filters.</div>
        ) : (
          <div className="max-h-[720px] divide-y divide-slate-800 overflow-y-auto">
            {visibleLogs.map(log => (
              <div key={log.id}>
                <AuditLogRow log={log} />
                {log.details && (
                  <details className="border-t border-slate-800 bg-slate-950 px-5 py-3 text-xs text-slate-400">
                    <summary className="cursor-pointer font-semibold text-slate-300">Show technical details</summary>
                    <pre className="mt-3 whitespace-pre-wrap break-words">{log.details}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

