import { useEffect, useMemo, useState } from "react";

import { apiClient } from "../../../services/apiClient";

interface AuditLog {
  id: number;
  userName: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  diffJson?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAtUtc: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadLogs();
  }, []);

  async function loadLogs() {
    try {
      setError("");
      const query = new URLSearchParams();
      if (from) query.set("from", from);
      if (to) query.set("to", to);
      if (action) query.set("action", action);
      if (entityType) query.set("entityType", entityType);
      const suffix = query.toString();
      setLogs(await apiClient.get<AuditLog[]>(`/audit/logs${suffix ? `?${suffix}` : ""}`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load audit logs.");
    }
  }

  const parsedDiff = useMemo(() => {
    if (!selectedLog?.diffJson) {
      return {};
    }

    try {
      return JSON.parse(selectedLog.diffJson) as Record<string, { old?: unknown; new?: unknown }>;
    } catch {
      return { raw: { old: null, new: selectedLog.diffJson } };
    }
  }, [selectedLog]);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase text-blue-700">Compliance</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Audit logs</h1>

        <div className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-5">
          <input aria-label="From date" type="date" value={from} onChange={event => setFrom(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2" />
          <input aria-label="To date" type="date" value={to} onChange={event => setTo(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2" />
          <input aria-label="Action" value={action} onChange={event => setAction(event.target.value)} placeholder="Action" className="rounded-md border border-slate-300 px-3 py-2" />
          <input aria-label="Entity type" value={entityType} onChange={event => setEntityType(event.target.value)} placeholder="Entity type" className="rounded-md border border-slate-300 px-3 py-2" />
          <button type="button" onClick={loadLogs} className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white">Filter</button>
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {logs.map(log => (
            <button key={log.id} type="button" onClick={() => setSelectedLog(log)} className="grid w-full gap-2 border-b border-slate-200 p-4 text-left last:border-b-0 md:grid-cols-[180px_1fr_160px_120px]">
              <span className="text-sm text-slate-500">{new Date(log.createdAtUtc).toLocaleString()}</span>
              <span><strong className="text-slate-900">{log.action}</strong><span className="ml-2 text-sm text-slate-500">{log.entityType} {log.entityId}</span></span>
              <span className="text-sm text-slate-600">{log.userName || log.userEmail}</span>
              <span className="text-sm font-semibold text-blue-700">View diff</span>
            </button>
          ))}
          {logs.length === 0 ? <p className="p-6 text-sm text-slate-500">No audit logs found.</p> : null}
        </div>
      </section>

      {selectedLog ? (
        <div className="fixed inset-0 grid place-items-center bg-slate-950/50 p-4">
          <section className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900">Change diff</h2>
              <button type="button" onClick={() => setSelectedLog(null)} className="rounded-md border border-slate-300 px-3 py-2">Close</button>
            </div>
            <div className="mt-4 divide-y divide-slate-200 rounded-md border border-slate-200">
              {Object.entries(parsedDiff).map(([field, diff]) => (
                <div key={field} className="grid gap-3 p-4 md:grid-cols-[160px_1fr_1fr]">
                  <strong className="text-slate-900">{field}</strong>
                  <code className="rounded bg-slate-100 p-2 text-xs">{JSON.stringify(diff.old)}</code>
                  <code className="rounded bg-slate-100 p-2 text-xs">{JSON.stringify(diff.new)}</code>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
