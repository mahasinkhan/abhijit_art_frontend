// src/hooks/useTasks.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { taskApi, type Task, type TaskStatus } from "../services/task.api";
import { employeeApi, type Employee } from "../services/employee.api";
import { useSocket } from "./useSocket";
import api from "../api";

export interface Invoice {
  id: string; invoiceNo: string; date: string; status: string;
  clientName: string; clientPhone?: string; clientEmail?: string;
  total: string | number; paidAmount: string | number;
  items: { desc: string; qty: number | string; rate: number | string }[];
}

/** "" = all. "overdue" / "delivered" are view-only pseudo statuses. */
export type StatusFilter = "" | TaskStatus | "overdue" | "delivered";

export interface TaskFilter {
  status:   StatusFilter;
  priority: string;
  assignee: string;
  /** hide completed / cancelled / delivered when no explicit status is picked */
  openOnly: boolean;
}

/** Per-employee workload row used by the Team strip. */
export interface RosterEntry {
  id: string;
  name: string;
  pending:  number;
  active:   number;   // in_progress
  overdue:  number;
  done:     number;   // completed (not yet delivered)
  delivered:number;
  live:     number;   // pending + active = what's actually on their plate
}

export function isOverdue(t: Task) {
  return !!(
    t.deadline &&
    t.status !== "completed" &&
    t.status !== "cancelled" &&
    !t.deliveredAt &&
    new Date(t.deadline).getTime() < Date.now()
  );
}

export function useTasks() {
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [employees,  setEmployees]  = useState<Employee[]>([]);
  const [invoices,   setInvoices]   = useState<Invoice[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter,     setFilter]     = useState<TaskFilter>({
    status: "", priority: "", assignee: "", openOnly: false,
  });
  const [search,     setSearch]     = useState("");

  const loadTasks = useCallback(async () => {
    try { const data = await taskApi.getAll(); setTasks(data); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const loadInvoices = useCallback(async () => {
    try { const { data } = await api.get("/api/invoices"); setInvoices(data || []); }
    catch { /* ignore */ }
  }, []);

  const loadEmployees = useCallback(async () => {
    try { setEmployees(await employeeApi.list()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadTasks(); loadInvoices(); loadEmployees(); },
    [loadTasks, loadInvoices, loadEmployees]);

  useSocket({
    "task:created": (task: Task) => setTasks((p) => [task, ...p.filter((t) => t.id !== task.id)]),
    "task:updated": (task: Task) => setTasks((p) => p.map((t) => t.id === task.id ? task : t)),
    "task:deleted": ({ id }: { id: string }) => {
      setTasks((p) => p.filter((t) => t.id !== id));
      setSelectedId((cur) => cur === id ? null : cur);
    },
  });

  const stats = useMemo(() => ({
    total:       tasks.length,
    pending:     tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed:   tasks.filter((t) => t.status === "completed" && !t.deliveredAt).length,
    delivered:   tasks.filter((t) => !!t.deliveredAt).length,
    overdue:     tasks.filter(isOverdue).length,
  }), [tasks]);

  /** Whole-team workload — always from ALL tasks, never the filtered list. */
  const roster = useMemo<RosterEntry[]>(() => {
    const blank = (id: string, name: string): RosterEntry => ({
      id, name, pending: 0, active: 0, overdue: 0, done: 0, delivered: 0, live: 0,
    });
    const map = new Map<string, RosterEntry>();
    employees.forEach((e) => map.set(e.id, blank(e.id, e.name)));
    tasks.forEach((t) => {
      const id = t.assignedTo.id;
      if (!map.has(id)) map.set(id, blank(id, t.assignedTo.name));
      const r = map.get(id)!;
      if (t.deliveredAt)                  r.delivered++;
      else if (t.status === "pending")    { r.pending++; r.live++; }
      else if (t.status === "in_progress"){ r.active++;  r.live++; }
      else if (t.status === "completed")  r.done++;
      if (isOverdue(t)) r.overdue++;
    });
    return Array.from(map.values()).sort(
      (a, b) => (b.overdue - a.overdue) || (b.live - a.live) || a.name.localeCompare(b.name)
    );
  }, [tasks, employees]);

  const displayed = useMemo(() => tasks.filter((t) => {
    // status (incl. pseudo statuses)
    if (filter.status === "overdue") {
      if (!isOverdue(t)) return false;
    } else if (filter.status === "delivered") {
      if (!t.deliveredAt) return false;
    } else if (filter.status) {
      if (t.status !== filter.status) return false;
      if (filter.status === "completed" && t.deliveredAt) return false;
    } else if (filter.openOnly) {
      if (t.deliveredAt || t.status === "completed" || t.status === "cancelled") return false;
    }

    if (filter.priority && t.priority      !== filter.priority) return false;
    if (filter.assignee && t.assignedTo.id !== filter.assignee) return false;

    if (search) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) &&
          !t.assignedTo.name.toLowerCase().includes(q) &&
          !(t.customerName || "").toLowerCase().includes(q) &&
          !(t.invoiceNo    || "").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [tasks, filter, search]);

  const selected     = tasks.find((t) => t.id === selectedId) || null;
  const selectedBill = selected ? invoices.find((i) => i.id === selected.invoiceId) || null : null;

  const updateStatus = useCallback(async (id: string, status: TaskStatus) => {
    setTasks((p) => p.map((t) => t.id === id ? { ...t, status } : t));
    try { await taskApi.updateStatus(id, status); }
    catch { loadTasks(); }
  }, [loadTasks]);

  const deleteTask = useCallback(async (id: string) => {
    if (!confirm("Delete this task permanently?")) return;
    try { await taskApi.remove(id); } catch { /* socket handles */ }
  }, []);

  const clearFilters = useCallback(() => {
    setFilter({ status: "", priority: "", assignee: "", openOnly: false });
    setSearch("");
  }, []);

  return {
    tasks, employees, invoices, loading,
    selectedId, setSelectedId,
    selected, selectedBill,
    filter, setFilter, clearFilters,
    search, setSearch,
    stats, roster, displayed,
    updateStatus, deleteTask,
    reload: loadTasks,
    reloadEmployees: loadEmployees,
  };
}