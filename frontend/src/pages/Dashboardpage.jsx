import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LuUsers, LuActivity } from "react-icons/lu";
import InfoStatCard from "../Components/InfoStatCard";

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
    <div className="">
      <div className="p-4">
        {/* ===============================
            USER STATS
        ================================ */}
        {canViewUsers && userStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {userStats.staff > 0 && (
              <InfoStatCard
                title="Staff"
                value={userStats.staff}
                subtitle="Total staff accounts"
                icon={<LuUsers />}
                accentClass="bg-sky-600"
                iconShellClass="bg-sky-50 text-sky-700"
              />
            )}

            {userStats.branchadmin > 0 && (
              <InfoStatCard
                title="Branch Admins"
                value={userStats.branchadmin}
                subtitle="Branch-level admins"
                icon={<LuUsers />}
                accentClass="bg-teal-700"
                iconShellClass="bg-teal-50 text-teal-700"
              />
            )}

            {userStats.countryadmin > 0 && (
              <InfoStatCard
                title="Country Admins"
                value={userStats.countryadmin}
                subtitle="Country-level admins"
                icon={<LuUsers />}
                accentClass="bg-rose-600"
                iconShellClass="bg-rose-50 text-rose-700"
              />
            )}

            {userStats.agent > 0 && (
              <InfoStatCard
                title="Agents"
                value={userStats.agent}
                subtitle="Clearing agents"
                icon={<LuUsers />}
                accentClass="bg-violet-600"
                iconShellClass="bg-violet-50 text-violet-700"
              />
            )}
          </div>
        )}

        {/* ===============================
            CHARTS
        ================================ */}
        <div className="flex justify-between w-full gap-6">
          <SalesChart />
          <Gettopproduct />
        </div>
      </div>

      {/* ===============================
          ACTIVITY LOGS
      ================================ */}
      {logsToShow && (
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-6">Recent Activity</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {logsToShow.length > 0 ? (
              logsToShow.map((log) => (
                <div key={log._id} className="app-info-card p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                      <LuActivity className="text-2xl" />
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

export default Dashboardpage;
