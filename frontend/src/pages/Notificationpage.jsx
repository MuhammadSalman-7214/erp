import { useEffect, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { MdDelete, MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import image from "../images/user.png";
import {
  createNotification,
  getAllNotifications,
  deleteNotification,
} from "../features/notificationSlice";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import FormattedTime from "../lib/FormattedTime";
import NoData from "../Components/NoData";

function NotificationPage() {
  const dispatch = useDispatch();
  const { notifications } = useSelector((state) => state.notification);
  const { user } = useSelector((state) => state.auth);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(
      "https://advanced-inventory-management-system-v1.onrender.com",
      {
        withCredentials: true,
        transports: ["websocket", "polling"],
      },
    );
    setSocket(newSocket);

    dispatch(getAllNotifications());

    newSocket.on("newNotification", (newNotification) => {
      toast.custom(
        (t) => (
          <div
            className={`flex items-center p-4 rounded-lg shadow-lg bg-white text-gray-800 ${t.visible ? "animate-enter" : "animate-leave"}`}
          >
            <img
              src={user?.ProfilePic || image}
              alt="Notification"
              className="w-10 h-10 rounded-full mr-3"
            />
            <div>
              <p className="font-medium">{newNotification.name}</p>
              <p className="text-sm text-gray-600">{newNotification.type}</p>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          </div>
        ),
        {
          duration: 4000,
          position: "top-right",
        },
      );
      dispatch(getAllNotifications());
    });

    return () => {
      newSocket.disconnect();
    };
  }, [dispatch, user?.ProfilePic]);

  const resetForm = () => {
    setName("");
    setType("");
  };

  const submitNotification = async (e) => {
    e.preventDefault();
    if (!name || !type) return toast.error("Title and description required");
    const notificationData = { name, type };
    dispatch(createNotification(notificationData))
      .unwrap()
      .then(() => {
        toast.success("Notification added successfully");
        resetForm();
        setIsFormVisible(false);
      })
      .catch(() => toast.error("Failed to add notification"));
  };

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="flex justify-end items-center">
        <button
          onClick={() => setIsFormVisible(true)}
          className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
        >
          <IoMdAdd className="text-xl mr-2" /> Add Notification
        </button>
      </div>

      {/* Overlay */}
      {isFormVisible && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsFormVisible(false)}
        />
      )}

      {/* Slide-in Drawer Form */}
      {isFormVisible && (
        <div className="fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white p-6 border-l shadow-2xl z-50 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Add Notification</h2>
            <MdKeyboardDoubleArrowLeft
              onClick={() => setIsFormVisible(false)}
              className="cursor-pointer text-2xl"
            />
          </div>

          <form onSubmit={submitNotification}>
            <div className="mb-4">
              <label className="block font-medium">Title</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                className="w-full h-10 px-3 border rounded-lg mt-2"
                placeholder="Enter title"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block font-medium">Description</label>
              <textarea
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-24 px-3 border rounded-lg mt-2"
                placeholder="Enter description"
                required
              />
            </div>

            <button
              type="submit"
              className="bg-teal-800 text-white w-full h-12 rounded-lg hover:bg-teal-700 mt-4"
            >
              Add Notification
            </button>
          </form>
        </div>
      )}

      {/* Notifications List Card */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mt-4">
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

              <button
                onClick={() => dispatch(deleteNotification(notification._id))}
                className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                title="Delete"
              >
                <MdDelete size={20} />
              </button>
            </div>
          ))
        ) : (
          <div className="p-10">
            <NoData
              title="No Notifications Found"
              description="Try adding notification to get started."
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationPage;
