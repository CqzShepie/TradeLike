import {
  Accessibility,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  Code2,
  CreditCard,
  Database,
  FileCog,
  FileText,
  Gauge,
  Globe2,
  KeyRound,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  Package,
  Palette,
  ReceiptText,
  Settings2,
  ShieldCheck,
  UploadCloud,
  Users,
  UserCog,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { AuthUser, UserRole } from "../services/authService";
import {
  canAccessRoute,
  type AccessDecision,
  type PlanFeature,
  type PlanName,
} from "./planEntitlements";

export type NavigationGroup =
  | "main"
  | "general"
  | "team-access"
  | "billing-plan"
  | "branding-documents"
  | "data"
  | "integrations"
  | "developer"
  | "automation";

export type NavigationItem = {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  group: NavigationGroup;
  feature: PlanFeature;
  exactMatch: boolean;
  minimumPlan: PlanName;
  requiredRoles: UserRole[];
  requiredPlans?: PlanName[];
  settingSection?: string;
  hiddenFromSidebar?: boolean;
  description?: string;
  badge?: string;
  children?: NavigationItem[];
};

const employeeRoles: UserRole[] = ["CustomerEmployee", "CustomerManager", "CustomerDirector"];
const managerRoles: UserRole[] = ["CustomerManager", "CustomerDirector"];
const directorRoles: UserRole[] = ["CustomerDirector"];

export const navigationConfig: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, group: "main", feature: "dashboard", exactMatch: true, minimumPlan: "Solo", requiredRoles: employeeRoles },
  { id: "customers", label: "Customers", path: "/customers", icon: Users, group: "main", feature: "customers", exactMatch: false, minimumPlan: "Solo", requiredRoles: employeeRoles },
  { id: "jobs", label: "Jobs", path: "/jobs", icon: Briefcase, group: "main", feature: "jobs", exactMatch: false, minimumPlan: "Solo", requiredRoles: employeeRoles },
  { id: "quotes", label: "Quotes", path: "/quotes", icon: FileText, group: "main", feature: "quotes", exactMatch: false, minimumPlan: "Solo", requiredRoles: employeeRoles },
  { id: "invoices", label: "Invoices", path: "/invoices", icon: ReceiptText, group: "main", feature: "invoices", exactMatch: false, minimumPlan: "Solo", requiredRoles: employeeRoles },
  { id: "calendar", label: "Calendar", path: "/calendar", icon: CalendarDays, group: "main", feature: "calendar-basic", exactMatch: true, minimumPlan: "Solo", requiredRoles: employeeRoles },
  { id: "team", label: "Team", path: "/team", icon: UserCog, group: "main", feature: "team-management", exactMatch: true, minimumPlan: "Team", requiredRoles: managerRoles },
  { id: "inventory", label: "Inventory", path: "/inventory", icon: Package, group: "main", feature: "inventory", exactMatch: true, minimumPlan: "Business", requiredRoles: managerRoles },
  { id: "reports", label: "Reports", path: "/reports", icon: BarChart3, group: "main", feature: "reports-basic", exactMatch: false, minimumPlan: "Solo", requiredRoles: managerRoles },
  { id: "settings", label: "Settings", path: "/settings", icon: Settings2, group: "main", feature: "settings-basic", exactMatch: false, minimumPlan: "Solo", requiredRoles: employeeRoles },
  { id: "reports-overview", label: "Advanced Reports", path: "/reports/overview", icon: BarChart3, group: "main", feature: "reports-advanced", exactMatch: true, minimumPlan: "Team", requiredRoles: managerRoles, hiddenFromSidebar: true },

  { id: "profile", label: "Profile", path: "/settings/profile", icon: UserCog, group: "general", feature: "profile", exactMatch: true, minimumPlan: "Solo", hiddenFromSidebar: true, settingSection: "General", requiredRoles: employeeRoles, description: "Personal account preferences and contact details." },
  { id: "business", label: "Business Profile", path: "/settings/business", icon: Building2, group: "general", feature: "business-profile", exactMatch: true, minimumPlan: "Solo", hiddenFromSidebar: true, settingSection: "General", requiredRoles: managerRoles, description: "Business name, contact details and operating defaults." },
  { id: "company-details", label: "Company Details", path: "/settings/company", icon: Building2, group: "general", feature: "company-details", exactMatch: true, minimumPlan: "Solo", hiddenFromSidebar: true, settingSection: "General", requiredRoles: managerRoles, description: "Company address, VAT and document contact information." },
  { id: "accessibility", label: "Accessibility", path: "/settings/accessibility", icon: Accessibility, group: "general", feature: "accessibility", exactMatch: true, minimumPlan: "Solo", hiddenFromSidebar: true, settingSection: "General", requiredRoles: employeeRoles, description: "Display and interaction preferences." },

  { id: "users", label: "Users", path: "/settings/users", icon: Users, group: "team-access", feature: "user-permissions", exactMatch: true, minimumPlan: "Team", hiddenFromSidebar: true, settingSection: "Team & Access", requiredRoles: directorRoles, badge: "Team+", description: "Manage company users and role changes." },
  { id: "permissions", label: "Permissions", path: "/settings/permissions", icon: ShieldCheck, group: "team-access", feature: "user-permissions", exactMatch: true, minimumPlan: "Team", hiddenFromSidebar: true, settingSection: "Team & Access", requiredRoles: directorRoles, badge: "Team+", description: "Review roles, permissions and access boundaries." },
  { id: "staff-settings", label: "Staff Settings", path: "/settings/staff", icon: UserCog, group: "team-access", feature: "staff-settings", exactMatch: true, minimumPlan: "Team", hiddenFromSidebar: true, settingSection: "Team & Access", requiredRoles: managerRoles, badge: "Team+", description: "Operational staff categories and role presets." },

  { id: "billing", label: "Billing", path: "/settings/billing", icon: CreditCard, group: "billing-plan", feature: "billing", exactMatch: true, minimumPlan: "Solo", hiddenFromSidebar: true, settingSection: "Billing & Plan", requiredRoles: directorRoles, badge: "Owner", description: "Subscription, plan and billing details." },
  { id: "usage", label: "Usage", path: "/settings/billing/usage", icon: Gauge, group: "billing-plan", feature: "usage", exactMatch: true, minimumPlan: "Solo", hiddenFromSidebar: true, settingSection: "Billing & Plan", requiredRoles: directorRoles, badge: "Owner", description: "Feature and account usage." },
  { id: "plan-limits", label: "Plan Limits", path: "/settings/plan-limits", icon: LockKeyhole, group: "billing-plan", feature: "plan-limits", exactMatch: true, minimumPlan: "Solo", hiddenFromSidebar: true, settingSection: "Billing & Plan", requiredRoles: managerRoles, description: "Included users, feature gates and upgrade guidance." },

  { id: "branding", label: "Branding", path: "/settings/branding", icon: Palette, group: "branding-documents", feature: "branding", exactMatch: true, minimumPlan: "Business", hiddenFromSidebar: true, settingSection: "Branding & Documents", requiredRoles: directorRoles, badge: "Business+", description: "Logo, colour and customer-facing brand settings." },
  { id: "templates", label: "Document Templates", path: "/settings/templates", icon: FileCog, group: "branding-documents", feature: "templates", exactMatch: true, minimumPlan: "Team", hiddenFromSidebar: true, settingSection: "Branding & Documents", requiredRoles: managerRoles, badge: "Team+", description: "Quote, invoice and job document templates." },
  { id: "documents", label: "Documents", path: "/settings/documents", icon: FileText, group: "branding-documents", feature: "documents", exactMatch: true, minimumPlan: "Team", hiddenFromSidebar: true, settingSection: "Branding & Documents", requiredRoles: managerRoles, badge: "Team+", description: "PDF and document generation defaults." },

  { id: "import-export", label: "Import / Export", path: "/settings/import-export", icon: UploadCloud, group: "data", feature: "import-export", exactMatch: true, minimumPlan: "Business", hiddenFromSidebar: true, settingSection: "Data", requiredRoles: directorRoles, badge: "Business+", description: "Move company data in and out of TradeLike." },
  { id: "full-data-export", label: "Full Data Export", path: "/settings/full-data-export", icon: Database, group: "data", feature: "full-data-export", exactMatch: true, minimumPlan: "Business", hiddenFromSidebar: true, settingSection: "Data", requiredRoles: directorRoles, badge: "Business+", description: "Owner-only tenant data export." },

  { id: "integrations", label: "Integrations", path: "/settings/integrations", icon: Link2, group: "integrations", feature: "integrations", exactMatch: true, minimumPlan: "Business", hiddenFromSidebar: true, settingSection: "Integrations", requiredRoles: directorRoles, badge: "Business+", description: "Connect external services and tools." },
  { id: "accounting", label: "Accounting", path: "/settings/accounting", icon: CreditCard, group: "integrations", feature: "accounting", exactMatch: true, minimumPlan: "Business", hiddenFromSidebar: true, settingSection: "Integrations", requiredRoles: directorRoles, badge: "Business+", description: "Accounting integrations and sync health." },
  { id: "notifications", label: "Notifications", path: "/settings/notifications", icon: Bell, group: "integrations", feature: "notifications", exactMatch: true, minimumPlan: "Solo", hiddenFromSidebar: true, settingSection: "Integrations", requiredRoles: employeeRoles, description: "Device, email and SMS notification preferences." },

  { id: "api", label: "API & Webhooks", path: "/settings/api", icon: Code2, group: "developer", feature: "api-access", exactMatch: true, minimumPlan: "Business", hiddenFromSidebar: true, settingSection: "Developer", requiredRoles: directorRoles, badge: "Business+", description: "Public API clients, webhooks and developer access." },
  { id: "webhooks", label: "Webhooks", path: "/settings/webhooks", icon: Globe2, group: "developer", feature: "webhooks", exactMatch: true, minimumPlan: "Business", hiddenFromSidebar: true, settingSection: "Developer", requiredRoles: directorRoles, badge: "Business+", description: "Outbound webhook delivery settings." },
  { id: "developer-docs", label: "Developer Docs", path: "/settings/developer", icon: KeyRound, group: "developer", feature: "developer-docs", exactMatch: true, minimumPlan: "Business", hiddenFromSidebar: true, settingSection: "Developer", requiredRoles: directorRoles, badge: "Business+", description: "Technical setup notes for your integration team." },

  { id: "automations", label: "Automations", path: "/settings/automations", icon: Workflow, group: "automation", feature: "automations", exactMatch: true, minimumPlan: "Team", hiddenFromSidebar: true, settingSection: "Automation", requiredRoles: managerRoles, badge: "Team+", description: "Workflow rules for operational follow-up." },
];

