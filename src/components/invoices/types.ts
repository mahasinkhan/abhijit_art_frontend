// src/components/invoices/types.ts
// ── Shared types, constants, and pure helpers ─────────────────────────────

// ── Design tokens (match rest of app) ────────────────────────────────────
export const INK      = "#1f2430";
export const BODY     = "#545a67";
export const MUTE     = "#8a8f9a";
export const FAINT    = "#b6bac3";
export const LINE     = "#f0e6dc";
export const LINE_COOL= "#ececf1";
export const SOFT     = "#fafbfc";
export const CARD     = "#ffffff";
export const TERRA    = "#d9542f";
export const TERRA_DK = "#c8481f";
export const GREEN    = "#15733f";
export const WA       = "#1fa855";
export const WA_DK    = "#178544";
export const SANS     = "'DM Sans', system-ui, sans-serif";
export const GLOW     = "radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.075) 0%, rgba(217,84,47,.022) 42%, rgba(217,84,47,0) 72%), linear-gradient(180deg, #fffcf9 0%, #ffffff 60%)";
export const GLOW_SHADOW = "0 1px 2px rgba(17,20,30,.04), 0 10px 26px -18px rgba(217,84,47,.28)";
export const REQ_TIMEOUT = 15000;

// ── Domain types ──────────────────────────────────────────────────────────
export type Period    = "all" | "today" | "week" | "month" | "quarter" | "half" | "year";
export type InvStatus = "unpaid" | "partial" | "paid" | "cancelled";
export type InvSource = "online" | "offline";
export type InvMethod = "cash" | "online";

export type StoredItem = { desc: string; qty: number; rate: number };
export type Business   = { name?: string; address?: string; phone?: string; email?: string; gstin?: string; pan?: string };
export type Payment    = { id: string; amount: string; method: InvMethod; note: string | null; createdAt: string };

export type Invoice = {
  id: string; invoiceNo: string; date: string;
  clientName: string; clientPhone: string | null; clientEmail: string | null;
  clientGstin: string | null; clientAddr: string | null;
  source: InvSource; business: Business;
  items: StoredItem[];
  discType: "amount" | "percent"; discVal: string; taxPct: string;
  subtotal: string; discountAmt: string; taxAmt: string; total: string;
  paidAmount: string; payments: Payment[]; notes: string | null;
  warranty: string | null; status: InvStatus;
  createdAt: string; updatedAt: string; pdfUrl?: string | null;
};

export type EditItem = { desc: string; qty: string; rate: string };
export type EditForm  = {
  date: string; clientName: string; clientPhone: string; clientEmail: string;
  clientGstin: string; clientAddr: string; source: InvSource;
  items: EditItem[]; discType: "amount" | "percent";
  discVal: string; taxPct: string; notes: string; warranty: string;
};

export type CustomerRow = {
  key: string; name: string; phone: string | null; email: string | null;
  invoices: Invoice[]; billed: number; paid: number; due: number; lastDate: string;
};

// ── Status / source / method meta ─────────────────────────────────────────
export const STATUS_META: Record<InvStatus, { label: string; fg: string; bg: string; bd: string; dot: string }> = {
  unpaid:    { label: "Unpaid",    fg: "#9a6a12", bg: "#fbf3e3", bd: "#efdcb2", dot: "#e0a83e" },
  partial:   { label: "Partial",   fg: "#1d5fd8", bg: "#eaf0fc", bd: "#cbdbf6", dot: "#3b74e0" },
  paid:      { label: "Paid",      fg: "#15733f", bg: "#e8f6ee", bd: "#bfe3cd", dot: "#28a35f" },
  cancelled: { label: "Cancelled", fg: "#6b7280", bg: "#f1f2f5", bd: "#e4e5ea", dot: "#9aa0ab" },
};
export const STATUSES: InvStatus[] = ["unpaid", "partial", "paid", "cancelled"];

export const SOURCE_META: Record<InvSource, { label: string; fg: string; bg: string; bd: string }> = {
  online:  { label: "Online",  fg: "#3a6ea5", bg: "#eef4fb", bd: "#d5e4f4" },
  offline: { label: "Walk-in", fg: "#9a6a3a", bg: "#f7efe6", bd: "#ecdcc9" },
};

