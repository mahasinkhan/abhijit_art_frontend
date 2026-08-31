// src/services/incomeExpense.api.ts
import api from "../api";
import type { PayeeKind } from "./payee.api";

export type TxnKind = "income" | "expense";
export type PayMethod = "cash" | "online";

export type ExpenseCat =
  | "salary" | "outside"
  | "materials" | "transport" | "food" | "utilities" | "other";

export type IncomeCat = "sale" | "loan_back" | "refund" | "other_income";

export type TxnCategory = ExpenseCat | IncomeCat;

export interface Entry {
  id: string;
  kind: TxnKind;
  date: string;
  category: TxnCategory;
  title: string;
  amount: number;
  method: PayMethod;
  payeeId: string | null;
  payee: {
    id: string; name: string; phone: string;
    kind: PayeeKind; role: string; userId?: string | null;
  } | null;
  notes: string;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Summary {
  from: string; to: string;
  income: number; expense: number; net: number;
  cashIn: number; onlineIn: number;
  cashOut: number; onlineOut: number;
  todayIn: number; todayOut: number;
  count: number; incomeCount: number; expenseCount: number;
  byCategory: { category: TxnCategory; kind: TxnKind; amount: number; count: number }[];
  byPayee: {
    id: string; name: string; phone: string; kind: PayeeKind;
    paid: number; received: number; net: number; count: number;
  }[];
  daily: { date: string; income: number; expense: number }[];
}

export interface EntryFilters {
  from?: string; to?: string; kind?: string; category?: string;
  method?: string; search?: string; payeeId?: string;
}

export interface EntryInput {
  kind: TxnKind; date?: string; category: TxnCategory;
  title: string; amount: number; method: PayMethod;
  payeeId?: string | null; notes?: string;
}

function params(f: EntryFilters) {
  const p: Record<string, string> = {};
  Object.entries(f).forEach(([k, v]) => { if (v) p[k] = String(v); });
  return p;
}

const BASE = "/api/income-expense";

export const cashbookApi = {
  list:    (filters: EntryFilters = {}) => api.get<Entry[]>(BASE, { params: params(filters) }).then(r => r.data),
  summary: (filters: Pick<EntryFilters, "from"|"to"> = {}) => api.get<Summary>(`${BASE}/summary`, { params: params(filters) }).then(r => r.data),
  create:  (data: EntryInput) => api.post<Entry>(BASE, data).then(r => r.data),
  update:  (id: string, data: Partial<EntryInput>) => api.patch<Entry>(`${BASE}/${id}`, data).then(r => r.data),
  remove:  (id: string) => api.delete(`${BASE}/${id}`).then(r => r.data),
};

export const CATEGORY_META: Record<TxnCategory, { label: string; color: string; hint?: string }> = {
  salary:       { label: "Salary",       color: "#60a5fa", hint: "Staff salary" },
  outside:      { label: "Outside",      color: "#22d3ee", hint: "Outsourced / outside work" },
  materials:    { label: "Materials",    color: "#e0b978", hint: "Paper, ink, boards" },
  transport:    { label: "Transport",    color: "#fbbf70", hint: "Auto, delivery, fuel" },
  food:         { label: "Food & Tea",   color: "#fcd34d", hint: "Lunch, tea, snacks" },
  utilities:    { label: "Bills",        color: "#5eead4", hint: "Electric, rent, internet" },
  other:        { label: "Other",        color: "#c4bdb2" },
  sale:         { label: "Sale",         color: "#86efac", hint: "Counter cash" },
  loan_back:    { label: "Loan repaid",  color: "#7dd3fc", hint: "Someone paid you back" },
  refund:       { label: "Refund",       color: "#c4b5fd" },
  other_income: { label: "Other Income", color: "#bef264" },
};

export const EXPENSE_CATS: ExpenseCat[] = [
  "salary", "outside", "materials", "transport", "food", "utilities", "other",
];

export const INCOME_CATS: IncomeCat[] = ["sale", "loan_back", "refund", "other_income"];

export const catsFor = (kind: TxnKind): TxnCategory[] =>
  kind === "income" ? INCOME_CATS : EXPENSE_CATS;

export const NEEDS_PAYEE: TxnCategory[] = ["salary", "loan_back"];