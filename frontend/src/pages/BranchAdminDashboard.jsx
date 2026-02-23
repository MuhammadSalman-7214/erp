import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../features/authSlice";
import {
  LayoutDashboard,
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

const BranchAdminDashboard = () => {
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
          path: "/BranchAdminDashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      category: "Management",
      items: [
        {
          name: "User Management",
          path: "/BranchAdminDashboard/user-management",
          icon: UserCog,
        },
        {
          name: "Reports",
          path: "/BranchAdminDashboard/reports",
          icon: BarChart3,
        },
      ],
    },
    {
      category: "Operations",
      items: [
        {
          name: "Products",
          path: "/BranchAdminDashboard/product",
          icon: Package,
        },
        {
          name: "Orders",
          path: "/BranchAdminDashboard/order",
          icon: ShoppingCart,
        },
        {
          name: "Sales",
          path: "/BranchAdminDashboard/sales",
          icon: TrendingUp,
        },
        {
          name: "Stock Transactions",
          path: "/BranchAdminDashboard/stock-transaction",
          icon: Archive,
        },
        {
          name: "Categories",
          path: "/BranchAdminDashboard/category",
          icon: Tag,
        },
        {
          name: "Suppliers",
          path: "/BranchAdminDashboard/supplier",
          icon: Truck,
        },
        {
          name: "Customers",
          path: "/BranchAdminDashboard/customers",
          icon: Users2,
        },
        {
          name: "Invoices",
          path: "/BranchAdminDashboard/invoices",
          icon: FileText,
        },
        {
          name: "Purchase Bills",
          path: "/BranchAdminDashboard/purchase-bills",
          icon: Receipt,
        },
        {
          name: "Ledger",
          path: "/BranchAdminDashboard/ledger",
          icon: BookOpen,
        },
      ],
    },
    {
      category: "Logistics",
      items: [
        {
          name: "Shipments",
          path: "/BranchAdminDashboard/shipments",
          icon: Ship,
        },
        {
          name: "Clearing Jobs",
          path: "/BranchAdminDashboard/clearing-jobs",
          icon: Briefcase,
        },
      ],
    },
    {
      category: "System",
      items: [
        {
          name: "Notifications",
          path: "/BranchAdminDashboard/NotificationPageRead",
          icon: Bell,
        },
        {
          name: "Activity Log",
          path: "/BranchAdminDashboard/activity-log",
          icon: ClipboardList,
        },
      ],
    },
  ];

  return (
    <DashboardShell
      user={user}
      title="ERP Control Center"
      subtitle={`${user?.branch?.name || "Branch"} Admin`}
      roleLabel="Branch Admin"
      menuItems={menuItems}
      profilePath="/BranchAdminDashboard/Profilepage"
      onLogout={handleLogout}
    />
  );
};

export default BranchAdminDashboard;
