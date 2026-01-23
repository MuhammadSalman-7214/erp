import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import Gettopproduct from "../lib/Gettopproduct";
import TopNavbar from "../Components/TopNavbar";
import { LuUsers, LuClock, LuActivity } from "react-icons/lu";
import {
  getRecentActivityLogs,
  getsingleUserActivityLogs,
} from "../features/activitySlice";
import { staffUser, managerUser, adminUser } from "../features/authSlice";
import FormattedTime from "../lib/FormattedTime ";
import { useRolePermissions } from "../hooks/useRolePermissions";

function Dashboardpage() {
  const { staffuser, manageruser, adminuser, user } = useSelector(
    (state) => state.auth,
  );
  const [releventLogs, setReleventLogs] = useState([]);
  const { recentLogs, myLogs } = useSelector((state) => state.activity);

  const { hasPermission, userRole } = useRolePermissions();
  const dispatch = useDispatch();

  useEffect(() => {
    const canViewUsers = hasPermission("user", "read");
    const canViewActivity = hasPermission("activityLog", "read");

    // Fetch user counts
    if (canViewUsers) {
      dispatch(staffUser()).catch(console.error);
      dispatch(managerUser()).catch(console.error);
      dispatch(adminUser()).catch(console.error);
    }

    // Fetch activity logs based on role
    if (canViewActivity) {
      if (userRole === "admin") {
        // Admin → recent logs
        dispatch(getRecentActivityLogs()).catch(console.error);
      } else if (userRole === "manager" || userRole === "staff") {
        // Manager or Staff → own logs
        dispatch(getsingleUserActivityLogs()).catch(console.error);
      }
    }
  }, [dispatch, userRole, hasPermission]);

  // useEffect(() => {
  //   // Only fetch once when component mounts
  //   const canViewUsers = hasPermission("user", "read");
  //   const canViewActivity = hasPermission("activityLog", "read");

  //   // Fetch user data based on role permissions
  //   if (canViewUsers) {
  //     dispatch(staffUser()).catch((err) => {
  //       console.error("Failed to fetch staff users:", err);
  //     });
  //     dispatch(managerUser()).catch((err) => {
  //       console.error("Failed to fetch manager users:", err);
  //     });
  //     dispatch(adminUser()).catch((err) => {
  //       console.error("Failed to fetch admin users:", err);
  //     });
  //   }

  //   // Fetch activity logs if user has permission
  //   // Comment this out if the endpoint doesn't exist yet
  //   if (canViewActivity) {
  //     dispatch(getRecentActivityLogs()).catch((err) => {
  //       console.error("Failed to fetch activity logs:", err);
  //       // Silently fail if endpoint doesn't exist
  //     });
  //   } else {
  //     dispatch(getsingleUserActivityLogs()).catch((err) => {
  //       console.error("Failed to fetch activity logs:", err);
  //       // Silently fail if endpoint doesn't exist
  //     });
  //   }
  // }, []); // Empty dependency array - only run once on mount

  // Determine which sections to show based on role
  const showUserCounts = hasPermission("user", "read");
  const showActivityLogs = hasPermission("activityLog", "read");
  useEffect(() => {
    // Update relevant logs whenever recentLogs or myLogs change
    if (userRole === "admin") {
      setReleventLogs(recentLogs || []);
    } else {
      setReleventLogs(myLogs.slice(0, 6) || []);
    }
  }, [userRole, recentLogs, myLogs]);

  return (
    <div className="bg-base-100">
      <div className="min-h-screen flex flex-col items-center p-10">
        <h1 className="text-3xl font-semibold mb-6">
          Dashboard {userRole && `- ${userRole.toUpperCase()}`}
        </h1>

        {/* User Count Cards */}
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

        {/* Top Products Section */}
        <Gettopproduct className="mt-20" />
      </div>

      {/* Recent Activity Section - Only for Admin */}
      {showActivityLogs && (
        <div className="mt-10 p-10 bg-gray-50">
          <h1 className="text-2xl font-bold mb-6">Recent Activity</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {releventLogs && releventLogs.length > 0 ? (
              releventLogs.map((logs) => (
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
                  <div>
                    <h2 className="text-lg font-semibold">
                      {logs.userId.name || "Unknown User"}
                    </h2>
                    <p className="text-sm text-gray-500">{logs.action}</p>
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
