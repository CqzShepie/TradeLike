import type { ReactNode } from "react";

type AlertTone = "success" | "error" | "warning" | "info";

const alertClasses: Record<AlertTone, string> = {
  success: "border-green-200 bg-green-50 text-green-700",
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

export default function InlineAlert({ tone, children, onClose }: { tone: AlertTone; children: ReactNode; onClose?: () => void }) {
  return <div className={`flex items-start justify-between gap-4 rounded-xl border p-4 text-sm font-medium ${alertClasses[tone]}`}><span>{children}</span>{onClose && <button type="button" onClick={onClose} className="rounded px-2 text-lg leading-none hover:bg-white/70">×</button>}</div>;
}
