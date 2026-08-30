// src/services/incomeExpense.api.ts
import api from "../api";
import type { PayeeKind } from "./payee.api";

export type TxnKind = "income" | "expense";
export type PayMethod = "cash" | "online";

export type ExpenseCat =
  | "salary" | "advance" | "lent" | "rent" | "utilities"
  | "transport" | "materials" | "food" | "maintenance" | "marketing" | "other";

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
  /** null for entries with nobody attached (a shop sale, a bus fare) */
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
  from: string;
  to: string;
  income: number;
  expense: number;
  /** income − expense for the selected period */
  net: number;
  cashIn: number; onlineIn: number;
  cashOut: number; onlineOut: number;
  todayIn: number; todayOut: number;
  count: number;
  incomeCount: number;
  expenseCount: number;
  byCategory: { category: TxnCategory; kind: TxnKind; amount: number; count: number }[];
  byPayee: {
    id: string; name: string; phone: string; kind: PayeeKind;
    paid: number; received: number;
    /** paid − received. Positive means they still owe us. */
    net: number;
    count: number;
  }[];
  daily: { date: string; income: number; expense: number }[];
}

export interface EntryFilters {
  from?: string;
  to?: string;
  kind?: string;
  category?: string;
  method?: string;
  search?: string;
  payeeId?: string;
}

export interface EntryInput {
  kind: TxnKind;
  date?: string;
  category: TxnCategory;
  title: string;
  amount: number;
  method: PayMethod;
  payeeId?: string | null;
  notes?: string;
}

function params(f: EntryFilters) {
  const p: Record<string, string> = {};
  Object.entries(f).forEach(([k, v]) => { if (v) p[k] = String(v); });
  return p;
}

const BASE = "/api/income-expense";

export const cashbookApi = {
  list: (filters: EntryFilters = {}) =>
    api.get<Entry[]>(BASE, { params: params(filters) }).then((r) => r.data),

  summary: (filters: Pick<EntryFilters, "from" | "to"> = {}) =>
    api.get<Summary>(`${BASE}/summary`, { params: params(filters) }).then((r) => r.data),

  create: (data: EntryInput) =>
    api.post<Entry>(BASE, data).then((r) => r.data),

  update: (id: string, data: Partial<EntryInput>) =>
    api.patch<Entry>(`${BASE}/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`${BASE}/${id}`).then((r) => r.data),
};

// ── Category catalogue ───────────────────────────────────────────────────────
export const CATEGORY_META: Record<TxnCategory, { label: string; color: string; hint?: string }> = {
  // money out
  food:        { label: "Food & tea",  color: "#a16207", hint: "Lunch, tea, snacks" },
  transport:   { label: "Transport",   color: "#b45309", hint: "Auto fare, delivery, fuel" },
  lent:        { label: "Money lent",  color: "#be123c", hint: "You gave a loan" },
  salary:      { label: "Salary",      color: "#1e5fa8" },
  advance:     { label: "Advance",     color: "#7c3aed", hint: "Salary paid early" },
  materials:   { label: "Materials",   color: "#c2974a" },
  rent:        { label: "Rent",        color: "#9a6a12" },
  utilities:   { label: "Bills",       color: "#0f766e", hint: "Power, water, internet" },
  maintenance: { label: "Repairs",     color: "#6b7280" },
  marketing:   { label: "Marketing",   color: "#d9542f" },
  other:       { label: "Other",       color: "#8a8378" },
  // money in
  sale:         { label: "Sale",        color: "#15803d", hint: "Counter cash" },
  loan_back:    { label: "Loan repaid", color: "#0369a1", hint: "Someone paid you back" },
  refund:       { label: "Refund",      color: "#7c3aed" },
  other_income: { label: "Other",       color: "#65a30d" },
};

export const EXPENSE_CATS: ExpenseCat[] = [
  "food", "transport", "lent", "salary", "advance",
  "materials", "rent", "utilities", "maintenance", "marketing", "other",
];

export const INCOME_CATS: IncomeCat[] = ["sale", "loan_back", "refund", "other_income"];

export const catsFor = (kind: TxnKind): TxnCategory[] =>
  kind === "income" ? INCOME_CATS : EXPENSE_CATS;

/** These make no sense without knowing whose money it is. */
export const NEEDS_PAYEE: TxnCategory[] = ["lent", "loan_back", "salary", "advance"];