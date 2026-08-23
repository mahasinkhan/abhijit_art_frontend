import { useEffect, useMemo, useState } from "react";
import api from "../api";

/* ══════════════════════════════════════════════════════════════
   INVOICES  ·  saved-bills history

   Stored bills (POST /invoices): search (invoice no / name / phone / email),
   filter by a period preset (today → year-to-date) + status, re-download the
   exact PDF, EDIT the bill in place, record payments and review the full
   PAYMENT HISTORY (each payment is cash or online), cancel, delete, and SEND
   the invoice to the client by Email or WhatsApp. Sensitive actions require
   the security PIN. Prefix ivh-.

   PAYMENT LEDGER: every payment (advance + each part payment) is its own row
   with amount + cash|online. The invoice's paidAmount is the SUM of that
   ledger. Stat cards break Received down into Cash vs Online for the period.
   ══════════════════════════════════════════════════════════════ */

/* ── tokens (shared with InvoiceMaker) ── */
const INK = "#1f2430";
const BODY = "#545a67";
const MUTE = "#8a8f9a";
const FAINT = "#b6bac3";
const LINE = "#f0e6dc";
const LINE_COOL = "#ececf1";
const SOFT = "#fafbfc";
const CARD = "#ffffff";
const TERRA = "#d9542f";
const TERRA_DK = "#c8481f";
const GREEN = "#15733f";
const WA = "#1fa855";     // WhatsApp accent green
const WA_DK = "#178544";
const SANS = "'DM Sans', system-ui, sans-serif";

const GLOW =
  "radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.075) 0%, rgba(217,84,47,.022) 42%, rgba(217,84,47,0) 72%), linear-gradient(180deg, #fffcf9 0%, #ffffff 60%)";
const GLOW_SHADOW = "0 1px 2px rgba(17,20,30,.04), 0 10px 26px -18px rgba(217,84,47,.28)";

/* how long a PIN-gated request may take before we give up */
const REQ_TIMEOUT = 15000;

/* ── helpers ── */
const num = (v: any) => {
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const rupee = (v: any) =>
  "₹" + num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
/* Date → yyyy-mm-dd for <input type="date">, in LOCAL time */
const toDateInput = (d: string) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const signStamp = () =>
  new Date().toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
const escapeHtml = (s: any) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const escapeLines = (s: any) => escapeHtml(s).replace(/\r?\n/g, "<br/>");
const csvCell = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;
/* normalise a phone for wa.me — digits only; a bare 10-digit Indian mobile gets +91 */
const waDigits = (raw: string) => {
  let d = String(raw || "").replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10) d = "91" + d;
  return d;
};

const errMessage = (e: any, fallback: string) => {
  if (e?.code === "ECONNABORTED") return "The server didn't respond in time. Check the backend is running, then try again.";
  if (e?.message === "Network Error") return "Couldn't reach the server. Is the backend running?";
  return e?.response?.data?.message || fallback;
};

const deriveStatus = (paid: number, total: number): InvStatus => {
  if (paid <= 0.005) return "unpaid";
  if (paid + 0.005 >= total) return "paid";
  return "partial";
};

const calcTotals = (items: { qty: any; rate: any }[], discType: "amount" | "percent", discVal: any, taxPct: any) => {
  const subtotal = items.reduce((s, it) => s + num(it.qty) * num(it.rate), 0);
  const dv = num(discVal);
  const discountAmt = discType === "percent" ? (subtotal * dv) / 100 : Math.min(dv, subtotal);
  const taxable = Math.max(subtotal - discountAmt, 0);
  const taxAmt = (taxable * num(taxPct)) / 100;
  const total = taxable + taxAmt;
  return { subtotal: round2(subtotal), discountAmt: round2(discountAmt), taxAmt: round2(taxAmt), total: round2(total) };
};

/* ── period presets (period-to-date windows ending now) ── */
type Period = "all" | "today" | "week" | "month" | "quarter" | "half" | "year";
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
  { value: "half", label: "Half-yearly" },
  { value: "year", label: "Yearly" },
];
const PERIOD_LABEL: Record<Period, string> = {
  all: "all time", today: "today", week: "this week", month: "this month",
  quarter: "this quarter", half: "this half-year", year: "this year",
};
/* start of the selected window in local time, or null for all time */
const periodSince = (p: Period): Date | null => {
  if (p === "all") return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (p) {
    case "today": return startOfToday;
    case "week": {
      const dow = (startOfToday.getDay() + 6) % 7; // Mon=0 … Sun=6
      return new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - dow);
    }
    case "month": return new Date(now.getFullYear(), now.getMonth(), 1);
    case "quarter": return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case "half": return new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
    case "year": return new Date(now.getFullYear(), 0, 1);
    default: return null;
  }
};

/* ── types ── */
type StoredItem = { desc: string; qty: number; rate: number };
type Business = { name?: string; address?: string; phone?: string; email?: string; gstin?: string; pan?: string };
type InvStatus = "unpaid" | "partial" | "paid" | "cancelled";
type InvSource = "online" | "offline";
type InvMethod = "cash" | "online";
type Payment = { id: string; amount: string; method: InvMethod; note: string | null; createdAt: string };
type Invoice = {
  id: string;
  invoiceNo: string;
  date: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  clientGstin: string | null;
  clientAddr: string | null;
  source: InvSource;
  business: Business;
  items: StoredItem[];
  discType: "amount" | "percent";
  discVal: string;
  taxPct: string;
  subtotal: string;
  discountAmt: string;
  taxAmt: string;
  total: string;
  paidAmount: string;
  payments: Payment[];
  notes: string | null;
  warranty: string | null;
  status: InvStatus;
  createdAt: string;
  updatedAt: string;
  pdfUrl?: string | null; // signed public PDF link, attached by the backend on GET
};

type EditItem = { desc: string; qty: string; rate: string };
type EditForm = {
  date: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientGstin: string;
  clientAddr: string;
  source: InvSource;
  items: EditItem[];
  discType: "amount" | "percent";
  discVal: string;
  taxPct: string;
  notes: string;
  warranty: string;
};

const STATUS_META: Record<InvStatus, { label: string; fg: string; bg: string; bd: string; dot: string }> = {
  unpaid:    { label: "Unpaid",    fg: "#9a6a12", bg: "#fbf3e3", bd: "#efdcb2", dot: "#e0a83e" },
  partial:   { label: "Partial",   fg: "#1d5fd8", bg: "#eaf0fc", bd: "#cbdbf6", dot: "#3b74e0" },
  paid:      { label: "Paid",      fg: "#15733f", bg: "#e8f6ee", bd: "#bfe3cd", dot: "#28a35f" },
  cancelled: { label: "Cancelled", fg: "#6b7280", bg: "#f1f2f5", bd: "#e4e5ea", dot: "#9aa0ab" },
};
const STATUSES: InvStatus[] = ["unpaid", "partial", "paid", "cancelled"];
const badgeStyle = (s: InvStatus): React.CSSProperties => ({
  color: STATUS_META[s].fg, background: STATUS_META[s].bg, borderColor: STATUS_META[s].bd,
});

const SOURCE_META: Record<InvSource, { label: string; fg: string; bg: string; bd: string }> = {
  online:  { label: "Online",  fg: "#3a6ea5", bg: "#eef4fb", bd: "#d5e4f4" },
  offline: { label: "Walk-in", fg: "#9a6a3a", bg: "#f7efe6", bd: "#ecdcc9" },
};
const srcMeta = (s: any) => SOURCE_META[(s as InvSource) === "online" ? "online" : "offline"];

const METHOD_META: Record<InvMethod, { label: string; fg: string; bg: string; bd: string; icon: string }> = {
  cash:   { label: "Cash",   fg: "#4a7a52", bg: "#eef5ef", bd: "#cfe3d2", icon: "banknote" },
  online: { label: "Online", fg: "#5b52a3", bg: "#efeefb", bd: "#dcd8f2", icon: "card" },
};
const MIXED_META = { label: "Mixed", fg: "#6b6f7a", bg: "#f1f2f4", bd: "#e0e2e7", icon: "coins" };
const methMeta = (m: any) => METHOD_META[(m as InvMethod) === "online" ? "online" : "cash"];

const methodSummary = (inv: Invoice): { label: string; fg: string; bg: string; bd: string; icon: string } | null => {
  const ps = Array.isArray(inv.payments) ? inv.payments : [];
  if (!ps.length) return null;
  const set = new Set(ps.map((p) => (p.method === "online" ? "online" : "cash")));
  if (set.size > 1) return MIXED_META;
  return set.has("online") ? METHOD_META.online : METHOD_META.cash;
};

const effectivePaid = (inv: Invoice): number => {
  const total = num(inv.total);
  if (inv.status === "paid") return round2(total);
  if (inv.status === "unpaid") return 0;
  return round2(Math.min(Math.max(num(inv.paidAmount), 0), total));
};

/* ── icons ── */
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const map: Record<string, JSX.Element> = {
    download: (<><path d="M12 3v12M7 10l5 5 5-5" {...p} /><path d="M5 21h14" {...p} /></>),
    trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" {...p} />,
    search: (<><circle cx="11" cy="11" r="7" {...p} /><path d="m21 21-4.3-4.3" {...p} /></>),
    refresh: <path d="M20 11a8 8 0 1 0-1.5 5.5M20 5v6h-6" {...p} />,
    receipt: <path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21zM9 8h6M9 12h6M9 16h4" {...p} />,
    csv: (<><path d="M14 3v5h5" {...p} /><path d="M6 3h8l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" {...p} /><path d="M9 13h6M9 17h4" {...p} /></>),
    banknote: (<><rect x="2" y="6" width="20" height="12" rx="2" {...p} /><circle cx="12" cy="12" r="2.5" {...p} /><path d="M6 12h.01M18 12h.01" {...p} /></>),
    card: (<><rect x="2.5" y="5" width="19" height="14" rx="2" {...p} /><path d="M2.5 9.5h19" {...p} /></>),
    coins: (<><ellipse cx="9" cy="6.5" rx="5.5" ry="2.8" {...p} /><path d="M3.5 6.5v4c0 1.5 2.5 2.8 5.5 2.8s5.5-1.3 5.5-2.8v-4" {...p} /><path d="M9 13.3v3.9c0 1.5 2.5 2.8 5.5 2.8s5.5-1.3 5.5-2.8v-4" {...p} /></>),
    lock: (<><rect x="5" y="11" width="14" height="10" rx="2" {...p} /><path d="M8 11V7a4 4 0 0 1 8 0v4" {...p} /></>),
    edit: (<><path d="M12 20h9" {...p} /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" {...p} /></>),
    plus: <path d="M12 5v14M5 12h14" {...p} />,
    x: <path d="M18 6 6 18M6 6l12 12" {...p} />,
    mail: <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3.2 6.5 12 13l8.8-6.5" {...p} />,
    /* WhatsApp: outlined bubble + solid handset */
    whatsapp: (
      <>
        <path d="M3.8 20.2 5 16.4A8.4 8.4 0 1 1 8.2 19l-4.4 1.2z" {...p} />
        <path
          d="M9.2 8.6c-.15 0-.4.05-.6.3-.2.25-.75.73-.75 1.77s.77 2.05.88 2.2c.1.14 1.5 2.4 3.68 3.28 1.83.72 2.2.58 2.6.55.4-.04 1.24-.5 1.42-1 .18-.5.18-.9.12-1l-.55-.27s-1.05-.52-1.22-.58c-.16-.06-.28-.1-.4.1l-.55.7c-.1.12-.2.13-.37.05-.16-.08-.9-.33-1.66-1.05-.6-.55-1.02-1.22-1.14-1.42-.1-.2-.01-.3.07-.4l.28-.35c.1-.12.13-.2.2-.34.06-.13.03-.25 0-.35-.05-.1-.4-1.13-.6-1.55-.14-.3-.28-.3-.4-.3H9.2z"
          fill="currentColor"
          stroke="none"
        />
      </>
    ),
  };
  return (<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>{map[name]}</svg>);
}

