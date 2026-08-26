// src/components/employees/TeamBoard.tsx
import type { Employee } from "../../services/employee.api";
import type { TeamTask } from "../../services/task.api";

const STATUS_META = {
  in_progress: { label: "In progress", color: "#1e5fa8", bg: "#e6eff9" },
  pending:     { label: "Pending",     color: "#9a6a12", bg: "#fbf1dd" },
};
const PRIORITY_COLOR: Record<string, string> = {
  low: "#a8a29a", medium: "#c2974a", high: "#d9542f", urgent: "#7c3aed",
};

interface BoardRow { emp: Employee; active: TeamTask[]; pending: TeamTask[]; }

export function TeamBoard({ board }: { board: BoardRow[] }) {
  if (board.length === 0) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "#9ca3af", fontSize: ".88rem" }}>
        No active tasks right now — everyone is idle.
      </div>
    );
  }

  return (
    <div className="ep-board">
      {board.map(({ emp, active, pending }) => (
        <div key={emp.id} className="ep-bcol">
          <div className="ep-bcol-head">
            <div className="ep-bcol-av">{emp.name[0].toUpperCase()}</div>
            <div>
              <div className="ep-bcol-name">{emp.name}</div>
              <div style={{ fontSize: ".72rem", color: "#6b7280" }}>{emp.email}</div>
            </div>
            <div className="ep-bcol-count">
              {active.length + pending.length} task{active.length + pending.length !== 1 ? "s" : ""}
            </div>
          </div>

          {active.map((t) => (
            <div key={t.id} className="ep-btask">
              <div className="ep-btask-dot" style={{ background: "#1d4ed8" }} />
              <div>
                <div className="ep-btask-title">{t.title}</div>
                <div className="ep-btask-status"
                  style={{ background: STATUS_META.in_progress.bg, color: STATUS_META.in_progress.color }}>
                  In progress
                </div>
              </div>
            </div>
          ))}

          {pending.map((t) => (
            <div key={t.id} className="ep-btask">
              <div className="ep-btask-dot" style={{ background: PRIORITY_COLOR[t.priority] || "#c2974a" }} />
              <div>
                <div className="ep-btask-title">{t.title}</div>
                <div className="ep-btask-status"
                  style={{ background: STATUS_META.pending.bg, color: STATUS_META.pending.color }}>
                  Pending
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}