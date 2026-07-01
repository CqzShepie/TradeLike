import type { ReactNode } from "react";
import { classNames } from "./classNames";

type AlertTone = "success" | "error" | "warning" | "info";

type InlineAlertProps = {
  tone: AlertTone;
  children: ReactNode;
  title?: string;
  onClose?: () => void;
};

const alertClasses: Record<AlertTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export default function InlineAlert({
  tone,
  children,
  title,
  onClose,
}: InlineAlertProps) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={classNames("flex items-start justify-between gap-4 rounded-xl border p-4 text-sm", alertClasses[tone])}>
      <div>
        {title && <p className="font-bold">{title}</p>}
        <div className={title ? "mt-1 leading-6" : "leading-6"}>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss message"
          className="rounded-md px-2 text-lg font-bold leading-none hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          x
        </button>
      )}
    </div>
  );
}
