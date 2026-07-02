import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import {
  getDefaultAuthenticatedRoute,
  getDefaultUnauthenticatedRoute,
} from "../config/hostnames";
import Login from "../pages/Login";
import StaffLogin from "../pages/StaffLogin";
import StaffRoute from "../routes/StaffRoute";
import type { AuthUser } from "../services/authService";

const internalUser: AuthUser = {
  id: 1,
  email: "support@tradelike.co.uk",
  name: "Studio Support",
  role: "Support",
  plan: "Internal",
  accountStatus: "Active",
  passwordResetRequired: false,
  canManageAccounts: true,
  canManageStaff: true,
  canManageBilling: true,
  canManageSecurity: true,
  canViewAuditLogs: true,
  canCreateCustomers: true,
  canEditCustomers: true,
  canCancelCustomers: true,
  canResetPasswords: true,
  canVerifyEmails: true,
  canSendEmails: true,
  canManageDiscounts: true,
  canManageFreeMonths: true,
  canViewCustomerNotes: true,
  canEditCustomerNotes: true,
  canViewBilling: true,
  canManageSubscriptions: true,
  canExportData: true,
  canImpersonateCustomer: true,
  canDeleteData: true,
  canViewStaff: true,
  canCreateStaff: true,
  canCancelStaff: true,
  canEditStaffPermissions: true,
  canViewSecurityLogs: true,
};

const customerUser: AuthUser = {
  ...internalUser,
  id: 2,
  email: "customer@example.com",
  name: "Customer Director",
  role: "CustomerDirector",
  plan: "Solo",
};

describe("staff access", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the TradeLike Studio login", () => {
    render(
      <MemoryRouter>
        <StaffLogin />
      </MemoryRouter>
    );

    expect(screen.getAllByText("TradeLike Studio")).toHaveLength(2);
    expect(screen.getByText("Internal staff access")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in to studio/i })).toBeInTheDocument();
  });

  it("rejects a customer user response from staff login", async () => {
    mockStaffLoginResponse(customerUser);

    render(
      <MemoryRouter>
        <StaffLogin />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "customer@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in to studio/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This login is for TradeLike staff only. Customer users should use the customer app."
    );
    expect(localStorage.getItem("tradelike_token")).toBeNull();
  });

  it("accepts an internal staff response from staff login", async () => {
    mockStaffLoginResponse(internalUser);

    renderStaffLoginRouter();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "support@tradelike.co.uk" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in to studio/i }));

    await waitFor(() => expect(screen.getByText("Admin route")).toBeInTheDocument());
    expect(localStorage.getItem("tradelike_token")).toBe("token");
  });

  it("routes staff host unauthenticated users to staff login", () => {
    expect(getDefaultUnauthenticatedRoute("staff.tradelike.co.uk")).toBe("/staff-login");
  });

  it("routes staff host staff users to admin", () => {
    expect(getDefaultAuthenticatedRoute(internalUser, "staff.tradelike.co.uk")).toBe("/admin");
  });

  it("blocks customer users on the staff host", () => {
    expect(getDefaultAuthenticatedRoute(customerUser, "staff.tradelike.co.uk")).toBe(
      "/staff-access-denied"
    );
  });

  it("redirects admin visits without a token to staff login", () => {
    renderAdminRoute();

    expect(screen.getByText("Staff login route")).toBeInTheDocument();
    expect(screen.queryByText("Admin route")).not.toBeInTheDocument();
  });

  it("shows access denied when a customer user opens admin", () => {
    setSession(customerUser);

    renderAdminRoute();

    expect(screen.getByText("This login is for TradeLike staff only.")).toBeInTheDocument();
  });

  it("shows the staff portal link on customer login", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /staff admin portal/i })).toHaveAttribute(
      "href",
      "/staff-login"
    );
  });
});

function renderStaffLoginRouter() {
  return render(
    <MemoryRouter initialEntries={["/staff-login"]}>
      <Routes>
        <Route path="/staff-login" element={<StaffLogin />} />
        <Route path="/admin" element={<div>Admin route</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route
          path="/admin"
          element={
            <StaffRoute>
              <div>Admin route</div>
            </StaffRoute>
          }
        />
        <Route path="/staff-login" element={<div>Staff login route</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function mockStaffLoginResponse(user: AuthUser) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ token: "token", user }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function setSession(user: AuthUser) {
  localStorage.setItem("tradelike_user", JSON.stringify(user));
  localStorage.setItem("tradelike_token", createValidToken());
}

function createValidToken() {
  const payload = window
    .btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `header.${payload}.signature`;
}
