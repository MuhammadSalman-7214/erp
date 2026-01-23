import React, { useState } from "react";
import Sidebar from "../Components/Sidebar";
import { Outlet } from "react-router-dom";
import TopNavbar from "../Components/TopNavbar";
function StaffDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div
        className={`flex flex-col flex-1 transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-14"
        }`}
      >
        <div
          className={`fixed top-0 z-40 transition-all duration-300 ${
            sidebarOpen ? "left-64" : "left-14"
          } right-0`}
        >
          <TopNavbar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </div>

        <main className="pt-[8vh] h-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default StaffDashboard;
