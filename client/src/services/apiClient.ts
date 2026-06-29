const BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:5001/api"
).replace(/\/$/, "");

const TOKEN_KEY = "tradelike_token";

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const token = getToken();

  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Don't redirect on a failed login attempt.
  // Only redirect if an authenticated request loses authorization.
  if (response.status === 401 && endpoint !== "/auth/login") {
    clearToken();
    window.location.href = "/";
    throw new Error("Session expired.");
  }

  if (!response.ok) {
    const message = await response.text();

    console.error("API Request Failed", {
      url,
      method: options.method ?? "GET",
      status: response.status,
      message,
    });

    throw new Error(message || `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
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