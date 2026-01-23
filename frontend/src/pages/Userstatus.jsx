import React, { useEffect, useState } from "react";
import TopNavbar from "../Components/TopNavbar";
import { IoMdAdd } from "react-icons/io";
import { MdDelete, MdKeyboardDoubleArrowLeft } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { TiDelete } from "react-icons/ti";
import image from "../images/user.png";
import {
  staffUser,
  managerUser,
  adminUser,
  removeusers,
} from "../features/authSlice";
import toast from "react-hot-toast";
import UserRoleChart from "../lib/Usersgraph";

function Userstatus() {
  const { staffuser, manageruser, adminuser } = useSelector(
    (state) => state.auth,
  );
  const dispatch = useDispatch();
  const { Authuser } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(staffUser());
    dispatch(managerUser());
    dispatch(adminUser());
  }, [dispatch, removeusers]);

  const handleremove = async (UserId) => {
    dispatch(removeusers(UserId))
      .then(() => {
        toast.success("user remove successffully");
      })
      .catch((err) => {
        toast.error("error in remove user");
      });
  };

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="flex flex-col gap-2">
        <UserRoleChart />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <div className=" bg-base-100 p-4 rounded-2xl border shadow-md mb-4">
            <h2 className="text-lg bg-base-100 text-teal-800 font-semibold mb-2">
              Manager
            </h2>
            {manageruser?.length > 0 ? (
              manageruser.map((user, index) => (
                <div
                  key={index}
                  className="flex bg-base-100 items-center justify-between space-x-4 p-2 border-b"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={user?.ProfilePic || image}
                      alt="User"
                      className="w-10 bg-base-100 h-10 rounded-full"
                    />
                    <div className="bg-base-100">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-gray-600 text-sm">{user.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleremove(user._id)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                    title="Delete"
                  >
                    <MdDelete size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 bg-base-100">No users available.</p>
            )}
          </div>

          <div className="bg-base-100 p-4 rounded-2xl border shadow-md mb-4">
            <h2 className="text-lg bg-base-100 text-teal-800 font-semibold mb-2">
              Admin User
            </h2>
            {adminuser?.length > 0 ? (
              adminuser.map((user, index) => (
                <div
                  key={index}
                  className="flex bg-base-100 items-center justify-between space-x-4 p-2 border-b"
                >
                  <div className="flex gap-2 items-center">
                    {" "}
                    <img
                      src={user?.ProfilePic || image}
                      alt="User"
                      className="w-10 h-10 bg-base-100 rounded-full"
                    />
                    <div className="bg-base-100">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-gray-600 text-sm">{user.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleremove(user._id)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                    title="Delete"
                  >
                    <MdDelete size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 bg-base-100">No users available.</p>
            )}
          </div>

          <div className="bg-base-100 p-4 rounded-2xl border shadow-md mb-4">
            <h2 className="text-lg bg-base-100 text-teal-800 font-semibold mb-2">
              Staff User
            </h2>
            {staffuser?.length > 0 ? (
              staffuser.map((user, index) => (
                <div
                  key={index}
                  className="flex bg-base-100 items-center space-x-4 p-2 border-b"
                >
                  <div className="flex gap-2 items-center">
                    <img
                      src={user?.ProfilePic || image}
                      alt="User"
                      className="w-10 h-10  bg-base-100 rounded-full"
                    />
                    <div className="bg-base-100">
                      <p className="font-medium  bg-base-100">{user.name}</p>
                      <p className=" bg-base-100 text-sm">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleremove(user._id)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                    title="Delete"
                  >
                    <MdDelete size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 bg-base-100">No users available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Userstatus;
