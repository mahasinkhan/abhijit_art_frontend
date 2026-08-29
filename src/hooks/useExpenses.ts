// src/hooks/useExpenses.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  expenseApi,
  type Expense, type ExpenseSummary, type ExpenseInput, type ExpenseFilters,
} from "../services/expense.api";

export type Period = "today" | "week" | "month" | "year" | "all" | "custom";

const iso = (d: Date) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());   // keep the local day, not UTC's
  return x.toISOString().slice(0, 10);
};

/** Rolling windows, all ending today. */
export function rangeFor(p: Period): { from: string; to: string } {
  const now = new Date();
  const to  = iso(now);
  switch (p) {
    case "today": return { from: to, to };
    case "week":  { const d = new Date(now); d.setDate(d.getDate() - 6); return { from: iso(d), to }; }
    case "month": return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to };
    case "year":  return { from: iso(new Date(now.getFullYear(), 0, 1)), to };
    case "all":   return { from: "2000-01-01", to };
    default:      return { from: to, to };
  }
}

export const PERIOD_LABEL: Record<Period, string> = {
  today:  "Today",
  week:   "Last 7 days",
  month:  "This month",
  year:   "This year",
  all:    "All time",
  custom: "Custom range",
};

export function useExpenses() {
  const [period,   setPeriod]   = useState<Period>("month");
  const [range,    setRange]    = useState(() => rangeFor("month"));
  const [category, setCategory] = useState("");
  const [method,   setMethod]   = useState("");
  const [payeeId,  setPayeeId]  = useState("");
  const [search,   setSearch]   = useState("");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary,  setSummary]  = useState<ExpenseSummary | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const filters: ExpenseFilters = useMemo(() => ({
    from: range.from, to: range.to, category, method, payeeId, search,
  }), [range, category, method, payeeId, search]);

  const load = useCallback(async () => {
    setError("");
    try {
      const [list, sum] = await Promise.all([
        expenseApi.list(filters),
        expenseApi.summary({ from: range.from, to: range.to }),
      ]);
      setExpenses(list);
      setSummary(sum);
    } catch (err: any) {
      setError(err.response?.data?.error || "Could not load expenses");
    } finally {
      setLoading(false);
    }
  }, [filters, range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  /** Switching preset also moves the date window. "custom" keeps what's set. */
  const changePeriod = useCallback((p: Period) => {
    setPeriod(p);
    if (p !== "custom") setRange(rangeFor(p));
  }, []);

  const setCustomRange = useCallback((from: string, to: string) => {
    setPeriod("custom");
    setRange({ from, to });
  }, []);

  const clearFilters = useCallback(() => {
    setCategory(""); setMethod(""); setPayeeId(""); setSearch("");
  }, []);

  const create = useCallback(async (data: ExpenseInput) => {
    const row = await expenseApi.create(data);
    await load();
    return row;
  }, [load]);

  const update = useCallback(async (id: string, data: Partial<ExpenseInput>) => {
    const row = await expenseApi.update(id, data);
    await load();
    return row;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await expenseApi.remove(id);
    await load();
  }, [load]);

  /** Rows grouped by day — the list reads like a diary this way. */
  const byDay = useMemo(() => {
    const map = new Map<string, { date: string; total: number; items: Expense[] }>();
    expenses.forEach((e) => {
      const k = e.date.slice(0, 10);
      if (!map.has(k)) map.set(k, { date: k, total: 0, items: [] });
      const g = map.get(k)!;
      g.total = Math.round((g.total + e.amount) * 100) / 100;
      g.items.push(e);
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses]);

  /** Total of what's on screen right now (filters applied), not the whole range. */
  const shownTotal = useMemo(
    () => Math.round(expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100,
    [expenses]
  );

  const dirty = !!(category || method || payeeId || search);

  return {
    expenses, byDay, summary, loading, error, shownTotal,
    period, range, changePeriod, setCustomRange,
    category, setCategory,
    method,   setMethod,
    payeeId,  setPayeeId,
    search,   setSearch,
    dirty,    clearFilters,
    create, update, remove, reload: load,
  };
}