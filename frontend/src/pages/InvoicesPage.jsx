import React, { useEffect, useMemo, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { MdDelete, MdEdit, MdVisibility } from "react-icons/md";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import NoData from "../Components/NoData";
import { TableSkeleton } from "../Components/LoadingSkeletons";
import DateSortHeader from "../Components/DateSortHeader";
import { formatDateLabel, sortByDateValue } from "../lib/dateFormat";
import { Button, ConfirmDialog, Inputfield, SelectDropdown } from "../UI";
import { CgSoftwareDownload } from "react-icons/cg";
import { PiInvoiceBold } from "react-icons/pi";

function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dueDateSort, setDueDateSort] = useState("asc");

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

  const openInvoicePreview = (invoice) => {
    if (!invoice?.id) return;
    navigate(`/invoice/${invoice.id}`);
  };

  const downloadInvoice = (invoice) => {
    if (!invoice?.id) return;
    window.open(
      `/invoice/${invoice.id}?action=download`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const statusStyles = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-yellow-100 text-yellow-700",
  };
  // ✅ Filter invoices client-side
  const displayInvoices = invoices.filter((inv) => {
    if (typeFilter !== "all") {
      if ((inv.invoiceType || "").toLowerCase() !== typeFilter) return false;
    }
    if (!query.trim()) return true;
    const lower = query.toLowerCase();
    return (
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(lower)) ||
      ((inv.customerId?.name || inv.customer?.name) &&
        (inv.customerId?.name || inv.customer?.name)
          .toLowerCase()
          .includes(lower)) ||
      (inv.vendor?.name && inv.vendor.name.toLowerCase().includes(lower)) ||
      (inv.status && inv.status.toLowerCase().includes(lower))
    );
  });

  const sortedInvoices = useMemo(
    () => sortByDateValue(displayInvoices, (inv) => inv.dueDate, dueDateSort),
    [displayInvoices, dueDateSort],
  );
  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <Inputfield
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full md:w-96"
          placeholder="Search invoice..."
        />
        <SelectDropdown
          value={typeFilter}
          onChange={(value) => setTypeFilter(value)}
          className="w-full md:w-56"
          options={[
            { value: "all", label: "All Types" },
            { value: "sales", label: "Sales" },
            { value: "purchase", label: "Purchase" },
          ]}
        />

        <Button onClick={() => navigate("/createInvoice")} variant="primary">
          <IoMdAdd size={18} />
          Create Invoice
        </Button>
      </div>
      {/* Table */}
      <div className="mt-4 bg-white rounded-2xl shadow-sm border overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} showFilters={false} />
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
                  <th className="px-5 py-4 font-medium">Type</th>
                  <th className="px-5 py-4 font-medium">Party</th>
                  <th className="px-5 py-4 font-medium">Amount</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <DateSortHeader
                    label="Due Date"
                    direction={dueDateSort}
                    onToggle={() =>
                      setDueDateSort((prev) =>
                        prev === "asc" ? "desc" : "asc",
                      )
                    }
                  />
                  <th className="px-5 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {sortedInvoices.map((inv, index) => (
                  <tr
                    key={inv.id}
                    className="border-b last:border-b-0 hover:bg-slate-50 transition"
                  >
                    <td className="px-5 py-4 text-slate-500">{index + 1}</td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800">
                        {inv.invoiceNumber}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-700 capitalize">
                      {inv.invoiceType || "-"}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {inv.invoiceType === "purchase"
                        ? inv.vendor?.name || "-"
                        : inv.customerId?.name || inv.customer?.name || "-"}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-800">
                      Rs {inv.totalAmount.toLocaleString()}
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
                      {formatDateLabel(inv.dueDate)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <div className="flex items-center rounded-lg bg-slate-50 border border-slate-200 p-1">
                          {/* <ConfirmDialog
                            title={
                              <div className="flex flex-col gap-1 max-w-xs">
                                <span className="font-semibold text-red-600 text-sm">
                                  Confirm Invoice Deletion
                                </span>
                                <span className="text-xs text-gray-600 leading-snug">
                                  This action will permanently delete this
                                  invoice and all related payment and ledger
                                  records. This operation cannot be undone.
                                </span>
                              </div>
                            }
                            okText="Yes, Delete Invoice"
                            cancelText="Cancel"
                            okButtonProps={{
                              danger: true,
                              className: "font-semibold",
                            }}
                            cancelButtonProps={{
                              className: "font-medium",
                            }}
                            placement="topRight"
                            onConfirm={() => deleteInvoice(inv.id)}
                          >
                            <Button
                              className=" h-9 w-9 !p-0 rounded-lg"
                              variant="danger"
                              title="Delete Invoice"
                            >
                              <MdDelete size={18} />
                            </Button>
                          </ConfirmDialog> */}
                          <Button
                            type="button"
                            onClick={() => navigate(`/editInvoice/${inv.id}`)}
                            variant="info"
                            title="Edit sale"
                          >
                            <MdEdit size={16} />
                          </Button>
                          <div className="w-px h-5 bg-slate-200" />

                          <Button
                            type="button"
                            onClick={() => openInvoicePreview(inv)}
                            variant="orange"
                            title="Bill Preview"
                          >
                            <PiInvoiceBold size={16} />
                          </Button>
                          <div className="w-px h-5 bg-slate-200" />

                          <Button
                            type="button"
                            onClick={() => downloadInvoice(inv)}
                            variant="violet"
                            title="Download Bill"
                          >
                            <CgSoftwareDownload size={18} />
                          </Button>
                        </div>
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
