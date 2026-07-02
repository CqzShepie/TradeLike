import { Navigate, useLocation } from "react-router-dom";
import AccessDenied from "../pages/AccessDenied";
import { authService } from "../services/authService";

export default function StaffRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const user = authService.getUser();

  if (!authService.hasValidSession() || !user) {
    const returnUrl = `${location.pathname}${location.search}`;

    return (
      <Navigate
        to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
        replace
      />
    );
  }

  if (!authService.isStaffUser(user)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
