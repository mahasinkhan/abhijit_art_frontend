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
  AMBER, RED, RED_LT, SANS, dec, rupee, rfmt, dtfmt, sharedSt,
} from "./types";

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

// ── Ledger entry (merged purchases + payments sorted by date) ─────────────────
type LedgerRow =
  | { kind:"purchase"; date:string; data:Purchase; running:number }
  | { kind:"payment";  date:string; data:SupplierPayment; running:number };

function buildLedger(purchases: any[] = [], payments: any[] = []): LedgerRow[] {
  const safeP = Array.isArray(purchases) ? purchases : [];
  const safePay = Array.isArray(payments) ? payments : [];
  const rows: LedgerRow[] = [
    ...safeP.map(p => ({
      kind:"purchase" as const,
      date: String(p?.billDate || p?.createdAt || p?.date || ""),
      data: p as Purchase,
      running: 0,
    })),
    ...safePay.map(p => ({
      kind:"payment" as const,
      date: String(p?.paidAt || p?.createdAt || p?.date || ""),
      data: p as SupplierPayment,
      running: 0,
    })),
  ];
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
  return rows;
}

// ── Purchase detail accordion ─────────────────────────────────────────────────
function PurchaseDetail({ p }: { p: any }) {
  const [open,  setOpen]  = useState(false);
  const [lines, setLines] = useState<any[]>([]);
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

// Local styles for PurchaseDetail
const st2 = {
  expandBtn: { fontSize:11.5, fontWeight:700, color:TERRA, background:"none", border:"none", cursor:"pointer", padding:"4px 0", fontFamily:SANS, marginTop:4 } as React.CSSProperties,
};

// ═════════════════════════════════════════════════════════════════════════════
interface Props {
  supplierId: string;
  onBack:     () => void;
}

export default function SupplierStatement({ supplierId, onBack }: Props) {
  const [stmt,    setStmt]    = useState<Statement|null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // ── Stock items for purchase picker ────────────────────────────────────────
  const [stockItems, setStockItems] = useState<{id:string;name:string;unit:string;sku:string}[]>([]);
  useEffect(() => {
    api.get("/api/inventory/items").then(r => {
      const rows = Array.isArray(r.data) ? r.data : [];
      setStockItems(rows.map((it:any) => ({ id:it.id, name:it.name, unit:it.unit, sku:it.sku })));
    }).catch(()=>{});
  }, []);

  // ── Payment modal ───────────────────────────────────────────────────────────
  const [payOpen,  setPayOpen]  = useState(false);
  const [payForm,  setPayForm]  = useState({ amount:"", method:"cash" as "cash"|"online", note:"", pin:"" });
  const [payErr,   setPayErr]   = useState("");
  const [payBusy,  setPayBusy]  = useState(false);

  // ── Purchase modal ──────────────────────────────────────────────────────────
  const [purOpen,  setPurOpen]  = useState(false);
  const [purErr,   setPurErr]   = useState("");
  const [purBusy,  setPurBusy]  = useState(false);
  const [purPin,   setPurPin]   = useState("");
  const [purForm,  setPurForm]  = useState({
    billNo:"", billDate: new Date().toISOString().slice(0,10),
    discType:"amount" as "amount"|"percent", discVal:"0", taxPct:"0", notes:"",
  });
  const [purLines, setPurLines] = useState([{ id:"1", itemId:"", name:"", qty:"1", rate:"", unit:"piece" }]);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/api/inventory/suppliers/${supplierId}/statement`)
      .then(r => {
        const d = r.data;
        console.log("[SupplierStatement] raw keys:", Object.keys(d));

        // Backend returns { supplier, summary, entries:[{kind,debit,credit,...}], ... }
        const supplier = d?.supplier ?? d;
        const entries: any[] = Array.isArray(d?.entries) ? d.entries : [];

        // Split entries into purchases and payments for the UI
        const purchases = entries
          .filter((e: any) => e.kind === "purchase")
          .map((e: any) => ({
            id: e.id, billNo: e.ref || "", billDate: e.date, createdAt: e.createdAt,
            total: e.debit, notes: e.note || "",
            items: [], // detail loaded separately via GET /purchases/:id if needed
            _itemCount: e.itemCount ?? 0,
          }));
        const payments = entries
          .filter((e: any) => e.kind === "payment")
          .map((e: any) => ({
            id: e.id, amount: e.credit, method: e.method || "cash",
            note: e.note || "", paidAt: e.date, createdAt: e.createdAt,
          }));

        // Merge summary totals from backend if available
        const summary = d?.summary ?? {};
        const mergedSupplier = {
          ...supplier,
          totalPurchased: summary.totalPurchased ?? supplier.totalPurchased,
          totalPaid:      summary.totalPaid      ?? supplier.totalPaid,
          lastPurchaseAt: supplier.lastPurchaseAt,
        };

        // Store raw entries for the ledger (use the backend's running balance)
        setStmt({
          supplier:  mergedSupplier,
          purchases,
          payments,
          // store raw entries with balance for the ledger table
          _entries:  entries,
        } as any);
      })
      .catch(e => {
        console.error("[SupplierStatement] error:", e);
        setError("Couldn't load supplier statement.");
      })
      .finally(() => setLoading(false));
  }, [supplierId]);

  useEffect(() => { load(); }, [load]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const totalPurchased = dec(stmt?.supplier.totalPurchased);
  const totalPaid      = dec(stmt?.supplier.totalPaid);
  const outstanding    = Math.max(totalPurchased - totalPaid, 0);

  // Use backend entries (already has running balance) if available, else rebuild
  const rawEntries: any[] = (stmt as any)?._entries ?? [];
  const ledger: LedgerRow[] = rawEntries.length > 0
    ? rawEntries.map((e: any) => ({
        kind:    e.kind,
        date:    e.date || e.createdAt || "",
        running: dec(e.balance),
        data:    e.kind === "purchase"
          ? { id:e.id, billNo:e.ref||"", billDate:e.date, createdAt:e.createdAt,
              total:e.debit, notes:e.note||"", items:[], _itemCount:e.itemCount??0 } as any
          : { id:e.id, amount:e.credit, method:e.method||"cash",
              note:e.note||"", paidAt:e.date, createdAt:e.createdAt } as any,
      }))
    : stmt ? buildLedger(stmt.purchases, stmt.payments) : [];

  // ── Record payment ───────────────────────────────────────────────────────────
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

  // ── Delete payment ───────────────────────────────────────────────────────────
  const deletePayment = async (pid: string, pin: string) => {
    if (!pin) return;
    try {
      await api.delete(`/api/inventory/suppliers/${supplierId}/payments/${pid}`, { data:{ pin } });
      load();
    } catch(e:any) { alert(e?.response?.data?.error || "Couldn't delete."); }
  };

  // ── Record purchase ──────────────────────────────────────────────────────────
  const addPurLine = () => setPurLines(l => [...l, { id:Date.now().toString(), itemId:"", name:"", qty:"1", rate:"", unit:"piece" }]);
  const setPurLine = (id:string, k:string, v:string) => setPurLines(l => l.map(r => r.id===id ? {...r,[k]:v} : r));

  const savePurchase = async () => {
    const lines = purLines.filter(l => (l.name.trim()||l.itemId) && dec(l.qty) > 0 && dec(l.rate) > 0);
    if (!lines.length) { setPurErr("Add at least one valid line item."); return; }
    if (!purPin) { setPurErr("Enter your security PIN."); return; }
    setPurBusy(true); setPurErr("");
    try {
      await api.post(`/api/inventory/purchases`, {
        supplierId,
        billNo:   purForm.billNo, billDate: purForm.billDate,
        discType: purForm.discType, discVal: dec(purForm.discVal),
        taxPct:   dec(purForm.taxPct), notes: purForm.notes,
        items:    lines.map(l => ({ itemId: l.itemId||null, name:l.name.trim(), quantity:dec(l.qty), rate:dec(l.rate), unit:l.unit })),
        pin: purPin,
      });
      setPurOpen(false); setPurPin(""); setPurErr("");
      setPurForm({ billNo:"", billDate:new Date().toISOString().slice(0,10), discType:"amount", discVal:"0", taxPct:"0", notes:"" });
      setPurLines([{ id:"1", itemId:"", name:"", qty:"1", rate:"", unit:"piece" }]);
      load();
    } catch(e:any) { setPurErr(e?.response?.data?.error || "Couldn't save purchase."); }
    finally { setPurBusy(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) return <div style={{ padding:60, textAlign:"center", color:MUTE, fontFamily:SANS }}>Loading…</div>;
  if (error)   return <div style={{ padding:60, textAlign:"center", color:TERRA, fontFamily:SANS }}>{error}</div>;
  if (!stmt)   return null;

  const s = stmt.supplier;

  return (
    <div style={st.wrap}>

      {/* ── Back + header ───────────────────────────────────────────────── */}
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
        <div style={{ display:"flex", gap:10, flexShrink:0 }}>
          <button className="inv-ghost" style={sharedSt.ghostBtn} onClick={() => setPurOpen(true)}>
            <Icon name="plus" size={14}/> Record purchase
          </button>
          <button className="inv-cta" style={sharedSt.ctaBtn} onClick={() => setPayOpen(true)}
            disabled={outstanding <= 0}>
            <Icon name="plus" size={14} color="#fff"/> Record payment
          </button>
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div style={st.summaryRow}>
        <div style={st.sumCard}>
          <div style={st.sumLabel}>Total Purchased</div>
          <div style={{ ...st.sumVal, color:INK }}>{rupee(totalPurchased)}</div>
          <div style={st.sumSub}>{(stmt.purchases||[]).length} purchase{(stmt.purchases||[]).length!==1?"s":""}</div>
        </div>
        <div style={st.sumCard}>
          <div style={st.sumLabel}>Total Paid</div>
          <div style={{ ...st.sumVal, color:GREEN }}>{rupee(totalPaid)}</div>
          <div style={st.sumSub}>{(stmt.payments||[]).length} payment{(stmt.payments||[]).length!==1?"s":""}</div>
        </div>
        <div style={{ ...st.sumCard, background: outstanding>0?"#fff8f5":"#f0fdf4", border:`1px solid ${outstanding>0?TERRA+"33":GREEN+"33"}` }}>
          <div style={st.sumLabel}>Balance Due</div>
          <div style={{ ...st.sumVal, color: outstanding>0?TERRA:GREEN }}>{rupee(outstanding)}</div>
          <div style={st.sumSub}>{outstanding>0?"Still owed to supplier":"Fully settled ✓"}</div>
        </div>
        {s.lastPurchaseAt && (
          <div style={st.sumCard}>
            <div style={st.sumLabel}>Last purchase</div>
            <div style={{ fontSize:15, fontWeight:700, color:INK, marginTop:6 }}>{dtfmt(s.lastPurchaseAt)}</div>
          </div>
        )}
      </div>

      {/* ── Statement ───────────────────────────────────────────────────── */}
      <div style={st.ledgerCard}>
        <div style={{ padding:"16px 20px 14px", borderBottom:`1px solid ${LINE}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={st.ledgerTitle}>Statement</div>
            <div style={st.ledgerSub}>Newest first · {ledger.length} transaction{ledger.length!==1?"s":""}</div>
          </div>
        </div>

        {ledger.length === 0 ? (
          <div style={{ padding:"48px 0", textAlign:"center", color:MUTE, fontSize:14 }}>
            No transactions yet. Record a purchase to get started.
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
                  const isPurchase = row.kind === "purchase";
                  const p          = row.data as any;
                  const amount     = dec(p.total ?? p.debit ?? p.amount ?? p.credit ?? 0);
                  const itemCount  = p._itemCount ?? (p.items||[]).length ?? 0;

                  return (
                    <tr key={p.id||i} style={{ background: i%2===0 ? CARD : IVORY, borderLeft:`3px solid ${isPurchase?TERRA:GREEN}` }}>

                      {/* Date */}
                      <td style={{ ...st.td, whiteSpace:"nowrap", color:MUTE, fontSize:12 }}>
                        <div>{dtfmt(row.date||p.createdAt||"").split(",")[0]}</div>
                        <div style={{ fontSize:10.5, marginTop:2 }}>{dtfmt(row.date||p.createdAt||"").split(",")[1]?.trim()}</div>
                      </td>

                      {/* Type badge */}
                      <td style={st.td}>
                        <span style={{
                          display:"inline-block", padding:"3px 9px", fontSize:11, fontWeight:700,
                          background: isPurchase?"#fff2ee":GREEN_LT, color:isPurchase?TERRA:GREEN,
                        }}>
                          {isPurchase ? "Purchase" : "Payment"}
                        </span>
                      </td>

                      {/* Details */}
                      <td style={{ ...st.td, maxWidth:280 }}>
                        <div style={{ fontWeight:700, color:INK, marginBottom:2 }}>
                          {isPurchase
                            ? (p.billNo ? `Bill #${p.billNo}` : "Purchase bill")
                            : (p.method ? p.method.charAt(0).toUpperCase()+p.method.slice(1) : "Cash")}
                        </div>
                        {p.note && <div style={{ fontSize:11.5, color:MUTE, marginBottom:3 }}>{p.note}</div>}
                        {isPurchase && itemCount > 0 && (
                          <div style={{ fontSize:11.5, color:MUTE, marginBottom:4 }}>
                            {itemCount} item{itemCount!==1?"s":""}
                          </div>
                        )}
                        {/* Expandable item lines */}
                        {isPurchase && <PurchaseDetail p={p}/>}
                      </td>

                      {/* Debit */}
                      <td style={{ ...st.td, textAlign:"right", fontWeight:700, color:TERRA, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" }}>
                        {isPurchase ? rupee(amount) : <span style={{ color:MUTE }}>—</span>}
                      </td>

                      {/* Credit */}
                      <td style={{ ...st.td, textAlign:"right", fontWeight:700, color:GREEN, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" }}>
                        {!isPurchase ? rupee(amount) : <span style={{ color:MUTE }}>—</span>}
                      </td>

                      {/* Running balance */}
                      <td style={{ ...st.td, textAlign:"right", fontWeight:800, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap",
                        color: row.running > 0 ? TERRA : GREEN }}>
                        {rupee(row.running)}
                      </td>

                      {/* Delete */}
                      <td style={{ ...st.td, textAlign:"right", whiteSpace:"nowrap" }}>
                        {!isPurchase && <DeletePaymentBtn pid={p.id} onDelete={deletePayment}/>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:IVORY, borderTop:`2px solid ${LINE}` }}>
                  <td colSpan={3} style={{ ...st.td, fontWeight:700, color:INK }}>Total</td>
                  <td style={{ ...st.td, textAlign:"right", fontWeight:800, color:TERRA, fontVariantNumeric:"tabular-nums" }}>{rupee(totalPurchased)}</td>
                  <td style={{ ...st.td, textAlign:"right", fontWeight:800, color:GREEN, fontVariantNumeric:"tabular-nums" }}>{rupee(totalPaid)}</td>
                  <td style={{ ...st.td, textAlign:"right", fontWeight:900, fontSize:15, fontVariantNumeric:"tabular-nums",
                    color:outstanding>0?TERRA:GREEN }}>{rupee(outstanding)} {outstanding<=0?"✓":""}</td>
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
              {/* Balance preview */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, background:LINE, border:`1px solid ${LINE}`, marginBottom:18 }}>
                {[
                  { label:"Outstanding",  val:rupee(outstanding),                              color:TERRA },
                  { label:"After payment",val:rupee(Math.max(outstanding-dec(payForm.amount),0)), color:Math.max(outstanding-dec(payForm.amount),0)===0?GREEN:AMBER },
                ].map(b=>(
                  <div key={b.label} style={{ background:CARD, padding:"14px 18px", textAlign:"center" }}>
                    <div style={{ fontSize:10.5, color:MUTE, textTransform:"uppercase", letterSpacing:.7, marginBottom:5 }}>{b.label}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:b.color, fontVariantNumeric:"tabular-nums" }}>{b.val}</div>
                  </div>
                ))}
              </div>
              <label style={sharedSt.field}><span style={sharedSt.lbl}>Amount (₹)</span>
                <input style={sharedSt.inp} type="number" min="1" autoFocus
                  value={payForm.amount} onChange={e=>setPayForm(p=>({...p,amount:e.target.value}))}/></label>
              <label style={sharedSt.field}><span style={sharedSt.lbl}>Payment method</span>
                <div style={{ display:"flex", border:`1px solid ${LINE}` }}>
                  {(["cash","online"] as const).map((m,i)=>(
                    <button key={m} type="button"
                      style={{ flex:1, padding:"10px 0", border:"none", borderLeft:i>0?`1px solid ${LINE}`:"none",
                        background:payForm.method===m?TERRA:CARD, color:payForm.method===m?"#fff":BODY,
                        fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", textTransform:"capitalize" }}
                      onClick={()=>setPayForm(p=>({...p,method:m}))}>{m}</button>
                  ))}
                </div></label>
              <label style={sharedSt.field}><span style={sharedSt.lbl}>Note (optional) · e.g. UPI ref, cheque no</span>
                <input style={sharedSt.inp} value={payForm.note} onChange={e=>setPayForm(p=>({...p,note:e.target.value}))}/></label>
              <PinField value={payForm.pin} onChange={v=>setPayForm(p=>({...p,pin:v}))}/>
              {payErr && <div style={sharedSt.errBox}>{payErr}</div>}
            </div>
            <div style={sharedSt.dFoot}>
              <button style={sharedSt.ghostBtn} onClick={()=>setPayOpen(false)} disabled={payBusy}>Cancel</button>
              <button style={{ ...sharedSt.ctaBtn, marginLeft:"auto" }} onClick={savePayment} disabled={payBusy}>
                {payBusy?"Saving…":"Save payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ PURCHASE MODAL ════════════════════════════════ */}
      {purOpen && (
        <div style={sharedSt.backdrop} onClick={() => !purBusy && setPurOpen(false)}>
          <div style={{ ...sharedSt.drawer, maxWidth:640 }} onClick={e=>e.stopPropagation()}>
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

              {/* Line items */}
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:BODY, marginBottom:8 }}>Items purchased</div>
                <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1.4fr) 72px 90px 76px 28px", gap:6, marginBottom:6 }}>
                  {["Item","Qty","Rate (₹)","Unit",""].map(h=>(
                    <div key={h} style={{ fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.6 }}>{h}</div>
                  ))}
                </div>
                {purLines.map(l=>(
                  <div key={l.id} style={{ display:"grid", gridTemplateColumns:"minmax(0,1.4fr) 72px 90px 76px 28px", gap:6, marginBottom:6, alignItems:"center" }}>
                    {/* Item picker — dropdown if we have items, else free text */}
                    {stockItems.length > 0 ? (
                      <select style={sharedSt.inp} value={l.itemId||""} onChange={e => {
                        const picked = stockItems.find(s => s.id === e.target.value);
                        setPurLine(l.id, "itemId", e.target.value);
                        if (picked) {
                          setPurLine(l.id, "name", picked.name);
                          setPurLine(l.id, "unit", picked.unit);
                        }
                      }}>
                        <option value="">— select item —</option>
                        {stockItems.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.sku})</option>
                        ))}
                      </select>
                    ) : (
                      <input style={sharedSt.inp} placeholder="Item name" value={l.name} onChange={e=>setPurLine(l.id,"name",e.target.value)}/>
                    )}
                    <input style={{ ...sharedSt.inp, textAlign:"right" }} type="number" min="0" value={l.qty} onChange={e=>setPurLine(l.id,"qty",e.target.value)}/>
                    <input style={{ ...sharedSt.inp, textAlign:"right" }} type="number" min="0" placeholder="0" value={l.rate} onChange={e=>setPurLine(l.id,"rate",e.target.value)}/>
                    <select style={sharedSt.inp} value={l.unit} onChange={e=>setPurLine(l.id,"unit",e.target.value)}>
                      {["piece","sqft","metre","roll","sheet","litre","kg","box","set"].map(u=>(
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <button style={{ background:"none", border:"none", cursor:"pointer", color:MUTE, fontSize:16, lineHeight:1 }}
                      onClick={()=>setPurLines(l2=>l2.length>1?l2.filter(r=>r.id!==l.id):l2)}>×</button>
                  </div>
                ))}
                <button style={{ ...sharedSt.ghostBtn, marginTop:4, fontSize:12, padding:"7px 14px" }} onClick={addPurLine}>
                  <Icon name="plus" size={13}/> Add line
                </button>
              </div>

              {/* Totals preview */}
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
                  </div>
                ) : null;
              })()}

              <div style={sharedSt.row2}>
                <label style={sharedSt.field}><span style={sharedSt.lbl}>Discount</span>
                  <div style={{ display:"flex", gap:6 }}>
                    <select style={{ ...sharedSt.inp, width:70, flex:"none" }} value={purForm.discType} onChange={e=>setPurForm(p=>({...p,discType:e.target.value as "amount"|"percent"}))}>
                      <option value="amount">₹</option><option value="percent">%</option>
                    </select>
                    <input style={sharedSt.inp} type="number" min="0" value={purForm.discVal} onChange={e=>setPurForm(p=>({...p,discVal:e.target.value}))}/>
                  </div></label>
                <label style={sharedSt.field}><span style={sharedSt.lbl}>GST %</span>
                  <input style={sharedSt.inp} type="number" min="0" value={purForm.taxPct} onChange={e=>setPurForm(p=>({...p,taxPct:e.target.value}))}/></label>
              </div>
              <label style={sharedSt.field}><span style={sharedSt.lbl}>Notes</span>
                <textarea style={{ ...sharedSt.inp, minHeight:56, resize:"vertical" }} value={purForm.notes} onChange={e=>setPurForm(p=>({...p,notes:e.target.value}))}/></label>
              <PinField value={purPin} onChange={setPurPin}/>
              {purErr && <div style={sharedSt.errBox}>{purErr}</div>}
            </div>
            <div style={sharedSt.dFoot}>
              <button style={sharedSt.ghostBtn} onClick={()=>setPurOpen(false)} disabled={purBusy}>Cancel</button>
              <button style={{ ...sharedSt.ctaBtn, marginLeft:"auto" }} onClick={savePurchase} disabled={purBusy}>
                {purBusy?"Saving…":"Record purchase"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inline delete button with PIN confirm ─────────────────────────────────────
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

// ── Styles ────────────────────────────────────────────────────────────────────
const st: Record<string, React.CSSProperties> = {
  wrap:        { padding:"24px 24px 60px", display:"flex", flexDirection:"column", gap:20, fontFamily:SANS },
  pageHead:    { display:"flex", alignItems:"flex-start", gap:16, flexWrap:"wrap" },
  backBtn:     { display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px", border:`1px solid ${LINE}`, background:CARD, color:MUTE, fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", borderRadius:0, flexShrink:0 },
  suppName:    { fontSize:22, fontWeight:900, color:INK, margin:0, letterSpacing:-.3 },
  summaryRow:  { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12 },
  sumCard:     { background:CARD, border:`1px solid ${LINE}`, padding:"18px 20px" },
  sumLabel:    { fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, marginBottom:8 },
  sumVal:      { fontSize:26, fontWeight:900, fontVariantNumeric:"tabular-nums", lineHeight:1 },
  sumSub:      { fontSize:11, color:MUTE, marginTop:6 },
  ledgerCard:  { background:CARD, border:`1px solid ${LINE}` },
  ledgerHead:  { padding:"16px 20px", borderBottom:`1px solid ${LINE}` },
  ledgerTitle: { fontSize:15, fontWeight:800, color:INK },
  ledgerSub:   { fontSize:12, color:MUTE, marginTop:2 },
  stmtHdr:     { display:"flex", alignItems:"center", padding:"9px 20px", background:IVORY, borderBottom:`1px solid ${LINE}`, fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.7 } as React.CSSProperties,
  stmtRow:     { display:"flex", alignItems:"flex-start", padding:"14px 20px", borderBottom:`1px solid ${LINE}`, gap:12, background:CARD, transition:"background .15s" } as React.CSSProperties,
  stmtTotal:   { display:"flex", alignItems:"center", padding:"14px 20px", background:IVORY, borderTop:`2px solid ${LINE}`, fontSize:13 } as React.CSSProperties,
  table:       { width:"100%", borderCollapse:"collapse", fontSize:13.5 },
  th:          { padding:"11px 16px", textAlign:"left", fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, borderBottom:`2px solid ${LINE}`, background:IVORY, whiteSpace:"nowrap" },
  td:          { padding:"13px 16px", borderBottom:`1px solid ${LINE}`, verticalAlign:"top" },
  pill:        { display:"inline-block", padding:"3px 10px", fontSize:11, fontWeight:700, borderRadius:2 },
  detailBtn:   { fontSize:11, fontWeight:700, color:TERRA, background:"none", border:"none", cursor:"pointer", padding:"4px 0", fontFamily:SANS, marginTop:4 },
};