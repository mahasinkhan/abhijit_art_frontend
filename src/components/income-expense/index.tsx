// src/components/income-expense/index.tsx
import { useState, useMemo } from "react";
import { useIncomeExpense, PERIOD_LABEL, type Period } from "../../hooks/useIncomeExpense";
import { usePayees } from "../../hooks/usePayees";
import type { Entry, EntryInput, TxnKind, TxnCategory } from "../../services/incomeExpense.api";
import { CATEGORY_META, EXPENSE_CATS } from "../../services/incomeExpense.api";
import type { Payee, PayeeInput, PayeeKind } from "../../services/payee.api";
import { EntryModal }  from "./EntryModal";
import { PersonModal } from "./PersonModal";
import {
  rupees, rupeesExact, initials, toCsv, downloadCsv,
  METHOD_META,
  ACCENT, ACCENT_DK, INK, MUTED, FAINT, LINE, LINE_SOFT, WASH, GOLD, GREEN, RED, BLUE,
} from "./types";

type Tab = "insights" | "salary" | "outside" | "ledger";
type LedgerView = "person" | "statement";

const PERIODS: Period[] = ["today", "week", "month", "year", "all"];

// quick-bar categories (salary excluded — it needs a person, handled in the Salary tab)
const QUICK_CATS = EXPENSE_CATS.filter((c) => c !== "salary") as TxnCategory[];

