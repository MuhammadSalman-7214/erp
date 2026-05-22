import React, { useEffect, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { MdDelete } from "react-icons/md";
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
import { ListSkeleton } from "../Components/LoadingSkeletons";
import DrawerPanel from "../Components/DrawerPanel";
import { validateTextInput } from "../lib/formValidation";
import { Button, Inputfield, Textarea } from "../UI";

function NotificationPage() {
  const dispatch = useDispatch();
  const { notifications, isLoading } = useSelector((state) => state.notification);
  const { user } = useSelector((state) => state.auth);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [errors, setErrors] = useState({});
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);
  const [, setSocket] = useState(null);

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
            <Button
              onClick={() => toast.dismiss(t.id)}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </Button>
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
    setErrors({});
  };

  const validateField = (field, value, validator) => {
    const result = validator(value);
    setErrors((prev) => ({
      ...prev,
      [field]: result.ok ? "" : result.message,
    }));
    return result;
  };

  const submitNotification = async (e) => {
    e.preventDefault();

    const titleCheck = validateField("name", name, (value) =>
      validateTextInput(value, "Title", {
        required: true,
        minLength: 2,
        maxLength: 120,
      }),
    );
    if (!titleCheck.ok) return toast.error(titleCheck.message);

    const typeCheck = validateField("type", type, (value) =>
      validateTextInput(value, "Type", {
        required: true,
        minLength: 2,
        maxLength: 240,
      }),
    );
    if (!typeCheck.ok) return toast.error(typeCheck.message);

    const notificationData = { name: titleCheck.value, type: typeCheck.value };
    dispatch(createNotification(notificationData))
      .unwrap()
      .then(() => {
        toast.success("Notification added successfully");
        resetForm();
        setIsFormVisible(false);
        setIsDrawerMinimized(false);
      })
      .catch(() => toast.error("Failed to add notification"));
  };

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="flex justify-end items-center">
        <Button
          onClick={() => {
            setIsDrawerMinimized(false);
            setIsFormVisible(true);
          }}
          className="bg-teal-700 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
        >
          <IoMdAdd className="text-xl mr-2" /> Add Notification
        </Button>
      </div>

      <DrawerPanel
        open={isFormVisible}
        title="Add Notification"
        onClose={() => {
          setIsFormVisible(false);
          setIsDrawerMinimized(false);
        }}
        isMinimized={isDrawerMinimized}
        onToggleMinimized={() => setIsDrawerMinimized((prev) => !prev)}
        widthClass="w-full sm:w-[420px]"
      >
        <div className="p-6">
          <form onSubmit={submitNotification}>
            <div className="mb-4">
              <label className="block font-medium">Title</label>
              <Inputfield
                value={name}
                onChange={(e) => {
                  const value = e.target.value;
                  setName(value);
                  validateField("name", value, (current) =>
                    validateTextInput(current, "Title", {
                      required: true,
                      minLength: 2,
                      maxLength: 120,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("name", e.target.value, (current) =>
                    validateTextInput(current, "Title", {
                      required: true,
                      minLength: 2,
                      maxLength: 120,
                    }),
                  )
                }
                type="text"
                className="mt-2 w-full"
                placeholder="Enter title"
                required
                maxLength={120}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="mb-4">
              <label className="block font-medium">Type</label>
              <Textarea
                value={type}
                onChange={(e) => {
                  const value = e.target.value;
                  setType(value);
                  validateField("type", value, (current) =>
                    validateTextInput(current, "Type", {
                      required: true,
                      minLength: 2,
                      maxLength: 240,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("type", e.target.value, (current) =>
                    validateTextInput(current, "Type", {
                      required: true,
                      minLength: 2,
                      maxLength: 240,
                    }),
                  )
                }
                className="mt-2 h-24 w-full"
                placeholder="Enter type"
                required
                maxLength={240}
              />
              {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
            </div>

            <Button
              type="submit"
              className="mt-4 h-12 w-full rounded-lg bg-teal-800 text-white hover:bg-teal-700"
            >
              Add Notification
            </Button>
          </form>
        </div>
      </DrawerPanel>

      {/* Notifications List Card */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mt-4">
        {isLoading ? (
          <ListSkeleton items={6} />
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
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

              <Button
                onClick={() => dispatch(deleteNotification(notification.id))}
                className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                title="Delete"
              >
                <MdDelete size={20} />
              </Button>
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
