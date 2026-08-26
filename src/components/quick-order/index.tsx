// src/components/quick-order/index.tsx
// ── Quick Orders shell: data, tabs, pagination, drawers ────────────────────
import { useEffect, useState, useCallback } from "react";
import api from "../../api";
import OrdersTable from "./OrdersTable";
import LedgerTable from "./LedgerTable";
import EntryDrawer from "./EntryDrawer";
import LedgerDrill from "./LedgerDrill";
import {
  KhataEntry, LedgerRow, PAGE,
  TERRA, TERRA_DK, GOLD, INK, MUTE, LINE, IVORY, CARD, GREEN, SANS,
  rupees, todayStr, fmtDate,
} from "./types";

export default function QuickOrders() {
  const [view, setView]             = useState<"daily" | "ledger">("daily");
  const [date, setDate]             = useState(todayStr());
  const [ledgerDate, setLedgerDate] = useState<string>("");
  const [entries, setEntries]       = useState<KhataEntry[]>([]);
  const [ledger, setLedger]         = useState<LedgerRow[]>([]);
  const [loading, setLoading]       = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [combining, setCombining]   = useState(false);

  const [dailyVisible,  setDailyVisible]  = useState(PAGE);
  const [ledgerVisible, setLedgerVisible] = useState(PAGE);

  // drawers
  const [entryOpen, setEntryOpen]   = useState(false);
  const [editEntry, setEditEntry]   = useState<KhataEntry | null>(null);
  const [drillRow,  setDrillRow]    = useState<LedgerRow | null>(null);
  const [drillEntries, setDrillEntries] = useState<KhataEntry[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  // ── Load ──
  const loadEntries = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get(`/api/khata?date=${date}`); setEntries(data); setDailyVisible(PAGE); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [date]);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    try {
      const qs = ledgerDate ? `?date=${ledgerDate}` : "";
      const { data } = await api.get(`/api/khata/ledger${qs}`);
      setLedger(data); setLedgerVisible(PAGE);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [ledgerDate]);

  useEffect(() => { if (view === "daily") loadEntries(); else loadLedger(); }, [view, loadEntries, loadLedger]);

  // ── Actions ──
  function openCreate() { setEditEntry(null); setEntryOpen(true); }
  function openEdit(e: KhataEntry) { setEditEntry(e); setEntryOpen(true); }

  function afterSave() {
    setEntryOpen(false); setEditEntry(null);
    if (view === "daily") loadEntries(); else loadLedger();
    if (drillRow) reopenDrill(drillRow);
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this order?")) return;
    try {
      await api.delete(`/api/khata/${id}`);
      setEntries((p) => p.filter((e) => e.id !== id));
      setDrillEntries((p) => p.filter((e) => e.id !== id));
    } catch (err: any) { alert(err.response?.data?.error || "Failed to delete"); }
  }

  async function convertToInvoice(id: string) {
    if (!confirm("Convert this order to a full invoice? Linked stock will be consumed automatically. This cannot be undone.")) return;
    setConverting(id);
    try {
      const { data } = await api.post(`/api/khata/${id}/convert`);
      const stockMsg = data.stock?.movementCount
        ? `\n${data.stock.movementCount} stock item(s) consumed.` +
          (data.stock.warnings?.length ? ` ⚠️ ${data.stock.warnings.length} now low/out.` : "")
        : "";
      setEntries((p) => p.map((e) => e.id === id ? { ...e, status: "billed", invoiceNo: data.invoiceNo } : e));
      setDrillEntries((p) => p.map((e) => e.id === id ? { ...e, status: "billed", invoiceNo: data.invoiceNo } : e));
      alert(`Invoice ${data.invoiceNo} created!${stockMsg}`);
    } catch (err: any) { alert(err.response?.data?.error || "Failed to convert"); }
    finally { setConverting(null); }
  }

  async function convertCombined() {
    const unbilled = drillEntries.filter((e) => e.status !== "billed");
    if (unbilled.length === 0) { alert("No unbilled orders to combine."); return; }
    if (unbilled.length === 1) { convertToInvoice(unbilled[0].id); return; }
    if (!confirm(`Combine ${unbilled.length} unbilled orders into ONE invoice for ${drillRow?.customerName}? Linked stock will be consumed. This cannot be undone.`)) return;
    setCombining(true);
    try {
      const { data } = await api.post("/api/khata/convert-combined", { entryIds: unbilled.map((e) => e.id) });
      const stockMsg = data.stock?.movementCount ? `\n${data.stock.movementCount} stock item(s) consumed.` : "";
      const mark = (arr: KhataEntry[]) => arr.map((e) => unbilled.some((u) => u.id === e.id) ? { ...e, status: "billed" as const, invoiceNo: data.invoiceNo } : e);
      setDrillEntries(mark); setEntries(mark);
      alert(`Combined invoice ${data.invoiceNo} created from ${data.mergedCount} orders!${stockMsg}`);
      loadLedger();
    } catch (err: any) { alert(err.response?.data?.error || "Failed to create combined invoice"); }
    finally { setCombining(false); }
  }

  async function reopenDrill(row: LedgerRow) {
    setDrillLoading(true);
    try {
      const params = new URLSearchParams();
      if (row.customerId) params.set("customerId", row.customerId);
      if (ledgerDate) params.set("date", ledgerDate);
      const { data } = await api.get(`/api/khata?${params.toString()}`);
      setDrillEntries(data.filter((e: KhataEntry) =>
        row.customerId ? e.customerId === row.customerId : e.customerName === row.customerName
      ));
    } catch { /* ignore */ } finally { setDrillLoading(false); }
  }
  function openDrill(row: LedgerRow) { setDrillRow(row); reopenDrill(row); }

  // ── Summaries (full arrays; pagination is display-only) ──
  const totalToday = entries.reduce((s, e) => s + Number(e.amount), 0);
  const totalAdv   = entries.reduce((s, e) => s + Number(e.advancePaid), 0);
  const totalDue   = Math.max(0, totalToday - totalAdv);

  const ledgerTotal = ledger.reduce((s, r) => s + r.totalAmount, 0);
  const ledgerAdv   = ledger.reduce((s, r) => s + r.totalAdvance, 0);
  const ledgerDue   = ledger.reduce((s, r) => s + r.totalDue, 0);
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
          <button className={`qo-tab${view === "daily" ? " on" : ""}`} style={{ ...st.tab, ...(view === "daily" ? st.tabOn : {}) }} onClick={() => { setView("daily"); setDrillRow(null); }}>Daily Register</button>
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
        <button className="qo-add" style={st.add} onClick={openCreate}>+ New Entry</button>
      </div>

      {/* KPI strip */}
      <div style={st.kpiStrip}>
        {view === "daily" ? (
          <>
            <Kpi label="Total Billed" val={rupees(totalToday)} sub={`${entries.length} order${entries.length !== 1 ? "s" : ""}`} color={GOLD} />
            <Kpi label="Advance Received" val={rupees(totalAdv)} sub="Paid upfront" color={GREEN} />
            <Kpi label="Balance Due" val={rupees(totalDue)} sub="Still owed" color={totalDue > 0 ? TERRA : GREEN} />
          </>
        ) : (
          <>
            <Kpi label="Total Billed" val={rupees(ledgerTotal)} sub={`${ledgerOrders} orders · ${ledger.length} customers`} color={GOLD} />
            <Kpi label="Advance Received" val={rupees(ledgerAdv)} sub="Paid upfront" color={GREEN} />
            <Kpi label="Balance Due" val={rupees(ledgerDue)} sub="Outstanding" color={ledgerDue > 0 ? TERRA : GREEN} />
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
          converting={converting}
          onShowMore={() => setDailyVisible(v => v + PAGE)}
          onConvert={convertToInvoice}
          onEdit={openEdit}
          onDelete={deleteEntry}
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

      {/* Entry drawer */}
      {entryOpen && (
        <EntryDrawer
          editEntry={editEntry}
          onClose={() => { setEntryOpen(false); setEditEntry(null); }}
          onSaved={afterSave}
        />
      )}

      {/* Ledger drill */}
      {drillRow && (
        <LedgerDrill
          row={drillRow}
          entries={drillEntries}
          loading={drillLoading}
          ledgerDate={ledgerDate}
          converting={converting}
          combining={combining}
          onClose={() => setDrillRow(null)}
          onConvert={convertToInvoice}
          onCombine={convertCombined}
          onEdit={openEdit}
        />
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
  wrap:      { fontFamily: SANS, color: INK, fontVariantNumeric: "tabular-nums" },
  topbar:    { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 },
  tabs:      { display: "flex", border: `1px solid ${LINE}` },
  tab:       { padding: "9px 20px", border: "none", background: CARD, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS, color: MUTE },
  tabOn:     { background: TERRA, color: "#fff" },
  date:      { padding: "9px 12px", border: `1px solid ${LINE}`, fontSize: 13, fontFamily: SANS, background: CARD, color: INK },
  alltime:   { padding: "9px 14px", border: `1px solid ${LINE}`, background: CARD, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: SANS, color: MUTE },
  alltimeOn: { background: INK, color: "#fff", borderColor: INK },
  showing:   { fontSize: 12.5, color: MUTE, fontWeight: 600 },
  add:       { marginLeft: "auto", background: TERRA, color: "#fff", border: "none", padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS },
  kpiStrip:  { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: LINE, border: `1px solid ${LINE}`, marginBottom: 18 },
  kpi:       { background: CARD, padding: "18px 20px" },
  kpiL:      { fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: MUTE, marginBottom: 8 },
  kpiN:      { fontSize: 26, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  kpiSub:    { fontSize: 11, color: MUTE, marginTop: 6 },
};