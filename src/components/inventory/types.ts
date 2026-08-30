// src/components/inventory/types.ts
// ── All shared types, tokens, constants, and pure helpers ──────────────────

// ── Design tokens ────────────────────────────────────────────────────────────
export const SIDEBAR_BG   = "#16181f";
export const SIDEBAR_TEXT = "#c8ccd6";
export const SIDEBAR_MUTE = "#5a5f6e";
export const INK          = "#1a1d27";
export const BODY         = "#454a57";
export const MUTE         = "#8a8f9a";
export const LINE         = "#ede8dc";
export const IVORY        = "#faf8f4";
export const CARD         = "#ffffff";
export const TERRA        = "#d9542f";
export const TERRA_DK     = "#c8481f";
export const GOLD         = "#c2974a";
export const GOLD_LT      = "#f5ead4";
export const GREEN        = "#15803d";
export const GREEN_LT     = "#dcfce7";
export const AMBER        = "#b45309";
export const RED          = "#b91c1c";
export const RED_LT       = "#fee2e2";
export const SANS         = "'DM Sans', system-ui, sans-serif";

export const CAT_COLORS   = ["#d9542f","#c2974a","#2563eb","#7c3aed","#059669","#db2777","#0891b2","#65a30d"];
export const catColor     = (i: number) => CAT_COLORS[i % CAT_COLORS.length];

// ── TypeScript types ──────────────────────────────────────────────────────────
export type StockUnit    = "piece"|"sqft"|"sq_inch"|"inch"|"feet"|"metre"|"roll"|"sheet"|"box";
export type MovementType = "opening"|"purchase"|"consumption"|"wastage"|"returned"|"adjustment";

export interface Supplier {
  id: string; name: string; phone?: string; email?: string; gstin?: string; address?: string; notes?: string;
}

export interface InventoryItem {
  id: string; sku: string; name: string; category: string; unit: StockUnit;
  quantity: string; reorderLevel: string; costPrice: string; sellPrice?: string;
  storageLocation?: string; notes?: string; active: boolean;
  supplier?: Supplier; supplierId?: string; updatedAt: string;
}

export interface Movement {
  id: string; type: MovementType; delta: string; postBalance: string;
  note?: string; createdAt: string;
  supplier?: { name: string }; invoice?: { invoiceNo: string };
}

export interface KPIs {
  totalItems: number; stockValue: string;
  lowCount: number; outCount: number;
  lowStockCount?: number; outOfStockCount?: number;
}

export interface CatSummary { name: string; count: number; value: number; low: number; }

// ── Constants ─────────────────────────────────────────────────────────────────
export const UNIT_OPTS: StockUnit[] = ["piece","sqft","sq_inch","inch","feet","metre","roll","sheet","box"];

/** Enum values can't hold spaces, so anything shown to a person comes from here. */
export const UNIT_LABEL: Record<StockUnit, string> = {
  piece:   "piece",
  sqft:    "sqft",
  sq_inch: "Square Inch",
  inch:    "inch",
  feet:    "feet",
  metre:   "metre",
  roll:    "roll",
  sheet:   "sheet",
  box:     "box",
};

/** Falls back to the raw value for any legacy unit still sitting in old rows. */
export const unitLabel = (u: string) => UNIT_LABEL[u as StockUnit] ?? u;

export const MOV_LABEL: Record<string,string> = {
  opening:"Opening", purchase:"Purchase", consumption:"Consumption",
  wastage:"Wastage", returned:"Return", adjustment:"Adjustment",
};

export const MOV_SIGN: Record<string,number> = {
  opening:1, purchase:1, returned:1, consumption:-1, wastage:-1, adjustment:1,
};

// ── Pure helpers ──────────────────────────────────────────────────────────────
export const dec   = (v: any): number => { const n = parseFloat(String(v ?? 0)); return Number.isFinite(n) ? n : 0; };
export const rupee = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 });
export const rfmt  = (v: any) => rupee(dec(v));
export const dtfmt = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})
    + ", " + d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
};

