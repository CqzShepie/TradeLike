import type { SelectHTMLAttributes } from "react";
import { classNames } from "./classNames";

type SelectInputProps = {
  hasError?: boolean;
} & SelectHTMLAttributes<HTMLSelectElement>;

export default function SelectInput({
  hasError = false,
  className,
  children,
  ...props
}: SelectInputProps) {
  return (
    <select
      className={classNames(
        "w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm font-medium text-white shadow-sm",
        "[&>option]:bg-slate-950 [&>option]:text-white",
        "focus:outline-none focus:ring-2 focus:ring-blue-500",
        "disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-slate-900/60 disabled:text-slate-500",
        hasError ? "border-red-400/70 focus:border-red-400" : "focus:border-blue-500",
        className
      )}
      aria-invalid={hasError || undefined}
      {...props}
    >
      {children}
    </select>
  );
}
