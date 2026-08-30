// src/components/billing/types.ts

// ── Design tokens ─────────────────────────────────────────────────────────────
export const INK      = "#1f2430";
export const BODY     = "#545a67";
export const MUTE     = "#8a8f9a";
export const FAINT    = "#b6bac3";
export const LINE     = "#f0e6dc";
export const IVORY    = "#fafbfc";
export const CARD     = "#ffffff";
export const TERRA    = "#d9542f";
export const TERRA_DK = "#c8481f";
export const GREEN    = "#15733f";
export const GREEN_LT = "#e8f6ee";
export const WA       = "#1fa855";
export const WA_DK    = "#178544";
export const GOLD     = "#c2974a";
export const SANS     = "'DM Sans', system-ui, sans-serif";
export const GLOW     = "radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.075) 0%, rgba(217,84,47,.022) 42%, rgba(217,84,47,0) 72%), linear-gradient(180deg, #fffcf9 0%, #ffffff 60%)";
export const GLOW_SHADOW = "0 1px 2px rgba(17,20,30,.04), 0 10px 26px -18px rgba(217,84,47,.28)";

// ── Types ─────────────────────────────────────────────────────────────────────
export type PayMethod   = "cash" | "online";
export type DiscType    = "amount" | "percent";
export type MovementType = "opening"|"purchase"|"consumption"|"wastage"|"returned"|"adjustment";

export interface LineItem {
  id:     string;
  desc:   string;
  qty:    string;
  rate:   string;
  itemId?: string;   // linked inventory item
  unit?:   string;
}

export interface Party {
  name:    string;
  address: string;
  phone:   string;
  email:   string;
  gstin:   string;
  pan:     string;
}

export interface CustomerLite {
  name:    string;
  phone:   string;
  email:   string;
  gstin:   string;
  address: string;
}

export interface StockItem {
  id:        string;
  name:      string;
  sku:       string;
  category:  string;
  unit:      string;
  quantity:  number | string;
  sellPrice: number | string | null;
  costPrice: number | string;
}

export interface Totals {
  subtotal:    number;
  discountAmt: number;
  taxable:     number;
  taxAmt:      number;
  total:       number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export const uid    = () => Math.random().toString(36).slice(2, 9);
export const today  = () => new Date().toISOString().slice(0, 10);
export const num    = (v: any) => { const n = parseFloat(String(v)); return Number.isFinite(n) ? n : 0; };
export const dec    = (v: any) => { const n = parseFloat(String(v ?? 0)); return Number.isFinite(n) ? n : 0; };
export const rupee  = (n: number) => "₹" + (Number.isFinite(n) ? n : 0).toLocaleString("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 });
export const fmtDate = (d: string) => { const dt = new Date(d); return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }); };
export const waDigits = (raw: string) => { let d = String(raw||"").replace(/\D/g,"").replace(/^0+/,""); if(d.length===10) d="91"+d; return d; };

export function computeTotals(items: LineItem[], discType: DiscType, discVal: string, taxPct: string): Totals {
  const subtotal    = items.reduce((s, it) => s + num(it.qty) * num(it.rate), 0);
  const discountAmt = discType === "percent"
    ? (subtotal * num(discVal)) / 100
    : Math.min(num(discVal), subtotal);
  const taxable = Math.max(subtotal - discountAmt, 0);
  const taxAmt  = (taxable * num(taxPct)) / 100;
  return { subtotal, discountAmt, taxable, taxAmt, total: taxable + taxAmt };
}

// ── LocalStorage helpers ──────────────────────────────────────────────────────
export const BIZ_KEY      = "aa_invoice_business_v4";
export const AUTOSAVE_KEY = "aa_invoice_autosave";
export const SEQ_KEY      = "aa_invoice_seq";

export const loadBiz = (): Party => {
  try { const s = localStorage.getItem(BIZ_KEY); if (s) return JSON.parse(s); } catch {}
  return {
        name:    "",
    address: "Rabindra Sadan, Shakti Mandir Club, SS Sen Road\nBerhampore, West Bengal - 742101",
    phone:   "7478482106 (Office) | 9932913826 (Abhijit)",
    email:   "abhijitart85@gmail.com",
    gstin:   "19AQFPD8346K1ZH",
    pan:     "AQFPD8346K",
  };
};

export const saveBizToStorage = (biz: Party) => {
  try { localStorage.setItem(BIZ_KEY, JSON.stringify(biz)); } catch {}
};

export const loadAutosave = (): "on" | "off" | "" => {
  try { const v = localStorage.getItem(AUTOSAVE_KEY); return v === "on" || v === "off" ? v : ""; } catch { return ""; }
};

