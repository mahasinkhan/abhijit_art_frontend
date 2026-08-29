// src/components/expenses/types.ts

// ── Design tokens (same admin palette as inventory / billing) ──
export const ACCENT    = "#d9542f";
export const ACCENT_DK = "#b8421f";
export const GOLD      = "#c2974a";
export const INK       = "#2a231d";
export const MUTED     = "#8a8378";
export const FAINT     = "#b3ab9f";
export const LINE      = "#e7e1d7";
export const LINE_SOFT = "#f1ece3";
export const WASH      = "#faf8f3";
export const GREEN     = "#2f7a3f";
export const BLUE      = "#1e5fa8";

export const METHOD_META = {
  cash:   { label: "Cash",   color: GREEN, bg: "#e5f2e8" },
  online: { label: "Online", color: BLUE,  bg: "#e6eff9" },
} as const;

// ── Money ──
export const rupees = (n?: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

/** Keeps paise when they exist, hides ".00" when they don't. */
export const rupeesExact = (n?: number) => {
  const v = n || 0;
  return `₹${v.toLocaleString("en-IN", {
    minimumFractionDigits: v % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

export const round2 = (n: number) => Math.round(n * 100) / 100;

// ── Dates ──
export function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDay(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** "Today" / "Yesterday" / "29 Aug 2026" — used for the day group headers. */
export function fmtDayLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/** Local YYYY-MM-DD — never toISOString(), which shifts the day in IST. */
export function isoDate(d: Date = new Date()) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
}

/** "MK" from "Mahasin Khan" */
export const initials = (name: string) =>
  (name || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";

// ── CSV ──
export function toCsv(rows: (string | number)[][]) {
  return rows
    .map((r) => r.map((c) => {
      const s = String(c ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))
    .join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}