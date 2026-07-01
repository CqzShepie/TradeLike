import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../../components/layout/Sidebar";
import { useAuth } from "../../../hooks/useAuth";
import { apiClient } from "../../../services/apiClient";

type Workflow = {
  id: number;
  name: string;
  isActive: boolean;
  enabled: boolean;
  maxRunAttempts: number;
};

const triggers = ["InvoicePaid", "JobOverdue"];
const actions = ["SendWebhook", "ApplyDiscount", "ChangeJobStatus"];

function workflowLimit(plan: string | null) {
  switch ((plan ?? "Solo").toLowerCase()) {
    case "team":
      return 3;
    case "business":
      return 10;
    case "enterprise":
      return Number.POSITIVE_INFINITY;
    default:
      return 0;
  }
}

export default function AutomationsPage() {
  const { plan } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [name, setName] = useState("Invoice paid follow-up");
  const [trigger, setTrigger] = useState(triggers[0]);
  const [action, setAction] = useState(actions[0]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const limit = workflowLimit(plan);
  const activeCount = useMemo(() => workflows.filter(item => item.enabled && item.isActive).length, [workflows]);
  const limitExceeded = activeCount >= limit;

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<Workflow[]>("/workflows")
      .then(rows => {
        if (!cancelled) setWorkflows(rows);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load automations.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function createWorkflow() {
    if (limitExceeded) {
      setError("Upgrade required to create more active workflows.");
      return;
    }

    try {
      setError("");
      const created = await apiClient.post<Workflow>("/workflows", {
        name,
        isActive: true,
        enabled: true,
        maxRunAttempts: 3,
        definition: {
          nodes: [
            { id: "trigger", type: trigger },
            { id: "action", type: action },
          ],
        },
      });
      setWorkflows(previous => [created, ...previous]);
      setMessage("Automation created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create automation.");
    }
  }

  async function toggleWorkflow(workflow: Workflow) {
    const nextEnabled = !workflow.enabled;
    if (nextEnabled && activeCount >= limit) {
      setError("Upgrade required to enable more workflows.");
      return;
    }

    await apiClient.put(`/workflows/${workflow.id}/enabled`, { enabled: nextEnabled });
    setWorkflows(previous => previous.map(item => item.id === workflow.id ? { ...item, enabled: nextEnabled, isActive: nextEnabled } : item));
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <section className="min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Settings</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Workflow automations</h1>
          <p className="mt-2 text-sm text-slate-600">Create premium workflow rules for invoice and job events.</p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Plan usage</h2>
                <p className="text-sm text-slate-600">
                  {Number.isFinite(limit) ? `${activeCount} of ${limit} active workflows used.` : `${activeCount} active workflows. Enterprise has no limit.`}
                </p>
              </div>
              {limitExceeded && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Premium limit reached</span>}
            </div>
          </div>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Create rule</h2>
              {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
              {message && <p className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">{message}</p>}
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Name
                <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" value={name} onChange={event => setName(event.target.value)} />
              </label>
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Trigger
                <select className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" value={trigger} onChange={event => setTrigger(event.target.value)}>
                  {triggers.map(item => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Action
                <select className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2" value={action} onChange={event => setAction(event.target.value)}>
                  {actions.map(item => <option key={item}>{item}</option>)}
                </select>
              </label>
              <button type="button" disabled={limitExceeded} onClick={createWorkflow} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400">
                Create automation
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Active workflows</h2>
              {loading && <p className="mt-4 text-sm text-slate-500">Loading automations...</p>}
              {!loading && workflows.length === 0 && <p className="mt-4 text-sm text-slate-500">No automations yet.</p>}
              <div className="mt-4 space-y-3">
                {workflows.map(workflow => (
                  <article key={workflow.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                    <div>
                      <p className="font-semibold text-slate-950">{workflow.name}</p>
                      <p className="text-xs text-slate-500">Max attempts: {workflow.maxRunAttempts}</p>
                    </div>
                    <button type="button" onClick={() => toggleWorkflow(workflow)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      {workflow.enabled ? "Disable" : "Enable"}
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
