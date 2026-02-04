import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LuUsers, LuActivity } from "react-icons/lu";

import SalesChart from "../lib/Salesgraph";
import Gettopproduct from "../lib/Gettopproduct";

import {
  getRecentActivityLogs,
  getsingleUserActivityLogs,
} from "../features/activitySlice";

import { getUserStats } from "../features/authSlice";
import { useRolePermissions } from "../hooks/useRolePermissions";

/* ===============================
   DASHBOARD
================================ */
function Dashboardpage() {
  const dispatch = useDispatch();

  const { userStats } = useSelector((state) => state.auth);
  const { recentLogs, myLogs } = useSelector((state) => state.activity);

  const { userRole, hasPermission } = useRolePermissions();

  const canViewUsers = hasPermission("user", "read");
  const canViewActivity = hasPermission("activityLog", "read");

  /* ===============================
     FETCH DATA
  ================================ */
  useEffect(() => {
    if (canViewUsers) {
      dispatch(getUserStats());
    }

    if (canViewActivity) {
      dispatch(getRecentActivityLogs());
    } else {
      dispatch(getsingleUserActivityLogs());
    }
  }, [dispatch, userRole]);

  /* ===============================
     SELECT LOGS (BACKEND SCOPED)
  ================================ */
  const logsToShow = canViewActivity ? recentLogs : myLogs?.slice(0, 6);

  return (
    <div className="bg-base-100">
      <div className="bg-gray-50 p-4">
        {/* ===============================
            USER STATS
        ================================ */}
        {canViewUsers && userStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {userStats.staff > 0 && (
              <StatCard title="Staff" count={userStats.staff} color="blue" />
            )}

            {userStats.branchadmin > 0 && (
              <StatCard
                title="Branch Admins"
                count={userStats.branchadmin}
                color="teal"
              />
            )}

            {userStats.countryadmin > 0 && (
              <StatCard
                title="Country Admins"
                count={userStats.countryadmin}
                color="red"
              />
            )}

            {userStats.agent > 0 && (
              <StatCard title="Agents" count={userStats.agent} color="purple" />
            )}
          </div>
        )}

        {/* ===============================
            CHARTS
        ================================ */}
        <div className="mt-16 flex justify-between w-full gap-6">
          <SalesChart />
          <Gettopproduct />
        </div>
      </div>

      {/* ===============================
          ACTIVITY LOGS
      ================================ */}
      {logsToShow && (
        <div className="p-4 bg-gray-50">
          <h1 className="text-2xl font-bold mb-6">Recent Activity</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {logsToShow.length > 0 ? (
              logsToShow.map((log) => (
                <div
                  key={log._id}
                  className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <LuActivity className="text-blue-500 text-2xl" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">{log.action}</h2>
                      <p className="text-sm text-gray-500 capitalize">
                        {log.userId?.name || "System"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-full text-center text-gray-500">
                No activity logs available.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ===============================
          FALLBACK (AGENT / STAFF)
      ================================ */}
      {!canViewUsers && !canViewActivity && (
        <div className="p-10 bg-gray-50 text-center">
          <p className="text-gray-600 text-lg mb-2">
            Welcome to your dashboard!
          </p>
          <p className="text-gray-500">
            Use the navigation menu to access your assigned tasks.
          </p>
        </div>
      )}
    </div>
  );
}

/* ===============================
   REUSABLE STAT CARD
================================ */
function StatCard({ title, count, color }) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    teal: "bg-teal-100 text-teal-600",
    red: "bg-red-100 text-red-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition">
      <div className="flex items-center gap-4">
        <div className={`p-4 rounded-xl ${colors[color]}`}>
          <LuUsers className="text-3xl" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{count}</p>
          <p className="text-gray-500 text-sm">{title}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboardpage;
