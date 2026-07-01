import { Link } from "react-router-dom";
import PageLayout from "../components/ui/PageLayout";
import { useAuth } from "../hooks/useAuth";
import {
  getSettingsNavigation,
  settingsSectionLabels,
} from "../routes/navigationConfig";
import type { NavigationGroup, NavigationItem } from "../routes/navigationConfig";

const sectionOrder: Array<Exclude<NavigationGroup, "main">> = [
  "general",
  "team-access",
  "billing-plan",
  "branding-documents",
  "data",
  "integrations",
  "developer",
  "automation",
];

export default function Settings() {
  const { user } = useAuth();
  const items = getSettingsNavigation(user);

  return (
    <PageLayout className="bg-slate-950 text-white" contentClassName="px-6 py-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/30">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">Settings</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Control centre</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Manage the operational, billing, data and developer settings your role can access.
          </p>
        </header>

        <div className="mt-8 space-y-8">
          {sectionOrder.map(group => {
            const groupItems = items.filter(item => item.group === group);
            if (groupItems.length === 0) {
              return null;
            }

            return (
              <section key={group}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{settingsSectionLabels[group]}</h2>
                    <p className="mt-1 text-sm text-slate-400">{sectionDescription(group)}</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {groupItems.map(item => <SettingsCard key={item.id} item={item} />)}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}

function SettingsCard({ item }: { item: NavigationItem }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      className="group rounded-2xl border border-white/10 bg-slate-900/80 p-5 text-left shadow-lg shadow-slate-950/20 transition hover:border-blue-400/40 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-blue-300">
          <Icon className="h-6 w-6" />
        </span>
        {item.badge && (
          <span className="rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-200">
            {item.badge}
          </span>
        )}
      </div>
      <h3 className="mt-5 text-lg font-bold text-white group-hover:text-blue-100">{item.label}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
    </Link>
  );
}

function sectionDescription(group: Exclude<NavigationGroup, "main">) {
  switch (group) {
    case "general":
      return "Core business and personal workspace settings.";
    case "team-access":
      return "Users, roles, permissions and staff operating defaults.";
    case "billing-plan":
      return "Plan, usage and subscription controls.";
    case "branding-documents":
      return "Brand, PDF and document presentation settings.";
    case "data":
      return "Import, export and retention tools.";
    case "integrations":
      return "Connected services and notifications.";
    case "developer":
      return "API, webhook and technical access.";
    case "automation":
      return "Workflow rules and premium automation.";
  }
}
