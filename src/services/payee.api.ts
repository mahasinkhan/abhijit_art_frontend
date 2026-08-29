// src/services/payee.api.ts
import api from "../api";

export type PayeeKind = "employee" | "outsider";

export interface Payee {
  id: string;
  name: string;
  /** stored as 10 digits — display with formatPhone() */
  phone: string;
  kind: PayeeKind;
  userId?: string | null;
  user?: { id: string; name: string; email: string; role: string } | null;
  role: string;
  notes: string;
  active: boolean;
  /** attached by the list/detail endpoints */
  totalPaid: number;
  paymentCount: number;
  lastPaidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayeeDetail extends Payee {
  cash: number;
  online: number;
  expenses: {
    id: string; date: string; category: string; title: string;
    amount: number; method: "cash" | "online"; notes: string;
  }[];
  byMonth:    { month: string; amount: number }[];
  byCategory: { category: string; amount: number }[];
}

export interface PayeeInput {
  name: string;
  phone: string;
  kind?: PayeeKind;
  userId?: string | null;
  role?: string;
  notes?: string;
  active?: boolean;
}

export interface SyncResult {
  created: number;
  linked: number;
  /** employees with no phone number on file — they can't be matched */
  skipped: string[];
  total: number;
}

/** Same rule the server uses, so the UI can dedupe before it even posts. */
export function normalisePhone(raw: string): string {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0"))  d = d.slice(1);
  return d;
}

/** 9765432100 → 97654 32100 */
export function formatPhone(p: string): string {
  const d = normalisePhone(p);
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}

export const payeeApi = {
  list: (opts: { kind?: string; search?: string; includeInactive?: boolean } = {}) => {
    const params: Record<string, string> = {};
    if (opts.kind)   params.kind = opts.kind;
    if (opts.search) params.search = opts.search;
    if (opts.includeInactive) params.includeInactive = "1";
    return api.get<Payee[]>("/api/payees", { params }).then((r) => r.data);
  },

  get: (id: string, range?: { from?: string; to?: string }) =>
    api.get<PayeeDetail>(`/api/payees/${id}`, { params: range || {} }).then((r) => r.data),

  create: (data: PayeeInput) =>
    api.post<Payee>("/api/payees", data).then((r) => r.data),

  update: (id: string, data: Partial<PayeeInput>) =>
    api.patch<Payee>(`/api/payees/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/api/payees/${id}`).then((r) => r.data),

  /** pulls every employee (with a phone) into the people list */
  syncEmployees: () =>
    api.post<SyncResult>("/api/payees/sync-employees").then((r) => r.data),
};