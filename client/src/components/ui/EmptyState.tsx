import type { ReactNode } from "react";

type EmptyStateProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
  action?: ReactNode;
};

function EmptyState({
  title,
  description,
  children,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-8 py-12 text-center">
      {title && <h3 className="text-lg font-bold text-slate-950">{title}</h3>}
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>}
      {children && <div className="mt-2 text-sm leading-6 text-slate-500">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export default EmptyState;
