import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopNavbar from "../Components/TopNavbar";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatFixed } from "../lib/formatNumber";

function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
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

  // ===== PDF GENERATION =====
  const downloadInvoice = () => {
    if (!invoice) return;

    const doc = new jsPDF("p", "pt", "a4");
    doc.setFontSize(18);
    doc.text("Invoice", 40, 40);
    doc.setFontSize(12);
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 40, 65);
    doc.text(
      `Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`,
      40,
      80,
    );
    doc.text(
      `Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`,
      40,
      95,
    );

    // Client Info
    doc.setFontSize(14);
    doc.text("Bill To:", 40, 125);
    doc.setFontSize(12);
    const isPurchase = invoice.invoiceType === "purchase";
    const party = isPurchase
      ? invoice.vendor
      : invoice.customerId || invoice.customer;
    const partyLines = [
      party?.name,
      isPurchase
        ? party?.contactInfo?.phone
        : party?.contactInfo?.phone || party?.phone,
      isPurchase
        ? party?.contactInfo?.address
        : party?.contactInfo?.address || party?.address,
    ].filter(Boolean);
    partyLines.forEach((line, i) => doc.text(line, 40, 140 + i * 15));

    // Table Items
    const tableData = invoice.items.map((item, idx) => [
      idx + 1,
      item.name,
      item.quantity,
      `${invoice.currency} ${formatFixed(item.unitPrice)}`,
      `${invoice.currency} ${formatFixed(item.total)}`,
    ]);

    autoTable(doc, {
      startY: 200,
      head: [["#", "Name", "Qty", "Unit Price", "Total"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [240, 240, 240] },
      styles: { fontSize: 10 },
    });

    // Totals
    const finalY = doc.lastAutoTable.finalY || 200;
    doc.setFontSize(12);
    doc.text(
      `Subtotal: ${invoice.currency} ${formatFixed(invoice.subTotal)}`,
      400,
      finalY + 20,
    );
    doc.text(
      `Tax (${invoice.taxRate}%): ${invoice.currency} ${formatFixed(invoice.taxAmount)}`,
      400,
      finalY + 35,
    );
    doc.text(
      `Discount: ${invoice.currency} ${formatFixed(invoice.discount)}`,
      400,
      finalY + 50,
    );
    doc.setFontSize(14);
    doc.text(
      `Total: ${invoice.currency} ${formatFixed(invoice.totalAmount)}`,
      400,
      finalY + 70,
    );

    // Notes
    if (invoice.notes) {
      doc.setFontSize(12);
      doc.text("Notes:", 40, finalY + 100);
      doc.text(invoice.notes, 40, finalY + 115);
    }

    doc.save(`${invoice.invoiceNumber}.pdf`);
  };

  if (loading) return <p className="p-6">Loading invoice...</p>;
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
            onClick={downloadInvoice}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* INVOICE CARD */}
      <div className="bg-white rounded-xl shadow p-8 print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-4 mb-6">
          {/* LEFT SIDE */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice</h1>
            <p className="text-gray-500">{invoice.invoiceNumber}</p>
          </div>

          {/* RIGHT SIDE */}
          <div className="text-right text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-semibold">Issue Date:</span>{" "}
              {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
            <p>
              <span className="font-semibold">Due Date:</span>{" "}
              {new Date(invoice.dueDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8 text-gray-700">
          {/* BILL TO */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
              {invoice.invoiceType === "purchase" ? "Vendor" : "Customer"}
            </h3>

            <p className="font-semibold text-gray-900">
              {invoice.invoiceType === "purchase"
                ? invoice.vendor?.name
                : invoice.customerId?.name || invoice.customer?.name}
            </p>

            {(invoice.customerId?.contactInfo?.phone ||
              invoice.customer?.phone) && (
              <p className="text-gray-600 text-sm">
                {invoice.customerId?.contactInfo?.phone ||
                  invoice.customer?.phone}
              </p>
            )}

            {(invoice.customerId?.contactInfo?.address ||
              invoice.customer?.address) && (
              <p className="text-gray-600 text-sm">
                {invoice.customerId?.contactInfo?.address ||
                  invoice.customer?.address}
              </p>
            )}

            <p className="text-sm mt-2">
              <span className="font-semibold">Status:</span> {invoice.status}
            </p>

            <p className="text-sm">
              <span className="font-semibold">Payment Method:</span>{" "}
              {invoice.paymentMethod}
            </p>
          </div>

          {/* INVOICE META */}
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-semibold">Invoice #:</span>{" "}
              {invoice.invoiceNumber}
            </p>
            <p>
              <span className="font-semibold">Issue Date:</span>{" "}
              {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
            <p>
              <span className="font-semibold">Due Date:</span>{" "}
              {new Date(invoice.dueDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-6">
            <h2 className="font-semibold text-gray-800 mb-1">Notes</h2>
            <p className="text-gray-600">{invoice.notes}</p>
          </div>
        )}

        {/* Items Table */}
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Items</h2>
        <div className="overflow-hidden rounded-lg border mb-8">
          <table className="min-w-full border-collapse border text-sm">
            <thead className="bg-slate-50 text-gray-600 text-sm">
              <tr>
                <th className="px-4 py-2 border text-left">#</th>
                <th className="px-4 py-2 border text-left">Name</th>
                <th className="px-4 py-2 border text-right">Quantity</th>
                <th className="px-4 py-2 border text-right">Unit Price</th>
                <th className="px-4 py-2 border text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{idx + 1}</td>
                  <td className="px-4 py-2 border">{item.name}</td>
                  <td className="px-4 py-2 border text-right">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-2 border text-right">
                    {invoice.currency} {formatFixed(item.unitPrice)}
                  </td>
                  <td className="px-4 py-2 border text-right">
                    {invoice.currency} {formatFixed(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>
                {invoice.currency} {formatFixed(invoice.subTotal)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Tax ({invoice.taxRate}%)</span>
              <span>
                {invoice.currency} {formatFixed(invoice.taxAmount)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Discount</span>
              <span>
                {invoice.currency} {formatFixed(invoice.discount)}
              </span>
            </div>

            <div className="flex justify-between border-t pt-2 font-bold text-lg">
              <span>Total</span>
              <span>
                {invoice.currency} {formatFixed(invoice.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceDetailPage;
