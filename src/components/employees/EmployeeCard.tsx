// src/components/employees/EmployeeCard.tsx
import type { Employee } from "../../services/employee.api";

const ACCENT = "#d9542f";

interface Stats {
  pending: number; in_progress: number; completed: number;
  overdue: number; current: string | null;
}
interface Props {
  emp:      Employee;
  stats:    Stats;
  deleting: boolean;
  onAssign: () => void;
  onEdit:   () => void;
  onDelete: () => void;
}

export function EmployeeCard({ emp, stats, deleting, onAssign, onEdit, onDelete }: Props) {
  return (
    <div className="ep-card">
      <div className="ep-card-top">
        <div className="ep-avatar">{emp.name[0].toUpperCase()}</div>
        <div style={{ minWidth: 0 }}>
          <div className="ep-name">{emp.name}</div>
          <div className="ep-contact">{emp.email}{emp.phone ? ` · ${emp.phone}` : ""}</div>
        </div>
      </div>

      <div className={`ep-status ${stats.current ? "working" : "idle"}`}>
        {stats.current ? <>Working on: <b>{stats.current}</b></> : "Idle — no active task"}
      </div>

      <div className="ep-work">
        <div className="ep-wcell">
          <div className="ep-wn" style={{ color: "#c2974a" }}>{stats.pending}</div>
          <div className="ep-wl">Pending</div>
        </div>
        <div className="ep-wcell">
          <div className="ep-wn" style={{ color: "#1d4ed8" }}>{stats.in_progress}</div>
          <div className="ep-wl">Active</div>
        </div>
        <div className="ep-wcell">
          <div className="ep-wn" style={{ color: "#15803d" }}>{stats.completed}</div>
          <div className="ep-wl">Done</div>
        </div>
      </div>

      {stats.overdue > 0 && (
        <div className="ep-over-badge">⚠ {stats.overdue} overdue</div>
      )}

      <div className="ep-actions">
        <button className="ep-btn primary" onClick={onAssign}>+ Assign Task</button>
        <button className="ep-btn"         onClick={onEdit}>Edit</button>
        <button className="ep-btn danger"  onClick={onDelete} disabled={deleting}>
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}