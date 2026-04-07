import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { IoMdAdd } from "react-icons/io";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { Download } from "lucide-react";
import { Popconfirm } from "antd";
import { MdDelete } from "react-icons/md";
import axiosInstance from "../lib/axios";
import FormattedTime from "../lib/FormattedTime";
import NoData from "../Components/NoData";
import { TrendingUp, CreditCard, AlertCircle, Clipboard } from "lucide-react";
import { DetailSkeleton } from "../Components/LoadingSkeletons";
import DrawerPanel from "../Components/DrawerPanel";

const sanitizeFileName = (value) =>
  String(value || "customer_ledger")
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "customer_ledger";

const formatDateLabel = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    paid: 0,
    remaining: 0,
    count: 0,
  });
  const [ledger, setLedger] = useState([]);
  const [ledgerTotals, setLedgerTotals] = useState({
    debit: 0,
    credit: 0,
    balance: 0,
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(true);

  const currency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;

  const fetchCustomerSales = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/sales/customer/${id}`);
      const payload = response.data || {};
      setCustomer(payload.customer || null);
      setSales(payload.sales || []);
      setSummary(
        payload.summary || { total: 0, paid: 0, remaining: 0, count: 0 },
      );
    } catch (error) {
      console.error("Failed to load customer history:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerLedger = async () => {
    try {
      setLedgerLoading(true);
      const response = await axiosInstance.get(
        `/payment/customer-ledger/${id}`,
      );
      const payload = response.data || {};
      setLedger(payload.ledger || []);
      setLedgerTotals(payload.totals || { debit: 0, credit: 0, balance: 0 });
      if (payload.customer) {
        setCustomer((prev) => prev || payload.customer);
      }
    } catch (error) {
      console.error("Failed to load customer ledger:", error);
    } finally {
      setLedgerLoading(false);
    }
  };

  const refreshCustomerData = async () => {
    await Promise.all([fetchCustomerSales(), fetchCustomerLedger()]);
  };

  useEffect(() => {
    refreshCustomerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const getPaymentStatusBadge = (status) => {
    const normalized = String(status || "unpaid").toLowerCase();
    if (normalized === "paid") return "bg-green-100 text-green-700";
    if (normalized === "partial") return "bg-blue-100 text-blue-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const openManualEntry = () => {
    setManualAmount("");
    setManualDescription("");
    setIsDrawerMinimized(false);
    setIsDrawerOpen(true);
  };

  const closeManualEntry = () => {
    setIsDrawerOpen(false);
    setIsDrawerMinimized(false);
    setManualAmount("");
    setManualDescription("");
  };

  const submitManualEntry = async (event) => {
    event.preventDefault();

    if (!manualAmount || Number(manualAmount) <= 0) return;
    if (!manualDescription.trim()) return;

    try {
      await axiosInstance.post(`/customer/${id}/opening-balance`, {
        amount: Number(manualAmount),
        notes: manualDescription.trim(),
      });
      closeManualEntry();
      await refreshCustomerData();
    } catch (error) {
      console.error("Failed to update customer opening balance:", error);
    }
  };

  const deleteLegacyAmount = async () => {
    try {
      await axiosInstance.delete(`/customer/${id}/opening-balance`);
      await refreshCustomerData();
    } catch (error) {
      console.error("Failed to delete customer legacy amount:", error);
    }
  };

  const downloadLedgerPdf = () => {
    if (!customer) return;

    const fileName = `${sanitizeFileName(customer.name || "customer")}_ledger.pdf`;
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    pdf.setProperties({
      title: fileName,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginX = 12;
    let y = 14;

    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Customer Ledger", marginX, y);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(customer.name || "Customer", marginX, y + 7);
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      "Debit shows sales and opening balance. Credit shows payments received.",
      marginX,
      y + 13,
    );

    y += 20;
    pdf.setDrawColor(203, 213, 225);
    pdf.line(marginX, y, pageWidth - marginX, y);
    y += 8;

    autoTable(pdf, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Date", "Source", "Reference", "Credit", "Debit", "Balance"]],
      body: (ledger || []).map((entry) => [
        formatDateLabel(entry.date),
        String(entry.source?.replace(/_/g, " ") || "-"),
        String(
          entry.source === "manual"
            ? entry.notes || "-"
            : entry.reference || "-",
        ),
        entry.type === "debit" ? currency(entry.amount) : "-",
        entry.type === "credit" ? currency(entry.amount) : "-",
        currency(entry.balance),
      ]),
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 1.8,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 28 },
        2: { cellWidth: 52 },
        3: { cellWidth: 24, halign: "right" },
        4: { cellWidth: 24, halign: "right" },
        5: { cellWidth: 26, halign: "right" },
      },
      theme: "grid",
    });

    const finalY = pdf.lastAutoTable?.finalY || y;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(
      `Amount Goes: ${currency(ledgerTotals.debit)}`,
      marginX,
      finalY + 10,
    );
    pdf.text(
      `Amount Comes: ${currency(ledgerTotals.credit)}`,
      marginX,
      finalY + 16,
    );
    pdf.text(
      `Balance: ${currency(ledgerTotals.balance)}`,
      marginX,
      finalY + 22,
    );

    pdf.save(fileName);
  };

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Customer Details
          </h1>
          <p className="text-sm text-slate-500">
            Sales history, balances, and ledger for this customer
          </p>
        </div>
      </div>

      {loading ? (
        <DetailSkeleton />
      ) : (
        <>
          <div className="bg-white rounded-2xl border p-5 shadow-sm mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <div className="text-sm text-slate-500">Customer</div>
                <div className="text-xl font-semibold text-slate-800">
                  {customer?.name || "Unknown"}
                </div>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <div>Phone: {customer?.contactInfo?.phone || "-"}</div>
                <div>Address: {customer?.contactInfo?.address || "-"}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              {
                label: "Total Sales",
                value: currency(summary.total),
                bg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
                icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
                borderColor: "border-emerald-200",
              },
              {
                label: "Collected",
                value: currency(summary.paid),
                bg: "bg-gradient-to-br from-teal-50 to-teal-100",
                icon: <CreditCard className="w-5 h-5 text-teal-600" />,
                borderColor: "border-teal-200",
              },
              {
                label: "Remaining",
                value: currency(summary.remaining),
                bg: "bg-gradient-to-br from-rose-50 to-rose-100",
                icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
                borderColor: "border-rose-200",
              },
              {
                label: "Total Orders",
                value: summary.count || 0,
                bg: "bg-gradient-to-br from-blue-50 to-blue-100",
                icon: <Clipboard className="w-5 h-5 text-blue-600" />,
                borderColor: "border-blue-200",
              },
            ].map(({ label, value, bg, icon, borderColor }) => (
              <div
                key={label}
                className={`rounded-xl p-5 border-2 ${borderColor} ${bg} shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">
                    {label}
                  </div>
                  {icon}
                </div>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b">
              <div>
                <div className="text-lg font-semibold text-slate-800">
                  Customer Ledger
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={downloadLedgerPdf}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                <div className="flex flex-wrap justify-end gap-3 text-sm text-slate-600">
                  <span>
                    Credit:{" "}
                    <span className="font-semibold text-slate-800">
                      {currency(ledgerTotals.debit)}
                    </span>
                  </span>
                  <span>
                    Debit:{" "}
                    <span className="font-semibold text-slate-800">
                      {currency(ledgerTotals.credit)}
                    </span>
                  </span>
                  <span>
                    Balance:{" "}
                    <span className="font-semibold text-slate-800">
                      {currency(ledgerTotals.balance)}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {ledgerLoading ? (
              <div className="p-6">
                <DetailSkeleton stats={0} tableRows={4} />
              </div>
            ) : ledger.length === 0 ? (
              <div className="p-10">
                <NoData
                  title="No Ledger Records"
                  description="Add sales, receive payments, or use the legacy balance entry to see customer ledger records here."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-left text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-medium">Date</th>
                      <th className="px-5 py-4 font-medium">Source</th>
                      <th className="px-5 py-4 font-medium">Reference</th>
                      <th className="px-5 py-4 font-medium">Credit</th>
                      <th className="px-5 py-4 font-medium">Debit</th>
                      <th className="px-5 py-4 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b last:border-b-0 hover:bg-slate-50 transition"
                      >
                        <td className="px-5 py-4 text-slate-600">
                          <FormattedTime timestamp={entry.date} />
                        </td>
                        <td className="px-5 py-4 text-slate-700 capitalize">
                          {entry.source?.replace(/_/g, " ") || "-"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {entry.source === "manual"
                            ? entry.notes || "-"
                            : entry.reference || "-"}
                        </td>
                        <td className="px-5 py-4 text-rose-700 font-medium">
                          {entry.type === "debit"
                            ? currency(entry.amount)
                            : "-"}
                        </td>
                        <td className="px-5 py-4 text-emerald-700 font-medium">
                          {entry.type === "credit"
                            ? currency(entry.amount)
                            : "-"}
                        </td>
                        <td className="px-5 py-4 text-slate-700 font-semibold">
                          {currency(entry.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="flex items-start justify-between gap-3 p-5 border-b">
              <div>
                <div className="text-lg font-semibold text-slate-800">
                  Sales Record
                </div>
                <div className="text-sm text-slate-500">
                  Sales saved on the customer record.
                </div>
              </div>
            </div>
            {sales.length === 0 ? (
              <div className="p-10">
                <NoData
                  title="No Sales Found"
                  description="This customer has no sales recorded yet."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-left text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-medium">Date</th>
                      <th className="px-5 py-4 font-medium">Items</th>
                      <th className="px-5 py-4 font-medium">Qty</th>
                      <th className="px-5 py-4 font-medium">Carage</th>
                      <th className="px-5 py-4 font-medium">Total</th>
                      <th className="px-5 py-4 font-medium">Payment</th>
                      <th className="px-5 py-4 font-medium">Sale Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => {
                      const totalQty = (sale.products || []).reduce(
                        (acc, item) => acc + Number(item.quantity || 0),
                        0,
                      );
                      const itemsLabel = (sale.products || [])
                        .map((item) => {
                          const name = item.product?.name || "Product";
                          const company =
                            item.product?.company || item.product?.brand || "";
                          return company ? `${name} • ${company}` : name;
                        })
                        .join(", ");
                      return (
                        <tr
                          key={sale.id}
                          className="border-b last:border-b-0 hover:bg-slate-50 transition"
                        >
                          <td className="px-5 py-4 text-slate-600">
                            <FormattedTime timestamp={sale.createdAt} />
                          </td>
                          <td className="px-5 py-4 text-slate-800 max-w-xs truncate">
                            {itemsLabel || "-"}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {totalQty}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-700">
                            {currency(sale.carage || 0)}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {currency(sale.totalAmount)}
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold capitalize ${getPaymentStatusBadge(sale.paymentStatus)}`}
                            >
                              {sale.paymentStatus || "unpaid"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {sale.status || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mt-4">
            <div className="flex items-start justify-between gap-3 p-5 border-b">
              <div>
                <div className="text-lg font-semibold text-slate-800">
                  Customer Record Entry
                </div>
                <div className="text-sm text-slate-500">
                  Imported legacy balance saved on the customer record.
                </div>
              </div>
              <button
                type="button"
                onClick={openManualEntry}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-600"
              >
                <IoMdAdd className="text-lg" />
                Add Legacy Amount
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-left text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Date</th>
                    <th className="px-5 py-4 font-medium">Type</th>
                    <th className="px-5 py-4 font-medium">Description</th>
                    <th className="px-5 py-4 font-medium">Amount</th>
                    <th className="px-5 py-4 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b last:border-b-0 hover:bg-slate-50 transition">
                    <td className="px-5 py-4 text-slate-600">
                      <FormattedTime
                        timestamp={customer?.updatedAt || customer?.createdAt}
                      />
                    </td>
                    <td className="px-5 py-4 text-slate-700 capitalize">
                      legacy balance
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {customer?.openingBalanceNote || "Previous system amount"}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {currency(customer?.openingBalance)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        {Number(customer?.openingBalance || 0) !== 0 ? (
                          <Popconfirm
                            title={
                              <div className="flex flex-col gap-1 max-w-xs">
                                <span className="font-semibold text-red-600 text-sm">
                                  Confirm Legacy Entry Deletion
                                </span>
                                <span className="text-xs text-gray-600 leading-snug">
                                  This will permanently clear the imported
                                  customer balance from the record.
                                </span>
                              </div>
                            }
                            okText="Yes, Delete"
                            cancelText="Cancel"
                            okButtonProps={{
                              danger: true,
                              className: "font-semibold",
                            }}
                            cancelButtonProps={{
                              className: "font-medium",
                            }}
                            placement="topRight"
                            onConfirm={deleteLegacyAmount}
                          >
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                              title="Delete legacy amount"
                              aria-label="Delete legacy amount"
                            >
                              <MdDelete size={18} />
                              Delete
                            </button>
                          </Popconfirm>
                        ) : (
                          <span className="text-xs text-slate-400">
                            No legacy amount
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <DrawerPanel
        open={isDrawerOpen}
        title="Add Legacy Amount"
        onClose={closeManualEntry}
        isMinimized={isDrawerMinimized}
        onToggleMinimized={() => setIsDrawerMinimized((prev) => !prev)}
        widthClass="w-full sm:w-[420px]"
      >
        <div className="p-6">
          <form onSubmit={submitManualEntry} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-500"
                placeholder="Enter amount"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-500"
                placeholder="Add a note for this manual entry"
                required
              />
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              This amount is stored on the customer record as legacy balance and
              will increase the customer&apos;s remaining balance.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeManualEntry}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-600"
              >
                Save Entry
              </button>
            </div>
          </form>
        </div>
      </DrawerPanel>
    </div>
  );
}

export default CustomerDetailPage;
