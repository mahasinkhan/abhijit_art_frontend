// src/components/income-expense/ui.tsx
import type { CSSProperties, ReactNode } from "react";
import type { Entry } from "../../services/incomeExpense.api";
import { CATEGORY_META } from "../../services/incomeExpense.api";
import { PERIOD_LABEL, type Period } from "../../hooks/useIncomeExpense";
import {
  rupees, rupeesExact, METHOD_META,
  ACCENT, ACCENT_DK, INK, MUTED, FAINT, LINE, LINE_SOFT, WASH, GOLD, GREEN, RED, BLUE,
} from "./types";

export type RowEntry = Entry & { running: number };

export const PERIODS: Period[] = ["today", "week", "month", "year", "all"];

/** dd-mm-yyyy (kept separate from types.fmtDate on purpose) */
export function fmtDate(d: string) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${dt.getFullYear()}`;
}

export const st: Record<string, CSSProperties> = {
  btn: { padding:"4px 10px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:"pointer", color:MUTED, whiteSpace:"nowrap" },
  td:  { padding:"10px 14px", borderBottom:`1px solid ${LINE_SOFT}`, verticalAlign:"middle" },
};

/* ── the big style block, now its own component ── */
export function ExpenseStyles() {
  return (
    <style>{`
      .ie-ov { position:fixed; inset:0; background:rgba(31,36,48,.5); z-index:1000; display:flex; align-items:center; justify-content:center; padding:24px 20px; }
      .ie-modal { background:#fff; width:100%; max-width:620px; border-radius:4px; position:relative; display:flex; flex-direction:column; max-height:calc(100vh - 48px); overflow:hidden; }
      .ie-modal.wide { max-width:1100px; }
      .ie-modal.small { max-width:520px; }
      .ie-mhead { padding:22px 26px 17px; border-bottom:1px solid #e7e1d7; flex-shrink:0; }
      .ie-mtitle { font-size:1.05rem; font-weight:700; }
      .ie-msub { font-size:.8rem; color:#8a8378; margin-top:4px; line-height:1.5; }
      .ie-mbody { padding:20px 26px 26px; overflow-y:auto; flex:1 1 auto; min-height:0; }
      .ie-mbody::-webkit-scrollbar { width:5px; }
      .ie-mbody::-webkit-scrollbar-thumb { background:#e7e1d7; border-radius:10px; }
      .ie-close { position:absolute; top:15px; right:18px; background:none; border:none; font-size:1.4rem; line-height:1; cursor:pointer; color:#8a8378; z-index:1; }
      .ie-close:hover { color:#2a231d; }
      .ie-err { background:#fef2ee; border:1px solid #f0d2c8; color:#b23c1c; padding:10px 13px; border-radius:3px; font-size:.84rem; margin-bottom:12px; }
      .ie-err.small { padding:7px 10px; font-size:.8rem; margin-bottom:10px; }
      .ie-kindsel { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:18px; }
      .ie-kindbtn { border:1px solid #e7e1d7; background:#fff; border-radius:3px; padding:13px; cursor:pointer; font-family:inherit; text-align:left; color:#8a8378; }
      .ie-kindbtn b { display:block; font-size:.95rem; }
      .ie-kindbtn span { display:block; font-size:.72rem; margin-top:3px; }
      .ie-kindbtn:hover { background:#faf8f3; }
      .ie-kindbtn.on.in  { border-color:${GREEN}; background:#e7f5eb; color:${GREEN}; }
      .ie-kindbtn.on.out { border-color:${RED}; background:#fdeaee; color:${RED}; }
      .ie-mgrid { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:20px; align-items:start; }
      .ie-mcol { display:grid; gap:15px; align-content:start; }
      .ie-2col { display:grid; grid-template-columns:1fr 1fr; gap:13px; }
      .ie-lbl { display:block; font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#8a8378; margin-bottom:6px; }
      .ie-opt { text-transform:none; letter-spacing:0; font-weight:500; color:#b3ab9f; }
      .ie-inp { width:100%; padding:10px 12px; border:1px solid #e7e1d7; border-radius:3px; font-size:.9rem; font-family:inherit; color:#2a231d; background:#fff; }
      .ie-inp:focus { outline:none; border-color:${ACCENT}; }
      .ie-amtinp { font-size:1.1rem; font-weight:800; }
      .ie-hint { font-size:.74rem; color:#b3ab9f; margin-top:6px; line-height:1.5; }
      .ie-hint.center { text-align:center; margin-top:0; }
      .ie-grid { display:grid; gap:15px; }
      .ie-cats { display:flex; flex-wrap:wrap; gap:7px; }
      .ie-cat-pick { display:inline-flex; align-items:center; gap:6px; border:1px solid #e7e1d7; background:#fff; border-radius:3px; padding:7px 12px; font-size:.8rem; font-weight:600; cursor:pointer; font-family:inherit; color:#8a8378; }
      .ie-cat-pick i { width:7px; height:7px; border-radius:50%; }
      .ie-cat-pick:hover:not(.on) { background:#faf8f3; }
      .ie-cat-pick.on { font-weight:700; }
      .ie-seg { display:inline-flex; border:1px solid #e7e1d7; border-radius:3px; overflow:hidden; background:#fff; }
      .ie-seg.full { display:flex; width:100%; }
      .ie-seg button { padding:9px 14px; border:none; border-right:1px solid #e7e1d7; background:#fff; font-size:.8rem; font-weight:600; cursor:pointer; font-family:inherit; color:#8a8378; white-space:nowrap; }
      .ie-seg.full button { flex:1; }
      .ie-seg button:last-child { border-right:none; }
      .ie-seg button:hover:not(.on):not(:disabled) { background:#faf8f3; color:#2a231d; }
      .ie-seg button.on { background:#2a231d; color:#fff; }
      .ie-seg button.on.green { background:${GREEN}; }
      .ie-seg button.on.red { background:${RED}; }
      .ie-seg button:disabled { opacity:.45; cursor:not-allowed; }
      .ie-seg.tiny button { padding:7px 8px; font-size:.75rem; }
      .ie-seg.tiny button em { font-style:normal; opacity:.65; margin-left:4px; }
      .ie-save { color:#fff; border:none; border-radius:3px; padding:13px; width:100%; font-size:.92rem; font-weight:700; cursor:pointer; font-family:inherit; margin-top:4px; }
      .ie-save:disabled { opacity:.45; cursor:not-allowed; }
      .ie-picker { border:1px solid #e7e1d7; border-radius:3px; padding:11px; background:#faf8f3; }
      .ie-plist { margin-top:9px; max-height:210px; overflow-y:auto; background:#fff; border:1px solid #e7e1d7; border-radius:3px; }
      .ie-plist::-webkit-scrollbar { width:5px; }
      .ie-plist::-webkit-scrollbar-thumb { background:#e7e1d7; border-radius:10px; }
      .ie-pitem { display:flex; align-items:center; gap:10px; width:100%; text-align:left; background:none; border:none; border-bottom:1px solid #f1ece3; padding:9px 12px; cursor:pointer; font-family:inherit; color:#2a231d; }
      .ie-pitem:last-child { border-bottom:none; }
      .ie-pitem:hover { background:#faf8f3; }
      .ie-pitem-main { flex:1; min-width:0; }
      .ie-pitem-name { display:block; font-size:.86rem; font-weight:600; }
      .ie-pitem-sub { display:block; font-size:.72rem; color:#8a8378; margin-top:1px; }
      .ie-pitem-amt { font-size:.72rem; font-weight:700; white-space:nowrap; flex-shrink:0; }
      .ie-pactions { display:grid; gap:7px; margin-top:9px; }
      .ie-addp { width:100%; background:#fff; border:1px dashed #e7e1d7; color:${ACCENT}; border-radius:3px; padding:9px; font-size:.82rem; font-weight:700; cursor:pointer; font-family:inherit; }
      .ie-addp:hover { border-color:${ACCENT}; background:#fdf2ee; }
      .ie-picked { display:flex; align-items:center; gap:12px; border:1px solid ${ACCENT}; background:#fdf2ee; border-radius:3px; padding:12px 14px; }
      .ie-picked-main { flex:1; min-width:0; }
      .ie-picked-name { font-size:.92rem; font-weight:700; }
      .ie-picked-sub { font-size:.76rem; color:#8a8378; margin-top:2px; }
      .ie-picked-bal { font-size:.76rem; font-weight:700; margin-top:4px; }
      .ie-change { background:#fff; border:1px solid #e7e1d7; border-radius:3px; padding:6px 13px; font-size:.76rem; font-weight:700; cursor:pointer; font-family:inherit; color:#2a231d; flex-shrink:0; }
      .ie-change:hover { background:#faf8f3; }
      .ie-newp { border:1px solid #e7e1d7; border-radius:3px; padding:13px; background:#faf8f3; }
      .ie-newp-h { display:flex; align-items:center; justify-content:space-between; margin-bottom:11px; }
      .ie-newp-h b { font-size:.84rem; }
      .ie-clash { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; background:#fdf3d9; border:1px solid #f0e0b4; border-radius:3px; padding:9px 12px; margin-top:10px; font-size:.8rem; color:#8a6b1f; }
      .ie-usebtn { background:${GOLD}; color:#fff; border:none; border-radius:3px; padding:6px 13px; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; }
      .ie-savep { width:100%; margin-top:13px; background:${ACCENT}; color:#fff; border:none; border-radius:3px; padding:11px; font-size:.86rem; font-weight:700; cursor:pointer; font-family:inherit; }
      .ie-savep:hover:not(:disabled) { background:${ACCENT_DK}; }
      .ie-savep:disabled { opacity:.45; cursor:not-allowed; }
      .ie-ghost { background:#fff; border:1px solid #e7e1d7; color:#2a231d; border-radius:3px; padding:9px 15px; font-size:.8rem; font-weight:600; cursor:pointer; font-family:inherit; }
      .ie-ghost:hover:not(:disabled) { background:#faf8f3; }
      .ie-ghost:disabled { opacity:.5; cursor:not-allowed; }
      .ie-link { background:none; border:none; color:${ACCENT}; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; padding:4px 2px; }
      .ie-check { display:inline-flex; align-items:center; gap:7px; font-size:.8rem; color:#8a8378; cursor:pointer; }
      .ie-check input { accent-color:${ACCENT}; }
      .ie-check.standalone { padding:4px 0; }
      .ie-pempty { padding:22px 12px; text-align:center; color:#b3ab9f; font-size:.84rem; }
      .ie-pempty b { display:block; color:#2a231d; font-weight:700; margin-bottom:3px; }
      .ie-av { width:30px; height:30px; border-radius:50%; color:#fff; font-size:.7rem; font-weight:700; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
      .ie-av.sm { width:18px; height:18px; font-size:.55rem; }
      .ie-av.lg { width:38px; height:38px; font-size:.82rem; }
      @media (max-width:860px) { .ie-mgrid { grid-template-columns:1fr; } .ie-2col { grid-template-columns:1fr; } }
    `}</style>
  );
}

/* ── small primitives ── */
export function Empty({ msg }: { msg: string }) {
  return <div style={{ padding:"40px 24px", textAlign:"center", color:FAINT, fontSize:14 }}>{msg}</div>;
}

export function KpiCard({ label, val, color, sub, money = true }: { label: string; val: number; color: string; sub?: string; money?: boolean }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${LINE}`, borderTop:`3px solid ${color}`, padding:"16px 18px" }}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.8, color:MUTED, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:900, color }}>{money ? rupees(val) : val}</div>
      {sub && <div style={{ fontSize:11, color:FAINT, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

export function CardHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div style={{ padding:"12px 16px", borderBottom:`1px solid ${LINE_SOFT}`, fontWeight:700, fontSize:14, display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
      <span>{title}</span>{right}
    </div>
  );
}

export function CsvBtn({ disabled, onClick, label = "⭳ Export CSV" }: { disabled?: boolean; onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding:"6px 14px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:disabled?"not-allowed":"pointer", color:MUTED, opacity:disabled?.5:1 }}>
      {label}
    </button>
  );
}

export function PeriodBar({ period, range, onPeriod, onRange }: {
  period: Period; range: { from: string; to: string };
  onPeriod: (p: Period) => void; onRange: (from: string, to: string) => void;
}) {
  return (
    <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
      <div style={{ display:"flex", border:`1px solid ${LINE}`, overflow:"hidden" }}>
        {PERIODS.map((p) => (
          <button key={p} onClick={() => onPeriod(p)}
            style={{ padding:"8px 14px", border:"none", borderRight:`1px solid ${LINE}`, fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer", background:period===p?INK:"#fff", color:period===p?"#fff":MUTED }}>
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>
      <input type="date" value={range.from} onChange={(e) => onRange(e.target.value, range.to)}
        style={{ padding:"8px 10px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK }} />
      <span style={{ color:MUTED, fontSize:12 }}>to</span>
      <input type="date" value={range.to} onChange={(e) => onRange(range.from, e.target.value)}
        style={{ padding:"8px 10px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK }} />
    </div>
  );
}

/* ── rows (parent filters out an undo-hidden row before mapping) ── */
export function EntryRow({ e, busy, onEdit, onDuplicate, onDelete }: {
  e: Entry; busy?: boolean; onEdit: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const cat = CATEGORY_META[e.category];
  const met = METHOD_META[e.method];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderBottom:`1px solid ${LINE_SOFT}`, background:"#fff", opacity: busy ? .5 : 1 }}>
      <div style={{ width:3, alignSelf:"stretch", background:RED, flexShrink:0 }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:14, fontWeight:600, color:INK }}>{e.title}</span>
          <span style={{ fontSize:11, fontWeight:700, color:cat?.color, background:`${cat?.color}14`, padding:"1px 7px" }}>{cat?.label}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4, fontSize:12, color:MUTED, flexWrap:"wrap" }}>
          <span>{fmtDate(e.date.slice(0,10))}</span>
          <span style={{ background:met.bg, color:met.color, padding:"1px 7px", fontWeight:700, fontSize:11 }}>{met.label}</span>
          {e.payee && <span style={{ fontWeight:600, color:INK }}>{e.payee.name}</span>}
          {e.notes && <span style={{ fontStyle:"italic", color:FAINT }}>{e.notes}</span>}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
        <span style={{ fontSize:15, fontWeight:800, color:RED }}>−{rupeesExact(e.amount)}</span>
        <button onClick={onEdit} style={st.btn}>Edit</button>
        <button onClick={onDuplicate} style={st.btn} title="Duplicate entry">⎘</button>
        <button onClick={onDelete} style={{ ...st.btn, color:RED, borderColor:`${RED}55` }}>Delete</button>
      </div>
    </div>
  );
}

export function IncomeRow({ e, busy, onEdit, onDelete }: {
  e: Entry; busy?: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const met = METHOD_META[e.method];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderBottom:`1px solid ${LINE_SOFT}`, background:"#fff", opacity: busy ? .5 : 1 }}>
      <div style={{ width:3, alignSelf:"stretch", background:GREEN, flexShrink:0 }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:14, fontWeight:600, color:INK }}>{e.title}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4, fontSize:12, color:MUTED, flexWrap:"wrap" }}>
          <span>{fmtDate(e.date.slice(0,10))}</span>
          <span style={{ background:met.bg, color:met.color, padding:"1px 7px", fontWeight:700, fontSize:11 }}>{met.label}</span>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
        <span style={{ fontSize:15, fontWeight:800, color:GREEN }}>+{rupeesExact(e.amount)}</span>
        <button onClick={onEdit} style={st.btn}>Edit</button>
        <button onClick={onDelete} style={{ ...st.btn, color:RED, borderColor:`${RED}55` }}>Delete</button>
      </div>
    </div>
  );
}

/* ── expense list (used by Insights / Salary / Outside) ── */
export function ExpenseList({ rows, emptyMsg, busyId, onExport, onEdit, onDuplicate, onDelete }: {
  rows: Entry[]; emptyMsg: string; busyId: string | null;
  onExport: () => void; onEdit: (e: Entry) => void; onDuplicate: (e: Entry) => void; onDelete: (e: Entry) => void;
}) {
  const total = rows.reduce((s, e) => s + e.amount, 0);
  return (
    <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
      <CardHead title={`${rows.length} ${rows.length===1?"entry":"entries"} · ${rupees(total)}`} right={<CsvBtn disabled={!rows.length} onClick={onExport}/>} />
      {rows.length === 0 ? <Empty msg={emptyMsg}/> : rows.map((e) => (
        <EntryRow key={e.id} e={e} busy={busyId===e.id}
          onEdit={() => onEdit(e)} onDuplicate={() => onDuplicate(e)} onDelete={() => onDelete(e)} />
      ))}
    </div>
  );
}

/* ── statement tables (ledger) ── */
export function StatementTable({ rows }: { rows: RowEntry[] }) {
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
        <thead>
          <tr style={{ background:WASH }}>
            {["Date","Details","Category","Person","Method","Amount","Running"].map((h) => (
              <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:MUTED, borderBottom:`1px solid ${LINE}`, whiteSpace:"nowrap" as const }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((e, idx) => {
            const cat = CATEGORY_META[e.category];
            const met = METHOD_META[e.method];
            return (
              <tr key={e.id} style={{ background: idx%2===0?"#fff":WASH }}>
                <td style={st.td}>{fmtDate(e.date.slice(0,10))}</td>
                <td style={{ ...st.td, fontWeight:600, color:INK }}>{e.title}{e.notes && <span style={{ color:FAINT, fontWeight:400, marginLeft:6, fontStyle:"italic" }}>{e.notes}</span>}</td>
                <td style={st.td}><span style={{ color:cat?.color, fontWeight:700, fontSize:11 }}>{cat?.label}</span></td>
                <td style={{ ...st.td, color:MUTED }}>{e.payee?.name || "—"}</td>
                <td style={st.td}><span style={{ background:met.bg, color:met.color, padding:"1px 7px", fontSize:11, fontWeight:700 }}>{met.label}</span></td>
                <td style={{ ...st.td, fontWeight:700, color:RED, whiteSpace:"nowrap" as const }}>−{rupeesExact(e.amount)}</td>
                <td style={{ ...st.td, fontWeight:700, color:INK, whiteSpace:"nowrap" as const }}>{rupees(e.running)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function IncomeStatementTable({ rows }: { rows: RowEntry[] }) {
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
        <thead>
          <tr style={{ background:WASH }}>
            {["Date","Note","Method","Amount","Running"].map((h) => (
              <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:MUTED, borderBottom:`1px solid ${LINE}`, whiteSpace:"nowrap" as const }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((e, idx) => {
            const met = METHOD_META[e.method];
            return (
              <tr key={e.id} style={{ background: idx%2===0?"#fff":WASH }}>
                <td style={st.td}>{fmtDate(e.date.slice(0,10))}</td>
                <td style={{ ...st.td, fontWeight:600, color:INK }}>{e.title}</td>
                <td style={st.td}><span style={{ background:met.bg, color:met.color, padding:"1px 7px", fontSize:11, fontWeight:700 }}>{met.label}</span></td>
                <td style={{ ...st.td, fontWeight:700, color:GREEN, whiteSpace:"nowrap" as const }}>+{rupeesExact(e.amount)}</td>
                <td style={{ ...st.td, fontWeight:700, color:INK, whiteSpace:"nowrap" as const }}>{rupees(e.running)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── donut ── */
export function Donut({ data }: { data: { label: string; amount: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0) || 1;
  const R = 62, C = 2 * Math.PI * R, cx = 80, cy = 80, W = 22;
  let acc = 0;
  return (
    <svg viewBox="0 0 160 160" width={150} height={150} style={{ flexShrink:0 }}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={LINE_SOFT} strokeWidth={W}/>
      {data.map((d, i) => {
        const frac = d.amount / total;
        const seg = (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={d.color} strokeWidth={W}
            strokeDasharray={`${frac * C} ${C - frac * C}`} strokeDashoffset={-acc * C}
            transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt"/>
        );
        acc += frac;
        return seg;
      })}
      <text x={cx} y={cy - 3} textAnchor="middle" fontSize={10} fontWeight={700} fill={MUTED}>Total</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={15} fontWeight={800} fill={INK}>{rupees(total)}</text>
    </svg>
  );
}