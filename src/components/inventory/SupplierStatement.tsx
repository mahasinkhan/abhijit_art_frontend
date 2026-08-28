// src/components/inventory/SupplierStatement.tsx
// ── Full supplier statement: purchases (debits) + payments (credits) ────────
// Shows total purchased, paid, outstanding. Records new payments. PIN-gated.

import { useEffect, useState, useCallback } from "react";
import api from "../../api";
import Icon from "./Icon";
import PinField from "./PinField";
import {
  Supplier, INK, BODY, MUTE, LINE, IVORY, CARD,
  TERRA, TERRA_DK, GOLD, GOLD_LT, GREEN, GREEN_LT,
  AMBER, RED, RED_LT, SANS, dec, rupee, rfmt, sharedSt,
} from "./types";

// ── IST formatter helpers ─────────────────────────────────────────────────────
const IST = { timeZone: "Asia/Kolkata" } as const;

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric", ...IST });
};

const fmtTime = (d: string | null | undefined) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true, ...IST });
};

const fmtDateTime = (d: string | null | undefined) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", {
    day:"numeric", month:"short", year:"numeric",
    hour:"2-digit", minute:"2-digit", hour12:true, ...IST,
  });
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface PurchaseItem {
  id: string; name: string; unit: string;
  quantity: number; rate: number; amount: number;
}
interface Purchase {
  id: string; billNo: string; billDate: string;
  subtotal: number; discountAmt: number; taxAmt: number; total: number;
  notes: string; items: PurchaseItem[];
  createdAt: string;
}
interface SupplierPayment {
  id: string; amount: number; method: "cash"|"online";
  note: string; paidAt: string;
}
interface Statement {
  supplier:  Supplier & { totalPurchased: string; totalPaid: string; lastPurchaseAt?: string };
  purchases: Purchase[];
  payments:  SupplierPayment[];
}

// ── Ledger entry ──────────────────────────────────────────────────────────────
type LedgerRow =
  | { kind:"purchase"; date:string; data:Purchase; running:number }
  | { kind:"payment";  date:string; data:SupplierPayment; running:number };

function buildLedger(purchases: any[] = [], payments: any[] = []): LedgerRow[] {
  const safeP   = Array.isArray(purchases) ? purchases : [];
  const safePay = Array.isArray(payments)  ? payments  : [];
  const rows: LedgerRow[] = [
    ...safeP.map(p => ({ kind:"purchase" as const, date: String(p?.billDate || p?.createdAt || p?.date || ""), data: p as Purchase, running: 0 })),
    ...safePay.map(p => ({ kind:"payment" as const, date: String(p?.paidAt || p?.createdAt || p?.date || ""), data: p as SupplierPayment, running: 0 })),
  ];
  // Sort ascending for correct running balance
  rows.sort((a,b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0;
    const tb = b.date ? new Date(b.date).getTime() : 0;
    return ta - tb;
  });
  let bal = 0;
  for (const r of rows) {
    if (r.kind === "purchase") bal += dec((r.data as any).total ?? (r.data as any).amount ?? 0);
    else                       bal -= dec((r.data as any).amount ?? 0);
    r.running = bal;
  }
  // Reverse for display: newest first
  return rows.reverse();
}

// ── Filter helpers ────────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS  = (() => { const cy = new Date().getFullYear(); const a:number[] = []; for (let y = cy+1; y >= cy-5; y--) a.push(y); return a; })();
const isoDay = (s: string) => { const d = s ? new Date(s) : null; return d && !isNaN(d.getTime()) ? d.toISOString().slice(0,10) : ""; };

