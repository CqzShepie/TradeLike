import type { ReactNode } from "react";
import Logo from "../layout/Logo";
import { Badge, Card } from "../ui";

type AuthShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
};

export default function AuthShell({
  children,
  eyebrow,
  title,
  description,
  highlights,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between px-6 py-6 sm:px-10 lg:px-12">
          <Logo />

          <div className="max-w-xl py-12 sm:py-16 lg:py-0">
            <Badge tone="blue">Built for UK trade businesses</Badge>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg">
              {description}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {highlights.map(highlight => (
                <div
                  key={highlight}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm font-semibold text-slate-100 shadow-sm shadow-slate-950/20"
                >
                  {highlight}
                </div>
              ))}
            </div>
          </div>

          <p className="hidden text-sm text-slate-400 lg:block">
            Job scheduling, quotes, customers and admin in one calm workspace.
          </p>
        </section>

        <section className="flex items-center justify-center bg-slate-50 px-6 py-10 text-slate-950 shadow-2xl shadow-slate-950/40 sm:px-10 lg:rounded-l-[2rem]">
          <Card padding="lg" className="w-full max-w-md shadow-xl shadow-slate-200/80">
            {children}
          </Card>
        </section>
      </div>
    </main>
  );
}
