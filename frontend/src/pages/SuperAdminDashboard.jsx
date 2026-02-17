import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../features/authSlice";
import {
  LayoutDashboard,
  Globe,
  Building2,
  DollarSign,
  UserCog,
  Package,
  ShoppingCart,
  TrendingUp,
  Archive,
  Tag,
  Truck,
  FileText,
  Ship,
  Briefcase,
  Receipt,
  Users2,
  BookOpen,
  BarChart3,
  Bell,
  ClipboardList,
} from "lucide-react";
import DashboardShell from "../Components/DashboardShell";

const SuperAdminDashboard = () => {
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
      items: [{ name: "Overview", path: "/SuperAdminDashboard", icon: LayoutDashboard }],
    },
    {
      category: "Hierarchy",
      items: [
        { name: "Countries", path: "/SuperAdminDashboard/countries", icon: Globe },
        { name: "Branches", path: "/SuperAdminDashboard/branches", icon: Building2 },
        {
          name: "Exchange Rates",
          path: "/SuperAdminDashboard/exchange-rates",
          icon: DollarSign,
        },
        {
          name: "User Management",
          path: "/SuperAdminDashboard/user-management",
          icon: UserCog,
        },
      ],
    },
    {
      category: "Reports",
      items: [
        {
          name: "Global Reports",
          path: "/SuperAdminDashboard/reports/global",
          icon: BarChart3,
        },
        {
          name: "Country Reports",
          path: "/SuperAdminDashboard/reports/country",
          icon: Globe,
        },
        {
          name: "Branch Reports",
          path: "/SuperAdminDashboard/reports/branch",
          icon: Building2,
        },
      ],
    },
    {
      category: "Operations",
      items: [
        { name: "Products", path: "/SuperAdminDashboard/product", icon: Package },
        { name: "Orders", path: "/SuperAdminDashboard/order", icon: ShoppingCart },
        { name: "Sales", path: "/SuperAdminDashboard/sales", icon: TrendingUp },
        {
          name: "Stock Transactions",
          path: "/SuperAdminDashboard/stock-transaction",
          icon: Archive,
        },
        { name: "Categories", path: "/SuperAdminDashboard/category", icon: Tag },
        { name: "Suppliers", path: "/SuperAdminDashboard/supplier", icon: Truck },
        { name: "Customers", path: "/SuperAdminDashboard/customers", icon: Users2 },
        { name: "Invoices", path: "/SuperAdminDashboard/invoices", icon: FileText },
        {
          name: "Purchase Bills",
          path: "/SuperAdminDashboard/purchase-bills",
          icon: Receipt,
        },
        { name: "Ledger", path: "/SuperAdminDashboard/ledger", icon: BookOpen },
      ],
    },
    {
      category: "Logistics",
      items: [
        { name: "Shipments", path: "/SuperAdminDashboard/shipments", icon: Ship },
        {
          name: "Clearing Jobs",
          path: "/SuperAdminDashboard/clearing-jobs",
          icon: Briefcase,
        },
      ],
    },
    {
      category: "System",
      items: [
        { name: "Notifications", path: "/SuperAdminDashboard/notifications", icon: Bell },
        {
          name: "Activity Log",
          path: "/SuperAdminDashboard/activity-log",
          icon: ClipboardList,
        },
      ],
    },
  ];

  return (
    <DashboardShell
      user={user}
      title="ERP Control Center"
      subtitle="Super Admin"
      roleLabel="Super Admin"
      menuItems={menuItems}
      profilePath="/SuperAdminDashboard/Profilepage"
      onLogout={handleLogout}
    />
  );
};

export default SuperAdminDashboard;
