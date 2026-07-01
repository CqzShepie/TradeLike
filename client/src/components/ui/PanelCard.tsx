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
    <Card as="section" className="shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}
