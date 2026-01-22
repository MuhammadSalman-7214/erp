import React, { useEffect, useState } from "react";
import TopNavbar from "../Components/TopNavbar";
import { IoMdAdd } from "react-icons/io";
import { MdDelete, MdEdit, MdVisibility } from "react-icons/md";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    if (!window.confirm("Delete this invoice permanently?")) return;
    try {
      await axiosInstance.delete(`invoice/${id}`);
      toast.success("Invoice deleted");
      fetchInvoices();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete invoice");
    }
  };

  const statusStyles = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNavbar />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Invoices</h1>
            <p className="text-slate-500 mt-1">
              Manage and track all customer invoices
            </p>
          </div>

          <button
            onClick={() => navigate("/AdminDashboard/createInvoice")}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl shadow hover:shadow-lg hover:scale-[1.02] transition"
          >
            <IoMdAdd size={18} />
            Create Invoice
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-slate-500 animate-pulse">
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-slate-500 mb-4">No invoices found</p>
              <button
                onClick={() => navigate("/AdminDashboard/createInvoice")}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                <IoMdAdd />
                Create your first invoice
              </button>
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
                    <th className="px-5 py-4 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {invoices.map((inv, index) => (
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
                              navigate(`/AdminDashboard/invoice/${inv._id}`)
                            }
                            className="p-2 rounded-lg bg-slate-100 hover:bg-green-100 text-green-600 transition"
                            title="View"
                          >
                            <MdVisibility size={18} />
                          </button>

                          <button
                            onClick={() =>
                              navigate(`/AdminDashboard/editInvoice/${inv._id}`)
                            }
                            className="p-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-blue-600 transition"
                            title="Edit"
                          >
                            <MdEdit size={18} />
                          </button>

                          <button
                            onClick={() => deleteInvoice(inv._id)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-red-100 text-red-600 transition"
                            title="Delete"
                          >
                            <MdDelete size={18} />
                          </button>
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
    </div>
  );
}

export default InvoicesPage;
