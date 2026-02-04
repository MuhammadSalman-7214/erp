// hooks/useRequireAuth.js
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

export const useRequireAuth = (allowedRoles = []) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      toast.error("Please login first");
      navigate("/login", { replace: true });
      return;
    }

    // Check if user has required role
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      toast.error("You don't have permission to access this page");

      // Redirect to their dashboard
      const roleRedirects = {
        superadmin: "/SuperAdminDashboard",
        countryadmin: "/CountryAdminDashboard",
        branchadmin: "/BranchAdminDashboard",
        staff: "/StaffDashboard",
        agent: "/AgentDashboard",
      };

      navigate(roleRedirects[user.role] || "/", { replace: true });
    }
  }, [user, isAuthenticated, allowedRoles, navigate]);

  return {
    user,
    isAuthenticated,
    hasPermission:
      user && (allowedRoles.length === 0 || allowedRoles.includes(user.role)),
  };
};
