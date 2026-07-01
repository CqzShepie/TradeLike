import type { ReactNode } from "react";
import { classNames } from "./classNames";

type ActionBarProps = {
  children: ReactNode;
  className?: string;
  align?: "start" | "between" | "end";
};

const alignClasses: Record<NonNullable<ActionBarProps["align"]>, string> = {
  start: "justify-start",
  between: "justify-between",
  end: "justify-end",
};

export default function ActionBar({
  children,
  className,
  align = "end",
}: ActionBarProps) {
  return (
    <div className={classNames("flex flex-col gap-3 sm:flex-row sm:items-center", alignClasses[align], className)}>
      {children}
    </div>
  );
}
