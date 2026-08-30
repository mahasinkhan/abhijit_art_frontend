// src/components/inventory/InventorySidebar.tsx
import { useState } from "react";
import Icon from "./Icon";
import { CatSummary, KPIs, Supplier, SANS, TERRA, INK, MUTE, LINE, CARD, IVORY, catColor, rfmt } from "./types";

const SB_BG     = "#ffffff";
const SB_BORDER = "#ede8dc";
const SB_MUTE   = "#8a8f9a";
const SB_TEXT   = "#454a57";

interface Props {
  catSummary:       CatSummary[];
  kpis:             KPIs | null;
  suppliers:        Supplier[];
  selCat:           string;
  lowOnly:          boolean;
  onSelCat:         (cat: string) => void;
  onLowToggle:      () => void;
  onAddItem:        () => void;
  onAddItemWithCat: (cat: string) => void;
  onOpenSupp:       (s: Supplier | "new") => void;
  onSuppTab:        () => void;
  onRenameCategory?: (oldName: string, newName: string) => Promise<void>;
}

export default function InventorySidebar({
  catSummary, kpis, suppliers, selCat, lowOnly,
  onSelCat, onLowToggle, onAddItem, onAddItemWithCat, onOpenSupp, onSuppTab,
  onRenameCategory,
}: Props) {
  const [sideTab,    setSideTab]    = useState<"stock"|"suppliers">("stock");
  const [sideSearch, setSideSearch] = useState("");
  const [addingCat,  setAddingCat]  = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatVal, setEditCatVal] = useState("");
  const [savingCat,  setSavingCat]  = useState(false);

  const filteredCats = sideSearch.trim()
    ? catSummary.filter(c => c.name.toLowerCase().includes(sideSearch.toLowerCase()))
    : catSummary;

  const switchToSupp = () => { setSideTab("suppliers"); onSuppTab(); };
  const totalCount = catSummary.reduce((s,c)=>s+c.count, 0);
  const totalValue = catSummary.reduce((s,c)=>s+(c.value||0), 0);

  const startEdit = (catName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCat(catName);
    setEditCatVal(catName);
  };

  const saveEdit = async () => {
    if (!editingCat || !editCatVal.trim() || editCatVal.trim() === editingCat) {
      setEditingCat(null); return;
    }
    if (!onRenameCategory) { setEditingCat(null); return; }
    setSavingCat(true);
    try {
      await onRenameCategory(editingCat, editCatVal.trim());
      setEditingCat(null);
    } catch {
      // keep open on error
    } finally {
      setSavingCat(false);
    }
  };

  return (
    <aside style={st.sidebar}>

      {/* Header */}
      <div style={st.header}>
        <div style={st.brand}>
          <Icon name="box" size={16} color={TERRA} />
          <span style={st.brandText}>Inventory</span>
        </div>
        <div style={st.searchBox}>
          <Icon name="search" size={13} color={SB_MUTE} />
          <input
            style={st.searchIn}
            placeholder="Find category…"
            value={sideSearch}
            onChange={e => setSideSearch(e.target.value)}
          />
        </div>
        <div style={st.tabs}>
          <button style={{ ...st.tab, ...(sideTab==="stock"     ? st.tabOn : {}) }} onClick={() => setSideTab("stock")}>Stock</button>
          <button style={{ ...st.tab, ...(sideTab==="suppliers" ? st.tabOn : {}) }} onClick={switchToSupp}>Suppliers</button>
        </div>
      </div>

      {/* Stock nav */}
      {sideTab === "stock" ? (
        <nav style={st.nav}>

          {/* All items */}
          <button
            style={{ ...st.catRow, ...(!selCat && !lowOnly ? st.catRowOn : {}) }}
            onClick={() => { onSelCat(""); if (lowOnly) onLowToggle(); }}
          >
            <div style={{ ...st.dot, background:"#c8ccd6" }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ ...st.catLabel, color:!selCat&&!lowOnly?TERRA:SB_TEXT, fontWeight:!selCat&&!lowOnly?700:600 }}>All items</div>
              <div style={st.subVal}>{rfmt(totalValue)}</div>
            </div>
            <span style={st.badge}>{totalCount}</span>
          </button>

          {/* Low stock */}
          <button
            style={{ ...st.catRow, ...(lowOnly ? st.catRowOn : {}) }}
            onClick={onLowToggle}
          >
            <div style={{ ...st.dot, background:TERRA }} />
            <span style={{ ...st.catLabel, color:lowOnly?TERRA:SB_TEXT }}>Low stock</span>
            <span style={{
              ...st.badge,
              color:(kpis?.lowStockCount??0)>0?TERRA:SB_MUTE,
              background:(kpis?.lowStockCount??0)>0?"#fff2ee":"transparent",
              padding:"1px 7px", borderRadius:10,
            }}>{kpis?.lowStockCount??0}</span>
          </button>

          {/* Categories header */}
          <div style={st.sectionHead}>
            <div style={st.sectionLabel}>Categories</div>
            <button style={st.addCatBtn} title="Add category" onClick={() => setAddingCat(v=>!v)}>
              {addingCat ? "✕ Close" : "+ Add"}
            </button>
          </div>

          {/* New category input */}
          {addingCat && (
            <div style={st.addCatBox}>
              <input
                style={st.addCatIn}
                placeholder="Category name…"
                value={newCatName}
                autoFocus
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => {
                  if (e.key==="Enter" && newCatName.trim()) { onAddItemWithCat(newCatName.trim()); setNewCatName(""); setAddingCat(false); }
                  if (e.key==="Escape") { setAddingCat(false); setNewCatName(""); }
                }}
              />
              <button
                style={{ ...st.addCatSave, opacity:newCatName.trim()?1:.5 }}
                disabled={!newCatName.trim()}
                onClick={() => { if(newCatName.trim()){ onAddItemWithCat(newCatName.trim()); setNewCatName(""); setAddingCat(false); } }}
              >Add</button>
            </div>
          )}

          {/* Category list */}
          {filteredCats.length === 0 && (
            <div style={st.emptyNote}>{sideSearch ? "No match." : "No categories yet."}</div>
          )}
          {filteredCats.map((cat, i) => {
            const color  = catColor(i);
            const isOn   = selCat===cat.name && !lowOnly;
            const isEdit = editingCat===cat.name;

            return (
              <div key={cat.name}>
                {isEdit ? (
                  /* ── Inline rename input ── */
                  <div style={{ ...st.catRow, background:"#fff8f5", borderColor:TERRA, borderLeft:`3px solid ${TERRA}`, paddingRight:8 }}>
                    <div style={{ ...st.dot, background:color }} />
                    <input
                      autoFocus
                      style={{ flex:1, padding:"4px 6px", border:`1px solid ${TERRA}`, fontSize:12.5, fontFamily:SANS, color:INK, outline:"none", minWidth:0 }}
                      value={editCatVal}
                      onChange={e => setEditCatVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key==="Enter") saveEdit();
                        if (e.key==="Escape") setEditingCat(null);
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                    <button
                      style={{ padding:"3px 8px", background:TERRA, border:"none", color:"#fff", fontSize:11, fontWeight:700, fontFamily:SANS, cursor:"pointer", opacity:savingCat?.5:1 }}
                      onClick={e => { e.stopPropagation(); saveEdit(); }}
                      disabled={savingCat}
                    >{savingCat?"…":"✓"}</button>
                    <button
                      style={{ padding:"3px 6px", background:"transparent", border:"none", color:SB_MUTE, fontSize:13, cursor:"pointer" }}
                      onClick={e => { e.stopPropagation(); setEditingCat(null); }}
                    >✕</button>
                  </div>
                ) : (
                  /* ── Normal category row ── */
                  <button
                    style={{ ...st.catRow, ...(isOn ? st.catRowOn : {}), paddingRight:6 }}
                    onClick={() => { onSelCat(cat.name); if(lowOnly) onLowToggle(); }}
                  >
                    <div style={{ ...st.dot, background:color }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ ...st.catLabel, color:isOn?TERRA:SB_TEXT, fontWeight:isOn?700:600 }}>{cat.name}</div>
                      <div style={{ ...st.subVal, display:"flex", alignItems:"center", gap:6 }}>
                        <span>{rfmt(cat.value)}</span>
                        {cat.low>0 && <span style={st.lowTag}>⚠ {cat.low} low</span>}
                      </div>
                    </div>
                    <span style={st.badge}>{cat.count}</span>
                    {/* Edit pencil */}
                    {onRenameCategory && (
                      <span
                        title="Rename category"
                        onClick={e => startEdit(cat.name, e)}
                        style={{ marginLeft:4, padding:"2px 4px", color:SB_MUTE, fontSize:12, cursor:"pointer", flexShrink:0, lineHeight:1 }}
                      >✎</span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </nav>

      ) : (
        /* Suppliers nav */
        <nav style={st.nav}>
          <button style={st.catRow} onClick={() => onOpenSupp("new")}>
            <Icon name="plus" size={14} color={TERRA} />
            <span style={{ ...st.catLabel, color:TERRA, fontWeight:700 }}>Add supplier</span>
          </button>
          {suppliers.length === 0
            ? <div style={st.emptyNote}>No suppliers yet.</div>
            : suppliers.map(s => (
              <button key={s.id} style={st.catRow} onClick={() => onOpenSupp(s)}>
                <Icon name="users" size={14} color={SB_MUTE} />
                <span style={st.catLabel}>{s.name}</span>
                <Icon name="chevron" size={12} color={SB_MUTE} />
              </button>
            ))
          }
        </nav>
      )}

      {/* Add item CTA */}
      {sideTab === "stock" && (
        <div style={st.footer}>
          <button className="inv-side-add" style={st.addBtn} onClick={onAddItem}>
            <Icon name="plus" size={15} color="#fff" /> Add item
          </button>
        </div>
      )}
    </aside>
  );
}

const st: Record<string, React.CSSProperties> = {
  sidebar:     { width:228, flexShrink:0, background:SB_BG, display:"flex", flexDirection:"column", borderRight:`1px solid ${SB_BORDER}`, position:"sticky", top:0, height:"calc(100vh - 64px)", overflow:"hidden" },
  header:      { padding:"16px 12px 10px", flexShrink:0, borderBottom:`1px solid ${SB_BORDER}`, background:IVORY },
  brand:       { display:"flex", alignItems:"center", gap:8, marginBottom:12 },
  brandText:   { fontSize:14, fontWeight:800, color:INK, letterSpacing:.2 },
  searchBox:   { display:"flex", alignItems:"center", gap:7, background:CARD, border:`1px solid ${SB_BORDER}`, padding:"7px 10px", marginBottom:8 },
  searchIn:    { flex:1, background:"transparent", border:"none", outline:"none", color:INK, fontSize:12.5, fontFamily:SANS, caretColor:TERRA },
  tabs:        { display:"flex", background:"#f0ece4", padding:3, gap:2 },
  tab:         { flex:1, padding:"7px 0", border:"none", background:"transparent", color:SB_MUTE, fontFamily:SANS, fontWeight:700, fontSize:12, cursor:"pointer", transition:"all .18s", borderRadius:0 },
  tabOn:       { background:CARD, color:TERRA, boxShadow:"0 1px 4px rgba(0,0,0,.08)" },
  nav:         { flex:1, overflowY:"auto", padding:"6px 0", minHeight:0 },
  sectionHead: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px 6px", marginTop:4, borderTop:`1px solid ${SB_BORDER}` },
  sectionLabel:{ fontSize:10, fontWeight:800, color:SB_MUTE, letterSpacing:1, textTransform:"uppercase" },
  addCatBtn:   { fontSize:11, fontWeight:700, color:TERRA, background:"transparent", border:"none", cursor:"pointer", padding:"2px 4px", fontFamily:SANS },
  addCatBox:   { display:"flex", gap:6, padding:"2px 12px 8px", alignItems:"center" },
  addCatIn:    { flex:1, padding:"7px 10px", border:`1px solid ${LINE}`, fontSize:12.5, fontFamily:SANS, color:INK, background:CARD, outline:"none", caretColor:TERRA },
  addCatSave:  { padding:"7px 12px", background:TERRA, border:"none", color:"#fff", fontFamily:SANS, fontWeight:700, fontSize:12, cursor:"pointer" },
  catRow:      { display:"flex", alignItems:"center", gap:9, width:"100%", padding:"8px 14px", borderWidth:"0 0 0 3px", borderStyle:"solid", borderColor:"transparent", background:"transparent", cursor:"pointer", fontFamily:SANS, transition:"background .15s", textAlign:"left" },
  catRowOn:    { background:"#fff2ee", borderColor:TERRA },
  dot:         { width:8, height:8, borderRadius:"50%", flexShrink:0 } as React.CSSProperties,
  catLabel:    { flex:1, fontSize:12.5, fontWeight:600, color:SB_TEXT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0 } as React.CSSProperties,
  subVal:      { fontSize:10.5, color:SB_MUTE, marginTop:1, fontVariantNumeric:"tabular-nums" } as React.CSSProperties,
  lowTag:      { color:TERRA, fontWeight:700, fontSize:10 },
  badge:       { fontSize:11, fontWeight:700, color:SB_MUTE, fontVariantNumeric:"tabular-nums", flexShrink:0 } as React.CSSProperties,
  emptyNote:   { padding:"14px 16px", fontSize:12, color:SB_MUTE, fontFamily:SANS },
  footer:      { padding:12, borderTop:`1px solid ${SB_BORDER}`, flexShrink:0, background:IVORY },
  addBtn:      { width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"11px 0", background:TERRA, border:"none", color:"#fff", fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", transition:"background .2s" },
};