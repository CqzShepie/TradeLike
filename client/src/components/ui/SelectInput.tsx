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
        "w-full rounded-lg border bg-white px-4 py-2.5 text-sm font-medium text-slate-950 shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-blue-500",
        "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
        hasError ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-blue-500",
        className
      )}
      aria-invalid={hasError || undefined}
      {...props}
    >
      {children}
    </select>
  );
}
