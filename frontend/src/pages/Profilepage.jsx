import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IoCameraOutline } from "react-icons/io5";
import image from "../images/user.png";
import { updateProfile } from "../features/authSlice";
import toast from "react-hot-toast";

function ProfilePage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [images, setImage] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      toast.error("No file selected");
      return;
    }

    if (!user) {
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

  return (
    <div className="min-h-[80vh] bg-gray-100 p-4">
      {/* Activity logs section removed per request */}
      <div className="max-w-md mx-auto">
        <div className="bg-white border rounded-xl shadow-md p-6 text-center h-fit">
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
              className="absolute bottom-1 right-[calc(50%-8px)] translate-x-16 bg-teal-600 hover:bg-teal-700 p-2 rounded-full cursor-pointer shadow transition"
            >
              <IoCameraOutline className="text-white text-lg" />
            </label>
          </div>

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
    </div>
  );
}

export default ProfilePage;
