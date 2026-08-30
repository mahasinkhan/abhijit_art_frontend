// src/components/income-expense/index.tsx
import { useState } from "react";
import { useIncomeExpense } from "../../hooks/useIncomeExpense";
import { usePayees } from "../../hooks/usePayees";
import type { Entry, EntryInput, TxnKind } from "../../services/incomeExpense.api";
import type { Payee, PayeeInput, PayeeKind } from "../../services/payee.api";
import { EntryStats }  from "./EntryStats";
import { EntryList }   from "./EntryList";
import { EntryModal }  from "./EntryModal";
import { PeopleView }  from "./PeopleView";
import { PersonModal } from "./PersonModal";
import {
  ACCENT, ACCENT_DK, INK, MUTED, FAINT, LINE, LINE_SOFT, WASH, GOLD, GREEN, RED,
} from "./types";

type View = "book" | "people";

export default function IncomeExpense() {
  const cb = useIncomeExpense();
  const pp = usePayees();

  const [view, setView] = useState<View>("book");

  // entry modal
  const [showEntry, setShowEntry] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [startKind, setStartKind] = useState<TxnKind>("expense");
  const [seedPayee, setSeedPayee] = useState<string | undefined>(undefined);
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryError,  setEntryError]  = useState("");
  const [busyId,      setBusyId]      = useState<string | null>(null);

  // person modal
  const [showPer,   setShowPer]   = useState(false);
  const [editPer,   setEditPer]   = useState<Payee | null>(null);
  const [savingPer, setSavingPer] = useState(false);
  const [perError,  setPerError]  = useState("");
  const [syncing,   setSyncing]   = useState(false);

  /* ── entries ── */
  function openAdd(kind: TxnKind, payeeId?: string) {
    setEditEntry(null); setStartKind(kind); setSeedPayee(payeeId);
    setEntryError(""); setShowEntry(true);
  }
  function openEdit(e: Entry) {
    setEditEntry(e); setSeedPayee(undefined);
    setEntryError(""); setShowEntry(true);
  }

  async function saveEntry(data: EntryInput) {
    setSavingEntry(true); setEntryError("");
    try {
      if (editEntry) await cb.update(editEntry.id, data);
      else           await cb.create(data);
      setShowEntry(false);
      pp.reload();                    // balances just moved
    } catch (err: any) {
      setEntryError(err.response?.data?.error || "Could not save this entry.");
    } finally { setSavingEntry(false); }
  }

  async function deleteEntry(e: Entry) {
    if (!confirm(`Delete "${e.title}"? This cannot be undone.`)) return;
    setBusyId(e.id);
    try { await cb.remove(e.id); pp.reload(); }
    catch (err: any) { alert(err.response?.data?.error || "Could not delete."); }
    finally { setBusyId(null); }
  }

  /* ── people ── */
  function openAddPerson()  { setEditPer(null); setPerError(""); setShowPer(true); }
  function openEditPerson(p: Payee) { setEditPer(p); setPerError(""); setShowPer(true); }

  async function savePerson(data: PayeeInput) {
    setSavingPer(true); setPerError("");
    try {
      if (editPer) await pp.update(editPer.id, data);
      else         await pp.create(data);
      setShowPer(false);
    } catch (err: any) {
      setPerError(err.response?.data?.error || "Could not save this person.");
    } finally { setSavingPer(false); }
  }

  async function deletePerson(p: Payee) {
    if (!confirm(`Remove ${p.name} from the list?`)) return;
    try { await pp.remove(p.id); }
    catch (err: any) { alert(err.response?.data?.error || "Could not remove this person."); }
  }

  async function createPayeeInline(data: { name: string; phone: string; kind: PayeeKind; role?: string }) {
    return pp.create(data);
  }

  async function syncEmployees() {
    setSyncing(true);
    try {
      const r = await pp.syncEmployees();
      const bits = [
        r.created ? `${r.created} added` : "",
        r.linked  ? `${r.linked} linked` : "",
      ].filter(Boolean).join(", ");
      const skipped = r.skipped.length
        ? `\n\nNo phone number on file for: ${r.skipped.join(", ")}. Add their number in the Employees tab first.`
        : "";
      alert((bits || "Everyone was already in the list") + skipped);
    } catch (err: any) {
      alert(err.response?.data?.error || "Could not sync employees.");
    } finally { setSyncing(false); }
  }

  /** People → "See entries" */
  function seeEntriesFor(id: string) {
    cb.setPayeeId(id);
    cb.changePeriod("all");
    setView("book");
  }

  return (
    <div className="ie">
      <style>{`
        .ie { font-family:'DM Sans',system-ui,sans-serif; color:${INK}; font-variant-numeric:tabular-nums; }
        .ie * { box-sizing:border-box; }

        /* ── View switch ── */
        .ie-views { display:flex; gap:4px; border-bottom:1px solid ${LINE}; margin-bottom:16px; }
        .ie-view { background:none; border:none; padding:11px 16px; font-size:.9rem; font-weight:600; color:${MUTED}; cursor:pointer; font-family:inherit; border-bottom:2px solid transparent; margin-bottom:-1px; }
        .ie-view:hover { color:${INK}; }
        .ie-view.on { color:${ACCENT}; border-bottom-color:${ACCENT}; }

        /* ── Three headline numbers ── */
        .ie-stats3 { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:16px; }
        .ie-big { background:#fff; border:1px solid ${LINE}; border-top-width:3px; border-radius:3px; padding:16px 18px; }
        .ie-big.wash { background:${WASH}; }
        .ie-big-l { font-size:.72rem; text-transform:uppercase; letter-spacing:.08em; color:${MUTED}; font-weight:700; }
        .ie-big-n { font-size:1.75rem; font-weight:800; line-height:1.15; margin-top:7px; letter-spacing:-.02em; }
        .ie-big-s { font-size:.74rem; color:${FAINT}; margin-top:6px; }

        /* ── Stat cards ── */
        .ie-stats { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; margin-bottom:14px; }
        .ie-stat { background:#fff; border:1px solid ${LINE}; border-left-width:3px; border-radius:3px; padding:14px 15px; min-width:0; }
        .ie-stat.big { background:${WASH}; }
        .ie-stat-n { font-size:1.35rem; font-weight:700; line-height:1.15; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ie-stat-l { font-size:.66rem; text-transform:uppercase; letter-spacing:.08em; color:${MUTED}; margin-top:6px; }

        /* ── Panels ── */
        .ie-split3 { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:16px; }
        .ie-panel { background:#fff; border:1px solid ${LINE}; border-radius:3px; overflow:hidden; }
        .ie-panel-h { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 15px; border-bottom:1px solid ${LINE_SOFT}; }
        .ie-panel-h b { font-size:.86rem; font-weight:700; }
        .ie-empty { padding:26px 15px; text-align:center; color:${FAINT}; font-size:.85rem; }
        .ie-more { padding:9px 15px; font-size:.74rem; color:${FAINT}; border-top:1px solid ${LINE_SOFT}; }

        .ie-bars { padding:6px 0; }
        .ie-bar { display:block; width:100%; text-align:left; background:none; border:none; border-left:3px solid transparent; padding:9px 15px; cursor:pointer; font-family:inherit; }
        .ie-bar:hover { background:${WASH}; }
        .ie-bar.on { background:#fdf2ee; border-left-color:${ACCENT}; }
        .ie-bar-top { display:flex; align-items:baseline; justify-content:space-between; gap:10px; }
        .ie-bar-name { display:inline-flex; align-items:center; gap:7px; font-size:.83rem; font-weight:600; color:${INK}; }
        .ie-bar-name i { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .ie-bar-amt { font-size:.83rem; font-weight:700; white-space:nowrap; }
        .ie-bar-track { height:5px; background:${LINE_SOFT}; border-radius:3px; margin-top:7px; overflow:hidden; }
        .ie-bar-fill { height:100%; border-radius:3px; }

        .ie-payees { padding:6px 0; }
        .ie-payee { display:flex; align-items:center; gap:10px; width:100%; text-align:left; background:none; border:none; border-left:3px solid transparent; padding:10px 15px; cursor:pointer; font-family:inherit; color:${INK}; }
        .ie-payee:hover { background:${WASH}; }
        .ie-payee.on { background:#fdf2ee; border-left-color:${ACCENT}; }
        .ie-payee-main { flex:1; min-width:0; }
        .ie-payee-name { display:block; font-size:.85rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ie-payee-sub { display:block; font-size:.7rem; color:${MUTED}; margin-top:1px; }
        .ie-payee-track { display:flex; gap:2px; height:4px; background:${LINE_SOFT}; border-radius:2px; margin-top:6px; overflow:hidden; }
        .ie-payee-track i { display:block; height:100%; }
        .ie-payee-r { text-align:right; flex-shrink:0; }
        .ie-payee-amt { display:block; font-size:.82rem; font-weight:700; white-space:nowrap; }
        .ie-payee-amt.sm { font-size:.72rem; }
        .ie-owes { display:block; font-size:.68rem; font-weight:700; color:${RED}; margin-top:2px; }

        .ie-av { width:30px; height:30px; border-radius:50%; color:#fff; font-size:.7rem; font-weight:700; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ie-av.sm { width:18px; height:18px; font-size:.55rem; }
        .ie-av.lg { width:38px; height:38px; font-size:.82rem; }

        /* ── Toolbars ── */
        .ie-bar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
        .ie-seg { display:inline-flex; border:1px solid ${LINE}; border-radius:3px; overflow:hidden; background:#fff; }
        .ie-seg.full { display:flex; width:100%; }
        .ie-seg button { padding:9px 14px; border:none; border-right:1px solid ${LINE}; background:#fff; font-size:.8rem; font-weight:600; cursor:pointer; font-family:inherit; color:${MUTED}; white-space:nowrap; }
        .ie-seg.full button { flex:1; }
        .ie-seg button:last-child { border-right:none; }
        .ie-seg button:hover:not(.on):not(:disabled) { background:${WASH}; color:${INK}; }
        .ie-seg button.on { background:${INK}; color:#fff; }
        .ie-seg button.on.green { background:${GREEN}; }
        .ie-seg button.on.red { background:${RED}; }
        .ie-seg button:disabled { opacity:.45; cursor:not-allowed; }
        .ie-seg.tiny button { padding:7px 8px; font-size:.75rem; }
        .ie-seg.tiny button em { font-style:normal; opacity:.65; margin-left:4px; }

        .ie-dates { display:inline-flex; align-items:center; gap:7px; }
        .ie-date { padding:8px 10px; border:1px solid ${LINE}; border-radius:3px; font-size:.8rem; font-family:inherit; color:${INK}; background:#fff; }
        .ie-date:focus { outline:none; border-color:${ACCENT}; }
        .ie-to { font-size:.76rem; color:${MUTED}; }
        .ie-search { padding:9px 12px; border:1px solid ${LINE}; border-radius:3px; font-size:.85rem; width:250px; max-width:100%; font-family:inherit; color:${INK}; background:#fff; }
        .ie-search::placeholder { color:${FAINT}; }
        .ie-sel { padding:9px 10px; border:1px solid ${LINE}; border-radius:3px; font-size:.82rem; background:#fff; font-family:inherit; color:${INK}; }
        .ie-search:focus,.ie-sel:focus { outline:none; border-color:${ACCENT}; }

        .ie-addwrap { margin-left:auto; display:flex; gap:8px; }
        .ie-add { color:#fff; border:none; border-radius:3px; padding:10px 18px; font-size:.85rem; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .ie-add.in  { background:${GREEN}; }
        .ie-add.in:hover { background:#116631; }
        .ie-add.out { background:${RED}; }
        .ie-add.out:hover { background:#9f0f34; }
        .ie-ghost { background:#fff; border:1px solid ${LINE}; color:${INK}; border-radius:3px; padding:9px 15px; font-size:.8rem; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .ie-ghost:hover:not(:disabled) { background:${WASH}; border-color:#d8cfc0; }
        .ie-ghost:disabled { opacity:.5; cursor:not-allowed; }
        .ie-link { background:none; border:none; color:${ACCENT}; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; padding:4px 2px; }
        .ie-chip { background:#fdf2ee; border:1px solid #f0d2c8; color:${ACCENT}; border-radius:3px; padding:7px 11px; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ie-check { display:inline-flex; align-items:center; gap:7px; font-size:.8rem; color:${MUTED}; cursor:pointer; }
        .ie-check input { accent-color:${ACCENT}; }
        .ie-check.standalone { padding:4px 0; }

        .ie-showing { font-size:.82rem; color:${MUTED}; margin-bottom:10px; }
        .ie-showing b { color:${INK}; }
        .ie-err { background:#fef2ee; border:1px solid #f0d2c8; color:#b23c1c; padding:10px 13px; border-radius:3px; font-size:.84rem; margin-bottom:12px; }
        .ie-err.small { padding:7px 10px; font-size:.8rem; margin-bottom:10px; }
        .ie-loadempty { background:#fff; border:1px dashed ${LINE}; border-radius:3px; padding:44px 24px; text-align:center; color:${FAINT}; font-size:.9rem; line-height:1.6; }

        /* ── Day-grouped list ── */
        .ie-days { display:grid; gap:14px; }
        .ie-day { background:#fff; border:1px solid ${LINE}; border-radius:3px; overflow:hidden; }
        .ie-day-h { display:flex; align-items:baseline; gap:10px; padding:11px 15px; background:${WASH}; border-bottom:1px solid ${LINE_SOFT}; }
        .ie-day-h b { font-size:.86rem; font-weight:700; }
        .ie-day-h span { font-size:.72rem; color:${MUTED}; }
        .ie-day-h em { margin-left:auto; font-style:normal; display:flex; gap:12px; }
        .ie-day-h em i { font-style:normal; font-size:.88rem; font-weight:700; }

        .ie-row { display:flex; align-items:flex-start; gap:12px; padding:12px 15px; border-left:3px solid ${LINE}; border-bottom:1px solid ${LINE_SOFT}; }
        .ie-row:last-child { border-bottom:none; }
        .ie-row:hover { background:${WASH}; }
        .ie-row-main { flex:1; min-width:0; }
        .ie-row-top { display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
        .ie-kind { font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:.06em; padding:2px 7px; border-radius:2px; }
        .ie-row-title { font-size:.92rem; font-weight:600; }
        .ie-cat { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
        .ie-row-sub { display:flex; align-items:center; gap:9px; flex-wrap:wrap; margin-top:6px; font-size:.78rem; color:${MUTED}; }
        .ie-who { display:inline-flex; align-items:center; gap:6px; font-weight:600; color:${INK}; background:none; border:none; padding:0; cursor:pointer; font-family:inherit; font-size:.78rem; }
        .ie-who:hover { color:${ACCENT}; }
        .ie-phone { font-weight:400; color:${FAINT}; font-size:.74rem; }
        .ie-nobody { color:${FAINT}; font-style:italic; }
        .ie-method { padding:1px 8px; border-radius:3px; font-size:.7rem; font-weight:700; }
        .ie-note { font-style:italic; color:${FAINT}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:220px; }
        .ie-row-r { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .ie-amt { font-size:1rem; font-weight:800; white-space:nowrap; }
        .ie-icon { background:#fff; border:1px solid ${LINE}; border-radius:3px; padding:5px 11px; font-size:.74rem; font-weight:700; cursor:pointer; font-family:inherit; color:${MUTED}; white-space:nowrap; }
        .ie-icon:hover:not(:disabled) { background:${WASH}; color:${INK}; border-color:#d8cfc0; }
        .ie-icon.danger { color:${ACCENT}; border-color:#f0d2c8; }
        .ie-icon.danger:hover:not(:disabled) { background:#fef2ee; }
        .ie-icon.pay { color:${RED}; border-color:#f3c9d2; }
        .ie-icon.get { color:${GREEN}; border-color:#c2e2cd; }
        .ie-icon:disabled { opacity:.5; cursor:not-allowed; }

        /* ── People ── */
        .ie-people { display:grid; gap:9px; }
        .ie-person { background:#fff; border:1px solid ${LINE}; border-radius:3px; overflow:hidden; }
        .ie-person.open { border-color:#d8cfc0; }
        .ie-person.off { opacity:.6; }
        .ie-person-h { display:flex; align-items:center; gap:13px; width:100%; text-align:left; background:none; border:none; padding:13px 16px; cursor:pointer; font-family:inherit; color:${INK}; }
        .ie-person-h:hover { background:${WASH}; }
        .ie-person-main { flex:1; min-width:0; }
        .ie-person-name { display:block; font-size:.95rem; font-weight:700; }
        .ie-off-tag { font-style:normal; font-size:.66rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:${MUTED}; background:${LINE_SOFT}; padding:1px 7px; border-radius:3px; margin-left:8px; }
        .ie-person-sub { display:block; font-size:.76rem; color:${MUTED}; margin-top:2px; }
        .ie-person-r { text-align:right; flex-shrink:0; }
        .ie-person-amt { display:block; font-size:.95rem; font-weight:700; }
        .ie-person-cnt { display:block; font-size:.72rem; color:${MUTED}; margin-top:2px; }
        .ie-caret { color:${FAINT}; font-size:.8rem; flex-shrink:0; }

        .ie-person-body { border-top:1px solid ${LINE_SOFT}; padding:14px 16px 16px; background:${WASH}; }
        .ie-pd-top { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:12px; }
        .ie-pd-figs { display:flex; gap:22px; }
        .ie-pd-figs div span { display:block; font-size:.64rem; text-transform:uppercase; letter-spacing:.06em; color:${FAINT}; margin-bottom:3px; }
        .ie-pd-figs div b { font-size:1rem; }
        .ie-pd-actions { display:flex; gap:7px; flex-wrap:wrap; }
        .ie-pd-cats { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:14px; }
        .ie-pd-cat { display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid ${LINE}; border-radius:3px; padding:4px 10px; font-size:.75rem; font-weight:600; }
        .ie-pd-cat i { width:7px; height:7px; border-radius:50%; }
        .ie-pd-cat b { margin-left:3px; }
        .ie-pd-month { background:#fff; border:1px solid ${LINE}; border-radius:3px; margin-bottom:9px; overflow:hidden; }
        .ie-pd-month:last-child { margin-bottom:0; }
        .ie-pd-month-h { display:flex; align-items:baseline; padding:9px 13px; border-bottom:1px solid ${LINE_SOFT}; }
        .ie-pd-month-h b { font-size:.8rem; font-weight:700; }
        .ie-pd-month-h em { margin-left:auto; font-style:normal; display:flex; gap:11px; }
        .ie-pd-month-h em i { font-style:normal; font-size:.8rem; font-weight:700; }
        .ie-pd-row { display:flex; align-items:center; gap:11px; padding:9px 13px; border-bottom:1px solid ${LINE_SOFT}; font-size:.82rem; }
        .ie-pd-row:last-child { border-bottom:none; }
        .ie-pd-date { color:${MUTED}; white-space:nowrap; font-size:.76rem; min-width:88px; }
        .ie-pd-title { flex:1; min-width:0; font-weight:600; }
        .ie-pd-title em { font-style:normal; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; margin-left:8px; }
        .ie-pd-amt { font-weight:700; white-space:nowrap; }
        .ie-pempty { padding:22px 12px; text-align:center; color:${FAINT}; font-size:.84rem; }
        .ie-pempty b { display:block; color:${INK}; font-weight:700; margin-bottom:3px; }

        /* ── Payee picker ── */
        .ie-picker { border:1px solid ${LINE}; border-radius:3px; padding:11px; background:${WASH}; }
        .ie-plist { margin-top:9px; max-height:210px; overflow-y:auto; background:#fff; border:1px solid ${LINE}; border-radius:3px; }
        .ie-plist::-webkit-scrollbar { width:5px; }
        .ie-plist::-webkit-scrollbar-thumb { background:${LINE}; border-radius:10px; }
        .ie-pitem { display:flex; align-items:center; gap:10px; width:100%; text-align:left; background:none; border:none; border-bottom:1px solid ${LINE_SOFT}; padding:9px 12px; cursor:pointer; font-family:inherit; color:${INK}; }
        .ie-pitem:last-child { border-bottom:none; }
        .ie-pitem:hover { background:${WASH}; }
        .ie-pitem-main { flex:1; min-width:0; }
        .ie-pitem-name { display:block; font-size:.86rem; font-weight:600; }
        .ie-pitem-sub { display:block; font-size:.72rem; color:${MUTED}; margin-top:1px; }
        .ie-pitem-amt { font-size:.72rem; font-weight:700; white-space:nowrap; flex-shrink:0; }
        .ie-pactions { display:grid; gap:7px; margin-top:9px; }
        .ie-pactions .ie-ghost { width:100%; }
        .ie-addp { width:100%; background:#fff; border:1px dashed ${LINE}; color:${ACCENT}; border-radius:3px; padding:9px; font-size:.82rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ie-addp:hover { border-color:${ACCENT}; background:#fdf2ee; }

        .ie-picked { display:flex; align-items:center; gap:12px; border:1px solid ${ACCENT}; background:#fdf2ee; border-radius:3px; padding:12px 14px; }
        .ie-picked-main { flex:1; min-width:0; }
        .ie-picked-name { font-size:.92rem; font-weight:700; }
        .ie-picked-sub { font-size:.76rem; color:${MUTED}; margin-top:2px; }
        .ie-picked-bal { font-size:.76rem; font-weight:700; margin-top:4px; }
        .ie-change { background:#fff; border:1px solid ${LINE}; border-radius:3px; padding:6px 13px; font-size:.76rem; font-weight:700; cursor:pointer; font-family:inherit; color:${INK}; flex-shrink:0; }
        .ie-change:hover { background:${WASH}; }

        .ie-newp { border:1px solid ${LINE}; border-radius:3px; padding:13px; background:${WASH}; }
        .ie-newp-h { display:flex; align-items:center; justify-content:space-between; margin-bottom:11px; }
        .ie-newp-h b { font-size:.84rem; }
        .ie-clash { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; background:#fdf3d9; border:1px solid #f0e0b4; border-radius:3px; padding:9px 12px; margin-top:10px; font-size:.8rem; color:#8a6b1f; }
        .ie-usebtn { background:${GOLD}; color:#fff; border:none; border-radius:3px; padding:6px 13px; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ie-savep { width:100%; margin-top:13px; background:${ACCENT}; color:#fff; border:none; border-radius:3px; padding:11px; font-size:.86rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ie-savep:hover:not(:disabled) { background:${ACCENT_DK}; }
        .ie-savep:disabled { opacity:.45; cursor:not-allowed; }

        /* ── Modals ── */
        .ie-ov { position:fixed; inset:0; background:rgba(31,36,48,.5); z-index:1000; display:flex; align-items:center; justify-content:center; padding:24px 20px; }
        .ie-modal { background:#fff; width:100%; max-width:620px; border-radius:4px; position:relative; display:flex; flex-direction:column; max-height:calc(100vh - 48px); overflow:hidden; }
        .ie-modal.small { max-width:520px; }
        .ie-modal.wide { max-width:900px; }
        .ie-mhead { padding:22px 26px 17px; border-bottom:1px solid ${LINE_SOFT}; flex-shrink:0; }
        .ie-mtitle { font-size:1.05rem; font-weight:700; }
        .ie-msub { font-size:.8rem; color:${MUTED}; margin-top:4px; line-height:1.5; }
        .ie-mbody { padding:20px 26px 26px; overflow-y:auto; flex:1 1 auto; min-height:0; }
        .ie-mbody::-webkit-scrollbar { width:5px; }
        .ie-mbody::-webkit-scrollbar-thumb { background:${LINE}; border-radius:10px; }
        .ie-close { position:absolute; top:15px; right:18px; background:none; border:none; font-size:1.4rem; line-height:1; cursor:pointer; color:${MUTED}; z-index:1; }
        .ie-close:hover { color:${INK}; }
        .ie-grid { display:grid; gap:15px; }
        .ie-mgrid { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:20px; align-items:start; }
        .ie-mcol { display:grid; gap:15px; align-content:start; }
        .ie-2col { display:grid; grid-template-columns:1fr 1fr; gap:13px; }
        .ie-lbl { display:block; font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:${MUTED}; margin-bottom:6px; }
        .ie-opt { text-transform:none; letter-spacing:0; font-weight:500; color:${FAINT}; }
        .ie-inp { width:100%; padding:10px 12px; border:1px solid ${LINE}; border-radius:3px; font-size:.9rem; font-family:inherit; color:${INK}; background:#fff; }
        .ie-inp:focus { outline:none; border-color:${ACCENT}; }
        .ie-amtinp { font-size:1.1rem; font-weight:800; }
        .ie-hint { font-size:.74rem; color:${FAINT}; margin-top:6px; line-height:1.5; }
        .ie-hint.center { text-align:center; margin-top:0; }

        .ie-kindsel { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:18px; }
        .ie-kindbtn { border:1px solid ${LINE}; background:#fff; border-radius:3px; padding:13px; cursor:pointer; font-family:inherit; text-align:left; color:${MUTED}; }
        .ie-kindbtn b { display:block; font-size:.95rem; }
        .ie-kindbtn span { display:block; font-size:.72rem; margin-top:3px; }
        .ie-kindbtn:hover { background:${WASH}; }
        .ie-kindbtn.on.in  { border-color:${GREEN}; background:#e7f5eb; color:${GREEN}; }
        .ie-kindbtn.on.out { border-color:${RED}; background:#fdeaee; color:${RED}; }

        .ie-cats { display:flex; flex-wrap:wrap; gap:7px; }
        .ie-cat-pick { display:inline-flex; align-items:center; gap:6px; border:1px solid ${LINE}; background:#fff; border-radius:3px; padding:7px 12px; font-size:.8rem; font-weight:600; cursor:pointer; font-family:inherit; color:${MUTED}; }
        .ie-cat-pick i { width:7px; height:7px; border-radius:50%; }
        .ie-cat-pick:hover:not(.on) { background:${WASH}; }
        .ie-cat-pick.on { font-weight:700; }

        .ie-save { color:#fff; border:none; border-radius:3px; padding:13px; width:100%; font-size:.92rem; font-weight:700; cursor:pointer; font-family:inherit; background:${ACCENT}; margin-top:4px; }
        .ie-save:disabled { opacity:.45; cursor:not-allowed; }

        @media (max-width:1200px){
          .ie-stats { grid-template-columns:repeat(3,minmax(0,1fr)); }
          .ie-stats3 { grid-template-columns:1fr; }
          .ie-split3 { grid-template-columns:1fr; }
        }
        @media (max-width:860px){
          .ie-mgrid { grid-template-columns:1fr; }
        }
        @media (max-width:700px){
          .ie-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .ie-search { width:100%; }
          .ie-addwrap { margin-left:0; width:100%; }
          .ie-add { flex:1; }
          .ie-2col { grid-template-columns:1fr; }
          .ie-note { max-width:140px; }
          .ie-row { flex-wrap:wrap; }
          .ie-row-r { width:100%; justify-content:space-between; }
          .ie-person-h { flex-wrap:wrap; }
          .ie-pd-row { flex-wrap:wrap; }
          .ie-pd-date { min-width:0; }
        }
      `}</style>

      <div className="ie-views">
        <button className={`ie-view${view === "book" ? " on" : ""}`} onClick={() => setView("book")}>
          Day book
        </button>
        <button className={`ie-view${view === "people" ? " on" : ""}`} onClick={() => setView("people")}>
          People {pp.totals.people > 0 && <span style={{ color: FAINT, fontWeight: 500 }}>({pp.totals.people})</span>}
        </button>
      </div>

      {view === "book" ? (
        <>
          <EntryStats
            summary={cb.summary}
            period={cb.period}
            loading={cb.loading}
            payeeId={cb.payeeId}
            onPayee={cb.setPayeeId}
            category={cb.category}
            onCategory={cb.setCategory}
          />

          <EntryList
            byDay={cb.byDay}
            entries={cb.entries}
            loading={cb.loading}
            error={cb.error}
            shown={cb.shown}
            period={cb.period}
            range={cb.range}
            onPeriod={cb.changePeriod}
            onCustomRange={cb.setCustomRange}
            kind={cb.kind}         onKind={cb.setKind}
            category={cb.category} onCategory={cb.setCategory}
            method={cb.method}     onMethod={cb.setMethod}
            search={cb.search}     onSearch={cb.setSearch}
            payeeId={cb.payeeId}   onPayee={cb.setPayeeId}
            dirty={cb.dirty}       onClear={cb.clearFilters}
            onAddIncome={() => openAdd("income")}
            onAddExpense={() => openAdd("expense")}
            onEdit={openEdit}
            onDelete={deleteEntry}
            busyId={busyId}
          />
        </>
      ) : (
        <PeopleView
          shown={pp.shown}
          totals={pp.totals}
          loading={pp.loading}
          error={pp.error}
          kind={pp.kind}     onKind={pp.setKind}
          search={pp.search} onSearch={pp.setSearch}
          showInactive={pp.showInactive} onShowInactive={pp.setShowInactive}
          getDetail={pp.getDetail}
          onCreate={openAddPerson}
          onEdit={openEditPerson}
          onDelete={deletePerson}
          onSync={syncEmployees}
          syncing={syncing}
          onSeeEntries={seeEntriesFor}
          onPay={(p) => openAdd("expense", p.id)}
          onReceive={(p) => openAdd("income", p.id)}
        />
      )}

      {showEntry && (
        <EntryModal
          editing={editEntry}
          startKind={startKind}
          payees={pp.payees}
          saving={savingEntry}
          error={entryError}
          defaultPayeeId={seedPayee || cb.payeeId || undefined}
          onCreatePayee={createPayeeInline}
          onSyncEmployees={syncEmployees}
          syncing={syncing}
          onSave={saveEntry}
          onClose={() => setShowEntry(false)}
        />
      )}

      {showPer && (
        <PersonModal
          editing={editPer}
          payees={pp.payees}
          saving={savingPer}
          error={perError}
          onSave={savePerson}
          onClose={() => setShowPer(false)}
        />
      )}
    </div>
  );
}