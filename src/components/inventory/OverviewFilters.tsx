// src/components/inventory/OverviewFilters.tsx
// ── Compact filter controls for the Overview tab (lives in the tab header) ──
// Three independent ways to set the range — touching one clears the others:
//   • Year dropdown   → a specific calendar year
//   • Month dropdown  → a specific month (of the chosen or current year)
//   • Calendar        → a single day (From only) OR a custom From–To range
import { useEffect, useState } from "react";
import { INK, MUTE, LINE, IVORY, CARD, TERRA, SANS } from "./types";

export type Gran = "day" | "week" | "month" | "year";
export interface OverviewFilter { gran: Gran; from: string; to: string; }

const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate();
const spanDays = (f: string, t: string) => Math.round((new Date(t).getTime() - new Date(f).getTime()) / 86400000);
const autoGran = (f: string, t: string): Gran => { const s = spanDays(f, t); return s <= 45 ? "day" : s <= 760 ? "month" : "year"; };

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS = (() => { const cy = new Date().getFullYear(); const a: number[] = []; for (let y = cy + 1; y >= cy - 4; y--) a.push(y); return a; })();

export default function OverviewFilters({ onChange }: { onChange: (f: OverviewFilter) => void }) {
  const [year,    setYear]    = useState<string>("");
  const [month,   setMonth]   = useState<string>("");
  const [calFrom, setCalFrom] = useState<string>("");
  const [calTo,   setCalTo]   = useState<string>("");

  useEffect(() => {
    let gran: Gran = "month", from = "", to = "";

    if (calFrom || calTo) {                                   // calendar: single day or range
      from = calFrom || calTo;
      to   = calTo   || calFrom;                              // From only → that single day
      gran = autoGran(from, to);
    } else if (year) {                                        // specific year / month
      const yr = Number(year);
      if (month) { const mo = Number(month); from = `${yr}-${pad(mo)}-01`; to = `${yr}-${pad(mo)}-${pad(lastDay(yr, mo))}`; gran = "day"; }
      else       { from = `${yr}-01-01`; to = `${yr}-12-31`; gran = "month"; }
    }
    // else → nothing set → backend default (last 6 months)

    onChange({ gran, from, to });
  }, [year, month, calFrom, calTo]); // eslint-disable-line

  function onYear(y: string)    { setYear(y); setCalFrom(""); setCalTo(""); }
  function onMonth(m: string)   { setMonth(m); setCalFrom(""); setCalTo(""); if (!year && m) setYear(String(new Date().getFullYear())); }
  function onCalFrom(v: string) { setCalFrom(v); setYear(""); setMonth(""); }
  function onCalTo(v: string)   { setCalTo(v);   setYear(""); setMonth(""); }
  function reset()              { setYear(""); setMonth(""); setCalFrom(""); setCalTo(""); }

  return (
    <div style={st.bar}>
      <style>{`
        .ovf-reset:hover { background:${IVORY}; color:${TERRA}; }
        .ovf-sel:focus, .ovf-date:focus { outline:2px solid ${TERRA}; outline-offset:-1px; }
      `}</style>

      {/* Specific year / month */}
      <select className="ovf-sel" style={st.sel} value={year} onChange={e => onYear(e.target.value)} title="Jump to a specific year">
        <option value="">Year</option>
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <select className="ovf-sel" style={st.sel} value={month} onChange={e => onMonth(e.target.value)} title="Jump to a specific month">
        <option value="">Month</option>
        {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
      </select>

      <div style={st.div}/>

      {/* Single date (From only) or a date range */}
      <input type="date" className="ovf-date" style={st.date} value={calFrom} onChange={e => onCalFrom(e.target.value)} title="Pick a single date, or the start of a range" />
      <span style={{ color:MUTE, fontSize:12 }}>→</span>
      <input type="date" className="ovf-date" style={st.date} value={calTo} onChange={e => onCalTo(e.target.value)} title="End of range (leave empty for a single day)" />

      <button className="ovf-reset" style={st.reset} onClick={reset} title="Reset filters">↺</button>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  bar:    { display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" },
  sel:    { padding:"6px 8px", border:`1px solid ${LINE}`, background:CARD, color:INK, fontSize:12.5, fontFamily:SANS, cursor:"pointer", outline:"none" },
  date:   { padding:"5px 8px", border:`1px solid ${LINE}`, background:CARD, color:INK, fontSize:12.5, fontFamily:SANS, outline:"none" },
  div:    { width:1, height:24, background:LINE },
  reset:  { width:30, height:30, border:`1px solid ${LINE}`, background:IVORY, color:MUTE, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:SANS },
};