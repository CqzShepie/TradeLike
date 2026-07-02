import { clearToken, setToken } from "./apiClient";
import type { LoginRequest, LoginResponse } from "./authService";
import { isInternalStaffRole } from "../config/hostnames";

const BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:5001/api"
).replace(/\/$/, "");

const staffOnlyMessage =
  "This login is for TradeLike staff only. Customer users should use the customer app.";

export const staffAuthService = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${BASE_URL}/auth/staff-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: request.email.trim().toLowerCase(),
        password: request.password,
      }),
    });

    const responseText = await response.text();
    const body = responseText.trim() === "" ? null : JSON.parse(responseText);

    if (!response.ok) {
      clearToken();
      throw new Error(getErrorMessage(body, response.status));
    }

    const loginResponse = body as LoginResponse;

    if (!isInternalStaffRole(loginResponse.user?.role)) {
      clearToken();
      throw new Error(staffOnlyMessage);
    }

    localStorage.setItem("tradelike_token", loginResponse.token);
    localStorage.setItem("tradelike_user", JSON.stringify(loginResponse.user));
    setToken(loginResponse.token);

    return loginResponse;
  },
};

function getErrorMessage(body: unknown, status: number) {
  if (isErrorBody(body)) {
    if (body.error === "This login is for TradeLike staff only.") {
      return staffOnlyMessage;
    }

    return body.error ?? body.message ?? `Request failed (${status})`;
  }

  return `Request failed (${status})`;
}

function isErrorBody(body: unknown): body is { error?: string; message?: string } {
  return typeof body === "object" && body !== null;
}
