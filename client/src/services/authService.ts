import { apiClient, clearToken, setToken } from "./apiClient";

export type UserRole =
  | "CustomerDirector"
  | "CustomerManager"
  | "CustomerEmployee"
  | "Customer"
  | "Staff"
  | "Director"
  | "Admin"
  | "Support"
  | "Junior Developer"
  | "Developer"
  | "Senior Developer"
  | "Marketing"
  | "Customer Service"
  | "Operations Coordinator"
  | "Personal Assistant";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  businessName: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  plan?: string | null;
  personalAssistantTo?: string | null;
  accountStatus: string;
  passwordResetRequired: boolean;

  canManageAccounts: boolean;
  canManageStaff: boolean;
  canManageBilling: boolean;
  canManageSecurity: boolean;
  canViewAuditLogs: boolean;

  canCreateCustomers: boolean;
  canEditCustomers: boolean;
  canCancelCustomers: boolean;
  canResetPasswords: boolean;
  canVerifyEmails: boolean;
  canSendEmails: boolean;
  canManageDiscounts: boolean;
  canManageFreeMonths: boolean;
  canViewCustomerNotes: boolean;
  canEditCustomerNotes: boolean;
  canViewBilling: boolean;
  canManageSubscriptions: boolean;
  canExportData: boolean;
  canImpersonateCustomer: boolean;
  canDeleteData: boolean;
  canViewStaff: boolean;
  canCreateStaff: boolean;
  canCancelStaff: boolean;
  canEditStaffPermissions: boolean;
  canViewSecurityLogs: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export function normalizeUserRole(role: UserRole | string | null | undefined): UserRole {
  const normalized = String(role ?? "").trim().toLowerCase();

  switch (normalized) {
    case "customerdirector":
    case "customer director":
    case "director":
    case "customer":
      return "CustomerDirector";
    case "customermanager":
    case "customer manager":
      return "CustomerManager";
    case "customeremployee":
    case "customer employee":
      return "CustomerEmployee";
    case "staff":
      return "Staff";
    default:
      return role ? (role as UserRole) : "CustomerEmployee";
  }
}

function saveSession(response: LoginResponse) {
  localStorage.setItem("tradelike_token", response.token);
  localStorage.setItem("tradelike_user", JSON.stringify(response.user));

  setToken(response.token);
}

function readStoredUser() {
  const rawUser = localStorage.getItem("tradelike_user");

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    localStorage.removeItem("tradelike_user");
    return null;
  }
}

function isTokenExpired(token: string) {
  const [, payload] = token.split(".");

  if (!payload) {
    return true;
  }

  try {
    const decodedPayload = JSON.parse(atob(toBase64(payload))) as { exp?: number };

    if (!decodedPayload.exp) {
      return true;
    }

    return decodedPayload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function toBase64(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return padded.replace(/-/g, "+").replace(/_/g, "/");
}

export const authService = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>("/auth/login", {
      email: request.email.trim().toLowerCase(),
      password: request.password,
    });

    saveSession(response);

    return response;
  },

  async register(request: RegisterRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>("/auth/register", {
      businessName: request.businessName.trim(),
      email: request.email.trim().toLowerCase(),
      password: request.password,
    });

    saveSession(response);

    return response;
  },

  logout() {
    clearToken();
  },

  getToken() {
    return localStorage.getItem("tradelike_token");
  },

  getUser() {
    return readStoredUser();
  },

  isLoggedIn() {
    return Boolean(localStorage.getItem("tradelike_token"));
  },

  hasValidSession() {
    const token = localStorage.getItem("tradelike_token");

    if (!token || isTokenExpired(token)) {
      clearToken();
      return false;
    }

    return true;
  },

  isStaffUser(user = readStoredUser()) {
    if (!user) {
      return false;
    }

    return !["CustomerDirector", "CustomerManager", "CustomerEmployee"].includes(normalizeUserRole(user.role));
  },

  isDirector(user = readStoredUser()) {
    return normalizeUserRole(user?.role) === "CustomerDirector";
  },

  isManagerOrDirector(user = readStoredUser()) {
    const role = normalizeUserRole(user?.role);
    return role === "CustomerManager" || role === "CustomerDirector";
  },

  hasPermission(permission: keyof AuthUser, user = readStoredUser()) {
    if (!user) {
      return false;
    }

    if (normalizeUserRole(user.role) === "CustomerDirector") {
      return true;
    }

    return Boolean(user[permission]);
  },
};
