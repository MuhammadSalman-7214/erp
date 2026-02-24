// pages/UserManagement.jsx

import React, { useState, useEffect, useCallback } from "react";
import { userAPI } from "../services/userAPI";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { MdDelete } from "react-icons/md";
import { Plus, ToggleLeft, ToggleRight, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { authAPI, branchAPI, countryAPI } from "../services/api";
import StatCard from "../Components/StatCard";
import NoData from "../Components/NoData";

const createUserSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  role: yup.string().required("Role is required"),
  countryId: yup.string().when("role", {
    is: (role) =>
      ["countryadmin", "branchadmin", "staff", "agent"].includes(role),
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

  const activeCountryId = user?.countryId?._id || user?.country?._id || "";
  const activeBranchId = user?.branch?._id || user?.branchId?._id || "";

  const normalizeUsersPayload = (payload) => {
    if (Array.isArray(payload?.users)) return payload.users;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      let response;
      if (user?.role === "branchadmin" && activeBranchId) {
        response = await userAPI.getUsersByBranch(activeBranchId);
      } else if (user?.role === "countryadmin" && activeCountryId) {
        response = await userAPI.getUsersByCountry(activeCountryId);
      } else {
        response = await userAPI.getAllUsers();
      }

      setUsers(normalizeUsersPayload(response?.data));
    } catch (error) {
      toast.error("Failed to fetch users");
      console.error(error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.role, activeBranchId, activeCountryId]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await userAPI.getUserStats();
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  useEffect(() => {
    if (!user?.role) return;
    fetchUsers();
    fetchStats();
  }, [user?.role, activeCountryId, activeBranchId, fetchUsers, fetchStats]);

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
      const currentToken = localStorage.getItem("token");

      const payload = { ...formData };
      if (user?.role === "countryadmin") {
        payload.countryId = user.countryId?._id;
      }
      if (user?.role === "branchadmin") {
        payload.countryId = user.countryId?._id;
        payload.branchId = user.branch?._id;
      }

      await authAPI.signup(payload);
      if (currentToken) {
        localStorage.setItem("token", currentToken);
      }
      toast.success(`User ${payload.name} created successfully!`);

      closeCreateUserModal();
      await Promise.all([fetchUsers(), fetchStats()]);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error ||
          "Failed to create user. Please try again.",
      );
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await userAPI.toggleUserStatus(userId);
      toast.success("User status updated");
      await Promise.all([fetchUsers(), fetchStats()]);
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
      await Promise.all([fetchUsers(), fetchStats()]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    }
  };

  const handleToggleStaffEdit = async (targetUser) => {
    try {
      const nextValue = !targetUser.staffCanEdit;
      await userAPI.updateStaffPermissions(targetUser._id, nextValue);
      toast.success("Staff permissions updated");
      await Promise.all([fetchUsers(), fetchStats()]);
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

  const filteredUsers = users
    .filter((u) => u.role !== "superadmin")
    .filter((u) => (showStaffOnly ? u.role === "staff" : true));

  return (
    <div>
      <div className="flex justify-end items-center mb-6">
        {canManageStaff && (
          <button
            onClick={() => setIsCreateUserOpen(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition flex items-center gap-1"
          >
            <Plus className="w-6 h-6" strokeWidth={2} />
            Create User
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-6">
          {/* {user.role === "superadmin" && (
            <StatCard
              title="Super Admins"
              value={stats.superadmin}
              accent="bg-blue-500"
              icon="👑"
            />
          )} */}

          <StatCard
            title="Country Admins"
            value={stats.countryadmin}
            accent="bg-emerald-500"
            icon="🌍"
          />

          <StatCard
            title="Branch Admins"
            value={stats.branchadmin}
            accent="bg-violet-500"
            icon="🏢"
          />

          <StatCard
            title="Staff"
            value={stats.staff}
            accent="bg-amber-500"
            icon="🧑‍💼"
          />

          <StatCard
            title="Agents"
            value={stats.agent}
            accent="bg-orange-500"
            icon="📦"
          />
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
        {filteredUsers.length !== 0 ? (
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
                    {u.countryId ? `${u.countryId.code} ` : "--"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {u.branchId
                      ? `${u.branchId.name} (${u.branchId.city})`
                      : "--"}
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
                      "--"
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
        ) : (
          <NoData
            title="Users"
            description="Try adjusting filters or Create new User to get started."
          />
        )}
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
                  <p className="mt-1 text-sm text-red-600">
                    {errors.name.message}
                  </p>
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
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
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
                <div className="app-select-wrapper">
                  <select {...register("role")} className="app-select">
                    {creatorRoleOptions.map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>

                  <div className="app-select-arrow">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.role.message}
                  </p>
                )}
              </div>

              {["countryadmin", "branchadmin", "staff", "agent"].includes(
                selectedRole,
              ) && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Country
                  </label>
                  <div className="app-select-wrapper">
                    <select
                      {...register("countryId")}
                      className="app-select"
                      disabled={user?.role !== "superadmin"}
                    >
                      <option value="">Select Country</option>
                      {countries.map((country) => (
                        <option key={country?._id} value={country?._id}>
                          {country?.name}{" "}
                          {country?.code ? `(${country.code})` : ""}
                        </option>
                      ))}
                    </select>

                    <div className="app-select-arrow">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
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
                  <div className="app-select-wrapper">
                    <select
                      {...register("branchId")}
                      className="app-select"
                      disabled={user?.role === "branchadmin"}
                    >
                      <option value="">Select Branch</option>
                      {branches.map((branch) => (
                        <option key={branch?._id} value={branch?._id}>
                          {branch?.name}{" "}
                          {branch?.city ? `(${branch.city})` : ""}
                        </option>
                      ))}
                    </select>

                    <div className="app-select-arrow">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
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
