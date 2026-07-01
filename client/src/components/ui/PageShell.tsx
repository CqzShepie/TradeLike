import type { ReactNode } from "react";
import { classNames } from "./classNames";

type PageShellProps = {
  children: ReactNode;
  sidebar?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function PageShell({
  children,
  sidebar,
  className,
  contentClassName,
}: PageShellProps) {
  return (
    <main className={classNames("flex min-h-screen bg-slate-950 text-slate-100", className)}>
      {sidebar}
      <section className={classNames("min-w-0 flex-1 px-5 py-8 sm:px-8 lg:p-10", contentClassName)}>
        {children}
      </section>
    </main>
  );
}
