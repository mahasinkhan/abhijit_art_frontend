import { useEffect, useMemo, useState } from "react";
import api from "../api";

/* ══════════════════════════════════════════════════════════════
   INVOICES  ·  saved-bills history

   Stored bills (POST /invoices): search, filter by status + by year/month,
   re-download the exact PDF, record/update part payments (additive), cancel,
   delete. Sensitive actions (delete / cancel / payment) require the security
   PIN — sent with the request and verified server-side. Prefix ivh-.

   PAID = LOCKED: once a bill is fully settled its payment can't be edited and
   it can't be cancelled (the action button turns into a disabled lock). Delete
   stays available — PIN-gated and audited — as the one correction path.

   Every request carries a timeout and clears its busy flag in `finally`, so a
   stalled backend shows a readable error instead of a spinner that never ends.
   On success the modal plays a checkmark-draw state, then auto-closes.

   Paid/Due is derived from the STATUS badge (effectivePaid), so figures can
   never contradict the badge and legacy "paid" rows saved with ₹0 read right.
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
const SANS = "'DM Sans', system-ui, sans-serif";

const GLOW =
  "radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.075) 0%, rgba(217,84,47,.022) 42%, rgba(217,84,47,0) 72%), linear-gradient(180deg, #fffcf9 0%, #ffffff 60%)";
const GLOW_SHADOW = "0 1px 2px rgba(17,20,30,.04), 0 10px 26px -18px rgba(217,84,47,.28)";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* how long a PIN-gated request may take before we give up (bcrypt + Neon
   round-trip + audit write can be slow on a cold connection) */
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
const signStamp = () =>
  new Date().toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
const escapeHtml = (s: any) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const escapeLines = (s: any) => escapeHtml(s).replace(/\r?\n/g, "<br/>");
const csvCell = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;

/* one place to turn any axios failure into something a human can act on */
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

/* ── types (mirror the stored record) ── */
type StoredItem = { desc: string; qty: number; rate: number };
type Business = { name?: string; address?: string; phone?: string; email?: string; gstin?: string; pan?: string };
type InvStatus = "unpaid" | "partial" | "paid" | "cancelled";
type Invoice = {
  id: string;
  invoiceNo: string;
  date: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  clientGstin: string | null;
  clientAddr: string | null;
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
  notes: string | null;
  warranty: string | null;
  status: InvStatus;
  createdAt: string;
  updatedAt: string;
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

/* effective amount received — derived from the badge so figures can never
   contradict it: paid = fully received, unpaid = nothing, partial / cancelled
   trust the stored amount. Auto-corrects legacy "paid" rows saved with ₹0. */
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
    lock: (<><rect x="5" y="11" width="14" height="10" rx="2" {...p} /><path d="M8 11V7a4 4 0 0 1 8 0v4" {...p} /></>),
    x: <path d="M18 6 6 18M6 6l12 12" {...p} />,
  };
  return (<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>{map[name]}</svg>);
}

