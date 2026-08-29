// src/pages/EmployeeDashboard.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMyTasks, fmtDate, taskCue } from "../hooks/useMyTasks";
import { employeeTaskApi, type Task, type TaskStatus } from "../services/employee-task.api";
import { TaskDetail } from "../components/employees/TaskDetail";
import { TeamView }   from "../components/employees/TeamView";
import api from "../api";

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoDash    = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>);
const IcoTasks   = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M9 12l2 2 4-4"/></svg>);
const IcoTeam    = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IcoOrders  = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>);
const IcoChevron = ({ open }: { open: boolean }) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "none" : "rotate(180deg)", transition: "transform .2s" }}><path d="M15 18l-6-6 6-6"/></svg>);
const IcoArrow   = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>);
const IcoClose   = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);

// ── Tokens ────────────────────────────────────────────────────────────────────
const API_BASE  = import.meta.env.VITE_API_URL || "http://localhost:5000";
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
const GREEN     = "#2f7a3f";
const BLUE      = "#1e5fa8";
const AMBER     = "#9a6a12";

/**
 * ONE vocabulary everywhere — dashboard, tabs, cards and chips all use these
 * exact words, so "Completed" never means two different things again.
 *   To do  →  Working  →  Ready to deliver  →  Delivered
 */
type Stage = "todo" | "working" | "ready" | "delivered" | "cancelled";

const STAGE_META: Record<Stage, { label: string; color: string; bg: string }> = {
  todo:      { label: "To do",            color: AMBER,     bg: "#fbf1dd" },
  working:   { label: "Working",          color: BLUE,      bg: "#e6eff9" },
  ready:     { label: "Ready to deliver", color: ACCENT,    bg: "#fdeae2" },
  delivered: { label: "Delivered",        color: GREEN,     bg: "#e5f2e8" },
  cancelled: { label: "Cancelled",        color: "#7c766c", bg: "#f0ede7" },
};

function stageOf(t: Task): Stage {
  if (t.deliveredAt)              return "delivered";
  if (t.status === "cancelled")   return "cancelled";
  if (t.status === "completed")   return "ready";
  if (t.status === "in_progress") return "working";
  return "todo";
}

/** The single next thing this person should do to this job. */
function nextStep(t: Task): { label: string; tone: "blue" | "go" | "primary" } | null {
  const s = stageOf(t);
  if (s === "todo")    return { label: "Start work",       tone: "blue" };
  if (s === "working") return { label: "Mark complete",    tone: "go" };
  if (s === "ready")   return { label: "Mark as delivered", tone: "primary" };
  return null;
}

// Quick Order types
interface QOTask {
  id: string; status: string; priority: string; notes?: string;
  assignedTo: { id: string; name: string; role: string };
  startedAt?: string; completedAt?: string;
}
interface QuickOrder {
  id: string;
  customerName: string; customerPhone: string;
  workDetails: string; description: string;
  amount: number; advancePaid: number;
  paymentMethod: string;
  status: "unbilled" | "billed"; invoiceNo?: string;
  task?: QOTask | null;
  images?: string[];
  title?: string;
  entryDate: string; createdAt: string;
}

type View = "today" | "tasks" | "team" | "orders";
type Tab  = "all" | "todo" | "working" | "ready" | "delivered";
type OTab = "unassigned" | "mine" | "all";

