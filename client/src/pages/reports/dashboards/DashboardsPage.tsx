import { useState } from "react";
import { Plus, Save } from "lucide-react";

import DashboardLayoutBuilder from "../../../components/dashboards/DashboardLayoutBuilder";
import type { DashboardLayoutItem } from "../../../components/dashboards/DashboardLayoutBuilder";
import Sidebar from "../../../components/layout/Sidebar";
import { Button, InlineAlert, PageHeader, PageShell, PanelCard, TextInput } from "../../../components/ui";
import { apiClient } from "../../../services/apiClient";

const palette: DashboardLayoutItem[] = [
  { id: "revenue", title: "Revenue KPI", type: "KPI", x: 0, y: 0, w: 1, h: 1 },
  { id: "job-status", title: "Job Status Pie", type: "Bar", x: 1, y: 0, w: 1, h: 1 },
  { id: "expense-bar", title: "Expense Bar", type: "Bar", x: 2, y: 0, w: 1, h: 1 },
];

export default function DashboardsPage() {
  const [name, setName] = useState("Operations dashboard");
  const [items, setItems] = useState<DashboardLayoutItem[]>([palette[0]]);
  const [layoutJson, setLayoutJson] = useState(JSON.stringify([palette[0]]));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function addWidget(item: DashboardLayoutItem) {
    if (items.some(existing => existing.id === item.id)) return;
    const next = [...items, item];
    setItems(next);
    setLayoutJson(JSON.stringify(next));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      await apiClient.post("/dashboards", {
        name,
        layoutJson,
        widgets: items.map(item => ({
          type: item.type,
          queryJson: JSON.stringify({ metric: item.id === "revenue" ? "revenue" : "jobStatus" }),
          positionJson: JSON.stringify(item),
        })),
      });
      setMessage("Dashboard saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save dashboard.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell sidebar={<Sidebar />}>
      <PageHeader eyebrow="Reports" title="Saved Dashboards" description="Create custom dashboard layouts and reusable widget sets." />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <PanelCard title="Widget palette">
          <div className="space-y-3">
            {palette.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => addWidget(item)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                {item.title}
                <Plus className="h-4 w-4" />
              </button>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="Dashboard">
          <div className="mb-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <TextInput value={name} onChange={event => setName(event.target.value)} aria-label="Dashboard name" />
            <Button onClick={save} loading={saving}>
              <Save className="mr-2 h-4 w-4" />
              Save dashboard
            </Button>
          </div>

          {message && <InlineAlert tone="success">{message}</InlineAlert>}
          {error && <InlineAlert tone="error">{error}</InlineAlert>}

          <div className="mt-5">
            <DashboardLayoutBuilder initialItems={items} onLayoutChange={setLayoutJson} />
          </div>

          <pre className="mt-5 max-h-48 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-50" data-testid="layout-json">
            {layoutJson}
          </pre>
        </PanelCard>
      </div>
    </PageShell>
  );
}
