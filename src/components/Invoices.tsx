import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";

const INK = "#1f2430"; const BODY = "#545a67"; const MUTE = "#8a8f9a"; const FAINT = "#b6bac3";
const LINE = "#f0e6dc"; const LINE_COOL = "#ececf1"; const SOFT = "#fafbfc"; const CARD = "#ffffff";
const TERRA = "#d9542f"; const TERRA_DK = "#c8481f"; const GREEN = "#15733f";
const WA = "#1fa855"; const WA_DK = "#178544"; const SANS = "'DM Sans', system-ui, sans-serif";
const GLOW = "radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.075) 0%, rgba(217,84,47,.022) 42%, rgba(217,84,47,0) 72%), linear-gradient(180deg, #fffcf9 0%, #ffffff 60%)";
const GLOW_SHADOW = "0 1px 2px rgba(17,20,30,.04), 0 10px 26px -18px rgba(217,84,47,.28)";
const REQ_TIMEOUT = 15000;

const num = (v: any) => { const n = parseFloat(String(v)); return Number.isFinite(n) ? n : 0; };
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const rupee = (v: any) => "₹" + num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (d: string) => { if (!d) return ""; const dt = new Date(d); if (isNaN(dt.getTime())) return d; return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); };
const fmtTime = (d: string) => { if (!d) return ""; const dt = new Date(d); if (isNaN(dt.getTime())) return ""; return dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); };
const toDateInput = (d: string) => { const dt = new Date(d); if (isNaN(dt.getTime())) return ""; const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 10); };
const signStamp = () => new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
const escapeHtml = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const escapeLines = (s: any) => escapeHtml(s).replace(/\r?\n/g, "<br/>");
const csvCell = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;
const waDigits = (raw: string) => { let d = String(raw || "").replace(/\D/g, "").replace(/^0+/, ""); if (d.length === 10) d = "91" + d; return d; };
const errMessage = (e: any, fallback: string) => { if (e?.code === "ECONNABORTED") return "The server didn't respond in time."; if (e?.message === "Network Error") return "Couldn't reach the server."; return e?.response?.data?.message || fallback; };
const deriveStatus = (paid: number, total: number): InvStatus => { if (paid <= 0.005) return "unpaid"; if (paid + 0.005 >= total) return "paid"; return "partial"; };
const calcTotals = (items: { qty: any; rate: any }[], discType: "amount" | "percent", discVal: any, taxPct: any) => {
  const subtotal = items.reduce((s, it) => s + num(it.qty) * num(it.rate), 0);
  const dv = num(discVal);
  const discountAmt = discType === "percent" ? (subtotal * dv) / 100 : Math.min(dv, subtotal);
  const taxable = Math.max(subtotal - discountAmt, 0);
  const taxAmt = (taxable * num(taxPct)) / 100;
  const total = taxable + taxAmt;
  return { subtotal: round2(subtotal), discountAmt: round2(discountAmt), taxAmt: round2(taxAmt), total: round2(total) };
};

type Period = "all" | "today" | "week" | "month" | "quarter" | "half" | "year";
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "all", label: "All time" }, { value: "today", label: "Daily" }, { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" }, { value: "quarter", label: "Quarterly" }, { value: "half", label: "Half-yearly" }, { value: "year", label: "Yearly" },
];
const PERIOD_LABEL: Record<Period, string> = { all: "all time", today: "today", week: "this week", month: "this month", quarter: "this quarter", half: "this half-year", year: "this year" };
const periodSince = (p: Period): Date | null => {
  if (p === "all") return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (p) {
    case "today": return startOfToday;
    case "week": { const dow = (startOfToday.getDay() + 6) % 7; return new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - dow); }
    case "month": return new Date(now.getFullYear(), now.getMonth(), 1);
    case "quarter": return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case "half": return new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
    case "year": return new Date(now.getFullYear(), 0, 1);
    default: return null;
  }
};

type StoredItem = { desc: string; qty: number; rate: number };
type Business = { name?: string; address?: string; phone?: string; email?: string; gstin?: string; pan?: string };
type InvStatus = "unpaid" | "partial" | "paid" | "cancelled";
type InvSource = "online" | "offline";
type InvMethod = "cash" | "online";
type Payment = { id: string; amount: string; method: InvMethod; note: string | null; createdAt: string };
type Invoice = { id: string; invoiceNo: string; date: string; clientName: string; clientPhone: string | null; clientEmail: string | null; clientGstin: string | null; clientAddr: string | null; source: InvSource; business: Business; items: StoredItem[]; discType: "amount" | "percent"; discVal: string; taxPct: string; subtotal: string; discountAmt: string; taxAmt: string; total: string; paidAmount: string; payments: Payment[]; notes: string | null; warranty: string | null; status: InvStatus; createdAt: string; updatedAt: string; pdfUrl?: string | null; };
type EditItem = { desc: string; qty: string; rate: string };
type EditForm = { date: string; clientName: string; clientPhone: string; clientEmail: string; clientGstin: string; clientAddr: string; source: InvSource; items: EditItem[]; discType: "amount" | "percent"; discVal: string; taxPct: string; notes: string; warranty: string; };

const STATUS_META: Record<InvStatus, { label: string; fg: string; bg: string; bd: string; dot: string }> = {
  unpaid:    { label: "Unpaid",    fg: "#9a6a12", bg: "#fbf3e3", bd: "#efdcb2", dot: "#e0a83e" },
  partial:   { label: "Partial",   fg: "#1d5fd8", bg: "#eaf0fc", bd: "#cbdbf6", dot: "#3b74e0" },
  paid:      { label: "Paid",      fg: "#15733f", bg: "#e8f6ee", bd: "#bfe3cd", dot: "#28a35f" },
  cancelled: { label: "Cancelled", fg: "#6b7280", bg: "#f1f2f5", bd: "#e4e5ea", dot: "#9aa0ab" },
};
const STATUSES: InvStatus[] = ["unpaid", "partial", "paid", "cancelled"];
const badgeStyle = (s: InvStatus): React.CSSProperties => ({ color: STATUS_META[s].fg, background: STATUS_META[s].bg, borderColor: STATUS_META[s].bd });
const SOURCE_META: Record<InvSource, { label: string; fg: string; bg: string; bd: string }> = { online: { label: "Online", fg: "#3a6ea5", bg: "#eef4fb", bd: "#d5e4f4" }, offline: { label: "Walk-in", fg: "#9a6a3a", bg: "#f7efe6", bd: "#ecdcc9" } };
const srcMeta = (s: any) => SOURCE_META[(s as InvSource) === "online" ? "online" : "offline"];
const METHOD_META: Record<InvMethod, { label: string; fg: string; bg: string; bd: string; icon: string }> = { cash: { label: "Cash", fg: "#4a7a52", bg: "#eef5ef", bd: "#cfe3d2", icon: "banknote" }, online: { label: "Online", fg: "#5b52a3", bg: "#efeefb", bd: "#dcd8f2", icon: "card" } };
const MIXED_META = { label: "Mixed", fg: "#6b6f7a", bg: "#f1f2f4", bd: "#e0e2e7", icon: "coins" };
const methMeta = (m: any) => METHOD_META[(m as InvMethod) === "online" ? "online" : "cash"];
const methodSummary = (inv: Invoice) => { const ps = Array.isArray(inv.payments) ? inv.payments : []; if (!ps.length) return null; const set = new Set(ps.map((p) => (p.method === "online" ? "online" : "cash"))); if (set.size > 1) return MIXED_META; return set.has("online") ? METHOD_META.online : METHOD_META.cash; };
const effectivePaid = (inv: Invoice): number => { const total = num(inv.total); if (inv.status === "paid") return round2(total); if (inv.status === "unpaid") return 0; return round2(Math.min(Math.max(num(inv.paidAmount), 0), total)); };

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
    user: (<><circle cx="12" cy="8" r="4" {...p} /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" {...p} /></>),
    phone: <path d="M6.5 3.5c.5 0 .9.3 1.1.8l1 2.4c.2.5.1 1-.3 1.4L8 9.5c1 2 2.5 3.5 4.5 4.5l1.4-1.3c.4-.4.9-.5 1.4-.3l2.4 1c.5.2.8.6.8 1.1v3c0 .7-.6 1.3-1.3 1.2C10.5 18 6 13.5 5.3 6.8 5.2 6.1 5.8 5.5 6.5 5.5z" fill="currentColor" stroke="none" />,
    cash: (<><rect x="2" y="6" width="20" height="12" rx="2" {...p} /><circle cx="12" cy="12" r="2.5" {...p} /></>),
    whatsapp: (<><path d="M3.8 20.2 5 16.4A8.4 8.4 0 1 1 8.2 19l-4.4 1.2z" {...p} /><path d="M9.2 8.6c-.15 0-.4.05-.6.3-.2.25-.75.73-.75 1.77s.77 2.05.88 2.2c.1.14 1.5 2.4 3.68 3.28 1.83.72 2.2.58 2.6.55.4-.04 1.24-.5 1.42-1 .18-.5.18-.9.12-1l-.55-.27s-1.05-.52-1.22-.58c-.16-.06-.28-.1-.4.1l-.55.7c-.1.12-.2.13-.37.05-.16-.08-.9-.33-1.66-1.05-.6-.55-1.02-1.22-1.14-1.42-.1-.2-.01-.3.07-.4l.28-.35c.1-.12.13-.2.2-.34.06-.13.03-.25 0-.35-.05-.1-.4-1.13-.6-1.55-.14-.3-.28-.3-.4-.3H9.2z" fill="currentColor" stroke="none" /></>),
  };
  return (<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>{map[name]}</svg>);
}

function SuccessPanel({ title, detail, tone = GREEN }: { title: string; detail?: string; tone?: string }) {
  return (
    <div className="ivh-success" style={st.success}>
      <div className="ivh-successring" style={{ ...st.successRing, background: `${tone}14`, borderColor: `${tone}44` }}>
        <svg width="46" height="46" viewBox="0 0 52 52" aria-hidden>
          <circle className="ivh-checkcircle" cx="26" cy="26" r="23" fill="none" stroke={tone} strokeWidth="3" />
          <path className="ivh-checkmark" fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M15 27 L23 34 L38 18" />
        </svg>
      </div>
      <div className="ivh-successtitle" style={{ ...st.successTitle, color: tone }}>{title}</div>
      {detail && <div className="ivh-successsub" style={st.successSub}>{detail}</div>}
    </div>
  );
}

/* ── printInvoice: single A5 PDF ── */

