import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FiCheck, FiChevronLeft, FiCamera, FiAlertTriangle } from "react-icons/fi";
import Button from "../UI/Button";
import Inputfield from "../UI/Inputfield";
import BarcodeScannerModal from "../Components/BarcodeScannerModal";
import { fetchLocations } from "../features/warehouseSlice";
import {
  fetchReceiptById,
  updateReceiptLine,
  completeReceipt,
  clearActiveReceipt,
} from "../features/receivingSlice";

const CONDITIONS = [
  { value: "ACCEPTED", label: "Accepted", className: "bg-emerald-600" },
  { value: "DAMAGED", label: "Damaged", className: "bg-orange-600" },
  { value: "REJECTED", label: "Rejected", className: "bg-red-600" },
  { value: "QUARANTINE", label: "Quarantine", className: "bg-violet-600" },
];

const emptyForm = {
  receivedQty: "",
  batchNo: "",
  expiryDate: "",
  condition: "ACCEPTED",
  locationId: "",
};

const ReceiptDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { activeReceipt, activeLines, isLoadingReceipt, isSubmittingLine, isCompleting } =
    useSelector((state) => state.receiving);
  const { locations } = useSelector((state) => state.warehouse);

  const [processingLineId, setProcessingLineId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [scannerOpenFor, setScannerOpenFor] = useState(null); // "product" | "location"
  const [scanMismatch, setScanMismatch] = useState("");
  const [pendingOverReceipt, setPendingOverReceipt] = useState(null);
  // Code that was scanned/typed and matched the open line. Sent to the server,
  // which re-verifies it; the Confirm button stays disabled until it's set.
  const [verifiedCode, setVerifiedCode] = useState("");
  // Set when the server refuses to complete because lines are unprocessed.
  const [pendingPartial, setPendingPartial] = useState(null);

  useEffect(() => {
    dispatch(fetchReceiptById(id));
    return () => dispatch(clearActiveReceipt());
  }, [dispatch, id]);

  useEffect(() => {
    if (activeReceipt?.warehouse_id) {
      dispatch(fetchLocations(activeReceipt.warehouse_id));
    }
  }, [dispatch, activeReceipt?.warehouse_id]);

  const pendingLines = useMemo(
    () => activeLines.filter((line) => line.condition_status === "PENDING"),
    [activeLines],
  );
  const processedLines = useMemo(
    () => activeLines.filter((line) => line.condition_status !== "PENDING"),
    [activeLines],
  );
  const isCompleted = activeReceipt?.status === "COMPLETED";

  const openLine = (line) => {
    setProcessingLineId(line.id);
    setForm({ ...emptyForm, receivedQty: String(line.expected_qty) });
    setScanMismatch("");
    setPendingOverReceipt(null);
    setVerifiedCode("");
  };

  const submitLine = async (extra = {}) => {
    const line = activeLines.find((l) => l.id === processingLineId);
    if (!line) return;

    const qty = Number(form.receivedQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid received quantity");
      return;
    }
    if (!verifiedCode) {
      toast.error("Scan or type the product barcode to verify this item first");
      return;
    }
    if (form.condition === "ACCEPTED" && !form.locationId) {
      toast.error("Pick a putaway bin to accept this stock");
      return;
    }

    const result = await dispatch(
      updateReceiptLine({
        receiptId: id,
        lineId: line.id,
        receivedQty: qty,
        batchNo: form.batchNo || undefined,
        expiryDate: form.expiryDate || undefined,
        condition: form.condition,
        locationId: form.locationId ? Number(form.locationId) : undefined,
        scannedCode: verifiedCode,
        ...extra,
      }),
    );

    if (updateReceiptLine.fulfilled.match(result)) {
      toast.success(`${line.productName} marked ${form.condition.toLowerCase()}`);
      setProcessingLineId(null);
      setPendingOverReceipt(null);
      setVerifiedCode("");
    } else {
      const payload = result.payload;
      if (payload?.overReceived) {
        setPendingOverReceipt({ qty, expectedQty: payload.expectedQty });
      } else {
        toast.error(payload?.message || "Could not update this line");
      }
    }
  };

  const handleProductScan = (code) => {
    setScannerOpenFor(null);
    const line = activeLines.find((l) => l.id === processingLineId);
    if (!line) return;
    if (String(code).trim().toUpperCase() === String(line.productCodeValue).toUpperCase()) {
      setScanMismatch("");
      setVerifiedCode(String(code).trim());
      toast.success("Barcode matches this line");
    } else {
      setVerifiedCode("");
      setScanMismatch(
        `Scanned "${code}" does not match this line's code (${line.productCodeValue}).`,
      );
    }
  };

  const handleLocationScan = (code) => {
    setScannerOpenFor(null);
    const scanned = String(code).trim().toUpperCase();
    const match = locations.find(
      (loc) =>
        loc.code.toUpperCase() === scanned ||
        (loc.barcode && String(loc.barcode).toUpperCase() === scanned),
    );
    if (match) {
      setForm((f) => ({ ...f, locationId: String(match.id) }));
      toast.success(`Bin set to ${match.name}`);
    } else {
      toast.error(`No bin found for code "${code}"`);
    }
  };

  const handleComplete = async (allowPartial = false) => {
    const result = await dispatch(completeReceipt({ id, allowPartial }));
    if (completeReceipt.fulfilled.match(result)) {
      setPendingPartial(null);
      toast.success("Goods receipt completed");
    } else if (result.payload?.pendingLines) {
      // Don't silently drop unprocessed lines — ask the operator.
      setPendingPartial({ count: result.payload.pendingLines });
    } else {
      toast.error(result.payload?.message || "Could not complete receipt");
    }
  };

  if (isLoadingReceipt || !activeReceipt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading receipt…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => navigate("/warehouse/receiving")} className="text-slate-500">
          <FiChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-slate-900">{activeReceipt.receipt_no}</h1>
          <p className="text-xs text-slate-500">
            {activeReceipt.status} · Order #{activeReceipt.order_id}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        {pendingLines.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">To process</h2>
            <ul className="space-y-3">
              {pendingLines.map((line) => (
                <li
                  key={line.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <button
                    className="flex w-full items-center justify-between text-left"
                    onClick={() => (processingLineId === line.id ? setProcessingLineId(null) : openLine(line))}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{line.productName}</p>
                      <p className="text-xs text-slate-500">
                        {line.productCodeValue} · expected {line.expected_qty}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      PENDING
                    </span>
                  </button>

                  {processingLineId === line.id && (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      <div className="flex gap-2">
                        <Inputfield
                          label="Received quantity"
                          type="number"
                          min="0"
                          value={form.receivedQty}
                          onChange={(e) => setForm((f) => ({ ...f, receivedQty: e.target.value }))}
                          wrapperClassName="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-6 h-fit"
                          onClick={() => setScannerOpenFor("product")}
                          aria-label="Scan product barcode"
                        >
                          <FiCamera />
                        </Button>
                      </div>
                      <p
                        className={`text-xs ${verifiedCode ? "text-emerald-600" : "text-slate-500"}`}
                      >
                        {verifiedCode
                          ? `Item verified (${verifiedCode})`
                          : "Scan or type the product barcode to enable Confirm."}
                      </p>
                      {scanMismatch && (
                        <p className="flex items-center gap-1 text-xs text-orange-600">
                          <FiAlertTriangle /> {scanMismatch}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <Inputfield
                          label="Batch/lot # (optional)"
                          value={form.batchNo}
                          onChange={(e) => setForm((f) => ({ ...f, batchNo: e.target.value }))}
                        />
                        <Inputfield
                          label="Expiry date (optional)"
                          type="date"
                          value={form.expiryDate}
                          onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                        />
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-medium text-slate-600">Condition</p>
                        <div className="grid grid-cols-2 gap-2">
                          {CONDITIONS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, condition: c.value }))}
                              className={`rounded-lg py-3 text-sm font-medium text-white transition ${
                                form.condition === c.value ? c.className : "bg-slate-300"
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {form.condition === "ACCEPTED" && (
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              Putaway bin
                            </label>
                            <select
                              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
                              value={form.locationId}
                              onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}
                            >
                              <option value="">Select a bin…</option>
                              {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                  {loc.code} — {loc.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-6 h-fit"
                            onClick={() => setScannerOpenFor("location")}
                          >
                            <FiCamera />
                          </Button>
                        </div>
                      )}

                      {pendingOverReceipt ? (
                        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                          <p>
                            {pendingOverReceipt.qty} exceeds the expected{" "}
                            {pendingOverReceipt.expectedQty}. Confirm this is correct?
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => submitLine({ confirmOverReceipt: true })}
                              loading={isSubmittingLine}
                            >
                              Yes, confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPendingOverReceipt(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={() => submitLine()}
                          loading={isSubmittingLine}
                          disabled={!verifiedCode}
                        >
                          <FiCheck /> Confirm
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {processedLines.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Processed</h2>
            <ul className="space-y-2">
              {processedLines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{line.productName}</p>
                    <p className="text-xs text-slate-500">
                      qty {line.received_qty}
                      {line.locationCode ? ` · bin ${line.locationCode}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {String(line.condition_status).replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {!isCompleted && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-4">
          {pendingPartial ? (
            <div className="mx-auto max-w-2xl space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <p>
                {pendingPartial.count} line{pendingPartial.count === 1 ? "" : "s"} not
                processed yet. Complete anyway and record{" "}
                {pendingPartial.count === 1 ? "it" : "them"} as not received?
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleComplete(true)} loading={isCompleting}>
                  Complete anyway
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPendingPartial(null)}>
                  Keep processing
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className="mx-auto block w-full max-w-2xl"
              size="lg"
              onClick={() => handleComplete(false)}
              loading={isCompleting}
              disabled={!processedLines.length}
            >
              Complete Receipt
            </Button>
          )}
        </div>
      )}

      <BarcodeScannerModal
        open={scannerOpenFor === "product"}
        onClose={() => setScannerOpenFor(null)}
        onDetected={handleProductScan}
        title="Scan product barcode"
        helperText="Confirm this matches the expected item"
      />
      <BarcodeScannerModal
        open={scannerOpenFor === "location"}
        onClose={() => setScannerOpenFor(null)}
        onDetected={handleLocationScan}
        title="Scan bin barcode"
        helperText="Scan or type the bin code"
      />
    </div>
  );
};

export default ReceiptDetailPage;
