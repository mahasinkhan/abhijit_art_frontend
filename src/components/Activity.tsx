import { useEffect, useMemo, useState } from "react";
import api from "../api";

/* ══════════════════════════════════════════════════════════════
   ACTIVITY  ·  audit trail

   Reads GET /api/security/audit — one row per sensitive action (create,
   payment, cancel, delete, status, email) with who + when + what changed.
   This is the tamper record: if a figure ever looks off, you can see exactly
   who touched it. Read-only. Same warm palette; prefix act-.
   ══════════════════════════════════════════════════════════════ */

const INK = "#1f2430";
const BODY = "#545a67";
const MUTE = "#8a8f9a";
const FAINT = "#b6bac3";
const LINE = "#f0e6dc";
const LINE_COOL = "#ececf1";
const SOFT = "#fafbfc";
const CARD = "#ffffff";
const TERRA = "#d9542f";
const SANS = "'DM Sans', system-ui, sans-serif";

const GLOW =
  "radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.075) 0%, rgba(217,84,47,.022) 42%, rgba(217,84,47,0) 72%), linear-gradient(180deg, #fffcf9 0%, #ffffff 60%)";
const GLOW_SHADOW = "0 1px 2px rgba(17,20,30,.04), 0 10px 26px -18px rgba(217,84,47,.28)";

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  entityRef: string;
  summary: string;
  detail: any;
  actorId: string | null;
  actorName: string;
  ip: string;
  createdAt: string;
};

const ACTION_META: Record<string, { label: string; fg: string; bg: string; bd: string }> = {
  "invoice.create":  { label: "Created",   fg: "#15733f", bg: "#e8f6ee", bd: "#bfe3cd" },
  "invoice.payment": { label: "Payment",   fg: "#1d5fd8", bg: "#eaf0fc", bd: "#cbdbf6" },
  "invoice.status":  { label: "Status",    fg: "#9a6a12", bg: "#fbf3e3", bd: "#efdcb2" },
  "invoice.cancel":  { label: "Cancelled", fg: "#6b7280", bg: "#f1f2f5", bd: "#e4e5ea" },
  "invoice.delete":  { label: "Deleted",   fg: "#b3261e", bg: "#fdecea", bd: "#f3cfc2" },
  "invoice.email":   { label: "Emailed",   fg: "#0f766e", bg: "#e6f5f3", bd: "#bfe3dd" },
};
const metaFor = (action: string) =>
  ACTION_META[action] || { label: action || "Action", fg: BODY, bg: "#f4f4f6", bd: "#e6e6ea" };

/* chips: All + the actions we know about */
const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "invoice.create", label: "Created" },
  { key: "invoice.payment", label: "Payment" },
  { key: "invoice.status", label: "Status" },
  { key: "invoice.cancel", label: "Cancelled" },
  { key: "invoice.delete", label: "Deleted" },
  { key: "invoice.email", label: "Emailed" },
];

const timeAgo = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const fullTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
};

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const map: Record<string, JSX.Element> = {
    refresh: <path d="M20 11a8 8 0 1 0-1.5 5.5M20 5v6h-6" {...p} />,
    search: (<><circle cx="11" cy="11" r="7" {...p} /><path d="m21 21-4.3-4.3" {...p} /></>),
    shield: (<><path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z" {...p} /><path d="m9 12 2 2 4-4" {...p} /></>),
  };
  return (<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>{map[name]}</svg>);
}

