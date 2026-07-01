import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  children: ReactNode;
  htmlFor?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
};

export default function FormField({
  label,
  children,
  htmlFor,
  helperText,
  error,
  required = false,
}: FormFieldProps) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-600">required</span>}
      </span>
      {children}
      {helperText && !error && (
        <span className="mt-1.5 block text-xs leading-5 text-slate-500">{helperText}</span>
      )}
      {error && (
        <span className="mt-1.5 block text-xs font-semibold leading-5 text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}
