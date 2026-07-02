import type { ReactNode } from "react";
import { classNames } from "./classNames";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  eyebrow?: string;
  className?: string;
  tone?: "light" | "dark";
};

function SectionHeader({
  title,
  subtitle,
  action,
  eyebrow,
  className,
  tone = "light",
}: SectionHeaderProps) {
  const isDark = tone === "dark";

  return (
    <div className={classNames("mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className={classNames("text-xs font-semibold uppercase tracking-wide", isDark ? "text-blue-300" : "text-blue-700")}>{eyebrow}</p>
        )}
        <h2 className={classNames("text-2xl font-bold", isDark ? "text-white" : "text-slate-950")}>{title}</h2>
        {subtitle && <p className={classNames("mt-1.5 text-sm leading-6", isDark ? "text-slate-300" : "text-slate-500")}>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default SectionHeader;
