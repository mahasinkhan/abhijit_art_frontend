// src/components/invoices/CustomerTable.tsx
// ── "By Customer" grouped table ───────────────────────────────────────────
import { CustomerRow, INK, MUTE, FAINT, TERRA, GREEN, SOFT, LINE_COOL, SANS } from "./types";
import Icon from "./Icon";

const rupee = (v: number) => "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  rows:       CustomerRow[];
  loading:    boolean;
  refreshing: boolean;
  onDrill:    (key: string) => void;
}

export default function CustomerTable({ rows, loading, refreshing, onDrill }: Props) {
  return (
    <div className="ivh-card" style={{ borderRadius:0, overflow:"hidden" }}>
      {loading ? (
        <div style={{ padding:"14px 18px" }}>{Array.from({ length:5 }).map((_,i) => <div key={i} className="ivh-skel" style={{ height:40, marginBottom:10, borderRadius:0 }} />)}</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign:"center", padding:"48px 24px", color:MUTE, fontSize:14 }}>
          <span style={{ color:FAINT, display:"block", marginBottom:10 }}><Icon name="user" size={34} /></span>
          <p style={{ margin:0, fontWeight:700, color:INK }}>No customers yet</p>
          <p style={{ margin:"5px 0 0", fontSize:13.5 }}>Invoices grouped by customer will appear here.</p>
        </div>
      ) : (
        <div className={refreshing ? "ivh-dim" : ""} style={{ overflowX:"auto" }}>
          <table style={st.table}>
            <thead>
              <tr>
                <th style={{ ...st.th, width:34 }}>#</th>
                <th style={st.th}>Customer</th>
                <th style={{ ...st.th, textAlign:"center", width:90 }}>Invoices</th>
                <th style={{ ...st.th, textAlign:"right", width:130 }}>Total Billed</th>
                <th style={{ ...st.th, textAlign:"right", width:130 }}>Paid</th>
                <th style={{ ...st.th, textAlign:"right", width:130 }}>Balance Due</th>
                <th style={{ ...st.th, width:40 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.key} className="ivh-tr ivh-custrow" onClick={() => onDrill(r.key)} style={{ cursor:"pointer" }}>
                  <td style={{ ...st.td, color:FAINT, textAlign:"center" }}>{i+1}</td>
                  <td style={st.td}>
                    <div style={{ fontWeight:700, color:INK, fontSize:14 }}>{r.name}</div>
                    {r.phone && <div style={{ fontSize:12, color:FAINT, marginTop:2 }}>{r.phone}</div>}
                  </td>
                  <td style={{ ...st.td, textAlign:"center", fontWeight:700 }}>{r.invoices.length}</td>
                  <td style={{ ...st.td, textAlign:"right", fontWeight:700, color:INK, fontVariantNumeric:"tabular-nums" }}>{rupee(r.billed)}</td>
                  <td style={{ ...st.td, textAlign:"right", fontWeight:700, color:GREEN, fontVariantNumeric:"tabular-nums" }}>{rupee(r.paid)}</td>
                  <td style={{ ...st.td, textAlign:"right", fontWeight:800, color:r.due>0?TERRA:GREEN, fontVariantNumeric:"tabular-nums" }}>{r.due>0?rupee(r.due):"✓ Cleared"}</td>
                  <td style={{ ...st.td, textAlign:"center", color:FAINT, fontSize:18 }}>›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  table: { width:"100%", borderCollapse:"collapse", fontSize:14 },
  th:    { textAlign:"left", padding:"13px 18px", fontSize:10.5, letterSpacing:0.7, textTransform:"uppercase", color:MUTE, background:SOFT, borderBottom:`1px solid ${LINE_COOL}`, fontWeight:700, whiteSpace:"nowrap" },
  td:    { padding:"14px 18px", borderBottom:"1px solid #f4f1ec", color:"#2a2f3a", verticalAlign:"top" },
};