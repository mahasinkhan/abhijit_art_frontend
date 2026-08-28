// src/components/quick-order/LedgerDrill.tsx
import { useState } from "react";
import api from "../../api";
import {
  QuickOrder, LedgerRow,
  TERRA, TERRA_DK, GOLD, INK, MUTE, LINE, IVORY, GREEN, SANS,
  rupees, fmtDate, TASK_STATUS,
} from "./types";

interface Props {
  row:        LedgerRow;
  entries:    QuickOrder[];
  loading:    boolean;
  ledgerDate: string;
  isAdmin:    boolean;
  onClose:    () => void;
  onEdit:     (e: QuickOrder) => void;
  onAssign:   (e: QuickOrder) => void;
  onClaim:    (id: string) => void;
  onUnassign: (id: string) => void;
  onUpdated?: (o: QuickOrder) => void;
}

const orderLabel = (e: QuickOrder) => {
  const d = fmtDate(e.entryDate);
  const name = e.title || (e.items?.[0]?.desc) || e.workDetails.slice(0, 25);
  const due = Math.max(0, Number(e.amount) - Number(e.lessAmount || 0) - Number(e.advancePaid));
  return `${d} · ${name} · Due ${rupees(due)}`;
};

export default function LedgerDrill({
  row, entries, loading, ledgerDate, isAdmin,
  onClose, onEdit, onAssign, onClaim, onUnassign, onUpdated,
}: Props) {
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");
  const [filtered, setFiltered] = useState(false);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [payOrderId,  setPayOrderId]  = useState<string | null>(null);
  const [payAmount,   setPayAmount]   = useState("");
  const [payMethod,   setPayMethod]   = useState<"cash"|"online">("cash");
  const [payNote,     setPayNote]     = useState("");
  const [payBusy,     setPayBusy]     = useState(false);
  const [payErr,      setPayErr]      = useState("");

  const stmtEntries = filtered ? entries.filter(e => {
    const d = new Date(e.entryDate);
    if (fromDate && d < new Date(fromDate)) return false;
    if (toDate   && d > new Date(toDate + "T23:59:59")) return false;
    return true;
  }) : entries;

  const stmtTotal = stmtEntries.reduce((s, e) => s + Number(e.amount), 0);
  const stmtLess  = stmtEntries.reduce((s, e) => s + Number(e.lessAmount || 0), 0);
  const stmtPaid  = stmtEntries.reduce((s, e) => s + Number(e.advancePaid), 0);
  const stmtDue   = Math.max(0, stmtTotal - stmtLess - stmtPaid);

  // Only orders with due > 0 in the dropdown
  const payableOrders = entries.filter(e => {
    if (e.status === "billed") return false;
    const due = Math.max(0, Number(e.amount) - Number(e.lessAmount || 0) - Number(e.advancePaid));
    return due > 0;
  });

  async function submitPayment() {
    if (!payOrderId) return;
    const n = parseFloat(payAmount);
    if (!n || n <= 0) { setPayErr("Enter a valid amount."); return; }
    setPayBusy(true); setPayErr("");
    try {
      const { data } = await api.post(`/api/quick-orders/${payOrderId}/payment`, {
        amount: n, method: payMethod, note: payNote.trim() || "Payment",
      });
      onUpdated?.(data);
      setPayOrderId(null); setPayAmount(""); setPayNote(""); setPayMethod("cash");
    } catch (err: any) {
      setPayErr(err.response?.data?.message || "Failed to record payment.");
    } finally { setPayBusy(false); }
  }

  function printStatement() {
    const rows = stmtEntries.map((e, i) => {
      const amt = Number(e.amount), less = Number(e.lessAmount||0), adv = Number(e.advancePaid);
      const due = Math.max(0, amt - less - adv);
      return `<tr style="background:${i%2===0?"#fff":"#fafafa"}"><td>${fmtDate(e.entryDate)}</td><td>${e.title||"—"}</td><td style="max-width:220px;white-space:pre-line">${e.workDetails||"—"}</td><td style="text-align:right;font-weight:700">&#8377;${amt.toLocaleString("en-IN")}</td><td style="text-align:right;color:#b8741f">${less>0?"&#8722;&#8377;"+less.toLocaleString("en-IN"):"&#8212;"}</td><td style="text-align:right;color:#16a34a">&#8377;${adv.toLocaleString("en-IN")}</td><td style="text-align:right;color:${due>0?"#c56a3a":"#16a34a"};font-weight:700">${due>0?"&#8377;"+due.toLocaleString("en-IN"):"Paid"}</td></tr>`;
    }).join("");
    const period = fromDate||toDate ? `${fromDate?fmtDate(fromDate+"T00:00:00"):"Start"} to ${toDate?fmtDate(toDate+"T00:00:00"):"Today"}` : "All time";
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Statement - ${row.customerName}</title><style>body{font-family:'Segoe UI',sans-serif;padding:32px;color:#1a1a2e;font-size:13px}h1{font-size:20px;margin:0 0 4px}.sub{color:#6b7280;font-size:12px;margin-bottom:20px}table{width:100%;border-collapse:collapse}th{background:#f3f4f6;text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;border-bottom:2px solid #e5e7eb}td{padding:8px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top;font-size:12.5px}tfoot td{font-weight:800;background:#f9fafb;border-top:2px solid #e5e7eb}</style></head><body><h1>Customer Statement</h1><div class="sub"><strong>${row.customerName}</strong>${row.customerPhone?" &middot; "+row.customerPhone:""}<br/>Period: ${period} &middot; ${stmtEntries.length} order${stmtEntries.length!==1?"s":""}</div><table><thead><tr><th>Date</th><th>Title</th><th>Work</th><th style="text-align:right">Amount</th><th style="text-align:right">Less</th><th style="text-align:right">Paid</th><th style="text-align:right">Due</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="3" style="text-align:right">Total</td><td style="text-align:right">&#8377;${stmtTotal.toLocaleString("en-IN")}</td><td style="text-align:right;color:#b8741f">${stmtLess>0?"&#8722;&#8377;"+stmtLess.toLocaleString("en-IN"):"&#8212;"}</td><td style="text-align:right;color:#16a34a">&#8377;${stmtPaid.toLocaleString("en-IN")}</td><td style="text-align:right;color:${stmtDue>0?"#c56a3a":"#16a34a"}">${stmtDue>0?"&#8377;"+stmtDue.toLocaleString("en-IN"):"Cleared"}</td></tr></tfoot></table><script>window.onload=()=>window.print();</script></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }

  return (
    <div className="dr-backdrop" style={st.backdrop} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{`
        .dr-close:hover{background:${IVORY}}
        .dr-mini:hover:not(:disabled){background:${IVORY}}
        .dr-btn:hover{opacity:.88}
        .dr-paybtn:hover:not(:disabled){background:${TERRA_DK}}
        .dr-seg{transition:all .12s}
        .dr-in:focus{border-color:${TERRA}!important;outline:none;box-shadow:0 0 0 3px ${TERRA}22}
        .dr-card:hover{border-color:#cec6bc}
        .dr-modal{scroll-behavior:smooth;-webkit-overflow-scrolling:touch}
        .dr-modal::-webkit-scrollbar{width:6px}
        .dr-modal::-webkit-scrollbar-track{background:transparent}
        .dr-modal::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px}
        .dr-modal::-webkit-scrollbar-thumb:hover{background:#bbb}
        .dr-backdrop{overflow-y:auto;-webkit-overflow-scrolling:touch}
      `}</style>

      <div className="dr-modal" style={st.modal} onClick={e => e.stopPropagation()}>

        {/* ── Top bar: Name + phone + filters + statement + close ── */}
        <div style={st.topBar}>
          <div style={{ flex:1, minWidth:0 }}>
            <h2 style={st.name}>{row.customerName}</h2>
            <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", marginTop:4 }}>
              {row.customerPhone && <span style={st.phone}>{row.customerPhone}</span>}
              <span style={{ width:1, height:14, background:LINE }}/>
              <input type="date" className="dr-in" value={fromDate} onChange={e => setFromDate(e.target.value)} style={st.dateInp}/>
              <span style={{ color:MUTE, fontSize:11 }}>to</span>
              <input type="date" className="dr-in" value={toDate} onChange={e => setToDate(e.target.value)} style={st.dateInp}/>
              <button className="dr-btn" style={st.filterBtn} onClick={() => setFiltered(true)}>Filter</button>
              {filtered && <button className="dr-btn" style={st.clearBtn} onClick={() => { setFromDate(""); setToDate(""); setFiltered(false); }}>Clear</button>}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"flex-start", flexShrink:0 }}>
            <button className="dr-btn" style={st.stmtBtn} onClick={printStatement}>Statement</button>
            <button className="dr-close" style={st.close} onClick={onClose}>×</button>
          </div>
        </div>

        {/* ── Summary strip ── */}
        <div style={st.strip}>
          <div style={st.stripItem}>
            <span style={st.stripL}>Billed</span>
            <span style={{ ...st.stripV, color:"#c2974a" }}>{rupees(row.totalAmount)}</span>
            <span style={st.stripSub}>{row.totalOrders} order{row.totalOrders!==1?"s":""}</span>
          </div>
          <div style={st.stripItem}>
            <span style={st.stripL}>Paid</span>
            <span style={{ ...st.stripV, color:GREEN }}>{rupees(row.totalAdvance)}</span>
          </div>
          <div style={{ ...st.stripItem, ...(row.totalDue > 0 ? { background:"#fef2ee", borderColor:"#f5c4bb" } : { background:"#f0fdf4", borderColor:"#bbf7d0" }) }}>
            <span style={st.stripL}>Due</span>
            <span style={{ ...st.stripV, color: row.totalDue > 0 ? TERRA : GREEN }}>
              {row.totalDue > 0 ? rupees(row.totalDue) : "Cleared"}
            </span>
          </div>
        </div>

        {/* ── Record Payment ── */}
        {isAdmin && payableOrders.length > 0 && (
          <div style={st.payBox}>
            <div style={{ fontSize:13, fontWeight:800, color:INK, marginBottom:10 }}>Record Payment</div>
            {payErr && <div style={st.payErr}>{payErr}</div>}
            <div style={{ display:"grid", gridTemplateColumns:"120px 1fr 1fr auto auto", gap:10, alignItems:"end" }}>
              <div>
                <label style={st.lbl}>Amount</label>
                <input className="dr-in" style={st.inp} type="number" min="1" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="₹" />
              </div>
              <div>
                <label style={st.lbl}>Order</label>
                <select className="dr-in" style={st.inp} value={payOrderId || ""} onChange={e => setPayOrderId(e.target.value)}>
                  <option value="">Select…</option>
                  {payableOrders.map(e => <option key={e.id} value={e.id}>{orderLabel(e)}</option>)}
                </select>
              </div>
              <div>
                <label style={st.lbl}>Note</label>
                <input className="dr-in" style={st.inp} value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="optional" />
              </div>
              <div>
                <label style={st.lbl}>Method</label>
                <div style={{ display:"flex", border:`1px solid ${LINE}`, height:38 }}>
                  {(["cash","online"] as const).map((m,i) => (
                    <button key={m} className="dr-seg" type="button"
                      style={{ padding:"0 14px", border:"none", borderLeft:i>0?`1px solid ${LINE}`:"none",
                        background: payMethod===m ? TERRA : "#fff", color: payMethod===m ? "#fff" : INK,
                        fontFamily:SANS, fontWeight:700, fontSize:12, cursor:"pointer", textTransform:"capitalize" }}
                      onClick={() => setPayMethod(m)}>{m}</button>
                  ))}
                </div>
              </div>
              <button className="dr-paybtn" type="button"
                style={{ padding:"0 20px", height:38, background: payOrderId && payAmount ? TERRA : "#ddd", color: payOrderId && payAmount ? "#fff" : "#999",
                  border:"none", fontFamily:SANS, fontWeight:700, fontSize:13, cursor: payOrderId && payAmount ? "pointer" : "not-allowed" }}
                disabled={payBusy || !payOrderId || !payAmount} onClick={submitPayment}>
                {payBusy ? "Saving…" : "Pay"}
              </button>
            </div>
          </div>
        )}

        {/* ── Count ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={st.countLbl}>{stmtEntries.length} order{stmtEntries.length!==1?"s":""}</span>
          {filtered && (
            <span style={{ fontSize:12, color:MUTE }}>
              Billed {rupees(stmtTotal)} · Paid {rupees(stmtPaid)} · Due <b style={{ color: stmtDue>0?TERRA:GREEN }}>{stmtDue>0?rupees(stmtDue):"Cleared"}</b>
            </span>
          )}
        </div>

        {/* ── Order Cards ── */}
        <div style={st.list}>
          {loading
            ? <div style={st.empty}>Loading…</div>
            : stmtEntries.length === 0
              ? <div style={st.empty}>No orders.</div>
              : stmtEntries.map(e => {
                  const amt  = Number(e.amount), less = Number(e.lessAmount||0), adv = Number(e.advancePaid);
                  const due  = Math.max(0, amt - less - adv);
                  const task = e.task;
                  const ts   = task ? TASK_STATUS[task.status] : null;
                  const qty  = (e as any).quantity as string | undefined;
                  const delv = (e as any).expectedDelivery as string | undefined;
                  return (
                    <div key={e.id} className="dr-card" style={st.card}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"2px 16px", alignItems:"start" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", gap:4, flexWrap:"wrap", alignItems:"center", marginBottom:3 }}>
                            <span style={{ fontSize:12.5, fontWeight:700, color:INK }}>{fmtDate(e.entryDate)}</span>
                            {e.title && <span style={st.titleTag}>{e.title}</span>}
                            {task && ts
                              ? <span style={{ ...st.tag, background:ts.bg, color:ts.color }}>{ts.label}</span>
                              : e.status !== "billed" && <span style={{ ...st.tag, background:"#f3f4f6", color:MUTE }}>Unassigned</span>}
                            {e.status === "billed" && <span style={{ ...st.tag, background:"#dcfce7", color:GREEN }}>{e.invoiceNo}</span>}
                            {qty && <span style={{ fontSize:10.5, color:"#6b7280", fontWeight:600 }}>Qty: {qty}</span>}
                            {delv && (() => {
                              const d = new Date(delv), diff = Math.ceil((d.getTime() - new Date().setHours(0,0,0,0)) / 86400000);
                              const label = diff<0?`${Math.abs(diff)}d overdue`:diff===0?"Due today":diff===1?"Tomorrow":`${diff}d left`;
                              const color = diff<0?"#b91c1c":diff<=1?TERRA:diff<=3?"#92400e":GREEN;
                              const bg = diff<0?"#fee2e2":diff<=1?"#fef3c7":diff<=3?"#fef9c3":"#dcfce7";
                              return <span style={{ display:"inline-block", padding:"1px 6px", fontSize:10.5, fontWeight:700, color, background:bg }}>{label}</span>;
                            })()}
                          </div>
                          <div style={{ fontSize:13, color:INK, lineHeight:1.5, whiteSpace:"pre-line" }}>{e.workDetails || "—"}</div>
                          

                          {task && (
                            <div style={{ fontSize:11.5, color:MUTE, marginTop:4, display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ fontWeight:700, color:"#6b7280" }}>Assigned:</span> {task.assignedTo.name}
                              {isAdmin && <button style={{ border:"none", background:"none", color:MUTE, fontSize:10.5, cursor:"pointer", fontFamily:SANS, padding:0, textDecoration:"underline" }} onClick={() => onUnassign(e.id)}>Remove</button>}
                            </div>
                          )}
                        </div>
                        {/* Right: history toggle + amounts */}
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          {e.payments && e.payments.length > 0 && (
                            <button className="dr-mini" onClick={(ev) => { ev.stopPropagation(); setExpandedIds(p => { const n = new Set(p); n.has(e.id) ? n.delete(e.id) : n.add(e.id); return n; }); }}
                              style={{ fontSize:10.5, fontWeight:600, color:MUTE, background:"none", border:`1px solid ${LINE}`, padding:"2px 8px", cursor:"pointer", fontFamily:SANS, marginBottom:4 }}>
                              {expandedIds.has(e.id) ? "Hide" : `${e.payments.length} payment${e.payments.length>1?"s":""}`}
                            </button>
                          )}
                          <div style={{ fontSize:17, fontWeight:900, color:INK, fontVariantNumeric:"tabular-nums" }}>{rupees(amt)}</div>
                          {less > 0 && <div style={{ fontSize:11.5, fontWeight:700, color:GOLD }}>−{rupees(less)}</div>}
                          <div style={{ fontSize:12.5, fontWeight:800, color: due>0?TERRA:GREEN, marginTop:1 }}>
                            {due > 0 ? `Due ${rupees(due)}` : "Paid"}
                          </div>
                        </div>
                      </div>
                      {/* Payment History (expandable) */}
                      {expandedIds.has(e.id) && e.payments && e.payments.length > 0 && (
                        <div style={{ gridColumn:"1 / -1", marginTop:4, background:"#faf8f4", border:`1px solid ${LINE}`, padding:"8px 10px" }}>
                          {e.payments.map((p: any, pi: number) => (
                            <div key={p.id || pi} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12, color:INK, padding:"3px 0", borderBottom: pi < e.payments!.length - 1 ? `1px solid ${LINE}` : "none" }}>
                              <span>
                                <span style={{ color:GREEN, fontWeight:700 }}>{rupees(Number(p.amount))}</span>
                                <span style={{ color:MUTE, marginLeft:6 }}>{p.method === "online" ? "Online" : "Cash"}</span>
                                {p.note && <span style={{ color:MUTE, marginLeft:6 }}>· {p.note}</span>}
                              </span>
                              <span style={{ fontSize:11, color:MUTE }}>{fmtDate(p.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display:"flex", gap:4, marginTop:8 }}>
                        {isAdmin && e.status !== "billed" && <button className="dr-mini" style={st.mini} onClick={() => onEdit(e)}>Edit</button>}
                        {isAdmin && !task && e.status !== "billed" && <button className="dr-mini" style={st.mini} onClick={() => onAssign(e)}>Assign</button>}
                        {!isAdmin && !task && e.status !== "billed" && <button className="dr-mini" style={{ ...st.mini, color:"#92400e", borderColor:"#c2974a" }} onClick={() => onClaim(e.id)}>Claim</button>}
                        {isAdmin && due > 0 && e.status !== "billed" && (
                          <button className="dr-mini" style={{ ...st.mini, background:"#f0fdf4", borderColor:"#86efac", color:GREEN, fontWeight:700 }}
                            onClick={() => { setPayOrderId(e.id); setPayAmount(String(due)); document.querySelector<HTMLElement>('[data-pay-scroll]')?.scrollIntoView({ behavior:"smooth" }); }}>
                            Pay {rupees(due)}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
        </div>
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  backdrop:  { position:"fixed", inset:0, background:"rgba(24,22,28,.45)", backdropFilter:"blur(2px)", zIndex:1100, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 16px", overflowY:"auto", WebkitOverflowScrolling:"touch" },
  modal:     { width:"min(820px,100%)", background:"#fffdfb", margin:"auto", boxShadow:"0 24px 64px rgba(24,22,28,.28)", display:"flex", flexDirection:"column", padding:"20px 24px", fontFamily:SANS, color:INK, gap:12 },
  topBar:    { display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 },
  name:      { fontSize:20, fontWeight:900, margin:0, color:INK, lineHeight:1.2 },
  phone:     { fontSize:12.5, color:MUTE },
  close:     { width:32, height:32, border:`1px solid ${LINE}`, background:"#fff", color:"#545a67", fontSize:20, lineHeight:1, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" },
  stmtBtn:   { padding:"7px 14px", background:INK, color:"#fff", border:"none", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:SANS },
  dateInp:   { padding:"5px 8px", border:`1px solid ${LINE}`, fontSize:12, fontFamily:SANS, color:INK, background:"#fff", width:120 },
  filterBtn: { padding:"5px 12px", background:TERRA, color:"#fff", border:"none", fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:SANS },
  clearBtn:  { padding:"5px 10px", background:"none", color:MUTE, border:`1px solid ${LINE}`, fontSize:11.5, fontWeight:600, cursor:"pointer", fontFamily:SANS },
  strip:     { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:1, background:LINE, border:`1px solid ${LINE}` },
  stripItem: { background:"#fff", padding:"12px 16px" },
  stripL:    { display:"block", fontSize:10, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase" as const, color:MUTE, marginBottom:5 },
  stripV:    { display:"block", fontSize:22, fontWeight:900, fontVariantNumeric:"tabular-nums" as const, lineHeight:1 },
  stripSub:  { display:"block", fontSize:11, color:MUTE, marginTop:4 },
  payBox:    { background:"#faf8f4", border:`1px solid ${LINE}`, padding:"14px 16px" },
  payErr:    { background:"#fdecea", border:"1px solid #f3cfc2", color:"#8a2f16", padding:"6px 10px", fontSize:12, marginBottom:8 },
  lbl:       { display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:".04em", color:MUTE, marginBottom:4 },
  inp:       { width:"100%", padding:"8px 10px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:SANS, color:INK, background:"#fff", outline:"none", boxSizing:"border-box" as const, height:38 },
  countLbl:  { fontSize:10.5, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase" as const, color:MUTE },
  list:      { display:"flex", flexDirection:"column" as const, gap:4 },
  empty:     { padding:20, textAlign:"center" as const, color:MUTE, fontSize:13 },
  card:      { padding:"10px 14px", background:"#fff", border:`1px solid ${LINE}`, transition:"border-color .15s" },
  titleTag:  { fontSize:10.5, fontWeight:700, color:TERRA, background:"#fff5f0", padding:"1px 6px", border:"1px solid #f0c9b8" },
  tag:       { display:"inline-block", padding:"1px 7px", fontSize:10.5, fontWeight:700, whiteSpace:"nowrap" as const },
  mini:      { padding:"4px 12px", border:`1px solid ${LINE}`, fontSize:11.5, cursor:"pointer", fontFamily:SANS, background:"#fff", color:INK, fontWeight:600 },
};