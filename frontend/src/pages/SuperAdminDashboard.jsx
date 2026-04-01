import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { logout } from "../features/authSlice";
import { FiLogOut, FiShield, FiUsers } from "react-icons/fi";

function SuperAdminDashboard() {
  const dispatch = useDispatch();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .trim();

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/auth/super-admin/admins");
      setAdmins(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to load admin users:", error);
      toast.error("Failed to load admin users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    const q = normalize(query);
    if (!q) return admins;

    return admins.filter((admin) => {
      return (
        normalize(admin.name).includes(q) ||
        normalize(admin.email).includes(q) ||
        normalize(admin.role).includes(q)
      );
    });
  }, [admins, query]);

  const activeCount = admins.filter(
    (admin) => Number(admin.isActive) === 1,
  ).length;
  const inactiveCount = admins.filter(
    (admin) => Number(admin.isActive) === 0,
  ).length;

  const toggleAdmin = async (adminId) => {
    try {
      await axiosInstance.patch(`/auth/super-admin/admins/${adminId}/toggle`);
      toast.success("Admin status updated");
      fetchAdmins();
    } catch (error) {
      console.error("Failed to update admin status:", error);
      toast.error(error?.response?.data?.message || "Failed to update status");
    }
  };

  const handleLogout = async () => {
    dispatch(logout());
  };

  const statusBadge = (isActive) =>
    Number(isActive) === 1
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-rose-100 text-rose-700 border-rose-200";

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <p className="text-teal-700 text-sm font-semibold uppercase tracking-[0.2em]">
              Super Admin Console
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold mt-2 text-slate-900">
              Admin Access Control
            </h1>
            {/* <p className="text-slate-600 mt-2 max-w-2xl">
              Manage admin accounts, review their access status, and activate or
              deactivate them from one place.
            </p> */}
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-600 transition shadow-md"
          >
            <FiLogOut />
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Total Admins</div>
                <div className="text-3xl font-bold mt-1 text-slate-900">
                  {admins.length}
                </div>
              </div>
              <div className="rounded-xl bg-orange-500 text-white p-3">
                <FiUsers className="text-2xl" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="text-sm text-slate-500">Active Admins</div>
            <div className="text-3xl font-bold mt-1 text-emerald-600">
              {activeCount}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="text-sm text-slate-500">Inactive Admins</div>
            <div className="text-3xl font-bold mt-1 text-rose-600">
              {inactiveCount}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-5 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Admin Users
              </h2>
              <p className="text-sm text-slate-500">
                Toggle access for admin accounts. Inactive admins cannot log in.
              </p>
            </div>

            <div className="relative md:w-96">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search admin by name or email"
                className="w-full h-10 rounded-xl border border-gray-300 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <FiShield className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">
              Loading admin users...
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No admin users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-slate-500">
                    <th className="px-5 py-4 font-medium">#</th>
                    <th className="px-5 py-4 font-medium">Admin</th>
                    <th className="px-5 py-4 font-medium">Email</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin, index) => {
                    const isActive = Number(admin.isActive) === 1;
                    return (
                      <tr
                        key={admin.id}
                        className="border-b last:border-b-0 hover:bg-slate-50 transition"
                      >
                        <td className="px-5 py-4 text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800">
                            {admin.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {admin.role}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {admin.email}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(
                              admin.isActive,
                            )}`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <button
                              onClick={() => toggleAdmin(admin.id)}
                              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                                isActive
                                  ? "bg-rose-600 text-white hover:bg-rose-500"
                                  : "bg-emerald-600 text-white hover:bg-emerald-500"
                              }`}
                            >
                              {isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