/* animated success panel shown inside a modal after a save/cancel/delete.
   The checkmark stroke draws itself, the ring pops, then the caller auto-closes. */
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
      ? `<tr><td class="lbl">Advance paid</td><td class="r" style="color:${GREEN}">− ${rupee(paid)}</td></tr>` +
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
      .foot{margin-top:40px;text-align:center;font-size:11px;color:${FAINT}}
      @media print{body{padding:24px}}
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
  const [yearF, setYearF] = useState<"all" | number>("all");
  const [monthF, setMonthF] = useState<"all" | number>("all"); // 0–11

  /* payment modal (additive, PIN-gated) */
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [addAmount, setAddAmount] = useState("0"); // NEW amount received now
  const [payPin, setPayPin] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [payErr, setPayErr] = useState("");
  const [payDone, setPayDone] = useState<{ title: string; detail?: string; tone: string } | null>(null);

  /* delete modal (PIN-gated) */
  const [delTarget, setDelTarget] = useState<Invoice | null>(null);
  const [delPin, setDelPin] = useState("");
  const [delErr, setDelErr] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [delDone, setDelDone] = useState(false);

  const load = async (initial = false) => {
    initial ? setLoading(true) : setRefreshing(true);
    setError("");
    try {
      const res = await api.get("/invoices", { timeout: REQ_TIMEOUT });
      setList(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setError(errMessage(e, "Couldn't load invoices."));
    } finally {
      initial ? setLoading(false) : setRefreshing(false);
    }
  };

  useEffect(() => { load(true); }, []);

  /* distinct years present, newest first */
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const inv of list) {
      const d = new Date(inv.date);
      if (!isNaN(d.getTime())) set.add(d.getFullYear());
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [list]);

  /* invoices in the selected period (year/month) — drives the stat cards */
  const periodList = useMemo(() => {
    if (yearF === "all" && monthF === "all") return list;
    return list.filter((inv) => {
      const d = new Date(inv.date);
      if (isNaN(d.getTime())) return false;
      if (yearF !== "all" && d.getFullYear() !== yearF) return false;
      if (monthF !== "all" && d.getMonth() !== monthF) return false;
      return true;
    });
  }, [list, yearF, monthF]);

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

  /* stat cards — totals for the selected period, cancelled excluded */
  const stats = useMemo(() => {
    let billed = 0, received = 0, outstanding = 0;
    for (const inv of periodList) {
      if (inv.status === "cancelled") continue;
      const t = num(inv.total);
      const p = effectivePaid(inv);
      billed += t;
      received += p;
      outstanding += Math.max(t - p, 0);
    }
    return { count: periodList.length, billed: round2(billed), received: round2(received), outstanding: round2(outstanding) };
  }, [periodList]);

  const periodLabel =
    yearF === "all" && monthF === "all"
      ? "all time"
      : `${monthF === "all" ? "" : MONTHS[monthF] + " "}${yearF === "all" ? "all years" : yearF}`;

  /* record / update the received amount → PATCH /payment (additive, PIN-gated).
     On success: show the checkmark panel, then close after a beat. */
  const openPay = (inv: Invoice) => {
    if (inv.status === "paid") return; // fully paid = locked, no edits
    setPayErr("");
    setAddAmount("0");
    setPayPin("");
    setPayDone(null);
    setPayTarget(inv);
  };
  const savePayment = async () => {
    if (!payTarget) return;
    const total = num(payTarget.total);
    const prev = effectivePaid(payTarget);
    const newTotal = round2(Math.min(prev + Math.max(num(addAmount), 0), total));
    setPaySaving(true);
    setPayErr("");
    try {
      const res = await api.patch(
        `/invoices/${payTarget.id}/payment`,
        { paidAmount: newTotal, pin: payPin.trim() },
        { timeout: REQ_TIMEOUT },
      );
      const updated: Invoice = { ...payTarget, ...res.data };
      setList((rows) => rows.map((r) => (r.id === payTarget.id ? updated : r)));
      const bal = round2(Math.max(total - effectivePaid(updated), 0));
      setPayDone({
        title: bal <= 0 ? "Paid in full" : "Payment saved",
        detail: bal <= 0 ? `${payTarget.invoiceNo} · settled & locked` : `${payTarget.invoiceNo} · balance ${rupee(bal)}`,
        tone: GREEN,
      });
      setTimeout(() => setPayTarget(null), 1700); // hold the checkmark long enough to read
    } catch (e: any) {
      setPayErr(errMessage(e, "Couldn't save the payment."));
    } finally {
      setPaySaving(false); // the spinner always ends, success or not
    }
  };
  const cancelInvoice = async () => {
    if (!payTarget) return;
    setPaySaving(true);
    setPayErr("");
    try {
      const res = await api.patch(
        `/invoices/${payTarget.id}/status`,
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
      // axios needs the body under `data` for DELETE requests
      await api.delete(`/invoices/${delTarget.id}`, { data: { pin: delPin.trim() }, timeout: REQ_TIMEOUT });
      setDelDone(true);
      const id = delTarget.id;
      setTimeout(() => {
        setList((rows) => rows.filter((r) => r.id !== id)); // remove after the tick shows
        setDelTarget(null);
      }, 1600);
    } catch (e: any) {
      setDelErr(errMessage(e, "Couldn't delete the invoice."));
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = () => {
    const head = ["Invoice No", "Date", "Client", "Phone", "Email", "GSTIN", "Subtotal", "Discount", "GST", "Total", "Paid", "Due", "Status"];
    const body = shown.map((inv) => {
      const total = num(inv.total);
      const paid = effectivePaid(inv);
      return [
        inv.invoiceNo, fmt(inv.date), inv.clientName || "", inv.clientPhone || "", inv.clientEmail || "",
        inv.clientGstin || "", num(inv.subtotal).toFixed(2), num(inv.discountAmt).toFixed(2),
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

  /* live values for the payment modal */
  const payTotal = payTarget ? num(payTarget.total) : 0;
  const payPrev = payTarget ? effectivePaid(payTarget) : 0;
  const payAdd = Math.max(num(addAmount), 0);
  const payNewTotal = round2(Math.min(payPrev + payAdd, payTotal));
  const payBalanceNow = round2(Math.max(payTotal - payPrev, 0));
  const payNewBalance = round2(Math.max(payTotal - payNewTotal, 0));
  const payPreview = deriveStatus(payNewTotal, payTotal);

  return (
    <div style={st.page}>
      <div style={st.head}>
        <div>
          <h1 style={st.title}>Invoices</h1>
          <p style={st.sub}>Every bill you download or email is saved here.</p>
        </div>
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
            value={String(yearF)}
            onChange={(e) => setYearF(e.target.value === "all" ? "all" : Number(e.target.value))}
            title="Filter by year"
          >
            <option value="all">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            className="ivh-datesel"
            style={st.dateSel}
            value={String(monthF)}
            onChange={(e) => setMonthF(e.target.value === "all" ? "all" : Number(e.target.value))}
            title="Filter by month"
          >
            <option value="all">All months</option>
            {MONTHS.map((mo, i) => <option key={mo} value={i}>{mo}</option>)}
          </select>

          <div style={st.searchWrap}>
            <span style={st.searchIcon}><Icon name="search" size={15} /></span>
            <input
              className="ivh-in"
              style={st.search}
              placeholder="Search invoice no, client…"
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
                  <th style={{ ...st.th, textAlign: "right", width: 128 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((inv, i) => {
                  const m = STATUS_META[inv.status];
                  const total = num(inv.total);
                  const paid = effectivePaid(inv);
                  const due = round2(Math.max(total - paid, 0));
                  const locked = inv.status === "paid"; // settled bills can't be edited
                  return (
                    <tr key={inv.id} className="ivh-tr">
                      <td style={{ ...st.td, color: FAINT, textAlign: "center" }}>{i + 1}</td>
                      <td style={st.td}>
                        <button className="ivh-nolink" style={st.noBtn} onClick={() => printInvoice(inv)} title="Download / print this bill">
                          {inv.invoiceNo}
                        </button>
                      </td>
                      <td style={st.td}>
                        <div style={{ fontWeight: 700, color: INK }}>{inv.clientName || "—"}</div>
                        {(inv.clientPhone || inv.clientEmail) && (
                          <div style={st.subline}>{inv.clientPhone || inv.clientEmail}</div>
                        )}
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
                        <button className="ivh-icon" style={st.iconBtn} onClick={() => openPay(inv)}
                          disabled={locked}
                          title={locked ? "Paid — locked, no edits" : "Record / update payment"}>
                          <Icon name={locked ? "lock" : "banknote"} size={locked ? 15 : 17} />
                        </button>
                        <button className="ivh-icon" style={st.iconBtn} onClick={() => printInvoice(inv)} title="Download / print">
                          <Icon name="download" size={16} />
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

      {/* payment modal (additive, PIN-gated) */}
      {payTarget && (
        <div style={st.backdrop} onClick={() => !paySaving && !payDone && setPayTarget(null)}>
          <div className="ivh-modal" style={{ ...st.modal, maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            {payDone ? (
              <SuccessPanel title={payDone.title} detail={payDone.detail} tone={payDone.tone} />
            ) : (
              <>
                <div style={st.payHead}>
                  <div>
                    <h3 style={st.modalTitle}>Payment · {payTarget.invoiceNo}</h3>
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
                    <div style={st.paySumLbl}>Received so far</div>
                    <div style={st.paySumMid}>{rupee(payPrev)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={st.paySumLbl}>Balance</div>
                    <div style={{ ...st.paySumDue, color: payBalanceNow > 0 ? TERRA : GREEN }}>{payBalanceNow > 0 ? rupee(payBalanceNow) : "Settled"}</div>
                  </div>
                </div>

                <label style={{ display: "block", marginTop: 4 }}>
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
                    After this: total received <b style={{ color: INK }}>{rupee(payNewTotal)}</b> · balance{" "}
                    <b style={{ color: payNewBalance > 0 ? TERRA : GREEN }}>{payNewBalance > 0 ? rupee(payNewBalance) : "Settled"}</b>
                    {payNewBalance <= 0 && <span style={st.payLockNote}> · this will lock the invoice from further edits</span>}
                  </div>
                )}

                <div style={st.payPreview}>
                  Status will be <span style={{ ...st.badge, ...badgeStyle(payPreview) }}>{STATUS_META[payPreview].label}</span>
                  {payTarget.status === "cancelled" && <span style={st.payReactivate}> · saving reactivates this cancelled invoice</span>}
                </div>

                <label style={{ display: "block", marginTop: 16 }}>
                  <span style={st.fieldLabel}>
                    <span style={{ display: "inline-flex", verticalAlign: "-2px", marginRight: 5, color: MUTE }}><Icon name="lock" size={13} /></span>
                    Security PIN <span style={{ fontWeight: 500, color: MUTE }}>· required to save or cancel</span>
                  </span>
                  <input className="ivh-in" style={st.pinInput} type="password" value={payPin}
                    name="aa-billing-pin" autoComplete="one-time-code" inputMode="numeric"
                    data-1p-ignore data-lpignore="true" data-form-type="other"
                    onChange={(e) => setPayPin(e.target.value)} placeholder="••••••"
                    onKeyDown={(e) => { if (e.key === "Enter" && payPin.trim() && !paySaving) savePayment(); }} />
                </label>

                {payErr && <div style={{ ...st.errBanner, marginTop: 14, marginBottom: 0 }}>{payErr}</div>}

                <div style={st.payFoot}>
                  {payTarget.status === "cancelled" ? (
                    <span style={st.payCancelledNote}>Cancelled</span>
                  ) : (
                    <button className="ivh-cancelinv" style={st.cancelInvBtn} onClick={cancelInvoice} disabled={paySaving || !payPin.trim()}>
                      Cancel invoice
                    </button>
                  )}
                  <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                    <button className="ivh-ghost" style={st.ghostBtn} onClick={() => setPayTarget(null)} disabled={paySaving}>Close</button>
                    <button className="ivh-save" style={st.saveBtn} onClick={savePayment} disabled={paySaving || !payPin.trim()}>
                      {paySaving ? <span className="ivh-spin" style={st.spin} /> : "Save payment"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* delete confirm (PIN-gated) */}
      {delTarget && (
        <div style={st.backdrop} onClick={() => !deleting && !delDone && setDelTarget(null)}>
          <div className="ivh-modal" style={st.modal} onClick={(e) => e.stopPropagation()}>
            {delDone ? (
              <SuccessPanel title="Invoice deleted" detail={delTarget.invoiceNo} tone="#b3261e" />
            ) : (
              <>
                <h3 style={st.modalTitle}>Delete invoice {delTarget.invoiceNo}?</h3>
                <p style={st.modalSub}>
                  This removes the saved record for <b>{delTarget.clientName || "—"}</b> ({rupee(delTarget.total)}) permanently.
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

        .ivh-ghost, .ivh-chip, .ivh-icon, .ivh-nolink, .ivh-del-cta, .ivh-save, .ivh-cancelinv { transition: all .16s ease; }
        .ivh-ghost:hover:not(:disabled) { background: #fffcf9; border-color: ${TERRA}55; color: ${TERRA}; }
        .ivh-ghost:disabled { opacity: .45; cursor: not-allowed; }

        .ivh-chip:hover:not(:disabled) { border-color: ${TERRA}55; color: ${TERRA}; }
        .ivh-chip:disabled { opacity: .4; cursor: not-allowed; }
        .ivh-chip.on { background: ${TERRA}; border-color: ${TERRA}; color: #fff; }

        .ivh-nolink:hover { color: ${TERRA}; text-decoration: underline; }

        /* locked (paid) rows keep a flat, non-interactive icon */
        .ivh-icon:not(:disabled):hover { color: ${TERRA}; background: #fffcf9; }
        .ivh-icon.ivh-danger:not(:disabled):hover { color: #d33; background: #fdecea; }
        .ivh-icon:disabled { opacity: .4; cursor: not-allowed; }

        .ivh-save { min-width: 128px; display: inline-flex; align-items: center; justify-content: center; }
        .ivh-save:hover:not(:disabled) { background: ${TERRA_DK}; box-shadow: 0 10px 22px ${TERRA}40; }
        .ivh-save:disabled { opacity: .6; cursor: default; }

        .ivh-del-cta { min-width: 128px; display: inline-flex; align-items: center; justify-content: center; }
        .ivh-del-cta:hover:not(:disabled) { background: #b3271a; }
        .ivh-del-cta:disabled { opacity: .6; cursor: default; }

        .ivh-cancelinv:hover:not(:disabled) { color: #d33; border-color: #e7a9a2; background: #fdecea; }
        .ivh-cancelinv:disabled { opacity: .5; cursor: default; }

        .ivh-tr:hover td { background: #fafbfc; }

        .ivh-dim { opacity: .55; pointer-events: none; transition: opacity .15s; }

        .ivh-skel { background: linear-gradient(90deg, #f1ece6 25%, #f7f3ee 37%, #f1ece6 63%); background-size: 400% 100%; animation: ivhShimmer 1.3s ease infinite; }
        @keyframes ivhShimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

        /* modal entrance */
        .ivh-modal { animation: ivhPop .22s cubic-bezier(.2,.9,.3,1.2) both; }
        @keyframes ivhPop { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: none; } }

        /* button spinner */
        .ivh-spin { width: 17px; height: 17px; border-radius: 50%; border: 2.5px solid rgba(255,255,255,.5); border-top-color: #fff; animation: ivhSpin .6s linear infinite; }
        @keyframes ivhSpin { to { transform: rotate(360deg); } }

        /* success panel */
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
          .ivh-in,.ivh-datesel,.ivh-ghost,.ivh-chip,.ivh-icon,.ivh-nolink,.ivh-del-cta,.ivh-save,.ivh-cancelinv,.ivh-skel,
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

  head: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 18 },
  title: { fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.6, color: INK },
  sub: { color: MUTE, fontSize: 13.5, margin: "6px 0 0" },
  headActions: { display: "flex", gap: 10, flexWrap: "wrap" },

  ghostBtn: {
    display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 0,
    border: `1px solid ${LINE}`, background: CARD, color: INK, fontFamily: SANS, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
  },
  saveBtn: {
    padding: "10px 18px", borderRadius: 0, border: "none", background: TERRA, color: "#fff",
    fontFamily: SANS, fontWeight: 800, fontSize: 13.5, cursor: "pointer",
  },

  statsHead: { marginBottom: 8 },
  statsPeriod: { fontSize: 12.5, color: MUTE, fontWeight: 600, textTransform: "capitalize" },
  stats: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 16, marginBottom: 18 },
  statcard: { borderRadius: 0, padding: "18px 20px", minWidth: 0 },
  statnum: { fontSize: 24, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" },
  statlbl: { fontSize: 12.5, color: MUTE, marginTop: 7, fontWeight: 600 },

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
  searchWrap: { position: "relative", flex: "1 1 200px", maxWidth: 320, minWidth: 160 },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: FAINT, display: "inline-flex", pointerEvents: "none" },
  search: {
    width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px", border: `1px solid #e6dcd2`, borderRadius: 0,
    fontSize: 14, fontFamily: SANS, background: "#fff", color: INK,
  },

  errBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 14px", fontSize: 13, color: "#8a2f16", background: "#fdecea", border: "1px solid #f3cfc2", lineHeight: 1.5 },

  tableCard: { borderRadius: 0, overflow: "hidden" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 900 },
  th: { textAlign: "left", padding: "13px 18px", fontSize: 10.5, letterSpacing: 0.7, textTransform: "uppercase", color: MUTE, background: SOFT, borderBottom: `1px solid ${LINE_COOL}`, fontWeight: 700, whiteSpace: "nowrap" },
  td: { padding: "14px 18px", borderBottom: `1px solid #f4f1ec`, color: "#2a2f3a", verticalAlign: "top" },
  subline: { fontSize: 12, color: MUTE, marginTop: 3 },
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
  modalTitle: { fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: INK, letterSpacing: -0.2 },
  modalSub: { fontSize: 13.5, color: BODY, lineHeight: 1.6, margin: "0 0 20px" },
  modalFoot: { display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
  delCta: { padding: "11px 20px", borderRadius: 0, border: "none", background: "#d33", color: "#fff", fontFamily: SANS, fontWeight: 800, fontSize: 14, cursor: "pointer" },

  /* payment modal */
  payHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 4 },
  paySub: { fontSize: 13, color: MUTE, margin: "0 0 4px", fontWeight: 600 },
  fieldLabel: { display: "block", fontSize: 12.5, fontWeight: 700, color: BODY, marginBottom: 6, marginTop: 6 },
  paySummary: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "14px 16px", margin: "6px 0 16px", background: "#fbf7f3", border: `1px solid ${LINE}` },
  paySumLbl: { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: MUTE, whiteSpace: "nowrap" },
  paySumTotal: { fontSize: 18, fontWeight: 800, color: INK, marginTop: 4, fontVariantNumeric: "tabular-nums" },
  paySumMid: { fontSize: 18, fontWeight: 800, color: GREEN, marginTop: 4, fontVariantNumeric: "tabular-nums" },
  paySumDue: { fontSize: 18, fontWeight: 800, marginTop: 4, fontVariantNumeric: "tabular-nums" },
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
  payAfter: { marginTop: 14, padding: "10px 14px", background: "#fffcf9", border: `1px solid ${LINE}`, fontSize: 12.5, color: BODY, lineHeight: 1.5 },
  payLockNote: { color: MUTE, fontWeight: 600 },
  payPreview: { marginTop: 14, fontSize: 13, color: BODY, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  payReactivate: { fontSize: 12, color: MUTE },
  payFoot: { display: "flex", alignItems: "center", gap: 10, marginTop: 22, flexWrap: "wrap" },
  payCancelledNote: { fontSize: 12.5, fontWeight: 700, color: MUTE },
  cancelInvBtn: {
    padding: "10px 14px", borderRadius: 0, border: `1px solid ${LINE}`, background: CARD, color: BODY,
    fontFamily: SANS, fontWeight: 700, fontSize: 13, cursor: "pointer",
  },

  /* success panel */
  spin: {},
  success: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "26px 8px 30px" },
  successRing: { width: 84, height: 84, borderRadius: "50%", border: "1px solid", display: "grid", placeItems: "center", marginBottom: 16 },
  successTitle: { fontSize: 19, fontWeight: 800, letterSpacing: -0.2 },
  successSub: { fontSize: 13, color: MUTE, marginTop: 6, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
};