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
  };
}

export const authService = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      "/auth/login",
      request
    );

    setToken(response.token);

    return response;
  },

  logout() {
    localStorage.removeItem("tradelike_token");
  },
};