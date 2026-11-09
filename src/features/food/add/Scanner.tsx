import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

/** Camera barcode scanner. Uses ZXing in JS because iPhone Safari has no built-in BarcodeDetector. */
export default function Scanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const done = useRef(false);

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
    let controls: IScannerControls | undefined;
    let cancelled = false;
    reader
      .decodeFromConstraints({ video: { facingMode: { ideal: "environment" } }, audio: false }, video.current!, (result, _err, c) => {
        if (result && !done.current) {
          done.current = true;
          c.stop();
          navigator.vibrate?.(40);
          onCode(result.getText());
        }
      })
      .then((c) => { controls = c; if (cancelled) c.stop(); })
      .catch((e: Error) => {
        setError(e?.name === "NotAllowedError"
          ? "Camera access was blocked. Allow camera access for this site in your phone's settings, then try again."
          : "Couldn't start the camera. You can type the barcode number below instead.");
      });
    return () => { cancelled = true; controls?.stop(); };
  }, [onCode]);

  return (
    <div className="field">
      <div className="scanner">
        <video ref={video} muted playsInline />
        {!error && <div className="aim" />}
      </div>
      {error ? <span className="help-err">{error}</span> : <span className="small muted">Point the camera at the barcode and hold steady.</span>}
    </div>
  );
}
