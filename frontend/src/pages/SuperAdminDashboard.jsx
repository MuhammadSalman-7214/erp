import { useCallback, useEffect, useMemo, useState } from "react";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { logout } from "../features/authSlice";
import {
  FiLogOut,
  FiShield,
  FiUsers,
  FiCreditCard,
  FiCheckCircle,
  FiFileText,
} from "react-icons/fi";
import { TableSkeleton } from "../Components/LoadingSkeletons";
import { validateNumberInput } from "../lib/formValidation";

const getDaysInMonth = (year, monthIndex) =>
  new Date(year, monthIndex + 1, 0).getDate();

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getSafeBillingDay = (admin) => {
  const createdAt = admin?.createdAt ? new Date(admin.createdAt) : null;
  const fallbackDay =
    createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.getDate() : 1;
  const billingDay = Number(admin?.billingDay || fallbackDay || 1);
  return Number.isFinite(billingDay) && billingDay > 0 ? billingDay : 1;
};

const getDueDateForAdmin = (admin) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const billingDay = getSafeBillingDay(admin);
  const day = Math.min(Math.max(billingDay, 1), getDaysInMonth(year, month));
  return new Date(year, month, day);
};

function SuperAdminDashboard() {
  const dispatch = useDispatch();
  const [admins, setAdmins] = useState([]);
  const [unpaidAdmins, setUnpaidAdmins] = useState([]);
  const [bannerByAdminId, setBannerByAdminId] = useState({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [paymentModal, setPaymentModal] = useState({
    open: false,
    admin: null,
    amount: "",
  });
  const [errors, setErrors] = useState({});
  const [historyModal, setHistoryModal] = useState({
    open: false,
    admin: null,
    loading: false,
    payments: [],
    totalRevenue: 0,
    error: "",
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .trim();

  const fetchAdmins = useCallback(async () => {
    const [adminsRes, unpaidRes] = await Promise.all([
      axiosInstance.get("/auth/super-admin/admins"),
      axiosInstance.get("/payments/unpaid-users"),
    ]);

    const adminList = Array.isArray(adminsRes.data) ? adminsRes.data : [];

    const bannerEntries = await Promise.allSettled(
      adminList.map(async (admin) => {
        const response = await axiosInstance.get(`/users/${admin.id}/banner`);
        return [admin.id, response.data?.banner || null];
      }),
    );

    const bannerMap = bannerEntries.reduce((acc, entry) => {
      if (entry.status === "fulfilled") {
        const [adminId, banner] = entry.value;
        acc[adminId] = banner;
      }
      return acc;
    }, {});

    setAdmins(adminList);
    setUnpaidAdmins(
      Array.isArray(unpaidRes.data?.users) ? unpaidRes.data.users : [],
    );
    setBannerByAdminId(bannerMap);
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      setLoading(true);
      await fetchAdmins();
    } catch (error) {
      console.error("Failed to load super admin dashboard:", error);
      toast.error(
        error?.response?.data?.message ||
          "Failed to load super admin dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchAdmins]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const unpaidSet = useMemo(
    () => new Set(unpaidAdmins.map((user) => Number(user.id))),
    [unpaidAdmins],
  );

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
  const unpaidCount = unpaidAdmins.length;

  const toggleAdmin = async (adminId) => {
    try {
      await axiosInstance.patch(`/auth/super-admin/admins/${adminId}/toggle`);
      toast.success("Admin status updated");
      await refreshDashboard();
    } catch (error) {
      console.error("Failed to update admin status:", error);
      toast.error(error?.response?.data?.message || "Failed to update status");
    }
  };

  const openPaymentModal = (admin) => {
    setPaymentModal({
      open: true,
      admin,
      amount: "",
    });
    setErrors({});
  };

  const openHistoryModal = async (admin) => {
    setHistoryModal({
      open: true,
      admin,
      loading: true,
      payments: [],
      totalRevenue: 0,
      error: "",
    });

    try {
      const response = await axiosInstance.get(`/payments/${admin.id}`);
      setHistoryModal({
        open: true,
        admin,
        loading: false,
        payments: Array.isArray(response.data?.payments)
          ? response.data.payments
          : [],
        totalRevenue: Number(response.data?.totalRevenue || 0),
        error: "",
      });
    } catch (error) {
      setHistoryModal({
        open: true,
        admin,
        loading: false,
        payments: [],
        totalRevenue: 0,
        error:
          error?.response?.data?.message || "Failed to load payment history",
      });
      toast.error(
        error?.response?.data?.message || "Failed to load payment history",
      );
    }
  };

  const closeHistoryModal = () => {
    setHistoryModal({
      open: false,
      admin: null,
      loading: false,
      payments: [],
      totalRevenue: 0,
      error: "",
    });
  };

  const closePaymentModal = () => {
    setPaymentModal({
      open: false,
      admin: null,
      amount: "",
    });
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

  const submitPayment = async (event) => {
    event.preventDefault();

    if (!paymentModal.admin) {
      return;
    }

    const amountCheck = validateField(
      "amount",
      paymentModal.amount,
      (value) =>
        validateNumberInput(value, "Payment amount", {
          min: 0.01,
          allowZero: false,
        }),
    );
    if (!amountCheck.ok) {
      toast.error(amountCheck.message);
      return;
    }

    try {
      setSubmittingPayment(true);
      await axiosInstance.post("/payments", {
        userId: paymentModal.admin.id,
        amount: amountCheck.value,
      });
      toast.success("Payment added and user activated");
      setSubmittingPayment(false);
      closePaymentModal();
      await refreshDashboard();
    } catch (error) {
      console.error("Failed to add payment:", error);
      toast.error(error?.response?.data?.message || "Failed to add payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleLogout = async () => {
    dispatch(logout());
  };

  const statusBadge = (isActive) =>
    Number(isActive) === 1
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-rose-100 text-rose-700 border-rose-200";

  const paymentBadge = (isPaid) =>
    isPaid
      ? "bg-sky-100 text-sky-700 border-sky-200"
      : "bg-amber-100 text-amber-700 border-amber-200";

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <p className="text-teal-700 text-sm font-semibold uppercase tracking-[0.2em]">
              Super Admin Console
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold mt-2 text-slate-900">
              Admin Access and Billing
            </h1>
            <p className="text-slate-600 mt-2 max-w-2xl">
              Manage admin accounts, record subscription payments, and activate
              or deactivate access from one place.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-600 transition shadow-md"
          >
            <FiLogOut />
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

          <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="text-sm text-slate-500">Unpaid This Month</div>
            <div className="text-3xl font-bold mt-1 text-amber-600">
              {unpaidCount}
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
                Record payments for admin accounts and manage access in one
                view.
              </p>
            </div>

            <div className="relative md:w-96">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={120}
                placeholder="Search admin by name or email"
                className="w-full h-10 rounded-xl border border-gray-300 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <FiShield className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {loading ? (
            <TableSkeleton rows={5} showFilters={false} />
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
                    <th className="px-5 py-4 font-medium">Billing Day</th>
                    <th className="px-5 py-4 font-medium">Payment</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin, index) => {
                    const isActive = Number(admin.isActive) === 1;
                    const isPaid = !unpaidSet.has(Number(admin.id));
                    const dueDate = getDueDateForAdmin(admin);
                    const dueDateLabel = dueDate.toLocaleDateString();
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
                            {admin.email}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {getSafeBillingDay(admin)}
                          <div className="text-xs text-slate-500">
                            Due {dueDateLabel}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${paymentBadge(
                              isPaid,
                            )}`}
                          >
                            {isPaid ? "Paid" : "Unpaid"}
                          </span>
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
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => openHistoryModal(admin)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 text-white hover:bg-slate-600 transition"
                            >
                              <FiFileText />
                              History
                            </button>
                            <button
                              onClick={() => openPaymentModal(admin)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-sky-600 text-white hover:bg-sky-500 transition"
                            >
                              <FiCreditCard />
                              Add Payment
                            </button>
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

      {paymentModal.open && paymentModal.admin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-teal-700 uppercase tracking-[0.2em]">
                  Record Payment
                </p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {paymentModal.admin.name}
                </h3>
                <p className="text-sm text-slate-500">{getCurrentMonthKey()}</p>
              </div>
              <button
                type="button"
                onClick={closePaymentModal}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                disabled={submittingPayment}
              >
                X
              </button>
            </div>

            <form onSubmit={submitPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentModal.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPaymentModal((prev) => ({
                      ...prev,
                      amount: value,
                    }));
                    validateField("amount", value, (current) =>
                      validateNumberInput(current, "Payment amount", {
                        min: 0.01,
                        allowZero: false,
                      }),
                    );
                  }}
                  onBlur={(e) =>
                    validateField("amount", e.target.value, (current) =>
                      validateNumberInput(current, "Payment amount", {
                        min: 0.01,
                        allowZero: false,
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter payment amount"
                  inputMode="decimal"
                />
                {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount}</p>}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={submittingPayment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60"
                  disabled={submittingPayment}
                >
                  <FiCheckCircle />
                  {submittingPayment ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {historyModal.open && historyModal.admin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-sm font-semibold text-teal-700 uppercase tracking-[0.2em]">
                  Payment History
                </p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {historyModal.admin.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {historyModal.admin.email}
                </p>
              </div>
              <button
                type="button"
                onClick={closeHistoryModal}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                X
              </button>
            </div>

            <div className="mb-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Total Revenue</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {Number(historyModal.totalRevenue || 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Current month key: {getCurrentMonthKey()}
              </div>
            </div>

            {historyModal.loading ? (
              <TableSkeleton rows={3} showFilters={false} />
            ) : historyModal.error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
                {historyModal.error}
              </div>
            ) : historyModal.payments.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                No payment history found.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">Month</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Paid At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyModal.payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b last:border-b-0 bg-white"
                      >
                        <td className="px-4 py-3 text-slate-700">
                          {payment.month}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {Number(payment.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {payment.paidAt
                            ? new Date(payment.paidAt).toLocaleString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SuperAdminDashboard;
