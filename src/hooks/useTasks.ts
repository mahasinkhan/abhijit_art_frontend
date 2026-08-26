// src/hooks/useTasks.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export function useTasks() {
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invoices,  setInvoices]  = useState<Invoice[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selectedId,setSelectedId]= useState<string | null>(null);
  const [filter,    setFilter]    = useState({ status: "", priority: "", assignee: "" });
  const [search,    setSearch]    = useState("");

  const loadTasks = useCallback(async () => {
    try { const data = await taskApi.getAll(); setTasks(data); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const loadInvoices = useCallback(async () => {
    try { const { data } = await api.get("/api/invoices"); setInvoices(data || []); }
    catch { /* ignore */ }
  }, []);

  useEffect(() => { loadTasks(); loadInvoices(); }, [loadTasks, loadInvoices]);
  useEffect(() => {
    employeeApi.list().then(setEmployees).catch(() => {});
  }, []);

  useSocket({
    "task:created": (task: Task) => setTasks((p) => [task, ...p.filter((t) => t.id !== task.id)]),
    "task:updated": (task: Task) => setTasks((p) => p.map((t) => t.id === task.id ? task : t)),
    "task:deleted": ({ id }: { id: string }) => {
      setTasks((p) => p.filter((t) => t.id !== id));
      setSelectedId((cur) => cur === id ? null : cur);
    },
  });

  const now = Date.now();

  const stats = useMemo(() => ({
    total:       tasks.length,
    pending:     tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed:   tasks.filter((t) => t.status === "completed").length,
    overdue:     tasks.filter((t) =>
      t.deadline && t.status !== "completed" && t.status !== "cancelled" &&
      new Date(t.deadline).getTime() < now
    ).length,
  }), [tasks, now]);

  const displayed = useMemo(() => tasks.filter((t) => {
    if (filter.status   && t.status            !== filter.status)   return false;
    if (filter.priority && t.priority          !== filter.priority) return false;
    if (filter.assignee && t.assignedTo.id     !== filter.assignee) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) &&
          !t.assignedTo.name.toLowerCase().includes(q) &&
          !(t.customerName  || "").toLowerCase().includes(q) &&
          !(t.invoiceNo     || "").toLowerCase().includes(q)) return false;
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

  return {
    tasks, employees, invoices, loading,
    selectedId, setSelectedId,
    selected, selectedBill,
    filter, setFilter,
    search, setSearch,
    stats, displayed,
    updateStatus, deleteTask,
    reload: loadTasks,
  };
}