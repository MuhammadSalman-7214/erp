import React, { useEffect, useMemo, useState } from "react";
import { IoMdAdd, IoMdSearch } from "react-icons/io";
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
import { Button, Inputfield, SelectDropdown, Tooltip } from "../UI";
import { CgSoftwareDownload } from "react-icons/cg";
import { PiInvoiceBold } from "react-icons/pi";
import { useCompanyBranding } from "../hooks/useCompanyBranding";
import { useSelector } from "react-redux";

function InvoicesPage() {
  const companyBranding = useCompanyBranding();
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
  const { sidebarOpen } = useSelector((state) => state.sidebar);

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
      companyName: companyBranding.companyName,
      slogan: companyBranding.companyDescription,
      logoUrl: companyBranding.companyLogo,
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
      companyName: companyBranding.companyName,
      slogan: companyBranding.companyDescription,
      logoUrl: companyBranding.companyLogo,
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
    companyBranding.companyName,
    companyBranding.companyDescription,
    companyBranding.companyLogo,
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
      companyName: companyBranding.companyName,
      slogan: companyBranding.companyDescription,
      logoUrl: companyBranding.companyLogo,
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
  }, [
    billInvoice,
    receivedAmount,
    remainingAmount,
    isPurchaseInvoice,
    companyBranding.companyName,
    companyBranding.companyDescription,
    companyBranding.companyLogo,
  ]);

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

  const normalizeInvoiceType = (invoice) => {
    const rawType = String(invoice?.invoiceType || "")
      .trim()
      .toLowerCase();
    if (!rawType && invoice?.vendor) return "purchase";
    if (!rawType && (invoice?.customerId || invoice?.customer)) return "sale";
    if (rawType.includes("purchase")) return "purchase";
    if (rawType.includes("sale")) return "sale";
    if (rawType === "buy") return "purchase";
    if (rawType === "sell") return "sale";
    if (invoice?.vendor) return "purchase";
    if (invoice?.customerId || invoice?.customer) return "sale";
    return rawType;
  };

  // ✅ Filter invoices client-side
  const displayInvoices = invoices.filter((inv) => {
    if (typeFilter !== "all" && normalizeInvoiceType(inv) !== typeFilter) {
      return false;
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
    <div className="min-h-[92vh] bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.14),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] p-4">
      <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <IoMdSearch className="text-lg" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Invoice Filters
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Search invoice by invoice, type, party, or status.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <span className="wave-dot">
                <span className="wave ripple-1"></span>
                <span className="wave ripple-2"></span>
              </span>{" "}
              {sortedInvoices.length} records shown
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.6fr)_auto_auto_auto]">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">Search</label>

            <Inputfield
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by invoice, party or status..."
            />
          </div>

          <div className="flex items-end">
            <SelectDropdown
              value={typeFilter}
              onChange={(value) => setTypeFilter(value)}
              className="w-full md:w-56"
              options={[
                { value: "all", label: "All Types" },
                { value: "sale", label: "Sale" },
                { value: "purchase", label: "Purchase" },
              ]}
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => navigate("/createInvoice")}
              variant="primary"
            >
              <IoMdAdd size={18} />
              Create Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <TableSkeleton rows={5} showFilters={false} />
          ) : sortedInvoices.length === 0 ? (
            <div className="p-10 text-center">
              <NoData
                title="No Invoice Found"
                description="Try adjusting filters or add a new invoice to get started."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div
                className={`w-full ${!sidebarOpen ? "max-w-[310px] mobileL:max-w-[330px] tab:max-w-[680px] laptop:max-w-[1424px] laptopL:max-w-[1550px] laptop4k:max-w-full" : "max-w-[220px] mobileL:max-w-[160px] tab:max-w-[480px] laptop:max-w-[1030px] laptopL:max-w-[1230px] laptop4k:max-w-full"}  mx-auto overflow-x-auto relative`}
              >
                <div className="flex gap-2">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                        <th className="px-5 py-4 font-semibold">#</th>
                        <th className="px-5 py-4 font-semibold">Invoice</th>
                        <th className="px-5 py-4 font-semibold">Type</th>
                        <th className="px-5 py-4 font-semibold">Party</th>
                        <th className="px-5 py-4 font-semibold">Amount</th>
                        <th className="px-5 py-4 font-semibold">Status</th>
                        <th className="px-5 py-4 font-semibold">
                          <DateSortHeader
                            label="Due Date"
                            direction={dueDateSort}
                            onToggle={() =>
                              setDueDateSort((prev) =>
                                prev === "asc" ? "desc" : "asc",
                              )
                            }
                          />
                        </th>
                        <th className="px-5 py-4 font-semibold text-center sticky right-0 bg-slate-50 z-20">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {sortedInvoices.map((inv, index) => (
                        <tr
                          key={inv.id}
                          className="border-b last:border-b-0 hover:bg-slate-50 transition"
                        >
                          <td className="px-5 py-4 text-slate-500">
                            {index + 1}
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-800">
                              {inv.invoiceNumber}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-slate-700 capitalize">
                            {normalizeInvoiceType(inv) ||
                              inv.invoiceType ||
                              "-"}
                          </td>

                          <td className="px-5 py-4 text-slate-700">
                            {normalizeInvoiceType(inv) === "purchase"
                              ? inv.vendor?.name || "-"
                              : inv.customerId?.name ||
                                inv.customer?.name ||
                                "-"}
                          </td>

                          <td className="px-5 py-4 font-semibold text-slate-800">
                            Rs {inv.totalAmount.toLocaleString()}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            {(() => {
                              const map = {
                                draft:
                                  "bg-gray-50 text-gray-700 border-gray-200",
                                sent: "bg-blue-50 text-blue-700 border-blue-200",
                                paid: "bg-green-50 text-green-700 border-green-200",
                                overdue:
                                  "bg-red-50 text-red-700 border-red-200",
                                cancelled:
                                  "bg-yellow-50 text-yellow-700 border-yellow-200",
                              };
                              const dot = {
                                draft: "bg-gray-400",
                                sent: "bg-blue-500",
                                paid: "bg-green-400",
                                overdue: "bg-red-400",
                                cancelled: "bg-yellow-500",
                              };
                              return (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border capitalize ${map[inv.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${dot[inv.status] || "bg-slate-400"}`}
                                  />
                                  {inv.status}
                                </span>
                              );
                            })()}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {formatDateLabel(inv.dueDate)}
                          </td>

                          <td
                            className="px-4 py-4 sticky right-0 z-10 bg-gray-50/80 text-center transition-colors duration-150"
                            style={{
                              boxShadow:
                                "inset 8px 0 16px -8px rgba(0,0,0,0.08)",
                            }}
                          >
                            <div className="flex justify-center">
                              <div className="flex items-center justify-center gap-2 overflow-hidden">
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
                                <Tooltip content="Edit Sale">
                                  <Button
                                    type="button"
                                    onClick={() =>
                                      navigate(`/editInvoice/${inv.id}`)
                                    }
                                    variant="info"
                                    size="sm"
                                    className="metal-btn"
                                  >
                                    <MdEdit size={16} />
                                  </Button>
                                </Tooltip>
                                <Tooltip content="Print Invoice">
                                  <Button
                                    type="button"
                                    onClick={() => openInvoicePreview(inv)}
                                    variant="orange"
                                    size="sm"
                                    className="metal-btn"
                                  >
                                    <PiInvoiceBold size={16} />
                                  </Button>
                                </Tooltip>
                                <Tooltip content="Download Invoice">
                                  <Button
                                    type="button"
                                    onClick={() => downloadInvoice(inv)}
                                    variant="violet"
                                    size="sm"
                                    className="metal-btn"
                                  >
                                    <CgSoftwareDownload size={18} />
                                  </Button>
                                </Tooltip>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
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
                      <p className="text-sm text-slate-500">
                        {companyBranding.companyName}
                      </p>
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
