// src/components/tasks/TaskList.tsx
import type { Task, TaskStatus, TaskPriority } from "../../services/task.api";
import type { Employee }                        from "../../services/employee.api";
import { STATUS_META, PRIORITY_META }           from "./TaskStats";

const MUTED = "#8a8378";
const FAINT = "#b3ab9f";
const INK   = "#2a231d";
const LINE  = "#e7e1d7";
const LINE_SOFT = "#f1ece3";
const WASH  = "#faf8f3";
const ACCENT     = "#d9542f";
const ACCENT_DK  = "#b8421f";

const rupees  = (n?: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDuration(ms: number) {
  if (ms < 0) ms = 0;
  const m = Math.floor(ms / 60000);
  if (m < 1)  return "< 1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60); const rm = m % 60;
  if (h < 24) return rm ? `${h}h ${rm}m` : `${h}h`;
  const d = Math.floor(h / 24); const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}
export function deadlineInfo(t: Task): { text: string; tone: "ok"|"soon"|"over"|"done"|"ready" } {
  if (t.deliveredAt) {
    if (t.deadline) {
      const late = new Date(t.deliveredAt).getTime() - new Date(t.deadline).getTime();
      if (late > 0) return { text: `Delivered ${fmtDuration(late)} late`, tone: "over" };
    }
    return { text: "Delivered on time", tone: "done" };
  }
  if (t.status === "completed") return { text: "Done · awaiting delivery", tone: "ready" };
  if (t.status === "cancelled") return { text: "Cancelled", tone: "ok" };
  if (!t.deadline)              return { text: "No delivery date",         tone: "ok" };
  const diff = new Date(t.deadline).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (diff < 0)  return { text: `Overdue by ${fmtDuration(-diff)}`, tone: "over" };
  if (days === 0) return { text: "Due today",                        tone: "soon" };
  if (days <= 2)  return { text: `Due in ${days} day${days > 1 ? "s" : ""}`, tone: "soon" };
  return { text: `Due ${fmtDate(t.deadline)}`, tone: "ok" };
}

interface Props {
  tasks:      Task[];
  employees:  Employee[];
  loading:    boolean;
  selectedId: string | null;
  filter:     { status: string; priority: string; assignee: string };
  search:     string;
  onSelect:   (id: string) => void;
  onFilter:   (patch: Partial<{ status: string; priority: string; assignee: string }>) => void;
  onSearch:   (v: string) => void;
  onCreate:   () => void;
}

export function TaskList({
  tasks, employees, loading, selectedId,
  filter, search, onSelect, onFilter, onSearch, onCreate,
}: Props) {
  return (
    <>
      {/* Toolbar */}
      <div className="tk-bar">
        <input className="tk-search" placeholder="Search task, customer or bill no…"
          value={search} onChange={(e) => onSearch(e.target.value)} />
        <select className="tk-sel" value={filter.status}
          onChange={(e) => onFilter({ status: e.target.value })}>
          <option value="">All statuses</option>
          {(Object.keys(STATUS_META) as TaskStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
        <select className="tk-sel" value={filter.priority}
          onChange={(e) => onFilter({ priority: e.target.value })}>
          <option value="">All priorities</option>
          {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_META[p].label}</option>
          ))}
        </select>
        <select className="tk-sel" value={filter.assignee}
          onChange={(e) => onFilter({ assignee: e.target.value })}>
          <option value="">All employees</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button className="tk-assign" onClick={onCreate}>+ Assign task</button>
      </div>

      {/* List */}
      <div className="tk-list">
        {loading ? (
          <div style={{ padding: 20, color: MUTED, fontSize: ".88rem" }}>Loading…</div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: "40px 20px", color: FAINT, fontSize: ".88rem", textAlign: "center" }}>
            No tasks found.
          </div>
        ) : (
          <>
            <div className="tk-count">{tasks.length} {tasks.length === 1 ? "task" : "tasks"}</div>
            {tasks.map((t) => {
              const sm = STATUS_META[t.status];
              const pm = PRIORITY_META[t.priority];
              const dl = deadlineInfo(t);
              return (
                <div key={t.id}
                  className={`tk-row${selectedId === t.id ? " sel" : ""}`}
                  onClick={() => onSelect(t.id)}>
                  <div className="tk-row-stripe" style={{ background: pm.color }} />
                  <div className="tk-row-body">
                    <div className="tk-row-top">
                      <span className="tk-row-title">{t.title}</span>
                      <span className="tk-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                    </div>
                    <div className="tk-row-sub">
                      {t.customerName ? `${t.customerName} · ` : ""}
                      {t.assignedTo.name}
                      {t.invoiceNo ? ` · ${t.invoiceNo}` : ""}
                    </div>
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
    </>
  );
}