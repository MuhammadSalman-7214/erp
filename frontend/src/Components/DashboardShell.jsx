import React, { useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Settings,
} from "lucide-react";
import image from "../images/user.png";

const linkBaseClass =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200";

function DashboardShell({
  user,
  title,
  subtitle,
  roleLabel,
  menuItems,
  profilePath,
  onLogout,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  const renderNav = () => (
    <nav className="space-y-5 px-3 py-4">
      {menuItems.map((section, idx) => (
        <div key={idx}>
          <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {section.category}
          </p>
          <ul className="space-y-1">
            {section.items.map((item, itemIdx) => {
              const Icon = item.icon;
              return (
                <li key={itemIdx}>
                  <NavLink
                    to={item.path}
                    end={item.path.split("/").filter(Boolean).length === 1}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `${linkBaseClass} ${
                        isActive
                          ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                          : "text-slate-700 hover:bg-slate-100"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {(sidebarOpen || mobileOpen) && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 transition md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`app-card app-surface-static fixed left-0 top-0 z-50 h-screen border-r border-slate-200/80 transition-all duration-300 md:relative md:z-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${sidebarOpen ? "w-72" : "w-[78px]"}`}
      >
        <div className="border-b border-slate-200/80 px-4 py-5">
          <div className="flex items-center justify-between">
            {(sidebarOpen || mobileOpen) && (
              <div>
                <h1 className="text-lg font-extrabold text-slate-900">
                  {title}
                </h1>
                <p className="text-xs text-slate-500">{subtitle}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:block"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="h-[calc(100vh-170px)] overflow-y-auto">
          {renderNav()}
        </div>

        <div className="border-t border-slate-200/80 p-3">
          <button
            type="button"
            onClick={onLogout}
            className={`${linkBaseClass} w-full text-red-600 hover:bg-red-50`}
          >
            <LogOut className="h-4 w-4" />
            {(sidebarOpen || mobileOpen) && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 md:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Welcome, {user?.name || "User"}
                </h2>
                <p className="text-xs text-slate-500">
                  {roleLabel} · {todayLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={profilePath}
                className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 md:inline-flex"
              >
                <Settings className="h-4 w-4" />
                Profile
              </Link>
              <Link
                to={profilePath}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5 transition hover:bg-slate-50"
              >
                <img
                  src={user?.ProfilePic || image}
                  alt="Profile"
                  className="h-8 w-8 rounded-lg border border-slate-200 object-cover"
                />
              </Link>
            </div>
          </div>
        </header>

        <main className="app-page flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardShell;
