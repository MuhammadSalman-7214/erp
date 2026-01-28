import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllNotifications } from "../features/notificationSlice";
import { io } from "socket.io-client";
import FormattedTime from "../lib/FormattedTime";
import image from "../images/user.png";
import TopNavbar from "../Components/TopNavbar";
import { MdDelete } from "react-icons/md";
function NotificationPageRead() {
  const dispatch = useDispatch();
  const { notifications } = useSelector((state) => state.notification);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const socket = io(
      "https://advanced-inventory-management-system-v1.onrender.com",
      {
        withCredentials: true,
        transports: ["websocket", "polling"],
      },
    );

    dispatch(getAllNotifications());

    socket.on("newNotification", () => {
      dispatch(getAllNotifications());
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch]);

  return (
    <div className="min-h-[92vh] bg-white p-4">
      {/* Notifications List Card */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification._id}
              className="flex items-center px-6 py-4 border-b last:border-b-0 hover:bg-slate-50 transition"
            >
              <img
                src={user?.ProfilePic || image}
                alt="User"
                className="w-12 h-12 rounded-full mr-4 object-cover"
              />

              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">
                  {notification.name}
                </h3>
                <p className="text-sm text-slate-600">{notification.type}</p>
                <p className="text-xs text-slate-400 mt-1">
                  <FormattedTime timestamp={notification.createdAt} />
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-slate-500">
            No notifications found.
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationPageRead;
