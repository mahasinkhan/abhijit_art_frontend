// src/components/inventory/InventoryTable.tsx
import { useState } from "react";
import api from "../../api";
import Icon from "./Icon";
import PinField from "./PinField";
import OverviewFilters from "./OverviewFilters";
import {
  InventoryItem, KPIs, CatSummary,
  INK, MUTE, LINE, IVORY, CARD, TERRA, GOLD, GOLD_LT, GREEN, RED, SANS,
  catColor, dec, rfmt, dtfmt, unitLabel,
} from "./types";

interface Props {
  items:      InventoryItem[];
  kpis:       KPIs | null;
  catSummary: CatSummary[];
  loading:    boolean;
  selCat:     string;
  lowOnly:    boolean;
  onSelCat:      (cat: string) => void;
  onLowToggle:   () => void;
  onClearCat:    () => void;
  onClearLow:    () => void;
  onAddItem?:    () => void;
  onMoveDrawer:  (it: InventoryItem) => void;
  onHistDrawer:  (it: InventoryItem) => void;
  onEditDrawer:  (it: InventoryItem) => void;
  onExportCSV?:  () => void;
  onDeleted?:    () => void;
}

export default function InventoryTable({
  items, kpis, catSummary, loading, selCat, lowOnly,
  onSelCat, onLowToggle, onClearCat, onClearLow, onMoveDrawer, onHistDrawer, onEditDrawer, onDeleted,
}: Props) {
  const [search,   setSearch]   = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  const [delItem, setDelItem] = useState<InventoryItem | null>(null);
  const [delPin,  setDelPin]  = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delErr,  setDelErr]  = useState("");

  async function confirmDelete() {
    if (!delItem || !delPin) { setDelErr("PIN required"); return; }
    setDelBusy(true); setDelErr("");
    try {
      await api.delete(`/api/inventory/items/${delItem.id}`, { data: { pin: delPin } });
      setDelItem(null); setDelPin("");
      onDeleted?.();
    } catch (ex: any) {
      setDelErr(ex.response?.data?.error || ex.response?.data?.message || "Failed to delete");
    } finally {
      setDelBusy(false);
    }
  }

  const tableItems = (() => {
    let list = items;
    if (selCat)  list = list.filter(it => (it.category||"Uncategorised") === selCat);
    if (lowOnly) list = list.filter(it => dec(it.quantity) <= dec(it.reorderLevel) && dec(it.reorderLevel) > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q) || (it.category||"").toLowerCase().includes(q));
    }
    if (dateFrom) list = list.filter(it => (it.updatedAt||"").slice(0,10) >= dateFrom);
    if (dateTo)   list = list.filter(it => (it.updatedAt||"").slice(0,10) <= dateTo);
    return list;
  })();

  const catCards = (() => {
    const m = new Map<string, { name: string; count: number; value: number; low: number; out: number }>();
    for (const it of items) {
      const name = it.category || "Uncategorised";
      const c = m.get(name) || { name, count: 0, value: 0, low: 0, out: 0 };
      const qty = dec(it.quantity), reord = dec(it.reorderLevel);
      c.count += 1;
      c.value += qty * dec(it.costPrice);
      if (qty <= 0) c.out += 1;
      else if (qty <= reord && reord > 0) c.low += 1;
      m.set(name, c);
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  })();

  const showTable = !!selCat || lowOnly || !!search.trim() || !!dateFrom || !!dateTo;
  const activeFilters = [selCat, lowOnly, search.trim(), dateFrom||dateTo].filter(Boolean).length;

  return (
    <div style={st.wrap}>

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div style={st.kpiStrip}>
        {[
          { label:"Total items",  val: loading?"…":String(kpis?.totalItems ?? items.length), sub:"Active in catalogue",  accent: GOLD   },
          { label:"Stock value",  val: loading?"…":rfmt(dec(kpis?.stockValue)),               sub:"At cost price",        accent: TERRA  },
          { label:"Low stock",    val: loading?"…":String(kpis?.lowCount ?? kpis?.lowStockCount ?? 0),           sub:"At or below reorder",  accent:(kpis?.lowCount??kpis?.lowStockCount??0)>0?"#b45309":MUTE },
          { label:"Out of stock", val: loading?"…":String(kpis?.outCount ?? kpis?.outOfStockCount ?? 0),         sub:"Needs restocking",     accent:(kpis?.outCount??kpis?.outOfStockCount??0)>0?RED:MUTE    },
        ].map(k => (
          <div key={k.label} style={st.kpiCard}>
            <div style={{ fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:28, fontWeight:900, color:k.accent, fontVariantNumeric:"tabular-nums", lineHeight:1 }}>{k.val}</div>
            <div style={{ fontSize:11, color:MUTE, marginTop:6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <div style={st.filterBar}>

        {/* Category first */}
        {selCat ? (
          <button className="inv-filter-active" style={st.filterChip} onClick={onClearCat}>
            <span style={{ fontSize:11, color:MUTE }}>Category:</span>
            <span style={{ fontWeight:700, color:TERRA }}>{selCat}</span>
            <span style={st.chipX}>×</span>
          </button>
        ) : (
          <select style={st.filterSelect} value={selCat} onChange={e => onSelCat(e.target.value)}>
            <option value="">All categories</option>
            {catSummary.map(c => (
              <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
            ))}
          </select>
        )}

        <div style={st.divider} />

        {/* Search */}
        <div style={st.searchWrap}>
          <Icon name="search" size={15} color={MUTE} />
          <input
            className="inv-search"
            style={st.searchIn}
            placeholder="Search name, SKU or category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button style={st.clearX} onClick={() => setSearch("")}>×</button>
          )}
        </div>

        {/* Low stock */}
        <button
          className={lowOnly ? "inv-filter-active" : "inv-filter-btn"}
          style={{ ...st.filterBtn, ...(lowOnly ? st.filterBtnOn : {}) }}
          onClick={onLowToggle}
        >
          <Icon name="warning" size={13} color={lowOnly ? TERRA : MUTE} />
          Low stock
          {((kpis?.lowCount ?? kpis?.lowStockCount ?? 0) + (kpis?.outCount ?? kpis?.outOfStockCount ?? 0)) > 0 && (
            <span style={{ ...st.badge, background: lowOnly ? TERRA : "#f0e6dc", color: lowOnly ? "#fff" : "#9a6a3a" }}>
              {(kpis?.lowCount ?? kpis?.lowStockCount ?? 0) + (kpis?.outCount ?? kpis?.outOfStockCount ?? 0)}
            </span>
          )}
        </button>

        <div style={st.divider} />

        {/* Date filter */}
        <div style={st.dateRow}>
          <span style={st.dateLabel}>Updated</span>
          <OverviewFilters onChange={f => { setDateFrom(f.from); setDateTo(f.to); }} />
        </div>

        {/* Clear all */}
        {activeFilters > 0 && (
          <>
            <div style={st.divider} />
            <button style={st.clearAll} onClick={() => { onClearCat(); if(lowOnly) onLowToggle(); setSearch(""); setDateFrom(""); setDateTo(""); }}>
              Clear all
            </button>
          </>
        )}
      </div>

      {/* ── Results count ─────────────────────────────────────────────── */}
      {showTable && (
        <div style={st.resultsMeta}>
          <span style={{ color:MUTE, fontSize:12.5 }}>
            Showing <b style={{ color:INK }}>{tableItems.length}</b> of {items.length} items
            {selCat && <> in <b style={{ color:TERRA }}>{selCat}</b></>}
            {lowOnly && <> · <span style={{ color:"#b45309" }}>low stock only</span></>}
          </span>
        </div>
      )}

      {/* ── Category cards OR items table ─────────────────────────────── */}
      {!showTable ? (
        <div style={st.tableOuter}>
          {loading ? (
            <div style={st.empty}>Loading…</div>
          ) : catCards.length === 0 ? (
            <div style={st.empty}>No stock items yet — click Add item to get started.</div>
          ) : (
            <div style={st.catGrid}>
              {catCards.map((c, i) => (
                <button key={c.name} className="inv-catcard" style={st.catCard} onClick={() => onSelCat(c.name)}>
                  <div style={{ ...st.catAccent, background: catColor(i) }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={st.catName}>{c.name}</div>
                    <div style={st.catMeta}>{c.count} item{c.count!==1?"s":""}</div>
                    <div style={st.catValue}>{rfmt(c.value)}</div>
                    <div style={st.catValueLbl}>stock value</div>
                    {(c.low > 0 || c.out > 0) && (
                      <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
                        {c.out > 0 && <span style={st.badgeOut}>{c.out} out</span>}
                        {c.low > 0 && <span style={st.badgeLow}>{c.low} low</span>}
                      </div>
                    )}
                  </div>
                  <div style={st.catArrow}>→</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={st.tableOuter}>
          {loading ? (
            <div style={st.empty}>Loading…</div>
          ) : tableItems.length === 0 ? (
            <div style={st.empty}>
              {items.length === 0 ? "No stock items yet — click Add item to get started." : "No items match the current filters."}
            </div>
          ) : (
            <table style={st.table}>
              <thead>
                <tr>
                  {["Item","Category","In Stock","Cost / Unit","Sell / Unit","Value","Supplier","Updated",""].map(h => (
                    <th key={h} style={st.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableItems.map((it, idx) => {
                  const qty   = dec(it.quantity);
                  const reord = dec(it.reorderLevel);
                  const cost  = dec(it.costPrice);
                  const sell  = dec(it.sellPrice);
                  const isLow = qty <= reord && reord > 0;
                  const isOut = qty <= 0;
                  const catIdx = catSummary.findIndex(c => c.name === (it.category||"Uncategorised"));
                  return (
                    <tr key={it.id} className="inv-row" style={{ background: idx%2===0 ? CARD : IVORY }}>
                      <td style={st.td}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:3, height:40, background:catColor(catIdx>=0?catIdx:0), borderRadius:2, flexShrink:0 }} />
                          <div>
                            <div style={{ fontWeight:700, fontSize:13.5, color:INK }}>{it.name}</div>
                            <div style={{ fontSize:11, color:MUTE, marginTop:1, fontFamily:"monospace" }}>{it.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td style={st.td}>
                        <span style={st.catPill}>{it.category||"—"}</span>
                      </td>
                      <td style={st.td}>
                        <div style={{ fontWeight:700, fontVariantNumeric:"tabular-nums", fontSize:14, color:isOut?RED:isLow?"#b45309":GREEN }}>
                          {qty} {unitLabel(it.unit)}
                        </div>
                        <div style={{ fontSize:10.5, marginTop:2 }}>
                          {isOut  ? <span style={{color:RED,fontWeight:700}}>Out of stock</span>
                          :isLow  ? <span style={{color:"#b45309",fontWeight:700}}>Low stock</span>
                          :         <span style={{color:GREEN}}>In stock</span>}
                        </div>
                      </td>
                      <td style={{ ...st.td, fontVariantNumeric:"tabular-nums" }}>{rfmt(cost)}</td>
                      <td style={{ ...st.td, fontVariantNumeric:"tabular-nums", fontWeight:sell>0?700:400, color:sell>0?TERRA:MUTE }}>
                        {sell > 0 ? rfmt(sell) : "—"}
                      </td>
                      <td style={{ ...st.td, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{rfmt(qty*cost)}</td>
                      <td style={{ ...st.td, color:MUTE, fontSize:12.5 }}>{it.supplier?.name||"—"}</td>
                      <td style={{ ...st.td, color:MUTE, fontSize:11, whiteSpace:"nowrap" }}>{dtfmt(it.updatedAt)}</td>
                      <td style={{ ...st.td, textAlign:"right" }}>
                        <div style={{ display:"flex", gap:5, justifyContent:"flex-end" }}>
                          <button className="inv-icon" style={st.iconBtn} title="Move stock" onClick={()=>onMoveDrawer(it)}><Icon name="move"    size={14}/></button>
                          <button className="inv-icon" style={st.iconBtn} title="History"    onClick={()=>onHistDrawer(it)}><Icon name="history" size={14}/></button>
                          <button className="inv-icon" style={st.iconBtn} title="Edit"       onClick={()=>onEditDrawer(it)}><Icon name="edit"    size={14}/></button>
                          <button className="inv-del"  style={st.delBtn}  title="Delete"     onClick={()=>{ setDelItem(it); setDelPin(""); setDelErr(""); }}><Icon name="trash" size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Delete confirm modal ──────────────────────────────────────── */}
      {delItem && (
        <div style={st.overlay} onClick={() => !delBusy && setDelItem(null)}>
          <div style={st.delBox} onClick={e => e.stopPropagation()}>
            <div style={st.delHd}>
              <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Icon name="trash" size={16} color={RED} /> Delete item
              </span>
              <button style={st.delX} onClick={() => !delBusy && setDelItem(null)}>✕</button>
            </div>
            <div style={st.delBody}>
              <p style={{ margin:0, fontSize:13.5, color:INK, lineHeight:1.5 }}>
                Delete <strong>{delItem.name}</strong> <span style={{ color:MUTE }}>({delItem.sku})</span>?
                This removes the item and its entire stock history. This cannot be undone.
              </p>
              <div style={st.delWarn}>
                ⚠️ Current stock: <strong>{dec(delItem.quantity)} {unitLabel(delItem.unit)}</strong>
                {delItem.supplier?.name && <> · Supplier: <strong>{delItem.supplier.name}</strong></>}
              </div>
              <PinField value={delPin} onChange={setDelPin} />
              {delErr && <p style={{ color:RED, fontSize:12.5, margin:0 }}>{delErr}</p>}
            </div>
            <div style={st.delFt}>
              <button style={st.delGhost} onClick={() => setDelItem(null)} disabled={delBusy}>Cancel</button>
              <button
                style={{ ...st.delDanger, opacity: (delBusy || !delPin) ? .6 : 1 }}
                onClick={confirmDelete}
                disabled={delBusy || !delPin}
              >
                {delBusy ? "Deleting…" : "Delete item"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .inv-search:focus { outline:none; }
        .inv-filter-btn:hover { background:#fff6f0 !important; border-color:${TERRA}55 !important; color:${TERRA} !important; }
        .inv-filter-active { border-color:${TERRA}88 !important; }
        .inv-del:hover { background:#fff1ee !important; color:${RED} !important; border-color:${RED}55 !important; }
        .inv-catcard:hover { border-color:${TERRA}66 !important; box-shadow:0 6px 18px rgba(217,84,47,.12); transform:translateY(-2px); }
        .inv-icon:hover { background:#f5f5f5 !important; color:${INK} !important; }
      `}</style>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrap:       { flex:1, minWidth:0, display:"flex", flexDirection:"column", overflowY:"auto" },
  kpiStrip:   { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:1, background:LINE, borderBottom:`1px solid ${LINE}`, flexShrink:0 },
  kpiCard:    { background:CARD, padding:"22px 24px" },

  // ── Filter bar ────────────────────────────────────────────────────────────
  filterBar:  { display:"flex", alignItems:"center", gap:0, padding:"10px 16px", borderBottom:`1px solid ${LINE}`, background:"#fafafa", flexShrink:0, flexWrap:"wrap", rowGap:8 },
  searchWrap: { display:"flex", alignItems:"center", gap:8, background:CARD, border:`1px solid ${LINE}`, padding:"8px 12px", minWidth:220, flex:"1 1 220px", maxWidth:320 },
  searchIn:   { flex:1, border:"none", outline:"none", fontSize:13, fontFamily:SANS, color:INK, background:"transparent" },
  clearX:     { background:"none", border:"none", cursor:"pointer", color:MUTE, fontSize:17, lineHeight:1, padding:"0 2px" },
  divider:    { width:1, height:28, background:LINE, margin:"0 10px", flexShrink:0 },
  filterSelect:{ padding:"8px 12px", border:`1px solid ${LINE}`, background:CARD, fontSize:13, fontFamily:SANS, color:INK, cursor:"pointer", outline:"none", fontWeight:600, minWidth:150 },
  filterBtn:  { display:"inline-flex", alignItems:"center", gap:6, padding:"8px 13px", border:`1px solid ${LINE}`, background:CARD, fontSize:12.5, fontFamily:SANS, fontWeight:600, color:MUTE, cursor:"pointer", whiteSpace:"nowrap" as const, transition:"all .15s" },
  filterBtnOn:{ background:"#fff1ee", borderColor:`${TERRA}66`, color:TERRA },
  filterChip: { display:"inline-flex", alignItems:"center", gap:6, padding:"8px 13px", border:`1px solid ${TERRA}55`, background:"#fff6f2", fontSize:12.5, fontFamily:SANS, fontWeight:600, color:INK, cursor:"pointer" },
  chipX:      { marginLeft:2, color:MUTE, fontSize:15, lineHeight:1 },
  badge:      { fontSize:11, fontWeight:700, padding:"1px 7px", borderRadius:10, fontVariantNumeric:"tabular-nums" as const },
  dateRow:    { display:"inline-flex", alignItems:"center", gap:8 },
  dateLabel:  { fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase" as const, letterSpacing:.8, whiteSpace:"nowrap" as const },
  clearAll:   { padding:"8px 13px", background:"none", border:`1px solid ${LINE}`, fontSize:12.5, fontWeight:600, color:MUTE, cursor:"pointer", fontFamily:SANS, whiteSpace:"nowrap" as const },

  resultsMeta:{ padding:"8px 20px", borderBottom:`1px solid ${LINE}`, background:IVORY, flexShrink:0 },

  // ── Table ─────────────────────────────────────────────────────────────────
  tableOuter: { flex:1, overflowX:"auto" },
  table:      { width:"100%", borderCollapse:"collapse", fontSize:13.5 },
  th:         { padding:"11px 16px", textAlign:"left", fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, borderBottom:`2px solid ${LINE}`, background:IVORY, whiteSpace:"nowrap" },
  td:         { padding:"13px 16px", borderBottom:`1px solid ${LINE}`, verticalAlign:"middle" },
  catPill:    { display:"inline-block", padding:"3px 9px", fontSize:11, fontWeight:700, borderRadius:2, background:GOLD_LT, color:"#7a5a10" },
  iconBtn:    { width:32, height:32, display:"grid", placeItems:"center", border:`1px solid ${LINE}`, background:CARD, color:MUTE, cursor:"pointer", borderRadius:0, transition:"all .18s" },
  delBtn:     { width:32, height:32, display:"grid", placeItems:"center", border:`1px solid ${LINE}`, background:CARD, color:MUTE, cursor:"pointer", borderRadius:0, transition:"all .18s" },
  empty:      { padding:"60px 0", textAlign:"center", color:MUTE, fontFamily:SANS },

  // ── Delete modal ─────────────────────────────────────────────────────────
  overlay:    { position:"fixed", inset:0, background:"rgba(42,35,29,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, backdropFilter:"blur(2px)" },
  delBox:     { background:CARD, width:"min(440px,94vw)", boxShadow:"0 8px 40px rgba(0,0,0,.18)", display:"flex", flexDirection:"column", fontFamily:SANS, color:INK },
  delHd:      { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"15px 20px", borderBottom:`1px solid ${LINE}`, background:IVORY, fontSize:14, fontWeight:700 },
  delX:       { background:"none", border:"none", fontSize:17, cursor:"pointer", color:MUTE, lineHeight:1 },
  delBody:    { padding:"18px 20px", display:"flex", flexDirection:"column", gap:14 },
  delWarn:    { fontSize:12.5, color:"#7a5a00", background:"#fff8e6", border:"1px solid #f0c040", padding:"8px 12px" },
  delFt:      { display:"flex", gap:10, justifyContent:"flex-end", padding:"14px 20px", borderTop:`1px solid ${LINE}`, background:IVORY },
  delGhost:   { padding:"9px 20px", background:"transparent", border:`1px solid ${LINE}`, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:SANS, color:INK },
  delDanger:  { padding:"9px 22px", background:RED, border:"none", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:SANS, color:"#fff" },

  // ── Category cards ────────────────────────────────────────────────────────
  catGrid:    { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:14, padding:20 },
  catCard:    { display:"flex", alignItems:"stretch", gap:14, background:CARD, border:`1px solid ${LINE}`, padding:"18px 18px 18px 0", cursor:"pointer", fontFamily:SANS, textAlign:"left", position:"relative", transition:"all .15s" },
  catAccent:  { width:5, flexShrink:0, borderRadius:2 },
  catName:    { fontSize:16, fontWeight:800, color:INK, marginBottom:3 },
  catMeta:    { fontSize:12, color:MUTE, marginBottom:14 },
  catValue:   { fontSize:22, fontWeight:900, color:TERRA, fontVariantNumeric:"tabular-nums", lineHeight:1 },
  catValueLbl:{ fontSize:10.5, color:MUTE, textTransform:"uppercase", letterSpacing:.6, marginTop:4 },
  badgeOut:   { fontSize:10.5, fontWeight:700, color:RED, background:"#fff1ee", border:`1px solid ${RED}44`, padding:"2px 8px", borderRadius:2 },
  badgeLow:   { fontSize:10.5, fontWeight:700, color:"#b45309", background:"#fef3c7", border:"1px solid #f0c04066", padding:"2px 8px", borderRadius:2 },
  catArrow:   { alignSelf:"center", color:"#cfcabf", fontSize:18, fontWeight:700 },
};