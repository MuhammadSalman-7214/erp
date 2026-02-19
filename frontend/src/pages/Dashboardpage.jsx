import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  HandCoins,
  ArrowDownToLine,
  Wallet,
  CreditCard,
  AlertTriangle,
  FileText,
  Boxes,
  Users,
  ShoppingCart,
  PlusCircle,
  PackagePlus,
  UserPlus,
  BarChart3,
  TrendingUp,
  CircleAlert,
} from "lucide-react";
import { LuActivity } from "react-icons/lu";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

import axiosInstance from "../lib/axios";
import { AnimatedNumber } from "../lib/animatedNumber";
import NoData from "../Components/NoData";
import {
  getRecentActivityLogs,
  getsingleUserActivityLogs,
} from "../features/activitySlice";
import { useRolePermissions } from "../hooks/useRolePermissions";

/* ===============================
   CHART SETUP
================================ */
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

/* ===============================
   CONSTANTS
================================ */
const LOW_STOCK_THRESHOLD = 5;

/* ===============================
   HELPERS
================================ */
const asArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumBy = (list, selector) =>
  asArray(list).reduce((acc, item) => acc + toNumber(selector(item)), 0);

const getSalesAmount = (sale) => {
  if (toNumber(sale?.totalAmount) > 0) return toNumber(sale.totalAmount);
  if (toNumber(sale?.totalPrice) > 0) return toNumber(sale.totalPrice);

  return sumBy(sale?.products, (product) => {
    return toNumber(product?.quantity) * toNumber(product?.price);
  });
};

const isInvoiceOverdue = (invoice) => {
  const status = (invoice?.status || "").toLowerCase();

  if (status === "overdue") return true;
  if (["paid", "cancelled"].includes(status)) return false;
  if (!invoice?.dueDate) return false;

  return new Date(invoice.dueDate).getTime() < Date.now();
};

const formatCompact = (value) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(toNumber(value));

/* ─── Palette ───────────────────────────────────────────────────── */

