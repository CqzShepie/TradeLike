import { Navigate, useLocation } from "react-router-dom";
import { authService } from "../services/authService";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (!authService.hasValidSession()) {
    const returnUrl = `${location.pathname}${location.search}`;

    return (
      <Navigate
        to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
