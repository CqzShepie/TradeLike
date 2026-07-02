import { describe, expect, it, beforeEach } from "vitest";

import {
  buildAccessDiagnostic,
  clearAccessSession,
  copyableAccessDiagnostics,
  shouldShowAccessDiagnostics,
} from "./accessDiagnostics";

describe("access diagnostics helper", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hides diagnostics for normal production customer view", () => {
    expect(shouldShowAccessDiagnostics(
      { role: "CustomerDirector" },
      { isDev: false, search: "", hostname: "app.tradelike.test" }
    )).toBe(false);
  });

  it("shows diagnostics in development", () => {
    expect(shouldShowAccessDiagnostics(
      { role: "CustomerDirector" },
      { isDev: true, search: "", hostname: "app.tradelike.test" }
    )).toBe(true);
  });

  it("shows diagnostics for internal staff", () => {
    expect(shouldShowAccessDiagnostics(
      { role: "Support" },
      { isDev: false, search: "", hostname: "app.tradelike.test" }
    )).toBe(true);
  });

  it("copy diagnostics excludes tokens and secret-looking fields", () => {
    const diagnostic = {
      ...buildAccessDiagnostic({
        user: { email: "support@example.com", role: "Support", plan: "Internal", accountStatus: "Active", passwordResetRequired: false },
        route: "/admin",
        reason: "unknown",
      }),
      token: "jwt-value",
      providerSecret: "secret",
    };

    const copied = copyableAccessDiagnostics(diagnostic);

    expect(copied).toContain("support@example.com");
    expect(copied).not.toContain("jwt-value");
    expect(copied).not.toContain("providerSecret");
  });

  it("clear session clears stored TradeLike auth keys", () => {
    localStorage.setItem("tradelike_token", "token");
    localStorage.setItem("tradelike_user", "{}");

    clearAccessSession();

    expect(localStorage.getItem("tradelike_token")).toBeNull();
    expect(localStorage.getItem("tradelike_user")).toBeNull();
  });
});
