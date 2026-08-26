// src/components/employee/TaskCard.tsx
import type { Task, TaskStatus, TaskPriority } from "../../services/employee-task.api";
import { taskCue } from "../../hooks/useMyTasks";

const ACCENT = "#d9542f";
const LINE   = "#e7e1d7";

const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: "Pending",     color: "#9a6a12", bg: "#fbf1dd" },
  in_progress: { label: "In progress", color: "#1e5fa8", bg: "#e6eff9" },
  completed:   { label: "Completed",   color: "#2f7a3f", bg: "#e5f2e8" },
  cancelled:   { label: "Cancelled",   color: "#7c766c", bg: "#f0ede7" },
};
const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "#a8a29a" },
  medium: { label: "Medium", color: "#c2974a" },
  high:   { label: "High",   color: ACCENT    },
  urgent: { label: "Urgent", color: "#7c3aed" },
};

interface Props {
  task:     Task;
  selected: boolean;
  onClick:  () => void;
}

export function TaskCard({ task, selected, onClick }: Props) {
  const sm  = STATUS_META[task.status];
  const pm  = PRIORITY_META[task.priority];
  const cue = taskCue(task);

  return (
    <button className={`ep-card${selected ? " sel" : ""}`}
      style={{ borderLeftColor: selected ? ACCENT : pm.color }}
      onClick={onClick}>
      <div className="ep-card-title">{task.title}</div>
      <div className="ep-card-row">
        <span className="ep-prio" style={{ color: pm.color }}>
          <span className="ep-prio-dot" style={{ background: pm.color }} />{pm.label}
        </span>
        <span className="ep-tstatus" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
      </div>
      <div className={`ep-cue ${cue.tone}`}>{cue.text}</div>
    </button>
  );
}