import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

const DUPLICATE_DECODE_WINDOW_MS = 1500;

const PERMISSION_ERROR_NAMES = new Set([
  "NotAllowedError",
  "PermissionDeniedError",
  "SecurityError",
]);

const NO_CAMERA_ERROR_NAMES = new Set([
  "NotFoundError",
  "OverconstrainedError",
  "DevicesNotFoundError",
]);

// Product barcodes here are always 1D (CODE128 generated labels, or the
// manufacturer's own EAN/UPC/CODE39/ITF barcode). Restricting the decoder to
// these formats skips zxing's much slower 2D detectors (QR/DataMatrix/Aztec/
// PDF417), which is the single biggest win for scan speed.
const SCAN_HINTS = new Map([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.CODE_128,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
    ],
  ],
  // 1D-only decoding is cheap, so trying harder (rotation/threshold retries)
  // still stays fast while meaningfully improving hit rate on an angled scan.
  [DecodeHintType.TRY_HARDER, true],
]);

const SCAN_OPTIONS = {
  // Defaults to 500ms between attempts, which is most of the "it takes
  // forever" feeling — most of the wait is idle, not decoding.
  delayBetweenScanAttempts: 75,
  delayBetweenScanSuccess: 200,
};

const VIDEO_CONSTRAINTS = {
  facingMode: { ideal: "environment" },
  width: { ideal: 1280 },
  height: { ideal: 720 },
  advanced: [{ focusMode: "continuous" }],
};

/**
 * Wraps @zxing/browser's continuous video decoding into start/stop + status state.
 * `active` toggles the camera on/off; the generation counter guards against a
 * slow-starting camera stream landing after the caller already asked to stop
 * (e.g. the scanner modal was closed mid-permission-prompt).
 */
const useBarcodeScanner = ({ onDecode, active = false } = {}) => {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const lastDecodeRef = useRef({ text: "", time: 0 });
  const onDecodeRef = useRef(onDecode);
  const generationRef = useRef(0);
  onDecodeRef.current = onDecode;

  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const stop = useCallback(() => {
    generationRef.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("no-camera");
      setErrorMessage("Camera access isn't supported in this browser.");
      return;
    }

    generationRef.current += 1;
    const generation = generationRef.current;
    setStatus("starting");
    setErrorMessage("");

    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader(SCAN_HINTS, SCAN_OPTIONS);
    }

    try {
      const controls = await readerRef.current.decodeFromConstraints(
        { video: VIDEO_CONSTRAINTS },
        videoRef.current,
        (result) => {
          if (!result || generationRef.current !== generation) return;

          const text = result.getText();
          const now = Date.now();
          const last = lastDecodeRef.current;

          if (text === last.text && now - last.time < DUPLICATE_DECODE_WINDOW_MS) {
            return;
          }

          lastDecodeRef.current = { text, time: now };
          onDecodeRef.current?.(text);
        },
      );

      if (generationRef.current !== generation) {
        controls.stop();
        return;
      }

      controlsRef.current = controls;
      setStatus("scanning");
    } catch (error) {
      if (generationRef.current !== generation) return;

      if (PERMISSION_ERROR_NAMES.has(error?.name)) {
        setStatus("permission-denied");
        setErrorMessage(
          "Camera permission was denied. You can still type the code manually below.",
        );
      } else if (NO_CAMERA_ERROR_NAMES.has(error?.name)) {
        setStatus("no-camera");
        setErrorMessage("No camera was found on this device.");
      } else {
        setStatus("error");
        setErrorMessage(error?.message || "Unable to start the camera.");
      }
    }
  }, []);

  useEffect(() => {
    if (active) {
      start();
    }

    return () => {
      stop();
    };
  }, [active, start, stop]);

  return { videoRef, status, errorMessage, start, stop };
};

export default useBarcodeScanner;
