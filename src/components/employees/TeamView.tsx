// src/components/employees/TeamView.tsx
import { useState } from "react";
import { useTeamTasks } from "../../hooks/useTeamTasks";
import type { TeamTask, TaskStatus, TaskPriority } from "../../services/employee-task.api";
import { TeamTaskSummary } from "./TeamTaskSummary";

const ACCENT = "#d9542f";
const INK    = "#2a231d";
const MUTED  = "#8a8378";
const LINE   = "#e7e1d7";
const WASH   = "#faf8f3";

const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: "Pending",     color: "#9a6a12", bg: "#fbf1dd" },
  in_progress: { label: "In progress", color: "#1e5fa8", bg: "#e6eff9" },
  completed:   { label: "Completed",   color: "#2f7a3f", bg: "#e5f2e8" },
  cancelled:   { label: "Cancelled",   color: "#7c766c", bg: "#f0ede7" },
};
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: "#a8a29a", medium: "#c2974a", high: ACCENT, urgent: "#7c3aed",
};

interface Props {
  myId?:      string;
  onOpenMine: (taskId: string) => void;   // my task → open full detail in Tasks view
}

export function TeamView({ myId, onOpenMine }: Props) {
  const { teamTasks, loading, error } = useTeamTasks();
  const [summary, setSummary] = useState<{ task: TeamTask; owner: string } | null>(null);

  const byEmployee = teamTasks.reduce<Record<string, { name: string; tasks: TeamTask[] }>>(
    (acc, t) => {
      if (!t.assignedTo) return acc;
      const { id, name } = t.assignedTo;
      if (!acc[id]) acc[id] = { name, tasks: [] };
      acc[id].tasks.push(t);
      return acc;
    }, {}
  );

  const entries = Object.entries(byEmployee).sort(([, a], [, b]) => {
    const aHas = a.tasks.some((t) => t.status === "in_progress") ? 0 : 1;
    const bHas = b.tasks.some((t) => t.status === "in_progress") ? 0 : 1;
    return aHas - bHas || a.name.localeCompare(b.name);
  });

  function clickTask(t: TeamTask, ownerName: string) {
    if (t.assignedTo?.id === myId) onOpenMine(t.id);          // mine → full detail
    else setSummary({ task: t, owner: ownerName });           // teammate → summary
  }

  if (loading) return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: MUTED, fontSize: ".88rem" }}>
      Loading team tasks…
    </div>
  );

  if (error) return (
    <div style={{ padding: "20px", background: "#fef2ee", border: `1px solid ${ACCENT}`, borderRadius: 4, color: "#b23c1c", fontSize: ".85rem", lineHeight: 1.6 }}>
      <b>Team fetch failed</b><br />Status: {error.status || "?"}<br />Message: {error.message || "unknown"}
    </div>
  );

  if (entries.length === 0) return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: MUTED, fontSize: ".88rem", lineHeight: 1.6 }}>
      <b style={{ color: "#2f7a3f", display: "block", marginBottom: 4 }}>All clear!</b>
      No active tasks in the team right now.
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: MUTED, marginBottom: 14 }}>
        Live — who is working on what
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
        {entries.map(([empId, { name, tasks }]) => {
          const isMe = empId === myId;
          const active  = tasks.filter((t) => t.status === "in_progress");
          const pending = tasks.filter((t) => t.status === "pending");

          return (
            <div key={empId} style={{ background: "#fff", border: `1px solid ${isMe ? ACCENT : LINE}`, borderRadius: 4, overflow: "hidden", boxShadow: isMe ? `0 0 0 1px ${ACCENT}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${LINE}`, background: isMe ? "#fdf2ee" : WASH }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: isMe ? ACCENT : "#6b7280", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: ".9rem", flexShrink: 0 }}>
                  {name[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: ".9rem", color: INK }}>
                    {name}{isMe && <span style={{ fontSize: ".68rem", color: ACCENT, fontWeight: 700, marginLeft: 6, background: "#fce8e0", padding: "1px 6px", borderRadius: 3 }}>you</span>}
                  </div>
                  <div style={{ fontSize: ".72rem", color: MUTED, marginTop: 1 }}>
                    {active.length > 0 ? `${active.length} in progress` : "Idle"}{pending.length > 0 ? ` · ${pending.length} pending` : ""}
                  </div>
                </div>
                <div style={{ fontSize: ".7rem", fontWeight: 700, color: MUTED, background: "#f0f0f4", padding: "2px 8px", borderRadius: 999 }}>
                  {tasks.length}
                </div>
              </div>

              {[...active, ...pending].map((t) => {
                const isProg = t.status === "in_progress";
                const meta   = isProg ? STATUS_META.in_progress : STATUS_META.pending;
                return (
                  <button key={t.id} onClick={() => clickTask(t, name)}
                    style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "flex-start", gap: 8, background: "none", border: "none", borderBottom: `1px solid ${LINE}`, cursor: "pointer", fontFamily: "inherit", transition: "background .12s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = WASH)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: isProg ? "#1d4ed8" : (PRIORITY_COLOR[t.priority] || "#c2974a"), flexShrink: 0, marginTop: 5 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: ".84rem", color: INK, lineHeight: 1.35 }}>{t.title}</div>
                      <div style={{ display: "inline-block", fontSize: ".66rem", fontWeight: 700, padding: "1px 7px", borderRadius: 3, marginTop: 3, background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </div>
                    </div>
                    <span style={{ fontSize: ".9rem", color: "#c9c2b6", flexShrink: 0, marginTop: 2 }}>›</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {summary && (
        <TeamTaskSummary
          task={summary.task}
          ownerName={summary.owner}
          onClose={() => setSummary(null)}
        />
      )}
    </div>
  );
}