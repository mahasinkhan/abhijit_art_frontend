// src/components/invoices/EditModal.tsx
import { useMemo, useState } from "react";
import api from "../../api";
import {
  Invoice, EditForm, EditItem, InvSource, SOURCE_META,
  INK, MUTE, FAINT, TERRA, GREEN, LINE, SANS,
  num, round2, rupee as makeRupee, toDateInput, calcTotals, effectivePaid,
  sharedSt, errMessage, REQ_TIMEOUT,
} from "./types";
import Icon from "./Icon";
import SuccessPanel from "./SuccessPanel";

const rupee = makeRupee;

interface Props {
  inv:      Invoice;
  onClose:  () => void;
  onUpdate: (updated: Invoice) => void;
}

export default function EditModal({ inv, onClose, onUpdate }: Props) {
  const [form, setForm] = useState<EditForm>({
    date: toDateInput(inv.date), clientName:inv.clientName||"", clientPhone:inv.clientPhone||"",
    clientEmail:inv.clientEmail||"", clientGstin:inv.clientGstin||"", clientAddr:inv.clientAddr||"",
    source: inv.source==="online"?"online":"offline",
    items: (Array.isArray(inv.items)&&inv.items.length?inv.items:[{desc:"",qty:1,rate:0}]).map(it=>({desc:it.desc||"",qty:String(it.qty??""),rate:String(it.rate??"")})),
    discType: inv.discType==="percent"?"percent":"amount", discVal:String(num(inv.discVal)||""),
    taxPct: String(num(inv.taxPct)||""), notes:inv.notes||"", warranty:inv.warranty||"",
  });
  const [pin,    setPin]    = useState("");
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");
  const [done,   setDone]   = useState(false);

  const patch  = (p: Partial<EditForm>) => setForm(f => ({ ...f, ...p }));
  const setItem = (idx: number, field: keyof EditItem, val: string) =>
    setForm(f => ({ ...f, items: f.items.map((it,i) => i===idx ? {...it,[field]:val} : it) }));
  const addItem    = () => setForm(f => ({ ...f, items:[...f.items,{desc:"",qty:"1",rate:""}] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, items:f.items.length>1?f.items.filter((_,i)=>i!==idx):f.items }));

  const calc        = useMemo(() => calcTotals(form.items, form.discType, form.discVal, form.taxPct), [form]);
  const itemsValid  = form.items.some(it => it.desc.trim() || num(it.rate)>0);
  const prevPaid    = effectivePaid(inv);
  const paidClamped = round2(Math.min(prevPaid, calc.total));
  const balance     = round2(Math.max(calc.total - paidClamped, 0));

  const save = async () => {
    const cleanItems = form.items.filter(it => it.desc.trim() || num(it.rate)>0);
    if (!cleanItems.length) { setErr("Add at least one line item."); return; }
    setSaving(true); setErr("");
    try {
      const res = await api.patch(`/api/invoices/${inv.id}/edit`, {
        date:form.date||undefined,
        client:{ name:form.clientName, phone:form.clientPhone, email:form.clientEmail, gstin:form.clientGstin, address:form.clientAddr },
        items:cleanItems.map(it=>({desc:it.desc,qty:num(it.qty),rate:num(it.rate)})),
        discType:form.discType, discVal:num(form.discVal), taxPct:num(form.taxPct),
        notes:form.notes, warranty:form.warranty, source:form.source, pin:pin.trim(),
      }, { timeout:REQ_TIMEOUT });
      onUpdate({ ...inv, ...res.data }); setDone(true); setTimeout(onClose, 1500);
    } catch(e:any) { setErr(errMessage(e,"Couldn't save the changes.")); }
    finally { setSaving(false); }
  };

  return (
    <div style={sharedSt.backdrop} onClick={() => !saving && !done && onClose()}>
      <div data-modal-scroll className="ivh-modal" style={sharedSt.editModal} onClick={e=>e.stopPropagation()}>
        {done ? <SuccessPanel title="Changes saved" detail={`${inv.invoiceNo} · now ${rupee(calc.total)}`} tone={GREEN}/> : (
          <>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
              <div>
                <h3 style={sharedSt.modalTitle}>Edit invoice · {inv.invoiceNo}</h3>
                <p style={{ fontSize:12.5, color:MUTE, margin:"0 0 2px", lineHeight:1.5 }}>Invoice number and your business details stay the same.</p>
              </div>
              <button className="ivh-icon" style={sharedSt.iconBtn} onClick={onClose}><Icon name="x" size={18}/></button>
            </div>

            {/* Date + source */}
            <div style={st.grid2}>
              <label style={{ display:"block", minWidth:0 }}>
                <span style={sharedSt.fieldLabel}>Invoice date</span>
                <input className="ivh-in" style={sharedSt.editInput} type="date" value={form.date} onChange={e=>patch({date:e.target.value})}/>
              </label>
              <div style={{ display:"block", minWidth:0 }}>
                <span style={sharedSt.fieldLabel}>Customer type</span>
                <div style={sharedSt.segWrap}>
                  {(["online","offline"] as InvSource[]).map((s,idx) => (
                    <button key={s} type="button" className={`ivh-seg${form.source===s?" on":""}`}
                      style={{ ...sharedSt.segBtn, ...(idx===1?{borderLeft:`1px solid ${LINE}`}:null), ...(form.source===s?sharedSt.segBtnOn:null) }}
                      onClick={() => patch({source:s})}>
                      {SOURCE_META[s].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bill to */}
            <div style={st.sectionTitle}>Bill to</div>
            <div style={st.grid2}>
              {(["clientName","clientPhone","clientEmail","clientGstin"] as const).map(k => (
                <label key={k} style={{ display:"block", minWidth:0 }}>
                  <span style={sharedSt.fieldLabel}>{k==="clientName"?"Name":k==="clientPhone"?"Phone":k==="clientEmail"?"Email":"GSTIN"}</span>
                  <input className="ivh-in" style={sharedSt.editInput} value={(form as any)[k]} onChange={e=>patch({[k]:e.target.value} as any)}/>
                </label>
              ))}
            </div>
            <label style={{ display:"block", marginTop:10 }}>
              <span style={sharedSt.fieldLabel}>Address</span>
              <textarea className="ivh-in" style={{ ...sharedSt.editInput as any, minHeight:62, resize:"vertical", lineHeight:1.5 }} value={form.clientAddr} onChange={e=>patch({clientAddr:e.target.value})} rows={2}/>
            </label>

            {/* Items */}
            <div style={st.sectionTitle}>Items</div>
            <div style={st.linesHead}><span>Description</span><span style={{ textAlign:"right" }}>Qty</span><span style={{ textAlign:"right" }}>Rate</span><span style={{ textAlign:"right" }}>Amount</span><span/></div>
            {form.items.map((it,idx) => (
              <div key={idx} style={st.lineRow}>
                <input className="ivh-in" style={sharedSt.editInput} value={it.desc} onChange={e=>setItem(idx,"desc",e.target.value)} placeholder={`Item ${idx+1}`}/>
                <input className="ivh-in" style={st.numIn} type="number" min="0" value={it.qty}  onChange={e=>setItem(idx,"qty",e.target.value)}/>
                <input className="ivh-in" style={st.numIn} type="number" min="0" value={it.rate} onChange={e=>setItem(idx,"rate",e.target.value)}/>
                <div style={st.lineAmt}>{rupee(num(it.qty)*num(it.rate))}</div>
                <button type="button" className="ivh-icon ivh-danger" style={{ ...sharedSt.iconBtn, width:28, height:28 }} onClick={()=>removeItem(idx)} disabled={form.items.length<=1}><Icon name="x" size={15}/></button>
              </div>
            ))}
            <button type="button" className="ivh-addline" style={st.addLine} onClick={addItem}><Icon name="plus" size={14}/> Add line</button>

            {/* Discount + GST */}
            <div style={{ ...st.grid2, marginTop:16 }}>
              <div style={{ display:"block", minWidth:0 }}>
                <span style={sharedSt.fieldLabel}>Discount</span>
                <div style={{ display:"flex", gap:8 }}>
                  <select className="ivh-datesel" style={st.discSel} value={form.discType} onChange={e=>patch({discType:e.target.value as any})}><option value="amount">₹</option><option value="percent">%</option></select>
                  <input className="ivh-in" style={{ ...st.numIn, flex:1 }} type="number" min="0" value={form.discVal} onChange={e=>patch({discVal:e.target.value})}/>
                </div>
              </div>
              <label style={{ display:"block", minWidth:0 }}>
                <span style={sharedSt.fieldLabel}>GST %</span>
                <input className="ivh-in" style={st.numIn} type="number" min="0" value={form.taxPct} onChange={e=>patch({taxPct:e.target.value})}/>
              </label>
            </div>

            {/* Notes + Warranty */}
            <div style={{ ...st.grid2, marginTop:10 }}>
              <label style={{ display:"block" }}><span style={sharedSt.fieldLabel}>Notes</span><textarea className="ivh-in" style={{ ...sharedSt.editInput as any, minHeight:62, resize:"vertical", lineHeight:1.5 }} value={form.notes} onChange={e=>patch({notes:e.target.value})} rows={2}/></label>
              <label style={{ display:"block" }}><span style={sharedSt.fieldLabel}>Warranty</span><textarea className="ivh-in" style={{ ...sharedSt.editInput as any, minHeight:62, resize:"vertical", lineHeight:1.5 }} value={form.warranty} onChange={e=>patch({warranty:e.target.value})} rows={2}/></label>
            </div>

            {/* Totals */}
            <div style={st.totals}>
              {[{l:"Subtotal",v:rupee(calc.subtotal)},{...(calc.discountAmt>0?{l:"Discount",v:`− ${rupee(calc.discountAmt)}`}:{})},{...(calc.taxAmt>0?{l:`GST (${num(form.taxPct)}%)`,v:rupee(calc.taxAmt)}:{})}].filter(r=>r.l).map(r=>(
                <div key={r.l} style={st.totRow}><span style={{ color:MUTE, fontWeight:600 }}>{r.l}</span><span style={{ fontWeight:700, color:INK, fontVariantNumeric:"tabular-nums" }}>{r.v}</span></div>
              ))}
              <div style={{ ...st.totRow, padding:"10px 0 2px", marginTop:4, borderTop:`1px solid ${LINE}`, fontSize:16 }}><span style={{ fontWeight:800, color:INK }}>Total</span><span style={{ fontWeight:800, color:TERRA, fontVariantNumeric:"tabular-nums" }}>{rupee(calc.total)}</span></div>
              {paidClamped>0.005&&<><div style={{ ...st.totRow, paddingTop:8 }}><span style={{ color:MUTE, fontWeight:600 }}>Already received</span><span style={{ fontWeight:700, color:GREEN, fontVariantNumeric:"tabular-nums" }}>− {rupee(paidClamped)}</span></div><div style={st.totRow}><span style={{ fontWeight:700, color:INK }}>Balance due</span><span style={{ fontWeight:700, color:balance>0?TERRA:GREEN, fontVariantNumeric:"tabular-nums" }}>{balance>0?rupee(balance):"Settled"}</span></div></>}
            </div>

            {/* PIN */}
            <label style={{ display:"block", marginTop:16 }}>
              <span style={sharedSt.fieldLabel}><span style={{ display:"inline-flex", verticalAlign:"-2px", marginRight:5, color:MUTE }}><Icon name="lock" size={13}/></span>Security PIN · required to save changes</span>
              <input className="ivh-in" style={sharedSt.pinInput} type="password" value={pin} name="aa-edit-pin" autoComplete="one-time-code" inputMode="numeric" data-1p-ignore data-lpignore="true" data-form-type="other" onChange={e=>setPin(e.target.value)} placeholder="••••••" onKeyDown={e=>{ if(e.key==="Enter"&&pin.trim()&&itemsValid&&!saving) save(); }}/>
            </label>
            {err && <div style={{ ...sharedSt.errBanner, marginTop:14, marginBottom:0 }}>{err}</div>}

            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:22, flexWrap:"wrap" }}>
              <button className="ivh-ghost" style={sharedSt.ghostBtn} onClick={onClose} disabled={saving}>Cancel</button>
              <button className="ivh-save"  style={sharedSt.saveBtn}  onClick={save}   disabled={saving||!pin.trim()||!itemsValid}>{saving?<span className="ivh-spin" style={sharedSt.spin}/>:"Save changes"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  grid2:      { display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:12, marginTop:4 },
  sectionTitle:{ fontSize:11, fontWeight:800, letterSpacing:0.8, textTransform:"uppercase", color:FAINT, margin:"20px 0 8px" },
  linesHead:  { display:"grid", gridTemplateColumns:"1fr 62px 92px 96px 30px", gap:8, padding:"0 2px 6px", fontSize:10.5, fontWeight:700, letterSpacing:0.4, textTransform:"uppercase", color:FAINT },
  lineRow:    { display:"grid", gridTemplateColumns:"1fr 62px 92px 96px 30px", gap:8, alignItems:"center", marginBottom:8 },
  numIn:      { width:"100%", boxSizing:"border-box" as const, padding:"9px 8px", border:"1px solid #e6dcd2", borderRadius:0, fontSize:14, fontFamily:SANS, background:"#fff", color:INK, colorScheme:"light" as const, textAlign:"right" as const, fontVariantNumeric:"tabular-nums" as const },
  lineAmt:    { display:"flex", alignItems:"center", justifyContent:"flex-end", fontSize:13.5, fontWeight:700, color:INK, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap", overflow:"hidden" },
  addLine:    { display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px", border:"1px dashed #d9cdbf", borderRadius:0, background:"transparent", color:"#545a67", fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", marginTop:2 },
  discSel:    { width:74, padding:"9px 10px", border:"1px solid #f0e6dc", borderRadius:0, background:"#fff", color:"#545a67", fontFamily:SANS, fontWeight:700, fontSize:14, cursor:"pointer", colorScheme:"light" as const },
  totals:     { marginTop:18, padding:"14px 16px", background:"#fbf7f3", border:"1px solid #f0e6dc" },
  totRow:     { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0", fontSize:13.5 },
};