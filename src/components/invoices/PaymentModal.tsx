// src/components/invoices/PaymentModal.tsx
import { useState } from "react";
import api from "../../api";
import {
  Invoice, InvMethod, METHOD_META, INK, MUTE, FAINT, TERRA, GREEN, LINE, SANS,
  num, round2, rupee as makeRupee, fmt, fmtTime, effectivePaid, deriveStatus, badgeStyle,
  STATUS_META, sharedSt, errMessage, REQ_TIMEOUT,
} from "./types";
import Icon from "./Icon";
import SuccessPanel from "./SuccessPanel";

const rupee = makeRupee;

interface Props {
  inv:      Invoice;
  onClose:  () => void;
  onUpdate: (updated: Invoice) => void;
}

export default function PaymentModal({ inv, onClose, onUpdate }: Props) {
  const [payMethod,   setPayMethod]   = useState<InvMethod>("cash");
  const [addAmount,   setAddAmount]   = useState("0");
  const [pin,         setPin]         = useState("");
  const [saving,      setSaving]      = useState(false);
  const [savedAnim,   setSavedAnim]   = useState(false);
  const [err,         setErr]         = useState("");
  const [flash,       setFlash]       = useState<string|null>(null);
  const [confirmDel,  setConfirmDel]  = useState<string|null>(null);
  const [deletingId,  setDeletingId]  = useState<string|null>(null);
  const [done,        setDone]        = useState<{title:string;detail?:string;tone:string}|null>(null);

  const payList     = Array.isArray(inv.payments) ? inv.payments : [];
  const payTotal    = num(inv.total);
  const payPrev     = round2(payList.reduce((s,p) => s+num(p.amount), 0));
  const balanceNow  = round2(Math.max(payTotal - payPrev, 0));
  const payAdd      = round2(Math.max(num(addAmount), 0));
  const newPaid     = round2(Math.min(payPrev + payAdd, payTotal));
  const newBalance  = round2(Math.max(payTotal - newPaid, 0));
  const preview     = deriveStatus(newPaid, payTotal);
  const fullyPaid   = balanceNow <= 0.005;

  const save = async () => {
    const amt = round2(Math.max(num(addAmount), 0));
    if (amt <= 0) { setErr("Enter a payment amount greater than zero."); return; }
    setSaving(true); setErr("");
    try {
      const res = await api.post(`/api/invoices/${inv.id}/payments`, { amount:amt, method:payMethod, pin:pin.trim() }, { timeout:REQ_TIMEOUT });
      onUpdate({ ...inv, ...res.data });
      setAddAmount("0"); setFlash(null); setSavedAnim(true);
      setTimeout(() => setSavedAnim(false), 1600);
    } catch(e:any) { setErr(errMessage(e,"Couldn't record the payment.")); }
    finally { setSaving(false); }
  };

  const deletePay = async (payId: string) => {
    if (!pin.trim()) return;
    setDeletingId(payId); setErr("");
    try {
      const res = await api.delete(`/api/invoices/${inv.id}/payments/${payId}`, { data:{ pin:pin.trim() }, timeout:REQ_TIMEOUT });
      onUpdate({ ...inv, ...res.data });
      setConfirmDel(null); setFlash("Payment removed.");
      setTimeout(() => setFlash(null), 3000);
    } catch(e:any) { setErr(errMessage(e,"Couldn't remove the payment.")); }
    finally { setDeletingId(null); }
  };

  const cancelInv = async () => {
    setSaving(true); setErr("");
    try {
      const res = await api.patch(`/api/invoices/${inv.id}/status`, { status:"cancelled", pin:pin.trim() }, { timeout:REQ_TIMEOUT });
      onUpdate({ ...inv, ...res.data });
      setDone({ title:"Invoice cancelled", detail:inv.invoiceNo, tone:"#6b7280" });
      setTimeout(onClose, 1700);
    } catch(e:any) { setErr(errMessage(e,"Couldn't cancel the invoice.")); }
    finally { setSaving(false); }
  };

  return (
    <div style={sharedSt.backdrop} onClick={() => !saving && !done && !savedAnim && onClose()}>
      <div data-modal-scroll className="ivh-modal" style={{ ...sharedSt.editModal, maxWidth:620 }} onClick={e=>e.stopPropagation()}>
        {done ? <SuccessPanel title={done.title} detail={done.detail} tone={done.tone}/>
        : savedAnim ? <SuccessPanel title={fullyPaid?"Paid in full":"Payment saved"} detail={fullyPaid?`${inv.invoiceNo} · settled`:`${inv.invoiceNo} · balance ${rupee(balanceNow)}`} tone={GREEN}/>
        : (
          <>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:4 }}>
              <div><h3 style={sharedSt.modalTitle}>Payments · {inv.invoiceNo}</h3><p style={{ fontSize:12.5, color:MUTE, margin:"0 0 2px", fontWeight:600 }}>{inv.clientName||"—"}</p></div>
              <button className="ivh-icon" style={sharedSt.iconBtn} onClick={onClose}><Icon name="x" size={18}/></button>
            </div>

            {/* Summary strip */}
            <div style={st.summary}>
              <div><div style={st.sumLbl}>Total</div><div style={{ fontSize:16, fontWeight:800, color:INK, marginTop:3, fontVariantNumeric:"tabular-nums" }}>{rupee(payTotal)}</div></div>
              <div style={{ textAlign:"center" }}><div style={st.sumLbl}>Received</div><div style={{ fontSize:16, fontWeight:800, color:GREEN, marginTop:3, fontVariantNumeric:"tabular-nums" }}>{rupee(payPrev)}</div></div>
              <div style={{ textAlign:"right" }}><div style={st.sumLbl}>Balance</div><div style={{ fontSize:16, fontWeight:800, color:balanceNow>0?TERRA:GREEN, marginTop:3, fontVariantNumeric:"tabular-nums" }}>{balanceNow>0?rupee(balanceNow):"Settled"}</div></div>
            </div>

            {/* History */}
            <div style={st.histWrap}>
              <div style={st.histHead}><span>Payment history</span><span style={{ color:MUTE, fontWeight:700 }}>{payList.length} {payList.length===1?"entry":"entries"}</span></div>
              {payList.length === 0
                ? <div style={{ padding:"16px 14px", textAlign:"center", color:MUTE, fontSize:12.5 }}>No payments recorded yet.</div>
                : <div data-modal-scroll style={{ maxHeight:120, overflowY:"auto", overscrollBehavior:"contain" }}>
                    {payList.map(p => {
                      const pm = METHOD_META[p.method==="online"?"online":"cash"];
                      const confirming = confirmDel === p.id;
                      const del = deletingId === p.id;
                      return (
                        <div key={p.id} style={st.histRow}>
                          <span style={{ color:MUTE, fontSize:12, minWidth:135, whiteSpace:"nowrap" }}>{fmt(p.createdAt)} · {fmtTime(p.createdAt)}</span>
                          <span style={{ ...st.methPill, color:pm.fg, background:pm.bg, borderColor:pm.bd }}><Icon name={pm.icon} size={11}/> {pm.label}</span>
                          {p.note && <span style={{ fontSize:11.5, color:MUTE, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:120 }}>{p.note}</span>}
                          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                            <span style={{ fontWeight:800, color:INK, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" }}>{rupee(num(p.amount))}</span>
                            {del ? <span className="ivh-spin" style={{ ...sharedSt.spin, width:15, height:15 }}/> : confirming
                              ? <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                                  <button style={st.histYes} onClick={() => deletePay(p.id)} disabled={!pin.trim()}>Remove</button>
                                  <button style={st.histNo}  onClick={() => setConfirmDel(null)}>Keep</button>
                                </span>
                              : <button className="ivh-icon ivh-danger" style={{ ...sharedSt.iconBtn, width:26, height:26 }} onClick={() => setConfirmDel(p.id)}><Icon name="x" size={14}/></button>
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
              }
            </div>

            {flash && <div style={{ marginBottom:12, padding:"9px 13px", background:"#e8f6ee", border:"1px solid #bfe3cd", color:"#15733f", fontSize:12.5, fontWeight:700 }}>{flash}</div>}

            {fullyPaid && inv.status!=="cancelled"
              ? <div style={{ marginTop:4, padding:"11px 14px", background:"#e8f6ee", border:"1px solid #bfe3cd", color:"#15733f", fontSize:12.5, fontWeight:600, lineHeight:1.5 }}>This bill is fully paid — nothing due.</div>
              : <>
                  <div style={{ marginTop:4 }}>
                    <span style={sharedSt.fieldLabel}>Payment method</span>
                    <div style={sharedSt.segWrap}>
                      {(["cash","online"] as InvMethod[]).map((mth,idx) => (
                        <button key={mth} type="button" className={`ivh-seg${payMethod===mth?" on":""}`}
                          style={{ ...sharedSt.segBtn, ...(idx===1?{borderLeft:`1px solid ${LINE}`}:null), ...(payMethod===mth?sharedSt.segBtnOn:null) }}
                          onClick={() => setPayMethod(mth)}>
                          <Icon name={METHOD_META[mth].icon} size={14}/> {METHOD_META[mth].label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label style={{ display:"block", marginTop:12 }}>
                    <span style={sharedSt.fieldLabel}>Add payment (₹)</span>
                    <input className="ivh-in" style={{ ...sharedSt.editInput, fontSize:16, fontWeight:700, fontVariantNumeric:"tabular-nums", padding:"9px 13px" }} type="number" min="0" value={addAmount} onChange={e=>setAddAmount(e.target.value)} placeholder="0" autoFocus/>
                  </label>
                  <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                    <button className="ivh-chip" style={st.chip} onClick={() => setAddAmount(String(balanceNow))} disabled={balanceNow<=0}>Full balance · {rupee(balanceNow)}</button>
                    <button className="ivh-chip" style={st.chip} onClick={() => setAddAmount("0")}>Clear</button>
                  </div>
                  {payAdd > 0 && <div style={st.preview}>After this: received <b style={{ color:INK }}>{rupee(newPaid)}</b> · balance <b style={{ color:newBalance>0?TERRA:GREEN }}>{newBalance>0?rupee(newBalance):"Settled"}</b> · <span style={{ ...sharedSt.badge, ...badgeStyle(preview) }}>{STATUS_META[preview].label}</span></div>}
                </>
            }

            <label style={{ display:"block", marginTop:16 }}>
              <span style={sharedSt.fieldLabel}><span style={{ display:"inline-flex", verticalAlign:"-2px", marginRight:5, color:MUTE }}><Icon name="lock" size={13}/></span>Security PIN</span>
              <input className="ivh-in" style={sharedSt.pinInput} type="password" value={pin} name="aa-billing-pin" autoComplete="one-time-code" inputMode="numeric" data-1p-ignore data-lpignore="true" data-form-type="other" onChange={e=>setPin(e.target.value)} placeholder="••••••" onKeyDown={e=>{ if(e.key==="Enter"&&pin.trim()&&payAdd>0&&!fullyPaid&&!saving) save(); }}/>
            </label>
            {err && <div style={{ ...sharedSt.errBanner, marginTop:14, marginBottom:0 }}>{err}</div>}

            <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:16, flexWrap:"wrap" }}>
              {inv.status==="cancelled" ? <span style={{ fontSize:12.5, fontWeight:700, color:MUTE }}>Cancelled</span>
               : fullyPaid              ? <span style={{ fontSize:12.5, fontWeight:700, color:MUTE }}>Fully paid</span>
               : <button className="ivh-cancelinv" style={st.cancelInvBtn} onClick={cancelInv} disabled={saving||!pin.trim()}>Cancel invoice</button>}
              <div style={{ display:"flex", gap:10, marginLeft:"auto" }}>
                <button className="ivh-ghost" style={sharedSt.ghostBtn} onClick={onClose} disabled={saving}>Close</button>
                <button className="ivh-save"  style={sharedSt.saveBtn}  onClick={save}    disabled={saving||!pin.trim()||payAdd<=0||fullyPaid}>{saving?<span className="ivh-spin" style={sharedSt.spin}/>:"Save payment"}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  summary:     { display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, padding:"10px 13px", margin:"4px 0 10px", background:"#fbf7f3", border:"1px solid #f0e6dc" },
  sumLbl:      { fontSize:10.5, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase", color:MUTE, whiteSpace:"nowrap" },
  histWrap:    { marginBottom:10, border:"1px solid #f0e6dc", background:"#fffdfb" },
  histHead:    { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 12px", borderBottom:"1px solid #f0e6dc", fontSize:11, fontWeight:800, letterSpacing:0.6, textTransform:"uppercase", color:FAINT },
  histRow:     { display:"flex", alignItems:"center", gap:9, padding:"7px 12px", borderBottom:"1px solid #f4f1ec", fontSize:13 },
  methPill:    { display:"inline-flex", alignItems:"center", gap:4, border:"1px solid", borderRadius:0, padding:"2px 7px 2px 6px", fontSize:10, fontWeight:700, letterSpacing:0.3, textTransform:"uppercase", whiteSpace:"nowrap" },
  histYes:     { border:"none", background:"#fdecea", color:"#b3261e", fontFamily:SANS, fontWeight:800, fontSize:11, padding:"5px 10px", cursor:"pointer", borderRadius:0 },
  histNo:      { border:"1px solid #f0e6dc", background:"#fff", color:"#545a67", fontFamily:SANS, fontWeight:700, fontSize:11, padding:"5px 10px", cursor:"pointer", borderRadius:0 },
  chip:        { padding:"8px 15px", borderRadius:0, border:"1px solid #f0e6dc", background:"#fff", color:"#545a67", fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" },
  preview:     { marginTop:10, padding:"8px 13px", background:"#fffcf9", border:"1px solid #f0e6dc", fontSize:12.5, color:"#545a67", lineHeight:1.5, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" },
  cancelInvBtn:{ padding:"10px 14px", borderRadius:0, border:"1px solid #f0e6dc", background:"#fff", color:"#545a67", fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer" },
};