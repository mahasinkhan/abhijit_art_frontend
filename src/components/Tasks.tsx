import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import api from "../api";
import { io, Socket } from "socket.io-client";

// ---- Types ----
type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
type TaskPriority = "low" | "medium" | "high" | "urgent";

interface TaskEmployee { id: string; name: string; email: string; }
interface Task {
  id: string;
  title: string;
  description?: string;
  images: string[];
  links: string[];
  priority: TaskPriority;
  status: TaskStatus;
  deadline?: string;
  notes?: string;
  startedAt?: string;
  completedAt?: string;
  deliveredAt?: string;
  deliveredBy?: { id: string; name: string } | null;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  orderDate?: string;
  amount?: number;
  advancePaid?: number;
  invoiceId?: string;
  invoiceNo?: string;
  assignedTo: TaskEmployee;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}
interface Employee { id: string; name: string; email: string; _count: { tasksAssigned: number }; }
interface BillItem { desc: string; qty: number | string; rate: number | string; }
interface Invoice {
  id: string; invoiceNo: string; date: string; status: string;
  clientName: string; clientPhone?: string; clientEmail?: string;
  total: string | number; paidAmount: string | number;
  items: BillItem[];
}
interface ItemAssign { assignedToId: string; instruction: string; removed: boolean; }

// ---- Design tokens ----
const ACCENT = "#d9542f";       // terracotta (primary)
const ACCENT_DK = "#b8421f";
const GOLD = "#c2974a";         // secondary
const INK = "#2a231d";
const MUTED = "#8a8378";
const FAINT = "#b3ab9f";
const LINE = "#e7e1d7";         // warm hairline
const LINE_SOFT = "#f1ece3";
const WASH = "#faf8f3";         // subtle warm surface

