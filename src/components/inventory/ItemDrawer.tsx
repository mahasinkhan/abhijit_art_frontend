// src/components/inventory/ItemDrawer.tsx
import { useState, useEffect, useMemo } from "react";
import api from "../../api";
import type { InventoryItem, Supplier } from "./types";
import { UNIT_OPTS, unitLabel } from "./types";
import PinField from "./PinField";

const ADD_NEW = "__add_new__";

// ── Design tokens ────────────────────────────────────────────────────────────
const TERRA = "#d9542f";
const IVORY = "#f7f3ea";
const CARD  = "#fff";
const LINE  = "#e8e0d4";
const SANS  = "'DM Sans', sans-serif";
const MUTE  = "#7a6f66";
const INK   = "#2a231d";
const GREEN = "#1a7a4a";

// ── Styles ───────────────────────────────────────────────────────────────────
const st: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(42,35,29,.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 2000, backdropFilter: "blur(2px)",
  },
  box: {
    background: CARD, width: "min(720px, 94vw)", maxHeight: "92vh",
    overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,.18)",
    display: "flex", flexDirection: "column", fontFamily: SANS, color: INK,
    animation: "inv-scaleIn .18s ease",
  },
  hd: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 20px 14px", borderBottom: `1px solid ${LINE}`,
    background: IVORY, fontSize: 14, fontWeight: 700, flexShrink: 0,
  },
  x: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: MUTE, lineHeight: 1 },
  body: { padding: "20px", display: "flex", flexDirection: "column", gap: 14 },
  fg:   { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 11, fontWeight: 700, color: MUTE, textTransform: "uppercase" as const, letterSpacing: .6 },
  input: {
    width: "100%", padding: "9px 10px", border: `1px solid ${LINE}`,
    fontSize: 13.5, fontFamily: SANS, color: INK, background: CARD,
    outline: "none", boxSizing: "border-box" as const, caretColor: TERRA,
  },
  select: {
    width: "100%", padding: "9px 10px", border: `1px solid ${LINE}`,
    fontSize: 13.5, fontFamily: SANS, color: INK, background: CARD,
    outline: "none", boxSizing: "border-box" as const, cursor: "pointer",
  },
  inlineRow: { display: "flex", gap: 8, alignItems: "stretch" },
  backBtn: {
    padding: "0 12px", background: "transparent", border: `1px solid ${LINE}`,
    fontSize: 12, cursor: "pointer", color: MUTE, fontFamily: SANS,
    whiteSpace: "nowrap" as const, flexShrink: 0,
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  hint: {
    fontSize: 11, color: TERRA, background: "#fef2ee",
    padding: "3px 8px", display: "inline-block",
  },
  qtyBadge: {
    fontSize: 11, color: GREEN, background: "#edfaf3",
    padding: "3px 8px", display: "inline-block",
  },
  divider: { borderTop: `1px dashed ${LINE}`, margin: "2px 0" },
  sectionHd: { fontSize: 11, fontWeight: 800, color: MUTE, textTransform: "uppercase" as const, letterSpacing: .8, marginBottom: 2 },
  err:  { color: TERRA, fontSize: 12.5, margin: 0 },
  ft: {
    display: "flex", gap: 10, justifyContent: "flex-end",
    padding: "14px 20px", borderTop: `1px solid ${LINE}`,
    background: IVORY, flexShrink: 0,
  },
  ghost: {
    padding: "9px 20px", background: "transparent", border: `1px solid ${LINE}`,
    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS, color: INK,
  },
  primary: {
    padding: "9px 22px", background: TERRA, border: "none",
    fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS, color: "#fff",
  },
};

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  item:      InventoryItem | null;
  items:     InventoryItem[];
  suppliers: Supplier[];
  selCat:    string;
  onClose:   () => void;
  onSaved:   () => void;
}

const blank = (cat = "") => ({
  category: cat, name: "", unit: "piece" as string,
  supplierId: "",
  // Opening stock (only for new items)
  openingQty: "",
  // Pricing
  buyPrice: "", sellPrice: "", reorderLevel: "",
  pin: "",
});

