// src/components/tasks/TaskList.tsx
import { useMemo } from "react";
import type { Task, TaskStatus, TaskPriority } from "../../services/task.api";
import type { TaskFilter } from "../../hooks/useTasks";
import { isOverdue } from "../../hooks/useTasks";
import { STATUS_META, PRIORITY_META, initials } from "./TaskStats";

const MUTED = "#8a8378";
const FAINT = "#b3ab9f";

const rupees = (n?: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

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
  if (!t.deadline)              return { text: "No delivery date", tone: "ok" };
  const diff = new Date(t.deadline).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (diff < 0)   return { text: `Overdue by ${fmtDuration(-diff)}`, tone: "over" };
  if (days === 0) return { text: "Due today", tone: "soon" };
  if (days <= 2)  return { text: `Due in ${days} day${days > 1 ? "s" : ""}`, tone: "soon" };
  return { text: `Due ${fmtDate(t.deadline)}`, tone: "ok" };
}

const isDirty = (f: TaskFilter, search: string) =>
  !!(f.status || f.priority || f.assignee || f.openOnly || search);

/* ═══════════ Toolbar — rendered FULL WIDTH, above the split ═══════════ */

interface ToolbarProps {
  filter:     TaskFilter;
  search:     string;
  groupByEmp: boolean;
  onFilter:   (patch: Partial<TaskFilter>) => void;
  onSearch:   (v: string) => void;
  onGroup:    (v: boolean) => void;
  onClear:    () => void;
  onCreate:   () => void;
}

export function TaskToolbar({
  filter, search, groupByEmp, onFilter, onSearch, onGroup, onClear, onCreate,
}: ToolbarProps) {
  return (
    <div className="tk-bar">
      <input
        className="tk-search"
        placeholder="Search task, employee, customer or bill no…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />

      <select
        className="tk-sel"
        value={filter.priority}
        onChange={(e) => onFilter({ priority: e.target.value })}
      >
        <option value="">All priorities</option>
        {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
          <option key={p} value={p}>{PRIORITY_META[p].label}</option>
        ))}
      </select>

      <div className="tk-toggle">
        <button className={!groupByEmp ? "on" : ""} onClick={() => onGroup(false)}>Flat list</button>
        <button className={groupByEmp ? "on" : ""}  onClick={() => onGroup(true)}>By employee</button>
      </div>

      {!filter.status && (
        <div className="tk-toggle">
          <button className={!filter.openOnly ? "on" : ""} onClick={() => onFilter({ openOnly: false })}>Show all</button>
          <button className={filter.openOnly ? "on" : ""}  onClick={() => onFilter({ openOnly: true })}>Open only</button>
        </div>
      )}

      {isDirty(filter, search) && <button className="tk-clear" onClick={onClear}>Clear filters</button>}

      <button className="tk-assign" onClick={onCreate}>+ Assign task</button>
    </div>
  );
}

/* ═══════════ List — ONE grid cell inside .tk-split ═══════════ */

interface Props {
  tasks:      Task[];
  loading:    boolean;
  selectedId: string | null;
  filter:     TaskFilter;
  search:     string;
  groupByEmp: boolean;
  busyId:     string | null;
  onSelect:   (id: string) => void;
  onStatus:   (id: string, s: TaskStatus) => void;
  onEdit:     (t: Task) => void;
}

export function TaskList({
  tasks, loading, selectedId, filter, search, groupByEmp, busyId,
  onSelect, onStatus, onEdit,
}: Props) {
  const dirty = isDirty(filter, search);

  // group only when asked AND no single person is already in focus
  const groups = useMemo(() => {
    if (!groupByEmp || filter.assignee) return null;
    const g = new Map<string, { name: string; items: Task[] }>();
    tasks.forEach((t) => {
      const id = t.assignedTo.id;
      if (!g.has(id)) g.set(id, { name: t.assignedTo.name, items: [] });
      g.get(id)!.items.push(t);
    });
    return Array.from(g.entries()).sort((a, b) => b[1].items.length - a[1].items.length);
  }, [tasks, groupByEmp, filter.assignee]);

  const row = (t: Task) => {
    const sm   = STATUS_META[t.status];
    const pm   = PRIORITY_META[t.priority];
    const dl   = deadlineInfo(t);
    const late = isOverdue(t);
    const busy = busyId === t.id;

    return (
      <div
        key={t.id}
        className={`tk-row${selectedId === t.id ? " sel" : ""}`}
        onClick={() => onSelect(t.id)}
      >
        <div className="tk-row-stripe" style={{ background: late ? "#d9542f" : pm.color }} />
        <div className="tk-row-body">
          <div className="tk-row-top">
            <span className="tk-row-title">{t.title}</span>
            <span
              className="tk-badge"
              style={t.deliveredAt
                ? { background: "#f5eddc", color: "#8a6b1f" }
                : { background: sm.bg, color: sm.color }}
            >
              {t.deliveredAt ? "Delivered" : sm.label}
            </span>
          </div>

          <div className="tk-row-meta">
            <span className="tk-who">
              <span className="tk-av sm">{initials(t.assignedTo.name)}</span>{t.assignedTo.name}
            </span>
            {t.customerName && <span className="tk-row-cust">· {t.customerName}</span>}
            {t.invoiceNo && <span className="tk-inv">{t.invoiceNo}</span>}
          </div>

          <div className="tk-row-foot">
            <span className={`tk-dl ${dl.tone}`}>{dl.text}</span>
            {(t.amount || 0) > 0 && <span className="tk-row-money">{rupees(t.amount)}</span>}
          </div>

          {/* move the job forward without opening it */}
          <div className="tk-quick" onClick={(e) => e.stopPropagation()}>
            {!t.deliveredAt && t.status === "pending" && (
              <button className="tk-q start" disabled={busy}
                onClick={() => onStatus(t.id, "in_progress")}>Start work</button>
            )}
            {!t.deliveredAt && t.status === "in_progress" && (
              <button className="tk-q done" disabled={busy}
                onClick={() => onStatus(t.id, "completed")}>Mark complete</button>
            )}
            {!t.deliveredAt && t.status === "completed" && (
              <span className="tk-q ghosted">Ready — hand over</span>
            )}
            {!t.deliveredAt && t.status === "cancelled" && (
              <button className="tk-q" disabled={busy}
                onClick={() => onStatus(t.id, "pending")}>Reopen</button>
            )}
            <button className="tk-q" onClick={() => onEdit(t)}>Edit</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="tk-list">
      {loading ? (
        <div style={{ padding: 20, color: MUTED, fontSize: ".88rem" }}>Loading…</div>
      ) : tasks.length === 0 ? (
        <div style={{ padding: "40px 20px", color: FAINT, fontSize: ".88rem", textAlign: "center", lineHeight: 1.6 }}>
          {dirty ? "No tasks match these filters." : "No tasks yet — click “+ Assign task”."}
        </div>
      ) : (
        <>
          <div className="tk-count">
            <span>{tasks.length} {tasks.length === 1 ? "task" : "tasks"}</span>
            {dirty && <span style={{ color: "#d9542f", fontWeight: 700 }}>filtered</span>}
          </div>

          {groups
            ? groups.map(([id, g]) => (
                <div key={id}>
                  <div className="tk-ghead">
                    <span className="tk-av sm">{initials(g.name)}</span>
                    <b>{g.name}</b>
                    <span>{g.items.length} {g.items.length === 1 ? "task" : "tasks"}</span>
                  </div>
                  {g.items.map(row)}
                </div>
              ))
            : tasks.map(row)}
        </>
      )}
    </div>
  );
}