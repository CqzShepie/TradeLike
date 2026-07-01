import { Link } from "react-router-dom";
import PageLayout from "../../components/ui/PageLayout";
import type { NavigationItem } from "../../routes/navigationConfig";

export default function SettingsSectionPage({ item }: { item: NavigationItem }) {
  const Icon = item.icon;

  return (
    <PageLayout className="bg-slate-950 text-white" contentClassName="px-6 py-8 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm font-semibold text-blue-300 hover:text-blue-200" to="/settings">
          Back to Settings
        </Link>

        <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/30">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-blue-300">
                <Icon className="h-7 w-7" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">{item.settingSection ?? "Settings"}</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">{item.label}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{item.description}</p>
              </div>
            </div>
            {item.badge && (
              <span className="w-fit rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-200">
                {item.badge}
              </span>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-6 text-sm leading-6 text-slate-300">
            This settings area is ready in the navigation structure. Connected feature pages open here when the matching module is available.
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
