import type { ReactNode } from "react";
import Card from "./Card";

export default function PanelCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card
      as="section"
      tone="dark"
      className="shadow-2xl shadow-slate-950/20 [&_.bg-blue-50]:!bg-blue-500/10 [&_.bg-slate-50]:!bg-slate-950/50 [&_.border-slate-200]:!border-white/10 [&_.text-blue-700]:!text-blue-200 [&_.text-slate-400]:!text-slate-500 [&_.text-slate-500]:!text-slate-400 [&_.text-slate-600]:!text-slate-300 [&_.text-slate-700]:!text-slate-200 [&_.text-slate-900]:!text-white [&_.text-slate-950]:!text-white [&_input]:border-white/10 [&_input]:bg-slate-950/60 [&_input]:text-white [&_select]:border-white/10 [&_select]:bg-slate-950/60 [&_select]:text-white [&_textarea]:border-white/10 [&_textarea]:bg-slate-950/60 [&_textarea]:text-white"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}
