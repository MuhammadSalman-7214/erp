import { useEffect } from "react";
import { MdDelete } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import image from "../images/user.png";
import UserRoleChart from "../lib/Usersgraph";

import { fetchUsersByRole, removeusers } from "../features/authSlice";

/* ---------------------------------- */
/* Reusable User List Card */
/* ---------------------------------- */
function UserCard({ title, users, onDelete, canDelete }) {
  return (
    <div className="app-card p-4">
      <h2 className="text-lg text-teal-800 font-semibold mb-2">{title}</h2>

      {users?.length > 0 ? (
        users.map((user) => (
          <div
            key={user._id}
            className="flex items-center justify-between p-2 border-b last:border-none"
          >
            <div className="flex items-center gap-2">
              <img
                src={user.ProfilePic || image}
                alt="User"
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-gray-600 text-sm">{user.email}</p>
              </div>
            </div>

            {canDelete(user) && (
              <button
                onClick={() => onDelete(user._id)}
                className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                title="Delete user"
              >
                <MdDelete size={18} />
              </button>
            )}
          </div>
        ))
      ) : (
        <p className="text-gray-500">No users available.</p>
      )}
    </div>
  );
}

/* ---------------------------------- */
/* Main Component */
/* ---------------------------------- */
function Userstatus() {
  const dispatch = useDispatch();

  const { staffuser, manageruser, adminuser, currentUser, loading } =
    useSelector((state) => state.auth);

  /* Initial fetch */
  useEffect(() => {
    dispatch(fetchUsersByRole());
  }, [dispatch]);

  /* Delete handler */
  const handleRemove = async (userId) => {
    try {
      await dispatch(removeusers(userId)).unwrap();
      toast.success("User removed successfully");
      dispatch(fetchUsersByRole()); // refresh list
    } catch (err) {
      toast.error(err?.message || "Failed to remove user");
    }
  };

  /* Frontend RBAC check */
  const canDelete = (targetUser) => {
    if (!currentUser) return false;

    // cannot delete yourself
    if (currentUser._id === targetUser._id) return false;

    // role hierarchy
    const roleWeight = {
      superadmin: 5,
      countryadmin: 4,
      branchadmin: 3,
      manager: 2,
      staff: 1,
    };

    return roleWeight[currentUser.role] > roleWeight[targetUser.role];
  };

  if (loading) {
    return (
      <div className="min-h-[92vh] flex items-center justify-center">
        Loading users...
      </div>
    );
  }

  return (
    <div className="min-h-[92vh] p-4">
      <UserRoleChart />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <UserCard
          title="Manager"
          users={manageruser}
          onDelete={handleRemove}
          canDelete={canDelete}
        />

        <UserCard
          title="Admin User"
          users={adminuser}
          onDelete={handleRemove}
          canDelete={canDelete}
        />

        <UserCard
          title="Staff User"
          users={staffuser}
          onDelete={handleRemove}
          canDelete={canDelete}
        />
      </div>
    </div>
  );
}

export default Userstatus;