const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: "Pending",     color: "#9a6a12", bg: "#fbf1dd" },
  in_progress: { label: "In progress", color: "#1e5fa8", bg: "#e6eff9" },
  completed:   { label: "Completed",   color: "#2f7a3f", bg: "#e5f2e8" },
  cancelled:   { label: "Cancelled",   color: "#7c766c", bg: "#f0ede7" },
};
const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "#a8a29a" },
  medium: { label: "Medium", color: GOLD },
  high:   { label: "High",   color: ACCENT },
  urgent: { label: "Urgent", color: "#7c3aed" },
};
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ---- Helpers ----
const rupees = (n?: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const money = (v: string | number) => Math.round(parseFloat(String(v ?? "0")) || 0);
function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtDuration(ms: number) {
  if (ms < 0) ms = 0;
  const m = Math.floor(ms / 60000);
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return rm ? `${h}h ${rm}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}
function deadlineInfo(t: Task): { text: string; tone: "ok" | "soon" | "over" | "done" | "ready" } {
  if (t.deliveredAt) {
    if (t.deadline) {
      const late = new Date(t.deliveredAt).getTime() - new Date(t.deadline).getTime();
      if (late > 0) return { text: `Delivered ${fmtDuration(late)} late`, tone: "over" };
    }
    return { text: "Delivered on time", tone: "done" };
  }
  if (t.status === "completed") return { text: "Done · awaiting delivery", tone: "ready" };
  if (t.status === "cancelled") return { text: "Cancelled", tone: "ok" };
  if (!t.deadline) return { text: "No delivery date", tone: "ok" };
  const diff = new Date(t.deadline).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (diff < 0) return { text: `Overdue by ${fmtDuration(-diff)}`, tone: "over" };
  if (days === 0) return { text: "Due today", tone: "soon" };
  if (days <= 2) return { text: `Due in ${days} day${days > 1 ? "s" : ""}`, tone: "soon" };
  return { text: `Due ${fmtDate(t.deadline)}`, tone: "ok" };
}

export default function Tasks({
  prefillEmployeeId,
  onPrefillConsumed,
  onGoToBilling,
}: {
  prefillEmployeeId?: string | null;
  onPrefillConsumed?: () => void;
  onGoToBilling?: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState({ status: "", priority: "", assignee: "" });
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // shared form (create) + single-task fields (edit)
  const [form, setForm] = useState({
    title: "", assignedToId: "", priority: "medium" as TaskPriority,
    deadline: "", orderDate: "", links: "", generalNotes: "", description: "",
  });
  const [formImages, setFormImages] = useState<File[]>([]);
  const [formImagePreviews, setFormImagePreviews] = useState<string[]>([]);
  const [removeImages, setRemoveImages] = useState<string[]>([]);

  // bill picker + per-item assignment (create mode)
  const [billSel, setBillSel] = useState<Invoice | null>(null);
  const [billQuery, setBillQuery] = useState("");
  const [billDdOpen, setBillDdOpen] = useState(false);
  const [itemAssign, setItemAssign] = useState<ItemAssign[]>([]);

  // ---- Load ----
  const loadTasks = useCallback(async () => {
    try { const { data } = await api.get("/api/tasks"); setTasks(data); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  const loadInvoices = useCallback(async () => {
    try { const { data } = await api.get("/api/invoices"); setInvoices(data || []); }
    catch { /* ignore */ }
  }, []);

  useEffect(() => { loadTasks(); loadInvoices(); }, [loadTasks, loadInvoices]);
  useEffect(() => {
    api.get("/api/tasks/employees/list").then(({ data }) => setEmployees(data)).catch(() => {});
  }, []);

  // ---- Socket ----
  useEffect(() => {
    const socket = io(API_BASE, { withCredentials: true });
    socketRef.current = socket;
    socket.on("task:created", (task: Task) => setTasks((p) => [task, ...p.filter((t) => t.id !== task.id)]));
    socket.on("task:updated", (task: Task) => setTasks((p) => p.map((t) => (t.id === task.id ? task : t))));
    socket.on("task:deleted", ({ id }: { id: string }) => {
      setTasks((p) => p.filter((t) => t.id !== id));
      setSelectedId((cur) => (cur === id ? null : cur));
    });
    return () => { socket.disconnect(); };
  }, []);

  // ---- Prefill from Employees "Assign task" ----
  useEffect(() => {
    if (prefillEmployeeId) { openCreate(); onPrefillConsumed?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillEmployeeId]);

  const billMatches = useMemo(() => {
    const q = billQuery.trim().toLowerCase();
    const list = invoices.filter((i) => i.status !== "cancelled");
    if (!q) return list.slice(0, 8);
    return list
      .filter((i) => i.invoiceNo.toLowerCase().includes(q) ||
                     (i.clientName || "").toLowerCase().includes(q) ||
                     (i.clientPhone || "").includes(billQuery.trim()))
      .slice(0, 8);
  }, [billQuery, invoices]);

  // ---- Stats ----
  const now = Date.now();
  const overdueCount = tasks.filter(
    (t) => t.deadline && t.status !== "completed" && t.status !== "cancelled" && new Date(t.deadline).getTime() < now
  ).length;
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: overdueCount,
  };

  // ---- Filter ----
  const displayed = tasks.filter((t) => {
    if (filter.status && t.status !== filter.status) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    if (filter.assignee && t.assignedTo.id !== filter.assignee) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) &&
          !t.assignedTo.name.toLowerCase().includes(q) &&
          !(t.customerName || "").toLowerCase().includes(q) &&
          !(t.invoiceNo || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const selected = tasks.find((t) => t.id === selectedId) || null;
  const selectedBill = selected ? invoices.find((i) => i.id === selected.invoiceId) || null : null;

  // ---- Form helpers ----
  function resetForm() {
    setForm({
      title: "", assignedToId: employees[0]?.id || "", priority: "medium",
      deadline: "", orderDate: new Date().toISOString().slice(0, 10), links: "", generalNotes: "", description: "",
    });
    setBillSel(null); setBillQuery(""); setBillDdOpen(false); setItemAssign([]);
    setFormImages([]); setFormImagePreviews([]); setRemoveImages([]);
  }
  function openCreate() { setEditTask(null); resetForm(); setShowModal(true); }
  function openEdit(task: Task) {
    setEditTask(task);
    setForm({
      title: task.title, assignedToId: task.assignedTo.id, priority: task.priority,
      deadline: task.deadline ? task.deadline.slice(0, 10) : "",
      orderDate: task.orderDate ? task.orderDate.slice(0, 10) : "",
      links: task.links.join(", "), generalNotes: "",
      description: task.description || "",
    });
    setBillSel(invoices.find((i) => i.id === task.invoiceId) || null);
    setItemAssign([]); setBillQuery(""); setBillDdOpen(false);
    setFormImages([]); setFormImagePreviews([]); setRemoveImages([]);
    setShowModal(true);
  }
  function selectBill(inv: Invoice) {
    setBillSel(inv);
    setItemAssign((inv.items || []).map(() => ({ assignedToId: "", instruction: "", removed: false })));
    setBillDdOpen(false); setBillQuery("");
    setForm((f) => ({ ...f, orderDate: inv.date ? inv.date.slice(0, 10) : f.orderDate }));
  }
  function updateItem(i: number, patch: Partial<ItemAssign>) {
    setItemAssign((p) => p.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setFormImages((p) => [...p, ...files]);
    files.forEach((f) => {
      const r = new FileReader();
      r.onload = (ev) => setFormImagePreviews((p) => [...p, ev.target?.result as string]);
      r.readAsDataURL(f);
    });
  }
  function removeNewImage(i: number) {
    setFormImages((p) => p.filter((_, idx) => idx !== i));
    setFormImagePreviews((p) => p.filter((_, idx) => idx !== i));
  }
  function toggleRemoveExisting(pathStr: string) {
    setRemoveImages((p) => (p.includes(pathStr) ? p.filter((x) => x !== pathStr) : [...p, pathStr]));
  }

  const billTotal = billSel ? money(billSel.total) : 0;
  const billPaid = billSel ? money(billSel.paidAmount) : 0;
  const billDue = Math.max(0, billTotal - billPaid);
  const jobsToCreate = billSel
    ? (billSel.items || []).map((it, i) => ({ it, a: itemAssign[i] })).filter((x) => x.a && !x.a.removed && x.a.assignedToId)
    : [];
  const linksArr = () => form.links.split(",").map((l) => l.trim()).filter(Boolean);

  const canSaveCreate = !!(billSel && jobsToCreate.length > 0);
  const canSaveEdit = !!(form.title.trim() && form.assignedToId);

  async function saveCreate() {
    if (!billSel || jobsToCreate.length === 0) return;
    setSaving(true);
    try {
      let firstId: string | null = null;
      for (const { it, a } of jobsToCreate) {
        const qty = Number(it.qty) || 0, rate = Number(it.rate) || 0, amt = qty * rate;
        const desc =
          `${qty} × ${it.desc || "Item"} — ${rupees(amt)}` +
          (a.instruction.trim() ? `\n→ ${a.instruction.trim()}` : "") +
          (form.generalNotes.trim() ? `\n\nNotes: ${form.generalNotes.trim()}` : "");
        const fd = new FormData();
        fd.append("title", it.desc || `Item · ${billSel.invoiceNo}`);
        fd.append("description", desc);
        fd.append("assignedToId", a.assignedToId);
        fd.append("priority", form.priority);
        fd.append("deadline", form.deadline);
        fd.append("orderDate", form.orderDate);
        fd.append("customerName", billSel.clientName || "");
        fd.append("customerPhone", billSel.clientPhone || "");
        fd.append("customerEmail", billSel.clientEmail || "");
        fd.append("amount", String(amt));
        fd.append("advancePaid", "0");
        fd.append("invoiceId", billSel.id);
        fd.append("invoiceNo", billSel.invoiceNo);
        fd.append("links", JSON.stringify(linksArr()));
        formImages.forEach((f) => fd.append("images", f));
        const { data } = await api.post("/api/tasks", fd, { headers: { "Content-Type": "multipart/form-data" } });
        if (!firstId) firstId = data.id;
      }
      if (firstId) setSelectedId(firstId);
      setShowModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create tasks");
    } finally { setSaving(false); }
  }

  async function saveEdit() {
    if (!editTask || !canSaveEdit) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("assignedToId", form.assignedToId);
      fd.append("priority", form.priority);
      fd.append("deadline", form.deadline);
      fd.append("orderDate", form.orderDate);
      fd.append("links", JSON.stringify(linksArr()));
      formImages.forEach((f) => fd.append("newImages", f));
      if (removeImages.length) fd.append("removeImages", JSON.stringify(removeImages));
      await api.patch(`/api/tasks/${editTask.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setShowModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save task");
    } finally { setSaving(false); }
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task permanently?")) return;
    try { await api.delete(`/api/tasks/${id}`); } catch { /* socket handles */ }
  }
  async function setStatus(id: string, status: TaskStatus) {
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, status } : t)));
    try { await api.patch(`/api/tasks/${id}/status`, { status }); }
    catch { loadTasks(); }
  }

  return (
    <div className="tk">
      <style>{`
        .tk { font-family:'DM Sans',system-ui,sans-serif; color:${INK}; font-variant-numeric:tabular-nums; }
        .tk * { box-sizing:border-box; }

        /* ---- Stats ---- */
        .tk-stats { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:18px; }
        .tk-stat { background:#fff; border:1px solid ${LINE}; border-radius:3px; padding:15px 16px; display:flex; flex-direction:column; gap:6px; }
        .tk-stat-n { font-size:1.55rem; font-weight:700; line-height:1; letter-spacing:-.01em; }
        .tk-stat-l { font-size:.66rem; text-transform:uppercase; letter-spacing:.08em; color:${MUTED}; display:flex; align-items:center; gap:6px; }
        .tk-stat-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .tk-stat.over .tk-stat-n { color:${ACCENT}; }

        /* ---- Toolbar ---- */
        .tk-bar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:14px; }
        .tk-search { padding:9px 12px; border:1px solid ${LINE}; border-radius:3px; font-size:.85rem; width:250px; font-family:inherit; color:${INK}; background:#fff; }
        .tk-search::placeholder { color:${FAINT}; }
        .tk-sel { padding:9px 10px; border:1px solid ${LINE}; border-radius:3px; font-size:.82rem; background:#fff; font-family:inherit; color:${INK}; }
        .tk-search:focus, .tk-sel:focus { outline:none; border-color:${ACCENT}; }
        .tk-assign { margin-left:auto; background:${ACCENT}; color:#fff; border:none; border-radius:3px; padding:10px 18px; font-size:.85rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .tk-assign:hover { background:${ACCENT_DK}; }

        /* ---- Split ---- */
        .tk-split { display:grid; grid-template-columns:minmax(300px,380px) 1fr; gap:16px; align-items:start; }
        .tk-list { background:#fff; border:1px solid ${LINE}; border-radius:3px; max-height:calc(100vh - 250px); overflow-y:auto; }
        .tk-count { padding:11px 16px; font-size:.7rem; text-transform:uppercase; letter-spacing:.07em; color:${MUTED}; border-bottom:1px solid ${LINE_SOFT}; position:sticky; top:0; background:#fff; z-index:1; }

        .tk-row { display:grid; grid-template-columns:3px 1fr; gap:0; align-items:stretch; border-bottom:1px solid ${LINE_SOFT}; cursor:pointer; }
        .tk-row:last-child { border-bottom:none; }
        .tk-row:hover { background:${WASH}; }
        .tk-row.sel { background:#fdf2ee; }
        .tk-row-stripe { width:3px; }
        .tk-row-body { padding:13px 14px; min-width:0; }
        .tk-row-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
        .tk-row-title { font-weight:600; font-size:.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tk-row.sel .tk-row-title { color:${ACCENT_DK}; }
        .tk-row-sub { font-size:.76rem; color:${MUTED}; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tk-row-foot { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:8px; }
        .tk-row-money { font-size:.78rem; font-weight:600; color:${INK}; }
        .tk-badge { display:inline-block; padding:2px 9px; border-radius:3px; font-size:.68rem; font-weight:700; white-space:nowrap; }
        .tk-dl { font-size:.72rem; font-weight:600; }
        .tk-dl.ok{ color:${MUTED}; } .tk-dl.soon{ color:#b45309; } .tk-dl.over{ color:${ACCENT}; } .tk-dl.done{ color:#2f7a3f; } .tk-dl.ready{ color:#9a6a12; }

        /* ---- Detail ---- */
        .tk-detail { background:#fff; border:1px solid ${LINE}; border-radius:3px; min-height:360px; }
        .tk-empty { display:flex; align-items:center; justify-content:center; min-height:360px; color:${FAINT}; font-size:.9rem; text-align:center; padding:40px; line-height:1.6; }
        .tk-d-head { display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap; padding:22px 24px 16px; border-bottom:1px solid ${LINE_SOFT}; }
        .tk-d-headmain { flex:1; min-width:200px; }
        .tk-d-title { font-size:1.15rem; font-weight:700; line-height:1.3; }
        .tk-d-sub { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:7px; font-size:.8rem; color:${MUTED}; }
        .tk-d-sub b { color:${INK}; font-weight:600; }
        .tk-chip { display:inline-flex; align-items:center; gap:5px; padding:2px 9px; border-radius:3px; font-size:.7rem; font-weight:700; }
        .tk-chip-dot { width:6px; height:6px; border-radius:50%; }
        .tk-d-actions { display:flex; gap:7px; }
        .tk-abtn { background:#fff; border:1px solid ${LINE}; border-radius:3px; padding:6px 13px; font-size:.78rem; font-weight:600; cursor:pointer; font-family:inherit; color:${INK}; }
        .tk-abtn:hover { background:${WASH}; border-color:#d8cfc0; }
        .tk-abtn.danger { color:${ACCENT}; border-color:#f0d2c8; }
        .tk-abtn.danger:hover { background:#fef2ee; }

        .tk-d-body { padding:20px 24px 24px; }

        /* status control */
        .tk-sec { margin-top:22px; }
        .tk-sec:first-child { margin-top:0; }
        .tk-sec-l { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:${MUTED}; margin-bottom:10px; }
        .tk-statusctl { display:inline-flex; border:1px solid ${LINE}; border-radius:3px; overflow:hidden; flex-wrap:wrap; }
        .tk-sc { padding:8px 16px; border:none; border-right:1px solid ${LINE}; font-size:.78rem; font-weight:600; cursor:pointer; background:#fff; font-family:inherit; color:${MUTED}; }
        .tk-sc:last-child { border-right:none; }
        .tk-sc:hover:not(.on) { background:${WASH}; color:${INK}; }
        .tk-sc.on { color:#fff; font-weight:700; }

        /* order cards */
        .tk-cards { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .tk-card { border:1px solid ${LINE}; border-radius:3px; padding:16px; background:${WASH}; }
        .tk-card-l { font-size:.66rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:${FAINT}; margin-bottom:11px; }
        .tk-kv { display:flex; align-items:baseline; justify-content:space-between; gap:12px; font-size:.85rem; padding:3px 0; }
        .tk-kv .k { color:${MUTED}; }
        .tk-kv .v { font-weight:600; text-align:right; }
        .tk-kv .v.due { color:${ACCENT}; } .tk-kv .v.paid { color:#2f7a3f; }
        .tk-cust-name { font-weight:700; font-size:.95rem; margin-bottom:6px; }
        .tk-cust-line { font-size:.82rem; color:${INK}; margin-bottom:2px; }
        .tk-cust-line.dim { color:${MUTED}; font-size:.78rem; }
        .tk-invpill { display:inline-block; background:#fff; border:1px solid ${LINE}; color:${INK}; padding:3px 10px; border-radius:3px; font-size:.72rem; font-weight:700; margin:6px 0; }
        .tk-dates { font-size:.76rem; color:${MUTED}; margin-top:6px; }
        .tk-billsplit { border-top:1px solid ${LINE}; margin-top:10px; padding-top:10px; }

        /* description / links / images / notes */
        .tk-desc { font-size:.88rem; line-height:1.65; white-space:pre-wrap; background:${WASH}; border-left:3px solid ${GOLD}; border-radius:0 3px 3px 0; padding:13px 15px; }
        .tk-links a { color:${ACCENT}; font-size:.82rem; display:block; margin-bottom:5px; word-break:break-all; text-decoration:none; }
        .tk-links a:hover { text-decoration:underline; }
        .tk-imgs { display:flex; flex-wrap:wrap; gap:10px; }
        .tk-img { width:112px; height:84px; object-fit:cover; border:1px solid ${LINE}; border-radius:3px; cursor:pointer; }
        .tk-img:hover { border-color:${ACCENT}; }
        .tk-notes { background:${WASH}; border:1px solid ${LINE}; border-radius:3px; padding:13px 15px; font-size:.85rem; white-space:pre-wrap; line-height:1.6; }

        /* timeline */
        .tk-tl { padding-left:2px; }
        .tk-tl-step { display:grid; grid-template-columns:16px 1fr; gap:14px; }
        .tk-tl-rail { display:flex; flex-direction:column; align-items:center; }
        .tk-tl-dot { width:12px; height:12px; border-radius:50%; border:2px solid ${LINE}; background:#fff; flex-shrink:0; margin-top:3px; }
        .tk-tl-dot.done { background:#2f7a3f; border-color:#2f7a3f; }
        .tk-tl-dot.active { background:#1e5fa8; border-color:#1e5fa8; }
        .tk-tl-dot.cancel { background:${MUTED}; border-color:${MUTED}; }
        .tk-tl-line { width:2px; flex:1; background:${LINE_SOFT}; min-height:20px; }
        .tk-tl-line.done { background:#c7e0cd; }
        .tk-tl-body { padding-bottom:18px; }
        .tk-tl-step:last-child .tk-tl-body { padding-bottom:0; }
        .tk-tl-t { font-size:.86rem; font-weight:600; }
        .tk-tl-when { font-size:.77rem; color:${MUTED}; margin-top:2px; }
        .tk-tl-dur { font-size:.72rem; color:${FAINT}; margin-top:1px; }

        /* ---- Modal ---- */
        .tk-ov { position:fixed; inset:0; background:rgba(31,36,48,.5); z-index:1000; display:flex; align-items:flex-start; justify-content:center; padding:24px 20px; overflow-y:auto; }
        .tk-modal { background:#fff; width:100%; max-width:680px; border-radius:4px; position:relative; margin:auto; overflow:hidden; }
        .tk-mhead { padding:22px 26px 18px; border-bottom:1px solid ${LINE_SOFT}; }
        .tk-mtitle { font-size:1.05rem; font-weight:700; }
        .tk-msub { font-size:.8rem; color:${MUTED}; margin-top:4px; line-height:1.5; }
        .tk-mbody { padding:22px 26px 26px; }
        .tk-close { position:absolute; top:16px; right:18px; background:none; border:none; font-size:1.4rem; line-height:1; cursor:pointer; color:${MUTED}; }
        .tk-close:hover { color:${INK}; }
        .tk-lbl { display:block; font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:${MUTED}; margin-bottom:6px; }
        .tk-inp { width:100%; padding:9px 12px; border:1px solid ${LINE}; border-radius:3px; font-size:.88rem; font-family:inherit; color:${INK}; background:#fff; }
        .tk-inp:focus { outline:none; border-color:${ACCENT}; }
        .tk-ta { min-height:92px; resize:vertical; }
        .tk-2col { display:grid; grid-template-columns:1fr 1fr; gap:13px; }
        .tk-seg { display:flex; border:1px solid ${LINE}; border-radius:3px; overflow:hidden; }
        .tk-seg button { flex:1; padding:8px; border:none; border-right:1px solid ${LINE}; background:#fff; font-size:.78rem; cursor:pointer; font-family:inherit; color:${MUTED}; }
        .tk-seg button:last-child { border-right:none; }
        .tk-seg button.on { background:${ACCENT}; color:#fff; font-weight:700; }
        .tk-save { background:${ACCENT}; color:#fff; border:none; border-radius:3px; padding:12px; width:100%; font-size:.9rem; font-weight:700; cursor:pointer; font-family:inherit; margin-top:4px; }
        .tk-save:hover:not(:disabled) { background:${ACCENT_DK}; }
        .tk-save:disabled { opacity:.45; cursor:not-allowed; }
        .tk-grid { display:grid; gap:14px; }

        /* fieldset with step number */
        .tk-fieldset { border:1px solid ${LINE}; border-radius:3px; padding:16px; }
        .tk-fs-l { display:flex; align-items:center; gap:9px; font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:${INK}; margin-bottom:14px; }
        .tk-fs-num { width:20px; height:20px; border-radius:3px; background:${ACCENT}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:.72rem; }

        /* bill picker */
        .tk-bp { position:relative; }
        .tk-bp-dd { position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid ${LINE}; border-top:none; border-radius:0 0 3px 3px; z-index:30; max-height:260px; overflow-y:auto; box-shadow:0 10px 26px rgba(20,20,25,.1); }
        .tk-bp-item { padding:11px 13px; cursor:pointer; border-bottom:1px solid ${LINE_SOFT}; display:flex; justify-content:space-between; gap:10px; align-items:center; }
        .tk-bp-item:hover { background:${WASH}; }
        .tk-bp-item .l b { font-size:.86rem; } .tk-bp-item .l span { font-size:.76rem; color:${MUTED}; margin-left:8px; }
        .tk-bp-item .r { font-size:.83rem; font-weight:700; white-space:nowrap; }
        .tk-bp-none { padding:16px 13px; text-align:center; }
        .tk-bp-none p { font-size:.82rem; color:${MUTED}; margin:0 0 10px; line-height:1.5; }
        .tk-bp-mkbtn { background:${ACCENT}; color:#fff; border:none; border-radius:3px; padding:8px 15px; font-size:.8rem; font-weight:700; cursor:pointer; font-family:inherit; }

        .tk-bill-chip { border:1px solid ${LINE}; border-radius:3px; background:${WASH}; padding:15px 16px; }
        .tk-bill-chip-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
        .tk-bill-chip-top b { font-size:.95rem; }
        .tk-bill-chip .sub { font-size:.8rem; color:${MUTED}; margin-top:4px; }
        .tk-bill-figs { display:flex; gap:22px; margin-top:12px; }
        .tk-bill-figs div span { font-size:.62rem; text-transform:uppercase; letter-spacing:.05em; color:${FAINT}; display:block; margin-bottom:2px; }
        .tk-bill-figs div b { font-size:.95rem; }
        .tk-bill-figs .due b { color:${ACCENT}; }
        .tk-change { background:#fff; border:1px solid ${LINE}; border-radius:3px; padding:6px 13px; font-size:.76rem; font-weight:600; cursor:pointer; font-family:inherit; color:${INK}; flex-shrink:0; }
        .tk-change:hover { background:${WASH}; }

        /* per-item assignment cards */
        .tk-item { border:1px solid ${LINE}; border-radius:3px; padding:13px; margin-bottom:9px; }
        .tk-item:last-child { margin-bottom:0; }
        .tk-item-head { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:10px; }
        .tk-item-head b { font-weight:600; font-size:.88rem; }
        .tk-item-head .r { display:flex; align-items:center; gap:9px; flex-shrink:0; }
        .tk-item-head .amt { font-weight:700; font-size:.85rem; white-space:nowrap; }
        .tk-item-x { background:#fff; border:1px solid ${LINE}; color:${ACCENT}; width:22px; height:22px; border-radius:3px; font-size:15px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; }
        .tk-item-x:hover { background:#fef2ee; border-color:#f0d2c8; }
        .tk-item-2 { display:grid; grid-template-columns:minmax(150px,190px) 1fr; gap:8px; }
        .tk-item-2 select, .tk-item-2 input { padding:8px 10px; border:1px solid ${LINE}; border-radius:3px; font-size:.82rem; font-family:inherit; width:100%; color:${INK}; background:#fff; }
        .tk-item-2 select:focus, .tk-item-2 input:focus { outline:none; border-color:${ACCENT}; }
        .tk-item.skipped { display:flex; align-items:center; justify-content:space-between; gap:10px; background:${WASH}; color:${MUTED}; padding:11px 13px; }
        .tk-item.skipped .s { font-size:.82rem; text-decoration:line-through; }
        .tk-item.skipped button { background:none; border:none; color:${ACCENT}; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .tk-createcount { font-size:.8rem; font-weight:600; color:#2f7a3f; margin-top:12px; padding-top:12px; border-top:1px solid ${LINE_SOFT}; }
        .tk-createcount.zero { color:${MUTED}; font-weight:500; }

        .tk-thumb { position:relative; width:80px; height:66px; }
        .tk-thumb img { width:100%; height:100%; object-fit:cover; border-radius:3px; }
        .tk-thumb-x { position:absolute; top:2px; right:2px; background:${ACCENT}; color:#fff; border:none; border-radius:3px; width:18px; height:18px; font-size:11px; cursor:pointer; line-height:1; }
        .tk-thumb.rm img { opacity:.35; }
        .tk-thumb.rm::after { content:'✕'; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:1.3rem; color:${ACCENT}; font-weight:700; }
        .tk-filenote { font-size:.74rem; color:${FAINT}; margin-top:6px; }

        .tk-lb { position:fixed; inset:0; background:rgba(0,0,0,.9); z-index:2000; display:flex; align-items:center; justify-content:center; cursor:zoom-out; }
        .tk-lb img { max-width:92vw; max-height:92vh; object-fit:contain; }

        .tk-hint { font-size:.74rem; color:${FAINT}; text-align:center; line-height:1.5; }

        @media (max-width:1000px){ .tk-split{ grid-template-columns:1fr; } .tk-list{ max-height:none; } }
        @media (max-width:560px){
          .tk-stats{ grid-template-columns:repeat(2,1fr); }
          .tk-search{ width:100%; }
          .tk-2col{ grid-template-columns:1fr; }
          .tk-item-2{ grid-template-columns:1fr; }
          .tk-cards{ grid-template-columns:1fr; }
        }
      `}</style>

      {/* Stats */}
      <div className="tk-stats">
        <div className="tk-stat">
          <div className="tk-stat-n">{stats.total}</div>
          <div className="tk-stat-l"><span className="tk-stat-dot" style={{ background: FAINT }} />Total</div>
        </div>
        <div className="tk-stat">
          <div className="tk-stat-n" style={{ color: STATUS_META.pending.color }}>{stats.pending}</div>
          <div className="tk-stat-l"><span className="tk-stat-dot" style={{ background: STATUS_META.pending.color }} />Pending</div>
        </div>
        <div className="tk-stat">
          <div className="tk-stat-n" style={{ color: STATUS_META.in_progress.color }}>{stats.in_progress}</div>
          <div className="tk-stat-l"><span className="tk-stat-dot" style={{ background: STATUS_META.in_progress.color }} />In progress</div>
        </div>
        <div className="tk-stat">
          <div className="tk-stat-n" style={{ color: STATUS_META.completed.color }}>{stats.completed}</div>
          <div className="tk-stat-l"><span className="tk-stat-dot" style={{ background: STATUS_META.completed.color }} />Completed</div>
        </div>
        <div className="tk-stat over">
          <div className="tk-stat-n">{stats.overdue}</div>
          <div className="tk-stat-l"><span className="tk-stat-dot" style={{ background: ACCENT }} />Overdue</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="tk-bar">
        <input className="tk-search" placeholder="Search task, customer or bill no…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="tk-sel" value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {(Object.keys(STATUS_META) as TaskStatus[]).map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <select className="tk-sel" value={filter.priority} onChange={(e) => setFilter((f) => ({ ...f, priority: e.target.value }))}>
          <option value="">All priorities</option>
          {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
        </select>
        <select className="tk-sel" value={filter.assignee} onChange={(e) => setFilter((f) => ({ ...f, assignee: e.target.value }))}>
          <option value="">All employees</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button className="tk-assign" onClick={openCreate}>+ Assign task</button>
      </div>

      {/* Split view */}
      <div className="tk-split">
        <div className="tk-list">
          {loading ? (
            <div style={{ padding: 20, color: MUTED, fontSize: ".88rem" }}>Loading…</div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: "40px 20px", color: FAINT, fontSize: ".88rem", textAlign: "center" }}>No tasks found.</div>
          ) : (
            <>
              <div className="tk-count">{displayed.length} {displayed.length === 1 ? "task" : "tasks"}</div>
              {displayed.map((t) => {
                const sm = STATUS_META[t.status];
                const pm = PRIORITY_META[t.priority];
                const dl = deadlineInfo(t);
                return (
                  <div key={t.id} className={`tk-row${selectedId === t.id ? " sel" : ""}`} onClick={() => setSelectedId(t.id)}>
                    <div className="tk-row-stripe" style={{ background: pm.color }} />
                    <div className="tk-row-body">
                      <div className="tk-row-top">
                        <span className="tk-row-title">{t.title}</span>
                        <span className="tk-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                      </div>
                      <div className="tk-row-sub">{t.customerName ? `${t.customerName} · ` : ""}{t.assignedTo.name}{t.invoiceNo ? ` · ${t.invoiceNo}` : ""}</div>
                      <div className="tk-row-foot">
                        <span className={`tk-dl ${dl.tone}`}>{dl.text}</span>
                        {(t.amount || 0) > 0 && <span className="tk-row-money">{rupees(t.amount)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {selected ? (
          <TaskDetail
            key={selected.id}
            task={selected}
            bill={selectedBill}
            onEdit={() => openEdit(selected)}
            onDelete={() => deleteTask(selected.id)}
            onStatus={(s) => setStatus(selected.id, s)}
            onImage={(src) => setLightbox(src)}
          />
        ) : (
          <div className="tk-detail tk-empty">
            {tasks.length === 0 ? "No tasks yet — click \u201c+ Assign task\u201d to create tasks from a bill." : "Select a task to see the customer, billing and progress timeline."}
          </div>
        )}
      </div>

      {/* ===== Modal ===== */}
      {showModal && (
        <div className="tk-ov" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="tk-modal">
            <button className="tk-close" onClick={() => setShowModal(false)}>×</button>

            {editTask ? (
              /* ---------- EDIT single task ---------- */
              <>
                <div className="tk-mhead">
                  <div className="tk-mtitle">Edit task</div>
                  <div className="tk-msub">Update this task, reassign it, or change its instructions.</div>
                </div>
                <div className="tk-mbody">
                  <div className="tk-grid">
                    {billSel && (
                      <div className="tk-bill-chip">
                        <div className="tk-bill-chip-top"><b>{billSel.invoiceNo}</b></div>
                        <div className="sub">{billSel.clientName}{billSel.clientPhone ? ` · ${billSel.clientPhone}` : ""}</div>
                      </div>
                    )}
                    <div>
                      <label className="tk-lbl">Title *</label>
                      <input className="tk-inp" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div>
                      <label className="tk-lbl">Description / instructions</label>
                      <textarea className="tk-inp tk-ta" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="tk-2col">
                      <div>
                        <label className="tk-lbl">Order date</label>
                        <input type="date" className="tk-inp" value={form.orderDate} onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))} />
                      </div>
                      <div>
                        <label className="tk-lbl">Delivery estimate</label>
                        <input type="date" className="tk-inp" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
                      </div>
                    </div>
                    <div className="tk-2col">
                      <div>
                        <label className="tk-lbl">Assign to *</label>
                        <select className="tk-inp" value={form.assignedToId} onChange={(e) => setForm((f) => ({ ...f, assignedToId: e.target.value }))}>
                          <option value="">— Select employee —</option>
                          {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e._count.tasksAssigned})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="tk-lbl">Priority</label>
                        <div className="tk-seg">
                          {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => (
                            <button key={p} className={form.priority === p ? "on" : ""} onClick={() => setForm((f) => ({ ...f, priority: p }))}>{PRIORITY_META[p].label}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="tk-lbl">Reference links (comma-separated)</label>
                      <input className="tk-inp" value={form.links} onChange={(e) => setForm((f) => ({ ...f, links: e.target.value }))} />
                    </div>
                    {editTask.images.length > 0 && (
                      <div>
                        <label className="tk-lbl">Existing images (click to remove)</label>
                        <div className="tk-imgs">
                          {editTask.images.map((img) => (
                            <div key={img} className={`tk-thumb${removeImages.includes(img) ? " rm" : ""}`} onClick={() => toggleRemoveExisting(img)} style={{ cursor: "pointer" }}>
                              <img src={`${API_BASE}${img}`} alt="" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="tk-lbl">Upload images</label>
                      <input type="file" multiple accept="image/*" onChange={handleImageSelect} style={{ fontSize: ".82rem" }} />
                      {formImagePreviews.length > 0 && (
                        <div className="tk-imgs" style={{ marginTop: 10 }}>
                          {formImagePreviews.map((src, i) => (
                            <div key={i} className="tk-thumb"><img src={src} alt="" /><button className="tk-thumb-x" onClick={() => removeNewImage(i)}>×</button></div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className="tk-save" disabled={saving || !canSaveEdit} onClick={saveEdit}>{saving ? "Saving…" : "Save changes"}</button>
                  </div>
                </div>
              </>
            ) : (
              /* ---------- CREATE: one bill → many employees ---------- */
              <>
                <div className="tk-mhead">
                  <div className="tk-mtitle">New task order</div>
                  <div className="tk-msub">Pick a bill, then assign each item to an employee. One task is created per assigned item.</div>
                </div>
                <div className="tk-mbody">
                  <div className="tk-grid">
                    {/* Step 1: Bill */}
                    <div className="tk-fieldset">
                      <div className="tk-fs-l"><span className="tk-fs-num">1</span>Bill</div>
                      {billSel ? (
                        <div className="tk-bill-chip">
                          <div className="tk-bill-chip-top">
                            <div style={{ minWidth: 0 }}>
                              <b>{billSel.invoiceNo}</b>
                              <div className="sub">{billSel.clientName || "—"}{billSel.clientPhone ? ` · ${billSel.clientPhone}` : ""}</div>
                            </div>
                            <button className="tk-change" onClick={() => { setBillSel(null); setItemAssign([]); }}>Change</button>
                          </div>
                          <div className="tk-bill-figs">
                            <div><span>Amount</span><b>{rupees(billTotal)}</b></div>
                            <div><span>Advance</span><b>{rupees(billPaid)}</b></div>
                            <div className="due"><span>Due</span><b>{rupees(billDue)}</b></div>
                          </div>
                        </div>
                      ) : (
                        <div className="tk-bp">
                          <label className="tk-lbl">Find the bill *</label>
                          <input
                            className="tk-inp"
                            value={billQuery}
                            onChange={(e) => { setBillQuery(e.target.value); setBillDdOpen(true); }}
                            onFocus={() => setBillDdOpen(true)}
                            onBlur={() => setTimeout(() => setBillDdOpen(false), 180)}
                            placeholder="Search by invoice no, customer name or phone…"
                            autoComplete="off"
                          />
                          {billDdOpen && (
                            <div className="tk-bp-dd">
                              {billMatches.map((inv) => (
                                <div key={inv.id} className="tk-bp-item" onMouseDown={() => selectBill(inv)}>
                                  <div className="l"><b>{inv.invoiceNo}</b><span>{inv.clientName}</span></div>
                                  <div className="r">{rupees(money(inv.total))}</div>
                                </div>
                              ))}
                              {billMatches.length === 0 && (
                                <div className="tk-bp-none">
                                  <p>No matching bill found.<br />Make the bill first, then come back to assign it.</p>
                                  {onGoToBilling && <button className="tk-bp-mkbtn" onMouseDown={onGoToBilling}>Go to Billing →</button>}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Step 2: per-item assignment */}
                    {billSel && (
                      <div className="tk-fieldset">
                        <div className="tk-fs-l"><span className="tk-fs-num">2</span>Assign each item</div>
                        {(billSel.items || []).length === 0 ? (
                          <div style={{ fontSize: ".82rem", color: FAINT }}>This bill has no line items.</div>
                        ) : (
                          (billSel.items || []).map((it, i) => {
                            const a = itemAssign[i];
                            if (!a) return null;
                            const qty = Number(it.qty) || 0, rate = Number(it.rate) || 0;
                            if (a.removed) {
                              return (
                                <div key={i} className="tk-item skipped">
                                  <span className="s">{qty} × {it.desc || "Item"}</span>
                                  <button onClick={() => updateItem(i, { removed: false })}>Restore</button>
                                </div>
                              );
                            }
                            return (
                              <div key={i} className="tk-item">
                                <div className="tk-item-head">
                                  <b>{qty} × {it.desc || "Item"}</b>
                                  <div className="r">
                                    <span className="amt">{rupees(qty * rate)}</span>
                                    <button className="tk-item-x" title="Skip this item" onClick={() => updateItem(i, { removed: true })}>×</button>
                                  </div>
                                </div>
                                <div className="tk-item-2">
                                  <select value={a.assignedToId} onChange={(e) => updateItem(i, { assignedToId: e.target.value })}>
                                    <option value="">— Assign to —</option>
                                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                                  </select>
                                  <input value={a.instruction} onChange={(e) => updateItem(i, { instruction: e.target.value })} placeholder="Instruction for this item (optional)" />
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div className={`tk-createcount${jobsToCreate.length === 0 ? " zero" : ""}`}>
                          {jobsToCreate.length === 0
                            ? "Assign at least one item to an employee."
                            : `${jobsToCreate.length} task${jobsToCreate.length > 1 ? "s" : ""} will be created — one per assigned item.`}
                        </div>
                      </div>
                    )}

                    {/* Step 3: shared details */}
                    {billSel && (
                      <div className="tk-fieldset">
                        <div className="tk-fs-l"><span className="tk-fs-num">3</span>Shared details</div>
                        <div className="tk-grid">
                          <div className="tk-2col">
                            <div>
                              <label className="tk-lbl">Order date</label>
                              <input type="date" className="tk-inp" value={form.orderDate} onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))} />
                            </div>
                            <div>
                              <label className="tk-lbl">Delivery estimate</label>
                              <input type="date" className="tk-inp" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
                            </div>
                          </div>
                          <div>
                            <label className="tk-lbl">Priority (applies to all)</label>
                            <div className="tk-seg">
                              {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => (
                                <button key={p} className={form.priority === p ? "on" : ""} onClick={() => setForm((f) => ({ ...f, priority: p }))}>{PRIORITY_META[p].label}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="tk-lbl">General notes (added to every task)</label>
                            <input className="tk-inp" value={form.generalNotes} onChange={(e) => setForm((f) => ({ ...f, generalNotes: e.target.value }))} placeholder="Anything that applies to the whole order…" />
                          </div>
                          <div>
                            <label className="tk-lbl">Reference links (comma-separated)</label>
                            <input className="tk-inp" value={form.links} onChange={(e) => setForm((f) => ({ ...f, links: e.target.value }))} placeholder="https://drive.google.com/…" />
                          </div>
                          <div>
                            <label className="tk-lbl">Upload images (added to every task)</label>
                            <input type="file" multiple accept="image/*" onChange={handleImageSelect} style={{ fontSize: ".82rem" }} />
                            {formImagePreviews.length > 0 && (
                              <div className="tk-imgs" style={{ marginTop: 10 }}>
                                {formImagePreviews.map((src, i) => (
                                  <div key={i} className="tk-thumb"><img src={src} alt="" /><button className="tk-thumb-x" onClick={() => removeNewImage(i)}>×</button></div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <button className="tk-save" disabled={saving || !canSaveCreate} onClick={saveCreate}>
                      {saving ? "Creating…" : jobsToCreate.length > 1 ? `Assign ${jobsToCreate.length} tasks` : "Assign task"}
                    </button>
                    {!canSaveCreate && (
                      <div className="tk-hint">
                        {!billSel ? "Select a bill first — make one in the Billing tab if it doesn't exist." : "Assign at least one item to an employee."}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {lightbox && <div className="tk-lb" onClick={() => setLightbox(null)}><img src={lightbox} alt="Full size" /></div>}
    </div>
  );
}

// ---- Detail + Timeline ----
function TaskDetail({
  task, bill, onEdit, onDelete, onStatus, onImage,
}: {
  task: Task;
  bill: Invoice | null;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (s: TaskStatus) => void;
  onImage: (src: string) => void;
}) {
  const pm = PRIORITY_META[task.priority];
  const dl = deadlineInfo(task);
  const assigned = task.createdAt;
  const started = task.startedAt;
  const completed = task.completedAt;
  const cancelled = task.status === "cancelled";
  const delivered = !!task.deliveredAt;
  const respDur = started ? new Date(started).getTime() - new Date(assigned).getTime() : null;
  const workDur = started ? (completed ? new Date(completed).getTime() : Date.now()) - new Date(started).getTime() : null;
  const itemValue = task.amount || 0;
  const billTotal = bill ? money(bill.total) : 0;
  const billPaid = bill ? money(bill.paidAmount) : 0;
  const billDue = Math.max(0, billTotal - billPaid);
  const hasOrder = !!(task.customerName || itemValue > 0);

  return (
    <div className="tk-detail">
      <div className="tk-d-head">
        <div className="tk-d-headmain">
          <div className="tk-d-title">{task.title}</div>
          <div className="tk-d-sub">
            <span>Assigned to <b>{task.assignedTo.name}</b></span>
            <span className="tk-chip" style={{ background: `${pm.color}18`, color: pm.color }}>
              <span className="tk-chip-dot" style={{ background: pm.color }} />{pm.label}
            </span>
            {delivered && (
              <span className="tk-chip" style={{ background: "#e5f2e8", color: "#2f7a3f" }}>
                <span className="tk-chip-dot" style={{ background: "#2f7a3f" }} />Delivered{task.deliveredBy ? ` · ${task.deliveredBy.name}` : ""}
              </span>
            )}
          </div>
        </div>
        <div className="tk-d-actions">
          <button className="tk-abtn" onClick={onEdit}>Edit</button>
          <button className="tk-abtn danger" onClick={onDelete}>Delete</button>
        </div>
      </div>

      <div className="tk-d-body">
        {/* Status control */}
        <div className="tk-sec">
          <div className="tk-sec-l">Status</div>
          <div className="tk-statusctl">
            {(["pending", "in_progress", "completed", "cancelled"] as TaskStatus[]).map((s) => (
              <button key={s} className={`tk-sc${task.status === s ? " on" : ""}`}
                style={task.status === s ? { background: STATUS_META[s].color } : {}}
                onClick={() => task.status !== s && onStatus(s)}>
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Customer + Billing */}
        {hasOrder && (
          <div className="tk-sec">
            <div className="tk-cards">
              <div className="tk-card">
                <div className="tk-card-l">Customer</div>
                <div className="tk-cust-name">{task.customerName || "—"}</div>
                {task.customerPhone && <div className="tk-cust-line">{task.customerPhone}</div>}
                {task.customerEmail && <div className="tk-cust-line dim">{task.customerEmail}</div>}
                {task.invoiceNo && <div className="tk-invpill">{task.invoiceNo}</div>}
                <div className="tk-dates">Order: {fmtDate(task.orderDate)} · Delivery: {fmtDate(task.deadline)}</div>
                <div className={`tk-dl ${dl.tone}`} style={{ marginTop: 3 }}>{dl.text}</div>
              </div>
              <div className="tk-card">
                <div className="tk-card-l">Billing</div>
                <div className="tk-kv"><span className="k">This item</span><span className="v">{rupees(itemValue)}</span></div>
                {bill && (
                  <div className="tk-billsplit">
                    <div className="tk-card-l" style={{ marginBottom: 8 }}>Full bill {task.invoiceNo}</div>
                    <div className="tk-kv"><span className="k">Total</span><span className="v">{rupees(billTotal)}</span></div>
                    <div className="tk-kv"><span className="k">Advance paid</span><span className="v paid">{rupees(billPaid)}</span></div>
                    <div className="tk-kv"><span className="k">Balance due</span><span className="v due">{rupees(billDue)}</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="tk-sec">
          <div className="tk-sec-l">Progress timeline</div>
          <div className="tk-tl">
            <div className="tk-tl-step">
              <div className="tk-tl-rail"><div className="tk-tl-dot done" /><div className={`tk-tl-line${started || completed ? " done" : ""}`} /></div>
              <div className="tk-tl-body">
                <div className="tk-tl-t">Assigned</div>
                <div className="tk-tl-when">{fmtDateTime(assigned)} · by {task.createdBy.name}</div>
              </div>
            </div>
            <div className="tk-tl-step">
              <div className="tk-tl-rail"><div className={`tk-tl-dot ${started ? "done" : cancelled ? "cancel" : ""}`} /><div className={`tk-tl-line${completed ? " done" : ""}`} /></div>
              <div className="tk-tl-body">
                <div className="tk-tl-t" style={{ color: started ? INK : FAINT }}>Started</div>
                {started ? (<>
                  <div className="tk-tl-when">{fmtDateTime(started)}</div>
                  {respDur !== null && <div className="tk-tl-dur">Picked up {fmtDuration(respDur)} after assignment</div>}
                </>) : <div className="tk-tl-when">Not started yet</div>}
              </div>
            </div>
            <div className="tk-tl-step">
              <div className="tk-tl-rail"><div className={`tk-tl-dot ${completed ? "done" : task.status === "in_progress" ? "active" : cancelled ? "cancel" : ""}`} />{!cancelled && <div className={`tk-tl-line${delivered ? " done" : ""}`} />}</div>
              <div className="tk-tl-body">
                <div className="tk-tl-t" style={{ color: completed ? INK : FAINT }}>{cancelled ? "Cancelled" : "Completed"}</div>
                {completed ? (<>
                  <div className="tk-tl-when">{fmtDateTime(completed)}</div>
                  {workDur !== null && <div className="tk-tl-dur">Took {fmtDuration(workDur)} to finish</div>}
                </>) : cancelled ? <div className="tk-tl-when">This task was cancelled</div>
                  : task.status === "in_progress" && workDur !== null ? <div className="tk-tl-when">In progress · {fmtDuration(workDur)} elapsed</div>
                  : <div className="tk-tl-when">Not completed yet</div>}
              </div>
            </div>
            {!cancelled && (
              <div className="tk-tl-step">
                <div className="tk-tl-rail"><div className={`tk-tl-dot ${delivered ? "done" : ""}`} /></div>
                <div className="tk-tl-body">
                  <div className="tk-tl-t" style={{ color: delivered ? INK : FAINT }}>Delivered</div>
                  {delivered ? (
                    <div className="tk-tl-when">{fmtDateTime(task.deliveredAt)}{task.deliveredBy ? ` · by ${task.deliveredBy.name}` : ""}</div>
                  ) : completed ? <div className="tk-tl-when">Not delivered yet</div>
                    : <div className="tk-tl-when" style={{ color: FAINT }}>Awaiting completion</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {task.description && (
          <div className="tk-sec"><div className="tk-sec-l">Item &amp; instructions</div><div className="tk-desc">{task.description}</div></div>
        )}
        {task.links.length > 0 && (
          <div className="tk-sec tk-links"><div className="tk-sec-l">Reference links</div>
            {task.links.map((l, i) => <a key={i} href={l} target="_blank" rel="noreferrer">{l}</a>)}
          </div>
        )}
        {task.images.length > 0 && (
          <div className="tk-sec"><div className="tk-sec-l">Reference images</div>
            <div className="tk-imgs">{task.images.map((img, i) => (
              <img key={i} src={`${API_BASE}${img}`} alt={`ref-${i + 1}`} className="tk-img" onClick={() => onImage(`${API_BASE}${img}`)} />
            ))}</div>
          </div>
        )}
        {task.notes && (
          <div className="tk-sec"><div className="tk-sec-l">Employee notes</div><div className="tk-notes">{task.notes}</div></div>
        )}
      </div>
    </div>
  );
}