// ── Component ────────────────────────────────────────────────────────────────
export default function ItemDrawer({ item, items, suppliers, selCat, onClose, onSaved }: Props) {
  const [form,      setForm]      = useState(blank(selCat));
  const [isNewCat,  setIsNewCat]  = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [busy,      setBusy]      = useState(false);
  const [err,       setErr]       = useState("");

  const isEdit = !!item;

  // ── Derive categories ─────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = items.map(i => i.category).filter(Boolean) as string[];
    return [...new Set(cats)].sort();
  }, [items]);

  // ── Derive item names for selected category ───────────────────────────────
  const catItemNames = useMemo(() => {
    if (!form.category || isNewCat) return [];
    const names = items
      .filter(i => i.category === form.category)
      .map(i => i.name).filter(Boolean) as string[];
    return [...new Set(names)].sort();
  }, [items, form.category, isNewCat]);

  // ── Sync on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (item) {
      setForm({
        category:     item.category          ?? "",
        name:         item.name              ?? "",
        unit:         item.unit              ?? "piece",
        supplierId:   item.supplierId        ?? "",
        openingQty:   "",                          // qty not editable in edit mode
        buyPrice:     item.costPrice?.toString()    ?? "",
        sellPrice:    item.sellPrice?.toString()    ?? "",
        reorderLevel: item.reorderLevel?.toString() ?? "",
        pin: "",
      });
      setIsNewCat(false); setIsNewItem(false);
    } else {
      setForm(blank(selCat));
      setIsNewCat(!!selCat && !categories.includes(selCat));
      setIsNewItem(false);
    }
    setErr("");
  }, [item, selCat]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField =
    (k: keyof ReturnType<typeof blank>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  function handleCatChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    if (v === ADD_NEW) {
      setIsNewCat(true); setIsNewItem(false);
      setForm(f => ({ ...f, category: "", name: "" }));
    } else {
      setIsNewCat(false); setIsNewItem(false);
      setForm(f => ({ ...f, category: v, name: "" }));
    }
  }

  function handleItemChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    if (v === ADD_NEW) {
      setIsNewItem(true);
      setForm(f => ({ ...f, name: "" }));
    } else {
      setIsNewItem(false);
      setForm(f => ({ ...f, name: v }));
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!form.category.trim()) { setErr("Category required");  return; }
    if (!form.name.trim())     { setErr("Item name required"); return; }
    if (!form.pin)             { setErr("PIN required");       return; }
    if (!isEdit && duplicateItem) { setErr('Item already exists — use "Add Stock" on the item row to add quantity.'); return; }

    const qty = form.openingQty ? parseFloat(form.openingQty) : 0;
    if (!isEdit && form.openingQty && isNaN(qty)) { setErr("Invalid quantity"); return; }

    setBusy(true);
    try {
      if (isEdit) {
        await api.patch(`/api/inventory/items/${item!.id}`, {
          category:     form.category.trim(),
          name:         form.name.trim(),
          unit:         form.unit,
          supplierId:   form.supplierId || null,
          costPrice:    form.buyPrice     ? parseFloat(form.buyPrice)     : undefined,
          sellPrice:    form.sellPrice    ? parseFloat(form.sellPrice)    : undefined,
          reorderLevel: form.reorderLevel ? parseFloat(form.reorderLevel) : undefined,
          pin:          form.pin,
        });
      } else {
        // Backend createItem handles openingQty + supplier ledger update in one tx
        await api.post("/api/inventory/items", {
          sku:          `SKU${Date.now()}`,           // auto-generate; backend requires it
          category:     form.category.trim(),
          name:         form.name.trim(),
          unit:         form.unit,
          supplierId:   form.supplierId || null,
          openingQty:   qty > 0 ? qty : undefined,   // backend creates movement + updates supplier
          costPrice:    form.buyPrice     ? parseFloat(form.buyPrice)     : undefined,
          sellPrice:    form.sellPrice    ? parseFloat(form.sellPrice)    : undefined,
          reorderLevel: form.reorderLevel ? parseFloat(form.reorderLevel) : undefined,
          pin:          form.pin,
        });
      }
      onSaved();
    } catch (ex: any) {
      setErr(ex.response?.data?.error || ex.response?.data?.message || "Failed to save — check backend terminal");
    } finally {
      setBusy(false);
    }
  }

  const nameIsText = isNewCat || catItemNames.length === 0 || isNewItem;
  const qty        = parseFloat(form.openingQty) || 0;
  const buy        = parseFloat(form.buyPrice)    || 0;
  const liveValue  = qty > 0 && buy > 0 ? `Opening value: ₹${(qty * buy).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
  const unitName   = unitLabel(form.unit);

  // Duplicate = same name + category + same supplier (or both have no supplier)
  // Different supplier = allowed (different purchase source, different price)
  const duplicateItem = !isEdit && !isNewItem && !isNewCat && form.category && form.name
    ? items.find(i =>
        i.category?.toLowerCase() === form.category.toLowerCase() &&
        i.name?.toLowerCase()     === form.name.toLowerCase()     &&
        (i.supplierId || "")      === (form.supplierId || "")
      )
    : null;

  // Same name+category but different supplier — warn but allow
  const sameNameDiffSupplier = !isEdit && !isNewItem && !isNewCat && form.category && form.name && !duplicateItem
    ? items.find(i =>
        i.category?.toLowerCase() === form.category.toLowerCase() &&
        i.name?.toLowerCase()     === form.name.toLowerCase()
      )
    : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={st.overlay} onClick={onClose}>
      <div style={st.box} onClick={e => e.stopPropagation()}>

        <div style={st.hd}>
          <span>{isEdit ? "Edit item" : "Add stock item"}</span>
          <button style={st.x} onClick={onClose} type="button">✕</button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={st.body}>

            {/* ── CATEGORY ────────────────────────────────────────── */}
            <div style={st.fg}>
              <label style={st.label}>Category</label>
              {!isNewCat ? (
                <select style={st.select} value={form.category} onChange={handleCatChange} required>
                  <option value="">Select category…</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  {categories.length > 0 && <option disabled>──────────────</option>}
                  <option value={ADD_NEW}>➕ Add new category</option>
                </select>
              ) : (
                <div style={st.inlineRow}>
                  <input
                    style={{ ...st.input, flex: 1 }}
                    placeholder="New category name…"
                    value={form.category}
                    onChange={setField("category")}
                    autoFocus required
                  />
                  {categories.length > 0 && (
                    <button type="button" style={st.backBtn}
                      onClick={() => { setIsNewCat(false); setIsNewItem(false); setForm(f => ({ ...f, category: "", name: "" })); }}>
                      ← back
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── ITEM NAME ───────────────────────────────────────── */}
            <div style={st.fg}>
              <label style={st.label}>Item name</label>
              {!nameIsText ? (
                <select style={st.select} value={form.name} onChange={handleItemChange} required>
                  <option value="">Select item…</option>
                  {catItemNames.map(n => <option key={n} value={n}>{n}</option>)}
                  <option disabled>──────────────</option>
                  <option value={ADD_NEW}>➕ Add new item</option>
                </select>
              ) : (
                <div style={st.inlineRow}>
                  <input
                    style={{ ...st.input, flex: 1 }}
                    placeholder="Item name…"
                    value={form.name}
                    onChange={setField("name")}
                    autoFocus={isNewItem} required
                  />
                  {isNewItem && catItemNames.length > 0 && (
                    <button type="button" style={st.backBtn}
                      onClick={() => { setIsNewItem(false); setForm(f => ({ ...f, name: "" })); }}>
                      ← back
                    </button>
                  )}
                </div>
              )}
              {isNewCat && form.category.trim() && (
                <span style={st.hint}>✦ New category — item name is free text</span>
              )}
              {/* Hard duplicate: same name + category + supplier */}
              {duplicateItem && (
                <div style={{
                  background: "#fff8e6", border: "1px solid #f0c040",
                  padding: "8px 12px", fontSize: 12.5, color: "#7a5a00",
                }}>
                  ⚠️ This item already exists with the same supplier. Use <strong>Add Stock</strong> on the item row to add quantity.
                </div>
              )}
              {/* Same name+category, different supplier — allowed, just inform */}
              {sameNameDiffSupplier && (
                <div style={{
                  background: "#edfaf3", border: "1px solid #6fcf97",
                  padding: "8px 12px", fontSize: 12.5, color: "#1a5c36",
                }}>
                  ✓ Different supplier — a separate stock entry will be created with this price.
                </div>
              )}
            </div>

            {/* ── UNIT + OPENING QTY (new only) ───────────────────── */}
            <div style={st.row2}>
              <div style={st.fg}>
                <label style={st.label}>Unit</label>
                <select style={st.select} value={form.unit} onChange={setField("unit")}>
                  {UNIT_OPTS.map(u => <option key={u} value={u}>{unitLabel(u)}</option>)}
                </select>
              </div>
              {!isEdit && (
                <div style={st.fg}>
                  <label style={st.label}>
                    Opening qty&nbsp;
                    <span style={{ fontWeight: 400, textTransform: "none" }}>({unitName})</span>
                  </label>
                  <input
                    style={st.input}
                    type="number" step="0.001" min="0"
                    value={form.openingQty}
                    onChange={setField("openingQty")}
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            {/* Opening value live preview */}
            {!isEdit && liveValue && (
              <span style={st.qtyBadge}>✓ {liveValue} ({unitName})</span>
            )}

            {/* ── SUPPLIER ────────────────────────────────────────── */}
            <div style={st.fg}>
              <label style={st.label}>Supplier</label>
              <select style={st.select} value={form.supplierId} onChange={setField("supplierId")}>
                <option value="">No supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* ── PRICING ─────────────────────────────────────────── */}
            <div style={st.divider} />
            <div style={st.sectionHd}>Pricing</div>
            <div style={st.row3}>
              <div style={st.fg}>
                <label style={st.label}>
                  Buy price (₹)
                  {form.unit !== "piece" && <span style={{ fontWeight: 400 }}> /{unitName}</span>}
                </label>
                <input
                  style={st.input}
                  type="number" step="0.01" min="0"
                  value={form.buyPrice}
                  onChange={setField("buyPrice")}
                  placeholder="0.00"
                />
              </div>
              <div style={st.fg}>
                <label style={st.label}>
                  Sell price (₹)
                  {form.unit !== "piece" && <span style={{ fontWeight: 400 }}> /{unitName}</span>}
                </label>
                <input
                  style={st.input}
                  type="number" step="0.01" min="0"
                  value={form.sellPrice}
                  onChange={setField("sellPrice")}
                  placeholder="0.00"
                />
              </div>
              <div style={st.fg}>
                <label style={st.label}>Reorder level</label>
                <input
                  style={st.input}
                  type="number" step="0.001" min="0"
                  value={form.reorderLevel}
                  onChange={setField("reorderLevel")}
                  placeholder="0"
                />
              </div>
            </div>

            {/* ── PIN ─────────────────────────────────────────────── */}
            <div style={st.divider} />
            <PinField value={form.pin} onChange={p => setForm(f => ({ ...f, pin: p }))} />

            {err && <p style={st.err}>{err}</p>}
          </div>

          <div style={st.ft}>
            <button type="button" style={st.ghost} onClick={onClose}>Cancel</button>
            <button
              type="submit"
              style={{ ...st.primary, opacity: busy ? .7 : 1 }}
              disabled={busy || !!duplicateItem}
            >
              {busy ? "Saving…" : isEdit ? "Save changes" : duplicateItem ? "Item already exists" : "Add item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}