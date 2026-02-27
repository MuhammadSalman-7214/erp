import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Menu, Settings, User, LogOut } from "lucide-react";
import fallbackAvatar from "../images/user.png";

const normalizePath = (path = "") => {
  if (!path) return "/";
  const normalized = path.replace(/\/+$/, "");
  return normalized || "/";
};

const toTitleFromSegment = (segment = "") =>
  segment
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const resolveRouteTitle = (pathname, menuItems, profilePath) => {
  const cleanPath = normalizePath(pathname);
  const flatMenu = menuItems.flatMap((section) => section.items || []);
  const matchedMenu = flatMenu.find(
    (item) => normalizePath(item.path) === cleanPath,
  );

  if (matchedMenu) return matchedMenu.name;
  if (normalizePath(profilePath) === cleanPath) return "Profile";

  if (cleanPath.endsWith("/createInvoice")) return "Create Invoice";
  if (cleanPath.includes("/editInvoice/")) return "Edit Invoice";
  if (cleanPath.includes("/invoice/")) return "Invoice Details";
  if (cleanPath.endsWith("/createShipment")) return "Create Shipment";
  if (cleanPath.includes("/shipment/")) return "Shipment Details";
  if (cleanPath.includes("/clearing-job/")) return "Clearing Job Details";

  const lastSegment = cleanPath.split("/").filter(Boolean).pop();
  return lastSegment ? toTitleFromSegment(lastSegment) : "Overview";
};

const resolvePageDescription = (title, pathname, user) => {
  const cleanPath = normalizePath(pathname);
  const descriptions = {
    Overview: "Track key metrics, trends, and recent business activity.",
    Countries: "Manage country setup, currencies, and exchange policies.",
    Branches: "Control branch operations, details, and assigned admins.",
    "Exchange Rates": "Maintain conversion rates and currency consistency.",
    "User Management": "Create users, assign roles, and manage access.",
    "Global Reports": "Review consolidated business performance in USD.",
    "Country Reports": `Review performance for ${user?.country?.name || "your country"}.`,
    "Branch Reports": `Review performance for ${user?.branch?.name || "your branch"}.`,
    Products: "Manage catalog, pricing, and product availability.",
    Orders: "Track orders from creation to fulfillment.",
    Sales: "Monitor sales transactions and revenue movement.",
    "Stock Transactions": "Record stock-in and stock-out movements.",
    Categories: "Organize catalog structure and product grouping.",
    Suppliers: "Manage supplier records and procurement partners.",
    Customers: "Manage customer records and account history.",
    Invoices: "Create, track, and reconcile invoice records.",
    "Purchase Bills": "Track purchase liabilities and settlement status.",
    Ledger: "Review account movements and balances.",
    Shipments: "Track shipment lifecycle, costs, and statuses.",
    "Create Shipment": "Capture shipment details and create a new record.",
    "Shipment Details":
      "Inspect shipment timeline, cost breakdown, and status.",
    "Clearing Jobs": "Manage customs clearing workflow and assignments.",
    "Clearing Job Details":
      "Track progress, documents, and expenses for this clearing job.",
    Notifications: "Review system alerts and broadcast updates.",
    "Activity Log": "Audit key actions across users and modules.",
    Profile: "View and update your personal account details.",
    "Create Invoice": "Draft a new invoice and add billing line items.",
    "Edit Invoice": "Update invoice details before final processing.",
    "Invoice Details": "Review invoice status, items, and payment actions.",
  };

  if (descriptions[title]) return descriptions[title];
  if (cleanPath.includes("/reports"))
    return "Analyze performance insights and export report data.";
  return `Manage and monitor ${title.toLowerCase()}.`;
};

function DashboardHeader({
  user,
  roleLabel,
  menuItems,
  profilePath,
  settingsPath,
  onLogout,
  onOpenMobileMenu,
}) {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const pageTitle = useMemo(
    () => resolveRouteTitle(location.pathname, menuItems, profilePath),
    [location.pathname, menuItems, profilePath],
  );
  const pageDescription = useMemo(
    () => resolvePageDescription(pageTitle, location.pathname, user),
    [pageTitle, location.pathname, user],
  );

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className="app-dashboard-header sticky top-0 z-30 
  border-b border-slate-200/60 
  bg-gradient-to-r from-teal-50 via-white to-blue-50
  backdrop-blur-xl 
  shadow-md
  rounded-bl-xl
  rounded-br-xl"
    >
      <div className="flex h-full items-center justify-between gap-4 px-4 py-4 md:px-6">
        {/* Left Section */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="rounded-lg border border-slate-200 
                   bg-white/70 p-2 
                   text-slate-600 
                   shadow-sm 
                   transition hover:bg-white hover:shadow-md 
                   md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <h2
              className="truncate text-lg font-semibold 
                       bg-gradient-to-r from-slate-900 to-slate-600 
                       bg-clip-text text-transparent 
                       md:text-xl"
            >
              {pageTitle}
            </h2>
            <p className="truncate text-xs text-slate-500 tracking-wide">
              {pageDescription}
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div
          className="relative flex shrink-0 items-center gap-3"
          ref={menuRef}
        >
          <img
            className="h-9 w-9 rounded-full 
                   border border-white 
                   shadow-md object-cover"
            src={user?.ProfilePic || fallbackAvatar}
            alt={user?.name || "User avatar"}
          />

          <div className="hidden text-right leading-tight sm:block">
            <p className="max-w-[11rem] truncate text-sm font-semibold text-slate-800">
              {user?.name || "User"}
            </p>
            <p className="max-w-[11rem] truncate text-xs text-slate-500">
              {roleLabel || "Member"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="inline-flex h-9 items-center gap-1 
                   rounded-lg border border-slate-200 
                   bg-white/70 px-2 
                   text-slate-600 
                   shadow-sm 
                   transition hover:bg-white hover:shadow-md 
                   focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            aria-label="Open user menu"
            aria-expanded={isMenuOpen}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {isMenuOpen && (
            <div
              className="absolute right-0 top-14 w-52 
                        rounded-2xl 
                        border border-slate-200/70 
                        bg-white/95 
                        backdrop-blur-xl 
                        p-2 
                        shadow-xl 
                        animate-in fade-in zoom-in-95 duration-150"
            >
              <Link
                to={profilePath}
                className="flex items-center gap-2 
                       rounded-xl px-3 py-2 text-sm 
                       text-slate-700 
                       transition hover:bg-slate-100"
              >
                <User className="h-4 w-4 text-teal-600" />
                Profile
              </Link>

              {settingsPath && (
                <Link
                  to={settingsPath}
                  className="flex items-center gap-2 
                         rounded-xl px-3 py-2 text-sm 
                         text-slate-700 
                         transition hover:bg-slate-100"
                >
                  <Settings className="h-4 w-4 text-slate-500" />
                  Settings
                </Link>
              )}

              <div className="my-1 border-t border-slate-200"></div>

              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-2 
                       rounded-xl px-3 py-2 text-left text-sm 
                       text-red-600 
                       transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
