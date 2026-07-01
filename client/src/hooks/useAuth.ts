import { authService } from "../services/authService";

export function useAuth() {
  const user = authService.getUser();

  return {
    user,
    role: user?.role ?? null,
    plan: user?.plan ?? null,
    isManagerOrDirector: authService.isManagerOrDirector(user),
    isDirector: authService.isDirector(user),
  };
}
