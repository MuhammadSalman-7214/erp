import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiCamera, FiCheckCircle } from "react-icons/fi";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";
import { buildInvoicePrintHtml } from "../lib/invoicePrintTemplate";
import { PreviewSkeleton } from "../Components/LoadingSkeletons";
import { Button } from "../UI";
import { useCompanyBranding } from "../hooks/useCompanyBranding";
import BarcodeScannerModal from "../Components/BarcodeScannerModal";
import { renderBarcodeDataUrl } from "../lib/barcodeLabel";

function GatePassPage() {
  const companyBranding = useCompanyBranding();
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVerifyScanner, setShowVerifyScanner] = useState(false);
  const [scannedCounts, setScannedCounts] = useState({});
  const [scanWarnings, setScanWarnings] = useState([]);

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

  const saleItems = useMemo(
    () => (Array.isArray(sale?.products) ? sale.products : []),
    [sale],
  );

  const gatePassHtml = useMemo(() => {
    if (!sale) return "";

    return buildInvoicePrintHtml({
      documentTitle: "Gate Pass",
      companyName: companyBranding.companyName,
      slogan: companyBranding.companyDescription || "Gate Pass",
      logoUrl: companyBranding.companyLogo,
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
      items: saleItems.map((item) => {
        const code = item.productCode?.code || "";
        return {
          name: item.product?.name || "Product",
          code,
          quantity: Number(item.quantity || 0),
          barcodeDataUrl: code
            ? renderBarcodeDataUrl(code, { width: 1.3, height: 26 })
            : "",
        };
      }),
      showPrices: false,
      showSummaryBox: false,
      notes: sale.notes || "",
    });
  }, [
    sale,
    saleItems,
    companyBranding.companyName,
    companyBranding.companyDescription,
    companyBranding.companyLogo,
  ]);

  const checklist = useMemo(
    () =>
      saleItems.map((item) => {
        const codeId = String(
          item.productCode?.id ?? item.productCode ?? item.product?.id ?? "",
        );
        const expectedQty = Number(item.quantity || 0);
        const scannedQty = Number(scannedCounts[codeId] || 0);
        return {
          codeId,
          name: item.product?.name || "Product",
          code: item.productCode?.code || "-",
          expectedQty,
          scannedQty,
          complete: scannedQty >= expectedQty && expectedQty > 0,
          over: scannedQty > expectedQty,
        };
      }),
    [saleItems, scannedCounts],
  );

  const allVerified =
    checklist.length > 0 && checklist.every((row) => row.complete && !row.over);

  const handleVerifyScan = (rawCode) => {
    const scanned = String(rawCode || "").trim();
    if (!scanned) return;

    const normalized = scanned.toLowerCase();
    const matchedItem = saleItems.find(
      (item) => String(item.productCode?.code || "").toLowerCase() === normalized,
    );

    if (!matchedItem) {
      setScanWarnings((prev) => [scanned, ...prev].slice(0, 10));
      toast.error(`"${scanned}" is not part of this gate pass`);
      return;
    }

    const codeId = String(
      matchedItem.productCode?.id ??
        matchedItem.productCode ??
        matchedItem.product?.id ??
        "",
    );
    const expected = Number(matchedItem.quantity || 0);
    const nextCount = Number(scannedCounts[codeId] || 0) + 1;

    setScannedCounts((prev) => ({ ...prev, [codeId]: nextCount }));

    if (nextCount > expected) {
      toast.error(
        `Scanned more ${matchedItem.product?.name || "item"} than expected (${nextCount}/${expected})`,
      );
    } else {
      toast.success(
        `${matchedItem.product?.name || "Item"} ${nextCount}/${expected}`,
      );
    }
  };

  const resetVerification = () => {
    setScannedCounts({});
    setScanWarnings([]);
  };

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

  if (loading) return <PreviewSkeleton />;
  if (!sale) return <p className="p-6">Gate pass not found</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <Button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Back
        </Button>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowVerifyScanner(true)}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
          >
            <FiCamera size={16} className="inline -mt-0.5 mr-1.5" />
            Verify by Scanning
          </Button>
          <Button
            onClick={printGatePass}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Print Gate Pass
          </Button>
        </div>
      </div>

      {checklist.length > 0 && (
        <div className="mb-4 rounded-xl border bg-white p-4 shadow-sm print:hidden">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Dispatch Checklist
            </h3>
            <div className="flex items-center gap-3">
              {allVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <FiCheckCircle size={14} /> All items verified
                </span>
              )}
              <Button onClick={resetVerification} variant="outline" size="sm">
                Reset
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            {checklist.map((row) => (
              <div
                key={row.codeId}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                  row.over
                    ? "border-red-200 bg-red-50"
                    : row.complete
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="min-w-0 truncate">
                  <span className="font-medium text-slate-800">{row.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{row.code}</span>
                </div>
                <div
                  className={`font-semibold ${
                    row.over
                      ? "text-red-600"
                      : row.complete
                        ? "text-emerald-700"
                        : "text-slate-600"
                  }`}
                >
                  {row.scannedQty}/{row.expectedQty}
                </div>
              </div>
            ))}
          </div>

          {scanWarnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Scanned codes not on this gate pass: {scanWarnings.join(", ")}
            </div>
          )}
        </div>
      )}

      <div className="relative bg-white rounded-xl shadow p-8 print:shadow-none print:p-0">
        <div className="h-[80vh] w-full overflow-hidden rounded-xl border bg-white shadow-sm">
          <iframe
            title="Gate Pass Preview"
            srcDoc={gatePassHtml}
            className="h-full w-full border-0"
          />
        </div>
      </div>
      <BarcodeScannerModal
        open={showVerifyScanner}
        onClose={() => setShowVerifyScanner(false)}
        onDetected={handleVerifyScan}
        continuous
        title="Verify items by scanning"
        helperText="Scan each physical item before dispatch to check it against this gate pass."
        manualPlaceholder="Type product code"
      />
    </div>
  );
}

export default GatePassPage;
