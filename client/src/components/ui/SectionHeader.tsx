import type { ReactNode } from "react";
import { classNames } from "./classNames";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  eyebrow?: string;
  className?: string;
};

function SectionHeader({
  title,
  subtitle,
  action,
  eyebrow,
  className,
}: SectionHeaderProps) {
  return (
    <div className={classNames("mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{eyebrow}</p>
        )}
        <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm leading-6 text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default SectionHeader;
