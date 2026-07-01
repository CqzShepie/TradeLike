import type { InputHTMLAttributes } from "react";
import { classNames } from "./classNames";

type TextInputProps = {
  hasError?: boolean;
} & InputHTMLAttributes<HTMLInputElement>;

export default function TextInput({
  hasError = false,
  className,
  ...props
}: TextInputProps) {
  return (
    <input
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
