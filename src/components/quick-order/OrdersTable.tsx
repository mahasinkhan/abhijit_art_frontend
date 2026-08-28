// src/components/quick-order/OrdersTable.tsx
import {
  QuickOrder, TERRA, GOLD, INK, MUTE, LINE, IVORY, CARD, GREEN, SANS,
  rupees, fmtDate, fmtTimeSec, TASK_STATUS,
} from "./types";

interface Props {
  entries:     QuickOrder[];
  visible:     number;
  loading:     boolean;
  date:        string;
  converting?: string | null;
  isAdmin:     boolean;
  onShowMore:    () => void;
  onViewDetails: (e: QuickOrder) => void;
  onAssign:      (e: QuickOrder) => void;
  onClaim:       (id: string) => void;
  onUnassign:    (id: string) => void;
}

function DeliveryBadge({ date }: { date?: string | null }) {
  if (!date) return null;
  const d    = new Date(date);
  const now  = new Date();
  const diff = Math.ceil((d.getTime() - now.setHours(0,0,0,0)) / 86400000);
  const label = diff < 0  ? `${Math.abs(diff)}d overdue`
              : diff === 0 ? "Due today"
              : diff === 1 ? "Due tomorrow"
              : `${diff}d left`;
  const color = diff < 0  ? "#b91c1c"
              : diff <= 1  ? TERRA
              : diff <= 3  ? "#92400e"
              : "#15803d";
  const bg    = diff < 0  ? "#fee2e2"
              : diff <= 1  ? "#fef3c7"
              : diff <= 3  ? "#fef9c3"
              : "#dcfce7";
  return (
    <span style={{ display: "inline-block", padding: "2px 7px", fontSize: 10.5, fontWeight: 700, color, background: bg, marginTop: 3 }}>
      📅 {label}
    </span>
  );
}

