// src/components/quick-order/LedgerDrill.tsx
// ── Customer drill drawer: stats + statement + combine-to-invoice ──────────
import {
  KhataEntry, LedgerRow,
  TERRA, TERRA_DK, GOLD, INK, MUTE, LINE, IVORY, GREEN, SANS,
  rupees, fmtDate, fmtTimeSec,
} from "./types";

interface Props {
  row: LedgerRow;
  entries: KhataEntry[];
  loading: boolean;
  ledgerDate: string;
  converting: string | null;
  combining: boolean;
  onClose: () => void;
  onConvert: (id: string) => void;
  onCombine: () => void;
  onEdit: (e: KhataEntry) => void;
}

export default function LedgerDrill({ row, entries, loading, ledgerDate, converting, combining, onClose, onConvert, onCombine, onEdit }: Props) {
  const unbilledCount = entries.filter(e => e.status !== "billed").length;

  return (
    <div style={st.backdrop} onClick={onClose}>
      <style>{`
        .qo-mdl-close:hover { background:${IVORY}; }
        .qo-combine:hover:not(:disabled) { background:${TERRA_DK}; }
        .qo-mini:hover:not(:disabled) { background:${IVORY}; }
      `}</style>

      <div style={st.modal} onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div style={st.head}>
          <div>
            <h2 style={st.name}>{row.customerName}</h2>
            {row.customerPhone && <div style={st.phone}>{row.customerPhone}</div>}
            {ledgerDate && <div style={st.phone}>📅 {fmtDate(ledgerDate + "T00:00:00")}</div>}
          </div>
          <button className="qo-mdl-close" style={st.close} onClick={onClose}>×</button>
        </div>

        {/* stats */}
        <div style={st.stats}>
          <div style={st.stat}><div style={st.statL}>Total Billed</div><div style={st.statV}>{rupees(row.totalAmount)}</div></div>
          <div style={st.stat}><div style={st.statL}>Advance</div><div style={{ ...st.statV, color: GREEN }}>{rupees(row.totalAdvance)}</div></div>
          <div style={st.stat}><div style={st.statL}>Balance Due</div><div style={{ ...st.statV, color: row.totalDue > 0 ? TERRA : GREEN }}>{row.totalDue > 0 ? rupees(row.totalDue) : "✓ Cleared"}</div></div>
        </div>

        {/* combine */}
        {unbilledCount > 1 && (
          <button className="qo-combine" style={{ ...st.combine, opacity: combining ? .6 : 1 }} disabled={combining} onClick={onCombine}>
            {combining ? "Creating combined invoice…" : `Combine ${unbilledCount} orders into one invoice`}
          </button>
        )}

        {/* statement */}
        <div style={st.listLbl}>{entries.length} order{entries.length !== 1 ? "s" : ""} · statement</div>
        <div style={st.list}>
          {loading ? <div style={st.empty}>Loading…</div>
          : entries.length === 0 ? <div style={st.empty}>No orders found.</div>
          : entries.map((e) => {
            const amt = Number(e.amount), adv = Number(e.advancePaid), due = Math.max(0, amt - adv);
            const title = e.items.map(it => `${Number(it.qty)}× ${it.desc}`).join(", ");
            return (
              <div key={e.id} style={st.stmt}>
                <div style={st.stmtL}>
                  {e.status === "billed"
                    ? <span style={st.stmtNo}>{e.invoiceNo}</span>
                    : <span style={{ ...st.stmtNo, color: MUTE }}>Order</span>}
                  <span style={st.stmtDate}>{fmtDate(e.entryDate)} · {fmtTimeSec(e.createdAt)}</span>
                  {e.status === "billed"
                    ? <span style={{ ...st.tag, ...st.tagBilled }}>Billed</span>
                    : <span style={{ ...st.tag, ...st.tagUnbilled }}>Unbilled</span>}
                </div>
                <div style={st.stmtMid}>{title}{e.description ? ` — ${e.description}` : ""}</div>
                <div style={st.stmtR}>
                  <div style={st.stmtTotal}>{rupees(amt)}</div>
                  <div style={{ ...st.stmtDue, color: due > 0 ? TERRA : GREEN }}>{due > 0 ? `Due ${rupees(due)}` : "Paid"}</div>
                </div>
                {e.status === "unbilled" && (
                  <div style={st.stmtActions}>
                    <button className="qo-mini" style={{ ...st.mini, ...st.miniPrimary }} disabled={converting === e.id} onClick={() => onConvert(e.id)}>{converting === e.id ? "…" : "Make Invoice"}</button>
                    <button className="qo-mini" style={st.mini} onClick={() => onEdit(e)}>Edit</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  backdrop:   { position: "fixed", inset: 0, background: "rgba(24,22,28,.5)", backdropFilter: "blur(3px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal:      { width: "min(500px,100%)", maxHeight: "calc(100vh - 40px)", background: "#fffdfb", boxShadow: "0 30px 80px rgba(24,22,28,.34)", display: "flex", flexDirection: "column", overflowY: "auto", padding: 20, fontFamily: SANS, color: INK },
  head:       { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  name:       { fontSize: 19, fontWeight: 800, margin: 0, color: INK },
  phone:      { fontSize: 13, color: MUTE, marginTop: 5 },
  close:      { width: 36, height: 36, border: `1px solid ${LINE}`, background: "#fff", color: "#545a67", fontSize: 22, lineHeight: 1, cursor: "pointer", flexShrink: 0 },
  stats:      { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: LINE, border: `1px solid ${LINE}`, marginBottom: 16 },
  stat:       { background: "#fff", padding: "11px 13px" },
  statL:      { fontSize: 10, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: MUTE, marginBottom: 5 },
  statV:      { fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: INK },
  combine:    { width: "100%", padding: "11px 16px", border: "none", background: TERRA, color: "#fff", fontFamily: SANS, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 14 },
  listLbl:    { fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTE, marginBottom: 8 },
  list:       { display: "flex", flexDirection: "column", gap: 6 },
  empty:      { padding: "24px", textAlign: "center", color: MUTE, fontSize: 13 },
  stmt:       { display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 10px", alignItems: "center", padding: "11px 13px", background: "#fff", border: `1px solid ${LINE}` },
  stmtL:      { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 },
  stmtNo:     { fontWeight: 800, fontSize: 13.5, color: "#c56a3a" },
  stmtDate:   { fontSize: 11.5, color: MUTE },
  stmtMid:    { gridColumn: "1 / -1", fontSize: 12, color: "#6b7280", lineHeight: 1.4 },
  stmtR:      { textAlign: "right", gridRow: 1, gridColumn: 2 },
  stmtTotal:  { fontSize: 14, fontWeight: 800, color: INK, fontVariantNumeric: "tabular-nums" },
  stmtDue:    { fontSize: 11.5, fontWeight: 700 },
  stmtActions:{ gridColumn: "1 / -1", display: "flex", gap: 7, marginTop: 2 },
  mini:       { padding: "5px 12px", border: `1px solid ${LINE}`, fontSize: 12, cursor: "pointer", fontFamily: SANS, background: "#fff", color: INK, fontWeight: 600 },
  miniPrimary:{ background: GOLD, color: "#fff", borderColor: GOLD },
  tag:        { display: "inline-block", padding: "2px 9px", borderRadius: 2, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
  tagBilled:  { background: "#dcfce7", color: GREEN },
  tagUnbilled:{ background: "#fef3c7", color: "#92400e" },
};