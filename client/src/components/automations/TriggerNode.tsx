export type AutomationNodeProps = {
  id: string;
  label: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

export default function TriggerNode({ id, label, selected = false, onSelect }: AutomationNodeProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(id)}
      className={`rounded-lg border px-4 py-3 text-left shadow-sm transition ${selected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}
    >
      <span className="block text-xs font-bold uppercase text-emerald-700">Trigger</span>
      <span className="mt-1 block text-sm font-semibold text-slate-950">{label}</span>
    </button>
  );
}
