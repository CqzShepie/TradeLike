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
    <section className={classNames("overflow-hidden rounded-xl border border-white/10 bg-slate-950/50 shadow-sm", className)}>
      {(title || description) && (
        <div className="border-b border-white/10 px-5 py-4">
          {title && <h2 className="text-lg font-bold text-white">{title}</h2>}
          {description && <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
