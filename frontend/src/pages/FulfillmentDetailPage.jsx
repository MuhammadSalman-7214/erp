import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FiCheck, FiChevronLeft, FiCamera, FiAlertTriangle, FiX } from "react-icons/fi";
import Button from "../UI/Button";
import BarcodeScannerModal from "../Components/BarcodeScannerModal";
import {
  fetchFulfillmentById,
  confirmPickLine,
  dispatchFulfillment,
  cancelFulfillment,
  clearActiveFulfillment,
} from "../features/fulfillmentSlice";

const FulfillmentDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    activeFulfillment,
    activeLines,
    isLoadingFulfillment,
    isSubmittingLine,
    isDispatching,
  } = useSelector((state) => state.fulfillment);

  const [scanningLineId, setScanningLineId] = useState(null);
  const [scanMismatch, setScanMismatch] = useState("");
  // lineId -> the code that was scanned/typed and matched. Sent to the server on
  // confirm, which re-verifies it — the button gate below is only the UX half.
  const [scannedCodes, setScannedCodes] = useState({});
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    dispatch(fetchFulfillmentById(id));
    return () => dispatch(clearActiveFulfillment());
  }, [dispatch, id]);

  const isTerminal = ["DISPATCHED", "CANCELLED"].includes(activeFulfillment?.status);
  const reservedLines = activeLines.filter((l) => l.status === "RESERVED");
  const pickedLines = activeLines.filter((l) => l.status === "PICKED");
  const dispatchedLines = activeLines.filter((l) => l.status === "DISPATCHED");
  const allPicked = activeLines.length > 0 && reservedLines.length === 0 && !isTerminal;

  const handleScan = (lineId) => (code) => {
    setScanningLineId(null);
    const line = activeLines.find((l) => l.id === lineId);
    if (!line) return;
    if (String(code).trim().toUpperCase() === String(line.productCodeValue).toUpperCase()) {
      setScanMismatch("");
      setScannedCodes((prev) => ({ ...prev, [lineId]: String(code).trim() }));
      toast.success("Barcode matches — ready to confirm pick");
    } else {
      setScanMismatch(
        `Scanned "${code}" does not match this line's code (${line.productCodeValue}).`,
      );
    }
  };

  const handleConfirmPick = async (lineId) => {
    const scannedCode = scannedCodes[lineId];
    if (!scannedCode) {
      toast.error("Scan or type the product barcode first");
      return;
    }
    const result = await dispatch(
      confirmPickLine({ fulfillmentId: id, lineId, scannedCode }),
    );
    if (confirmPickLine.fulfilled.match(result)) {
      toast.success("Picked");
      setScannedCodes((prev) => {
        const next = { ...prev };
        delete next[lineId];
        return next;
      });
    } else {
      toast.error(result.payload || "Could not confirm pick");
    }
  };

  const handleDispatch = async () => {
    const result = await dispatch(dispatchFulfillment(id));
    if (dispatchFulfillment.fulfilled.match(result)) {
      toast.success("Dispatched — sale marked completed");
    } else {
      toast.error(result.payload || "Could not dispatch");
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    const result = await dispatch(cancelFulfillment(id));
    setIsCancelling(false);
    if (cancelFulfillment.fulfilled.match(result)) {
      toast.success("Fulfillment cancelled");
      navigate("/warehouse/fulfillment");
    } else {
      toast.error(result.payload || "Could not cancel fulfillment");
    }
  };

  if (isLoadingFulfillment || !activeFulfillment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading fulfillment…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => navigate("/warehouse/fulfillment")} className="text-slate-500">
          <FiChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            {activeFulfillment.fulfillment_no}
          </h1>
          <p className="text-xs text-slate-500">
            {activeFulfillment.status} · Sale #{activeFulfillment.sale_id}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        {reservedLines.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">To pick</h2>
            <ul className="space-y-3">
              {reservedLines.map((line) => {
                const isConfirmedByScan = Boolean(scannedCodes[line.id]);
                return (
                  <li
                    key={line.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{line.productName}</p>
                        <p className="text-xs text-slate-500">
                          {line.productCodeValue} · qty {line.quantity}
                        </p>
                      </div>
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                        RESERVED
                      </span>
                    </div>

                    {!isConfirmedByScan && !scanMismatch && (
                      <p className="mt-2 text-xs text-slate-500">
                        Scan or type the barcode to enable Confirm Pick.
                      </p>
                    )}

                    {scanMismatch && scanningLineId === null && (
                      <p className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                        <FiAlertTriangle /> {scanMismatch}
                      </p>
                    )}

                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScanMismatch("");
                          setScanningLineId(line.id);
                        }}
                        className="flex-1"
                      >
                        <FiCamera /> {isConfirmedByScan ? "Scanned ✓" : "Scan to verify"}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleConfirmPick(line.id)}
                        loading={isSubmittingLine}
                        disabled={!isConfirmedByScan}
                      >
                        <FiCheck /> Confirm Pick
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {pickedLines.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Picked, awaiting dispatch</h2>
            <ul className="space-y-2">
              {pickedLines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{line.productName}</p>
                    <p className="text-xs text-slate-500">qty {line.quantity}</p>
                  </div>
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                    PICKED
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {dispatchedLines.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Dispatched</h2>
            <ul className="space-y-2">
              {dispatchedLines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{line.productName}</p>
                    <p className="text-xs text-slate-500">qty {line.quantity}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    DISPATCHED
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {!isTerminal && (
        <div className="fixed inset-x-0 bottom-0 flex gap-2 border-t border-slate-200 bg-white p-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
            loading={isCancelling}
          >
            <FiX /> Cancel
          </Button>
          <Button
            className="flex-[2]"
            size="lg"
            onClick={handleDispatch}
            loading={isDispatching}
            disabled={!allPicked}
          >
            Dispatch
          </Button>
        </div>
      )}

      <BarcodeScannerModal
        open={scanningLineId !== null}
        onClose={() => setScanningLineId(null)}
        onDetected={scanningLineId !== null ? handleScan(scanningLineId) : undefined}
        title="Scan product barcode"
        helperText="Confirm this matches the item you're about to pick"
      />
    </div>
  );
};

export default FulfillmentDetailPage;
