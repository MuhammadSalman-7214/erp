import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopNavbar from "../Components/TopNavbar";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSelector } from "react-redux";

function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((state) => state.auth);

  const dashboardBasePath = (() => {
    switch (user?.role) {
      case "admin":
        return "/AdminDashboard";
      case "manager":
        return "/ManagerDashboard";
      case "staff":
        return "/StaffDashboard";
      default:
        return "/";
    }
  })();
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
    const clientLines = [
      invoice.client?.name,
      invoice.client?.email,
      invoice.client?.phone,
      invoice.client?.address,
    ].filter(Boolean);
    clientLines.forEach((line, i) => doc.text(line, 40, 140 + i * 15));

    // Table Items
    const tableData = invoice.items.map((item, idx) => [
      idx + 1,
      item.name,
      item.description,
      item.quantity,
      `${invoice.currency} ${item.unitPrice.toFixed(2)}`,
      `${invoice.currency} ${item.total.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 200,
      head: [["#", "Name", "Description", "Qty", "Unit Price", "Total"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [240, 240, 240] },
      styles: { fontSize: 10 },
    });

    // Totals
    const finalY = doc.lastAutoTable.finalY || 200;
    doc.setFontSize(12);
    doc.text(
      `Subtotal: ${invoice.currency} ${invoice.subTotal.toFixed(2)}`,
      400,
      finalY + 20,
    );
    doc.text(
      `Tax (${invoice.taxRate}%): ${invoice.currency} ${invoice.taxAmount.toFixed(2)}`,
      400,
      finalY + 35,
    );
    doc.text(
      `Discount: ${invoice.currency} ${invoice.discount.toFixed(2)}`,
      400,
      finalY + 50,
    );
    doc.setFontSize(14);
    doc.text(
      `Total: ${invoice.currency} ${invoice.totalAmount.toFixed(2)}`,
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
    <div className="bg-gray-50 min-h-screen">
      <TopNavbar />
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2 md:mb-0">
              {invoice.invoiceNumber}
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  navigate(`${dashboardBasePath}/editInvoice/${invoice._id}`)
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={downloadInvoice}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Download PDF
              </button>
              <button
                onClick={() => navigate(`${dashboardBasePath}/invoices`)}
                className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
              >
                Back
              </button>
            </div>
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-gray-700">
            <div className="space-y-1">
              <p>
                <span className="font-semibold">Client:</span>{" "}
                {invoice.client?.name || "-"}
              </p>
              {invoice.client?.email && (
                <p>
                  <span className="font-semibold">Email:</span>{" "}
                  {invoice.client.email}
                </p>
              )}
              {invoice.client?.phone && (
                <p>
                  <span className="font-semibold">Phone:</span>{" "}
                  {invoice.client.phone}
                </p>
              )}
              {invoice.client?.address && (
                <p>
                  <span className="font-semibold">Address:</span>{" "}
                  {invoice.client.address}
                </p>
              )}
              <p>
                <span className="font-semibold">Status:</span> {invoice.status}
              </p>
              <p>
                <span className="font-semibold">Payment Method:</span>{" "}
                {invoice.paymentMethod}
              </p>
            </div>
            <div className="space-y-1">
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
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full border rounded-lg shadow-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border text-left">#</th>
                  <th className="px-4 py-2 border text-left">Name</th>
                  <th className="px-4 py-2 border text-left">Description</th>
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
                    <td className="px-4 py-2 border">{item.description}</td>
                    <td className="px-4 py-2 border text-right">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-2 border text-right">
                      {invoice.currency} {item.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 border text-right">
                      {invoice.currency} {item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-4 text-gray-700">
            <div className="text-right">
              <p className="font-semibold">
                Subtotal: {invoice.currency} {invoice.subTotal.toFixed(2)}
              </p>
              <p className="font-semibold">
                Tax: {invoice.currency} {invoice.taxAmount.toFixed(2)} (
                {invoice.taxRate}%)
              </p>
              <p className="font-semibold">
                Discount: {invoice.currency} {invoice.discount.toFixed(2)}
              </p>
              <p className="font-bold text-lg">
                Total: {invoice.currency} {invoice.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceDetailPage;
