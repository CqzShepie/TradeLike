import type { UserRole } from "../services/authService";
import { normalizeUserRole } from "../services/authService";

const internalRoles = new Set<UserRole>([
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

type SessionLikeUser = {
  plan?: string | null;
  role?: UserRole | string | null;
};

export function isCustomerSession(user: SessionLikeUser | null | undefined) {
  if (!user) {
    return false;
  }

  const plan = String(user.plan ?? "").trim().toLowerCase();
  const role = normalizeUserRole(user.role);

  return plan !== "internal" && !internalRoles.has(role);
}

export function getCustomerRoleLabel(
  role: UserRole | string | null | undefined,
  user?: SessionLikeUser | null
) {
  const normalized = normalizeUserRole(role);

  if (user && !isCustomerSession(user)) {
    return normalized;
  }

  switch (normalized) {
    case "CustomerDirector":
    case "Director":
    case "Customer":
      return "Owner";
    case "CustomerManager":
      return "Manager";
    case "CustomerEmployee":
      return "Team Member";
    default:
      return normalized;
  }
}

export function getCustomerRoleOptions() {
  return [
    { value: "CustomerDirector", label: "Owner" },
    { value: "CustomerManager", label: "Manager" },
    { value: "CustomerEmployee", label: "Team Member" },
  ] as const;
}

export function formatRequiredCustomerRoles(
  roles: readonly (UserRole | string)[],
  user?: SessionLikeUser | null
) {
  return roles.map(role => getCustomerRoleLabel(role, user)).join(", ");
}
