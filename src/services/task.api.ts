// src/services/task.api.ts
import api from "../api";

export type TaskStatus   = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskEmployee { id: string; name: string; email: string; }
export interface Task {
  id: string; title: string; description?: string;
  images: string[]; links: string[];
  priority: TaskPriority; status: TaskStatus;
  deadline?: string; notes?: string;
  startedAt?: string; completedAt?: string;
  deliveredAt?: string; deliveredBy?: { id: string; name: string } | null;
  customerName?: string; customerPhone?: string; customerEmail?: string;
  orderDate?: string; amount?: number; advancePaid?: number;
  invoiceId?: string; invoiceNo?: string;
  assignedTo: TaskEmployee;
  createdBy: { id: string; name: string };
  createdAt: string; updatedAt: string;
}
export interface TeamTask {
  id: string; title: string; status: TaskStatus;
  priority: TaskPriority; deadline?: string;
  assignedTo: { id: string; name: string };
}

export const taskApi = {
  getAll: (filters?: { status?: string; priority?: string; assignedToId?: string }) =>
    api.get<Task[]>("/api/tasks", { params: filters }).then((r) => r.data),

  getTeam: () =>
    api.get<TeamTask[]>("/api/tasks/team").then((r) => r.data),

  create: (fd: FormData) =>
    api.post<Task>("/api/tasks", fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),

  update: (id: string, fd: FormData) =>
    api.patch<Task>(`/api/tasks/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),

  updateStatus: (id: string, status: TaskStatus, notes?: string) =>
    api.patch<Task>(`/api/tasks/${id}/status`, { status, notes }).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/api/tasks/${id}`).then((r) => r.data),
};