export function buildCatSummary(items: InventoryItem[]): CatSummary[] {
  const map = new Map<string, CatSummary>();
  for (const it of items) {
    const cat = it.category || "Uncategorised";
    const cur = map.get(cat) ?? { name:cat, count:0, value:0, low:0 };
    cur.count++;
    cur.value += dec(it.quantity) * dec(it.costPrice);
    if (dec(it.quantity) <= dec(it.reorderLevel) && dec(it.reorderLevel) > 0) cur.low++;
    map.set(cat, cur);
  }
  return Array.from(map.values()).sort((a,b) => b.value - a.value);
}

// ── Shared style fragments ────────────────────────────────────────────────────
export const sharedSt = {
  ghostBtn: {
    display:"inline-flex", alignItems:"center", gap:7, padding:"9px 16px",
    border:`1px solid ${LINE}`, background:CARD, color:BODY,
    fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", borderRadius:0,
    transition:"all .2s", whiteSpace:"nowrap",
  } as React.CSSProperties,
  ctaBtn: {
    display:"inline-flex", alignItems:"center", gap:7, padding:"9px 18px",
    border:"none", background:TERRA, color:"#fff",
    fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", borderRadius:0,
    transition:"all .2s", whiteSpace:"nowrap", boxShadow:`0 4px 14px ${TERRA}30`,
  } as React.CSSProperties,
  delBtn: {
    display:"inline-flex", alignItems:"center", gap:6, padding:"9px 14px",
    border:"1px solid #fca5a5", background:"#fff5f5", color:RED,
    fontFamily:SANS, fontWeight:700, fontSize:12.5, cursor:"pointer", borderRadius:0,
  } as React.CSSProperties,
  inp: {
    width:"100%", boxSizing:"border-box", padding:"10px 12px",
    border:`1px solid ${LINE}`, borderRadius:0, fontSize:13.5,
    fontFamily:SANS, color:INK, background:CARD, outline:"none",
  } as React.CSSProperties,
  field:  { display:"block", marginTop:12, flex:1, minWidth:0 } as React.CSSProperties,
  lbl:    { display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, color:BODY, marginBottom:5 } as React.CSSProperties,
  errBox: { marginTop:12, padding:"10px 14px", background:"#fdecea", border:"1px solid #f3cfc2", color:"#8a2f16", fontSize:13, borderRadius:0 },
  row2:   { display:"flex", gap:12 } as React.CSSProperties,
  // Drawer shell
  backdrop:  { position:"fixed", inset:0, background:"rgba(12,13,20,.58)", backdropFilter:"blur(4px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 } as React.CSSProperties,
  drawer:    { width:"100%", maxWidth:580, maxHeight:"calc(100vh - 40px)", background:CARD, display:"flex", flexDirection:"column", boxShadow:"0 28px 70px rgba(0,0,0,.32)", overflow:"hidden" } as React.CSSProperties,
  dHead:     { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 22px", borderBottom:`1px solid ${LINE}`, background:IVORY, flexShrink:0 },
  dTitle:    { fontSize:17, fontWeight:800, margin:0, color:INK },
  closeBtn:  { width:34, height:34, display:"grid", placeItems:"center", border:`1px solid ${LINE}`, background:CARD, color:MUTE, cursor:"pointer", borderRadius:0 },
  dBody:     { flex:1, overflowY:"auto", padding:22 } as React.CSSProperties,
  dFoot:     { display:"flex", alignItems:"center", padding:"14px 22px", borderTop:`1px solid ${LINE}`, background:IVORY, flexShrink:0, gap:10 },
  infoNote:  { fontSize:12, color:MUTE, background:IVORY, border:`1px solid ${LINE}`, padding:"10px 12px", lineHeight:1.6, marginTop:12 },
};