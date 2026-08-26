// src/components/inventory/InventoryTable.tsx
import { useState } from "react";
import Icon from "./Icon";
import {
  InventoryItem, KPIs, CatSummary,
  INK, MUTE, LINE, IVORY, CARD, TERRA, GOLD, GOLD_LT, GREEN, RED, SANS,
  catColor, dec, rfmt, dtfmt, sharedSt,
} from "./types";

interface Props {
  items:      InventoryItem[];
  kpis:       KPIs | null;
  catSummary: CatSummary[];
  loading:    boolean;
  selCat:     string;
  lowOnly:    boolean;
  onClearCat:    () => void;
  onClearLow:    () => void;
  onAddItem:     () => void;
  onMoveDrawer:  (it: InventoryItem) => void;
  onHistDrawer:  (it: InventoryItem) => void;
  onEditDrawer:  (it: InventoryItem) => void;
  onExportCSV:   () => void;
}

export default function InventoryTable({
  items, kpis, catSummary, loading, selCat, lowOnly,
  onClearCat, onClearLow, onAddItem, onMoveDrawer, onHistDrawer, onEditDrawer, onExportCSV,
}: Props) {
  const [search, setSearch] = useState("");

  const tableItems = (() => {
    let list = items;
    if (selCat)  list = list.filter(it => (it.category||"Uncategorised") === selCat);
    if (lowOnly) list = list.filter(it => dec(it.quantity) <= dec(it.reorderLevel) && dec(it.reorderLevel) > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q) || (it.category||"").toLowerCase().includes(q));
    }
    return list;
  })();

  return (
    <div style={st.wrap}>
      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div style={st.kpiStrip}>
        {[
          { label:"Total items",  val: loading?"…":String(kpis?.totalItems ?? items.length), sub:"Active in catalogue",  icon:"box",     accent: GOLD   },
          { label:"Stock value",  val: loading?"…":rfmt(dec(kpis?.stockValue)),               sub:"At cost price",         icon:"download",accent: TERRA  },
          { label:"Low stock",    val: loading?"…":String(kpis?.lowStockCount ?? 0),           sub:"At or below reorder",   icon:"warning", accent:(kpis?.lowStockCount??0)>0?"#b45309":MUTE },
          { label:"Out of stock", val: loading?"…":String(kpis?.outOfStockCount ?? 0),          sub:"Needs restocking",      icon:"warning", accent:(kpis?.outOfStockCount??0)>0?RED:MUTE    },
        ].map(k => (
          <div key={k.label} style={st.kpiCard}>
            <div style={{ fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:28, fontWeight:900, color:k.accent, fontVariantNumeric:"tabular-nums", lineHeight:1 }}>{k.val}</div>
            <div style={{ fontSize:11, color:MUTE, marginTop:6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div style={st.toolbar}>
        <div style={{ display:"flex", gap:8, flex:1, alignItems:"center", flexWrap:"wrap", minWidth:0 }}>
          <div style={st.searchWrap}>
            <Icon name="search" size={15} color={MUTE} />
            <input
              className="inv-search"
              style={st.searchIn}
              placeholder="Search name, SKU or category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {selCat && (
            <div style={st.pill}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:catColor(catSummary.findIndex(c=>c.name===selCat)), flexShrink:0 }} />
              <span style={{ fontSize:12, fontWeight:700 }}>{selCat}</span>
              <button style={st.pillX} onClick={onClearCat}>×</button>
            </div>
          )}
          {lowOnly && (
            <div style={{ ...st.pill, background:"#fff1ee", borderColor:`${TERRA}66`, color:TERRA }}>
              <Icon name="warning" size={12} color={TERRA} />
              <span style={{ fontSize:12, fontWeight:700 }}>Low stock</span>
              <button style={{ ...st.pillX, color:TERRA }} onClick={onClearLow}>×</button>
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:8, flexShrink:0 }}>
          <button className="inv-ghost" style={sharedSt.ghostBtn} onClick={onExportCSV}>
            <Icon name="download" size={14}/> Export CSV
          </button>
          <button className="inv-cta" style={sharedSt.ctaBtn} onClick={onAddItem}>
            <Icon name="plus" size={14} color="#fff"/> Add item
          </button>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div style={st.tableOuter}>
        {loading ? (
          <div style={st.empty}>Loading…</div>
        ) : tableItems.length === 0 ? (
          <div style={st.empty}>
            {items.length === 0 ? "No stock items yet — click Add item to get started." : "No items match the current filter."}
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
                        {qty} {it.unit}
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
  );
}

const st: Record<string, React.CSSProperties> = {
  wrap:       { flex:1, minWidth:0, display:"flex", flexDirection:"column", overflowY:"auto" },
  kpiStrip:   { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:1, background:LINE, borderBottom:`1px solid ${LINE}`, flexShrink:0 },
  kpiCard:    { background:CARD, padding:"22px 24px" },
  toolbar:    { display:"flex", alignItems:"center", gap:10, padding:"13px 20px", borderBottom:`1px solid ${LINE}`, background:CARD, flexShrink:0, flexWrap:"wrap" },
  searchWrap: { display:"flex", alignItems:"center", gap:8, border:`1px solid ${LINE}`, background:CARD, padding:"9px 12px", flex:1, maxWidth:380, minWidth:160 },
  searchIn:   { flex:1, border:"none", outline:"none", fontSize:13.5, fontFamily:SANS, color:INK, background:"transparent" },
  pill:       { display:"inline-flex", alignItems:"center", gap:7, padding:"5px 11px", background:GOLD_LT, border:`1px solid ${GOLD}66`, fontSize:12, fontWeight:700, color:"#7a5a10" },
  pillX:      { background:"none", border:"none", cursor:"pointer", lineHeight:1, padding:0, fontSize:14, fontFamily:SANS, color:"inherit" },
  tableOuter: { flex:1, overflowX:"auto" },
  table:      { width:"100%", borderCollapse:"collapse", fontSize:13.5 },
  th:         { padding:"11px 16px", textAlign:"left", fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, borderBottom:`2px solid ${LINE}`, background:IVORY, whiteSpace:"nowrap" },
  td:         { padding:"13px 16px", borderBottom:`1px solid ${LINE}`, verticalAlign:"middle" },
  catPill:    { display:"inline-block", padding:"3px 9px", fontSize:11, fontWeight:700, borderRadius:2, background:GOLD_LT, color:"#7a5a10" },
  iconBtn:    { width:32, height:32, display:"grid", placeItems:"center", border:`1px solid ${LINE}`, background:CARD, color:MUTE, cursor:"pointer", borderRadius:0, transition:"all .18s" },
  empty:      { padding:"60px 0", textAlign:"center", color:MUTE, fontFamily:SANS },
};