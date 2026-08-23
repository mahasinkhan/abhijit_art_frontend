import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import { io, Socket } from "socket.io-client";

// ── Types ────────────────────────────────────────────────────────────────────
type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
type TaskPriority = "low" | "medium" | "high" | "urgent";

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
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────
const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
  pending:     { label: "Pending",     color: "#92400e", bg: "#fffbeb", border: "#fcd34d" },
  in_progress: { label: "In Progress", color: "#1e40af", bg: "#eff6ff", border: "#93c5fd" },
  completed:   { label: "Completed",   color: "#166534", bg: "#f0fdf4", border: "#86efac" },
  cancelled:   { label: "Cancelled",   color: "#6b7280", bg: "#f9fafb", border: "#d1d5db" },
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  low:    { label: "Low",    color: "#6b7280", icon: "●" },
  medium: { label: "Medium", color: "#c2974a", icon: "●" },
  high:   { label: "High",   color: "#d9542f", icon: "●" },
  urgent: { label: "Urgent", color: "#7c3aed", icon: "▲" },
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function fmtDate(d?: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function daysLeft(d?: string) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return diff;
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [liveIndicator, setLiveIndicator] = useState(false);
  const [newTaskAlert, setNewTaskAlert] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const alertTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Load tasks ─────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/api/tasks/mine")
      .then(({ data }) => setTasks(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Socket.IO ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(API_BASE, { withCredentials: true });
    socketRef.current = socket;

    const pulse = () => {
      setLiveIndicator(true);
      clearTimeout(liveTimerRef.current);
      liveTimerRef.current = setTimeout(() => setLiveIndicator(false), 2000);
    };

    socket.on("task:created", (task: Task) => {
      if (task.assignedTo && (task.assignedTo as any).id !== user?.id) return;
      setTasks((prev) => {
        // Check if this task is for the current employee
        const isForMe = !task.assignedTo || (task.assignedTo as any).id === user?.id;
        if (!isForMe) return prev;
        return [task, ...prev];
      });
      setNewTaskAlert(`New task assigned: "${task.title}"`);
      clearTimeout(alertTimerRef.current);
      alertTimerRef.current = setTimeout(() => setNewTaskAlert(null), 6000);
      pulse();
    });

    socket.on("task:updated", (task: Task) => {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...task } : t)));
      setActiveTask((prev) => (prev?.id === task.id ? { ...task, notes: task.notes ?? prev.notes } : prev));
      pulse();
    });

    socket.on("task:deleted", ({ id }: { id: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setActiveTask((prev) => (prev?.id === id ? null : prev));
      pulse();
    });

    return () => {
      socket.disconnect();
      clearTimeout(liveTimerRef.current);
      clearTimeout(alertTimerRef.current);
    };
  }, [user?.id]);

  // ── Sync notes when activeTask changes ─────────────────────────────────────
  useEffect(() => {
    if (activeTask) setNotes(activeTask.notes || "");
  }, [activeTask?.id]);

  // ── Update status ──────────────────────────────────────────────────────────
  async function updateStatus(taskId: string, status: TaskStatus) {
    setUpdateLoading(taskId + status);
    try {
      await api.patch(`/api/tasks/${taskId}/status`, { status, notes });
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update");
    } finally {
      setUpdateLoading(null);
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  const displayed = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div style={{ minHeight: "100vh", background: "#f7f3ea", fontFamily: "'DM Sans', sans-serif", color: "#2a231d" }}>
      <style>{`
        .emp-header { background: #2a231d; color: #f7f3ea; padding: 0 28px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
        .emp-logo { font-size: 1.05rem; font-weight: 700; letter-spacing: .02em; }
        .emp-logout { background: rgba(255,255,255,.12); border: none; color: #f7f3ea; padding: 6px 14px; border-radius: 0; cursor: pointer; font-size: 0.8rem; }
        .emp-logout:hover { background: rgba(255,255,255,.2); }
        .emp-live { display: flex; align-items: center; gap: 5px; font-size: 0.72rem; color: rgba(247,243,234,.7); }
        .emp-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; transition: box-shadow .2s; }
        .emp-live-dot.pulse { box-shadow: 0 0 0 4px rgba(74,222,128,.3); }
        .emp-body { max-width: 1160px; margin: 0 auto; padding: 28px 20px; }
        .emp-greeting { font-size: 1.35rem; font-weight: 700; margin-bottom: 4px; }
        .emp-sub { font-size: 0.85rem; color: #6b5c4a; margin-bottom: 24px; }
        .emp-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .emp-stat { background: #fff; border-left: 3px solid #c2974a; padding: 16px 18px; }
        .emp-stat-num { font-size: 1.9rem; font-weight: 700; line-height: 1; }
        .emp-stat-lbl { font-size: 0.72rem; text-transform: uppercase; letter-spacing: .08em; color: #6b5c4a; margin-top: 3px; }
        .emp-tabs { display: flex; gap: 0; border-bottom: 2px solid #e4d9c8; margin-bottom: 20px; }
        .emp-tab { padding: 9px 18px; background: none; border: none; font-size: 0.84rem; cursor: pointer; color: #6b5c4a; font-family: inherit; border-bottom: 2px solid transparent; margin-bottom: -2px; }
        .emp-tab.active { color: #d9542f; border-bottom-color: #d9542f; font-weight: 600; }
        .emp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
        .emp-card { background: #fff; border: 1px solid #e4d9c8; padding: 18px; position: relative; cursor: pointer; transition: box-shadow .15s; }
        .emp-card:hover { box-shadow: 0 4px 16px rgba(42,35,29,.1); }
        .emp-card.active-card { border-color: #d9542f; box-shadow: 0 0 0 2px rgba(217,84,47,.2); }
        .emp-card-title { font-weight: 700; font-size: 0.95rem; margin-bottom: 6px; line-height: 1.3; }
        .emp-card-meta { font-size: 0.76rem; color: #6b5c4a; display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
        .emp-badge { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; }
        .emp-deadline { font-size: 0.76rem; margin-top: 8px; }
        .emp-deadline.overdue { color: #d9542f; font-weight: 600; }
        .emp-deadline.soon { color: #c2974a; font-weight: 600; }
        /* Detail panel */
        .emp-detail { background: #fff; border: 1px solid #e4d9c8; padding: 26px; margin-top: 20px; }
        .emp-detail-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 10px; }
        .emp-section-lbl { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #6b5c4a; margin-bottom: 8px; }
        .emp-status-btns { display: flex; gap: 8px; flex-wrap: wrap; }
        .emp-status-btn { padding: 8px 16px; border: 2px solid; border-radius: 0; font-size: 0.8rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .15s; }
        .emp-notes-area { width: 100%; min-height: 90px; resize: vertical; padding: 10px 12px; border: 1px solid #d4c8b0; font-family: inherit; font-size: 0.86rem; box-sizing: border-box; }
        .emp-notes-area:focus { outline: 2px solid #d9542f; outline-offset: -1px; }
        .emp-img-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
        .emp-img { width: 120px; height: 90px; object-fit: cover; cursor: zoom-in; border: 1px solid #e4d9c8; }
        .emp-link { color: #d9542f; font-size: 0.83rem; display: block; margin-top: 4px; word-break: break-all; }
        /* Alert */
        .emp-alert { position: fixed; top: 68px; right: 20px; background: #2a231d; color: #f7f3ea; padding: 12px 18px; font-size: 0.84rem; z-index: 999; max-width: 320px; animation: slideIn .3s ease; }
        @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        /* Lightbox */
        .emp-lightbox { position: fixed; inset: 0; background: rgba(0,0,0,.9); z-index: 2000; display: flex; align-items: center; justify-content: center; cursor: zoom-out; }
        .emp-lightbox img { max-width: 92vw; max-height: 92vh; object-fit: contain; }
        @media (max-width: 700px) {
          .emp-stats { grid-template-columns: repeat(2, 1fr); }
          .emp-grid { grid-template-columns: 1fr; }
          .emp-body { padding: 16px 12px; }
        }
      `}</style>

      {/* Header */}
      <header className="emp-header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="emp-logo">Abhijit Art — Staff</span>
          <div className="emp-live">
            <div className={`emp-live-dot${liveIndicator ? " pulse" : ""}`} />
            Live
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: "0.82rem", opacity: .75 }}>{user?.name}</span>
          <button className="emp-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      {/* New task alert */}
      {newTaskAlert && (
        <div className="emp-alert">
          🔔 {newTaskAlert}
        </div>
      )}

      <div className="emp-body">
        {/* Greeting */}
        <div className="emp-greeting">Good day, {user?.name?.split(" ")[0]}!</div>
        <div className="emp-sub">Here are your assigned tasks. Update status as you progress.</div>

        {/* Stats */}
        <div className="emp-stats">
          {[
            { num: stats.total,      label: "My Tasks",    border: "#2a231d" },
            { num: stats.pending,    label: "Pending",     border: "#c2974a" },
            { num: stats.inProgress, label: "In Progress", border: "#1d4ed8" },
            { num: stats.completed,  label: "Completed",   border: "#15803d" },
          ].map((s, i) => (
            <div key={i} className="emp-stat" style={{ borderLeftColor: s.border }}>
              <div className="emp-stat-num">{s.num}</div>
              <div className="emp-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="emp-tabs">
          {([
            ["all", "All"],
            ["pending", "Pending"],
            ["in_progress", "In Progress"],
            ["completed", "Completed"],
          ] as [TaskStatus | "all", string][]).map(([val, label]) => (
            <button
              key={val}
              className={`emp-tab${filter === val ? " active" : ""}`}
              onClick={() => setFilter(val)}
            >
              {label}
              <span style={{ marginLeft: 5, opacity: .6, fontSize: "0.75rem" }}>
                ({val === "all" ? stats.total :
                  val === "pending" ? stats.pending :
                  val === "in_progress" ? stats.inProgress :
                  stats.completed})
              </span>
            </button>
          ))}
        </div>

        {/* Task cards */}
        {loading ? (
          <p style={{ color: "#6b5c4a", fontSize: "0.88rem" }}>Loading tasks…</p>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b5c4a" }}>
            {filter === "all" ? "No tasks assigned yet." : `No ${filter.replace("_", " ")} tasks.`}
          </div>
        ) : (
          <div className="emp-grid">
            {displayed.map((task) => {
              const sm = STATUS_META[task.status];
              const pm = PRIORITY_META[task.priority];
              const dl = daysLeft(task.deadline);
              const isActive = activeTask?.id === task.id;
              return (
                <div
                  key={task.id}
                  className={`emp-card${isActive ? " active-card" : ""}`}
                  onClick={() => setActiveTask(isActive ? null : task)}
                >
                  {/* Priority bar */}
                  <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: pm.color }} />
                  <div className="emp-card-title">{task.title}</div>
                  <div className="emp-card-meta">
                    <span style={{ color: pm.color }}>
                      {pm.icon} {pm.label}
                    </span>
                    {task.images.length > 0 && <span>📎 {task.images.length} img</span>}
                    {task.links.length > 0 && <span>🔗 {task.links.length} link{task.links.length > 1 ? "s" : ""}</span>}
                  </div>
                  <span className="emp-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                  {task.deadline && dl !== null && (
                    <div className={`emp-deadline${dl < 0 ? " overdue" : dl <= 2 ? " soon" : ""}`}>
                      {dl < 0 ? `⚠ Overdue by ${Math.abs(dl)} day${Math.abs(dl) > 1 ? "s" : ""}` :
                       dl === 0 ? "⏰ Due today!" :
                       dl <= 2 ? `⏰ Due in ${dl} day${dl > 1 ? "s" : ""}` :
                       `📅 Due ${fmtDate(task.deadline)}`}
                    </div>
                  )}
                  {task.notes && (
                    <div style={{ fontSize: "0.76rem", color: "#6b5c4a", marginTop: 8, fontStyle: "italic" }}>
                      Note: {task.notes.slice(0, 80)}{task.notes.length > 80 ? "…" : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Task detail + update panel */}
        {activeTask && (
          <div className="emp-detail">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div className="emp-detail-title" style={{ flex: 1 }}>{activeTask.title}</div>
              <button
                style={{ background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#6b5c4a" }}
                onClick={() => setActiveTask(null)}
              >×</button>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, fontSize: "0.8rem", color: "#6b5c4a" }}>
              <span>Assigned by {activeTask.createdBy.name}</span>
              <span>·</span>
              <span>Created {fmtDate(activeTask.createdAt)}</span>
              {activeTask.deadline && <><span>·</span><span>Deadline {fmtDate(activeTask.deadline)}</span></>}
            </div>

            {/* Description */}
            {activeTask.description && (
              <div style={{ marginBottom: 18 }}>
                <div className="emp-section-lbl">Task Details</div>
                <div style={{ fontSize: "0.88rem", lineHeight: 1.65, whiteSpace: "pre-wrap", background: "#faf6f0", padding: "12px 14px", borderLeft: "3px solid #c2974a" }}>
                  {activeTask.description}
                </div>
              </div>
            )}

            {/* Images */}
            {activeTask.images.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div className="emp-section-lbl">Reference Images (click to enlarge)</div>
                <div className="emp-img-row">
                  {activeTask.images.map((img, i) => (
                    <img
                      key={i}
                      src={`${API_BASE}${img}`}
                      alt={`ref-${i + 1}`}
                      className="emp-img"
                      onClick={() => setLightbox(`${API_BASE}${img}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {activeTask.links.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div className="emp-section-lbl">Reference Links</div>
                {activeTask.links.map((link, i) => (
                  <a key={i} href={link} target="_blank" rel="noreferrer" className="emp-link">{link}</a>
                ))}
              </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: 18 }}>
              <div className="emp-section-lbl">Your Notes / Progress Update</div>
              <textarea
                className="emp-notes-area"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about your progress, blockers, or completion details…"
              />
            </div>

            {/* Status update buttons */}
            {activeTask.status !== "completed" && activeTask.status !== "cancelled" && (
              <div>
                <div className="emp-section-lbl">Update Status</div>
                <div className="emp-status-btns">
                  {activeTask.status === "pending" && (
                    <button
                      className="emp-status-btn"
                      style={{ borderColor: "#1d4ed8", color: "#1d4ed8", background: updateLoading ? "#eff6ff" : "#fff" }}
                      disabled={!!updateLoading}
                      onClick={() => updateStatus(activeTask.id, "in_progress")}
                    >
                      {updateLoading === activeTask.id + "in_progress" ? "Updating…" : "▶ Start Task"}
                    </button>
                  )}
                  {activeTask.status === "in_progress" && (
                    <button
                      className="emp-status-btn"
                      style={{ borderColor: "#15803d", color: "#15803d", background: updateLoading ? "#f0fdf4" : "#fff" }}
                      disabled={!!updateLoading}
                      onClick={() => updateStatus(activeTask.id, "completed")}
                    >
                      {updateLoading === activeTask.id + "completed" ? "Marking…" : "✓ Mark Complete"}
                    </button>
                  )}
                  {(activeTask.status === "pending" || activeTask.status === "in_progress") && (
                    <button
                      className="emp-status-btn"
                      style={{ borderColor: "#e4d9c8", color: "#6b7280", background: "#fff" }}
                      disabled={!!updateLoading}
                      onClick={() => updateStatus(activeTask.id, "pending")}
                    >
                      Save Notes Only
                    </button>
                  )}
                </div>
                <div style={{ fontSize: "0.74rem", color: "#9ca3af", marginTop: 8 }}>
                  Status update is visible to admin in real-time.
                </div>
              </div>
            )}

            {activeTask.status === "completed" && (
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", padding: "10px 14px", fontSize: "0.84rem", color: "#166534" }}>
                ✓ Task marked as completed. Admin has been notified.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="emp-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Full size" />
        </div>
      )}
    </div>
  );
}