import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../lib/formatNumber";
import { formatDateLabel } from "../lib/dateFormat";
import {
  buildInvoicePrintHtml,
  combineInvoicePagesHtml,
} from "../lib/invoicePrintTemplate";
import { PreviewSkeleton } from "../Components/LoadingSkeletons";

const sanitizeFileName = (value) =>
  String(value || "invoice")
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "invoice";

const splitLongText = (doc, text, width) =>
  doc.splitTextToSize(String(text || "-"), width);

function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await axiosInstance.get(`/invoice/${id}`);
        setInvoice(res.data.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch invoice");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!invoice?.id) return;
      try {
        const res = await axiosInstance.get("/payment");
        const payments = res.data.payments || [];
        const matchingPayments = payments.filter(
          (payment) => String(payment.invoice) === String(invoice.id),
        );
        const paid = matchingPayments.reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0,
        );
        const total = Number(invoice.totalAmount || 0);
        setReceivedAmount(paid);
        setRemainingAmount(Math.max(total - paid, 0));
      } catch (err) {
        console.error(err);
        setReceivedAmount(0);
        setRemainingAmount(Number(invoice?.totalAmount || 0));
      }
    };

    fetchPayments();
  }, [invoice]);

  const isPurchaseInvoice = invoice?.invoiceType === "purchase";
  const showGatePass = !isPurchaseInvoice;

  const buildPrintOptions = (showPrices = true) => {
    if (!invoice) return null;

    const party = isPurchaseInvoice ? invoice.vendor : invoice.customerId || invoice.customer;

    return {
      documentTitle: showPrices
        ? isPurchaseInvoice
          ? "Purchase Invoice"
          : "Sales Invoice"
        : "Gate Pass",
      companyName: "Imran Traders",
      slogan: "Billing and stock management",
      invoiceLabel: "Invoice #",
      invoiceNumber: invoice.invoiceNumber || "-",
      issueLabel: "Date",
      issueDate: invoice.issueDate,
      dueLabel: "Due Date",
      dueDate: invoice.dueDate,
      partyLabel: showPrices ? "Invoice To" : "Gate Pass",
      partyName: party?.name || (isPurchaseInvoice ? "Vendor" : "Customer"),
      partyPhone:
        party?.contactInfo?.phone || party?.phone || invoice.customer?.phone || "",
      partyAddress:
        party?.contactInfo?.address ||
        party?.address ||
        invoice.customer?.address ||
        "",
      paymentMethod: invoice.paymentMethod || "-",
      status: invoice.status || "-",
      carage: invoice.carage || 0,
      items: (invoice.items || []).map((item) => ({
        name: item.name,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        total: Number(item.total || item.quantity * item.unitPrice || 0),
      })),
      showPrices,
      currency: invoice.currency || "Rs",
      subTotal: invoice.subTotal,
      discount: invoice.discount,
      totalAmount: invoice.totalAmount,
      receivedAmount,
      remainingAmount,
      notes: invoice.notes || "",
    };
  };

  const invoicePreviewHtml = useMemo(() => {
    const options = buildPrintOptions(true);
    return options ? buildInvoicePrintHtml(options) : "";
  }, [invoice, receivedAmount, remainingAmount]);

  const gatePassPreviewHtml = useMemo(() => {
    if (!showGatePass) return "";
    const options = buildPrintOptions(false);
    return options ? buildInvoicePrintHtml(options) : "";
  }, [invoice, receivedAmount, remainingAmount, showGatePass]);

  const combinedPrintHtml = useMemo(() => {
    if (!invoicePreviewHtml || !gatePassPreviewHtml) return invoicePreviewHtml;
    return combineInvoicePagesHtml(invoicePreviewHtml, gatePassPreviewHtml);
  }, [invoicePreviewHtml, gatePassPreviewHtml]);

  const printInvoice = async () => {
    if (!invoice) return;

    const printWindow = window.open("", "_blank", "width=900,height=650");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups.");
      return;
    }

    printWindow.document.write(combinedPrintHtml);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => printWindow.close(), 200);
    };
  };

  const downloadInvoice = async () => {
    if (!invoice) return;

    const fileName = `${sanitizeFileName(
      invoice.invoiceNumber || invoice.id || "invoice",
    )}.pdf`;

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
      });

      pdf.setProperties({
        title: fileName,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 10;
      const contentWidth = pageWidth - marginX * 2;
      let y = 12;

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

      pdf.setTextColor(15, 23, 42);
      y = addWrappedText("Imran Traders", marginX, y, contentWidth, 5, 16, "bold");
      y = addWrappedText("Billing and stock management", marginX, y + 1, contentWidth, 4, 9);

      const title = isPurchaseInvoice ? "Purchase Invoice" : "Sales Invoice";
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text(title, pageWidth - marginX, 14, { align: "right" });
      y = Math.max(y + 4, 24);
      addLine(y);
      y += 7;

      const party = isPurchaseInvoice ? invoice.vendor : invoice.customerId || invoice.customer;
      const partyLabel = isPurchaseInvoice ? "Vendor" : "Customer";
      const detailsLeft = [
        [partyLabel, party?.name || (isPurchaseInvoice ? "Vendor" : "Customer")],
        ["Phone", party?.contactInfo?.phone || party?.phone || invoice.customer?.phone || "-"],
        ["Address", party?.contactInfo?.address || party?.address || invoice.customer?.address || "-"],
        ["Payment", invoice.paymentMethod || "-"],
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

      const detailsRightStart = y;
      let detailsRightY = detailsRightStart;
      const detailsRight = [
        ["Invoice #", invoice.invoiceNumber || "-"],
        ["Date", formatDateLabel(invoice.issueDate)],
      ];

      detailsRight.forEach(([label, value]) => {
        pdf.setFont("helvetica", "bold");
        pdf.text(`${label}:`, pageWidth / 2 + 4, detailsRightY);
        pdf.setFont("helvetica", "normal");
        const wrapped = splitLongText(pdf, value, 40);
        pdf.text(wrapped, pageWidth / 2 + 22, detailsRightY);
        detailsRightY += Math.max(wrapped.length * 4.2, 4.2);
      });

      if (invoice.dueDate) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Due Date:", pageWidth / 2 + 4, detailsRightY);
        pdf.setFont("helvetica", "normal");
        const wrapped = splitLongText(pdf, formatDateLabel(invoice.dueDate), 40);
        pdf.text(wrapped, pageWidth / 2 + 22, detailsRightY);
        detailsRightY += Math.max(wrapped.length * 4.2, 4.2);
      }

      y = Math.max(detailsY, detailsRightY) + 5;
      addLine(y);
      y += 6;

      const rows = (invoice.items || []).map((item, index) => [
        String(index + 1),
        String(item.name || "-"),
        String(Number(item.quantity || 0)),
        formatCurrency(item.unitPrice || 0, invoice.currency || "Rs"),
        formatCurrency(item.total || item.quantity * item.unitPrice || 0, invoice.currency || "Rs"),
      ]);

      autoTable(pdf, {
        startY: y,
        margin: { left: marginX, right: marginX },
        head: [["No", "Item Description", "Qty", "Price", "Total"]],
        body: rows.length
          ? rows
          : [["-", "No items", "-", "-", "-"]],
        styles: {
          font: "helvetica",
          fontSize: 8,
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
        ["Sub Total", formatCurrency(invoice.subTotal || 0, invoice.currency || "Rs")],
        ["Carage", formatCurrency(invoice.carage || 0, invoice.currency || "Rs")],
        ["Received", formatCurrency(receivedAmount || 0, invoice.currency || "Rs")],
        ["Remaining", formatCurrency(remainingAmount || 0, invoice.currency || "Rs")],
        ["Discount", formatCurrency(invoice.discount || 0, invoice.currency || "Rs")],
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
      pdf.text(
        formatCurrency(invoice.totalAmount || 0, invoice.currency || "Rs"),
        pageWidth - marginX,
        summaryY + 2.6,
        { align: "right" },
      );

      const notes = String(invoice.notes || "").trim();
      if (notes) {
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
        pdf.text(splitLongText(pdf, notes, contentWidth), marginX, y + 4);
      }

      pdf.save(fileName);
    } catch (error) {
      console.error(error);
      toast.error("Failed to download invoice");
    }
  };

  if (loading) return <PreviewSkeleton />;
  if (!invoice) return <p className="p-6">Invoice not found</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* ACTION BAR (outside invoice) */}
      <div className="flex justify-between items-center mb-4 print:hidden">
        <button
          onClick={() => navigate("/invoices")}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          ← Back
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/editInvoice/${invoice.id}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit
          </button>

          <button
            onClick={printInvoice}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Print Invoice
          </button>

          <button
            onClick={downloadInvoice}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Download Invoice
          </button>
        </div>
      </div>

      {/* INVOICE CARD */}
      <div className="relative bg-white rounded-xl shadow p-8 print:shadow-none print:p-0">
        <div className="print:hidden">
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-lg border bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Subtotal</div>
              <div className="font-semibold text-slate-800">
                {formatCurrency(invoice.subTotal || 0, invoice.currency || "Rs")}
              </div>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Carage</div>
              <div className="font-semibold text-slate-800">
                {formatCurrency(invoice.carage || 0, invoice.currency || "Rs")}
              </div>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Received</div>
              <div className="font-semibold text-slate-800">
                {formatCurrency(receivedAmount || 0, invoice.currency || "Rs")}
              </div>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Remaining</div>
              <div className="font-semibold text-slate-800">
                {formatCurrency(remainingAmount || 0, invoice.currency || "Rs")}
              </div>
            </div>
            <div className="rounded-lg border bg-teal-50 p-3">
              <div className="text-xs text-teal-700">Total Bill</div>
              <div className="font-semibold text-teal-800">
                {formatCurrency(invoice.totalAmount || 0, invoice.currency || "Rs")}
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <iframe
              title={showGatePass ? "Invoice and Gate Pass Preview" : "Invoice Preview"}
              srcDoc={combinedPrintHtml}
              className="h-[297mm] w-full border-0"
            />
          </div>
        </div>
        <div className="hidden print:block" />
      </div>
    </div>
  );
}

export default InvoiceDetailPage;
