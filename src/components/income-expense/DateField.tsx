// src/components/income-expense/DateField.tsx
// ─────────────────────────────────────────────────────────────────────────
// A date box that reads the same on every machine.
//
// A native <input type="date"> renders its text in the BROWSER's locale, not
// the page's, and that is not something CSS or JS can override. So the studio
// sees 16/09/2026 on one computer and 09/16/2026 on another — on a page full
// of money, where 09/06 could be June or September, that ambiguity is a real
// hazard.
//
// The fix keeps the native picker (its calendar is good, and it is what people
// know) but stops showing its text: the real input sits invisibly on top of
// our own DD/MM/YYYY label and catches the click. The value is still a plain
// "YYYY-MM-DD" string, so nothing downstream changes.
// ─────────────────────────────────────────────────────────────────────────
import { useRef } from "react";
import { INK, LINE, MUTED, FAINT, ACCENT } from "./types";

/** "2026-09-16" → "16/09/2026". Unambiguous everywhere. */
export function ddmmyyyy(iso?: string) {
  if (!iso || iso.length < 10) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export default function DateField({
  value, onChange, max, min, title, highlight, width = 138, style,
}: {
  value: string;                       // YYYY-MM-DD
  onChange: (v: string) => void;
  max?: string;
  min?: string;
  title?: string;
  /** draw attention — used when an entry is being backdated */
  highlight?: boolean;
  width?: number | string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLInputElement | null>(null);

  // Chrome only opens the calendar from its own icon, which is invisible here,
  // so the picker is asked for explicitly. Firefox has no showPicker(); there
  // the click lands on the input underneath and opens it the usual way.
  const open = () => {
    const el = ref.current;
    if (!el) return;
    try { (el as any).showPicker?.(); } catch { /* fall through to focus */ }
    el.focus();
  };

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        boxSizing: "border-box",
        width,
        padding: "9px 11px",
        border: `1px solid ${highlight ? ACCENT : LINE}`,
        background: "#fff",
        cursor: "pointer",
        ...style,
      }}
      title={title || "Pick a date"}
      onClick={open}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke={highlight ? ACCENT : MUTED} strokeWidth="2"
           strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>

      <span style={{
        fontSize: 13,
        fontVariantNumeric: "tabular-nums",
        color: value ? (highlight ? ACCENT : INK) : FAINT,
        fontWeight: highlight ? 700 : 500,
        whiteSpace: "nowrap",
      }}>
        {ddmmyyyy(value) || "DD/MM/YYYY"}
      </span>

      {/* The real control: invisible, but still focusable and keyboard-usable,
          so this stays a date input to the browser and to a screen reader. */}
      <input
        ref={ref}
        type="date"
        value={value}
        max={max}
        min={min}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          colorScheme: "light",
        }}
      />
    </div>
  );
}