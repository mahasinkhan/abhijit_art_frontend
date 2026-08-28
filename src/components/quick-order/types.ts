// src/components/quick-order/types.ts
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
export const WA       = "#1fa855";
export const SANS     = "'DM Sans', system-ui, sans-serif";

export const PAGE = 50;

export interface OrderItem {
  itemId:   string | null;
  category: string;
  desc:     string;
  qty:      number;
  rate:     number;
  unit?:    string;
  custom:   boolean;
}

export interface AssigneeLite {
  id:   string;
  name: string;
  role: string;
}

export interface LinkedTask {
  id:           string;
  status:       "pending" | "in_progress" | "completed" | "cancelled";
  priority:     "low" | "medium" | "high" | "urgent";
  assignedTo:   AssigneeLite;
  createdBy:    { id: string; name: string };
  notes?:       string;
  startedAt?:   string;
  completedAt?: string;
  deliveredAt?: string;
  createdAt:    string;
}

export interface OrderPayment {
  id:          string;
  amount:      number;
  method:      "cash" | "online";
  note:        string;
  createdBy?:  { id: string; name: string } | null;
  createdAt:   string;
}

export interface QuickOrder {
  id:               string;
  title?:           string;
  customerId?:      string;
  customerName:     string;
  customerPhone:    string;
  customerEmail:    string;
  whatsapp?:        string;
  workDetails:      string;
  images:           string[];
  items:            Array<{ itemId?: string | null; desc: string; qty: number; rate: number; unit?: string }>;
  description:      string;
  amount:           number;
  lessAmount:       number;
  advancePaid:      number;
  paymentMethod:    "cash" | "online";
  status:           "unbilled" | "billed";
  invoiceNo?:       string;
  quantity?:        string;
  expectedDelivery?: string;
  task?:            LinkedTask | null;
  payments?:        OrderPayment[];
  entryDate:        string;
  createdAt:        string;
}

export type KhataEntry = QuickOrder;

export interface LedgerRow {
  customerId?:    string;
  customerName:   string;
  customerPhone:  string;
  totalOrders:    number;
  unbilledCount?: number;
  totalAmount:    number;
  totalLess:      number;
  totalAdvance:   number;
  totalDue:       number;
}

export interface CustomerRec  { id: string; name: string; phone: string; email: string; }
export interface EmployeeRec  { id: string; name: string; role: string; }

export interface InvStockItem {
  id: string; sku: string; name: string; category: string;
  unit: string; sellPrice?: string; quantity: string;
}

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

export const TASK_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: "Pending",     color: "#92400e", bg: "#fef3c7" },
  in_progress: { label: "In Progress", color: "#1d4ed8", bg: "#dbeafe" },
  completed:   { label: "Done",        color: GREEN,     bg: "#dcfce7" },
  cancelled:   { label: "Cancelled",   color: MUTE,      bg: "#f3f4f6" },
};

export const itemsSummary = (its: QuickOrder["items"]) => {
  if (!its.length) return "—";
  const parts = its.map(it => `${Number(it.qty)}× ${it.desc}`);
  if (parts.length <= 2) return parts.join(", ");
  return `${parts.slice(0, 2).join(", ")} +${parts.length - 2} more`;
};