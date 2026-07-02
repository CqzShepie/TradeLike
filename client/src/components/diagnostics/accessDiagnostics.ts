import type { AuthUser, UserRole } from "../../services/authService";
import type { PlanFeature, PlanName } from "../../routes/planEntitlements";

export type AccessBlockReason =
  | "not-logged-in"
  | "wrong-role"
  | "customer-trying-staff-area"
  | "staff-trying-customer-area"
  | "missing-or-unknown-role"
  | "stale-session-suspected"
  | "plan-too-low"
  | "billing-inactive"
  | "feature-disabled"
  | "unknown-or-missing-plan"
  | "subscription-mismatch-suspected"
  | "unknown";

export type AccessDiagnosticInput = {
  user: Partial<AuthUser> | null;
  route: string;
  reason?: AccessBlockReason;
  requiredFeature?: PlanFeature | string;
  requiredMinimumPlan?: PlanName | string;
  requiredRoles?: readonly (UserRole | string)[];
};

export type AccessDiagnostic = {
  email: string | null;
  role: string | null;
  plan: string | null;
  billingStatus: string | null;
  accountStatus: string | null;
  tenantId: string | number | null;
  requiredFeature: string | null;
  requiredMinimumPlan: string | null;
  requiredRoles: string[];
  reasonBlocked: AccessBlockReason;
  currentRoute: string;
  environmentMode: string;
};

const internalRoles = new Set([
  "Staff",
  "Director",
  "Admin",
  "Support",
  "Junior Developer",
  "Developer",
  "Senior Developer",
  "Marketing",
  "Customer Service",
  "Operations Coordinator",
  "Personal Assistant",
]);

const customerRoles = new Set(["Customer", "CustomerEmployee", "CustomerManager", "CustomerDirector"]);

const planLevels: Record<string, number> = {
  solo: 0,
  team: 1,
  business: 2,
  enterprise: 3,
};

export function buildAccessDiagnostic(input: AccessDiagnosticInput): AccessDiagnostic {
  const rawUser = readRawStoredUser();
  const user = input.user ?? rawUser;
  const role = readString(user, "role");
  const plan = readString(user, "plan");
  const billingStatus = readString(user, "billingStatus");
  const accountStatus = readString(user, "accountStatus");

  return {
    email: readString(user, "email"),
    role,
    plan,
    billingStatus,
    accountStatus,
    tenantId: readTenantId(user),
    requiredFeature: input.requiredFeature ? String(input.requiredFeature) : null,
    requiredMinimumPlan: input.requiredMinimumPlan ? String(input.requiredMinimumPlan) : null,
    requiredRoles: [...(input.requiredRoles ?? [])].map(String),
    reasonBlocked: input.reason ?? inferReason({
      user,
      route: input.route,
      role,
      plan,
      billingStatus,
      requiredRoles: input.requiredRoles,
      requiredMinimumPlan: input.requiredMinimumPlan,
      requiredFeature: input.requiredFeature,
    }),
    currentRoute: input.route,
    environmentMode: getEnvironmentMode(),
  };
}

export function getAccessReasonMessage(reason: AccessBlockReason) {
  switch (reason) {
    case "not-logged-in":
      return "No active sign-in was found for this browser.";
    case "wrong-role":
      return "Your current role is not in the allowed role list for this route.";
    case "customer-trying-staff-area":
      return "Customer accounts cannot access the internal staff area.";
    case "staff-trying-customer-area":
      return "Internal staff accounts are outside this customer-only workspace route.";
    case "missing-or-unknown-role":
      return "The stored session has no recognised role.";
    case "stale-session-suspected":
      return "A token or user record is missing or out of sync, so the session may be stale.";
    case "plan-too-low":
      return "The current plan is below the minimum plan for this feature.";
    case "billing-inactive":
      return "Billing is not active for this account.";
    case "feature-disabled":
      return "The feature is disabled or unavailable for this account.";
    case "unknown-or-missing-plan":
      return "The stored session has no recognised plan.";
    case "subscription-mismatch-suspected":
      return "The plan looks internal or unknown for the customer app, so subscription data may be mismatched.";
    default:
      return "Access was blocked after role, billing, plan and feature checks. Refresh your session; if it continues, this may be a plan hierarchy or route configuration issue.";
  }
}

export function shouldShowAccessDiagnostics(
  diagnostic: Pick<AccessDiagnostic, "role"> | null,
  options: { isDev?: boolean; search?: string; hostname?: string } = {}
) {
  const isDev = options.isDev ?? import.meta.env.DEV;
  if (isDev) {
    return true;
  }

  const search = options.search ?? globalThis.location?.search ?? "";
  const hostname = options.hostname ?? globalThis.location?.hostname ?? "";
  const debugAccess = new URLSearchParams(search).get("debugAccess") === "1";

  if (debugAccess && isLocalhost(hostname)) {
    return true;
  }

  return isInternalRole(diagnostic?.role ?? null);
}

