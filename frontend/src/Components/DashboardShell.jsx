import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";
import DashboardHeader from "./DashboardHeader";

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
                <p className="text-xs text-slate-500">
                  {subtitle}
                  {/* {roleLabel} */}
                </p>
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

        <div className="h-[calc(100vh-90px)] overflow-y-auto">
          {renderNav()}
        </div>

        {/* <div className="border-t border-slate-200/80 p-3">
          <button
            type="button"
            onClick={onLogout}
            className={`${linkBaseClass} w-full text-red-600 hover:bg-red-50`}
          >
            <LogOut className="h-4 w-4" />
            {(sidebarOpen || mobileOpen) && <span>Logout</span>}
          </button>
        </div> */}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          user={user}
          roleLabel={roleLabel}
          menuItems={menuItems}
          profilePath={profilePath}
          onLogout={onLogout}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />

        <main className="app-page flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardShell;
