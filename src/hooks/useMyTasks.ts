// src/hooks/useMyTasks.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { employeeTaskApi, type Task, type TaskStatus } from "../services/employee-task.api";

const API_BASE    = import.meta.env.VITE_API_URL || "http://localhost:5000";
const STATUS_RANK: Record<TaskStatus, number> = { in_progress: 0, pending: 1, completed: 2, cancelled: 3 };

function sort(list: Task[]) {
  return [...list].sort((a, b) => {
    const s = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (s !== 0) return s;
    const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    if (ad !== bd) return ad - bd;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function useMyTasks(userId?: string) {
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [live,    setLive]    = useState(false);

  const load = useCallback(async () => {
    try { setTasks(sort(await employeeTaskApi.getMine())); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Socket
  useEffect(() => {
    if (!userId) return;
    const socket = io(API_BASE, { withCredentials: true });
    socket.on("connect",    () => setLive(true));
    socket.on("disconnect", () => setLive(false));

    const mine = (t: Task) => t.assignedTo?.id === userId;

    socket.on("task:created", (t: Task) => {
      if (mine(t)) setTasks((p) => sort([t, ...p.filter((x) => x.id !== t.id)]));
    });
    socket.on("task:updated", (t: Task) => setTasks((p) => {
      if (!mine(t)) return p.filter((x) => x.id !== t.id);
      return sort(p.some((x) => x.id === t.id) ? p.map((x) => x.id === t.id ? t : x) : [t, ...p]);
    }));
    socket.on("task:deleted", ({ id }: { id: string }) =>
      setTasks((p) => p.filter((x) => x.id !== id))
    );
    return () => { socket.disconnect(); };
  }, [userId]);

  const stats = useMemo(() => ({
    total:       tasks.length,
    pending:     tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed:   tasks.filter((t) => t.status === "completed").length,
    ready:       tasks.filter((t) => t.status === "completed" && !t.deliveredAt).length,
  }), [tasks]);

  const needsAttention = useMemo(() => {
    const rank = (tone: string) => (tone === "over" ? 0 : tone === "ready" ? 1 : tone === "soon" ? 2 : 3);
    return tasks
      .filter((t) => t.status !== "cancelled" && !t.deliveredAt)
      .map((t) => ({ t, cue: taskCue(t) }))
      .filter(({ cue }) => ["over","ready","soon"].includes(cue.tone))
      .sort((a, b) => rank(a.cue.tone) - rank(b.cue.tone));
  }, [tasks]);

  const recentDelivered = useMemo(() =>
    tasks.filter((t) => t.deliveredAt)
      .sort((a, b) => new Date(b.deliveredAt!).getTime() - new Date(a.deliveredAt!).getTime())
      .slice(0, 5),
  [tasks]);

  const applyUpdated = useCallback((u: Task) =>
    setTasks((p) => sort(p.map((t) => t.id === u.id ? { ...t, ...u } : t))),
  []);

  return { tasks, loading, live, stats, needsAttention, recentDelivered, applyUpdated };
}

// ── helpers (shared with components via import) ──────────────────────────────
export function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
export function fmtDateTime(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}
export function fmtDuration(ms: number) {
  if (ms < 0) ms = 0;
  const m = Math.floor(ms / 60000);
  if (m < 1)  return "moments";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60); const rm = m % 60;
  if (h < 24) return rm ? `${h}h ${rm}m` : `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
export function taskCue(t: Task): { text: string; tone: "ok"|"soon"|"over"|"done"|"ready" } {
  if (t.deliveredAt) {
    if (t.deadline) {
      const late = new Date(t.deliveredAt).getTime() - new Date(t.deadline).getTime();
      if (late > 0) return { text: `Delivered ${fmtDuration(late)} late`, tone: "over" };
    }
    return { text: "Delivered on time", tone: "done" };
  }
  if (t.status === "completed") return { text: "Done — ready to deliver", tone: "ready" };
  if (t.status === "cancelled") return { text: "Cancelled", tone: "ok" };
  if (!t.deadline) return { text: "No delivery date", tone: "ok" };
  const diff = new Date(t.deadline).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (diff < 0) return { text: `Overdue by ${fmtDuration(-diff)}`, tone: "over" };
  if (days === 0) return { text: "Due today", tone: "soon" };
  if (days <= 2)  return { text: `Due in ${days} day${days > 1 ? "s" : ""}`, tone: "soon" };
  return { text: `Due ${fmtDate(t.deadline)}`, tone: "ok" };
}
export const rupees = (n?: number) => `₹${(n || 0).toLocaleString("en-IN")}`;