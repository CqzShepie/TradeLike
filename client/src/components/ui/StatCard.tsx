import type { ReactNode } from "react";
import { classNames } from "./classNames";

type StatCardProps = {
  title: string;
  value: string;
  description?: string;
  icon?: ReactNode;
  tone?: "light" | "dark";
};

function StatCard({
  title,
  value,
  description,
  icon,
  tone = "light",
}: StatCardProps) {
  return (
    <div
      className={classNames(
        "rounded-xl border p-5 shadow-sm",
        tone === "dark"
          ? "border-white/10 bg-slate-900/90 text-white shadow-lg shadow-slate-950/20"
          : "border-slate-200 bg-white text-slate-950"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <p className={classNames("text-sm font-semibold", tone === "dark" ? "text-slate-100" : "text-slate-500")}>
          {title}
        </p>
        {icon && <div className={tone === "dark" ? "text-blue-300" : "text-blue-600"}>{icon}</div>}
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {description && (
        <p className={classNames("mt-2 text-xs leading-5", tone === "dark" ? "text-slate-300" : "text-slate-500")}>
          {description}
        </p>
      )}
    </div>
  );
}

export default StatCard;
