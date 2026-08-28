// src/components/quick-order/index.tsx
// ── Quick Orders shell: data, tabs, pagination, drawers ────────────────────
import { useEffect, useState, useCallback } from "react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import OrdersTable      from "./OrdersTable";
import LedgerTable      from "./LedgerTable";
import EntryDrawer      from "./EntryDrawer";
import LedgerDrill      from "./LedgerDrill";
import OrderDetailDrawer from "./OrderDetailDrawer";
import {
  QuickOrder, LedgerRow, EmployeeRec, PAGE,
  TERRA, TERRA_DK, INK, MUTE, LINE, IVORY, CARD, GREEN, SANS,
  rupees, todayStr, fmtDate,
} from "./types";

export default function QuickOrders() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [view,        setView]        = useState<"daily" | "ledger">("daily");
  const [date,        setDate]        = useState(todayStr());
  const [ledgerDate,  setLedgerDate]  = useState<string>("");
  const [entries,     setEntries]     = useState<QuickOrder[]>([]);
  const [ledger,      setLedger]      = useState<LedgerRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [converting,  setConverting]  = useState<string | null>(null);
  const [combining,   setCombining]   = useState(false);

  const [dailyVisible,  setDailyVisible]  = useState(PAGE);
  const [ledgerVisible, setLedgerVisible] = useState(PAGE);

  // drawers
  const [entryOpen,      setEntryOpen]      = useState(false);
  const [editEntry,      setEditEntry]      = useState<QuickOrder | null>(null);
  const [detailOrder,    setDetailOrder]    = useState<QuickOrder | null>(null); // View Details
  const [drillRow,       setDrillRow]       = useState<LedgerRow | null>(null);
  const [drillEntries,   setDrillEntries]   = useState<QuickOrder[]>([]);
  const [drillLoading,   setDrillLoading]   = useState(false);

  // employees
  const [employees, setEmployees] = useState<EmployeeRec[]>([]);

  // assign modal
  const [assignTarget, setAssignTarget] = useState<QuickOrder | null>(null);
  const [assignEmpId,  setAssignEmpId]  = useState("");
  const [assignBusy,   setAssignBusy]   = useState(false);
  const [assignErr,    setAssignErr]    = useState("");

  // ── Load employees ──
  useEffect(() => {
    if (!isAdmin) return;
    api.get("/api/quick-orders/employees")
      .then(r => setEmployees(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [isAdmin]);

  // ── Load data ──
  const loadEntries = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get(`/api/quick-orders?date=${date}`); setEntries(data); setDailyVisible(PAGE); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [date]);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    try {
      const qs = ledgerDate ? `?date=${ledgerDate}` : "";
      const { data } = await api.get(`/api/quick-orders/ledger${qs}`);
      setLedger(data); setLedgerVisible(PAGE);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [ledgerDate]);

  useEffect(() => { if (view === "daily") loadEntries(); else loadLedger(); }, [view, loadEntries, loadLedger]);

  // ── Patch an order in all local state arrays ──
  function patchOrder(updated: QuickOrder) {
    const upd = (arr: QuickOrder[]) => arr.map(e => e.id === updated.id ? updated : e);
    setEntries(upd);
    setDrillEntries(upd);
    if (detailOrder?.id === updated.id) setDetailOrder(updated);
  }

  // ── Patch just the task inside an order (from socket events) ──
  function patchTaskInOrder(updatedTask: { id: string; status: string; notes?: string; startedAt?: string; completedAt?: string }) {
    const upd = (arr: QuickOrder[]) => arr.map(e =>
      e.task?.id === updatedTask.id
        ? { ...e, task: { ...e.task!, status: updatedTask.status as any, notes: updatedTask.notes, startedAt: updatedTask.startedAt, completedAt: updatedTask.completedAt } }
        : e
    );
    setEntries(upd);
    setDrillEntries(upd);
    setDetailOrder(prev =>
      prev?.task?.id === updatedTask.id
        ? { ...prev, task: { ...prev.task!, status: updatedTask.status as any, notes: updatedTask.notes, startedAt: updatedTask.startedAt, completedAt: updatedTask.completedAt } }
        : prev
    );
  }

  // ── Socket.IO — listen for real-time task updates from employees ──
  useSocket({
    "task:updated": (task: any) => { patchTaskInOrder(task); },
    "task:created": (task: any) => {
      // When employee claims an order, task gets created — reload to get fresh data
      if (task.quickOrderId) loadEntries();
    },
    "task:deleted": ({ id }: { id: string }) => {
      const upd = (arr: QuickOrder[]) => arr.map(e => e.task?.id === id ? { ...e, task: null } : e);
      setEntries(upd); setDrillEntries(upd);
      setDetailOrder(prev => prev?.task?.id === id ? { ...prev, task: null } : prev);
    },
  });

  // ── Actions ──
  function openCreate()             { setEditEntry(null); setEntryOpen(true); }
  function openEdit(e: QuickOrder)  { setDetailOrder(null); setDrillRow(null); setEditEntry(e); setEntryOpen(true); }
  function openDetail(e: QuickOrder){ setDetailOrder(e); }

  function afterSave() {
    setEntryOpen(false); setEditEntry(null);
    if (view === "daily") loadEntries(); else loadLedger();
    if (drillRow) reopenDrill(drillRow);
  }

  async function deleteEntry(id: string) {
    setDetailOrder(null);
    try {
      await api.delete(`/api/quick-orders/${id}`);
      setEntries(p => p.filter(e => e.id !== id));
      setDrillEntries(p => p.filter(e => e.id !== id));
    } catch (err: any) { alert(err.response?.data?.message || "Failed to delete"); }
  }

  async function convertToInvoice(id: string) {
    if (!confirm("Convert this order to a full invoice? Linked stock will be consumed. This cannot be undone.")) return;
    setConverting(id);
    try {
      const { data } = await api.post(`/api/quick-orders/${id}/convert`);
      const mark = (arr: QuickOrder[]) => arr.map(e => e.id === id ? { ...e, status: "billed" as const, invoiceNo: data.invoiceNo } : e);
      setEntries(mark); setDrillEntries(mark);
      if (detailOrder?.id === id) setDetailOrder(p => p ? { ...p, status: "billed", invoiceNo: data.invoiceNo } : p);
      alert(`Invoice ${data.invoiceNo} created!`);
    } catch (err: any) { alert(err.response?.data?.message || "Failed to convert"); }
    finally { setConverting(null); }
  }

  async function convertCombined() {
    const unbilled = drillEntries.filter(e => e.status !== "billed");
    if (unbilled.length === 0) { alert("No unbilled orders to combine."); return; }
    if (unbilled.length === 1) { convertToInvoice(unbilled[0].id); return; }
    if (!confirm(`Combine ${unbilled.length} orders into ONE invoice?`)) return;
    setCombining(true);
    try {
      const { data } = await api.post("/api/quick-orders/convert-combined", { entryIds: unbilled.map(e => e.id) });
      const mark = (arr: QuickOrder[]) => arr.map(e => unbilled.some(u => u.id === e.id) ? { ...e, status: "billed" as const, invoiceNo: data.invoiceNo } : e);
      setDrillEntries(mark); setEntries(mark);
      alert(`Combined invoice ${data.invoiceNo} created!`);
      loadLedger();
    } catch (err: any) { alert(err.response?.data?.message || "Failed"); }
    finally { setCombining(false); }
  }

  // ── Assign / claim / unassign ──
  function openAssign(order: QuickOrder) { setAssignTarget(order); setAssignEmpId(""); setAssignErr(""); }

  async function confirmAssign() {
    if (!assignTarget || !assignEmpId) return;
    setAssignBusy(true); setAssignErr("");
    try {
      const { data } = await api.post(`/api/quick-orders/${assignTarget.id}/assign`, { assignToId: assignEmpId });
      patchOrder({ ...assignTarget, task: data.task });
      setAssignTarget(null);
    } catch (err: any) { setAssignErr(err.response?.data?.message || "Failed to assign"); }
    finally { setAssignBusy(false); }
  }

  async function claimOrder(id: string) {
    if (!confirm("Claim this order?")) return;
    try {
      const { data } = await api.post(`/api/quick-orders/${id}/claim`);
      const upd = (arr: QuickOrder[]) => arr.map(e => e.id === id ? { ...e, task: data.task } : e);
      setEntries(upd); setDrillEntries(upd);
      if (detailOrder?.id === id) setDetailOrder(p => p ? { ...p, task: data.task } : p);
    } catch (err: any) { alert(err.response?.data?.message || "Failed to claim"); }
  }

  async function unassignOrder(id: string) {
    if (!confirm("Remove assignment? The task will be deleted.")) return;
    try {
      await api.post(`/api/quick-orders/${id}/unassign`);
      const upd = (arr: QuickOrder[]) => arr.map(e => e.id === id ? { ...e, task: null } : e);
      setEntries(upd); setDrillEntries(upd);
      if (detailOrder?.id === id) setDetailOrder(p => p ? { ...p, task: null } : p);
    } catch (err: any) { alert(err.response?.data?.message || "Failed to unassign"); }
  }

  // ── Drill ──
  async function reopenDrill(row: LedgerRow) {
    setDrillLoading(true);
    try {
      const params = new URLSearchParams();
      if (row.customerId) params.set("customerId", row.customerId);
      if (ledgerDate) params.set("date", ledgerDate);
      const { data } = await api.get(`/api/quick-orders?${params.toString()}`);
      setDrillEntries(data.filter((e: QuickOrder) =>
        row.customerId ? e.customerId === row.customerId : e.customerName === row.customerName,
      ));
    } catch { /* ignore */ } finally { setDrillLoading(false); }
  }
  function openDrill(row: LedgerRow) { setDrillRow(row); reopenDrill(row); }

  // ── Summaries ──
  const totalToday   = entries.reduce((s, e) => s + Number(e.amount), 0);
  const totalAdv     = entries.reduce((s, e) => s + Number(e.advancePaid), 0);
  const totalDue     = Math.max(0, totalToday - totalAdv);
  const ledgerTotal  = ledger.reduce((s, r) => s + r.totalAmount, 0);
  const ledgerAdv    = ledger.reduce((s, r) => s + r.totalAdvance, 0);
  const ledgerDue    = ledger.reduce((s, r) => s + r.totalDue, 0);
  const ledgerOrders = ledger.reduce((s, r) => s + r.totalOrders, 0);

  return (
    <div style={st.wrap}>
      <style>{`
        .qo-tab { transition:all .15s; }
        .qo-tab:hover:not(.on) { background:${IVORY}; color:${TERRA}; }
        .qo-add:hover { background:${TERRA_DK}; }
        .qo-alltime:hover:not(.on) { background:${IVORY}; }
        .qo-trow:hover td { background:#fdf8f2; }
        .qo-abtn:hover { background:${IVORY}; }
        .qo-showmore:hover { background:#f3efe8; color:${TERRA}; }
        * { box-sizing:border-box; }
      `}</style>

      {/* Topbar */}
      <div style={st.topbar}>
        <div style={st.tabs}>
          <button className={`qo-tab${view === "daily"  ? " on" : ""}`} style={{ ...st.tab, ...(view === "daily"  ? st.tabOn : {}) }} onClick={() => { setView("daily");  setDrillRow(null); }}>Daily Register</button>
          <button className={`qo-tab${view === "ledger" ? " on" : ""}`} style={{ ...st.tab, ...(view === "ledger" ? st.tabOn : {}) }} onClick={() => { setView("ledger"); setDrillRow(null); }}>Customer Ledger</button>
        </div>
        {view === "daily" && (
          <input type="date" style={st.date} value={date} onChange={(e) => setDate(e.target.value)} />
        )}
        {view === "ledger" && (
          <>
            <button className={`qo-alltime${ledgerDate === "" ? " on" : ""}`} style={{ ...st.alltime, ...(ledgerDate === "" ? st.alltimeOn : {}) }} onClick={() => setLedgerDate("")}>All Time</button>
            <input type="date" style={st.date} value={ledgerDate} onChange={(e) => setLedgerDate(e.target.value)} />
            {ledgerDate && <span style={st.showing}>Showing {fmtDate(ledgerDate + "T00:00:00")}</span>}
          </>
        )}
        {isAdmin && <button className="qo-add" style={st.add} onClick={openCreate}>+ New Entry</button>}
      </div>

      {/* KPI strip */}
      <div style={st.kpiStrip}>
        {view === "daily" ? (
          <>
            <Kpi label="Total Billed"      val={rupees(totalToday)}  sub={`${entries.length} order${entries.length !== 1 ? "s" : ""}`} color="#c2974a" />
            <Kpi label="Advance Received"  val={rupees(totalAdv)}    sub="Paid upfront"  color={GREEN} />
            <Kpi label="Balance Due"       val={rupees(totalDue)}    sub="Still owed"    color={totalDue > 0 ? TERRA : GREEN} />
          </>
        ) : (
          <>
            <Kpi label="Total Billed"      val={rupees(ledgerTotal)} sub={`${ledgerOrders} orders · ${ledger.length} customers`} color="#c2974a" />
            <Kpi label="Advance Received"  val={rupees(ledgerAdv)}   sub="Paid upfront"  color={GREEN} />
            <Kpi label="Balance Due"       val={rupees(ledgerDue)}   sub="Outstanding"   color={ledgerDue > 0 ? TERRA : GREEN} />
          </>
        )}
      </div>

      {/* Content */}
      {view === "daily" ? (
        <OrdersTable
          entries={entries}
          visible={dailyVisible}
          loading={loading}
          date={date}
          isAdmin={isAdmin}
          onShowMore={() => setDailyVisible(v => v + PAGE)}
          onViewDetails={openDetail}
          onAssign={openAssign}
          onClaim={claimOrder}
          onUnassign={unassignOrder}
        />
      ) : (
        <LedgerTable
          rows={ledger}
          visible={ledgerVisible}
          loading={loading}
          ledgerDate={ledgerDate}
          onShowMore={() => setLedgerVisible(v => v + PAGE)}
          onDrill={openDrill}
        />
      )}

      {/* Entry Drawer */}
      {entryOpen && isAdmin && (
        <EntryDrawer
          editEntry={editEntry}
          onClose={() => { setEntryOpen(false); setEditEntry(null); }}
          onSaved={afterSave}
          employees={employees}
        />
      )}

      {/* Order Detail Drawer — right-side slide-in */}
      {detailOrder && (
        <OrderDetailDrawer
          order={detailOrder}
          isAdmin={isAdmin}
          onClose={() => setDetailOrder(null)}
          onEdit={openEdit}
          onDelete={deleteEntry}
          onAssign={openAssign}
          onUnassign={unassignOrder}
          onUpdated={patchOrder}
        />
      )}

      {/* Ledger drill */}
      {drillRow && (
        <LedgerDrill
          row={drillRow}
          entries={drillEntries}
          loading={drillLoading}
          ledgerDate={ledgerDate}
          isAdmin={isAdmin}
          onClose={() => setDrillRow(null)}
          onEdit={openEdit}
          onAssign={openAssign}
          onClaim={claimOrder}
          onUnassign={unassignOrder}
        />
      )}

      {/* Assign Modal */}
      {assignTarget && isAdmin && (
        <div style={st.ov} onClick={() => setAssignTarget(null)}>
          <div style={st.assignModal} onClick={e => e.stopPropagation()}>
            <div style={st.assignTitle}>Assign Order</div>
            <div style={{ fontSize: 13, color: MUTE, marginBottom: 16 }}>
              <b>{assignTarget.customerName}</b> — {(assignTarget.workDetails || "").slice(0, 80)}{(assignTarget.workDetails || "").length > 80 ? "…" : ""}
            </div>
            {assignErr && <div style={st.err}>{assignErr}</div>}
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MUTE, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Assign to</label>
            <select style={{ ...st.inp, marginBottom: 16 }} value={assignEmpId} onChange={e => setAssignEmpId(e.target.value)}>
              <option value="">Select employee…</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ flex: 1, padding: 10, border: `1px solid ${LINE}`, background: "#fff", cursor: "pointer", fontFamily: SANS, fontWeight: 700, fontSize: 13 }} onClick={() => setAssignTarget(null)}>Cancel</button>
              <button style={{ flex: 1, padding: 10, border: "none", background: assignEmpId ? TERRA : "#ccc", color: "#fff", cursor: assignEmpId ? "pointer" : "not-allowed", fontFamily: SANS, fontWeight: 700, fontSize: 13 }}
                disabled={!assignEmpId || assignBusy} onClick={confirmAssign}>
                {assignBusy ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, val, sub, color }: { label: string; val: string; sub: string; color: string }) {
  return (
    <div style={st.kpi}>
      <div style={st.kpiL}>{label}</div>
      <div style={{ ...st.kpiN, color }}>{val}</div>
      <div style={st.kpiSub}>{sub}</div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrap:        { fontFamily: SANS, color: INK, fontVariantNumeric: "tabular-nums" },
  topbar:      { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 },
  tabs:        { display: "flex", border: `1px solid ${LINE}` },
  tab:         { padding: "9px 20px", border: "none", background: CARD, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS, color: MUTE },
  tabOn:       { background: TERRA, color: "#fff" },
  date:        { padding: "9px 12px", border: `1px solid ${LINE}`, fontSize: 13, fontFamily: SANS, background: CARD, color: INK },
  alltime:     { padding: "9px 14px", border: `1px solid ${LINE}`, background: CARD, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: SANS, color: MUTE },
  alltimeOn:   { background: INK, color: "#fff", borderColor: INK },
  showing:     { fontSize: 12.5, color: MUTE, fontWeight: 600 },
  add:         { marginLeft: "auto", background: TERRA, color: "#fff", border: "none", padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS },
  kpiStrip:    { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: LINE, border: `1px solid ${LINE}`, marginBottom: 18 },
  kpi:         { background: CARD, padding: "18px 20px" },
  kpiL:        { fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: MUTE, marginBottom: 8 },
  kpiN:        { fontSize: 26, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  kpiSub:      { fontSize: 11, color: MUTE, marginTop: 6 },
  ov:          { position: "fixed", inset: 0, background: "rgba(31,36,48,.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  assignModal: { background: "#fff", width: "100%", maxWidth: 400, padding: 26, fontFamily: SANS, color: INK },
  assignTitle: { fontSize: 16, fontWeight: 800, marginBottom: 12, color: INK },
  inp:         { width: "100%", padding: "9px 12px", border: `1px solid ${LINE}`, fontSize: 14, fontFamily: SANS, color: INK, background: "#fff", outline: "none", boxSizing: "border-box" },
  err:         { background: "#fef2ee", border: "1px solid #f5c4bb", color: "#b23c1c", padding: "9px 12px", fontSize: 13, marginBottom: 12 },
};