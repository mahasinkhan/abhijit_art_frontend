// src/components/billing/BillingForm.tsx
import { useMemo, useState } from "react";
import {
  LineItem, Party, CustomerLite, StockItem, PayMethod, DiscType,
  INK, BODY, MUTE, LINE, CARD, TERRA, GOLD, GREEN, WA, FAINT,
  SANS, GLOW, GLOW_SHADOW, rupee, num, dec, uid, btnSt,
} from "./types";

// ── Icon ──────────────────────────────────────────────────────────────────────
function Icon({ name, size=16 }: { name:string; size?:number }) {
  const p = { fill:"none", stroke:"currentColor", strokeWidth:1.8, strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
  const map: Record<string,JSX.Element> = {
    plus:     <path d="M12 5v14M5 12h14" {...p}/>,
    trash:    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" {...p}/>,
    banknote: <><rect x="2" y="6" width="20" height="12" rx="2" {...p}/><circle cx="12" cy="12" r="2.5" {...p}/></>,
    card:     <><rect x="2.5" y="5" width="19" height="14" rx="2" {...p}/><path d="M2.5 9.5h19" {...p}/></>,
    lock:     <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" {...p}/><path d="M7 11V7a5 5 0 0 1 10 0v4" {...p}/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{flexShrink:0}} aria-hidden>{map[name]}</svg>;
}

function Field({ label, children, hint, half }: { label:string; children:React.ReactNode; hint?:string; half?:boolean }) {
  return (
    <label style={{ display:"block", marginTop:12, ...(half?{flex:1,minWidth:0}:{}) }}>
      <span style={{ display:"block", fontSize:12.5, fontWeight:700, color:BODY, marginBottom:6 }}>
        {label}{hint && <span style={{ fontWeight:500, color:MUTE, fontSize:11.5 }}> · {hint}</span>}
      </span>
      {children}
    </label>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  biz:         Party;
  client:      Party;
  invNo:       string;
  date:        string;
  items:       LineItem[];
  discType:    DiscType;
  discVal:     string;
  taxPct:      string;
  notes:       string;
  warranty:    string;
  advance:     string;
  payMethod:   PayMethod;
  advancePaid: number;
  balanceDue:  number;
  total:       number;
  stockItems:  StockItem[];
  stockCats:   string[];
  catFilter:   string;
  customers:   CustomerLite[];
  dbCustomers: CustomerLite[];
  bizSaved:    boolean;

  onBizChange:        (biz: Party) => void;
  onClientChange:     (client: Party) => void;
  onInvNoChange:      (v: string) => void;
  onDateChange:       (v: string) => void;
  onItemsChange:      (items: LineItem[]) => void;
  onDiscTypeChange:   (v: DiscType) => void;
  onDiscValChange:    (v: string) => void;
  onTaxPctChange:     (v: string) => void;
  onNotesChange:      (v: string) => void;
  onWarrantyChange:   (v: string) => void;
  onAdvanceChange:    (v: string) => void;
  onPayMethodChange:  (v: PayMethod) => void;
  onCatFilterChange?: (v: string) => void;
  onSaveBiz:          () => void;
}

const CUSTOM = "__custom__";

export default function BillingForm(p: Props) {
  const [nameSugOpen, setNameSugOpen] = useState(false);
  const [activeSug,   setActiveSug]   = useState(-1);

  // Per-row chosen category (rowId → category name, or CUSTOM)
  const [rowCat, setRowCat] = useState<Record<string,string>>({});

  // Customer suggestions
  const nameQuery = p.client.name.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!nameQuery) return [];
    const seen = new Set<string>();
    const all = [...p.dbCustomers, ...p.customers].filter(c => {
      const k = (c.phone||c.name).toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true;
    });
    return all.filter(c =>
      c.name.toLowerCase().includes(nameQuery) ||
      c.phone.toLowerCase().includes(nameQuery) ||
      c.email.toLowerCase().includes(nameQuery)
    ).slice(0,6);
  },[p.customers, p.dbCustomers, nameQuery]);

  const pickCustomer = (c: CustomerLite) => {
    p.onClientChange({...p.client, name:c.name, phone:c.phone, email:c.email, gstin:c.gstin, address:c.address});
    setNameSugOpen(false); setActiveSug(-1);
  };

  // ── Item helpers ────────────────────────────────────────────────────────────
  const stockById = useMemo(() => {
    const m = new Map<string, StockItem>();
    for (const s of p.stockItems) m.set(s.id, s);
    return m;
  }, [p.stockItems]);

  // Category for a row: explicit choice, else derived from the linked stock item
  const catOf = (it: LineItem) => {
    if (rowCat[it.id] !== undefined) return rowCat[it.id];
    if (it.itemId) return stockById.get(it.itemId)?.category || "";
    return "";
  };

  const itemsInCat = (cat: string) =>
    !cat || cat === CUSTOM ? [] : p.stockItems.filter(s => (s.category || "") === cat);

  const setItem = (id:string, patch: Partial<LineItem>) =>
    p.onItemsChange(p.items.map(it => it.id===id ? {...it, ...patch} : it));

  // Category changed → clear the linked item on that row
  const pickCat = (rowId: string, cat: string) => {
    setRowCat(m => ({ ...m, [rowId]: cat }));
    setItem(rowId, { itemId: undefined, unit: undefined, desc: "", rate: "" });
  };

  // Item chosen → fill description, rate (sell price) and unit
  const pickStock = (rowId: string, stockId: string) => {
    if (!stockId) { setItem(rowId, { itemId: undefined, unit: undefined, desc: "", rate: "" }); return; }
    const s = stockById.get(stockId);
    if (!s) return;
    const price = dec(s.sellPrice) > 0 ? dec(s.sellPrice) : dec(s.costPrice);
    setItem(rowId, { itemId: s.id, desc: s.name, rate: String(price || ""), unit: s.unit });
  };

  const addItem = () => p.onItemsChange([...p.items, {id:uid(),desc:"",qty:"1",rate:""}]);
  const removeItem = (id:string) => {
    if (p.items.length === 1) return;
    p.onItemsChange(p.items.filter(it=>it.id!==id));
    setRowCat(m => { const n = {...m}; delete n[id]; return n; });
  };

  const inp = {
    width:"100%", boxSizing:"border-box" as const, padding:"10px 12px",
    border:"1px solid #e6dcd2", borderRadius:0, fontSize:14,
    fontFamily:SANS, background:CARD, color:INK, colorScheme:"light" as const,
  };
  const inpSm  = {...inp, padding:"9px 8px", fontSize:13};
  const inpNum = {...inp, textAlign:"right" as const, fontVariantNumeric:"tabular-nums" as const};
  const card   = { background:GLOW, border:`1px solid ${LINE}`, boxShadow:GLOW_SHADOW, padding:"20px 22px" };
  const GRID   = "minmax(0,0.85fr) minmax(0,1.35fr) 64px 92px 88px 28px";

  return (
    <div style={{ minWidth:0 }}>
      {/* ── Business ──────────────────────────────────────────────────────── */}
      <section style={card}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
          <h2 style={{ fontSize:16, fontWeight:800, margin:"0 0 12px", color:INK }}>Your business</h2>
          <button className="bl-link" style={{ border:"none", background:"transparent", color:MUTE, fontFamily:SANS, fontWeight:700, fontSize:12.5, cursor:"pointer", padding:0 }}
            onClick={p.onSaveBiz}>{p.bizSaved?"Saved ✓":"Save as default"}</button>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <Field label="Business name" half><input className="bl-in" style={inp} value={p.biz.name} onChange={e=>p.onBizChange({...p.biz,name:e.target.value})}/></Field>
          <Field label="Phone" half><input className="bl-in" style={inp} value={p.biz.phone} onChange={e=>p.onBizChange({...p.biz,phone:e.target.value})}/></Field>
        </div>
        <Field label="Address" hint="Enter for new line"><textarea className="bl-in" style={{...inp,minHeight:58,resize:"vertical"}} rows={2} value={p.biz.address} onChange={e=>p.onBizChange({...p.biz,address:e.target.value})}/></Field>
        <Field label="Email"><input className="bl-in" style={inp} value={p.biz.email} onChange={e=>p.onBizChange({...p.biz,email:e.target.value})}/></Field>
        <div style={{ display:"flex", gap:12 }}>
          <Field label="GSTIN" half><input className="bl-in" style={inp} value={p.biz.gstin} onChange={e=>p.onBizChange({...p.biz,gstin:e.target.value.toUpperCase()})}/></Field>
          <Field label="PAN" half><input className="bl-in" style={inp} value={p.biz.pan} onChange={e=>p.onBizChange({...p.biz,pan:e.target.value.toUpperCase()})}/></Field>
        </div>
      </section>

      {/* ── Invoice details ───────────────────────────────────────────────── */}
      <section style={{ ...card, marginTop:16 }}>
        <h2 style={{ fontSize:16, fontWeight:800, margin:"0 0 12px", color:INK }}>Invoice details</h2>
        <div style={{ display:"flex", gap:12 }}>
          <Field label="Invoice no." half><input className="bl-in" style={inp} value={p.invNo} onChange={e=>p.onInvNoChange(e.target.value)}/></Field>
          <Field label="Date" half><input className="bl-in" style={inp} type="date" value={p.date} onChange={e=>p.onDateChange(e.target.value)}/></Field>
        </div>

        <div style={{ fontSize:11, fontWeight:700, letterSpacing:.8, textTransform:"uppercase" as const, color:MUTE, marginTop:20 }}>Bill to</div>

        {/* Client name with autocomplete */}
        <div style={{ position:"relative", marginTop:12 }}>
          <span style={{ display:"block", fontSize:12.5, fontWeight:700, color:BODY, marginBottom:6 }}>
            Client name <span style={{ fontWeight:500, color:MUTE, fontSize:11.5 }}> · type to search saved customers</span>
          </span>
          <input className="bl-in" style={inp} value={p.client.name} placeholder="Customer name" autoComplete="off"
            onChange={e=>{p.onClientChange({...p.client,name:e.target.value}); setNameSugOpen(true); setActiveSug(-1);}}
            onFocus={()=>{ if(p.client.name.trim()) setNameSugOpen(true); }}
            onBlur={()=>setTimeout(()=>setNameSugOpen(false),120)}
            onKeyDown={e=>{
              if(!nameSugOpen||!suggestions.length) return;
              if(e.key==="ArrowDown"){e.preventDefault();setActiveSug(i=>Math.min(i+1,suggestions.length-1));}
              else if(e.key==="ArrowUp"){e.preventDefault();setActiveSug(i=>Math.max(i-1,0));}
              else if(e.key==="Enter"&&activeSug>=0){e.preventDefault();pickCustomer(suggestions[activeSug]);}
              else if(e.key==="Escape") setNameSugOpen(false);
            }}/>
          {nameSugOpen && suggestions.length>0 && (
            <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:60, marginTop:4, background:CARD, border:`1px solid ${LINE}`, boxShadow:"0 16px 38px -14px rgba(24,22,28,.30)", maxHeight:240, overflowY:"auto" }}>
              {suggestions.map((c,i) => (
                <button key={(c.phone||c.name)+i} type="button" className="bl-sug"
                  style={{ display:"flex", alignItems:"baseline", gap:10, width:"100%", textAlign:"left", padding:"9px 12px", border:"none", background:i===activeSug?"#fffcf9":"transparent", cursor:"pointer", fontFamily:SANS, borderBottom:`1px solid #f4f1ec` }}
                  onMouseDown={e=>{e.preventDefault();pickCustomer(c);}}>
                  <span style={{ fontWeight:700, color:INK, fontSize:13.5 }}>{c.name||"—"}</span>
                  <span style={{ fontSize:12, color:MUTE, marginLeft:"auto" }}>{c.phone||c.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:12 }}>
          <Field label="Phone" half><input className="bl-in" style={inp} value={p.client.phone} onChange={e=>p.onClientChange({...p.client,phone:e.target.value})}/></Field>
          <Field label="Email" half><input className="bl-in" style={inp} value={p.client.email} onChange={e=>p.onClientChange({...p.client,email:e.target.value})}/></Field>
        </div>
        <Field label="Address" hint="Enter for new line"><textarea className="bl-in" style={{...inp,minHeight:58,resize:"vertical"}} rows={2} value={p.client.address} onChange={e=>p.onClientChange({...p.client,address:e.target.value})}/></Field>
        <Field label="GSTIN (optional)"><input className="bl-in" style={inp} value={p.client.gstin} onChange={e=>p.onClientChange({...p.client,gstin:e.target.value.toUpperCase()})}/></Field>
      </section>

      {/* ── Items ─────────────────────────────────────────────────────────── */}
      <section style={{ ...card, marginTop:16 }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:14 }}>
          <h2 style={{ fontSize:16, fontWeight:800, margin:0, color:INK }}>Items</h2>
          <span style={{ fontSize:11.5, color:MUTE }}>Pick a category, then the item — or choose Custom</span>
        </div>

        {/* Column headers */}
        <div style={{ display:"grid", gridTemplateColumns:GRID, gap:8, alignItems:"center", fontSize:10.5, fontWeight:700, color:MUTE, letterSpacing:.7, textTransform:"uppercase" as const, padding:"0 2px 8px" }}>
          <span>Category</span><span>Item</span><span style={{textAlign:"right"}}>Qty</span><span style={{textAlign:"right"}}>Rate (₹)</span><span style={{textAlign:"right"}}>Amount</span><span/>
        </div>

        {p.items.map(it => {
          const cat      = catOf(it);
          const isCustom = cat === CUSTOM;
          const opts     = itemsInCat(cat);
          const linked   = it.itemId ? stockById.get(it.itemId) : undefined;
          const avail    = linked ? dec(linked.quantity) : 0;
          const after    = avail - num(it.qty);

          return (
            <div key={it.id} style={{ marginBottom:10 }}>
              <div style={{ display:"grid", gridTemplateColumns:GRID, gap:8, alignItems:"center" }}>

                {/* 1 — Category */}
                <select className="bl-in" style={inpSm} value={cat} onChange={e=>pickCat(it.id, e.target.value)}>
                  <option value="">Category…</option>
                  {p.stockCats.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value={CUSTOM}>✏️ Custom</option>
                </select>

                {/* 2 — Item (dropdown) or free text (custom) */}
                {isCustom ? (
                  <input className="bl-in" style={inp} placeholder="Service / product" value={it.desc}
                    onChange={e=>setItem(it.id,{desc:e.target.value})}/>
                ) : (
                  <select className="bl-in" style={{...inpSm, color: it.itemId?INK:MUTE}}
                    value={it.itemId||""} disabled={!cat}
                    onChange={e=>pickStock(it.id, e.target.value)}>
                    <option value="">{cat ? (opts.length ? "Select item…" : "No items in this category") : "Pick a category first"}</option>
                    {opts.map(s => (
                      <option key={s.id} value={s.id}>{s.name} — {dec(s.quantity)} {s.unit}</option>
                    ))}
                  </select>
                )}

                <input className="bl-in" style={{...inpNum,width:"100%"}} type="number" min="0" value={it.qty}
                  onChange={e=>setItem(it.id,{qty:e.target.value})}/>
                <input className="bl-in" style={{...inpNum,width:"100%"}} type="number" min="0" placeholder="0" value={it.rate}
                  onChange={e=>setItem(it.id,{rate:e.target.value})}/>
                <span style={{ textAlign:"right", fontSize:13, fontWeight:800, color:INK, fontVariantNumeric:"tabular-nums" }}>
                  {rupee(num(it.qty)*num(it.rate))}
                </span>
                <button className="bl-del" style={{ width:28,height:28,display:"grid",placeItems:"center",borderRadius:0,border:"none",background:"transparent",color:FAINT,cursor:"pointer" }}
                  onClick={()=>removeItem(it.id)} disabled={p.items.length===1} aria-label="Remove item">
                  <Icon name="trash" size={15}/>
                </button>
              </div>

              {/* Stock hint for a linked item */}
              {linked && (
                <div style={{ gridColumn:"1 / -1", fontSize:11, marginTop:4, paddingLeft:2,
                  color: after < 0 ? TERRA : MUTE }}>
                  {after < 0
                    ? `⚠️ Only ${avail} ${linked.unit} in stock — this will go ${Math.abs(after)} below zero`
                    : `${avail} ${linked.unit} available${dec(linked.sellPrice)>0?` · sell ${rupee(dec(linked.sellPrice))}/${linked.unit}`:""}`}
                </div>
              )}
            </div>
          );
        })}

        <button className="bl-add" style={{ display:"inline-flex",alignItems:"center",gap:7,marginTop:4,padding:"9px 15px",borderRadius:0,border:"1px dashed #ddd0c4",background:"transparent",color:"#545a67",fontFamily:SANS,fontWeight:700,fontSize:13,cursor:"pointer" }}
          onClick={addItem}><Icon name="plus" size={15}/> Add item</button>

        <div style={{ height:1, background:"#f2e8de", margin:"18px 0 4px" }}/>

        {/* Discount + GST */}
        <div style={{ display:"flex", gap:12 }}>
          <Field label="Discount" half>
            <div style={{ display:"flex", gap:8 }}>
              <select className="bl-in" style={{...inp,width:70,flex:"none"}} value={p.discType} onChange={e=>p.onDiscTypeChange(e.target.value as DiscType)}>
                <option value="amount">₹</option><option value="percent">%</option>
              </select>
              <input className="bl-in" style={inp} type="number" min="0" value={p.discVal} onChange={e=>p.onDiscValChange(e.target.value)}/>
            </div>
          </Field>
          <Field label="GST %" half>
            <input className="bl-in" style={inp} type="number" min="0" value={p.taxPct} onChange={e=>p.onTaxPctChange(e.target.value)}/>
          </Field>
        </div>

        {/* Payment method */}
        <Field label="Payment method" hint="how they paid">
          <div style={{ display:"inline-flex", border:`1px solid ${LINE}`, background:CARD }}>
            {(["cash","online"] as PayMethod[]).map((m,i) => (
              <button key={m} type="button" className="bl-seg"
                style={{ padding:"10px 18px", border:"none", borderLeft:i>0?`1px solid ${LINE}`:"none", background:p.payMethod===m?TERRA:CARD, color:p.payMethod===m?"#fff":"#545a67", fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 }}
                onClick={()=>p.onPayMethodChange(m)}>
                <Icon name={m==="cash"?"banknote":"card"} size={14}/> {m==="cash"?"Cash":"Online"}
              </button>
            ))}
          </div>
        </Field>

        {/* Advance + balance */}
        <div style={{ display:"flex", gap:12 }}>
          <Field label="Advance received (₹)" hint="Optional — paid now" half>
            <input className="bl-in" style={inp} type="number" min="0" value={p.advance} placeholder="0" onChange={e=>p.onAdvanceChange(e.target.value)}/>
          </Field>
          <Field label="Balance due" half>
            <div style={{ width:"100%", boxSizing:"border-box" as const, padding:"10px 12px", border:`1px solid ${LINE}`, fontSize:14, fontWeight:800, fontFamily:SANS, background:"#fbf7f3", color:p.balanceDue>0?INK:GREEN, fontVariantNumeric:"tabular-nums" as const, display:"flex", alignItems:"center", minHeight:40 }}>
              {p.advancePaid>0&&p.balanceDue===0 ? "Paid in full" : rupee(p.balanceDue)}
            </div>
          </Field>
        </div>

        <Field label="Notes / terms">
          <textarea className="bl-in" style={{...inp,minHeight:62,resize:"vertical"}} value={p.notes} onChange={e=>p.onNotesChange(e.target.value)}/>
        </Field>
        <Field label="Warranty details">
          <textarea className="bl-in" style={{...inp,minHeight:56,resize:"vertical"}} value={p.warranty} placeholder="e.g. 6 months warranty on LED & signage boards" onChange={e=>p.onWarrantyChange(e.target.value)}/>
        </Field>
      </section>

      <style>{`
        .bl-in:focus{border-color:${TERRA}!important;box-shadow:0 0 0 3px ${TERRA}22!important;outline:none}
        .bl-in[type="number"]{-moz-appearance:textfield;appearance:textfield}
        .bl-in[type="number"]::-webkit-outer-spin-button,.bl-in[type="number"]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        .bl-in:disabled{background:#faf7f3;color:${MUTE};cursor:not-allowed}
        .bl-add:hover{border-color:${TERRA}66;color:${TERRA};background:#fffcf9}
        .bl-del:hover:not(:disabled){color:${TERRA};background:#fdecea}
        .bl-del:disabled{opacity:.35;cursor:not-allowed}
        .bl-sug:hover{background:#fffcf9!important}
        .bl-seg{transition:all .2s}
        .bl-link:hover{color:${TERRA}!important}
      `}</style>
    </div>
  );
}