export default function OrdersTable({
  entries, visible, loading, date, isAdmin,
  onShowMore, onViewDetails, onAssign, onClaim, onUnassign,
}: Props) {
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
              <th style={st.th}>Work / Qty</th>
              <th style={{ ...st.th, ...st.rgt, width: 110 }}>Amount</th>
              <th style={{ ...st.th, ...st.rgt, width: 90 }}>Less</th>
              <th style={{ ...st.th, ...st.rgt, width: 110 }}>Due</th>
              <th style={{ ...st.th, ...st.ctr, width: 90 }}>Method</th>
              <th style={{ ...st.th, width: 140 }}>Assignment</th>
              <th style={{ ...st.th, width: 130 }}>Status</th>
              <th style={{ ...st.th, width: 120 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map(e => {
              const amt  = Number(e.amount);
              const less = Number(e.lessAmount || 0);
              const adv  = Number(e.advancePaid);
              const due  = Math.max(0, amt - less - adv);
              const task = e.task;
              const ts   = task ? TASK_STATUS[task.status] : null;
              const qty  = (e as any).quantity as string | undefined;
              const delv = (e as any).expectedDelivery as string | undefined;

              return (
                <tr key={e.id} className="qo-trow" style={{ cursor: "pointer" }} onClick={() => onViewDetails(e)}>

                  <td style={{ ...st.td, ...st.faint, fontSize: 11.5, whiteSpace: "nowrap" }}>{fmtTimeSec(e.createdAt)}</td>

                  <td style={st.td}>
                    <div style={st.name}>{e.customerName}</div>
                    {e.customerPhone && <div style={st.phone}>{e.customerPhone}</div>}
                  </td>

                  <td style={st.td}>
                    {e.title && <div style={st.orderTitle}>{e.title}</div>}
                    <div style={st.workCell}>{e.workDetails || "—"}</div>
                    {qty && <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 3 }}>📦 {qty}</div>}
                    {delv && <DeliveryBadge date={delv} />}
                    {e.description && <div style={st.noteCell}>"{e.description}"</div>}
                  </td>

                  <td style={{ ...st.td, ...st.rgt, fontWeight: 700 }}>{rupees(amt)}</td>
                  <td style={{ ...st.td, ...st.rgt, fontWeight: 700, color: less > 0 ? GOLD : "#c9cdd6" }}>
                    {less > 0 ? `−${rupees(less)}` : "—"}
                  </td>
                  <td style={{ ...st.td, ...st.rgt, fontWeight: 700, color: due > 0 ? TERRA : GREEN }}>
                    {due > 0 ? rupees(due) : "✔ Paid"}
                  </td>
                  <td style={{ ...st.td, ...st.ctr }}>
                    <span style={st.chipM}>{e.paymentMethod === "cash" ? "💵 Cash" : "📱 Online"}</span>
                  </td>

                  <td style={st.td} onClick={ev => ev.stopPropagation()}>
                    {task ? (
                      <div>
                        <div style={st.assignName}>{task.assignedTo.name}</div>
                        {task.assignedTo.id === task.createdBy?.id && (
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", background: "#ede9fe", padding: "1px 6px", display: "inline-block", marginTop: 2 }}>Self Assigned</div>
                        )}
                        {isAdmin && <button style={st.unassignBtn} onClick={() => onUnassign(e.id)}>Remove</button>}
                      </div>
                    ) : e.status !== "billed" ? (
                      isAdmin
                        ? <button style={st.assignBtn} onClick={() => onAssign(e)}>Assign</button>
                        : <button style={st.claimBtn} onClick={() => onClaim(e.id)}>Claim</button>
                    ) : null}
                  </td>

                  <td style={st.td}>
                    {e.status === "billed" ? (
                      <span style={{ ...st.tag, ...st.tagBilled }}>{e.invoiceNo}</span>
                    ) : task && ts ? (
                      <span style={{ ...st.tag, background: ts.bg, color: ts.color }}>{ts.label}</span>
                    ) : (
                      <span style={{ ...st.tag, ...st.tagUnassigned }}>Unassigned</span>
                    )}
                  </td>

                  <td style={st.td} onClick={ev => ev.stopPropagation()}>
                    <button style={st.viewBtn} onClick={() => onViewDetails(e)}>View Details ›</button>
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
  wrap:          { background: "#fff", border: `1px solid ${LINE}`, overflowX: "auto" },
  table:         { width: "100%", borderCollapse: "collapse", fontSize: 13.5 },
  th:            { textAlign: "left", padding: "11px 16px", fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: MUTE, background: IVORY, borderBottom: `2px solid ${LINE}`, fontWeight: 700, whiteSpace: "nowrap" },
  td:            { padding: "11px 16px", borderBottom: `1px solid ${LINE}`, color: INK, verticalAlign: "middle" },
  rgt:           { textAlign: "right", fontVariantNumeric: "tabular-nums" },
  ctr:           { textAlign: "center" },
  faint:         { color: "#b6bac3" },
  name:          { fontWeight: 700, fontSize: 13.5, color: INK },
  phone:         { fontSize: 11.5, color: MUTE, marginTop: 2 },
  orderTitle:    { fontSize: 11, fontWeight: 800, color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a", display: "inline-block", padding: "1px 8px", marginBottom: 4, letterSpacing: ".02em" },
  workCell:      { fontSize: 13, color: INK, maxWidth: 260, lineHeight: 1.45, whiteSpace: "pre-line" },
  noteCell:      { fontSize: 11, color: MUTE, fontStyle: "italic", marginTop: 3 },
  chipM:         { display: "inline-flex", alignItems: "center", gap: 4, background: "#f3f4f6", padding: "2px 9px", fontSize: 11, fontWeight: 700, color: "#374151", whiteSpace: "nowrap" },
  assignName:    { fontWeight: 700, fontSize: 12.5, color: INK, marginBottom: 3 },
  assignBtn:     { padding: "4px 11px", border: `1px solid ${LINE}`, background: "#fff", color: INK, fontSize: 11.5, cursor: "pointer", fontFamily: SANS, fontWeight: 700 },
  claimBtn:      { padding: "4px 11px", border: "1px solid #c2974a", background: "#fdf6e3", color: "#92400e", fontSize: 11.5, cursor: "pointer", fontFamily: SANS, fontWeight: 700 },
  unassignBtn:   { border: "none", background: "none", color: MUTE, fontSize: 11, cursor: "pointer", fontFamily: SANS, padding: 0, textDecoration: "underline" },
  tag:           { display: "inline-block", padding: "2px 9px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
  tagBilled:     { background: "#dcfce7", color: GREEN },
  tagUnassigned: { background: "#f3f4f6", color: MUTE },
  viewBtn:       { padding: "6px 13px", border: `1px solid ${LINE}`, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SANS, color: INK, whiteSpace: "nowrap" },
  showmore:      { width: "100%", padding: 12, border: `1px dashed ${LINE}`, background: IVORY, color: MUTE, fontFamily: SANS, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 12 },
  empty:         { padding: "50px 20px", textAlign: "center", color: MUTE, fontSize: 14, background: "#fff", border: `1px solid ${LINE}` },
};