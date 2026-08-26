// src/services/employee.api.ts
import api from "../api";

export interface Employee {
  id: string; name: string; email: string; phone: string;
  createdAt: string;
  _count: { tasksAssigned: number };
}

export interface EmployeeFormData {
  name: string; email: string; phone: string; password: string;
}

export const employeeApi = {
  list: () =>
    api.get<Employee[]>("/api/tasks/employees/list").then((r) => r.data),

  create: (data: EmployeeFormData) =>
    api.post<Employee>("/api/users/employee", data).then((r) => r.data),

  update: (id: string, data: Partial<EmployeeFormData>) =>
    api.patch<Employee>(`/api/users/employee/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/api/users/employee/${id}`).then((r) => r.data),
};