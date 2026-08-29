// src/services/expense.api.ts
import api from "../api";
import type { PayeeKind } from "./payee.api";

export type ExpenseCategory =
  | "salary" | "advance" | "rent" | "utilities" | "transport"
  | "materials" | "food" | "maintenance" | "marketing" | "other";

export type PayMethod = "cash" | "online";

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  method: PayMethod;
  /** every expense belongs to somebody — phone is that person's identity */
  payeeId: string;
  payee: {
    id: string; name: string; phone: string;
    kind: PayeeKind; role: string; userId?: string | null;
  };
  notes: string;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSummary {
  from: string;
  to: string;
  total: number;
  cash: number;
  online: number;
  /** today's total, whatever range is selected */
  today: number;
  count: number;
  byCategory: { category: ExpenseCategory; amount: number; count: number }[];
  byPayee: {
    id: string; name: string; phone: string; kind: PayeeKind;
    amount: number; count: number;
  }[];
  daily: { date: string; amount: number }[];
}

export interface ExpenseFilters {
  from?: string;
  to?: string;
  category?: string;
  method?: string;
  search?: string;
  payeeId?: string;
}

export interface ExpenseInput {
  date?: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  method: PayMethod;
  payeeId: string;
  notes?: string;
}

/** Drops empty values so the query string stays clean. */
function params(f: ExpenseFilters) {
  const p: Record<string, string> = {};
  Object.entries(f).forEach(([k, v]) => { if (v) p[k] = String(v); });
  return p;
}

export const expenseApi = {
  list: (filters: ExpenseFilters = {}) =>
    api.get<Expense[]>("/api/expenses", { params: params(filters) }).then((r) => r.data),

  summary: (filters: Pick<ExpenseFilters, "from" | "to"> = {}) =>
    api.get<ExpenseSummary>("/api/expenses/summary", { params: params(filters) }).then((r) => r.data),

  create: (data: ExpenseInput) =>
    api.post<Expense>("/api/expenses", data).then((r) => r.data),

  update: (id: string, data: Partial<ExpenseInput>) =>
    api.patch<Expense>(`/api/expenses/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/api/expenses/${id}`).then((r) => r.data),
};

export const CATEGORY_META: Record<ExpenseCategory, { label: string; color: string }> = {
  salary:      { label: "Salary",       color: "#1e5fa8" },
  advance:     { label: "Advance",      color: "#7c3aed" },
  rent:        { label: "Rent",         color: "#9a6a12" },
  utilities:   { label: "Bills",        color: "#0f766e" },
  transport:   { label: "Transport",    color: "#b45309" },
  materials:   { label: "Materials",    color: "#c2974a" },
  food:        { label: "Food & tea",   color: "#a16207" },
  maintenance: { label: "Repairs",      color: "#6b7280" },
  marketing:   { label: "Marketing",    color: "#d9542f" },
  other:       { label: "Other",        color: "#8a8378" },
};

export const CATEGORY_LIST = Object.keys(CATEGORY_META) as ExpenseCategory[];