const QO_STAGE: Record<string, Stage> = {
  pending: "todo", in_progress: "working", completed: "ready", cancelled: "cancelled",
};

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const userId    = user?.id;
  const firstName = (user?.name || "there").split(" ")[0];
  const initial   = (user?.name || "S").trim().charAt(0).toUpperCase();

  const { tasks, loading, live, applyUpdated } = useMyTasks(userId);

  const [view,       setView]       = useState<View>("today");
  const [collapsed,  setCollapsed]  = useState(false);
  const [tab,        setTab]        = useState<Tab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [busy,       setBusy]       = useState<"" | "status" | "notes" | "deliver">("");
  const [rowBusy,    setRowBusy]    = useState<string | null>(null);
  const [lightbox,   setLightbox]   = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

  // ── Quick Orders state ────────────────────────────────────────────────────
  const [orders,        setOrders]        = useState<QuickOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [oTab,          setOTab]          = useState<OTab>("unassigned");
  const [claiming,      setClaiming]      = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderNotes,    setOrderNotes]    = useState("");
  const [orderBusy,     setOrderBusy]     = useState(false);
  const [payAmt,        setPayAmt]        = useState("");
  const [payMethod,     setPayMethod]     = useState<"cash"|"online">("cash");
  const [payNote,       setPayNote]       = useState("");
  const [payBusy,       setPayBusy]       = useState(false);
  const [payErr,        setPayErr]        = useState("");

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try { const { data } = await api.get("/api/quick-orders"); setOrders(Array.isArray(data) ? data : []); }
    catch { /* ignore */ } finally { setOrdersLoading(false); }
  }, []);

  // orders are needed on the Today screen too (claim prompts)
  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { if (view === "orders") loadOrders(); }, [view, loadOrders]);

  const activeOrder = orders.find(o => o.id === activeOrderId) || null;
  useEffect(() => {
    setOrderNotes(activeOrder?.task?.notes || "");
    setPayAmt(""); setPayNote(""); setPayErr("");
  }, [activeOrderId]); // eslint-disable-line

  async function claimOrder(id: string) {
    if (!confirm("Claim this order? It moves into your work list.")) return;
    setClaiming(id);
    try {
      const { data } = await api.post(`/api/quick-orders/${id}/claim`);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, task: data.task } : o));
      setActiveOrderId(id);
      setOTab("mine");
      if (data.task) applyUpdated(data.task);
    } catch (err: any) { alert(err.response?.data?.message || "Failed to claim order"); }
    finally { setClaiming(null); }
  }

  async function updateOrderTaskStatus(status: TaskStatus) {
    if (!activeOrder?.task) return;
    setOrderBusy(true);
    try {
      const updated = await employeeTaskApi.updateStatus(activeOrder.task.id, status, orderNotes);
      setOrders(prev => prev.map(o =>
        o.id === activeOrderId
          ? { ...o, task: o.task ? { ...o.task, status: updated.status, notes: updated.notes, startedAt: updated.startedAt, completedAt: updated.completedAt } : o.task }
          : o
      ));
      applyUpdated(updated);
    } catch (err: any) { alert(err.response?.data?.error || "Failed to update"); }
    finally { setOrderBusy(false); }
  }

  async function saveOrderNotes() {
    if (!activeOrder?.task) return;
    setOrderBusy(true);
    try {
      const updated = await employeeTaskApi.updateStatus(activeOrder.task.id, activeOrder.task.status as TaskStatus, orderNotes);
      setOrders(prev => prev.map(o =>
        o.id === activeOrderId ? { ...o, task: o.task ? { ...o.task, notes: updated.notes } : o.task } : o
      ));
      applyUpdated(updated);
    } catch (err: any) { alert(err.response?.data?.error || "Failed to save notes"); }
    finally { setOrderBusy(false); }
  }

  async function recordPayment() {
    if (!activeOrder) return;
    const n = parseFloat(payAmt);
    if (!n || n <= 0) { setPayErr("Enter a valid amount."); return; }
    setPayBusy(true); setPayErr("");
    try {
      const { data } = await api.post(`/api/quick-orders/${activeOrder.id}/payment`, {
        amount: n, method: payMethod, note: payNote,
      });
      setOrders(prev => prev.map(o => o.id === activeOrder.id ? { ...o, ...data } : o));
      setPayAmt(""); setPayNote("");
    } catch (err: any) { setPayErr(err.response?.data?.message || "Failed to record payment"); }
    finally { setPayBusy(false); }
  }

  const unassignedOrders = useMemo(() => orders.filter(o => !o.task && o.status !== "billed"), [orders]);
  const myOrders         = useMemo(() => orders.filter(o => o.task?.assignedTo?.id === userId), [orders, userId]);
  const shownOrders      = oTab === "unassigned" ? unassignedOrders : oTab === "mine" ? myOrders : orders;
  const unassignedCount  = unassignedOrders.length;

  // ── Task buckets (one source of truth for both counts and lists) ──────────
  const buckets = useMemo(() => {
    const b: Record<Stage, Task[]> = { todo: [], working: [], ready: [], delivered: [], cancelled: [] };
    tasks.forEach((t) => b[stageOf(t)].push(t));
    b.delivered.sort((a, z) => new Date(z.deliveredAt!).getTime() - new Date(a.deliveredAt!).getTime());
    return b;
  }, [tasks]);

  const counts = {
    all:       tasks.length,
    todo:      buckets.todo.length,
    working:   buckets.working.length,
    ready:     buckets.ready.length,
    delivered: buckets.delivered.length,
  };

  const displayed = useMemo(
    () => (tab === "all" ? tasks : buckets[tab as Stage]),
    [tab, tasks, buckets]
  );

  /** Everything still on this person's plate, most urgent first. */
  const workQueue = useMemo(() => {
    const rank: Record<Stage, number> = { ready: 0, working: 1, todo: 2, delivered: 9, cancelled: 9 };
    return tasks
      .filter((t) => ["ready", "working", "todo"].includes(stageOf(t)))
      .sort((a, z) => {
        const ta = taskCue(a).tone === "over" ? 0 : 1;
        const tz = taskCue(z).tone === "over" ? 0 : 1;
        if (ta !== tz) return ta - tz;
        return rank[stageOf(a)] - rank[stageOf(z)];
      });
  }, [tasks]);

  const selected = tasks.find((t) => t.id === selectedId) || null;
  useEffect(() => { setNotesDraft(selected?.notes || ""); }, [selectedId]); // eslint-disable-line

  // BUGFIX: never leave an open task on screen while its tab says "nothing here".
  useEffect(() => {
    if (selectedId && !displayed.some((t) => t.id === selectedId)) setSelectedId(null);
  }, [tab, displayed, selectedId]);

  function openTask(id: string) {
    setSelectedId(id); setTab("all"); setView("tasks");
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }
  function goTasks(t: Tab = "all") { setTab(t); setView("tasks"); }
  function doLogout()              { try { logout?.(); } catch { /* ignore */ } navigate("/login"); }

  /** One-tap advance straight from a card — no need to open the task. */
  async function advance(t: Task) {
    const stage = stageOf(t);
    setRowBusy(t.id);
    try {
      let updated: Task;
      if (stage === "todo")         updated = await employeeTaskApi.updateStatus(t.id, "in_progress");
      else if (stage === "working") updated = await employeeTaskApi.updateStatus(t.id, "completed");
      else if (stage === "ready")   updated = await employeeTaskApi.deliver(t.id, true);
      else return;
      applyUpdated(updated);
    } catch (err: any) { alert(err.response?.data?.error || "Could not update the task"); }
    finally { setRowBusy(null); }
  }

  async function handleStatus(status: TaskStatus, kind: "status" | "notes") {
    if (!selected) return;
    setBusy(kind);
    try { applyUpdated(await employeeTaskApi.updateStatus(selected.id, status, notesDraft)); }
    catch (err: any) { alert(err.response?.data?.error || "Could not update the task"); }
    finally { setBusy(""); }
  }

  async function handleDeliver(delivered: boolean) {
    if (!selected) return;
    setBusy("deliver");
    try { applyUpdated(await employeeTaskApi.deliver(selected.id, delivered)); }
    catch (err: any) { alert(err.response?.data?.error || "Could not update delivery"); }
    finally { setBusy(""); }
  }

  const NAV = [
    { id: "today"  as View, label: "Today",     icon: <IcoDash />,   badge: workQueue.length,  onClick: () => setView("today") },
    { id: "tasks"  as View, label: "My work",   icon: <IcoTasks />,  badge: counts.all,        onClick: () => goTasks("all") },
    { id: "orders" as View, label: "Orders",    icon: <IcoOrders />, badge: unassignedCount,   onClick: () => setView("orders") },
    { id: "team"   as View, label: "Team",      icon: <IcoTeam />,   badge: 0,                 onClick: () => setView("team") },
  ];

  const rupStr   = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const fmtShort = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const STATUS_FLOW: TaskStatus[] = ["pending", "in_progress", "completed"];

  /* ── one job card, used on Today and My work ── */
  const JobCard = ({ t, compact = false }: { t: Task; compact?: boolean }) => {
    const stage = stageOf(t);
    const sm    = STAGE_META[stage];
    const cue   = taskCue(t);
    const step  = nextStep(t);
    const busyMe = rowBusy === t.id;

    return (
      <div className={`ep-job${selectedId === t.id ? " sel" : ""}`} style={{ borderLeftColor: sm.color }}>
        <div className="ep-job-top">
          <div className="ep-job-main">
            <div className="ep-job-title">{t.title}</div>
            <div className="ep-job-sub">
              {t.customerName || "—"}
              {t.customerPhone ? ` · ${t.customerPhone}` : ""}
              {t.invoiceNo ? ` · ${t.invoiceNo}` : ""}
            </div>
          </div>
          <span className="ep-stage" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
        </div>

        <div className={`ep-cue ${cue.tone}`}>{cue.text}</div>

        {!compact && t.description && (
          <div className="ep-job-desc">{t.description}</div>
        )}

        <div className="ep-job-foot">
          {step ? (
            <button className={`ep-btn ${step.tone} ep-btn-lg`} disabled={busyMe} onClick={() => advance(t)}>
              {busyMe ? "Saving…" : step.label}
            </button>
          ) : (
            <span className="ep-donetag">✓ Handed over {fmtDate(t.deliveredAt)}</span>
          )}
          <button className="ep-btn ghost" onClick={() => openTask(t.id)}>Open details</button>
        </div>
      </div>
    );
  };

  return (
    <div className={`ep${collapsed ? " ep-collapsed" : ""}`}>
      <style>{`
        .ep { font-family:'DM Sans',system-ui,sans-serif; color:${INK}; background:${PAGE}; min-height:100vh; display:flex; font-variant-numeric:tabular-nums; }
        .ep * { box-sizing:border-box; }

        /* ── Sidebar ── */
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
        .ep-collapsed .ep-collapse-l { display:none; }

        /* ── Top bar ── */
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
        .ep-content { padding:24px 26px 60px; width:100%; max-width:1180px; }

        /* ── Today ── */
        .ep-hi { font-size:1.45rem; font-weight:700; letter-spacing:-.01em; }
        .ep-sub { font-size:.92rem; color:${MUTED}; margin-top:4px; }
        .ep-sub b { color:${INK}; font-weight:700; }
        .ep-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin:20px 0 22px; }
        .ep-stat { background:#fff; border:1px solid ${LINE}; border-left-width:3px; border-radius:4px; padding:14px 15px; text-align:left; font-family:inherit; cursor:pointer; }
        .ep-stat:hover { border-color:#d8cfc0; border-left-width:3px; }
        .ep-stat-n { font-size:1.6rem; font-weight:700; line-height:1; }
        .ep-stat-l { font-size:.68rem; text-transform:uppercase; letter-spacing:.07em; color:${MUTED}; margin-top:7px; }

        .ep-secline { display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin:0 0 12px; }
        .ep-secline h2 { font-size:1.02rem; font-weight:700; margin:0; }
        .ep-secline span { font-size:.78rem; color:${MUTED}; }
        .ep-viewall { background:none; border:none; color:${ACCENT}; font-family:inherit; font-size:.8rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px; }
        .ep-viewall:hover { color:${ACCENT_DK}; }

        /* ── Job card ── */
        .ep-jobs { display:grid; gap:10px; margin-bottom:26px; }
        .ep-job { background:#fff; border:1px solid ${LINE}; border-left:4px solid ${LINE}; border-radius:5px; padding:15px 17px; }
        .ep-job.sel { border-color:${ACCENT}; }
        .ep-job-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
        .ep-job-main { min-width:0; }
        .ep-job-title { font-size:1.02rem; font-weight:700; line-height:1.3; }
        .ep-job-sub { font-size:.82rem; color:${MUTED}; margin-top:3px; }
        .ep-stage { flex-shrink:0; padding:3px 11px; border-radius:3px; font-size:.74rem; font-weight:700; white-space:nowrap; }
        .ep-job-desc { font-size:.86rem; line-height:1.55; white-space:pre-line; background:${WASH}; border-left:3px solid ${GOLD}; padding:9px 12px; border-radius:0 4px 4px 0; margin-top:10px; }
        .ep-job-foot { display:flex; align-items:center; gap:9px; flex-wrap:wrap; margin-top:13px; }
        .ep-cue { font-size:.8rem; font-weight:600; margin-top:8px; }
        .ep-cue.ok{color:${MUTED};} .ep-cue.soon{color:#b45309;} .ep-cue.over{color:${ACCENT};} .ep-cue.done{color:${GREEN};} .ep-cue.ready{color:${ACCENT};}
        .ep-donetag { font-size:.84rem; font-weight:700; color:${GREEN}; }

        .ep-btn { border:none; border-radius:5px; padding:9px 16px; font-size:.85rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ep-btn-lg { padding:11px 22px; font-size:.9rem; }
        .ep-btn:disabled { opacity:.55; cursor:not-allowed; }
        .ep-btn.primary { background:${ACCENT}; color:#fff; } .ep-btn.primary:hover:not(:disabled){ background:${ACCENT_DK}; }
        .ep-btn.go { background:${GREEN}; color:#fff; }      .ep-btn.go:hover:not(:disabled){ background:#276634; }
        .ep-btn.blue { background:${BLUE}; color:#fff; }     .ep-btn.blue:hover:not(:disabled){ background:#184e8a; }
        .ep-btn.ghost { background:#fff; border:1px solid ${LINE}; color:${INK}; } .ep-btn.ghost:hover:not(:disabled){ background:${WASH}; }

        /* ── Panels / rows ── */
        .ep-panel { background:#fff; border:1px solid ${LINE}; border-radius:4px; margin-bottom:16px; overflow:hidden; }
        .ep-panel-h { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:13px 17px; border-bottom:1px solid ${LINE_SOFT}; }
        .ep-panel-h b { font-size:.92rem; font-weight:700; }
        .ep-arow { display:flex; align-items:center; gap:14px; padding:12px 17px; border-bottom:1px solid ${LINE_SOFT}; cursor:pointer; text-align:left; width:100%; background:none; border-left:none; border-right:none; border-top:none; font-family:inherit; }
        .ep-arow:last-child { border-bottom:none; }
        .ep-arow:hover { background:${WASH}; }
        .ep-arow-main { flex:1; min-width:0; }
        .ep-arow-t { font-size:.9rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ep-arow-sub { font-size:.76rem; color:${MUTED}; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ep-arow-r { display:flex; align-items:center; gap:12px; flex-shrink:0; }
        .ep-arow-go { color:${FAINT}; display:flex; }
        .ep-arow:hover .ep-arow-go { color:${ACCENT}; }
        .ep-empty { padding:34px 20px; text-align:center; color:${FAINT}; font-size:.9rem; line-height:1.6; }
        .ep-empty b { color:${GREEN}; font-weight:700; display:block; margin-bottom:3px; font-size:1rem; }
        .ep-loadempty { background:#fff; border:1px dashed ${LINE}; border-radius:4px; padding:44px 24px; text-align:center; color:${FAINT}; font-size:.92rem; line-height:1.6; }

        /* ── Tabs ── */
        .ep-tabs { display:flex; gap:4px; border-bottom:1px solid ${LINE}; margin-bottom:18px; overflow-x:auto; }
        .ep-tab { background:none; border:none; padding:11px 14px; font-size:.88rem; font-weight:600; color:${MUTED}; cursor:pointer; font-family:inherit; border-bottom:2px solid transparent; margin-bottom:-1px; white-space:nowrap; }
        .ep-tab:hover { color:${INK}; }
        .ep-tab.on { color:${ACCENT}; border-bottom-color:${ACCENT}; }
        .ep-tab .c { color:${FAINT}; font-weight:500; }
        .ep-tab.on .c { color:${ACCENT}; }

        .ep-detailwrap { margin-top:20px; }
        .ep-ta { width:100%; min-height:96px; resize:vertical; padding:11px 13px; border:1px solid ${LINE}; border-radius:5px; font-size:.9rem; font-family:inherit; color:${INK}; }
        .ep-ta:focus { outline:none; border-color:${ACCENT}; }
        .ep-close { background:none; border:none; cursor:pointer; color:${MUTED}; padding:4px; display:flex; align-items:center; }
        .ep-close:hover { color:${INK}; }
        .ep-lb { position:fixed; inset:0; background:rgba(0,0,0,.9); z-index:2000; display:flex; align-items:center; justify-content:center; cursor:zoom-out; }
        .ep-lb img { max-width:92vw; max-height:92vh; object-fit:contain; }

        /* ── Quick Orders ── */
        .qo-layout { display:grid; gap:16px; align-items:start; }
        .qo-board { display:flex; flex-direction:column; gap:10px; }
        .qo-card { background:#fff; border:1px solid ${LINE}; border-left:4px solid ${LINE}; border-radius:5px; padding:14px 16px; cursor:pointer; }
        .qo-card:hover { border-color:#d8cfc0; }
        .qo-card.sel { border-color:${ACCENT}; }
        .qo-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
        .qo-card-name { font-size:.96rem; font-weight:700; }
        .qo-card-phone { font-size:.74rem; color:${MUTED}; margin-top:1px; }
        .qo-tag { display:inline-block; font-size:.72rem; font-weight:700; color:#8a6b1f; background:#fdf3d9; border:1px solid #f0e0b4; padding:1px 9px; border-radius:3px; margin-top:8px; }
        .qo-work { font-size:.86rem; line-height:1.5; white-space:pre-line; margin-top:8px; background:${WASH}; border-left:3px solid ${GOLD}; padding:8px 11px; border-radius:0 4px 4px 0; }
        .qo-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:9px; font-size:.76rem; color:${MUTED}; }
        .qo-money { font-weight:700; }
        .qo-money.due { color:${ACCENT}; } .qo-money.paid { color:${GREEN}; }
        .qo-claim { padding:8px 18px; background:${ACCENT}; color:#fff; border:none; font-family:inherit; font-size:.84rem; font-weight:700; cursor:pointer; border-radius:5px; white-space:nowrap; }
        .qo-claim:hover:not(:disabled) { background:${ACCENT_DK}; }
        .qo-claim:disabled { opacity:.55; cursor:not-allowed; }
        .qo-detail { background:#fff; border:1px solid ${LINE}; border-radius:5px; position:sticky; top:86px; }
        .qo-d-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; padding:15px 17px; border-bottom:1px solid ${LINE_SOFT}; }
        .qo-d-name { font-size:1.05rem; font-weight:700; }
        .qo-d-phone { font-size:.76rem; color:${MUTED}; margin-top:3px; }
        .qo-d-body { padding:15px 17px; }
        .qo-d-l { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:${MUTED}; margin-bottom:7px; }
        .qo-owner { padding:7px 17px; border-bottom:1px solid ${LINE_SOFT}; font-size:.78rem; font-weight:600; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .qo-bal { border-radius:6px; padding:12px 14px; text-align:center; margin-bottom:14px; }
        .qo-bal.due  { background:#fdf2ee; border:1px solid #f3c9ba; }
        .qo-bal.paid { background:#eaf6ec; border:1px solid #bfe3c6; }
        .qo-bal-l { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px; }
        .qo-bal-n { font-size:1.45rem; font-weight:800; line-height:1; }
        .qo-bal-sub { font-size:.74rem; color:${MUTED}; margin-top:7px; display:flex; justify-content:center; gap:14px; flex-wrap:wrap; }
        .qo-pay { background:#fdf8f3; border:1px solid ${LINE}; border-radius:6px; padding:13px 14px; margin-bottom:14px; }
        .qo-inp { width:100%; padding:9px 12px; border:1px solid ${LINE}; border-radius:5px; font-size:.88rem; font-family:inherit; margin-bottom:7px; }
        .qo-inp:focus { outline:none; border-color:${ACCENT}; }
        .qo-pay-methods { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-bottom:8px; }
        .qo-m { padding:9px 0; border:1px solid ${LINE}; border-radius:5px; font-family:inherit; font-size:.86rem; font-weight:700; cursor:pointer; background:#fff; color:${MUTED}; }
        .qo-m.on { border:2px solid ${ACCENT}; background:#fef2ee; color:${ACCENT}; }
        .qo-flow { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; }
        .qo-fbtn { padding:10px 6px; border:1px solid ${LINE}; border-radius:5px; font-size:.8rem; font-weight:700; cursor:pointer; background:#fff; color:${MUTED}; font-family:inherit; }
        .qo-fbtn:disabled { cursor:not-allowed; opacity:.7; }
        .qo-hint { font-size:.74rem; color:${GREEN}; display:flex; align-items:center; gap:6px; margin-top:9px; }
        .qo-hint i { width:7px; height:7px; border-radius:50%; background:${GREEN}; display:inline-block; }
        .qo-save { width:100%; padding:10px; border:none; background:${ACCENT}; color:#fff; font-family:inherit; font-size:.86rem; font-weight:700; cursor:pointer; border-radius:5px; margin-top:7px; }
        .qo-save:disabled { opacity:.55; cursor:not-allowed; }
        .qo-imgs { display:flex; gap:8px; flex-wrap:wrap; }
        .qo-imgs img { width:62px; height:62px; object-fit:cover; border:1px solid ${LINE}; border-radius:5px; cursor:zoom-in; }

        @media (max-width:1000px){ .qo-detail { position:static; } }
        @media (max-width:760px){
          .ep-side { width:70px; }
          .ep-brand-t,.ep-menu-l,.ep-navitem-l,.ep-collapse-l { display:none !important; }
          .ep-navitem { justify-content:center; border-left:none; border-radius:8px; }
          .ep-brand { justify-content:center; padding:20px 0 18px; }
          .ep-collapse { justify-content:center; }
          .ep-uname { display:none; }
          .ep-top,.ep-content { padding-left:16px; padding-right:16px; }
          .ep-stats { grid-template-columns:repeat(2,1fr); }
          .ep-job-foot .ep-btn-lg { width:100%; }
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
            {view === "today" ? "Today"
              : view === "tasks"  ? "My work"
              : view === "orders" ? "Orders"
              : "Team"}
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

          {/* ══════════ TODAY ══════════ */}
          {view === "today" && (
            <>
              <div className="ep-hi">Good day, {firstName}!</div>
              <div className="ep-sub">
                {loading ? "Loading your work…"
                  : workQueue.length === 0
                    ? "Nothing pending right now."
                    : <>You have <b>{workQueue.length}</b> job{workQueue.length > 1 ? "s" : ""} to finish.</>}
              </div>

              <div className="ep-stats">
                {([
                  { key: "todo"      as Tab, n: counts.todo,      label: "To do",            color: AMBER },
                  { key: "working"   as Tab, n: counts.working,   label: "Working",          color: BLUE  },
                  { key: "ready"     as Tab, n: counts.ready,     label: "Ready to deliver", color: ACCENT },
                  { key: "delivered" as Tab, n: counts.delivered, label: "Delivered",        color: GREEN },
                ]).map((s) => (
                  <button key={s.key} className="ep-stat" style={{ borderLeftColor: s.color }}
                    onClick={() => goTasks(s.key)}>
                    <div className="ep-stat-n" style={{ color: s.n === 0 ? FAINT : s.color }}>{s.n}</div>
                    <div className="ep-stat-l">{s.label}</div>
                  </button>
                ))}
              </div>

              {/* Orders waiting to be picked up */}
              {unassignedCount > 0 && (
                <div className="ep-panel">
                  <div className="ep-panel-h">
                    <b>{unassignedCount} order{unassignedCount > 1 ? "s" : ""} nobody has taken</b>
                    <button className="ep-viewall" onClick={() => { setView("orders"); setOTab("unassigned"); }}>
                      See all <IcoArrow />
                    </button>
                  </div>
                  {unassignedOrders.slice(0, 3).map((o) => (
                    <div key={o.id} className="ep-arow" style={{ cursor: "default" }}>
                      <div className="ep-arow-main">
                        <div className="ep-arow-t">{o.customerName}</div>
                        <div className="ep-arow-sub">{o.workDetails?.slice(0, 70)}{(o.workDetails?.length || 0) > 70 ? "…" : ""}</div>
                      </div>
                      <div className="ep-arow-r">
                        <span style={{ fontSize: ".82rem", fontWeight: 700, color: GOLD }}>{rupStr(Number(o.amount))}</span>
                        <button className="qo-claim" disabled={claiming === o.id} onClick={() => claimOrder(o.id)}>
                          {claiming === o.id ? "Taking…" : "Take this"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* The actual work — biggest thing on the screen */}
              <div className="ep-secline">
                <h2>Do this next</h2>
                <span>{workQueue.length} job{workQueue.length !== 1 ? "s" : ""}</span>
              </div>

              {loading ? (
                <div className="ep-loadempty">Loading…</div>
              ) : workQueue.length === 0 ? (
                <div className="ep-panel"><div className="ep-empty"><b>All caught up</b>Nothing waiting on you.</div></div>
              ) : (
                <div className="ep-jobs">
                  {workQueue.map((t) => <JobCard key={t.id} t={t} />)}
                </div>
              )}

              {/* Delivered — small, out of the way */}
              {buckets.delivered.length > 0 && (
                <div className="ep-panel">
                  <div className="ep-panel-h">
                    <b>Finished &amp; delivered</b>
                    <button className="ep-viewall" onClick={() => goTasks("delivered")}>See all <IcoArrow /></button>
                  </div>
                  {buckets.delivered.slice(0, 4).map((t) => (
                    <button key={t.id} className="ep-arow" onClick={() => openTask(t.id)}>
                      <div className="ep-arow-main">
                        <div className="ep-arow-t">{t.title}</div>
                        <div className="ep-arow-sub">{t.customerName ? `${t.customerName} · ` : ""}Delivered {fmtDate(t.deliveredAt)}</div>
                      </div>
                      <div className="ep-arow-r">
                        <span className="ep-cue done" style={{ margin: 0 }}>Delivered</span>
                        <span className="ep-arow-go"><IcoArrow /></span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ══════════ MY WORK ══════════ */}
          {view === "tasks" && (
            <>
              <div className="ep-tabs">
                {([
                  { id: "all",       label: "All",              n: counts.all       },
                  { id: "todo",      label: "To do",            n: counts.todo      },
                  { id: "working",   label: "Working",          n: counts.working   },
                  { id: "ready",     label: "Ready to deliver", n: counts.ready     },
                  { id: "delivered", label: "Delivered",        n: counts.delivered },
                ] as { id: Tab; label: string; n: number }[]).map((t) => (
                  <button key={t.id} className={`ep-tab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
                    {t.label} <span className="c">({t.n})</span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="ep-loadempty">Loading…</div>
              ) : displayed.length === 0 ? (
                <div className="ep-loadempty">
                  {tab === "all" ? "No work assigned to you yet."
                    : `Nothing in "${{ todo: "To do", working: "Working", ready: "Ready to deliver", delivered: "Delivered" }[tab as Exclude<Tab, "all">]}" right now.`}
                </div>
              ) : (
                <div className="ep-jobs">
                  {displayed.map((t) => <JobCard key={t.id} t={t} compact />)}
                </div>
              )}

              {selected && (
                <div className="ep-detailwrap" ref={detailRef}>
                  <TaskDetail
                    task={selected} isMe={selected.deliveredBy?.id === userId}
                    notesDraft={notesDraft} setNotesDraft={setNotesDraft}
                    busy={busy} onClose={() => setSelectedId(null)}
                    onStatus={handleStatus} onDeliver={handleDeliver}
                    onImage={(src) => setLightbox(src)}
                  />
                </div>
              )}
            </>
          )}

          {/* ══════════ ORDERS ══════════ */}
          {view === "orders" && (
            <>
              <div className="ep-tabs">
                {([
                  { id: "unassigned", label: "Free to take", n: unassignedOrders.length },
                  { id: "mine",       label: "Mine",         n: myOrders.length },
                  { id: "all",        label: "Everything",   n: orders.length },
                ] as { id: OTab; label: string; n: number }[]).map((t) => (
                  <button key={t.id} className={`ep-tab${oTab === t.id ? " on" : ""}`}
                    onClick={() => { setOTab(t.id); setActiveOrderId(null); }}>
                    {t.label} <span className="c">({t.n})</span>
                  </button>
                ))}
                <button className="ep-viewall" style={{ marginLeft: "auto", alignSelf: "center" }} onClick={loadOrders}>
                  ↻ Refresh
                </button>
              </div>

              {ordersLoading ? <div className="ep-loadempty">Loading orders…</div>
                : shownOrders.length === 0 ? (
                  <div className="ep-loadempty">
                    {oTab === "unassigned" ? "No free orders right now."
                      : oTab === "mine" ? "You haven't taken any orders yet."
                      : "No orders found."}
                  </div>
                ) : (
                  <div className="qo-layout" style={{ gridTemplateColumns: activeOrder ? "minmax(0,1fr) 400px" : "minmax(0,1fr)" }}>

                    {/* list */}
                    <div className="qo-board">
                      {shownOrders.map((o) => {
                        const amt  = Number(o.amount);
                        const less = Number((o as any).lessAmount || 0);
                        const adv  = Number(o.advancePaid);
                        const due  = Math.max(0, amt - less - adv);
                        const mine = o.task?.assignedTo?.id === userId;
                        const st   = o.task ? STAGE_META[QO_STAGE[o.task.status] || "todo"] : null;
                        const isActive = activeOrderId === o.id;

                        return (
                          <div key={o.id}
                            className={`qo-card${isActive ? " sel" : ""}`}
                            style={{ borderLeftColor: mine ? GOLD : LINE }}
                            onClick={() => setActiveOrderId(isActive ? null : o.id)}>

                            <div className="qo-card-top">
                              <div style={{ minWidth: 0 }}>
                                <div className="qo-card-name">{o.customerName}</div>
                                {o.customerPhone && <div className="qo-card-phone">{o.customerPhone}</div>}
                              </div>
                              <div onClick={(e) => e.stopPropagation()}>
                                {o.status === "billed" ? (
                                  <span className="ep-stage" style={{ background: "#e5f2e8", color: GREEN }}>{o.invoiceNo || "Billed"}</span>
                                ) : !o.task ? (
                                  <button className="qo-claim" disabled={claiming === o.id} onClick={() => claimOrder(o.id)}>
                                    {claiming === o.id ? "Taking…" : "Take this"}
                                  </button>
                                ) : st ? (
                                  <span className="ep-stage" style={{ background: st.bg, color: st.color }}>
                                    {mine ? st.label : o.task.assignedTo.name}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            {o.title && <div className="qo-tag">{o.title}</div>}
                            <div className="qo-work">{o.workDetails || "—"}</div>

                            <div className="qo-meta">
                              <span>{o.paymentMethod === "cash" ? "Cash" : "Online"}</span>
                              <span className={`qo-money ${due > 0 ? "due" : "paid"}`}>
                                {rupStr(amt)}{less > 0 ? ` · less ${rupStr(less)}` : ""}{due > 0 ? ` · ${rupStr(due)} due` : " · fully paid"}
                              </span>
                              <span>{fmtShort(o.entryDate)}</span>
                              {o.task && <span style={{ fontWeight: 600, color: mine ? GOLD : MUTED }}>{o.task.assignedTo.name}{mine ? " (you)" : ""}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* detail */}
                    {activeOrder && (() => {
                      const amt  = Number(activeOrder.amount);
                      const less = Number((activeOrder as any).lessAmount || 0);
                      const adv  = Number(activeOrder.advancePaid);
                      const due  = Math.max(0, amt - less - adv);
                      const mine = activeOrder.task?.assignedTo?.id === userId;
                      const st   = activeOrder.task ? STAGE_META[QO_STAGE[activeOrder.task.status] || "todo"] : null;

                      return (
                        <div className="qo-detail">
                          <div className="qo-d-head">
                            <div>
                              <div className="qo-d-name">{activeOrder.customerName}</div>
                              {activeOrder.customerPhone && <div className="qo-d-phone">{activeOrder.customerPhone}</div>}
                            </div>
                            <button className="ep-close" onClick={() => setActiveOrderId(null)}><IcoClose /></button>
                          </div>

                          {activeOrder.task && (
                            <div className="qo-owner" style={{ background: mine ? "#fdf3d9" : WASH, color: mine ? "#8a6b1f" : MUTED }}>
                              {activeOrder.task.assignedTo.name}{mine ? " (you)" : ""}
                              {st && <span className="ep-stage" style={{ background: st.bg, color: st.color }}>{st.label}</span>}
                            </div>
                          )}

                          <div className="qo-d-body">
                            {/* money first — that's what gets asked at the counter */}
                            <div className={`qo-bal ${due > 0 ? "due" : "paid"}`}>
                              <div className="qo-bal-l" style={{ color: due > 0 ? ACCENT_DK : GREEN }}>
                                {due > 0 ? "Still to collect" : "Fully paid"}
                              </div>
                              <div className="qo-bal-n" style={{ color: due > 0 ? ACCENT : GREEN }}>
                                {due > 0 ? rupStr(due) : "✓"}
                              </div>
                              <div className="qo-bal-sub">
                                <span>Bill {rupStr(amt)}</span>
                                {less > 0 && <span style={{ color: GOLD }}>Less {rupStr(less)}</span>}
                                <span style={{ color: GREEN }}>Paid {rupStr(adv)}</span>
                              </div>
                            </div>

                            {due > 0 && (
                              <div className="qo-pay">
                                <div className="qo-d-l">Take payment</div>
                                {payErr && <div style={{ color: ACCENT, fontSize: ".82rem", marginBottom: 8 }}>{payErr}</div>}
                                <input className="qo-inp" type="number" min="1" max={due}
                                  value={payAmt} onChange={(e) => setPayAmt(e.target.value)}
                                  placeholder={`Amount — up to ${rupStr(due)}`} />
                                <div className="qo-pay-methods">
                                  {(["cash","online"] as const).map((m) => (
                                    <button key={m} className={`qo-m${payMethod === m ? " on" : ""}`} onClick={() => setPayMethod(m)}>
                                      {m === "cash" ? "Cash" : "Online"}
                                    </button>
                                  ))}
                                </div>
                                <input className="qo-inp" value={payNote}
                                  onChange={(e) => setPayNote(e.target.value)} placeholder="Note (optional)" />
                                <button className="qo-save" disabled={payBusy} onClick={recordPayment}>
                                  {payBusy ? "Saving…" : `Record ${payAmt ? rupStr(Number(payAmt)) : "payment"}`}
                                </button>
                              </div>
                            )}

                            {activeOrder.task && (
                              <div style={{ marginBottom: 14 }}>
                                <div className="qo-d-l">Where is this job?</div>
                                <div className="qo-flow">
                                  {STATUS_FLOW.map((sflow) => {
                                    const meta = STAGE_META[QO_STAGE[sflow]];
                                    const on   = activeOrder.task?.status === sflow;
                                    return (
                                      <button key={sflow} className="qo-fbtn"
                                        style={on ? { background: meta.color, color: "#fff", border: "none" } : {}}
                                        disabled={orderBusy || !mine}
                                        title={!mine ? "Only the person who took this order can change it" : ""}
                                        onClick={() => updateOrderTaskStatus(sflow)}>
                                        {meta.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="qo-hint"><i />Admin sees this straight away</div>
                              </div>
                            )}

                            <div style={{ marginBottom: 14 }}>
                              <div className="qo-d-l">What to make</div>
                              <div className="qo-work" style={{ marginTop: 0 }}>{activeOrder.workDetails || "—"}</div>
                            </div>

                            {activeOrder.images && activeOrder.images.length > 0 && (
                              <div style={{ marginBottom: 14 }}>
                                <div className="qo-d-l">Reference images</div>
                                <div className="qo-imgs">
                                  {activeOrder.images.map((img, i) => (
                                    <img key={i} src={`${API_BASE}${img}`} alt=""
                                      onClick={() => setLightbox(`${API_BASE}${img}`)} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {activeOrder.task && mine && (
                              <div>
                                <div className="qo-d-l">Your notes</div>
                                <textarea className="ep-ta" style={{ minHeight: 62, fontSize: ".86rem" }}
                                  value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)}
                                  placeholder="Anything admin should know…" />
                                <button className="qo-save" disabled={orderBusy} onClick={saveOrderNotes}>
                                  {orderBusy ? "Saving…" : "Save notes"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
            </>
          )}

          {/* ══════════ TEAM ══════════ */}
          {view === "team" && (
            <TeamView myId={userId} onOpenMine={(taskId) => openTask(taskId)} />
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