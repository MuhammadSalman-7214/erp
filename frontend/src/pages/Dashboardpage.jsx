import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "../lib/axios";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { SelectDropdown } from "../UI";
import {
  Clipboard,
  CreditCard,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  ShoppingCartIcon,
  DollarSignIcon,
  CreditCardIcon,
} from "lucide-react";
import { formatDateLabel } from "../lib/dateFormat";
import { dashboardShowFinancialAmountsStorageKey } from "../features/dashboardSlice";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
);

function Dashboardpage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const showFinancialAmounts = useSelector(
    (state) => state.dashboard.showFinancialAmounts,
  );
  const [summary, setSummary] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [chartRange, setChartRange] = useState("week");
  const [chartLoading, setChartLoading] = useState(false);
  const [lastChartRangeLoaded, setLastChartRangeLoaded] = useState("week");
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [resolvedUser, setResolvedUser] = useState(user);
  const { sidebarOpen } = useSelector((state) => state.sidebar);
  const [dashboardReady, setDashboardReady] = useState(false);

  const sortedRecentInvoices = useMemo(
    () =>
      [...recentInvoices].sort(
        (a, b) =>
          new Date(a.createdAt || a.issueDate || 0).getTime() -
          new Date(b.createdAt || b.issueDate || 0).getTime(),
      ),
    [recentInvoices],
  );

  const accentStyles = {
    emerald: {
      bar: "bg-emerald-500",
      bg: "bg-gradient-to-b from-emerald-100 to-white",
      text: "text-emerald-600",
      ring: "ring-emerald-100",
    },
    blue: {
      bar: "bg-blue-500",
      bg: "bg-gradient-to-b from-blue-100 to-white",
      text: "text-blue-600",
      ring: "ring-blue-100",
    },
    teal: {
      bar: "bg-teal-500",
      bg: "bg-gradient-to-b from-teal-100 to-white",
      text: "text-teal-600",
      ring: "ring-teal-100",
    },
    amber: {
      bar: "bg-amber-500",
      bg: "bg-gradient-to-b from-amber-100 to-white",
      text: "text-amber-600",
      ring: "ring-amber-100",
    },
    purple: {
      bar: "bg-violet-500",
      bg: "bg-gradient-to-b from-violet-100 to-white",
      text: "text-violet-600",
      ring: "ring-violet-100",
    },
  };

  const quickActions = [
    {
      label: "New Sale",
      path: "/sales",
      icon: DollarSignIcon,
      accent: "emerald",
    },
    {
      label: "New Purchase",
      path: "/order",
      icon: ShoppingCartIcon,
      accent: "blue",
    },
    {
      label: "Make Payment",
      path: "/payments",
      icon: CreditCardIcon,
      accent: "amber",
    },
    {
      label: "Add Product",
      path: "/product",
      icon: Package,
      accent: "purple",
    },
  ];

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(
          `/dashboard/summary?range=${chartRange}`,
        );
        setSummary(res.data.summary || null);
        setWeeklySummary(res.data.summary?.weeklySummary || null);
        setRecentInvoices(res.data.recentInvoices || []);
        setOverdueInvoices(res.data.overdueInvoices || []);
        setLowStockProducts(res.data.lowStockProducts || []);
      } catch (error) {
        console.error("Failed to load dashboard summary:", error);
      } finally {
        setLoading(false);
        setDashboardReady(true);
      }
    };

    fetchSummary();
  }, []);

  useEffect(() => {
    if (!dashboardReady) return;
    if (chartRange === lastChartRangeLoaded) return;

    const fetchChartSummary = async () => {
      try {
        setChartLoading(true);
        const res = await axiosInstance.get(
          `/dashboard/summary?range=${chartRange}`,
        );
        setWeeklySummary(res.data.summary?.weeklySummary || null);
        setLastChartRangeLoaded(chartRange);
      } catch (error) {
        console.error("Failed to load dashboard chart summary:", error);
      } finally {
        setChartLoading(false);
      }
    };

    fetchChartSummary();
  }, [chartRange, dashboardReady, lastChartRangeLoaded]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axiosInstance.get("/auth/me");
        if (response.data?.user) {
          setResolvedUser(response.data.user);
        }
      } catch (error) {
        setResolvedUser(user);
      }
    };

    fetchCurrentUser();
  }, [user]);

  useEffect(() => {
    const fetchBanner = async () => {
      if (!resolvedUser?.id || resolvedUser?.role !== "admin") {
        setBanner(null);
        return;
      }

      try {
        setBannerLoading(true);
        const response = await axiosInstance.get(
          `/users/${resolvedUser.id}/banner`,
        );
        setBanner(response.data?.banner || null);
      } catch (error) {
        setBanner(null);
      } finally {
        setBannerLoading(false);
      }
    };

    fetchBanner();
  }, [resolvedUser?.id, resolvedUser?.role]);

  useEffect(() => {
    try {
      localStorage.setItem(
        dashboardShowFinancialAmountsStorageKey,
        JSON.stringify(showFinancialAmounts),
      );
    } catch {
      // Ignore storage failures and keep the in-memory preference working.
    }
  }, [showFinancialAmounts]);

  const safeNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const chartBarPalette = [
    {
      border: "rgba(20, 184, 166, 1)",
      fill: "rgba(20, 184, 166, 0.16)",
    },
    {
      border: "rgba(59, 130, 246, 1)",
      fill: "rgba(59, 130, 246, 0.16)",
    },
    {
      border: "rgba(245, 158, 11, 1)",
      fill: "rgba(245, 158, 11, 0.16)",
    },
    {
      border: "rgba(244, 63, 94, 1)",
      fill: "rgba(244, 63, 94, 0.16)",
    },
  ];

  const todayChartData = useMemo(
    () => ({
      labels: ["Sales", "Purchases", "Received", "Paid"],
      datasets: [
        {
          label: "Total",
          data: [
            safeNumber(summary?.totalSales),
            safeNumber(summary?.totalPurchases),
            safeNumber(summary?.totalReceivedPayments),
            safeNumber(summary?.totalPaidPayments),
          ],
          backgroundColor: chartBarPalette.map((item) => item.fill),
          borderColor: chartBarPalette.map((item) => item.border),
          borderWidth: 2,
          borderRadius: {
            topLeft: 16,
            topRight: 16,
            bottomLeft: 0,
            bottomRight: 0,
          },
          borderSkipped: false,
          hoverBackgroundColor: chartBarPalette.map((item) => item.fill),
        },
      ],
    }),
    [
      summary?.totalSales,
      summary?.totalPurchases,
      summary?.totalReceivedPayments,
      summary?.totalPaidPayments,
    ],
  );

  const todayChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: showFinancialAmounts,
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          padding: 12,
          titleColor: "#fff",
          bodyColor: "#fff",
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#64748b" },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(148, 163, 184, 0.15)" },
          ticks: { color: "#64748b" },
        },
      },
    }),
    [showFinancialAmounts],
  );

  const weeklyChartData = useMemo(
    () => ({
      labels: weeklySummary?.labels || [],
      datasets: [
        {
          label: "Sales",
          data: weeklySummary?.sales || [],
          borderColor: "rgba(20, 184, 166, 1)",
          backgroundColor: "rgba(20, 184, 166, 0.12)",
          pointBackgroundColor: "rgba(20, 184, 166, 1)",
          pointBorderColor: "#fff",
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.38,
          fill: false,
        },
        {
          label: "Purchases",
          data: weeklySummary?.purchases || [],
          borderColor: "rgba(59, 130, 246, 1)",
          backgroundColor: "rgba(59, 130, 246, 0.12)",
          pointBackgroundColor: "rgba(59, 130, 246, 1)",
          pointBorderColor: "#fff",
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.38,
          fill: false,
        },
        {
          label: "Received",
          data: weeklySummary?.receivedPayments || [],
          borderColor: "rgba(245, 158, 11, 1)",
          backgroundColor: "rgba(245, 158, 11, 0.12)",
          pointBackgroundColor: "rgba(245, 158, 11, 1)",
          pointBorderColor: "#fff",
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.38,
          fill: false,
        },
        {
          label: "Paid",
          data: weeklySummary?.paidPayments || [],
          borderColor: "rgba(244, 63, 94, 1)",
          backgroundColor: "rgba(244, 63, 94, 0.12)",
          pointBackgroundColor: "rgba(244, 63, 94, 1)",
          pointBorderColor: "#fff",
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.38,
          fill: false,
        },
      ],
    }),
    [
      weeklySummary?.labels,
      weeklySummary?.sales,
      weeklySummary?.purchases,
      weeklySummary?.receivedPayments,
      weeklySummary?.paidPayments,
    ],
  );

  const weeklyChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            boxWidth: 10,
          },
        },
        tooltip: {
          enabled: showFinancialAmounts,
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          padding: 12,
          titleColor: "#fff",
          bodyColor: "#fff",
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#64748b" },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(148, 163, 184, 0.15)" },
          ticks: { color: "#64748b" },
        },
      },
    }),
    [showFinancialAmounts],
  );

  return (
    <div className="min-h-[92vh] bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.14),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] p-4">
      {bannerLoading ? null : banner ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 text-amber-700 p-2">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Subscription Reminder
              </p>
              <p className="text-sm text-amber-800 mt-1">{banner}</p>
            </div>
          </div>
        </div>
      ) : null}
      {/* Header Section */}

      {/* <div className="relative flex flex-col gap-5 lg:flex-row lg:justify-between items-center mb-4">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
            <Activity className="h-3.5 w-3.5" />
            Business dashboard
          </div>

          <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-800 sm:text-sm">
            Here is a clean overview of what is happening today.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => dispatch(setShowFinancialAmounts(!showFinancialAmounts))}
          variant="outline"
        >
          {showFinancialAmounts ? (
            <>
              <Eye className="h-4 w-4" />
              Hide Amounts
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4" />
              Show Amounts
            </>
          )}
        </Button>
      </div> */}
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-lg p-5 border-2 border-slate-100 bg-white shadow-sm animate-pulse"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 w-24 rounded-full bg-slate-200" />
                  <div className="h-5 w-5 rounded-md bg-slate-200" />
                </div>
                <div className="h-8 w-32 rounded-full bg-slate-200" />
              </div>
            ))
          : [
              {
                label: "Profit",
                value: summary?.totalProfit ?? 0,
                bg: "bg-gradient-to-tl from-violet-200 via-violet-50 to-white",
                icon: <TrendingUp className="w-5 h-5 text-violet-900" />,
                decoration: "bg-violet-50",
                text: "text-violet-900",
              },
              {
                label: "Total Receivable",
                value: summary?.totalReceivable ?? 0,
                bg: "bg-gradient-to-tl from-blue-200 via-blue-50 to-white",
                icon: <TrendingUp className="w-5 h-5 text-blue-900" />,
                decoration: "bg-blue-50",
                text: "text-blue-900",
              },
              {
                label: "Total Payable",
                value: summary?.totalPayable ?? 0,
                bg: "bg-gradient-to-tl from-rose-200 via-rose-50 to-white",
                icon: <TrendingDown className="w-5 h-5 text-rose-900" />,
                decoration: "bg-rose-50",
                text: "text-rose-900",
              },
              {
                label: "Bank Balance",
                value: summary?.cashBankBalance ?? 0,
                bg: "bg-gradient-to-tl from-amber-200 via-amber-50 to-white",
                icon: <DollarSign className="w-5 h-5 text-amber-900" />,
                decoration: "bg-amber-50",
                text: "text-amber-900",
              },
            ].map(({ label, value, bg, icon, decoration, text }) => (
              <div
                key={label}
                className={`relative overflow-hidden rounded-lg p-5 ${bg} shadow-[0_0_6px_rgba(15,23,42,0.2)] hover:shadow-[0_0_10px_rgba(15,23,42,0.2)] transition-all duration-300 transform hover:-translate-y-1`}
              >
                <div
                  className={`absolute -top-8 -right-8 rounded-full h-[90px] w-[90px] ${decoration}`}
                ></div>

                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">
                    {label}
                  </div>
                  <span className="absolute top-3 right-3 z-10">{icon}</span>
                </div>
                <div
                  className={`text-2xl font-bold ${text} transition-all duration-300 ${
                    showFinancialAmounts ? "" : "blur-sm select-none"
                  }`}
                >
                  Rs {safeNumber(value).toLocaleString()}
                </div>
              </div>
            ))}
      </div>
      <div className="mb-4 flex w-full flex-col gap-4 xl:flex-row">
        <div className="w-full xl:w-[24.8%]">
          <section className="rounded-lg bg-white p-3 pt-2 shadow-[0_0_6px_rgba(15,23,42,0.2)] backdrop-blur">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-teal-600">
                  Quick Actions
                </h2>
                <p className="text-xs text-slate-500">
                  Fast access to the common operational tasks.
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              {quickActions.map(({ label, path, icon: Icon, accent }) => {
                const styles = accentStyles[accent];

                return (
                  <button
                    key={label}
                    onClick={() => navigate(path)}
                    className={`group relative aspect-square overflow-hidden rounded-xl  ${styles.bg} border border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
                  >
                    {/* Left Accent Bar */}
                    {/* <div className={`h-2 w-full rounded-l-xl ${styles.bar}`} /> */}

                    {/* Card Content */}
                    <div className="flex h-full flex-col items-center justify-center px-3 text-center">
                      <div
                        className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_0_6px_rgba(15,23,42,0.2)] ${styles.text} ring-1 ${styles.ring} transition-transform duration-300 group-hover:scale-110`}
                      >
                        <Icon className="h-7 w-7 stroke-[1.75]" />
                      </div>

                      <h3 className="text-sm font-semibold text-slate-800">
                        {label}
                      </h3>

                      {/* <p className="mt-1 text-xs text-slate-500">
                        Perform Action
                      </p> */}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
        <div className="w-full xl:flex-1">
          <div className="grid gap-4 xl:grid-cols-2">
            <section
              className={`flex ${sidebarOpen ? "h-[350px]" : "h-[400px]"} flex-col rounded-lg bg-white p-3 shadow-[0_0_6px_rgba(15,23,42,0.2)] backdrop-blur`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-teal-600">
                    Total chart
                  </h2>
                  <p className="text-xs text-slate-500">
                    All-time sales, purchases, and payments
                  </p>
                </div>
                <div className="rounded-2xl bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700">
                  Lifetime totals
                </div>
              </div>

              <div className="relative mt-4 h-[340px] overflow-hidden rounded-lg border border-slate-100 bg-gradient-to-br from-slate-50/80 to-white/80 p-3 backdrop-blur-md">
                {loading ? (
                  <div className="flex h-full items-center justify-center rounded-lg bg-white/70 text-sm text-slate-500">
                    Loading chart...
                  </div>
                ) : (
                  <>
                    <div
                      className={`h-full transition-all duration-300 ${
                        showFinancialAmounts
                          ? ""
                          : "scale-[0.99] blur-md opacity-70"
                      }`}
                    >
                      <Bar data={todayChartData} options={todayChartOptions} />
                    </div>
                  </>
                )}
              </div>
            </section>

            <section
              className={`flex ${sidebarOpen ? "h-[350px]" : "h-[400px]"} flex-col rounded-lg bg-white p-3 shadow-[0_0_6px_rgba(15,23,42,0.2)] backdrop-blur`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-teal-600">
                    Weekly chart
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sales, purchases, and payments by selected range
                  </p>
                </div>
                <SelectDropdown
                  value={chartRange}
                  onChange={(value) => setChartRange(value)}
                  options={[
                    { value: "today", label: "Today" },
                    { value: "week", label: "This Week" },
                    { value: "month", label: "This Month" },
                    { value: "year", label: "This Year" },
                  ]}
                  placeholder="Select Duration"
                  uppercase={false}
                  wrapperClassName="w-32"
                  selectClassName="py-2 text-xs font-semibold text-teal-700 bg-teal-50 border-teal-100"
                />
              </div>

              <div className="relative mt-4 h-[340px] overflow-hidden rounded-lg border border-slate-100 bg-gradient-to-br from-slate-50/80 to-white/80 p-3 backdrop-blur-md">
                {loading || chartLoading ? (
                  <div className="flex h-full items-center justify-center rounded-lg bg-white/70 text-sm text-slate-500">
                    Loading weekly chart...
                  </div>
                ) : (
                  <>
                    <div
                      className={`h-full transition-all duration-300 ${
                        showFinancialAmounts
                          ? ""
                          : "scale-[0.99] blur-md opacity-70"
                      }`}
                    >
                      <Line
                        data={weeklyChartData}
                        options={weeklyChartOptions}
                      />
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Information Cards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Invoices */}
        <div className="bg-white rounded-lg shadow-[0_0_6px_rgba(15,23,42,0.2)] hover:shadow-[0_0_10px_rgba(15,23,42,0.2)] p-4  transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Recent Invoices</h3>
            <Clock className="w-5 h-5 text-teal-600" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg animate-pulse"
                >
                  <div className="h-4 w-32 rounded-full bg-slate-200" />
                  <div className="h-4 w-20 rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className="text-center py-8">
              <Clipboard className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No invoices yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {sortedRecentInvoices.map((inv) => (
                <li
                  key={inv.id}
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
        <div className="bg-white rounded-lg shadow-[0_0_6px_rgba(15,23,42,0.2)] hover:shadow-[0_0_10px_rgba(15,23,42,0.2)] p-4 transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                Overdue Payments
              </h3>
              <p className="text-xs text-gray-500">
                Overdue by more than 6 days
              </p>
            </div>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-red-50 rounded-lg animate-pulse"
                >
                  <div className="h-4 w-32 rounded-full bg-slate-200" />
                  <div className="h-4 w-20 rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          ) : overdueInvoices.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No overdue invoices.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {overdueInvoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex justify-between items-center p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {inv.invoiceNumber}
                  </span>
                  <span className="text-sm font-semibold text-red-600">
                    {formatDateLabel(inv.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Low Stock Products */}
        <div className="bg-white rounded-lg shadow-[0_0_6px_rgba(15,23,42,0.2)] hover:shadow-[0_0_10px_rgba(15,23,42,0.2)] p-4 transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                Low Stock Products
              </h3>
              <p className="text-xs text-gray-500">Quantity less than 50</p>
            </div>
            <Package className="w-5 h-5 text-amber-600" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-amber-50 rounded-lg animate-pulse"
                >
                  <div className="h-4 w-40 rounded-full bg-slate-200" />
                  <div className="h-4 w-20 rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          ) : lowStockProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">All products healthy.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {lowStockProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex justify-between items-center p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors duration-200"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {product.product?.name || "Product"}{" "}
                    {product.product?.company || product.product?.brand ? (
                      <span className="text-xs text-slate-500">
                        • {product.product?.company || product.product?.brand}
                      </span>
                    ) : null}{" "}
                    <span className="text-xs text-slate-500">
                      ({product.code})
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-amber-600">
                    {(() => {
                      return product.quantity > 0 ? (
                        <span>
                          {product.quantity} {product.unit || ""}
                        </span>
                      ) : (
                        <span>Out of stock</span>
                      );
                    })()}
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
