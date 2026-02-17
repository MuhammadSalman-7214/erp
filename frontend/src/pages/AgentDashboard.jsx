import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { LayoutDashboard, Briefcase, Bell } from "lucide-react";
import { logout } from "../features/authSlice";
import DashboardShell from "../Components/DashboardShell";

const AgentDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const menuItems = [
    {
      category: "Dashboard",
      items: [{ name: "Overview", path: "/AgentDashboard", icon: LayoutDashboard }],
    },
    {
      category: "My Jobs",
      items: [
        {
          name: "Clearing Jobs",
          path: "/AgentDashboard/clearing-jobs",
          icon: Briefcase,
        },
      ],
    },
    {
      category: "System",
      items: [
        {
          name: "Notifications",
          path: "/AgentDashboard/NotificationPageRead",
          icon: Bell,
        },
      ],
    },
  ];

  return (
    <DashboardShell
      user={user}
      title="ERP Control Center"
      subtitle="Clearing Agent"
      roleLabel="Agent"
      menuItems={menuItems}
      profilePath="/AgentDashboard/Profilepage"
      onLogout={handleLogout}
    />
  );
};

export default AgentDashboard;
