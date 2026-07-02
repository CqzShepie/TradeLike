import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AccessDenied from "../../pages/AccessDenied";
import UpgradeRequired from "../../pages/UpgradeRequired";

vi.mock("../../components/ui/PageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

function setStoredUser(user: Record<string, unknown>) {
  localStorage.setItem("tradelike_user", JSON.stringify({
    id: 1,
    email: "customer@example.com",
    name: "Customer",
    accountStatus: "Active",
    passwordResetRequired: false,
    ...user,
  }));
}

describe("access diagnostics pages", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("UpgradeRequired shows missing feature and plan reason", () => {
    setStoredUser({ role: "CustomerDirector", plan: null });

    render(
      <MemoryRouter initialEntries={["/settings/full-data-export"]}>
        <UpgradeRequired featureName="Full Data Export" minimumPlan="Business" />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/stored session has no recognised plan/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Business plan/i)).toBeInTheDocument();
    expect(screen.getByText("£39.95/month")).toBeInTheDocument();
    expect(screen.getByText("£99.95/month")).toBeInTheDocument();
    expect(screen.getByText("£159.95/month")).toBeInTheDocument();
    expect(screen.getByText("Contact Sales")).toBeInTheDocument();
    expect(screen.queryByText("£40/month")).not.toBeInTheDocument();
    expect(screen.queryByText("£199/month")).not.toBeInTheDocument();
  });

  it("AccessDenied shows role reason", () => {
    setStoredUser({ role: "CustomerEmployee", plan: "Business" });

    render(
      <MemoryRouter initialEntries={["/settings/billing"]}>
        <AccessDenied requiredRoles={["CustomerDirector"]} />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/not in the allowed role list/i)[0]).toBeInTheDocument();
  });

  it("customer trying /admin shows staff-area explanation", () => {
    setStoredUser({ role: "CustomerDirector", plan: "Business" });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AccessDenied />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/customer accounts cannot access the internal staff area/i)[0]).toBeInTheDocument();
  });

  it("staff trying customer area shows customer-area explanation", () => {
    setStoredUser({ role: "Support", plan: "Internal" });

    render(
      <MemoryRouter initialEntries={["/customers"]}>
        <AccessDenied />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/outside this customer-only workspace route/i)[0]).toBeInTheDocument();
  });
});
