// src/components/inventory/InventoryTable.tsx
import { useState } from "react";
import api from "../../api";
import Icon from "./Icon";
import PinField from "./PinField";
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
  onSelCat:      (cat: string) => void;
  onLowToggle:   () => void;
  onClearCat:    () => void;
  onClearLow:    () => void;
  onAddItem:     () => void;
  onMoveDrawer:  (it: InventoryItem) => void;
  onHistDrawer:  (it: InventoryItem) => void;
  onEditDrawer:  (it: InventoryItem) => void;
  onExportCSV:   () => void;
  onDeleted?:    () => void;
}

export default function InventoryTable({
  items, kpis, catSummary, loading, selCat, lowOnly,
  onSelCat, onLowToggle, onClearCat, onClearLow, onAddItem, onMoveDrawer, onHistDrawer, onEditDrawer, onExportCSV, onDeleted,
}: Props) {
  const [search, setSearch] = useState("");

  // ── Delete confirm modal state ─────────────────────────────────────────────
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

          {/* Category dropdown (replaces sidebar) */}
          <select
            style={st.catSelect}
            value={selCat}
            onChange={e => onSelCat(e.target.value)}
          >
            <option value="">All categories</option>
            {catSummary.map(c => (
              <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
            ))}
          </select>

          {/* Low stock toggle */}
          <button
            style={{ ...st.lowToggle, ...(lowOnly ? st.lowToggleOn : {}) }}
            onClick={onLowToggle}
            title="Show only low stock"
          >
            <Icon name="warning" size={13} color={lowOnly ? TERRA : MUTE} />
            <span>Low stock</span>
            {(kpis?.lowStockCount ?? 0) > 0 && (
              <span style={st.lowCount}>{kpis?.lowStockCount}</span>
            )}
          </button>
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
                        <button className="inv-icon" style={st.iconBtn}    title="Move stock" onClick={()=>onMoveDrawer(it)}><Icon name="move"    size={14}/></button>
                        <button className="inv-icon" style={st.iconBtn}    title="History"    onClick={()=>onHistDrawer(it)}><Icon name="history" size={14}/></button>
                        <button className="inv-icon" style={st.iconBtn}    title="Edit"       onClick={()=>onEditDrawer(it)}><Icon name="edit"    size={14}/></button>
                        <button className="inv-del"  style={st.delBtn}     title="Delete"     onClick={()=>{ setDelItem(it); setDelPin(""); setDelErr(""); }}><Icon name="trash"   size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

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
                ⚠️ Current stock: <strong>{dec(delItem.quantity)} {delItem.unit}</strong>
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
        .inv-del:hover { background:#fff1ee !important; color:${RED} !important; border-color:${RED}55 !important; }
      `}</style>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrap:       { flex:1, minWidth:0, display:"flex", flexDirection:"column", overflowY:"auto" },
  kpiStrip:   { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:1, background:LINE, borderBottom:`1px solid ${LINE}`, flexShrink:0 },
  kpiCard:    { background:CARD, padding:"22px 24px" },
  toolbar:    { display:"flex", alignItems:"center", gap:10, padding:"13px 20px", borderBottom:`1px solid ${LINE}`, background:CARD, flexShrink:0, flexWrap:"wrap" },
  searchWrap: { display:"flex", alignItems:"center", gap:8, border:`1px solid ${LINE}`, background:CARD, padding:"9px 12px", flex:1, maxWidth:340, minWidth:160 },
  searchIn:   { flex:1, border:"none", outline:"none", fontSize:13.5, fontFamily:SANS, color:INK, background:"transparent" },
  catSelect:  { padding:"9px 12px", border:`1px solid ${LINE}`, background:CARD, fontSize:13, fontFamily:SANS, color:INK, cursor:"pointer", outline:"none", fontWeight:600, minWidth:150 },
  lowToggle:  { display:"inline-flex", alignItems:"center", gap:7, padding:"9px 13px", border:`1px solid ${LINE}`, background:CARD, fontSize:12.5, fontFamily:SANS, fontWeight:600, color:MUTE, cursor:"pointer", transition:"all .15s" },
  lowToggleOn:{ background:"#fff1ee", borderColor:`${TERRA}66`, color:TERRA },
  lowCount:   { fontSize:11, fontWeight:700, background:TERRA, color:"#fff", padding:"1px 7px", borderRadius:10, fontVariantNumeric:"tabular-nums" },
  pill:       { display:"inline-flex", alignItems:"center", gap:7, padding:"5px 11px", background:GOLD_LT, border:`1px solid ${GOLD}66`, fontSize:12, fontWeight:700, color:"#7a5a10" },
  pillX:      { background:"none", border:"none", cursor:"pointer", lineHeight:1, padding:0, fontSize:14, fontFamily:SANS, color:"inherit" },
  tableOuter: { flex:1, overflowX:"auto" },
  table:      { width:"100%", borderCollapse:"collapse", fontSize:13.5 },
  th:         { padding:"11px 16px", textAlign:"left", fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, borderBottom:`2px solid ${LINE}`, background:IVORY, whiteSpace:"nowrap" },
  td:         { padding:"13px 16px", borderBottom:`1px solid ${LINE}`, verticalAlign:"middle" },
  catPill:    { display:"inline-block", padding:"3px 9px", fontSize:11, fontWeight:700, borderRadius:2, background:GOLD_LT, color:"#7a5a10" },
  iconBtn:    { width:32, height:32, display:"grid", placeItems:"center", border:`1px solid ${LINE}`, background:CARD, color:MUTE, cursor:"pointer", borderRadius:0, transition:"all .18s" },
  delBtn:     { width:32, height:32, display:"grid", placeItems:"center", border:`1px solid ${LINE}`, background:CARD, color:MUTE, cursor:"pointer", borderRadius:0, transition:"all .18s" },
  empty:      { padding:"60px 0", textAlign:"center", color:MUTE, fontFamily:SANS },

  // delete modal
  overlay:    { position:"fixed", inset:0, background:"rgba(42,35,29,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, backdropFilter:"blur(2px)" },
  delBox:     { background:CARD, width:"min(440px,94vw)", boxShadow:"0 8px 40px rgba(0,0,0,.18)", display:"flex", flexDirection:"column", fontFamily:SANS, color:INK },
  delHd:      { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"15px 20px", borderBottom:`1px solid ${LINE}`, background:IVORY, fontSize:14, fontWeight:700 },
  delX:       { background:"none", border:"none", fontSize:17, cursor:"pointer", color:MUTE, lineHeight:1 },
  delBody:    { padding:"18px 20px", display:"flex", flexDirection:"column", gap:14 },
  delWarn:    { fontSize:12.5, color:"#7a5a00", background:"#fff8e6", border:"1px solid #f0c040", padding:"8px 12px" },
  delFt:      { display:"flex", gap:10, justifyContent:"flex-end", padding:"14px 20px", borderTop:`1px solid ${LINE}`, background:IVORY },
  delGhost:   { padding:"9px 20px", background:"transparent", border:`1px solid ${LINE}`, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:SANS, color:INK },
  delDanger:  { padding:"9px 22px", background:RED, border:"none", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:SANS, color:"#fff" },
};