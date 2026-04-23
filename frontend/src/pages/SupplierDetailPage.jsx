import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { IoMdAdd } from "react-icons/io";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import axiosInstance from "../lib/axios";
import FormattedTime from "../lib/FormattedTime";
import DateSortHeader from "../Components/DateSortHeader";
import { formatDateLabel, sortByDateValue } from "../lib/dateFormat";
import NoData from "../Components/NoData";
import { TrendingUp, CreditCard, AlertCircle, Clipboard } from "lucide-react";
import { DetailSkeleton } from "../Components/LoadingSkeletons";
import DrawerPanel from "../Components/DrawerPanel";
import { uppercasePayload } from "../lib/uppercasePayload";
import toast from "react-hot-toast";
import {
  validateNumberInput,
  validateTextInput,
} from "../lib/formValidation";

const sanitizeFileName = (value) =>
  String(value || "vendor_ledger")
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "vendor_ledger";

function SupplierDetailPage() {
  const { id } = useParams();

  const [vendor, setVendor] = useState(null);
  const [orders, setOrders] = useState([]);
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
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerDateSort, setLedgerDateSort] = useState("asc");
  const [ordersDateSort, setOrdersDateSort] = useState("asc");

  useEffect(() => {
    const fetchVendorOrders = async () => {
      try {
        const response = await axiosInstance.get(`/order/vendor/${id}`);
        const payload = response.data || {};
        setVendor(payload.vendor || null);
        setOrders(payload.orders || []);
        setSummary(
          payload.summary || { total: 0, paid: 0, remaining: 0, count: 0 },
        );
      } catch (error) {
        console.error("Failed to load vendor history:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchVendorLedger = async () => {
      try {
        const response = await axiosInstance.get(
          `/payment/vendor-ledger/${id}`,
        );
        const payload = response.data || {};
        setLedger(payload.ledger || []);
        setLedgerTotals(payload.totals || { debit: 0, credit: 0, balance: 0 });
        if (payload.vendor) {
          setVendor((prev) => prev || payload.vendor);
        }
      } catch (error) {
        console.error("Failed to load vendor ledger:", error);
      } finally {
        setLedgerLoading(false);
      }
    };

    const loadVendorData = async () => {
      setLoading(true);
      setLedgerLoading(true);
      await Promise.all([fetchVendorOrders(), fetchVendorLedger()]);
    };

    loadVendorData();
  }, [id]);

  const refreshVendorData = async () => {
    try {
      setLoading(true);
      setLedgerLoading(true);
      const [ordersRes, ledgerRes] = await Promise.all([
        axiosInstance.get(`/order/vendor/${id}`),
        axiosInstance.get(`/payment/vendor-ledger/${id}`),
      ]);

      const ordersPayload = ordersRes.data || {};
      const ledgerPayload = ledgerRes.data || {};
      setVendor(ordersPayload.vendor || ledgerPayload.vendor || null);
      setOrders(ordersPayload.orders || []);
      setSummary(
        ordersPayload.summary || { total: 0, paid: 0, remaining: 0, count: 0 },
      );
      setLedger(ledgerPayload.ledger || []);
      setLedgerTotals(
        ledgerPayload.totals || { debit: 0, credit: 0, balance: 0 },
      );
    } catch (error) {
      console.error("Failed to refresh vendor data:", error);
    } finally {
      setLoading(false);
      setLedgerLoading(false);
    }
  };

  const sortedLedger = useMemo(
    () => sortByDateValue(ledger || [], (entry) => entry.date, ledgerDateSort),
    [ledger, ledgerDateSort],
  );

  const sortedOrders = useMemo(
    () =>
      sortByDateValue(orders || [], (order) => order.createdAt, ordersDateSort),
    [orders, ordersDateSort],
  );

  const openManualEntry = () => {
    setManualAmount("");
    setManualDescription("");
    setErrors({});
    setIsDrawerMinimized(false);
    setIsDrawerOpen(true);
  };

  const closeManualEntry = () => {
    setIsDrawerOpen(false);
    setIsDrawerMinimized(false);
    setManualAmount("");
    setManualDescription("");
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

  const submitManualEntry = async (event) => {
    event.preventDefault();

    const amountCheck = validateField("manualAmount", manualAmount, (value) =>
      validateNumberInput(value, "Amount", {
        min: 0.01,
        allowZero: false,
      }),
    );
    if (!amountCheck.ok) {
      toast.error(amountCheck.message);
      return;
    }

    const descriptionCheck = validateField(
      "manualDescription",
      manualDescription,
      (value) =>
        validateTextInput(value, "Description", {
          required: true,
          minLength: 2,
          maxLength: 240,
        }),
    );
    if (!descriptionCheck.ok) {
      toast.error(descriptionCheck.message);
      return;
    }

    try {
      await axiosInstance.post("/payment", {
        type: "debit",
        amount: amountCheck.value,
        method: "manual",
        partyType: "vendor",
        vendor: id,
        notes: uppercasePayload(descriptionCheck.value),
        paidAt: new Date(),
      });
      closeManualEntry();
      await refreshVendorData();
    } catch (error) {
      console.error("Failed to create manual ledger entry:", error);
    }
  };

  const downloadLedgerPdf = () => {
    if (!vendor) return;

    const fileName = `${sanitizeFileName(vendor.name || "vendor")}_ledger.pdf`;
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
    pdf.text("Vendor Ledger", marginX, y);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(vendor.name || "Vendor", marginX, y + 7);
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    pdf.text("Debit shows what you owe the vendor, credit shows payments.", marginX, y + 13);

    y += 20;
    pdf.setDrawColor(203, 213, 225);
    pdf.line(marginX, y, pageWidth - marginX, y);
    y += 8;

    autoTable(pdf, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Date", "Source", "Reference", "Debit", "Credit", "Balance"]],
      body: (ledger || []).map((entry) => [
        formatDateLabel(entry.date),
        String(entry.source?.replace(/_/g, " ") || "-"),
        String(entry.source === "manual" ? entry.notes || "-" : entry.reference || "-"),
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
    pdf.text(`Total Debit: ${currency(ledgerTotals.debit)}`, marginX, finalY + 10);
    pdf.text(`Total Credit: ${currency(ledgerTotals.credit)}`, marginX, finalY + 16);
    pdf.text(`Balance: ${currency(ledgerTotals.balance)}`, marginX, finalY + 22);

    pdf.save(fileName);
  };

  const currency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Vendor Details
          </h1>
          <p className="text-sm text-slate-500">
            Purchase history and balances for this vendor
          </p>
        </div>
      </div>

      {loading ? (
        <DetailSkeleton />
      ) : (
        <>
          <div className="bg-white rounded-2xl border p-5 shadow-sm mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-500">Vendor</div>
                <div className="text-xl font-semibold text-slate-800">
                  {vendor?.name || "Unknown"}
                </div>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <div>Phone: {vendor?.contactInfo?.phone || "-"}</div>
                <div>Address: {vendor?.contactInfo?.address || "-"}</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              {
                label: "Total Purchases",
                value: currency(summary.total),
                bg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
                icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
                borderColor: "border-emerald-200",
              },
              {
                label: "Paid",
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-5 border-b">
              <div>
                <div className="text-lg font-semibold text-slate-800">
                  Vendor Ledger
                </div>
                <div className="text-sm text-slate-500">
                  Debit shows what you owe the vendor, credit shows payments.
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={downloadLedgerPdf}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
                  >
                    Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={openManualEntry}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-600"
                  >
                    <IoMdAdd className="text-lg" />
                    Add Manual Entry
                  </button>
                </div>
                <div className="text-sm text-slate-600 space-x-3">
                  <span>
                    Debit:{" "}
                    <span className="font-semibold text-slate-800">
                      {currency(ledgerTotals.debit)}
                    </span>
                  </span>
                  <span>
                    Credit:{" "}
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
                  description="Add purchase invoices, vendor payments, or manual debit entries to see records here."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-left text-slate-500">
                  <tr>
                      <DateSortHeader
                        label="Date"
                        direction={ledgerDateSort}
                        onToggle={() =>
                          setLedgerDateSort((prev) =>
                            prev === "asc" ? "desc" : "asc",
                          )
                        }
                      />
                      <th className="px-5 py-4 font-medium">Source</th>
                      <th className="px-5 py-4 font-medium">Reference</th>
                      <th className="px-5 py-4 font-medium">Debit</th>
                      <th className="px-5 py-4 font-medium">Credit</th>
                      <th className="px-5 py-4 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLedger.map((entry) => (
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
            {orders.length === 0 ? (
              <div className="p-10">
                <NoData
                  title="No Orders Found"
                  description="This vendor has no purchase orders recorded yet."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="text-lg font-semibold text-slate-800 mt-3  px-4">
                  Vendor Orders
                </div>
                <div className="text-sm text-slate-500 px-4 mb-2">
                  Order shows what you owe the vendor.
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-left text-slate-500">
                    <tr>
                      <DateSortHeader
                        label="Date"
                        direction={ordersDateSort}
                        onToggle={() =>
                          setOrdersDateSort((prev) =>
                            prev === "asc" ? "desc" : "asc",
                          )
                        }
                      />
                      <th className="px-5 py-4 font-medium">Items</th>
                      <th className="px-5 py-4 font-medium">Qty</th>
                      <th className="px-5 py-4 font-medium">Total</th>
                      <th className="px-5 py-4 font-medium">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedOrders.map((order) => {
                      const products = order.products?.length
                        ? order.products.map((p) => p.name).join(", ")
                        : "No items";

                      const totalQty = order.products?.reduce(
                        (acc, item) => acc + item.quantity,
                        0,
                      );

                      return (
                        <tr
                          key={order.id}
                          className="border-b hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            {formatDateLabel(order.createdAt)}
                          </td>

                          <td className="px-5 py-4">{products}</td>

                          <td className="px-5 py-4">{totalQty || 0}</td>

                          <td className="px-5 py-4">Rs {order.totalAmount}</td>

                          <td className="px-5 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                order.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : order.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <DrawerPanel
        open={isDrawerOpen}
        title="Add Manual Entry"
        onClose={closeManualEntry}
        isMinimized={isDrawerMinimized}
        onToggleMinimized={() => setIsDrawerMinimized((prev) => !prev)}
        widthClass="w-full sm:w-[420px]"
      >
        <div className="p-6">
          <form onSubmit={submitManualEntry} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Debit Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={manualAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  setManualAmount(value);
                  validateField("manualAmount", value, (current) =>
                    validateNumberInput(current, "Amount", {
                      min: 0.01,
                      allowZero: false,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("manualAmount", e.target.value, (current) =>
                    validateNumberInput(current, "Amount", {
                      min: 0.01,
                      allowZero: false,
                    }),
                  )
                }
                className="mt-2 w-full h-11 rounded-xl border px-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                placeholder="Enter amount"
                required
                inputMode="decimal"
              />
              {errors.manualAmount && (
                <p className="mt-1 text-sm text-red-500">{errors.manualAmount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                value={manualDescription}
                onChange={(e) => {
                  const value = e.target.value;
                  setManualDescription(value);
                  validateField("manualDescription", value, (current) =>
                    validateTextInput(current, "Description", {
                      required: true,
                      minLength: 2,
                      maxLength: 240,
                    }),
                  );
                }}
                onBlur={(e) =>
                  validateField("manualDescription", e.target.value, (current) =>
                    validateTextInput(current, "Description", {
                      required: true,
                      minLength: 2,
                      maxLength: 240,
                    }),
                  )
                }
                className="mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                rows={4}
                placeholder="Enter description"
                required
                maxLength={240}
              />
              {errors.manualDescription && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.manualDescription}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-teal-700 font-medium text-white transition hover:bg-teal-600"
            >
              Save Manual Debit
            </button>
          </form>
        </div>
      </DrawerPanel>
    </div>
  );
}

export default SupplierDetailPage;
