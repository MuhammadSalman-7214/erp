// pages/UserManagement.jsx

import React, { useState, useEffect } from "react";
import { userAPI } from "../services/userAPI";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { MdDelete } from "react-icons/md";
import { Plus, ToggleLeft, ToggleRight, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { authAPI, branchAPI, countryAPI } from "../services/api";

const createUserSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  role: yup.string().required("Role is required"),
  countryId: yup.string().when("role", {
    is: (role) => ["countryadmin", "branchadmin", "staff", "agent"].includes(role),
    then: (schema) => schema.required("Country is required for this role"),
    otherwise: (schema) => schema.notRequired(),
  }),
  branchId: yup.string().when("role", {
    is: (role) => ["branchadmin", "staff", "agent"].includes(role),
    then: (schema) => schema.required("Branch is required for this role"),
    otherwise: (schema) => schema.notRequired(),
  }),
});

const roleOptionsByCreator = {
  superadmin: [
    { value: "staff", label: "Staff" },
    { value: "agent", label: "Clearing Agent" },
    { value: "branchadmin", label: "Branch Admin" },
    { value: "countryadmin", label: "Country Admin" },
    { value: "superadmin", label: "Super Admin" },
  ],
  countryadmin: [
    { value: "staff", label: "Staff" },
    { value: "agent", label: "Clearing Agent" },
    { value: "branchadmin", label: "Branch Admin" },
  ],
  branchadmin: [
    { value: "staff", label: "Staff" },
    { value: "agent", label: "Clearing Agent" },
  ],
};

const UserManagement = () => {
  const { user } = useSelector((state) => state.auth);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStaffOnly, setShowStaffOnly] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [countries, setCountries] = useState([]);
  const [branches, setBranches] = useState([]);

  const creatorRoleOptions = roleOptionsByCreator[user?.role] || [];

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "staff",
      countryId: "",
      branchId: "",
    },
  });

  const selectedRole = watch("role", "staff");
  const selectedCountryId = watch("countryId");

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  useEffect(() => {
    if (!isCreateUserOpen) return;

    const loadCountries = async () => {
      try {
        if (user?.role === "superadmin") {
          const response = await countryAPI.getAll();
          setCountries(response.data || []);
          return;
        }

        if (user?.countryId?._id) {
          setCountries([
            {
              _id: user.countryId._id,
              name: user.countryId.name || user.country?.name || "Country",
              code: user.countryId.code || user.country?.code || "",
            },
          ]);
          setValue("countryId", user.countryId._id);
        } else if (user?.country?._id) {
          setCountries([user.country]);
          setValue("countryId", user.country._id);
        }
      } catch (error) {
        toast.error("Failed to load countries");
      }
    };

    loadCountries();
  }, [isCreateUserOpen, user, setValue]);

  useEffect(() => {
    if (!isCreateUserOpen) return;

    if (!selectedCountryId) {
      setBranches([]);
      setValue("branchId", "");
      return;
    }

    if (user?.role === "branchadmin" && user?.branch?._id) {
      setBranches([user.branch]);
      setValue("branchId", user.branch._id);
      return;
    }

    const loadBranches = async () => {
      try {
        const countryIdString = selectedCountryId?._id
          ? selectedCountryId._id
          : selectedCountryId;
        const response = await branchAPI.getByCountry(countryIdString);
        setBranches(response.data || []);
      } catch (error) {
        toast.error("Failed to load branches");
      }
    };

    loadBranches();
  }, [selectedCountryId, isCreateUserOpen, user, setValue]);

  const closeCreateUserModal = () => {
    setIsCreateUserOpen(false);
    setBranches([]);
    reset({
      name: "",
      email: "",
      password: "",
      role: "staff",
      countryId:
        user?.role === "countryadmin" || user?.role === "branchadmin"
          ? user?.countryId?._id || ""
          : "",
      branchId: user?.role === "branchadmin" ? user?.branch?._id || "" : "",
    });
  };

  const handleCreateUser = async (formData) => {
    try {
      setIsCreatingUser(true);

      const payload = { ...formData };
      if (user?.role === "countryadmin") {
        payload.countryId = user.countryId?._id;
      }
      if (user?.role === "branchadmin") {
        payload.countryId = user.countryId?._id;
        payload.branchId = user.branch?._id;
      }

      await authAPI.signup(payload);
      toast.success(`User ${payload.name} created successfully!`);

      closeCreateUserModal();
      await fetchUsers();
      await fetchStats();
    } catch (error) {
      toast.error(error || "Failed to create user. Please try again.");
    } finally {
      setIsCreatingUser(false);
    }
  };

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
      toast.error(
        error.response?.data?.message || "Failed to update permission",
      );
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const canManageStaff = ["superadmin", "countryadmin", "branchadmin"].includes(
    user?.role,
  );

  const filteredUsers = showStaffOnly
    ? users.filter((u) => u.role === "staff")
    : users;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>

        {/* ADD Create User BUTTON */}
        {canManageStaff && (
          <button
            onClick={() => setIsCreateUserOpen(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition flex items-center gap-1"
          >
            <Plus className="w-6 h-6" strokeWidth={3} />
            Create User
          </button>
        )}
      </div>

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
                Country
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
                  {u.countryId ? `${u.countryId.code} ` : "-"}
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

      {isCreateUserOpen && (
        <>
          <div className="app-modal-overlay" onClick={closeCreateUserModal} />
          <div className="app-modal-drawer app-modal-drawer-md">
            <div className="app-modal-header">
              <h2 className="app-modal-title">Create User</h2>
              <button
                type="button"
                onClick={closeCreateUserModal}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(handleCreateUser)}
              className="app-modal-body space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  type="text"
                  {...register("name")}
                  className="app-input"
                  placeholder="Enter full name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  {...register("email")}
                  className="app-input"
                  placeholder="user@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  {...register("password")}
                  className="app-input"
                  placeholder="Minimum 6 characters"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select {...register("role")} className="app-input">
                  {creatorRoleOptions.map((roleOption) => (
                    <option key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </option>
                  ))}
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              {["countryadmin", "branchadmin", "staff", "agent"].includes(
                selectedRole,
              ) && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Country
                  </label>
                  <select
                    {...register("countryId")}
                    className="app-input"
                    disabled={user?.role !== "superadmin"}
                  >
                    <option value="">Select Country</option>
                    {countries.map((country) => (
                      <option key={country?._id} value={country?._id}>
                        {country?.name} {country?.code ? `(${country.code})` : ""}
                      </option>
                    ))}
                  </select>
                  {errors.countryId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.countryId.message}
                    </p>
                  )}
                </div>
              )}

              {["branchadmin", "staff", "agent"].includes(selectedRole) && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Branch
                  </label>
                  <select
                    {...register("branchId")}
                    className="app-input"
                    disabled={user?.role === "branchadmin"}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch?._id} value={branch?._id}>
                        {branch?.name} {branch?.city ? `(${branch.city})` : ""}
                      </option>
                    ))}
                  </select>
                  {errors.branchId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.branchId.message}
                    </p>
                  )}
                </div>
              )}

              <div className="app-modal-footer -mx-5 -mb-4 mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeCreateUserModal}
                  className="app-button-secondary flex-1"
                  disabled={isCreatingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="app-button flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCreatingUser}
                >
                  {isCreatingUser ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default UserManagement;
