// src/components/quick-order/types.ts
// ── Shared types, design tokens, and pure helpers for Quick Orders ─────────

// ── Design tokens (match Stock Items / inventory) ──
export const TERRA    = "#d9542f";
export const TERRA_DK = "#b8421f";
export const GOLD     = "#c2974a";
export const INK      = "#1f2430";
export const BODY     = "#454a57";
export const MUTE     = "#8a8f9a";
export const LINE     = "#ece8e0";
export const IVORY    = "#faf8f4";
export const CARD     = "#ffffff";
export const GREEN    = "#15803d";
export const SANS     = "'DM Sans', system-ui, sans-serif";

export const PAGE = 50; // client-side pagination chunk

// ── Types ──
export interface OrderItem {
  itemId: string | null;   // inventory link (null = custom/free-text)
  category: string;        // UI-only: selected category (for the 2-step picker)
  desc:   string;
  qty:    number;
  rate:   number;
  unit?:  string;
  custom: boolean;         // UI-only: true = free text, false = from stock
}

export interface KhataEntry {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: Array<{ itemId?: string | null; desc: string; qty: number; rate: number; unit?: string }>;
  description: string;
  amount: number;
  advancePaid: number;
  paymentMethod: "cash" | "online";
  status: "unbilled" | "billed";
  invoiceNo?: string;
  entryDate: string;
  createdAt: string;
}

export interface LedgerRow {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  totalOrders: number;
  unbilledCount?: number;
  totalAmount: number;
  totalAdvance: number;
  totalDue: number;
}

export interface CustomerRec { id: string; name: string; phone: string; email: string; }

// Inventory item shape used by the entry drawer's stock dropdown
export interface InvStockItem {
  id: string; sku: string; name: string; category: string;
  unit: string; sellPrice?: string; quantity: string;
}

// ── Helpers ──
export const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const dec = (v: any): number => { const n = parseFloat(String(v ?? 0)); return Number.isFinite(n) ? n : 0; };
export function todayStr() { return new Date().toISOString().slice(0, 10); }
export function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
export function fmtTimeSec(d: string) {
  if (!d) return "";
  const dt = new Date(d); if (isNaN(dt.getTime())) return "";
  return dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}
export const isRealEmail = (e: string) =>
  !!e && e.includes("@") && !/^walkin_/i.test(e) && !/@noemail\./i.test(e);

export const EMPTY_ITEM = (): OrderItem => ({ itemId: null, category: "", desc: "", qty: 1, rate: 0, custom: false });

// items summary for a table cell
export const itemsSummary = (its: KhataEntry["items"]) => {
  const parts = its.map(it => `${Number(it.qty)}× ${it.desc}`);
  if (parts.length <= 2) return parts.join(", ");
  return `${parts.slice(0, 2).join(", ")} +${parts.length - 2} more`;
};