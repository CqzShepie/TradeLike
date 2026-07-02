import type { AdminUser, HealthStatus, SubscriptionPlan } from "../../types/admin";

const customerRoles = new Set(["Customer", "CustomerDirector", "CustomerManager", "CustomerEmployee"]);

export function isCustomerAccount(user: AdminUser) {
  return customerRoles.has(user.role) && user.subscriptionPlan !== "Internal" && user.billingStatus !== "Internal";
}

export function customerAccounts(users: AdminUser[]) {
  return users.filter(isCustomerAccount);
}

export function customerDisplayName(user: AdminUser) {
  return user.businessName || user.fullName || user.email;
}

export function hasSupportNotes(user: AdminUser) {
  return Boolean(user.supportNotes?.trim());
}

export function healthLabel(status: HealthStatus) {
  if (status === "Green") return "Healthy";
  if (status === "Amber") return "Watch";
  return "At risk";
}

export function planLabel(plan: SubscriptionPlan) {
  return plan === "Internal" ? "Internal staff" : plan;
}

export function matchesStudioCustomerSearch(user: AdminUser, query: string) {
  const value = query.trim().toLowerCase();
  if (value === "") return true;

  return [
    user.businessName,
    user.fullName,
    user.ownerName,
    user.email,
    user.id.toString(),
    user.accountStatus,
    user.billingStatus,
    user.subscriptionPlan,
    user.healthStatus,
    user.adminTags,
    user.supportNotes,
  ]
    .filter(Boolean)
    .some(part => String(part).toLowerCase().includes(value));
}

export function countByPlan(users: AdminUser[]) {
  return {
    Solo: users.filter(user => user.subscriptionPlan === "Solo").length,
    Team: users.filter(user => user.subscriptionPlan === "Team").length,
    Business: users.filter(user => user.subscriptionPlan === "Business").length,
    Enterprise: users.filter(user => user.subscriptionPlan === "Enterprise").length,
  };
}

