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

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  resetLink?: string;
  expiresAtUtc?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
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
  return tryNormalizeUserRole(role) ?? "CustomerEmployee";
}

function tryNormalizeUserRole(role: UserRole | string | null | undefined): UserRole | null {
  const normalized = String(role ?? "").trim().toLowerCase();

  switch (normalized) {
    case "customerdirector":
    case "customer director":
      return "CustomerDirector";
    case "customer":
      return "Customer";
    case "director":
      return "Director";
    case "customermanager":
    case "customer manager":
      return "CustomerManager";
    case "customeremployee":
    case "customer employee":
      return "CustomerEmployee";
    case "staff":
      return "Staff";
    case "admin":
      return "Admin";
    case "support":
      return "Support";
    case "junior developer":
      return "Junior Developer";
    case "developer":
      return "Developer";
    case "senior developer":
      return "Senior Developer";
    case "marketing":
      return "Marketing";
    case "customer service":
      return "Customer Service";
    case "operations coordinator":
      return "Operations Coordinator";
    case "personal assistant":
      return "Personal Assistant";
    default:
      return null;
  }
}

const internalRoles: UserRole[] = [
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
];

function normalizeStoredUserRole(user: Pick<AuthUser, "role" | "plan">): UserRole | null {
  return tryNormalizeUserRole(user.role);
}

function normalizeLoginResponse(response: LoginResponse): LoginResponse {
  const role = normalizeStoredUserRole(response.user);

  if (!role) {
    clearToken();
    throw new Error("This account role needs migration before sign-in.");
  }

  return {
    ...response,
    user: {
      ...response.user,
      role,
    },
  };
}

function saveSession(response: LoginResponse) {
  const normalizedResponse = normalizeLoginResponse(response);

  localStorage.setItem("tradelike_token", normalizedResponse.token);
  localStorage.setItem("tradelike_user", JSON.stringify({
    ...normalizedResponse.user,
  }));

  setToken(normalizedResponse.token);
}

function readStoredUser() {
  const rawUser = localStorage.getItem("tradelike_user");

  if (!rawUser) {
    return null;
  }

  try {
    const user = JSON.parse(rawUser) as AuthUser;
    const role = normalizeStoredUserRole(user);

    if (!role) {
      localStorage.removeItem("tradelike_user");
      localStorage.removeItem("tradelike_token");
      clearToken();
      return null;
    }

    return {
      ...user,
      role,
    };
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

    return normalizeLoginResponse(response);
  },

  async register(request: RegisterRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>("/auth/register", {
      businessName: request.businessName.trim(),
      email: request.email.trim().toLowerCase(),
      password: request.password,
    });

    saveSession(response);

    return normalizeLoginResponse(response);
  },

  async forgotPassword(request: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    return apiClient.post<ForgotPasswordResponse>("/auth/forgot-password", {
      email: request.email.trim().toLowerCase(),
    });
  },

  async resetPassword(request: ResetPasswordRequest): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/auth/reset-password", {
      token: request.token,
      newPassword: request.newPassword,
    });
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

    return internalRoles.includes(normalizeUserRole(user.role));
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