// ── Purchase detail accordion ─────────────────────────────────────────────────
function PurchaseDetail({ p }: { p: any }) {
  const [open,    setOpen]    = useState(false);
  const [lines,   setLines]   = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = () => {
    if (!open && lines.length === 0 && p.id) {
      setLoading(true);
      api.get(`/api/inventory/purchases/${p.id}`)
        .then(r => {
          const items = r.data?.items ?? r.data?.SupplierPurchaseItem ?? [];
          setLines(Array.isArray(items) ? items : []);
        })
        .catch(() => setLines([]))
        .finally(() => setLoading(false));
    }
    setOpen(v => !v);
  };

  if (!p.id) return null;

  return (
    <div>
      <button onClick={toggle} style={st2.expandBtn}>
        {open ? "▲ Hide items" : "▼ Show items"}
      </button>
      {open && (
        <div style={{ marginTop:8 }}>
          {loading ? (
            <div style={{ fontSize:11.5, color:MUTE, padding:"8px 0" }}>Loading items…</div>
          ) : lines.length === 0 ? (
            <div style={{ fontSize:11.5, color:MUTE }}>No item details available.</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#f5f3ef" }}>
                  {["Item","Qty","Rate","Amount"].map(h => (
                    <th key={h} style={{ padding:"5px 10px", textAlign:"left", fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.5, borderBottom:`1px solid ${LINE}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((it: any, i: number) => (
                  <tr key={it.id||i} style={{ background: i%2===0?"#fff":"#faf8f4" }}>
                    <td style={{ padding:"7px 10px", fontWeight:600, color:INK }}>{it.name||it.itemName||"—"}</td>
                    <td style={{ padding:"7px 10px", color:BODY }}>{dec(it.quantity)} {it.unit||""}</td>
                    <td style={{ padding:"7px 10px", color:BODY, fontVariantNumeric:"tabular-nums" }}>{rupee(dec(it.rate))}</td>
                    <td style={{ padding:"7px 10px", fontWeight:700, color:INK, fontVariantNumeric:"tabular-nums" }}>{rupee(dec(it.amount))}</td>
                  </tr>
                ))}
              </tbody>
              {lines.length > 1 && (
                <tfoot>
                  <tr style={{ background:"#f5f3ef" }}>
                    <td colSpan={3} style={{ padding:"6px 10px", fontWeight:700, color:INK }}>Subtotal</td>
                    <td style={{ padding:"6px 10px", fontWeight:800, color:TERRA, fontVariantNumeric:"tabular-nums" }}>
                      {rupee(lines.reduce((s:number,it:any)=>s+dec(it.amount),0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const st2 = {
  expandBtn: { fontSize:11.5, fontWeight:700, color:TERRA, background:"none", border:"none", cursor:"pointer", padding:"4px 0", fontFamily:SANS, marginTop:4 } as React.CSSProperties,
};

// ═════════════════════════════════════════════════════════════════════════════
interface StatementActions { onPurchase: () => void; onPayment: () => void; canPay: boolean; }

interface Props {
  supplierId: string;
  onBack:     () => void;
  onActions?: (a: StatementActions | null) => void;
}

export default function SupplierStatement({ supplierId, onBack, onActions }: Props) {
  const [stmt,    setStmt]    = useState<Statement|null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [fFrom,  setFFrom]  = useState("");
  const [fTo,    setFTo]    = useState("");
  const [fMonth, setFMonth] = useState("");
  const [fYear,  setFYear]  = useState("");
  const [fType,  setFType]  = useState<"all"|"purchase"|"payment">("all");

  const [stockItems, setStockItems] = useState<{id:string;name:string;unit:string;sku:string;category:string}[]>([]);
  useEffect(() => {
    api.get("/api/inventory/items").then(r => {
      const rows = Array.isArray(r.data) ? r.data : [];
      setStockItems(rows.map((it:any) => ({
        id: it.id, name: it.name, unit: it.unit, sku: it.sku,
        category: (it.category || "Uncategorised").trim() || "Uncategorised",
      })));
    }).catch(()=>{});
  }, []);

  const stockCategories = Array.from(new Set(stockItems.map(it => it.category))).sort();

  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount:"", method:"cash" as "cash"|"online", note:"", pin:"" });
  const [payErr,  setPayErr]  = useState("");
  const [payBusy, setPayBusy] = useState(false);

  const [purOpen,  setPurOpen]  = useState(false);
  const [purErr,   setPurErr]   = useState("");
  const [purBusy,  setPurBusy]  = useState(false);
  const [purPin,   setPurPin]   = useState("");
  const [purForm,  setPurForm]  = useState({
    billNo:"", billDate: new Date().toISOString().slice(0,10),
    discType:"amount" as "amount"|"percent", discVal:"0", taxPct:"0", notes:"", advance:"",
  });
  const [purLines, setPurLines] = useState([{ id:"1", itemId:"", name:"", qty:"1", rate:"", unit:"piece", category:"" }]);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/api/inventory/suppliers/${supplierId}/statement`)
      .then(r => {
        const d = r.data;
        const supplier = d?.supplier ?? d;
        const entries: any[] = Array.isArray(d?.entries) ? d.entries : [];
        const purchases = entries
          .filter((e: any) => e.kind === "purchase")
          .map((e: any) => ({
            id: e.id, billNo: e.ref || "", billDate: e.date, createdAt: e.createdAt,
            total: e.debit, notes: e.note || "",
            items: [], _itemCount: e.itemCount ?? 0,
          }));
        const payments = entries
          .filter((e: any) => e.kind === "payment")
          .map((e: any) => ({
            id: e.id, amount: e.credit, method: e.method || "cash",
            note: e.note || "", paidAt: e.date, createdAt: e.createdAt,
          }));
        const summary = d?.summary ?? {};
        const mergedSupplier = {
          ...supplier,
          totalPurchased: summary.totalPurchased ?? supplier.totalPurchased,
          totalPaid:      summary.totalPaid      ?? supplier.totalPaid,
          lastPurchaseAt: supplier.lastPurchaseAt,
        };
        setStmt({ supplier: mergedSupplier, purchases, payments, _entries: entries } as any);
      })
      .catch(e => { console.error("[SupplierStatement] error:", e); setError("Couldn't load supplier statement."); })
      .finally(() => setLoading(false));
  }, [supplierId]);

  useEffect(() => { load(); }, [load]);

  const totalPurchased = dec(stmt?.supplier.totalPurchased);
  const totalPaid      = dec(stmt?.supplier.totalPaid);
  const outstanding    = Math.max(totalPurchased - totalPaid, 0);

  const rawEntries: any[] = (stmt as any)?._entries ?? [];

  // Build ledger: map entries and sort by actual datetime (newest first)
  const ledgerAll: LedgerRow[] = (() => {
    let rows: LedgerRow[];
    if (rawEntries.length > 0) {
      rows = rawEntries.map((e: any) => ({
        kind:    e.kind as "purchase" | "payment",
        date:    e.date || e.createdAt || "",
        running: dec(e.balance),
        data:    e.kind === "purchase"
          ? { id:e.id, billNo:e.ref||"", billDate:e.date, createdAt:e.createdAt,
              total:e.debit, notes:e.note||"", items:[], _itemCount:e.itemCount??0 } as any
          : { id:e.id, amount:e.credit, method:e.method||"cash",
              note:e.note||"", paidAt:e.date, createdAt:e.createdAt } as any,
      }));
    } else if (stmt) {
      rows = buildLedger(stmt.purchases, stmt.payments);
    } else {
      rows = [];
    }
    // Sort by createdAt descending (newest first)
    rows.sort((a, b) => {
      const ta = new Date((a.data as any).createdAt || a.date || 0).getTime() || 0;
      const tb = new Date((b.data as any).createdAt || b.date || 0).getTime() || 0;
      return tb - ta; // newest first
    });
    return rows;
  })();

  const filterActive = !!(fFrom || fTo || fMonth || fYear || fType !== "all");
  const ledger: LedgerRow[] = ledgerAll.filter(row => {
    if (fType !== "all" && row.kind !== fType) return false;
    const day = isoDay(row.date || (row.data as any)?.createdAt || "");
    if (!day) return !fFrom && !fTo && !fMonth && !fYear;
    if (fFrom && day < fFrom) return false;
    if (fTo   && day > fTo)   return false;
    if (fYear  && day.slice(0,4) !== fYear) return false;
    if (fMonth && day.slice(5,7) !== String(fMonth).padStart(2,"0")) return false;
    return true;
  });

  // Group advance payments with their parent purchase by matching bill number
  const advanceMap = new Map<number, LedgerRow>();
  const hideRows   = new Set<number>();

  // First pass: build a map of billNo → purchase index
  const billNoToIdx = new Map<string, number>();
  ledger.forEach((row, i) => {
    if (row.kind === "purchase") {
      const bn = String((row.data as any).billNo || "").trim();
      if (bn) billNoToIdx.set(bn, i);
    }
  });

  // Second pass: match advance payments to their purchase by bill number in note
  ledger.forEach((row, i) => {
    if (row.kind === "payment") {
      const note  = String((row.data as any).note || "");
      const match = note.match(/Advance on purchase\s*#?\s*(.+)/i);
      if (match) {
        const refNo = match[1].trim();
        const purIdx = billNoToIdx.get(refNo);
        if (purIdx !== undefined) {
          advanceMap.set(purIdx, row);
          hideRows.add(i);
        }
      }
    }
  });

  const shownPurchased = ledger.reduce((s,r) => s + (r.kind==="purchase" ? dec((r.data as any).total ?? (r.data as any).debit ?? 0) : 0), 0);
  const shownPaid      = ledger.reduce((s,r) => s + (r.kind==="payment"  ? dec((r.data as any).amount ?? (r.data as any).credit ?? 0) : 0), 0);
  const shownBalance   = filterActive ? shownPurchased - shownPaid : outstanding;

  const resetFilters = () => { setFFrom(""); setFTo(""); setFMonth(""); setFYear(""); setFType("all"); };

  useEffect(() => {
    onActions?.({ onPurchase: () => setPurOpen(true), onPayment: () => setPayOpen(true), canPay: outstanding > 0 });
    return () => onActions?.(null);
  }, [onActions, outstanding]);

  const savePayment = async () => {
    if (!payForm.amount || dec(payForm.amount) <= 0) { setPayErr("Enter a valid amount."); return; }
    if (!payForm.pin) { setPayErr("Enter your security PIN."); return; }
    setPayBusy(true); setPayErr("");
    try {
      await api.post(`/api/inventory/suppliers/${supplierId}/payments`, {
        amount: dec(payForm.amount), method: payForm.method, note: payForm.note, pin: payForm.pin,
      });
      setPayOpen(false); setPayForm({ amount:"", method:"cash", note:"", pin:"" }); load();
    } catch(e:any) { setPayErr(e?.response?.data?.error || "Couldn't save payment."); }
    finally { setPayBusy(false); }
  };

  const deletePayment = async (pid: string, pin: string) => {
    if (!pin) return;
    try {
      await api.delete(`/api/inventory/suppliers/${supplierId}/payments/${pid}`, { data:{ pin } });
      load();
    } catch(e:any) { alert(e?.response?.data?.error || "Couldn't delete."); }
  };

  const addPurLine = () => setPurLines(l => [...l, { id:Date.now().toString(), itemId:"", name:"", qty:"1", rate:"", unit:"piece", category:"" }]);
  const setPurLine = (id:string, k:string, v:string) => setPurLines(l => l.map(r => r.id===id ? {...r,[k]:v} : r));

  const savePurchase = async () => {
    const lines = purLines.filter(l => (l.name.trim()||l.itemId) && dec(l.qty) > 0 && dec(l.rate) > 0);
    if (!lines.length) { setPurErr("Add at least one valid line item."); return; }
    if (!purPin) { setPurErr("Enter your security PIN."); return; }
    setPurBusy(true); setPurErr("");
    try {
      await api.post(`/api/inventory/purchases`, {
        supplierId,
        billNo: purForm.billNo, billDate: purForm.billDate,
        discType: purForm.discType, discVal: dec(purForm.discVal),
        taxPct: dec(purForm.taxPct), notes: purForm.notes,
        items: lines.map(l => ({ itemId: l.itemId||null, name:l.name.trim(), quantity:dec(l.qty), rate:dec(l.rate), unit:l.unit })),
        pin: purPin,
      });
      const advAmt = dec(purForm.advance);
      if (advAmt > 0) {
        try {
          await api.post(`/api/inventory/suppliers/${supplierId}/payments`, {
            amount: advAmt, method: "cash",
            note: `Advance on purchase${purForm.billNo ? " #" + purForm.billNo : ""}`,
            pin: purPin,
          });
        } catch { /* advance payment failed silently */ }
      }
      setPurOpen(false); setPurPin(""); setPurErr("");
      setPurForm({ billNo:"", billDate:new Date().toISOString().slice(0,10), discType:"amount", discVal:"0", taxPct:"0", notes:"", advance:"" });
      setPurLines([{ id:"1", itemId:"", name:"", qty:"1", rate:"", unit:"piece", category:"" }]);
      load();
    } catch(e:any) { setPurErr(e?.response?.data?.error || "Couldn't save purchase."); }
    finally { setPurBusy(false); }
  };

  if (loading) return <div style={{ padding:60, textAlign:"center", color:MUTE, fontFamily:SANS }}>Loading…</div>;
  if (error)   return <div style={{ padding:60, textAlign:"center", color:TERRA, fontFamily:SANS }}>{error}</div>;
  if (!stmt)   return null;

  const s = stmt.supplier;

  function downloadStatementPdf() {
    const esc = (v: any) => String(v ?? "").replace(/[&<>"']/g, (c: string) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string));
    // PDF uses ascending order (oldest first)
    const pdfRows = [...ledgerAll].reverse();
    const rows = pdfRows.map((row, i) => {
      const p = row.data as any;
      const isPurchase = row.kind === "purchase";
      const amount = dec(p.total ?? p.debit ?? p.amount ?? p.credit ?? 0);
      const dateRaw = p.createdAt || row.date || p.billDate || "";
      return `<tr style="background:${i%2===0?"#fff":"#faf8f4"}">
        <td>${esc(fmtDate(dateRaw))} <span style="font-size:11px;color:#aaa">${esc(fmtTime(dateRaw))}</span></td>
        <td><span class="${isPurchase?"badge-p":"badge-pay"}">${isPurchase?"Purchase":"Payment"}</span></td>
        <td>${esc(isPurchase?(p.billNo?`Bill #${p.billNo}`:"Purchase"):(p.method||"Cash"))}</td>
        <td style="color:#8a8f9a">${esc(p.note||"—")}</td>
        <td class="r" style="color:#d9542f;font-weight:700">${isPurchase?"₹"+amount.toLocaleString("en-IN",{minimumFractionDigits:2}):""}</td>
        <td class="r" style="color:#15803d;font-weight:700">${!isPurchase?"₹"+amount.toLocaleString("en-IN",{minimumFractionDigits:2}):""}</td>
        <td class="r" style="font-weight:800;color:${row.running>0?"#d9542f":"#15803d"}">₹${row.running.toLocaleString("en-IN",{minimumFractionDigits:2})}</td>
      </tr>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>Supplier Statement — ${esc(s.name)}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1a1d27;padding:32px}
      h1{font-size:20px;font-weight:900;margin-bottom:4px}
      .sup{font-size:16px;font-weight:700;color:#d9542f;margin-bottom:4px}
      .meta{font-size:12px;color:#8a8f9a;margin-bottom:24px}
      .cards{display:flex;gap:12px;margin-bottom:24px}
      .card{flex:1;padding:14px 16px;border:1px solid #ede8dc}
      .card-l{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#8a8f9a;margin-bottom:5px}
      .card-v{font-size:20px;font-weight:900;font-variant-numeric:tabular-nums}
      table{width:100%;border-collapse:collapse;font-size:12.5px}
      th{background:#faf8f4;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#8a8f9a;border-bottom:2px solid #ede8dc}
      th.r,td.r{text-align:right;font-variant-numeric:tabular-nums}
      td{padding:9px 10px;border-bottom:1px solid #f0ece4;vertical-align:top}
      .badge-p{display:inline-block;padding:2px 8px;font-size:11px;font-weight:700;background:#fff2ee;color:#d9542f}
      .badge-pay{display:inline-block;padding:2px 8px;font-size:11px;font-weight:700;background:#dcfce7;color:#15803d}
      tfoot td{background:#1a1d27;color:#fff;font-weight:800;font-size:13px;padding:10px}
      @media print{body{padding:16px}@page{margin:12mm}}</style>
      </head><body>
      <h1>Supplier Statement</h1>
      <div class="sup">${esc(s.name)}</div>
      <div class="meta">${s.phone?`📞 ${esc(s.phone)}&nbsp;&nbsp;`:""}${s.email?`✉ ${esc(s.email)}&nbsp;&nbsp;`:""} Generated ${fmtDate(new Date().toISOString())}</div>
      <div class="cards">
        <div class="card"><div class="card-l">Total Purchased</div><div class="card-v">₹${totalPurchased.toLocaleString("en-IN",{minimumFractionDigits:2})}</div></div>
        <div class="card"><div class="card-l">Total Paid</div><div class="card-v" style="color:#15803d">₹${totalPaid.toLocaleString("en-IN",{minimumFractionDigits:2})}</div></div>
        <div class="card" style="background:${outstanding>0?"#fff8f5":"#f0fdf4"}"><div class="card-l">Balance Due</div><div class="card-v" style="color:${outstanding>0?"#d9542f":"#15803d"}">₹${outstanding.toLocaleString("en-IN",{minimumFractionDigits:2})}${outstanding<=0?" ✓":""}</div></div>
      </div>
      <table><thead><tr>
        <th>Date & Time</th><th>Type</th><th>Reference</th><th>Note</th>
        <th class="r">Purchased (₹)</th><th class="r">Paid (₹)</th><th class="r">Balance (₹)</th>
      </tr></thead>
      <tbody>${rows||"<tr><td colspan='7' style='text-align:center;color:#aaa;padding:24px'>No transactions.</td></tr>"}</tbody>
      <tfoot><tr><td colspan="4">Total</td>
        <td class="r">₹${totalPurchased.toLocaleString("en-IN",{minimumFractionDigits:2})}</td>
        <td class="r">₹${totalPaid.toLocaleString("en-IN",{minimumFractionDigits:2})}</td>
        <td class="r">₹${outstanding.toLocaleString("en-IN",{minimumFractionDigits:2})}${outstanding<=0?" ✓":""}</td>
      </tr></tfoot></table>
      <script>setTimeout(()=>window.print(),400)</script>
    </body></html>`;
    const w = window.open("","_blank","width=1100,height=800");
    if (w) { w.document.write(html); w.document.close(); }
  }

  return (
    <div style={st.wrap}>

      <div style={st.pageHead}>
        <button style={st.backBtn} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          All suppliers
        </button>
        <div style={{ flex:1 }}>
          <h2 style={st.suppName}>{s.name}</h2>
          <div style={{ fontSize:13, color:MUTE, marginTop:2, display:"flex", gap:14, flexWrap:"wrap" }}>
            {s.phone && <span>📞 {s.phone}</span>}
            {s.email && <span>✉ {s.email}</span>}
            {s.gstin  && <span>GSTIN: {s.gstin}</span>}
          </div>
        </div>
        <div style={{ display:"flex", gap:10, flexShrink:0, alignItems:"center", flexWrap:"wrap" }}>
          <div style={st.hdrFilters}>
            <input type="date" style={st.hInp} value={fFrom} onChange={e=>setFFrom(e.target.value)} title="From date"/>
            <span style={{ color:MUTE, fontSize:12 }}>→</span>
            <input type="date" style={st.hInp} value={fTo} onChange={e=>setFTo(e.target.value)} title="To date"/>
            <select style={st.hInp} value={fMonth} onChange={e=>setFMonth(e.target.value)} title="Month">
              <option value="">Month</option>
              {MONTHS.map((m,i)=> <option key={m} value={i+1}>{m}</option>)}
            </select>
            <select style={st.hInp} value={fYear} onChange={e=>setFYear(e.target.value)} title="Year">
              <option value="">Year</option>
              {YEARS.map(y=> <option key={y} value={y}>{y}</option>)}
            </select>
            <select style={st.hInp} value={fType} onChange={e=>setFType(e.target.value as any)} title="Type">
              <option value="all">All types</option>
              <option value="purchase">Purchase</option>
              <option value="payment">Payment</option>
            </select>
            {filterActive && <button style={st.hReset} onClick={resetFilters} title="Clear filters">↺</button>}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {(() => {
        const cardPurchased = filterActive ? shownPurchased : totalPurchased;
        const cardPaid      = filterActive ? shownPaid      : totalPaid;
        const cardDue       = filterActive ? Math.max(shownPurchased - shownPaid, 0) : outstanding;
        const purchaseCount = filterActive ? ledger.filter(r => r.kind === "purchase").length : (stmt.purchases||[]).length;
        const paymentCount  = filterActive ? ledger.filter(r => r.kind === "payment").length  : (stmt.payments||[]).length;
        return (
          <div style={st.summaryRow}>
            <div style={st.sumCard}>
              <div style={st.sumLabel}>Total Purchased{filterActive ? " (filtered)" : ""}</div>
              <div style={{ ...st.sumVal, color:INK }}>{rupee(cardPurchased)}</div>
              <div style={st.sumSub}>{purchaseCount} purchase{purchaseCount!==1?"s":""}</div>
            </div>
            <div style={st.sumCard}>
              <div style={st.sumLabel}>Total Paid{filterActive ? " (filtered)" : ""}</div>
              <div style={{ ...st.sumVal, color:GREEN }}>{rupee(cardPaid)}</div>
              <div style={st.sumSub}>{paymentCount} payment{paymentCount!==1?"s":""}</div>
            </div>
            <div style={{ ...st.sumCard, background: cardDue>0?"#fff8f5":"#f0fdf4", border:`1px solid ${cardDue>0?TERRA+"33":GREEN+"33"}` }}>
              <div style={st.sumLabel}>Balance Due{filterActive ? " (filtered)" : ""}</div>
              <div style={{ ...st.sumVal, color: cardDue>0?TERRA:GREEN }}>{rupee(cardDue)}</div>
              <div style={st.sumSub}>{cardDue>0?"Owed in this period":"Settled ✓"}</div>
            </div>
            {!filterActive && s.lastPurchaseAt && (
              <div style={st.sumCard}>
                <div style={st.sumLabel}>Last purchase</div>
                <div style={{ fontSize:15, fontWeight:700, color:INK, marginTop:6 }}>{fmtDateTime(s.lastPurchaseAt)}</div>
              </div>
            )}
          </div>
        );
      })()}

      <div style={st.ledgerCard}>
        <div style={{ padding:"16px 20px 14px", borderBottom:`1px solid ${LINE}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div>
            <div style={st.ledgerTitle}>Statement</div>
            <div style={st.ledgerSub}>
              Newest first · {ledger.length} transaction{ledger.length!==1?"s":""}
              {filterActive && ledgerAll.length !== ledger.length && ` of ${ledgerAll.length}`}
            </div>
          </div>
          <button onClick={downloadStatementPdf}
            style={{ padding:"7px 16px", background:INK, color:"#fff", border:"none", fontFamily:SANS, fontWeight:700, fontSize:12.5, cursor:"pointer", display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            ⬇ Download Statement
          </button>
        </div>

        {ledger.length === 0 ? (
          <div style={{ padding:"48px 0", textAlign:"center", color:MUTE, fontSize:14 }}>
            {ledgerAll.length === 0 ? "No transactions yet. Record a purchase to get started." : "No transactions match the current filter."}
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13.5, minWidth:680 }}>
              <thead>
                <tr style={{ background:IVORY }}>
                  <th style={st.th}>Date & Time</th>
                  <th style={st.th}>Type</th>
                  <th style={st.th}>Details</th>
                  <th style={{ ...st.th, textAlign:"right" }}>Amount Purchased (₹)</th>
                  <th style={{ ...st.th, textAlign:"right" }}>Amount Paid (₹)</th>
                  <th style={{ ...st.th, textAlign:"right" }}>Balance Due (₹)</th>
                  <th style={st.th}/>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row, i) => {
                  if (hideRows.has(i)) return null;
                  const isPurchase = row.kind === "purchase";
                  const p          = row.data as any;
                  const amount     = dec(p.total ?? p.debit ?? p.amount ?? p.credit ?? 0);
                  const itemCount  = p._itemCount ?? (p.items||[]).length ?? 0;
                  const advanceRow = isPurchase ? advanceMap.get(i) : null;
                  const advanceAmt = advanceRow ? dec((advanceRow.data as any).amount ?? (advanceRow.data as any).credit ?? 0) : 0;
                  const dateRaw    = p.createdAt || row.date || p.billDate || "";
                  return (
                    <tr key={p.id||i} style={{ background: i%2===0 ? CARD : IVORY, borderLeft:`3px solid ${isPurchase?TERRA:GREEN}` }}>
                      <td style={{ ...st.td, whiteSpace:"nowrap", color:MUTE, fontSize:12 }}>
                        <div style={{ fontWeight:600, color:INK }}>{fmtDate(dateRaw)}</div>
                        <div style={{ fontSize:10.5, marginTop:2 }}>{fmtTime(dateRaw)}</div>
                      </td>
                      <td style={st.td}>
                        <span style={{ display:"inline-block", padding:"3px 9px", fontSize:11, fontWeight:700, background: isPurchase?"#fff2ee":GREEN_LT, color:isPurchase?TERRA:GREEN }}>
                          {isPurchase ? "Purchase" : "Payment"}
                        </span>
                      </td>
                      <td style={{ ...st.td, maxWidth:280 }}>
                        <div style={{ fontWeight:700, color:INK, marginBottom:2 }}>
                          {isPurchase
                            ? (p.billNo ? `Bill #${p.billNo}` : "Purchase bill")
                            : (p.method ? p.method.charAt(0).toUpperCase()+p.method.slice(1) : "Cash")}
                        </div>
                        {p.note && <div style={{ fontSize:11.5, color:MUTE, marginBottom:3 }}>{p.note}</div>}
                        {isPurchase && itemCount > 0 && <div style={{ fontSize:11.5, color:MUTE, marginBottom:4 }}>{itemCount} item{itemCount!==1?"s":""}</div>}
                        {isPurchase && <PurchaseDetail p={p}/>}
                        {advanceAmt > 0 && (
                          <div style={{ marginTop:6, padding:"6px 10px", background:"#f0fdf4", border:"1px solid #bfe3c633", borderRadius:4, fontSize:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <span style={{ color:GREEN, fontWeight:700 }}>💵 Advance Paid</span>
                            <span style={{ color:GREEN, fontWeight:800, fontVariantNumeric:"tabular-nums" }}>{rupee(advanceAmt)}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ ...st.td, textAlign:"right", fontWeight:700, color:TERRA, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" }}>
                        {isPurchase ? rupee(amount) : <span style={{ color:MUTE }}>—</span>}
                      </td>
                      <td style={{ ...st.td, textAlign:"right", fontWeight:700, color:GREEN, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" }}>
                        {!isPurchase ? rupee(amount) : advanceAmt > 0 ? rupee(advanceAmt) : <span style={{ color:MUTE }}>—</span>}
                      </td>
                      <td style={{ ...st.td, textAlign:"right", fontWeight:800, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" }}>
                        {(() => {
                          const displayBalance = advanceRow ? advanceRow.running : row.running;
                          return <span style={{ color: displayBalance > 0 ? TERRA : GREEN }}>{rupee(displayBalance)}</span>;
                        })()}
                      </td>
                      <td style={{ ...st.td, textAlign:"right", whiteSpace:"nowrap" }}>
                        {!isPurchase && <DeletePaymentBtn pid={p.id} onDelete={deletePayment}/>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:IVORY, borderTop:`2px solid ${LINE}` }}>
                  <td colSpan={3} style={{ ...st.td, fontWeight:700, color:INK }}>
                    Total{filterActive ? <span style={{ fontWeight:600, color:MUTE, fontSize:12 }}> · filtered</span> : null}
                  </td>
                  <td style={{ ...st.td, textAlign:"right", fontWeight:800, color:TERRA, fontVariantNumeric:"tabular-nums" }}>{rupee(filterActive?shownPurchased:totalPurchased)}</td>
                  <td style={{ ...st.td, textAlign:"right", fontWeight:800, color:GREEN, fontVariantNumeric:"tabular-nums" }}>{rupee(filterActive?shownPaid:totalPaid)}</td>
                  <td style={{ ...st.td, textAlign:"right", fontWeight:900, fontSize:15, fontVariantNumeric:"tabular-nums", color:shownBalance>0?TERRA:GREEN }}>{rupee(Math.max(shownBalance,0))} {shownBalance<=0?"✓":""}</td>
                  <td style={st.td}/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════ PAYMENT MODAL ═════════════════════════════════ */}
      {payOpen && (
        <div style={sharedSt.backdrop} onClick={() => !payBusy && setPayOpen(false)}>
          <div style={{ ...sharedSt.drawer, maxWidth:440 }} onClick={e=>e.stopPropagation()}>
            <div style={sharedSt.dHead}>
              <h3 style={sharedSt.dTitle}>Record payment to {s.name}</h3>
              <button style={sharedSt.closeBtn} onClick={()=>setPayOpen(false)}><Icon name="x" size={18}/></button>
            </div>
            <div style={sharedSt.dBody}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, background:LINE, border:`1px solid ${LINE}`, marginBottom:18 }}>
                {[
                  { label:"Outstanding",   val:rupee(outstanding), color:TERRA },
                  { label:"After payment", val:rupee(Math.max(outstanding-dec(payForm.amount),0)), color:Math.max(outstanding-dec(payForm.amount),0)===0?GREEN:AMBER },
                ].map(b=>(
                  <div key={b.label} style={{ background:CARD, padding:"14px 18px", textAlign:"center" }}>
                    <div style={{ fontSize:10.5, color:MUTE, textTransform:"uppercase", letterSpacing:.7, marginBottom:5 }}>{b.label}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:b.color, fontVariantNumeric:"tabular-nums" }}>{b.val}</div>
                  </div>
                ))}
              </div>
              <label style={sharedSt.field}><span style={sharedSt.lbl}>Amount (₹)</span>
                <input style={sharedSt.inp} type="number" min="1" autoFocus value={payForm.amount} onChange={e=>setPayForm(p=>({...p,amount:e.target.value}))}/></label>
              <label style={sharedSt.field}><span style={sharedSt.lbl}>Payment method</span>
                <div style={{ display:"flex", border:`1px solid ${LINE}` }}>
                  {(["cash","online"] as const).map((m,i)=>(
                    <button key={m} type="button"
                      style={{ flex:1, padding:"10px 0", border:"none", borderLeft:i>0?`1px solid ${LINE}`:"none", background:payForm.method===m?TERRA:CARD, color:payForm.method===m?"#fff":BODY, fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", textTransform:"capitalize" }}
                      onClick={()=>setPayForm(p=>({...p,method:m}))}>{m}</button>
                  ))}
                </div></label>
              <label style={sharedSt.field}><span style={sharedSt.lbl}>Note (optional)</span>
                <input style={sharedSt.inp} value={payForm.note} onChange={e=>setPayForm(p=>({...p,note:e.target.value}))}/></label>
              <PinField value={payForm.pin} onChange={v=>setPayForm(p=>({...p,pin:v}))}/>
              {payErr && <div style={sharedSt.errBox}>{payErr}</div>}
            </div>
            <div style={sharedSt.dFoot}>
              <button style={sharedSt.ghostBtn} onClick={()=>setPayOpen(false)} disabled={payBusy}>Cancel</button>
              <button style={{ ...sharedSt.ctaBtn, marginLeft:"auto" }} onClick={savePayment} disabled={payBusy}>{payBusy?"Saving…":"Save payment"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ PURCHASE MODAL ════════════════════════════════ */}
      {purOpen && (
        <div style={sharedSt.backdrop} onClick={() => !purBusy && setPurOpen(false)}>
          <div style={{ ...sharedSt.drawer, maxWidth:680 }} onClick={e=>e.stopPropagation()}>
            <div style={sharedSt.dHead}>
              <h3 style={sharedSt.dTitle}>Record purchase from {s.name}</h3>
              <button style={sharedSt.closeBtn} onClick={()=>setPurOpen(false)}><Icon name="x" size={18}/></button>
            </div>
            <div style={sharedSt.dBody}>
              <div style={sharedSt.row2}>
                <label style={sharedSt.field}><span style={sharedSt.lbl}>Bill / Challan no (optional)</span>
                  <input style={sharedSt.inp} value={purForm.billNo} onChange={e=>setPurForm(p=>({...p,billNo:e.target.value}))} placeholder="e.g. INV-2024-001"/></label>
                <label style={sharedSt.field}><span style={sharedSt.lbl}>Bill date</span>
                  <input style={sharedSt.inp} type="date" value={purForm.billDate} onChange={e=>setPurForm(p=>({...p,billDate:e.target.value}))}/></label>
              </div>
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:BODY, marginBottom:8 }}>Items purchased</div>
                <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1.8fr) 72px 90px 76px 28px", gap:6, marginBottom:6 }}>
                  {["Category → Item","Qty","Rate (₹)","Unit",""].map(h=>(
                    <div key={h} style={{ fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.6 }}>{h}</div>
                  ))}
                </div>
                {purLines.map(l=>(
                  <div key={l.id} style={{ display:"grid", gridTemplateColumns:"minmax(0,1.8fr) 72px 90px 76px 28px", gap:6, marginBottom:8, alignItems:"start" }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      <select style={{ ...sharedSt.inp, fontSize:12 }} value={l.category} onChange={e => {
                        setPurLines(lines => lines.map(r => r.id === l.id ? { ...r, category: e.target.value, itemId:"", name:"", unit:"piece" } : r));
                      }}>
                        <option value="">— select category —</option>
                        {stockCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {l.category ? (
                        <select style={{ ...sharedSt.inp, fontSize:12 }} value={l.itemId} onChange={e => {
                          const picked = stockItems.find(s => s.id === e.target.value);
                          setPurLines(lines => lines.map(r => r.id === l.id ? { ...r, itemId: e.target.value, name: picked?.name||"", unit: picked?.unit||"piece" } : r));
                        }}>
                          <option value="">— select item —</option>
                          {stockItems.filter(si => si.category === l.category).map(si => (
                            <option key={si.id} value={si.id}>{si.name} ({si.sku})</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ fontSize:11, color:MUTE, padding:"6px 2px", fontStyle:"italic" }}>Pick a category first</div>
                      )}
                    </div>
                    <input style={{ ...sharedSt.inp, textAlign:"right" }} type="number" min="0" value={l.qty} onChange={e=>setPurLine(l.id,"qty",e.target.value)}/>
                    <input style={{ ...sharedSt.inp, textAlign:"right" }} type="number" min="0" placeholder="0" value={l.rate} onChange={e=>setPurLine(l.id,"rate",e.target.value)}/>
                    <select style={sharedSt.inp} value={l.unit} onChange={e=>setPurLine(l.id,"unit",e.target.value)}>
                      {["piece","sqft","metre","roll","sheet","litre","kg","box","set"].map(u=>(
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <button style={{ background:"none", border:"none", cursor:"pointer", color:MUTE, fontSize:16, lineHeight:1, paddingTop:8 }}
                      onClick={()=>setPurLines(l2=>l2.length>1?l2.filter(r=>r.id!==l.id):l2)}>×</button>
                  </div>
                ))}
                <button style={{ ...sharedSt.ghostBtn, marginTop:4, fontSize:12, padding:"7px 14px" }} onClick={addPurLine}>
                  <Icon name="plus" size={13}/> Add line
                </button>
              </div>
              {(() => {
                const lines = purLines.filter(l=>(l.itemId||l.name.trim())&&dec(l.qty)>0&&dec(l.rate)>0);
                const sub   = lines.reduce((s,l)=>s+dec(l.qty)*dec(l.rate),0);
                const disc  = purForm.discType==="percent" ? sub*dec(purForm.discVal)/100 : Math.min(dec(purForm.discVal),sub);
                const tax   = (sub-disc)*dec(purForm.taxPct)/100;
                const total = sub-disc+tax;
                return lines.length>0 ? (
                  <div style={{ marginTop:16, padding:"12px 16px", background:IVORY, border:`1px solid ${LINE}`, fontSize:13 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ color:MUTE }}>Subtotal</span><span style={{ fontVariantNumeric:"tabular-nums" }}>{rupee(sub)}</span></div>
                    {disc>0&&<div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ color:MUTE }}>Discount</span><span style={{ color:GREEN, fontVariantNumeric:"tabular-nums" }}>−{rupee(disc)}</span></div>}
                    {tax>0&&<div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ color:MUTE }}>Tax</span><span style={{ fontVariantNumeric:"tabular-nums" }}>{rupee(tax)}</span></div>}
                    <div style={{ display:"flex", justifyContent:"space-between", fontWeight:800, fontSize:15, borderTop:`1px solid ${LINE}`, paddingTop:8, marginTop:4 }}><span>Total</span><span style={{ color:TERRA, fontVariantNumeric:"tabular-nums" }}>{rupee(total)}</span></div>
                    {dec(purForm.advance)>0&&<div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}><span style={{ color:MUTE }}>Advance</span><span style={{ color:GREEN, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>−{rupee(dec(purForm.advance))}</span></div>}
                    {dec(purForm.advance)>0&&<div style={{ display:"flex", justifyContent:"space-between", fontWeight:800, marginTop:2 }}><span>Due after advance</span><span style={{ color:Math.max(total-dec(purForm.advance),0)>0?TERRA:GREEN, fontVariantNumeric:"tabular-nums" }}>{rupee(Math.max(total-dec(purForm.advance),0))}</span></div>}
                  </div>
                ) : null;
              })()}
              <label style={sharedSt.field}>
                <span style={sharedSt.lbl}>Advance Payment (₹) · paid now to supplier</span>
                <input style={{ ...sharedSt.inp, borderColor: dec(purForm.advance) > 0 ? GREEN : undefined }}
                  type="number" min="0" placeholder="0"
                  value={purForm.advance} onChange={e=>setPurForm(p=>({...p,advance:e.target.value}))}/>
                {dec(purForm.advance) > 0 && (
                  <div style={{ fontSize:11, color:GREEN, marginTop:4 }}>
                    ✓ ₹{dec(purForm.advance).toLocaleString("en-IN")} will be recorded as payment to supplier
                  </div>
                )}
              </label>
              <div style={sharedSt.row2}>
                <label style={sharedSt.field}><span style={sharedSt.lbl}>Discount (optional)</span>
                  <div style={{ display:"flex", gap:6 }}>
                    <select style={{ ...sharedSt.inp, width:70, flex:"none" }} value={purForm.discType} onChange={e=>setPurForm(p=>({...p,discType:e.target.value as "amount"|"percent"}))}>
                      <option value="amount">₹</option><option value="percent">%</option>
                    </select>
                    <input style={sharedSt.inp} type="number" min="0" value={purForm.discVal} onChange={e=>setPurForm(p=>({...p,discVal:e.target.value}))}/>
                  </div></label>
                <label style={sharedSt.field}><span style={sharedSt.lbl}>GST % (optional)</span>
                  <input style={sharedSt.inp} type="number" min="0" value={purForm.taxPct} onChange={e=>setPurForm(p=>({...p,taxPct:e.target.value}))}/></label>
              </div>
              <label style={sharedSt.field}><span style={sharedSt.lbl}>Notes</span>
                <textarea style={{ ...sharedSt.inp, minHeight:56, resize:"vertical" }} value={purForm.notes} onChange={e=>setPurForm(p=>({...p,notes:e.target.value}))}/></label>
              <PinField value={purPin} onChange={setPurPin}/>
              {purErr && <div style={sharedSt.errBox}>{purErr}</div>}
            </div>
            <div style={sharedSt.dFoot}>
              <button style={sharedSt.ghostBtn} onClick={()=>setPurOpen(false)} disabled={purBusy}>Cancel</button>
              <button style={{ ...sharedSt.ctaBtn, marginLeft:"auto" }} onClick={savePurchase} disabled={purBusy}>{purBusy?"Saving…":"Record purchase"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeletePaymentBtn({ pid, onDelete }: { pid:string; onDelete:(pid:string,pin:string)=>void }) {
  const [open, setOpen] = useState(false);
  const [pin,  setPin]  = useState("");
  if (!open) return (
    <button style={{ background:"none", border:"none", cursor:"pointer", color:MUTE, fontSize:12, fontFamily:SANS }}
      onClick={()=>setOpen(true)}>Delete</button>
  );
  return (
    <div style={{ display:"flex", gap:4, alignItems:"center" }}>
      <input style={{ width:80, padding:"4px 8px", border:`1px solid ${LINE}`, fontSize:12, fontFamily:SANS, letterSpacing:3 }}
        type="password" inputMode="numeric" placeholder="PIN" value={pin} onChange={e=>setPin(e.target.value)}/>
      <button style={{ padding:"4px 10px", background:RED, border:"none", color:"#fff", fontSize:12, fontFamily:SANS, cursor:"pointer" }}
        onClick={()=>{ onDelete(pid,pin); setOpen(false); setPin(""); }}>✓</button>
      <button style={{ padding:"4px 8px", background:"none", border:"none", color:MUTE, fontSize:13, cursor:"pointer" }}
        onClick={()=>{ setOpen(false); setPin(""); }}>✕</button>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrap:        { padding:"24px 24px 60px", display:"flex", flexDirection:"column", gap:20, fontFamily:SANS },
  pageHead:    { display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", rowGap:12 },
  backBtn:     { display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px", border:`1px solid ${LINE}`, background:CARD, color:MUTE, fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", borderRadius:0, flexShrink:0 },
  suppName:    { fontSize:22, fontWeight:900, color:INK, margin:0, letterSpacing:-.3 },
  summaryRow:  { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12 },
  sumCard:     { background:CARD, border:`1px solid ${LINE}`, padding:"18px 20px" },
  sumLabel:    { fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, marginBottom:8 },
  sumVal:      { fontSize:26, fontWeight:900, fontVariantNumeric:"tabular-nums", lineHeight:1 },
  sumSub:      { fontSize:11, color:MUTE, marginTop:6 },
  ledgerCard:  { background:CARD, border:`1px solid ${LINE}` },
  ledgerTitle: { fontSize:15, fontWeight:800, color:INK },
  ledgerSub:   { fontSize:12, color:MUTE, marginTop:2 },
  hdrFilters:  { display:"inline-flex", alignItems:"center", gap:5, flexWrap:"wrap", paddingRight:10, marginRight:2, borderRight:`1px solid ${LINE}` },
  hInp:        { padding:"7px 9px", border:`1px solid ${LINE}`, background:CARD, color:INK, fontSize:12.5, fontFamily:SANS, outline:"none", cursor:"pointer" },
  hReset:      { width:30, height:30, border:`1px solid ${LINE}`, background:IVORY, color:MUTE, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:SANS },
  th:          { padding:"11px 16px", textAlign:"left", fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, borderBottom:`2px solid ${LINE}`, background:IVORY, whiteSpace:"nowrap" },
  td:          { padding:"13px 16px", borderBottom:`1px solid ${LINE}`, verticalAlign:"top" },
};