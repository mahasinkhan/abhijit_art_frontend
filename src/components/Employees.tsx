import { useEffect, useRef, useState, useCallback } from "react";
import api from "../api";
import { io, Socket } from "socket.io-client";

interface Employee {
  id: string; name: string; username: string | null; phone: string;
  createdAt: string;
  _count: { tasksAssigned: number };
}
type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
interface Task {
  id: string; title: string; status: TaskStatus; deadline?: string;
  priority: string;
  assignedTo: { id: string; name: string; email: string };
}

const ACCENT = "#d9542f";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: "Pending",     color: "#9a6a12", bg: "#fbf1dd" },
  in_progress: { label: "In progress", color: "#1e5fa8", bg: "#e6eff9" },
  completed:   { label: "Completed",   color: "#2f7a3f", bg: "#e5f2e8" },
  cancelled:   { label: "Cancelled",   color: "#7c766c", bg: "#f0ede7" },
};
const PRIORITY_COLOR: Record<string, string> = {
  low: "#a8a29a", medium: "#c2974a", high: ACCENT, urgent: "#7c3aed",
};

export default function Employees({ onAssignTask }: { onAssignTask?: (employeeId: string) => void }) {
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [tasks,     setTasks]       = useState<Task[]>([]);
  const [teamTasks, setTeamTasks]   = useState<Task[]>([]);
  const [loading,   setLoading]     = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editEmp,   setEditEmp]     = useState<Employee | null>(null);
  const [saving,    setSaving]      = useState(false);
  const [deleting,  setDeleting]    = useState<string | null>(null);
  const [search,    setSearch]      = useState("");
  const [teamView,  setTeamView]    = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const [form, setForm]         = useState({ name: "", username: "", phone: "", password: "" });
  const [showPw, setShowPw]     = useState(false);
  const [formError, setFormError] = useState("");

  const loadEmployees = useCallback(async () => {
    try { const { data } = await api.get("/api/tasks/employees/list"); setEmployees(data); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const loadTasks = useCallback(async () => {
    try { const { data } = await api.get("/api/tasks"); setTasks(data); }
    catch { /* ignore */ }
  }, []);

  const loadTeamTasks = useCallback(async () => {
    try { const { data } = await api.get("/api/tasks/team"); setTeamTasks(data); }
    catch { /* ignore */ }
  }, []);

  useEffect(() => { loadEmployees(); loadTasks(); loadTeamTasks(); }, [loadEmployees, loadTasks, loadTeamTasks]);

  useEffect(() => {
    const socket = io(API_BASE, { withCredentials: true });
    socketRef.current = socket;
    const refresh = () => { loadTasks(); loadTeamTasks(); };
    socket.on("task:created", refresh);
    socket.on("task:updated", refresh);
    socket.on("task:deleted", refresh);
    return () => { socket.disconnect(); };
  }, [loadTasks, loadTeamTasks]);

  const now = Date.now();
  function statsFor(id: string) {
    const mine = tasks.filter((t) => t.assignedTo.id === id);
    const inProg = mine.filter((t) => t.status === "in_progress");
    return {
      pending: mine.filter((t) => t.status === "pending").length,
      in_progress: inProg.length,
      completed: mine.filter((t) => t.status === "completed").length,
      overdue: mine.filter((t) => t.deadline && t.status !== "completed" && t.status !== "cancelled" && new Date(t.deadline).getTime() < now).length,
      current: inProg[0]?.title || null,
    };
  }

  const workingNow   = employees.filter((e) => statsFor(e.id).in_progress > 0).length;
  const totalActive  = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;
  const totalOverdue = tasks.filter((t) => t.deadline && t.status !== "completed" && t.status !== "cancelled" && new Date(t.deadline).getTime() < now).length;

  function openCreate() { setEditEmp(null); setForm({ name: "", username: "", phone: "", password: "" }); setFormError(""); setShowPw(false); setShowModal(true); }
  function openEdit(emp: Employee) { setEditEmp(emp); setForm({ name: emp.name, username: emp.username || "", phone: emp.phone, password: "" }); setFormError(""); setShowPw(false); setShowModal(true); }

  async function save() {
    setFormError("");
    if (!form.name.trim())     { setFormError("Full name is required."); return; }
    if (!form.phone.trim())    { setFormError("Phone number is required."); return; }
    if (!form.username.trim()) { setFormError("Username is required."); return; }
    if (!editEmp && form.password.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    setSaving(true);
    try {
      if (editEmp) {
        const body: any = { name: form.name, phone: form.phone, username: form.username };
        if (form.password.length >= 6) body.password = form.password;
        await api.patch(`/api/users/employee/${editEmp.id}`, body);
      } else {
        await api.post("/api/users/employee", { name: form.name, username: form.username, phone: form.phone, password: form.password });
      }
      setShowModal(false); loadEmployees();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.response?.data?.message || "Failed to save.");
    } finally { setSaving(false); }
  }

  async function remove(emp: Employee) {
    const s = statsFor(emp.id);
    const active = s.pending + s.in_progress;
    const msg = active > 0
      ? `${emp.name} has ${active} active task(s). Deleting will remove those tasks too. Continue?`
      : `Delete employee "${emp.name}"? This cannot be undone.`;
    if (!confirm(msg)) return;
    setDeleting(emp.id);
    try { await api.delete(`/api/users/employee/${emp.id}`); setEmployees((p) => p.filter((e) => e.id !== emp.id)); loadTasks(); }
    catch (err: any) { alert(err.response?.data?.error || "Failed to delete."); }
    finally { setDeleting(null); }
  }

  const displayed = employees.filter((e) => {
    const q = search.toLowerCase();
    return !q || e.name.toLowerCase().includes(q) || (e.username || "").toLowerCase().includes(q) || e.phone.includes(q);
  });

  // Group team tasks by employee for the board view
  const teamBoard = employees.map((emp) => ({
    emp,
    active: teamTasks.filter((t) => t.assignedTo.id === emp.id && t.status === "in_progress"),
    pending: teamTasks.filter((t) => t.assignedTo.id === emp.id && t.status === "pending"),
  })).filter((row) => row.active.length > 0 || row.pending.length > 0);

  return (
    <div className="ep">
      <style>{`
        .ep { font-family:'DM Sans',system-ui,sans-serif; color:#1f2430; font-variant-numeric:tabular-nums; }
        .ep * { box-sizing:border-box; }
        .ep-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:18px; }
        .ep-stat { background:#fff; border:1px solid #e8e8ee; border-top:3px solid #cfd3db; padding:14px 16px; }
        .ep-stat.work{ border-top-color:#1d4ed8; } .ep-stat.act{ border-top-color:#c2974a; } .ep-stat.over{ border-top-color:${ACCENT}; }
        .ep-stat-n { font-size:1.7rem; font-weight:700; line-height:1; }
        .ep-stat.over .ep-stat-n { color:${ACCENT}; }
        .ep-stat-l { font-size:.68rem; text-transform:uppercase; letter-spacing:.07em; color:#6b7280; margin-top:5px; }
        .ep-bar { display:flex; gap:8px; align-items:center; margin-bottom:16px; flex-wrap:wrap; }
        .ep-search { padding:8px 12px; border:1px solid #d9dce3; font-size:.84rem; width:240px; font-family:inherit; }
        .ep-search:focus { outline:2px solid ${ACCENT}; outline-offset:-1px; }
        .ep-add { background:${ACCENT}; color:#fff; border:none; padding:9px 18px; font-size:.84rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ep-add:hover { background:#b8421f; }
        .ep-toggle { margin-left:auto; background:#fff; color:#1f2430; border:1px solid #d9dce3; padding:9px 18px; font-size:.84rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ep-toggle.on { background:#1d4ed8; color:#fff; border-color:#1d4ed8; }
        .ep-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:14px; }
        .ep-card { background:#fff; border:1px solid #e8e8ee; padding:18px; }
        .ep-card-top { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
        .ep-avatar { width:44px; height:44px; border-radius:50%; background:${ACCENT}; color:#fff; font-weight:700; font-size:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ep-name { font-weight:700; font-size:.98rem; }
        .ep-contact { font-size:.76rem; color:#6b7280; margin-top:1px; }
        .ep-status { font-size:.82rem; padding:9px 12px; margin-bottom:12px; border-left:3px solid; }
        .ep-status.working { background:#eff6ff; border-color:#1d4ed8; color:#1e40af; }
        .ep-status.idle { background:#f9fafb; border-color:#cfd3db; color:#6b7280; }
        .ep-status b { font-weight:700; }
        .ep-work { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px; }
        .ep-wcell { text-align:center; background:#faf9f7; border:1px solid #f0f0f4; padding:8px 4px; }
        .ep-wn { font-size:1.15rem; font-weight:700; line-height:1; }
        .ep-wl { font-size:.64rem; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; margin-top:3px; }
        .ep-over-badge { display:inline-block; background:#fef2ee; color:${ACCENT}; border:1px solid #f5c4bb; padding:3px 10px; border-radius:999px; font-size:.72rem; font-weight:700; margin-bottom:12px; }
        .ep-actions { display:flex; gap:6px; }
        .ep-btn { flex:1; padding:8px; border:1px solid #d9dce3; background:#fff; font-size:.78rem; font-weight:600; cursor:pointer; font-family:inherit; color:#1f2430; }
        .ep-btn:hover { background:#f5f5f8; }
        .ep-btn.primary { background:${ACCENT}; color:#fff; border-color:transparent; }
        .ep-btn.primary:hover { background:#b8421f; }
        .ep-btn.danger { color:${ACCENT}; border-color:#f5c4bb; flex:0 0 auto; padding:8px 12px; }
        .ep-btn.danger:hover { background:#fef2ee; }

        /* Team Board */
        .ep-board { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
        .ep-bcol { background:#fff; border:1px solid #e8e8ee; }
        .ep-bcol-head { display:flex; align-items:center; gap:10px; padding:14px 16px; border-bottom:1px solid #f0f0f4; background:#fafaf8; }
        .ep-bcol-av { width:34px; height:34px; border-radius:50%; background:${ACCENT}; color:#fff; font-weight:700; font-size:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ep-bcol-name { font-weight:700; font-size:.92rem; }
        .ep-bcol-count { margin-left:auto; font-size:.72rem; font-weight:700; color:#6b7280; background:#f0f0f4; padding:2px 8px; border-radius:999px; }
        .ep-btask { padding:10px 14px; border-bottom:1px solid #f5f5f8; display:flex; align-items:flex-start; gap:8px; }
        .ep-btask:last-child { border-bottom:none; }
        .ep-btask-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:5px; }
        .ep-btask-title { font-size:.83rem; font-weight:600; color:#1f2430; line-height:1.35; }
        .ep-btask-status { font-size:.68rem; font-weight:700; padding:1px 7px; border-radius:3px; display:inline-block; margin-top:3px; }
        .ep-board-empty { padding:40px 20px; text-align:center; color:#9ca3af; font-size:.88rem; }

        /* modal */
        .ep-ov { position:fixed; inset:0; background:rgba(31,36,48,.5); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
        .ep-modal { background:#fff; width:100%; max-width:440px; padding:28px; position:relative; }
        .ep-mtitle { font-size:1.05rem; font-weight:700; margin-bottom:18px; }
        .ep-close { position:absolute; top:14px; right:16px; background:none; border:none; font-size:1.3rem; cursor:pointer; color:#6b7280; }
        .ep-lbl { display:block; font-size:.74rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; margin-bottom:5px; }
        .ep-inp { width:100%; padding:9px 12px; border:1px solid #d4c8b0; font-size:.88rem; font-family:inherit; }
        .ep-inp:focus { outline:2px solid ${ACCENT}; outline-offset:-1px; }
        .ep-pw { position:relative; }
        .ep-pw .ep-inp { padding-right:40px; }
        .ep-eye { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#9ca3af; padding:0; display:flex; }
        .ep-eye:hover { color:${ACCENT}; }
        .ep-err { background:#fef2ee; border:1px solid #f5c4bb; color:#b23c1c; padding:9px 12px; font-size:.82rem; margin-bottom:14px; }
        .ep-save { background:${ACCENT}; color:#fff; border:none; padding:11px; width:100%; font-size:.9rem; font-weight:700; cursor:pointer; font-family:inherit; margin-top:4px; }
        .ep-save:disabled { opacity:.5; cursor:not-allowed; }
        .ep-hint { font-size:.72rem; color:#9ca3af; margin-top:5px; }
        .ep-grid2 { display:grid; gap:13px; }
        @media (max-width:560px){ .ep-stats{ grid-template-columns:repeat(2,1fr);} .ep-search{width:100%;} .ep-grid{grid-template-columns:1fr;} }
      `}</style>

      {/* Stats */}
      <div className="ep-stats">
        <div className="ep-stat"><div className="ep-stat-n">{employees.length}</div><div className="ep-stat-l">Employees</div></div>
        <div className="ep-stat work"><div className="ep-stat-n">{workingNow}</div><div className="ep-stat-l">Working Now</div></div>
        <div className="ep-stat act"><div className="ep-stat-n">{totalActive}</div><div className="ep-stat-l">Active Tasks</div></div>
        <div className="ep-stat over"><div className="ep-stat-n">{totalOverdue}</div><div className="ep-stat-l">Overdue</div></div>
      </div>

      {/* Toolbar */}
      <div className="ep-bar">
        {!teamView && <input className="ep-search" placeholder="Search name, username or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />}
        <button className="ep-add" onClick={openCreate}>+ Add Employee</button>
        <button className={`ep-toggle${teamView ? " on" : ""}`} onClick={() => setTeamView((v) => !v)}>
          👥 Team Board
        </button>
      </div>

      {/* Team Board View */}
      {teamView ? (
        <div>
          <div style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#6b7280", marginBottom: 12 }}>
            Live — who is working on what right now
          </div>
          {teamBoard.length === 0 ? (
            <div className="ep-board-empty">No active tasks right now — everyone is idle.</div>
          ) : (
            <div className="ep-board">
              {teamBoard.map(({ emp, active, pending }) => (
                <div key={emp.id} className="ep-bcol">
                  <div className="ep-bcol-head">
                    <div className="ep-bcol-av">{emp.name[0].toUpperCase()}</div>
                    <div>
                      <div className="ep-bcol-name">{emp.name}</div>
                      <div style={{ fontSize: ".72rem", color: "#6b7280" }}>{emp.username || emp.phone}</div>
                    </div>
                    <div className="ep-bcol-count">{active.length + pending.length} task{active.length + pending.length !== 1 ? "s" : ""}</div>
                  </div>
                  {active.map((t) => (
                    <div key={t.id} className="ep-btask">
                      <div className="ep-btask-dot" style={{ background: "#1d4ed8" }} />
                      <div>
                        <div className="ep-btask-title">{t.title}</div>
                        <div className="ep-btask-status" style={{ background: STATUS_META.in_progress.bg, color: STATUS_META.in_progress.color }}>In progress</div>
                      </div>
                    </div>
                  ))}
                  {pending.map((t) => (
                    <div key={t.id} className="ep-btask">
                      <div className="ep-btask-dot" style={{ background: PRIORITY_COLOR[t.priority] || "#c2974a" }} />
                      <div>
                        <div className="ep-btask-title">{t.title}</div>
                        <div className="ep-btask-status" style={{ background: STATUS_META.pending.bg, color: STATUS_META.pending.color }}>Pending</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Employee Cards View */
        loading ? (
          <p style={{ color: "#9ca3af", fontSize: ".88rem" }}>Loading…</p>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af", fontSize: ".9rem" }}>
            {search ? "No employees match your search." : "No employees yet. Click \"+ Add Employee\" to create one."}
          </div>
        ) : (
          <div className="ep-grid">
            {displayed.map((emp) => {
              const s = statsFor(emp.id);
              const contact = [emp.username, emp.phone].filter(Boolean).join(" · ");
              return (
                <div key={emp.id} className="ep-card">
                  <div className="ep-card-top">
                    <div className="ep-avatar">{emp.name[0].toUpperCase()}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="ep-name">{emp.name}</div>
                      <div className="ep-contact">{contact || "—"}</div>
                    </div>
                  </div>
                  <div className={`ep-status ${s.current ? "working" : "idle"}`}>
                    {s.current ? <>Working on: <b>{s.current}</b></> : "Idle — no active task"}
                  </div>
                  <div className="ep-work">
                    <div className="ep-wcell"><div className="ep-wn" style={{ color: "#c2974a" }}>{s.pending}</div><div className="ep-wl">Pending</div></div>
                    <div className="ep-wcell"><div className="ep-wn" style={{ color: "#1d4ed8" }}>{s.in_progress}</div><div className="ep-wl">Active</div></div>
                    <div className="ep-wcell"><div className="ep-wn" style={{ color: "#15803d" }}>{s.completed}</div><div className="ep-wl">Done</div></div>
                  </div>
                  {s.overdue > 0 && <div className="ep-over-badge">⚠ {s.overdue} overdue</div>}
                  <div className="ep-actions">
                    <button className="ep-btn primary" onClick={() => onAssignTask?.(emp.id)}>+ Assign Task</button>
                    <button className="ep-btn" onClick={() => openEdit(emp)}>Edit</button>
                    <button className="ep-btn danger" disabled={deleting === emp.id} onClick={() => remove(emp)}>
                      {deleting === emp.id ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Modal */}
      {showModal && (
        <div className="ep-ov" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="ep-modal">
            <button className="ep-close" onClick={() => setShowModal(false)}>×</button>
            <div className="ep-mtitle">{editEmp ? "Edit Employee" : "Add New Employee"}</div>
            {formError && <div className="ep-err">{formError}</div>}
            <div className="ep-grid2">
              <div>
                <label className="ep-lbl">Full Name *</label>
                <input className="ep-inp" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Rahul Das" />
              </div>
              <div>
                <label className="ep-lbl">Phone *</label>
                <input className="ep-inp" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
              </div>
              <div>
                <label className="ep-lbl">Username *</label>
                <input className="ep-inp" value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="e.g. EMP001 / COM001" autoCapitalize="characters" autoComplete="off" />
                <div className="ep-hint">The employee logs in with this + their password.</div>
              </div>
              <div>
                <label className="ep-lbl">{editEmp ? "New Password" : "Password *"}</label>
                <div className="ep-pw">
                  <input className="ep-inp" type={showPw ? "text" : "password"} value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder={editEmp ? "Leave blank to keep current" : "Min 6 characters"} autoComplete="new-password" />
                  <button type="button" className="ep-eye" onClick={() => setShowPw((v) => !v)}>
                    {showPw
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
                {editEmp && <div className="ep-hint">Fill only to reset this employee's password.</div>}
              </div>
              <button className="ep-save" disabled={saving} onClick={save}>
                {saving ? "Saving…" : editEmp ? "Save Changes" : "Create Employee Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}