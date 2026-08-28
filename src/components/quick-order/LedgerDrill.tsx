// src/components/quick-order/LedgerDrill.tsx
// ── Customer drill drawer: daily record + statement download ───────────────
import { useState } from "react";
import {
  QuickOrder, LedgerRow,
  TERRA, TERRA_DK, GOLD, INK, MUTE, LINE, IVORY, GREEN, SANS,
  rupees, fmtDate, fmtTimeSec, TASK_STATUS,
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
}

export default function LedgerDrill({
  row, entries, loading, ledgerDate, isAdmin,
  onClose, onEdit, onAssign, onClaim, onUnassign,
}: Props) {
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");
  const [filtered, setFiltered] = useState(false);

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

  function applyFilter() { setFiltered(true); }
  function clearFilter()  { setFromDate(""); setToDate(""); setFiltered(false); }

  function printStatement() {
    const rows = stmtEntries.map((e, i) => {
      const amt  = Number(e.amount);
      const less = Number(e.lessAmount || 0);
      const adv  = Number(e.advancePaid);
      const due  = Math.max(0, amt - less - adv);
      return `<tr style="background:${i % 2 === 0 ? "#fff" : "#fafafa"}">
        <td>${fmtDate(e.entryDate)}</td>
        <td>${e.title || "—"}</td>
        <td style="max-width:220px;white-space:pre-line">${e.workDetails || "—"}</td>
        <td style="text-align:right;font-weight:700">&#8377;${amt.toLocaleString("en-IN")}</td>
        <td style="text-align:right;color:#b8741f">${less > 0 ? "&#8722;&#8377;" + less.toLocaleString("en-IN") : "&#8212;"}</td>
        <td style="text-align:right;color:#16a34a">&#8377;${adv.toLocaleString("en-IN")}</td>
        <td style="text-align:right;color:${due > 0 ? "#c56a3a" : "#16a34a"};font-weight:700">${due > 0 ? "&#8377;" + due.toLocaleString("en-IN") : "Paid"}</td>
      </tr>`;
    }).join("");

    const period = fromDate || toDate
      ? `${fromDate ? fmtDate(fromDate + "T00:00:00") : "Start"} to ${toDate ? fmtDate(toDate + "T00:00:00") : "Today"}`
      : "All time";

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Statement - ${row.customerName}</title>
    <style>
      body { font-family:'Segoe UI',sans-serif; padding:32px; color:#1a1a2e; font-size:13px; }
      h1   { font-size:20px; margin:0 0 4px; }
      .sub { color:#6b7280; font-size:12px; margin-bottom:20px; }
      table { width:100%; border-collapse:collapse; }
      th { background:#f3f4f6; text-align:left; padding:8px 10px; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; border-bottom:2px solid #e5e7eb; }
      td { padding:8px 10px; border-bottom:1px solid #f3f4f6; vertical-align:top; font-size:12.5px; }
      tfoot td { font-weight:800; background:#f9fafb; border-top:2px solid #e5e7eb; }
      .summary { margin-top:24px; display:flex; gap:32px; flex-wrap:wrap; }
      .sum-item label { font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; display:block; margin-bottom:4px; }
      .sum-item span  { font-size:18px; font-weight:800; }
      @media print { body { padding:16px; } }
    </style></head><body>
    <h1>Customer Statement</h1>
    <div class="sub">
      <strong>${row.customerName}</strong>${row.customerPhone ? " &middot; " + row.customerPhone : ""}<br/>
      Period: ${period} &middot; ${stmtEntries.length} order${stmtEntries.length !== 1 ? "s" : ""}
    </div>
    <table>
      <thead><tr>
        <th>Date</th><th>Title</th><th>Work Details</th>
        <th style="text-align:right">Amount</th>
        <th style="text-align:right">Less</th>
        <th style="text-align:right">Paid</th>
        <th style="text-align:right">Due</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td colspan="3" style="text-align:right">Total</td>
        <td style="text-align:right">&#8377;${stmtTotal.toLocaleString("en-IN")}</td>
        <td style="text-align:right;color:#b8741f">${stmtLess > 0 ? "&#8722;&#8377;" + stmtLess.toLocaleString("en-IN") : "&#8212;"}</td>
        <td style="text-align:right;color:#16a34a">&#8377;${stmtPaid.toLocaleString("en-IN")}</td>
        <td style="text-align:right;color:${stmtDue > 0 ? "#c56a3a" : "#16a34a"}">${stmtDue > 0 ? "&#8377;" + stmtDue.toLocaleString("en-IN") : "Cleared"}</td>
      </tr></tfoot>
    </table>
    <div class="summary">
      <div class="sum-item"><label>Total Billed</label><span>&#8377;${stmtTotal.toLocaleString("en-IN")}</span></div>
      ${stmtLess > 0 ? `<div class="sum-item"><label>Total Less</label><span style="color:#b8741f">&#8722;&#8377;${stmtLess.toLocaleString("en-IN")}</span></div>` : ""}
      <div class="sum-item"><label>Total Received</label><span style="color:#16a34a">&#8377;${stmtPaid.toLocaleString("en-IN")}</span></div>
      <div class="sum-item"><label>Balance Due</label><span style="color:${stmtDue > 0 ? "#c56a3a" : "#16a34a"}">${stmtDue > 0 ? "&#8377;" + stmtDue.toLocaleString("en-IN") : "Cleared"}</span></div>
    </div>
    <script>window.onload=()=>window.print();</script>
    </body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }

  return (
    <div style={st.backdrop} onClick={onClose}>
      <style>{`
        .qo-close:hover { background:${IVORY}; }
        .qo-mini:hover:not(:disabled) { background:${IVORY}; }
        .qo-btn:hover { opacity:.88; }
      `}</style>

      <div style={st.modal} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={st.head}>
          <div>
            <h2 style={st.name}>{row.customerName}</h2>
            {row.customerPhone && <div style={st.phone}>{row.customerPhone}</div>}
            {ledgerDate && <div style={st.phone}>📅 {fmtDate(ledgerDate + "T00:00:00")}</div>}
          </div>
          <button className="qo-close" style={st.close} onClick={onClose}>×</button>
        </div>

        {/* ── Stats — 4 cols if less > 0, else 3 ── */}
        <div style={{ ...st.stats, gridTemplateColumns: row.totalLess > 0 ? "repeat(4,1fr)" : "repeat(3,1fr)" }}>
          <div style={st.stat}><div style={st.statL}>Total Billed</div><div style={st.statV}>{rupees(row.totalAmount)}</div></div>
          {row.totalLess > 0 && (
            <div style={st.stat}><div style={st.statL}>Total Less</div><div style={{ ...st.statV, color: GOLD }}>−{rupees(row.totalLess)}</div></div>
          )}
          <div style={st.stat}><div style={st.statL}>Received</div><div style={{ ...st.statV, color: GREEN }}>{rupees(row.totalAdvance)}</div></div>
          <div style={st.stat}><div style={st.statL}>Balance Due</div><div style={{ ...st.statV, color: row.totalDue > 0 ? TERRA : GREEN }}>{row.totalDue > 0 ? rupees(row.totalDue) : "✓ Cleared"}</div></div>
        </div>

        {/* ── Statement bar ── */}
        <div style={st.stmtBar}>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={st.dateInp} />
          <span style={{ color: MUTE, fontSize: 12 }}>to</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={st.dateInp} />
          <button className="qo-btn" style={st.filterBtn} onClick={applyFilter}>Filter</button>
          {filtered && <button className="qo-btn" style={st.clearBtn} onClick={clearFilter}>Clear</button>}
          <div style={{ flex: 1 }} />
          <button className="qo-btn" style={st.dlBtn} onClick={printStatement}>⬇ Download Statement</button>
        </div>

        {/* ── Filter summary ── */}
        {filtered && (
          <div style={st.filterSummary}>
            {stmtEntries.length} orders · Billed {rupees(stmtTotal)}
            {stmtLess > 0 && <> · Less <span style={{ color: GOLD }}>−{rupees(stmtLess)}</span></>}
            {" "}· Paid {rupees(stmtPaid)} · Due{" "}
            <strong style={{ color: stmtDue > 0 ? TERRA : GREEN }}>
              {stmtDue > 0 ? rupees(stmtDue) : "✓ Cleared"}
            </strong>
          </div>
        )}

        {/* ── List ── */}
        <div style={st.listLbl}>{stmtEntries.length} order{stmtEntries.length !== 1 ? "s" : ""}</div>
        <div style={st.list}>
          {loading
            ? <div style={st.empty}>Loading…</div>
            : stmtEntries.length === 0
              ? <div style={st.empty}>No orders for this period.</div>
              : stmtEntries.map((e) => {
                  const amt  = Number(e.amount);
                  const less = Number(e.lessAmount || 0);
                  const adv  = Number(e.advancePaid);
                  const due  = Math.max(0, amt - less - adv);
                  const task = e.task;
                  const ts = task ? TASK_STATUS[task.status] : null;
                  return (
                    <div key={e.id} style={st.stmt}>
                      {/* row top */}
                      <div style={st.stmtL}>
                        <span style={st.stmtDate}>{fmtDate(e.entryDate)}</span>
                        {e.title && <span style={st.titleTag}>{e.title}</span>}
                        {task && ts
                          ? <span style={{ ...st.tag, background: ts.bg, color: ts.color }}>{ts.label}</span>
                          : <span style={{ ...st.tag, ...st.tagUnbilled }}>Unassigned</span>}
                      </div>
                      <div style={st.stmtR}>
                        <div style={st.stmtTotal}>{rupees(amt)}</div>
                        {less > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: GOLD }}>−{rupees(less)} less</div>}
                        <div style={{ ...st.stmtDue, color: due > 0 ? TERRA : GREEN }}>{due > 0 ? `Due ${rupees(due)}` : "Paid"}</div>
                      </div>
                      {/* work */}
                      <div style={st.workCell}>{e.workDetails || "—"}</div>
                      {/* assignment */}
                      {task && (
                        <div style={st.assignRow}>
                          👷 {task.assignedTo.name}
                          {isAdmin && (
                            <button style={st.unassignBtn} onClick={() => onUnassign(e.id)}>Remove</button>
                          )}
                        </div>
                      )}
                      {/* actions */}
                      <div style={st.stmtActions}>
                        {isAdmin && <button className="qo-mini" style={st.mini} onClick={() => onEdit(e)}>Edit</button>}
                        {isAdmin
                          ? !task && <button className="qo-mini" style={st.mini} onClick={() => onAssign(e)}>Assign</button>
                          : !task && <button className="qo-mini" style={{ ...st.mini, color: "#92400e", borderColor: "#c2974a" }} onClick={() => onClaim(e.id)}>Claim</button>
                        }
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
  backdrop:      { position: "fixed", inset: 0, background: "rgba(24,22,28,.5)", backdropFilter: "blur(3px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal:         { width: "min(640px,100%)", maxHeight: "calc(100vh - 40px)", background: "#fffdfb", boxShadow: "0 30px 80px rgba(24,22,28,.34)", display: "flex", flexDirection: "column", overflowY: "auto", padding: 20, fontFamily: SANS, color: INK },
  head:          { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  name:          { fontSize: 19, fontWeight: 800, margin: 0, color: INK },
  phone:         { fontSize: 13, color: MUTE, marginTop: 4 },
  close:         { width: 34, height: 34, border: `1px solid ${LINE}`, background: "#fff", color: "#545a67", fontSize: 22, lineHeight: 1, cursor: "pointer", flexShrink: 0 },
  stats:         { display: "grid", gap: 1, background: LINE, border: `1px solid ${LINE}`, marginBottom: 14 },
  stat:          { background: "#fff", padding: "10px 12px" },
  statL:         { fontSize: 10, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: MUTE, marginBottom: 4 },
  statV:         { fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: INK },
  stmtBar:       { display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  dateInp:       { padding: "6px 10px", border: `1px solid ${LINE}`, fontSize: 12.5, fontFamily: SANS, color: INK, background: "#fff", outline: "none" },
  filterBtn:     { padding: "7px 16px", background: TERRA, color: "#fff", border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: SANS },
  clearBtn:      { padding: "7px 14px", background: "none", color: MUTE, border: `1px solid ${LINE}`, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: SANS },
  dlBtn:         { padding: "7px 16px", background: INK, color: "#fff", border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap" },
  filterSummary: { fontSize: 12.5, color: MUTE, background: IVORY, padding: "8px 12px", border: `1px solid ${LINE}`, marginBottom: 10 },
  listLbl:       { fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTE, marginBottom: 8 },
  list:          { display: "flex", flexDirection: "column", gap: 6 },
  empty:         { padding: "24px", textAlign: "center", color: MUTE, fontSize: 13 },
  stmt:          { display: "grid", gridTemplateColumns: "1fr auto", gap: "5px 10px", alignItems: "start", padding: "10px 12px", background: "#fff", border: `1px solid ${LINE}` },
  stmtL:         { display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" },
  stmtDate:      { fontSize: 12, fontWeight: 700, color: INK },
  titleTag:      { fontSize: 11, fontWeight: 700, color: TERRA, background: "#fff5f0", padding: "1px 7px", border: `1px solid #f0c9b8` },
  stmtR:         { textAlign: "right", gridRow: 1, gridColumn: 2 },
  stmtTotal:     { fontSize: 14, fontWeight: 800, color: INK, fontVariantNumeric: "tabular-nums" },
  stmtDue:       { fontSize: 11.5, fontWeight: 700 },
  workCell:      { gridColumn: "1 / -1", fontSize: 12.5, color: INK, lineHeight: 1.5, whiteSpace: "pre-line" },
  assignRow:     { gridColumn: "1 / -1", fontSize: 11.5, color: MUTE, display: "flex", alignItems: "center", gap: 8 },
  unassignBtn:   { border: "none", background: "none", color: MUTE, fontSize: 11, cursor: "pointer", fontFamily: SANS, padding: 0, textDecoration: "underline" },
  stmtActions:   { gridColumn: "1 / -1", display: "flex", gap: 7, flexWrap: "wrap" },
  mini:          { padding: "4px 12px", border: `1px solid ${LINE}`, fontSize: 12, cursor: "pointer", fontFamily: SANS, background: "#fff", color: INK, fontWeight: 600 },
  tag:           { display: "inline-block", padding: "2px 8px", borderRadius: 2, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
  tagUnbilled:   { background: "#f3f4f6", color: MUTE },
};