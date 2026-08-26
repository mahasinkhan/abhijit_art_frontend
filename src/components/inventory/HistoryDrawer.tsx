// src/components/inventory/HistoryDrawer.tsx
import { useEffect, useState } from "react";
import api from "../../api";
import Icon from "./Icon";
import { InventoryItem, Movement, MOV_LABEL, MOV_SIGN, CARD, IVORY, MUTE, LINE, GREEN, GREEN_LT, RED, RED_LT, dec, dtfmt, sharedSt } from "./types";

interface Props {
  item:    InventoryItem;
  onClose: () => void;
}

export default function HistoryDrawer({ item, onClose }: Props) {
  const [history, setHistory] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/inventory/movements?itemId=${item.id}&limit=50`)
      .then(r => setHistory(Array.isArray(r.data) ? r.data : []))
      .catch(()=>{})
      .finally(() => setLoading(false));
  }, [item.id]);

  return (
    <div style={sharedSt.backdrop} onClick={onClose}>
      <div style={{ ...sharedSt.drawer, maxWidth:560 }} onClick={e => e.stopPropagation()}>
        <div style={sharedSt.dHead}>
          <h3 style={sharedSt.dTitle}>History · {item.name}</h3>
          <button style={sharedSt.closeBtn} onClick={onClose}><Icon name="x" size={18}/></button>
        </div>

        <div style={{ ...sharedSt.dBody, padding:0, overflowX:"auto" }}>
          {loading ? (
            <div style={st.empty}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={st.empty}>No movements recorded yet.</div>
          ) : (
            <table style={st.table}>
              <thead>
                <tr>
                  {["Type","Change","Balance","Note","Date"].map(h => (
                    <th key={h} style={st.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((mv, i) => {
                  const sign = MOV_SIGN[mv.type] ?? 1;
                  const d    = dec(mv.delta);
                  return (
                    <tr key={mv.id} style={{ background: i%2===0 ? CARD : IVORY }}>
                      <td style={st.td}>
                        <span style={{ ...st.pill, background:sign>0?GREEN_LT:RED_LT, color:sign>0?GREEN:RED }}>
                          {MOV_LABEL[mv.type] || mv.type}
                        </span>
                      </td>
                      <td style={{ ...st.td, fontWeight:700, color:sign>0?GREEN:RED, fontVariantNumeric:"tabular-nums" }}>
                        {sign>0?"+":"-"}{d} {item.unit}
                      </td>
                      <td style={{ ...st.td, fontVariantNumeric:"tabular-nums" }}>
                        {dec(mv.postBalance).toFixed(2)}
                      </td>
                      <td style={{ ...st.td, color:MUTE, fontSize:12 }}>{mv.note || "—"}</td>
                      <td style={{ ...st.td, color:MUTE, fontSize:11, whiteSpace:"nowrap" }}>{dtfmt(mv.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={sharedSt.dFoot}>
          <button style={{ ...sharedSt.ghostBtn, marginLeft:"auto" }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  table: { width:"100%", borderCollapse:"collapse", fontSize:13.5 },
  th:    { padding:"11px 16px", textAlign:"left", fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, borderBottom:`2px solid ${LINE}`, background:IVORY, whiteSpace:"nowrap" },
  td:    { padding:"13px 16px", borderBottom:`1px solid ${LINE}`, verticalAlign:"middle" },
  pill:  { display:"inline-block", padding:"3px 9px", fontSize:11, fontWeight:700, borderRadius:2 },
  empty: { padding:"60px 0", textAlign:"center", color:MUTE, fontFamily:"'DM Sans', system-ui, sans-serif" },
};