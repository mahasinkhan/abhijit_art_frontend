// src/components/inventory/index.tsx
// ── Thin shell: data fetching, top-level state, layout ────────────────────
// All UI is in the sub-components. This file stays under ~120 lines.

import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import InventorySidebar   from "./InventorySidebar";
import InventoryTable     from "./InventoryTable";
import InventoryOverview  from "./InventoryOverview";
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

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [itemDrawer, setItemDrawer] = useState<InventoryItem | "new" | null>(null);
  const [moveDrawer, setMoveDrawer] = useState<InventoryItem | null>(null);
  const [histDrawer, setHistDrawer] = useState<InventoryItem | null>(null);
  const [suppDrawer, setSuppDrawer] = useState<Supplier | "new" | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const catSummary = useMemo(() => buildCatSummary(items), [items]);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get("/api/inventory/items"),
      api.get("/api/inventory/dashboard"),
    ]).then(([iR, dR]) => {
      setItems(Array.isArray(iR.data) ? iR.data : []);
      setKpis(dR.data?.kpis ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadSuppliers = () => {
    if (suppLoaded) return;
    setSuppLoading(true);
    api.get("/api/inventory/suppliers")
      .then(r => { setSuppliers(Array.isArray(r.data) ? r.data : []); setSuppLoaded(true); })
      .catch(() => setSuppLoaded(true))
      .finally(() => setSuppLoading(false));
  };

  const refresh = () => {
    Promise.all([api.get("/api/inventory/items"), api.get("/api/inventory/dashboard")])
      .then(([iR, dR]) => { setItems(Array.isArray(iR.data)?iR.data:[]); setKpis(dR.data?.kpis??null); })
      .catch(() => {});
  };

  // ── Handlers passed to drawers ────────────────────────────────────────────
  const afterSave = () => { setItemDrawer(null); setMoveDrawer(null); setHistDrawer(null); setSuppDrawer(null); setSuppLoaded(false); refresh(); };

  // ── CSV export (lives here so it can see full items list) ─────────────────
  const exportCSV = () => {
    const visible = items.filter(it => (!selCat || (it.category||"Uncategorised") === selCat) && (!lowOnly || dec(it.quantity) <= dec(it.reorderLevel)));
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

      <InventorySidebar
        catSummary       = {catSummary}
        kpis             = {kpis}
        suppliers        = {suppliers}
        selCat           = {selCat}
        lowOnly          = {lowOnly}
        onSelCat         = {cat => { setSelCat(cat); setLowOnly(false); }}
        onLowToggle      = {() => setLowOnly(v => !v)}
        onAddItem        = {() => setItemDrawer("new")}
        onAddItemWithCat = {cat => { setSelCat(cat); setItemDrawer("new"); }}
        onOpenSupp       = {s  => setSuppDrawer(s)}
        onSuppTab        = {loadSuppliers}
      />

      <div style={st.mainWrap}>
        {/* ── View toggle strip ───────────────────────────────────────────── */}
        <div style={st.viewStrip}>
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

        {activeView === "overview"
          ? <InventoryOverview />
          : activeView === "suppliers"
          ? <SupplierList
              suppliers = {suppliers as any}
              loading   = {suppLoading}
              onAdd     = {() => setSuppDrawer("new")}
              onEdit    = {s  => setSuppDrawer(s)}
              onRefresh = {() => { setSuppLoaded(false); setSuppLoading(false); loadSuppliers(); }}
            />
          : <InventoryTable
              items       = {items}
              kpis        = {kpis}
              catSummary  = {catSummary}
              loading     = {loading}
              selCat      = {selCat}
              lowOnly     = {lowOnly}
              onClearCat  = {() => setSelCat("")}
              onClearLow  = {() => setLowOnly(false)}
              onAddItem   = {() => setItemDrawer("new")}
              onMoveDrawer= {it => setMoveDrawer(it)}
              onHistDrawer= {it => setHistDrawer(it)}
              onEditDrawer= {it => setItemDrawer(it)}
              onExportCSV = {exportCSV}
            />
        }
      </div>

      {/* ── Drawers ───────────────────────────────────────────────────────── */}
      {itemDrawer !== null && (
        <ItemDrawer
          item       = {itemDrawer}
          catSummary = {catSummary}
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
        .inv-side-add:hover  { background:${TERRA_DK}!important; }
        .inv-viewbtn:hover   { color:${TERRA}!important; background:#fff8f5!important; }
        * { box-sizing:border-box; }
      `}</style>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  shell:     { display:"flex", minHeight:"calc(100vh - 64px)", fontFamily:SANS, background:IVORY, color:"#1a1d27", overflow:"hidden" },
  mainWrap:  { flex:1, minWidth:0, display:"flex", flexDirection:"column", overflowY:"auto" },
  viewStrip: { display:"flex", gap:0, borderBottom:`1px solid ${LINE}`, background:"#ffffff", flexShrink:0, padding:"0 4px" },
  viewBtn:   { padding:"12px 20px",
               borderTopWidth:0, borderRightWidth:0, borderLeftWidth:0, borderBottomWidth:2,
               borderStyle:"solid", borderColor:"transparent",
               background:"transparent", color:MUTE, fontFamily:SANS, fontWeight:700, fontSize:13.5, cursor:"pointer", transition:"color .18s, border-color .18s" },
  viewBtnOn: { color:TERRA, borderColor:TERRA },
};