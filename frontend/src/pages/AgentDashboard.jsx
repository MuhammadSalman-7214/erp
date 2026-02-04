// pages/AgentDashboard.jsx - NEW

import React from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  LayoutDashboard,
  Briefcase,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { logout } from "../features/authSlice";

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
      items: [
        { name: "Overview", path: "/AgentDashboard", icon: LayoutDashboard },
      ],
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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg overflow-y-auto">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-orange-600">ERP System</h1>
          <p className="text-sm text-gray-600 mt-1">Clearing Agent</p>
        </div>

        <nav className="p-4">
          {menuItems.map((section, idx) => (
            <div key={idx} className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {section.category}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item, itemIdx) => (
                  <li key={itemIdx}>
                    <Link
                      to={item.path}
                      className="flex items-center px-3 py-2 text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      <span className="text-sm font-medium">{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Welcome, {user?.name}
            </h2>
            <div className="flex items-center space-x-4">
              <Link
                to="/AgentDashboard/Profilepage"
                className="flex items-center space-x-2 text-gray-700 hover:text-orange-600"
              >
                <Settings className="w-5 h-5" />
                <span>Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AgentDashboard;
