import React, { useEffect, useMemo, useState } from "react";
import { IoMdAdd } from "react-icons/io";
import { MdEdit } from "react-icons/md";
import { PiInvoiceBold } from "react-icons/pi";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import NoData from "../Components/NoData";
import { TableSkeleton } from "../Components/LoadingSkeletons";
import DateSortHeader from "../Components/DateSortHeader";
import { formatDateLabel, sortByDateValue } from "../lib/dateFormat";
import { Button, Inputfield, SelectDropdown } from "../UI";
import { CgSoftwareDownload } from "react-icons/cg";
import {
  buildInvoicePrintHtml,
  combineInvoicePagesHtml,
} from "../lib/invoicePrintTemplate";

const sanitizeFileName = (value) =>
  String(value || "invoice")
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "invoice";

const splitLongText = (doc, text, width) =>
  doc.splitTextToSize(String(text || "-"), width);

const loadLogoDataUrl = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) return "";

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width || 120;
      canvas.height = image.naturalHeight || image.height || 120;
      const context = canvas.getContext("2d");
      if (!context) return "";
      context.drawImage(image, 0, 0);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (error) {
    console.error("Failed to load logo", error);
    return "";
  }
};

const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;

const getInvoiceTotals = (invoice) => {
  const totalAmount = Number(invoice?.totalAmount || 0);
  const carageAmount = Number(invoice?.carage || 0);
  const subTotal = Math.max(totalAmount - carageAmount, 0);
  const receivedAmountValue = Number.isFinite(Number(invoice?.paidAmount))
    ? Number(invoice?.paidAmount || 0)
    : Math.max(totalAmount - Number(invoice?.remainingAmount || 0), 0);
  const remainingAmountValue = Math.max(totalAmount - receivedAmountValue, 0);

  return {
    totalAmount,
    carageAmount,
    subTotal,
    receivedAmountValue,
    remainingAmountValue,
  };
};

const buildInvoicePdfData = (invoice) => {
  if (!invoice) return null;

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const {
    totalAmount,
    carageAmount,
    subTotal,
    receivedAmountValue,
    remainingAmountValue,
  } = getInvoiceTotals(invoice);
  const isPurchaseInvoice = String(invoice.invoiceType || "").toLowerCase() === "purchase";
  const party = isPurchaseInvoice
    ? invoice.vendor || {}
    : invoice.customerId || invoice.customer || {};

  return {
    invoiceNumber: invoice.invoiceNumber || invoice.id || "-",
    issueDate: invoice.issueDate || new Date().toISOString(),
    dueDate: invoice.dueDate || "",
    partyName: party?.name || (isPurchaseInvoice ? "Vendor" : "Customer"),
    partyPhone: party?.contactInfo?.phone || party?.phone || "-",
    partyAddress: party?.contactInfo?.address || party?.address || "-",
    paymentMethod: invoice.paymentMethod || "-",
    status: invoice.status || "-",
    invoiceType: isPurchaseInvoice ? "purchase" : "sales",
    items: items.map((item) => ({
      name: item.name || item.product?.name || "Product",
      code: item.code || item.productCode?.code || "-",
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || item.price || 0),
      total: Number(item.total || item.quantity * (item.unitPrice || item.price || 0) || 0),
    })),
    subTotal,
    carageAmount,
    totalAmount,
    receivedAmountValue,
    remainingAmountValue,
    notes: String(invoice.notes || "").trim(),
  };
};

