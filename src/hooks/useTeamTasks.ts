// src/hooks/useTeamTasks.ts
import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { employeeTaskApi, type TeamTask } from "../services/employee-task.api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface FetchError { status?: number; message?: string; }

export function useTeamTasks() {
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<FetchError | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await employeeTaskApi.getTeam();
      setTeamTasks(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      setError({
        status:  e?.response?.status,
        message: e?.response?.data?.error || e?.response?.data?.message || e?.message || "Request failed",
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = io(API_BASE, { withCredentials: true });
    socket.on("task:created", load);
    socket.on("task:updated", load);
    socket.on("task:deleted", load);
    return () => { socket.disconnect(); };
  }, [load]);

  return { teamTasks, loading, error };
}