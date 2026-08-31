// src/components/income-expense/index.tsx
import { useState, useMemo, useRef } from "react";
import { useIncomeExpense, PERIOD_LABEL, type Period } from "../../hooks/useIncomeExpense";
import { usePayees } from "../../hooks/usePayees";
import type { Entry, EntryInput, TxnKind, TxnCategory } from "../../services/incomeExpense.api";
import { CATEGORY_META } from "../../services/incomeExpense.api";
import type { Payee, PayeeInput, PayeeKind } from "../../services/payee.api";
import { EntryModal }  from "./EntryModal";
import { PersonModal } from "./PersonModal";
import {
  rupees, rupeesExact, fmtDayLabel, initials,
  KIND_META, METHOD_META,
  ACCENT, ACCENT_DK, INK, MUTED, FAINT, LINE, LINE_SOFT, WASH, GOLD, GREEN, RED, BLUE,
} from "./types";

type Tab = "overview" | "ledger";
type LedgerView = "category" | "employee" | "statement";

const PERIODS: Period[] = ["today", "week", "month", "year", "all"];

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

  const [tab, setTab] = useState<Tab>("overview");
  const [ledgerView, setLedgerView] = useState<LedgerView>("statement");
  const [ledgerCat,  setLedgerCat]  = useState("");
  const [ledgerEmp,  setLedgerEmp]  = useState("");
  const [globalSearch, setGlobalSearch] = useState("");

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
  const [undoToast, setUndoToast]   = useState<{ entry: Entry; timer: ReturnType<typeof setTimeout> } | null>(null);
  const undoRef = useRef<typeof undoToast>(null);

  // person modal
  const [showPer,   setShowPer]   = useState(false);
  const [editPer,   setEditPer]   = useState<Payee | null>(null);
  const [savingPer, setSavingPer] = useState(false);
  const [perError,  setPerError]  = useState("");
  const [syncing,   setSyncing]   = useState(false);

  // quick entry
  const [quickKind,   setQuickKind]   = useState<TxnKind>("income");
  const [quickAmt,    setQuickAmt]    = useState("");
  const [quickTitle,  setQuickTitle]  = useState("");
  const [quickMethod, setQuickMethod] = useState<"cash"|"online">("cash");
  const [quickBusy,   setQuickBusy]   = useState(false);
    const [quickErr,    setQuickErr]    = useState("");
  const [quickPayeeId, setQuickPayeeId] = useState("");

  function openAdd(kind: TxnKind, payeeId?: string, cat?: TxnCategory) {
    setEditEntry(null); setStartKind(kind); setSeedPayee(payeeId); setSeedCat(cat);
    setEntryError(""); setShowEntry(true);
  }
  function openEdit(e: Entry) {
    setEditEntry(e); setSeedPayee(undefined); setSeedCat(undefined);
    setEntryError(""); setShowEntry(true);
  }
  function openDuplicate(e: Entry) {
    // open modal pre-filled but as new entry
    setEditEntry(null);
    setStartKind(e.kind);
    setSeedPayee(e.payeeId || undefined);
    setSeedCat(e.category as TxnCategory);
    setEntryError("");
    setShowEntry(true);
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
    // cancel any pending undo
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
        kind: quickKind, date: new Date().toISOString().slice(0,10),
        category: quickKind === "income" ? "sale" : "other" as TxnCategory,
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

  // ── derived data ──────────────────────────────────────────────────────
  const allEntries = cb.entries;

  const filteredEntries = useMemo(() => {
    if (!globalSearch.trim()) return allEntries;
    const q = globalSearch.toLowerCase();
    return allEntries.filter(e =>
      e.title.toLowerCase().includes(q) ||
      (e.payee?.name || "").toLowerCase().includes(q) ||
      (e.notes || "").toLowerCase().includes(q) ||
      String(e.amount).includes(q)
    );
  }, [allEntries, globalSearch]);

  const officeEntries = useMemo(() =>
    filteredEntries.filter(e =>
      (e.kind === "income" && e.category === "sale") ||
      (e.kind === "expense" && e.category === "salary")
    ), [filteredEntries]);

  const othersEntries = useMemo(() =>
    filteredEntries.filter(e =>
      !(e.kind === "income" && e.category === "sale") &&
      !(e.kind === "expense" && e.category === "salary")
    ), [filteredEntries]);

  const summary = cb.summary;
  const income  = summary?.income  ?? 0;
  const expense = summary?.expense ?? 0;
  const net     = income - expense;

  const officeCash   = officeEntries.filter(e => e.kind === "income" && e.method === "cash").reduce((s,e) => s+e.amount, 0);
  const officeOnline = officeEntries.filter(e => e.kind === "income" && e.method === "online").reduce((s,e) => s+e.amount, 0);
  const officeSalary = officeEntries.filter(e => e.kind === "expense").reduce((s,e) => s+e.amount, 0);

  const todayStr = new Date().toISOString().slice(0,10);
  const todayCash   = allEntries.filter(e => e.date.slice(0,10)===todayStr && e.kind==="income" && e.method==="cash").reduce((s,e)=>s+e.amount,0);
  const todayOnline = allEntries.filter(e => e.date.slice(0,10)===todayStr && e.kind==="income" && e.method==="online").reduce((s,e)=>s+e.amount,0);
  const todaySpent  = allEntries.filter(e => e.date.slice(0,10)===todayStr && e.kind==="expense").reduce((s,e)=>s+e.amount,0);

  const byCategory = useMemo(() => {
    const map = new Map<string, { label: string; income: number; expense: number; color: string }>();
    for (const e of filteredEntries) {
      const meta = CATEGORY_META[e.category];
      const key = e.category;
      if (!map.has(key)) map.set(key, { label: meta?.label || key, income: 0, expense: 0, color: meta?.color || MUTED });
      const c = map.get(key)!;
      if (e.kind === "income") c.income += e.amount;
      else c.expense += e.amount;
    }
    return [...map.values()].sort((a,b) => (b.income+b.expense)-(a.income+a.expense));
  }, [filteredEntries]);

  const recentEntries = useMemo(() => [...allEntries].slice(0,5), [allEntries]);

    const ledgerEntries = useMemo(() => {
    if (ledgerView === "category") return ledgerCat ? filteredEntries.filter(e => e.category === ledgerCat) : [];
    if (ledgerView === "employee") return ledgerEmp ? filteredEntries.filter(e => e.payeeId === ledgerEmp) : [];
    return filteredEntries;
  }, [filteredEntries, ledgerView, ledgerCat, ledgerEmp]);

  const ledgerNet = useMemo(() => {
    let bal = 0;
    return ledgerEntries.map(e => {
      bal = Math.round((bal + (e.kind==="income" ? e.amount : -e.amount)) * 100) / 100;
      return { ...e, balance: bal };
    });
  }, [ledgerEntries]);

  const sortedPayees = useMemo(() => [...pp.payees].sort((a,b) => a.name.localeCompare(b.name)), [pp.payees]);

  // selected employee for ledger carry-forward
  const selectedEmp = sortedPayees.find(p => p.id === ledgerEmp);
  const empBalance  = selectedEmp
    ? Math.round((selectedEmp.received - selectedEmp.paid) * 100) / 100
    : 0;

  // ── Entry row ─────────────────────────────────────────────────────────
  function EntryRow({ e }: { e: Entry }) {
    const km  = KIND_META[e.kind];
    const cat = CATEGORY_META[e.category];
    const met = METHOD_META[e.method];
    const deleted = undoToast?.entry.id === e.id;
    if (deleted) return null;
    return (
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderBottom:`1px solid ${LINE_SOFT}`, background:"#fff", opacity: busyId===e.id ? .5 : 1 }}>
        <div style={{ width:3, alignSelf:"stretch", background:km.color, flexShrink:0 }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, fontWeight:800, textTransform:"uppercase" as const, letterSpacing:.5, color:km.color }}>{km.short}</span>
            <span style={{ fontSize:14, fontWeight:600, color:INK }}>{e.title}</span>
            <span style={{ fontSize:11, fontWeight:700, color:cat?.color }}>{cat?.label}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4, fontSize:12, color:MUTED, flexWrap:"wrap" }}>
            <span>{fmtDate(e.date.slice(0,10))}</span>
            <span style={{ background:met.bg, color:met.color, padding:"1px 7px", fontWeight:700, fontSize:11 }}>{met.label}</span>
            {e.payee && <span style={{ fontWeight:600, color:INK }}>{e.payee.name}</span>}
            {e.notes && <span style={{ fontStyle:"italic", color:FAINT }}>{e.notes}</span>}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          <span style={{ fontSize:15, fontWeight:800, color:km.color }}>{km.sign}{rupeesExact(e.amount)}</span>
          <button onClick={() => openEdit(e)} style={st.btn}>Edit</button>
          <button onClick={() => openDuplicate(e)} style={st.btn} title="Duplicate entry">⎘</button>
          <button onClick={() => deleteEntry(e)} style={{ ...st.btn, color:RED, borderColor:`${RED}55` }}>Delete</button>
        </div>
      </div>
    );
  }

  // ── Period bar ────────────────────────────────────────────────────────
  function PeriodBar() {
    return (
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
        <div style={{ display:"flex", border:`1px solid ${LINE}`, overflow:"hidden" }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => cb.changePeriod(p)}
              style={{ padding:"8px 14px", border:"none", borderRight:`1px solid ${LINE}`, fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer", background:cb.period===p?INK:"#fff", color:cb.period===p?"#fff":MUTED }}>
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
        <input type="date" value={cb.range.from} onChange={e => cb.setCustomRange(e.target.value, cb.range.to)}
          style={{ padding:"8px 10px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK }} />
        <span style={{ color:MUTED, fontSize:12 }}>to</span>
        <input type="date" value={cb.range.to} onChange={e => cb.setCustomRange(cb.range.from, e.target.value)}
          style={{ padding:"8px 10px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK }} />
      </div>
    );
  }

  function Empty({ msg }: { msg: string }) {
    return <div style={{ padding:"40px 24px", textAlign:"center", color:FAINT, fontSize:14 }}>{msg}</div>;
  }

  function KpiCard({ label, val, color, sub }: { label:string; val:number; color:string; sub?:string }) {
    return (
      <div style={{ background:"#fff", border:`1px solid ${LINE}`, borderTop:`3px solid ${color}`, padding:"16px 18px" }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.8, color:MUTED, marginBottom:6 }}>{label}</div>
        <div style={{ fontSize:24, fontWeight:900, color }}>{rupees(val)}</div>
        {sub && <div style={{ fontSize:11, color:FAINT, marginTop:4 }}>{sub}</div>}
      </div>
    );
  }

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
        {/* Tabs */}
        <div style={{ display:"flex", border:`1px solid ${LINE}`, overflow:"hidden" }}>
                    {([["overview","Overview"],["ledger","Ledger"]] as [Tab,string][]).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding:"10px 20px", border:"none", borderRight:`1px solid ${LINE}`, fontFamily:"inherit", fontSize:14, fontWeight:700, cursor:"pointer", background:tab===id?ACCENT:"#fff", color:tab===id?"#fff":MUTED }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flex:1, justifyContent:"flex-end", flexWrap:"wrap" }}>
          {/* Global search */}
          <input
            placeholder="🔍 Search entries…"
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            style={{ padding:"9px 14px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK, width:220 }}
          />
          <button onClick={() => openAdd("income")}
            style={{ padding:"10px 20px", background:GREEN, border:"none", color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:14, cursor:"pointer" }}>
            + Income
          </button>
          <button onClick={() => openAdd("expense")}
            style={{ padding:"10px 20px", background:RED, border:"none", color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:14, cursor:"pointer" }}>
            + Expense
          </button>
        </div>
      </div>

      {/* ── Today's snapshot — always visible ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
        <div style={{ background:"#e7f5eb", border:`1px solid ${GREEN}44`, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>💵</span>
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:GREEN }}>Today Cash</div>
            <div style={{ fontSize:18, fontWeight:900, color:GREEN }}>{rupees(todayCash)}</div>
          </div>
        </div>
        <div style={{ background:"#e6eff9", border:`1px solid ${BLUE}44`, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>📱</span>
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:BLUE }}>Today Online</div>
            <div style={{ fontSize:18, fontWeight:900, color:BLUE }}>{rupees(todayOnline)}</div>
          </div>
        </div>
        <div style={{ background:"#fdeaee", border:`1px solid ${RED}44`, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>💸</span>
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:RED }}>Today Spent</div>
            <div style={{ fontSize:18, fontWeight:900, color:RED }}>{rupees(todaySpent)}</div>
          </div>
        </div>
      </div>

      {/* ── Quick entry bar ── */}
      <div style={{ background:"#fff", border:`1px solid ${LINE}`, padding:"12px 16px", marginBottom:16, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", border:`1px solid ${LINE}`, overflow:"hidden" }}>
          <button onClick={() => setQuickKind("income")}
            style={{ padding:"8px 14px", border:"none", borderRight:`1px solid ${LINE}`, fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer", background:quickKind==="income"?GREEN:"#fff", color:quickKind==="income"?"#fff":MUTED }}>
            Income
          </button>
          <button onClick={() => setQuickKind("expense")}
            style={{ padding:"8px 14px", border:"none", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer", background:quickKind==="expense"?RED:"#fff", color:quickKind==="expense"?"#fff":MUTED }}>
            Expense
          </button>
        </div>
        <input type="number" placeholder="Amount" value={quickAmt} onChange={e => setQuickAmt(e.target.value)}
          style={{ padding:"8px 12px", border:`1px solid ${LINE}`, fontSize:14, fontWeight:700, fontFamily:"inherit", color:quickKind==="income"?GREEN:RED, width:110 }} />
        <input placeholder="What for?" value={quickTitle} onChange={e => setQuickTitle(e.target.value)}
          onKeyDown={e => e.key==="Enter" && quickSave()}
          style={{ padding:"8px 12px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK, flex:1, minWidth:140 }} />
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
        <button onClick={quickSave} disabled={quickBusy}
          style={{ padding:"8px 20px", background:quickKind==="income"?GREEN:RED, border:"none", color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:13, cursor:"pointer", opacity:quickBusy?.6:1 }}>
          {quickBusy ? "Saving…" : "Save"}
        </button>
                <select value={quickPayeeId} onChange={e => setQuickPayeeId(e.target.value)}
          style={{ padding:"8px 10px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:quickPayeeId?INK:MUTED, background:"#fff", maxWidth:160 }}>
          <option value="">Person (optional)</option>
          {sortedPayees.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {quickErr && <span style={{ fontSize:12, color:RED }}>{quickErr}</span>}
      </div>

      {/* ── TAB: Overview ── */}
      {tab === "overview" && (
        <div>
          <PeriodBar/>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
            <KpiCard label="Total Income"  val={income}  color={GREEN} sub={`Today ${rupees(summary?.todayIn??0)}`}/>
            <KpiCard label="Total Expense" val={expense} color={RED}   sub={`Today ${rupees(summary?.todayOut??0)}`}/>
            <KpiCard label={net>=0?"Balance":"Short by"} val={Math.abs(net)} color={net>=0?GREEN:ACCENT} sub={`${summary?.count??0} entries`}/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            
            {/* Category breakdown */}
            <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${LINE_SOFT}`, fontWeight:700, fontSize:14 }}>Category Breakdown</div>
              {byCategory.length === 0
                ? <Empty msg="No entries for this period."/>
                : byCategory.map(c => (
                  <div key={c.label} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderBottom:`1px solid ${LINE_SOFT}` }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:c.color, flexShrink:0 }}/>
                    <div style={{ flex:1, fontWeight:600, fontSize:13 }}>{c.label}</div>
                    {c.income  > 0 && <span style={{ color:GREEN, fontWeight:700, fontSize:13 }}>+{rupees(c.income)}</span>}
                    {c.expense > 0 && <span style={{ color:RED,   fontWeight:700, fontSize:13 }}>−{rupees(c.expense)}</span>}
                  </div>
                ))
              }
            </div>

            {/* Recent entries */}
            <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${LINE_SOFT}`, fontWeight:700, fontSize:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span>Recent Entries</span>
                <button onClick={() => setTab("ledger")} style={{ fontSize:12, color:ACCENT, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>View all →</button>
              </div>
              {recentEntries.length === 0
                ? <Empty msg="No entries yet."/>
                : recentEntries.map(e => <EntryRow key={e.id} e={e}/>)
              }
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Office ── */}
      {tab === "office" && (
        <div>
          <PeriodBar/>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
            <KpiCard label="Cash Received"   val={officeCash}   color={GREEN}/>
            <KpiCard label="Online Received" val={officeOnline} color={BLUE}/>
            <KpiCard label="Salary Paid"     val={officeSalary} color={RED}/>
          </div>

          {/* One-tap salary buttons */}
          <div style={{ background:"#fff", border:`1px solid ${LINE}`, padding:"12px 16px", marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:MUTED, marginBottom:10 }}>Quick Pay Salary</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {sortedPayees.filter(p => p.kind === "employee").slice(0,8).map(p => (
                <button key={p.id} onClick={() => openAdd("expense", p.id, "salary" as TxnCategory)}
                  style={{ padding:"8px 14px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer", color:INK, display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ width:22, height:22, borderRadius:"50%", background:ACCENT, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>
                    {initials(p.name)}
                  </span>
                  {p.name.split(" ")[0]}
                </button>
              ))}
              <button onClick={() => openAdd("expense", undefined, "salary" as TxnCategory)}
                style={{ padding:"8px 14px", border:`1px solid ${ACCENT}44`, background:"#fdf2ee", fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer", color:ACCENT }}>
                + Other salary
              </button>
            </div>
          </div>

          <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${LINE_SOFT}`, fontWeight:700, fontSize:14 }}>
              Sale Income & Salary — {officeEntries.length} entries
            </div>
            {officeEntries.length === 0 ? <Empty msg="No office entries for this period."/> : officeEntries.map(e => <EntryRow key={e.id} e={e}/>)}
          </div>
        </div>
      )}

      {/* ── TAB: Others ── */}
      {tab === "others" && (
        <div>
          <PeriodBar/>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:16 }}>
            <KpiCard label="Other Income"  val={othersEntries.filter(e=>e.kind==="income").reduce((s,e)=>s+e.amount,0)}  color={GREEN}/>
            <KpiCard label="Other Expense" val={othersEntries.filter(e=>e.kind==="expense").reduce((s,e)=>s+e.amount,0)} color={RED}/>
          </div>

          {/* Quick expense buttons */}
          <div style={{ background:"#fff", border:`1px solid ${LINE}`, padding:"12px 16px", marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:MUTED, marginBottom:10 }}>Quick Expense</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {([
                ["food","🍱 Food & Tea"],
                ["transport","🚗 Transport"],
                ["advance","💰 Advance"],
                ["materials","🔧 Materials"],
                ["bills","💡 Bills"],
                ["other","📦 Other"],
              ] as [TxnCategory, string][]).map(([cat, label]) => (
                <button key={cat} onClick={() => openAdd("expense", undefined, cat)}
                  style={{ padding:"8px 14px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer", color:INK }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${LINE_SOFT}`, fontWeight:700, fontSize:14 }}>
              Other Income & Expenses — {othersEntries.length} entries
            </div>
            {othersEntries.length === 0 ? <Empty msg="No other entries for this period."/> : othersEntries.map(e => <EntryRow key={e.id} e={e}/>)}
          </div>
        </div>
      )}

      {/* ── TAB: Ledger ── */}
      {tab === "ledger" && (
        <div>
          <PeriodBar/>

          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ display:"flex", border:`1px solid ${LINE}`, overflow:"hidden" }}>
              {([["statement","Full Statement"],["category","By Category"],["employee","By Employee"]] as [LedgerView,string][]).map(([id,label]) => (
                <button key={id} onClick={() => setLedgerView(id)}
                  style={{ padding:"8px 16px", border:"none", borderRight:`1px solid ${LINE}`, fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer", background:ledgerView===id?INK:"#fff", color:ledgerView===id?"#fff":MUTED }}>
                  {label}
                </button>
              ))}
            </div>
            {ledgerView === "category" && (
              <select value={ledgerCat} onChange={e => setLedgerCat(e.target.value)}
                style={{ padding:"8px 12px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK, background:"#fff" }}>
                <option value="">— Pick category —</option>
                {Object.entries(CATEGORY_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            )}
            {ledgerView === "employee" && (
              <>
                <select value={ledgerEmp} onChange={e => setLedgerEmp(e.target.value)}
                  style={{ padding:"8px 12px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK, background:"#fff" }}>
                  <option value="">— Pick person —</option>
                  {sortedPayees.map(p => <option key={p.id} value={p.id}>{p.name}{p.phone ? ` · ${p.phone}` : ""}</option>)}
                </select>
                <button onClick={() => { setEditPer(null); setPerError(""); setShowPer(true); }}
                  style={{ padding:"8px 14px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer", color:ACCENT }}>
                  + Add Person
                </button>
              </>
            )}
          </div>

          {/* Employee carry-forward balance */}
          {ledgerView === "employee" && selectedEmp && (
            <div style={{ padding:"12px 16px", marginBottom:12, background: empBalance>=0?"#e7f5eb":"#fdeaee", border:`1px solid ${empBalance>=0?GREEN:RED}44`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
              <div>
                <span style={{ fontWeight:700, fontSize:14 }}>{selectedEmp.name}</span>
                <span style={{ fontSize:12, color:MUTED, marginLeft:8 }}>{selectedEmp.phone}</span>
              </div>
              <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                <span style={{ fontSize:12, color:MUTED }}>Total received: <b style={{ color:GREEN }}>{rupees(selectedEmp.received)}</b></span>
                <span style={{ fontSize:12, color:MUTED }}>Total paid: <b style={{ color:RED }}>{rupees(selectedEmp.paid)}</b></span>
                <span style={{ fontWeight:800, fontSize:15, color:empBalance>=0?GREEN:RED }}>
                  {empBalance>=0 ? `To collect ${rupees(empBalance)}` : `To pay ${rupees(-empBalance)}`}
                </span>
              </div>
              {/* Print button */}
              <button onClick={() => {
                const rows = ledgerEntries.map(e => `${fmtDate(e.date.slice(0,10))} | ${e.title} | ${KIND_META[e.kind].sign}${rupeesExact(e.amount)}`).join("\n");
                const w = window.open("","_blank","width=700,height=600");
                w?.document.write(`<pre style="font-family:monospace;padding:20px;font-size:13px"><b>${selectedEmp.name} — Statement</b>\n${"─".repeat(60)}\n${rows}\n${"─".repeat(60)}\nBalance: ${empBalance>=0?"+":"−"}${rupees(Math.abs(empBalance))}</pre>`);
                w?.print();
              }} style={{ padding:"7px 14px", background:INK, border:"none", color:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                🖨 Print
              </button>
            </div>
          )}

          {/* Ledger summary */}
          {ledgerEntries.length > 0 && (
            <div style={{ display:"flex", gap:16, marginBottom:12, padding:"10px 16px", background:"#fff", border:`1px solid ${LINE}`, flexWrap:"wrap", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", gap:16 }}>
                <span style={{ fontSize:13, color:GREEN, fontWeight:700 }}>In: {rupees(ledgerEntries.filter(e=>e.kind==="income").reduce((s,e)=>s+e.amount,0))}</span>
                <span style={{ fontSize:13, color:RED, fontWeight:700 }}>Out: {rupees(ledgerEntries.filter(e=>e.kind==="expense").reduce((s,e)=>s+e.amount,0))}</span>
                <span style={{ fontSize:13, color:MUTED }}>{ledgerEntries.length} entries</span>
              </div>
              <button onClick={() => {
                const header = "Date,Title,Category,Person,Method,Amount,Balance\n";
                const rows = ledgerNet.map(e => `${fmtDate(e.date.slice(0,10))},${e.title},${CATEGORY_META[e.category]?.label||e.category},${e.payee?.name||""},${e.method},${KIND_META[e.kind].sign}${e.amount},${e.balance}`).join("\n");
                const blob = new Blob(["\uFEFF"+header+rows], {type:"text/csv"});
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                a.download = `ledger-${cb.range.from}-to-${cb.range.to}.csv`; a.click();
              }} style={{ padding:"6px 14px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:"pointer", color:MUTED }}>
                ⭳ Export CSV
              </button>
            </div>
          )}

          <div style={{ background:"#fff", border:`1px solid ${LINE}` }}>
            {ledgerView === "employee" && !ledgerEmp ? (
              <div>
                <div style={{ padding:"12px 16px", borderBottom:`1px solid ${LINE_SOFT}`, fontWeight:700, fontSize:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span>People ({sortedPayees.length})</span>
                  <button onClick={syncEmployees} disabled={syncing}
                    style={{ padding:"6px 12px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:"pointer", color:MUTED }}>
                    {syncing ? "Syncing…" : "Sync employees"}
                  </button>
                </div>
                {sortedPayees.length === 0 ? <Empty msg="No people yet."/> : sortedPayees.map(p => {
                  const pIn  = allEntries.filter(e=>e.payeeId===p.id&&e.kind==="income").reduce((s,e)=>s+e.amount,0);
                  const pOut = allEntries.filter(e=>e.payeeId===p.id&&e.kind==="expense").reduce((s,e)=>s+e.amount,0);
                  const pBal = Math.round((pIn - pOut) * 100) / 100;
                  return (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:`1px solid ${LINE_SOFT}`, cursor:"pointer" }}
                      onClick={() => setLedgerEmp(p.id)}>
                      <span style={{ width:36, height:36, borderRadius:"50%", background:p.kind==="employee"?ACCENT:GOLD, color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, flexShrink:0 }}>
                        {initials(p.name)}
                      </span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div>
                        <div style={{ fontSize:12, color:MUTED }}>{p.phone||"No phone"} · {p.kind}</div>
                      </div>
                      {pIn  > 0 && <span style={{ color:GREEN, fontWeight:700, fontSize:13 }}>+{rupees(pIn)}</span>}
                      {pOut > 0 && <span style={{ color:RED, fontWeight:700, fontSize:13 }}>−{rupees(pOut)}</span>}
                      {pBal !== 0 && <span style={{ fontWeight:800, fontSize:13, color:pBal>0?GREEN:RED }}>{pBal>0 ? `Due from them: ${rupees(pBal)}` : `We owe: ${rupees(-pBal)}`}</span>}
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={ev => { ev.stopPropagation(); setEditPer(p); setPerError(""); setShowPer(true); }} style={st.btn}>Edit</button>
                        <button onClick={ev => { ev.stopPropagation(); deletePerson(p); }} style={{ ...st.btn, color:RED, borderColor:`${RED}55` }}>Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>
                        ) : ledgerEntries.length === 0 ? (
              ledgerView === "category" && !ledgerCat ? (
                <div>
                  {byCategory.length === 0
                    ? <Empty msg="No entries for this period."/>
                    : byCategory.map(c => (
                      <div key={c.label}
                        onClick={() => {
                          const key = Object.entries(CATEGORY_META).find(([,v]) => v.label === c.label)?.[0] || "";
                          setLedgerCat(key);
                        }}
                        style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:`1px solid ${LINE_SOFT}`, cursor:"pointer" }}>
                        <div style={{ width:12, height:12, borderRadius:"50%", background:c.color, flexShrink:0 }}/>
                        <div style={{ flex:1, fontWeight:600, fontSize:14 }}>{c.label}</div>
                        {c.income  > 0 && <span style={{ color:GREEN, fontWeight:700 }}>+{rupees(c.income)}</span>}
                        {c.expense > 0 && <span style={{ color:RED, fontWeight:700 }}>−{rupees(c.expense)}</span>}
                        <span style={{ color:MUTED, fontSize:12 }}>→</span>
                      </div>
                    ))
                  }
                </div>
              ) : ledgerView === "employee" && !ledgerEmp ? (
                <Empty msg="Pick a person above."/>
              ) : (
                <Empty msg="No entries for this period."/>
              )
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:WASH }}>
                    {["Date","Details","Category","Person","Method","Amount","Balance",""].map(h => (
                      <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.6, color:MUTED, borderBottom:`1px solid ${LINE}`, whiteSpace:"nowrap" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledgerNet.map((e, idx) => {
                    const km  = KIND_META[e.kind];
                    const cat = CATEGORY_META[e.category];
                    const met = METHOD_META[e.method];
                    const deleted = undoToast?.entry.id === e.id;
                    if (deleted) return null;
                    return (
                      <tr key={e.id} style={{ background:idx%2===0?"#fff":WASH }}>
                        <td style={st.td}>{fmtDate(e.date.slice(0,10))}</td>
                        <td style={{ ...st.td, fontWeight:600, color:INK }}>{e.title}{e.notes && <span style={{ color:FAINT, fontWeight:400, marginLeft:6, fontStyle:"italic" }}>{e.notes}</span>}</td>
                        <td style={st.td}><span style={{ color:cat?.color, fontWeight:700, fontSize:11 }}>{cat?.label}</span></td>
                        <td style={{ ...st.td, color:MUTED }}>{e.payee?.name||"—"}</td>
                        <td style={st.td}><span style={{ background:met.bg, color:met.color, padding:"1px 7px", fontSize:11, fontWeight:700 }}>{met.label}</span></td>
                        <td style={{ ...st.td, fontWeight:700, color:km.color, whiteSpace:"nowrap" as const }}>{km.sign}{rupeesExact(e.amount)}</td>
                        <td style={{ ...st.td, fontWeight:700, color:e.balance>=0?GREEN:RED, whiteSpace:"nowrap" as const }}>{e.balance>=0?"+":"−"}{rupees(Math.abs(e.balance))}</td>
                        <td style={st.td}>
                          <div style={{ display:"flex", gap:6 }}>
                            <button onClick={() => openEdit(e)} style={st.btn}>Edit</button>
                            <button onClick={() => openDuplicate(e)} style={st.btn} title="Duplicate">⎘</button>
                            <button onClick={() => deleteEntry(e)} style={{ ...st.btn, color:RED, borderColor:`${RED}55` }}>Del</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showEntry && (
        <EntryModal
          editing={editEntry} startKind={startKind} payees={sortedPayees}
          saving={savingEntry} error={entryError}
          defaultPayeeId={seedPayee || cb.payeeId || undefined}
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

const st: Record<string, React.CSSProperties> = {
  btn: { padding:"4px 10px", border:`1px solid ${LINE}`, background:"#fff", fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:"pointer", color:MUTED, whiteSpace:"nowrap" },
  td:  { padding:"10px 14px", borderBottom:`1px solid ${LINE_SOFT}`, verticalAlign:"middle" },
};