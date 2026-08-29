// src/components/expenses/index.tsx
import { useState } from "react";
import { useExpenses } from "../../hooks/useExpenses";
import { usePayees } from "../../hooks/usePayees";
import type { Expense, ExpenseInput } from "../../services/expense.api";
import type { Payee, PayeeInput, PayeeKind } from "../../services/payee.api";
import { ExpenseStats } from "./ExpenseStats";
import { ExpenseList }  from "./ExpenseList";
import { ExpenseModal } from "./ExpenseModal";
import { PeopleView }   from "./PeopleView";
import { PersonModal }  from "./PersonModal";
import {
  ACCENT, ACCENT_DK, INK, MUTED, FAINT, LINE, LINE_SOFT, WASH, GOLD, GREEN,
} from "./types";

type View = "expenses" | "people";

export default function Expenses() {
  const ex = useExpenses();
  const pp = usePayees();

  const [view, setView] = useState<View>("expenses");

  // expense modal
  const [showExp,   setShowExp]   = useState(false);
  const [editExp,   setEditExp]   = useState<Expense | null>(null);
  const [savingExp, setSavingExp] = useState(false);
  const [expError,  setExpError]  = useState("");
  const [busyId,    setBusyId]    = useState<string | null>(null);

  // person modal
  const [showPer,   setShowPer]   = useState(false);
  const [editPer,   setEditPer]   = useState<Payee | null>(null);
  const [savingPer, setSavingPer] = useState(false);
  const [perError,  setPerError]  = useState("");
  const [syncing,   setSyncing]   = useState(false);

  /* ── expenses ── */
  function openAddExp()  { setEditExp(null); setExpError(""); setShowExp(true); }
  function openEditExp(e: Expense) { setEditExp(e); setExpError(""); setShowExp(true); }

  async function saveExpense(data: ExpenseInput) {
    setSavingExp(true); setExpError("");
    try {
      if (editExp) await ex.update(editExp.id, data);
      else         await ex.create(data);
      setShowExp(false);
      pp.reload();                       // totals per person just changed
    } catch (err: any) {
      setExpError(err.response?.data?.error || "Could not save this expense.");
    } finally { setSavingExp(false); }
  }

  async function deleteExpense(e: Expense) {
    if (!confirm(`Delete "${e.title}"? This cannot be undone.`)) return;
    setBusyId(e.id);
    try { await ex.remove(e.id); pp.reload(); }
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

  /** used by the picker inside the expense modal */
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

  /** People → "See in expenses" */
  function seeExpensesFor(id: string) {
    ex.setPayeeId(id);
    ex.changePeriod("all");
    setView("expenses");
  }

  return (
    <div className="ex">
      <style>{`
        .ex { font-family:'DM Sans',system-ui,sans-serif; color:${INK}; font-variant-numeric:tabular-nums; }
        .ex * { box-sizing:border-box; }

        /* ── View switch ── */
        .ex-views { display:flex; gap:4px; border-bottom:1px solid ${LINE}; margin-bottom:16px; }
        .ex-view { background:none; border:none; padding:11px 16px; font-size:.9rem; font-weight:600; color:${MUTED}; cursor:pointer; font-family:inherit; border-bottom:2px solid transparent; margin-bottom:-1px; }
        .ex-view:hover { color:${INK}; }
        .ex-view.on { color:${ACCENT}; border-bottom-color:${ACCENT}; }

        /* ── Headline stats ── */
        .ex-stats { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; margin-bottom:14px; }
        .ex-stat { background:#fff; border:1px solid ${LINE}; border-left-width:3px; border-radius:3px; padding:14px 15px; min-width:0; }
        .ex-stat-n { font-size:1.4rem; font-weight:700; line-height:1.1; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ex-stat-l { font-size:.66rem; text-transform:uppercase; letter-spacing:.08em; color:${MUTED}; margin-top:6px; }

        /* ── Analysis panels ── */
        .ex-split { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-bottom:16px; }
        .ex-panel { background:#fff; border:1px solid ${LINE}; border-radius:3px; overflow:hidden; }
        .ex-panel-h { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 15px; border-bottom:1px solid ${LINE_SOFT}; }
        .ex-panel-h b { font-size:.88rem; font-weight:700; }
        .ex-empty { padding:26px 15px; text-align:center; color:${FAINT}; font-size:.85rem; }
        .ex-more { padding:9px 15px; font-size:.74rem; color:${FAINT}; border-top:1px solid ${LINE_SOFT}; }

        .ex-bars { padding:6px 0; }
        .ex-bar { display:block; width:100%; text-align:left; background:none; border:none; border-left:3px solid transparent; padding:9px 15px; cursor:pointer; font-family:inherit; }
        .ex-bar:hover { background:${WASH}; }
        .ex-bar.on { background:#fdf2ee; border-left-color:${ACCENT}; }
        .ex-bar-top { display:flex; align-items:baseline; justify-content:space-between; gap:10px; }
        .ex-bar-name { display:inline-flex; align-items:center; gap:7px; font-size:.84rem; font-weight:600; color:${INK}; }
        .ex-bar-name i { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .ex-bar-amt { font-size:.84rem; font-weight:700; white-space:nowrap; }
        .ex-bar-track { height:5px; background:${LINE_SOFT}; border-radius:3px; margin-top:7px; overflow:hidden; }
        .ex-bar-fill { height:100%; border-radius:3px; }

        .ex-payees { padding:6px 0; }
        .ex-payee { display:flex; align-items:center; gap:11px; width:100%; text-align:left; background:none; border:none; border-left:3px solid transparent; padding:10px 15px; cursor:pointer; font-family:inherit; color:${INK}; }
        .ex-payee:hover { background:${WASH}; }
        .ex-payee.on { background:#fdf2ee; border-left-color:${ACCENT}; }
        .ex-payee-main { flex:1; min-width:0; }
        .ex-payee-name { display:block; font-size:.86rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .ex-payee-sub { display:block; font-size:.7rem; color:${MUTED}; margin-top:1px; }
        .ex-payee-track { display:block; height:4px; background:${LINE_SOFT}; border-radius:2px; margin-top:6px; overflow:hidden; }
        .ex-payee-track i { display:block; height:100%; }
        .ex-payee-amt { font-size:.86rem; font-weight:700; white-space:nowrap; flex-shrink:0; }

        .ex-av { width:30px; height:30px; border-radius:50%; color:#fff; font-size:.7rem; font-weight:700; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ex-av.sm { width:18px; height:18px; font-size:.55rem; }
        .ex-av.lg { width:38px; height:38px; font-size:.82rem; }

        /* ── Toolbars ── */
        .ex-bar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
        .ex-seg { display:inline-flex; border:1px solid ${LINE}; border-radius:3px; overflow:hidden; background:#fff; }
        .ex-seg.full { display:flex; width:100%; }
        .ex-seg button { padding:9px 14px; border:none; border-right:1px solid ${LINE}; background:#fff; font-size:.8rem; font-weight:600; cursor:pointer; font-family:inherit; color:${MUTED}; white-space:nowrap; }
        .ex-seg.full button { flex:1; }
        .ex-seg button:last-child { border-right:none; }
        .ex-seg button:hover:not(.on):not(:disabled) { background:${WASH}; color:${INK}; }
        .ex-seg button.on { background:${INK}; color:#fff; }
        .ex-seg button:disabled { opacity:.45; cursor:not-allowed; }
        .ex-dates { display:inline-flex; align-items:center; gap:7px; }
        .ex-date { padding:8px 10px; border:1px solid ${LINE}; border-radius:3px; font-size:.8rem; font-family:inherit; color:${INK}; background:#fff; }
        .ex-date:focus { outline:none; border-color:${ACCENT}; }
        .ex-to { font-size:.76rem; color:${MUTED}; }
        .ex-search { padding:9px 12px; border:1px solid ${LINE}; border-radius:3px; font-size:.85rem; width:270px; max-width:100%; font-family:inherit; color:${INK}; background:#fff; }
        .ex-search::placeholder { color:${FAINT}; }
        .ex-sel { padding:9px 10px; border:1px solid ${LINE}; border-radius:3px; font-size:.82rem; background:#fff; font-family:inherit; color:${INK}; }
        .ex-search:focus,.ex-sel:focus { outline:none; border-color:${ACCENT}; }
        .ex-add { margin-left:auto; background:${ACCENT}; color:#fff; border:none; border-radius:3px; padding:10px 18px; font-size:.85rem; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .ex-add:hover { background:${ACCENT_DK}; }
        .ex-ghost { background:#fff; border:1px solid ${LINE}; color:${INK}; border-radius:3px; padding:9px 15px; font-size:.8rem; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .ex-ghost:hover:not(:disabled) { background:${WASH}; border-color:#d8cfc0; }
        .ex-ghost:disabled { opacity:.5; cursor:not-allowed; }
        .ex-link { background:none; border:none; color:${ACCENT}; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; padding:4px 2px; }
        .ex-chip { background:#fdf2ee; border:1px solid #f0d2c8; color:${ACCENT}; border-radius:3px; padding:7px 11px; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ex-check { display:inline-flex; align-items:center; gap:7px; font-size:.8rem; color:${MUTED}; cursor:pointer; }
        .ex-check input { accent-color:${ACCENT}; }
        .ex-check.standalone { padding:4px 0; }

        .ex-showing { font-size:.8rem; color:${MUTED}; margin-bottom:10px; }
        .ex-showing b { color:${INK}; }
        .ex-err { background:#fef2ee; border:1px solid #f0d2c8; color:#b23c1c; padding:10px 13px; border-radius:3px; font-size:.84rem; margin-bottom:12px; }
        .ex-err.small { padding:7px 10px; font-size:.8rem; margin-bottom:10px; }
        .ex-loadempty { background:#fff; border:1px dashed ${LINE}; border-radius:3px; padding:44px 24px; text-align:center; color:${FAINT}; font-size:.9rem; line-height:1.6; }

        /* ── Day-grouped expense list ── */
        .ex-days { display:grid; gap:14px; }
        .ex-day { background:#fff; border:1px solid ${LINE}; border-radius:3px; overflow:hidden; }
        .ex-day-h { display:flex; align-items:baseline; gap:10px; padding:11px 15px; background:${WASH}; border-bottom:1px solid ${LINE_SOFT}; }
        .ex-day-h b { font-size:.86rem; font-weight:700; }
        .ex-day-h span { font-size:.72rem; color:${MUTED}; }
        .ex-day-h em { margin-left:auto; font-style:normal; font-size:.95rem; font-weight:700; color:${ACCENT}; }

        .ex-row { display:flex; align-items:flex-start; gap:12px; padding:12px 15px; border-left:3px solid ${LINE}; border-bottom:1px solid ${LINE_SOFT}; }
        .ex-row:last-child { border-bottom:none; }
        .ex-row:hover { background:${WASH}; }
        .ex-row-main { flex:1; min-width:0; }
        .ex-row-top { display:flex; align-items:baseline; gap:9px; flex-wrap:wrap; }
        .ex-row-title { font-size:.92rem; font-weight:600; }
        .ex-cat { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
        .ex-row-sub { display:flex; align-items:center; gap:9px; flex-wrap:wrap; margin-top:6px; font-size:.78rem; color:${MUTED}; }
        .ex-who { display:inline-flex; align-items:center; gap:6px; font-weight:600; color:${INK}; }
        .ex-who.link { background:none; border:none; padding:0; cursor:pointer; font-family:inherit; font-size:.78rem; }
        .ex-who.link:hover { color:${ACCENT}; }
        .ex-phone { font-size:.74rem; color:${FAINT}; }
        .ex-method { padding:1px 8px; border-radius:3px; font-size:.7rem; font-weight:700; }
        .ex-note { font-style:italic; color:${FAINT}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:240px; }
        .ex-row-r { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .ex-amt { font-size:.98rem; font-weight:700; white-space:nowrap; }
        .ex-icon { background:#fff; border:1px solid ${LINE}; border-radius:3px; padding:5px 11px; font-size:.74rem; font-weight:700; cursor:pointer; font-family:inherit; color:${MUTED}; white-space:nowrap; }
        .ex-icon:hover:not(:disabled) { background:${WASH}; color:${INK}; border-color:#d8cfc0; }
        .ex-icon.danger { color:${ACCENT}; border-color:#f0d2c8; }
        .ex-icon.danger:hover:not(:disabled) { background:#fef2ee; }
        .ex-icon:disabled { opacity:.5; cursor:not-allowed; }

        /* ── People view ── */
        .ex-people { display:grid; gap:9px; }
        .ex-person { background:#fff; border:1px solid ${LINE}; border-radius:3px; overflow:hidden; }
        .ex-person.open { border-color:#d8cfc0; }
        .ex-person.off { opacity:.6; }
        .ex-person-h { display:flex; align-items:center; gap:13px; width:100%; text-align:left; background:none; border:none; padding:13px 16px; cursor:pointer; font-family:inherit; color:${INK}; }
        .ex-person-h:hover { background:${WASH}; }
        .ex-person-main { flex:1; min-width:0; }
        .ex-person-name { display:block; font-size:.95rem; font-weight:700; }
        .ex-off-tag { font-style:normal; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:${MUTED}; background:${LINE_SOFT}; padding:1px 7px; border-radius:3px; margin-left:8px; }
        .ex-person-sub { display:block; font-size:.76rem; color:${MUTED}; margin-top:2px; }
        .ex-person-r { text-align:right; flex-shrink:0; }
        .ex-person-amt { display:block; font-size:1rem; font-weight:700; }
        .ex-person-cnt { display:block; font-size:.72rem; color:${MUTED}; margin-top:2px; }
        .ex-caret { color:${FAINT}; font-size:.8rem; flex-shrink:0; }

        .ex-person-body { border-top:1px solid ${LINE_SOFT}; padding:14px 16px 16px; background:${WASH}; }
        .ex-pd-top { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:12px; }
        .ex-pd-figs { display:flex; gap:22px; }
        .ex-pd-figs div span { display:block; font-size:.64rem; text-transform:uppercase; letter-spacing:.06em; color:${FAINT}; margin-bottom:3px; }
        .ex-pd-figs div b { font-size:1rem; }
        .ex-pd-actions { display:flex; gap:7px; flex-wrap:wrap; }
        .ex-pd-cats { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:14px; }
        .ex-pd-cat { display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid ${LINE}; border-radius:3px; padding:4px 10px; font-size:.75rem; font-weight:600; }
        .ex-pd-cat i { width:7px; height:7px; border-radius:50%; }
        .ex-pd-month { background:#fff; border:1px solid ${LINE}; border-radius:3px; margin-bottom:9px; overflow:hidden; }
        .ex-pd-month:last-child { margin-bottom:0; }
        .ex-pd-month-h { display:flex; align-items:baseline; padding:9px 13px; border-bottom:1px solid ${LINE_SOFT}; }
        .ex-pd-month-h b { font-size:.8rem; font-weight:700; }
        .ex-pd-month-h em { margin-left:auto; font-style:normal; font-size:.85rem; font-weight:700; color:${ACCENT}; }
        .ex-pd-row { display:flex; align-items:center; gap:11px; padding:9px 13px; border-bottom:1px solid ${LINE_SOFT}; font-size:.82rem; }
        .ex-pd-row:last-child { border-bottom:none; }
        .ex-pd-date { color:${MUTED}; white-space:nowrap; font-size:.76rem; min-width:88px; }
        .ex-pd-title { flex:1; min-width:0; font-weight:600; }
        .ex-pd-title em { font-style:normal; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; margin-left:8px; }
        .ex-pd-amt { font-weight:700; white-space:nowrap; }
        .ex-pempty { padding:22px 12px; text-align:center; color:${FAINT}; font-size:.84rem; }

        /* ── Payee picker (inside the expense modal) ── */
        .ex-picker { border:1px solid ${LINE}; border-radius:3px; padding:11px; background:${WASH}; }
        .ex-plist { margin-top:9px; max-height:210px; overflow-y:auto; background:#fff; border:1px solid ${LINE}; border-radius:3px; }
        .ex-plist::-webkit-scrollbar { width:5px; }
        .ex-plist::-webkit-scrollbar-thumb { background:${LINE}; border-radius:10px; }
        .ex-pitem { display:flex; align-items:center; gap:10px; width:100%; text-align:left; background:none; border:none; border-bottom:1px solid ${LINE_SOFT}; padding:9px 12px; cursor:pointer; font-family:inherit; color:${INK}; }
        .ex-pitem:last-child { border-bottom:none; }
        .ex-pitem:hover { background:${WASH}; }
        .ex-pitem-main { flex:1; min-width:0; }
        .ex-pitem-name { display:block; font-size:.86rem; font-weight:600; }
        .ex-pitem-sub { display:block; font-size:.72rem; color:${MUTED}; margin-top:1px; }
        .ex-pitem-amt { font-size:.72rem; white-space:nowrap; flex-shrink:0; }
        .ex-addp { width:100%; margin-top:9px; background:#fff; border:1px dashed ${LINE}; color:${ACCENT}; border-radius:3px; padding:9px; font-size:.82rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ex-addp:hover { border-color:${ACCENT}; background:#fdf2ee; }
        .ex-pactions { display:grid; gap:7px; margin-top:9px; }
        .ex-pactions .ex-ghost { width:100%; }
        .ex-addp { margin-top:0; }
        .ex-seg.tiny button { padding:7px 8px; font-size:.75rem; }
        .ex-seg.tiny button em { font-style:normal; opacity:.65; margin-left:4px; }
        .ex-pempty b { display:block; color:${INK}; font-weight:700; margin-bottom:3px; }

        .ex-picked { display:flex; align-items:center; gap:12px; border:1px solid ${ACCENT}; background:#fdf2ee; border-radius:3px; padding:12px 14px; }
        .ex-picked-main { flex:1; min-width:0; }
        .ex-picked-name { font-size:.92rem; font-weight:700; }
        .ex-picked-sub { font-size:.76rem; color:${MUTED}; margin-top:2px; }
        .ex-change { background:#fff; border:1px solid ${LINE}; border-radius:3px; padding:6px 13px; font-size:.76rem; font-weight:700; cursor:pointer; font-family:inherit; color:${INK}; flex-shrink:0; }
        .ex-change:hover { background:${WASH}; }

        .ex-newp { border:1px solid ${LINE}; border-radius:3px; padding:13px; background:${WASH}; }
        .ex-newp-h { display:flex; align-items:center; justify-content:space-between; margin-bottom:11px; }
        .ex-newp-h b { font-size:.84rem; }
        .ex-clash { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; background:#fdf3d9; border:1px solid #f0e0b4; border-radius:3px; padding:9px 12px; margin-top:10px; font-size:.8rem; color:#8a6b1f; }
        .ex-usebtn { background:${GOLD}; color:#fff; border:none; border-radius:3px; padding:6px 13px; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ex-savep { width:100%; margin-top:13px; background:${ACCENT}; color:#fff; border:none; border-radius:3px; padding:11px; font-size:.86rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ex-savep:hover:not(:disabled) { background:${ACCENT_DK}; }
        .ex-savep:disabled { opacity:.45; cursor:not-allowed; }

        /* ── Modals ── */
        .ex-ov { position:fixed; inset:0; background:rgba(31,36,48,.5); z-index:1000; display:flex; align-items:center; justify-content:center; padding:24px 20px; }
        .ex-modal { background:#fff; width:100%; max-width:620px; border-radius:4px; position:relative; display:flex; flex-direction:column; max-height:calc(100vh - 48px); overflow:hidden; }
        .ex-modal.small { max-width:520px; }
        .ex-modal.wide { max-width:900px; }
        .ex-mgrid { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:20px; align-items:start; }
        .ex-mcol { display:grid; gap:15px; align-content:start; }
        .ex-mhead { padding:22px 26px 17px; border-bottom:1px solid ${LINE_SOFT}; flex-shrink:0; }
        .ex-mtitle { font-size:1.05rem; font-weight:700; }
        .ex-msub { font-size:.8rem; color:${MUTED}; margin-top:4px; line-height:1.5; }
        .ex-mbody { padding:20px 26px 26px; overflow-y:auto; flex:1 1 auto; min-height:0; }
        .ex-mbody::-webkit-scrollbar { width:5px; }
        .ex-mbody::-webkit-scrollbar-thumb { background:${LINE}; border-radius:10px; }
        .ex-close { position:absolute; top:15px; right:18px; background:none; border:none; font-size:1.4rem; line-height:1; cursor:pointer; color:${MUTED}; z-index:1; }
        .ex-close:hover { color:${INK}; }
        .ex-grid { display:grid; gap:15px; }
        .ex-2col { display:grid; grid-template-columns:1fr 1fr; gap:13px; }
        .ex-lbl { display:block; font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:${MUTED}; margin-bottom:6px; }
        .ex-inp { width:100%; padding:10px 12px; border:1px solid ${LINE}; border-radius:3px; font-size:.9rem; font-family:inherit; color:${INK}; background:#fff; }
        .ex-inp:focus { outline:none; border-color:${ACCENT}; }
        .ex-amtinp { font-size:1.05rem; font-weight:700; }
        .ex-hint { font-size:.74rem; color:${FAINT}; margin-top:6px; line-height:1.5; }
        .ex-hint.center { text-align:center; margin-top:0; }

        .ex-cats { display:flex; flex-wrap:wrap; gap:7px; }
        .ex-cat-pick { display:inline-flex; align-items:center; gap:6px; border:1px solid ${LINE}; background:#fff; border-radius:3px; padding:7px 12px; font-size:.8rem; font-weight:600; cursor:pointer; font-family:inherit; color:${MUTED}; }
        .ex-cat-pick i { width:7px; height:7px; border-radius:50%; }
        .ex-cat-pick:hover:not(.on) { background:${WASH}; }
        .ex-cat-pick.on { font-weight:700; }

        .ex-save { background:${ACCENT}; color:#fff; border:none; border-radius:3px; padding:13px; width:100%; font-size:.92rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ex-save:hover:not(:disabled) { background:${ACCENT_DK}; }
        .ex-save:disabled { opacity:.45; cursor:not-allowed; }

        @media (max-width:1100px){
          .ex-stats { grid-template-columns:repeat(3,minmax(0,1fr)); }
          .ex-split { grid-template-columns:1fr; }
        }
        @media (max-width:860px){
          .ex-mgrid { grid-template-columns:1fr; }
        }
        @media (max-width:700px){
          .ex-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .ex-search { width:100%; }
          .ex-add { margin-left:0; width:100%; }
          .ex-2col { grid-template-columns:1fr; }
          .ex-note { max-width:150px; }
          .ex-row { flex-wrap:wrap; }
          .ex-row-r { width:100%; justify-content:space-between; }
          .ex-person-h { flex-wrap:wrap; }
          .ex-pd-row { flex-wrap:wrap; }
          .ex-pd-date { min-width:0; }
        }
      `}</style>

      <div className="ex-views">
        <button className={`ex-view${view === "expenses" ? " on" : ""}`} onClick={() => setView("expenses")}>
          Expenses
        </button>
        <button className={`ex-view${view === "people" ? " on" : ""}`} onClick={() => setView("people")}>
          People {pp.totals.people > 0 && <span style={{ color: FAINT, fontWeight: 500 }}>({pp.totals.people})</span>}
        </button>
      </div>

      {view === "expenses" ? (
        <>
          <ExpenseStats
            summary={ex.summary}
            period={ex.period}
            loading={ex.loading}
            payeeId={ex.payeeId}
            onPayee={ex.setPayeeId}
            category={ex.category}
            onCategory={ex.setCategory}
          />

          <ExpenseList
            byDay={ex.byDay}
            expenses={ex.expenses}
            loading={ex.loading}
            error={ex.error}
            shownTotal={ex.shownTotal}
            period={ex.period}
            range={ex.range}
            onPeriod={ex.changePeriod}
            onCustomRange={ex.setCustomRange}
            category={ex.category} onCategory={ex.setCategory}
            method={ex.method}     onMethod={ex.setMethod}
            search={ex.search}     onSearch={ex.setSearch}
            payeeId={ex.payeeId}   onPayee={ex.setPayeeId}
            dirty={ex.dirty}       onClear={ex.clearFilters}
            onAdd={openAddExp}
            onEdit={openEditExp}
            onDelete={deleteExpense}
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
          onSeeExpenses={seeExpensesFor}
        />
      )}

      {showExp && (
        <ExpenseModal
          editing={editExp}
          payees={pp.payees}
          saving={savingExp}
          error={expError}
          defaultPayeeId={ex.payeeId || undefined}
          onCreatePayee={createPayeeInline}
          onSyncEmployees={syncEmployees}
          syncing={syncing}
          onSave={saveExpense}
          onClose={() => setShowExp(false)}
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