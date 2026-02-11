import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import axiosInstance from "../lib/axios";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Clipboard,
  CreditCard,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
} from "lucide-react";

function Dashboardpage() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  const dashboardBasePath = useMemo(() => {
    switch (user?.role) {
      case "admin":
        return "/AdminDashboard";
      case "manager":
        return "/ManagerDashboard";
      case "staff":
        return "/StaffDashboard";
      default:
        return "/";
    }
  }, [user?.role]);

  const accentStyles = {
    emerald: {
      bar: "bg-emerald-500",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      ring: "ring-emerald-100",
    },
    blue: {
      bar: "bg-blue-500",
      bg: "bg-blue-50",
      text: "text-blue-600",
      ring: "ring-blue-100",
    },
    teal: {
      bar: "bg-teal-500",
      bg: "bg-teal-50",
      text: "text-teal-600",
      ring: "ring-teal-100",
    },
    amber: {
      bar: "bg-amber-500",
      bg: "bg-amber-50",
      text: "text-amber-600",
      ring: "ring-amber-100",
    },
    purple: {
      bar: "bg-purple-500",
      bg: "bg-purple-50",
      text: "text-purple-600",
      ring: "ring-purple-100",
    },
  };

  const dashboardCards = [
    {
      label: "New Sale",
      path: `${dashboardBasePath}/sales`,
      icon: ShoppingCart,
      accent: "emerald",
    },
    {
      label: "New Purchase",
      path: `${dashboardBasePath}/order`,
      icon: Clipboard,
      accent: "blue",
    },
    {
      label: "Receive Payment",
      path: `${dashboardBasePath}/payments`,
      icon: CreditCard,
      accent: "teal",
    },
    {
      label: "Make Payment",
      path: `${dashboardBasePath}/payments`,
      icon: DollarSign,
      accent: "amber",
    },
    {
      label: "Add Product",
      path: `${dashboardBasePath}/product`,
      icon: Package,
      accent: "purple",
    },
  ];

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await axiosInstance.get("/dashboard/summary");
        setSummary(res.data.summary || null);
        setRecentInvoices(res.data.recentInvoices || []);
        setOverdueInvoices(res.data.overdueInvoices || []);
        setLowStockProducts(res.data.lowStockProducts || []);
      } catch (error) {
        console.error("Failed to load dashboard summary:", error);
      }
    };

    fetchSummary();
  }, []);

  return (
    <div className="min-h-[92vh] bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Welcome Section */}
      <div className="mb-6">
        {/* <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Welcome back, {user?.name || "User"}!
        </h1> */}
        <p className="text-gray-600">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          {
            label: "Total Receivable",
            value: summary?.totalReceivable ?? 0,
            bg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
            icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
            borderColor: "border-emerald-200",
          },
          {
            label: "Total Payable",
            value: summary?.totalPayable ?? 0,
            bg: "bg-gradient-to-br from-rose-50 to-rose-100",
            icon: <TrendingDown className="w-5 h-5 text-rose-600" />,
            borderColor: "border-rose-200",
          },
          {
            label: "Today's Sales",
            value: summary?.todaysSales ?? 0,
            bg: "bg-gradient-to-br from-blue-50 to-blue-100",
            icon: <ShoppingCart className="w-5 h-5 text-blue-600" />,
            borderColor: "border-blue-200",
          },
          {
            label: "Today's Purchases",
            value: summary?.todaysPurchases ?? 0,
            bg: "bg-gradient-to-br from-amber-50 to-amber-100",
            icon: <Package className="w-5 h-5 text-amber-600" />,
            borderColor: "border-amber-200",
          },
          {
            label: "Cash / Bank Balance",
            value: summary?.cashBankBalance ?? 0,
            bg: "bg-gradient-to-br from-teal-50 to-teal-100",
            icon: <DollarSign className="w-5 h-5 text-teal-600" />,
            borderColor: "border-teal-200",
          },
        ].map(({ label, value, bg, icon, borderColor }) => (
          <div
            key={label}
            className={`rounded-xl p-5 border-2 ${borderColor} ${bg} shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-600">{label}</div>
              {icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">
              Rs {Number(value).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {dashboardCards.map(({ label, path, icon: Icon, accent }) => {
            const styles = accentStyles[accent];

            return (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="
        group relative
        rounded-2xl
        bg-white
        border border-gray-200
        p-5
        text-left
        shadow-sm
        hover:shadow-lg
        hover:-translate-y-1
        transition-all duration-300
      "
              >
                {/* Accent bar */}
                <div
                  className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${styles.bar}`}
                />

                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className={`
            flex h-14 w-14 items-center justify-center
            rounded-xl
            ${styles.bg}
            ${styles.text}
            ring-1 ${styles.ring}
            group-hover:scale-105
            transition-transform
          `}
                  >
                    <Icon className="h-7 w-7 stroke-[1.75]" />
                  </div>

                  {/* Text */}
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {label}
                    </div>
                    <div className="text-xs text-gray-500">Perform action</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-5 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">
              Today's Received Payments
            </div>
            <CreditCard className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            Rs {Number(summary?.todaysReceivedPayments ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl p-5 border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">
              Today's Paid Payments
            </div>
            <DollarSign className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700">
            Rs {Number(summary?.todaysPaidPayments ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Information Cards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-5 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Recent Invoices</h3>
            <Clock className="w-5 h-5 text-teal-600" />
          </div>
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8">
              <Clipboard className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No invoices yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentInvoices.map((inv) => (
                <li
                  key={inv._id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-teal-50 transition-colors duration-200"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {inv.invoiceNumber}
                  </span>
                  <span className="text-sm font-semibold text-teal-600">
                    Rs {Number(inv.totalAmount).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Overdue Payments */}
        <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-5 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              Overdue Payments
            </h3>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          {overdueInvoices.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No overdue invoices.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {overdueInvoices.map((inv) => (
                <li
                  key={inv._id}
                  className="flex justify-between items-center p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {inv.invoiceNumber}
                  </span>
                  <span className="text-sm font-semibold text-red-600">
                    {new Date(inv.dueDate).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Low Stock Products */}
        <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-5 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              Low Stock Products
            </h3>
            <Package className="w-5 h-5 text-amber-600" />
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">All products healthy.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {lowStockProducts.map((product) => (
                <li
                  key={product._id}
                  className="flex justify-between items-center p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors duration-200"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {product.name}
                  </span>
                  <span className="text-sm font-semibold text-amber-600">
                    {product.quantity} {product.unit || ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboardpage;
