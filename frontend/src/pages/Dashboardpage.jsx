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
  }, [dispatch, userRole]);

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
  console.log({ releventLogs });

  return (
    <div className="bg-base-100">
      <div className=" bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          {/* <h1 className="text-3xl font-bold text-gray-800 mb-8">
            Dashboard{" "}
            <span className="text-blue-600">• {userRole?.toUpperCase()}</span>
          </h1> */}

          {/* Cards */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${userRole === "admin" ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-4`}
          >
            {/* STAFF CARD */}
            {(userRole === "admin" || userRole === "manager") && (
              <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-blue-100">
                    <LuUsers className="text-3xl text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">
                      {staffuser?.length || 0}
                    </p>
                    <p className="text-gray-500 text-sm">Staff Members</p>
                  </div>
                </div>
              </div>
            )}

            {/* MANAGER CARD */}
            {(userRole === "admin" || userRole === "manager") && (
              <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-green-100">
                    <LuUsers className="text-3xl text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">
                      {manageruser?.length || 0}
                    </p>
                    <p className="text-gray-500 text-sm">Managers</p>
                  </div>
                </div>
              </div>
            )}

            {/* ADMIN CARD */}
            {userRole === "admin" && (
              <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-red-100">
                    <LuUsers className="text-3xl text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">
                      {adminuser?.length || 0}
                    </p>
                    <p className="text-gray-500 text-sm">Admins</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="mt-16">
            <Gettopproduct />
          </div>
        </div>
      </div>

      {/* Recent Activity Section - Only for Admin */}
      {showActivityLogs && (
        <div className="p-4 bg-gray-50">
          <h1 className="text-2xl font-bold mb-6">Recent Activity</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {releventLogs && releventLogs.length > 0 ? (
              releventLogs.map((logs) => (
                <div
                  key={logs._id}
                  className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <LuActivity className="text-blue-500 text-2xl" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{logs.action}</h2>

                      <p className="text-sm text-gray-500 capitalize">
                        {" "}
                        {logs.userId?.name || "Unknown User"}
                      </p>
                    </div>
                  </div>
                  {/* <div>
                    <h2 className="text-lg font-semibold">
                      {logs.userId?.name || "Unknown User"}
                    </h2>
                    <p className="text-sm text-gray-500">{logs?.action}</p>
                  </div> */}
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
        <div className=" p-10 bg-gray-50 text-center">
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
