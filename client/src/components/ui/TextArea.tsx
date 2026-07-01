import type { TextareaHTMLAttributes } from "react";
import { classNames } from "./classNames";

type TextAreaProps = {
  hasError?: boolean;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function TextArea({
  hasError = false,
  className,
  rows = 4,
  ...props
}: TextAreaProps) {
  return (
    <textarea
      rows={rows}
      className={classNames(
        "w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white shadow-sm",
        "placeholder:text-slate-500",
        "focus:outline-none focus:ring-2 focus:ring-blue-500",
        "disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-slate-900/60 disabled:text-slate-500 disabled:placeholder:text-slate-600",
        hasError ? "border-red-400/70 focus:border-red-400" : "focus:border-blue-500",
        className
      )}
      aria-invalid={hasError || undefined}
      {...props}
    />
  );
}
