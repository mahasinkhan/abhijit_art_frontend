// src/pages/EmployeeDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMyTasks, fmtDate, taskCue, rupees } from "../hooks/useMyTasks";
import { employeeTaskApi, type TaskStatus } from "../services/employee-task.api";
import { TaskCard }   from "../components/employees/TaskCard";
import { TaskDetail } from "../components/employees/TaskDetail";
import { TeamView }   from "../components/employees/TeamView";

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoDash    = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>);
const IcoTasks   = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M9 12l2 2 4-4"/></svg>);
const IcoTeam    = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IcoChevron = ({ open }: { open: boolean }) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "none" : "rotate(180deg)", transition: "transform .2s" }}><path d="M15 18l-6-6 6-6"/></svg>);
const IcoArrow   = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>);

// ── Tokens ────────────────────────────────────────────────────────────────────
const ACCENT    = "#d9542f";
const ACCENT_DK = "#b8421f";
const GOLD      = "#c2974a";
const INK       = "#2a231d";
const MUTED     = "#8a8378";
const FAINT     = "#b3ab9f";
const LINE      = "#e7e1d7";
const LINE_SOFT = "#f1ece3";
const WASH      = "#faf8f3";
const PAGE      = "#f6f2ea";

const STATUS_META = {
  pending:     { label: "Pending",     color: "#9a6a12", bg: "#fbf1dd" },
  in_progress: { label: "In progress", color: "#1e5fa8", bg: "#e6eff9" },
  completed:   { label: "Completed",   color: "#2f7a3f", bg: "#e5f2e8" },
  cancelled:   { label: "Cancelled",   color: "#7c766c", bg: "#f0ede7" },
};

