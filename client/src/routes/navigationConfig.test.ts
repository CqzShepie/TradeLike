import type { AuthUser } from "../services/authService";
import {
  findNavigationItemByPath,
  getNavigationAccess,
  getSettingsNavigation,
  getSidebarNavigation,
} from "./navigationConfig";
import { getPlanRank, hasFeature, isAtLeastPlan, planIncludesFeature, roleAllowsFeature } from "./planEntitlements";

const baseUser: AuthUser = {
  id: 1,
  email: "user@example.com",
  name: "Trade User",
  role: "CustomerEmployee",
  plan: "Solo",
  accountStatus: "Active",
  passwordResetRequired: false,
  canManageAccounts: false,
  canManageStaff: false,
  canManageBilling: false,
  canManageSecurity: false,
  canViewAuditLogs: false,
  canCreateCustomers: true,
  canEditCustomers: true,
  canCancelCustomers: false,
  canResetPasswords: false,
  canVerifyEmails: false,
  canSendEmails: false,
  canManageDiscounts: false,
  canManageFreeMonths: false,
  canViewCustomerNotes: false,
  canEditCustomerNotes: false,
  canViewBilling: false,
  canManageSubscriptions: false,
  canExportData: false,
  canImpersonateCustomer: false,
  canDeleteData: false,
  canViewStaff: false,
  canCreateStaff: false,
  canCancelStaff: false,
  canEditStaffPermissions: false,
  canViewSecurityLogs: false,
};

function user(overrides: Partial<AuthUser>): AuthUser {
  return { ...baseUser, ...overrides };
}

function access(path: string, authUser: AuthUser) {
  const item = findNavigationItemByPath(path);

  if (!item) {
    throw new Error(`Missing navigation item for ${path}`);
  }

  return getNavigationAccess(item, authUser);
}

describe("navigation entitlements", () => {
  it.each(["/dashboard", "/customers", "/jobs", "/quotes", "/invoices", "/calendar", "/reports", "/settings"])(
    "allows a Solo CustomerDirector to access %s",
    path => {
      expect(access(path, user({ role: "CustomerDirector", plan: "Solo" }))).toBe("allowed");
    }
  );

  it("returns UpgradeRequired access for Solo plan-only failures", () => {
    const soloDirector = user({ role: "CustomerDirector", plan: "Solo" });

    expect(access("/team", soloDirector)).toBe("upgrade");
    expect(access("/reports/overview", soloDirector)).toBe("upgrade");
    expect(access("/settings/api", soloDirector)).toBe("upgrade");
  });

  it("keeps role failures as AccessDenied decisions", () => {
    const soloEmployee = user({ role: "CustomerEmployee", plan: "Solo" });

    expect(access("/team", soloEmployee)).toBe("denied");
  });

  it("keeps Business-only settings out of Solo sidebar and settings navigation", () => {
    const soloDirector = user({ role: "CustomerDirector", plan: "Solo" });
    const sidebarLabels = getSidebarNavigation(soloDirector).map(item => item.label);
    const settingsLabels = getSettingsNavigation(soloDirector).map(item => item.label);

    expect(sidebarLabels).not.toEqual(expect.arrayContaining(["API & Webhooks", "Branding", "Import / Export"]));
    expect(settingsLabels).toEqual(expect.arrayContaining(["Business Profile", "Company Details", "Accessibility", "Notifications", "Billing"]));
    expect(settingsLabels).not.toEqual(expect.arrayContaining(["API & Webhooks", "Webhooks", "Branding", "Import / Export"]));
  });

  it("allows Team CustomerManager to see Team and staff scheduling", () => {
    const teamManager = user({ role: "CustomerManager", plan: "Team" });
    const sidebarLabels = getSidebarNavigation(teamManager).map(item => item.label);

    expect(sidebarLabels).toEqual(expect.arrayContaining(["Team", "Calendar"]));
    expect(planIncludesFeature(teamManager.plan, "staff-scheduling")).toBe(true);
    expect(roleAllowsFeature(teamManager.role, "staff-scheduling")).toBe(true);
  });

  it("lets higher plans inherit Team and Business features", () => {
    expect(getPlanRank("Solo")).toBeLessThan(getPlanRank("Team"));
    expect(isAtLeastPlan("Business", "Team")).toBe(true);
    expect(isAtLeastPlan("Enterprise", "Business")).toBe(true);
    expect(hasFeature("Business", "staff-scheduling")).toBe(true);
    expect(hasFeature("Enterprise", "staff-scheduling")).toBe(true);
    expect(hasFeature("Enterprise", "api-access")).toBe(true);
    expect(hasFeature("Internal", "staff-scheduling")).toBe(false);
  });

  it.each(["Team", "Business", "Enterprise"] as const)(
    "shows Team navigation for %s managers",
    plan => {
      const manager = user({ role: "CustomerManager", plan });
      const sidebarLabels = getSidebarNavigation(manager).map(item => item.label);

      expect(sidebarLabels).toEqual(expect.arrayContaining(["Team"]));
    }
  );

  it("allows Business CustomerDirector to see API and Webhooks inside Settings", () => {
    const businessDirector = user({ role: "CustomerDirector", plan: "Business" });
    const settingsLabels = getSettingsNavigation(businessDirector).map(item => item.label);

    expect(settingsLabels).toEqual(expect.arrayContaining(["API & Webhooks", "Webhooks"]));
  });

  it("allows Enterprise directors to see plan-gated sections", () => {
    const enterpriseDirector = user({ role: "CustomerDirector", plan: "Enterprise" });
    const sidebarLabels = getSidebarNavigation(enterpriseDirector).map(item => item.label);
    const settingsLabels = getSettingsNavigation(enterpriseDirector).map(item => item.label);

    expect(sidebarLabels).toEqual(expect.arrayContaining(["Team", "Inventory", "Reports"]));
    expect(settingsLabels).toEqual(expect.arrayContaining([
      "API & Webhooks",
      "Webhooks",
      "Branding",
      "Import / Export",
      "Full Data Export",
      "Automations",
    ]));
  });

  it("does not treat internal Studio Directors as customer app Directors", () => {
    expect(access("/jobs", user({ role: "Director", plan: "Internal" }))).toBe("denied");
  });
});
