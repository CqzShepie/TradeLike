import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "./classNames";

type CardPadding = "none" | "sm" | "md" | "lg";
type CardTone = "surface" | "subtle" | "dark";

type CardProps = {
  children: ReactNode;
  padded?: boolean;
  padding?: CardPadding;
  tone?: CardTone;
  as?: "div" | "article" | "section";
} & HTMLAttributes<HTMLDivElement>;

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

const toneClasses: Record<CardTone, string> = {
  surface: "border-slate-200 bg-white text-slate-950 shadow-sm",
  subtle: "border-slate-200 bg-slate-50 text-slate-950",
  dark: "border-white/10 bg-slate-900/90 text-white shadow-lg shadow-slate-950/30",
};

function Card({
  children,
  className,
  padded,
  padding,
  tone = "surface",
  as: Component = "div",
  ...props
}: CardProps) {
  const resolvedPadding = padding ?? (padded === false ? "none" : "md");

  return (
    <Component
      className={classNames(
        "rounded-xl border",
        toneClasses[tone],
        paddingClasses[resolvedPadding],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Card;
