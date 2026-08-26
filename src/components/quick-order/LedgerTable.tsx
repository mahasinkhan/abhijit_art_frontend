// src/components/quick-order/LedgerTable.tsx
import {
  LedgerRow, TERRA, INK, MUTE, LINE, IVORY, CARD, GREEN, SANS,
  rupees, fmtDate,
} from "./types";

interface Props {
  rows: LedgerRow[];
  visible: number;
  loading: boolean;
  ledgerDate: string;
  onShowMore: () => void;
  onDrill: (row: LedgerRow) => void;
}

export default function LedgerTable({ rows, visible, loading, ledgerDate, onShowMore, onDrill }: Props) {
  if (loading) return <div style={st.empty}>Loading…</div>;
  if (rows.length === 0)
    return <div style={st.empty}>{ledgerDate ? `No orders for ${fmtDate(ledgerDate + "T00:00:00")}.` : "No orders yet."}</div>;

  const shown = rows.slice(0, visible);

  return (
    <>
      <div style={st.wrap}>
        <table style={st.table}>
          <thead>
            <tr>
              <th style={{ ...st.th, width: 34 }}>#</th>
              <th style={st.th}>Customer</th>
              <th style={{ ...st.th, ...st.ctr, width: 90 }}>Orders</th>
              <th style={{ ...st.th, ...st.rgt, width: 130 }}>Total Billed</th>
              <th style={{ ...st.th, ...st.rgt, width: 130 }}>Advance</th>
              <th style={{ ...st.th, ...st.rgt, width: 130 }}>Balance Due</th>
              <th style={{ ...st.th, width: 50 }} />
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i} className="qo-trow" style={{ cursor: "pointer" }} onClick={() => onDrill(row)}>
                <td style={{ ...st.td, ...st.faint, ...st.ctr }}>{i + 1}</td>
                <td style={st.td}>
                  <div style={st.name}>
                    {row.customerName}
                    {row.unbilledCount ? <span style={st.badge}>{row.unbilledCount} unbilled</span> : null}
                  </div>
                  {row.customerPhone && <div style={st.phone}>{row.customerPhone}</div>}
                </td>
                <td style={{ ...st.td, ...st.ctr, fontWeight: 700 }}>{row.totalOrders}</td>
                <td style={{ ...st.td, ...st.rgt, fontWeight: 700 }}>{rupees(row.totalAmount)}</td>
                <td style={{ ...st.td, ...st.rgt, fontWeight: 700, color: GREEN }}>{rupees(row.totalAdvance)}</td>
                <td style={{ ...st.td, ...st.rgt, fontWeight: 700, color: row.totalDue > 0 ? TERRA : GREEN }}>
                  {row.totalDue > 0 ? rupees(row.totalDue) : "✓ Cleared"}
                </td>
                <td style={{ ...st.td, ...st.ctr, color: "#b6bac3", fontSize: "1.1rem" }}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > visible && (
        <button className="qo-showmore" style={st.showmore} onClick={onShowMore}>
          Show more ({rows.length - visible} remaining)
        </button>
      )}
    </>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrap:     { background: CARD, border: `1px solid ${LINE}`, overflowX: "auto" },
  table:    { width: "100%", borderCollapse: "collapse", fontSize: 13.5 },
  th:       { textAlign: "left", padding: "11px 16px", fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: MUTE, background: IVORY, borderBottom: `2px solid ${LINE}`, fontWeight: 700, whiteSpace: "nowrap" },
  td:       { padding: "13px 16px", borderBottom: `1px solid ${LINE}`, color: INK, verticalAlign: "middle" },
  rgt:      { textAlign: "right", fontVariantNumeric: "tabular-nums" },
  ctr:      { textAlign: "center" },
  faint:    { color: "#b6bac3" },
  name:     { fontWeight: 700, fontSize: 13.5, color: INK },
  phone:    { fontSize: 11.5, color: MUTE, marginTop: 2 },
  badge:    { display: "inline-block", marginLeft: 8, padding: "1px 8px", fontSize: 10.5, fontWeight: 700, color: "#b45309", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 999, verticalAlign: "middle" },
  showmore: { width: "100%", padding: 12, border: `1px dashed ${LINE}`, background: IVORY, color: MUTE, fontFamily: SANS, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 12 },
  empty:    { padding: "50px 20px", textAlign: "center", color: MUTE, fontSize: 14, background: CARD, border: `1px solid ${LINE}` },
};