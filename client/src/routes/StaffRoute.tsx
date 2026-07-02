import { Navigate, useLocation } from "react-router-dom";
import { isInternalStaffRole } from "../config/hostnames";
import StaffAccessDenied from "../pages/StaffAccessDenied";
import { authService } from "../services/authService";

export default function StaffRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const user = authService.getUser();

  if (!authService.hasValidSession() || !user) {
    const returnUrl = `${location.pathname}${location.search}`;

    return (
      <Navigate
        to={`/staff-login?returnUrl=${encodeURIComponent(returnUrl)}`}
        replace
      />
    );
  }

  if (!isInternalStaffRole(user.role)) {
    return <StaffAccessDenied />;
  }

  return <>{children}</>;
}