export const settingsSectionLabels: Record<Exclude<NavigationGroup, "main">, string> = {
  general: "General",
  "team-access": "Team & Access",
  "billing-plan": "Billing & Plan",
  "branding-documents": "Branding & Documents",
  data: "Data",
  integrations: "Integrations",
  developer: "Developer",
  automation: "Automation",
};

export function getSidebarNavigation(user: AuthUser | null) {
  return navigationConfig.filter(item =>
    item.group === "main" &&
    !item.hiddenFromSidebar &&
    canAccessNavigationItem(item, user)
  );
}

export function getSettingsNavigation(user: AuthUser | null) {
  return navigationConfig.filter(item =>
    item.group !== "main" &&
    item.hiddenFromSidebar &&
    canAccessNavigationItem(item, user)
  );
}

export function findNavigationItemByPath(path: string) {
  return navigationConfig.find(item => item.path === path);
}

export function canAccessNavigationItem(item: NavigationItem, user: AuthUser | null) {
  return getNavigationAccess(item, user) === "allowed";
}

export function getNavigationAccess(item: NavigationItem, user: AuthUser | null): AccessDecision {
  return canAccessRoute(user, item);
}

export function isNavigationItemActive(item: NavigationItem, pathname: string) {
  if (item.id === "settings") {
    return pathname === "/settings" || pathname.startsWith("/settings/");
  }

  if (item.exactMatch) {
    return pathname === item.path;
  }

  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}
