import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Save } from "lucide-react";

import ActionNode from "../../components/automations/ActionNode";
import ConditionNode from "../../components/automations/ConditionNode";
import TriggerNode from "../../components/automations/TriggerNode";
import Sidebar from "../../components/layout/Sidebar";
import { Button, InlineAlert, PageHeader, PageShell, PanelCard } from "../../components/ui";
import { apiClient } from "../../services/apiClient";

type DesignerNode = {
  id: string;
  type: "Trigger" | "Condition" | "Action";
  label: string;
  data: { mode?: "AND" | "OR" };
};

type DesignerEdge = {
  id: string;
  source: string;
  target: string;
};

const starterNodes: DesignerNode[] = [
  { id: "trigger-1", type: "Trigger", label: "Invoice updated", data: {} },
  { id: "condition-1", type: "Condition", label: "Status is paid", data: { mode: "AND" } },
  { id: "action-1", type: "Action", label: "Send webhook", data: {} },
];

export default function DesignerPage() {
  const { workflowId = "1" } = useParams();
  const [nodes] = useState<DesignerNode[]>(starterNodes);
  const [edges, setEdges] = useState<DesignerEdge[]>([]);
  const [selectedId, setSelectedId] = useState("trigger-1");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canSave = useMemo(() => hasReachableAction(nodes, edges), [nodes, edges]);

  function connect(source: string, target: string) {
    setEdges(previous => previous.some(edge => edge.source === source && edge.target === target)
      ? previous
      : [...previous, { id: `${source}-${target}`, source, target }]);
    setMessage("");
    setError("");
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await apiClient.put(`/workflows/${workflowId}/diagram`, { nodes, edges });
      setMessage("Workflow diagram saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save workflow diagram.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell sidebar={<Sidebar />}>
      <PageHeader
        eyebrow="Automations"
        title="Workflow Designer"
        description="Design trigger, condition and action paths for a workflow."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <PanelCard title="Canvas">
          <div className="grid gap-4 md:grid-cols-3">
            {nodes.map(node => (
              <div key={node.id}>
                {node.type === "Trigger" && <TriggerNode id={node.id} label={node.label} selected={selectedId === node.id} onSelect={setSelectedId} />}
                {node.type === "Condition" && <ConditionNode id={node.id} label={node.label} mode={node.data.mode ?? "AND"} selected={selectedId === node.id} onSelect={setSelectedId} />}
                {node.type === "Action" && <ActionNode id={node.id} label={node.label} selected={selectedId === node.id} onSelect={setSelectedId} />}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => connect("trigger-1", "condition-1")}>Connect Trigger to Condition</Button>
            <Button variant="secondary" onClick={() => connect("condition-1", "action-1")}>Connect Condition to Action</Button>
            <Button variant="secondary" onClick={() => connect("trigger-1", "action-1")}>Connect Trigger to Action</Button>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Edges</p>
            <p className="mt-2 text-sm text-slate-600" data-testid="edge-summary">
              {edges.length === 0 ? "No edges" : edges.map(edge => `${edge.source} -> ${edge.target}`).join(", ")}
            </p>
          </div>
        </PanelCard>

        <PanelCard title="Validation">
          {message && <InlineAlert tone="success">{message}</InlineAlert>}
          {error && <InlineAlert tone="error">{error}</InlineAlert>}
          <p className="text-sm leading-6 text-slate-600">
            {canSave ? "A trigger can reach an action." : "Connect a trigger to at least one action."}
          </p>
          <Button className="mt-5" onClick={save} disabled={!canSave} loading={saving}>
            <Save className="mr-2 h-4 w-4" />
            Save diagram
          </Button>
        </PanelCard>
      </div>
    </PageShell>
  );
}

function hasReachableAction(nodes: DesignerNode[], edges: DesignerEdge[]) {
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const triggers = nodes.filter(node => node.type === "Trigger");
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
  }

  for (const trigger of triggers) {
    const queue = [trigger.id];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) continue;
      visited.add(current);

      if (current !== trigger.id && nodeById.get(current)?.type === "Action") {
        return true;
      }

      queue.push(...(adjacency.get(current) ?? []));
    }
  }

  return false;
}