export function copyableAccessDiagnostics(diagnostic: AccessDiagnostic) {
  return JSON.stringify(removeSecretFields(diagnostic), null, 2);
}

export function clearAccessSession() {
  localStorage.removeItem("tradelike_token");
  localStorage.removeItem("tradelike_user");
}

export function readRawStoredUser(): Record<string, unknown> | null {
  const raw = localStorage.getItem("tradelike_user");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function inferReason(input: {
  user: Partial<AuthUser> | Record<string, unknown> | null;
  route: string;
  role: string | null;
  plan: string | null;
  billingStatus: string | null;
  requiredRoles?: readonly (UserRole | string)[];
  requiredMinimumPlan?: PlanName | string;
  requiredFeature?: PlanFeature | string;
}): AccessBlockReason {
  const hasToken = Boolean(localStorage.getItem("tradelike_token"));
  const hasRawUser = Boolean(localStorage.getItem("tradelike_user"));

  if (!input.user && !hasToken && !hasRawUser) {
    return "not-logged-in";
  }

  if (!input.user || (hasToken && !hasRawUser)) {
    return "stale-session-suspected";
  }

  if (!input.role || (!isInternalRole(input.role) && !customerRoles.has(input.role))) {
    return "missing-or-unknown-role";
  }

  if (input.route.startsWith("/admin") && !isInternalRole(input.role)) {
    return "customer-trying-staff-area";
  }

  if (!input.route.startsWith("/admin") && isInternalRole(input.role)) {
    return "staff-trying-customer-area";
  }

  if (input.billingStatus && !["active", "trial"].includes(input.billingStatus.toLowerCase())) {
    return "billing-inactive";
  }

  if (!input.plan) {
    return "unknown-or-missing-plan";
  }

  if (isCustomerRole(input.role) && !isKnownCustomerPlan(input.plan)) {
    return "subscription-mismatch-suspected";
  }

  if (input.requiredRoles?.length && !input.requiredRoles.map(String).includes(input.role)) {
    return "wrong-role";
  }

  if (input.requiredMinimumPlan && planLevel(input.plan) < planLevel(String(input.requiredMinimumPlan))) {
    return "plan-too-low";
  }

  if (input.requiredFeature && !input.requiredMinimumPlan) {
    return "feature-disabled";
  }

  return hasProbablyStaleSession(input.user)
    ? "stale-session-suspected"
    : "unknown";
}

function readString(user: Partial<AuthUser> | Record<string, unknown> | null, key: string) {
  const value = user?.[key as keyof typeof user];
  return typeof value === "string" && value.trim() ? value : null;
}

function readTenantId(user: Partial<AuthUser> | Record<string, unknown> | null) {
  const fromUser = (user as Record<string, unknown> | null)?.tenantId;
  if (typeof fromUser === "string" || typeof fromUser === "number") {
    return fromUser;
  }

  const token = localStorage.getItem("tradelike_token");
  if (!token) {
    return null;
  }

  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(atob(toBase64(payload))) as Record<string, unknown>;
    const tenantId = decoded.tid ?? decoded.tenantId;
    return typeof tenantId === "string" || typeof tenantId === "number" ? tenantId : null;
  } catch {
    return null;
  }
}

function toBase64(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return padded.replace(/-/g, "+").replace(/_/g, "/");
}

function isInternalRole(role: string | null) {
  return role ? internalRoles.has(role) : false;
}

function isCustomerRole(role: string | null) {
  return role ? customerRoles.has(role) : false;
}

function isKnownCustomerPlan(plan: string) {
  return ["solo", "team", "business", "enterprise"].includes(plan.trim().toLowerCase());
}

function planLevel(plan: string) {
  const normalized = plan.trim().toLowerCase();

  if (normalized === "trial") {
    return 0;
  }

  if (normalized === "internal") {
    return -1;
  }

  return planLevels[normalized] ?? -1;
}

function hasProbablyStaleSession(user: Partial<AuthUser> | Record<string, unknown> | null) {
  return Boolean(user) && (!localStorage.getItem("tradelike_token") || !localStorage.getItem("tradelike_user"));
}

function isLocalhost(hostname: string) {
  return ["localhost", "127.0.0.1", "::1"].includes(hostname);
}

function getEnvironmentMode() {
  return import.meta.env.MODE ?? (import.meta.env.DEV ? "development" : "production");
}

function removeSecretFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeSecretFields);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !/(token|password|secret|refresh|provider)/i.test(key))
      .map(([key, item]) => [key, removeSecretFields(item)])
  );
}
