import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { IoMdAdd } from "react-icons/io";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { Download } from "lucide-react";
import { Popconfirm } from "antd";
import { MdDelete } from "react-icons/md";
import { PiInvoiceBold } from "react-icons/pi";
import axiosInstance from "../lib/axios";
import FormattedTime from "../lib/FormattedTime";
import DateSortHeader from "../Components/DateSortHeader";
import {
  formatDateLabel,
  formatDateTimeLabel,
  getDateTimestamp,
  sortByDateValue,
} from "../lib/dateFormat";
import NoData from "../Components/NoData";
import { TrendingUp, CreditCard, AlertCircle, Clipboard } from "lucide-react";
import { DetailSkeleton } from "../Components/LoadingSkeletons";
import DrawerPanel from "../Components/DrawerPanel";
import toast from "react-hot-toast";
import { uppercasePayload } from "../lib/uppercasePayload";
import {
  buildInvoicePrintHtml,
  combineInvoicePagesHtml,
} from "../lib/invoicePrintTemplate";
import {
  validateNumberInput,
  validateTextInput,
} from "../lib/formValidation";

const sanitizeFileName = (value) =>
  String(value || "customer_ledger")
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "customer_ledger";

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
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerDateSort, setLedgerDateSort] = useState("asc");
  const [salesDateSort, setSalesDateSort] = useState("asc");
  const [legacyDateSort, setLegacyDateSort] = useState("asc");
  const [salesDateFrom, setSalesDateFrom] = useState("");
  const [salesDateTo, setSalesDateTo] = useState("");
  const [showBillModal, setShowBillModal] = useState(false);
  const [billSale, setBillSale] = useState(null);

  const currency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;

  const getSaleTotals = (sale) => {
    const totalAmount = Number(sale?.totalAmount || 0);
    const carageAmount = Number(sale?.carage || 0);
    const subTotal = Math.max(totalAmount - carageAmount, 0);
    const receivedAmountValue = Number.isFinite(Number(sale?.paidAmount))
      ? Number(sale?.paidAmount || 0)
      : Math.max(totalAmount - Number(sale?.remainingAmount || 0), 0);
    const remainingAmountValue = Math.max(totalAmount - receivedAmountValue, 0);

    return {
      totalAmount,
      carageAmount,
      subTotal,
      receivedAmountValue,
      remainingAmountValue,
    };
  };

  const sortedLedger = useMemo(
    () => sortByDateValue(ledger || [], (entry) => entry.date, ledgerDateSort),
    [ledger, ledgerDateSort],
  );

  const filteredSales = useMemo(() => {
    const allSales = Array.isArray(sales) ? sales : [];
    if (!salesDateFrom && !salesDateTo) {
      return allSales;
    }

    const fromStartTimestamp = salesDateFrom
      ? new Date(`${salesDateFrom}T00:00:00`).getTime()
      : 0;
    const fromEndTimestamp = salesDateFrom
      ? new Date(`${salesDateFrom}T23:59:59.999`).getTime()
      : 0;
    const toEndTimestamp = salesDateTo
      ? new Date(`${salesDateTo}T23:59:59.999`).getTime()
      : 0;

    return allSales.filter((sale) => {
      const saleTimestamp = getDateTimestamp(sale.createdAt);
      if (!saleTimestamp) return false;

      if (salesDateFrom && salesDateTo) {
        return (
          saleTimestamp >= fromStartTimestamp && saleTimestamp <= toEndTimestamp
        );
      }

      if (salesDateFrom) {
        return (
          saleTimestamp >= fromStartTimestamp &&
          saleTimestamp <= fromEndTimestamp
        );
      }

      if (salesDateTo) {
        return saleTimestamp <= toEndTimestamp;
      }

      return true;
    });
  }, [sales, salesDateFrom, salesDateTo]);

  const sortedSales = useMemo(
    () =>
      sortByDateValue(
        filteredSales || [],
        (sale) => sale.createdAt,
        salesDateSort,
      ),
    [filteredSales, salesDateSort],
  );

  const legacyEntries = useMemo(
    () => [
      {
        id: "legacy",
        date: customer?.updatedAt || customer?.createdAt,
        type: "legacy balance",
        description: customer?.openingBalanceNote || "Previous system amount",
        amount: customer?.openingBalance || 0,
      },
    ],
    [customer],
  );

  const sortedLegacyEntries = useMemo(
    () =>
      sortByDateValue(legacyEntries, (entry) => entry.date, legacyDateSort),
    [legacyEntries, legacyDateSort],
  );

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
      await axiosInstance.post(`/customer/${id}/opening-balance`, {
        amount: amountCheck.value,
        notes: uppercasePayload(descriptionCheck.value),
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

  const openBillPreview = (sale) => {
    if (!sale) return;
    setBillSale(sale);
    setShowBillModal(true);
  };

  const closeBillPreview = () => {
    setShowBillModal(false);
    setBillSale(null);
  };

  const billPreviewHtml = useMemo(() => {
    if (!billSale) return "";

    const items = Array.isArray(billSale.products) ? billSale.products : [];
    const {
      totalAmount,
      carageAmount,
      subTotal,
      receivedAmountValue,
      remainingAmountValue,
    } = getSaleTotals(billSale);

    const invoiceHtml = buildInvoicePrintHtml({
      documentTitle: "Sales Invoice",
      companyName: "Imran Traders",
      slogan: "",
      logoUrl: `${window.location.origin}/ITLOGO.svg`,
      invoiceLabel: "Invoice #",
      invoiceNumber: billSale.invoiceNumber || billSale.id || "-",
      issueLabel: "Date",
      issueDate: billSale.createdAt || new Date().toISOString(),
      partyLabel: "Invoice To",
      partyName: billSale.customerName || customer?.name || "Customer",
      partyPhone:
        billSale.customer?.contactInfo?.phone ||
        billSale.customer?.phone ||
        customer?.contactInfo?.phone ||
        customer?.phone ||
        "",
      partyAddress:
        billSale.customer?.contactInfo?.address ||
        billSale.customer?.address ||
        customer?.contactInfo?.address ||
        customer?.address ||
        "",
      paymentMethod: billSale.paymentMethod || "-",
      status: billSale.status || "-",
      items: items.map((item) => {
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.price || 0);
        return {
          name: item.product?.name || "Product",
          description: "",
          company: "",
          code: item.productCode?.code || "",
          quantity: qty,
          unitPrice,
          total: qty * unitPrice,
        };
      }),
      currency: "Rs",
      subTotal,
      carage: carageAmount,
      totalAmount,
      receivedAmount: receivedAmountValue,
      remainingAmount: remainingAmountValue,
      notes: billSale.notes || "",
    });

    const gatePassHtml = buildInvoicePrintHtml({
      documentTitle: "Gate Pass",
      companyName: "Imran Traders",
      slogan: "",
      logoUrl: `${window.location.origin}/ITLOGO.svg`,
      invoiceLabel: "Gate Pass #",
      invoiceNumber: billSale.invoiceNumber || billSale.id || "-",
      issueLabel: "Date",
      issueDate: billSale.createdAt || new Date().toISOString(),
      partyLabel: "Gate Pass",
      partyName: billSale.customerName || customer?.name || "Customer",
      partyPhone:
        billSale.customer?.contactInfo?.phone ||
        billSale.customer?.phone ||
        customer?.contactInfo?.phone ||
        customer?.phone ||
        "",
      partyAddress:
        billSale.customer?.contactInfo?.address ||
        billSale.customer?.address ||
        customer?.contactInfo?.address ||
        customer?.address ||
        "",
      paymentMethod: billSale.paymentMethod || "-",
      status: billSale.status || "-",
      items: items.map((item) => ({
        name: item.product?.name || "Product",
        quantity: Number(item.quantity || 0),
        code: item.productCode?.code || "",
      })),
      showPrices: false,
      showSummaryBox: false,
      currency: "Rs",
      subTotal,
      carage: carageAmount,
      totalAmount,
      receivedAmount: receivedAmountValue,
      remainingAmount: remainingAmountValue,
      notes: billSale.notes || "",
    });

    return combineInvoicePagesHtml(invoiceHtml, gatePassHtml);
  }, [billSale, customer]);

  const currentBillTotals = billSale ? getSaleTotals(billSale) : null;

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

  const buildBillPdfData = () => {
    if (!billSale) return null;

    const items = Array.isArray(billSale.products) ? billSale.products : [];
    const {
      totalAmount,
      carageAmount,
      subTotal,
      receivedAmountValue,
      remainingAmountValue,
    } = getSaleTotals(billSale);

    return {
      invoiceNumber: billSale.invoiceNumber || billSale.id || "-",
      issueDate: billSale.createdAt || new Date().toISOString(),
      customerName: billSale.customerName || customer?.name || "Customer",
      customerPhone:
        billSale.customer?.contactInfo?.phone ||
        billSale.customer?.phone ||
        customer?.contactInfo?.phone ||
        customer?.phone ||
        "-",
      customerAddress:
        billSale.customer?.contactInfo?.address ||
        billSale.customer?.address ||
        customer?.contactInfo?.address ||
        customer?.address ||
        "-",
      paymentMethod: billSale.paymentMethod || "-",
      status: billSale.status || "-",
      items: items.map((item) => {
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.price || 0);
        return {
          name: item.product?.name || "Product",
          code: item.productCode?.code || "-",
          quantity: qty,
          unitPrice,
          total: qty * unitPrice,
        };
      }),
      subTotal,
      carageAmount,
      totalAmount,
      receivedAmountValue,
      remainingAmountValue,
      notes: String(billSale.notes || "").trim(),
    };
  };

  const downloadBillPdf = async () => {
    const data = buildBillPdfData();
    if (!data) return;

    const fileName = `${sanitizeFileName(data.invoiceNumber || "invoice")}.pdf`;

    try {
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
        const lines = pdf.splitTextToSize(String(text || "-"), width);
        pdf.text(lines, x, currentY);
        return currentY + lines.length * lineHeight;
      };

      const addLine = (currentY) => {
        pdf.setDrawColor(203, 213, 225);
        pdf.line(marginX, currentY, pageWidth - marginX, currentY);
      };

      const headerTextX = marginX;
      pdf.setTextColor(15, 23, 42);
      y = addWrappedText(
        "Imran Traders",
        headerTextX,
        15,
        contentWidth,
        5,
        16,
        "bold",
      );
      y = addWrappedText(
        "Billing and stock management",
        headerTextX,
        y + 1,
        contentWidth,
        4,
        9,
      );

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text("Sales Invoice", pageWidth - marginX, 14, { align: "right" });
      y = Math.max(y + 4, 24);
      addLine(y);
      y += 7;

      const detailsLeft = [
        ["Customer", data.customerName],
        ["Phone", data.customerPhone],
        ["Address", data.customerAddress],
        ["Payment", data.paymentMethod],
      ];

      pdf.setFontSize(9);
      let detailsY = y;
      detailsLeft.forEach(([label, value]) => {
        pdf.setFont("helvetica", "bold");
        pdf.text(`${label}:`, marginX, detailsY);
        pdf.setFont("helvetica", "normal");
        const wrapped = pdf.splitTextToSize(String(value || "-"), 65);
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
        const wrapped = pdf.splitTextToSize(String(value || "-"), 40);
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
              currency(item.unitPrice),
              currency(item.total),
            ])
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
        ["Sub Total", currency(data.subTotal)],
        ["Carage", currency(data.carageAmount)],
        ["Received", currency(data.receivedAmountValue)],
        ["Remaining", currency(data.remainingAmountValue)],
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
      pdf.text(currency(data.totalAmount), pageWidth - marginX, summaryY + 2.6, {
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
        pdf.text(pdf.splitTextToSize(data.notes, contentWidth), marginX, y + 4);
      }

      pdf.save(fileName);
    } catch (error) {
      console.error(error);
      toast.error("Failed to download bill");
    }
  };

  const handlePrintBillOnly = () => {
    if (!billSale) return;
    const invoiceHtml = buildInvoicePrintHtml({
      documentTitle: "Sales Invoice",
      companyName: "Imran Traders",
      slogan: "",
      logoUrl: `${window.location.origin}/ITLOGO.svg`,
      invoiceLabel: "Invoice #",
      invoiceNumber: billSale.invoiceNumber || billSale.id || "-",
      issueLabel: "Date",
      issueDate: billSale.createdAt || new Date().toISOString(),
      partyLabel: "Invoice To",
      partyName: billSale.customerName || customer?.name || "Customer",
      partyPhone:
        billSale.customer?.contactInfo?.phone ||
        billSale.customer?.phone ||
        customer?.contactInfo?.phone ||
        customer?.phone ||
        "",
      partyAddress:
        billSale.customer?.contactInfo?.address ||
        billSale.customer?.address ||
        customer?.contactInfo?.address ||
        customer?.address ||
        "",
      paymentMethod: billSale.paymentMethod || "-",
      status: billSale.status || "-",
      items: (billSale.products || []).map((item) => {
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.price || 0);
        return {
          name: item.product?.name || "Product",
          description: "",
          company: "",
          code: item.productCode?.code || "",
          quantity: qty,
          unitPrice,
          total: qty * unitPrice,
        };
      }),
      currency: "Rs",
      subTotal: getSaleTotals(billSale).subTotal,
      carage: getSaleTotals(billSale).carageAmount,
      totalAmount: getSaleTotals(billSale).totalAmount,
      receivedAmount: getSaleTotals(billSale).receivedAmountValue,
      remainingAmount: getSaleTotals(billSale).remainingAmountValue,
      notes: billSale.notes || "",
    });

    openPrintWindow(invoiceHtml);
  };

  const handleDownloadBillOnly = async () => {
    await downloadBillPdf();
  };

  const handlePrintGatePassOnly = () => {
    if (!billSale) return;
    const gatePassHtml = buildInvoicePrintHtml({
      documentTitle: "Gate Pass",
      companyName: "Imran Traders",
      slogan: "",
      logoUrl: `${window.location.origin}/ITLOGO.svg`,
      invoiceLabel: "Gate Pass #",
      invoiceNumber: billSale.invoiceNumber || billSale.id || "-",
      issueLabel: "Date",
      issueDate: billSale.createdAt || new Date().toISOString(),
      partyLabel: "Gate Pass",
      partyName: billSale.customerName || customer?.name || "Customer",
      partyPhone:
        billSale.customer?.contactInfo?.phone ||
        billSale.customer?.phone ||
        customer?.contactInfo?.phone ||
        customer?.phone ||
        "",
      partyAddress:
        billSale.customer?.contactInfo?.address ||
        billSale.customer?.address ||
        customer?.contactInfo?.address ||
        customer?.address ||
        "",
      paymentMethod: billSale.paymentMethod || "-",
      status: billSale.status || "-",
      items: (billSale.products || []).map((item) => ({
        name: item.product?.name || "Product",
        quantity: Number(item.quantity || 0),
        code: item.productCode?.code || "",
      })),
      showPrices: false,
      showSummaryBox: false,
      currency: "Rs",
      subTotal: getSaleTotals(billSale).subTotal,
      carage: getSaleTotals(billSale).carageAmount,
      totalAmount: getSaleTotals(billSale).totalAmount,
      receivedAmount: getSaleTotals(billSale).receivedAmountValue,
      remainingAmount: getSaleTotals(billSale).remainingAmountValue,
      notes: billSale.notes || "",
    });

    openPrintWindow(gatePassHtml);
  };

  const handlePrintBoth = () => {
    if (!billSale || !billPreviewHtml) return;
    openPrintWindow(billPreviewHtml);
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
                      <th className="px-5 py-4 font-medium">Credit</th>
                      <th className="px-5 py-4 font-medium">Debit</th>
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
            <div className="flex flex-col gap-4 p-5 border-b">
              <div>
                <div className="text-lg font-semibold text-slate-800">
                  Sales Record
                </div>
                <div className="text-sm text-slate-500">
                  Sales saved on the customer record.
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    From
                  </label>
                  <input
                    type="date"
                    value={salesDateFrom}
                    onChange={(e) => setSalesDateFrom(e.target.value)}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    To
                  </label>
                  <input
                    type="date"
                    value={salesDateTo}
                    onChange={(e) => setSalesDateTo(e.target.value)}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSalesDateFrom("");
                    setSalesDateTo("");
                  }}
                  className="h-10 rounded-lg border border-teal-200 px-4 text-sm font-medium text-teal-700 hover:bg-teal-50"
                >
                  Clear filter
                </button>
              </div>
            </div>
            {sortedSales.length === 0 ? (
              <div className="p-10">
                <NoData
                  title="No Sales Found"
                  description={
                    salesDateFrom || salesDateTo
                      ? "No sales match the selected date range."
                      : "This customer has no sales recorded yet."
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-left text-slate-500">
                    <tr>
                      <DateSortHeader
                        label="Date"
                        direction={salesDateSort}
                        onToggle={() =>
                          setSalesDateSort((prev) =>
                            prev === "asc" ? "desc" : "asc",
                          )
                        }
                      />
                      <th className="px-5 py-4 font-medium">Items</th>
                      <th className="px-5 py-4 font-medium">Qty</th>
                      <th className="px-5 py-4 font-medium">Carage</th>
                      <th className="px-5 py-4 font-medium">Total</th>
                      <th className="px-5 py-4 font-medium">Payment</th>
                      <th className="px-5 py-4 font-medium">Sale Status</th>
                      <th className="px-5 py-4 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSales.map((sale) => {
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
                          <td className="px-5 py-4">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => openBillPreview(sale)}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                                title="Generate / View Bill"
                              >
                                <PiInvoiceBold size={18} />
                                Bill
                              </button>
                            </div>
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
                    <DateSortHeader
                      label="Date"
                      direction={legacyDateSort}
                      onToggle={() =>
                        setLegacyDateSort((prev) =>
                          prev === "asc" ? "desc" : "asc",
                        )
                      }
                    />
                    <th className="px-5 py-4 font-medium">Type</th>
                    <th className="px-5 py-4 font-medium">Description</th>
                    <th className="px-5 py-4 font-medium">Amount</th>
                    <th className="px-5 py-4 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLegacyEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b last:border-b-0 hover:bg-slate-50 transition"
                    >
                      <td className="px-5 py-4 text-slate-600">
                        <FormattedTime timestamp={entry.date} />
                      </td>
                      <td className="px-5 py-4 text-slate-700 capitalize">
                        {entry.type}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {entry.description}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {currency(entry.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          {Number(entry.amount || 0) !== 0 ? (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showBillModal && billSale && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={closeBillPreview}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Sales Bill Preview
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review the invoice before printing
                  </p>
                </div>
                <button
                  onClick={closeBillPreview}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Close
                </button>
              </div>

              <div className="absolute inset-x-0 top-[57px] bottom-[72px] z-20 bg-slate-100 p-4">
                <div className="mx-auto h-full w-full max-w-[900px] overflow-hidden rounded-xl border bg-white shadow-sm">
                  <iframe
                    title="Sales Bill Preview"
                    srcDoc={billPreviewHtml}
                    className="h-full w-full border-0"
                  />
                </div>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="rounded-2xl border border-slate-200 p-6 bg-white shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b pb-4 mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-teal-700">
                        Sales Invoice
                      </h2>
                      <p className="text-sm text-slate-500">Imran Trader</p>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div>
                        <span className="font-semibold">Date:</span>{" "}
                        {formatDateTimeLabel(billSale.createdAt || new Date())}
                      </div>
                      <div>
                        <span className="font-semibold">Status:</span>{" "}
                        {billSale.status}
                      </div>
                      <div>
                        <span className="font-semibold">Payment:</span>{" "}
                        {billSale.paymentStatus || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <h4 className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">
                        Customer
                      </h4>
                      <p className="text-sm font-semibold text-slate-800">
                        {billSale.customerName || customer?.name || "Customer"}
                      </p>
                      <p className="text-sm text-slate-600">
                        Phone:{" "}
                        {billSale.customer?.contactInfo?.phone ||
                          billSale.customer?.phone ||
                          customer?.contactInfo?.phone ||
                          customer?.phone ||
                          "-"}
                      </p>
                      <p className="text-sm text-slate-600">
                        Address:{" "}
                        {billSale.customer?.contactInfo?.address ||
                          billSale.customer?.address ||
                          customer?.contactInfo?.address ||
                          customer?.address ||
                          "-"}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <h4 className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">
                        Sale Info
                      </h4>
                      <p className="text-sm text-slate-600">
                        Subtotal:{" "}
                        {currency(
                          Math.max(
                            Number(billSale.totalAmount || 0) -
                              Number(billSale.carage || 0),
                            0,
                          ),
                        )}
                      </p>
                      <p className="text-sm text-slate-600">
                        Carage: {currency(billSale.carage || 0)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Received Amount:{" "}
                        {currency(
                          currentBillTotals?.receivedAmountValue || 0,
                        )}
                      </p>
                      <p className="text-sm text-slate-600">
                        Remaining Amount:{" "}
                        {currency(
                          currentBillTotals?.remainingAmountValue || 0,
                        )}
                      </p>
                      <p className="text-sm text-slate-600">
                        Payment Method: {billSale.paymentMethod || "-"}
                      </p>
                      <p className="text-sm text-slate-600">
                        Items: {(billSale.products || []).length}
                      </p>
                      <p className="text-sm text-slate-600">
                        Total Qty:{" "}
                        {(billSale.products || []).reduce(
                          (sum, item) => sum + Number(item.quantity || 0),
                          0,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-sm">
                      <thead className="bg-teal-700 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">Product</th>
                          <th className="px-4 py-3 text-left">Description</th>
                          <th className="px-4 py-3 text-left">Code</th>
                          <th className="px-4 py-3 text-right">Qty</th>
                          <th className="px-4 py-3 text-right">Unit</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(billSale.products || []).map((item, idx) => {
                          const qty = Number(item.quantity || 0);
                          const price = Number(item.price || 0);
                          return (
                            <tr
                              key={item.productCode?.id || idx}
                              className="border-b last:border-b-0"
                            >
                              <td className="px-4 py-3 text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3 text-slate-800">
                                {item.product?.name || "Product"}
                                {item.product?.company || item.product?.brand
                                  ? ` • ${item.product?.company || item.product?.brand}`
                                  : ""}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {item.product?.description || "-"}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {item.productCode?.code || "-"}
                              </td>
                              <td className="px-4 py-3 text-right">{qty}</td>
                              <td className="px-4 py-3 text-right">
                                {currency(price)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {currency(price * qty)}
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
                        <span>{currency(billSale.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Received</span>
                        <span>
                          {currency(
                            currentBillTotals?.receivedAmountValue || 0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining</span>
                        <span>
                          {currency(
                            currentBillTotals?.remainingAmountValue || 0,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-semibold text-slate-800 border-t pt-2">
                        <span>Total</span>
                        <span>{currency(billSale.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 px-6 py-4 border-t bg-slate-50">
                <button
                  type="button"
                  onClick={closeBillPreview}
                  className="px-5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePrintBillOnly}
                  className="px-5 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-600"
                >
                  Print Bill
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBillOnly}
                  className="px-5 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-600"
                >
                  Download Bill
                </button>
                <button
                  type="button"
                  onClick={handlePrintGatePassOnly}
                  className="px-5 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
                >
                  Print Gate Pass
                </button>
                <button
                  type="button"
                  onClick={handlePrintBoth}
                  className="px-5 py-2 rounded-lg bg-indigo-700 text-white hover:bg-indigo-600"
                >
                  Print Both
                </button>
              </div>
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
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-500"
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
                className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-500"
                placeholder="Add a note for this manual entry"
                required
                maxLength={240}
              />
              {errors.manualDescription && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.manualDescription}
                </p>
              )}
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
