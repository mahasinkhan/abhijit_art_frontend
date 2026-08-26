// src/components/tasks/TaskStats.tsx
import type { TaskStatus, TaskPriority } from "../../services/task.api";

const ACCENT = "#d9542f";
const MUTED  = "#8a8378";
const FAINT  = "#b3ab9f";

export const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: "Pending",     color: "#9a6a12", bg: "#fbf1dd" },
  in_progress: { label: "In progress", color: "#1e5fa8", bg: "#e6eff9" },
  completed:   { label: "Completed",   color: "#2f7a3f", bg: "#e5f2e8" },
  cancelled:   { label: "Cancelled",   color: "#7c766c", bg: "#f0ede7" },
};
export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "#a8a29a" },
  medium: { label: "Medium", color: "#c2974a" },
  high:   { label: "High",   color: ACCENT    },
  urgent: { label: "Urgent", color: "#7c3aed" },
};

interface Props {
  total: number; pending: number; in_progress: number;
  completed: number; overdue: number;
}

export function TaskStats({ total, pending, in_progress, completed, overdue }: Props) {
  return (
    <div className="tk-stats">
      <div className="tk-stat">
        <div className="tk-stat-n">{total}</div>
        <div className="tk-stat-l"><span className="tk-stat-dot" style={{ background: FAINT }} />Total</div>
      </div>
      <div className="tk-stat">
        <div className="tk-stat-n" style={{ color: STATUS_META.pending.color }}>{pending}</div>
        <div className="tk-stat-l"><span className="tk-stat-dot" style={{ background: STATUS_META.pending.color }} />Pending</div>
      </div>
      <div className="tk-stat">
        <div className="tk-stat-n" style={{ color: STATUS_META.in_progress.color }}>{in_progress}</div>
        <div className="tk-stat-l"><span className="tk-stat-dot" style={{ background: STATUS_META.in_progress.color }} />In progress</div>
      </div>
      <div className="tk-stat">
        <div className="tk-stat-n" style={{ color: STATUS_META.completed.color }}>{completed}</div>
        <div className="tk-stat-l"><span className="tk-stat-dot" style={{ background: STATUS_META.completed.color }} />Completed</div>
      </div>
      <div className="tk-stat over">
        <div className="tk-stat-n">{overdue}</div>
        <div className="tk-stat-l"><span className="tk-stat-dot" style={{ background: ACCENT }} />Overdue</div>
      </div>
    </div>
  );
}