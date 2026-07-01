import type { AutomationNodeProps } from "./TriggerNode";

type ConditionNodeProps = AutomationNodeProps & {
  mode: "AND" | "OR";
};

export default function ConditionNode({ id, label, mode, selected = false, onSelect }: ConditionNodeProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(id)}
      className={`rounded-lg border px-4 py-3 text-left shadow-sm transition ${selected ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"}`}
    >
      <span className="block text-xs font-bold uppercase text-amber-700">Condition · {mode}</span>
      <span className="mt-1 block text-sm font-semibold text-slate-950">{label}</span>
    </button>
  );
}
