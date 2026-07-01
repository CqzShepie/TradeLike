import type { ReactNode } from "react";

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

export default function ErrorState({
  title = "Something went wrong",
  description = "Please try again.",
  action,
}: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