function fmtDate(d: string) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${dt.getFullYear()}`;
}

export default function IncomeExpense() {
  const cb = useIncomeExpense();
  const pp = usePayees();

  const [tab, setTab] = useState<Tab>("insights");
  const [globalSearch, setGlobalSearch] = useState("");

  // ledger
  const [ledgerView,   setLedgerView]   = useState<LedgerView>("person");
  const [ledgerPerson, setLedgerPerson] = useState("");

  // entry modal
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

  // quick entry (expense only)
  const [quickAmt,    setQuickAmt]     = useState("");
  const [quickTitle,  setQuickTitle]   = useState("");
  const [quickCat,    setQuickCat]     = useState<TxnCategory>("other");
  const [quickMethod, setQuickMethod]  = useState<"cash"|"online">("cash");
  const [quickBusy,   setQuickBusy]    = useState(false);
  const [quickErr,    setQuickErr]     = useState("");
  const [quickPayeeId, setQuickPayeeId] = useState("");

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

  async function quickSave() {
    const amt = Number(quickAmt);
    if (!quickTitle.trim() || !Number.isFinite(amt) || amt <= 0) { setQuickErr("Enter amount and description."); return; }
    setQuickBusy(true); setQuickErr("");
    try {
      await cb.create({
        kind: "expense", date: new Date().toISOString().slice(0,10),
        category: quickCat,
        title: quickTitle.trim(), amount: Math.round(amt * 100) / 100,
        method: quickMethod, payeeId: quickPayeeId || null, notes: "",
      });
      setQuickAmt(""); setQuickTitle(""); pp.reload();
    } catch (err: any) { setQuickErr(err.response?.data?.error || "Could not save."); }
    finally { setQuickBusy(false); }
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

  // ── derived data (EXPENSE ONLY) ───────────────────────────────────────
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

  const salaryEntries  = useMemo(() => filteredEntries.filter((e) => e.category === "salary"),  [filteredEntries]);
  const outsideEntries = useMemo(() => filteredEntries.filter((e) => e.category === "outside"), [filteredEntries]);

  const periodExpense = useMemo(() => filteredEntries.reduce((s, e) => s + e.amount, 0), [filteredEntries]);
  const cashOut       = useMemo(() => filteredEntries.filter((e) => e.method === "cash").reduce((s, e) => s + e.amount, 0), [filteredEntries]);
  const onlineOut     = useMemo(() => filteredEntries.filter((e) => e.method === "online").reduce((s, e) => s + e.amount, 0), [filteredEntries]);

  const salaryTotal   = useMemo(() => salaryEntries.reduce((s, e) => s + e.amount, 0), [salaryEntries]);
  const outsideTotal  = useMemo(() => outsideEntries.reduce((s, e) => s + e.amount, 0), [outsideEntries]);

  // today (independent of period)
  const todayStr = new Date().toISOString().slice(0,10);
  const todayExp = allEntries.filter((e) => e.kind === "expense" && e.date.slice(0,10) === todayStr);
  const todaySpent     = todayExp.reduce((s, e) => s + e.amount, 0);
  const todayCashOut   = todayExp.filter((e) => e.method === "cash").reduce((s, e) => s + e.amount, 0);
  const todayOnlineOut = todayExp.filter((e) => e.method === "online").reduce((s, e) => s + e.amount, 0);

  // expense category breakdown
  const catBreakdown = useMemo(() => {
    const map = new Map<string, { key: string; label: string; amount: number; count: number; color: string }>();
    for (const e of filteredEntries) {
      const meta = CATEGORY_META[e.category];
      if (!map.has(e.category)) map.set(e.category, { key: e.category, label: meta?.label || e.category, amount: 0, count: 0, color: meta?.color || MUTED });
      const c = map.get(e.category)!; c.amount += e.amount; c.count += 1;
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [filteredEntries]);

  // per-person groupings
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
  const outsideByPayee = useMemo(() => groupByPayee(outsideEntries), [outsideEntries]);
  const topPayees      = useMemo(() => groupByPayee(filteredEntries).filter((p) => p.id !== "__none__").slice(0, 8), [filteredEntries]);

  const sortedPayees = useMemo(() => [...pp.payees].sort((a, b) => a.name.localeCompare(b.name)), [pp.payees]);

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
  const withRunning = (rows: Entry[]) => {
    let run = 0;
    return [...rows].sort(byDate).map((e) => { run = Math.round((run + e.amount) * 100) / 100; return { ...e, running: run }; });
  };

  const fullStatement   = useMemo(() => withRunning(filteredEntries), [filteredEntries]);
  const personStatement = useMemo(() => withRunning(ledgerPerson ? filteredEntries.filter((e) => e.payeeId === ledgerPerson) : []), [filteredEntries, ledgerPerson]);
  const personTotal     = useMemo(() => personStatement.reduce((s, e) => s + e.amount, 0), [personStatement]);
  const selectedLedgerPayee = sortedPayees.find((p) => p.id === ledgerPerson);

  function exportCsv(rows: Entry[], name: string) {
    const header = ["Date", "Details", "Category", "Person", "Method", "Amount", "Notes"];
    const body = rows.map((e) => [
      fmtDate(e.date.slice(0,10)), e.title,
      CATEGORY_META[e.category]?.label || e.category,
      e.payee?.name || "", e.method, e.amount, e.notes || "",
    ]);
    downloadCsv(`${name}-${cb.range.from}-to-${cb.range.to}.csv`, toCsv([header, ...body]));
  }
  function exportStatement(rows: (Entry & { running: number })[], name: string) {
    const header = ["Date", "Details", "Category", "Person", "Method", "Amount", "Running total"];
    const body = rows.map((e) => [
      fmtDate(e.date.slice(0,10)), e.title,
      CATEGORY_META[e.category]?.label || e.category,
      e.payee?.name || "", e.method, e.amount, e.running,
    ]);
    downloadCsv(`${name}-${cb.range.from}-to-${cb.range.to}.csv`, toCsv([header, ...body]));
  }
  function printPerson(p: Payee, rows: (Entry & { running: number })[], total: number) {
    const lines = rows.map((e) =>
      `${fmtDate(e.date.slice(0,10))}  |  ${e.title}  |  ${CATEGORY_META[e.category]?.label || e.category}  |  ${e.method}  |  -${rupeesExact(e.amount)}  |  ${rupees(e.running)}`
    ).join("\n");
    const w = window.open("", "_blank", "width=780,height=640");
    if (!w) return;
    w.document.write(`<pre style="font-family:monospace;padding:22px;font-size:13px;line-height:1.6"><b>${p.name} — Expense Statement</b>\n${p.phone || ""}\nPeriod: ${cb.range.from} to ${cb.range.to}\n${"-".repeat(78)}\n${lines}\n${"-".repeat(78)}\nTotal paid: -${rupees(total)}</pre>`);
    w.document.close(); w.print();
  }

  // ── Entry row ─────────────────────────────────────────────────────────
  function EntryRow({ e }: { e: Entry }) {
    const cat = CATEGORY_META[e.category];
    const met = METHOD_META[e.method];
    if (undoToast?.entry.id === e.id) return null;
    return (
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderBottom:`1px solid ${LINE_SOFT}`, background:"#fff", opacity: busyId===e.id ? .5 : 1 }}>
        <div style={{ width:3, alignSelf:"stretch", background:RED, flexShrink:0 }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:14, fontWeight:600, color:INK }}>{e.title}</span>
            <span style={{ fontSize:11, fontWeight:700, color:cat?.color, background:`${cat?.color}14`, padding:"1px 7px" }}>{cat?.label}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4, fontSize:12, color:MUTED, flexWrap:"wrap" }}>
            <span>{fmtDate(e.date.slice(0,10))}</span>
            <span style={{ background:met.bg, color:met.color, padding:"1px 7px", fontWeight:700, fontSize:11 }}>{met.label}</span>
            {e.payee && <span style={{ fontWeight:600, color:INK }}>{e.payee.name}</span>}
            {e.notes && <span style={{ fontStyle:"italic", color:FAINT }}>{e.notes}</span>}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          <span style={{ fontSize:15, fontWeight:800, color:RED }}>−{rupeesExact(e.amount)}</span>
          <button onClick={() => openEdit(e)} style={st.btn}>Edit</button>
          <button onClick={() => openDuplicate(e)} style={st.btn} title="Duplicate entry">⎘</button>
          <button onClick={() => deleteEntry(e)} style={{ ...st.btn, color:RED, borderColor:`${RED}55` }}>Delete</button>
        </div>
      </div>
    );
  }

  // ── Statement table (ledger) ──────────────────────────────────────────
  function StatementTable({ rows }: { rows: (Entry & { running: number })[] }) {
    return (
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:WASH }}>
              {["Date","Details","Category","Person","Method","Amount","Running"].map((h) => (
                <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:MUTED, borderBottom:`1px solid ${LINE}`, whiteSpace:"nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((e, idx) => {
              const cat = CATEGORY_META[e.category];
              const met = METHOD_META[e.method];
              return (
                <tr key={e.id} style={{ background: idx%2===0?"#fff":WASH }}>
                  <td style={st.td}>{fmtDate(e.date.slice(0,10))}</td>
                  <td style={{ ...st.td, fontWeight:600, color:INK }}>{e.title}{e.notes && <span style={{ color:FAINT, fontWeight:400, marginLeft:6, fontStyle:"italic" }}>{e.notes}</span>}</td>
                  <td style={st.td}><span style={{ color:cat?.color, fontWeight:700, fontSize:11 }}>{cat?.label}</span></td>
                  <td style={{ ...st.td, color:MUTED }}>{e.payee?.name || "—"}</td>
                  <td style={st.td}><span style={{ background:met.bg, color:met.color, padding:"1px 7px", fontSize:11, fontWeight:700 }}>{met.label}</span></td>
                  <td style={{ ...st.td, fontWeight:700, color:RED, whiteSpace:"nowrap" as const }}>−{rupeesExact(e.amount)}</td>
                  <td style={{ ...st.td, fontWeight:700, color:INK, whiteSpace:"nowrap" as const }}>{rupees(e.running)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function PeriodBar() {
    return (
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
        <div style={{ display:"flex", border:`1px solid ${LINE}`, overflow:"hidden" }}>
          {PERIODS.map((p) => (
            <button key={p} onClick={() => cb.changePeriod(p)}
              style={{ padding:"8px 14px", border:"none", borderRight:`1px solid ${LINE}`, fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer", background:cb.period===p?INK:"#fff", color:cb.period===p?"#fff":MUTED }}>
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
        <input type="date" value={cb.range.from} onChange={(e) => cb.setCustomRange(e.target.value, cb.range.to)}
          style={{ padding:"8px 10px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK }} />
        <span style={{ color:MUTED, fontSize:12 }}>to</span>
        <input type="date" value={cb.range.to} onChange={(e) => cb.setCustomRange(cb.range.from, e.target.value)}
          style={{ padding:"8px 10px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK }} />
      </div>
    );
  }

  function Empty({ msg }: { msg: string }) {
    return <div style={{ padding:"40px 24px", textAlign:"center", color:FAINT, fontSize:14 }}>{msg}</div>;
  }

  function KpiCard({ label, val, color, sub, money = true }: { label:string; val:number; color:string; sub?:string; money?:boolean }) {
    return (
      <div style={{ background:"#fff", border:`1px solid ${LINE}`, borderTop:`3px solid ${color}`, padding:"16px 18px" }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.8, color:MUTED, marginBottom:6 }}>{label}</div>
        <div style={{ fontSize:24, fontWeight:900, color }}>{money ? rupees(val) : val}</div>
        {sub && <div style={{ fontSize:11, color:FAINT, marginTop:4 }}>{sub}</div>}
      </div>
    );
  }

  function CardHead({ title, right }: { title: string; right?: React.ReactNode }) {
    return (
      <div style={{ padding:"12px 16px", borderBottom:`1px solid ${LINE_SOFT}`, fontWeight:700, fontSize:14, display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
        <span>{title}</span>{right}
      </div>
    );
  }
  function CsvBtn({ rows, name }: { rows: Entry[]; name: string }) {
    return (
      <button onClick={() => exportCsv(rows, name)} disabled={rows.length===0}
        style={{ padding:"6px 14px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:rows.length?"pointer":"not-allowed", color:MUTED, opacity:rows.length?1:.5 }}>
        ⭳ Export CSV
      </button>
    );
  }

  function ExpenseList({ rows, name, emptyMsg }: { rows: Entry[]; name: string; emptyMsg: string }) {
    return (
      <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
        <CardHead title={`${rows.length} ${rows.length===1?"entry":"entries"} · ${rupees(rows.reduce((s,e)=>s+e.amount,0))}`} right={<CsvBtn rows={rows} name={name}/>} />
        {rows.length === 0 ? <Empty msg={emptyMsg}/> : rows.map((e) => <EntryRow key={e.id} e={e}/>)}
      </div>
    );
  }

  const emp8 = sortedPayees.filter((p) => p.kind === "employee").slice(0, 8);

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:INK, fontVariantNumeric:"tabular-nums" }}>
      <style>{`
        .ie-ov { position:fixed; inset:0; background:rgba(31,36,48,.5); z-index:1000; display:flex; align-items:center; justify-content:center; padding:24px 20px; }
        .ie-modal { background:#fff; width:100%; max-width:620px; border-radius:4px; position:relative; display:flex; flex-direction:column; max-height:calc(100vh - 48px); overflow:hidden; }
        .ie-modal.wide { max-width:1100px; }
        .ie-modal.small { max-width:520px; }
        .ie-mhead { padding:22px 26px 17px; border-bottom:1px solid #e7e1d7; flex-shrink:0; }
        .ie-mtitle { font-size:1.05rem; font-weight:700; }
        .ie-msub { font-size:.8rem; color:#8a8378; margin-top:4px; line-height:1.5; }
        .ie-mbody { padding:20px 26px 26px; overflow-y:auto; flex:1 1 auto; min-height:0; }
        .ie-mbody::-webkit-scrollbar { width:5px; }
        .ie-mbody::-webkit-scrollbar-thumb { background:#e7e1d7; border-radius:10px; }
        .ie-close { position:absolute; top:15px; right:18px; background:none; border:none; font-size:1.4rem; line-height:1; cursor:pointer; color:#8a8378; z-index:1; }
        .ie-close:hover { color:#2a231d; }
        .ie-err { background:#fef2ee; border:1px solid #f0d2c8; color:#b23c1c; padding:10px 13px; border-radius:3px; font-size:.84rem; margin-bottom:12px; }
        .ie-err.small { padding:7px 10px; font-size:.8rem; margin-bottom:10px; }
        .ie-kindsel { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:18px; }
        .ie-kindbtn { border:1px solid #e7e1d7; background:#fff; border-radius:3px; padding:13px; cursor:pointer; font-family:inherit; text-align:left; color:#8a8378; }
        .ie-kindbtn b { display:block; font-size:.95rem; }
        .ie-kindbtn span { display:block; font-size:.72rem; margin-top:3px; }
        .ie-kindbtn:hover { background:#faf8f3; }
        .ie-kindbtn.on.in  { border-color:${GREEN}; background:#e7f5eb; color:${GREEN}; }
        .ie-kindbtn.on.out { border-color:${RED}; background:#fdeaee; color:${RED}; }
        .ie-mgrid { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:20px; align-items:start; }
        .ie-mcol { display:grid; gap:15px; align-content:start; }
        .ie-2col { display:grid; grid-template-columns:1fr 1fr; gap:13px; }
        .ie-lbl { display:block; font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#8a8378; margin-bottom:6px; }
        .ie-opt { text-transform:none; letter-spacing:0; font-weight:500; color:#b3ab9f; }
        .ie-inp { width:100%; padding:10px 12px; border:1px solid #e7e1d7; border-radius:3px; font-size:.9rem; font-family:inherit; color:#2a231d; background:#fff; }
        .ie-inp:focus { outline:none; border-color:${ACCENT}; }
        .ie-amtinp { font-size:1.1rem; font-weight:800; }
        .ie-hint { font-size:.74rem; color:#b3ab9f; margin-top:6px; line-height:1.5; }
        .ie-hint.center { text-align:center; margin-top:0; }
        .ie-grid { display:grid; gap:15px; }
        .ie-cats { display:flex; flex-wrap:wrap; gap:7px; }
        .ie-cat-pick { display:inline-flex; align-items:center; gap:6px; border:1px solid #e7e1d7; background:#fff; border-radius:3px; padding:7px 12px; font-size:.8rem; font-weight:600; cursor:pointer; font-family:inherit; color:#8a8378; }
        .ie-cat-pick i { width:7px; height:7px; border-radius:50%; }
        .ie-cat-pick:hover:not(.on) { background:#faf8f3; }
        .ie-cat-pick.on { font-weight:700; }
        .ie-seg { display:inline-flex; border:1px solid #e7e1d7; border-radius:3px; overflow:hidden; background:#fff; }
        .ie-seg.full { display:flex; width:100%; }
        .ie-seg button { padding:9px 14px; border:none; border-right:1px solid #e7e1d7; background:#fff; font-size:.8rem; font-weight:600; cursor:pointer; font-family:inherit; color:#8a8378; white-space:nowrap; }
        .ie-seg.full button { flex:1; }
        .ie-seg button:last-child { border-right:none; }
        .ie-seg button:hover:not(.on):not(:disabled) { background:#faf8f3; color:#2a231d; }
        .ie-seg button.on { background:#2a231d; color:#fff; }
        .ie-seg button.on.green { background:${GREEN}; }
        .ie-seg button.on.red { background:${RED}; }
        .ie-seg button:disabled { opacity:.45; cursor:not-allowed; }
        .ie-seg.tiny button { padding:7px 8px; font-size:.75rem; }
        .ie-seg.tiny button em { font-style:normal; opacity:.65; margin-left:4px; }
        .ie-save { color:#fff; border:none; border-radius:3px; padding:13px; width:100%; font-size:.92rem; font-weight:700; cursor:pointer; font-family:inherit; margin-top:4px; }
        .ie-save:disabled { opacity:.45; cursor:not-allowed; }
        .ie-picker { border:1px solid #e7e1d7; border-radius:3px; padding:11px; background:#faf8f3; }
        .ie-plist { margin-top:9px; max-height:210px; overflow-y:auto; background:#fff; border:1px solid #e7e1d7; border-radius:3px; }
        .ie-plist::-webkit-scrollbar { width:5px; }
        .ie-plist::-webkit-scrollbar-thumb { background:#e7e1d7; border-radius:10px; }
        .ie-pitem { display:flex; align-items:center; gap:10px; width:100%; text-align:left; background:none; border:none; border-bottom:1px solid #f1ece3; padding:9px 12px; cursor:pointer; font-family:inherit; color:#2a231d; }
        .ie-pitem:last-child { border-bottom:none; }
        .ie-pitem:hover { background:#faf8f3; }
        .ie-pitem-main { flex:1; min-width:0; }
        .ie-pitem-name { display:block; font-size:.86rem; font-weight:600; }
        .ie-pitem-sub { display:block; font-size:.72rem; color:#8a8378; margin-top:1px; }
        .ie-pitem-amt { font-size:.72rem; font-weight:700; white-space:nowrap; flex-shrink:0; }
        .ie-pactions { display:grid; gap:7px; margin-top:9px; }
        .ie-addp { width:100%; background:#fff; border:1px dashed #e7e1d7; color:${ACCENT}; border-radius:3px; padding:9px; font-size:.82rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ie-addp:hover { border-color:${ACCENT}; background:#fdf2ee; }
        .ie-picked { display:flex; align-items:center; gap:12px; border:1px solid ${ACCENT}; background:#fdf2ee; border-radius:3px; padding:12px 14px; }
        .ie-picked-main { flex:1; min-width:0; }
        .ie-picked-name { font-size:.92rem; font-weight:700; }
        .ie-picked-sub { font-size:.76rem; color:#8a8378; margin-top:2px; }
        .ie-picked-bal { font-size:.76rem; font-weight:700; margin-top:4px; }
        .ie-change { background:#fff; border:1px solid #e7e1d7; border-radius:3px; padding:6px 13px; font-size:.76rem; font-weight:700; cursor:pointer; font-family:inherit; color:#2a231d; flex-shrink:0; }
        .ie-change:hover { background:#faf8f3; }
        .ie-newp { border:1px solid #e7e1d7; border-radius:3px; padding:13px; background:#faf8f3; }
        .ie-newp-h { display:flex; align-items:center; justify-content:space-between; margin-bottom:11px; }
        .ie-newp-h b { font-size:.84rem; }
        .ie-clash { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; background:#fdf3d9; border:1px solid #f0e0b4; border-radius:3px; padding:9px 12px; margin-top:10px; font-size:.8rem; color:#8a6b1f; }
        .ie-usebtn { background:${GOLD}; color:#fff; border:none; border-radius:3px; padding:6px 13px; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ie-savep { width:100%; margin-top:13px; background:${ACCENT}; color:#fff; border:none; border-radius:3px; padding:11px; font-size:.86rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ie-savep:hover:not(:disabled) { background:${ACCENT_DK}; }
        .ie-savep:disabled { opacity:.45; cursor:not-allowed; }
        .ie-ghost { background:#fff; border:1px solid #e7e1d7; color:#2a231d; border-radius:3px; padding:9px 15px; font-size:.8rem; font-weight:600; cursor:pointer; font-family:inherit; }
        .ie-ghost:hover:not(:disabled) { background:#faf8f3; }
        .ie-ghost:disabled { opacity:.5; cursor:not-allowed; }
        .ie-link { background:none; border:none; color:${ACCENT}; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; padding:4px 2px; }
        .ie-check { display:inline-flex; align-items:center; gap:7px; font-size:.8rem; color:#8a8378; cursor:pointer; }
        .ie-check input { accent-color:${ACCENT}; }
        .ie-check.standalone { padding:4px 0; }
        .ie-pempty { padding:22px 12px; text-align:center; color:#b3ab9f; font-size:.84rem; }
        .ie-pempty b { display:block; color:#2a231d; font-weight:700; margin-bottom:3px; }
        .ie-av { width:30px; height:30px; border-radius:50%; color:#fff; font-size:.7rem; font-weight:700; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ie-av.sm { width:18px; height:18px; font-size:.55rem; }
        .ie-av.lg { width:38px; height:38px; font-size:.82rem; }
        @media (max-width:860px) { .ie-mgrid { grid-template-columns:1fr; } .ie-2col { grid-template-columns:1fr; } }
      `}</style>

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
        <div style={{ display:"flex", border:`1px solid ${LINE}`, overflow:"hidden" }}>
          {([["insights","Insights"],["salary","Salary"],["outside","Outside"],["ledger","Ledger"]] as [Tab,string][]).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding:"10px 20px", border:"none", borderRight:`1px solid ${LINE}`, fontFamily:"inherit", fontSize:14, fontWeight:700, cursor:"pointer", background:tab===id?ACCENT:"#fff", color:tab===id?"#fff":MUTED }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flex:1, justifyContent:"flex-end", flexWrap:"wrap" }}>
          <input
            placeholder="🔍 Search expenses…"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            style={{ padding:"9px 14px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK, width:220 }}
          />
          <button onClick={() => openAdd("expense")}
            style={{ padding:"10px 20px", background:RED, border:"none", color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:14, cursor:"pointer" }}>
            + Add Expense
          </button>
        </div>
      </div>

      {/* ── Today's snapshot (always visible) ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
        <div style={{ background:"#fdeaee", border:`1px solid ${RED}44`, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>💸</span>
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:RED }}>Today Spent</div>
            <div style={{ fontSize:18, fontWeight:900, color:RED }}>{rupees(todaySpent)}</div>
          </div>
        </div>
        <div style={{ background:WASH, border:`1px solid ${LINE}`, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>💵</span>
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:MUTED }}>Today Cash Out</div>
            <div style={{ fontSize:18, fontWeight:900, color:INK }}>{rupees(todayCashOut)}</div>
          </div>
        </div>
        <div style={{ background:"#e6eff9", border:`1px solid ${BLUE}44`, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>📱</span>
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:BLUE }}>Today Online Out</div>
            <div style={{ fontSize:18, fontWeight:900, color:BLUE }}>{rupees(todayOnlineOut)}</div>
          </div>
        </div>
      </div>

      {/* ── Quick expense bar (always visible) ── */}
      <div style={{ background:"#fff", border:`1px solid ${LINE}`, padding:"12px 16px", marginBottom:16, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ fontSize:12, fontWeight:800, textTransform:"uppercase" as const, letterSpacing:.6, color:RED }}>Quick spend</span>
        <input type="number" placeholder="Amount" value={quickAmt} onChange={(e) => setQuickAmt(e.target.value)}
          style={{ padding:"8px 12px", border:`1px solid ${LINE}`, fontSize:14, fontWeight:700, fontFamily:"inherit", color:RED, width:110 }} />
        <input placeholder="What for?" value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => e.key==="Enter" && quickSave()}
          style={{ padding:"8px 12px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK, flex:1, minWidth:140 }} />
        <select value={quickCat} onChange={(e) => setQuickCat(e.target.value as TxnCategory)}
          style={{ padding:"8px 10px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK, background:"#fff" }}>
          {QUICK_CATS.map((c) => <option key={c} value={c}>{CATEGORY_META[c]?.label || c}</option>)}
        </select>
        <div style={{ display:"flex", border:`1px solid ${LINE}`, overflow:"hidden" }}>
          <button onClick={() => setQuickMethod("cash")}
            style={{ padding:"8px 14px", border:"none", borderRight:`1px solid ${LINE}`, fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer", background:quickMethod==="cash"?INK:"#fff", color:quickMethod==="cash"?"#fff":MUTED }}>
            Cash
          </button>
          <button onClick={() => setQuickMethod("online")}
            style={{ padding:"8px 14px", border:"none", fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer", background:quickMethod==="online"?INK:"#fff", color:quickMethod==="online"?"#fff":MUTED }}>
            Online
          </button>
        </div>
        <select value={quickPayeeId} onChange={(e) => setQuickPayeeId(e.target.value)}
          style={{ padding:"8px 10px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:quickPayeeId?INK:MUTED, background:"#fff", maxWidth:160 }}>
          <option value="">Person (optional)</option>
          {sortedPayees.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={quickSave} disabled={quickBusy}
          style={{ padding:"8px 20px", background:RED, border:"none", color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:13, cursor:"pointer", opacity:quickBusy?.6:1 }}>
          {quickBusy ? "Saving…" : "Save"}
        </button>
        {quickErr && <span style={{ fontSize:12, color:RED }}>{quickErr}</span>}
      </div>

      {/* Period control (shared by all tabs) */}
      <PeriodBar/>

      {/* ── TAB: Insights (default) ── */}
      {tab === "insights" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
            <KpiCard label="Total Expense" val={periodExpense} color={RED} sub={`${filteredEntries.length} entries · ${PERIOD_LABEL[cb.period]}`}/>
            <KpiCard label="Cash Out"   val={cashOut}   color={INK}/>
            <KpiCard label="Online Out" val={onlineOut} color={BLUE}/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            {/* Category donut */}
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

            {/* Cash vs Online */}
            <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
              <CardHead title="Cash vs Online"/>
              <div style={{ padding:"16px" }}>
                {periodExpense === 0 ? <Empty msg="Nothing spent yet."/> : (
                  <>
                    <div style={{ display:"flex", height:26, borderRadius:4, overflow:"hidden", border:`1px solid ${LINE}` }}>
                      <div style={{ width:`${(cashOut/(periodExpense||1))*100}%`, background:INK }}/>
                      <div style={{ width:`${(onlineOut/(periodExpense||1))*100}%`, background:BLUE }}/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:12, gap:12 }}>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:MUTED }}><span style={{ width:9, height:9, background:INK, borderRadius:2 }}/> Cash</div>
                        <div style={{ fontSize:18, fontWeight:900, color:INK }}>{rupees(cashOut)}</div>
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

          {/* Top payees */}
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

          {/* All expenses list */}
          <ExpenseList rows={filteredEntries} name="expenses" emptyMsg="No expenses yet — add one above."/>
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
                  <span style={{ width:22, height:22, borderRadius:"50%", background:ACCENT, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>
                    {initials(p.name)}
                  </span>
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
                  <span style={{ width:32, height:32, borderRadius:"50%", background:p.kind==="employee"?ACCENT:GOLD, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>
                    {initials(p.name)}
                  </span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div>
                    <div style={{ fontSize:12, color:MUTED }}>{p.count} payment{p.count>1?"s":""}</div>
                  </div>
                  <span style={{ fontWeight:800, color:RED, fontSize:14 }}>−{rupees(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <ExpenseList rows={salaryEntries} name="salary" emptyMsg="No salary payments in this period."/>
        </div>
      )}

      {/* ── TAB: Outside ── */}
      {tab === "outside" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
            <KpiCard label="Outside Spent"  val={outsideTotal} color={"#0891b2"} sub={PERIOD_LABEL[cb.period]}/>
            <KpiCard label="People"         val={outsideByPayee.filter(p=>p.id!=="__none__").length} color={ACCENT} money={false} sub="vendors/staff"/>
            <KpiCard label="Entries"        val={outsideEntries.length} color={INK} money={false} sub="jobs"/>
          </div>

          <div style={{ background:"#fff", border:`1px solid ${LINE}`, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
            <div style={{ fontSize:13, color:MUTED }}>Flex, hoarding, laser, CNC or any work outsourced / done outside.</div>
            <button onClick={() => openAdd("expense", undefined, "outside")}
              style={{ padding:"8px 16px", border:"none", background:"#0891b2", color:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              + Add Outside Work
            </button>
          </div>

          {outsideByPayee.length > 0 && (
            <div style={{ background:"#fff", border:`1px solid ${LINE}`, marginBottom:16 }}>
              <CardHead title="Outside spend by person"/>
              {outsideByPayee.map((p) => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderBottom:`1px solid ${LINE_SOFT}` }}>
                  <span style={{ width:32, height:32, borderRadius:"50%", background:p.kind==="employee"?ACCENT:GOLD, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>
                    {initials(p.name)}
                  </span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div>
                    <div style={{ fontSize:12, color:MUTED }}>{p.count} job{p.count>1?"s":""}</div>
                  </div>
                  <span style={{ fontWeight:800, color:RED, fontSize:14 }}>−{rupees(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <ExpenseList rows={outsideEntries} name="outside" emptyMsg="No outside work recorded in this period."/>
        </div>
      )}

      {/* ── TAB: Ledger ── */}
      {tab === "ledger" && (
        <div>
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ display:"flex", border:`1px solid ${LINE}`, overflow:"hidden" }}>
              {([["person","By Person"],["statement","Full Statement"]] as [LedgerView,string][]).map(([id,label]) => (
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
              <CardHead
                title={`Full statement · ${fullStatement.length} entries · ${rupees(periodExpense)}`}
                right={
                  <button onClick={() => exportStatement(fullStatement, "statement")} disabled={!fullStatement.length}
                    style={{ padding:"6px 14px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:fullStatement.length?"pointer":"not-allowed", color:MUTED, opacity:fullStatement.length?1:.5 }}>
                    ⭳ Export CSV
                  </button>
                }
              />
              {fullStatement.length === 0 ? <Empty msg="No expenses in this period."/> : <StatementTable rows={fullStatement}/>}
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

// ── zero-dependency donut ───────────────────────────────────────────────
function Donut({ data }: { data: { label: string; amount: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0) || 1;
  const R = 62, C = 2 * Math.PI * R, cx = 80, cy = 80, W = 22;
  let acc = 0;
  return (
    <svg viewBox="0 0 160 160" width={150} height={150} style={{ flexShrink:0 }}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={LINE_SOFT} strokeWidth={W}/>
      {data.map((d, i) => {
        const frac = d.amount / total;
        const seg = (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={d.color} strokeWidth={W}
            strokeDasharray={`${frac * C} ${C - frac * C}`} strokeDashoffset={-acc * C}
            transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt"/>
        );
        acc += frac;
        return seg;
      })}
      <text x={cx} y={cy - 3} textAnchor="middle" fontSize={10} fontWeight={700} fill={MUTED}>Total</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={15} fontWeight={800} fill={INK}>{rupees(total)}</text>
    </svg>
  );
}

const st: Record<string, React.CSSProperties> = {
  btn: { padding:"4px 10px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:"pointer", color:MUTED, whiteSpace:"nowrap" },
  td:  { padding:"10px 14px", borderBottom:`1px solid ${LINE_SOFT}`, verticalAlign:"middle" },
};