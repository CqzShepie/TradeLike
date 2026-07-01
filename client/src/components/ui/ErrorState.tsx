import type { ReactNode } from "react";

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  tone?: "light" | "dark";
};

export default function ErrorState({
  title = "Something went wrong",
  description = "Please try again.",
  action,
  tone = "dark",
}: ErrorStateProps) {
  const isDark = tone === "dark";

  return (
    <div
      role="alert"
      className={
        isDark
          ? "rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-red-100 shadow-2xl shadow-slate-950/20"
          : "rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"
      }
    >
      <h3 className="text-base font-bold">{title}</h3>
      <p className={isDark ? "mt-2 text-sm leading-6 text-red-100/80" : "mt-2 text-sm leading-6"}>{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
