import type { ReactNode } from "react";
import PageLayout from "./PageLayout";
import { classNames } from "./classNames";

type ProductPageProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  maxWidth?: "5xl" | "6xl" | "7xl" | "full";
};

const maxWidthClasses: Record<NonNullable<ProductPageProps["maxWidth"]>, string> = {
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-none",
};

export default function ProductPage({
  children,
  className,
  contentClassName,
  maxWidth = "7xl",
}: ProductPageProps) {
  return (
    <PageLayout
      className={classNames("bg-slate-950 text-slate-100", className)}
      contentClassName={classNames("px-5 py-6 sm:px-8 lg:px-10 lg:py-8", contentClassName)}
    >
      <div className={classNames("mx-auto w-full space-y-6", maxWidthClasses[maxWidth])}>
        {children}
      </div>
    </PageLayout>
  );
}

export function ProductPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {description && <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3 lg:justify-end">{actions}</div>}
    </header>
  );
}

export function ProductPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={classNames(
        "rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/20",
        className
      )}
    >
      {children}
    </section>
  );
}

export function ProductStat({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-slate-300">{label}</p>
        {icon && <span className="text-blue-300">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</p>
      {helper && <p className="mt-2 text-xs leading-5 text-slate-400">{helper}</p>}
    </div>
  );
}
