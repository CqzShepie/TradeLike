import type { ReactNode } from "react";
import { classNames } from "./classNames";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={classNames("mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between", className)}>
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{eyebrow}</p>
        )}
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        {description && <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3 lg:justify-end">{actions}</div>}
    </header>
  );
}
