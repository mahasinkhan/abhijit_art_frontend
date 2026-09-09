// src/components/invoices/upiQr.ts
// ─────────────────────────────────────────────────────────────────────────
// The payment QR is GENERATED, not shipped as an image. A scanned/photographed
// QR is a raster: it blurs when zoomed and prints soft, and JPEG compression
// puts a grey halo on the module edges that hurts scan reliability. Generating
// it gives vector output at any size — and lets each invoice carry its own
// balance, so the customer's UPI app opens with the amount already filled in.
// ─────────────────────────────────────────────────────────────────────────
import QRCode from "qrcode";

/** The studio's UPI address (from the printed BHIM/UPI QR card). */
export const UPI_ID   = "9932913826@okbizaxis";
export const UPI_NAME = "Abhijit Art";

/** Builds the standard UPI deep link. Amount is optional — omit it and the
 *  payer types their own; pass it and their app pre-fills the balance due. */
export function upiPayload(amount?: number, note?: string): string {
  const p = new URLSearchParams({ pa: UPI_ID, pn: UPI_NAME, cu: "INR" });
  if (amount && amount > 0.005) p.set("am", amount.toFixed(2));
  if (note) p.set("tn", note.slice(0, 50));
  return `upi://pay?${p.toString()}`;
}

/** SVG data URI, safe to drop straight into an <img src>. Stays vector through
 *  browser print, so it never pixelates however large it's scaled. */
export async function qrSvgDataUri(payload: string): Promise<string> {
  try {
    const svg = await QRCode.toString(payload, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    });
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  } catch (e) {
    console.error("[qr] generation failed", e);
    return "";
  }
}