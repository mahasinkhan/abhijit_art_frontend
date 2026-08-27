// src/components/inventory/index.tsx
// ── Thin shell: data fetching, top-level state, layout ────────────────────
// Sidebar removed — category filter lives in the InventoryTable toolbar.

import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import InventoryTable     from "./InventoryTable";
import InventoryOverview  from "./InventoryOverview";
import OverviewFilters, { type OverviewFilter } from "./OverviewFilters";
import SupplierList       from "./SupplierList";
import ItemDrawer         from "./ItemDrawer";
import MoveDrawer       from "./MoveDrawer";
import HistoryDrawer    from "./HistoryDrawer";
import SupplierDrawer   from "./SupplierDrawer";
import { InventoryItem, Supplier, KPIs, buildCatSummary, dec, TERRA, TERRA_DK, GOLD, LINE, IVORY, CARD, MUTE, BODY, SANS } from "./types";

export default function Inventory() {
  // ── Remote data ───────────────────────────────────────────────────────────
  const [items,     setItems]     = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [kpis,      setKpis]      = useState<KPIs | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [suppLoaded,  setSuppLoaded]  = useState(false);
  const [suppLoading, setSuppLoading] = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selCat,     setSelCat]     = useState("");
  const [lowOnly,    setLowOnly]    = useState(false);
  const [activeView, setActiveView] = useState<"overview"|"items"|"suppliers">("overview");
  const [ovFilter,   setOvFilter]   = useState<OverviewFilter>({ gran:"month", from:"", to:"" });
  const [stmtActions, setStmtActions] = useState<{ onPurchase:()=>void; onPayment:()=>void; canPay:boolean } | null>(null);

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [itemDrawer, setItemDrawer] = useState<InventoryItem | "new" | null>(null);
  const [moveDrawer, setMoveDrawer] = useState<InventoryItem | null>(null);
  const [histDrawer, setHistDrawer] = useState<InventoryItem | null>(null);
  const [suppDrawer, setSuppDrawer] = useState<Supplier | "new" | null>(null);

  // ── Derived (needed by KPIs, category dropdown, colors) ────────────────────
  const catSummary = useMemo(() => buildCatSummary(items), [items]);

  // ── Load items + KPIs on mount ────────────────────────────────────────────
  useEffect(() => {
    Promise.allSettled([
      api.get("/api/inventory/items"),
      api.get("/api/inventory/dashboard"),
    ]).then(([iR, dR]) => {
      if (iR.status === "fulfilled") setItems(Array.isArray(iR.value.data) ? iR.value.data : []);
      if (dR.status === "fulfilled") setKpis(dR.value.data?.kpis ?? null);
    }).finally(() => setLoading(false));
  }, []);

  // ── Auto-load suppliers when item drawer opens (supplier dropdown needs it) ──
  useEffect(() => {
    if (itemDrawer !== null) loadSuppliers();
  }, [itemDrawer]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSuppliers = () => {
    if (suppLoaded) return;
    setSuppLoading(true);
    api.get("/api/inventory/suppliers")
      .then(r => { setSuppliers(Array.isArray(r.data) ? r.data : []); setSuppLoaded(true); })
      .catch(() => setSuppLoaded(true))
      .finally(() => setSuppLoading(false));
  };

  const refresh = () => {
    Promise.allSettled([api.get("/api/inventory/items"), api.get("/api/inventory/dashboard")])
      .then(([iR, dR]) => {
        if (iR.status === "fulfilled") setItems(Array.isArray(iR.value.data) ? iR.value.data : []);
        if (dR.status === "fulfilled") setKpis(dR.value.data?.kpis ?? null);
      });
  };

  // ── Handlers passed to drawers ────────────────────────────────────────────
  const afterSave = () => {
    setItemDrawer(null); setMoveDrawer(null);
    setHistDrawer(null); setSuppDrawer(null);
    setSuppLoaded(false); refresh();
  };

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const visible = items.filter(it =>
      (!selCat || (it.category||"Uncategorised") === selCat) &&
      (!lowOnly || dec(it.quantity) <= dec(it.reorderLevel))
    );
    const rows = [["SKU","Name","Category","Unit","In Stock","Reorder Level","Cost/Unit","Sell/Unit","Value","Supplier","Updated"]];
    visible.forEach(it => rows.push([
      it.sku, it.name, it.category, it.unit,
      String(dec(it.quantity)), String(dec(it.reorderLevel)),
      String(dec(it.costPrice)), it.sellPrice||"",
      String(dec(it.quantity)*dec(it.costPrice)),
      it.supplier?.name||"", new Date(it.updatedAt).toLocaleString("en-IN"),
    ]));
    const blob = new Blob([rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n")],{type:"text/csv"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `inventory-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  // ═════════════════════════════════════════════════════════════════ RENDER ══
  return (
    <div style={st.shell}>
      <div style={st.mainWrap}>
        {/* ── View toggle strip ───────────────────────────────────────────── */}
        <div style={st.viewStrip}>
          <div style={st.viewTabs}>
            {(["overview","items","suppliers"] as const).map(v => (
              <button
                key={v}
                className="inv-viewbtn"
                style={{ ...st.viewBtn, ...(activeView===v ? st.viewBtnOn : {}) }}
                onClick={() => { setActiveView(v); if(v==="suppliers") loadSuppliers(); }}
              >
                {v === "overview" ? "Overview" : v === "items" ? "Stock Items" : "Suppliers"}
              </button>
            ))}
          </div>
          {activeView === "overview" && (
            <div style={st.viewFilters}>
              <OverviewFilters onChange={setOvFilter} />
            </div>
          )}
          {activeView === "items" && (
            <div style={st.viewActions}>
              <button className="inv-ghost" style={st.hdrGhost} onClick={exportCSV}>⭳ Export CSV</button>
              <button className="inv-cta"   style={st.hdrCta}   onClick={() => setItemDrawer("new")}>+ Add item</button>
            </div>
          )}
          {activeView === "suppliers" && (
            <div style={st.viewActions}>
              {stmtActions ? (
                <>
                  <button className="inv-ghost" style={st.hdrGhost} onClick={stmtActions.onPurchase}>+ Record purchase</button>
                  <button className="inv-cta"   style={{ ...st.hdrCta, ...(stmtActions.canPay ? {} : st.hdrCtaOff) }}
                    onClick={stmtActions.onPayment} disabled={!stmtActions.canPay}>+ Record payment</button>
                </>
              ) : (
                <button className="inv-cta" style={st.hdrCta} onClick={() => setSuppDrawer("new")}>+ Add supplier</button>
              )}
            </div>
          )}
        </div>

        {activeView === "overview"
          ? <InventoryOverview filter={ovFilter} />
          : activeView === "suppliers"
          ? <SupplierList
              suppliers = {suppliers as any}
              loading   = {suppLoading}
              onAdd     = {() => setSuppDrawer("new")}
              onEdit    = {s  => setSuppDrawer(s)}
              onRefresh = {() => { setSuppLoaded(false); setSuppLoading(false); loadSuppliers(); }}
              onStatementActions = {setStmtActions}
            />
          : <InventoryTable
              items       = {items}
              kpis        = {kpis}
              catSummary  = {catSummary}
              loading     = {loading}
              selCat      = {selCat}
              lowOnly     = {lowOnly}
              onSelCat    = {setSelCat}
              onLowToggle = {() => setLowOnly(v => !v)}
              onClearCat  = {() => setSelCat("")}
              onClearLow  = {() => setLowOnly(false)}
              onAddItem   = {() => setItemDrawer("new")}
              onMoveDrawer= {it => setMoveDrawer(it)}
              onHistDrawer= {it => setHistDrawer(it)}
              onEditDrawer= {it => setItemDrawer(it)}
              onExportCSV = {exportCSV}
              onDeleted   = {refresh}
            />
        }
      </div>

      {/* ── Drawers ───────────────────────────────────────────────────────── */}
      {itemDrawer !== null && (
        <ItemDrawer
          item       = {itemDrawer === "new" ? null : itemDrawer}
          items      = {items}
          suppliers  = {suppliers}
          selCat     = {selCat}
          onClose    = {() => setItemDrawer(null)}
          onSaved    = {afterSave}
        />
      )}
      {moveDrawer && (
        <MoveDrawer
          item    = {moveDrawer}
          onClose = {() => setMoveDrawer(null)}
          onSaved = {afterSave}
        />
      )}
      {histDrawer && (
        <HistoryDrawer
          item    = {histDrawer}
          onClose = {() => setHistDrawer(null)}
        />
      )}
      {suppDrawer !== null && (
        <SupplierDrawer
          supplier = {suppDrawer}
          onClose  = {() => setSuppDrawer(null)}
          onSaved  = {afterSave}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        .inv-ghost:hover     { background:${IVORY}!important; border-color:${TERRA}66!important; color:${TERRA}!important; }
        .inv-cta:hover:not(:disabled) { background:${TERRA_DK}!important; transform:translateY(-1px); box-shadow:0 8px 20px ${TERRA}40!important; }
        .inv-cta:disabled    { opacity:.45; cursor:not-allowed; }
        .inv-icon:hover      { background:${IVORY}!important; color:${TERRA}!important; border-color:${TERRA}55!important; }
        .inv-search:focus    { border-color:${TERRA}!important; box-shadow:0 0 0 3px ${TERRA}22!important; outline:none!important; }
        .inv-row:hover td    { background:#fdf8f2!important; }
        .inv-viewbtn:hover   { color:${TERRA}!important; background:#fff8f5!important; }
        * { box-sizing:border-box; }
      `}</style>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  shell:     { display:"flex", minHeight:"calc(100vh - 64px)", fontFamily:SANS, background:IVORY, color:"#1a1d27", overflow:"hidden" },
  mainWrap:  { flex:1, minWidth:0, display:"flex", flexDirection:"column", overflowY:"auto" },
  viewStrip: { display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, borderBottom:`1px solid ${LINE}`, background:"#ffffff", flexShrink:0, padding:"0 12px 0 4px", flexWrap:"wrap" },
  viewTabs:  { display:"flex", gap:0 },
  viewFilters:{ display:"flex", alignItems:"center", padding:"7px 0", marginLeft:"auto" },
  viewActions:{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", marginLeft:"auto" },
  hdrGhost:   { display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px", background:CARD, border:`1px solid ${LINE}`, color:"#1a1d27", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:SANS },
  hdrCta:     { display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", background:TERRA, border:"none", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:SANS },
  hdrCtaOff:  { background:"#e6e2da", color:"#a8a49c", cursor:"not-allowed" },
  viewBtn:   { padding:"12px 20px",
               borderTopWidth:0, borderRightWidth:0, borderLeftWidth:0, borderBottomWidth:2,
               borderStyle:"solid", borderColor:"transparent",
               background:"transparent", color:MUTE, fontFamily:SANS, fontWeight:700, fontSize:13.5, cursor:"pointer", transition:"color .18s, border-color .18s" },
  viewBtnOn: { color:TERRA, borderColor:TERRA },
};