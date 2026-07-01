import { toast } from "sonner";

const BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:5001/api"
).replace(/\/$/, "");

const TOKEN_KEY = "tradelike_token";

type ApiErrorBody = {
  error?: string;
  message?: string;
  title?: string;
  errors?: Record<string, string[]>;
};

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("tradelike_user");
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const token = getToken();
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && endpoint !== "/auth/login") {
    clearToken();

    const currentPath = window.location.pathname + window.location.search;

    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = `/login?returnUrl=${encodeURIComponent(
        currentPath
      )}`;
    }

    throw new Error("Session expired. Please sign in again.");
  }

  if (response.status === 402) {
    toast.error("Upgrade required");

    if (!window.location.pathname.startsWith("/settings/billing")) {
      window.location.href = "/settings/billing";
    }
  }

  const responseText = await response.text();

  if (!response.ok) {
    const message = getErrorMessage(responseText, response.status);

    console.error("API Request Failed", {
      url,
      method: options.method ?? "GET",
      status: response.status,
      message,
    });

    throw new Error(message);
  }

  if (response.status === 204 || responseText.trim() === "") {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}

function getErrorMessage(responseText: string, status: number) {
  if (responseText.trim() === "") {
    return `Request failed (${status})`;
  }

  try {
    const parsed = JSON.parse(responseText) as ApiErrorBody;

    if (typeof parsed.error === "string" && parsed.error.trim() !== "") {
      return parsed.error;
    }

    if (typeof parsed.message === "string" && parsed.message.trim() !== "") {
      return parsed.message;
    }

    if (parsed.errors) {
      const firstError = Object.values(parsed.errors)
        .flat()
        .find(error => error.trim() !== "");

      if (firstError) {
        return firstError;
      }
    }

    if (typeof parsed.title === "string" && parsed.title.trim() !== "") {
      return parsed.title;
    }
  } catch {
    return responseText;
  }

  return `Request failed (${status})`;
}

export const apiClient = {
  get<T>(endpoint: string) {
    return request<T>(endpoint);
  },

  post<T>(endpoint: string, body: unknown) {
    return request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  put<T>(endpoint: string, body: unknown) {
    return request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  delete<T>(endpoint: string) {
    return request<T>(endpoint, {
      method: "DELETE",
    });
  },
};
