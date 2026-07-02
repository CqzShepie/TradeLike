import type { AuthUser, UserRole } from "../services/authService";

const staffHostnames = new Set(["staff.tradelike.co.uk"]);
const customerAppHostnames = new Set(["app.tradelike.co.uk"]);

const internalStaffRoles = new Set<string>([
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

const customerRoles = new Set<string>([
  "CustomerDirector",
  "CustomerManager",
  "CustomerEmployee",
  "Customer",
]);

export function isStaffHost(hostname: string) {
  return staffHostnames.has(normalizeHostname(hostname));
}

export function isCustomerAppHost(hostname: string) {
  return customerAppHostnames.has(normalizeHostname(hostname));
}

export function getDefaultUnauthenticatedRoute(hostname: string) {
  return isStaffHost(hostname) ? "/staff-login" : "/login";
}

export function getDefaultAuthenticatedRoute(
  user: Pick<AuthUser, "role"> | null | undefined,
  hostname: string
) {
  if (isStaffHost(hostname)) {
    if (isInternalStaffRole(user?.role)) {
      return "/admin";
    }

    if (isCustomerRole(user?.role)) {
      return "/staff-access-denied";
    }

    return "/staff-login";
  }

  if (isInternalStaffRole(user?.role)) {
    return "/admin";
  }

  return "/dashboard";
}

export function isInternalStaffRole(role: UserRole | string | null | undefined) {
  return internalStaffRoles.has(normalizeRole(role));
}

export function isCustomerRole(role: UserRole | string | null | undefined) {
  return customerRoles.has(normalizeRole(role));
}

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase();
}

function normalizeRole(role: UserRole | string | null | undefined) {
  return String(role ?? "").trim();
}
