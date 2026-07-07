import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { Home, Users, GraduationCap, BookOpen, Settings } from "lucide-react";

function TopNavbar() {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  const pages = {
    "/": {
      title: "Dashboard",
      subtitle:
        "Monitor business performance, inventory insights, and recent activities.",
    },

    "/product": {
      title: "Products",
      subtitle:
        "Create, organize, and maintain your product catalog and inventory details.",
    },

    "/order": {
      title: "Purchase Orders",
      subtitle: "Track supplier purchases, incoming stock, and order status.",
    },

    "/sales": {
      title: "Sales",
      subtitle:
        "Record sales transactions, monitor revenue, and manage customer orders.",
    },

    "/invoices": {
      title: "Invoices",
      subtitle:
        "Generate, review, and manage customer invoices and billing records.",
    },

    "/payments": {
      title: "Payments",
      subtitle:
        "Track incoming and outgoing payments to maintain accurate financial records.",
    },

    "/stock-transaction": {
      title: "Stock Transactions",
      subtitle:
        "Monitor inventory movements, stock adjustments, and transfer history.",
    },

    "/supplier": {
      title: "Vendors",
      subtitle:
        "Manage supplier information, purchase history, and business relationships.",
    },

    "/customer": {
      title: "Customers",
      subtitle:
        "Maintain customer profiles, purchase history, and account information.",
    },

    "/category": {
      title: "Categories",
      subtitle:
        "Organize products into structured categories for efficient inventory management.",
    },

    "/ai-insights-history": {
      title: "AI Insights History",
      subtitle:
        "Review past AI-generated business insights, sales trends, and strategic recommendations.",
    },

    "/setting": {
      title: "Settings",
      subtitle: "Organize profile and system configurations.",
    },
  };

  const current = pages[location.pathname] || {
    title: "Dashboard",
    subtitle: "Welcome back",
  };

  return (
    <nav className="sticky top-0 z-30 flex h-[8vh] items-center justify-between shadow-sm bg-white px-4">
      {/* LEFT */}

      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {current.title}
          </h1>

          <p className="text-xs text-slate-500">{current.subtitle}</p>
        </div>
      </div>

      {/* RIGHT */}

      <div className="flex items-center gap-4">
        <div className="hidden text-right md:block">
          <p className="font-semibold text-slate-800">
            {user?.name || "Guest"}
          </p>

          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300 bg-gradient-to-br from-emerald-100 to-cyan-100 text-lg text-emerald-800 font-semibold shadow-md">
          {user?.name?.charAt(0)?.toUpperCase() || "G"}
        </div>
      </div>
    </nav>
  );
}

export default TopNavbar;
