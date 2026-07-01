import type { ReactNode } from "react";

export default function PanelCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-slate-900">{title}</h2><div className="mt-5">{children}</div></section>;
}
