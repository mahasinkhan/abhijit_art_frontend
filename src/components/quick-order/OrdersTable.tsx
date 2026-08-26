// src/components/quick-order/OrdersTable.tsx
import {
  KhataEntry, TERRA, INK, MUTE, LINE, IVORY, CARD, GREEN, SANS,
  rupees, fmtDate, fmtTimeSec, itemsSummary,
} from "./types";

interface Props {
  entries: KhataEntry[];
  visible: number;
  loading: boolean;
  date: string;
  converting: string | null;
  onShowMore: () => void;
  onConvert: (id: string) => void;
  onEdit: (e: KhataEntry) => void;
  onDelete: (id: string) => void;
}

export default function OrdersTable({ entries, visible, loading, date, converting, onShowMore, onConvert, onEdit, onDelete }: Props) {
  if (loading) return <div style={st.empty}>Loading…</div>;
  if (entries.length === 0)
    return <div style={st.empty}>No orders for {fmtDate(date + "T00:00:00")}. Click "+ New Entry" to record one.</div>;

  const rows = entries.slice(0, visible);

  return (
    <>
      <div style={st.wrap}>
        <table style={st.table}>
          <thead>
            <tr>
              <th style={{ ...st.th, width: 80 }}>Time</th>
              <th style={st.th}>Customer</th>
              <th style={st.th}>Items</th>
              <th style={{ ...st.th, ...st.rgt, width: 110 }}>Amount</th>
              <th style={{ ...st.th, ...st.rgt, width: 110 }}>Advance</th>
              <th style={{ ...st.th, ...st.rgt, width: 110 }}>Due</th>
              <th style={{ ...st.th, ...st.ctr, width: 90 }}>Method</th>
              <th style={{ ...st.th, width: 100 }}>Status</th>
              <th style={{ ...st.th, width: 200 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const amt = Number(e.amount), adv = Number(e.advancePaid), due = Math.max(0, amt - adv);
              return (
                <tr key={e.id} className="qo-trow">
                  <td style={{ ...st.td, ...st.faint, fontSize: 11.5, whiteSpace: "nowrap" }}>{fmtTimeSec(e.createdAt)}</td>
                  <td style={st.td}>
                    <div style={st.name}>{e.customerName}</div>
                    {e.customerPhone && <div style={st.phone}>{e.customerPhone}</div>}
                  </td>
                  <td style={st.td}>
                    <div style={st.itemsCell}>{itemsSummary(e.items)}</div>
                    {e.description && <div style={st.noteCell}>"{e.description}"</div>}
                  </td>
                  <td style={{ ...st.td, ...st.rgt, fontWeight: 700 }}>{rupees(amt)}</td>
                  <td style={{ ...st.td, ...st.rgt, color: GREEN, fontWeight: adv > 0 ? 700 : 400 }}>{adv > 0 ? rupees(adv) : "—"}</td>
                  <td style={{ ...st.td, ...st.rgt, fontWeight: 700, color: due > 0 ? TERRA : GREEN }}>{due > 0 ? rupees(due) : "✓ Paid"}</td>
                  <td style={{ ...st.td, ...st.ctr }}><span style={st.chipM}>{e.paymentMethod === "cash" ? "💵 Cash" : "📱 Online"}</span></td>
                  <td style={st.td}>
                    {e.status === "billed"
                      ? <span style={{ ...st.tag, ...st.tagBilled }}>{e.invoiceNo}</span>
                      : <span style={{ ...st.tag, ...st.tagUnbilled }}>Unbilled</span>}
                  </td>
                  <td style={st.td}>
                    {e.status === "unbilled" ? (
                      <div style={st.racts}>
                        <button style={{ ...st.abtn, ...st.abtnPrimary }} disabled={converting === e.id} onClick={() => onConvert(e.id)}>
                          {converting === e.id ? "…" : "Invoice"}
                        </button>
                        <button className="qo-abtn" style={st.abtn} onClick={() => onEdit(e)}>Edit</button>
                        <button style={{ ...st.abtn, ...st.abtnDanger }} onClick={() => onDelete(e.id)}>Del</button>
                      </div>
                    ) : (
                      <div style={st.racts}><span style={{ fontSize: 11.5, color: GREEN, fontWeight: 600 }}>✓ Invoiced</span></div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {entries.length > visible && (
        <button className="qo-showmore" style={st.showmore} onClick={onShowMore}>
          Show more ({entries.length - visible} remaining)
        </button>
      )}
    </>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrap:      { background: CARD, border: `1px solid ${LINE}`, overflowX: "auto" },
  table:     { width: "100%", borderCollapse: "collapse", fontSize: 13.5 },
  th:        { textAlign: "left", padding: "11px 16px", fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: MUTE, background: IVORY, borderBottom: `2px solid ${LINE}`, fontWeight: 700, whiteSpace: "nowrap" },
  td:        { padding: "13px 16px", borderBottom: `1px solid ${LINE}`, color: INK, verticalAlign: "middle" },
  rgt:       { textAlign: "right", fontVariantNumeric: "tabular-nums" },
  ctr:       { textAlign: "center" },
  faint:     { color: "#b6bac3" },
  name:      { fontWeight: 700, fontSize: 13.5, color: INK },
  phone:     { fontSize: 11.5, color: MUTE, marginTop: 2 },
  itemsCell: { fontSize: 12.5, color: "#4b5563", maxWidth: 280 },
  noteCell:  { fontSize: 11, color: MUTE, fontStyle: "italic", marginTop: 3 },
  chipM:     { display: "inline-flex", alignItems: "center", gap: 4, background: "#f3f4f6", padding: "2px 9px", borderRadius: 2, fontSize: 11, fontWeight: 700, color: "#374151", whiteSpace: "nowrap" },
  tag:       { display: "inline-block", padding: "2px 9px", borderRadius: 2, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
  tagBilled: { background: "#dcfce7", color: GREEN },
  tagUnbilled:{ background: "#fef3c7", color: "#92400e" },
  racts:     { display: "flex", gap: 5, justifyContent: "flex-end" },
  abtn:      { padding: "6px 12px", border: `1px solid ${LINE}`, fontSize: 12, cursor: "pointer", fontFamily: SANS, background: CARD, color: INK, fontWeight: 600, whiteSpace: "nowrap" },
  abtnPrimary:{ background: "#c2974a", color: "#fff", border: "1px solid #c2974a" },
  abtnDanger: { color: TERRA, borderColor: "#f5c4bb" },
  showmore:  { width: "100%", padding: 12, border: `1px dashed ${LINE}`, background: IVORY, color: MUTE, fontFamily: SANS, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 12 },
  empty:     { padding: "50px 20px", textAlign: "center", color: MUTE, fontSize: 14, background: CARD, border: `1px solid ${LINE}` },
};