function SuccessPanel({ title, detail, tone = GREEN }: { title: string; detail?: string; tone?: string }) {
  return (
    <div className="ivh-success" style={st.success}>
      <div className="ivh-successring" style={{ ...st.successRing, background: `${tone}14`, borderColor: `${tone}44` }}>
        <svg width="46" height="46" viewBox="0 0 52 52" aria-hidden>
          <circle className="ivh-checkcircle" cx="26" cy="26" r="23" fill="none" stroke={tone} strokeWidth="3" />
          <path className="ivh-checkmark" fill="none" stroke={tone} strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round" d="M15 27 L23 34 L38 18" />
        </svg>
      </div>
      <div className="ivh-successtitle" style={{ ...st.successTitle, color: tone }}>{title}</div>
      {detail && <div className="ivh-successsub" style={st.successSub}>{detail}</div>}
    </div>
  );
}

/* ════════════════════════ re-download ════════════════════════ */
function printInvoice(inv: Invoice) {
  const biz = inv.business || {};
  const bizName = escapeHtml(biz.name) || "Abhijit Art";
  const items = Array.isArray(inv.items) ? inv.items : [];

  const subtotal = num(inv.subtotal);
  const discountAmt = num(inv.discountAmt);
  const taxAmt = num(inv.taxAmt);
  const total = num(inv.total);
  const discVal = num(inv.discVal);
  const taxPct = num(inv.taxPct);
  const paid = effectivePaid(inv);
  const due = round2(Math.max(total - paid, 0));

  const rows = items
    .map(
      (it, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td>${escapeHtml(it.desc) || "—"}</td>
        <td class="r">${num(it.qty)}</td>
        <td class="r">${rupee(num(it.rate))}</td>
        <td class="r">${rupee(num(it.qty) * num(it.rate))}</td>
      </tr>`,
    )
    .join("");

  const totRows =
    `<tr><td class="lbl">Subtotal</td><td class="r">${rupee(subtotal)}</td></tr>` +
    (discountAmt > 0
      ? `<tr><td class="lbl">Discount${inv.discType === "percent" ? ` (${discVal}%)` : ""}</td><td class="r">− ${rupee(discountAmt)}</td></tr>`
      : "") +
    (taxPct > 0 ? `<tr><td class="lbl">GST (${taxPct}%)</td><td class="r">${rupee(taxAmt)}</td></tr>` : "") +
    `<tr class="grand"><td class="lbl">Total</td><td class="r">${rupee(total)}</td></tr>` +
    (paid > 0.005 && due > 0.005
      ? `<tr><td class="lbl">Paid</td><td class="r" style="color:${GREEN}">− ${rupee(paid)}</td></tr>` +
        `<tr class="due"><td class="lbl">Balance due</td><td class="r">${rupee(due)}</td></tr>`
      : "");

  const signedAt = signStamp();
  const signatureHtml = `<div class="sign">
      <div class="sign-cap">For ${bizName}</div>
      <div class="sign-name">${bizName}</div>
      <div class="sign-line"></div>
      <div class="sign-role">Authorized Signatory</div>
      <div class="sign-meta">Digitally signed · ${signedAt}</div>
    </div>`;

  const notes = inv.notes || "";
  const warranty = inv.warranty || "";

  const w = window.open("", "_blank", "width=820,height=1000");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(inv.invoiceNo)}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&family=DM+Sans:wght@400;500;600;700;800&display=swap');
      *{box-sizing:border-box;font-family:'DM Sans',Arial,Helvetica,sans-serif}
      body{margin:0;padding:44px;color:${INK}}
      h1{margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;color:${TERRA}}
      .top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
      .muted{color:${MUTE};font-size:12.5px;line-height:1.5}
      .inv-title{text-align:right}
      .inv-title .big{font-size:22px;font-weight:800;letter-spacing:2px;color:${INK}}
      .parties{display:flex;justify-content:space-between;gap:24px;margin:28px 0 6px}
      .lab{font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:${FAINT};font-weight:700;margin-bottom:5px}
      .strong{font-weight:700;font-size:14px}
      table.items{width:100%;border-collapse:collapse;margin-top:22px}
      table.items th{background:${SOFT};color:${MUTE};font-size:11px;letter-spacing:.4px;text-transform:uppercase;text-align:left;padding:11px 10px;border-bottom:2px solid ${LINE_COOL}}
      table.items td{padding:11px 10px;border-bottom:1px solid ${LINE_COOL};font-size:13.5px;vertical-align:top}
      .r{text-align:right;font-variant-numeric:tabular-nums}.c{text-align:center;color:${MUTE}}
      .totals{width:300px;margin-left:auto;margin-top:18px;border-collapse:collapse}
      .totals td{padding:7px 4px;font-size:13.5px}
      .totals .lbl{color:${MUTE}}
      .totals .r{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
      .totals .grand td{border-top:2px solid ${LINE_COOL};padding-top:12px;font-size:17px;font-weight:800}
      .totals .grand .r{color:${TERRA}}
      .totals .due td{padding-top:10px;font-size:15px;font-weight:800;color:${INK}}
      .totals .due .r{color:${TERRA}}
      .sign{margin-top:44px;text-align:right}
      .sign-cap{font-size:11px;color:${MUTE}}
      .sign-name{font-family:'Pinyon Script',cursive;font-size:34px;color:${TERRA};line-height:1;margin:2px 0}
      .sign-line{width:180px;border-bottom:1px solid ${INK};margin:6px 0 6px auto}
      .sign-role{font-size:11px;color:${INK};font-weight:700;letter-spacing:.3px}
      .sign-meta{font-size:10.5px;color:${FAINT};font-weight:600;margin-top:3px}
      .notes{margin-top:30px;padding-top:16px;border-top:1px solid ${LINE_COOL};font-size:12.5px;color:${MUTE};line-height:1.6}
      /* ivh-a5 */
      @page { size: A5; margin: 8mm; }
      .foot{margin-top:40px;text-align:center;font-size:11px;color:${FAINT}}
      @media print{body{padding:0}}
    </style></head><body>
    <div class="top">
      <div>
        <img src="/images/abhijit_art_logo.png" alt="${bizName}" style="height:76px;width:auto;display:block;margin-bottom:8px" onerror="this.outerHTML='<h1>${bizName}</h1>'" />
        <div class="muted">${escapeLines(biz.address)}<br/>
          ${biz.phone ? "☎ " + escapeHtml(biz.phone) + " &nbsp;" : ""}${biz.email ? "✉ " + escapeHtml(biz.email) : ""}
          ${biz.gstin ? "<br/>GSTIN: " + escapeHtml(biz.gstin) : ""}${biz.pan ? "<br/>PAN: " + escapeHtml(biz.pan) : ""}</div>
      </div>
      <div class="inv-title">
        <div class="big">INVOICE</div>
        <div class="muted">No: <b>${escapeHtml(inv.invoiceNo)}</b><br/>
          Date: ${fmt(inv.date)}</div>
      </div>
    </div>
    <div class="parties">
      <div>
        <div class="lab">Bill to</div>
        <div class="strong">${escapeHtml(inv.clientName) || "—"}</div>
        <div class="muted">${escapeLines(inv.clientAddr)}${inv.clientPhone ? "<br/>☎ " + escapeHtml(inv.clientPhone) : ""}${
    inv.clientEmail ? "<br/>✉ " + escapeHtml(inv.clientEmail) : ""
  }${inv.clientGstin ? "<br/>GSTIN: " + escapeHtml(inv.clientGstin) : ""}</div>
      </div>
    </div>
    <table class="items"><thead><tr><th style="width:34px">#</th><th>Description</th><th class="r" style="width:60px">Qty</th><th class="r" style="width:110px">Rate</th><th class="r" style="width:120px">Amount</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5" class="c" style="padding:22px">No items</td></tr>`}</tbody></table>
    <table class="totals"><tbody>${totRows}</tbody></table>
    ${signatureHtml}
    ${notes.trim() || warranty.trim() ? `<div class="notes">${notes.trim() ? `<b>Notes:</b> ${escapeHtml(notes)}` : ""}${notes.trim() && warranty.trim() ? "<br/>" : ""}${warranty.trim() ? `<b>Warranty:</b> ${escapeHtml(warranty)}` : ""}</div>` : ""}
    <div class="foot">Generated by Abhijit Art · ${new Date().toLocaleDateString("en-IN")}</div>
    </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

/* ───────────────────────── component ───────────────────────── */
export default function Invoices() {
  const [list, setList] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | InvStatus>("all");
  const [period, setPeriod] = useState<Period>("all");

  /* payments modal (ledger: history + add + remove-entry, PIN-gated) */
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState<InvMethod>("cash");
  const [addAmount, setAddAmount] = useState("0");
  const [payPin, setPayPin] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [paySavedAnim, setPaySavedAnim] = useState(false); // checkmark after a saved payment
  const [payErr, setPayErr] = useState("");
  const [payFlash, setPayFlash] = useState<string | null>(null); // inline note (used for removals)
  const [payConfirmDel, setPayConfirmDel] = useState<string | null>(null);
  const [payDeletingId, setPayDeletingId] = useState<string | null>(null);
  const [payDone, setPayDone] = useState<{ title: string; detail?: string; tone: string } | null>(null); // cancel

  /* delete modal (PIN-gated) */
  const [delTarget, setDelTarget] = useState<Invoice | null>(null);
  const [delPin, setDelPin] = useState("");
  const [delErr, setDelErr] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [delDone, setDelDone] = useState(false);

  /* edit modal (full bill edit, PIN-gated) */
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editPin, setEditPin] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editDone, setEditDone] = useState(false);

  /* send modal (Email / WhatsApp — send the invoice to the client) */
  const [sendTarget, setSendTarget] = useState<Invoice | null>(null);
  const [sendChannel, setSendChannel] = useState<"email" | "whatsapp">("email");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [waTo, setWaTo] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const [sendDone, setSendDone] = useState<{ title: string; detail?: string; tone: string } | null>(null);

  const load = async (initial = false) => {
    initial ? setLoading(true) : setRefreshing(true);
    setError("");
    try {
      const res = await api.get("/api/invoices", { timeout: REQ_TIMEOUT });
      setList(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setError(errMessage(e, "Couldn't load invoices."));
    } finally {
      initial ? setLoading(false) : setRefreshing(false);
    }
  };

  useEffect(() => { load(true); }, []);

  const applyInvoice = (updated: Invoice) => {
    setList((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
    setPayTarget((cur) => (cur && cur.id === updated.id ? updated : cur));
  };

  /* invoices in the selected period window (by invoice date) */
  const periodList = useMemo(() => {
    const since = periodSince(period);
    if (!since) return list;
    const t = since.getTime();
    return list.filter((inv) => {
      const dt = new Date(inv.date);
      return !isNaN(dt.getTime()) && dt.getTime() >= t;
    });
  }, [list, period]);

  /* status + search filter, on top of the period */
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return periodList.filter((inv) => {
      if (filter !== "all" && inv.status !== filter) return false;
      if (!needle) return true;
      return (
        inv.invoiceNo.toLowerCase().includes(needle) ||
        (inv.clientName || "").toLowerCase().includes(needle) ||
        (inv.clientEmail || "").toLowerCase().includes(needle) ||
        (inv.clientPhone || "").toLowerCase().includes(needle)
      );
    });
  }, [periodList, q, filter]);

  /* stat cards for the period — cancelled excluded; Received split Cash/Online
     from the actual payment ledger */
  const stats = useMemo(() => {
    let billed = 0, received = 0, outstanding = 0, cash = 0, online = 0;
    for (const inv of periodList) {
      if (inv.status === "cancelled") continue;
      const t = num(inv.total);
      const p = effectivePaid(inv);
      billed += t;
      received += p;
      outstanding += Math.max(t - p, 0);
      for (const pay of Array.isArray(inv.payments) ? inv.payments : []) {
        const amt = num(pay.amount);
        if (pay.method === "online") online += amt; else cash += amt;
      }
    }
    return {
      count: periodList.length, billed: round2(billed), received: round2(received),
      outstanding: round2(outstanding), cash: round2(cash), online: round2(online),
    };
  }, [periodList]);

  const periodLabel = PERIOD_LABEL[period];

  /* ── payments modal ── */
  const openPay = (inv: Invoice) => {
    setPayErr("");
    setAddAmount("0");
    setPayPin("");
    setPayMethod("cash");
    setPayDone(null);
    setPaySavedAnim(false);
    setPayFlash(null);
    setPayConfirmDel(null);
    setPayTarget(inv);
  };

  const savePayment = async () => {
    if (!payTarget) return;
    const amt = round2(Math.max(num(addAmount), 0));
    if (amt <= 0) { setPayErr("Enter a payment amount greater than zero."); return; }
    setPaySaving(true);
    setPayErr("");
    try {
      const res = await api.post(
        `/api/invoices/${payTarget.id}/payments`,
        { amount: amt, method: payMethod, pin: payPin.trim() },
        { timeout: REQ_TIMEOUT },
      );
      const updated: Invoice = { ...payTarget, ...res.data };
      applyInvoice(updated);
      setAddAmount("0");
      setPayFlash(null);
      setPaySavedAnim(true); // play the checkmark, then drop back into the modal
      setTimeout(() => setPaySavedAnim(false), 1600);
    } catch (e: any) {
      setPayErr(errMessage(e, "Couldn't record the payment."));
    } finally {
      setPaySaving(false);
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!payTarget || !payPin.trim()) return;
    setPayDeletingId(paymentId);
    setPayErr("");
    try {
      const res = await api.delete(`/api/invoices/${payTarget.id}/payments/${paymentId}`, {
        data: { pin: payPin.trim() }, timeout: REQ_TIMEOUT,
      });
      const updated: Invoice = { ...payTarget, ...res.data };
      applyInvoice(updated);
      setPayConfirmDel(null);
      setPayFlash("Payment removed.");
      setTimeout(() => setPayFlash(null), 3000);
    } catch (e: any) {
      setPayErr(errMessage(e, "Couldn't remove the payment."));
    } finally {
      setPayDeletingId(null);
    }
  };

  const cancelInvoice = async () => {
    if (!payTarget) return;
    setPaySaving(true);
    setPayErr("");
    try {
      const res = await api.patch(
        `/api/invoices/${payTarget.id}/status`,
        { status: "cancelled", pin: payPin.trim() },
        { timeout: REQ_TIMEOUT },
      );
      setList((rows) => rows.map((r) => (r.id === payTarget.id ? { ...r, ...res.data } : r)));
      setPayDone({ title: "Invoice cancelled", detail: payTarget.invoiceNo, tone: "#6b7280" });
      setTimeout(() => setPayTarget(null), 1700);
    } catch (e: any) {
      setPayErr(errMessage(e, "Couldn't cancel the invoice."));
    } finally {
      setPaySaving(false);
    }
  };

  const openDelete = (inv: Invoice) => {
    setDelErr("");
    setDelPin("");
    setDelDone(false);
    setDelTarget(inv);
  };
  const confirmDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    setDelErr("");
    try {
      await api.delete(`/api/invoices/${delTarget.id}`, { data: { pin: delPin.trim() }, timeout: REQ_TIMEOUT });
      setDelDone(true);
      const id = delTarget.id;
      setTimeout(() => {
        setList((rows) => rows.filter((r) => r.id !== id));
        setDelTarget(null);
      }, 1600);
    } catch (e: any) {
      setDelErr(errMessage(e, "Couldn't delete the invoice."));
    } finally {
      setDeleting(false);
    }
  };

  /* ── edit ── */
  const openEdit = (inv: Invoice) => {
    if (inv.status === "paid" || inv.status === "cancelled") return;
    setEditErr("");
    setEditPin("");
    setEditDone(false);
    setEditForm({
      date: toDateInput(inv.date),
      clientName: inv.clientName || "",
      clientPhone: inv.clientPhone || "",
      clientEmail: inv.clientEmail || "",
      clientGstin: inv.clientGstin || "",
      clientAddr: inv.clientAddr || "",
      source: inv.source === "online" ? "online" : "offline",
      items: (Array.isArray(inv.items) && inv.items.length ? inv.items : [{ desc: "", qty: 1, rate: 0 }]).map((it) => ({
        desc: it.desc || "",
        qty: String(it.qty ?? ""),
        rate: String(it.rate ?? ""),
      })),
      discType: inv.discType === "percent" ? "percent" : "amount",
      discVal: String(num(inv.discVal) || ""),
      taxPct: String(num(inv.taxPct) || ""),
      notes: inv.notes || "",
      warranty: inv.warranty || "",
    });
    setEditTarget(inv);
  };
  const patchForm = (patch: Partial<EditForm>) => setEditForm((f) => (f ? { ...f, ...patch } : f));
  const setItem = (idx: number, field: keyof EditItem, value: string) =>
    setEditForm((f) => (f ? { ...f, items: f.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)) } : f));
  const addItem = () => setEditForm((f) => (f ? { ...f, items: [...f.items, { desc: "", qty: "1", rate: "" }] } : f));
  const removeItem = (idx: number) =>
    setEditForm((f) => (f ? { ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== idx) : f.items } : f));

  const editCalc = useMemo(
    () => (editForm ? calcTotals(editForm.items, editForm.discType, editForm.discVal, editForm.taxPct) : { subtotal: 0, discountAmt: 0, taxAmt: 0, total: 0 }),
    [editForm],
  );
  const editItemsValid = editForm ? editForm.items.some((it) => it.desc.trim() || num(it.rate) > 0) : false;
  const editPrevPaid = editTarget ? effectivePaid(editTarget) : 0;
  const editPaidClamped = round2(Math.min(editPrevPaid, editCalc.total));
  const editBalance = round2(Math.max(editCalc.total - editPaidClamped, 0));

  const saveEdit = async () => {
    if (!editTarget || !editForm) return;
    const cleanItems = editForm.items.filter((it) => it.desc.trim() || num(it.rate) > 0);
    if (!cleanItems.length) { setEditErr("Add at least one line item."); return; }
    setEditSaving(true);
    setEditErr("");
    try {
      const res = await api.patch(
        `/api/invoices/${editTarget.id}/edit`,
        {
          date: editForm.date || undefined,
          client: {
            name: editForm.clientName,
            phone: editForm.clientPhone,
            email: editForm.clientEmail,
            gstin: editForm.clientGstin,
            address: editForm.clientAddr,
          },
          items: cleanItems.map((it) => ({ desc: it.desc, qty: num(it.qty), rate: num(it.rate) })),
          discType: editForm.discType,
          discVal: num(editForm.discVal),
          taxPct: num(editForm.taxPct),
          notes: editForm.notes,
          warranty: editForm.warranty,
          source: editForm.source,
          pin: editPin.trim(),
        },
        { timeout: REQ_TIMEOUT },
      );
      const updated: Invoice = { ...editTarget, ...res.data };
      setList((rows) => rows.map((r) => (r.id === editTarget.id ? updated : r)));
      setEditDone(true);
      setTimeout(() => setEditTarget(null), 1500);
    } catch (e: any) {
      setEditErr(errMessage(e, "Couldn't save the changes."));
    } finally {
      setEditSaving(false);
    }
  };

  /* ── send (email / whatsapp) ── */
  const openSend = (inv: Invoice, channel: "email" | "whatsapp") => {
    setSendErr("");
    setSendDone(null);
    setSendBusy(false);
    setSendChannel(channel);

    const total = num(inv.total);
    const paid = effectivePaid(inv);
    const due = round2(Math.max(total - paid, 0));
    const bizName = inv.business?.name || "Abhijit Art";

    setEmailTo(inv.clientEmail || "");
    setEmailSubject(`Invoice ${inv.invoiceNo} from ${bizName}`);
    setEmailMessage(
      `Dear ${inv.clientName || "Customer"},\n\n` +
        `Please find your invoice ${inv.invoiceNo}, for a total of ${rupee(total)}` +
        (due > 0.005 ? `, with a balance due of ${rupee(due)}` : " — paid in full, thank you") +
        `.\n\nDo let us know if anything needs correcting — just reply to this email.\n\n` +
        `Warm regards,\n${bizName}`,
    );

    setWaTo(inv.clientPhone || "");
    setWaMessage(
      `Dear ${inv.clientName || "Customer"},\n\n` +
        `Here is your invoice ${inv.invoiceNo} from ${bizName}.\n\n` +
        `Total: ${rupee(total)}` +
        (paid > 0.005 ? `\nPaid: ${rupee(paid)}` : "") +
        (due > 0.005 ? `\nBalance due: ${rupee(due)}` : "") +
        `\n\nThank you for your business!`,
    );

    setSendTarget(inv);
  };

  /* emails the invoice via the same endpoint the Billing tab uses (works for
     any status; the invoice is rendered inside the email, totals recomputed
     server-side). Reconstructs the payload from the stored bill. */
  const sendEmailNow = async () => {
    if (!sendTarget) return;
    if (!emailTo.trim()) { setSendErr("Enter the client's email address."); return; }
    setSendBusy(true);
    setSendErr("");
    try {
      const inv = sendTarget;
      await api.post(
        "/api/invoices/email",
        {
          to: emailTo.trim(),
          subject: emailSubject,
          message: emailMessage,
          invoice: {
            invNo: inv.invoiceNo,
            date: inv.date,
            biz: inv.business || {},
            client: {
              name: inv.clientName || "",
              address: inv.clientAddr || "",
              phone: inv.clientPhone || "",
              email: inv.clientEmail || "",
              gstin: inv.clientGstin || "",
              pan: "",
            },
            items: (Array.isArray(inv.items) ? inv.items : []).map((it) => ({ desc: it.desc, qty: num(it.qty), rate: num(it.rate) })),
            discType: inv.discType,
            discVal: inv.discVal,
            taxPct: inv.taxPct,
            notes: inv.notes || "",
            warranty: inv.warranty || "",
            paidAmount: effectivePaid(inv),
          },
        },
        { timeout: REQ_TIMEOUT },
      );
      setSendDone({ title: "Email sent", detail: `${inv.invoiceNo} → ${emailTo.trim()}`, tone: GREEN });
      setTimeout(() => setSendTarget(null), 1600);
    } catch (e: any) {
      setSendErr(errMessage(e, "Couldn't send the email."));
    } finally {
      setSendBusy(false);
    }
  };

  /* opens WhatsApp with the message + the invoice PDF link prefilled. wa.me
     can't attach the file, so it carries a tap-to-open link (already on the
     loaded invoice). Synchronous — no popup-block workaround needed. */
  const sendWhatsAppNow = () => {
    if (!sendTarget) return;
    const digits = waDigits(waTo);
    if (digits.length < 10) {
      setSendErr("Enter a valid WhatsApp number — a 10-digit Indian mobile, or one with its country code.");
      return;
    }
    const inv = sendTarget;
    const link = inv.pdfUrl ? `\n\n📄 Invoice PDF: ${inv.pdfUrl}` : "";
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(waMessage + link)}`;
    window.open(url, "_blank");
    setSendDone({ title: "Opening WhatsApp…", detail: `+${digits}`, tone: WA });
    setTimeout(() => setSendTarget(null), 1400);
  };

  const exportCsv = () => {
    const head = ["Invoice No", "Date", "Client", "Phone", "Email", "GSTIN", "Source", "Method", "Subtotal", "Discount", "GST", "Total", "Paid", "Due", "Status"];
    const body = shown.map((inv) => {
      const total = num(inv.total);
      const paid = effectivePaid(inv);
      const ms = methodSummary(inv);
      return [
        inv.invoiceNo, fmt(inv.date), inv.clientName || "", inv.clientPhone || "", inv.clientEmail || "",
        inv.clientGstin || "", srcMeta(inv.source).label, ms ? ms.label : "",
        num(inv.subtotal).toFixed(2), num(inv.discountAmt).toFixed(2),
        num(inv.taxAmt).toFixed(2), total.toFixed(2), paid.toFixed(2), Math.max(total - paid, 0).toFixed(2),
        STATUS_META[inv.status].label,
      ].map(csvCell).join(",");
    });
    const csv = [head.map(csvCell).join(","), ...body].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `abhijit-art-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* live values for the payments modal */
  const payList = payTarget && Array.isArray(payTarget.payments) ? payTarget.payments : [];
  const payTotal = payTarget ? num(payTarget.total) : 0;
  const payPrev = round2(payList.reduce((s, p) => s + num(p.amount), 0));
  const payBalanceNow = round2(Math.max(payTotal - payPrev, 0));
  const payAdd = round2(Math.max(num(addAmount), 0));
  const payNewPaid = round2(Math.min(payPrev + payAdd, payTotal));
  const payNewBalance = round2(Math.max(payTotal - payNewPaid, 0));
  const payPreview = deriveStatus(payNewPaid, payTotal);
  const payFullyPaid = payBalanceNow <= 0.005;

  /* live values for the send modal */
  const sendTotal = sendTarget ? num(sendTarget.total) : 0;
  const sendPaid = sendTarget ? effectivePaid(sendTarget) : 0;
  const sendDue = round2(Math.max(sendTotal - sendPaid, 0));

  return (
    <div style={st.page}>
      {/* header — heading text removed; actions sit top-right */}
      <div style={st.head}>
        <div style={st.headActions}>
          <button className="ivh-ghost" style={st.ghostBtn} onClick={exportCsv} disabled={!shown.length}
            title={shown.length ? "Export the list as CSV" : "Nothing to export"}>
            <Icon name="csv" size={15} /> Export CSV
          </button>
          <button className="ivh-ghost" style={st.ghostBtn} onClick={() => load(false)} disabled={refreshing}
            title="Reload">
            <Icon name="refresh" size={15} /> {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* stat cards */}
      <div style={st.statsHead}>
        <span style={st.statsPeriod}>Showing <b style={{ color: INK }}>{periodLabel}</b></span>
      </div>
      <div style={st.stats}>
        <div className="ivh-card" style={st.statcard}>
          <div style={st.statnum}>{stats.count}</div>
          <div style={st.statlbl}>Invoices</div>
        </div>
        <div className="ivh-card" style={st.statcard}>
          <div style={st.statnum}>{rupee(stats.billed)}</div>
          <div style={st.statlbl}>Total billed</div>
        </div>
        <div className="ivh-card" style={st.statcard}>
          <div style={{ ...st.statnum, color: GREEN }}>{rupee(stats.received)}</div>
          <div style={st.statlbl}>Received</div>
        </div>
        <div className="ivh-card" style={st.statcard}>
          <div style={{ ...st.statnum, color: METHOD_META.cash.fg }}>{rupee(stats.cash)}</div>
          <div style={st.statlbl}><span style={st.statIcon}><Icon name="banknote" size={12} /></span> Cash received</div>
        </div>
        <div className="ivh-card" style={st.statcard}>
          <div style={{ ...st.statnum, color: METHOD_META.online.fg }}>{rupee(stats.online)}</div>
          <div style={st.statlbl}><span style={st.statIcon}><Icon name="card" size={12} /></span> Online received</div>
        </div>
        <div className="ivh-card" style={st.statcard}>
          <div style={{ ...st.statnum, color: TERRA }}>{rupee(stats.outstanding)}</div>
          <div style={st.statlbl}>Outstanding</div>
        </div>
      </div>

      {/* toolbar */}
      <div style={st.toolbar}>
        <div style={st.filters}>
          {(["all", ...STATUSES] as const).map((f) => (
            <button
              key={f}
              className={`ivh-chip${filter === f ? " on" : ""}`}
              style={st.chip}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : STATUS_META[f].label}
            </button>
          ))}
        </div>

        <div style={st.toolbarRight}>
          <select
            className="ivh-datesel"
            style={st.dateSel}
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            title="Filter by period"
          >
            {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <div style={st.searchWrap}>
            <span style={st.searchIcon}><Icon name="search" size={15} /></span>
            <input
              className="ivh-in"
              style={st.search}
              placeholder="Search by name, phone or invoice no…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* table */}
      <div className="ivh-card" style={st.tableCard}>
        {loading ? (
          <div style={st.skelWrap}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="ivh-skel" style={st.skelRow} />
            ))}
          </div>
        ) : error ? (
          <div style={st.empty}>
            <p style={{ margin: 0 }}>{error}</p>
            <button className="ivh-ghost" style={{ ...st.ghostBtn, marginTop: 14 }} onClick={() => load(true)}>Try again</button>
          </div>
        ) : list.length === 0 ? (
          <div style={st.empty}>
            <span style={{ color: FAINT, display: "block", marginBottom: 10 }}><Icon name="receipt" size={34} /></span>
            <p style={{ margin: 0, fontWeight: 700, color: INK }}>No invoices yet</p>
            <p style={{ margin: "5px 0 0", fontSize: 13.5 }}>Download or email a bill from the Billing tab and it'll show up here.</p>
          </div>
        ) : shown.length === 0 ? (
          <div style={st.empty}><p style={{ margin: 0 }}>No invoices match your filters.</p></div>
        ) : (
          <div className={refreshing ? "ivh-dim" : ""} style={st.tableWrap}>
            <table style={st.table}>
              <thead>
                <tr>
                  <th style={{ ...st.th, width: 34 }}>#</th>
                  <th style={st.th}>Invoice No</th>
                  <th style={st.th}>Client</th>
                  <th style={st.th}>Date</th>
                  <th style={{ ...st.th, textAlign: "right", width: 120 }}>Total</th>
                  <th style={{ ...st.th, textAlign: "right", width: 130 }}>Due</th>
                  <th style={{ ...st.th, width: 110 }}>Status</th>
                  <th style={{ ...st.th, textAlign: "right", width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((inv, i) => {
                  const m = STATUS_META[inv.status];
                  const sm = srcMeta(inv.source);
                  const ms = methodSummary(inv);
                  const total = num(inv.total);
                  const paid = effectivePaid(inv);
                  const due = round2(Math.max(total - paid, 0));
                  const editLocked = inv.status === "paid" || inv.status === "cancelled";
                  const sendLocked = inv.status === "cancelled";
                  return (
                    <tr key={inv.id} className="ivh-tr">
                      <td style={{ ...st.td, color: FAINT, textAlign: "center" }}>{i + 1}</td>
                      <td style={st.td}>
                        <button className="ivh-nolink" style={st.noBtn} onClick={() => printInvoice(inv)} title="Print this bill">
                          {inv.invoiceNo}
                        </button>
                      </td>
                      <td style={st.td}>
                        <div style={{ fontWeight: 700, color: INK }}>{inv.clientName || "—"}</div>
                        <div style={st.clientMeta}>
                          <span style={{ ...st.srcPill, color: sm.fg, background: sm.bg, borderColor: sm.bd }}>{sm.label}</span>
                          {ms && (
                            <span style={{ ...st.methPill, color: ms.fg, background: ms.bg, borderColor: ms.bd }}>
                              <Icon name={ms.icon} size={11} /> {ms.label}
                            </span>
                          )}
                          {(inv.clientPhone || inv.clientEmail) && (
                            <span style={st.subline}>{inv.clientPhone || inv.clientEmail}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...st.td, whiteSpace: "nowrap", color: BODY }}>{fmt(inv.date)}</td>
                      <td style={{ ...st.td, textAlign: "right", fontWeight: 800, color: INK, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {rupee(total)}
                      </td>
                      <td style={{ ...st.td, textAlign: "right", whiteSpace: "nowrap" }}>
                        {inv.status === "cancelled" ? (
                          <span style={{ color: FAINT }}>—</span>
                        ) : (
                          <>
                            <div style={{ fontWeight: 800, color: due > 0 ? TERRA : GREEN, fontVariantNumeric: "tabular-nums" }}>
                              {due > 0 ? rupee(due) : "Settled"}
                            </div>
                            {paid > 0 && <div style={st.dueSub}>Paid {rupee(paid)}</div>}
                          </>
                        )}
                      </td>
                      <td style={st.td}>
                        <span style={{ ...st.badge, ...badgeStyle(inv.status) }}>{m.label}</span>
                      </td>
                      <td style={{ ...st.td, textAlign: "right", whiteSpace: "nowrap" }}>
                        <button className="ivh-icon" style={st.iconBtn} onClick={() => openEdit(inv)}
                          disabled={editLocked}
                          title={editLocked ? (inv.status === "paid" ? "Paid — locked (delete to correct)" : "Cancelled — reactivate to edit") : "Edit invoice"}>
                          <Icon name="edit" size={16} />
                        </button>
                        <button className="ivh-icon" style={st.iconBtn} onClick={() => openPay(inv)} title="Payments & history">
                          <Icon name="banknote" size={17} />
                        </button>
                        <button className="ivh-icon" style={st.iconBtn} onClick={() => printInvoice(inv)} title="Print">
                          <Icon name="download" size={16} />
                        </button>
                        <button className="ivh-icon" style={st.iconBtn} onClick={() => openSend(inv, "email")}
                          disabled={sendLocked}
                          title={sendLocked ? "Cancelled — nothing to send" : "Email this invoice to the client"}>
                          <Icon name="mail" size={16} />
                        </button>
                        <button className="ivh-icon ivh-wa" style={st.iconBtn} onClick={() => openSend(inv, "whatsapp")}
                          disabled={sendLocked}
                          title={sendLocked ? "Cancelled — nothing to send" : "Send this invoice on WhatsApp"}>
                          <span style={{ color: WA, display: "inline-flex" }}><Icon name="whatsapp" size={17} /></span>
                        </button>
                        <button className="ivh-icon ivh-danger" style={st.iconBtn} onClick={() => openDelete(inv)} title="Delete">
                          <Icon name="trash" size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════ edit modal ═══════════ */}
      {editTarget && editForm && (
        <div style={st.backdrop} onClick={() => !editSaving && !editDone && setEditTarget(null)}>
          <div className="ivh-modal" style={st.editModal} onClick={(e) => e.stopPropagation()}>
            {editDone ? (
              <SuccessPanel title="Changes saved" detail={`${editTarget.invoiceNo} · now ${rupee(editCalc.total)}`} tone={GREEN} />
            ) : (
              <>
                <div style={st.payHead}>
                  <div>
                    <h3 style={st.modalTitle}>Edit invoice · {editTarget.invoiceNo}</h3>
                    <p style={st.editSubhelp}>Invoice number and your business details stay the same. Add lines to grow a running bill.</p>
                  </div>
                  <button className="ivh-icon" style={st.iconBtn} onClick={() => setEditTarget(null)} aria-label="Close"><Icon name="x" size={18} /></button>
                </div>

                <div style={st.formGrid}>
                  <label style={st.editField}>
                    <span style={st.fieldLabel}>Invoice date</span>
                    <input className="ivh-in" style={st.editInput} type="date" value={editForm.date}
                      onChange={(e) => patchForm({ date: e.target.value })} />
                  </label>
                  <div style={st.editField}>
                    <span style={st.fieldLabel}>Customer type</span>
                    <div style={st.segWrap}>
                      {(["online", "offline"] as InvSource[]).map((s, idx) => (
                        <button key={s} type="button"
                          className={`ivh-seg${editForm.source === s ? " on" : ""}`}
                          style={{ ...st.segBtn, ...(idx === 1 ? { borderLeft: `1px solid ${LINE}` } : null), ...(editForm.source === s ? st.segBtnOn : null) }}
                          onClick={() => patchForm({ source: s })}>
                          {SOURCE_META[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={st.sectionTitle}>Bill to</div>
                <div style={st.formGrid}>
                  <label style={st.editField}>
                    <span style={st.fieldLabel}>Name</span>
                    <input className="ivh-in" style={st.editInput} value={editForm.clientName}
                      onChange={(e) => patchForm({ clientName: e.target.value })} placeholder="Customer name" />
                  </label>
                  <label style={st.editField}>
                    <span style={st.fieldLabel}>Phone</span>
                    <input className="ivh-in" style={st.editInput} value={editForm.clientPhone}
                      onChange={(e) => patchForm({ clientPhone: e.target.value })} placeholder="Phone" />
                  </label>
                  <label style={st.editField}>
                    <span style={st.fieldLabel}>Email</span>
                    <input className="ivh-in" style={st.editInput} value={editForm.clientEmail}
                      onChange={(e) => patchForm({ clientEmail: e.target.value })} placeholder="Email (optional)" />
                  </label>
                  <label style={st.editField}>
                    <span style={st.fieldLabel}>GSTIN</span>
                    <input className="ivh-in" style={st.editInput} value={editForm.clientGstin}
                      onChange={(e) => patchForm({ clientGstin: e.target.value })} placeholder="GSTIN (optional)" />
                  </label>
                </div>
                <label style={{ ...st.editField, marginTop: 10 }}>
                  <span style={st.fieldLabel}>Address</span>
                  <textarea className="ivh-in" style={st.editTextarea} value={editForm.clientAddr}
                    onChange={(e) => patchForm({ clientAddr: e.target.value })} placeholder="Address (optional)" rows={2} />
                </label>

                <div style={st.sectionTitle}>Items</div>
                <div style={st.linesHead}>
                  <span>Description</span>
                  <span style={{ textAlign: "right" }}>Qty</span>
                  <span style={{ textAlign: "right" }}>Rate</span>
                  <span style={{ textAlign: "right" }}>Amount</span>
                  <span />
                </div>
                {editForm.items.map((it, idx) => (
                  <div key={idx} style={st.lineRow}>
                    <input className="ivh-in" style={st.editInput} value={it.desc}
                      onChange={(e) => setItem(idx, "desc", e.target.value)} placeholder={`Item ${idx + 1}`} />
                    <input className="ivh-in" style={st.lineNumInput} type="number" min="0" value={it.qty}
                      onChange={(e) => setItem(idx, "qty", e.target.value)} placeholder="0" />
                    <input className="ivh-in" style={st.lineNumInput} type="number" min="0" value={it.rate}
                      onChange={(e) => setItem(idx, "rate", e.target.value)} placeholder="0" />
                    <div style={st.lineAmt}>{rupee(num(it.qty) * num(it.rate))}</div>
                    <button type="button" className="ivh-icon ivh-danger" style={st.lineRemoveBtn}
                      onClick={() => removeItem(idx)} disabled={editForm.items.length <= 1}
                      title={editForm.items.length <= 1 ? "At least one line is required" : "Remove line"}>
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                ))}
                <button type="button" className="ivh-addline" style={st.addLineBtn} onClick={addItem}>
                  <Icon name="plus" size={14} /> Add line
                </button>

                <div style={{ ...st.formGrid, marginTop: 16 }}>
                  <div style={st.editField}>
                    <span style={st.fieldLabel}>Discount</span>
                    <div style={st.discRow}>
                      <select className="ivh-datesel" style={st.discSelect} value={editForm.discType}
                        onChange={(e) => patchForm({ discType: e.target.value === "percent" ? "percent" : "amount" })}>
                        <option value="amount">₹</option>
                        <option value="percent">%</option>
                      </select>
                      <input className="ivh-in" style={st.discInput} type="number" min="0" value={editForm.discVal}
                        onChange={(e) => patchForm({ discVal: e.target.value })} placeholder="0" />
                    </div>
                  </div>
                  <label style={st.editField}>
                    <span style={st.fieldLabel}>GST %</span>
                    <input className="ivh-in" style={st.discInput} type="number" min="0" value={editForm.taxPct}
                      onChange={(e) => patchForm({ taxPct: e.target.value })} placeholder="0" />
                  </label>
                </div>

                <div style={{ ...st.formGrid, marginTop: 10 }}>
                  <label style={st.editField}>
                    <span style={st.fieldLabel}>Notes</span>
                    <textarea className="ivh-in" style={st.editTextarea} value={editForm.notes}
                      onChange={(e) => patchForm({ notes: e.target.value })} placeholder="Notes (optional)" rows={2} />
                  </label>
                  <label style={st.editField}>
                    <span style={st.fieldLabel}>Warranty</span>
                    <textarea className="ivh-in" style={st.editTextarea} value={editForm.warranty}
                      onChange={(e) => patchForm({ warranty: e.target.value })} placeholder="Warranty (optional)" rows={2} />
                  </label>
                </div>

                <div style={st.editTotals}>
                  <div style={st.editTotRow}>
                    <span style={st.editTotLbl}>Subtotal</span>
                    <span style={st.editTotVal}>{rupee(editCalc.subtotal)}</span>
                  </div>
                  {editCalc.discountAmt > 0 && (
                    <div style={st.editTotRow}>
                      <span style={st.editTotLbl}>Discount{editForm.discType === "percent" ? ` (${num(editForm.discVal)}%)` : ""}</span>
                      <span style={st.editTotVal}>− {rupee(editCalc.discountAmt)}</span>
                    </div>
                  )}
                  {editCalc.taxAmt > 0 && (
                    <div style={st.editTotRow}>
                      <span style={st.editTotLbl}>GST ({num(editForm.taxPct)}%)</span>
                      <span style={st.editTotVal}>{rupee(editCalc.taxAmt)}</span>
                    </div>
                  )}
                  <div style={st.editGrandRow}>
                    <span style={{ fontWeight: 800, color: INK }}>Total</span>
                    <span style={st.editGrandVal}>{rupee(editCalc.total)}</span>
                  </div>
                  {editPaidClamped > 0.005 && (
                    <>
                      <div style={{ ...st.editTotRow, paddingTop: 8 }}>
                        <span style={st.editTotLbl}>Already received</span>
                        <span style={{ ...st.editTotVal, color: GREEN }}>− {rupee(editPaidClamped)}</span>
                      </div>
                      <div style={st.editTotRow}>
                        <span style={{ ...st.editTotLbl, fontWeight: 700, color: INK }}>Balance due</span>
                        <span style={{ ...st.editTotVal, color: editBalance > 0 ? TERRA : GREEN }}>
                          {editBalance > 0 ? rupee(editBalance) : "Settled"}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <label style={{ display: "block", marginTop: 16 }}>
                  <span style={st.fieldLabel}>
                    <span style={{ display: "inline-flex", verticalAlign: "-2px", marginRight: 5, color: MUTE }}><Icon name="lock" size={13} /></span>
                    Security PIN <span style={{ fontWeight: 500, color: MUTE }}>· required to save changes</span>
                  </span>
                  <input className="ivh-in" style={st.pinInput} type="password" value={editPin}
                    name="aa-edit-pin" autoComplete="one-time-code" inputMode="numeric"
                    data-1p-ignore data-lpignore="true" data-form-type="other"
                    onChange={(e) => setEditPin(e.target.value)} placeholder="••••••"
                    onKeyDown={(e) => { if (e.key === "Enter" && editPin.trim() && editItemsValid && !editSaving) saveEdit(); }} />
                </label>

                {editErr && <div style={{ ...st.errBanner, marginTop: 14, marginBottom: 0 }}>{editErr}</div>}

                <div style={st.editFoot}>
                  <button className="ivh-ghost" style={st.ghostBtn} onClick={() => setEditTarget(null)} disabled={editSaving}>Cancel</button>
                  <button className="ivh-save" style={st.saveBtn} onClick={saveEdit} disabled={editSaving || !editPin.trim() || !editItemsValid}>
                    {editSaving ? <span className="ivh-spin" style={st.spin} /> : "Save changes"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ payments modal (ledger) ═══════════ */}
      {payTarget && (
        <div style={st.backdrop} onClick={() => !paySaving && !payDone && !paySavedAnim && setPayTarget(null)}>
          <div className="ivh-modal" style={{ ...st.editModal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            {payDone ? (
              <SuccessPanel title={payDone.title} detail={payDone.detail} tone={payDone.tone} />
            ) : paySavedAnim ? (
              <SuccessPanel
                title={payBalanceNow <= 0.005 ? "Paid in full" : "Payment saved"}
                detail={payBalanceNow <= 0.005 ? `${payTarget.invoiceNo} · settled` : `${payTarget.invoiceNo} · balance ${rupee(payBalanceNow)}`}
                tone={GREEN}
              />
            ) : (
              <>
                <div style={st.payHead}>
                  <div>
                    <h3 style={st.modalTitle}>Payments · {payTarget.invoiceNo}</h3>
                    <p style={st.paySub}>{payTarget.clientName || "—"}</p>
                  </div>
                  <button className="ivh-icon" style={st.iconBtn} onClick={() => setPayTarget(null)} aria-label="Close"><Icon name="x" size={18} /></button>
                </div>

                <div style={st.paySummary}>
                  <div>
                    <div style={st.paySumLbl}>Total</div>
                    <div style={st.paySumTotal}>{rupee(payTotal)}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={st.paySumLbl}>Received</div>
                    <div style={st.paySumMid}>{rupee(payPrev)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={st.paySumLbl}>Balance</div>
                    <div style={{ ...st.paySumDue, color: payBalanceNow > 0 ? TERRA : GREEN }}>{payBalanceNow > 0 ? rupee(payBalanceNow) : "Settled"}</div>
                  </div>
                </div>

                <div style={st.payHistWrap}>
                  <div style={st.payHistHead}>
                    <span>Payment history</span>
                    <span style={{ color: MUTE, fontWeight: 700 }}>{payList.length} {payList.length === 1 ? "entry" : "entries"}</span>
                  </div>
                  {payList.length === 0 ? (
                    <div style={st.payHistEmpty}>No payments recorded yet.</div>
                  ) : (
                    <div style={st.payHistList}>
                      {payList.map((p) => {
                        const pm = methMeta(p.method);
                        const confirming = payConfirmDel === p.id;
                        const deleting = payDeletingId === p.id;
                        return (
                          <div key={p.id} style={st.payHistRow}>
                            <span style={st.payHistDate}>{fmt(p.createdAt)}</span>
                            <span style={{ ...st.payHistMeth, color: pm.fg, background: pm.bg, borderColor: pm.bd }}>
                              <Icon name={pm.icon} size={11} /> {pm.label}
                            </span>
                            {p.note && <span style={st.payHistNote} title={p.note}>{p.note}</span>}
                            <div style={st.payHistRight}>
                              <span style={st.payHistAmt}>{rupee(num(p.amount))}</span>
                              {deleting ? (
                                <span className="ivh-spin" style={{ ...st.spin, width: 15, height: 15, borderColor: `${TERRA}55`, borderTopColor: TERRA }} />
                              ) : confirming ? (
                                <span style={st.payConfirmWrap}>
                                  <button style={st.histConfirmYes} onClick={() => deletePayment(p.id)} disabled={!payPin.trim()}
                                    title={payPin.trim() ? "Confirm remove" : "Enter your PIN below first"}>Remove</button>
                                  <button style={st.histConfirmNo} onClick={() => setPayConfirmDel(null)}>Keep</button>
                                </span>
                              ) : (
                                <button className="ivh-icon ivh-danger" style={st.payHistDelBtn} onClick={() => setPayConfirmDel(p.id)}
                                  title="Remove this payment (PIN required)"><Icon name="x" size={14} /></button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {payFlash && <div style={st.payFlash}>{payFlash}</div>}

                {payFullyPaid && payTarget.status !== "cancelled" ? (
                  <div style={st.payFullyNote}>This bill is fully paid — nothing due. To make a correction, remove a payment above.</div>
                ) : (
                  <>
                    <div style={{ marginTop: 4 }}>
                      <span style={st.fieldLabel}>Payment method</span>
                      <div style={st.segWrap}>
                        {(["cash", "online"] as InvMethod[]).map((mth, idx) => (
                          <button key={mth} type="button"
                            className={`ivh-seg${payMethod === mth ? " on" : ""}`}
                            style={{ ...st.segBtn, ...(idx === 1 ? { borderLeft: `1px solid ${LINE}` } : null), ...(payMethod === mth ? st.segBtnOn : null) }}
                            onClick={() => setPayMethod(mth)}>
                            <Icon name={METHOD_META[mth].icon} size={14} /> {METHOD_META[mth].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label style={{ display: "block", marginTop: 12 }}>
                      <span style={st.fieldLabel}>Add payment (₹) <span style={{ fontWeight: 500, color: MUTE }}>· amount received now</span></span>
                      <input className="ivh-in" style={st.payInput} type="number" min="0" value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)} placeholder="0" autoFocus />
                    </label>
                    <div style={st.payQuick}>
                      <button className="ivh-chip" style={st.chip} onClick={() => setAddAmount(String(payBalanceNow))} disabled={payBalanceNow <= 0}>
                        Full balance · {rupee(payBalanceNow)}
                      </button>
                      <button className="ivh-chip" style={st.chip} onClick={() => setAddAmount("0")}>Clear</button>
                    </div>

                    {payAdd > 0 && (
                      <div style={st.payAfter}>
                        After this: received <b style={{ color: INK }}>{rupee(payNewPaid)}</b> · balance{" "}
                        <b style={{ color: payNewBalance > 0 ? TERRA : GREEN }}>{payNewBalance > 0 ? rupee(payNewBalance) : "Settled"}</b> ·{" "}
                        <span style={{ ...st.badge, ...badgeStyle(payPreview) }}>{STATUS_META[payPreview].label}</span>
                      </div>
                    )}
                    {payTarget.status === "cancelled" && (
                      <div style={st.payPreview}><span style={st.payReactivate}>Recording a payment reactivates this cancelled invoice.</span></div>
                    )}
                  </>
                )}

                <label style={{ display: "block", marginTop: 16 }}>
                  <span style={st.fieldLabel}>
                    <span style={{ display: "inline-flex", verticalAlign: "-2px", marginRight: 5, color: MUTE }}><Icon name="lock" size={13} /></span>
                    Security PIN <span style={{ fontWeight: 500, color: MUTE }}>· required to save, cancel or remove a payment</span>
                  </span>
                  <input className="ivh-in" style={st.pinInput} type="password" value={payPin}
                    name="aa-billing-pin" autoComplete="one-time-code" inputMode="numeric"
                    data-1p-ignore data-lpignore="true" data-form-type="other"
                    onChange={(e) => setPayPin(e.target.value)} placeholder="••••••"
                    onKeyDown={(e) => { if (e.key === "Enter" && payPin.trim() && payAdd > 0 && !payFullyPaid && !paySaving) savePayment(); }} />
                </label>

                {payErr && <div style={{ ...st.errBanner, marginTop: 14, marginBottom: 0 }}>{payErr}</div>}

                <div style={st.payFoot}>
                  {payTarget.status === "cancelled" ? (
                    <span style={st.payCancelledNote}>Cancelled</span>
                  ) : payFullyPaid ? (
                    <span style={st.payCancelledNote}>Fully paid</span>
                  ) : (
                    <button className="ivh-cancelinv" style={st.cancelInvBtn} onClick={cancelInvoice} disabled={paySaving || !payPin.trim()}>
                      Cancel invoice
                    </button>
                  )}
                  <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                    <button className="ivh-ghost" style={st.ghostBtn} onClick={() => setPayTarget(null)} disabled={paySaving}>Close</button>
                    <button className="ivh-save" style={st.saveBtn} onClick={savePayment} disabled={paySaving || !payPin.trim() || payAdd <= 0 || payFullyPaid}>
                      {paySaving ? <span className="ivh-spin" style={st.spin} /> : "Save payment"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ send modal (email / whatsapp) ═══════════ */}
      {sendTarget && (
        <div style={st.backdrop} onClick={() => !sendBusy && !sendDone && setSendTarget(null)}>
          <div className="ivh-modal" style={{ ...st.editModal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            {sendDone ? (
              <SuccessPanel title={sendDone.title} detail={sendDone.detail} tone={sendDone.tone} />
            ) : (
              <>
                <div style={st.payHead}>
                  <div>
                    <h3 style={st.modalTitle}>Send invoice · {sendTarget.invoiceNo}</h3>
                    <p style={st.paySub}>{sendTarget.clientName || "—"}</p>
                  </div>
                  <button className="ivh-icon" style={st.iconBtn} onClick={() => setSendTarget(null)} aria-label="Close"><Icon name="x" size={18} /></button>
                </div>

                {/* channel toggle */}
                <div style={st.segWrap}>
                  {(["email", "whatsapp"] as const).map((ch, idx) => (
                    <button key={ch} type="button"
                      className={`ivh-seg${sendChannel === ch ? " on" : ""}`}
                      style={{
                        ...st.segBtn,
                        ...(idx === 1 ? { borderLeft: `1px solid ${LINE}` } : null),
                        ...(sendChannel === ch ? (ch === "whatsapp" ? st.segBtnWa : st.segBtnOn) : null),
                      }}
                      onClick={() => { setSendChannel(ch); setSendErr(""); }}>
                      <Icon name={ch === "email" ? "mail" : "whatsapp"} size={14} /> {ch === "email" ? "Email" : "WhatsApp"}
                    </button>
                  ))}
                </div>

                {sendChannel === "email" ? (
                  <>
                    <div style={st.sendNote}>
                      The invoice is included in the email itself — the client sees it without downloading anything.
                    </div>
                    <label style={{ display: "block" }}>
                      <span style={st.fieldLabel}>Send to</span>
                      <input className="ivh-in" style={st.editInput} type="email" value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)} placeholder="client@example.com" autoFocus />
                    </label>
                    <label style={{ display: "block", marginTop: 10 }}>
                      <span style={st.fieldLabel}>Subject</span>
                      <input className="ivh-in" style={st.editInput} value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)} />
                    </label>
                    <label style={{ display: "block", marginTop: 10 }}>
                      <span style={st.fieldLabel}>Message</span>
                      <textarea className="ivh-in" style={{ ...st.editTextarea, minHeight: 122 }} value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)} />
                    </label>
                  </>
                ) : (
                  <>
                    <div style={st.sendNoteWa}>
                      Opens WhatsApp with the message ready to send.{" "}
                      {sendTarget.pdfUrl ? "A link to the invoice PDF is added automatically." : "The PDF link will appear once the site is deployed with a public URL."}{" "}
                      WhatsApp can't attach the file itself.
                    </div>
                    <label style={{ display: "block" }}>
                      <span style={st.fieldLabel}>WhatsApp number</span>
                      <input className="ivh-in" style={st.editInput} value={waTo}
                        onChange={(e) => setWaTo(e.target.value)} placeholder="e.g. 7405179066" autoFocus />
                    </label>
                    <label style={{ display: "block", marginTop: 10 }}>
                      <span style={st.fieldLabel}>Message</span>
                      <textarea className="ivh-in" style={{ ...st.editTextarea, minHeight: 132 }} value={waMessage}
                        onChange={(e) => setWaMessage(e.target.value)} />
                    </label>
                  </>
                )}

                <div style={st.sendSummary}>
                  <span style={{ fontSize: 12.5, color: MUTE, fontWeight: 600 }}>
                    Total{sendDue > 0.005 ? ` · balance ${rupee(sendDue)}` : ""}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: TERRA, fontVariantNumeric: "tabular-nums" }}>{rupee(sendTotal)}</span>
                </div>

                {sendErr && <div style={{ ...st.errBanner, marginTop: 4, marginBottom: 0 }}>{sendErr}</div>}

                <div style={{ ...st.editFoot, marginTop: 18 }}>
                  <button className="ivh-ghost" style={st.ghostBtn} onClick={() => setSendTarget(null)} disabled={sendBusy}>Cancel</button>
                  {sendChannel === "email" ? (
                    <button className="ivh-save" style={st.saveBtn} onClick={sendEmailNow} disabled={sendBusy || !emailTo.trim()}>
                      {sendBusy ? <span className="ivh-spin" style={st.spin} /> : <><Icon name="mail" size={15} /> Send email</>}
                    </button>
                  ) : (
                    <button className="ivh-wabtn" style={st.waBtn} onClick={sendWhatsAppNow} disabled={waDigits(waTo).length < 10}>
                      <Icon name="whatsapp" size={16} /> Open WhatsApp
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* delete confirm */}
      {delTarget && (
        <div style={st.backdrop} onClick={() => !deleting && !delDone && setDelTarget(null)}>
          <div className="ivh-modal" style={st.modal} onClick={(e) => e.stopPropagation()}>
            {delDone ? (
              <SuccessPanel title="Invoice deleted" detail={delTarget.invoiceNo} tone="#b3261e" />
            ) : (
              <>
                <h3 style={st.modalTitle}>Delete invoice {delTarget.invoiceNo}?</h3>
                <p style={st.modalSub}>
                  This removes the saved record for <b>{delTarget.clientName || "—"}</b> ({rupee(delTarget.total)}) and its whole payment history, permanently.
                  The client's copy, if already emailed, is unaffected.
                </p>

                <label style={{ display: "block", marginBottom: 4 }}>
                  <span style={st.fieldLabel}>
                    <span style={{ display: "inline-flex", verticalAlign: "-2px", marginRight: 5, color: MUTE }}><Icon name="lock" size={13} /></span>
                    Security PIN <span style={{ fontWeight: 500, color: MUTE }}>· required to delete</span>
                  </span>
                  <input className="ivh-in" style={st.pinInput} type="password" value={delPin}
                    name="aa-delete-pin" autoComplete="one-time-code" inputMode="numeric"
                    data-1p-ignore data-lpignore="true" data-form-type="other" autoFocus
                    onChange={(e) => setDelPin(e.target.value)} placeholder="••••••"
                    onKeyDown={(e) => { if (e.key === "Enter" && delPin.trim() && !deleting) confirmDelete(); }} />
                </label>

                {delErr && <div style={{ ...st.errBanner, marginTop: 12, marginBottom: 0 }}>{delErr}</div>}

                <div style={{ ...st.modalFoot, marginTop: 20 }}>
                  <button className="ivh-ghost" style={st.ghostBtn} onClick={() => setDelTarget(null)} disabled={deleting}>Cancel</button>
                  <button className="ivh-del-cta" style={st.delCta} onClick={confirmDelete} disabled={deleting || !delPin.trim()}>
                    {deleting ? <span className="ivh-spin" style={st.spin} /> : "Delete invoice"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .ivh-card { background: ${GLOW}; border: 1px solid ${LINE}; box-shadow: ${GLOW_SHADOW}; }

        .ivh-in { transition: border-color .18s, box-shadow .18s; }
        .ivh-in:focus { border-color: ${TERRA}; box-shadow: 0 0 0 3px ${TERRA}22; outline: none; }

        .ivh-datesel { transition: border-color .16s; }
        .ivh-datesel:hover { border-color: ${TERRA}55; }
        .ivh-datesel:focus { outline: none; border-color: ${TERRA}; box-shadow: 0 0 0 3px ${TERRA}22; }

        .ivh-ghost, .ivh-chip, .ivh-icon, .ivh-nolink, .ivh-del-cta, .ivh-save, .ivh-cancelinv, .ivh-seg, .ivh-addline, .ivh-wabtn { transition: all .16s ease; }
        .ivh-ghost:hover:not(:disabled) { background: #fffcf9; border-color: ${TERRA}55; color: ${TERRA}; }
        .ivh-ghost:disabled { opacity: .45; cursor: not-allowed; }

        .ivh-chip:hover:not(:disabled) { border-color: ${TERRA}55; color: ${TERRA}; }
        .ivh-chip:disabled { opacity: .4; cursor: not-allowed; }
        .ivh-chip.on { background: ${TERRA}; border-color: ${TERRA}; color: #fff; }

        .ivh-seg:hover:not(.on) { color: ${TERRA}; }
        .ivh-addline:hover { border-color: ${TERRA}77; color: ${TERRA}; background: #fffcf9; }

        .ivh-nolink:hover { color: ${TERRA}; text-decoration: underline; }

        .ivh-icon:not(:disabled):hover { color: ${TERRA}; background: #fffcf9; }
        .ivh-icon.ivh-danger:not(:disabled):hover { color: #d33; background: #fdecea; }
        .ivh-icon.ivh-wa:not(:disabled):hover { color: ${WA_DK}; background: #edfaf1; }
        .ivh-icon:disabled { opacity: .4; cursor: not-allowed; }

        .ivh-save { min-width: 128px; display: inline-flex; align-items: center; justify-content: center; }
        .ivh-save:hover:not(:disabled) { background: ${TERRA_DK}; box-shadow: 0 10px 22px ${TERRA}40; }
        .ivh-save:disabled { opacity: .6; cursor: default; }

        .ivh-wabtn:hover:not(:disabled) { background: ${WA_DK}; box-shadow: 0 10px 22px ${WA}45; }
        .ivh-wabtn:disabled { opacity: .6; cursor: default; }

        .ivh-del-cta { min-width: 128px; display: inline-flex; align-items: center; justify-content: center; }
        .ivh-del-cta:hover:not(:disabled) { background: #b3271a; }
        .ivh-del-cta:disabled { opacity: .6; cursor: default; }

        .ivh-cancelinv:hover:not(:disabled) { color: #d33; border-color: #e7a9a2; background: #fdecea; }
        .ivh-cancelinv:disabled { opacity: .5; cursor: default; }

        .ivh-tr:hover td { background: #fafbfc; }

        .ivh-dim { opacity: .55; pointer-events: none; transition: opacity .15s; }

        .ivh-skel { background: linear-gradient(90deg, #f1ece6 25%, #f7f3ee 37%, #f1ece6 63%); background-size: 400% 100%; animation: ivhShimmer 1.3s ease infinite; }
        @keyframes ivhShimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

        .ivh-modal { animation: ivhPop .22s cubic-bezier(.2,.9,.3,1.2) both; }
        @keyframes ivhPop { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: none; } }

        .ivh-spin { width: 17px; height: 17px; border-radius: 50%; border: 2.5px solid rgba(255,255,255,.5); border-top-color: #fff; animation: ivhSpin .6s linear infinite; }
        @keyframes ivhSpin { to { transform: rotate(360deg); } }

        .ivh-success { animation: ivhFade .25s ease both; }
        @keyframes ivhFade { from { opacity: 0; } to { opacity: 1; } }
        .ivh-successring { animation: ivhRingPop .45s cubic-bezier(.18,.9,.3,1.35) both; }
        @keyframes ivhRingPop { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
        .ivh-checkcircle { stroke-dasharray: 150; stroke-dashoffset: 150; animation: ivhDraw .5s ease .06s forwards; }
        .ivh-checkmark { stroke-dasharray: 40; stroke-dashoffset: 40; animation: ivhDraw .35s ease .42s forwards; }
        @keyframes ivhDraw { to { stroke-dashoffset: 0; } }
        .ivh-successtitle { animation: ivhRise .3s ease .38s both; }
        .ivh-successsub { animation: ivhRise .3s ease .46s both; }
        @keyframes ivhRise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

        @media (prefers-reduced-motion: reduce) {
          .ivh-in,.ivh-datesel,.ivh-ghost,.ivh-chip,.ivh-icon,.ivh-nolink,.ivh-del-cta,.ivh-save,.ivh-cancelinv,.ivh-seg,.ivh-addline,.ivh-wabtn,.ivh-skel,
          .ivh-modal,.ivh-spin,.ivh-success,.ivh-successring,.ivh-checkcircle,.ivh-checkmark,.ivh-successtitle,.ivh-successsub
          { animation: none !important; transition: none !important; }
          .ivh-checkcircle,.ivh-checkmark { stroke-dashoffset: 0 !important; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────── styles ───────────────────────── */
const st: Record<string, React.CSSProperties> = {
  page: { fontFamily: SANS, color: INK, minWidth: 0, maxWidth: "100%" },

  head: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 20, flexWrap: "wrap", marginBottom: 16 },
  headActions: { display: "flex", gap: 10, flexWrap: "wrap" },

  ghostBtn: {
    display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 0,
    border: `1px solid ${LINE}`, background: CARD, color: INK, fontFamily: SANS, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
  },
  saveBtn: {
    padding: "10px 18px", borderRadius: 0, border: "none", background: TERRA, color: "#fff",
    fontFamily: SANS, fontWeight: 800, fontSize: 13.5, cursor: "pointer", gap: 7,
  },
  waBtn: {
    padding: "10px 18px", borderRadius: 0, border: "none", background: WA, color: "#fff",
    fontFamily: SANS, fontWeight: 800, fontSize: 13.5, cursor: "pointer",
    minWidth: 128, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
  },

  statsHead: { marginBottom: 8 },
  statsPeriod: { fontSize: 12.5, color: MUTE, fontWeight: 600, textTransform: "capitalize" },
  stats: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))", gap: 14, marginBottom: 18 },
  statcard: { borderRadius: 0, padding: "16px 18px", minWidth: 0 },
  statnum: { fontSize: 22, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" },
  statlbl: { fontSize: 12, color: MUTE, marginTop: 7, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 },
  statIcon: { display: "inline-flex", color: FAINT },

  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 },
  filters: { display: "flex", gap: 8, flexWrap: "wrap" },
  toolbarRight: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  dateSel: {
    padding: "9px 12px", border: `1px solid ${LINE}`, borderRadius: 0, background: CARD, color: BODY,
    fontFamily: SANS, fontWeight: 700, fontSize: 13, cursor: "pointer", colorScheme: "light",
  },
  chip: {
    padding: "8px 15px", borderRadius: 0, border: `1px solid ${LINE}`, background: CARD, color: BODY,
    fontFamily: SANS, fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
  },
  searchWrap: { position: "relative", flex: "1 1 200px", maxWidth: 340, minWidth: 180 },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: FAINT, display: "inline-flex", pointerEvents: "none" },
  search: {
    width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px", border: `1px solid #e6dcd2`, borderRadius: 0,
    fontSize: 14, fontFamily: SANS, background: "#fff", color: INK,
  },

  errBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 14px", fontSize: 13, color: "#8a2f16", background: "#fdecea", border: "1px solid #f3cfc2", lineHeight: 1.5 },

  tableCard: { borderRadius: 0, overflow: "hidden" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 1060 },
  th: { textAlign: "left", padding: "13px 18px", fontSize: 10.5, letterSpacing: 0.7, textTransform: "uppercase", color: MUTE, background: SOFT, borderBottom: `1px solid ${LINE_COOL}`, fontWeight: 700, whiteSpace: "nowrap" },
  td: { padding: "14px 18px", borderBottom: `1px solid #f4f1ec`, color: "#2a2f3a", verticalAlign: "top" },
  clientMeta: { display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" },
  srcPill: { display: "inline-flex", alignItems: "center", border: "1px solid", borderRadius: 0, padding: "2px 7px", fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", whiteSpace: "nowrap" },
  methPill: { display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid", borderRadius: 0, padding: "2px 7px 2px 6px", fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", whiteSpace: "nowrap" },
  subline: { fontSize: 12, color: MUTE },
  dueSub: { fontSize: 11.5, color: MUTE, marginTop: 3, fontVariantNumeric: "tabular-nums" },
  noBtn: { border: "none", background: "transparent", padding: 0, color: INK, fontFamily: SANS, fontWeight: 700, fontSize: 14, cursor: "pointer", fontVariantNumeric: "tabular-nums" },

  badge: {
    display: "inline-flex", alignItems: "center", border: "1px solid", borderRadius: 0,
    padding: "5px 11px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", letterSpacing: 0.2,
  },

  iconBtn: { width: 32, height: 32, display: "inline-grid", placeItems: "center", border: "none", background: "transparent", color: MUTE, cursor: "pointer", borderRadius: 0, marginLeft: 2 },

  skelWrap: { padding: "14px 18px" },
  skelRow: { height: 40, marginBottom: 10, borderRadius: 0 },

  empty: { textAlign: "center", padding: "48px 24px", color: MUTE, fontSize: 14 },

  backdrop: { position: "fixed", inset: 0, background: "rgba(24,22,28,.5)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box" },
  modal: { width: "100%", maxWidth: 440, background: "#fffdfb", border: `1px solid ${LINE}`, boxShadow: "0 30px 80px rgba(24,22,28,.34)", padding: 24, boxSizing: "border-box" },
  editModal: { width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", background: "#fffdfb", border: `1px solid ${LINE}`, boxShadow: "0 30px 80px rgba(24,22,28,.34)", padding: 24, boxSizing: "border-box" },
  modalTitle: { fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: INK, letterSpacing: -0.2 },
  modalSub: { fontSize: 13.5, color: BODY, lineHeight: 1.6, margin: "0 0 20px" },
  modalFoot: { display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
  delCta: { padding: "11px 20px", borderRadius: 0, border: "none", background: "#d33", color: "#fff", fontFamily: SANS, fontWeight: 800, fontSize: 14, cursor: "pointer" },

  editSubhelp: { fontSize: 12.5, color: MUTE, margin: "0 0 2px", lineHeight: 1.5 },
  editField: { display: "block", minWidth: 0 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, marginTop: 4 },
  sectionTitle: { fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", color: FAINT, margin: "20px 0 8px" },
  editInput: {
    width: "100%", boxSizing: "border-box", padding: "9px 11px", border: `1px solid #e6dcd2`, borderRadius: 0,
    fontSize: 14, fontFamily: SANS, background: "#fff", color: INK, colorScheme: "light",
  },
  editTextarea: {
    width: "100%", boxSizing: "border-box", padding: "9px 11px", border: `1px solid #e6dcd2`, borderRadius: 0,
    fontSize: 14, fontFamily: SANS, background: "#fff", color: INK, colorScheme: "light", minHeight: 62, resize: "vertical", lineHeight: 1.5,
  },
  segWrap: { display: "inline-flex", border: `1px solid ${LINE}`, background: CARD },
  segBtn: { padding: "9px 18px", border: "none", background: "transparent", color: BODY, fontFamily: SANS, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 },
  segBtnOn: { background: TERRA, color: "#fff" },
  segBtnWa: { background: WA, color: "#fff" },

  linesHead: { display: "grid", gridTemplateColumns: "1fr 62px 92px 96px 30px", gap: 8, padding: "0 2px 6px", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: FAINT },
  lineRow: { display: "grid", gridTemplateColumns: "1fr 62px 92px 96px 30px", gap: 8, alignItems: "center", marginBottom: 8 },
  lineNumInput: {
    width: "100%", boxSizing: "border-box", padding: "9px 8px", border: `1px solid #e6dcd2`, borderRadius: 0,
    fontSize: 14, fontFamily: SANS, background: "#fff", color: INK, colorScheme: "light", textAlign: "right", fontVariantNumeric: "tabular-nums",
  },
  lineAmt: { display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: 13.5, fontWeight: 700, color: INK, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden" },
  lineRemoveBtn: { width: 28, height: 28, display: "inline-grid", placeItems: "center", border: "none", background: "transparent", color: FAINT, cursor: "pointer", borderRadius: 0 },
  addLineBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: `1px dashed #d9cdbf`, borderRadius: 0, background: "transparent", color: BODY, fontFamily: SANS, fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 2 },

  discRow: { display: "flex", gap: 8 },
  discSelect: { width: 74, padding: "9px 10px", border: `1px solid ${LINE}`, borderRadius: 0, background: CARD, color: BODY, fontFamily: SANS, fontWeight: 700, fontSize: 14, cursor: "pointer", colorScheme: "light" },
  discInput: {
    width: "100%", boxSizing: "border-box", padding: "9px 11px", border: `1px solid #e6dcd2`, borderRadius: 0,
    fontSize: 14, fontFamily: SANS, background: "#fff", color: INK, colorScheme: "light", textAlign: "right", fontVariantNumeric: "tabular-nums",
  },

  editTotals: { marginTop: 18, padding: "14px 16px", background: "#fbf7f3", border: `1px solid ${LINE}` },
  editTotRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 13.5 },
  editTotLbl: { color: MUTE, fontWeight: 600 },
  editTotVal: { fontWeight: 700, color: INK, fontVariantNumeric: "tabular-nums" },
  editGrandRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0 2px", marginTop: 4, borderTop: `1px solid ${LINE}`, fontSize: 16 },
  editGrandVal: { fontWeight: 800, color: TERRA, fontVariantNumeric: "tabular-nums" },
  editFoot: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, flexWrap: "wrap" },

  /* send modal */
  sendNote: { padding: "11px 14px", background: "#fffcf9", border: `1px solid ${LINE}`, fontSize: 12.5, color: BODY, lineHeight: 1.55, margin: "12px 0" },
  sendNoteWa: { padding: "11px 14px", background: "#effaf3", border: "1px solid #cfead9", fontSize: 12.5, color: "#2f6a45", lineHeight: 1.55, margin: "12px 0" },
  sendSummary: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", margin: "14px 0 2px", background: "#fbf7f3", border: `1px solid ${LINE}` },

  payHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 4 },
  paySub: { fontSize: 13, color: MUTE, margin: "0 0 4px", fontWeight: 600 },
  fieldLabel: { display: "block", fontSize: 12.5, fontWeight: 700, color: BODY, marginBottom: 6, marginTop: 6 },
  paySummary: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "14px 16px", margin: "6px 0 14px", background: "#fbf7f3", border: `1px solid ${LINE}` },
  paySumLbl: { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: MUTE, whiteSpace: "nowrap" },
  paySumTotal: { fontSize: 18, fontWeight: 800, color: INK, marginTop: 4, fontVariantNumeric: "tabular-nums" },
  paySumMid: { fontSize: 18, fontWeight: 800, color: GREEN, marginTop: 4, fontVariantNumeric: "tabular-nums" },
  paySumDue: { fontSize: 18, fontWeight: 800, marginTop: 4, fontVariantNumeric: "tabular-nums" },

  payHistWrap: { marginBottom: 14, border: `1px solid ${LINE}`, background: "#fffdfb" },
  payHistHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: `1px solid ${LINE}`, fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: FAINT },
  payHistList: { maxHeight: 176, overflowY: "auto" },
  payHistRow: { display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", borderBottom: `1px solid #f4f1ec`, fontSize: 13 },
  payHistDate: { color: MUTE, fontSize: 12, minWidth: 92, whiteSpace: "nowrap" },
  payHistMeth: { display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid", borderRadius: 0, padding: "2px 7px 2px 6px", fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", whiteSpace: "nowrap" },
  payHistNote: { fontSize: 11.5, color: MUTE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 },
  payHistRight: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  payHistAmt: { fontWeight: 800, color: INK, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
  payHistDelBtn: { width: 26, height: 26, display: "inline-grid", placeItems: "center", border: "none", background: "transparent", color: FAINT, cursor: "pointer", borderRadius: 0 },
  payConfirmWrap: { display: "inline-flex", alignItems: "center", gap: 6 },
  histConfirmYes: { border: "none", background: "#fdecea", color: "#b3261e", fontFamily: SANS, fontWeight: 800, fontSize: 11, padding: "5px 10px", cursor: "pointer", borderRadius: 0 },
  histConfirmNo: { border: `1px solid ${LINE}`, background: CARD, color: BODY, fontFamily: SANS, fontWeight: 700, fontSize: 11, padding: "5px 10px", cursor: "pointer", borderRadius: 0 },
  payHistEmpty: { padding: "16px 14px", textAlign: "center", color: MUTE, fontSize: 12.5 },
  payFlash: { marginBottom: 12, padding: "9px 13px", background: "#e8f6ee", border: "1px solid #bfe3cd", color: "#15733f", fontSize: 12.5, fontWeight: 700 },
  payFullyNote: { marginTop: 4, padding: "11px 14px", background: "#e8f6ee", border: "1px solid #bfe3cd", color: "#15733f", fontSize: 12.5, fontWeight: 600, lineHeight: 1.5 },

  payInput: {
    width: "100%", boxSizing: "border-box", padding: "11px 14px", border: `1px solid #e6dcd2`, borderRadius: 0,
    fontSize: 16, fontWeight: 700, fontFamily: SANS, background: "#fff", color: INK, colorScheme: "light",
    fontVariantNumeric: "tabular-nums",
  },
  pinInput: {
    width: "100%", boxSizing: "border-box", padding: "10px 14px", border: `1px solid #e6dcd2`, borderRadius: 0,
    fontSize: 15, fontWeight: 700, letterSpacing: 3, fontFamily: SANS, background: "#fff", color: INK, colorScheme: "light",
  },
  payQuick: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  payAfter: { marginTop: 14, padding: "10px 14px", background: "#fffcf9", border: `1px solid ${LINE}`, fontSize: 12.5, color: BODY, lineHeight: 1.6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  payPreview: { marginTop: 12, fontSize: 13, color: BODY },
  payReactivate: { fontSize: 12, color: MUTE },
  payFoot: { display: "flex", alignItems: "center", gap: 10, marginTop: 22, flexWrap: "wrap" },
  payCancelledNote: { fontSize: 12.5, fontWeight: 700, color: MUTE },
  cancelInvBtn: {
    padding: "10px 14px", borderRadius: 0, border: `1px solid ${LINE}`, background: CARD, color: BODY,
    fontFamily: SANS, fontWeight: 700, fontSize: 13, cursor: "pointer",
  },

  spin: {},
  success: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "26px 8px 30px" },
  successRing: { width: 84, height: 84, borderRadius: "50%", border: "1px solid", display: "grid", placeItems: "center", marginBottom: 16 },
  successTitle: { fontSize: 19, fontWeight: 800, letterSpacing: -0.2 },
  successSub: { fontSize: 13, color: MUTE, marginTop: 6, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
};