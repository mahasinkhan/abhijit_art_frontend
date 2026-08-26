// src/components/inventory/ItemDrawer.tsx
import { useState, useEffect } from "react";
import api from "../../api";
import Icon from "./Icon";
import PinField from "./PinField";
import { InventoryItem, Supplier, CatSummary, StockUnit, UNIT_OPTS, dec, sharedSt } from "./types";

interface Props {
  item:       InventoryItem | "new";
  catSummary: CatSummary[];
  selCat:     string;
  onClose:    () => void;
  onSaved:    () => void;
}

const blank = (cat = "") => ({
  sku:"", name:"", category:cat, unit:"piece" as StockUnit,
  quantity:"0", reorderLevel:"0", costPrice:"0", sellPrice:"",
  storageLocation:"", notes:"", pin:"", supplierId:"",
});

export default function ItemDrawer({ item, catSummary, selCat, onClose, onSaved }: Props) {
  const [form, setForm] = useState(item === "new" ? blank(selCat) : {
    sku: item.sku, name: item.name, category: item.category, unit: item.unit,
    quantity: item.quantity, reorderLevel: item.reorderLevel, costPrice: item.costPrice,
    sellPrice: item.sellPrice||"", storageLocation: (item as any).location || (item as any).storageLocation || "",
    notes: item.notes||"", pin:"", supplierId: item.supplierId||"",
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);
  const f = (k: string) => (v: string) => setForm(p => ({...p,[k]:v}));

  useEffect(() => {
    api.get("/api/inventory/suppliers").then(r => setSuppliers(Array.isArray(r.data)?r.data:[])).catch(()=>{});
  }, []);

  const save = async () => {
    if (!form.name.trim()) { setErr("Item name is required."); return; }
    if (!form.pin)         { setErr("Enter your security PIN."); return; }
    setBusy(true); setErr("");
    const body = { sku:form.sku.trim(), name:form.name.trim(), category:form.category.trim(),
      unit:form.unit, reorderLevel:form.reorderLevel, costPrice:form.costPrice,
      sellPrice:form.sellPrice||null, location:form.storageLocation,
      notes:form.notes, pin:form.pin, supplierId:form.supplierId||null };
    try {
      if (item === "new") await api.post("/api/inventory/items", {
        ...body, openingQty: form.quantity, quantity: form.quantity,
      });
      else await api.patch(`/api/inventory/items/${item.id}`, body);
      onSaved();
    } catch(e:any) { setErr(e?.response?.data?.error || "Couldn't save."); }
    finally { setBusy(false); }
  };

  const del = async () => {
    if (!form.pin) { setErr("Enter your security PIN."); return; }
    if (!confirm("Delete this item and all its stock history?")) return;
    setBusy(true);
    try {
      await api.delete(`/api/inventory/items/${(item as InventoryItem).id}`, { data:{ pin:form.pin } });
      onSaved();
    } catch(e:any) { setErr(e?.response?.data?.error || "Couldn't delete."); }
    finally { setBusy(false); }
  };

  return (
    <div style={sharedSt.backdrop} onClick={() => !busy && onClose()}>
      <div style={sharedSt.drawer} onClick={e => e.stopPropagation()}>
        <div style={sharedSt.dHead}>
          <h3 style={sharedSt.dTitle}>{item === "new" ? "Add stock item" : "Edit item"}</h3>
          <button style={sharedSt.closeBtn} onClick={onClose}><Icon name="x" size={18}/></button>
        </div>

        <div style={sharedSt.dBody}>
          <div style={sharedSt.row2}>
            <label style={sharedSt.field}><span style={sharedSt.lbl}>SKU / Code</span>
              <input style={sharedSt.inp} value={form.sku} onChange={e=>f("sku")(e.target.value)} placeholder="e.g. FLX-3X50-WHT"/></label>
            <label style={sharedSt.field}><span style={sharedSt.lbl}>Item name *</span>
              <input style={sharedSt.inp} value={form.name} autoFocus onChange={e=>f("name")(e.target.value)}/></label>
          </div>
          <div style={sharedSt.row2}>
            <label style={sharedSt.field}><span style={sharedSt.lbl}>Category</span>
              <input style={sharedSt.inp} value={form.category} list="icats"
                onChange={e=>f("category")(e.target.value)} placeholder="e.g. FLEX"/>
              <datalist id="icats">{catSummary.map(c=><option key={c.name} value={c.name}/>)}</datalist></label>
            <label style={sharedSt.field}><span style={sharedSt.lbl}>Unit</span>
              <select style={sharedSt.inp} value={form.unit} onChange={e=>f("unit")(e.target.value)}>
                {UNIT_OPTS.map(u=><option key={u} value={u}>{u}</option>)}</select></label>
          </div>
          {item === "new" && (
            <label style={sharedSt.field}><span style={sharedSt.lbl}>Opening stock</span>
              <input style={sharedSt.inp} type="number" min="0" value={form.quantity} onChange={e=>f("quantity")(e.target.value)}/></label>
          )}
          <div style={sharedSt.row2}>
            <label style={sharedSt.field}><span style={sharedSt.lbl}>Reorder level</span>
              <input style={sharedSt.inp} type="number" min="0" value={form.reorderLevel} onChange={e=>f("reorderLevel")(e.target.value)}/></label>
            <label style={sharedSt.field}><span style={sharedSt.lbl}>Cost / unit (₹)</span>
              <input style={sharedSt.inp} type="number" min="0" value={form.costPrice} onChange={e=>f("costPrice")(e.target.value)}/></label>
          </div>
          <div style={sharedSt.row2}>
            <label style={sharedSt.field}><span style={sharedSt.lbl}>Sell / unit (₹) · Optional</span>
              <input style={sharedSt.inp} type="number" min="0" value={form.sellPrice} onChange={e=>f("sellPrice")(e.target.value)}/></label>
            <label style={sharedSt.field}><span style={sharedSt.lbl}>Storage location</span>
              <input style={sharedSt.inp} value={form.storageLocation} onChange={e=>f("storageLocation")(e.target.value)} placeholder="Rack B / Shelf 2"/></label>
          </div>
          <label style={sharedSt.field}><span style={sharedSt.lbl}>Default supplier</span>
            <select style={sharedSt.inp} value={form.supplierId} onChange={e=>f("supplierId")(e.target.value)}>
              <option value="">— none —</option>
              {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label style={sharedSt.field}><span style={sharedSt.lbl}>Notes</span>
            <textarea style={{...sharedSt.inp,minHeight:60,resize:"vertical"}} value={form.notes} onChange={e=>f("notes")(e.target.value)}/></label>
          {item !== "new" && (
            <div style={sharedSt.infoNote}>To change quantity, use <b>Move</b> — that keeps the ledger accurate.</div>
          )}
          <PinField value={form.pin} onChange={f("pin")}/>
          {err && <div style={sharedSt.errBox}>{err}</div>}
        </div>

        <div style={sharedSt.dFoot}>
          {item !== "new" && (
            <button style={sharedSt.delBtn} onClick={del} disabled={busy}>
              <Icon name="trash" size={14}/> Delete
            </button>
          )}
          <div style={{ marginLeft:"auto", display:"flex", gap:10 }}>
            <button style={sharedSt.ghostBtn} onClick={onClose} disabled={busy}>Cancel</button>
            <button style={sharedSt.ctaBtn}   onClick={save}    disabled={busy}>{busy?"Saving…":"Save changes"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}