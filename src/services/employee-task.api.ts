// src/services/employee-task.api.ts
import api from "../api";

export type TaskStatus   = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

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
  createdBy: { id: string; name: string };
  assignedTo?: { id: string; name: string };
  createdAt: string; updatedAt: string;
}

export interface TeamTask {
  id: string; title: string; status: TaskStatus;
  priority: TaskPriority; deadline?: string;
  assignedTo: { id: string; name: string };
}

export const employeeTaskApi = {
  getMine: () =>
    api.get<Task[]>("/api/tasks/mine").then((r) => r.data),

  getTeam: () =>
    api.get<TeamTask[]>("/api/tasks/team").then((r) => r.data),

  updateStatus: (id: string, status: TaskStatus, notes?: string) =>
    api.patch<Task>(`/api/tasks/${id}/status`, { status, notes }).then((r) => r.data),

  deliver: (id: string, delivered: boolean) =>
    api.patch<Task>(`/api/tasks/${id}/deliver`, delivered ? {} : { delivered: false }).then((r) => r.data),
};