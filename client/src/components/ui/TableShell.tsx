import type { ReactNode } from "react";
import { classNames } from "./classNames";

type TableShellProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
};

export default function TableShell({
  children,
  title,
  description,
  className,
}: TableShellProps) {
  return (
    <section className={classNames("overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {(title || description) && (
        <div className="border-b border-slate-200 px-5 py-4">
          {title && <h2 className="text-lg font-bold text-slate-950">{title}</h2>}
          {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
