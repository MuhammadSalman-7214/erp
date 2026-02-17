import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../features/authSlice";
import {
  LayoutDashboard,
  Building2,
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
  UserCog,
} from "lucide-react";
import DashboardShell from "../Components/DashboardShell";

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
      items: [{ name: "Overview", path: "/CountryAdminDashboard", icon: LayoutDashboard }],
    },
    {
      category: "Management",
      items: [
        { name: "Branches", path: "/CountryAdminDashboard/branches", icon: Building2 },
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
        { name: "Products", path: "/CountryAdminDashboard/product", icon: Package },
        { name: "Orders", path: "/CountryAdminDashboard/order", icon: ShoppingCart },
        { name: "Sales", path: "/CountryAdminDashboard/sales", icon: TrendingUp },
        {
          name: "Stock Transactions",
          path: "/CountryAdminDashboard/stock-transaction",
          icon: Archive,
        },
        { name: "Categories", path: "/CountryAdminDashboard/category", icon: Tag },
        { name: "Suppliers", path: "/CountryAdminDashboard/supplier", icon: Truck },
        { name: "Customers", path: "/CountryAdminDashboard/customers", icon: Users2 },
        { name: "Invoices", path: "/CountryAdminDashboard/invoices", icon: FileText },
        {
          name: "Purchase Bills",
          path: "/CountryAdminDashboard/purchase-bills",
          icon: Receipt,
        },
        { name: "Ledger", path: "/CountryAdminDashboard/ledger", icon: BookOpen },
      ],
    },
    {
      category: "Logistics",
      items: [
        { name: "Shipments", path: "/CountryAdminDashboard/shipments", icon: Ship },
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
        { name: "Notifications", path: "/CountryAdminDashboard/notifications", icon: Bell },
        {
          name: "Activity Log",
          path: "/CountryAdminDashboard/activity-log",
          icon: ClipboardList,
        },
      ],
    },
  ];

  return (
    <DashboardShell
      user={user}
      title="ERP Control Center"
      subtitle={`${user?.country?.name || "Country"} Admin`}
      roleLabel={`Country Admin${user?.country?.currency ? ` (${user.country.currency})` : ""}`}
      menuItems={menuItems}
      profilePath="/CountryAdminDashboard/Profilepage"
      onLogout={handleLogout}
    />
  );
};

export default CountryAdminDashboard;
