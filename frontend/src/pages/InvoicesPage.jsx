import React, { useEffect, useMemo, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { MdDelete, MdEdit, MdVisibility } from "react-icons/md";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import NoData from "../Components/NoData";
import { Popconfirm } from "antd";
import { TableSkeleton } from "../Components/LoadingSkeletons";
import DateSortHeader from "../Components/DateSortHeader";
import InputField from "../Components/InputField";
import SelectField from "../Components/SelectField";
import { formatDateLabel, sortByDateValue } from "../lib/dateFormat";
import { Button, Table } from "antd";

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
        <InputField
          containerClassName="w-full md:w-96"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search invoice..."
        />
        <SelectField
          containerClassName="w-full md:w-56"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[
            { label: "All Types", value: "all" },
            { label: "Sales", value: "sales" },
            { label: "Purchase", value: "purchase" },
          ]}
        />

        <button
          onClick={() => navigate("/createInvoice")}
          className="bg-teal-800 hover:bg-teal-600 text-white px-6 h-10 rounded-xl flex items-center justify-center shadow-md"
        >
          <IoMdAdd size={18} />
          Create Invoice
        </button>
      </div>
      {/* Card */}
      <div className="mt-4 bg-white rounded-2xl shadow-sm border overflow-hidden p-2">
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
          <Table
            rowKey="id"
            pagination={false}
            dataSource={sortedInvoices}
            className="erp-ant-table"
            columns={[
              {
                title: "#",
                render: (_, __, index) => index + 1,
                width: 70,
              },
              {
                title: "Invoice",
                dataIndex: "invoiceNumber",
                render: (value) => (
                  <div className="font-medium text-slate-800">{value}</div>
                ),
              },
              {
                title: "Type",
                dataIndex: "invoiceType",
                render: (value) => <span className="capitalize">{value || "-"}</span>,
                width: 120,
              },
              {
                title: "Party",
                key: "party",
                render: (_, record) =>
                  record.invoiceType === "purchase"
                    ? record.vendor?.name || "-"
                    : record.customerId?.name || record.customer?.name || "-",
              },
              {
                title: "Amount",
                dataIndex: "totalAmount",
                render: (value) => (
                  <span className="font-semibold text-slate-800">
                    Rs {Number(value || 0).toLocaleString()}
                  </span>
                ),
                width: 140,
              },
              {
                title: "Status",
                dataIndex: "status",
                render: (value) => (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      statusStyles[value] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {(value || "-").toUpperCase()}
                  </span>
                ),
                width: 130,
              },
              {
                title: (
                  <DateSortHeader
                    label="Due Date"
                    direction={dueDateSort}
                    onToggle={() =>
                      setDueDateSort((prev) => (prev === "asc" ? "desc" : "asc"))
                    }
                  />
                ),
                dataIndex: "dueDate",
                render: (_, record) => (
                  <span className="text-slate-600">
                    {formatDateLabel(record.dueDate)}
                  </span>
                ),
                width: 150,
              },
              {
                title: <div className="text-right">Actions</div>,
                key: "actions",
                width: 180,
                render: (_, record) => (
                  <div className="flex justify-end gap-2">
                    <Button
                      icon={<MdVisibility size={18} />}
                      onClick={() => navigate(`/invoice/${record.id}`)}
                    />
                    <Button
                      icon={<MdEdit size={18} />}
                      onClick={() => navigate(`/editInvoice/${record.id}`)}
                    />
                    <Popconfirm
                      title={
                        <div className="flex flex-col gap-1 max-w-xs">
                          <span className="font-semibold text-red-600 text-sm">
                            Confirm Invoice Deletion
                          </span>
                          <span className="text-xs text-gray-600 leading-snug">
                            This action will permanently delete this invoice
                            and all related payment and ledger records. This
                            operation cannot be undone.
                          </span>
                        </div>
                      }
                      okText="Yes, Delete Invoice"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true, className: "font-semibold" }}
                      cancelButtonProps={{ className: "font-medium" }}
                      placement="topRight"
                      onConfirm={() => deleteInvoice(record.id)}
                    >
                      <Button danger icon={<MdDelete size={18} />} />
                    </Popconfirm>
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}

export default InvoicesPage;