export const METHOD_META: Record<InvMethod, { label: string; fg: string; bg: string; bd: string; icon: string }> = {
  cash:   { label: "Cash",   fg: "#4a7a52", bg: "#eef5ef", bd: "#cfe3d2", icon: "banknote" },
  online: { label: "Online", fg: "#5b52a3", bg: "#efeefb", bd: "#dcd8f2", icon: "card"    },
};
export const MIXED_META = { label: "Mixed", fg: "#6b6f7a", bg: "#f1f2f4", bd: "#e0e2e7", icon: "coins" };

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "all",     label: "All time"    },
  { value: "today",   label: "Daily"       },
  { value: "week",    label: "Weekly"      },
  { value: "month",   label: "Monthly"     },
  { value: "quarter", label: "Quarterly"   },
  { value: "half",    label: "Half-yearly" },
  { value: "year",    label: "Yearly"      },
];
export const PERIOD_LABEL: Record<Period, string> = {
  all: "all time", today: "today", week: "this week",
  month: "this month", quarter: "this quarter",
  half: "this half-year", year: "this year",
};

export const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Pure helpers ──────────────────────────────────────────────────────────
export const num    = (v: any): number => { const n = parseFloat(String(v)); return Number.isFinite(n) ? n : 0; };
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const rupee  = (v: any) => "₹" + num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmt = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
export const fmtTime = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
};
export const toDateInput = (d: string) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const escapeHtml  = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
export const csvCell     = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;
export const waDigits    = (raw: string) => { let d = String(raw || "").replace(/\D/g, "").replace(/^0+/, ""); if (d.length === 10) d = "91" + d; return d; };
export const errMessage  = (e: any, fallback: string) => { if (e?.code === "ECONNABORTED") return "The server didn't respond in time."; if (e?.message === "Network Error") return "Couldn't reach the server."; return e?.response?.data?.message || fallback; };

export const deriveStatus = (paid: number, total: number): InvStatus => {
  if (paid <= 0.005) return "unpaid";
  if (paid + 0.005 >= total) return "paid";
  return "partial";
};

export const calcTotals = (items: { qty: any; rate: any }[], discType: "amount" | "percent", discVal: any, taxPct: any) => {
  const subtotal    = items.reduce((s, it) => s + num(it.qty) * num(it.rate), 0);
  const dv          = num(discVal);
  const discountAmt = discType === "percent" ? (subtotal * dv) / 100 : Math.min(dv, subtotal);
  const taxable     = Math.max(subtotal - discountAmt, 0);
  const taxAmt      = (taxable * num(taxPct)) / 100;
  return { subtotal: round2(subtotal), discountAmt: round2(discountAmt), taxAmt: round2(taxAmt), total: round2(taxable + taxAmt) };
};

export const effectivePaid = (inv: Invoice): number => {
  const total = num(inv.total);
  if (inv.status === "paid")    return round2(total);
  if (inv.status === "unpaid")  return 0;
  return round2(Math.min(Math.max(num(inv.paidAmount), 0), total));
};

export const srcMeta    = (s: any) => SOURCE_META[(s as InvSource) === "online" ? "online" : "offline"];
export const methMeta   = (m: any) => METHOD_META[(m as InvMethod) === "online" ? "online" : "cash"];
export const badgeStyle = (s: InvStatus): React.CSSProperties => ({ color: STATUS_META[s].fg, background: STATUS_META[s].bg, borderColor: STATUS_META[s].bd });

export const methodSummary = (inv: Invoice) => {
  const ps = Array.isArray(inv.payments) ? inv.payments : [];
  if (!ps.length) return null;
  const set = new Set(ps.map((p) => (p.method === "online" ? "online" : "cash")));
  if (set.size > 1) return MIXED_META;
  return set.has("online") ? METHOD_META.online : METHOD_META.cash;
};

export const periodSince = (p: Period): Date | null => {
  if (p === "all") return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (p) {
    case "today":   return startOfToday;
    case "week":    { const dow = (startOfToday.getDay() + 6) % 7; return new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - dow); }
    case "month":   return new Date(now.getFullYear(), now.getMonth(), 1);
    case "quarter": return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case "half":    return new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
    case "year":    return new Date(now.getFullYear(), 0, 1);
    default:        return null;
  }
};

