// src/components/invoices/InvoiceTable.tsx
// ── "All Invoices" flat table ─────────────────────────────────────────────
import {
  Invoice, InvStatus, STATUSES, STATUS_META, INK, MUTE, FAINT, TERRA, GREEN,
  SOFT, LINE_COOL, LINE, CARD, SANS, WA,
  num, round2, rupee as makeRupee, fmt, effectivePaid, srcMeta, methodSummary,
  badgeStyle, sharedSt,
} from "./types";
import Icon from "./Icon";

const rupee = makeRupee;

interface Props {
  shown:       Invoice[];
  loading:     boolean;
  refreshing:  boolean;
  error:       string;
  filter:      "all" | InvStatus;
  onFilter:    (f: "all" | InvStatus) => void;
  onRetry:     () => void;
  onPrint:     (inv: Invoice) => void;
  onEdit:      (inv: Invoice) => void;
  onPay:       (inv: Invoice) => void;
  onSend:      (inv: Invoice, ch: "email" | "whatsapp") => void;
  onDelete:    (inv: Invoice) => void;
}

export default function InvoiceTable({ shown, loading, refreshing, error, filter, onFilter, onRetry, onPrint, onEdit, onPay, onSend, onDelete }: Props) {
  return (
    <>
      {/* Status filter chips */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
        {(["all", ...STATUSES] as const).map((f) => (
          <button key={f} className={`ivh-chip${filter === f ? " on" : ""}`} style={st.chip} onClick={() => onFilter(f)}>
            {f === "all" ? "All" : STATUS_META[f].label}
          </button>
        ))}
      </div>

      <div className="ivh-card" style={{ borderRadius:0, overflow:"hidden" }}>
        {loading ? (
          <div style={st.skelWrap}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="ivh-skel" style={st.skelRow} />)}</div>
        ) : error ? (
          <div style={st.empty}><p style={{ margin:0 }}>{error}</p><button className="ivh-ghost" style={{ ...sharedSt.ghostBtn, marginTop:14 }} onClick={onRetry}>Try again</button></div>
        ) : shown.length === 0 ? (
          <div style={st.empty}><span style={{ color:FAINT, display:"block", marginBottom:10 }}><Icon name="receipt" size={34} /></span><p style={{ margin:0, fontWeight:700, color:INK }}>No invoices match your filters.</p></div>
        ) : (
          <div className={refreshing ? "ivh-dim" : ""} style={{ overflowX:"auto" }}>
            <table style={st.table}>
              <thead>
                <tr>
                  {["#","Invoice No","Client","Date","Total","Due","Status","Actions"].map((h, i) => (
                    <th key={h} style={{ ...st.th, ...(i === 7 ? { textAlign:"right" } : {}), ...(i === 0 ? { width:34 } : {}) }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((inv, i) => {
                  const m   = STATUS_META[inv.status];
                  const sm  = srcMeta(inv.source);
                  const ms  = methodSummary(inv);
                  const total = num(inv.total);
                  const paid  = effectivePaid(inv);
                  const due   = round2(Math.max(total - paid, 0));
                  const editLocked = inv.status === "paid" || inv.status === "cancelled";
                  const sendLocked = inv.status === "cancelled";
                  return (
                    <tr key={inv.id} className="ivh-tr">
                      <td style={{ ...st.td, color:FAINT, textAlign:"center" }}>{i+1}</td>
                      <td style={st.td}>
                        <button className="ivh-nolink" style={st.noBtn} onClick={() => onPrint(inv)} title="Print this bill">{inv.invoiceNo}</button>
                      </td>
                      <td style={st.td}>
                        <div style={{ fontWeight:700, color:INK }}>{inv.clientName || "—"}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4, flexWrap:"wrap" }}>
                          <span style={{ ...st.srcPill, color:sm.fg, background:sm.bg, borderColor:sm.bd }}>{sm.label}</span>
                          {ms && <span style={{ ...st.methPill, color:ms.fg, background:ms.bg, borderColor:ms.bd }}><Icon name={ms.icon} size={11} /> {ms.label}</span>}
                          {(inv.clientPhone || inv.clientEmail) && <span style={st.subline}>{inv.clientPhone || inv.clientEmail}</span>}
                        </div>
                      </td>
                      <td style={{ ...st.td, whiteSpace:"nowrap", color:"#545a67" }}>{fmt(inv.date)}</td>
                      <td style={{ ...st.td, textAlign:"right", fontWeight:800, color:INK, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" }}>{rupee(total)}</td>
                      <td style={{ ...st.td, textAlign:"right", whiteSpace:"nowrap" }}>
                        {inv.status === "cancelled" ? <span style={{ color:FAINT }}>—</span> : (
                          <><div style={{ fontWeight:800, color:due>0?TERRA:GREEN, fontVariantNumeric:"tabular-nums" }}>{due>0?rupee(due):"Settled"}</div>{paid>0&&<div style={{ fontSize:11.5, color:MUTE, marginTop:3, fontVariantNumeric:"tabular-nums" }}>Paid {rupee(paid)}</div>}</>
                        )}
                      </td>
                      <td style={st.td}><span style={{ ...sharedSt.badge, ...badgeStyle(inv.status) }}>{m.label}</span></td>
                      <td style={{ ...st.td, textAlign:"right", whiteSpace:"nowrap" }}>
                        <button className="ivh-icon" style={sharedSt.iconBtn} onClick={() => onEdit(inv)}  disabled={editLocked} title={editLocked?"Locked":"Edit"}><Icon name="edit" size={16}/></button>
                        <button className="ivh-icon" style={sharedSt.iconBtn} onClick={() => onPay(inv)}   title="Payments"><Icon name="banknote" size={17}/></button>
                        <button className="ivh-icon" style={sharedSt.iconBtn} onClick={() => onPrint(inv)} title="Print"><Icon name="download" size={16}/></button>
                        <button className="ivh-icon" style={sharedSt.iconBtn} onClick={() => onSend(inv,"email")} disabled={sendLocked} title="Email"><Icon name="mail" size={16}/></button>
                        <button className="ivh-icon ivh-wa" style={sharedSt.iconBtn} onClick={() => onSend(inv,"whatsapp")} disabled={sendLocked} title="WhatsApp"><span style={{ color:WA, display:"inline-flex" }}><Icon name="whatsapp" size={17}/></span></button>
                        <button className="ivh-icon ivh-danger" style={sharedSt.iconBtn} onClick={() => onDelete(inv)} title="Delete"><Icon name="trash" size={16}/></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

const st: Record<string, React.CSSProperties> = {
  chip:     { padding:"8px 15px", borderRadius:0, border:`1px solid #f0e6dc`, background:"#ffffff", color:"#545a67", fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" },
  skelWrap: { padding:"14px 18px" },
  skelRow:  { height:40, marginBottom:10, borderRadius:0 },
  empty:    { textAlign:"center", padding:"48px 24px", color:MUTE, fontSize:14 },
  table:    { width:"100%", borderCollapse:"collapse", fontSize:14, minWidth:1060 },
  th:       { textAlign:"left", padding:"13px 18px", fontSize:10.5, letterSpacing:0.7, textTransform:"uppercase", color:MUTE, background:SOFT, borderBottom:`1px solid ${LINE_COOL}`, fontWeight:700, whiteSpace:"nowrap" },
  td:       { padding:"14px 18px", borderBottom:"1px solid #f4f1ec", color:"#2a2f3a", verticalAlign:"top" },
  noBtn:    { border:"none", background:"transparent", padding:0, color:INK, fontFamily:SANS, fontWeight:700, fontSize:14, cursor:"pointer", fontVariantNumeric:"tabular-nums" },
  srcPill:  { display:"inline-flex", alignItems:"center", border:"1px solid", borderRadius:0, padding:"2px 7px", fontSize:10, fontWeight:700, letterSpacing:0.4, textTransform:"uppercase", whiteSpace:"nowrap" },
  methPill: { display:"inline-flex", alignItems:"center", gap:4, border:"1px solid", borderRadius:0, padding:"2px 7px 2px 6px", fontSize:10, fontWeight:700, letterSpacing:0.3, textTransform:"uppercase", whiteSpace:"nowrap" },
  subline:  { fontSize:12, color:MUTE },
};