const TONES = {
  teal: {
    orb: "rgba(20,184,166,0.28)",
    orb2: "rgba(6,182,212,0.18)",
    accent: "#14b8a6",
    accentSoft: "rgba(20,184,166,0.12)",
    iconBg: "rgba(20,184,166,0.1)",
    iconColor: "#0d9488",
    ring: "rgba(20,184,166,0.25)",
    badge: "rgba(20,184,166,0.1)",
    badgeText: "#0f766e",
  },
  indigo: {
    orb: "rgba(99,102,241,0.28)",
    orb2: "rgba(139,92,246,0.18)",
    accent: "#6366f1",
    accentSoft: "rgba(99,102,241,0.12)",
    iconBg: "rgba(99,102,241,0.1)",
    iconColor: "#4f46e5",
    ring: "rgba(99,102,241,0.25)",
    badge: "rgba(99,102,241,0.1)",
    badgeText: "#4338ca",
  },
  emerald: {
    orb: "rgba(16,185,129,0.28)",
    orb2: "rgba(52,211,153,0.18)",
    accent: "#10b981",
    accentSoft: "rgba(16,185,129,0.12)",
    iconBg: "rgba(16,185,129,0.1)",
    iconColor: "#059669",
    ring: "rgba(16,185,129,0.25)",
    badge: "rgba(16,185,129,0.1)",
    badgeText: "#047857",
  },
  sky: {
    orb: "rgba(14,165,233,0.28)",
    orb2: "rgba(56,189,248,0.18)",
    accent: "#0ea5e9",
    accentSoft: "rgba(14,165,233,0.12)",
    iconBg: "rgba(14,165,233,0.1)",
    iconColor: "#0284c7",
    ring: "rgba(14,165,233,0.25)",
    badge: "rgba(14,165,233,0.1)",
    badgeText: "#0369a1",
  },
  amber: {
    orb: "rgba(245,158,11,0.28)",
    orb2: "rgba(251,191,36,0.18)",
    accent: "#f59e0b",
    accentSoft: "rgba(245,158,11,0.12)",
    iconBg: "rgba(245,158,11,0.1)",
    iconColor: "#d97706",
    ring: "rgba(245,158,11,0.25)",
    badge: "rgba(245,158,11,0.1)",
    badgeText: "#b45309",
  },
  red: {
    orb: "rgba(239,68,68,0.28)",
    orb2: "rgba(251,113,133,0.18)",
    accent: "#ef4444",
    accentSoft: "rgba(239,68,68,0.12)",
    iconBg: "rgba(239,68,68,0.1)",
    iconColor: "#dc2626",
    ring: "rgba(239,68,68,0.25)",
    badge: "rgba(239,68,68,0.1)",
    badgeText: "#b91c1c",
  },
};
/* ===============================
   UI: PRIMARY KPI CARD
================================ */
function MetricCard({
  title = "Total Revenue",
  value = 84320,
  subtitle = "Compared to last month",
  icon,
  tone = "teal",
  isCurrency = false,
  badge,
}) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const cardRef = useRef(null);
  const t = TONES[tone] || TONES.teal;

  const handleMouseMove = (e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
      style={{
        position: "relative",
        borderRadius: "20px",
        padding: "1.5rem",
        cursor: "default",
        overflow: "hidden",
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.88) 100%)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: `1px solid ${hovered ? t.ring : "rgba(226,232,240,0.7)"}`,
        boxShadow: hovered
          ? `0 20px 60px rgba(15,23,42,0.12), 0 8px 24px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 1px ${t.ring}`
          : "0 4px 16px rgba(15,23,42,0.06), 0 1px 4px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
        transform: hovered
          ? `translateY(-4px) perspective(800px) rotateX(${(mousePos.y - 0.5) * -4}deg) rotateY(${(mousePos.x - 0.5) * 4}deg)`
          : "translateY(0) perspective(800px) rotateX(0) rotateY(0)",
        transition:
          "transform 0.35s cubic-bezier(0.23,1,0.32,1), box-shadow 0.35s ease, border-color 0.35s ease",
        willChange: "transform",
        fontFamily: "'DM Sans', 'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* ── Aurora orb (top-right) ── */}
      <div
        style={{
          position: "absolute",
          top: "-40px",
          right: "-40px",
          width: "160px",
          height: "160px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${t.orb} 0%, transparent 70%)`,
          filter: "blur(28px)",
          opacity: hovered ? 1 : 0.5,
          transition: "opacity 0.5s ease",
          pointerEvents: "none",
        }}
      />

      {/* ── Aurora orb (bottom-left) ── */}
      <div
        style={{
          position: "absolute",
          bottom: "-30px",
          left: "-30px",
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${t.orb2} 0%, transparent 70%)`,
          filter: "blur(24px)",
          opacity: hovered ? 0.8 : 0.3,
          transition: "opacity 0.5s ease",
          pointerEvents: "none",
        }}
      />

      {/* ── Cursor spotlight ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, ${t.accentSoft} 0%, transparent 55%)`,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
          borderRadius: "inherit",
        }}
      />

      {/* ── Top shimmer line ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "15%",
          right: "15%",
          height: "1px",
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.9), ${t.accent}60, rgba(255,255,255,0.9), transparent)`,
          opacity: hovered ? 1 : 0.5,
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
        }}
      />

      {/* ── Accent bottom bar ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`,
          opacity: hovered ? 0.9 : 0,
          transition: "opacity 0.4s ease",
          borderRadius: "0 0 20px 20px",
          pointerEvents: "none",
        }}
      />

      {/* ─────────────── Content ─────────────── */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "1.1rem",
          }}
        >
          {/* Label */}
          <p
            style={{
              margin: 0,
              fontSize: "10.5px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#94a3b8",
              lineHeight: 1,
            }}
          >
            {title}
          </p>

          {/* Icon bubble */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: t.iconBg,
              color: t.iconColor,
              border: `1px solid ${t.ring}`,
              backdropFilter: "blur(8px)",
              boxShadow: `0 2px 8px ${t.accentSoft}, inset 0 1px 0 rgba(255,255,255,0.6)`,
              transform: hovered
                ? "scale(1.08) rotate(-3deg)"
                : "scale(1) rotate(0deg)",
              transition: "transform 0.35s cubic-bezier(0.23,1,0.32,1)",
              flexShrink: 0,
            }}
          >
            {icon || (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            )}
          </div>
        </div>

        {/* Value */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "2px",
            marginBottom: "0.9rem",
          }}
        >
          {isCurrency && (
            <span
              style={{
                fontSize: "17px",
                fontWeight: 600,
                color: "#64748b",
                lineHeight: 1,
                marginBottom: "3px",
                letterSpacing: "-0.02em",
              }}
            >
              $
            </span>
          )}
          <span
            style={{
              fontSize: "34px",
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1,
              letterSpacing: "-0.03em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <AnimatedNumber
              value={Math.round(
                typeof value === "string"
                  ? parseFloat(value.replace(/[^0-9.-]/g, ""))
                  : value,
              )}
              duration={800}
            />
          </span>
        </div>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "#94a3b8",
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </p>

          {badge && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 10px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
                background: t.badge,
                color: t.badgeText,
                border: `1px solid ${t.ring}`,
                backdropFilter: "blur(8px)",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
              }}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===============================
   UI: COMPACT KPI ITEM
================================ */
function CompactMetric({ label, value, icon, tone = "slate", prefix = "" }) {
  const toneClasses = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    teal: "bg-teal-50 text-teal-700 ring-teal-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    cyan: "bg-cyan-50 text-cyan-700 ring-cyan-200",
    fuchsia: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-base font-bold text-slate-900">
          {prefix}
          <AnimatedNumber value={Math.round(toNumber(value))} duration={650} />
        </p>
      </div>
      <div
        className={`rounded-lg p-2 ring-1 ${toneClasses[tone] || toneClasses.slate}`}
      >
        {icon}
      </div>
    </div>
  );
}

