// src/components/quick-order/OrderDetailDrawer.tsx
import { useState } from "react";
import api from "../../api";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
import {
  QuickOrder, OrderPayment, TERRA, TERRA_DK, GOLD, INK, MUTE, LINE, IVORY, CARD, GREEN, WA, SANS,
  rupees, fmtDate, fmtTimeSec, TASK_STATUS,
} from "./types";

interface Props {
  order:     QuickOrder;
  isAdmin:   boolean;
  onClose:   () => void;
  onEdit:    (o: QuickOrder) => void;
  onDelete:  (id: string) => void;
  onAssign:  (o: QuickOrder) => void;
  onUnassign:(id: string) => void;
  onUpdated: (o: QuickOrder) => void;
}

export default function OrderDetailDrawer({
  order, isAdmin, onClose, onEdit, onDelete, onAssign, onUnassign, onUpdated,
}: Props) {
  const amt = Number(order.amount);
  const less = Number(order.lessAmount || 0);
  const adv = Number(order.advancePaid);
  const due = Math.max(0, amt - less - adv);
  const task = order.task;
  const ts = task ? TASK_STATUS[task.status] : null;

  const [payAmt,    setPayAmt]    = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "online">("cash");
  const [payNote,   setPayNote]   = useState("");
  const [payBusy,   setPayBusy]   = useState(false);
  const [payErr,    setPayErr]    = useState("");
  const [showHistory, setShowHistory] = useState(false);

  async function recordPayment() {
    const n = parseFloat(payAmt);
    if (!n || n <= 0) { setPayErr("Enter a valid amount."); return; }
    setPayBusy(true); setPayErr("");
    try {
      const { data } = await api.post(`/api/quick-orders/${order.id}/payment`, {
        amount: n, method: payMethod, note: payNote,
      });
      onUpdated(data); setPayAmt(""); setPayNote("");
    } catch (err: any) {
      setPayErr(err.response?.data?.message || "Failed");
    } finally { setPayBusy(false); }
  }

  const waNum  = order.whatsapp || order.customerPhone;
  const waLink = `https://wa.me/91${waNum?.replace(/\D/g, "")}`;

  return (
    <div style={st.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>{`
        .od-hbtn:hover { background:${IVORY}; }
        .od-pay:hover:not(:disabled) { background:${TERRA_DK}; }
        .od-pm:hover { opacity:.85; }
      `}</style>

      <div style={st.drawer}>

        {/* ── Header ── */}
        <div style={st.head}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {order.title && <div style={st.titleTag}>{order.title}</div>}
            <div style={st.custName}>{order.customerName}</div>
            <div style={st.custRow}>
              {order.customerPhone && <span style={st.custMeta}>{order.customerPhone}</span>}
              {order.whatsapp && order.whatsapp !== order.customerPhone && (
                <span style={{ ...st.custMeta, color: WA }}>WA: {order.whatsapp}</span>
              )}
              {waNum && (
                <a href={waLink} target="_blank" rel="noreferrer" style={st.waBadge}>
                  💬 WhatsApp
                </a>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "flex-start" }}>
            {isAdmin && order.status !== "billed" && (
              <button className="od-hbtn" style={st.hBtn} onClick={() => onEdit(order)}>Edit</button>
            )}
            {isAdmin && order.status !== "billed" && (
              <button className="od-hbtn" style={{ ...st.hBtn, color: TERRA }} onClick={() => { if (confirm("Delete this order?")) onDelete(order.id); }}>Del</button>
            )}
            <button className="od-hbtn" style={st.hBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={st.body}>

          {/* Work Details */}
          <div style={st.workBox}>
            <div style={st.secL}>Work Details</div>
            <div style={st.workText}>{order.workDetails || "—"}</div>
            {order.description && <div style={st.note}>📝 {order.description}</div>}
          </div>

          {/* Reference Images */}
          {order.images && order.images.length > 0 && (
            <div style={st.box}>
              <div style={st.secL}>Reference Images</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                {order.images.map((img, i) => (
                  <a key={i} href={`${API_BASE}${img}`} target="_blank" rel="noreferrer">
                    <img src={`${API_BASE}${img}`} alt="" style={{ width: 72, height: 72, objectFit: "cover", border: `1px solid ${LINE}`, cursor: "zoom-in" }} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Payment + Assignment — 2 col */}
          <div style={st.twoCol}>

            {/* Payment */}
            <div style={st.box}>
              <div style={st.secL}>Payment</div>
              <div style={st.payRow}>
                <div style={st.payItem}>
                  <div style={st.payLbl}>Total</div>
                  <div style={st.payVal}>{rupees(amt)}</div>
                </div>
                <div style={st.payItem}>
                  <div style={st.payLbl}>Received</div>
                  <div style={{ ...st.payVal, color: GREEN }}>{rupees(adv)}</div>
                </div>
                <div style={st.payItem}>
                  <div style={st.payLbl}>Due</div>
                  <div style={{ ...st.payVal, color: due > 0 ? TERRA : GREEN, fontWeight: 800 }}>
                    {due > 0 ? rupees(due) : "✓ Paid"}
                  </div>
                </div>
              </div>
              {less > 0 && (
                <div style={st.lessLine}>
                  <span>Concession (Less)</span>
                  <span style={{ color: GOLD, fontWeight: 800 }}>−{rupees(less)}</span>
                </div>
              )}
              <div style={st.metaLine}>
                {order.paymentMethod === "cash" ? "💵 Cash" : "📱 Online"} · {fmtDate(order.entryDate)}
              </div>
            </div>

            {/* Assignment */}
            <div style={st.box}>
              <div style={st.secL}>Assignment</div>
              {task ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={st.empAvatar}>{task.assignedTo.name.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{task.assignedTo.name}</div>
                      {ts && <span style={{ ...st.statusChip, background: ts.bg, color: ts.color }}>{ts.label}</span>}
                    </div>
                  </div>
                  {task.notes && <div style={st.taskNotes}>{task.notes}</div>}
                  {isAdmin && (
                    <button style={st.removeBtn} onClick={() => onUnassign(order.id)}>Remove</button>
                  )}
                </div>
              ) : order.status === "billed" ? (
                <div style={st.metaLine}>Invoiced</div>
              ) : isAdmin ? (
                <button style={st.assignBtn} onClick={() => onAssign(order)}>+ Assign Employee</button>
              ) : (
                <div style={st.metaLine}>Unassigned</div>
              )}
            </div>
          </div>

          {/* Payment History — collapsible */}
          {order.payments && order.payments.length > 0 && (
            <div style={st.box}>
              <button
                onClick={() => setShowHistory(v => !v)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: SANS }}>
                <div style={st.secL}>Payment History</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>{rupees(order.payments.reduce((s, p) => s + Number(p.amount), 0))}</span>
                  <span style={{ fontSize: 11, color: MUTE }}>{order.payments.length} payment{order.payments.length > 1 ? "s" : ""} {showHistory ? "▲" : "▼"}</span>
                </div>
              </button>
              {showHistory && (
                <div style={{ marginTop: 8, borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>
                  {order.payments.map((p, i) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < order.payments!.length - 1 ? `1px solid ${IVORY}` : "none", fontSize: 12.5 }}>
                      <div>
                        <span style={{ fontWeight: 700, color: GREEN }}>+{rupees(Number(p.amount))}</span>
                        <span style={{ marginLeft: 8, color: MUTE }}>{p.method === "cash" ? "💵" : "📱"} {fmtDate(p.createdAt)}</span>
                        {p.note && <span style={{ marginLeft: 6, color: MUTE, fontStyle: "italic" }}>— {p.note}</span>}
                      </div>
                      <span style={{ fontSize: 11, color: MUTE }}>{p.createdBy?.name || ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Record Payment — compact, only if due > 0 */}
          {isAdmin && order.status !== "billed" && due > 0 && (
            <div style={st.paySection}>
              <div style={st.secL}>Record Payment</div>
              {payErr && <div style={st.errTxt}>{payErr}</div>}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <input style={st.inp} type="number" min="1" max={due}
                    value={payAmt} onChange={e => setPayAmt(e.target.value)}
                    placeholder={`Amount (max ${rupees(due)})`} />
                </div>
                <div style={{ display: "flex", border: `1px solid ${LINE}`, flexShrink: 0 }}>
                  <button className="od-pm" style={{ ...st.pmBtn, ...(payMethod === "cash" ? st.pmOn : {}) }} onClick={() => setPayMethod("cash")}>Cash</button>
                  <button className="od-pm" style={{ ...st.pmBtn, ...(payMethod === "online" ? st.pmOn : {}) }} onClick={() => setPayMethod("online")}>Online</button>
                </div>
                <button className="od-pay" style={{ ...st.payBtn, opacity: payBusy ? .6 : 1 }} disabled={payBusy} onClick={recordPayment}>
                  {payBusy ? "…" : "Record"}
                </button>
              </div>
              <input style={{ ...st.inp, fontSize: 12 }} value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Note (optional)" />
            </div>
          )}

          {/* Items — compact list */}
          {order.items.length > 0 && (
            <div style={st.box}>
              <div style={st.secL}>Items</div>
              {order.items.map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "4px 0", borderBottom: i < order.items.length - 1 ? `1px solid ${IVORY}` : "none", color: INK }}>
                  <span>{Number(it.qty)}× {it.desc}{it.unit ? ` (${it.unit})` : ""}</span>
                  {Number(it.rate) > 0 && <span style={{ fontWeight: 700 }}>{rupees(Number(it.qty) * Number(it.rate))}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Status + delivered */}
          <div style={st.footRow}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {order.status === "billed"
                ? <span style={st.billedBadge}>✓ {order.invoiceNo}</span>
                : <span style={st.unbilledBadge}>Unbilled</span>}
              {order.task?.completedAt && !order.task?.startedAt && null}
              {(order.task as any)?.deliveredAt && (
                <span style={{ ...st.billedBadge, background: "#e0f2fe", color: "#0369a1" }}>
                  🚚 Delivered {fmtDate((order.task as any).deliveredAt)}
                </span>
              )}
            </div>
            <span style={st.metaLine}>{fmtTimeSec(order.createdAt)}</span>
          </div>

        </div>
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  backdrop:    { position: "fixed", inset: 0, background: "rgba(24,22,28,.35)", zIndex: 1200, display: "flex", justifyContent: "flex-end" },
  drawer:      { width: "min(560px,100vw)", height: "100vh", background: "#fff", display: "flex", flexDirection: "column", boxShadow: "-6px 0 32px rgba(20,20,25,.14)", fontFamily: SANS, color: INK, overflowY: "auto" },

  head:        { display: "flex", alignItems: "flex-start", gap: 10, padding: "13px 18px 11px", borderBottom: `1px solid ${LINE}`, flexShrink: 0, background: "#fff", position: "sticky", top: 0, zIndex: 2 },
  titleTag:    { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: TERRA, marginBottom: 3 },
  custName:    { fontSize: 16, fontWeight: 800, color: INK, lineHeight: 1.2 },
  custRow:     { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 },
  custMeta:    { fontSize: 12, color: MUTE },
  waBadge:     { display: "inline-flex", alignItems: "center", gap: 3, background: WA, color: "#fff", padding: "2px 8px", fontSize: 11, fontWeight: 700, textDecoration: "none", borderRadius: 2 },
  hBtn:        { padding: "5px 11px", border: `1px solid ${LINE}`, background: "#fff", cursor: "pointer", fontSize: 12, fontFamily: SANS, fontWeight: 600, color: INK },

  body:        { padding: "12px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 10 },

  secL:        { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: MUTE, marginBottom: 6 },

  workBox:     { background: IVORY, border: `1px solid ${LINE}`, padding: "10px 13px", borderLeft: `3px solid ${GOLD}` },
  workText:    { fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-line", color: INK },
  note:        { fontSize: 11.5, color: MUTE, marginTop: 5, fontStyle: "italic" },

  twoCol:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  box:         { border: `1px solid ${LINE}`, padding: "10px 13px" },

  payRow:      { display: "flex", gap: 0 },
  payItem:     { flex: 1, paddingRight: 8 },
  payLbl:      { fontSize: 10, color: MUTE, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 3 },
  payVal:      { fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: INK },
  metaLine:    { fontSize: 11, color: MUTE, marginTop: 5 },
  lessLine:    { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 700, color: INK, marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${LINE}` },

  empAvatar:   { width: 28, height: 28, borderRadius: "50%", background: TERRA, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 },
  statusChip:  { display: "inline-block", padding: "1px 7px", borderRadius: 2, fontSize: 10.5, fontWeight: 700, marginTop: 3 },
  taskNotes:   { fontSize: 11.5, color: MUTE, marginTop: 5, lineHeight: 1.4, fontStyle: "italic" },
  removeBtn:   { border: "none", background: "none", color: MUTE, fontSize: 11, cursor: "pointer", fontFamily: SANS, padding: "4px 0", textDecoration: "underline", display: "block", marginTop: 4 },
  assignBtn:   { padding: "7px 12px", border: `1px dashed ${LINE}`, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SANS, color: INK, width: "100%" },

  paySection:  { border: `1px solid ${LINE}`, padding: "10px 13px" },
  errTxt:      { color: TERRA, fontSize: 11.5, marginBottom: 6 },
  inp:         { width: "100%", padding: "7px 10px", border: `1px solid ${LINE}`, fontSize: 13, fontFamily: SANS, color: INK, background: "#fff", outline: "none", boxSizing: "border-box" },
  pmBtn:       { padding: "9px 18px", border: "none", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS },
  pmOn:        { background: TERRA, color: "#fff" },
  payBtn:      { padding: "9px 20px", background: TERRA, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" },

  footRow:     { display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 6, borderTop: `1px solid ${LINE}`, marginTop: 2 },
  billedBadge: { display: "inline-block", padding: "2px 8px", background: "#dcfce7", color: GREEN, fontSize: 11, fontWeight: 700, borderRadius: 2 },
  unbilledBadge:{ display: "inline-block", padding: "2px 8px", background: "#f3f4f6", color: MUTE, fontSize: 11, fontWeight: 700, borderRadius: 2 },
};