// ── Shared style atoms ────────────────────────────────────────────────────
export const sharedSt = {
  badge:    { display:"inline-flex", alignItems:"center", border:"1px solid", borderRadius:0, padding:"5px 11px", fontSize:12, fontWeight:800, whiteSpace:"nowrap", letterSpacing:0.2 } as React.CSSProperties,
  iconBtn:  { width:32, height:32, display:"inline-grid", placeItems:"center", border:"none", background:"transparent", color:MUTE, cursor:"pointer", borderRadius:0, marginLeft:2 } as React.CSSProperties,
  ghostBtn: { display:"inline-flex", alignItems:"center", gap:7, padding:"10px 16px", borderRadius:0, border:`1px solid ${LINE}`, background:CARD, color:INK, fontFamily:SANS, fontWeight:700, fontSize:13.5, cursor:"pointer" } as React.CSSProperties,
  saveBtn:  { padding:"10px 18px", borderRadius:0, border:"none", background:TERRA, color:"#fff", fontFamily:SANS, fontWeight:800, fontSize:13.5, cursor:"pointer", gap:7 } as React.CSSProperties,
  pinInput: { width:"100%", boxSizing:"border-box" as const, padding:"9px 13px", border:"1px solid #e6dcd2", borderRadius:0, fontSize:15, fontWeight:700, letterSpacing:3, fontFamily:SANS, background:"#fff", color:INK, colorScheme:"light" as const },
  editInput:{ width:"100%", boxSizing:"border-box" as const, padding:"9px 11px", border:"1px solid #e6dcd2", borderRadius:0, fontSize:14, fontFamily:SANS, background:"#fff", color:INK, colorScheme:"light" as const },
  fieldLabel:{ display:"block", fontSize:12.5, fontWeight:700, color:BODY, marginBottom:4, marginTop:4 } as React.CSSProperties,
  backdrop: { position:"fixed" as const, inset:0, background:"rgba(24,22,28,.5)", backdropFilter:"blur(3px)", WebkitBackdropFilter:"blur(3px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20, boxSizing:"border-box" as const },
  errBanner:{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, padding:"11px 14px", fontSize:13, color:"#8a2f16", background:"#fdecea", border:"1px solid #f3cfc2", lineHeight:1.5 } as React.CSSProperties,
  modal:    { width:"100%", maxWidth:440, maxHeight:"calc(100vh - 40px)", overflowY:"auto" as const, overscrollBehavior:"contain" as const, background:"#fffdfb", border:`1px solid ${LINE}`, boxShadow:"0 30px 80px rgba(24,22,28,.34)", padding:"18px 20px", boxSizing:"border-box" as const },
  editModal:{ width:"100%", maxWidth:640, maxHeight:"90vh", overflowY:"auto" as const, overscrollBehavior:"contain" as const, background:"#fffdfb", border:`1px solid ${LINE}`, boxShadow:"0 30px 80px rgba(24,22,28,.34)", padding:24, boxSizing:"border-box" as const },
  modalTitle:{ fontSize:17, fontWeight:800, margin:"0 0 6px", color:INK, letterSpacing:-0.2 } as React.CSSProperties,
  segWrap:  { display:"inline-flex", border:`1px solid ${LINE}`, background:CARD } as React.CSSProperties,
  segBtn:   { padding:"9px 18px", border:"none", background:"transparent", color:BODY, fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 } as React.CSSProperties,
  segBtnOn: { background:TERRA, color:"#fff" } as React.CSSProperties,
  spin:     {} as React.CSSProperties,
  success:  { display:"flex", flexDirection:"column" as const, alignItems:"center", textAlign:"center" as const, padding:"26px 8px 30px" },
  successRing: { width:84, height:84, borderRadius:"50%", border:"1px solid", display:"grid", placeItems:"center", marginBottom:16 } as React.CSSProperties,
  successTitle:{ fontSize:19, fontWeight:800, letterSpacing:-0.2 } as React.CSSProperties,
  successSub:  { fontSize:13, color:MUTE, marginTop:6, fontWeight:600, fontVariantNumeric:"tabular-nums" as const },
};

// ── Global CSS string (inject once in index.tsx) ──────────────────────────
export const GLOBAL_CSS = `
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
`;