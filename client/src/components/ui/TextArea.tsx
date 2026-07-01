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
        "w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-slate-950 shadow-sm",
        "placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-blue-500",
        "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
        hasError ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-blue-500",
        className
      )}
      aria-invalid={hasError || undefined}
      {...props}
    />
  );
}
