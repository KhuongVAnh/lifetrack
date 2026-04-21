import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { canAccessPatientPortal, getHomePathForRole, isDoctorRole } from "@/entities/user";

export function RequireDoctorPortal() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (!isDoctorRole(user.normalizedRole ?? user.role)) {
    return <Navigate replace to={getHomePathForRole(user.normalizedRole ?? user.role)} />;
  }

  return <Outlet />;
}

export function RequirePatientPortal() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (!canAccessPatientPortal(user.normalizedRole ?? user.role)) {
    return <Navigate replace to={getHomePathForRole(user.normalizedRole ?? user.role)} />;
  }

  return <Outlet />;
}
