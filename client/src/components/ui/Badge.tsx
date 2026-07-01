import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "./classNames";

type BadgeTone = "neutral" | "blue" | "green" | "amber" | "red" | "slate";

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
} & HTMLAttributes<HTMLSpanElement>;

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-slate-200 bg-white text-slate-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-700",
  slate: "border-slate-700 bg-slate-800 text-slate-100",
};

export default function Badge({
  children,
  tone = "neutral",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex h-fit w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
