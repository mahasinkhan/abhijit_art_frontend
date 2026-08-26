// src/hooks/useEmployees.ts
import { useCallback, useEffect, useState } from "react";
import { employeeApi, type Employee } from "../services/employee.api";
import { taskApi, type TeamTask, type Task } from "../services/task.api";
import { useSocket } from "./useSocket";

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [loading,   setLoading]   = useState(true);

  const loadEmployees = useCallback(async () => {
    try { setEmployees(await employeeApi.list()); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const loadTasks = useCallback(async () => {
    try { setTasks(await taskApi.getAll()); } catch { /* ignore */ }
  }, []);

  const loadTeamTasks = useCallback(async () => {
    try { setTeamTasks(await taskApi.getTeam()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadEmployees(); loadTasks(); loadTeamTasks(); }, [loadEmployees, loadTasks, loadTeamTasks]);

  useSocket({
    "task:created": () => { loadTasks(); loadTeamTasks(); },
    "task:updated": () => { loadTasks(); loadTeamTasks(); },
    "task:deleted": () => { loadTasks(); loadTeamTasks(); },
  });

  const now = Date.now();

  const statsFor = useCallback((id: string) => {
    const mine   = tasks.filter((t) => t.assignedTo.id === id);
    const inProg = mine.filter((t) => t.status === "in_progress");
    return {
      pending:     mine.filter((t) => t.status === "pending").length,
      in_progress: inProg.length,
      completed:   mine.filter((t) => t.status === "completed").length,
      overdue:     mine.filter((t) =>
        t.deadline && t.status !== "completed" && t.status !== "cancelled" &&
        new Date(t.deadline).getTime() < now
      ).length,
      current: inProg[0]?.title || null,
    };
  }, [tasks, now]);

  const workingNow   = employees.filter((e) => statsFor(e.id).in_progress > 0).length;
  const totalActive  = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;
  const totalOverdue = tasks.filter((t) =>
    t.deadline && t.status !== "completed" && t.status !== "cancelled" &&
    new Date(t.deadline).getTime() < now
  ).length;

  const teamBoard = employees.map((emp) => ({
    emp,
    active:  teamTasks.filter((t) => t.assignedTo.id === emp.id && t.status === "in_progress"),
    pending: teamTasks.filter((t) => t.assignedTo.id === emp.id && t.status === "pending"),
  })).filter((row) => row.active.length > 0 || row.pending.length > 0);

  return {
    employees, tasks, teamTasks, teamBoard, loading,
    statsFor, workingNow, totalActive, totalOverdue,
    reload: { employees: loadEmployees, tasks: loadTasks, team: loadTeamTasks },
  };
}