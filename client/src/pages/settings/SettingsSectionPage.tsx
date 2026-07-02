import CustomerSettingsWorkspace from "../../components/settings/CustomerSettingsWorkspace";
import type { NavigationItem } from "../../routes/navigationConfig";

const sectionMap: Record<string, Parameters<typeof CustomerSettingsWorkspace>[0]["focusSectionId"] | undefined> = {
  profile: "account",
  business: "business",
  "company-details": "business",
  accessibility: "security",
  billing: "billing",
  usage: "billing",
  "plan-limits": "billing",
  users: "team",
  permissions: "team",
  "staff-settings": "team",
  documents: "documents",
  templates: "documents",
  notifications: "notifications",
  automations: "job-defaults",
  accounting: "documents",
  integrations: "notifications",
  "full-data-export": "data",
  "developer-docs": "notifications",
  webhooks: "notifications",
};

export default function SettingsSectionPage({ item }: { item: NavigationItem }) {
  const focusSectionId = sectionMap[item.id];

  if (!focusSectionId) {
    return <CustomerSettingsWorkspace />;
  }

  return <CustomerSettingsWorkspace focusSectionId={focusSectionId} />;
}
