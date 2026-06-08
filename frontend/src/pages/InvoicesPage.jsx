import React, { useEffect, useMemo, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { MdEdit } from "react-icons/md";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import NoData from "../Components/NoData";
import { TableSkeleton } from "../Components/LoadingSkeletons";
import DateSortHeader from "../Components/DateSortHeader";
import {
  formatDateLabel,
  formatDateTimeLabel,
  sortByDateValue,
} from "../lib/dateFormat";
import { formatCurrency } from "../lib/formatNumber";
import {
  buildInvoicePrintHtml,
  combineInvoicePagesHtml,
} from "../lib/invoicePrintTemplate";
import { Button, Inputfield, SelectDropdown } from "../UI";
import { CgSoftwareDownload } from "react-icons/cg";
import { PiInvoiceBold } from "react-icons/pi";

function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dueDateSort, setDueDateSort] = useState("asc");
  const [showBillModal, setShowBillModal] = useState(false);
  const [billInvoice, setBillInvoice] = useState(null);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);

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

  useEffect(() => {
    const fetchInvoicePayments = async () => {
      if (!billInvoice?.id) return;

      try {
        const res = await axiosInstance.get("/payment");
        const payments = res.data.payments || [];
        const matchingPayments = payments.filter(
          (payment) => String(payment.invoice) === String(billInvoice.id),
        );
        const paid = matchingPayments.reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0,
        );
        const total = Number(billInvoice.totalAmount || 0);
        setReceivedAmount(paid);
        setRemainingAmount(Math.max(total - paid, 0));
      } catch (err) {
        console.error(err);
        setReceivedAmount(0);
        setRemainingAmount(Number(billInvoice?.totalAmount || 0));
      }
    };

    fetchInvoicePayments();
  }, [billInvoice]);

  const openInvoicePreview = (invoice) => {
    if (!invoice?.id) return;
    setBillInvoice(invoice);
    setShowBillModal(true);
  };

  const closeInvoicePreview = () => {
    setShowBillModal(false);
    setBillInvoice(null);
    setReceivedAmount(0);
    setRemainingAmount(0);
  };

  const openPrintWindow = (html) => {
    const printWindow = window.open("", "_blank", "width=900,height=650");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups.");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => printWindow.close(), 200);
    };
  };

  const isPurchaseInvoice = billInvoice?.invoiceType === "purchase";
  const showGatePass = !!billInvoice && !isPurchaseInvoice;

  const billPreviewHtml = useMemo(() => {
    if (!billInvoice) return "";

    const items = Array.isArray(billInvoice.items) ? billInvoice.items : [];
    const party = isPurchaseInvoice
      ? billInvoice.vendor
      : billInvoice.customerId || billInvoice.customer;
    const totalAmount = Number(billInvoice.totalAmount || 0);
    const subTotal = Number(
      billInvoice.subTotal ?? totalAmount - Number(billInvoice.carage || 0),
    );
    const carageAmount = Number(billInvoice.carage || 0);

    const invoiceHtml = buildInvoicePrintHtml({
      documentTitle: isPurchaseInvoice ? "Purchase Invoice" : "Sales Invoice",
      companyName: "Imran Traders",
      slogan: "",
      invoiceLabel: "Invoice #",
      invoiceNumber: billInvoice.invoiceNumber || billInvoice.id || "-",
      issueLabel: "Date",
      issueDate:
        billInvoice.issueDate ||
        billInvoice.createdAt ||
        new Date().toISOString(),
      dueLabel: "Due Date",
      dueDate: billInvoice.dueDate,
      partyLabel: "Invoice To",
      partyName: party?.name || (isPurchaseInvoice ? "Vendor" : "Customer"),
      partyPhone:
        party?.contactInfo?.phone ||
        party?.phone ||
        billInvoice.customer?.phone ||
        "",
      partyAddress:
        party?.contactInfo?.address ||
        party?.address ||
        billInvoice.customer?.address ||
        "",
      paymentMethod: billInvoice.paymentMethod || "-",
      status: billInvoice.status || "-",
      items: items.map((item) => {
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || item.price || 0);
        return {
          name: item.name || item.product?.name || "Product",
          description: "",
          company: "",
          code: item.code || item.productCode?.code || "",
          quantity: qty,
          unitPrice,
          total: Number(item.total || qty * unitPrice || 0),
        };
      }),
      currency: billInvoice.currency || "Rs",
      subTotal,
      carage: carageAmount,
      totalAmount,
      receivedAmount,
      remainingAmount,
      notes: billInvoice.notes || "",
    });

    const gatePassHtml = buildInvoicePrintHtml({
      documentTitle: "Gate Pass",
      companyName: "Imran Traders",
      slogan: "",
      invoiceLabel: "Gate Pass #",
      invoiceNumber: billInvoice.invoiceNumber || billInvoice.id || "-",
      issueLabel: "Date",
      issueDate:
        billInvoice.issueDate ||
        billInvoice.createdAt ||
        new Date().toISOString(),
      partyLabel: "Gate Pass",
      partyName: party?.name || (isPurchaseInvoice ? "Vendor" : "Customer"),
      partyPhone:
        party?.contactInfo?.phone ||
        party?.phone ||
        billInvoice.customer?.phone ||
        "",
      partyAddress:
        party?.contactInfo?.address ||
        party?.address ||
        billInvoice.customer?.address ||
        "",
      paymentMethod: billInvoice.paymentMethod || "-",
      status: billInvoice.status || "-",
      items: items.map((item) => ({
        name: item.name || item.product?.name || "Product",
        quantity: Number(item.quantity || 0),
        code: item.code || item.productCode?.code || "",
      })),
      showPrices: false,
      currency: billInvoice.currency || "Rs",
      subTotal,
      carage: carageAmount,
      totalAmount,
      receivedAmount,
      remainingAmount,
      notes: billInvoice.notes || "",
    });

    return showGatePass
      ? combineInvoicePagesHtml(invoiceHtml, gatePassHtml)
      : invoiceHtml;
  }, [
    billInvoice,
    receivedAmount,
    remainingAmount,
    isPurchaseInvoice,
    showGatePass,
  ]);

  const gatePassPreviewHtml = useMemo(() => {
    if (!billInvoice || isPurchaseInvoice) return "";

    const items = Array.isArray(billInvoice.items) ? billInvoice.items : [];
    const party = billInvoice.customerId || billInvoice.customer;
    const totalAmount = Number(billInvoice.totalAmount || 0);
    const subTotal = Number(
      billInvoice.subTotal ?? totalAmount - Number(billInvoice.carage || 0),
    );
    const carageAmount = Number(billInvoice.carage || 0);

    return buildInvoicePrintHtml({
      documentTitle: "Gate Pass",
      companyName: "Imran Traders",
      slogan: "",
      invoiceLabel: "Gate Pass #",
      invoiceNumber: billInvoice.invoiceNumber || billInvoice.id || "-",
      issueLabel: "Date",
      issueDate:
        billInvoice.issueDate ||
        billInvoice.createdAt ||
        new Date().toISOString(),
      partyLabel: "Gate Pass",
      partyName: party?.name || "Customer",
      partyPhone:
        party?.contactInfo?.phone ||
        party?.phone ||
        billInvoice.customer?.phone ||
        "",
      partyAddress:
        party?.contactInfo?.address ||
        party?.address ||
        billInvoice.customer?.address ||
        "",
      paymentMethod: billInvoice.paymentMethod || "-",
      status: billInvoice.status || "-",
      items: items.map((item) => ({
        name: item.name || item.product?.name || "Product",
        quantity: Number(item.quantity || 0),
        code: item.code || item.productCode?.code || "",
      })),
      showPrices: false,
      currency: billInvoice.currency || "Rs",
      subTotal,
      carage: carageAmount,
      totalAmount,
      receivedAmount,
      remainingAmount,
      notes: billInvoice.notes || "",
    });
  }, [billInvoice, receivedAmount, remainingAmount, isPurchaseInvoice]);

  const handlePrintBillOnly = () => {
    if (!billPreviewHtml) return;
    openPrintWindow(billPreviewHtml);
  };

  const handlePrintGatePassOnly = () => {
    if (!gatePassPreviewHtml) return;
    openPrintWindow(gatePassPreviewHtml);
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

      {showBillModal && billInvoice && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={closeInvoicePreview}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b bg-slate-50 px-6 py-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {isPurchaseInvoice
                      ? "Purchase Invoice Preview"
                      : "Sales Invoice Preview"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review the invoice before printing
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    className="border border-slate-300 bg-white shadow-sm"
                    onClick={closeInvoicePreview}
                  >
                    Close
                  </Button>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-[72px] top-[57px] z-20 bg-slate-100 p-4">
                <div className="mx-auto h-full w-full max-w-[900px] overflow-hidden rounded-xl border bg-white shadow-sm">
                  <iframe
                    title="Invoice Bill Preview"
                    srcDoc={billPreviewHtml}
                    className="h-full w-full border-0"
                  />
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-col gap-4 border-b pb-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-teal-700">
                        {isPurchaseInvoice
                          ? "Purchase Invoice"
                          : "Sales Invoice"}
                      </h2>
                      <p className="text-sm text-slate-500">Imran Traders</p>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <div>
                        <span className="font-semibold">Date:</span>{" "}
                        {formatDateTimeLabel(
                          billInvoice.createdAt ||
                            billInvoice.issueDate ||
                            new Date(),
                        )}
                      </div>
                      <div>
                        <span className="font-semibold">Due Date:</span>{" "}
                        {formatDateLabel(billInvoice.dueDate)}
                      </div>
                      <div>
                        <span className="font-semibold">Status:</span>{" "}
                        {billInvoice.status || "-"}
                      </div>
                      <div>
                        <span className="font-semibold">Payment:</span>{" "}
                        {billInvoice.paymentMethod || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
                        {isPurchaseInvoice ? "Vendor" : "Customer"}
                      </h4>
                      <p className="text-sm font-semibold text-slate-800">
                        {isPurchaseInvoice
                          ? billInvoice.vendor?.name || "Vendor"
                          : billInvoice.customerId?.name ||
                            billInvoice.customer?.name ||
                            "Customer"}
                      </p>
                      <p className="text-sm text-slate-600">
                        Phone:{" "}
                        {isPurchaseInvoice
                          ? billInvoice.vendor?.contactInfo?.phone ||
                            billInvoice.vendor?.phone ||
                            "-"
                          : billInvoice.customerId?.contactInfo?.phone ||
                            billInvoice.customerId?.phone ||
                            billInvoice.customer?.phone ||
                            "-"}
                      </p>
                      <p className="text-sm text-slate-600">
                        Address:{" "}
                        {isPurchaseInvoice
                          ? billInvoice.vendor?.contactInfo?.address ||
                            billInvoice.vendor?.address ||
                            "-"
                          : billInvoice.customerId?.contactInfo?.address ||
                            billInvoice.customerId?.address ||
                            billInvoice.customer?.address ||
                            "-"}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-slate-50 p-4">
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
                        Invoice Info
                      </h4>
                      <p className="text-sm text-slate-600">
                        Subtotal:{" "}
                        {formatCurrency(
                          Number(
                            billInvoice.subTotal ??
                              Math.max(
                                Number(billInvoice.totalAmount || 0) -
                                  Number(billInvoice.carage || 0),
                                0,
                              ),
                          ),
                          billInvoice.currency || "Rs",
                        )}
                      </p>
                      <p className="text-sm text-slate-600">
                        Carage:{" "}
                        {formatCurrency(
                          billInvoice.carage || 0,
                          billInvoice.currency || "Rs",
                        )}
                      </p>
                      <p className="text-sm text-slate-600">
                        Received Amount:{" "}
                        {formatCurrency(
                          receivedAmount || 0,
                          billInvoice.currency || "Rs",
                        )}
                      </p>
                      <p className="text-sm text-slate-600">
                        Remaining Amount:{" "}
                        {formatCurrency(
                          remainingAmount || 0,
                          billInvoice.currency || "Rs",
                        )}
                      </p>
                      <p className="text-sm text-slate-600">
                        Items: {(billInvoice.items || []).length}
                      </p>
                      <p className="text-sm text-slate-600">
                        Total Qty:{" "}
                        {(billInvoice.items || []).reduce(
                          (sum, item) => sum + Number(item.quantity || 0),
                          0,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-[15px]">
                      <thead className="bg-teal-700 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">Product</th>
                          <th className="px-4 py-3 text-left">Code</th>
                          <th className="px-4 py-3 text-right">Qty</th>
                          <th className="px-4 py-3 text-right">Unit</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(billInvoice.items || []).map((item, idx) => {
                          const qty = Number(item.quantity || 0);
                          const unitPrice = Number(
                            item.unitPrice || item.price || 0,
                          );
                          const total = Number(
                            item.total || qty * unitPrice || 0,
                          );
                          return (
                            <tr
                              key={`${item.name || item.product?.name || "item"}-${idx}`}
                              className="border-b last:border-b-0"
                            >
                              <td className="px-4 py-3 text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3 text-slate-800">
                                {item.name || item.product?.name || "Product"}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {item.code || item.productCode?.code || "-"}
                              </td>
                              <td className="px-4 py-3 text-right">{qty}</td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(
                                  unitPrice,
                                  billInvoice.currency || "Rs",
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(
                                  total,
                                  billInvoice.currency || "Rs",
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <div className="w-64 space-y-2 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>
                          {formatCurrency(
                            Number(
                              billInvoice.subTotal ??
                                Math.max(
                                  Number(billInvoice.totalAmount || 0) -
                                    Number(billInvoice.carage || 0),
                                  0,
                                ),
                            ),
                            billInvoice.currency || "Rs",
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Received</span>
                        <span>
                          {formatCurrency(
                            receivedAmount || 0,
                            billInvoice.currency || "Rs",
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining</span>
                        <span>
                          {formatCurrency(
                            remainingAmount || 0,
                            billInvoice.currency || "Rs",
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2 text-base font-semibold text-slate-800">
                        <span>Total</span>
                        <span>
                          {formatCurrency(
                            billInvoice.totalAmount || 0,
                            billInvoice.currency || "Rs",
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  onClick={handlePrintBillOnly}
                  variant="primary"
                >
                  Print Bill
                </Button>
                {showGatePass && (
                  <Button
                    type="button"
                    onClick={handlePrintGatePassOnly}
                    variant="primary"
                  >
                    Print Gate Pass
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default InvoicesPage;
