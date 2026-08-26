// src/components/employees/TeamTaskSummary.tsx
import type { TeamTask, TaskStatus, TaskPriority } from "../../services/employee-task.api";

const ACCENT = "#d9542f";
const INK    = "#2a231d";
const MUTED  = "#8a8378";
const FAINT  = "#b3ab9f";
const LINE   = "#e7e1d7";
const WASH   = "#faf8f3";

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

function fmtDate(d?: string) {
  if (!d) return "No delivery date";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  task:      TeamTask;
  ownerName: string;
  onClose:   () => void;
}

export function TeamTaskSummary({ task, ownerName, onClose }: Props) {
  const sm = STATUS_META[task.status];
  const pm = PRIORITY_META[task.priority];

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(31,36,48,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 400, borderRadius: 4, overflow: "hidden", boxShadow: "0 20px 50px rgba(20,20,25,.25)" }}>
        {/* Header */}
        <div style={{ padding: "18px 22px 16px", borderBottom: `1px solid ${LINE}`, position: "relative" }}>
          <button onClick={onClose}
            style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", fontSize: "1.4rem", lineHeight: 1, cursor: "pointer", color: MUTED }}>×</button>
          <div style={{ fontSize: ".66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: FAINT, marginBottom: 6 }}>
            Teammate's task
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: INK, lineHeight: 1.3, paddingRight: 20 }}>
            {task.title}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px 22px" }}>
          <div style={{ display: "grid", gap: 14 }}>
            <Row label="Assigned to">
              <span style={{ fontWeight: 600, color: INK }}>{ownerName}</span>
            </Row>
            <Row label="Status">
              <span style={{ display: "inline-block", padding: "3px 11px", borderRadius: 3, fontSize: ".74rem", fontWeight: 700, background: sm.bg, color: sm.color }}>
                {sm.label}
              </span>
            </Row>
            <Row label="Priority">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".82rem", fontWeight: 700, color: pm.color }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: pm.color }} />
                {pm.label}
              </span>
            </Row>
            <Row label="Delivery">
              <span style={{ fontSize: ".85rem", color: task.deadline ? INK : FAINT, fontWeight: 500 }}>
                {fmtDate(task.deadline)}
              </span>
            </Row>
          </div>

          <div style={{ marginTop: 18, padding: "11px 13px", background: WASH, border: `1px solid ${LINE}`, borderRadius: 3, fontSize: ".76rem", color: MUTED, lineHeight: 1.5 }}>
            You can see the status and progress of your teammates' work. Full order details are visible only to the person assigned.
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
      <span style={{ fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "#8a8378" }}>{label}</span>
      {children}
    </div>
  );
}