function buildSingleHalfA4HTML(p: Parameters<typeof buildInvoicePopupHTML>[0]): string {
  const e=(s:any)=>String(s??"").replace(/[&<>"']/g,(c:string)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":'&#39;'}[c]as string));
  const fmtN=(n:number)=>Math.round(n).toLocaleString("en-IN");
  const taxable=p.subtotal-p.discountAmt; const cgst=p.taxAmt/2; const due=Math.max(p.total-p.paidAmount,0);
  function amtWords(n:number):string{const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];const m=Math.round(n);if(m===0)return"Zero Only";function b(x:number):string{if(x<20)return ones[x];if(x<100)return tens[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");return ones[Math.floor(x/100)]+" Hundred"+(x%100?" "+b(x%100):"");}let r="";if(m>=10000000)r+=b(Math.floor(m/10000000))+" Crore ";if(m>=100000)r+=b(Math.floor((m%10000000)/100000))+" Lakh ";if(m>=1000)r+=b(Math.floor((m%100000)/1000))+" Thousand ";r+=b(m%1000);return r.trim()+" Only";}
  const rows=p.items.map((it,i)=>{const lt=it.qty*it.rate;const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0;const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0;return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td r">${it.qty}</td><td class="td r">₹${fmtN(it.rate)}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}<br/><small>${p.discType==="percent"?p.discVal+"%":""}</small></td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}<br/><small>${p.taxPct}%</small></td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`;}).join("");
  const css=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}body{font-family:'Inter',Arial,sans-serif;font-size:8pt;color:#1a1a2e;background:#f0ece4;display:flex;justify-content:center;padding:6px}.page{width:210mm;height:297mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.18);display:flex;flex-direction:column}.inv{height:148.5mm;display:flex;flex-direction:column;overflow:hidden;border-bottom:2px dashed #aaa}.blank{flex:1;background:#fff}.hdr{display:flex;align-items:center;gap:3mm;padding:3mm 4mm 2.5mm;border-bottom:2.5px solid #e89a3c;background:linear-gradient(135deg,#fff2e6 0%,#fff8f0 50%,#fff 100%);flex-shrink:0}.logo{width:24mm;height:24mm;object-fit:contain;flex-shrink:0}.logo-fb{width:14mm;height:14mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f0e8d0;border:1px solid #c8a84b;border-radius:50%;font-size:7pt;font-weight:800;color:#8a6a1c}.biz{flex:1}.biz-name{font-size:12pt;font-weight:900;color:#c56a3a;line-height:1.1}.biz-pan{font-size:6.5pt;color:#444;font-weight:600;margin-top:.5mm}.biz-addr{font-size:5.5pt;color:#666;margin-top:.5mm}.biz-sub{font-size:5.5pt;color:#666;margin-top:.3mm;display:flex;flex-wrap:wrap;gap:2.5mm}.inv-meta{text-align:right;flex-shrink:0;align-self:center}.inv-row{display:flex;gap:4mm;justify-content:flex-end}.inv-col{text-align:right}.inv-lbl{font-size:6pt;font-weight:700;color:#8a8f9a;text-transform:uppercase;letter-spacing:.4px}.inv-val{font-size:8pt;font-weight:800;color:#c56a3a;margin-top:.3mm}.inv-time{font-size:5.5pt;font-weight:600;color:#888;margin-top:.2mm}.billto{padding:2mm 4mm;border-bottom:1px solid #f0e0d0;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%);flex-shrink:0}.bt-lbl{font-size:6.5pt;font-weight:800;color:#c56a3a;text-transform:uppercase;letter-spacing:.6px;padding-bottom:.8mm;border-bottom:1.5px solid #e89a3c;display:inline-block;margin-bottom:.8mm}.bt-name{font-size:8pt;font-weight:700}.bt-line{font-size:5.5pt;color:#555;margin-top:.3mm}.tbl{width:100%;border-collapse:collapse;flex-shrink:0}.th{background:#c56a3a;color:#fff;padding:1.8mm 2mm;font-size:6pt;font-weight:700;text-align:left}.td{padding:1.8mm 2mm;border-bottom:.5px solid #ede8dc;font-size:7pt;vertical-align:top}.td small{font-size:5pt;color:#888;display:block}.sub-row td{background:#f5f0e8;font-weight:800;font-size:8.5pt;padding:1.5mm 2mm;border-top:1.5px solid #c8a84b}.r{text-align:right}.c{text-align:center}.bold{font-weight:700}.bot{display:flex;flex:1;border-top:1px solid #e8e0cc;min-height:0}.bot-l{flex:1.1;padding:2.5mm 3.5mm;display:flex;flex-direction:column;gap:2mm;border-right:1px solid #e8e0cc}.bot-r{flex:1;padding:2.5mm 3.5mm;display:flex;flex-direction:column;gap:1mm}.t-lbl{font-size:6.5pt;font-weight:800;color:#c56a3a;margin-bottom:.3mm}.t-txt{font-size:5.5pt;color:#555;line-height:1.4}.qr-row{display:flex;gap:4mm;align-items:flex-end;margin-top:auto;padding-top:1mm}.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:1.5mm}.qr-img{width:34mm;height:34mm;object-fit:contain;border:.5px solid #ddd}.qr-lbl{font-size:6pt;font-weight:700;color:#c56a3a;text-align:center}.qr-badges{display:flex;gap:.8mm;flex-wrap:wrap;justify-content:center}.badge{font-size:4pt;font-weight:700;color:#c56a3a;border:.5px solid #e89a3c;padding:.2mm .8mm;background:#fff6ee}.qr-upi{font-size:4.5pt;color:#555;text-align:center}.sig{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}.sig-line{width:24mm;border-bottom:.5px solid #888;margin:.8mm auto .4mm}.sig-lbl{font-size:5pt;color:#555}.t-row{display:flex;justify-content:space-between;font-size:7pt;padding:1mm 0;border-bottom:.5px solid #ede8dc}.grand{background:#c56a3a;color:#fff;padding:2mm 2.5mm;margin-top:1.5mm}.g-row{display:flex;justify-content:space-between;align-items:baseline;font-size:8pt}.g-val{font-size:11pt;font-weight:900}.g-due{display:flex;justify-content:space-between;font-size:6.5pt;color:#ffccaa;margin-top:.3mm}.g-paid{display:flex;justify-content:center;font-size:7.5pt;font-weight:800;letter-spacing:1px;color:#8affc0;margin-top:1mm;padding-top:1mm;border-top:.5px solid rgba(255,255,255,.35)}.words{border:.5px solid #f0d8c0;padding:1.5mm 2mm;margin-top:1.5mm;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)}.w-lbl{font-size:5.5pt;font-weight:700;color:#c56a3a;margin-bottom:.3mm}.w-txt{font-size:6.5pt;color:#333;font-weight:600}.thankyou{text-align:right;font-size:8pt;font-weight:800;color:#c56a3a;margin-top:auto;padding-top:3mm;font-style:italic}@media print{@page{size:A4 portrait;margin:0}html,body{background:#fff !important;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}.page{box-shadow:none;border:none;width:100%;height:100vh}.inv{height:50vh}.blank{height:50vh}.th,.grand,.sub-row td,.hdr,.billto,.words{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head><body>
  <div class="page">
    <div class="inv">
      <div class="hdr">
        ${p.logoSrc?`<img src="${e(p.logoSrc)}" class="logo" onerror="this.style.display='none'"/>`:`<div class="logo-fb">${e(p.bizName.slice(0,2))}</div>`}
        <div class="biz"><div class="biz-name">${e(p.bizName)}</div>${p.bizPan?`<div class="biz-pan">Pan No &nbsp;<b>${e(p.bizPan)}</b></div>`:""}${p.bizAddress?`<div class="biz-addr">📍 ${e(p.bizAddress)}</div>`:""}<div class="biz-sub">${p.bizPhone?`<span>📞 ${e(p.bizPhone)}</span>`:""}${p.bizEmail?`<span>✉ ${e(p.bizEmail)}</span>`:""}${p.bizGstin?`<span>GSTIN: ${e(p.bizGstin)}</span>`:""}</div></div>
        <div class="inv-meta"><div class="inv-row"><div class="inv-col"><div class="inv-lbl">Invoice Date</div><div class="inv-val">${e(p.invDate)}</div>${p.invTime?`<div class="inv-time">${e(p.invTime)}</div>`:""}</div><div class="inv-col"><div class="inv-lbl">Invoice No</div><div class="inv-val">#${e(p.invNo)}</div></div></div></div>
      </div>
      <div class="billto"><div class="bt-lbl">Bill To</div><div class="bt-name">${e(p.clientName)||"—"}</div>${p.clientAddr?`<div class="bt-line">${e(p.clientAddr)}</div>`:""}${p.clientPhone?`<div class="bt-line">📞 ${e(p.clientPhone)}</div>`:""}${p.clientGstin?`<div class="bt-line">GSTIN: ${e(p.clientGstin)}</div>`:""}</div>
      <table class="tbl"><thead><tr><th class="th c" style="width:6mm">No</th><th class="th">Items</th><th class="th r" style="width:9mm">Qty</th><th class="th r" style="width:15mm">Rate</th>${p.discountAmt>0?`<th class="th r" style="width:13mm">Disc.</th>`:""}${p.taxPct>0?`<th class="th r" style="width:12mm">Tax</th>`:""}<th class="th r" style="width:16mm">Total</th></tr></thead><tbody>${rows||`<tr><td colspan="6" class="td c" style="color:#aaa">No items</td></tr>`}</tbody><tfoot><tr class="sub-row"><td class="c">Sub.</td><td><b>SUBTOTAL</b></td><td class="r">${p.items.reduce((s,it)=>s+it.qty,0)}</td><td class="r">${fmtN(p.subtotal)}</td>${p.discountAmt>0?`<td class="r">₹${fmtN(p.discountAmt)}</td>`:""}${p.taxPct>0?`<td class="r">${fmtN(p.taxAmt)}</td>`:""}<td class="r">₹${fmtN(taxable)}</td></tr></tfoot></table>
      <div class="bot">
        <div class="bot-l"><div><div class="t-lbl">Terms &amp; Conditions</div><div class="t-txt">${e(p.notes||"Keep the invoices for Future References")}</div></div>${p.warranty?`<div><div class="t-lbl">Warranty</div><div class="t-txt">${e(p.warranty)}</div></div>`:""}<div class="qr-row">${p.qrSrc?`<div class="qr-wrap"><div class="qr-lbl">Payment QR Code</div><img src="${e(p.qrSrc)}" class="qr-img"/><div class="qr-upi">UPI: 9932913826@okbizaxis</div></div>`:""}<div class="sig"><img src="/images/Signature.png" alt="Signature" style="height:11mm;width:auto;display:block;margin:8mm auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div></div></div>
        <div class="bot-r"><div class="t-row"><span>Taxable Amount</span><span>₹${taxable.toFixed(2)}</span></div>${cgst>0?`<div class="t-row"><span>CGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}${cgst>0?`<div class="t-row"><span>SGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}${p.paidAmount>0.005?`<div class="t-row"><span>Amount Received</span><span style="color:#15803d">−₹${p.paidAmount.toFixed(2)}</span></div>`:""}<div class="grand"><div class="g-row"><span>Total Amount</span><span class="g-val">₹${p.total.toFixed(2)}</span></div>${due>0.005?`<div class="g-due"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:(p.fullyPaid||p.paidAmount>=p.total-0.005?`<div class="g-paid"><span>✓ PAID IN FULL</span></div>`:"")}</div><div class="words"><div class="w-lbl">Total Amount (in words)</div><div class="w-txt">${amtWords(p.total)}</div></div><div class="thankyou">Thank you for your business!</div></div>
      </div>
    </div>
    <div class="blank"></div>
  </div>
  <script>setTimeout(()=>window.print(),420)</script></body></html>`;
}


function buildTwoUpA4HTML(p: Parameters<typeof buildInvoicePopupHTML>[0]): string {
  const e=(s:any)=>String(s??"").replace(/[&<>"']/g,(c:string)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":'&#39;'}[c]as string));
  const fmtN=(n:number)=>Math.round(n).toLocaleString("en-IN");
  const taxable=p.subtotal-p.discountAmt; const cgst=p.taxAmt/2; const due=Math.max(p.total-p.paidAmount,0);
  function amtWords(n:number):string{const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];const m=Math.round(n);if(m===0)return"Zero Only";function b(x:number):string{if(x<20)return ones[x];if(x<100)return tens[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");return ones[Math.floor(x/100)]+" Hundred"+(x%100?" "+b(x%100):"");}let r="";if(m>=10000000)r+=b(Math.floor(m/10000000))+" Crore ";if(m>=100000)r+=b(Math.floor((m%10000000)/100000))+" Lakh ";if(m>=1000)r+=b(Math.floor((m%100000)/1000))+" Thousand ";r+=b(m%1000);return r.trim()+" Only";}
  const rows=p.items.map((it,i)=>{const lt=it.qty*it.rate;const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0;const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0;return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td r">${it.qty}</td><td class="td r">₹${fmtN(it.rate)}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}<br/><small>${p.discType==="percent"?p.discVal+"%":""}</small></td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}<br/><small>${p.taxPct}%</small></td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`;}).join("");

  const block = `
    <div class="inv">
      <div class="hdr">
        ${p.logoSrc?`<img src="${e(p.logoSrc)}" class="logo" onerror="this.style.display='none'"/>`:`<div class="logo-fb">${e(p.bizName.slice(0,2))}</div>`}
        <div class="biz">
          <div class="biz-name">${e(p.bizName)}</div>
          ${p.bizPan?`<div class="biz-pan">Pan No &nbsp;<b>${e(p.bizPan)}</b></div>`:""}
          ${p.bizAddress?`<div class="biz-addr">📍 ${e(p.bizAddress)}</div>`:""}
          <div class="biz-sub">${p.bizPhone?`<span>📞 ${e(p.bizPhone)}</span>`:""}${p.bizEmail?`<span>✉ ${e(p.bizEmail)}</span>`:""}${p.bizGstin?`<span>GSTIN: ${e(p.bizGstin)}</span>`:""}</div>
        </div>
        <div class="inv-meta">
          <div class="inv-row"><div class="inv-col"><div class="inv-lbl">Invoice Date</div><div class="inv-val">${e(p.invDate)}</div>${p.invTime?`<div class="inv-time">${e(p.invTime)}</div>`:""}</div><div class="inv-col"><div class="inv-lbl">Invoice No</div><div class="inv-val">#${e(p.invNo)}</div></div></div>
        </div>
      </div>
      <div class="billto">
        <div class="bt-lbl">Bill To</div>
        <div class="bt-name">${e(p.clientName)||"—"}</div>
        ${p.clientAddr?`<div class="bt-line">${e(p.clientAddr)}</div>`:""}
        ${p.clientPhone?`<div class="bt-line">📞 ${e(p.clientPhone)}</div>`:""}
        ${p.clientGstin?`<div class="bt-line">GSTIN: ${e(p.clientGstin)}</div>`:""}
      </div>
      <table class="tbl">
        <thead><tr>
          <th class="th c" style="width:6mm">No</th><th class="th">Items</th>
          <th class="th r" style="width:9mm">Qty</th><th class="th r" style="width:15mm">Rate</th>
          ${p.discountAmt>0?`<th class="th r" style="width:13mm">Disc.</th>`:""}
          ${p.taxPct>0?`<th class="th r" style="width:12mm">Tax</th>`:""}
          <th class="th r" style="width:16mm">Total</th>
        </tr></thead>
        <tbody>${rows||`<tr><td colspan="6" class="td c" style="color:#aaa">No items</td></tr>`}</tbody>
        <tfoot><tr class="sub-row">
          <td class="c">Sub.</td><td><b>SUBTOTAL</b></td>
          <td class="r">${p.items.reduce((s,it)=>s+it.qty,0)}</td>
          <td class="r">${fmtN(p.subtotal)}</td>
          ${p.discountAmt>0?`<td class="r">₹${fmtN(p.discountAmt)}</td>`:""}
          ${p.taxPct>0?`<td class="r">${fmtN(p.taxAmt)}</td>`:""}
          <td class="r">₹${fmtN(taxable)}</td>
        </tr></tfoot>
      </table>
      <div class="bot">
        <div class="bot-l">
          ${p.notes?`<div><div class="t-lbl">Terms &amp; Conditions</div><div class="t-txt">${e(p.notes)}</div></div>`:""}
          ${p.warranty?`<div><div class="t-lbl">Warranty</div><div class="t-txt">${e(p.warranty)}</div></div>`:""}
          <div class="qr-row">
            ${p.qrSrc?`<div class="qr-wrap"><div class="qr-lbl">Payment QR Code</div><img src="${e(p.qrSrc)}" class="qr-img"/><div class="qr-badges"><span class="badge">GPay</span><span class="badge">Paytm</span><span class="badge">PhonePe</span><span class="badge">UPI</span></div><div class="qr-upi">UPI: 9932913826@okbizaxis</div></div>`:""}
            <div class="sig"><img src="/images/Signature.png" alt="Signature" style="height:9mm;width:auto;display:block;margin:0 auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div>
          </div>
        </div>
        <div class="bot-r">
          <div class="t-row"><span>Taxable Amount</span><span>₹${taxable.toFixed(2)}</span></div>
          ${cgst>0?`<div class="t-row"><span>CGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""} 
          ${cgst>0?`<div class="t-row"><span>SGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}
          ${p.paidAmount>0.005?`<div class="t-row"><span>Amount Received</span><span style="color:#15803d">−₹${p.paidAmount.toFixed(2)}</span></div>`:""}
          <div class="grand"><div class="g-row"><span>Total Amount</span><span class="g-val">₹${p.total.toFixed(2)}</span></div>${due>0.005?`<div class="g-due"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:""}</div>
          <div class="words"><div class="w-lbl">Total Amount (in words)</div><div class="w-txt">${amtWords(p.total)}</div></div>
        </div>
      </div>
    </div>`;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',Arial,sans-serif;font-size:7.5pt;color:#1a1a2e;background:#f0ece4;display:flex;justify-content:center;padding:6px}
    .page{width:210mm;height:297mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.18);display:flex;flex-direction:column}
    .inv{height:148.5mm;display:flex;flex-direction:column;overflow:hidden;position:relative}
    .cut{width:100%;height:0;border-top:2px dashed #9999bb;position:relative;flex-shrink:0}
    .cut::before{content:'✂';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;padding:0 3mm;font-size:9pt;color:#888}
    /* Header */
    .hdr{display:flex;align-items:center;gap:3mm;padding:3mm 4mm 2.5mm;border-bottom:2px solid #c8a84b;background:linear-gradient(135deg,#fdfaf3 0%,#fff 60%);flex-shrink:0}
    .logo{width:22mm;height:22mm;object-fit:contain;flex-shrink:0}
    .logo-fb{width:14mm;height:14mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f0e8d0;border:1px solid #c8a84b;border-radius:50%;font-size:7pt;font-weight:800;color:#8a6a1c}
    .biz{flex:1}.biz-name{font-size:11pt;font-weight:900;color:#1a2a6e;line-height:1.1}
    .biz-pan{font-size:6pt;color:#444;font-weight:600;margin-top:.5mm}
    .biz-addr{font-size:5pt;color:#666;margin-top:.5mm}
    .biz-sub{font-size:5pt;color:#666;margin-top:.3mm;display:flex;flex-wrap:wrap;gap:2.5mm}
    .inv-meta{text-align:right;flex-shrink:0;align-self:center}
    .inv-row{display:flex;gap:4mm;justify-content:flex-end}
    .inv-col{text-align:right}
    .inv-lbl{font-size:5.5pt;font-weight:700;color:#8a8f9a;text-transform:uppercase;letter-spacing:.4px}
    .inv-val{font-size:7.5pt;font-weight:800;color:#1a2a6e;margin-top:.3mm}
    /* Bill To */
    .billto{padding:2mm 4mm;border-bottom:1px solid #e8e0cc;background:#fffdf7;flex-shrink:0}
    .bt-lbl{font-size:6pt;font-weight:800;color:#1a2a6e;text-transform:uppercase;letter-spacing:.6px;padding-bottom:.8mm;border-bottom:1.5px solid #c8a84b;display:inline-block;margin-bottom:.8mm}
    .bt-name{font-size:7.5pt;font-weight:700}.bt-line{font-size:5.5pt;color:#555;margin-top:.3mm}
    /* Table */
    .tbl{width:100%;border-collapse:collapse;flex-shrink:0}
    .th{background:#1a2a6e;color:#fff;padding:1.5mm 2mm;font-size:5.5pt;font-weight:700;text-align:left}
    .td{padding:1.5mm 2mm;border-bottom:.5px solid #ede8dc;font-size:6.5pt;vertical-align:top}
    .td small{font-size:4.5pt;color:#888;display:block}
    .sub-row td{background:#f5f0e8;font-weight:800;font-size:7pt;padding:1.5mm 2mm;border-top:1.5px solid #c8a84b}
    .r{text-align:right}.c{text-align:center}.bold{font-weight:700}
    /* Bottom */
    .bot{display:flex;flex:1;border-top:1px solid #e8e0cc;min-height:0}
    .bot-l{flex:1.1;padding:2.5mm 3.5mm;display:flex;flex-direction:column;gap:1.5mm;border-right:1px solid #e8e0cc}
    .bot-r{flex:1;padding:2.5mm 3.5mm;display:flex;flex-direction:column;gap:.8mm}
    .t-lbl{font-size:6pt;font-weight:800;color:#1a2a6e;margin-bottom:.3mm}
    .t-txt{font-size:5pt;color:#555;line-height:1.4}
    .qr-row{display:flex;gap:2.5mm;align-items:flex-end;margin-top:auto}
    .qr-wrap{display:flex;flex-direction:column;align-items:center;gap:.8mm}
    .qr-img{width:18mm;height:18mm;object-fit:contain;border:.5px solid #ddd}
    .qr-lbl{font-size:5pt;font-weight:700;color:#1a2a6e;text-align:center}
    .qr-badges{display:flex;gap:.8mm;flex-wrap:wrap;justify-content:center}
    .badge{font-size:3.5pt;font-weight:700;color:#1a2a6e;border:.5px solid #c8a84b;padding:.2mm .8mm;background:#fffdf0}
    .qr-upi{font-size:4pt;color:#555;text-align:center}
    .sig{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}
    .sig-line{width:20mm;border-bottom:.5px solid #888;margin:.8mm auto .4mm}
    .sig-lbl{font-size:4.5pt;color:#555}
    .t-row{display:flex;justify-content:space-between;font-size:6.5pt;padding:.6mm 0;border-bottom:.5px solid #ede8dc}
    .grand{background:#1a2a6e;color:#fff;padding:2mm 2.5mm;margin-top:1mm}
    .g-row{display:flex;justify-content:space-between;align-items:baseline}
    .g-val{font-size:10pt;font-weight:900}
    .g-due{display:flex;justify-content:space-between;font-size:6pt;color:#ffccaa;margin-top:.3mm}
    .words{border:.5px solid #e0d8c8;padding:1.2mm 1.8mm;margin-top:1mm;background:#fffdf7}
    .w-lbl{font-size:5pt;font-weight:700;color:#1a2a6e;margin-bottom:.3mm}
    .w-txt{font-size:5.5pt;color:#333;font-weight:600}
    @media print{@page{size:A4 portrait;margin:0}body{background:#fff;padding:0}.page{box-shadow:none;border:none;width:100%;height:100vh}.inv{height:50vh}.cut{break-after:avoid}}
  `;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head>
  <body><div class="page">${block}<div class="cut"></div>${block}</div>
  <script>setTimeout(()=>window.print(),420)</script></body></html>`;
}


function buildInvoicePopupHTML(p: {
  logoSrc:string;qrSrc:string;bizName:string;bizPan?:string;bizGstin?:string;bizAddress?:string;bizPhone?:string;bizEmail?:string;invTime?:string;
  invNo:string;invDate:string;clientName:string;clientAddr?:string;clientPhone?:string;clientGstin?:string;
  items:{desc:string;qty:number;rate:number}[];discType:string;discVal:number;taxPct:number;
  subtotal:number;discountAmt:number;taxAmt:number;total:number;paidAmount:number;notes?:string;warranty?:string;fullyPaid?:boolean;
}):string {
  const e=(s:any)=>String(s??"").replace(/[&<>"']/g,(c:string)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":'&#39;'}[c]as string));
  const fmtN=(n:number)=>Math.round(n).toLocaleString("en-IN");
  const taxable=p.subtotal-p.discountAmt; const cgst=p.taxAmt/2; const due=Math.max(p.total-p.paidAmount,0);
  function amtWords(n:number):string{const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];const m=Math.round(n);if(m===0)return"Zero Only";function b(x:number):string{if(x<20)return ones[x];if(x<100)return tens[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");return ones[Math.floor(x/100)]+" Hundred"+(x%100?" "+b(x%100):"");}let r="";if(m>=10000000)r+=b(Math.floor(m/10000000))+" Crore ";if(m>=100000)r+=b(Math.floor((m%10000000)/100000))+" Lakh ";if(m>=1000)r+=b(Math.floor((m%100000)/1000))+" Thousand ";r+=b(m%1000);return r.trim()+" Only";}
  const rows=p.items.map((it,i)=>{const lt=it.qty*it.rate;const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0;const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0;return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td r">${it.qty}</td><td class="td r">₹${fmtN(it.rate)}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}<br/><small>${p.discType==="percent"?p.discVal+"%":""}</small></td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}<br/><small>${p.taxPct}%</small></td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`;}).join("");
  const css=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',Arial,sans-serif;font-size:8pt;color:#1a1a2e;background:#f0ece4;display:flex;justify-content:center;padding:8px}.page{width:148mm;min-height:210mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.18);display:flex;flex-direction:column;border:1px solid #e0d8c8}.hdr{display:flex;align-items:center;gap:4mm;padding:4mm 5mm 3mm;border-bottom:2.5px solid #c8a84b;background:linear-gradient(135deg,#fdfaf3 0%,#fff 60%)}.hdr-logo{width:26mm;height:26mm;object-fit:contain;flex-shrink:0}.hdr-biz{flex:1}.hdr-biz-name{font-size:13pt;font-weight:900;color:#1a2a6e;letter-spacing:-.3px;line-height:1.1}.hdr-biz-pan{font-size:6.5pt;color:#444;font-weight:600;margin-top:1mm}.hdr-biz-addr{font-size:5.5pt;color:#666;margin-top:1mm}.hdr-biz-sub{font-size:5.5pt;color:#666;margin-top:.5mm;display:flex;flex-wrap:wrap;gap:3mm}.hdr-inv{text-align:right;flex-shrink:0;align-self:center}.hdr-inv-row{display:flex;gap:5mm;justify-content:flex-end}.hdr-inv-col{text-align:right}.hdr-inv-lbl{font-size:6pt;font-weight:700;color:#8a8f9a;text-transform:uppercase;letter-spacing:.5px}.hdr-inv-val{font-size:8.5pt;font-weight:800;color:#1a2a6e;margin-top:.5mm}.parties{display:flex;border-bottom:1px solid #e8e0cc;background:#fffdf7}.party{flex:1;padding:2.5mm 4mm;border-right:1px solid #e8e0cc}.party:last-child{border-right:none}.party-lbl{font-size:6.5pt;font-weight:800;color:#1a2a6e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:1.5mm;padding-bottom:1mm;border-bottom:1.5px solid #c8a84b}.party-name{font-size:8pt;font-weight:700;color:#1a1a2e}.party-line{font-size:6pt;color:#555;margin-top:.5mm;line-height:1.4}.tbl{width:100%;border-collapse:collapse}.th{background:#1a2a6e;color:#fff;padding:2mm 2.5mm;font-size:6pt;font-weight:700;text-align:left}.td{padding:2mm 2.5mm;border-bottom:.5px solid #ede8dc;font-size:7pt;vertical-align:top}.td small{font-size:5pt;color:#888;display:block}.subtotal-row td{background:#f5f0e8;font-weight:800;font-size:7.5pt;padding:2mm 2.5mm;border-top:1.5px solid #c8a84b}.r{text-align:right}.c{text-align:center}.bold{font-weight:700}.bot{display:flex;flex:1;border-top:1px solid #e8e0cc;min-height:0}.bot-left{flex:1.1;padding:3mm 4mm;display:flex;flex-direction:column;gap:2mm;border-right:1px solid #e8e0cc}.bot-right{flex:1;padding:3mm 4mm;display:flex;flex-direction:column;gap:1mm}.terms-lbl{font-size:6.5pt;font-weight:800;color:#1a2a6e;margin-bottom:.5mm}.terms-txt{font-size:5.5pt;color:#555;line-height:1.5}.qr-row{display:flex;gap:3mm;align-items:flex-end;margin-top:auto}.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:1mm}.qr-img{width:22mm;height:22mm;object-fit:contain;border:.5px solid #ddd}.qr-lbl{font-size:5.5pt;font-weight:700;color:#1a2a6e;text-align:center}.qr-badges{display:flex;gap:1mm;flex-wrap:wrap;justify-content:center}.qr-badge{font-size:4pt;font-weight:700;color:#1a2a6e;border:.5px solid #c8a84b;padding:.3mm 1mm;background:#fffdf0}.qr-upi{font-size:4.5pt;color:#555;text-align:center}.sig-wrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center;padding-bottom:1mm}.sig-line{width:22mm;border-bottom:.5px solid #888;margin:1mm auto .5mm}.sig-lbl{font-size:5pt;color:#555}.tot-row{display:flex;justify-content:space-between;font-size:7pt;padding:.8mm 0;border-bottom:.5px solid #ede8dc}.tot-lbl{color:#555}.tot-val{font-weight:700;font-variant-numeric:tabular-nums}.grand-box{background:#1a2a6e;color:#fff;padding:2.5mm 3mm;margin-top:1.5mm}.grand-row{display:flex;justify-content:space-between;align-items:baseline}.grand-lbl{font-size:8pt;font-weight:700}.grand-val{font-size:11pt;font-weight:900}.due-row{display:flex;justify-content:space-between;font-size:7pt;color:#ffccaa;margin-top:.5mm}.words-box{border:.5px solid #e0d8c8;padding:1.5mm 2mm;margin-top:1.5mm;background:#fffdf7}.words-lbl{font-size:5.5pt;font-weight:700;color:#1a2a6e;margin-bottom:.5mm}.words-txt{font-size:6pt;color:#333;font-weight:600}@media print{@page{size:A5 portrait;margin:0}body{background:#fff;padding:0}.page{box-shadow:none;border:none;width:100%;min-height:100vh}}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head><body><div class="page"><div class="hdr">${p.logoSrc?`<img src="${e(p.logoSrc)}" alt="${e(p.bizName)}" class="hdr-logo" onerror="this.style.display='none'"/>`:`<div style="width:26mm;height:26mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f0e8d0;border:1px solid #c8a84b;border-radius:50%;font-size:8pt;font-weight:800;color:#8a6a1c">${e(p.bizName.slice(0,2))}</div>`}<div class="hdr-biz"><div class="hdr-biz-name">${e(p.bizName)}</div>${p.bizPan?`<div class="hdr-biz-pan">Pan No &nbsp;<b>${e(p.bizPan)}</b></div>`:""}${p.bizAddress?`<div class="hdr-biz-addr">📍 ${e(p.bizAddress)}</div>`:""}<div class="hdr-biz-sub">${p.bizPhone?`<span>📞 ${e(p.bizPhone)}</span>`:""}${p.bizEmail?`<span>✉ ${e(p.bizEmail)}</span>`:""}${p.bizGstin?`<span>GSTIN: ${e(p.bizGstin)}</span>`:""}</div></div><div class="hdr-inv"><div class="hdr-inv-row"><div class="hdr-inv-col"><div class="hdr-inv-lbl">Invoice Date</div><div class="hdr-inv-val">${e(p.invDate)}</div></div><div class="hdr-inv-col"><div class="hdr-inv-lbl">Invoice No</div><div class="hdr-inv-val">#${e(p.invNo)}</div></div></div></div></div><div class="parties"><div class="party"><div class="party-lbl">Bill To</div><div class="party-name">${e(p.clientName)||"—"}</div>${p.clientAddr?`<div class="party-line">${e(p.clientAddr)}</div>`:""}${p.clientPhone?`<div class="party-line">📞 ${e(p.clientPhone)}</div>`:""}${p.clientGstin?`<div class="party-line">GSTIN: ${e(p.clientGstin)}</div>`:""}</div></div><table class="tbl"><thead><tr><th class="th c" style="width:7mm">No</th><th class="th">Items</th><th class="th r" style="width:10mm">Qty.</th><th class="th r" style="width:16mm">Rate</th>${p.discountAmt>0?`<th class="th r" style="width:14mm">Disc.</th>`:""}${p.taxPct>0?`<th class="th r" style="width:13mm">Tax</th>`:""}<th class="th r" style="width:17mm">Total</th></tr></thead><tbody>${rows||`<tr><td colspan="6" class="td c" style="color:#aaa;padding:4mm">No items</td></tr>`}</tbody><tfoot><tr class="subtotal-row"><td class="c">Sub.</td><td><b>SUBTOTAL</b></td><td class="r">${p.items.reduce((s,it)=>s+it.qty,0)}</td><td class="r">${fmtN(p.subtotal)}</td>${p.discountAmt>0?`<td class="r">₹${fmtN(p.discountAmt)}</td>`:""}${p.taxPct>0?`<td class="r">${fmtN(p.taxAmt)}</td>`:""}<td class="r">₹${fmtN(taxable)}</td></tr></tfoot></table><div class="bot"><div class="bot-left">${p.notes?`<div><div class="terms-lbl">Terms &amp; Conditions</div><div class="terms-txt">${e(p.notes)}</div></div>`:""}${p.warranty?`<div><div class="terms-lbl">Warranty</div><div class="terms-txt">${e(p.warranty)}</div></div>`:""}<div class="qr-row">${p.qrSrc?`<div class="qr-wrap"><div class="qr-lbl">Payment QR Code</div><img src="${e(p.qrSrc)}" alt="UPI QR" class="qr-img"/><div class="qr-badges"><span class="qr-badge">GPay</span><span class="qr-badge">Paytm</span><span class="qr-badge">PhonePe</span><span class="qr-badge">UPI</span></div><div class="qr-upi">UPI ID: 9932913826@okbizaxis</div></div>`:""}<div class="sig-wrap"><img src="/images/Signature.png" alt="Signature" style="height:10mm;width:auto;display:block;margin:0 auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div></div></div><div class="bot-right"><div class="tot-row"><span class="tot-lbl">Taxable Amount</span><span class="tot-val">₹${taxable.toFixed(2)}</span></div>${cgst>0?`<div class="tot-row"><span class="tot-lbl">CGST @${p.taxPct/2}%</span><span class="tot-val">${cgst.toFixed(2)}</span></div>`:""}${cgst>0?`<div class="tot-row"><span class="tot-lbl">SGST @${p.taxPct/2}%</span><span class="tot-val">${cgst.toFixed(2)}</span></div>`:""}${p.paidAmount>0.005?`<div class="tot-row"><span class="tot-lbl">Amount Received</span><span class="tot-val" style="color:#15803d">−₹${p.paidAmount.toFixed(2)}</span></div>`:""}<div class="grand-box"><div class="grand-row"><span class="grand-lbl">Total Amount</span><span class="grand-val">₹${p.total.toFixed(2)}</span></div>${due>0.005?`<div class="due-row"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:""}</div><div class="words-box"><div class="words-lbl">Total Amount (in words)</div><div class="words-txt">${amtWords(p.total)}</div></div></div></div></div><script>setTimeout(()=>window.print(),420)</script></body></html>`;
}

async function printInvoice(inv: Invoice) {
  const toB64 = (src: string) => fetch(src).then(r=>r.blob()).then(b=>new Promise<string>(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result as string);fr.readAsDataURL(b)})).catch(()=>'');
  const [qrB64, logoB64, sigB64] = await Promise.all([toB64('/images/QR.jpeg'), toB64('/images/abhijit_art_logo.png'), toB64('/images/Signature.png')]);
  const biz = (inv.business||{}) as any;
  const fmtD = (d: string) => { const dt = new Date(d); if (isNaN(dt.getTime())) return d; return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }); };
  const paid = effectivePaid(inv);
  const w = window.open("","_blank","width=700,height=900");
  if (!w) return;
  const _html = buildSingleHalfA4HTML({
    logoSrc: logoB64 || '/images/abhijit_art_logo.png',
    qrSrc: qrB64,
    bizName: biz.name||"Abhijit Art",
    bizPan: biz.pan||"AQFPD8346K",
    bizGstin: biz.gstin||"19AQFPD8346K1ZH",
    bizAddress: biz.address||"Rabindra Sadan, Shakti Mandir Club, SS Sen Road Berhampore, West Bengal - 742101",
    bizPhone: biz.phone||"7405179066",
    bizEmail: biz.email||"abhijitart85@gmail.com",
    invNo: inv.invoiceNo, invDate: fmtD(inv.date), invTime: fmtTime(inv.createdAt),
    clientName: inv.clientName||"—", clientAddr: inv.clientAddr||"",
    clientPhone: inv.clientPhone||"", clientGstin: inv.clientGstin||"",
    items: (Array.isArray(inv.items)?inv.items:[]).map((it:any)=>({desc:String(it.desc||""),qty:Number(it.qty)||0,rate:Number(it.rate)||0})),
    discType: inv.discType||"amount", discVal: num(inv.discVal), taxPct: num(inv.taxPct),
    subtotal: num(inv.subtotal), discountAmt: num(inv.discountAmt),
    taxAmt: num(inv.taxAmt), total: num(inv.total),
    paidAmount: paid, notes: inv.notes||"", warranty: inv.warranty||"",
    fullyPaid: inv.status === "paid" || (num(inv.total) - paid) <= 0.005,
  });
  w.document.write(_html.replace(/src="\/images\/Signature\.jpg"/g, `src="${sigB64 || '/images/Signature.png'}"`));
  w.document.close();
}

