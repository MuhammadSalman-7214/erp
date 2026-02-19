import { useEffect, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { MdDelete, MdEdit, MdVisibility } from "react-icons/md";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useRolePermissions } from "../hooks/useRolePermissions";
import NoData from "../Components/NoData";

function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { hasPermission } = useRolePermissions();

  const dashboardBasePath = (() => {
    switch (user?.role) {
      case "superadmin":
        return "/SuperAdminDashboard";
      case "countryadmin":
        return "/CountryAdminDashboard";
      case "branchadmin":
        return "/BranchAdminDashboard";
      case "staff":
        return "/StaffDashboard";
      case "agent":
        return "/AgentDashboard";
      default:
        return "/";
    }
  })();
  const [query, setQuery] = useState("");

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/invoice/");
      setInvoices(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const deleteInvoice = async (id) => {
    try {
      await axiosInstance.delete(`invoice/${id}`);
      toast.success("Invoice deleted");
      fetchInvoices();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete invoice");
    }
  };

  const approveInvoice = async (id) => {
    try {
      await axiosInstance.patch(`invoice/${id}/approve`);
      toast.success("Invoice approved");
      fetchInvoices();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve invoice");
    }
  };

  const payInvoice = async (id) => {
    try {
      await axiosInstance.patch(`invoice/${id}/pay`);
      toast.success("Invoice marked as paid");
      fetchInvoices();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark invoice as paid");
    }
  };

  const statusStyles = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    approved: "bg-indigo-100 text-indigo-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-yellow-100 text-yellow-700",
  };
  // ✅ Filter invoices client-side
  const displayInvoices = invoices.filter((inv) => {
    if (!query.trim()) return true;
    const lower = query.toLowerCase();
    return (
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(lower)) ||
      (inv.client?.name && inv.client.name.toLowerCase().includes(lower)) ||
      (inv.status && inv.status.toLowerCase().includes(lower))
    );
  });
  return (
    <div className="min-h-[92vh] p-4">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full md:w-96 h-10 px-4 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
          placeholder="Search supplier..."
        />

        <button
          onClick={() => navigate(`${dashboardBasePath}/createInvoice`)}
          className="bg-teal-800 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
        >
          <IoMdAdd size={18} />
          Create Invoice
        </button>
      </div>
      {/* Card */}
      <div className="mt-4 app-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500 animate-pulse">
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-10 text-center">
            <NoData
              title="No Invoice Found"
              description="Try adjusting filters or add a new invoice to get started."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-slate-500">
                  <th className="px-5 py-4 font-medium">#</th>
                  <th className="px-5 py-4 font-medium">Invoice</th>
                  <th className="px-5 py-4 font-medium">Client</th>
                  <th className="px-5 py-4 font-medium">Amount</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Due Date</th>
                  <th className="px-5 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {displayInvoices.map((inv, index) => (
                  <tr
                    key={inv._id}
                    className="border-b last:border-b-0 hover:bg-slate-50 transition"
                  >
                    <td className="px-5 py-4 text-slate-500">{index + 1}</td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">
                        {inv.invoiceNumber}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {inv.client?.name || "-"}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {inv.currency} {inv.totalAmount.toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          statusStyles[inv.status] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {inv.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            navigate(`${dashboardBasePath}/invoice/${inv._id}`)
                          }
                          className="p-2 rounded-lg bg-slate-100 hover:bg-teal-100 text-teal-600 transition"
                          title="View"
                        >
                          <MdVisibility size={18} />
                        </button>

                        {["draft", "sent"].includes(inv.status) && (
                          <button
                            onClick={() =>
                              navigate(
                                `${dashboardBasePath}/editInvoice/${inv._id}`,
                              )
                            }
                            className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-600 transition"
                            title="Edit"
                          >
                            <MdEdit size={18} />
                          </button>
                        )}

                        {hasPermission("invoiceApprove", "write") &&
                          ["draft", "sent"].includes(inv.status) && (
                            <button
                              onClick={() => approveInvoice(inv._id)}
                              className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
                              title="Approve"
                            >
                              Approve
                            </button>
                          )}

                        {hasPermission("invoice", "write") &&
                          inv.status === "approved" && (
                            <button
                              onClick={() => payInvoice(inv._id)}
                              className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition"
                              title="Mark as Paid"
                            >
                              Pay
                            </button>
                          )}

                        {hasPermission("invoice", "delete") && (
                          <button
                            onClick={() => deleteInvoice(inv._id)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                            title="Delete"
                          >
                            <MdDelete size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default InvoicesPage;
