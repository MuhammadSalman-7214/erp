// pages/CountryAdminDashboard.jsx - NEW

import React from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../features/authSlice";
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  Archive,
  Tag,
  Truck,
  FileText,
  Receipt,
  Users2,
  BookOpen,
  Ship,
  Briefcase,
  BarChart3,
  Bell,
  ClipboardList,
  Settings,
  LogOut,
  UserCog,
} from "lucide-react";

const CountryAdminDashboard = () => {
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
        {
          name: "Overview",
          path: "/CountryAdminDashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      category: "Management",
      items: [
        {
          name: "Branches",
          path: "/CountryAdminDashboard/branches",
          icon: Building2,
        },
        {
          name: "User Management",
          path: "/CountryAdminDashboard/user-management",
          icon: UserCog,
        },
      ],
    },
    {
      category: "Reports",
      items: [
        {
          name: "Country Reports",
          path: "/CountryAdminDashboard/reports/country",
          icon: BarChart3,
        },
        {
          name: "Branch Reports",
          path: "/CountryAdminDashboard/reports/branch",
          icon: Building2,
        },
      ],
    },
    {
      category: "Operations",
      items: [
        {
          name: "Products",
          path: "/CountryAdminDashboard/product",
          icon: Package,
        },
        {
          name: "Orders",
          path: "/CountryAdminDashboard/order",
          icon: ShoppingCart,
        },
        {
          name: "Sales",
          path: "/CountryAdminDashboard/sales",
          icon: TrendingUp,
        },
        {
          name: "Stock Transactions",
          path: "/CountryAdminDashboard/stock-transaction",
          icon: Archive,
        },
        {
          name: "Categories",
          path: "/CountryAdminDashboard/category",
          icon: Tag,
        },
        {
          name: "Suppliers",
          path: "/CountryAdminDashboard/supplier",
          icon: Truck,
        },
        {
          name: "Customers",
          path: "/CountryAdminDashboard/customers",
          icon: Users2,
        },
        {
          name: "Invoices",
          path: "/CountryAdminDashboard/invoices",
          icon: FileText,
        },
        {
          name: "Purchase Bills",
          path: "/CountryAdminDashboard/purchase-bills",
          icon: Receipt,
        },
        {
          name: "Ledger",
          path: "/CountryAdminDashboard/ledger",
          icon: BookOpen,
        },
      ],
    },
    {
      category: "Logistics",
      items: [
        {
          name: "Shipments",
          path: "/CountryAdminDashboard/shipments",
          icon: Ship,
        },
        {
          name: "Clearing Jobs",
          path: "/CountryAdminDashboard/clearing-jobs",
          icon: Briefcase,
        },
      ],
    },
    {
      category: "System",
      items: [
        {
          name: "Notifications",
          path: "/CountryAdminDashboard/notifications",
          icon: Bell,
        },
        {
          name: "Activity Log",
          path: "/CountryAdminDashboard/activity-log",
          icon: ClipboardList,
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg overflow-y-auto">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-green-600">ERP System</h1>
          <p className="text-sm text-gray-600 mt-1">Country Admin</p>
          <p className="text-xs text-gray-500 mt-1">
            {user?.country?.name} ({user?.country?.currency})
          </p>
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
                      className="flex items-center px-3 py-2 text-gray-700 rounded-lg hover:bg-green-50 hover:text-green-600 transition-colors"
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
                to="/CountryAdminDashboard/Profilepage"
                className="flex items-center space-x-2 text-gray-700 hover:text-green-600"
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

export default CountryAdminDashboard;
