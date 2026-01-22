// lib/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = ({
  children,
  allowedRoles = [],
  requireAuth = true,
}) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/LoginPage" replace />;
  }

  if (allowedRoles.length > 0) {
    if (!user || !allowedRoles.includes(user.role)) {
      const roleRedirects = {
        admin: "/AdminDashboard",
        manager: "/ManagerDashboard",
        staff: "/StaffDashboard",
      };
      return <Navigate to={roleRedirects[user?.role] || "/"} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
