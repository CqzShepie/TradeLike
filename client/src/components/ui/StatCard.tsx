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
          ? "border-slate-800 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-950"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <p className={classNames("text-sm font-medium", tone === "dark" ? "text-slate-300" : "text-slate-500")}>
          {title}
        </p>
        {icon && <div className="text-blue-600">{icon}</div>}
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {description && (
        <p className={classNames("mt-2 text-xs leading-5", tone === "dark" ? "text-slate-400" : "text-slate-500")}>
          {description}
        </p>
      )}
    </div>
  );
}

export default StatCard;