type View = "dashboard" | "tasks" | "team";
type Tab  = "all" | "pending" | "in_progress" | "completed";

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const userId    = user?.id;
  const firstName = (user?.name || "there").split(" ")[0];
  const initial   = (user?.name || "S").trim().charAt(0).toUpperCase();

  const {
    tasks, loading, live, stats,
    needsAttention, recentDelivered, applyUpdated,
  } = useMyTasks(userId);

  const [view,       setView]       = useState<View>("dashboard");
  const [collapsed,  setCollapsed]  = useState(false);
  const [tab,        setTab]        = useState<Tab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [busy,       setBusy]       = useState<"" | "status" | "notes" | "deliver">("");
  const [lightbox,   setLightbox]   = useState<string | null>(null);

  const displayed = useMemo(() =>
    tab === "all" ? tasks : tasks.filter((t) => t.status === tab),
  [tasks, tab]);

  const selected = tasks.find((t) => t.id === selectedId) || null;
  useEffect(() => { setNotesDraft(selected?.notes || ""); }, [selectedId]); // eslint-disable-line

  function openTask(id: string) { setSelectedId(id); setTab("all"); setView("tasks"); }
  function goTasks()            { setView("tasks"); if (!selectedId && tasks[0]) setSelectedId(tasks[0].id); }
  function doLogout()           { try { logout?.(); } catch { /* ignore */ } navigate("/login"); }

  async function handleStatus(status: TaskStatus, kind: "status" | "notes") {
    if (!selected) return;
    setBusy(kind);
    try {
      const updated = await employeeTaskApi.updateStatus(selected.id, status, notesDraft);
      applyUpdated(updated);
    } catch (err: any) { alert(err.response?.data?.error || "Could not update the task"); }
    finally { setBusy(""); }
  }

  async function handleDeliver(delivered: boolean) {
    if (!selected) return;
    setBusy("deliver");
    try {
      const updated = await employeeTaskApi.deliver(selected.id, delivered);
      applyUpdated(updated);
    } catch (err: any) { alert(err.response?.data?.error || "Could not update delivery"); }
    finally { setBusy(""); }
  }

  const NAV = [
    { id: "dashboard" as View, label: "Dashboard", icon: <IcoDash />,  badge: 0,          onClick: () => setView("dashboard") },
    { id: "tasks"     as View, label: "My tasks",  icon: <IcoTasks />, badge: stats.total, onClick: goTasks },
    { id: "team"      as View, label: "Team",       icon: <IcoTeam />,  badge: 0,          onClick: () => setView("team") },
  ];

  return (
    <div className={`ep${collapsed ? " ep-collapsed" : ""}`}>
      <style>{`
        .ep { font-family:'DM Sans',system-ui,sans-serif; color:${INK}; background:${PAGE}; min-height:100vh; display:flex; font-variant-numeric:tabular-nums; }
        .ep * { box-sizing:border-box; }
        .ep-side { width:236px; flex-shrink:0; background:#fff; border-right:1px solid ${LINE}; position:sticky; top:0; height:100vh; display:flex; flex-direction:column; transition:width .2s; }
        .ep-collapsed .ep-side { width:70px; }
        .ep-brand { display:flex; align-items:center; gap:11px; padding:20px 18px 18px; border-bottom:1px solid ${LINE_SOFT}; min-height:66px; }
        .ep-mark { width:30px; height:30px; border-radius:6px; background:${ACCENT}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1rem; flex-shrink:0; }
        .ep-brand-t { min-width:0; }
        .ep-brand-t b { font-size:.95rem; font-weight:700; display:block; line-height:1.1; white-space:nowrap; }
        .ep-brand-t span { font-size:.66rem; color:${MUTED}; text-transform:uppercase; letter-spacing:.08em; }
        .ep-collapsed .ep-brand-t { display:none; }
        .ep-menu-l { font-size:.62rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:${FAINT}; padding:18px 20px 8px; }
        .ep-collapsed .ep-menu-l { text-align:center; padding:18px 0 8px; }
        .ep-nav { display:flex; flex-direction:column; gap:2px; padding:0 12px; }
        .ep-navitem { display:flex; align-items:center; gap:12px; padding:11px 12px; border:none; background:none; font-family:inherit; font-size:.9rem; font-weight:600; color:${MUTED}; cursor:pointer; border-radius:6px; border-left:3px solid transparent; width:100%; text-align:left; position:relative; }
        .ep-navitem:hover { background:${WASH}; color:${INK}; }
        .ep-navitem.on { background:#fdf2ee; color:${ACCENT}; border-left-color:${ACCENT}; }
        .ep-navitem svg { flex-shrink:0; }
        .ep-navitem-l { white-space:nowrap; flex:1; }
        .ep-collapsed .ep-navitem-l { display:none; }
        .ep-collapsed .ep-navitem { justify-content:center; padding:11px; border-left:none; border-radius:8px; }
        .ep-badge-n { background:${WASH}; color:${MUTED}; font-size:.72rem; font-weight:700; padding:1px 8px; border-radius:999px; }
        .ep-navitem.on .ep-badge-n { background:#f7dccf; color:${ACCENT_DK}; }
        .ep-collapsed .ep-badge-n { position:absolute; top:4px; right:6px; padding:0 5px; font-size:.62rem; }
        .ep-side-foot { margin-top:auto; padding:12px; border-top:1px solid ${LINE_SOFT}; }
        .ep-collapse { display:flex; align-items:center; gap:10px; width:100%; padding:9px 12px; border:1px solid ${LINE}; border-radius:6px; background:#fff; color:${MUTED}; font-family:inherit; font-size:.8rem; font-weight:600; cursor:pointer; }
        .ep-collapse:hover { background:${WASH}; }
        .ep-collapsed .ep-collapse { justify-content:center; padding:9px; }
        .ep-collapse-l { white-space:nowrap; }
        .ep-collapsed .ep-collapse-l { display:none; }
        .ep-main { flex:1; min-width:0; display:flex; flex-direction:column; }
        .ep-top { display:flex; align-items:center; justify-content:space-between; gap:14px; background:#fff; border-bottom:1px solid ${LINE}; padding:0 26px; height:66px; position:sticky; top:0; z-index:5; }
        .ep-top-title { font-size:1.25rem; font-weight:700; letter-spacing:-.01em; }
        .ep-top-r { display:flex; align-items:center; gap:16px; }
        .ep-live { display:inline-flex; align-items:center; gap:6px; font-size:.74rem; color:${MUTED}; }
        .ep-live-dot { width:8px; height:8px; border-radius:50%; }
        .ep-user { display:flex; align-items:center; gap:10px; }
        .ep-avatar { width:34px; height:34px; border-radius:50%; background:${ACCENT}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.9rem; }
        .ep-uname { font-size:.86rem; font-weight:600; }
        .ep-logout { background:#fff; border:1px solid ${LINE}; color:${INK}; border-radius:6px; padding:7px 14px; font-size:.8rem; font-weight:600; cursor:pointer; font-family:inherit; }
        .ep-logout:hover { background:${WASH}; border-color:#d8cfc0; }
        .ep-content { padding:26px; max-width:1100px; width:100%; }
        .ep-hi { font-size:1.5rem; font-weight:700; letter-spacing:-.01em; }
        .ep-sub { font-size:.9rem; color:${MUTED}; margin-top:4px; }
        .ep-sub b { color:${ACCENT}; font-weight:700; }
        .ep-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:22px 0; }
        .ep-stat { background:#fff; border:1px solid ${LINE}; border-left-width:3px; border-radius:4px; padding:15px 16px; }
        .ep-stat-n { font-size:1.7rem; font-weight:700; line-height:1; }
        .ep-stat-l { font-size:.66rem; text-transform:uppercase; letter-spacing:.08em; color:${MUTED}; margin-top:7px; }
        .ep-prio { display:inline-flex; align-items:center; gap:5px; font-size:.74rem; font-weight:700; }
        .ep-prio-dot { width:7px; height:7px; border-radius:50%; }
        .ep-tstatus { display:inline-block; padding:2px 9px; border-radius:3px; font-size:.68rem; font-weight:700; }
        .ep-cue { font-size:.78rem; font-weight:600; }
        .ep-cue.ok{color:${MUTED};} .ep-cue.soon{color:#b45309;} .ep-cue.over{color:${ACCENT};} .ep-cue.done{color:#2f7a3f;} .ep-cue.ready{color:${ACCENT};}
        .ep-panel { background:#fff; border:1px solid ${LINE}; border-radius:4px; margin-bottom:16px; overflow:hidden; }
        .ep-panel-h { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:14px 18px; border-bottom:1px solid ${LINE_SOFT}; }
        .ep-panel-h b { font-size:.92rem; font-weight:700; }
        .ep-panel-h .ep-count { font-size:.72rem; color:${MUTED}; }
        .ep-viewall { background:none; border:none; color:${ACCENT}; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px; }
        .ep-viewall:hover { color:${ACCENT_DK}; }
        .ep-arow { display:flex; align-items:center; gap:14px; padding:13px 18px; border-bottom:1px solid ${LINE_SOFT}; cursor:pointer; text-align:left; width:100%; background:none; border-left:none; border-right:none; border-top:none; font-family:inherit; }
        .ep-arow:last-child { border-bottom:none; }
        .ep-arow:hover { background:${WASH}; }
        .ep-arow-main { flex:1; min-width:0; }
        .ep-arow-t { font-size:.9rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ep-arow-sub { font-size:.76rem; color:${MUTED}; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ep-arow-r { display:flex; align-items:center; gap:12px; flex-shrink:0; }
        .ep-arow-go { color:${FAINT}; display:flex; }
        .ep-arow:hover .ep-arow-go { color:${ACCENT}; }
        .ep-empty { padding:30px 18px; text-align:center; color:${FAINT}; font-size:.88rem; line-height:1.6; }
        .ep-empty b { color:#2f7a3f; font-weight:700; display:block; margin-bottom:3px; }
        .ep-tabs { display:flex; gap:4px; border-bottom:1px solid ${LINE}; margin-bottom:18px; overflow-x:auto; }
        .ep-tab { background:none; border:none; padding:11px 14px; font-size:.88rem; font-weight:600; color:${MUTED}; cursor:pointer; font-family:inherit; border-bottom:2px solid transparent; margin-bottom:-1px; white-space:nowrap; }
        .ep-tab:hover { color:${INK}; }
        .ep-tab.on { color:${ACCENT}; border-bottom-color:${ACCENT}; }
        .ep-tab .c { color:${FAINT}; font-weight:500; }
        .ep-tab.on .c { color:${ACCENT}; }
        .ep-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; margin-bottom:22px; }
        .ep-card { background:#fff; border:1px solid ${LINE}; border-radius:4px; padding:15px 16px; cursor:pointer; text-align:left; font-family:inherit; color:inherit; border-left:3px solid ${LINE}; transition:border-color .12s,box-shadow .12s; }
        .ep-card:hover { border-color:#d8cfc0; }
        .ep-card.sel { border-color:${ACCENT}; box-shadow:0 0 0 1px ${ACCENT}; }
        .ep-card-title { font-size:.98rem; font-weight:700; line-height:1.3; }
        .ep-card-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:9px; }
        .ep-card .ep-cue { margin-top:9px; }
        .ep-detail { background:#fff; border:1px solid ${LINE}; border-radius:4px; }
        .ep-d-head { display:flex; align-items:flex-start; gap:12px; padding:20px 24px 16px; border-bottom:1px solid ${LINE_SOFT}; }
        .ep-d-headmain { flex:1; min-width:0; }
        .ep-d-title { font-size:1.2rem; font-weight:700; line-height:1.3; }
        .ep-d-meta { font-size:.8rem; color:${MUTED}; margin-top:6px; }
        .ep-close { background:none; border:none; font-size:1.4rem; line-height:1; cursor:pointer; color:${MUTED}; padding:0 2px; }
        .ep-close:hover { color:${INK}; }
        .ep-d-body { padding:20px 24px 24px; }
        .ep-sec { margin-top:20px; }
        .ep-sec:first-child { margin-top:0; }
        .ep-sec-l { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:${MUTED}; margin-bottom:9px; }
        .ep-cust { display:flex; flex-wrap:wrap; gap:8px 20px; background:${WASH}; border:1px solid ${LINE}; border-radius:3px; padding:13px 15px; }
        .ep-cust div span { font-size:.62rem; text-transform:uppercase; letter-spacing:.05em; color:${FAINT}; display:block; margin-bottom:2px; }
        .ep-cust div b { font-size:.88rem; font-weight:600; }
        .ep-desc { font-size:.9rem; line-height:1.65; white-space:pre-wrap; background:${WASH}; border-left:3px solid ${GOLD}; border-radius:0 3px 3px 0; padding:13px 15px; }
        .ep-links a { color:${ACCENT}; font-size:.84rem; display:block; margin-bottom:5px; word-break:break-all; text-decoration:none; }
        .ep-links a:hover { text-decoration:underline; }
        .ep-imgs { display:flex; flex-wrap:wrap; gap:10px; }
        .ep-img { width:120px; height:90px; object-fit:cover; border:1px solid ${LINE}; border-radius:3px; cursor:pointer; }
        .ep-img:hover { border-color:${ACCENT}; }
        .ep-ta { width:100%; min-height:96px; resize:vertical; padding:11px 13px; border:1px solid ${LINE}; border-radius:3px; font-size:.9rem; font-family:inherit; color:${INK}; }
        .ep-ta:focus { outline:none; border-color:${ACCENT}; }
        .ep-notes-ro { background:${WASH}; border:1px solid ${LINE}; border-radius:3px; padding:12px 14px; font-size:.88rem; white-space:pre-wrap; line-height:1.6; color:${INK}; }
        .ep-notes-ro.empty { color:${FAINT}; font-style:italic; }
        .ep-actions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:12px; }
        .ep-btn { border:none; border-radius:3px; padding:11px 20px; font-size:.88rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ep-btn:disabled { opacity:.55; cursor:not-allowed; }
        .ep-btn.primary { background:${ACCENT}; color:#fff; }
        .ep-btn.primary:hover:not(:disabled){ background:${ACCENT_DK}; }
        .ep-btn.go { background:#2f7a3f; color:#fff; }
        .ep-btn.go:hover:not(:disabled){ background:#276634; }
        .ep-btn.blue { background:#1e5fa8; color:#fff; }
        .ep-btn.blue:hover:not(:disabled){ background:#184e8a; }
        .ep-btn.ghost { background:#fff; border:1px solid ${LINE}; color:${INK}; }
        .ep-btn.ghost:hover:not(:disabled){ background:${WASH}; }
        .ep-hint { font-size:.78rem; color:${FAINT}; margin-top:10px; }
        .ep-deliver { border:1px solid ${LINE}; border-radius:4px; padding:16px; background:${WASH}; }
        .ep-deliver.ready { border-color:#f0d2c8; background:#fdf4f0; }
        .ep-deliver.done  { border-color:#c7e0cd; background:#eef6f0; }
        .ep-deliver-t { font-size:.92rem; font-weight:700; display:flex; align-items:center; gap:8px; }
        .ep-deliver.done .ep-deliver-t { color:#2f7a3f; }
        .ep-deliver-p { font-size:.82rem; color:${MUTED}; margin-top:4px; line-height:1.5; }
        .ep-tick { width:20px; height:20px; border-radius:50%; background:#2f7a3f; color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:.7rem; }
        .ep-loadempty { background:#fff; border:1px dashed ${LINE}; border-radius:4px; padding:44px 24px; text-align:center; color:${FAINT}; font-size:.92rem; line-height:1.6; }
        .ep-lb { position:fixed; inset:0; background:rgba(0,0,0,.9); z-index:2000; display:flex; align-items:center; justify-content:center; cursor:zoom-out; }
        .ep-lb img { max-width:92vw; max-height:92vh; object-fit:contain; }
        @media (max-width:760px){
          .ep-side { width:70px; }
          .ep-brand-t,.ep-menu-l,.ep-navitem-l,.ep-collapse-l { display:none !important; }
          .ep-navitem { justify-content:center; border-left:none; border-radius:8px; }
          .ep-brand { justify-content:center; padding:20px 0 18px; }
          .ep-collapse { justify-content:center; }
          .ep-uname { display:none; }
          .ep-top,.ep-content { padding-left:16px; padding-right:16px; }
          .ep-stats { grid-template-columns:repeat(2,1fr); }
          .ep-cards { grid-template-columns:1fr; }
        }
      `}</style>

      {/* ── Sidebar ── */}
      <aside className="ep-side">
        <div className="ep-brand">
          <div className="ep-mark">A</div>
          <div className="ep-brand-t"><b>Abhijit Art</b><span>Staff portal</span></div>
        </div>
        <div className="ep-menu-l">Menu</div>
        <nav className="ep-nav">
          {NAV.map((n) => (
            <button key={n.id} className={`ep-navitem${view === n.id ? " on" : ""}`}
              onClick={n.onClick} title={n.label}>
              {n.icon}
              <span className="ep-navitem-l">{n.label}</span>
              {n.badge > 0 && <span className="ep-badge-n">{n.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="ep-side-foot">
          <button className="ep-collapse" onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand" : "Collapse"}>
            <IcoChevron open={!collapsed} />
            <span className="ep-collapse-l">Collapse</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="ep-main">
        <header className="ep-top">
          <div className="ep-top-title">
            {view === "dashboard" ? "Dashboard" : view === "tasks" ? "My tasks" : "Team"}
          </div>
          <div className="ep-top-r">
            <span className="ep-live">
              <span className="ep-live-dot" style={{ background: live ? "#4ade80" : "#c9c2b6", boxShadow: live ? "0 0 0 3px rgba(74,222,128,.18)" : "none" }} />
              {live ? "Live" : "Offline"}
            </span>
            <div className="ep-user">
              <div className="ep-avatar">{initial}</div>
              <span className="ep-uname">{user?.name || ""}</span>
            </div>
            <button className="ep-logout" onClick={doLogout}>Logout</button>
          </div>
        </header>

        <div className="ep-content">

          {/* ── Dashboard ── */}
          {view === "dashboard" && (
            <>
              <div className="ep-hi">Good day, {firstName}!</div>
              <div className="ep-sub">
                {loading ? "Loading your work…"
                  : stats.total === 0 ? "No tasks assigned to you yet. New tasks appear here in real time."
                  : <>You have <b>{stats.total}</b> task{stats.total > 1 ? "s" : ""}
                    {stats.ready > 0 && <> · <b>{stats.ready}</b> ready to deliver</>}.</>}
              </div>

              <div className="ep-stats">
                {([
                  { key: "pending",     color: STATUS_META.pending.color,     label: "Pending"          },
                  { key: "in_progress", color: STATUS_META.in_progress.color, label: "In progress"      },
                  { key: "ready",       color: ACCENT,                         label: "Ready to deliver" },
                  { key: "completed",   color: STATUS_META.completed.color,   label: "Completed"        },
                ] as { key: keyof typeof stats; color: string; label: string }[]).map(({ key, color, label }) => (
                  <div key={key} className="ep-stat" style={{ borderLeftColor: color }}>
                    <div className="ep-stat-n" style={{ color }}>{stats[key]}</div>
                    <div className="ep-stat-l">{label}</div>
                  </div>
                ))}
              </div>

              {/* Needs attention */}
              <div className="ep-panel">
                <div className="ep-panel-h">
                  <b>Needs your attention</b>
                  <span className="ep-count">{needsAttention.length} item{needsAttention.length !== 1 ? "s" : ""}</span>
                </div>
                {needsAttention.length === 0 ? (
                  <div className="ep-empty"><b>All caught up</b>Nothing overdue and nothing waiting to be delivered.</div>
                ) : needsAttention.map(({ t, cue }) => (
                  <button key={t.id} className="ep-arow" onClick={() => openTask(t.id)}>
                    <div className="ep-arow-main">
                      <div className="ep-arow-t">{t.title}</div>
                      <div className="ep-arow-sub">{t.customerName ? `${t.customerName} · ` : ""}{t.invoiceNo || ""}</div>
                    </div>
                    <div className="ep-arow-r">
                      <span className={`ep-cue ${cue.tone}`}>{cue.text}</span>
                      <span className="ep-arow-go"><IcoArrow /></span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Recently delivered */}
              <div className="ep-panel">
                <div className="ep-panel-h">
                  <b>Recently delivered</b>
                  {stats.total > 0 && <button className="ep-viewall" onClick={goTasks}>View all tasks <IcoArrow /></button>}
                </div>
                {recentDelivered.length === 0 ? (
                  <div className="ep-empty">No orders delivered yet. Once you hand an order over and mark it delivered, it shows here.</div>
                ) : recentDelivered.map((t) => (
                  <button key={t.id} className="ep-arow" onClick={() => openTask(t.id)}>
                    <div className="ep-arow-main">
                      <div className="ep-arow-t">{t.title}</div>
                      <div className="ep-arow-sub">{t.customerName ? `${t.customerName} · ` : ""}Delivered {fmtDate(t.deliveredAt)}</div>
                    </div>
                    <div className="ep-arow-r">
                      <span className="ep-cue done">Delivered</span>
                      <span className="ep-arow-go"><IcoArrow /></span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── My Tasks ── */}
          {view === "tasks" && (
            <>
              <div className="ep-tabs">
                {([
                  { id: "all",         label: "All",         n: stats.total       },
                  { id: "pending",     label: "Pending",     n: stats.pending     },
                  { id: "in_progress", label: "In progress", n: stats.in_progress },
                  { id: "completed",   label: "Completed",   n: stats.completed   },
                ] as { id: Tab; label: string; n: number }[]).map((t) => (
                  <button key={t.id} className={`ep-tab${tab === t.id ? " on" : ""}`}
                    onClick={() => setTab(t.id)}>
                    {t.label} <span className="c">({t.n})</span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="ep-loadempty">Loading your tasks…</div>
              ) : displayed.length === 0 ? (
                <div className="ep-loadempty">
                  {tasks.length === 0
                    ? "No tasks assigned to you yet."
                    : `No ${tab === "in_progress" ? "in-progress" : tab} tasks right now.`}
                </div>
              ) : (
                <div className="ep-cards">
                  {displayed.map((t) => (
                    <TaskCard key={t.id} task={t}
                      selected={selectedId === t.id}
                      onClick={() => setSelectedId(t.id)} />
                  ))}
                </div>
              )}

              {selected && (
                <TaskDetail
                  task={selected}
                  isMe={selected.deliveredBy?.id === userId}
                  notesDraft={notesDraft}
                  setNotesDraft={setNotesDraft}
                  busy={busy}
                  onClose={() => setSelectedId(null)}
                  onStatus={handleStatus}
                  onDeliver={handleDeliver}
                  onImage={(src) => setLightbox(src)}
                />
              )}
            </>
          )}

          {/* ── Team View ── */}
          {/* ── Team View ── */}
{view === "team" && (
  <TeamView
    myId={userId}
    onOpenMine={(taskId) => openTask(taskId)}
  />
)}

        </div>
      </div>

      {lightbox && (
        <div className="ep-lb" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Full size" />
        </div>
      )}
    </div>
  );
}