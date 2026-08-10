import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCamera, FiX } from "react-icons/fi";
import useBarcodeScanner from "../hooks/useBarcodeScanner";
import Button from "../UI/Button";
import Inputfield from "../UI/Inputfield";

const playBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
    oscillator.onended = () => ctx.close();
  } catch {
    // Best-effort feedback only — safe to skip if the browser blocks it.
  }
};

/**
 * Camera-based barcode scanner modal with an always-visible manual fallback.
 * `continuous`/the "keep scanning" checkbox let a caller (e.g. a sales cart)
 * add several items without the modal closing after each scan.
 */
const BarcodeScannerModal = ({
  open,
  onClose,
  onDetected,
  title = "Scan a barcode",
  helperText = "Scan a product barcode, or type the code below.",
  continuous = false,
  manualPlaceholder = "Type the code",
}) => {
  const [manualCode, setManualCode] = useState("");
  const [keepScanning, setKeepScanning] = useState(continuous);
  const [lastScanned, setLastScanned] = useState("");
  const manualInputRef = useRef(null);

  const handleDecode = (text) => {
    setLastScanned(text);
    playBeep();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(80);
    }
    onDetected?.(text);
    if (!keepScanning) {
      onClose?.();
    }
  };

  const { videoRef, status, errorMessage } = useBarcodeScanner({
    active: open,
    onDecode: handleDecode,
  });

  useEffect(() => {
    if (open) {
      setManualCode("");
      setKeepScanning(continuous);
      setLastScanned("");
    }
  }, [open, continuous]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const handleManualSubmit = (event) => {
    event.preventDefault();
    const trimmed = manualCode.trim();
    if (!trimmed) return;

    setLastScanned(trimmed);
    onDetected?.(trimmed);
    setManualCode("");

    if (!keepScanning) {
      onClose?.();
    } else {
      manualInputRef.current?.focus();
    }
  };

  const cameraNotice = useMemo(() => {
    if (
      status === "permission-denied" ||
      status === "no-camera" ||
      status === "error"
    ) {
      return errorMessage;
    }
    return "";
  }, [status, errorMessage]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-slate-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500">{helperText}</p>
          </div>
          <Button onClick={onClose} variant="outline" size="sm" aria-label="Close">
            <FiX size={16} />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-slate-900">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              autoPlay
              playsInline
            />
            {status !== "scanning" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/85 px-4 text-center text-sm text-slate-200">
                <FiCamera size={22} />
                <span>
                  {status === "starting"
                    ? "Starting camera…"
                    : cameraNotice || "Camera preview will appear here."}
                </span>
              </div>
            )}
            {status === "scanning" && (
              <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-teal-400/80" />
            )}
          </div>

          {lastScanned && (
            <div className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-700">
              Scanned: {lastScanned}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={keepScanning}
              onChange={(event) => setKeepScanning(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Keep scanning (add multiple items without closing)
          </label>

          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-xs font-medium text-slate-600">
              Or enter the code manually
            </label>
            <div className="flex gap-2">
              <Inputfield
                ref={manualInputRef}
                type="text"
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder={manualPlaceholder}
                autoFocus={status !== "scanning"}
                wrapperClassName="flex-1"
              />
              <Button type="submit" variant="primary" size="sm">
                Add
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default BarcodeScannerModal;
