// src/components/income-expense/index.tsx
import { useState, useMemo } from "react";
import { useIncomeExpense, PERIOD_LABEL } from "../../hooks/useIncomeExpense";
import { usePayees } from "../../hooks/usePayees";
import type { Entry, EntryInput, TxnKind, TxnCategory } from "../../services/incomeExpense.api";
import { CATEGORY_META } from "../../services/incomeExpense.api";
import type { Payee, PayeeInput, PayeeKind } from "../../services/payee.api";
import { EntryModal }  from "./EntryModal";
import { PersonModal } from "./PersonModal";
import {
  rupees, rupeesExact, initials, toCsv, downloadCsv,
  METHOD_META, ACCENT, INK, MUTED, FAINT, LINE, LINE_SOFT, WASH, GOLD, GREEN, RED, BLUE,
} from "./types";
import {
  type RowEntry, fmtDate, st,
  ExpenseStyles, Empty, KpiCard, CardHead, PeriodBar,
  ExpenseList, IncomeRow, StatementTable, IncomeStatementTable, Donut,
} from "./ui";

type Tab = "insights" | "salary" | "outside" | "income" | "ledger";
type LedgerView = "person" | "statement" | "income";

export default function IncomeExpense() {
  const cb = useIncomeExpense();
  const pp = usePayees();

  const [tab, setTab] = useState<Tab>("insights");
  const [globalSearch, setGlobalSearch] = useState("");

  // ledger
  const [ledgerView,   setLedgerView]   = useState<LedgerView>("person");
  const [ledgerPerson, setLedgerPerson] = useState("");

  // entry modal (expense)
  const [showEntry,   setShowEntry]   = useState(false);
  const [editEntry,   setEditEntry]   = useState<Entry | null>(null);
  const [startKind,   setStartKind]   = useState<TxnKind>("expense");
  const [seedPayee,   setSeedPayee]   = useState<string | undefined>(undefined);
  const [seedCat,     setSeedCat]     = useState<TxnCategory | undefined>(undefined);
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryError,  setEntryError]  = useState("");
  const [busyId,      setBusyId]      = useState<string | null>(null);

  // undo toast
  const [undoToast, setUndoToast] = useState<{ entry: Entry; timer: ReturnType<typeof setTimeout> } | null>(null);

  // person modal
  const [showPer,   setShowPer]   = useState(false);
  const [editPer,   setEditPer]   = useState<Payee | null>(null);
  const [savingPer, setSavingPer] = useState(false);
  const [perError,  setPerError]  = useState("");
  const [syncing,   setSyncing]   = useState(false);

  // office income (record only)
  const [incAmt,    setIncAmt]    = useState("");
  const [incTitle,  setIncTitle]  = useState("");
  const [incMethod, setIncMethod] = useState<"cash"|"online">("cash");
  const [incDate,   setIncDate]   = useState(new Date().toISOString().slice(0,10));
  const [incBusy,   setIncBusy]   = useState(false);
  const [incErr,    setIncErr]    = useState("");
  const [incEditId, setIncEditId] = useState<string | null>(null);
  const [incFilter, setIncFilter] = useState<"all"|"cash"|"online">("all");

  function openAdd(_kind: TxnKind, payeeId?: string, cat?: TxnCategory) {
    setEditEntry(null); setStartKind("expense"); setSeedPayee(payeeId); setSeedCat(cat);
    setEntryError(""); setShowEntry(true);
  }
  function openEdit(e: Entry) {
    setEditEntry(e); setSeedPayee(undefined); setSeedCat(undefined);
    setEntryError(""); setShowEntry(true);
  }
  function openDuplicate(e: Entry) {
    setEditEntry(null); setStartKind("expense"); setSeedPayee(e.payeeId || undefined); setSeedCat(e.category);
    setEntryError(""); setShowEntry(true);
  }

  async function saveEntry(data: EntryInput) {
    setSavingEntry(true); setEntryError("");
    try {
      if (editEntry) await cb.update(editEntry.id, data);
      else           await cb.create(data);
      setShowEntry(false); pp.reload();
    } catch (err: any) {
      setEntryError(err.response?.data?.error || "Could not save.");
    } finally { setSavingEntry(false); }
  }

  function deleteEntry(e: Entry) {
    if (undoToast) { clearTimeout(undoToast.timer); commitDelete(undoToast.entry); }
    const timer = setTimeout(() => { commitDelete(e); setUndoToast(null); }, 5000);
    setUndoToast({ entry: e, timer });
  }
  async function commitDelete(e: Entry) {
    setBusyId(e.id);
    try { await cb.remove(e.id); pp.reload(); }
    catch (err: any) { alert(err.response?.data?.error || "Could not delete."); }
    finally { setBusyId(null); }
  }
  function undoDelete() {
    if (!undoToast) return;
    clearTimeout(undoToast.timer);
    setUndoToast(null);
  }

  // ── office income actions ──
  function incReset() { setIncAmt(""); setIncTitle(""); setIncEditId(null); setIncErr(""); }
  function incEdit(e: Entry) {
    setIncEditId(e.id); setIncAmt(String(e.amount)); setIncTitle(e.title);
    setIncMethod(e.method as "cash"|"online"); setIncDate(e.date.slice(0,10)); setIncErr("");
    setTab("income");
  }
  async function incSave() {
    const amt = Number(incAmt);
    if (!Number.isFinite(amt) || amt <= 0) { setIncErr("Enter an amount."); return; }
    setIncBusy(true); setIncErr("");
    try {
      const payload = {
        kind: "income" as const, date: incDate,
        category: "sale" as TxnCategory,
        title: incTitle.trim() || "Office income",
        amount: Math.round(amt * 100) / 100,
        method: incMethod, payeeId: null, notes: "",
      };
      if (incEditId) await cb.update(incEditId, payload);
      else           await cb.create(payload);
      incReset();
    } catch (err: any) { setIncErr(err.response?.data?.error || "Could not save."); }
    finally { setIncBusy(false); }
  }

  async function savePerson(data: PayeeInput) {
    setSavingPer(true); setPerError("");
    try {
      if (editPer) await pp.update(editPer.id, data);
      else         await pp.create(data);
      setShowPer(false);
    } catch (err: any) {
      setPerError(err.response?.data?.error || "Could not save.");
    } finally { setSavingPer(false); }
  }
  async function deletePerson(p: Payee) {
    if (!confirm(`Remove ${p.name}?`)) return;
    try { await pp.remove(p.id); }
    catch (err: any) { alert(err.response?.data?.error || "Could not remove."); }
  }
  async function createPayeeInline(data: { name: string; phone: string; kind: PayeeKind; role?: string }) {
    return pp.create(data);
  }
  async function syncEmployees() {
    setSyncing(true);
    try {
      const r = await pp.syncEmployees();
      const bits = [r.created ? `${r.created} added` : "", r.linked ? `${r.linked} linked` : ""].filter(Boolean).join(", ");
      alert(bits || "Everyone already in list");
    } catch (err: any) { alert(err.response?.data?.error || "Sync failed."); }
    finally { setSyncing(false); }
  }

  // ── derived data ──────────────────────────────────────────────────────
  const allEntries = cb.entries;

  const filteredEntries = useMemo(() => {
    const base = allEntries.filter((e) => e.kind === "expense");
    if (!globalSearch.trim()) return base;
    const q = globalSearch.toLowerCase();
    return base.filter((e) =>
      e.title.toLowerCase().includes(q) ||
      (e.payee?.name || "").toLowerCase().includes(q) ||
      (e.notes || "").toLowerCase().includes(q) ||
      String(e.amount).includes(q)
    );
  }, [allEntries, globalSearch]);

  const incomeEntries = useMemo(() => {
    const base = allEntries.filter((e) => e.kind === "income");
    if (!globalSearch.trim()) return base;
    const q = globalSearch.toLowerCase();
    return base.filter((e) =>
      e.title.toLowerCase().includes(q) ||
      (e.notes || "").toLowerCase().includes(q) ||
      String(e.amount).includes(q)
    );
  }, [allEntries, globalSearch]);
  const incCashIn   = useMemo(() => incomeEntries.filter((e) => e.method === "cash").reduce((s, e) => s + e.amount, 0), [incomeEntries]);
  const incOnlineIn = useMemo(() => incomeEntries.filter((e) => e.method === "online").reduce((s, e) => s + e.amount, 0), [incomeEntries]);
  const incTotalIn  = useMemo(() => incomeEntries.reduce((s, e) => s + e.amount, 0), [incomeEntries]);

  const salaryEntries  = useMemo(() => filteredEntries.filter((e) => e.category === "salary"), [filteredEntries]);
  const outsideEntries = useMemo(() => filteredEntries.filter((e) => e.category !== "salary"), [filteredEntries]);

  const periodExpense = useMemo(() => filteredEntries.reduce((s, e) => s + e.amount, 0), [filteredEntries]);
  const cashOut       = useMemo(() => filteredEntries.filter((e) => e.method === "cash").reduce((s, e) => s + e.amount, 0), [filteredEntries]);
  const onlineOut     = useMemo(() => filteredEntries.filter((e) => e.method === "online").reduce((s, e) => s + e.amount, 0), [filteredEntries]);

  const salaryTotal  = useMemo(() => salaryEntries.reduce((s, e) => s + e.amount, 0), [salaryEntries]);
  const outsideTotal = useMemo(() => outsideEntries.reduce((s, e) => s + e.amount, 0), [outsideEntries]);

  const todayStr = new Date().toISOString().slice(0,10);
  const todayExp = allEntries.filter((e) => e.kind === "expense" && e.date.slice(0,10) === todayStr);
  const todaySpent     = todayExp.reduce((s, e) => s + e.amount, 0);
  const todayCashOut   = todayExp.filter((e) => e.method === "cash").reduce((s, e) => s + e.amount, 0);
  const todayOnlineOut = todayExp.filter((e) => e.method === "online").reduce((s, e) => s + e.amount, 0);

  const catBreakdown = useMemo(() => {
    const map = new Map<string, { key: string; label: string; amount: number; count: number; color: string }>();
    for (const e of filteredEntries) {
      const meta = CATEGORY_META[e.category];
      if (!map.has(e.category)) map.set(e.category, { key: e.category, label: meta?.label || e.category, amount: 0, count: 0, color: meta?.color || MUTED });
      const c = map.get(e.category)!; c.amount += e.amount; c.count += 1;
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [filteredEntries]);
  const outsideCats = catBreakdown.filter((c) => c.key !== "salary");

  const groupByPayee = (rows: Entry[]) => {
    const map = new Map<string, { id: string; name: string; kind?: string; amount: number; count: number }>();
    for (const e of rows) {
      const key = e.payeeId || "__none__";
      if (!map.has(key)) map.set(key, { id: key, name: e.payee?.name || "No person", kind: e.payee?.kind, amount: 0, count: 0 });
      const c = map.get(key)!; c.amount += e.amount; c.count += 1;
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  };
  const salaryByPayee  = useMemo(() => groupByPayee(salaryEntries),  [salaryEntries]);
  const outsideByPayee = useMemo(() => groupByPayee(outsideEntries.filter((e) => e.payeeId)), [outsideEntries]);
  const topPayees      = useMemo(() => groupByPayee(filteredEntries).filter((p) => p.id !== "__none__").slice(0, 8), [filteredEntries]);

  const sortedPayees = useMemo(() => [...pp.payees].sort((a, b) => a.name.localeCompare(b.name)), [pp.payees]);
  const emp8 = sortedPayees.filter((p) => p.kind === "employee").slice(0, 8);

  // ── ledger derived ──
  const payeeTotals = useMemo(() => {
    const m = new Map<string, { amount: number; count: number }>();
    for (const e of filteredEntries) {
      if (!e.payeeId) continue;
      const cur = m.get(e.payeeId) || { amount: 0, count: 0 };
      cur.amount += e.amount; cur.count += 1; m.set(e.payeeId, cur);
    }
    return m;
  }, [filteredEntries]);

  const ledgerPeople = useMemo(() =>
    sortedPayees
      .map((p) => ({ p, t: payeeTotals.get(p.id) }))
      .filter((x): x is { p: Payee; t: { amount: number; count: number } } => !!x.t)
      .sort((a, b) => b.t.amount - a.t.amount)
  , [sortedPayees, payeeTotals]);

  const byDate = (a: Entry, b: Entry) => a.date.localeCompare(b.date) || (a.createdAt || "").localeCompare(b.createdAt || "");
  const withRunning = (rows: Entry[]): RowEntry[] => {
    let run = 0;
    return [...rows].sort(byDate).map((e) => { run = Math.round((run + e.amount) * 100) / 100; return { ...e, running: run }; });
  };

  const fullStatement   = useMemo(() => withRunning(filteredEntries), [filteredEntries]);
  const incomeStatement = useMemo(() => withRunning(incomeEntries),   [incomeEntries]);
  const personStatement = useMemo(() => withRunning(ledgerPerson ? filteredEntries.filter((e) => e.payeeId === ledgerPerson) : []), [filteredEntries, ledgerPerson]);
  const personTotal     = useMemo(() => personStatement.reduce((s, e) => s + e.amount, 0), [personStatement]);
  const selectedLedgerPayee = sortedPayees.find((p) => p.id === ledgerPerson);

  // ── exports / prints ──
  function exportCsv(rows: Entry[], name: string) {
    const header = ["Date", "Details", "Category", "Person", "Method", "Amount", "Notes"];
    const body = rows.map((e) => [
      fmtDate(e.date.slice(0,10)), e.title,
      CATEGORY_META[e.category]?.label || e.category,
      e.payee?.name || "", e.method, e.amount, e.notes || "",
    ]);
    downloadCsv(`${name}-${cb.range.from}-to-${cb.range.to}.csv`, toCsv([header, ...body]));
  }
  function exportStatement(rows: RowEntry[], name: string) {
    const header = ["Date", "Details", "Category", "Person", "Method", "Amount", "Running total"];
    const body = rows.map((e) => [
      fmtDate(e.date.slice(0,10)), e.title,
      CATEGORY_META[e.category]?.label || e.category,
      e.payee?.name || "", e.method, e.amount, e.running,
    ]);
    downloadCsv(`${name}-${cb.range.from}-to-${cb.range.to}.csv`, toCsv([header, ...body]));
  }
  function exportIncomeStatement(rows: RowEntry[], name: string) {
    const header = ["Date", "Note", "Method", "Amount", "Running total"];
    const body = rows.map((e) => [fmtDate(e.date.slice(0,10)), e.title, e.method, e.amount, e.running]);
    downloadCsv(`${name}-${cb.range.from}-to-${cb.range.to}.csv`, toCsv([header, ...body]));
  }
  function printPerson(p: Payee, rows: RowEntry[], total: number) {
    const lines = rows.map((e) =>
      `${fmtDate(e.date.slice(0,10))}  |  ${e.title}  |  ${CATEGORY_META[e.category]?.label || e.category}  |  ${e.method}  |  -${rupeesExact(e.amount)}  |  ${rupees(e.running)}`
    ).join("\n");
    const w = window.open("", "_blank", "width=780,height=640");
    if (!w) return;
    w.document.write(`<pre style="font-family:monospace;padding:22px;font-size:13px;line-height:1.6"><b>${p.name} — Expense Statement</b>\n${p.phone || ""}\nPeriod: ${cb.range.from} to ${cb.range.to}\n${"-".repeat(78)}\n${lines}\n${"-".repeat(78)}\nTotal paid: -${rupees(total)}</pre>`);
    w.document.close(); w.print();
  }
  function printIncome(rows: RowEntry[], total: number) {
    const body = rows.map((e) => `
      <tr>
        <td>${fmtDate(e.date.slice(0,10))}</td>
        <td>${e.title}</td>
        <td><span class="m">${METHOD_META[e.method].label}</span></td>
        <td class="amt">+${rupeesExact(e.amount)}</td>
        <td class="run">${rupees(e.running)}</td>
      </tr>`).join("");
    const w = window.open("", "_blank", "width=840,height=700");
    if (!w) return;
    w.document.write(`
<!doctype html><html><head><meta charset="utf-8"><title>Income Statement</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:'DM Sans',system-ui,Arial,sans-serif;color:#2a231d;background:#fff;padding:32px}
  .wrap{max-width:720px;margin:0 auto}
  .head{background:#fdf2ee;border:1px solid #f0d2c8;border-radius:8px;padding:20px 24px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
  .brand{font-size:20px;font-weight:800;color:#2a231d}
  .brand small{display:block;font-size:12px;font-weight:600;color:#8a8378;margin-top:2px}
  .title{text-align:right}
  .title h1{margin:0;font-size:22px;font-weight:900;letter-spacing:1px;color:#d9542f;text-transform:uppercase}
  .title .per{font-size:12px;color:#8a8378;margin-top:4px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  thead th{background:#d9542f;color:#fff;text-align:left;padding:10px 12px;font-size:11px;letter-spacing:.5px;text-transform:uppercase}
  thead th:last-child{text-align:right}
  tbody td{padding:9px 12px;border-bottom:1px solid #f1ece3}
  tbody tr:nth-child(even){background:#faf8f3}
  td.amt{color:#15803d;font-weight:800;white-space:nowrap;text-align:right}
  td.run{font-weight:700;white-space:nowrap;text-align:right}
  .m{background:#f1ece3;color:#7a6f66;padding:1px 8px;border-radius:3px;font-size:11px;font-weight:700}
  tfoot td{padding:14px 12px;border-top:2px solid #d9542f;font-weight:900;font-size:15px}
  tfoot .lbl{color:#8a8378;text-transform:uppercase;font-size:12px;letter-spacing:.5px;font-weight:700}
  tfoot .tot{text-align:right;color:#15803d}
  .foot{margin-top:22px;font-size:11px;color:#b3ab9f;text-align:center}
  @media print{body{padding:0}.wrap{max-width:none}}
</style></head>
<body><div class="wrap">
  <div class="head">
    <div class="brand">Abhijit Art<small>Printing &amp; Design</small></div>
    <div class="title"><h1>Income Statement</h1><div class="per">${cb.range.from} to ${cb.range.to}</div></div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Note</th><th>Method</th><th>Amount</th><th>Running</th></tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr><td class="lbl" colspan="3">Total income · ${rows.length} ${rows.length===1?"entry":"entries"}</td><td class="tot" colspan="2">+${rupees(total)}</td></tr></tfoot>
  </table>
  <div class="foot">Generated ${fmtDate(new Date().toISOString().slice(0,10))} · Abhijit Art Expense Tracker</div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`);
    w.document.close();
  }

  // undo hides one row in every list
  const visibleExpense = filteredEntries.filter((e) => e.id !== undoToast?.entry.id);
  const visibleSalary  = salaryEntries.filter((e) => e.id !== undoToast?.entry.id);
  const visibleOutside = outsideEntries.filter((e) => e.id !== undoToast?.entry.id);
  const visibleIncome  = incomeEntries.filter((e) => e.id !== undoToast?.entry.id);

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:INK, fontVariantNumeric:"tabular-nums" }}>
      <ExpenseStyles/>

      {/* ── Undo toast ── */}
      {undoToast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:INK, color:"#fff", padding:"12px 20px", display:"flex", alignItems:"center", gap:16, zIndex:2000, fontSize:14, fontFamily:"inherit", boxShadow:"0 4px 20px rgba(0,0,0,.3)" }}>
          <span>"{undoToast.entry.title}" deleted</span>
          <button onClick={undoDelete}
            style={{ background:ACCENT, color:"#fff", border:"none", padding:"6px 14px", fontFamily:"inherit", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Undo
          </button>
        </div>
      )}

      {/* ── Top bar ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ display:"flex", border:`1px solid ${LINE}`, overflow:"hidden", flexWrap:"wrap" }}>
          {([["insights","Insights"],["salary","Salary"],["outside","Outside"],["income","Office Income"],["ledger","Ledger"]] as [Tab,string][]).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding:"10px 18px", border:"none", borderRight:`1px solid ${LINE}`, fontFamily:"inherit", fontSize:14, fontWeight:700, cursor:"pointer", background:tab===id?ACCENT:"#fff", color:tab===id?"#fff":MUTED }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flex:1, justifyContent:"flex-end", flexWrap:"wrap" }}>
          <input placeholder="🔍 Search…" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)}
            style={{ padding:"9px 14px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK, width:200 }} />
          {tab !== "income" && (
            <button onClick={() => openAdd("expense")}
              style={{ padding:"10px 20px", background:RED, border:"none", color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:14, cursor:"pointer" }}>
              + Add Expense
            </button>
          )}
        </div>
      </div>

      {/* Period control (right under tabs) */}
      <PeriodBar period={cb.period} range={cb.range} onPeriod={cb.changePeriod} onRange={cb.setCustomRange} />

            {/* Today snapshot (hidden on Office Income) */}
      {tab !== "income" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
          <div style={{ background:"#fdeaee", border:`1px solid ${RED}44`, padding:"10px 14px" }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:RED }}>Today Spent</div>
            <div style={{ fontSize:18, fontWeight:900, color:RED }}>{rupees(todaySpent)}</div>
          </div>
          <div style={{ background:WASH, border:`1px solid ${LINE}`, padding:"10px 14px" }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:MUTED }}>Today Cash Out</div>
            <div style={{ fontSize:18, fontWeight:900, color:INK }}>{rupees(todayCashOut)}</div>
          </div>
          <div style={{ background:"#e6eff9", border:`1px solid ${BLUE}44`, padding:"10px 14px" }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:BLUE }}>Today Online Out</div>
            <div style={{ fontSize:18, fontWeight:900, color:BLUE }}>{rupees(todayOnlineOut)}</div>
          </div>
        </div>
      )}

      {/* ── TAB: Insights ── */}
      {tab === "insights" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
            <KpiCard label="Total Income"  val={incTotalIn}    color={GREEN} sub={`${incomeEntries.length} entries`}/>
            <KpiCard label="Total Expense" val={periodExpense} color={RED}   sub={`${filteredEntries.length} entries`}/>
            <KpiCard label="Online"        val={onlineOut}     color={BLUE}  sub="spent"/>
            <KpiCard label="Cash"          val={cashOut}       color={INK}   sub="spent"/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
              <CardHead title="By category"/>
              {catBreakdown.length === 0 ? <Empty msg="No expenses to chart."/> : (
                <div style={{ padding:"16px", display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
                  <Donut data={catBreakdown}/>
                  <div style={{ flex:1, minWidth:150, display:"grid", gap:7 }}>
                    {catBreakdown.map((c) => (
                      <div key={c.key} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                        <span style={{ width:9, height:9, borderRadius:"50%", background:c.color, flexShrink:0 }}/>
                        <span style={{ flex:1, fontWeight:600 }}>{c.label}</span>
                        <span style={{ fontWeight:700, color:INK }}>{rupees(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
              <CardHead title="Cash vs Online (spent)"/>
              <div style={{ padding:"16px" }}>
                {periodExpense === 0 ? <Empty msg="Nothing spent yet."/> : (
                  <>
                    <div style={{ display:"flex", height:26, borderRadius:4, overflow:"hidden", border:`1px solid ${LINE}` }}>
                                            <div style={{ width:`${(cashOut/(periodExpense||1))*100}%`, background:"#94a3b8" }}/>
                      <div style={{ width:`${(onlineOut/(periodExpense||1))*100}%`, background:"#60a5fa" }}/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:12, gap:12 }}>
                      <div>
                                                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:MUTED }}><span style={{ width:9, height:9, background:"#94a3b8", borderRadius:2 }}/> Cash</div>
                        <div style={{ fontSize:18, fontWeight:900, color:"#64748b" }}>{rupees(cashOut)}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:MUTED, justifyContent:"flex-end" }}><span style={{ width:9, height:9, background:BLUE, borderRadius:2 }}/> Online</div>
                        <div style={{ fontSize:18, fontWeight:900, color:BLUE }}>{rupees(onlineOut)}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ background:"#fff", border:`1px solid ${LINE}`, marginBottom:16 }}>
            <CardHead title="Top spend by person"/>
            {topPayees.length === 0 ? <Empty msg="No person-linked spend in this period."/> : (
              <div style={{ padding:"12px 16px" }}>
                {topPayees.map((p) => {
                  const max = topPayees[0].amount || 1;
                  return (
                    <div key={p.id} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, fontSize:13 }}>
                        <span style={{ width:24, height:24, borderRadius:"50%", background:p.kind==="employee"?ACCENT:GOLD, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, flexShrink:0 }}>{initials(p.name)}</span>
                        <span style={{ fontWeight:600, flex:1 }}>{p.name}</span>
                        <span style={{ fontWeight:800, color:RED }}>−{rupees(p.amount)}</span>
                      </div>
                      <div style={{ height:7, background:LINE_SOFT, borderRadius:20, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${Math.max((p.amount/max)*100,2)}%`, background:ACCENT, borderRadius:20 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <ExpenseList rows={visibleExpense} emptyMsg="No expenses yet — add one above."
            busyId={busyId} onExport={() => exportCsv(filteredEntries, "expenses")}
            onEdit={openEdit} onDuplicate={openDuplicate} onDelete={deleteEntry} />
        </div>
      )}

      {/* ── TAB: Salary ── */}
      {tab === "salary" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
            <KpiCard label="Salary Paid" val={salaryTotal} color={BLUE} sub={PERIOD_LABEL[cb.period]}/>
            <KpiCard label="People"      val={salaryByPayee.filter(p=>p.id!=="__none__").length} color={ACCENT} money={false} sub="staff paid"/>
            <KpiCard label="Payments"    val={salaryEntries.length} color={INK} money={false} sub="entries"/>
          </div>

          <div style={{ background:"#fff", border:`1px solid ${LINE}`, padding:"12px 16px", marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:MUTED, marginBottom:10 }}>Quick Pay Salary</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {emp8.map((p) => (
                <button key={p.id} onClick={() => openAdd("expense", p.id, "salary")}
                  style={{ padding:"8px 14px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer", color:INK, display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ width:22, height:22, borderRadius:"50%", background:ACCENT, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>{initials(p.name)}</span>
                  {p.name.split(" ")[0]}
                </button>
              ))}
              <button onClick={() => openAdd("expense", undefined, "salary")}
                style={{ padding:"8px 14px", border:`1px solid ${ACCENT}44`, background:"#fdf2ee", fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer", color:ACCENT }}>
                + Other salary
              </button>
            </div>
            <div style={{ fontSize:11, color:FAINT, marginTop:8 }}>Tap a name to record salary — the <b>Salary</b> category is set for you.</div>
          </div>

          {salaryByPayee.length > 0 && (
            <div style={{ background:"#fff", border:`1px solid ${LINE}`, marginBottom:16 }}>
              <CardHead title="Salary by person"/>
              {salaryByPayee.map((p) => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderBottom:`1px solid ${LINE_SOFT}` }}>
                  <span style={{ width:32, height:32, borderRadius:"50%", background:p.kind==="employee"?ACCENT:GOLD, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{initials(p.name)}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div>
                    <div style={{ fontSize:12, color:MUTED }}>{p.count} payment{p.count>1?"s":""}</div>
                  </div>
                  <span style={{ fontWeight:800, color:RED, fontSize:14 }}>−{rupees(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <ExpenseList rows={visibleSalary} emptyMsg="No salary payments in this period."
            busyId={busyId} onExport={() => exportCsv(salaryEntries, "salary")}
            onEdit={openEdit} onDuplicate={openDuplicate} onDelete={deleteEntry} />
        </div>
      )}

      {/* ── TAB: Outside ── */}
      {tab === "outside" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
            <KpiCard label="Outside Spent" val={outsideTotal} color={"#0891b2"} sub={`everything except salary · ${PERIOD_LABEL[cb.period]}`}/>
            <KpiCard label="People"        val={outsideByPayee.filter(p=>p.id!=="__none__").length} color={ACCENT} money={false} sub="vendors/staff"/>
            <KpiCard label="Entries"       val={outsideEntries.length} color={INK} money={false} sub="expenses"/>
          </div>

          <div style={{ background:"#fff", border:`1px solid ${LINE}`, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
            <div style={{ fontSize:13, color:MUTED }}>Everything that isn't salary — materials, transport, food, bills, flex/outside work and more.</div>
            <button onClick={() => openAdd("expense")}
              style={{ padding:"8px 16px", border:"none", background:"#0891b2", color:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              + Add Expense
            </button>
          </div>

          {outsideCats.length > 0 && (
            <div style={{ background:"#fff", border:`1px solid ${LINE}`, marginBottom:16 }}>
              <CardHead title="By category"/>
              <div style={{ padding:"12px 16px" }}>
                {outsideCats.map((c) => {
                  const share = outsideTotal ? (c.amount / outsideTotal) * 100 : 0;
                  return (
                    <div key={c.key} style={{ marginBottom:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, fontSize:13 }}>
                        <span style={{ width:9, height:9, borderRadius:"50%", background:c.color, flexShrink:0 }}/>
                        <span style={{ fontWeight:600, flex:1 }}>{c.label}</span>
                        <span style={{ color:FAINT, fontSize:12 }}>{share.toFixed(0)}%</span>
                        <span style={{ fontWeight:800, color:RED, minWidth:80, textAlign:"right" }}>−{rupees(c.amount)}</span>
                      </div>
                      <div style={{ height:7, background:LINE_SOFT, borderRadius:20, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${Math.max(share,2)}%`, background:c.color, borderRadius:20 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {outsideByPayee.length > 0 && (
            <div style={{ background:"#fff", border:`1px solid ${LINE}`, marginBottom:16 }}>
              <CardHead title="Outside spend by person"/>
              {outsideByPayee.map((p) => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderBottom:`1px solid ${LINE_SOFT}` }}>
                  <span style={{ width:32, height:32, borderRadius:"50%", background:p.kind==="employee"?ACCENT:GOLD, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{initials(p.name)}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div>
                    <div style={{ fontSize:12, color:MUTED }}>{p.count} {p.count===1?"entry":"entries"}</div>
                  </div>
                  <span style={{ fontWeight:800, color:RED, fontSize:14 }}>−{rupees(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <ExpenseList rows={visibleOutside} emptyMsg="No outside expenses in this period."
            busyId={busyId} onExport={() => exportCsv(outsideEntries, "outside")}
            onEdit={openEdit} onDuplicate={openDuplicate} onDelete={deleteEntry} />
        </div>
      )}

      {/* ── TAB: Office Income ── */}
      {tab === "income" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
            <KpiCard label="Cash In"   val={incCashIn}   color={GREEN} sub={PERIOD_LABEL[cb.period]}/>
            <KpiCard label="Online In" val={incOnlineIn} color={BLUE}  sub={PERIOD_LABEL[cb.period]}/>
            <KpiCard label="Total Office Income" val={incTotalIn} color={GREEN} sub={`${incomeEntries.length} entries`}/>
          </div>

          <div style={{ background:"#fff", border:`1px solid ${LINE}`, marginBottom:16 }}>
            <CardHead title={incEditId ? "Edit office income" : "Record office income"}/>
            <div style={{ padding:"14px 16px", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <input type="number" placeholder="Amount" value={incAmt} onChange={(e) => setIncAmt(e.target.value)}
                onKeyDown={(e) => e.key==="Enter" && incSave()}
                style={{ padding:"9px 12px", border:`1px solid ${LINE}`, fontSize:15, fontWeight:800, fontFamily:"inherit", color:GREEN, width:130 }} />
              <input placeholder="Note (optional)" value={incTitle} onChange={(e) => setIncTitle(e.target.value)}
                onKeyDown={(e) => e.key==="Enter" && incSave()}
                style={{ padding:"9px 12px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK, flex:1, minWidth:160 }} />
              <div style={{ display:"flex", border:`1px solid ${LINE}`, overflow:"hidden" }}>
                <button onClick={() => setIncMethod("cash")}
                  style={{ padding:"9px 16px", border:"none", borderRight:`1px solid ${LINE}`, fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer", background:incMethod==="cash"?GREEN:"#fff", color:incMethod==="cash"?"#fff":MUTED }}>
                  💵 Cash
                </button>
                <button onClick={() => setIncMethod("online")}
                  style={{ padding:"9px 16px", border:"none", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer", background:incMethod==="online"?BLUE:"#fff", color:incMethod==="online"?"#fff":MUTED }}>
                  📱 Online
                </button>
              </div>
              <input type="date" value={incDate} onChange={(e) => setIncDate(e.target.value)}
                style={{ padding:"9px 10px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK }} />
              <button onClick={incSave} disabled={incBusy}
                style={{ padding:"9px 22px", background:GREEN, border:"none", color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:14, cursor:"pointer", opacity:incBusy?.6:1 }}>
                {incBusy ? "Saving…" : incEditId ? "Update" : "Save"}
              </button>
              {incEditId && (
                <button onClick={incReset}
                  style={{ padding:"9px 16px", background:"#fff", border:`1px solid ${LINE}`, color:MUTED, fontFamily:"inherit", fontWeight:600, fontSize:13, cursor:"pointer" }}>
                  Cancel
                </button>
              )}
              {incErr && <span style={{ fontSize:12, color:RED }}>{incErr}</span>}
            </div>
            <div style={{ padding:"0 16px 14px", fontSize:11, color:FAINT }}>Records money received at the office (cash or online). Nothing else.</div>
          </div>

          {(() => {
            const base = incFilter === "all" ? visibleIncome : visibleIncome.filter((e) => e.method === incFilter);
            const shownTotal = base.reduce((s, e) => s + e.amount, 0);
            const shownStmt = withRunning(incFilter === "all" ? incomeEntries : incomeEntries.filter((e) => e.method === incFilter));
            return (
              <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
                <div style={{ padding:"12px 16px", borderBottom:`1px solid ${LINE_SOFT}`, display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:700, fontSize:14 }}>{base.length} {base.length===1?"entry":"entries"} · {rupees(shownTotal)}</span>
                    <div style={{ display:"flex", border:`1px solid ${LINE}`, overflow:"hidden" }}>
                      {([["all","All"],["cash","Cash"],["online","Online"]] as ["all"|"cash"|"online", string][]).map(([id,label]) => (
                        <button key={id} onClick={() => setIncFilter(id)}
                          style={{ padding:"6px 13px", border:"none", borderRight:`1px solid ${LINE}`, fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer", background:incFilter===id?INK:"#fff", color:incFilter===id?"#fff":MUTED }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <button onClick={() => printIncome(shownStmt, shownStmt.reduce((s,e)=>s+e.amount,0))} disabled={!shownStmt.length}
                      style={{ padding:"6px 14px", background:INK, border:"none", color:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:shownStmt.length?"pointer":"not-allowed", opacity:shownStmt.length?1:.5 }}>
                      🖨 Statement
                    </button>
                    <button onClick={() => exportIncomeStatement(shownStmt, `office-income-${incFilter}`)} disabled={!shownStmt.length}
                      style={{ padding:"6px 14px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:shownStmt.length?"pointer":"not-allowed", color:MUTED, opacity:shownStmt.length?1:.5 }}>
                      ⭳ Export CSV
                    </button>
                  </div>
                </div>
                {base.length === 0 ? <Empty msg="No office income for this filter."/> : base.map((e) => (
                  <IncomeRow key={e.id} e={e} busy={busyId===e.id} onEdit={() => incEdit(e)} onDelete={() => deleteEntry(e)} />
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── TAB: Ledger ── */}
      {tab === "ledger" && (
        <div>
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ display:"flex", border:`1px solid ${LINE}`, overflow:"hidden", flexWrap:"wrap" }}>
              {([["person","By Person"],["statement","Full Statement"],["income","Income Ledger"]] as [LedgerView,string][]).map(([id,label]) => (
                <button key={id} onClick={() => setLedgerView(id)}
                  style={{ padding:"8px 16px", border:"none", borderRight:`1px solid ${LINE}`, fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer", background:ledgerView===id?INK:"#fff", color:ledgerView===id?"#fff":MUTED }}>
                  {label}
                </button>
              ))}
            </div>
            {ledgerView === "person" && (
              <>
                <select value={ledgerPerson} onChange={(e) => setLedgerPerson(e.target.value)}
                  style={{ padding:"8px 12px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK, background:"#fff" }}>
                  <option value="">— All people —</option>
                  {sortedPayees.map((p) => <option key={p.id} value={p.id}>{p.name}{p.phone?` · ${p.phone}`:""}</option>)}
                </select>
                <button onClick={() => { setEditPer(null); setPerError(""); setShowPer(true); }}
                  style={{ padding:"8px 14px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer", color:ACCENT }}>
                  + Add Person
                </button>
              </>
            )}
          </div>

          {ledgerView === "statement" ? (
            <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
              <CardHead title={`Expense statement · ${fullStatement.length} entries · ${rupees(periodExpense)}`}
                right={<button onClick={() => exportStatement(fullStatement, "expense-statement")} disabled={!fullStatement.length}
                  style={{ padding:"6px 14px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:fullStatement.length?"pointer":"not-allowed", color:MUTED, opacity:fullStatement.length?1:.5 }}>⭳ Export CSV</button>} />
              {fullStatement.length === 0 ? <Empty msg="No expenses in this period."/> : <StatementTable rows={fullStatement}/>}
            </div>
          ) : ledgerView === "income" ? (
            <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
              <CardHead title={`Income ledger · ${incomeStatement.length} entries · ${rupees(incTotalIn)}`}
                right={
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => printIncome(incomeStatement, incTotalIn)} disabled={!incomeStatement.length}
                      style={{ padding:"6px 14px", background:INK, border:"none", color:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:incomeStatement.length?"pointer":"not-allowed", opacity:incomeStatement.length?1:.5 }}>🖨 Statement</button>
                    <button onClick={() => exportIncomeStatement(incomeStatement, "income-statement")} disabled={!incomeStatement.length}
                      style={{ padding:"6px 14px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:incomeStatement.length?"pointer":"not-allowed", color:MUTED, opacity:incomeStatement.length?1:.5 }}>⭳ Export CSV</button>
                  </div>
                } />
              {incomeStatement.length === 0 ? <Empty msg="No office income in this period."/> : <IncomeStatementTable rows={incomeStatement}/>}
            </div>
          ) : ledgerPerson && selectedLedgerPayee ? (
            <div>
              <div style={{ padding:"14px 16px", marginBottom:12, background:WASH, border:`1px solid ${LINE}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <button onClick={() => setLedgerPerson("")} title="Back to all people"
                    style={{ background:"#fff", border:`1px solid ${LINE}`, borderRadius:4, padding:"6px 10px", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer", color:MUTED }}>←</button>
                  <span style={{ width:40, height:40, borderRadius:"50%", background:selectedLedgerPayee.kind==="employee"?ACCENT:GOLD, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700 }}>{initials(selectedLedgerPayee.name)}</span>
                  <div>
                    <div style={{ fontWeight:800, fontSize:16 }}>{selectedLedgerPayee.name}</div>
                    <div style={{ fontSize:12, color:MUTED }}>{selectedLedgerPayee.phone || "No phone"} · {selectedLedgerPayee.kind}</div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, color:MUTED, textTransform:"uppercase" as const, letterSpacing:.6, fontWeight:700 }}>Total paid</div>
                    <div style={{ fontSize:20, fontWeight:900, color:RED }}>−{rupees(personTotal)}</div>
                  </div>
                  <button onClick={() => printPerson(selectedLedgerPayee, personStatement, personTotal)} disabled={!personStatement.length}
                    style={{ padding:"8px 14px", background:INK, border:"none", color:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:personStatement.length?"pointer":"not-allowed", opacity:personStatement.length?1:.5 }}>🖨 Print</button>
                  <button onClick={() => exportStatement(personStatement, `statement-${selectedLedgerPayee.name}`)} disabled={!personStatement.length}
                    style={{ padding:"8px 14px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:personStatement.length?"pointer":"not-allowed", color:MUTED, opacity:personStatement.length?1:.5 }}>⭳ CSV</button>
                </div>
              </div>
              <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
                <CardHead title={`${personStatement.length} ${personStatement.length===1?"entry":"entries"}`}/>
                {personStatement.length === 0 ? <Empty msg="No expenses to this person in this period."/> : <StatementTable rows={personStatement}/>}
              </div>
            </div>
          ) : (
            <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
              <CardHead title={`People · ${ledgerPeople.length}`} right={
                <button onClick={syncEmployees} disabled={syncing}
                  style={{ padding:"6px 12px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:"pointer", color:MUTED }}>
                  {syncing ? "Syncing…" : "Sync employees"}
                </button>
              }/>
              {ledgerPeople.length === 0 ? <Empty msg="No person-linked expenses in this period. Pick anyone from the dropdown above."/> : ledgerPeople.map(({ p, t }) => (
                <div key={p.id} onClick={() => setLedgerPerson(p.id)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:`1px solid ${LINE_SOFT}`, cursor:"pointer" }}>
                  <span style={{ width:36, height:36, borderRadius:"50%", background:p.kind==="employee"?ACCENT:GOLD, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, flexShrink:0 }}>{initials(p.name)}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div>
                    <div style={{ fontSize:12, color:MUTED }}>{p.phone||"No phone"} · {t.count} {t.count===1?"entry":"entries"}</div>
                  </div>
                  <span style={{ fontWeight:800, color:RED, fontSize:14 }}>−{rupees(t.amount)}</span>
                  <span style={{ color:MUTED, fontSize:12 }}>→</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {showEntry && (
        <EntryModal
          editing={editEntry} startKind={startKind} payees={sortedPayees}
          saving={savingEntry} error={entryError}
          defaultPayeeId={seedPayee || cb.payeeId || undefined}
          defaultCategory={seedCat}
          onCreatePayee={createPayeeInline}
          onSyncEmployees={syncEmployees} syncing={syncing}
          onSave={saveEntry} onClose={() => setShowEntry(false)}
        />
      )}
      {showPer && (
        <PersonModal
          editing={editPer} payees={sortedPayees}
          saving={savingPer} error={perError}
          onSave={savePerson} onClose={() => setShowPer(false)}
        />
      )}
    </div>
  );
}