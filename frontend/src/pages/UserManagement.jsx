// pages/UserManagement.jsx

import React, { useState, useEffect } from "react";
import { userAPI } from "../services/userAPI";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { MdDelete } from "react-icons/md";
import { ToggleLeft, ToggleRight } from "lucide-react";

const UserManagement = () => {
  const { user } = useSelector((state) => state.auth);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStaffOnly, setShowStaffOnly] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch all users with hierarchy filtering applied automatically
      const response = await userAPI.getAllUsers();
      setUsers(response.data.users);
    } catch (error) {
      toast.error("Failed to fetch users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await userAPI.getUserStats();

      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await userAPI.toggleUserStatus(userId);
      toast.success("User status updated");
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to deactivate this user?")) {
      return;
    }

    try {
      await userAPI.deleteUser(userId);
      toast.success("User deactivated successfully");
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    }
  };

  const handleToggleStaffEdit = async (targetUser) => {
    try {
      const nextValue = !targetUser.staffCanEdit;
      await userAPI.updateStaffPermissions(targetUser._id, nextValue);
      toast.success("Staff permissions updated");
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update permission");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const canManageStaff =
    ["superadmin", "countryadmin", "branchadmin"].includes(user?.role);

  const filteredUsers = showStaffOnly
    ? users.filter((u) => u.role === "staff")
    : users;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {user.role === "superadmin" && (
            <div className="bg-blue-100 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Super Admins</div>
              <div className="text-2xl font-bold">{stats.superadmin}</div>
            </div>
          )}
          <div className="bg-green-100 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Country Admins</div>
            <div className="text-2xl font-bold">{stats.countryadmin}</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Branch Admins</div>
            <div className="text-2xl font-bold">{stats.branchadmin}</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Staff</div>
            <div className="text-2xl font-bold">{stats.staff}</div>
          </div>
          <div className="bg-orange-100 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Agents</div>
            <div className="text-2xl font-bold">{stats.agent}</div>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showStaffOnly}
            onChange={(e) => setShowStaffOnly(e.target.checked)}
          />
          Show staff only
        </label>
        <div className="text-xs text-gray-500">
          Staff edit permission allows staff to edit + delete records in their
          scope.
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Branch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Staff Edit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((u) => (
              <tr key={u._id}>
                <td className="px-6 py-4 whitespace-nowrap">{u.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{u.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {u.branchId ? `${u.branchId.name} (${u.branchId.city})` : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      u.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {canManageStaff && u.role === "staff" ? (
                    <button
                      onClick={() => handleToggleStaffEdit(u)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Staff edit permission allows edit + delete in their scope"
                    >
                      {u.staffCanEdit ? (
                        <ToggleRight className="text-green-500 w-8 h-8 hover:text-green-600 transition-colors" />
                      ) : (
                        <ToggleLeft className="text-red-500 w-8 h-8 hover:text-red-600 transition-colors" />
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap space-x-2 flex items-center">
                  <button
                    onClick={() => handleToggleStatus(u._id)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {u.isActive ? (
                      <ToggleRight className="text-green-500 w-8 h-8 hover:text-green-600 transition-colors" />
                    ) : (
                      <ToggleLeft className="text-red-500 w-8 h-8 hover:text-red-600 transition-colors" />
                    )}{" "}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(u._id)}
                    className="text-red-600 transition"
                    title="Delete"
                  >
                    <MdDelete size={24} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
