// src/pages/EmployeeDashboard.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMyTasks, fmtDate, taskCue, rupees } from "../hooks/useMyTasks";
import { employeeTaskApi, type TaskStatus } from "../services/employee-task.api";
import { TaskCard }   from "../components/employees/TaskCard";
import { TaskDetail } from "../components/employees/TaskDetail";
import { TeamView }   from "../components/employees/TeamView";
import api from "../api";

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoDash    = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>);
const IcoTasks   = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M9 12l2 2 4-4"/></svg>);
const IcoTeam    = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IcoOrders  = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>);
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

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: "Pending",     color: "#9a6a12", bg: "#fbf1dd" },
  in_progress: { label: "In Progress", color: "#1e5fa8", bg: "#e6eff9" },
  completed:   { label: "Completed",   color: GREEN,     bg: "#e5f2e8" },
  cancelled:   { label: "Cancelled",   color: "#7c766c", bg: "#f0ede7" },
};

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

type View = "dashboard" | "tasks" | "team" | "orders";
type Tab  = "all" | "pending" | "in_progress" | "completed" | "delivered";
type OTab = "unassigned" | "mine" | "all";

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

  // ── Quick Orders state ────────────────────────────────────────────────────
  const [orders,        setOrders]        = useState<QuickOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [oTab,          setOTab]          = useState<OTab>("unassigned");
  const [claiming,      setClaiming]      = useState<string | null>(null);

  // Selected order for inline detail panel
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

  useEffect(() => { if (view === "orders") loadOrders(); }, [view, loadOrders]);

  // Sync notes when active order changes
  const activeOrder = orders.find(o => o.id === activeOrderId) || null;
  useEffect(() => { setOrderNotes(activeOrder?.task?.notes || ""); setPayAmt(""); setPayNote(""); setPayErr(""); }, [activeOrderId]); // eslint-disable-line

  async function claimOrder(id: string) {
    if (!confirm("Claim this order? It will appear in your Tasks.")) return;
    setClaiming(id);
    try {
      const { data } = await api.post(`/api/quick-orders/${id}/claim`);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, task: data.task } : o));
      // auto-open the detail panel after claiming
      setActiveOrderId(id);
      setOTab("mine");
      // reload tasks so My Tasks tab shows this new task
      if (data.task) applyUpdated(data.task);
    } catch (err: any) { alert(err.response?.data?.message || "Failed to claim order"); }
    finally { setClaiming(null); }
  }

  async function updateOrderTaskStatus(status: TaskStatus) {
    if (!activeOrder?.task) return;
    setOrderBusy(true);
    try {
      const updated = await employeeTaskApi.updateStatus(activeOrder.task.id, status, orderNotes);
      // update the task inside the order locally
      setOrders(prev => prev.map(o =>
        o.id === activeOrderId
          ? { ...o, task: o.task ? { ...o.task, status: updated.status, notes: updated.notes, startedAt: updated.startedAt, completedAt: updated.completedAt } : o.task }
          : o
      ));
      // also push to My Tasks hook so Team view updates
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
        o.id === activeOrderId
          ? { ...o, task: o.task ? { ...o.task, notes: updated.notes } : o.task }
          : o
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

  // filtered order lists
  const unassignedOrders = useMemo(() => orders.filter(o => !o.task && o.status !== "billed"), [orders]);
  const myOrders         = useMemo(() => orders.filter(o => o.task?.assignedTo?.id === userId), [orders, userId]);
  const shownOrders      = oTab === "unassigned" ? unassignedOrders : oTab === "mine" ? myOrders : orders;

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    if (tab === "all")       return tasks;
    if (tab === "delivered") return tasks.filter((t) => !!t.deliveredAt).sort((a, b) => new Date(b.deliveredAt!).getTime() - new Date(a.deliveredAt!).getTime());
    return tasks.filter((t) => t.status === tab && !t.deliveredAt);
  }, [tasks, tab]);

  // Tab counts — MUST mirror the `displayed` filter above so the number on each
  // tab matches the number of cards shown. pending/in_progress/completed exclude
  // delivered tasks (those live under the Delivered tab).
  const tabCounts = useMemo(() => ({
    all:         tasks.length,
    pending:     tasks.filter((t) => t.status === "pending"     && !t.deliveredAt).length,
    in_progress: tasks.filter((t) => t.status === "in_progress" && !t.deliveredAt).length,
    completed:   tasks.filter((t) => t.status === "completed"   && !t.deliveredAt).length,
    delivered:   tasks.filter((t) => !!t.deliveredAt).length,
  }), [tasks]);

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

  const unassignedCount = unassignedOrders.length;

  const NAV = [
    { id: "dashboard" as View, label: "Dashboard",    icon: <IcoDash />,   badge: 0,              onClick: () => setView("dashboard") },
    { id: "tasks"     as View, label: "My tasks",     icon: <IcoTasks />,  badge: stats.total,    onClick: goTasks },
    { id: "orders"    as View, label: "Quick Orders", icon: <IcoOrders />, badge: unassignedCount, onClick: () => setView("orders") },
    { id: "team"      as View, label: "Team",         icon: <IcoTeam />,   badge: 0,              onClick: () => setView("team") },
  ];

  const rupStr      = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const fmtShort    = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const STATUS_FLOW: TaskStatus[] = ["pending", "in_progress", "completed"];

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
        .ep-content { padding:26px; width:100%; }
        .ep-hi { font-size:1.5rem; font-weight:700; letter-spacing:-.01em; }
        .ep-sub { font-size:.9rem; color:${MUTED}; margin-top:4px; }
        .ep-sub b { color:${ACCENT}; font-weight:700; }
        .ep-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:22px 0; }
        .ep-stat { background:#fff; border:1px solid ${LINE}; border-left-width:3px; border-radius:4px; padding:15px 16px; }
        .ep-stat-n { font-size:1.7rem; font-weight:700; line-height:1; }
        .ep-stat-l { font-size:.66rem; text-transform:uppercase; letter-spacing:.08em; color:${MUTED}; margin-top:7px; }
        .ep-cue { font-size:.78rem; font-weight:600; }
        .ep-cue.ok{color:${MUTED};} .ep-cue.soon{color:#b45309;} .ep-cue.over{color:${ACCENT};} .ep-cue.done{color:${GREEN};} .ep-cue.ready{color:${ACCENT};}
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
        .ep-empty b { color:${GREEN}; font-weight:700; display:block; margin-bottom:3px; }
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
        .ep-close { background:none; border:none; font-size:1.4rem; line-height:1; cursor:pointer; color:${MUTED}; padding:4px; display:flex; align-items:center; }
        .ep-close:hover { color:${INK}; }
        .ep-d-body { padding:20px 24px 24px; }
        .ep-sec { margin-top:20px; }
        .ep-sec:first-child { margin-top:0; }
        .ep-sec-l { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:${MUTED}; margin-bottom:9px; }
        .ep-ta { width:100%; min-height:96px; resize:vertical; padding:11px 13px; border:1px solid ${LINE}; border-radius:3px; font-size:.9rem; font-family:inherit; color:${INK}; }
        .ep-ta:focus { outline:none; border-color:${ACCENT}; }
        .ep-actions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:12px; }
        .ep-btn { border:none; border-radius:3px; padding:11px 20px; font-size:.88rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ep-btn:disabled { opacity:.55; cursor:not-allowed; }
        .ep-btn.primary { background:${ACCENT}; color:#fff; }
        .ep-btn.primary:hover:not(:disabled){ background:${ACCENT_DK}; }
        .ep-btn.go { background:${GREEN}; color:#fff; }
        .ep-btn.go:hover:not(:disabled){ background:#276634; }
        .ep-btn.blue { background:#1e5fa8; color:#fff; }
        .ep-btn.blue:hover:not(:disabled){ background:#184e8a; }
        .ep-btn.ghost { background:#fff; border:1px solid ${LINE}; color:${INK}; }
        .ep-btn.ghost:hover:not(:disabled){ background:${WASH}; }
        .ep-loadempty { background:#fff; border:1px dashed ${LINE}; border-radius:4px; padding:44px 24px; text-align:center; color:${FAINT}; font-size:.92rem; line-height:1.6; }
        .ep-lb { position:fixed; inset:0; background:rgba(0,0,0,.9); z-index:2000; display:flex; align-items:center; justify-content:center; cursor:zoom-out; }
        .ep-lb img { max-width:92vw; max-height:92vh; object-fit:contain; }

        /* ── Quick Orders board: 2-col layout (list + detail) ── */
        .qo-layout { display:grid; grid-template-columns:1fr 420px; gap:16px; align-items:start; }
        .qo-board { display:flex; flex-direction:column; gap:8px; }
        .qo-card { background:#fff; border:1px solid ${LINE}; border-radius:4px; padding:14px 16px; cursor:pointer; transition:border-color .12s; border-left:3px solid ${LINE}; }
        .qo-card:hover { border-color:#d8cfc0; }
        .qo-card.sel { border-left-color:${ACCENT}; box-shadow:0 0 0 1px ${ACCENT}; }
        .qo-card.mine { border-left-color:${GOLD}; }
        .qo-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
        .qo-card-name { font-size:.94rem; font-weight:700; color:${INK}; }
        .qo-card-phone { font-size:.72rem; color:${MUTED}; margin-top:1px; }
        .qo-status { display:inline-block; padding:2px 9px; border-radius:2px; font-size:.72rem; font-weight:700; }
        .qo-card-work { font-size:.84rem; line-height:1.5; white-space:pre-line; color:${INK}; margin-top:8px; background:${WASH}; border-left:3px solid ${GOLD}; padding:7px 10px; }
        .qo-card-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:8px; font-size:.72rem; }
        .qo-chip { display:inline-flex; align-items:center; gap:3px; background:#f3f4f6; padding:2px 8px; font-size:.72rem; font-weight:700; color:#374151; border-radius:2px; }
        .qo-amount { font-weight:700; font-variant-numeric:tabular-nums; }
        .qo-due { color:${ACCENT}; }
        .qo-paid-lbl { color:${GREEN}; }
        .qo-date { color:${MUTED}; }
        .qo-claim { padding:7px 16px; background:${ACCENT}; color:#fff; border:none; font-family:inherit; font-size:.82rem; font-weight:700; cursor:pointer; border-radius:3px; white-space:nowrap; }
        .qo-claim:hover:not(:disabled) { background:${ACCENT_DK}; }
        .qo-claim:disabled { opacity:.55; cursor:not-allowed; }

        /* ── Order detail panel ── */
        .qo-detail { background:#fff; border:1px solid ${LINE}; border-radius:4px; position:sticky; top:90px; }
        .qo-d-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; padding:16px 18px; border-bottom:1px solid ${LINE_SOFT}; }
        .qo-d-name { font-size:1.05rem; font-weight:700; }
        .qo-d-phone { font-size:.76rem; color:${MUTED}; margin-top:3px; }
        .qo-d-body { padding:16px 18px; }
        .qo-d-sec { margin-top:16px; }
        .qo-d-sec:first-child { margin-top:0; }
        .qo-d-sec-l { font-size:.66rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:${MUTED}; margin-bottom:8px; }
        .qo-d-work { font-size:.9rem; line-height:1.6; white-space:pre-line; background:${WASH}; border-left:3px solid ${GOLD}; padding:10px 13px; }
        .qo-d-kv { display:flex; justify-content:space-between; gap:12px; font-size:.85rem; padding:3px 0; }
        .qo-d-kv .k { color:${MUTED}; } .qo-d-kv .v { font-weight:600; }
        .qo-statusctl { display:flex; border:1px solid ${LINE}; border-radius:3px; overflow:hidden; }
        .qo-sc { flex:1; padding:9px 6px; border:none; border-right:1px solid ${LINE}; font-size:.78rem; font-weight:600; cursor:pointer; background:#fff; font-family:inherit; color:${MUTED}; text-align:center; }
        .qo-sc:last-child { border-right:none; }
        .qo-sc:hover:not(.on) { background:${WASH}; color:${INK}; }
        .qo-sc.on { color:#fff; font-weight:700; }
        .qo-save-notes { width:100%; padding:9px; border:none; background:${ACCENT}; color:#fff; font-family:inherit; font-size:.84rem; font-weight:700; cursor:pointer; border-radius:3px; margin-top:8px; }
        .qo-save-notes:hover:not(:disabled) { background:${ACCENT_DK}; }
        .qo-save-notes:disabled { opacity:.55; cursor:not-allowed; }
        .qo-realtime-hint { font-size:.72rem; color:${GREEN}; display:flex; align-items:center; gap:5px; margin-top:10px; }
        .qo-realtime-dot { width:7px; height:7px; border-radius:50%; background:${GREEN}; }

        @media (max-width:900px) { .qo-layout { grid-template-columns:1fr; } .qo-detail { position:static; } }
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
            {view === "dashboard" ? "Dashboard"
              : view === "tasks"   ? "My tasks"
              : view === "orders"  ? "Quick Orders"
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

          {/* ── Dashboard ── */}
          {view === "dashboard" && (
            <>
              <div className="ep-hi">Good day, {firstName}!</div>
              <div className="ep-sub">
                {loading ? "Loading your work…"
                  : stats.total === 0 ? "No tasks assigned to you yet."
                  : <>You have <b>{stats.total}</b> task{stats.total > 1 ? "s" : ""}
                    {stats.ready > 0 && <> · <b>{stats.ready}</b> ready to deliver</>}
                    {unassignedCount > 0 && <> · <b>{unassignedCount}</b> order{unassignedCount > 1 ? "s" : ""} available to claim</>}.</>}
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

              {/* Available orders */}
              {unassignedCount > 0 && (
                <div className="ep-panel" style={{ borderLeftColor: GOLD, borderLeftWidth: 3 }}>
                  <div className="ep-panel-h">
                    <b>📋 Orders available to claim</b>
                    <button className="ep-viewall" onClick={() => { setView("orders"); setOTab("unassigned"); }}>View all <IcoArrow /></button>
                  </div>
                  {unassignedOrders.slice(0, 3).map((o) => (
                    <button key={o.id} className="ep-arow" onClick={() => { setView("orders"); setOTab("unassigned"); setActiveOrderId(o.id); }}>
                      <div className="ep-arow-main">
                        <div className="ep-arow-t">{o.customerName}</div>
                        <div className="ep-arow-sub">{o.workDetails.slice(0, 70)}{o.workDetails.length > 70 ? "…" : ""}</div>
                      </div>
                      <div className="ep-arow-r">
                        <span style={{ fontSize: ".78rem", fontWeight: 700, color: GOLD }}>{rupStr(Number(o.amount))}</span>
                        <span className="ep-arow-go"><IcoArrow /></span>
                      </div>
                    </button>
                  ))}
                  {unassignedCount > 3 && <div style={{ padding: "10px 18px", fontSize: ".78rem", color: MUTED }}>{unassignedCount - 3} more available…</div>}
                </div>
              )}

              {/* Needs attention */}
              <div className="ep-panel">
                <div className="ep-panel-h">
                  <b>Needs your attention</b>
                  <span className="ep-count">{needsAttention.length} item{needsAttention.length !== 1 ? "s" : ""}</span>
                </div>
                {needsAttention.length === 0 ? (
                  <div className="ep-empty"><b>All caught up</b>Nothing overdue.</div>
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
                  {stats.total > 0 && <button className="ep-viewall" onClick={goTasks}>View all <IcoArrow /></button>}
                </div>
                {recentDelivered.length === 0
                  ? <div className="ep-empty">No deliveries yet.</div>
                  : recentDelivered.map((t) => (
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
                  { id: "all",         label: "All",         n: tabCounts.all         },
                  { id: "pending",     label: "Pending",     n: tabCounts.pending     },
                  { id: "in_progress", label: "In progress", n: tabCounts.in_progress },
                  { id: "completed",   label: "Completed",   n: tabCounts.completed   },
                  { id: "delivered",   label: "Delivered",   n: tabCounts.delivered   },
                ] as { id: Tab; label: string; n: number }[]).map((t) => (
                  <button key={t.id} className={`ep-tab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
                    {t.label} <span className="c">({t.n})</span>
                  </button>
                ))}
              </div>
              {loading ? <div className="ep-loadempty">Loading…</div>
                : displayed.length === 0 ? <div className="ep-loadempty">No tasks found.</div>
                : <div className="ep-cards">
                    {displayed.map((t) => (
                      <TaskCard key={t.id} task={t} selected={selectedId === t.id} onClick={() => setSelectedId(t.id)} />
                    ))}
                  </div>}
              {selected && (
                <TaskDetail
                  task={selected} isMe={selected.deliveredBy?.id === userId}
                  notesDraft={notesDraft} setNotesDraft={setNotesDraft}
                  busy={busy} onClose={() => setSelectedId(null)}
                  onStatus={handleStatus} onDeliver={handleDeliver}
                  onImage={(src) => setLightbox(src)}
                />
              )}
            </>
          )}

          {/* ── Quick Orders Board ── */}
          {view === "orders" && (
            <>
              {/* sub-tabs */}
              <div className="ep-tabs" style={{ marginBottom: 16 }}>
                {([
                  { id: "unassigned", label: "Available to claim", n: unassignedOrders.length },
                  { id: "mine",       label: "My orders",          n: myOrders.length },
                  { id: "all",        label: "All orders",         n: orders.length },
                ] as { id: OTab; label: string; n: number }[]).map((t) => (
                  <button key={t.id} className={`ep-tab${oTab === t.id ? " on" : ""}`}
                    onClick={() => { setOTab(t.id); setActiveOrderId(null); }}>
                    {t.label} <span className="c">({t.n})</span>
                  </button>
                ))}
                <button style={{ marginLeft: "auto", alignSelf: "center", background: "none", border: "none", color: MUTED, fontSize: ".78rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                  onClick={loadOrders}>↻ Refresh</button>
              </div>

              {ordersLoading ? <div className="ep-loadempty">Loading orders…</div>
                : shownOrders.length === 0 ? (
                  <div className="ep-loadempty">
                    {oTab === "unassigned" ? "No unassigned orders right now."
                      : oTab === "mine" ? "You haven't claimed any orders yet."
                      : "No orders found."}
                  </div>
                ) : (
                  <div className={`qo-layout${activeOrder ? "" : ""}`}
                    style={{ gridTemplateColumns: activeOrder ? "1fr 420px" : "1fr" }}>

                    {/* Order list */}
                    <div className="qo-board">
                      {shownOrders.map((o) => {
                        const amt = Number(o.amount), less = Number((o as any).lessAmount || 0), adv = Number(o.advancePaid), due = Math.max(0, amt - less - adv);
                        const isMyOrder = o.task?.assignedTo?.id === userId;
                        const ts = o.task ? STATUS_META[o.task.status] : null;
                        const isClaiming = claiming === o.id;
                        const isActive = activeOrderId === o.id;

                        return (
                          <div key={o.id}
                            className={`qo-card${isActive ? " sel" : ""}${isMyOrder ? " mine" : ""}`}
                            onClick={() => setActiveOrderId(isActive ? null : o.id)}
                            style={{ cursor: "pointer" }}>

                            <div className="qo-card-top">
                              <div>
                                <div className="qo-card-name">{o.customerName}</div>
                                {o.customerPhone && <div className="qo-card-phone">{o.customerPhone}</div>}
                              </div>
                              <div onClick={e => e.stopPropagation()}>
                                {o.status === "billed" ? (
                                  <span className="qo-status" style={{ background: "#dcfce7", color: GREEN }}>{o.invoiceNo || "Invoiced"}</span>
                                ) : isMyOrder && ts ? (
                                  <span className="qo-status" style={{ background: ts.bg, color: ts.color }}>{ts.label}</span>
                                ) : !o.task ? (
                                  <button className="qo-claim" disabled={isClaiming} onClick={() => claimOrder(o.id)}>
                                    {isClaiming ? "Claiming…" : "Claim"}
                                  </button>
                                ) : (
                                  <span className="qo-status" style={{ background: "#f3f4f6", color: MUTED }}>{o.task.assignedTo.name}</span>
                                )}
                              </div>
                            </div>

                            {o.title && (
                              <div style={{ fontSize: ".78rem", fontWeight: 800, color: "#b45309", background: "#fef3c7", border: "1px solid #fde68a", display: "inline-block", padding: "1px 9px", marginBottom: 6, letterSpacing: ".02em" }}>
                                {o.title}
                              </div>
                            )}
                            <div className="qo-card-work">{o.workDetails || "—"}</div>

                            <div className="qo-card-meta">
                              <span className="qo-chip">{o.paymentMethod === "cash" ? "💵 Cash" : "📱 Online"}</span>
                              <span className={`qo-amount ${due > 0 ? "qo-due" : "qo-paid-lbl"}`}>
                                {rupStr(amt)}{less > 0 ? ` · Less ${rupStr(less)}` : ""}{due > 0 ? ` · Due ${rupStr(due)}` : " · Paid"}
                              </span>
                              <span className="qo-date">{fmtShort(o.entryDate)}</span>
                              {o.task && <span style={{ fontSize: ".72rem", fontWeight: 600, color: isMyOrder ? "#c2974a" : "#8a8378" }}>👷 {o.task.assignedTo.name}{isMyOrder ? " (You)" : ""}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Detail panel — only for my orders */}
                    {activeOrder && (() => {
                      const _amt  = Number(activeOrder.amount);
                      const _less = Number((activeOrder as any).lessAmount || 0);
                      const _adv  = Number(activeOrder.advancePaid);
                      const _due  = Math.max(0, _amt - _less - _adv);
                      const _ts   = activeOrder.task ? STATUS_META[activeOrder.task.status] : null;
                      return (
                      <div className="qo-detail">
                        {/* Header */}
                        <div className="qo-d-head">
                          <div>
                            <div className="qo-d-name">{activeOrder.customerName}</div>
                            {activeOrder.customerPhone && <div className="qo-d-phone">{activeOrder.customerPhone}</div>}
                          </div>
                          <button className="ep-close" onClick={() => setActiveOrderId(null)}><IcoClose /></button>
                        </div>

                        {/* Assigned employee badge */}
                        {activeOrder.task && (
                          <div style={{ padding: "6px 16px", background: activeOrder.task.assignedTo.id === userId ? "#fef3c7" : "#f3f4f6", borderBottom: "1px solid #f1ece3", fontSize: ".78rem", fontWeight: 600, color: activeOrder.task.assignedTo.id === userId ? "#92400e" : "#8a8378" }}>
                            👷 {activeOrder.task.assignedTo.name}{activeOrder.task.assignedTo.id === userId ? " (You)" : ""}
                            {_ts && <span style={{ marginLeft: 8, padding: "1px 7px", borderRadius: 3, fontSize: ".7rem", fontWeight: 700, background: _ts.bg, color: _ts.color }}>{_ts.label}</span>}
                          </div>
                        )}

                        <div className="qo-d-body" style={{ padding: "12px 16px" }}>

                          {/* ── Due / Paid banner ── */}
                          <div style={{ background: _due > 0 ? "#fef2ee" : "#eaf6ec", border: `1px solid ${_due > 0 ? "#f3c9ba" : "#bfe3c6"}`, borderRadius: 6, padding: "10px 14px", textAlign: "center", marginBottom: 10 }}>
                            <div style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: _due > 0 ? "#b8421f" : "#2f7a3f", marginBottom: 3 }}>
                              {_due > 0 ? "Balance Due" : "Fully Paid"}
                            </div>
                            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: _due > 0 ? "#d9542f" : "#2f7a3f", lineHeight: 1 }}>
                              {_due > 0 ? rupStr(_due) : "✓"}
                            </div>
                            <div style={{ fontSize: ".72rem", color: "#8a8378", marginTop: 5, display: "flex", justifyContent: "center", gap: 14 }}>
                              <span>Bill: {rupStr(_amt)}</span>
                              {_less > 0 && <span style={{ color: "#c2974a" }}>Less: −{rupStr(_less)}</span>}
                              <span style={{ color: "#2f7a3f" }}>Paid: {rupStr(_adv)}</span>
                            </div>
                          </div>

                          {/* ── Record Payment — only if due > 0 ── */}
                          {_due > 0 && (
                            <div style={{ background: "#fdf8f3", border: "1px solid #e7e1d7", borderRadius: 6, padding: "12px 14px", marginBottom: 10 }}>
                              <div style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#8a8378", marginBottom: 7 }}>Collect Payment</div>
                              {payErr && <div style={{ color: "#d9542f", fontSize: ".8rem", marginBottom: 8 }}>{payErr}</div>}
                              <input
                                style={{ width: "100%", padding: "9px 12px", border: "1px solid #e7e1d7", borderRadius: 5, fontSize: ".9rem", fontFamily: "inherit", marginBottom: 6, boxSizing: "border-box" as const, fontWeight: 700 }}
                                type="number" min="1" max={_due}
                                value={payAmt}
                                onChange={e => setPayAmt(e.target.value)}
                                placeholder={`₹ Amount (max ${rupStr(_due)})`}
                              />
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                                {(["cash","online"] as const).map(m => (
                                  <button key={m}
                                    style={{ padding: "8px 0", border: payMethod === m ? "2px solid #d9542f" : "1px solid #e7e1d7", borderRadius: 6, fontFamily: "inherit", fontSize: ".9rem", fontWeight: 700, cursor: "pointer", background: payMethod === m ? "#fef2ee" : "#fff", color: payMethod === m ? "#d9542f" : "#8a8378", transition: "all .12s" }}
                                    onClick={() => setPayMethod(m)}>
                                    {m === "cash" ? "💵 Cash" : "📱 Online"}
                                  </button>
                                ))}
                              </div>
                              <input
                                style={{ width: "100%", padding: "7px 12px", border: "1px solid #e7e1d7", borderRadius: 5, fontSize: ".82rem", fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box" as const }}
                                value={payNote}
                                onChange={e => setPayNote(e.target.value)}
                                placeholder="Note (optional)"
                              />
                              <button
                                style={{ width: "100%", padding: "10px", background: "#d9542f", color: "#fff", border: "none", borderRadius: 6, fontFamily: "inherit", fontSize: ".88rem", fontWeight: 800, cursor: payBusy ? "not-allowed" : "pointer", opacity: payBusy ? .6 : 1, letterSpacing: ".02em" }}
                                disabled={payBusy} onClick={recordPayment}>
                                {payBusy ? "Recording…" : `Record ₹${payAmt || "0"} Payment`}
                              </button>
                            </div>
                          )}

                          {/* ── Status ── */}
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#8a8378", marginBottom: 6 }}>Status</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                              {STATUS_FLOW.map((st) => {
                                const sm = STATUS_META[st];
                                const isOn = activeOrder.task?.status === st;
                                return (
                                  <button key={st}
                                    style={{ padding: "9px 6px", border: isOn ? "none" : "1px solid #e7e1d7", borderRadius: 6, fontSize: ".8rem", fontWeight: 700, cursor: "pointer", background: isOn ? sm.color : "#fff", color: isOn ? "#fff" : "#8a8378", fontFamily: "inherit", transition: "all .12s" }}
                                    disabled={orderBusy || activeOrder.task?.assignedTo?.id !== userId}
                                    onClick={() => updateOrderTaskStatus(st)}
                                    title={activeOrder.task?.assignedTo?.id !== userId ? "Only assigned employee can change status" : ""}>
                                    {sm.label}
                                  </button>
                                );
                              })}
                            </div>
                            <div style={{ fontSize: ".72rem", color: "#2f7a3f", display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
                              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2f7a3f", display: "inline-block" }} />
                              Admin sees this in real time
                            </div>
                          </div>

                          {/* ── Work Details ── */}
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#8a8378", marginBottom: 6 }}>Work Details</div>
                            <div style={{ fontSize: ".84rem", lineHeight: 1.5, whiteSpace: "pre-line" as const, background: "#faf8f3", borderLeft: "3px solid #c2974a", padding: "8px 11px", borderRadius: "0 5px 5px 0" }}>
                              {activeOrder.workDetails || "—"}
                            </div>
                          </div>

                          {/* ── Reference images ── */}
                          {activeOrder.images && activeOrder.images.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                              <div style={{ fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#8a8378", marginBottom: 6 }}>Reference Images</div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                                {activeOrder.images.map((img, i) => (
                                  <a key={i} href={`${API_BASE}${img}`} target="_blank" rel="noreferrer">
                                    <img src={`${API_BASE}${img}`} alt="" style={{ width: 60, height: 60, objectFit: "cover" as const, border: "1px solid #e7e1d7", borderRadius: 6, cursor: "zoom-in" }} />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── Notes (compact) ── */}
                          <div>
                            <div style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#8a8378", marginBottom: 8 }}>Notes</div>
                            <textarea
                              className="ep-ta"
                              style={{ minHeight: 56, fontSize: ".84rem" }}
                              value={orderNotes}
                              onChange={e => setOrderNotes(e.target.value)}
                              placeholder="Progress notes…"
                              rows={3}
                            />
                            <button className="qo-save-notes" style={{ marginTop: 6 }} disabled={orderBusy} onClick={saveOrderNotes}>
                              {orderBusy ? "Saving…" : "Save Notes"}
                            </button>
                          </div>

                        </div>
                      </div>
                      );
                    })()}                  </div>
                )}
            </>
          )}

          {/* ── Team View ── */}
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