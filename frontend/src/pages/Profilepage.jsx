import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IoCameraOutline } from "react-icons/io5";
import image from "../images/user.png";
import {
  adminUser,
  managerUser,
  staffUser,
  updateProfile,
} from "../features/authSlice";
import toast from "react-hot-toast";
import FormattedTime from "../lib/FormattedTime";
import { useRolePermissions } from "../hooks/useRolePermissions";
import {
  getAllActivityLogs,
  getsingleUserActivityLogs,
} from "../features/activitySlice";

function ProfilePage() {
  const dispatch = useDispatch();
  const [releventLogs, setReleventLogs] = useState([]);
  const { user } = useSelector((state) => state.auth);
  const { myLogs, activityLogs } = useSelector((state) => state.activity);
  const [images, setImage] = useState(null);
  const { hasPermission, userRole } = useRolePermissions();

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
        dispatch(getAllActivityLogs()).catch(console.error);
      } else if (userRole === "manager" || userRole === "staff") {
        // Manager or Staff → own logs
        dispatch(getsingleUserActivityLogs()).catch(console.error);
      }
    }
  }, [dispatch, userRole]);
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      toast.error("No file selected");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      toast.error("User not authenticated. Please log in again.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;

      try {
        const response = await dispatch(updateProfile(base64Image)).unwrap();
        toast.success("Profile updated successfully");
        setImage(response?.updatedUser?.ProfilePic);
      } catch (error) {
        console.error("Error uploading image:", error);
        toast.error(error || "Failed to upload image. Please try again.");
      }
    };

    reader.onerror = () => {
      toast.error("Error reading file");
    };
  };

  useEffect(() => {
    if (userRole === "admin") {
      setReleventLogs(activityLogs || []);
    } else {
      setReleventLogs(myLogs || []);
    }
  }, [userRole, activityLogs, myLogs]);
  return (
    <div className="min-h-[80vh] p-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: PROFILE INFO (AUTO HEIGHT) */}
        <div className="lg:col-span-3">
          <div className="bg-white border rounded-xl shadow-md p-6 text-center h-fit">
            {/* Avatar */}
            <div className="relative mb-6 flex justify-center">
              <img
                className="border-4 border-teal-500 h-32 w-32 rounded-full object-cover shadow-lg"
                src={user?.ProfilePic || images || image}
                alt="Profile"
              />

              <input
                type="file"
                id="fileInput"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />

              <label
                htmlFor="fileInput"
                className="absolute bottom-1 right-[calc(50%-8px)] translate-x-16
                bg-teal-600 hover:bg-teal-700 p-2 rounded-full cursor-pointer shadow transition"
              >
                <IoCameraOutline className="text-white text-lg" />
              </label>
            </div>

            {/* Info Rows */}
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Name</span>
                <span className="font-medium text-slate-800">
                  {user?.name || "Guest"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="font-medium text-slate-800 break-all text-right">
                  {user?.email || "guest@gmail.com"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Role</span>
                <span className="font-medium capitalize text-slate-800">
                  {user?.role || "staff"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: RECENT ACTIVITY (FIXED HEADER + SCROLL BODY) */}
        <div className="lg:col-span-9">
          <div className="bg-white border rounded-xl shadow-md h-[88vh] flex flex-col">
            {/* FIXED HEADER */}
            <div className="stick top-0 bg-white z-10 border-b p-4 rounded-t-xl">
              <h1 className="text-lg font-semibold text-slate-800">
                All Activity
              </h1>
              <p className="text-sm text-slate-500">
                Your latest system actions
              </p>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto divide-y">
              {releventLogs && releventLogs.length > 0 ? (
                releventLogs.map((log, index) => (
                  <div key={index} className="p-4 hover:bg-slate-50 transition">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                      <div>
                        <h2 className="font-medium text-slate-800">
                          {log.action}
                        </h2>
                        <p className="text-sm text-slate-600">
                          {log.description}
                        </p>

                        <div className="mt-2 text-xs text-slate-500 space-y-1">
                          <p>
                            Affected:{" "}
                            <span className="font-medium">{log.entity}</span>
                          </p>
                          <p>
                            IP:{" "}
                            <span className="font-medium">{log.ipAddress}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 whitespace-nowrap">
                        <FormattedTime timestamp={log.createdAt} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-slate-500">
                  No activity logs available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
