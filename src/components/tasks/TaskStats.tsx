// src/components/tasks/TaskStats.tsx
import type { TaskStatus, TaskPriority } from "../../services/task.api";
import type { RosterEntry, TaskFilter, StatusFilter } from "../../hooks/useTasks";

const INK    = "#2a231d";
const ACCENT = "#d9542f";
const GOLD   = "#c2974a";
const GREEN  = "#2f7a3f";
const BLUE   = "#1e5fa8";
const AMBER  = "#9a6a12";

export const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: "Pending",     color: AMBER,     bg: "#fbf1dd" },
  in_progress: { label: "In progress", color: BLUE,      bg: "#e6eff9" },
  completed:   { label: "Completed",   color: GREEN,     bg: "#e5f2e8" },
  cancelled:   { label: "Cancelled",   color: "#7c766c", bg: "#f0ede7" },
};

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "#a8a29a" },
  medium: { label: "Medium", color: GOLD },
  high:   { label: "High",   color: ACCENT },
  urgent: { label: "Urgent", color: "#7c3aed" },
};

/** "Mahasin Khan" -> "MK" */
export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";

export interface StatsShape {
  total: number; pending: number; in_progress: number;
  completed: number; delivered: number; overdue: number;
}

interface Props {
  stats:    StatsShape;
  roster:   RosterEntry[];
  filter:   TaskFilter;
  onFilter: (patch: Partial<TaskFilter>) => void;
  onCreate: () => void;
}

export function TaskStats({ stats, roster, filter, onFilter, onCreate }: Props) {
  const cells: { k: StatusFilter; n: number; l: string; c: string }[] = [
    { k: "",            n: stats.total,       l: "All tasks",   c: INK   },
    { k: "pending",     n: stats.pending,     l: "Pending",     c: AMBER },
    { k: "in_progress", n: stats.in_progress, l: "In progress", c: BLUE  },
    { k: "completed",   n: stats.completed,   l: "Ready",       c: GREEN },
    { k: "delivered",   n: stats.delivered,   l: "Delivered",   c: GOLD  },
    { k: "overdue",     n: stats.overdue,     l: "Overdue",     c: ACCENT },
  ];

  const focus   = filter.assignee ? roster.find((r) => r.id === filter.assignee) : null;
  const busiest = Math.max(1, ...roster.map((r) => r.live));
  const teamLive = stats.pending + stats.in_progress;

  return (
    <>
      {/* Numbers double as filters — click a number to see only those tasks */}
      <div className="tk-fbar">
        {cells.map((s) => (
          <button
            key={s.k || "all"}
            className={`tk-f${filter.status === s.k ? " on" : ""}`}
            onClick={() => onFilter({ status: s.k })}
          >
            <div className="tk-f-n" style={{ color: s.n === 0 ? "#b3ab9f" : s.c }}>{s.n}</div>
            <div className="tk-f-l"><span className="tk-f-dot" style={{ background: s.c }} />{s.l}</div>
          </button>
        ))}
      </div>

      {/* Who is working on what */}
      <div className="tk-team">
        <div className="tk-team-head">
          <div className="tk-team-l">Team workload</div>
          <div className="tk-team-hint">
            {focus ? `Showing only ${focus.name}'s tasks — click again to clear`
                   : "Click a person to see only their tasks"}
          </div>
        </div>

        <div className="tk-emps">
          <button
            className={`tk-emp${!filter.assignee ? " on" : ""}`}
            onClick={() => onFilter({ assignee: "" })}
          >
            <div className="tk-emp-top">
              <span className="tk-av">ALL</span>
              <div style={{ minWidth: 0 }}>
                <div className="tk-emp-name">Whole team</div>
                <div className="tk-emp-sub">{roster.length} {roster.length === 1 ? "person" : "people"}</div>
              </div>
            </div>
            <div className="tk-emp-bar">
              <i style={{ width: `${(stats.pending / Math.max(1, stats.total)) * 100}%`, background: AMBER }} />
              <i style={{ width: `${(stats.in_progress / Math.max(1, stats.total)) * 100}%`, background: BLUE }} />
              <i style={{ width: `${(stats.completed / Math.max(1, stats.total)) * 100}%`, background: GREEN }} />
            </div>
            <div className="tk-emp-nums">
              <span>Open <b>{teamLive}</b></span>
              <span className="od">Late <b>{stats.overdue}</b></span>
            </div>
          </button>

          {roster.map((r) => (
            <button
              key={r.id}
              className={`tk-emp${filter.assignee === r.id ? " on" : ""}${r.overdue > 0 ? " late" : ""}`}
              onClick={() => onFilter({ assignee: filter.assignee === r.id ? "" : r.id })}
              title={`${r.name} — ${r.pending} pending, ${r.active} in progress, ${r.overdue} overdue`}
            >
              <div className="tk-emp-top">
                <span className="tk-av">{initials(r.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="tk-emp-name">{r.name}</div>
                  <div className="tk-emp-sub">
                    {r.live === 0 ? "Free right now" : `${r.live} open job${r.live > 1 ? "s" : ""}`}
                  </div>
                </div>
              </div>
              <div className="tk-emp-bar">
                <i style={{ width: `${(r.pending / busiest) * 100}%`, background: AMBER }} />
                <i style={{ width: `${(r.active  / busiest) * 100}%`, background: BLUE }} />
              </div>
              <div className="tk-emp-nums">
                <span>Pend <b>{r.pending}</b></span>
                <span>Doing <b>{r.active}</b></span>
                <span className="od">Late <b>{r.overdue}</b></span>
              </div>
            </button>
          ))}

          <button className="tk-emp-add" onClick={onCreate}>+ Assign</button>
        </div>
      </div>
    </>
  );
}