function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
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

  const closeInvoicePreview = () => {
    setPreviewInvoice(null);
    setPreviewLoading(false);
  };

  const openInvoicePreview = async (invoice) => {
    if (!invoice?.id) return;

    setPreviewInvoice(null);
    setPreviewLoading(true);
    try {
      const res = await axiosInstance.get(`/invoice/${invoice.id}`);
      const invoiceData = res.data.data;
      if (!invoiceData) {
        toast.error("Invoice not found");
        return;
      }

      try {
        const paymentsRes = await axiosInstance.get("/payment");
        const payments = paymentsRes.data.payments || [];
        const matchingPayments = payments.filter(
          (payment) => String(payment.invoice) === String(invoiceData.id),
        );
        const paid = matchingPayments.reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0,
        );
        const total = Number(invoiceData.totalAmount || 0);
        invoiceData.paidAmount = paid;
        invoiceData.remainingAmount = Math.max(total - paid, 0);
      } catch (paymentError) {
        console.error(paymentError);
        invoiceData.paidAmount = Number(invoiceData.paidAmount || 0);
        invoiceData.remainingAmount = Number(invoiceData.totalAmount || 0);
      }

      setPreviewInvoice(invoiceData);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch invoice");
    } finally {
      setPreviewLoading(false);
    }
  };

  const previewInvoiceData = useMemo(
    () => buildInvoicePdfData(previewInvoice),
    [previewInvoice],
  );

  const previewHtml = useMemo(() => {
    if (!previewInvoiceData) return "";

    const commonOptions = {
      companyName: "Imran Traders",
      slogan: "Billing and stock management",
      logoUrl: `${window.location.origin}/ITLOGO.svg`,
      invoiceLabel: "Invoice #",
      invoiceNumber: previewInvoiceData.invoiceNumber,
      issueLabel: "Date",
      issueDate: previewInvoiceData.issueDate,
      dueLabel: "Due Date",
      dueDate: previewInvoice?.dueDate || "",
      partyLabel:
        previewInvoiceData.invoiceType === "purchase"
          ? "Vendor"
          : "Invoice To",
      partyName: previewInvoiceData.partyName,
      partyPhone: previewInvoiceData.partyPhone,
      partyAddress: previewInvoiceData.partyAddress,
      paymentMethod: previewInvoiceData.paymentMethod,
      status: previewInvoiceData.status,
      items: previewInvoiceData.items,
      currency: "Rs",
      subTotal: previewInvoiceData.subTotal,
      carage: previewInvoiceData.carageAmount,
      totalAmount: previewInvoiceData.totalAmount,
      receivedAmount: previewInvoiceData.receivedAmountValue,
      remainingAmount: previewInvoiceData.remainingAmountValue,
      notes: previewInvoiceData.notes,
    };

    const invoiceHtml = buildInvoicePrintHtml(commonOptions);
    if (previewInvoiceData.invoiceType !== "purchase") {
      const gatePassHtml = buildInvoicePrintHtml({
        ...commonOptions,
        documentTitle: "Gate Pass",
        invoiceLabel: "Gate Pass #",
        partyLabel: "Gate Pass",
        showPrices: false,
        showSummaryBox: false,
        items: previewInvoiceData.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          code: item.code,
        })),
      });
      return combineInvoicePagesHtml(invoiceHtml, gatePassHtml);
    }

    return invoiceHtml;
  }, [previewInvoice, previewInvoiceData]);

  const previewGatePassHtml = useMemo(() => {
    if (!previewInvoiceData || previewInvoiceData.invoiceType === "purchase") {
      return "";
    }

    const gatePassOptions = {
      companyName: "Imran Traders",
      slogan: "Billing and stock management",
      logoUrl: `${window.location.origin}/ITLOGO.svg`,
      documentTitle: "Gate Pass",
      invoiceLabel: "Gate Pass #",
      invoiceNumber: previewInvoiceData.invoiceNumber,
      issueLabel: "Date",
      issueDate: previewInvoiceData.issueDate,
      partyLabel: "Gate Pass",
      partyName: previewInvoiceData.partyName,
      partyPhone: previewInvoiceData.partyPhone,
      partyAddress: previewInvoiceData.partyAddress,
      paymentMethod: previewInvoiceData.paymentMethod,
      status: previewInvoiceData.status,
      items: previewInvoiceData.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        code: item.code,
      })),
      showPrices: false,
      showSummaryBox: false,
      currency: "Rs",
      subTotal: previewInvoiceData.subTotal,
      carage: previewInvoiceData.carageAmount,
      totalAmount: previewInvoiceData.totalAmount,
      receivedAmount: previewInvoiceData.receivedAmountValue,
      remainingAmount: previewInvoiceData.remainingAmountValue,
      notes: previewInvoiceData.notes,
    };

    return buildInvoicePrintHtml(gatePassOptions);
  }, [previewInvoiceData]);

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

  const handlePrintBill = () => {
    if (!previewHtml) return;
    openPrintWindow(previewHtml);
  };

  const handlePrintGatePass = () => {
    if (!previewGatePassHtml) return;
    openPrintWindow(previewGatePassHtml);
  };

  const downloadInvoice = async (invoice) => {
    if (!invoice?.id) return;

    try {
      const res = await axiosInstance.get(`/invoice/${invoice.id}`);
      const data = buildInvoicePdfData(res.data.data);
      if (!data) {
        toast.error("Invoice not found");
        return;
      }

      const fileName = `${sanitizeFileName(
        data.invoiceNumber || data.id || "invoice",
      )}.pdf`;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
      });

      pdf.setProperties({ title: fileName });
      const marginX = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - marginX * 2;
      let y = 12;
      const logoDataUrl = await loadLogoDataUrl(
        `${window.location.origin}/ITLOGO.svg`,
      );

      const addWrappedText = (
        text,
        x,
        currentY,
        width = contentWidth,
        lineHeight = 4.5,
        fontSize = 9,
        style = "normal",
      ) => {
        pdf.setFont("helvetica", style);
        pdf.setFontSize(fontSize);
        const lines = splitLongText(pdf, text, width);
        pdf.text(lines, x, currentY);
        return currentY + lines.length * lineHeight;
      };

      const addLine = (currentY) => {
        pdf.setDrawColor(203, 213, 225);
        pdf.line(marginX, currentY, pageWidth - marginX, currentY);
      };

      const headerTop = 11;
      if (logoDataUrl) {
        pdf.addImage(logoDataUrl, "PNG", marginX, headerTop, 16, 16);
      }

      const headerTextX = logoDataUrl ? marginX + 20 : marginX;
      pdf.setTextColor(15, 23, 42);
      y = addWrappedText(
        "Imran Traders",
        headerTextX,
        headerTop + 4,
        contentWidth - (logoDataUrl ? 20 : 0),
        5,
        16,
        "bold",
      );
      y = addWrappedText(
        "Billing and stock management",
        headerTextX,
        y + 1,
        contentWidth - (logoDataUrl ? 20 : 0),
        4,
        9,
      );

      const title =
        data.invoiceType === "purchase" ? "Purchase Invoice" : "Sales Invoice";
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text(title, pageWidth - marginX, 14, { align: "right" });
      y = Math.max(y + 4, 24);
      addLine(y);
      y += 7;

      const detailsLeft = [
        [data.invoiceType === "purchase" ? "Vendor" : "Customer", data.partyName],
        ["Phone", data.partyPhone],
        ["Address", data.partyAddress],
        ["Payment", data.paymentMethod],
      ];

      pdf.setFontSize(9);
      let detailsY = y;
      detailsLeft.forEach(([label, value]) => {
        pdf.setFont("helvetica", "bold");
        pdf.text(`${label}:`, marginX, detailsY);
        pdf.setFont("helvetica", "normal");
        const wrapped = splitLongText(pdf, value, 65);
        pdf.text(wrapped, marginX + 18, detailsY);
        detailsY += Math.max(wrapped.length * 4.2, 4.2);
      });

      const detailsRight = [
        ["Invoice #", data.invoiceNumber],
        ["Date", formatDateLabel(data.issueDate)],
      ];

      let detailsRightY = y;
      detailsRight.forEach(([label, value]) => {
        pdf.setFont("helvetica", "bold");
        pdf.text(`${label}:`, pageWidth / 2 + 4, detailsRightY);
        pdf.setFont("helvetica", "normal");
        const wrapped = splitLongText(pdf, value, 40);
        pdf.text(wrapped, pageWidth / 2 + 22, detailsRightY);
        detailsRightY += Math.max(wrapped.length * 4.2, 4.2);
      });

      y = Math.max(detailsY, detailsRightY) + 5;
      addLine(y);
      y += 6;

      autoTable(pdf, {
        startY: y,
        margin: { left: marginX, right: marginX },
        head: [["No", "Item Description", "Qty", "Price", "Total"]],
        body: data.items.length
          ? data.items.map((item, index) => [
              String(index + 1),
              item.code && item.code !== "-"
                ? `${item.code} - ${item.name}`
                : item.name,
              String(item.quantity),
              formatCurrency(item.unitPrice),
              formatCurrency(item.total),
            ])
          : [["-", "No items", "-", "-", "-"]],
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 1.5,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [15, 118, 110],
          textColor: 255,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          2: { cellWidth: 12, halign: "center" },
          3: { cellWidth: 20, halign: "right" },
          4: { cellWidth: 22, halign: "right" },
        },
        theme: "grid",
      });

      const tableEndY = pdf.lastAutoTable?.finalY || y;
      let summaryY = tableEndY + 6;
      if (summaryY > pageHeight - 35) {
        pdf.addPage();
        summaryY = 14;
      }

      const summaryX = pageWidth - marginX - 42;
      const summary = [
        ["Sub Total", formatCurrency(data.subTotal)],
        ["Carage", formatCurrency(data.carageAmount)],
        ["Received", formatCurrency(data.receivedAmountValue)],
        ["Remaining", formatCurrency(data.remainingAmountValue)],
      ];

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      summary.forEach(([label, value]) => {
        pdf.text(label, summaryX, summaryY);
        pdf.text(value, pageWidth - marginX, summaryY, { align: "right" });
        summaryY += 4.8;
      });

      pdf.setFillColor(15, 118, 110);
      pdf.rect(summaryX - 2, summaryY - 1.2, 44, 6, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text("Total Bill", summaryX, summaryY + 2.6);
      pdf.text(formatCurrency(data.totalAmount), pageWidth - marginX, summaryY + 2.6, {
        align: "right",
      });

      if (data.notes) {
        const notesY = summaryY + 10;
        if (notesY > pageHeight - 15) {
          pdf.addPage();
          y = 14;
        } else {
          y = notesY;
        }
        pdf.setTextColor(15, 23, 42);
        pdf.setFont("helvetica", "bold");
        pdf.text("Notes:", marginX, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(splitLongText(pdf, data.notes, contentWidth), marginX, y + 4);
      }

      const footerPhone = "03113208249 / 03005246494";
      const footerAddress = "Defence Road Opposite DHA RAHBAR";
      let footerY = pageHeight - 12;
      if (y > footerY - 8) {
        pdf.addPage();
        footerY = pageHeight - 12;
      }

      pdf.setDrawColor(203, 213, 225);
      pdf.line(marginX, footerY - 5, pageWidth - marginX, footerY - 5);
      pdf.setTextColor(71, 85, 105);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.text(`Phone: ${footerPhone}`, marginX, footerY, { align: "left" });
      pdf.text(`Address: ${footerAddress}`, pageWidth - marginX, footerY, {
        align: "right",
      });

      pdf.save(fileName);
      toast.success("Invoice downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download invoice");
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
                            title="Edit invoice"
                          >
                            <MdEdit size={16} />
                          </Button>
                          <div className="w-px h-5 bg-slate-200" />

                          <Button
                            type="button"
                            onClick={() => openInvoicePreview(inv)}
                            variant="orange"
                            title="Invoice Preview"
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

      {(previewLoading || previewInvoice) && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={closeInvoicePreview}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 border-b bg-slate-50">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Invoice Preview
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review the invoice before printing
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="bg-white border border-slate-300 shadow-sm"
                  onClick={closeInvoicePreview}
                >
                  Close
                </Button>
              </div>

              <div className="absolute inset-x-0 top-[61px] bottom-[72px] z-20 bg-slate-100 p-4">
                <div className="mx-auto h-full w-full max-w-[900px] overflow-hidden rounded-xl border bg-white shadow-sm">
                  {previewLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Loading invoice preview...
                    </div>
                  ) : (
                    <iframe
                      title="Invoice Preview"
                      srcDoc={previewHtml}
                      className="h-full w-full border-0"
                    />
                  )}
                </div>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="rounded-2xl border border-slate-200 p-6 bg-white shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b pb-4 mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-teal-700">
                        {previewInvoiceData?.invoiceType === "purchase"
                          ? "Purchase Invoice"
                          : "Sales Invoice"}
                      </h2>
                      <p className="text-sm text-slate-500">Imran Traders</p>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div>
                        <span className="font-semibold">Date:</span>{" "}
                        {formatDateLabel(previewInvoice?.issueDate)}
                      </div>
                      <div>
                        <span className="font-semibold">Status:</span>{" "}
                        {previewInvoice?.status || "-"}
                      </div>
                      <div>
                        <span className="font-semibold">Payment:</span>{" "}
                        {previewInvoice?.paymentMethod || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <h4 className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">
                        {previewInvoiceData?.invoiceType === "purchase"
                          ? "Vendor"
                          : "Customer"}
                      </h4>
                      <p className="text-sm font-semibold text-slate-800">
                        {previewInvoiceData?.partyName || "-"}
                      </p>
                      <p className="text-sm text-slate-600">
                        Phone: {previewInvoiceData?.partyPhone || "-"}
                      </p>
                      <p className="text-sm text-slate-600">
                        Address: {previewInvoiceData?.partyAddress || "-"}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <h4 className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">
                        Invoice Info
                      </h4>
                      <p className="text-sm text-slate-600">
                        Subtotal: {formatCurrency(previewInvoiceData?.subTotal)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Carage: {formatCurrency(previewInvoiceData?.carageAmount)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Received Amount:{" "}
                        {formatCurrency(
                          previewInvoiceData?.receivedAmountValue || 0,
                        )}
                      </p>
                      <p className="text-sm text-slate-600">
                        Remaining Amount:{" "}
                        {formatCurrency(
                          previewInvoiceData?.remainingAmountValue || 0,
                        )}
                      </p>
                      <p className="text-sm text-slate-600">
                        Due Date: {formatDateLabel(previewInvoice?.dueDate)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Items: {(previewInvoiceData?.items || []).length}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-[15px]">
                      <thead className="bg-teal-700 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">
                            Item Description
                          </th>
                          <th className="px-4 py-3 text-left">Code</th>
                          <th className="px-4 py-3 text-right">Qty</th>
                          <th className="px-4 py-3 text-right">Unit</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(previewInvoiceData?.items || []).map((item, idx) => (
                          <tr
                            key={`${item.code || item.name || "item"}-${idx}`}
                            className="border-b last:border-b-0"
                          >
                            <td className="px-4 py-3 text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 text-slate-800">
                              {item.name || "Product"}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {item.code || "-"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {Number(item.quantity || 0)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(item.unitPrice || 0)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(item.total || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <div className="w-64 space-y-2 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Total</span>
                        <span>
                          {formatCurrency(previewInvoiceData?.totalAmount || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-semibold text-slate-800 border-t pt-2">
                        <span>Total Bill</span>
                        <span>
                          {formatCurrency(previewInvoiceData?.totalAmount || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 px-6 py-4 border-t bg-slate-50">
                <Button
                  type="button"
                  onClick={handlePrintBill}
                  className="px-5 py-2 rounded-lg bg-indigo-700 text-white hover:bg-indigo-600"
                >
                  Print Bill
                </Button>
                {previewInvoiceData?.invoiceType !== "purchase" && (
                  <Button
                    type="button"
                    onClick={handlePrintGatePass}
                    className="px-5 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
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
