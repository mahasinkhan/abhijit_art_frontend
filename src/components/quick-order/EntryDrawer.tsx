// src/components/quick-order/EntryDrawer.tsx
// ── New / edit order — title + whatsapp + workDetails + items optional ─────
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import api from "../../api";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
import {
  OrderItem, QuickOrder, CustomerRec, InvStockItem, EmployeeRec,
  TERRA, TERRA_DK, GOLD, INK, MUTE, LINE, IVORY, CARD, GREEN, WA, SANS,
  rupees, todayStr, isRealEmail, EMPTY_ITEM,
} from "./types";

const CUSTOM = "__custom__";

interface Props {
  editEntry:  QuickOrder | null;
  onClose:    () => void;
  onSaved:    () => void;
  employees?: EmployeeRec[];
}

export default function EntryDrawer({ editEntry, onClose, onSaved, employees = [] }: Props) {
  const isEdit = !!editEntry;

  // ── Customer ──
  const [custSel,     setCustSel]     = useState<CustomerRec | null>(null);
  const [custQuery,   setCustQuery]   = useState("");
  const [custResults, setCustResults] = useState<CustomerRec[]>([]);
  const [custDdOpen,  setCustDdOpen]  = useState(false);
  const [custPhone,   setCustPhone]   = useState("");
  const [custWa,      setCustWa]      = useState("");   // WhatsApp number
  const searchTimer = useRef<any>(null);

  // ── Add-customer popup ──
  const [showAddCust, setShowAddCust] = useState(false);
  const [newCust,     setNewCust]     = useState({ name: "", phone: "", email: "", address: "" });
  const [addingCust,  setAddingCust]  = useState(false);
  const [addCustErr,  setAddCustErr]  = useState("");

  // ── Inventory ──
  const [stock, setStock] = useState<InvStockItem[]>([]);

  // ── Form ──
  const [title,       setTitle]       = useState("");       // NEW — short order label
  const [workDetails, setWorkDetails] = useState("");
  const [items,       setItems]       = useState<OrderItem[]>([]);
  const [showItems,   setShowItems]   = useState(false);
  const [desc,        setDesc]        = useState("");
  const [amount,      setAmount]      = useState("");
  const [less,        setLess]        = useState("");   // NEW — concession
  const [advance,     setAdvance]     = useState("");
  const [payMethod,   setPayMethod]   = useState<"cash" | "online">("cash");
  const [entryDate,   setEntryDate]   = useState(todayStr());
  const [assignToId,  setAssignToId]  = useState("");
  const [saving,      setSaving]      = useState(false);
  const [errMsg,      setErrMsg]      = useState("");
  const [images,      setImages]      = useState<File[]>([]);
  const [existingImgs,setExistingImgs]= useState<string[]>([]);
  const [removeImgs,  setRemoveImgs]  = useState<string[]>([]);
  const imgRef = useRef<HTMLInputElement>(null);

  // ── Load inventory ──
  useEffect(() => {
    api.get("/api/inventory/items")
      .then(r => setStock(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!stock.length) return;
    setItems(prev => {
      let changed = false;
      const next = prev.map(it => {
        if (it.itemId && !it.category) {
          const s = stock.find(x => x.id === it.itemId);
          if (s) { changed = true; return { ...it, category: (s.category || "Uncategorised").trim(), unit: it.unit || s.unit }; }
        }
        return it;
      });
      return changed ? next : prev;
    });
  }, [stock]);

  // ── Prefill on edit ──
  useEffect(() => {
    if (!editEntry) return;
    setCustSel({ id: editEntry.customerId || "", name: editEntry.customerName, phone: editEntry.customerPhone, email: editEntry.customerEmail });
    setCustPhone(editEntry.customerPhone || "");
    setCustWa(editEntry.whatsapp || "");
    setTitle(editEntry.title || "");
    setWorkDetails(editEntry.workDetails || "");
    setItems(editEntry.items.length
      ? editEntry.items.map(it => ({ itemId: it.itemId ?? null, category: "", desc: it.desc, qty: Number(it.qty), rate: Number(it.rate), unit: it.unit, custom: !it.itemId }))
      : []);
    setShowItems(editEntry.items.length > 0);
    setDesc(editEntry.description || "");
    setAmount(String(editEntry.amount || ""));
    setAdvance(editEntry.advancePaid ? String(editEntry.advancePaid) : "");
    setLess((editEntry as any).lessAmount ? String((editEntry as any).lessAmount) : "");
    setPayMethod(editEntry.paymentMethod);
    setEntryDate(editEntry.entryDate.slice(0, 10));
    setExistingImgs(editEntry.images || []);
    setImages([]);
  }, [editEntry]);

  // ── Customer search ──
  const runSearch = useCallback((q: string) => {
    api.get(`/api/quick-orders/customers?q=${encodeURIComponent(q)}`)
      .then(r => setCustResults(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCustResults([]));
  }, []);

  useEffect(() => {
    if (custSel) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(custQuery), 250);
    return () => searchTimer.current && clearTimeout(searchTimer.current);
  }, [custQuery, custSel, runSearch]);

  // ── Stock by category ──
  const { categories, byCat } = useMemo(() => {
    const m = new Map<string, InvStockItem[]>();
    stock.forEach(it => {
      const c = (it.category || "Uncategorised").trim() || "Uncategorised";
      if (!m.has(c)) m.set(c, []);
      m.get(c)!.push(it);
    });
    const cats = [...m.keys()].sort((a, b) => a.localeCompare(b));
    m.forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return { categories: cats, byCat: m };
  }, [stock]);

  const amtNum  = parseFloat(amount) || 0;
  const lessNum = parseFloat(less) || 0;
  const advNum  = parseFloat(advance) || 0;
  const dueNum  = Math.max(0, amtNum - lessNum - advNum);
  const canSave = !!(custSel?.name.trim() && workDetails.trim() && amtNum > 0);

  // ── Item helpers ──
  function addItem()   { setItems(p => [...p, EMPTY_ITEM()]); }
  function removeItem(i: number) { setItems(p => p.filter((_, idx) => idx !== i)); }
  function patchItem(i: number, patch: Partial<OrderItem>) {
    setItems(p => p.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  }
  function onCategorySelect(i: number, value: string) {
    if (value === CUSTOM) patchItem(i, { custom: true, category: "", itemId: null, desc: "", unit: undefined });
    else                  patchItem(i, { custom: false, category: value, itemId: null, desc: "", unit: undefined, rate: 0 });
  }
  function onItemSelect(i: number, value: string) {
    const s = stock.find(x => x.id === value);
    if (s) patchItem(i, { custom: false, itemId: s.id, desc: s.name, rate: parseFloat(s.sellPrice || "0") || 0, unit: s.unit });
    else   patchItem(i, { itemId: null, desc: "", unit: undefined, rate: 0 });
  }

  // ── Customer helpers ──
  function selectCustomer(c: CustomerRec) { setCustSel(c); setCustDdOpen(false); setCustQuery(""); setCustPhone(c.phone || ""); }
  function openAddCustomer(name: string)  { setNewCust({ name: name.trim(), phone: "", email: "", address: "" }); setAddCustErr(""); setCustDdOpen(false); setShowAddCust(true); }

  async function saveNewCustomer() {
    setAddCustErr("");
    if (!newCust.name.trim()) { setAddCustErr("Full name is required."); return; }
    setAddingCust(true);
    try {
      const { data } = await api.post("/api/users", {
        name: newCust.name.trim(), phone: newCust.phone.trim(),
        email: newCust.email.trim() || `walkin_${Date.now()}@abhijitart.com`,
        address: newCust.address.trim(),
      });
      const rec: CustomerRec = { id: data.id, name: data.name, phone: data.phone || "", email: data.email || "" };
      setCustSel(rec); setCustPhone(rec.phone || newCust.phone.trim()); setShowAddCust(false);
    } catch (err: any) {
      setAddCustErr(err.response?.data?.message || err.response?.data?.error || "Failed to add customer.");
    } finally { setAddingCust(false); }
  }

  // ── Save ──
  async function saveEntry() {
    if (!canSave || !custSel) return;
    setErrMsg(""); setSaving(true);
    try {
      const fd = new FormData();
      fd.append("customerId",    custSel.id || "");
      fd.append("customerName",  custSel.name);
      fd.append("customerPhone", custPhone.trim());
      fd.append("customerEmail", custSel.email || "");
      fd.append("whatsapp",      custWa.trim() || "");
      fd.append("title",         title.trim() || "");
      fd.append("workDetails",   workDetails.trim());
      fd.append("description",   desc);
      fd.append("amount",        String(amtNum));
      fd.append("advancePaid",   String(advNum));
      fd.append("lessAmount",    String(lessNum));
      fd.append("paymentMethod", payMethod);
      fd.append("entryDate",     entryDate);
      if (items.length) fd.append("items", JSON.stringify(items.filter(it => it.desc.trim()).map(it => ({ itemId: it.itemId, desc: it.desc, qty: it.qty, rate: it.rate, unit: it.unit }))));
      if (!isEdit && assignToId) fd.append("assignToId", assignToId);
      // keep existing images minus removed ones
      const kept = existingImgs.filter(img => !removeImgs.includes(img));
      fd.append("existingImages", JSON.stringify(kept));
      images.forEach(f => fd.append("images", f));

      if (isEdit) await api.patch(`/api/quick-orders/${editEntry!.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      else        await api.post("/api/quick-orders", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSaved();
    } catch (err: any) {
      setErrMsg(err.response?.data?.message || err.response?.data?.error || "Failed to save order");
    } finally { setSaving(false); }
  }

  return (
    <div style={st.ov} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>{`
        .qo-cp-item:hover { background:${IVORY}; }
        .qo-cp-add:hover { background:#fbe9e2; }
        .qo-add-item:hover { background:#f3efe8; }
        .qo-save:hover:not(:disabled) { background:${TERRA_DK}; }
        .qo-chip-chg:hover { background:${IVORY}; }
        .qo-pmbtn { transition:all .12s; }
        .qo-toggle:hover { background:${IVORY}; }
      `}</style>

      <div style={st.modal}>
        <button style={st.close} onClick={onClose}>×</button>
        <div style={st.title}>{isEdit ? "Edit Order" : "New Order"}</div>
        {errMsg && <div style={st.err}>{errMsg}</div>}

        <div style={st.grid}>

          {/* ── Customer ── */}
          <div style={st.fieldset}>
            <div style={st.fsL}>Customer</div>
            {custSel ? (
              <>
                <div style={st.chip}>
                  <div>
                    <b style={{ fontSize: 14 }}>{custSel.name}</b>
                    <div style={st.chipSub}>{isRealEmail(custSel.email) ? custSel.email : "Walk-in customer"}</div>
                  </div>
                  <button className="qo-chip-chg" style={st.chipChg} onClick={() => { setCustSel(null); setCustPhone(""); setCustWa(""); setCustQuery(""); }}>Change</button>
                </div>
                {/* Phone + WhatsApp side by side */}
                <div style={{ ...st.twoCol, marginTop: 12 }}>
                  <div>
                    <label style={st.lbl}>Phone <span style={st.hint}>· prints on invoice</span></label>
                    <input style={st.inp} value={custPhone} inputMode="tel" autoComplete="off" onChange={(e) => setCustPhone(e.target.value)} placeholder="9876543210" />
                  </div>
                  <div>
                    <label style={st.lbl}>
                      <span style={{ color: WA }}>WhatsApp</span>
                      <span style={st.hint}> · if different from phone</span>
                    </label>
                    <input style={{ ...st.inp, borderColor: custWa ? WA : LINE }} value={custWa} inputMode="tel" autoComplete="off" onChange={(e) => setCustWa(e.target.value)} placeholder="Same as phone if blank" />
                  </div>
                </div>
              </>
            ) : (
              <div style={{ position: "relative" }}>
                <label style={st.lbl}>Search or type name *</label>
                <input
                  style={st.inp}
                  value={custQuery}
                  onChange={(e) => { setCustQuery(e.target.value); setCustDdOpen(true); }}
                  onFocus={() => { setCustDdOpen(true); if (!custResults.length) runSearch(""); }}
                  onBlur={() => setTimeout(() => setCustDdOpen(false), 180)}
                  placeholder="Type name or phone…" autoComplete="off"
                />
                {custDdOpen && (
                  <div style={st.cpDd}>
                    {custResults.map((c) => (
                      <div key={c.id} className="qo-cp-item" style={st.cpItem} onMouseDown={() => selectCustomer(c)}>
                        <b style={{ fontSize: 13.5 }}>{c.name}</b>
                        {c.phone && <span style={st.cpPhone}>{c.phone}</span>}
                      </div>
                    ))}
                    <div className="qo-cp-add" style={st.cpAdd} onMouseDown={() => openAddCustomer(custQuery)}>
                      + Add new customer{custQuery.trim() ? ` "${custQuery.trim()}"` : ""}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Title (NEW) ── */}
          <div style={st.fieldset}>
            <div style={st.fsL}>Order Title <span style={{ fontWeight: 400, color: MUTE, textTransform: "none", letterSpacing: 0 }}>· optional short label</span></div>
            <input
              style={st.inp}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flex Banner Order, Visiting Cards Batch 2…"
            />
          </div>

          {/* ── Work Details (REQUIRED) ── */}
          <div style={st.fieldset}>
            <div style={st.fsL}>Work Details <span style={{ color: TERRA, fontWeight: 900 }}>*</span></div>
            <label style={st.lbl}>Describe what needs to be made <span style={st.hint}>· in any language, shorthand is fine</span></label>
            <textarea
              style={{ ...st.inp, minHeight: 100, resize: "vertical" }}
              value={workDetails}
              onChange={(e) => setWorkDetails(e.target.value)}
              placeholder={"e.g. Rohit ka flex banner 5×3 ft, white background\nAur 50 pcs visiting card bhi chahiye"}
              autoFocus={!isEdit}
            />
            {isEdit && (
              <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: GREEN }}>●</span>
                Saving updates Work Details for the assigned employee in real time.
              </div>
            )}
          </div>

          {/* ── Items (OPTIONAL, collapsed) ── */}
          <div style={st.fieldset}>
            <div
              className="qo-toggle"
              role="button" tabIndex={0}
              style={{ ...st.fsL as any, cursor: "pointer", userSelect: "none", marginBottom: showItems ? 12 : 0 }}
              onClick={() => setShowItems(v => !v)}
              onKeyDown={(e) => e.key === "Enter" && setShowItems(v => !v)}>
              Items (optional) <span style={{ fontWeight: 400, color: MUTE, textTransform: "none", letterSpacing: 0 }}>· add later when billing</span>
              <span style={{ marginLeft: 8, fontSize: 12 }}>{showItems ? "▲" : "▼"}</span>
            </div>
            {showItems && (
              <>
                <div style={st.itemHead}>
                  <span>Category</span><span>Item</span><span>Qty</span><span>Rate (₹)</span><span />
                </div>
                {items.map((it, i) => {
                  const s = it.itemId ? stock.find(x => x.id === it.itemId) : null;
                  const avail = s ? parseFloat(s.quantity) : null;
                  const catItems = it.category ? (byCat.get(it.category) || []) : [];
                  return (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={st.itemRow}>
                        <select style={st.inp} value={it.custom ? CUSTOM : (it.category || "")} onChange={(e) => onCategorySelect(i, e.target.value)}>
                          <option value="">Category…</option>
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          <option value={CUSTOM}>✏️ Custom</option>
                        </select>
                        {it.custom ? (
                          <input style={st.inp} value={it.desc} onChange={(e) => patchItem(i, { desc: e.target.value })} placeholder="Custom item / service…" />
                        ) : (
                          <select style={{ ...st.inp, opacity: it.category ? 1 : .55 }} value={it.itemId || ""} disabled={!it.category} onChange={(e) => onItemSelect(i, e.target.value)}>
                            <option value="">{it.category ? "Select item…" : "Pick category first"}</option>
                            {catItems.map(s2 => <option key={s2.id} value={s2.id}>{s2.name} — {parseFloat(s2.quantity)} {s2.unit}</option>)}
                          </select>
                        )}
                        <input style={st.inp} type="number" min="0" step="0.001" value={it.qty} onChange={(e) => patchItem(i, { qty: Number(e.target.value) })} />
                        <input style={st.inp} type="number" min="0" step="0.01"  value={it.rate} onChange={(e) => patchItem(i, { rate: Number(e.target.value) })} />
                        {items.length > 0 && <button style={st.rm} onClick={() => removeItem(i)}>×</button>}
                      </div>
                      {s && (
                        <div style={st.stockHint}>
                          {avail !== null && avail < it.qty
                            ? <span style={{ color: TERRA, fontWeight: 700 }}>⚠️ Only {avail} {s.unit} in stock</span>
                            : <span style={{ color: GREEN }}>✓ {avail} {s.unit} available</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button className="qo-add-item" style={st.addItem} onClick={addItem}>+ Add item</button>
              </>
            )}
            {!showItems && (
              <button className="qo-toggle" style={{ ...st.addItem, marginTop: 8 }} onClick={() => { setShowItems(true); if (!items.length) addItem(); }}>
                + Add items (optional)
              </button>
            )}
          </div>

          {/* ── Payment ── */}
          <div style={st.fieldset}>
            <div style={st.fsL}>Payment</div>
            <div style={{ ...st.twoCol, gridTemplateColumns: "1fr 1fr 1fr" }}>
              <div>
                <label style={st.lbl}>Total Amount (₹) *</label>
                <input style={st.inp} type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 2500" />
              </div>
              <div>
                <label style={st.lbl}><span style={{ color: GOLD }}>Less (₹)</span> <span style={st.hint}>· concession</span></label>
                <input style={{ ...st.inp, borderColor: lessNum > 0 ? GOLD : LINE }} type="number" min="0" value={less} onChange={(e) => setLess(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label style={st.lbl}>Advance Received (₹)</label>
                <input style={st.inp} type="number" min="0" value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="0" />
              </div>
            </div>
            {amtNum > 0 && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: IVORY, border: `1px solid ${LINE}`, display: "flex", gap: 20, fontSize: 13, flexWrap: "wrap" }}>
                <span>Total: <b>{rupees(amtNum)}</b></span>
                {lessNum > 0 && <span>Less: <b style={{ color: GOLD }}>−{rupees(lessNum)}</b></span>}
                <span>Advance: <b style={{ color: GREEN }}>{rupees(advNum)}</b></span>
                <span>Balance: <b style={{ color: dueNum > 0 ? TERRA : GREEN }}>{dueNum > 0 ? rupees(dueNum) : "✓ Fully paid"}</b></span>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <label style={st.lbl}>Payment Method</label>
              <div style={st.pm}>
                <button className="qo-pmbtn" style={{ ...st.pmBtn, ...(payMethod === "cash"   ? st.pmOn : {}) }} onClick={() => setPayMethod("cash")}>💵 Cash</button>
                <button className="qo-pmbtn" style={{ ...st.pmBtn, ...(payMethod === "online" ? st.pmOn : {}) }} onClick={() => setPayMethod("online")}>📱 Online / UPI</button>
              </div>
            </div>
          </div>

          {/* ── Note + date ── */}
          <div style={st.twoCol}>
            <div>
              <label style={st.lbl}>Extra note (optional)</label>
              <input style={st.inp} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Any special instruction…" />
            </div>
            <div>
              <label style={st.lbl}>Date</label>
              <input type="date" style={st.inp} value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
          </div>

          {/* ── Assign ── */}
          {!isEdit && employees.length > 0 && (
            <div>
              <label style={st.lbl}>Assign to employee (optional)</label>
              <select style={st.inp} value={assignToId} onChange={(e) => setAssignToId(e.target.value)}>
                <option value="">— Don't assign yet —</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
              {assignToId && <div style={{ fontSize: 11.5, color: GREEN, marginTop: 5 }}>✓ A task will be created for this employee.</div>}
            </div>
          )}

          {/* ── Reference Images ── */}
          <div style={st.fieldset}>
            <div style={st.fsL}>Reference Images <span style={{ fontWeight: 400, color: MUTE, textTransform: "none", letterSpacing: 0 }}>· employee will see these</span></div>
            {/* Existing images */}
            {existingImgs.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {existingImgs.map((img, i) => (
                  <div key={i} style={{ position: "relative", width: 80, height: 80 }}>
                    <img src={`${API_BASE}${img}`} alt="" style={{ width: 80, height: 80, objectFit: "cover", border: `1px solid ${LINE}`, opacity: removeImgs.includes(img) ? .3 : 1 }} />
                    <button onClick={() => setRemoveImgs(p => p.includes(img) ? p.filter(x => x !== img) : [...p, img])}
                      style={{ position: "absolute", top: 2, right: 2, background: removeImgs.includes(img) ? GREEN : TERRA, color: "#fff", border: "none", width: 20, height: 20, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {removeImgs.includes(img) ? "↩" : "×"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* New image previews */}
            {images.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {images.map((f, i) => (
                  <div key={i} style={{ position: "relative", width: 80, height: 80 }}>
                    <img src={URL.createObjectURL(f)} alt="" style={{ width: 80, height: 80, objectFit: "cover", border: `1px solid ${LINE}` }} />
                    <button onClick={() => setImages(p => p.filter((_, idx) => idx !== i))}
                      style={{ position: "absolute", top: 2, right: 2, background: TERRA, color: "#fff", border: "none", width: 20, height: 20, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => { const f = Array.from(e.target.files || []); setImages(p => [...p, ...f].slice(0, 8)); e.target.value = ""; }} />
            <button style={{ ...st.addItem, marginTop: 0 }} onClick={() => imgRef.current?.click()}>📎 Attach images (max 8)</button>
          </div>

          <button className="qo-save"
            style={{ ...st.save, opacity: (saving || !canSave) ? .5 : 1 }}
            disabled={saving || !canSave}
            onClick={saveEntry}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Save Order"}
          </button>
          {!canSave && <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center" }}>Customer name, work details, and total amount are required.</div>}
        </div>
      </div>

      {/* ── Add-customer popup ── */}
      {showAddCust && (
        <div style={st.ov2} onClick={(e) => e.target === e.currentTarget && setShowAddCust(false)}>
          <div style={st.modal2}>
            <button style={st.close} onClick={() => setShowAddCust(false)}>×</button>
            <div style={st.title}>Add Customer</div>
            {addCustErr && <div style={st.err}>{addCustErr}</div>}
            <div style={st.grid}>
              <div><label style={st.lbl}>Full Name *</label><input style={st.inp} value={newCust.name} onChange={(e) => setNewCust(c => ({ ...c, name: e.target.value }))} /></div>
              <div><label style={st.lbl}>Phone</label><input style={st.inp} value={newCust.phone} onChange={(e) => setNewCust(c => ({ ...c, phone: e.target.value }))} placeholder="9876543210" /></div>
              <div><label style={st.lbl}>Email</label><input style={st.inp} type="email" value={newCust.email} onChange={(e) => setNewCust(c => ({ ...c, email: e.target.value }))} placeholder="optional" /></div>
              <div><label style={st.lbl}>Address</label><input style={st.inp} value={newCust.address} onChange={(e) => setNewCust(c => ({ ...c, address: e.target.value }))} placeholder="Shop / area, town" /></div>
              <button className="qo-save" style={st.save} disabled={addingCust} onClick={saveNewCustomer}>{addingCust ? "Adding…" : "Add & Continue"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  ov:        { position: "fixed", inset: 0, background: "rgba(31,36,48,.5)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 20px", overflowY: "auto", overscrollBehavior: "contain" },
  modal:     { background: "#fff", width: "100%", maxWidth: 960, maxHeight: "calc(100vh - 48px)", overflowY: "auto", padding: 30, position: "relative", margin: "auto", fontFamily: SANS, color: INK },
  close:     { position: "sticky", top: 0, float: "right", marginTop: -8, marginRight: -8, background: "#fff", border: "none", fontSize: "1.4rem", cursor: "pointer", color: MUTE, zIndex: 5, lineHeight: 1, width: 32, height: 32 },
  title:     { fontSize: 17, fontWeight: 800, marginBottom: 16, color: INK },
  grid:      { display: "grid", gap: 13 },
  twoCol:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 },
  fieldset:  { border: `1px solid ${LINE}`, padding: 16 },
  fsL:       { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: TERRA, marginBottom: 12 } as React.CSSProperties,
  lbl:       { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: MUTE, marginBottom: 5 },
  hint:      { fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#9ca3af" } as React.CSSProperties,
  inp:       { width: "100%", padding: "9px 12px", border: `1px solid ${LINE}`, fontSize: 14, fontFamily: SANS, color: INK, background: "#fff", outline: "none", boxSizing: "border-box" },
  itemHead:  { display: "grid", gridTemplateColumns: "1fr 2.8fr 70px 110px 32px", gap: 8, marginBottom: 4 },
  itemRow:   { display: "grid", gridTemplateColumns: "1fr 2.8fr 70px 110px 32px", gap: 8, alignItems: "center" },
  rm:        { background: "#fff", border: "1px solid #f5c4bb", color: TERRA, width: 28, height: 36, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" },
  stockHint: { fontSize: 11, marginTop: 4, paddingLeft: 2 },
  addItem:   { background: IVORY, border: `1px dashed ${LINE}`, color: MUTE, padding: 8, fontSize: 13, cursor: "pointer", fontFamily: SANS, width: "100%", marginTop: 8 },
  pm:        { display: "flex", border: `1px solid ${LINE}` },
  pmBtn:     { flex: 1, padding: 9, border: "none", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: SANS, fontWeight: 600, color: INK },
  pmOn:      { background: TERRA, color: "#fff" },
  save:      { background: TERRA, color: "#fff", border: "none", padding: 11, width: "100%", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SANS, marginTop: 4 },
  chip:      { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, border: `1px solid ${LINE}`, background: IVORY, padding: "11px 14px" },
  chipSub:   { fontSize: 12, color: MUTE, marginTop: 2 },
  chipChg:   { background: "#fff", border: `1px solid ${LINE}`, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: SANS },
  cpDd:      { position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: `1px solid ${LINE}`, borderTop: "none", zIndex: 30, maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 20px rgba(20,20,25,.12)" },
  cpItem:    { padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${IVORY}` },
  cpPhone:   { fontSize: 12, color: MUTE, marginLeft: 8 },
  cpAdd:     { padding: "10px 12px", cursor: "pointer", fontSize: 13, fontWeight: 700, color: TERRA, background: "#fdf6f3" },
  ov2:       { position: "fixed", inset: 0, background: "rgba(31,36,48,.55)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal2:    { background: "#fff", width: "100%", maxWidth: 420, padding: 26, position: "relative", fontFamily: SANS },
  err:       { background: "#fef2ee", border: "1px solid #f5c4bb", color: "#b23c1c", padding: "9px 12px", fontSize: 13, marginBottom: 12 },
};