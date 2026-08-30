// src/hooks/useIncomeExpense.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cashbookApi,
  type Entry, type Summary, type EntryInput, type EntryFilters,
} from "../services/incomeExpense.api";

export type Period = "today" | "week" | "month" | "year" | "all" | "custom";

const iso = (d: Date) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());   // local day, not UTC's
  return x.toISOString().slice(0, 10);
};

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

export function useIncomeExpense() {
  const [period,   setPeriod]   = useState<Period>("month");
  const [range,    setRange]    = useState(() => rangeFor("month"));
  const [kind,     setKind]     = useState("");      // "" | income | expense
  const [category, setCategory] = useState("");
  const [method,   setMethod]   = useState("");
  const [payeeId,  setPayeeId]  = useState("");
  const [search,   setSearch]   = useState("");

  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const filters: EntryFilters = useMemo(() => ({
    from: range.from, to: range.to, kind, category, method, payeeId, search,
  }), [range, kind, category, method, payeeId, search]);

  const load = useCallback(async () => {
    setError("");
    try {
      const [list, sum] = await Promise.all([
        cashbookApi.list(filters),
        cashbookApi.summary({ from: range.from, to: range.to }),
      ]);
      setEntries(list);
      setSummary(sum);
    } catch (err: any) {
      setError(err.response?.data?.error || "Could not load the cash book");
    } finally {
      setLoading(false);
    }
  }, [filters, range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  const changePeriod = useCallback((p: Period) => {
    setPeriod(p);
    if (p !== "custom") setRange(rangeFor(p));
  }, []);

  const setCustomRange = useCallback((from: string, to: string) => {
    setPeriod("custom");
    setRange({ from, to });
  }, []);

  /** Switching direction drops a category that belongs to the other side. */
  const changeKind = useCallback((k: string) => {
    setKind(k);
    setCategory("");
  }, []);

  const clearFilters = useCallback(() => {
    setKind(""); setCategory(""); setMethod(""); setPayeeId(""); setSearch("");
  }, []);

  const create = useCallback(async (data: EntryInput) => {
    const row = await cashbookApi.create(data);
    await load();
    return row;
  }, [load]);

  const update = useCallback(async (id: string, data: Partial<EntryInput>) => {
    const row = await cashbookApi.update(id, data);
    await load();
    return row;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await cashbookApi.remove(id);
    await load();
  }, [load]);

  /** Grouped by day with both directions totalled — reads like a diary. */
  const byDay = useMemo(() => {
    const map = new Map<string, { date: string; income: number; expense: number; items: Entry[] }>();
    entries.forEach((e) => {
      const k = e.date.slice(0, 10);
      if (!map.has(k)) map.set(k, { date: k, income: 0, expense: 0, items: [] });
      const g = map.get(k)!;
      if (e.kind === "income") g.income  = Math.round((g.income + e.amount) * 100) / 100;
      else                     g.expense = Math.round((g.expense + e.amount) * 100) / 100;
      g.items.push(e);
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  /** Totals of what's on screen right now, filters included. */
  const shown = useMemo(() => {
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const income  = r2(entries.filter((e) => e.kind === "income").reduce((s, e) => s + e.amount, 0));
    const expense = r2(entries.filter((e) => e.kind === "expense").reduce((s, e) => s + e.amount, 0));
    return { income, expense, net: r2(income - expense) };
  }, [entries]);

  const dirty = !!(kind || category || method || payeeId || search);

  return {
    entries, byDay, summary, loading, error, shown,
    period, range, changePeriod, setCustomRange,
    kind,     setKind: changeKind,
    category, setCategory,
    method,   setMethod,
    payeeId,  setPayeeId,
    search,   setSearch,
    dirty,    clearFilters,
    create, update, remove, reload: load,
  };
}