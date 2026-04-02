import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import { buildInvoicePrintHtml } from "../lib/invoicePrintTemplate";

function GatePassPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSale = async () => {
      try {
        const res = await axiosInstance.get(`/sales/${id}`);
        setSale(res.data.sale);
      } catch (error) {
        console.error(error);
        toast.error("Failed to fetch gate pass data");
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [id]);

  const gatePassHtml = useMemo(() => {
    if (!sale) return "";

    const items = Array.isArray(sale.products) ? sale.products : [];

    return buildInvoicePrintHtml({
      documentTitle: "Gate Pass",
      companyName: "Imran Traders",
      slogan: "Gate Pass",
      invoiceLabel: "Gate Pass #",
      invoiceNumber: sale.invoiceNumber || sale.invoice || sale.id || "-",
      issueLabel: "Date",
      issueDate: sale.createdAt || new Date().toISOString(),
      partyLabel: "Customer",
      partyName: sale.customerName || sale.customer?.name || "Customer",
      partyPhone: sale.customer?.contactInfo?.phone || sale.customer?.phone || "",
      partyAddress:
        sale.customer?.contactInfo?.address || sale.customer?.address || "",
      paymentMethod: sale.paymentMethod || "-",
      status: sale.status || "-",
      items: items.map((item) => ({
        name: item.product?.name || "Product",
        code: item.productCode?.code || "",
        quantity: Number(item.quantity || 0),
      })),
      showPrices: false,
      showSummaryBox: false,
      notes: sale.notes || "",
    });
  }, [sale]);

  const printGatePass = () => {
    if (!gatePassHtml) return;
    const printWindow = window.open("", "_blank", "width=900,height=650");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups.");
      return;
    }
    printWindow.document.write(gatePassHtml);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => printWindow.close(), 200);
    };
  };

  if (loading) return <p className="p-6">Loading gate pass...</p>;
  if (!sale) return <p className="p-6">Gate pass not found</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Back
        </button>

        <button
          onClick={printGatePass}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          Print Gate Pass
        </button>
      </div>

      <div className="relative bg-white rounded-xl shadow p-8 print:shadow-none print:p-0">
        <div className="h-[80vh] w-full overflow-hidden rounded-xl border bg-white shadow-sm">
          <iframe
            title="Gate Pass Preview"
            srcDoc={gatePassHtml}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}

export default GatePassPage;
