// src/hooks/usePayees.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  payeeApi, normalisePhone,
  type Payee, type PayeeDetail, type PayeeInput, type SyncResult,
} from "../services/payee.api";

export function usePayees() {
  const [payees,  setPayees]  = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [kind,    setKind]    = useState("");          // "" | employee | outsider
  const [search,  setSearch]  = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setPayees(await payeeApi.list({ includeInactive: showInactive }));
    } catch (err: any) {
      setError(err.response?.data?.error || "Could not load people");
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => { load(); }, [load]);

  /** Filtering happens client-side — the list is small and it feels instant. */
  const shown = useMemo(() => {
    const q      = search.trim().toLowerCase();
    const digits = normalisePhone(search);
    return payees.filter((p) => {
      if (kind && p.kind !== kind) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q)
        || (p.role || "").toLowerCase().includes(q)
        || (!!digits && p.phone.includes(digits));
    });
  }, [payees, kind, search]);

  const totals = useMemo(() => ({
    people:    payees.length,
    employees: payees.filter((p) => p.kind === "employee").length,
    outsiders: payees.filter((p) => p.kind === "outsider").length,
    paid:      Math.round(payees.reduce((s, p) => s + p.totalPaid, 0) * 100) / 100,
  }), [payees]);

  /** Finds an existing person by phone before creating a duplicate. */
  const findByPhone = useCallback((phone: string) => {
    const d = normalisePhone(phone);
    if (d.length < 10) return null;
    return payees.find((p) => p.phone === d) || null;
  }, [payees]);

  const create = useCallback(async (data: PayeeInput) => {
    const row = await payeeApi.create(data);
    await load();
    return row;
  }, [load]);

  const update = useCallback(async (id: string, data: Partial<PayeeInput>) => {
    const row = await payeeApi.update(id, data);
    await load();
    return row;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await payeeApi.remove(id);
    await load();
  }, [load]);

  const syncEmployees = useCallback(async (): Promise<SyncResult> => {
    const result = await payeeApi.syncEmployees();
    await load();
    return result;
  }, [load]);

  const getDetail = useCallback(
    (id: string, range?: { from?: string; to?: string }): Promise<PayeeDetail> =>
      payeeApi.get(id, range),
    []
  );

  return {
    payees, shown, totals, loading, error,
    kind, setKind,
    search, setSearch,
    showInactive, setShowInactive,
    findByPhone,
    create, update, remove, syncEmployees, getDetail,
    reload: load,
  };
}