export const nextInvoiceNo = () => {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  let seq = 1;
  try { seq = (parseInt(localStorage.getItem(SEQ_KEY)||"0",10)||0)+1; } catch { seq = Math.floor(Math.random()*900)+100; }
  return `AA-${stamp}-${String(seq).padStart(3,"0")}`;
};

export const bumpSeq = (invNo: string) => {
  try { const m = invNo.match(/(\d+)$/); if (m) localStorage.setItem(SEQ_KEY, m[1]); } catch {}
};

// ── Amount in words ───────────────────────────────────────────────────────────
export function amtWords(n: number): string {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const t     = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const m     = Math.round(n);
  if (m === 0) return "Zero Only";
  function b(x: number): string {
    if (x < 20) return ones[x];
    if (x < 100) return t[Math.floor(x/10)] + (x%10 ? " "+ones[x%10] : "");
    return ones[Math.floor(x/100)] + " Hundred" + (x%100 ? " "+b(x%100) : "");
  }
  let r = "";
  if (m >= 10000000) r += b(Math.floor(m/10000000)) + " Crore ";
  if (m >= 100000)   r += b(Math.floor((m%10000000)/100000)) + " Lakh ";
  if (m >= 1000)     r += b(Math.floor((m%100000)/1000)) + " Thousand ";
  r += b(m%1000);
  return r.trim() + " Only";
}

// ── Shared button styles ──────────────────────────────────────────────────────
export const btnSt = {
  cta: {
    display:"inline-flex", alignItems:"center", gap:8, padding:"11px 20px",
    borderRadius:0, border:"none", background:TERRA, color:"#fff",
    fontFamily:SANS, fontWeight:700, fontSize:13.5, cursor:"pointer",
    boxShadow:`0 10px 22px ${TERRA}30`,
  } as React.CSSProperties,
  ghost: {
    display:"inline-flex", alignItems:"center", gap:7, padding:"11px 18px",
    borderRadius:0, border:`1px solid ${LINE}`, background:CARD, color:INK,
    fontFamily:SANS, fontWeight:700, fontSize:13.5, cursor:"pointer",
  } as React.CSSProperties,
  waCta: {
    display:"inline-flex", alignItems:"center", gap:8, padding:"11px 20px",
    borderRadius:0, border:"none", background:WA, color:"#fff",
    fontFamily:SANS, fontWeight:700, fontSize:13.5, cursor:"pointer",
    boxShadow:`0 10px 22px ${WA}30`,
  } as React.CSSProperties,
  save: {
    display:"inline-flex", alignItems:"center", gap:7, padding:"11px 18px",
    borderRadius:0, border:`1px solid ${TERRA}`, background:CARD, color:TERRA,
    fontFamily:SANS, fontWeight:700, fontSize:13.5, cursor:"pointer",
  } as React.CSSProperties,
  // Modal helpers
  backdrop: {
    position:"fixed", inset:0, background:"rgba(24,22,28,.5)",
    backdropFilter:"blur(3px)", WebkitBackdropFilter:"blur(3px)",
    zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20,
  } as React.CSSProperties,
  modal: {
    width:"100%", maxWidth:520, maxHeight:"calc(100vh - 40px)",
    background:"#fffdfb", border:`1px solid ${LINE}`,
    boxShadow:"0 30px 80px rgba(24,22,28,.34)",
    display:"flex", flexDirection:"column" as const, boxSizing:"border-box" as const, overflow:"hidden",
  } as React.CSSProperties,
  modalHead: {
    display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
    padding:"17px 22px", borderBottom:`1px solid ${LINE}`, background:CARD, flexShrink:0,
  },
  modalBody: { padding:22, overflowY:"auto" as const, flex:1 },
  modalFoot: {
    display:"flex", justifyContent:"flex-end", gap:10, padding:"16px 22px",
    borderTop:`1px solid ${LINE}`, background:CARD, flexShrink:0, flexWrap:"wrap" as const,
  },
  inp: {
    width:"100%", boxSizing:"border-box" as const, padding:"10px 12px",
    border:`1px solid #e6dcd2`, borderRadius:0, fontSize:14,
    fontFamily:SANS, background:CARD, color:INK, colorScheme:"light" as const,
  } as React.CSSProperties,
  field: { display:"block", marginTop:12 } as React.CSSProperties,
  lbl:   { display:"block", fontSize:12.5, fontWeight:700, color:BODY, marginBottom:6 },
  err:   { marginTop:12, padding:"10px 14px", background:"#fdecea", border:"1px solid #f3cfc2", color:"#8a2f16", fontSize:13 },
  ok:    { padding:"13px 16px", background:GREEN_LT, border:`1px solid #bfe3cd`, color:GREEN, fontSize:13.5, fontWeight:600 },
};