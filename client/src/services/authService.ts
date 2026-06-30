import { apiClient, setToken } from "./apiClient";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: "Customer" | "Director" | "Admin" | "Support";
    accountStatus: string;
    passwordResetRequired: boolean;
    canManageAccounts: boolean;
    canManageStaff: boolean;
    canManageBilling: boolean;
    canManageSecurity: boolean;
    canViewAuditLogs: boolean;
  };
}

export const authService = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>("/auth/login", {
      email: request.email.trim().toLowerCase(),
      password: request.password.trim(),
    });

    localStorage.setItem("tradelike_token", response.token);
    localStorage.setItem("tradelike_user", JSON.stringify(response.user));

    setToken(response.token);

    return response;
  },

  logout() {
    localStorage.removeItem("tradelike_token");
    localStorage.removeItem("tradelike_user");
  },

  getToken() {
    return localStorage.getItem("tradelike_token");
  },

  getUser() {
    const rawUser = localStorage.getItem("tradelike_user");

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as LoginResponse["user"];
    } catch {
      localStorage.removeItem("tradelike_user");
      return null;
    }
  },
};