/* ===============================
   UI: QUICK ACTION
================================ */
function QuickAction({ label, description, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        group relative overflow-hidden rounded-md
        bg-white p-4 text-left
        transition-all duration-300 ease-out
        shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_12px_30px_rgba(15,23,42,0.10)]
        hover:shadow-[0_0_0_1px_rgba(15,23,42,0.04),0_18px_45px_rgba(15,23,42,0.14)]

        hover:-translate-y-[2px] active:scale-[0.98]
      "
    >
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-teal-400 via-teal-500 to-teal-600"></div>

      {/* Soft hover wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-teal-50/60 opacity-0 transition duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start gap-3 pl-2">
        <div className="rounded-xl bg-teal-50 p-2.5 text-teal-700 transition-all duration-300 group-hover:bg-teal-600 group-hover:text-white">
          {icon}
        </div>

        <div>
          <p className="font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </button>
  );
}

/* ===============================
   DASHBOARD PAGE
================================ */
function Dashboardpage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  /* ===============================
     STORE / AUTH
  ================================ */
  const { user } = useSelector((state) => state.auth);
  const { recentLogs, myLogs } = useSelector((state) => state.activity);
  const { userRole, hasPermission } = useRolePermissions();

  /* ===============================
     LOCAL STATE
  ================================ */
  const [isLoading, setIsLoading] = useState(true);
  const [datasets, setDatasets] = useState({
    sales: [],
    bills: [],
    invoices: [],
    products: [],
    customers: [],
    orders: [],
  });

  const canViewActivity = hasPermission("activityLog", "read");

  /* ===============================
     ROUTE MAPPINGS
  ================================ */
  const dashboardBasePath = useMemo(() => {
    switch (user?.role) {
      case "superadmin":
        return "/SuperAdminDashboard";
      case "countryadmin":
        return "/CountryAdminDashboard";
      case "branchadmin":
        return "/BranchAdminDashboard";
      case "staff":
        return "/StaffDashboard";
      case "agent":
        return "/AgentDashboard";
      default:
        return "/";
    }
  }, [user?.role]);

  const reportsPath = useMemo(() => {
    switch (user?.role) {
      case "superadmin":
        return `${dashboardBasePath}/reports/global`;
      case "countryadmin":
        return `${dashboardBasePath}/reports/country`;
      case "branchadmin":
        return `${dashboardBasePath}/reports`;
      default:
        return null;
    }
  }, [dashboardBasePath, user?.role]);

  const stockPath = useMemo(() => {
    if (["superadmin", "countryadmin", "branchadmin"].includes(user?.role)) {
      return `${dashboardBasePath}/stock-transaction`;
    }
    return null;
  }, [dashboardBasePath, user?.role]);

  /* ===============================
     FETCHERS
  ================================ */
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);

    const results = await Promise.allSettled([
      axiosInstance.get("/sales"),
      axiosInstance.get("/purchase-bill"),
      axiosInstance.get("/invoice/"),
      axiosInstance.get("/product"),
      axiosInstance.get("/customer"),
      axiosInstance.get("/order/getorders"),
    ]);

    const [
      salesRes,
      billsRes,
      invoicesRes,
      productsRes,
      customersRes,
      ordersRes,
    ] = results;

    setDatasets({
      sales:
        salesRes.status === "fulfilled"
          ? asArray(salesRes.value?.data?.sales || salesRes.value?.data)
          : [],
      bills:
        billsRes.status === "fulfilled"
          ? asArray(billsRes.value?.data?.bills || billsRes.value?.data)
          : [],
      invoices:
        invoicesRes.status === "fulfilled"
          ? asArray(
              invoicesRes.value?.data?.data ||
                invoicesRes.value?.data?.invoices ||
                invoicesRes.value?.data,
            )
          : [],
      products:
        productsRes.status === "fulfilled"
          ? asArray(
              productsRes.value?.data?.Products ||
                productsRes.value?.data?.products ||
                productsRes.value?.data,
            )
          : [],
      customers:
        customersRes.status === "fulfilled"
          ? asArray(
              customersRes.value?.data?.customers || customersRes.value?.data,
            )
          : [],
      orders:
        ordersRes.status === "fulfilled"
          ? asArray(ordersRes.value?.data?.orders || ordersRes.value?.data)
          : [],
    });

    setIsLoading(false);
  }, []);

  /* ===============================
     EFFECTS
  ================================ */
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (canViewActivity) {
      dispatch(getRecentActivityLogs());
    } else {
      dispatch(getsingleUserActivityLogs());
    }
  }, [dispatch, canViewActivity, userRole]);

  /* ===============================
     DERIVED METRICS
  ================================ */
  const metrics = useMemo(() => {
    const totalSales = sumBy(datasets.sales, getSalesAmount);
    const totalPurchases = sumBy(datasets.bills, (bill) => bill?.totalAmount);

    const paidInvoices = datasets.invoices.filter(
      (invoice) => (invoice?.status || "").toLowerCase() === "paid",
    );
    const overdueInvoices = datasets.invoices.filter(isInvoiceOverdue);

    const totalPaidAmount = sumBy(
      paidInvoices,
      (invoice) => invoice?.paidAmount ?? invoice?.totalAmount,
    );

    const totalOverdueAmount = sumBy(
      overdueInvoices,
      (invoice) => invoice?.remainingAmount ?? invoice?.totalAmount,
    );

    const lowStockProducts = datasets.products.filter((product) => {
      const quantity = toNumber(
        product?.quantity ?? product?.stock ?? product?.currentStock,
      );
      return quantity <= LOW_STOCK_THRESHOLD;
    });

    return {
      totalSales,
      totalPurchases,
      totalIncome: totalSales - totalPurchases,
      totalPaidAmount,
      totalOverdueAmount,
      totalInvoices: datasets.invoices.length,
      lowStockProducts: lowStockProducts.length,
      totalCustomers: datasets.customers.length,
      totalOrders: datasets.orders.length,
      overdueInvoiceCount: overdueInvoices.length,
      lowStockList: lowStockProducts.slice(0, 5),
    };
  }, [datasets]);

  /* ===============================
     CHART DATA
  ================================ */
  const lineChartData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: date.toLocaleDateString("en-US", { month: "short" }),
      });
    }

    const salesMap = new Map(months.map((month) => [month.key, 0]));
    const purchaseMap = new Map(months.map((month) => [month.key, 0]));

    datasets.sales.forEach((sale) => {
      const date = new Date(sale?.createdAt);
      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (salesMap.has(key)) {
        salesMap.set(key, salesMap.get(key) + getSalesAmount(sale));
      }
    });

    datasets.bills.forEach((bill) => {
      const date = new Date(bill?.createdAt);
      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (purchaseMap.has(key)) {
        purchaseMap.set(
          key,
          purchaseMap.get(key) + toNumber(bill?.totalAmount),
        );
      }
    });

    return {
      labels: months.map((month) => month.label),
      datasets: [
        {
          label: "Sales",
          data: months.map((month) => Math.round(salesMap.get(month.key))),
          borderColor: "#3b8b3b",
          backgroundColor: "rgba(59, 139, 59, 0.18)",
          fill: true,
          tension: 0.36,
          pointRadius: 3,
        },
        {
          label: "Purchases",
          data: months.map((month) => Math.round(purchaseMap.get(month.key))),
          borderColor: "#4d0000",
          backgroundColor: "rgba(77, 0, 0, 0.12)",
          fill: true,
          tension: 0.36,
          pointRadius: 3,
        },
      ],
    };
  }, [datasets.sales, datasets.bills]);

  const invoiceStatusChartData = useMemo(() => {
    const counts = { paid: 0, approved: 0, sent: 0, draft: 0, overdue: 0 };

    datasets.invoices.forEach((invoice) => {
      const status = (invoice?.status || "").toLowerCase();
      if (status in counts) {
        counts[status] += 1;
      } else if (isInvoiceOverdue(invoice)) {
        counts.overdue += 1;
      }
    });

    return {
      labels: ["Paid", "Approved", "Sent", "Draft", "Overdue"],
      datasets: [
        {
          data: [
            counts.paid,
            counts.approved,
            counts.sent,
            counts.draft,
            counts.overdue,
          ],
          backgroundColor: [
            "#22c55e",
            "#6366f1",
            "#0ea5e9",
            "#94a3b8",
            "#dc2626",
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [datasets.invoices]);

  const orderStatusChartData = useMemo(() => {
    const statusMap = new Map();

    datasets.orders.forEach((order) => {
      const status = (order?.status || "unknown").toLowerCase();
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    return {
      labels: Array.from(statusMap.keys()),
      datasets: [
        {
          label: "Orders",
          data: Array.from(statusMap.values()),
          backgroundColor: "rgba(77, 0, 0, 0.65)",
          borderRadius: 10,
          maxBarThickness: 44,
        },
      ],
    };
  }, [datasets.orders]);

  /* ===============================
     QUICK ACTIONS / ACTIVITY
  ================================ */
  const quickActions = useMemo(() => {
    return [
      {
        label: "Create Invoice",
        description: "Generate and send invoice quickly",
        path: `${dashboardBasePath}/createInvoice`,
        icon: <PlusCircle className="h-5 w-5" />,
      },
      {
        label: "Add Product",
        description: "Create or update inventory items",
        path: `${dashboardBasePath}/product`,
        icon: <PackagePlus className="h-5 w-5" />,
      },
      {
        label: "Add Customer",
        description: "Manage customer records",
        path: `${dashboardBasePath}/customers`,
        icon: <UserPlus className="h-5 w-5" />,
      },
      {
        label: "View Reports",
        description: "Analyze performance and trends",
        path: reportsPath,
        icon: <BarChart3 className="h-5 w-5" />,
      },
      {
        label: "Manage Stock",
        description: "Track stock-in and stock-out",
        path: stockPath,
        icon: <Boxes className="h-5 w-5" />,
      },
    ].filter((action) => Boolean(action.path));
  }, [dashboardBasePath, reportsPath, stockPath]);

  const logsToShow = canViewActivity ? recentLogs : myLogs?.slice(0, 6);

  return (
    <div>
      {/* ===============================
          HEADER
      ================================ */}
      {/* <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-rose-50/40 to-white p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-teal-100/40 blur-2xl" />
        <div className="pointer-events-none absolute -left-14 -bottom-14 h-40 w-40 rounded-full bg-rose-100/60 blur-2xl" />

        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Command Center
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
              ERP Dashboard Overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              A clear snapshot of your sales, purchasing, invoicing, stock, and
              customer performance.
            </p>
          </div>

          <button className="app-button" onClick={fetchDashboardData}>
            <TrendingUp className="h-4 w-4" /> Refresh Insights
          </button>
        </div>
      </section> */}

      {/* ===============================
          KPI SECTION
      ================================ */}
      <section
        className="
    relative overflow-hidden rounded-3xl
    bg-gradient-to-br from-white via-rose-50/40 to-white
    p-6 mb-8
    before:absolute before:inset-0 before:rounded-3xl
    before:bg-gradient-to-b before:from-white/80 before:to-transparent
    before:opacity-60 before:pointer-events-none
    shadow-[0_1px_1px_rgba(0,0,0,0.04),0_8px_24px_rgba(15,23,42,0.08),0_20px_60px_rgba(15,23,42,0.10)]
  "
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Key Metrics</h2>
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-600">
            Updated Live
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[145px] animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Total Sales"
                value={metrics.totalSales}
                subtitle="Revenue from completed sales"
                icon={<HandCoins className="h-5 w-5" />}
                tone="emerald"
                isCurrency
                badge={formatCompact(metrics.totalSales)}
              />

              <MetricCard
                title="Total Income"
                value={metrics.totalIncome}
                subtitle="Net balance after purchases"
                icon={<Wallet className="h-5 w-5" />}
                tone="sky"
                isCurrency
              />

              <MetricCard
                title="Total Overdue"
                value={metrics.totalOverdueAmount}
                subtitle="Outstanding overdue receivables"
                icon={<AlertTriangle className="h-5 w-5" />}
                tone="red"
                isCurrency
                badge={`${metrics.overdueInvoiceCount} invoices`}
              />

              <MetricCard
                title="Low Stock"
                value={metrics.lowStockProducts}
                subtitle={`Products at or below ${LOW_STOCK_THRESHOLD}`}
                icon={<Boxes className="h-5 w-5" />}
                tone="amber"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <CompactMetric
                label="Purchases"
                value={metrics.totalPurchases}
                prefix="$"
                icon={<ArrowDownToLine className="h-4 w-4" />}
                tone="indigo"
              />

              <CompactMetric
                label="Paid Amount"
                value={metrics.totalPaidAmount}
                prefix="$"
                icon={<CreditCard className="h-4 w-4" />}
                tone="teal"
              />

              <CompactMetric
                label="Invoices"
                value={metrics.totalInvoices}
                icon={<FileText className="h-4 w-4" />}
                tone="violet"
              />

              <CompactMetric
                label="Customers"
                value={metrics.totalCustomers}
                icon={<Users className="h-4 w-4" />}
                tone="cyan"
              />

              <CompactMetric
                label="Orders"
                value={metrics.totalOrders}
                icon={<ShoppingCart className="h-4 w-4" />}
                tone="fuchsia"
              />
            </div>
          </>
        )}
      </section>

      {/* ===============================
          QUICK ACTIONS
      ================================ */}

      <section
        className="
    relative overflow-hidden rounded-3xl
    bg-gradient-to-br from-white via-rose-50/40 to-white
    p-6 mb-8

    before:absolute before:inset-0 before:rounded-3xl
    before:bg-gradient-to-b before:from-white/80 before:to-transparent
    before:opacity-60 before:pointer-events-none

    shadow-[0_1px_1px_rgba(0,0,0,0.04),0_8px_24px_rgba(15,23,42,0.08),0_20px_60px_rgba(15,23,42,0.10)]
  "
      >
        {" "}
        <h2 className="mb-4 text-lg font-bold text-slate-900">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => (
            <QuickAction
              key={action.label}
              label={action.label}
              description={action.description}
              icon={action.icon}
              onClick={() => navigate(action.path)}
            />
          ))}
        </div>
      </section>

      {/* ===============================
          CHARTS: SALES + INVOICE STATUS
      ================================ */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12 mb-8">
        <div className="app-card col-span-1 p-5 xl:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Sales vs Purchases
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              Last 6 months
            </span>
          </div>

          <div className="h-[300px]">
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: "index" },
                plugins: {
                  legend: { position: "top", labels: { boxWidth: 12 } },
                },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: "rgba(148, 163, 184, 0.25)" } },
                },
              }}
            />
          </div>
        </div>

        <div className="app-card col-span-1 p-5 xl:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Invoice Status
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              Distribution
            </span>
          </div>

          <div className="h-[300px]">
            <Doughnut
              data={invoiceStatusChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: "68%",
                plugins: {
                  legend: { position: "bottom", labels: { boxWidth: 10 } },
                },
              }}
            />
          </div>
        </div>
      </section>

      {/* ===============================
          CHART + ATTENTION PANEL
      ================================ */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12 mb-8">
        <div className="app-card col-span-1 p-5 xl:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Orders by Status
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              Current snapshot
            </span>
          </div>

          <div className="h-[280px]">
            {orderStatusChartData.labels.length > 0 ? (
              <Bar
                data={orderStatusChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false } },
                    y: {
                      beginAtZero: true,
                      ticks: { precision: 0 },
                      grid: { color: "rgba(148, 163, 184, 0.24)" },
                    },
                  },
                }}
              />
            ) : (
              <NoData
                title="No order trend data"
                description="Orders will appear here once records are available."
              />
            )}
          </div>
        </div>

        <div className="app-card col-span-1 p-5 xl:col-span-5">
          <h3 className="mb-4 text-base font-bold text-slate-900">
            Attention Items
          </h3>

          <div className="space-y-3">
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-3">
              <div className="flex items-center gap-2 text-red-700">
                <CircleAlert className="h-4 w-4" />
                <p className="text-sm font-semibold">Overdue Invoices</p>
              </div>
              <p className="mt-1 text-sm text-red-800">
                <span className="font-bold">{metrics.overdueInvoiceCount}</span>{" "}
                invoices overdue, total{" "}
                <span className="font-bold">
                  ${Math.round(metrics.totalOverdueAmount).toLocaleString()}
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-semibold">Low Stock Products</p>
              </div>

              {metrics.lowStockList.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-amber-900">
                  {metrics.lowStockList.map((product) => (
                    <li
                      key={product._id || product.name}
                      className="flex items-center justify-between"
                    >
                      <span className="truncate">
                        {product.name || "Unnamed product"}
                      </span>
                      <span className="font-semibold">
                        {toNumber(
                          product.quantity ??
                            product.stock ??
                            product.currentStock,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-amber-900">
                  All products are above minimum threshold.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===============================
          ACTIVITY SECTION
      ================================ */}
      {logsToShow && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Recent Activity
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {logsToShow.length > 0 ? (
              logsToShow.map((log) => (
                <div key={log._id} className="app-info-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                      <LuActivity className="text-xl" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {log.action}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">
                        {log.userId?.name || "System"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <NoData
                title="No activity logs available"
                description="Activity records will appear here when actions are performed."
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default Dashboardpage;
