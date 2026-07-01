import { useEffect, useState } from "react";

export type DashboardLayoutItem = {
  id: string;
  title: string;
  type: "KPI" | "Line" | "Bar" | "Table";
  x: number;
  y: number;
  w: number;
  h: number;
};

type DashboardLayoutBuilderProps = {
  initialItems: DashboardLayoutItem[];
  onLayoutChange?: (layoutJson: string) => void;
};

export default function DashboardLayoutBuilder({ initialItems, onLayoutChange }: DashboardLayoutBuilderProps) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  function move(itemId: string) {
    setItems(previous => {
      const next = previous.map(item => item.id === itemId ? { ...item, x: item.x + 1 } : item);
      onLayoutChange?.(JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map(item => (
        <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-blue-700">{item.type}</p>
          <h3 className="mt-1 font-semibold text-slate-950">{item.title}</h3>
          <p className="mt-2 text-sm text-slate-600">x{item.x} y{item.y} · {item.w}x{item.h}</p>
          <button
            type="button"
            onClick={() => move(item.id)}
            className="mt-4 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Move widget
          </button>
        </article>
      ))}
    </div>
  );
}