/* ── Component ── */
export default function Invoices() {
  const [list, setList] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | InvStatus>("all");
  const [period, setPeriod] = useState<Period>("all");
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState<InvMethod>("cash");
  const [addAmount, setAddAmount] = useState("0");
  const [payPin, setPayPin] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [paySavedAnim, setPaySavedAnim] = useState(false);
  const [payErr, setPayErr] = useState("");
  const [payFlash, setPayFlash] = useState<string | null>(null);
  const [payConfirmDel, setPayConfirmDel] = useState<string | null>(null);
  const [payDeletingId, setPayDeletingId] = useState<string | null>(null);
  const [payDone, setPayDone] = useState<{ title: string; detail?: string; tone: string } | null>(null);
  const [delTarget, setDelTarget] = useState<Invoice | null>(null);
  const [delPin, setDelPin] = useState("");
  const [delErr, setDelErr] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [delDone, setDelDone] = useState(false);
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editPin, setEditPin] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editDone, setEditDone] = useState(false);
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
  const [viewMode, setViewMode] = useState<"customers" | "all">("customers");
  const [drillCust, setDrillCust] = useState<string | null>(null);
  const [drawerQ, setDrawerQ] = useState("");
  const [paidOpen, setPaidOpen] = useState(false);
  const [stmtCust, setStmtCust] = useState<string | null>(null);
  const [stFrom, setStFrom] = useState("");
  const [stTo, setStTo] = useState("");
  const [stStatus, setStStatus] = useState<"all" | InvStatus>("all");
  const [stMonth, setStMonth] = useState("");
  const [stYear, setStYear] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const load = async (initial = false) => {
    initial ? setLoading(true) : setRefreshing(true); setError("");
    try { const res = await api.get("/api/invoices", { timeout: REQ_TIMEOUT }); setList(Array.isArray(res.data) ? res.data : []); }
    catch (e: any) { setError(errMessage(e, "Couldn't load invoices.")); }
    finally { initial ? setLoading(false) : setRefreshing(false); }
  };
  useEffect(() => { load(true); }, []);

  // Lock background scroll while any modal/drawer is open (prevents scroll chaining
  // even when the app scrolls on an inner container rather than <body>)
  useEffect(() => {
    const open = payTarget || delTarget || editTarget || sendTarget || drillCust || stmtCust;
    if (!open) return;
    const html = document.documentElement, body = document.body;
    const prevHtml = html.style.cssText, prevBody = body.style.cssText;
    html.style.setProperty("overflow", "hidden", "important");
    body.style.setProperty("overflow", "hidden", "important");

    // The app scrolls on inner containers, not <body>. Lock EVERY scrollable element
    // on the page (except the modal's own), so nothing behind can move via scrollbar,
    // keyboard, or momentum while the modal is open.
    const locked: Array<{ el: HTMLElement; prev: string }> = [];
    document.querySelectorAll<HTMLElement>("*").forEach((el) => {
      if (el.hasAttribute("data-modal-scroll") || el.closest("[data-modal-scroll]")) return; // skip modal scrollers
      const oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll" || oy === "overlay") && el.scrollHeight > el.clientHeight) {
        locked.push({ el, prev: el.style.cssText });
        el.style.setProperty("overflow", "hidden", "important"); // beats app CSS (even !important)
      }
    });

    // GUARANTEED BACKSTOP: record every background scroller's position and snap it
    // back the instant anything moves it. This undoes any scroll that leaks past the
    // overflow lock / wheel guard, so the page behind is truly frozen.
    const frozen: Array<{ el: HTMLElement; top: number; left: number }> = [];
    document.querySelectorAll<HTMLElement>("*").forEach((el) => {
      if (el.hasAttribute("data-modal-scroll") || el.closest("[data-modal-scroll]")) return;
      if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
        frozen.push({ el, top: el.scrollTop, left: el.scrollLeft });
      }
    });
    const winTop = window.scrollY, winLeft = window.scrollX;
    const onScrollCapture = (ev: Event) => {
      const tgt = ev.target as HTMLElement | Document | null;
      // Never fight the modal's own scroll
      if (tgt instanceof HTMLElement && (tgt.hasAttribute("data-modal-scroll") || tgt.closest("[data-modal-scroll]"))) return;
      for (const f of frozen) {
        if (f.el.scrollTop !== f.top) f.el.scrollTop = f.top;
        if (f.el.scrollLeft !== f.left) f.el.scrollLeft = f.left;
      }
      if (window.scrollY !== winTop || window.scrollX !== winLeft) window.scrollTo(winLeft, winTop);
    };

    // Block keyboard scrolling of the background (Space, PageUp/Down, Arrows, Home/End)
    const scrollKeys = new Set([" ", "Spacebar", "PageUp", "PageDown", "ArrowUp", "ArrowDown", "Home", "End"]);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing) return;
      if (scrollKeys.has(e.key) && !(t && t.closest("[data-modal-scroll]"))) e.preventDefault();
    };

    // Block native scrolling while a modal is open (so the page behind never moves),
    // and drive the modal's own scroll with a smooth animation toward a target.
    let rafId = 0;
    let targetEl: HTMLElement | null = null;
    let targetTop = 0;
    const animate = () => {
      if (!targetEl) { rafId = 0; return; }
      const cur = targetEl.scrollTop;
      const diff = targetTop - cur;
      if (Math.abs(diff) < 0.5) { targetEl.scrollTop = targetTop; rafId = 0; targetEl = null; return; }
      targetEl.scrollTop = cur + diff * 0.22;               // easing factor → smooth glide
      rafId = requestAnimationFrame(animate);
    };
    const push = (scroller: HTMLElement | null, deltaPx: number) => {
      if (!scroller || scroller.scrollHeight <= scroller.clientHeight) return;
      const max = scroller.scrollHeight - scroller.clientHeight;
      if (targetEl !== scroller) { targetEl = scroller; targetTop = scroller.scrollTop; }
      targetTop = Math.max(0, Math.min(max, targetTop + deltaPx));
      if (!rafId) rafId = requestAnimationFrame(animate);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scroller = (e.target as HTMLElement)?.closest?.("[data-modal-scroll]") as HTMLElement | null;
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 16;
      else if (e.deltaMode === 2) d *= (window.innerHeight * 0.8);
      push(scroller, d);
    };
    // Touch: let native touch scrolling handle it (already smooth), just block chaining
    let ty = 0;
    const onTouchStart = (e: TouchEvent) => { ty = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => {
      const scroller = (e.target as HTMLElement)?.closest?.("[data-modal-scroll]") as HTMLElement | null;
      if (!scroller || scroller.scrollHeight <= scroller.clientHeight) { e.preventDefault(); return; }
      const y = e.touches[0]?.clientY ?? 0; const dy = ty - y; ty = y;
      const atTop = scroller.scrollTop <= 0 && dy < 0;
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1 && dy > 0;
      if (atTop || atBottom) e.preventDefault();            // block only at edges; else native smooth scroll
    };

    document.addEventListener("wheel", onWheel, { passive: false, capture: true });
    document.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    document.addEventListener("keydown", onKey, { passive: false, capture: true });
    document.addEventListener("scroll", onScrollCapture, { passive: true, capture: true });
    return () => {
      html.style.cssText = prevHtml; body.style.cssText = prevBody;
      locked.forEach(({ el, prev }) => { el.style.cssText = prev; });
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("wheel", onWheel, { capture: true } as any);
      document.removeEventListener("touchstart", onTouchStart, { capture: true } as any);
      document.removeEventListener("touchmove", onTouchMove, { capture: true } as any);
      document.removeEventListener("keydown", onKey, { capture: true } as any);
      document.removeEventListener("scroll", onScrollCapture, { capture: true } as any);
    };
  }, [payTarget, delTarget, editTarget, sendTarget, drillCust, stmtCust]);

  const applyInvoice = (updated: Invoice) => { setList((rows) => rows.map((r) => (r.id === updated.id ? updated : r))); setPayTarget((cur) => (cur && cur.id === updated.id ? updated : cur)); };

  const periodList = useMemo(() => { const since = periodSince(period); if (!since) return list; const t = since.getTime(); return list.filter((inv) => { const dt = new Date(inv.date); return !isNaN(dt.getTime()) && dt.getTime() >= t; }); }, [list, period]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return periodList.filter((inv) => { if (filter !== "all" && inv.status !== filter) return false; if (!needle) return true; return inv.invoiceNo.toLowerCase().includes(needle) || (inv.clientName || "").toLowerCase().includes(needle) || (inv.clientEmail || "").toLowerCase().includes(needle) || (inv.clientPhone || "").toLowerCase().includes(needle); });
  }, [periodList, q, filter]);

  const stats = useMemo(() => {
    let billed = 0, received = 0, outstanding = 0, cash = 0, online = 0;
    for (const inv of periodList) {
      if (inv.status === "cancelled") continue;
      const t = num(inv.total); const p = effectivePaid(inv);
      billed += t; received += p; outstanding += Math.max(t - p, 0);
      for (const pay of Array.isArray(inv.payments) ? inv.payments : []) { const amt = num(pay.amount); if (pay.method === "online") online += amt; else cash += amt; }
    }
    return { count: periodList.length, billed: round2(billed), received: round2(received), outstanding: round2(outstanding), cash: round2(cash), online: round2(online) };
  }, [periodList]);

  // ── Customer-wise statement (grouped from invoices) ──
  const customerRows = useMemo(() => {
    const map = new Map<string, { key: string; name: string; phone: string | null; email: string | null; invoices: Invoice[]; billed: number; paid: number; due: number; lastDate: string; }>();
    for (const inv of periodList) {
      if (inv.status === "cancelled") continue;
      const key = (inv.clientPhone && inv.clientPhone.trim()) || (inv.clientName || "").trim().toLowerCase() || inv.id;
      const total = num(inv.total); const paid = effectivePaid(inv);
      const existing = map.get(key);
      if (existing) {
        existing.invoices.push(inv);
        existing.billed += total; existing.paid += paid; existing.due += Math.max(total - paid, 0);
        if (new Date(inv.date) > new Date(existing.lastDate)) existing.lastDate = inv.date;
        if (!existing.email && inv.clientEmail) existing.email = inv.clientEmail;
      } else {
        map.set(key, { key, name: inv.clientName || "—", phone: inv.clientPhone, email: inv.clientEmail, invoices: [inv], billed: total, paid, due: Math.max(total - paid, 0), lastDate: inv.date });
      }
    }
    let rows = Array.from(map.values()).map((r) => ({ ...r, billed: round2(r.billed), paid: round2(r.paid), due: round2(r.due), invoices: r.invoices.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()) }));
    const needle = q.trim().toLowerCase();
    if (needle) rows = rows.filter((r) => r.name.toLowerCase().includes(needle) || (r.phone || "").toLowerCase().includes(needle) || (r.email || "").toLowerCase().includes(needle));
    return rows.sort((a, b) => b.due - a.due || new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
  }, [periodList, q]);

  const drillRow = useMemo(() => customerRows.find((r) => r.key === drillCust) || null, [customerRows, drillCust]);
  const drawerInvoices = useMemo(() => {
    if (!drillRow) return [] as typeof drillRow.invoices;
    const q = drawerQ.trim().toLowerCase();
    if (!q) return drillRow.invoices;
    return drillRow.invoices.filter((inv) => inv.invoiceNo.toLowerCase().includes(q));
  }, [drillRow, drawerQ]);

  // ── Full Account Statement (per customer) — derived (state declared above with other modals) ──
  const stmtRow = useMemo(() => customerRows.find((r) => r.key === stmtCust) || null, [customerRows, stmtCust]);

  // Distinct years present in this customer's activity (for the year filter)
  const stmtYears = useMemo(() => {
    if (!stmtRow) return [] as string[];
    const set = new Set<string>();
    const add = (d: string) => { const dt = new Date(d); if (!isNaN(dt.getTime())) set.add(String(dt.getFullYear())); };
    for (const inv of stmtRow.invoices) { add(inv.createdAt || inv.date); for (const p of Array.isArray(inv.payments) ? inv.payments : []) add(p.createdAt); }
    return Array.from(set).sort().reverse();
  }, [stmtRow]);
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const stmtTxns = useMemo(() => {
    if (!stmtRow) return [] as Array<{ t: number; date: string; kind: "invoice" | "payment"; desc: string; sub: string; debit: number; credit: number; balance: number }>;
    const txns: Array<{ t: number; date: string; kind: "invoice" | "payment"; desc: string; sub: string; debit: number; credit: number }> = [];
    for (const inv of stmtRow.invoices) {
      if (stStatus !== "all" && inv.status !== stStatus) continue;
      const pays = Array.isArray(inv.payments) ? inv.payments : [];
      const advPays = pays.filter((p) => /advance/i.test(p.note || ""));   // paid at billing time
      const laterPays = pays.filter((p) => !/advance/i.test(p.note || "")); // paid afterwards
      const advSum = round2(advPays.reduce((s, p) => s + num(p.amount), 0));
      const advMethods = Array.from(new Set(advPays.map((p) => (p.method === "online" ? "Online" : "Cash"))));
      // Invoice row — shows the bill AND any advance received at billing
      txns.push({ t: new Date(inv.createdAt || inv.date).getTime(), date: inv.createdAt || inv.date, kind: "invoice", desc: `Invoice ${inv.invoiceNo}`, sub: (inv.items || []).map((it) => `${it.qty}× ${it.desc}`).join(", ") + (advSum > 0 ? `  ·  Advance ${advMethods.join("/")}` : ""), debit: num(inv.total), credit: advSum });
      // Later payments as their own rows
      for (const p of laterPays) {
        txns.push({ t: new Date(p.createdAt).getTime(), date: p.createdAt, kind: "payment", desc: `Payment · ${inv.invoiceNo}`, sub: p.method === "online" ? "Online" : "Cash", debit: 0, credit: num(p.amount) });
      }
    }
    let filtered = txns;
    if (stFrom) { const tf = new Date(stFrom + "T00:00:00").getTime(); filtered = filtered.filter((x) => x.t >= tf); }
    if (stTo) { const tt = new Date(stTo + "T23:59:59").getTime(); filtered = filtered.filter((x) => x.t <= tt); }
    if (stMonth) filtered = filtered.filter((x) => new Date(x.date).getMonth() + 1 === Number(stMonth));
    if (stYear) filtered = filtered.filter((x) => new Date(x.date).getFullYear() === Number(stYear));
    filtered.sort((a, b) => a.t - b.t || a.desc.localeCompare(b.desc));
    let bal = 0;
    return filtered.map((x) => { bal = round2(bal + x.debit - x.credit); return { ...x, balance: bal }; });
  }, [stmtRow, stFrom, stTo, stStatus, stMonth, stYear]);

  const stmtTotals = useMemo(() => {
    let debit = 0, credit = 0;
    for (const x of stmtTxns) { debit += x.debit; credit += x.credit; }
    return { debit: round2(debit), credit: round2(credit), balance: round2(debit - credit) };
  }, [stmtTxns]);

  const openStatement = (key: string) => { setStFrom(""); setStTo(""); setStStatus("all"); setStMonth(""); setStYear(""); setStmtCust(key); setDrillCust(null); };

  const downloadStatementPDF = async () => {
    if (!stmtRow) return;
    const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
    const toB64 = (src: string) => fetch(src).then((r) => r.blob()).then((b) => new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(b); })).catch(() => "");
    const logo = await toB64("/images/abhijit_art_logo.png");
    const biz = { name: "Abhijit Art", pan: "AQFPD8346K", gstin: "19AQFPD8346K1ZH", address: "Rabindra Sadan, Shakti Mandir Club, SS Sen Road Berhampore, West Bengal - 742101", phone: "7405179066", email: "abhijitart85@gmail.com" };
    const fmtN = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const mName = stMonth ? MONTH_NAMES[Number(stMonth) - 1] : "";
    const period = (stMonth && stYear) ? `${mName} ${stYear}` : stMonth ? mName : stYear ? stYear : (stFrom || stTo) ? `${stFrom ? fmt(stFrom + "T00:00:00") : "Beginning"} — ${stTo ? fmt(stTo + "T00:00:00") : "Today"}` : "All time";
    const statusLbl = stStatus === "all" ? "All" : STATUS_META[stStatus].label;
    const rows = stmtTxns.map((x) => `<tr class="${x.kind}"><td>${esc(fmt(x.date))}<div class="tm">${esc(fmtTime(x.date))}</div></td><td><b>${esc(x.desc)}</b>${x.sub ? `<div class="sub">${esc(x.sub)}</div>` : ""}</td><td class="r">${x.debit ? fmtN(x.debit) : "—"}</td><td class="r cr">${x.credit ? fmtN(x.credit) : "—"}</td><td class="r bal">${fmtN(x.balance)}</td></tr>`).join("");
    const css = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}body{font-family:'Inter',Arial,sans-serif;color:#1a1a2e;padding:14mm 12mm;font-size:9pt}.hdr{display:flex;align-items:center;gap:4mm;border-bottom:2.5px solid #e89a3c;padding-bottom:3mm;margin-bottom:4mm}.logo{width:20mm;height:20mm;object-fit:contain}.bizn{font-size:15pt;font-weight:900;color:#c56a3a}.bizd{font-size:6.5pt;color:#666;margin-top:1mm;line-height:1.5}.title{text-align:center;font-size:12pt;font-weight:800;color:#c56a3a;letter-spacing:1px;margin:3mm 0}.meta{display:flex;justify-content:space-between;background:#fff6ee;border:1px solid #f0e0d0;padding:3mm;margin-bottom:3mm;font-size:8pt}.meta b{color:#c56a3a}table{width:100%;border-collapse:collapse;font-size:8pt}th{background:#c56a3a;color:#fff;padding:2mm;text-align:left;font-weight:700;font-size:7.5pt}td{padding:2mm;border-bottom:.5px solid #eee;vertical-align:top}.r{text-align:right;font-variant-numeric:tabular-nums}.cr{color:#15803d;font-weight:700}.bal{font-weight:800}tr.payment td{background:#f6fbf7}.tm{font-size:6pt;color:#aaa}.sub{font-size:6.5pt;color:#888;margin-top:.5mm}tfoot td{background:#f5f0e8;font-weight:800;font-size:8.5pt;padding:2.5mm 2mm;border-top:1.5px solid #c8a84b}.summ{display:flex;gap:6mm;justify-content:flex-end;margin-top:4mm;font-size:9pt}.summ b{font-size:10pt}.foot{margin-top:8mm;text-align:center;font-size:7pt;color:#999}@media print{@page{size:A4 portrait;margin:0}body{padding:12mm}}`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice & Payment Statement - ${esc(stmtRow.name)}</title><style>${css}</style></head><body>
      <div class="hdr">${logo ? `<img src="${logo}" class="logo"/>` : ""}<div><div class="bizn">${esc(biz.name)}</div><div class="bizd">PAN ${esc(biz.pan)} · GSTIN ${esc(biz.gstin)}<br/>${esc(biz.address)}<br/>📞 ${esc(biz.phone)} · ✉ ${esc(biz.email)}</div></div></div>
      <div class="title">INVOICE &amp; PAYMENT STATEMENT</div>
      <div class="meta"><div><b>Customer:</b> ${esc(stmtRow.name)}${stmtRow.phone ? `<br/><b>Phone:</b> ${esc(stmtRow.phone)}` : ""}</div><div style="text-align:right"><b>Period:</b> ${esc(period)}<br/><b>Status:</b> ${esc(statusLbl)} &nbsp;·&nbsp; <b>Generated:</b> ${esc(fmt(new Date().toISOString()))}</div></div>
      <table><thead><tr><th>Date</th><th>Particulars</th><th class="r">Bill (₹)</th><th class="r">Received (₹)</th><th class="r">Balance (₹)</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="5" style="text-align:center;color:#aaa;padding:6mm">No transactions</td></tr>`}</tbody>
      <tfoot><tr><td colspan="2">Total</td><td class="r">${fmtN(stmtTotals.debit)}</td><td class="r" style="color:#15803d">${fmtN(stmtTotals.credit)}</td><td class="r" style="color:${stmtTotals.balance > 0 ? "#c2461f" : "#15803d"}">${fmtN(stmtTotals.balance)}</td></tr></tfoot></table>
      <div class="summ"><span>Total Billed: <b>₹${fmtN(stmtTotals.debit)}</b></span><span>Received: <b style="color:#15803d">₹${fmtN(stmtTotals.credit)}</b></span><span>Balance Due: <b style="color:${stmtTotals.balance > 0 ? "#c2461f" : "#15803d"}">${stmtTotals.balance > 0 ? "₹" + fmtN(stmtTotals.balance) : "Cleared"}</b></span></div>
      <div class="foot">This is a computer-generated statement · ${esc(biz.name)}</div>
      <script>setTimeout(()=>window.print(),400)</script></body></html>`;
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;
    w.document.write(html); w.document.close();
  };

  const openPay = (inv: Invoice) => { setPayErr(""); setAddAmount("0"); setPayPin(""); setPayMethod("cash"); setPayDone(null); setPaySavedAnim(false); setPayFlash(null); setPayConfirmDel(null); setPayTarget(inv); };

  const savePayment = async () => {
    if (!payTarget) return;
    const amt = round2(Math.max(num(addAmount), 0));
    if (amt <= 0) { setPayErr("Enter a payment amount greater than zero."); return; }
    setPaySaving(true); setPayErr("");
    try { const res = await api.post(`/api/invoices/${payTarget.id}/payments`, { amount: amt, method: payMethod, pin: payPin.trim() }, { timeout: REQ_TIMEOUT }); applyInvoice({ ...payTarget, ...res.data }); setAddAmount("0"); setPayFlash(null); setPaySavedAnim(true); setTimeout(() => setPaySavedAnim(false), 1600); }
    catch (e: any) { setPayErr(errMessage(e, "Couldn't record the payment.")); }
    finally { setPaySaving(false); }
  };

  const deletePayment = async (paymentId: string) => {
    if (!payTarget || !payPin.trim()) return;
    setPayDeletingId(paymentId); setPayErr("");
    try { const res = await api.delete(`/api/invoices/${payTarget.id}/payments/${paymentId}`, { data: { pin: payPin.trim() }, timeout: REQ_TIMEOUT }); applyInvoice({ ...payTarget, ...res.data }); setPayConfirmDel(null); setPayFlash("Payment removed."); setTimeout(() => setPayFlash(null), 3000); }
    catch (e: any) { setPayErr(errMessage(e, "Couldn't remove the payment.")); }
    finally { setPayDeletingId(null); }
  };

  const cancelInvoice = async () => {
    if (!payTarget) return; setPaySaving(true); setPayErr("");
    try { const res = await api.patch(`/api/invoices/${payTarget.id}/status`, { status: "cancelled", pin: payPin.trim() }, { timeout: REQ_TIMEOUT }); setList((rows) => rows.map((r) => (r.id === payTarget.id ? { ...r, ...res.data } : r))); setPayDone({ title: "Invoice cancelled", detail: payTarget.invoiceNo, tone: "#6b7280" }); setTimeout(() => setPayTarget(null), 1700); }
    catch (e: any) { setPayErr(errMessage(e, "Couldn't cancel the invoice.")); }
    finally { setPaySaving(false); }
  };

  const openDelete = (inv: Invoice) => { setDelErr(""); setDelPin(""); setDelDone(false); setDelTarget(inv); };
  const confirmDelete = async () => {
    if (!delTarget) return; setDeleting(true); setDelErr("");
    try { await api.delete(`/api/invoices/${delTarget.id}`, { data: { pin: delPin.trim() }, timeout: REQ_TIMEOUT }); setDelDone(true); const id = delTarget.id; setTimeout(() => { setList((rows) => rows.filter((r) => r.id !== id)); setDelTarget(null); }, 1600); }
    catch (e: any) { setDelErr(errMessage(e, "Couldn't delete the invoice.")); }
    finally { setDeleting(false); }
  };

  const openEdit = (inv: Invoice) => {
    if (inv.status === "paid" || inv.status === "cancelled") return;
    setEditErr(""); setEditPin(""); setEditDone(false);
    setEditForm({ date: toDateInput(inv.date), clientName: inv.clientName || "", clientPhone: inv.clientPhone || "", clientEmail: inv.clientEmail || "", clientGstin: inv.clientGstin || "", clientAddr: inv.clientAddr || "", source: inv.source === "online" ? "online" : "offline", items: (Array.isArray(inv.items) && inv.items.length ? inv.items : [{ desc: "", qty: 1, rate: 0 }]).map((it) => ({ desc: it.desc || "", qty: String(it.qty ?? ""), rate: String(it.rate ?? "") })), discType: inv.discType === "percent" ? "percent" : "amount", discVal: String(num(inv.discVal) || ""), taxPct: String(num(inv.taxPct) || ""), notes: inv.notes || "", warranty: inv.warranty || "" });
    setEditTarget(inv);
  };
  const patchForm = (patch: Partial<EditForm>) => setEditForm((f) => (f ? { ...f, ...patch } : f));
  const setEditItem = (idx: number, field: keyof EditItem, value: string) => setEditForm((f) => (f ? { ...f, items: f.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)) } : f));
  const addEditItem = () => setEditForm((f) => (f ? { ...f, items: [...f.items, { desc: "", qty: "1", rate: "" }] } : f));
  const removeEditItem = (idx: number) => setEditForm((f) => (f ? { ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== idx) : f.items } : f));

  const editCalc = useMemo(() => (editForm ? calcTotals(editForm.items, editForm.discType, editForm.discVal, editForm.taxPct) : { subtotal: 0, discountAmt: 0, taxAmt: 0, total: 0 }), [editForm]);
  const editItemsValid = editForm ? editForm.items.some((it) => it.desc.trim() || num(it.rate) > 0) : false;
  const editPrevPaid = editTarget ? effectivePaid(editTarget) : 0;
  const editPaidClamped = round2(Math.min(editPrevPaid, editCalc.total));
  const editBalance = round2(Math.max(editCalc.total - editPaidClamped, 0));

  const saveEdit = async () => {
    if (!editTarget || !editForm) return;
    const cleanItems = editForm.items.filter((it) => it.desc.trim() || num(it.rate) > 0);
    if (!cleanItems.length) { setEditErr("Add at least one line item."); return; }
    setEditSaving(true); setEditErr("");
    try {
      const res = await api.patch(`/api/invoices/${editTarget.id}/edit`, { date: editForm.date || undefined, client: { name: editForm.clientName, phone: editForm.clientPhone, email: editForm.clientEmail, gstin: editForm.clientGstin, address: editForm.clientAddr }, items: cleanItems.map((it) => ({ desc: it.desc, qty: num(it.qty), rate: num(it.rate) })), discType: editForm.discType, discVal: num(editForm.discVal), taxPct: num(editForm.taxPct), notes: editForm.notes, warranty: editForm.warranty, source: editForm.source, pin: editPin.trim() }, { timeout: REQ_TIMEOUT });
      setList((rows) => rows.map((r) => (r.id === editTarget.id ? { ...editTarget, ...res.data } : r))); setEditDone(true); setTimeout(() => setEditTarget(null), 1500);
    } catch (e: any) { setEditErr(errMessage(e, "Couldn't save the changes.")); }
    finally { setEditSaving(false); }
  };

  const openSend = (inv: Invoice, channel: "email" | "whatsapp") => {
    setSendErr(""); setSendDone(null); setSendBusy(false); setSendChannel(channel);
    const total = num(inv.total); const paid = effectivePaid(inv); const due = round2(Math.max(total - paid, 0)); const bizName = inv.business?.name || "Abhijit Art";
    setEmailTo(inv.clientEmail || ""); setEmailSubject(`Invoice ${inv.invoiceNo} from ${bizName}`);
    setEmailMessage(`Dear ${inv.clientName || "Customer"},\n\nPlease find your invoice ${inv.invoiceNo}, for a total of ${rupee(total)}${due > 0.005 ? `, with a balance due of ${rupee(due)}` : " — paid in full, thank you"}.\n\nDo let us know if anything needs correcting — just reply to this email.\n\nWarm regards,\n${bizName}`);
    setWaTo(inv.clientPhone || ""); setWaMessage(`Dear ${inv.clientName || "Customer"},\n\nHere is your invoice ${inv.invoiceNo} from ${bizName}.\n\nTotal: ${rupee(total)}${paid > 0.005 ? `\nPaid: ${rupee(paid)}` : ""}${due > 0.005 ? `\nBalance due: ${rupee(due)}` : ""}\n\nThank you for your business!`);
    setSendTarget(inv);
  };

  const sendEmailNow = async () => {
    if (!sendTarget) return; if (!emailTo.trim()) { setSendErr("Enter the client's email address."); return; }
    setSendBusy(true); setSendErr("");
    try {
      const inv = sendTarget;
      await api.post("/api/invoices/email", { to: emailTo.trim(), subject: emailSubject, message: emailMessage, invoice: { invNo: inv.invoiceNo, date: inv.date, biz: inv.business || {}, client: { name: inv.clientName || "", address: inv.clientAddr || "", phone: inv.clientPhone || "", email: inv.clientEmail || "", gstin: inv.clientGstin || "", pan: "" }, items: (Array.isArray(inv.items) ? inv.items : []).map((it) => ({ desc: it.desc, qty: num(it.qty), rate: num(it.rate) })), discType: inv.discType, discVal: inv.discVal, taxPct: inv.taxPct, notes: inv.notes || "", warranty: inv.warranty || "", paidAmount: effectivePaid(inv) } }, { timeout: REQ_TIMEOUT });
      setSendDone({ title: "Email sent", detail: `${sendTarget.invoiceNo} → ${emailTo.trim()}`, tone: GREEN }); setTimeout(() => setSendTarget(null), 1600);
    } catch (e: any) { setSendErr(errMessage(e, "Couldn't send the email.")); }
    finally { setSendBusy(false); }
  };

  const sendWhatsAppNow = () => {
    if (!sendTarget) return; const digits = waDigits(waTo);
    if (digits.length < 10) { setSendErr("Enter a valid WhatsApp number."); return; }
    const inv = sendTarget; const link = inv.pdfUrl ? `\n\n📄 Invoice PDF: ${inv.pdfUrl}` : "";
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(waMessage + link)}`, "_blank");
    setSendDone({ title: "Opening WhatsApp…", detail: `+${digits}`, tone: WA }); setTimeout(() => setSendTarget(null), 1400);
  };

  const exportCsv = () => {
    const head = ["Invoice No","Date","Client","Phone","Email","GSTIN","Source","Method","Subtotal","Discount","GST","Total","Paid","Due","Status"];
    const body = shown.map((inv) => { const total = num(inv.total); const paid = effectivePaid(inv); const ms = methodSummary(inv); return [inv.invoiceNo,fmt(inv.date),inv.clientName||"",inv.clientPhone||"",inv.clientEmail||"",inv.clientGstin||"",srcMeta(inv.source).label,ms?ms.label:"",num(inv.subtotal).toFixed(2),num(inv.discountAmt).toFixed(2),num(inv.taxAmt).toFixed(2),total.toFixed(2),paid.toFixed(2),Math.max(total-paid,0).toFixed(2),STATUS_META[inv.status].label].map(csvCell).join(","); });
    const csv = [head.map(csvCell).join(","),...body].join("\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"})); const a = document.createElement("a"); a.href=url; a.download=`abhijit-art-invoices-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const payList = payTarget && Array.isArray(payTarget.payments) ? payTarget.payments : [];
  const payTotal = payTarget ? num(payTarget.total) : 0;
  const payPrev = round2(payList.reduce((s, p) => s + num(p.amount), 0));
  const payBalanceNow = round2(Math.max(payTotal - payPrev, 0));
  const payAdd = round2(Math.max(num(addAmount), 0));
  const payNewPaid = round2(Math.min(payPrev + payAdd, payTotal));
  const payNewBalance = round2(Math.max(payTotal - payNewPaid, 0));
  const payPreview = deriveStatus(payNewPaid, payTotal);
  const payFullyPaid = payBalanceNow <= 0.005;
  const sendTotal = sendTarget ? num(sendTarget.total) : 0;
  const sendPaid = sendTarget ? effectivePaid(sendTarget) : 0;
  const sendDue = round2(Math.max(sendTotal - sendPaid, 0));
  const periodLabel = PERIOD_LABEL[period];

  return (
    <div style={st.page} ref={rootRef}>
      <div style={st.head}>
        <div style={st.headActions}>
          <button className="ivh-ghost" style={st.ghostBtn} onClick={exportCsv} disabled={!shown.length}><Icon name="csv" size={15} /> Export CSV</button>
          <button className="ivh-ghost" style={st.ghostBtn} onClick={() => load(false)} disabled={refreshing}><Icon name="refresh" size={15} /> {refreshing ? "Refreshing…" : "Refresh"}</button>
        </div>
      </div>

      <div style={st.statsHead}><span style={st.statsPeriod}>Showing <b style={{ color: INK }}>{periodLabel}</b></span></div>
      <div style={st.stats}>
        {[{ n: stats.count, l: "Invoices", c: INK }, { n: rupee(stats.billed), l: "Total billed", c: INK }, { n: rupee(stats.received), l: "Received", c: GREEN }, { n: rupee(stats.cash), l: "Cash received", c: METHOD_META.cash.fg, icon: "banknote" }, { n: rupee(stats.online), l: "Online received", c: METHOD_META.online.fg, icon: "card" }, { n: rupee(stats.outstanding), l: "Outstanding", c: TERRA }].map((s, i) => (
          <div key={i} className="ivh-card" style={st.statcard}><div style={{ ...st.statnum, color: s.c }}>{s.n}</div><div style={st.statlbl}>{s.icon && <span style={st.statIcon}><Icon name={s.icon} size={12} /></span>}{s.l}</div></div>
        ))}
      </div>

      <div style={st.viewToggle}>
        <button className={`ivh-vtab${viewMode === "customers" ? " on" : ""}`} style={st.vtab} onClick={() => setViewMode("customers")}><Icon name="user" size={15} /> By Customer</button>
        <button className={`ivh-vtab${viewMode === "all" ? " on" : ""}`} style={st.vtab} onClick={() => setViewMode("all")}><Icon name="receipt" size={15} /> All Invoices</button>
      </div>

      <div style={st.toolbar}>
        <div style={st.filters}>
          {viewMode === "all" && (["all", ...STATUSES] as const).map((f) => (<button key={f} className={`ivh-chip${filter === f ? " on" : ""}`} style={st.chip} onClick={() => setFilter(f)}>{f === "all" ? "All" : STATUS_META[f].label}</button>))}
        </div>
        <div style={st.toolbarRight}>
          <select className="ivh-datesel" style={st.dateSel} value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div style={st.searchWrap}>
            <span style={st.searchIcon}><Icon name="search" size={15} /></span>
            <input className="ivh-in" style={st.search} placeholder={viewMode === "customers" ? "Search customers by name or phone…" : "Search by name, phone or invoice no…"} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      {viewMode === "customers" && (
        <div className="ivh-card" style={st.tableCard}>
          {loading ? (<div style={st.skelWrap}>{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="ivh-skel" style={st.skelRow} />))}</div>)
          : error ? (<div style={st.empty}><p style={{ margin: 0 }}>{error}</p></div>)
          : customerRows.length === 0 ? (<div style={st.empty}><span style={{ color: FAINT, display: "block", marginBottom: 10 }}><Icon name="user" size={34} /></span><p style={{ margin: 0, fontWeight: 700, color: INK }}>No customers yet</p><p style={{ margin: "5px 0 0", fontSize: 13.5 }}>Invoices grouped by customer will appear here.</p></div>)
          : (
            <div className={refreshing ? "ivh-dim" : ""} style={st.tableWrap}>
              <table style={st.table}>
                <thead><tr>
                  <th style={{ ...st.th, width: 34 }}>#</th>
                  <th style={st.th}>Customer</th>
                  <th style={{ ...st.th, textAlign: "center", width: 90 }}>Invoices</th>
                  <th style={{ ...st.th, textAlign: "right", width: 130 }}>Total Billed</th>
                  <th style={{ ...st.th, textAlign: "right", width: 130 }}>Paid</th>
                  <th style={{ ...st.th, textAlign: "right", width: 130 }}>Balance Due</th>
                  <th style={{ ...st.th, width: 40 }} />
                </tr></thead>
                <tbody>
                  {customerRows.map((r, i) => (
                    <tr key={r.key} className="ivh-tr ivh-custrow" onClick={() => { setDrawerQ(""); setPaidOpen(false); setDrillCust(r.key); }} style={{ cursor: "pointer" }}>
                      <td style={{ ...st.td, color: FAINT, textAlign: "center" }}>{i + 1}</td>
                                            <td style={st.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: INK, fontSize: 14 }}>{r.name}</div>
                            {r.phone && <div style={{ fontSize: 12, color: FAINT, marginTop: 2 }}>{r.phone}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...st.td, textAlign: "center", fontWeight: 700 }}>{r.invoices.length}</td>
                      <td style={{ ...st.td, textAlign: "right", fontWeight: 700, color: INK, fontVariantNumeric: "tabular-nums" }}>{rupee(r.billed)}</td>
                      <td style={{ ...st.td, textAlign: "right", fontWeight: 700, color: GREEN, fontVariantNumeric: "tabular-nums" }}>{rupee(r.paid)}</td>
                      <td style={{ ...st.td, textAlign: "right", fontWeight: 800, color: r.due > 0 ? TERRA : GREEN, fontVariantNumeric: "tabular-nums" }}>{r.due > 0 ? rupee(r.due) : "✓ Cleared"}</td>
                      <td style={{ ...st.td, textAlign: "center", color: FAINT, fontSize: 18 }}>›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {viewMode === "all" && (
      <div className="ivh-card" style={st.tableCard}>
        {loading ? (<div style={st.skelWrap}>{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="ivh-skel" style={st.skelRow} />))}</div>)
        : error ? (<div style={st.empty}><p style={{ margin: 0 }}>{error}</p><button className="ivh-ghost" style={{ ...st.ghostBtn, marginTop: 14 }} onClick={() => load(true)}>Try again</button></div>)
        : list.length === 0 ? (<div style={st.empty}><span style={{ color: FAINT, display: "block", marginBottom: 10 }}><Icon name="receipt" size={34} /></span><p style={{ margin: 0, fontWeight: 700, color: INK }}>No invoices yet</p><p style={{ margin: "5px 0 0", fontSize: 13.5 }}>Download or email a bill from the Billing tab and it'll show up here.</p></div>)
        : shown.length === 0 ? (<div style={st.empty}><p style={{ margin: 0 }}>No invoices match your filters.</p></div>)
        : (
          <div className={refreshing ? "ivh-dim" : ""} style={st.tableWrap}>
            <table style={st.table}>
              <thead><tr>
                <th style={{ ...st.th, width: 34 }}>#</th>
                <th style={st.th}>Invoice No</th>
                <th style={st.th}>Client</th>
                <th style={st.th}>Date</th>
                <th style={{ ...st.th, textAlign: "right", width: 120 }}>Total</th>
                <th style={{ ...st.th, textAlign: "right", width: 130 }}>Due</th>
                <th style={{ ...st.th, width: 110 }}>Status</th>
                <th style={{ ...st.th, textAlign: "right", width: 240 }}>Actions</th>
              </tr></thead>
              <tbody>
                {shown.map((inv, i) => {
                  const m = STATUS_META[inv.status]; const sm = srcMeta(inv.source); const ms = methodSummary(inv);
                  const total = num(inv.total); const paid = effectivePaid(inv); const due = round2(Math.max(total - paid, 0));
                  const editLocked = inv.status === "paid" || inv.status === "cancelled"; const sendLocked = inv.status === "cancelled";
                  return (
                    <tr key={inv.id} className="ivh-tr">
                      <td style={{ ...st.td, color: FAINT, textAlign: "center" }}>{i + 1}</td>
                      <td style={st.td}><button className="ivh-nolink" style={st.noBtn} onClick={() => printInvoice(inv)} title="Print this bill">{inv.invoiceNo}</button></td>
                      <td style={st.td}>
                        <div style={{ fontWeight: 700, color: INK }}>{inv.clientName || "—"}</div>
                        <div style={st.clientMeta}>
                          <span style={{ ...st.srcPill, color: sm.fg, background: sm.bg, borderColor: sm.bd }}>{sm.label}</span>
                          {ms && (<span style={{ ...st.methPill, color: ms.fg, background: ms.bg, borderColor: ms.bd }}><Icon name={ms.icon} size={11} /> {ms.label}</span>)}
                          {(inv.clientPhone || inv.clientEmail) && (<span style={st.subline}>{inv.clientPhone || inv.clientEmail}</span>)}
                        </div>
                      </td>
                      <td style={{ ...st.td, whiteSpace: "nowrap", color: BODY }}>{fmt(inv.date)}</td>
                      <td style={{ ...st.td, textAlign: "right", fontWeight: 800, color: INK, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{rupee(total)}</td>
                      <td style={{ ...st.td, textAlign: "right", whiteSpace: "nowrap" }}>
                        {inv.status === "cancelled" ? (<span style={{ color: FAINT }}>—</span>) : (<><div style={{ fontWeight: 800, color: due > 0 ? TERRA : GREEN, fontVariantNumeric: "tabular-nums" }}>{due > 0 ? rupee(due) : "Settled"}</div>{paid > 0 && <div style={st.dueSub}>Paid {rupee(paid)}</div>}</>)}
                      </td>
                      <td style={st.td}><span style={{ ...st.badge, ...badgeStyle(inv.status) }}>{m.label}</span></td>
                      <td style={{ ...st.td, textAlign: "right", whiteSpace: "nowrap" }}>
                        <button className="ivh-icon" style={st.iconBtn} onClick={() => openEdit(inv)} disabled={editLocked} title={editLocked ? "Locked" : "Edit invoice"}><Icon name="edit" size={16} /></button>
                        <button className="ivh-icon" style={st.iconBtn} onClick={() => openPay(inv)} title="Payments & history"><Icon name="banknote" size={17} /></button>
                        <button className="ivh-icon" style={st.iconBtn} onClick={() => printInvoice(inv)} title="Print A5"><Icon name="download" size={16} /></button>

                        <button className="ivh-icon" style={st.iconBtn} onClick={() => openSend(inv, "email")} disabled={sendLocked} title={sendLocked ? "Cancelled" : "Email"}><Icon name="mail" size={16} /></button>
                        <button className="ivh-icon ivh-wa" style={st.iconBtn} onClick={() => openSend(inv, "whatsapp")} disabled={sendLocked} title={sendLocked ? "Cancelled" : "WhatsApp"}><span style={{ color: WA, display: "inline-flex" }}><Icon name="whatsapp" size={17} /></span></button>
                        <button className="ivh-icon ivh-danger" style={st.iconBtn} onClick={() => openDelete(inv)} title="Delete"><Icon name="trash" size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Customer drill drawer */}
      {drillRow && (
        <div style={st.backdrop} onClick={() => setDrillCust(null)}>
          <div data-modal-scroll style={st.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={st.drawerHead}>
              <div>
                <h2 style={st.drawerName}>{drillRow.name}</h2>
                {drillRow.phone && <div style={st.drawerPhone}><Icon name="phone" size={12} /> {drillRow.phone}</div>}
              </div>
              <div style={st.drawerSearchWrap}>
                <span style={st.drawerSearchIcon}><Icon name="search" size={15} /></span>
                <input style={st.drawerSearch} placeholder="Search invoice no…" value={drawerQ} onChange={(e) => setDrawerQ(e.target.value)} />
                {drawerQ && <button style={st.drawerSearchClear} onClick={() => setDrawerQ("")}>×</button>}
              </div>
              <button style={st.drawerClose} onClick={() => setDrillCust(null)}>×</button>
            </div>
            <div style={st.drawerStats}>
              <div style={st.drawerStat}><div style={st.drawerStatLbl}>Total Billed</div><div style={{ ...st.drawerStatVal, color: INK }}>{rupee(drillRow.billed)}</div></div>
              <div style={st.drawerStat}><div style={st.drawerStatLbl}>Paid</div><div style={{ ...st.drawerStatVal, color: GREEN }}>{rupee(drillRow.paid)}</div></div>
              <div style={st.drawerStat}><div style={st.drawerStatLbl}>Balance Due</div><div style={{ ...st.drawerStatVal, color: drillRow.due > 0 ? TERRA : GREEN }}>{drillRow.due > 0 ? rupee(drillRow.due) : "✓ Cleared"}</div></div>
            </div>
            <button style={st.stmtCta} onClick={() => openStatement(drillRow.key)}><Icon name="csv" size={15} /> View Invoice & Payment Statement</button>
            {(() => {
              const isPaid = (inv: Invoice) => inv.status === "paid" || round2(num(inv.total) - effectivePaid(inv)) <= 0.005;
              const paidInvs = drawerInvoices.filter(isPaid);
              const activeInvs = drawerInvoices.filter((inv) => !isPaid(inv));

              const ActiveCard = (inv: Invoice) => {
                const m = STATUS_META[inv.status]; const total = num(inv.total); const paid = effectivePaid(inv); const due = round2(Math.max(total - paid, 0));
                return (
                  <div key={inv.id} style={st.stmtRow}>
                    <div style={st.stmtLeftRow}>
                      <button className="ivh-nolink" style={st.stmtNo} onClick={() => printInvoice(inv)} title="Print this bill">{inv.invoiceNo}</button>
                      <span style={{ ...st.stmtBadge, background: m.bg, color: m.fg }}>{m.label}</span>
                    </div>
                    <div style={st.stmtRight}>
                      <div style={st.stmtTotal}>{rupee(total)}</div>
                      <div style={{ fontSize: 11, color: due > 0 ? TERRA : GREEN, fontWeight: 700 }}>{due > 0 ? `Due ${rupee(due)}` : "Paid"}</div>
                    </div>
                    <div style={st.stmtMeta}>{fmt(inv.date)} · {fmtTime(inv.createdAt)}  —  {(inv.items || []).map((it) => `${it.qty}× ${it.desc}`).join(", ") || "—"}</div>
                    <div style={st.stmtActions}>
                      <button className="ivh-icon" style={st.stmtBtn} onClick={() => openPay(inv)} title="Record payment" disabled={inv.status === "cancelled"}><Icon name="cash" size={14} /> <span style={st.iconLbl}>Payment</span></button>
                      <button className="ivh-icon" style={st.stmtBtn} onClick={() => printInvoice(inv)} title="Print"><Icon name="download" size={14} /> <span style={st.iconLbl}>Print</span></button>
                    </div>
                  </div>
                );
              };

              const PaidCard = (inv: Invoice) => {
                const total = num(inv.total);
                return (
                  <div key={inv.id} style={{ ...st.stmtRow, background: "#f6fbf7", borderColor: "#cfe8d8" }}>
                    <div style={st.stmtLeftRow}>
                      <button className="ivh-nolink" style={st.stmtNo} onClick={() => printInvoice(inv)} title="Print this bill">{inv.invoiceNo}</button>
                      <span style={{ ...st.stmtBadge, background: "#eafaf0", color: GREEN, display: "inline-flex", alignItems: "center", gap: 3 }}><Icon name="lock" size={10} /> PAID</span>
                    </div>
                    <div style={st.stmtRight}>
                      <div style={st.stmtTotal}>{rupee(total)}</div>
                      <div style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>Cleared</div>
                    </div>
                    <div style={st.stmtMeta}>{fmt(inv.date)} · {fmtTime(inv.createdAt)}  —  {(inv.items || []).map((it) => `${it.qty}× ${it.desc}`).join(", ") || "—"}</div>
                    <div style={st.stmtActions}>
                      <button className="ivh-icon" style={st.stmtBtn} onClick={() => printInvoice(inv)} title="Download / print"><Icon name="download" size={14} /> <span style={st.iconLbl}>Download</span></button>
                    </div>
                  </div>
                );
              };

              return (
                <>
                  <div style={st.drawerListLbl}>{activeInvs.length}{drawerQ ? ` of ${drillRow.invoices.length}` : ""} outstanding invoice{activeInvs.length !== 1 ? "s" : ""}</div>
                  {paidInvs.length > 0 && (
                    <div style={st.paidSection}>
                      <button style={st.paidHead} onClick={() => setPaidOpen((v) => !v)}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="lock" size={13} /> Paid &amp; locked · {paidInvs.length}</span>
                        <span style={{ fontSize: 16, transform: paidOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>›</span>
                      </button>
                      {paidOpen && <div style={st.paidList}>{paidInvs.map(PaidCard)}</div>}
                    </div>
                  )}
                  <div style={st.drawerList}>
                    {drawerInvoices.length === 0 ? <div style={{ padding: "18px", textAlign: "center", color: MUTE, fontSize: 13 }}>No invoices match "{drawerQ}".</div>
                      : activeInvs.length === 0 ? <div style={{ padding: "18px", textAlign: "center", color: GREEN, fontSize: 13, fontWeight: 600 }}>✓ All invoices are fully paid.</div>
                      : activeInvs.map(ActiveCard)}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Full Account Statement modal */}
      {stmtRow && (
        <div style={st.backdrop} onClick={() => setStmtCust(null)}>
          <div data-modal-scroll style={st.stmtModal} onClick={(e) => e.stopPropagation()}>
            <div style={st.drawerHead}>
              <div>
                <h2 style={st.drawerName}>Invoice & Payment Statement</h2>
                <div style={st.drawerPhone}>{stmtRow.name}{stmtRow.phone ? ` · ${stmtRow.phone}` : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button style={st.stmtDownload} onClick={downloadStatementPDF}><Icon name="download" size={15} /> Download PDF</button>
                <button style={st.drawerClose} onClick={() => setStmtCust(null)}>×</button>
              </div>
            </div>

            <div style={st.stmtFilters}>
              <label style={st.stmtFLabel}>From<input type="date" className="ivh-in" style={st.stmtDateInput} value={stFrom} onChange={(e) => setStFrom(e.target.value)} /></label>
              <label style={st.stmtFLabel}>To<input type="date" className="ivh-in" style={st.stmtDateInput} value={stTo} onChange={(e) => setStTo(e.target.value)} /></label>
              <label style={st.stmtFLabel}>Month
                <select className="ivh-datesel" style={st.stmtSel} value={stMonth} onChange={(e) => setStMonth(e.target.value)}>
                  <option value="">All months</option>
                  {MONTH_NAMES.map((name, i) => <option key={i} value={String(i + 1)}>{name}</option>)}
                </select>
              </label>
              <label style={st.stmtFLabel}>Year
                <select className="ivh-datesel" style={st.stmtSel} value={stYear} onChange={(e) => setStYear(e.target.value)}>
                  <option value="">All years</option>
                  {stmtYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <label style={st.stmtFLabel}>Status
                <select className="ivh-datesel" style={st.stmtSel} value={stStatus} onChange={(e) => setStStatus(e.target.value as any)}>
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </label>
              {(stFrom || stTo || stStatus !== "all" || stMonth || stYear) && <button style={st.stmtClear} onClick={() => { setStFrom(""); setStTo(""); setStStatus("all"); setStMonth(""); setStYear(""); }}>Clear</button>}
            </div>

            <div data-modal-scroll style={st.stmtTableWrap}>
              <table style={st.stmtTable}>
                <thead><tr>
                  <th style={st.stmtTh}>Date</th>
                  <th style={st.stmtTh}>Particulars</th>
                  <th style={{ ...st.stmtTh, textAlign: "right" }}>Bill (₹)</th>
                  <th style={{ ...st.stmtTh, textAlign: "right" }}>Received (₹)</th>
                  <th style={{ ...st.stmtTh, textAlign: "right" }}>Balance (₹)</th>
                </tr></thead>
                <tbody>
                  {stmtTxns.length === 0 ? (
                    <tr><td colSpan={5} style={{ ...st.stmtTd, textAlign: "center", color: MUTE, padding: "24px" }}>No transactions for the selected filters.</td></tr>
                  ) : stmtTxns.map((x, i) => (
                    <tr key={i} style={x.kind === "payment" ? { background: "#f6fbf7" } : undefined}>
                      <td style={{ ...st.stmtTd, whiteSpace: "nowrap" }}>{fmt(x.date)}<div style={{ fontSize: 10.5, color: FAINT }}>{fmtTime(x.date)}</div></td>
                      <td style={st.stmtTd}><div style={{ fontWeight: 700, color: INK }}>{x.desc}</div>{x.sub && <div style={{ fontSize: 11.5, color: MUTE, marginTop: 2 }}>{x.sub}</div>}</td>
                      <td style={{ ...st.stmtTd, textAlign: "right", fontVariantNumeric: "tabular-nums", color: x.debit ? INK : FAINT }}>{x.debit ? rupee(x.debit).replace("₹", "") : "—"}</td>
                      <td style={{ ...st.stmtTd, textAlign: "right", fontVariantNumeric: "tabular-nums", color: x.credit ? GREEN : FAINT, fontWeight: x.credit ? 700 : 400 }}>{x.credit ? rupee(x.credit).replace("₹", "") : "—"}</td>
                      <td style={{ ...st.stmtTd, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 800, color: x.balance > 0 ? TERRA : GREEN }}>{rupee(x.balance).replace("₹", "")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={st.stmtTf} colSpan={2}>Total</td>
                    <td style={{ ...st.stmtTf, textAlign: "right" }}>{rupee(stmtTotals.debit).replace("₹", "")}</td>
                    <td style={{ ...st.stmtTf, textAlign: "right", color: GREEN }}>{rupee(stmtTotals.credit).replace("₹", "")}</td>
                    <td style={{ ...st.stmtTf, textAlign: "right", color: stmtTotals.balance > 0 ? TERRA : GREEN }}>{rupee(stmtTotals.balance).replace("₹", "")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div style={st.stmtSummary}>
              <span>Total Billed: <b style={{ color: INK }}>{rupee(stmtTotals.debit)}</b></span>
              <span>Total Received: <b style={{ color: GREEN }}>{rupee(stmtTotals.credit)}</b></span>
              <span>Balance Due: <b style={{ color: stmtTotals.balance > 0 ? TERRA : GREEN }}>{stmtTotals.balance > 0 ? rupee(stmtTotals.balance) : "✓ Cleared"}</b></span>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && editForm && (
        <div style={st.backdrop} onClick={() => !editSaving && !editDone && setEditTarget(null)}>
          <div data-modal-scroll className="ivh-modal" style={st.editModal} onClick={(e) => e.stopPropagation()}>
            {editDone ? (<SuccessPanel title="Changes saved" detail={`${editTarget.invoiceNo} · now ${rupee(editCalc.total)}`} tone={GREEN} />) : (
              <>
                <div style={st.payHead}>
                  <div><h3 style={st.modalTitle}>Edit invoice · {editTarget.invoiceNo}</h3><p style={st.editSubhelp}>Invoice number and your business details stay the same.</p></div>
                  <button className="ivh-icon" style={st.iconBtn} onClick={() => setEditTarget(null)} aria-label="Close"><Icon name="x" size={18} /></button>
                </div>
                <div style={st.formGrid}>
                  <label style={st.editField}><span style={st.fieldLabel}>Invoice date</span><input className="ivh-in" style={st.editInput} type="date" value={editForm.date} onChange={(e) => patchForm({ date: e.target.value })} /></label>
                  <div style={st.editField}>
                    <span style={st.fieldLabel}>Customer type</span>
                    <div style={st.segWrap}>
                      {(["online","offline"] as InvSource[]).map((s,idx)=>(<button key={s} type="button" className={`ivh-seg${editForm.source===s?" on":""}`} style={{...st.segBtn,...(idx===1?{borderLeft:`1px solid ${LINE}`}:null),...(editForm.source===s?st.segBtnOn:null)}} onClick={()=>patchForm({source:s})}>{SOURCE_META[s].label}</button>))}
                    </div>
                  </div>
                </div>
                <div style={st.sectionTitle}>Bill to</div>
                <div style={st.formGrid}>
                  {[["clientName","Name"],["clientPhone","Phone"],["clientEmail","Email"],["clientGstin","GSTIN"]].map(([k,l])=>(<label key={k} style={st.editField}><span style={st.fieldLabel}>{l}</span><input className="ivh-in" style={st.editInput} value={(editForm as any)[k]} onChange={(e)=>patchForm({[k]:e.target.value} as any)} placeholder={l} /></label>))}
                </div>
                <label style={{...st.editField,marginTop:10}}><span style={st.fieldLabel}>Address</span><textarea className="ivh-in" style={st.editTextarea} value={editForm.clientAddr} onChange={(e)=>patchForm({clientAddr:e.target.value})} rows={2} /></label>
                <div style={st.sectionTitle}>Items</div>
                <div style={st.linesHead}><span>Description</span><span style={{textAlign:"right"}}>Qty</span><span style={{textAlign:"right"}}>Rate</span><span style={{textAlign:"right"}}>Amount</span><span /></div>
                {editForm.items.map((it,idx)=>(
                  <div key={idx} style={st.lineRow}>
                    <input className="ivh-in" style={st.editInput} value={it.desc} onChange={(e)=>setEditItem(idx,"desc",e.target.value)} placeholder={`Item ${idx+1}`} />
                    <input className="ivh-in" style={st.lineNumInput} type="number" min="0" value={it.qty} onChange={(e)=>setEditItem(idx,"qty",e.target.value)} />
                    <input className="ivh-in" style={st.lineNumInput} type="number" min="0" value={it.rate} onChange={(e)=>setEditItem(idx,"rate",e.target.value)} />
                    <div style={st.lineAmt}>{rupee(num(it.qty)*num(it.rate))}</div>
                    <button type="button" className="ivh-icon ivh-danger" style={st.lineRemoveBtn} onClick={()=>removeEditItem(idx)} disabled={editForm.items.length<=1}><Icon name="x" size={15} /></button>
                  </div>
                ))}
                <button type="button" className="ivh-addline" style={st.addLineBtn} onClick={addEditItem}><Icon name="plus" size={14} /> Add line</button>
                <div style={{...st.formGrid,marginTop:16}}>
                  <div style={st.editField}>
                    <span style={st.fieldLabel}>Discount</span>
                    <div style={st.discRow}>
                      <select className="ivh-datesel" style={st.discSelect} value={editForm.discType} onChange={(e)=>patchForm({discType:e.target.value==="percent"?"percent":"amount"})}><option value="amount">₹</option><option value="percent">%</option></select>
                      <input className="ivh-in" style={st.discInput} type="number" min="0" value={editForm.discVal} onChange={(e)=>patchForm({discVal:e.target.value})} />
                    </div>
                  </div>
                  <label style={st.editField}><span style={st.fieldLabel}>GST %</span><input className="ivh-in" style={st.discInput} type="number" min="0" value={editForm.taxPct} onChange={(e)=>patchForm({taxPct:e.target.value})} /></label>
                </div>
                <div style={{...st.formGrid,marginTop:10}}>
                  <label style={st.editField}><span style={st.fieldLabel}>Notes</span><textarea className="ivh-in" style={st.editTextarea} value={editForm.notes} onChange={(e)=>patchForm({notes:e.target.value})} rows={2} /></label>
                  <label style={st.editField}><span style={st.fieldLabel}>Warranty</span><textarea className="ivh-in" style={st.editTextarea} value={editForm.warranty} onChange={(e)=>patchForm({warranty:e.target.value})} rows={2} /></label>
                </div>
                <div style={st.editTotals}>
                  <div style={st.editTotRow}><span style={st.editTotLbl}>Subtotal</span><span style={st.editTotVal}>{rupee(editCalc.subtotal)}</span></div>
                  {editCalc.discountAmt>0&&<div style={st.editTotRow}><span style={st.editTotLbl}>Discount</span><span style={st.editTotVal}>− {rupee(editCalc.discountAmt)}</span></div>}
                  {editCalc.taxAmt>0&&<div style={st.editTotRow}><span style={st.editTotLbl}>GST ({num(editForm.taxPct)}%)</span><span style={st.editTotVal}>{rupee(editCalc.taxAmt)}</span></div>}
                  <div style={st.editGrandRow}><span style={{fontWeight:800,color:INK}}>Total</span><span style={st.editGrandVal}>{rupee(editCalc.total)}</span></div>
                  {editPaidClamped>0.005&&<><div style={{...st.editTotRow,paddingTop:8}}><span style={st.editTotLbl}>Already received</span><span style={{...st.editTotVal,color:GREEN}}>− {rupee(editPaidClamped)}</span></div><div style={st.editTotRow}><span style={{...st.editTotLbl,fontWeight:700,color:INK}}>Balance due</span><span style={{...st.editTotVal,color:editBalance>0?TERRA:GREEN}}>{editBalance>0?rupee(editBalance):"Settled"}</span></div></>}
                </div>
                <label style={{display:"block",marginTop:16}}><span style={st.fieldLabel}><span style={{display:"inline-flex",verticalAlign:"-2px",marginRight:5,color:MUTE}}><Icon name="lock" size={13} /></span>Security PIN <span style={{fontWeight:500,color:MUTE}}>· required to save changes</span></span><input className="ivh-in" style={st.pinInput} type="password" value={editPin} name="aa-edit-pin" autoComplete="one-time-code" inputMode="numeric" data-1p-ignore data-lpignore="true" data-form-type="other" onChange={(e)=>setEditPin(e.target.value)} placeholder="••••••" onKeyDown={(e)=>{if(e.key==="Enter"&&editPin.trim()&&editItemsValid&&!editSaving)saveEdit();}} /></label>
                {editErr&&<div style={{...st.errBanner,marginTop:14,marginBottom:0}}>{editErr}</div>}
                <div style={st.editFoot}><button className="ivh-ghost" style={st.ghostBtn} onClick={()=>setEditTarget(null)} disabled={editSaving}>Cancel</button><button className="ivh-save" style={st.saveBtn} onClick={saveEdit} disabled={editSaving||!editPin.trim()||!editItemsValid}>{editSaving?<span className="ivh-spin" style={st.spin}/>:"Save changes"}</button></div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Payments modal */}
      {payTarget && (
        <div style={st.backdrop} onClick={() => !paySaving && !payDone && !paySavedAnim && setPayTarget(null)}>
          <div data-modal-scroll className="ivh-modal" style={{ ...st.editModal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            {payDone ? (<SuccessPanel title={payDone.title} detail={payDone.detail} tone={payDone.tone} />) :
            paySavedAnim ? (<SuccessPanel title={payBalanceNow<=0.005?"Paid in full":"Payment saved"} detail={payBalanceNow<=0.005?`${payTarget.invoiceNo} · settled`:`${payTarget.invoiceNo} · balance ${rupee(payBalanceNow)}`} tone={GREEN} />) : (
              <>
                <div style={st.payHead}><div><h3 style={st.modalTitle}>Payments · {payTarget.invoiceNo}</h3><p style={st.paySub}>{payTarget.clientName||"—"}</p></div><button className="ivh-icon" style={st.iconBtn} onClick={()=>setPayTarget(null)} aria-label="Close"><Icon name="x" size={18}/></button></div>
                <div style={st.paySummary}>
                  <div><div style={st.paySumLbl}>Total</div><div style={st.paySumTotal}>{rupee(payTotal)}</div></div>
                  <div style={{textAlign:"center"}}><div style={st.paySumLbl}>Received</div><div style={st.paySumMid}>{rupee(payPrev)}</div></div>
                  <div style={{textAlign:"right"}}><div style={st.paySumLbl}>Balance</div><div style={{...st.paySumDue,color:payBalanceNow>0?TERRA:GREEN}}>{payBalanceNow>0?rupee(payBalanceNow):"Settled"}</div></div>
                </div>
                <div style={st.payHistWrap}>
                  <div style={st.payHistHead}><span>Payment history</span><span style={{color:MUTE,fontWeight:700}}>{payList.length} {payList.length===1?"entry":"entries"}</span></div>
                  {payList.length===0?(<div style={st.payHistEmpty}>No payments recorded yet.</div>):(<div data-modal-scroll style={st.payHistList}>{payList.map((p)=>{const pm=methMeta(p.method);const confirming=payConfirmDel===p.id;const del=payDeletingId===p.id;return(<div key={p.id} style={st.payHistRow}><span style={st.payHistDate}>{fmt(p.createdAt)}</span><span style={{...st.payHistMeth,color:pm.fg,background:pm.bg,borderColor:pm.bd}}><Icon name={pm.icon} size={11}/> {pm.label}</span>{p.note&&<span style={st.payHistNote} title={p.note}>{p.note}</span>}<div style={st.payHistRight}><span style={st.payHistAmt}>{rupee(num(p.amount))}</span>{del?<span className="ivh-spin" style={{...st.spin,width:15,height:15,borderColor:`${TERRA}55`,borderTopColor:TERRA}}/>:confirming?<span style={st.payConfirmWrap}><button style={st.histConfirmYes} onClick={()=>deletePayment(p.id)} disabled={!payPin.trim()}>Remove</button><button style={st.histConfirmNo} onClick={()=>setPayConfirmDel(null)}>Keep</button></span>:<button className="ivh-icon ivh-danger" style={st.payHistDelBtn} onClick={()=>setPayConfirmDel(p.id)}><Icon name="x" size={14}/></button>}</div></div>);})}</div>)}
                </div>
                {payFlash&&<div style={st.payFlash}>{payFlash}</div>}
                {payFullyPaid&&payTarget.status!=="cancelled"?(<div style={st.payFullyNote}>This bill is fully paid — nothing due.</div>):(
                  <>
                    <div style={{marginTop:4}}><span style={st.fieldLabel}>Payment method</span><div style={st.segWrap}>{(["cash","online"] as InvMethod[]).map((mth,idx)=>(<button key={mth} type="button" className={`ivh-seg${payMethod===mth?" on":""}`} style={{...st.segBtn,...(idx===1?{borderLeft:`1px solid ${LINE}`}:null),...(payMethod===mth?st.segBtnOn:null)}} onClick={()=>setPayMethod(mth)}><Icon name={METHOD_META[mth].icon} size={14}/> {METHOD_META[mth].label}</button>))}</div></div>
                    <label style={{display:"block",marginTop:12}}><span style={st.fieldLabel}>Add payment (₹)</span><input className="ivh-in" style={st.payInput} type="number" min="0" value={addAmount} onChange={(e)=>setAddAmount(e.target.value)} placeholder="0" autoFocus/></label>
                    <div style={st.payQuick}><button className="ivh-chip" style={st.chip} onClick={()=>setAddAmount(String(payBalanceNow))} disabled={payBalanceNow<=0}>Full balance · {rupee(payBalanceNow)}</button><button className="ivh-chip" style={st.chip} onClick={()=>setAddAmount("0")}>Clear</button></div>
                    {payAdd>0&&<div style={st.payAfter}>After this: received <b style={{color:INK}}>{rupee(payNewPaid)}</b> · balance <b style={{color:payNewBalance>0?TERRA:GREEN}}>{payNewBalance>0?rupee(payNewBalance):"Settled"}</b> · <span style={{...st.badge,...badgeStyle(payPreview)}}>{STATUS_META[payPreview].label}</span></div>}
                  </>
                )}
                <label style={{display:"block",marginTop:16}}><span style={st.fieldLabel}><span style={{display:"inline-flex",verticalAlign:"-2px",marginRight:5,color:MUTE}}><Icon name="lock" size={13}/></span>Security PIN</span><input className="ivh-in" style={st.pinInput} type="password" value={payPin} name="aa-billing-pin" autoComplete="one-time-code" inputMode="numeric" data-1p-ignore data-lpignore="true" data-form-type="other" onChange={(e)=>setPayPin(e.target.value)} placeholder="••••••" onKeyDown={(e)=>{if(e.key==="Enter"&&payPin.trim()&&payAdd>0&&!payFullyPaid&&!paySaving)savePayment();}}/></label>
                {payErr&&<div style={{...st.errBanner,marginTop:14,marginBottom:0}}>{payErr}</div>}
                <div style={st.payFoot}>
                  {payTarget.status==="cancelled"?<span style={st.payCancelledNote}>Cancelled</span>:payFullyPaid?<span style={st.payCancelledNote}>Fully paid</span>:<button className="ivh-cancelinv" style={st.cancelInvBtn} onClick={cancelInvoice} disabled={paySaving||!payPin.trim()}>Cancel invoice</button>}
                  <div style={{display:"flex",gap:10,marginLeft:"auto"}}><button className="ivh-ghost" style={st.ghostBtn} onClick={()=>setPayTarget(null)} disabled={paySaving}>Close</button><button className="ivh-save" style={st.saveBtn} onClick={savePayment} disabled={paySaving||!payPin.trim()||payAdd<=0||payFullyPaid}>{paySaving?<span className="ivh-spin" style={st.spin}/>:"Save payment"}</button></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Send modal */}
      {sendTarget && (
        <div style={st.backdrop} onClick={()=>!sendBusy&&!sendDone&&setSendTarget(null)}>
          <div data-modal-scroll className="ivh-modal" style={{...st.editModal,maxWidth:520}} onClick={(e)=>e.stopPropagation()}>
            {sendDone?(<SuccessPanel title={sendDone.title} detail={sendDone.detail} tone={sendDone.tone}/>):(
              <>
                <div style={st.payHead}><div><h3 style={st.modalTitle}>Send invoice · {sendTarget.invoiceNo}</h3><p style={st.paySub}>{sendTarget.clientName||"—"}</p></div><button className="ivh-icon" style={st.iconBtn} onClick={()=>setSendTarget(null)} aria-label="Close"><Icon name="x" size={18}/></button></div>
                <div style={st.segWrap}>{(["email","whatsapp"] as const).map((ch,idx)=>(<button key={ch} type="button" className={`ivh-seg${sendChannel===ch?" on":""}`} style={{...st.segBtn,...(idx===1?{borderLeft:`1px solid ${LINE}`}:null),...(sendChannel===ch?(ch==="whatsapp"?st.segBtnWa:st.segBtnOn):null)}} onClick={()=>{setSendChannel(ch);setSendErr("");}}><Icon name={ch==="email"?"mail":"whatsapp"} size={14}/> {ch==="email"?"Email":"WhatsApp"}</button>))}</div>
                {sendChannel==="email"?(<><div style={st.sendNote}>The invoice is included in the email — the client sees it without downloading anything.</div><label style={{display:"block"}}><span style={st.fieldLabel}>Send to</span><input className="ivh-in" style={st.editInput} type="email" value={emailTo} onChange={(e)=>setEmailTo(e.target.value)} placeholder="client@example.com" autoFocus/></label><label style={{display:"block",marginTop:10}}><span style={st.fieldLabel}>Subject</span><input className="ivh-in" style={st.editInput} value={emailSubject} onChange={(e)=>setEmailSubject(e.target.value)}/></label><label style={{display:"block",marginTop:10}}><span style={st.fieldLabel}>Message</span><textarea className="ivh-in" style={{...st.editTextarea,minHeight:122}} value={emailMessage} onChange={(e)=>setEmailMessage(e.target.value)}/></label></>)
                :(<><div style={st.sendNoteWa}>Opens WhatsApp with the message ready to send.{sendTarget.pdfUrl?" A link to the invoice PDF is added automatically.":""}</div><label style={{display:"block"}}><span style={st.fieldLabel}>WhatsApp number</span><input className="ivh-in" style={st.editInput} value={waTo} onChange={(e)=>setWaTo(e.target.value)} placeholder="e.g. 7405179066" autoFocus/></label><label style={{display:"block",marginTop:10}}><span style={st.fieldLabel}>Message</span><textarea className="ivh-in" style={{...st.editTextarea,minHeight:132}} value={waMessage} onChange={(e)=>setWaMessage(e.target.value)}/></label></>)}
                <div style={st.sendSummary}><span style={{fontSize:12.5,color:MUTE,fontWeight:600}}>Total{sendDue>0.005?` · balance ${rupee(sendDue)}`:""}</span><span style={{fontSize:16,fontWeight:800,color:TERRA,fontVariantNumeric:"tabular-nums"}}>{rupee(sendTotal)}</span></div>
                {sendErr&&<div style={{...st.errBanner,marginTop:4,marginBottom:0}}>{sendErr}</div>}
                <div style={{...st.editFoot,marginTop:18}}>
                  <button className="ivh-ghost" style={st.ghostBtn} onClick={()=>setSendTarget(null)} disabled={sendBusy}>Cancel</button>
                  {sendChannel==="email"?<button className="ivh-save" style={st.saveBtn} onClick={sendEmailNow} disabled={sendBusy||!emailTo.trim()}>{sendBusy?<span className="ivh-spin" style={st.spin}/>:<><Icon name="mail" size={15}/> Send email</>}</button>:<button className="ivh-wabtn" style={st.waBtn} onClick={sendWhatsAppNow} disabled={waDigits(waTo).length<10}><Icon name="whatsapp" size={16}/> Open WhatsApp</button>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delTarget && (
        <div style={st.backdrop} onClick={()=>!deleting&&!delDone&&setDelTarget(null)}>
          <div data-modal-scroll className="ivh-modal" style={st.modal} onClick={(e)=>e.stopPropagation()}>
            {delDone?(<SuccessPanel title="Invoice deleted" detail={delTarget.invoiceNo} tone="#b3261e"/>):(
              <>
                <h3 style={st.modalTitle}>Delete invoice {delTarget.invoiceNo}?</h3>
                <p style={st.modalSub}>This removes the saved record for <b>{delTarget.clientName||"—"}</b> ({rupee(delTarget.total)}) and its whole payment history, permanently.</p>
                <label style={{display:"block",marginBottom:4}}><span style={st.fieldLabel}><span style={{display:"inline-flex",verticalAlign:"-2px",marginRight:5,color:MUTE}}><Icon name="lock" size={13}/></span>Security PIN <span style={{fontWeight:500,color:MUTE}}>· required to delete</span></span><input className="ivh-in" style={st.pinInput} type="password" value={delPin} name="aa-delete-pin" autoComplete="one-time-code" inputMode="numeric" data-1p-ignore data-lpignore="true" data-form-type="other" autoFocus onChange={(e)=>setDelPin(e.target.value)} placeholder="••••••" onKeyDown={(e)=>{if(e.key==="Enter"&&delPin.trim()&&!deleting)confirmDelete();}}/></label>
                {delErr&&<div style={{...st.errBanner,marginTop:12,marginBottom:0}}>{delErr}</div>}
                <div style={{...st.modalFoot,marginTop:20}}><button className="ivh-ghost" style={st.ghostBtn} onClick={()=>setDelTarget(null)} disabled={deleting}>Cancel</button><button className="ivh-del-cta" style={st.delCta} onClick={confirmDelete} disabled={deleting||!delPin.trim()}>{deleting?<span className="ivh-spin" style={st.spin}/>:"Delete invoice"}</button></div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .ivh-card{background:${GLOW};border:1px solid ${LINE};box-shadow:${GLOW_SHADOW};}
        .ivh-in{transition:border-color .18s,box-shadow .18s;}.ivh-in:focus{border-color:${TERRA};box-shadow:0 0 0 3px ${TERRA}22;outline:none;}
        .ivh-datesel{transition:border-color .16s;}.ivh-datesel:hover{border-color:${TERRA}55;}.ivh-datesel:focus{outline:none;border-color:${TERRA};box-shadow:0 0 0 3px ${TERRA}22;}
        .ivh-ghost,.ivh-chip,.ivh-icon,.ivh-nolink,.ivh-del-cta,.ivh-save,.ivh-cancelinv,.ivh-seg,.ivh-addline,.ivh-wabtn{transition:all .16s ease;}
        .ivh-ghost:hover:not(:disabled){background:#fffcf9;border-color:${TERRA}55;color:${TERRA};}.ivh-ghost:disabled{opacity:.45;cursor:not-allowed;}
        .ivh-chip:hover:not(:disabled){border-color:${TERRA}55;color:${TERRA};}.ivh-chip:disabled{opacity:.4;cursor:not-allowed;}.ivh-chip.on{background:${TERRA};border-color:${TERRA};color:#fff;}
        .ivh-seg:hover:not(.on){color:${TERRA};}.ivh-addline:hover{border-color:${TERRA}77;color:${TERRA};background:#fffcf9;}
        .ivh-nolink:hover{color:${TERRA};text-decoration:underline;}
        .ivh-icon:not(:disabled):hover{color:${TERRA};background:#fffcf9;}.ivh-icon.ivh-danger:not(:disabled):hover{color:#d33;background:#fdecea;}.ivh-icon.ivh-wa:not(:disabled):hover{color:${WA_DK};background:#edfaf1;}.ivh-icon:disabled{opacity:.4;cursor:not-allowed;}
        .ivh-save{min-width:128px;display:inline-flex;align-items:center;justify-content:center;}.ivh-save:hover:not(:disabled){background:${TERRA_DK};box-shadow:0 10px 22px ${TERRA}40;}.ivh-save:disabled{opacity:.6;cursor:default;}
        .ivh-wabtn:hover:not(:disabled){background:${WA_DK};box-shadow:0 10px 22px ${WA}45;}.ivh-wabtn:disabled{opacity:.6;cursor:default;}
        .ivh-del-cta{min-width:128px;display:inline-flex;align-items:center;justify-content:center;}.ivh-del-cta:hover:not(:disabled){background:#b3271a;}.ivh-del-cta:disabled{opacity:.6;cursor:default;}
        .ivh-cancelinv:hover:not(:disabled){color:#d33;border-color:#e7a9a2;background:#fdecea;}.ivh-cancelinv:disabled{opacity:.5;cursor:default;}
        .ivh-tr:hover td{background:#fafbfc;}.ivh-dim{opacity:.55;pointer-events:none;transition:opacity .15s;}
        .ivh-vtab{transition:all .2s;}.ivh-vtab.on{background:${TERRA};color:#fff;}.ivh-vtab:hover:not(.on){color:${TERRA};background:#fffcf9;}
        .ivh-custrow:hover td{background:#fff6ee !important;}
        .ivh-skel{background:linear-gradient(90deg,#f1ece6 25%,#f7f3ee 37%,#f1ece6 63%);background-size:400% 100%;animation:ivhShimmer 1.3s ease infinite;}
        @keyframes ivhShimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
        .ivh-modal{animation:ivhPop .22s cubic-bezier(.2,.9,.3,1.2) both;}@keyframes ivhPop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}
        .ivh-spin{width:17px;height:17px;border-radius:50%;border:2.5px solid rgba(255,255,255,.5);border-top-color:#fff;animation:ivhSpin .6s linear infinite;}@keyframes ivhSpin{to{transform:rotate(360deg)}}
        .ivh-success{animation:ivhFade .25s ease both;}@keyframes ivhFade{from{opacity:0}to{opacity:1}}
        .ivh-successring{animation:ivhRingPop .45s cubic-bezier(.18,.9,.3,1.35) both;}@keyframes ivhRingPop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
        .ivh-checkcircle{stroke-dasharray:150;stroke-dashoffset:150;animation:ivhDraw .5s ease .06s forwards;}
        .ivh-checkmark{stroke-dasharray:40;stroke-dashoffset:40;animation:ivhDraw .35s ease .42s forwards;}@keyframes ivhDraw{to{stroke-dashoffset:0}}
        .ivh-successtitle{animation:ivhRise .3s ease .38s both;}.ivh-successsub{animation:ivhRise .3s ease .46s both;}@keyframes ivhRise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @media(prefers-reduced-motion:reduce){.ivh-in,.ivh-datesel,.ivh-ghost,.ivh-chip,.ivh-icon,.ivh-nolink,.ivh-del-cta,.ivh-save,.ivh-cancelinv,.ivh-seg,.ivh-addline,.ivh-wabtn,.ivh-skel,.ivh-modal,.ivh-spin,.ivh-success,.ivh-successring,.ivh-checkcircle,.ivh-checkmark,.ivh-successtitle,.ivh-successsub{animation:none !important;transition:none !important;}.ivh-checkcircle,.ivh-checkmark{stroke-dashoffset:0 !important;}}
      `}</style>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  viewToggle: { display: "flex", gap: 0, marginBottom: 16, border: "1px solid #f0e6dc", width: "fit-content", borderRadius: 0, overflow: "hidden" },
  vtab: { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", border: "none", background: "#fff", color: "#8a8f9a", fontFamily: "'DM Sans',system-ui,sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" },
  backdrop: { position: "fixed" as const, inset: 0, background: "rgba(24,22,28,.5)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box" as const },
  drawer: { width: "min(640px, 100%)", maxHeight: "calc(100vh - 40px)", background: "#fffdfb", boxShadow: "0 30px 80px rgba(24,22,28,.34)", display: "flex", flexDirection: "column" as const, overflowY: "auto" as const, overscrollBehavior: "contain" as const, padding: "14px 14px", borderRadius: 0 },
  drawerHead: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  drawerName: { fontSize: 17, fontWeight: 800, margin: 0, color: "#1f2430", letterSpacing: -0.3, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  drawerPhone: { display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#8a8f9a", marginTop: 5 },
  drawerClose: { width: 36, height: 36, border: "1px solid #e6dcd2", background: "#fff", color: "#545a67", fontSize: 22, lineHeight: 1, cursor: "pointer", flexShrink: 0, borderRadius: 0 },
  drawerStats: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 },
  drawerStat: { background: "linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)", border: "1px solid #f0e0d0", padding: "10px 11px" },
  drawerStatLbl: { fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 5 },
  drawerStatVal: { fontSize: 15.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" as const },
  drawerListLbl: { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" as const, color: "#9ca3af", marginBottom: 8 },
  drawerList: { display: "flex", flexDirection: "column" as const, gap: 6 },
  stmtRow: { display: "grid", gridTemplateColumns: "1fr auto", gap: "3px 12px", alignItems: "start", padding: "9px 11px", background: "#fff", border: "1px solid #f0e6dc" },
  stmtLeft: { display: "flex", flexDirection: "column" as const, gap: 3, minWidth: 0 },
  stmtLeftRow: { display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexWrap: "wrap" as const },
  stmtMeta: { gridColumn: "1 / -1", fontSize: 11.5, color: "#6b7280", lineHeight: 1.45, wordBreak: "break-word" as const, marginTop: 1 },
  stmtNo: { border: "none", background: "transparent", padding: 0, fontFamily: "'DM Sans',system-ui,sans-serif", fontWeight: 800, fontSize: 13.5, color: "#c56a3a", cursor: "pointer", textAlign: "left" as const },
  stmtDate: { fontSize: 11.5, color: "#8a8f9a" },
  stmtBadge: { fontSize: 10, fontWeight: 700, padding: "2px 7px", width: "fit-content", textTransform: "uppercase" as const, letterSpacing: 0.3 },
  stmtItems: { gridColumn: "1 / -1", fontSize: 12.5, color: "#4b5563", lineHeight: 1.5, wordBreak: "break-word" as const },
  stmtRight: { textAlign: "right" as const, whiteSpace: "nowrap" as const },
  stmtTotal: { fontSize: 14, fontWeight: 800, color: "#1f2430", fontVariantNumeric: "tabular-nums" as const },
  stmtActions: { gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 2 },
  iconLbl: { fontSize: 11.5, fontWeight: 600 },
  stmtBtn: { display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", border: "1px solid #e6dcd2", background: "#fff", color: "#545a67", cursor: "pointer", borderRadius: 0, fontFamily: "inherit" },
  stmtCta: { width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 14px", marginBottom: 14, border: "none", background: TERRA, color: "#fff", fontFamily: SANS, fontWeight: 700, fontSize: 13.5, cursor: "pointer", borderRadius: 0 },
  drawerSearchWrap: { position: "relative" as const, flex: 1, minWidth: 120 },
  drawerSearchIcon: { position: "absolute" as const, left: 11, top: "50%", transform: "translateY(-50%)", color: MUTE, display: "inline-flex", pointerEvents: "none" as const },
  drawerSearch: { width: "100%", boxSizing: "border-box" as const, padding: "8px 30px 8px 32px", border: "1px solid #e6dcd2", borderRadius: 0, fontSize: 13, fontFamily: SANS, background: "#fff", color: INK },
  drawerSearchClear: { position: "absolute" as const, right: 8, top: "50%", transform: "translateY(-50%)", width: 22, height: 22, border: "none", background: "transparent", color: MUTE, fontSize: 18, lineHeight: 1, cursor: "pointer", borderRadius: 0 },
  paidSection: { marginBottom: 10, border: "1px solid #cfe8d8", background: "#f6fbf7" },
  paidHead: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", border: "none", background: "transparent", color: GREEN, fontFamily: SANS, fontWeight: 700, fontSize: 12.5, cursor: "pointer", letterSpacing: 0.3 },
  paidList: { display: "flex", flexDirection: "column" as const, gap: 6, padding: "0 8px 8px" },
  rowStmtBtn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", border: `1px solid ${TERRA}`, background: "#fff", color: TERRA, fontFamily: SANS, fontWeight: 700, fontSize: 12, cursor: "pointer", borderRadius: 0, whiteSpace: "nowrap" as const },
  stmtModal: { width: "min(760px, 100%)", maxHeight: "calc(100vh - 40px)", background: "#fffdfb", boxShadow: "0 30px 80px rgba(24,22,28,.34)", display: "flex", flexDirection: "column" as const, overflow: "hidden" as const, padding: "18px 20px" },
  stmtFilters: { display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" as const, marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${LINE}` },
  stmtFLabel: { display: "flex", flexDirection: "column" as const, gap: 4, fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" as const, color: MUTE },
  stmtDateInput: { padding: "7px 10px", border: "1px solid #e6dcd2", borderRadius: 0, fontSize: 13, fontFamily: SANS, background: "#fff", color: INK, colorScheme: "light" as const },
  stmtSel: { padding: "7px 10px", border: `1px solid ${LINE}`, borderRadius: 0, background: CARD, color: BODY, fontFamily: SANS, fontWeight: 700, fontSize: 13, cursor: "pointer", colorScheme: "light" as const },
  stmtClear: { padding: "8px 12px", border: `1px solid ${LINE}`, background: CARD, color: BODY, fontFamily: SANS, fontWeight: 700, fontSize: 12.5, cursor: "pointer", borderRadius: 0 },
  stmtDownload: { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", border: "none", background: GREEN, color: "#fff", fontFamily: SANS, fontWeight: 700, fontSize: 13, cursor: "pointer", borderRadius: 0, whiteSpace: "nowrap" as const },
  stmtTableWrap: { overflowX: "auto" as const, overflowY: "auto" as const, overscrollBehavior: "contain" as const, maxHeight: "calc(100vh - 300px)", border: `1px solid ${LINE}` },
  stmtTable: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13, minWidth: 560 },
  stmtTh: { textAlign: "left" as const, padding: "10px 12px", fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase" as const, color: "#fff", background: TERRA, fontWeight: 700, whiteSpace: "nowrap" as const },
  stmtTd: { padding: "10px 12px", borderBottom: "1px solid #f4f1ec", color: "#2a2f3a", verticalAlign: "top" as const },
  stmtTf: { padding: "12px", background: "#faf6f1", fontWeight: 800, fontSize: 13.5, borderTop: `1.5px solid ${LINE}`, color: INK },
  stmtSummary: { display: "flex", gap: 18, justifyContent: "flex-end", flexWrap: "wrap" as const, marginTop: 14, fontSize: 13, color: BODY },
  page:{fontFamily:SANS,color:INK,minWidth:0,maxWidth:"100%"},
  head:{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:20,flexWrap:"wrap",marginBottom:16},
  headActions:{display:"flex",gap:10,flexWrap:"wrap"},
  ghostBtn:{display:"inline-flex",alignItems:"center",gap:7,padding:"10px 16px",borderRadius:0,border:`1px solid ${LINE}`,background:CARD,color:INK,fontFamily:SANS,fontWeight:700,fontSize:13.5,cursor:"pointer"},
  saveBtn:{padding:"10px 18px",borderRadius:0,border:"none",background:TERRA,color:"#fff",fontFamily:SANS,fontWeight:800,fontSize:13.5,cursor:"pointer",gap:7},
  waBtn:{padding:"10px 18px",borderRadius:0,border:"none",background:WA,color:"#fff",fontFamily:SANS,fontWeight:800,fontSize:13.5,cursor:"pointer",minWidth:128,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7},
  statsHead:{marginBottom:8},statsPeriod:{fontSize:12.5,color:MUTE,fontWeight:600,textTransform:"capitalize"},
  stats:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(158px, 1fr))",gap:14,marginBottom:18},
  statcard:{borderRadius:0,padding:"16px 18px",minWidth:0},
  statnum:{fontSize:22,fontWeight:800,lineHeight:1.1,fontVariantNumeric:"tabular-nums",overflowWrap:"anywhere"},
  statlbl:{fontSize:12,color:MUTE,marginTop:7,fontWeight:600,display:"flex",alignItems:"center",gap:5},
  statIcon:{display:"inline-flex",color:FAINT},
  toolbar:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:14},
  filters:{display:"flex",gap:8,flexWrap:"wrap"},
  toolbarRight:{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"},
  dateSel:{padding:"9px 12px",border:`1px solid ${LINE}`,borderRadius:0,background:CARD,color:BODY,fontFamily:SANS,fontWeight:700,fontSize:13,cursor:"pointer",colorScheme:"light"},
  chip:{padding:"8px 15px",borderRadius:0,border:`1px solid ${LINE}`,background:CARD,color:BODY,fontFamily:SANS,fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"},
  searchWrap:{position:"relative",flex:"1 1 200px",maxWidth:340,minWidth:180},
  searchIcon:{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:FAINT,display:"inline-flex",pointerEvents:"none"},
  search:{width:"100%",boxSizing:"border-box",padding:"10px 12px 10px 36px",border:"1px solid #e6dcd2",borderRadius:0,fontSize:14,fontFamily:SANS,background:"#fff",color:INK},
  errBanner:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"11px 14px",fontSize:13,color:"#8a2f16",background:"#fdecea",border:"1px solid #f3cfc2",lineHeight:1.5},
  tableCard:{borderRadius:0,overflow:"hidden"},tableWrap:{overflowX:"auto"},
  table:{width:"100%",borderCollapse:"collapse",fontSize:14,minWidth:1060},
  th:{textAlign:"left",padding:"13px 18px",fontSize:10.5,letterSpacing:0.7,textTransform:"uppercase",color:MUTE,background:SOFT,borderBottom:`1px solid ${LINE_COOL}`,fontWeight:700,whiteSpace:"nowrap"},
  td:{padding:"14px 18px",borderBottom:"1px solid #f4f1ec",color:"#2a2f3a",verticalAlign:"top"},
  clientMeta:{display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap"},
  srcPill:{display:"inline-flex",alignItems:"center",border:"1px solid",borderRadius:0,padding:"2px 7px",fontSize:10,fontWeight:700,letterSpacing:0.4,textTransform:"uppercase",whiteSpace:"nowrap"},
  methPill:{display:"inline-flex",alignItems:"center",gap:4,border:"1px solid",borderRadius:0,padding:"2px 7px 2px 6px",fontSize:10,fontWeight:700,letterSpacing:0.3,textTransform:"uppercase",whiteSpace:"nowrap"},
  subline:{fontSize:12,color:MUTE},dueSub:{fontSize:11.5,color:MUTE,marginTop:3,fontVariantNumeric:"tabular-nums"},
  noBtn:{border:"none",background:"transparent",padding:0,color:INK,fontFamily:SANS,fontWeight:700,fontSize:14,cursor:"pointer",fontVariantNumeric:"tabular-nums"},
  badge:{display:"inline-flex",alignItems:"center",border:"1px solid",borderRadius:0,padding:"5px 11px",fontSize:12,fontWeight:800,whiteSpace:"nowrap",letterSpacing:0.2},
  iconBtn:{width:32,height:32,display:"inline-grid",placeItems:"center",border:"none",background:"transparent",color:MUTE,cursor:"pointer",borderRadius:0,marginLeft:2},
  skelWrap:{padding:"14px 18px"},skelRow:{height:40,marginBottom:10,borderRadius:0},
  empty:{textAlign:"center",padding:"48px 24px",color:MUTE,fontSize:14},
  backdrop:{position:"fixed",inset:0,background:"rgba(24,22,28,.5)",backdropFilter:"blur(3px)",WebkitBackdropFilter:"blur(3px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,boxSizing:"border-box"},
  modal:{width:"100%",maxWidth:440,maxHeight:"calc(100vh - 40px)",overflowY:"auto",overscrollBehavior:"contain",background:"#fffdfb",border:`1px solid ${LINE}`,boxShadow:"0 30px 80px rgba(24,22,28,.34)",padding:"18px 20px",boxSizing:"border-box"},
  editModal:{width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto",overscrollBehavior:"contain",background:"#fffdfb",border:`1px solid ${LINE}`,boxShadow:"0 30px 80px rgba(24,22,28,.34)",padding:24,boxSizing:"border-box"},
  modalTitle:{fontSize:17,fontWeight:800,margin:"0 0 6px",color:INK,letterSpacing:-0.2},
  modalSub:{fontSize:13.5,color:BODY,lineHeight:1.6,margin:"0 0 20px"},
  modalFoot:{display:"flex",justifyContent:"flex-end",gap:10,flexWrap:"wrap"},
  delCta:{padding:"11px 20px",borderRadius:0,border:"none",background:"#d33",color:"#fff",fontFamily:SANS,fontWeight:800,fontSize:14,cursor:"pointer"},
  editSubhelp:{fontSize:12.5,color:MUTE,margin:"0 0 2px",lineHeight:1.5},
  editField:{display:"block",minWidth:0},formGrid:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,marginTop:4},
  sectionTitle:{fontSize:11,fontWeight:800,letterSpacing:0.8,textTransform:"uppercase",color:FAINT,margin:"20px 0 8px"},
  editInput:{width:"100%",boxSizing:"border-box",padding:"9px 11px",border:"1px solid #e6dcd2",borderRadius:0,fontSize:14,fontFamily:SANS,background:"#fff",color:INK,colorScheme:"light"},
  editTextarea:{width:"100%",boxSizing:"border-box",padding:"9px 11px",border:"1px solid #e6dcd2",borderRadius:0,fontSize:14,fontFamily:SANS,background:"#fff",color:INK,colorScheme:"light",minHeight:62,resize:"vertical",lineHeight:1.5},
  segWrap:{display:"inline-flex",border:`1px solid ${LINE}`,background:CARD},
  segBtn:{padding:"9px 18px",border:"none",background:"transparent",color:BODY,fontFamily:SANS,fontWeight:700,fontSize:13,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6},
  segBtnOn:{background:TERRA,color:"#fff"},segBtnWa:{background:WA,color:"#fff"},
  linesHead:{display:"grid",gridTemplateColumns:"1fr 62px 92px 96px 30px",gap:8,padding:"0 2px 6px",fontSize:10.5,fontWeight:700,letterSpacing:0.4,textTransform:"uppercase",color:FAINT},
  lineRow:{display:"grid",gridTemplateColumns:"1fr 62px 92px 96px 30px",gap:8,alignItems:"center",marginBottom:8},
  lineNumInput:{width:"100%",boxSizing:"border-box",padding:"9px 8px",border:"1px solid #e6dcd2",borderRadius:0,fontSize:14,fontFamily:SANS,background:"#fff",color:INK,colorScheme:"light",textAlign:"right",fontVariantNumeric:"tabular-nums"},
  lineAmt:{display:"flex",alignItems:"center",justifyContent:"flex-end",fontSize:13.5,fontWeight:700,color:INK,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap",overflow:"hidden"},
  lineRemoveBtn:{width:28,height:28,display:"inline-grid",placeItems:"center",border:"none",background:"transparent",color:FAINT,cursor:"pointer",borderRadius:0},
  addLineBtn:{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",border:"1px dashed #d9cdbf",borderRadius:0,background:"transparent",color:BODY,fontFamily:SANS,fontWeight:700,fontSize:13,cursor:"pointer",marginTop:2},
  discRow:{display:"flex",gap:8},
  discSelect:{width:74,padding:"9px 10px",border:`1px solid ${LINE}`,borderRadius:0,background:CARD,color:BODY,fontFamily:SANS,fontWeight:700,fontSize:14,cursor:"pointer",colorScheme:"light"},
  discInput:{width:"100%",boxSizing:"border-box",padding:"9px 11px",border:"1px solid #e6dcd2",borderRadius:0,fontSize:14,fontFamily:SANS,background:"#fff",color:INK,colorScheme:"light",textAlign:"right",fontVariantNumeric:"tabular-nums"},
  editTotals:{marginTop:18,padding:"14px 16px",background:"#fbf7f3",border:`1px solid ${LINE}`},
  editTotRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",fontSize:13.5},
  editTotLbl:{color:MUTE,fontWeight:600},editTotVal:{fontWeight:700,color:INK,fontVariantNumeric:"tabular-nums"},
  editGrandRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0 2px",marginTop:4,borderTop:`1px solid ${LINE}`,fontSize:16},
  editGrandVal:{fontWeight:800,color:TERRA,fontVariantNumeric:"tabular-nums"},
  editFoot:{display:"flex",justifyContent:"flex-end",gap:10,marginTop:22,flexWrap:"wrap"},
  sendNote:{padding:"11px 14px",background:"#fffcf9",border:`1px solid ${LINE}`,fontSize:12.5,color:BODY,lineHeight:1.55,margin:"12px 0"},
  sendNoteWa:{padding:"11px 14px",background:"#effaf3",border:"1px solid #cfead9",fontSize:12.5,color:"#2f6a45",lineHeight:1.55,margin:"12px 0"},
  sendSummary:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",margin:"14px 0 2px",background:"#fbf7f3",border:`1px solid ${LINE}`},
  payHead:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:4},
  paySub:{fontSize:12.5,color:MUTE,margin:"0 0 2px",fontWeight:600},
  fieldLabel:{display:"block",fontSize:12.5,fontWeight:700,color:BODY,marginBottom:4,marginTop:4},
  paySummary:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,padding:"10px 13px",margin:"4px 0 10px",background:"#fbf7f3",border:`1px solid ${LINE}`},
  paySumLbl:{fontSize:10.5,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:MUTE,whiteSpace:"nowrap"},
  paySumTotal:{fontSize:16,fontWeight:800,color:INK,marginTop:3,fontVariantNumeric:"tabular-nums"},
  paySumMid:{fontSize:16,fontWeight:800,color:GREEN,marginTop:3,fontVariantNumeric:"tabular-nums"},
  paySumDue:{fontSize:16,fontWeight:800,marginTop:3,fontVariantNumeric:"tabular-nums"},
  payHistWrap:{marginBottom:10,border:`1px solid ${LINE}`,background:"#fffdfb"},
  payHistHead:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 12px",borderBottom:`1px solid ${LINE}`,fontSize:11,fontWeight:800,letterSpacing:0.6,textTransform:"uppercase",color:FAINT},
  payHistList:{maxHeight:120,overflowY:"auto",overscrollBehavior:"contain"},
  payHistRow:{display:"flex",alignItems:"center",gap:9,padding:"7px 12px",borderBottom:"1px solid #f4f1ec",fontSize:13},
  payHistDate:{color:MUTE,fontSize:12,minWidth:92,whiteSpace:"nowrap"},
  payHistMeth:{display:"inline-flex",alignItems:"center",gap:4,border:"1px solid",borderRadius:0,padding:"2px 7px 2px 6px",fontSize:10,fontWeight:700,letterSpacing:0.3,textTransform:"uppercase",whiteSpace:"nowrap"},
  payHistNote:{fontSize:11.5,color:MUTE,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120},
  payHistRight:{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,flexShrink:0},
  payHistAmt:{fontWeight:800,color:INK,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"},
  payHistDelBtn:{width:26,height:26,display:"inline-grid",placeItems:"center",border:"none",background:"transparent",color:FAINT,cursor:"pointer",borderRadius:0},
  payConfirmWrap:{display:"inline-flex",alignItems:"center",gap:6},
  histConfirmYes:{border:"none",background:"#fdecea",color:"#b3261e",fontFamily:SANS,fontWeight:800,fontSize:11,padding:"5px 10px",cursor:"pointer",borderRadius:0},
  histConfirmNo:{border:`1px solid ${LINE}`,background:CARD,color:BODY,fontFamily:SANS,fontWeight:700,fontSize:11,padding:"5px 10px",cursor:"pointer",borderRadius:0},
  payHistEmpty:{padding:"16px 14px",textAlign:"center",color:MUTE,fontSize:12.5},
  payFlash:{marginBottom:12,padding:"9px 13px",background:"#e8f6ee",border:"1px solid #bfe3cd",color:"#15733f",fontSize:12.5,fontWeight:700},
  payFullyNote:{marginTop:4,padding:"11px 14px",background:"#e8f6ee",border:"1px solid #bfe3cd",color:"#15733f",fontSize:12.5,fontWeight:600,lineHeight:1.5},
  payInput:{width:"100%",boxSizing:"border-box",padding:"9px 13px",border:"1px solid #e6dcd2",borderRadius:0,fontSize:16,fontWeight:700,fontFamily:SANS,background:"#fff",color:INK,colorScheme:"light",fontVariantNumeric:"tabular-nums"},
  pinInput:{width:"100%",boxSizing:"border-box",padding:"9px 13px",border:"1px solid #e6dcd2",borderRadius:0,fontSize:15,fontWeight:700,letterSpacing:3,fontFamily:SANS,background:"#fff",color:INK,colorScheme:"light"},
  payQuick:{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"},
  payAfter:{marginTop:10,padding:"8px 13px",background:"#fffcf9",border:`1px solid ${LINE}`,fontSize:12.5,color:BODY,lineHeight:1.5,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"},
  payFoot:{display:"flex",alignItems:"center",gap:10,marginTop:16,flexWrap:"wrap"},
  payCancelledNote:{fontSize:12.5,fontWeight:700,color:MUTE},
  cancelInvBtn:{padding:"10px 14px",borderRadius:0,border:`1px solid ${LINE}`,background:CARD,color:BODY,fontFamily:SANS,fontWeight:700,fontSize:13,cursor:"pointer"},
  spin:{},
  success:{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"26px 8px 30px"},
  successRing:{width:84,height:84,borderRadius:"50%",border:"1px solid",display:"grid",placeItems:"center",marginBottom:16},
  successTitle:{fontSize:19,fontWeight:800,letterSpacing:-0.2},
  successSub:{fontSize:13,color:MUTE,marginTop:6,fontWeight:600,fontVariantNumeric:"tabular-nums"},
};