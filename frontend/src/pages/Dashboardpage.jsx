import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Gettopproduct from "../lib/Gettopproduct";
import TopNavbar from "../Components/TopNavbar";
import { LuUsers, LuClock, LuActivity } from "react-icons/lu";
import { getRecentActivityLogs } from "../features/activitySlice";
import { staffUser, managerUser, adminUser } from "../features/authSlice";
import FormattedTime from "../lib/FormattedTime ";
import { useRolePermissions } from "../hooks/useRolePermissions";

function Dashboardpage() {
  const { staffuser, manageruser, adminuser, user } = useSelector(
    (state) => state.auth,
  );
  const { recentLogs } = useSelector((state) => state.activity);

  const { hasPermission, userRole } = useRolePermissions();
  const dispatch = useDispatch();

  useEffect(() => {
    // Only fetch once when component mounts
    const canViewUsers = hasPermission("user", "read");
    const canViewActivity = hasPermission("activityLog", "read");

    // Fetch user data based on role permissions
    if (canViewUsers) {
      dispatch(staffUser()).catch((err) => {
        console.error("Failed to fetch staff users:", err);
      });
      dispatch(managerUser()).catch((err) => {
        console.error("Failed to fetch manager users:", err);
      });
      dispatch(adminUser()).catch((err) => {
        console.error("Failed to fetch admin users:", err);
      });
    }

    // Fetch activity logs if user has permission
    // Comment this out if the endpoint doesn't exist yet
    if (canViewActivity) {
      dispatch(getRecentActivityLogs()).catch((err) => {
        console.error("Failed to fetch activity logs:", err);
        // Silently fail if endpoint doesn't exist
      });
    }
  }, []); // Empty dependency array - only run once on mount

  // Determine which sections to show based on role
  const showUserCounts = hasPermission("user", "read");
  const showActivityLogs = hasPermission("activityLog", "read");

  return (
    <div className="bg-base-100">
      <TopNavbar />
      <div className="min-h-screen flex flex-col items-center p-10">
        <h1 className="text-3xl font-semibold mb-6">
          Dashboard {userRole && `- ${userRole.toUpperCase()}`}
        </h1>

        {/* User Count Cards - Only for Admin and Manager */}
        {showUserCounts && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center w-56 h-56 hover:shadow-xl transition-shadow">
              <LuUsers className="text-5xl text-blue-500 mb-4" />
              <p className="text-xl font-bold text-gray-700">
                {staffuser?.length || 0}
              </p>
              <p className="text-gray-500">Staff Users</p>
            </div>

            <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center w-56 h-56 hover:shadow-xl transition-shadow">
              <LuUsers className="text-5xl text-green-500 mb-4" />
              <p className="text-xl font-bold text-gray-700">
                {manageruser?.length || 0}
              </p>
              <p className="text-gray-500">Managers</p>
            </div>

            <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center w-56 h-56 hover:shadow-xl transition-shadow">
              <LuUsers className="text-5xl text-red-500 mb-4" />
              <p className="text-xl font-bold text-gray-700">
                {adminuser?.length || 0}
              </p>
              <p className="text-gray-500">Admins</p>
            </div>
          </div>
        )}

        {/* Top Products Section - Available to all roles */}
        <Gettopproduct className="mt-20" />
      </div>

      {/* Recent Activity Section - Only for Admin */}
      {showActivityLogs && (
        <div className="mt-10 p-10 bg-gray-50">
          <h1 className="text-2xl font-bold mb-6">Recent Activity</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentLogs && recentLogs.length > 0 ? (
              recentLogs.map((logs) => (
                <div
                  key={logs._id}
                  className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <LuActivity className="text-blue-500 text-2xl" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">
                        {logs.userId?.name || "Unknown User"}
                      </h2>
                      <p className="text-sm text-gray-500">{logs.action}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <LuClock className="text-gray-500" />
                    <FormattedTime timestamp={logs.createdAt} />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full">
                <p className="text-gray-500 text-center">
                  No recent activity logs available.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Welcome message for staff who can't see activity logs */}
      {!showActivityLogs && (
        <div className="mt-10 p-10 bg-gray-50 text-center">
          <p className="text-gray-600 text-lg mb-2">
            Welcome to your dashboard!
          </p>
          <p className="text-gray-500">
            Use the navigation menu to access your available features.
          </p>
        </div>
      )}
    </div>
  );
}

export default Dashboardpage;
