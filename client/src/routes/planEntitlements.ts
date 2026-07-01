import type { AuthUser, UserRole } from "../services/authService";

export type PlanName = "Solo" | "Team" | "Business" | "Enterprise";

export type PlanFeature =
  | "dashboard"
  | "customers"
  | "jobs"
  | "quotes"
  | "invoices"
  | "calendar-basic"
  | "reports-basic"
  | "reports-advanced"
  | "settings-basic"
  | "profile"
  | "business-profile"
  | "company-details"
  | "accessibility"
  | "notifications"
  | "billing"
  | "usage"
  | "plan-limits"
  | "team-management"
  | "staff-scheduling"
  | "user-permissions"
  | "staff-settings"
  | "inventory"
  | "branding"
  | "templates"
  | "documents"
  | "import-export"
  | "full-data-export"
  | "integrations"
  | "accounting"
  | "api-access"
  | "webhooks"
  | "developer-docs"
  | "automations";

export type AccessDecision = "allowed" | "denied" | "upgrade";

export type EntitlementRouteConfig = {
  feature: PlanFeature;
  requiredRoles?: UserRole[];
  requiredPlans?: PlanName[];
  minimumPlan?: PlanName;
};

const planLevels: Record<PlanName, number> = {
  Solo: 0,
  Team: 1,
  Business: 2,
  Enterprise: 3,
};

const featureMinimumPlan: Record<PlanFeature, PlanName> = {
  dashboard: "Solo",
  customers: "Solo",
  jobs: "Solo",
  quotes: "Solo",
  invoices: "Solo",
  "calendar-basic": "Solo",
  "reports-basic": "Solo",
  "settings-basic": "Solo",
  profile: "Solo",
  "business-profile": "Solo",
  "company-details": "Solo",
  accessibility: "Solo",
  notifications: "Solo",
  billing: "Solo",
  usage: "Solo",
  "plan-limits": "Solo",
  templates: "Solo",
  documents: "Solo",
  "team-management": "Team",
  "staff-scheduling": "Team",
  "user-permissions": "Team",
  "staff-settings": "Team",
  "reports-advanced": "Team",
  automations: "Team",
  inventory: "Business",
  branding: "Business",
  "import-export": "Business",
  "full-data-export": "Business",
  integrations: "Business",
  accounting: "Business",
  "api-access": "Business",
  webhooks: "Business",
  "developer-docs": "Business",
};

const customerEmployeeRoles: UserRole[] = [
  "CustomerEmployee",
  "CustomerManager",
  "CustomerDirector",
  "Customer",
  "Director",
];

const customerManagerRoles: UserRole[] = [
  "CustomerManager",
  "CustomerDirector",
  "Customer",
  "Director",
];

const customerDirectorRoles: UserRole[] = ["CustomerDirector", "Director"];

const featureRoles: Record<PlanFeature, UserRole[]> = {
  dashboard: customerEmployeeRoles,
  customers: customerEmployeeRoles,
  jobs: customerEmployeeRoles,
  quotes: customerEmployeeRoles,
  invoices: customerEmployeeRoles,
  "calendar-basic": customerEmployeeRoles,
  "reports-basic": customerManagerRoles,
  "settings-basic": customerEmployeeRoles,
  profile: customerEmployeeRoles,
  "business-profile": customerManagerRoles,
  "company-details": customerManagerRoles,
  accessibility: customerEmployeeRoles,
  notifications: customerEmployeeRoles,
  billing: customerDirectorRoles,
  usage: customerDirectorRoles,
  "plan-limits": customerManagerRoles,
  "team-management": customerManagerRoles,
  "staff-scheduling": customerManagerRoles,
  "user-permissions": customerDirectorRoles,
  "staff-settings": customerManagerRoles,
  "reports-advanced": customerManagerRoles,
  inventory: customerManagerRoles,
  branding: customerDirectorRoles,
  templates: customerManagerRoles,
  documents: customerManagerRoles,
  "import-export": customerDirectorRoles,
  "full-data-export": customerDirectorRoles,
  integrations: customerDirectorRoles,
  accounting: customerDirectorRoles,
  "api-access": customerDirectorRoles,
  webhooks: customerDirectorRoles,
  "developer-docs": customerDirectorRoles,
  automations: customerManagerRoles,
};

export function getPlanLevel(plan: string | null | undefined) {
  return planLevels[normalizePlan(plan)];
}

export function normalizePlan(plan: string | null | undefined): PlanName {
  const normalized = String(plan ?? "Solo").trim().toLowerCase();

  switch (normalized) {
    case "enterprise":
      return "Enterprise";
    case "business":
      return "Business";
    case "team":
      return "Team";
    case "solo":
    default:
      return "Solo";
  }
}

export function planIncludesFeature(plan: string | null | undefined, feature: PlanFeature) {
  const minimumPlan = featureMinimumPlan[feature];
  return getPlanLevel(plan) >= getPlanLevel(minimumPlan);
}

export function roleAllowsFeature(role: UserRole | null | undefined, feature: PlanFeature) {
  return featureRoles[feature].includes(resolveRole(role));
}

export function canAccessRoute(user: AuthUser | null, routeConfig: EntitlementRouteConfig): AccessDecision {
  if (!user) {
    return "denied";
  }

  const allowedRoles = routeConfig.requiredRoles ?? featureRoles[routeConfig.feature];
  const role = resolveRole(user.role);

  if (!allowedRoles.includes(role)) {
    return "denied";
  }

  if (routeConfig.requiredPlans?.length) {
    const userPlan = normalizePlan(user.plan);
    return routeConfig.requiredPlans.includes(userPlan) ? "allowed" : "upgrade";
  }

  const minimumPlan = routeConfig.minimumPlan ?? featureMinimumPlan[routeConfig.feature];
  return getPlanLevel(user.plan) >= getPlanLevel(minimumPlan) ? "allowed" : "upgrade";
}

function resolveRole(role: UserRole | null | undefined): UserRole {
  // TODO: Replace this defensive fallback with /api/auth/me when available.
  return role ?? "CustomerEmployee";
}
