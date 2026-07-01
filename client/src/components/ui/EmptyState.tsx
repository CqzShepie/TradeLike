import type { ReactNode } from "react";

type EmptyStateProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: "light" | "dark";
};

function EmptyState({
  title,
  description,
  children,
  action,
  tone = "dark",
}: EmptyStateProps) {
  const isDark = tone === "dark";

  return (
    <div
      className={
        isDark
          ? "rounded-2xl border border-dashed border-white/15 bg-slate-900/70 px-8 py-12 text-center"
          : "rounded-xl border border-dashed border-slate-300 bg-white px-8 py-12 text-center"
      }
    >
      {title && <h3 className={isDark ? "text-lg font-bold text-white" : "text-lg font-bold text-slate-950"}>{title}</h3>}
      {description && (
        <p className={isDark ? "mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400" : "mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500"}>
          {description}
        </p>
      )}
      {children && <div className={isDark ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-500"}>{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export default EmptyState;
