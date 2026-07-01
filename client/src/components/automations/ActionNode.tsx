import type { AutomationNodeProps } from "./TriggerNode";

export default function ActionNode({ id, label, selected = false, onSelect }: AutomationNodeProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(id)}
      className={`rounded-lg border px-4 py-3 text-left shadow-sm transition ${selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}
    >
      <span className="block text-xs font-bold uppercase text-blue-700">Action</span>
      <span className="mt-1 block text-sm font-semibold text-slate-950">{label}</span>
    </button>
  );
}
