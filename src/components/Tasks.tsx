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

// ---- Constants ----
const ACCENT = "#d9542f";
const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: "Pending",     color: "#92400e", bg: "#fef3c7" },
  in_progress: { label: "In Progress", color: "#1d4ed8", bg: "#dbeafe" },
  completed:   { label: "Completed",   color: "#15803d", bg: "#dcfce7" },
  cancelled:   { label: "Cancelled",   color: "#6b7280", bg: "#f3f4f6" },
};
const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "#9ca3af" },
  medium: { label: "Medium", color: "#c2974a" },
  high:   { label: "High",   color: "#d9542f" },
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
function deadlineInfo(t: Task): { text: string; tone: "ok" | "soon" | "over" | "done" } {
  if (!t.deadline) return { text: "No delivery date", tone: "ok" };
  const diff = new Date(t.deadline).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (t.status === "completed") {
    if (t.completedAt) {
      const late = new Date(t.completedAt).getTime() - new Date(t.deadline).getTime();
      if (late > 0) return { text: `Delivered ${fmtDuration(late)} late`, tone: "over" };
      return { text: "Delivered on time", tone: "done" };
    }
    return { text: "Completed", tone: "done" };
  }
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
        .tk { font-family:'DM Sans',system-ui,sans-serif; color:#1f2430; font-variant-numeric:tabular-nums; }
        .tk * { box-sizing:border-box; }
        .tk-stats { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:16px; }
        .tk-stat { background:#fff; border:1px solid #e8e8ee; border-top:3px solid #cfd3db; padding:14px 16px; }
        .tk-stat.pending{ border-top-color:#c2974a; } .tk-stat.inprog{ border-top-color:#1d4ed8; }
        .tk-stat.done{ border-top-color:#15803d; } .tk-stat.over{ border-top-color:${ACCENT}; }
        .tk-stat-n { font-size:1.7rem; font-weight:700; line-height:1; }
        .tk-stat.over .tk-stat-n { color:${ACCENT}; }
        .tk-stat-l { font-size:.68rem; text-transform:uppercase; letter-spacing:.07em; color:#6b7280; margin-top:5px; }
        .tk-bar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:14px; }
        .tk-search { padding:8px 12px; border:1px solid #d9dce3; font-size:.84rem; width:230px; font-family:inherit; }
        .tk-sel { padding:8px 10px; border:1px solid #d9dce3; font-size:.82rem; background:#fff; font-family:inherit; }
        .tk-search:focus, .tk-sel:focus { outline:2px solid ${ACCENT}; outline-offset:-1px; }
        .tk-assign { margin-left:auto; background:${ACCENT}; color:#fff; border:none; padding:9px 18px; font-size:.84rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .tk-assign:hover { background:#b8421f; }
        .tk-split { display:grid; grid-template-columns:minmax(320px,420px) 1fr; gap:14px; align-items:start; }
        .tk-list { background:#fff; border:1px solid #e8e8ee; max-height:calc(100vh - 260px); overflow-y:auto; }
        .tk-row { display:grid; grid-template-columns:4px 1fr auto; gap:11px; align-items:center; padding:12px 14px 12px 0; border-bottom:1px solid #f0f0f4; cursor:pointer; }
        .tk-row:last-child { border-bottom:none; }
        .tk-row:hover { background:#faf9f7; }
        .tk-row.sel { background:#fdf2ee; }
        .tk-row-stripe { width:4px; height:100%; min-height:42px; align-self:stretch; }
        .tk-row-mid { min-width:0; }
        .tk-row-title { font-weight:600; font-size:.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tk-row-sub { font-size:.75rem; color:#6b7280; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tk-row-money { font-size:.72rem; color:#9ca3af; margin-top:2px; }
        .tk-row-money b { color:${ACCENT}; }
        .tk-row-right { display:flex; flex-direction:column; align-items:flex-end; gap:5px; padding-right:14px; }
        .tk-badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:.7rem; font-weight:700; white-space:nowrap; }
        .tk-dl { font-size:.7rem; font-weight:600; }
        .tk-dl.ok{ color:#6b7280; } .tk-dl.soon{ color:#b45309; } .tk-dl.over{ color:${ACCENT}; } .tk-dl.done{ color:#15803d; }
        .tk-detail { background:#fff; border:1px solid #e8e8ee; padding:24px; min-height:340px; }
        .tk-empty { display:flex; align-items:center; justify-content:center; min-height:340px; color:#9ca3af; font-size:.9rem; text-align:center; }
        .tk-d-head { display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:6px; }
        .tk-d-title { font-size:1.15rem; font-weight:700; flex:1; min-width:200px; line-height:1.3; }
        .tk-d-actions { display:flex; gap:6px; }
        .tk-abtn { background:#fff; border:1px solid #d9dce3; padding:5px 12px; font-size:.76rem; cursor:pointer; font-family:inherit; color:#1f2430; }
        .tk-abtn:hover { background:#f5f5f8; }
        .tk-abtn.danger { color:${ACCENT}; border-color:#f5c4bb; }
        .tk-abtn.danger:hover { background:#fef2ee; }
        .tk-d-meta { display:flex; gap:16px; flex-wrap:wrap; font-size:.8rem; color:#6b7280; margin:8px 0 8px; }
        .tk-d-meta b { color:#1f2430; font-weight:600; }
        .tk-order { display:grid; grid-template-columns:1fr 1fr; gap:0; border:1px solid #eceaf0; margin:16px 0; }
        .tk-order-col { padding:14px 16px; }
        .tk-order-col + .tk-order-col { border-left:1px solid #eceaf0; }
        .tk-oc-l { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#9ca3af; margin-bottom:7px; }
        .tk-oc-row { font-size:.84rem; margin-bottom:3px; }
        .tk-oc-row b { font-weight:600; }
        .tk-bill-pill { display:inline-block; background:#eef2ff; color:#1d4ed8; border:1px solid #c7d2fe; padding:2px 8px; border-radius:999px; font-size:.72rem; font-weight:700; margin-top:6px; }
        .tk-bill { display:flex; gap:14px; margin-top:6px; }
        .tk-bill div span { font-size:.62rem; text-transform:uppercase; letter-spacing:.04em; color:#9ca3af; display:block; }
        .tk-bill div b { font-size:.9rem; font-weight:700; }
        .tk-bill .due b { color:${ACCENT}; }
        .tk-bill .paid b { color:#15803d; }
        .tk-sec { margin-top:18px; }
        .tk-sec-l { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#6b7280; margin-bottom:8px; }
        .tk-desc { font-size:.88rem; line-height:1.6; white-space:pre-wrap; background:#faf9f7; border-left:3px solid #c2974a; padding:12px 14px; }
        .tk-links a { color:${ACCENT}; font-size:.82rem; display:block; margin-bottom:4px; word-break:break-all; }
        .tk-imgs { display:flex; flex-wrap:wrap; gap:10px; }
        .tk-img { width:110px; height:84px; object-fit:cover; border:1px solid #e8e8ee; cursor:pointer; }
        .tk-notes { background:#f9fafb; border:1px solid #e8e8ee; padding:12px; font-size:.84rem; white-space:pre-wrap; }
        .tk-tl { position:relative; padding-left:4px; }
        .tk-tl-step { display:grid; grid-template-columns:20px 1fr; gap:12px; }
        .tk-tl-rail { display:flex; flex-direction:column; align-items:center; }
        .tk-tl-dot { width:13px; height:13px; border-radius:50%; border:2px solid #cfd3db; background:#fff; flex-shrink:0; margin-top:2px; }
        .tk-tl-dot.done { background:#15803d; border-color:#15803d; }
        .tk-tl-dot.active { background:#1d4ed8; border-color:#1d4ed8; }
        .tk-tl-dot.cancel { background:#9ca3af; border-color:#9ca3af; }
        .tk-tl-line { width:2px; flex:1; background:#e5e7eb; min-height:18px; }
        .tk-tl-line.done { background:#15803d; }
        .tk-tl-body { padding-bottom:16px; }
        .tk-tl-step:last-child .tk-tl-body { padding-bottom:0; }
        .tk-tl-t { font-size:.85rem; font-weight:600; }
        .tk-tl-when { font-size:.76rem; color:#6b7280; margin-top:1px; }
        .tk-tl-dur { font-size:.72rem; color:#9ca3af; margin-top:1px; }
        .tk-statusctl { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
        .tk-sc { padding:6px 12px; border:1px solid #d9dce3; font-size:.76rem; font-weight:600; cursor:pointer; background:#fff; font-family:inherit; }
        .tk-sc.on { color:#fff; border-color:transparent; }
        /* modal */
        .tk-ov { position:fixed; inset:0; background:rgba(31,36,48,.5); z-index:1000; display:flex; align-items:flex-start; justify-content:center; padding:24px 20px; overflow-y:auto; }
        .tk-modal { background:#fff; width:100%; max-width:680px; padding:26px; position:relative; margin:auto; }
        .tk-mtitle { font-size:1.05rem; font-weight:700; margin-bottom:4px; }
        .tk-msub { font-size:.8rem; color:#9ca3af; margin-bottom:18px; }
        .tk-close { position:absolute; top:14px; right:16px; background:none; border:none; font-size:1.3rem; cursor:pointer; color:#6b7280; }
        .tk-lbl { display:block; font-size:.74rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; margin-bottom:5px; }
        .tk-inp { width:100%; padding:9px 12px; border:1px solid #d4c8b0; font-size:.88rem; font-family:inherit; }
        .tk-inp:focus { outline:2px solid ${ACCENT}; outline-offset:-1px; }
        .tk-ta { min-height:96px; resize:vertical; }
        .tk-2col { display:grid; grid-template-columns:1fr 1fr; gap:13px; }
        .tk-seg { display:flex; border:1px solid #d4c8b0; }
        .tk-seg button { flex:1; padding:8px; border:none; background:#fff; font-size:.78rem; cursor:pointer; font-family:inherit; }
        .tk-seg button.on { background:${ACCENT}; color:#fff; font-weight:700; }
        .tk-save { background:${ACCENT}; color:#fff; border:none; padding:11px; width:100%; font-size:.9rem; font-weight:700; cursor:pointer; font-family:inherit; margin-top:4px; }
        .tk-save:disabled { opacity:.5; cursor:not-allowed; }
        .tk-fieldset { border:1px solid #eceaf0; padding:16px; margin-bottom:2px; }
        .tk-fs-l { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:${ACCENT}; margin-bottom:12px; }
        .tk-grid { display:grid; gap:13px; }
        /* bill picker */
        .tk-bp { position:relative; }
        .tk-bp-dd { position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid #d9dce3; border-top:none; z-index:30; max-height:260px; overflow-y:auto; box-shadow:0 8px 20px rgba(20,20,25,.12); }
        .tk-bp-item { padding:10px 12px; cursor:pointer; border-bottom:1px solid #f2f2f6; display:flex; justify-content:space-between; gap:10px; align-items:center; }
        .tk-bp-item:hover { background:#faf9f7; }
        .tk-bp-item .l b { font-size:.86rem; } .tk-bp-item .l span { font-size:.76rem; color:#6b7280; margin-left:8px; }
        .tk-bp-item .r { font-size:.82rem; font-weight:700; white-space:nowrap; }
        .tk-bp-none { padding:14px 12px; text-align:center; }
        .tk-bp-none p { font-size:.82rem; color:#6b7280; margin:0 0 8px; }
        .tk-bp-mkbtn { background:${ACCENT}; color:#fff; border:none; padding:7px 14px; font-size:.8rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .tk-bill-chip { border:1px solid #e4d9c8; background:#faf9f7; padding:14px 16px; }
        .tk-bill-chip-top { display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .tk-bill-chip-top b { font-size:.95rem; }
        .tk-bill-chip .sub { font-size:.8rem; color:#6b7280; margin-top:3px; }
        .tk-bill-figs { display:flex; gap:18px; margin-top:10px; }
        .tk-bill-figs div span { font-size:.64rem; text-transform:uppercase; letter-spacing:.05em; color:#9ca3af; display:block; }
        .tk-bill-figs div b { font-size:.95rem; }
        .tk-bill-figs .due b { color:${ACCENT}; }
        .tk-change { background:#fff; border:1px solid #d9dce3; padding:5px 12px; font-size:.76rem; cursor:pointer; font-family:inherit; color:#1f2430; flex-shrink:0; }
        .tk-change:hover { background:#f5f5f8; }
        /* per-item assignment cards */
        .tk-item { border:1px solid #eceaf0; padding:12px; margin-bottom:9px; position:relative; }
        .tk-item-head { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:9px; }
        .tk-item-head b { font-weight:600; font-size:.88rem; }
        .tk-item-head .r { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .tk-item-head .amt { font-weight:700; font-size:.85rem; white-space:nowrap; }
        .tk-item-x { background:#fff; border:1px solid #e4d9c8; color:${ACCENT}; width:22px; height:22px; border-radius:50%; font-size:14px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; }
        .tk-item-x:hover { background:#fef2ee; }
        .tk-item-2 { display:grid; grid-template-columns:minmax(150px,200px) 1fr; gap:8px; }
        .tk-item-2 select, .tk-item-2 input { padding:8px 10px; border:1px solid #e0d6c4; font-size:.82rem; font-family:inherit; width:100%; }
        .tk-item-2 select:focus, .tk-item-2 input:focus { outline:2px solid ${ACCENT}; outline-offset:-1px; }
        .tk-item.skipped { display:flex; align-items:center; justify-content:space-between; gap:10px; background:#f9fafb; color:#9ca3af; }
        .tk-item.skipped .s { font-size:.82rem; text-decoration:line-through; }
        .tk-item.skipped button { background:none; border:none; color:${ACCENT}; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .tk-createcount { font-size:.8rem; font-weight:600; color:#15803d; margin-top:4px; }
        .tk-createcount.zero { color:#9ca3af; font-weight:500; }
        .tk-thumb { position:relative; width:78px; height:66px; }
        .tk-thumb img { width:100%; height:100%; object-fit:cover; }
        .tk-thumb-x { position:absolute; top:2px; right:2px; background:${ACCENT}; color:#fff; border:none; border-radius:50%; width:18px; height:18px; font-size:11px; cursor:pointer; line-height:1; }
        .tk-thumb.rm img { opacity:.35; }
        .tk-thumb.rm::after { content:'✕'; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:1.3rem; color:${ACCENT}; font-weight:700; }
        .tk-lb { position:fixed; inset:0; background:rgba(0,0,0,.9); z-index:2000; display:flex; align-items:center; justify-content:center; cursor:zoom-out; }
        .tk-lb img { max-width:92vw; max-height:92vh; object-fit:contain; }
        @media (max-width:1000px){ .tk-split{ grid-template-columns:1fr; } .tk-list{ max-height:none; } }
        @media (max-width:560px){ .tk-stats{ grid-template-columns:repeat(2,1fr);} .tk-search{width:100%;} .tk-2col{grid-template-columns:1fr;} .tk-item-2{grid-template-columns:1fr;} .tk-order{grid-template-columns:1fr;} .tk-order-col + .tk-order-col{ border-left:none; border-top:1px solid #eceaf0; } }
      `}</style>

      {/* Stats */}
      <div className="tk-stats">
        <div className="tk-stat"><div className="tk-stat-n">{stats.total}</div><div className="tk-stat-l">Total</div></div>
        <div className="tk-stat pending"><div className="tk-stat-n">{stats.pending}</div><div className="tk-stat-l">Pending</div></div>
        <div className="tk-stat inprog"><div className="tk-stat-n">{stats.in_progress}</div><div className="tk-stat-l">In Progress</div></div>
        <div className="tk-stat done"><div className="tk-stat-n">{stats.completed}</div><div className="tk-stat-l">Completed</div></div>
        <div className="tk-stat over"><div className="tk-stat-n">{stats.overdue}</div><div className="tk-stat-l">Overdue</div></div>
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
        <button className="tk-assign" onClick={openCreate}>+ Assign Task</button>
      </div>

      {/* Split view */}
      <div className="tk-split">
        <div className="tk-list">
          {loading ? (
            <div style={{ padding: 20, color: "#9ca3af", fontSize: ".88rem" }}>Loading…</div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: "40px 20px", color: "#9ca3af", fontSize: ".88rem", textAlign: "center" }}>No tasks found.</div>
          ) : (
            displayed.map((t) => {
              const sm = STATUS_META[t.status];
              const pm = PRIORITY_META[t.priority];
              const dl = deadlineInfo(t);
              return (
                <div key={t.id} className={`tk-row${selectedId === t.id ? " sel" : ""}`} onClick={() => setSelectedId(t.id)}>
                  <div className="tk-row-stripe" style={{ background: pm.color }} />
                  <div className="tk-row-mid">
                    <div className="tk-row-title">{t.title}</div>
                    <div className="tk-row-sub">{t.customerName ? `${t.customerName} · ` : ""}{t.assignedTo.name}{t.invoiceNo ? ` · ${t.invoiceNo}` : ""}</div>
                    {(t.amount || 0) > 0 && <div className="tk-row-money">{rupees(t.amount)}</div>}
                  </div>
                  <div className="tk-row-right">
                    <span className="tk-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                    <span className={`tk-dl ${dl.tone}`}>{dl.text}</span>
                  </div>
                </div>
              );
            })
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
            {tasks.length === 0 ? "No tasks yet — click \"+ Assign Task\" to create tasks from a bill." : "Select a task to see the bill, customer, billing and progress timeline."}
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
                <div className="tk-mtitle">Edit Task</div>
                <div className="tk-msub">Update this task, reassign it, or change its instructions.</div>
                <div className="tk-grid">
                  {billSel && (
                    <div className="tk-fieldset">
                      <div className="tk-fs-l">Bill</div>
                      <div className="tk-bill-chip">
                        <div className="tk-bill-chip-top"><b>{billSel.invoiceNo}</b></div>
                        <div className="sub">{billSel.clientName}{billSel.clientPhone ? ` · ${billSel.clientPhone}` : ""}</div>
                      </div>
                    </div>
                  )}
                  <div className="tk-fieldset">
                    <div className="tk-fs-l">Task</div>
                    <div className="tk-grid">
                      <div>
                        <label className="tk-lbl">Title *</label>
                        <input className="tk-inp" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                      </div>
                      <div>
                        <label className="tk-lbl">Description / Instructions</label>
                        <textarea className="tk-inp tk-ta" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                      </div>
                      <div className="tk-2col">
                        <div>
                          <label className="tk-lbl">Order Date</label>
                          <input type="date" className="tk-inp" value={form.orderDate} onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))} />
                        </div>
                        <div>
                          <label className="tk-lbl">Delivery Estimate Date</label>
                          <input type="date" className="tk-inp" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
                        </div>
                      </div>
                      <div className="tk-2col">
                        <div>
                          <label className="tk-lbl">Assign To *</label>
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
                        <label className="tk-lbl">Reference Links (comma-separated)</label>
                        <input className="tk-inp" value={form.links} onChange={(e) => setForm((f) => ({ ...f, links: e.target.value }))} />
                      </div>
                      {editTask.images.length > 0 && (
                        <div>
                          <label className="tk-lbl">Existing Images (click to remove)</label>
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
                        <label className="tk-lbl">Upload Images</label>
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
                  <button className="tk-save" disabled={saving || !canSaveEdit} onClick={saveEdit}>{saving ? "Saving…" : "Save Changes"}</button>
                </div>
              </>
            ) : (
              /* ---------- CREATE: one bill → many employees ---------- */
              <>
                <div className="tk-mtitle">New Task Order</div>
                <div className="tk-msub">Pick a bill, then assign each item to an employee. One task is created per assigned item.</div>
                <div className="tk-grid">
                  {/* Step 1: Bill */}
                  <div className="tk-fieldset">
                    <div className="tk-fs-l">1 · Bill</div>
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
                      <div className="tk-fs-l">2 · Assign Each Item</div>
                      {(billSel.items || []).length === 0 ? (
                        <div style={{ fontSize: ".82rem", color: "#9ca3af" }}>This bill has no line items.</div>
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
                      <div className="tk-fs-l">3 · Shared Details</div>
                      <div className="tk-grid">
                        <div className="tk-2col">
                          <div>
                            <label className="tk-lbl">Order Date</label>
                            <input type="date" className="tk-inp" value={form.orderDate} onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))} />
                          </div>
                          <div>
                            <label className="tk-lbl">Delivery Estimate Date</label>
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
                          <label className="tk-lbl">General Notes (added to every task)</label>
                          <input className="tk-inp" value={form.generalNotes} onChange={(e) => setForm((f) => ({ ...f, generalNotes: e.target.value }))} placeholder="Anything that applies to the whole order…" />
                        </div>
                        <div>
                          <label className="tk-lbl">Reference Links (comma-separated)</label>
                          <input className="tk-inp" value={form.links} onChange={(e) => setForm((f) => ({ ...f, links: e.target.value }))} placeholder="https://drive.google.com/…" />
                        </div>
                        <div>
                          <label className="tk-lbl">Upload Images (added to every task)</label>
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
                    {saving ? "Creating…" : jobsToCreate.length > 1 ? `Assign ${jobsToCreate.length} Tasks` : "Assign Task"}
                  </button>
                  {!canSaveCreate && (
                    <div style={{ fontSize: ".74rem", color: "#9ca3af", textAlign: "center" }}>
                      {!billSel ? "Select a bill first — make one in the Billing tab if it doesn't exist." : "Assign at least one item to an employee."}
                    </div>
                  )}
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
        <div className="tk-d-title">{task.title}</div>
        <div className="tk-d-actions">
          <button className="tk-abtn" onClick={onEdit}>Edit</button>
          <button className="tk-abtn danger" onClick={onDelete}>Delete</button>
        </div>
      </div>

      <div className="tk-d-meta">
        <span>Assigned to <b>{task.assignedTo.name}</b></span>
        <span style={{ color: pm.color }}>● <b style={{ color: pm.color }}>{pm.label}</b> priority</span>
      </div>

      {hasOrder && (
        <div className="tk-order">
          <div className="tk-order-col">
            <div className="tk-oc-l">Customer</div>
            <div className="tk-oc-row"><b>{task.customerName || "—"}</b></div>
            {task.customerPhone && <div className="tk-oc-row">📞 {task.customerPhone}</div>}
            {task.customerEmail && <div className="tk-oc-row" style={{ color: "#6b7280", fontSize: ".8rem" }}>{task.customerEmail}</div>}
            {task.invoiceNo && <div className="tk-bill-pill">🧾 {task.invoiceNo}</div>}
            <div className="tk-oc-row" style={{ color: "#6b7280", fontSize: ".8rem", marginTop: 6 }}>
              Order: {fmtDate(task.orderDate)} · Delivery: {fmtDate(task.deadline)}
            </div>
            <div className={`tk-dl ${dl.tone}`} style={{ marginTop: 2 }}>{dl.text}</div>
          </div>
          <div className="tk-order-col">
            <div className="tk-oc-l">Billing</div>
            <div className="tk-oc-row">This item: <b>{rupees(itemValue)}</b></div>
            {bill && (
              <>
                <div className="tk-oc-l" style={{ marginTop: 10, marginBottom: 4 }}>Full bill {task.invoiceNo}</div>
                <div className="tk-bill">
                  <div><span>Total</span><b>{rupees(billTotal)}</b></div>
                  <div className="paid"><span>Advance</span><b>{rupees(billPaid)}</b></div>
                  <div className="due"><span>Due</span><b>{rupees(billDue)}</b></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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

      <div className="tk-sec">
        <div className="tk-sec-l">Progress Timeline</div>
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
              <div className="tk-tl-t" style={{ color: started ? "#1f2430" : "#9ca3af" }}>Started</div>
              {started ? (<>
                <div className="tk-tl-when">{fmtDateTime(started)}</div>
                {respDur !== null && <div className="tk-tl-dur">Picked up {fmtDuration(respDur)} after assignment</div>}
              </>) : <div className="tk-tl-when">Not started yet</div>}
            </div>
          </div>
          <div className="tk-tl-step">
            <div className="tk-tl-rail"><div className={`tk-tl-dot ${completed ? "done" : task.status === "in_progress" ? "active" : cancelled ? "cancel" : ""}`} /></div>
            <div className="tk-tl-body">
              <div className="tk-tl-t" style={{ color: completed ? "#1f2430" : "#9ca3af" }}>{cancelled ? "Cancelled" : "Completed"}</div>
              {completed ? (<>
                <div className="tk-tl-when">{fmtDateTime(completed)}</div>
                {workDur !== null && <div className="tk-tl-dur">Took {fmtDuration(workDur)} to finish</div>}
              </>) : cancelled ? <div className="tk-tl-when">This task was cancelled</div>
                : task.status === "in_progress" && workDur !== null ? <div className="tk-tl-when">In progress · {fmtDuration(workDur)} elapsed</div>
                : <div className="tk-tl-when">Not completed yet</div>}
            </div>
          </div>
        </div>
      </div>

      {task.description && (
        <div className="tk-sec"><div className="tk-sec-l">Item & Instructions</div><div className="tk-desc">{task.description}</div></div>
      )}
      {task.links.length > 0 && (
        <div className="tk-sec tk-links"><div className="tk-sec-l">Reference Links</div>
          {task.links.map((l, i) => <a key={i} href={l} target="_blank" rel="noreferrer">{l}</a>)}
        </div>
      )}
      {task.images.length > 0 && (
        <div className="tk-sec"><div className="tk-sec-l">Reference Images</div>
          <div className="tk-imgs">{task.images.map((img, i) => (
            <img key={i} src={`${API_BASE}${img}`} alt={`ref-${i + 1}`} className="tk-img" onClick={() => onImage(`${API_BASE}${img}`)} />
          ))}</div>
        </div>
      )}
      {task.notes && (
        <div className="tk-sec"><div className="tk-sec-l">Employee Notes</div><div className="tk-notes">{task.notes}</div></div>
      )}
    </div>
  );
}