export default function Activity() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = async (initial = false) => {
    initial ? setLoading(true) : setRefreshing(true);
    setError("");
    try {
      const res = await api.get("/security/audit", { params: { limit: 200 } });
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Couldn't load the activity log.");
    } finally {
      initial ? setLoading(false) : setRefreshing(false);
    }
  };
  useEffect(() => { load(true); }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs.filter((l) => {
      if (filter !== "all" && l.action !== filter) return false;
      if (!needle) return true;
      return (
        (l.summary || "").toLowerCase().includes(needle) ||
        (l.actorName || "").toLowerCase().includes(needle) ||
        (l.entityRef || "").toLowerCase().includes(needle)
      );
    });
  }, [logs, filter, q]);

  return (
    <div style={st.page}>
      <div style={st.head}>
        <div>
          <h1 style={st.title}>Activity</h1>
          <p style={st.sub}>Every sensitive change is recorded here — who, when, and what changed.</p>
        </div>
        <button className="act-ghost" style={st.ghostBtn} onClick={() => load(false)} disabled={refreshing} title="Reload">
          <Icon name="refresh" size={15} /> {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div style={st.toolbar}>
        <div style={st.filters}>
          {FILTERS.map((f) => (
            <button key={f.key} className={`act-chip${filter === f.key ? " on" : ""}`} style={st.chip} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={st.searchWrap}>
          <span style={st.searchIcon}><Icon name="search" size={15} /></span>
          <input className="act-in" style={st.search} placeholder="Search action, person, invoice…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="act-card" style={st.tableCard}>
        {loading ? (
          <div style={st.skelWrap}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="act-skel" style={st.skelRow} />)}
          </div>
        ) : error ? (
          <div style={st.empty}>
            <p style={{ margin: 0 }}>{error}</p>
            <button className="act-ghost" style={{ ...st.ghostBtn, marginTop: 14 }} onClick={() => load(true)}>Try again</button>
          </div>
        ) : logs.length === 0 ? (
          <div style={st.empty}>
            <span style={{ color: FAINT, display: "block", marginBottom: 10 }}><Icon name="shield" size={34} /></span>
            <p style={{ margin: 0, fontWeight: 700, color: INK }}>No activity yet</p>
            <p style={{ margin: "5px 0 0", fontSize: 13.5 }}>Once invoices are created, paid, cancelled or deleted, every action shows up here.</p>
          </div>
        ) : shown.length === 0 ? (
          <div style={st.empty}><p style={{ margin: 0 }}>No activity matches your filters.</p></div>
        ) : (
          <div className={refreshing ? "act-dim" : ""} style={st.tableWrap}>
            <table style={st.table}>
              <thead>
                <tr>
                  <th style={{ ...st.th, width: 150 }}>When</th>
                  <th style={{ ...st.th, width: 160 }}>Who</th>
                  <th style={{ ...st.th, width: 120 }}>Action</th>
                  <th style={st.th}>Details</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => {
                  const m = metaFor(l.action);
                  return (
                    <tr key={l.id} className="act-tr">
                      <td style={{ ...st.td, whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 700, color: INK }} title={fullTime(l.createdAt)}>{timeAgo(l.createdAt)}</div>
                        <div style={st.subline}>{fullTime(l.createdAt)}</div>
                      </td>
                      <td style={st.td}>
                        <div style={{ fontWeight: 700, color: INK }}>{l.actorName || "—"}</div>
                        {l.ip && <div style={st.subline}>{l.ip}</div>}
                      </td>
                      <td style={st.td}>
                        <span style={{ ...st.badge, color: m.fg, background: m.bg, borderColor: m.bd }}>{m.label}</span>
                      </td>
                      <td style={{ ...st.td, color: "#2a2f3a" }}>{l.summary || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .act-card { background: ${GLOW}; border: 1px solid ${LINE}; box-shadow: ${GLOW_SHADOW}; }
        .act-in { transition: border-color .18s, box-shadow .18s; }
        .act-in:focus { border-color: ${TERRA}; box-shadow: 0 0 0 3px ${TERRA}22; outline: none; }
        .act-ghost, .act-chip { transition: all .16s ease; }
        .act-ghost:hover:not(:disabled) { background: #fffcf9; border-color: ${TERRA}55; color: ${TERRA}; }
        .act-ghost:disabled { opacity: .45; cursor: not-allowed; }
        .act-chip:hover { border-color: ${TERRA}55; color: ${TERRA}; }
        .act-chip.on { background: ${TERRA}; border-color: ${TERRA}; color: #fff; }
        .act-tr:hover td { background: #fafbfc; }
        .act-dim { opacity: .55; pointer-events: none; transition: opacity .15s; }
        .act-skel { background: linear-gradient(90deg, #f1ece6 25%, #f7f3ee 37%, #f1ece6 63%); background-size: 400% 100%; animation: actShimmer 1.3s ease infinite; }
        @keyframes actShimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
        @media (prefers-reduced-motion: reduce) { .act-in,.act-ghost,.act-chip,.act-skel { transition: none !important; animation: none !important; } }
      `}</style>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  page: { fontFamily: SANS, color: INK, minWidth: 0, maxWidth: "100%" },
  head: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 18 },
  title: { fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.6, color: INK },
  sub: { color: MUTE, fontSize: 13.5, margin: "6px 0 0" },
  ghostBtn: { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 0, border: `1px solid ${LINE}`, background: CARD, color: INK, fontFamily: SANS, fontWeight: 700, fontSize: 13.5, cursor: "pointer" },

  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 },
  filters: { display: "flex", gap: 8, flexWrap: "wrap" },
  chip: { padding: "8px 15px", borderRadius: 0, border: `1px solid ${LINE}`, background: CARD, color: BODY, fontFamily: SANS, fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  searchWrap: { position: "relative", flex: "1 1 200px", maxWidth: 340, minWidth: 170 },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: FAINT, display: "inline-flex", pointerEvents: "none" },
  search: { width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 36px", border: `1px solid #e6dcd2`, borderRadius: 0, fontSize: 14, fontFamily: SANS, background: "#fff", color: INK },

  tableCard: { borderRadius: 0, overflow: "hidden" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 720 },
  th: { textAlign: "left", padding: "13px 18px", fontSize: 10.5, letterSpacing: 0.7, textTransform: "uppercase", color: MUTE, background: SOFT, borderBottom: `1px solid ${LINE_COOL}`, fontWeight: 700, whiteSpace: "nowrap" },
  td: { padding: "13px 18px", borderBottom: `1px solid #f4f1ec`, verticalAlign: "top", color: BODY },
  subline: { fontSize: 11.5, color: MUTE, marginTop: 3 },
  badge: { display: "inline-flex", alignItems: "center", border: "1px solid", borderRadius: 0, padding: "5px 11px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", letterSpacing: 0.2 },

  skelWrap: { padding: "14px 18px" },
  skelRow: { height: 38, marginBottom: 10, borderRadius: 0 },
  empty: { textAlign: "center", padding: "48px 24px", color: MUTE, fontSize: 14 },
};