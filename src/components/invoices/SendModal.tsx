// src/components/invoices/SendModal.tsx
import { useState } from "react";
import api from "../../api";
import {
  Invoice, GREEN, WA, WA_DK, LINE, SANS, TERRA,
  num, round2, rupee as makeRupee, effectivePaid, waDigits, errMessage, REQ_TIMEOUT, sharedSt,
} from "./types";
import Icon from "./Icon";
import SuccessPanel from "./SuccessPanel";

const rupee = makeRupee;

interface Props {
  inv:      Invoice;
  channel:  "email" | "whatsapp";
  onClose:  () => void;
}

export default function SendModal({ inv, channel: initChannel, onClose }: Props) {
  const total = num(inv.total);
  const paid  = effectivePaid(inv);
  const due   = round2(Math.max(total - paid, 0));
  const biz   = inv.business?.name || "Abhijit Art";

  const [ch,          setCh]          = useState<"email"|"whatsapp">(initChannel);
  const [emailTo,     setEmailTo]     = useState(inv.clientEmail||"");
  const [subject,     setSubject]     = useState(`Invoice ${inv.invoiceNo} from ${biz}`);
  const [emailMsg,    setEmailMsg]    = useState(`Dear ${inv.clientName||"Customer"},\n\nPlease find your invoice ${inv.invoiceNo}, for a total of ${rupee(total)}${due>0.005?`, with a balance due of ${rupee(due)}`:" — paid in full, thank you"}.\n\nDo let us know if anything needs correcting — just reply to this email.\n\nWarm regards,\n${biz}`);
  const [waTo,        setWaTo]        = useState(inv.clientPhone||"");
  const [waMsg,       setWaMsg]       = useState(`Dear ${inv.clientName||"Customer"},\n\nHere is your invoice ${inv.invoiceNo} from ${biz}.\n\nTotal: ${rupee(total)}${paid>0.005?`\nPaid: ${rupee(paid)}`:""}${due>0.005?`\nBalance due: ${rupee(due)}`:""}\n\nThank you for your business!`);
  const [busy,        setBusy]        = useState(false);
  const [err,         setErr]         = useState("");
  const [done,        setDone]        = useState<{title:string;detail?:string;tone:string}|null>(null);

  const sendEmail = async () => {
    if (!emailTo.trim()) { setErr("Enter the client's email address."); return; }
    setBusy(true); setErr("");
    try {
      await api.post("/api/invoices/email", {
        to:emailTo.trim(), subject, message:emailMsg,
        invoice:{ invNo:inv.invoiceNo, date:inv.date, biz:inv.business||{}, client:{ name:inv.clientName||"", address:inv.clientAddr||"", phone:inv.clientPhone||"", email:inv.clientEmail||"", gstin:inv.clientGstin||"", pan:"" }, items:(Array.isArray(inv.items)?inv.items:[]).map(it=>({desc:it.desc,qty:num(it.qty),rate:num(it.rate)})), discType:inv.discType, discVal:inv.discVal, taxPct:inv.taxPct, notes:inv.notes||"", warranty:inv.warranty||"", paidAmount:paid }
      }, { timeout:REQ_TIMEOUT });
      setDone({ title:"Email sent", detail:`${inv.invoiceNo} → ${emailTo.trim()}`, tone:GREEN });
      setTimeout(onClose, 1600);
    } catch(e:any) { setErr(errMessage(e,"Couldn't send the email.")); }
    finally { setBusy(false); }
  };

  const sendWa = () => {
    const digits = waDigits(waTo);
    if (digits.length < 10) { setErr("Enter a valid WhatsApp number."); return; }
    const link = inv.pdfUrl ? `\n\n📄 Invoice PDF: ${inv.pdfUrl}` : "";
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(waMsg+link)}`, "_blank");
    setDone({ title:"Opening WhatsApp…", detail:`+${digits}`, tone:WA });
    setTimeout(onClose, 1400);
  };

  return (
    <div style={sharedSt.backdrop} onClick={() => !busy && !done && onClose()}>
      <div data-modal-scroll className="ivh-modal" style={{ ...sharedSt.editModal, maxWidth:520 }} onClick={e=>e.stopPropagation()}>
        {done ? <SuccessPanel title={done.title} detail={done.detail} tone={done.tone}/> : (
          <>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:12 }}>
              <div><h3 style={sharedSt.modalTitle}>Send invoice · {inv.invoiceNo}</h3><p style={{ fontSize:12.5, color:"#8a8f9a", margin:"0 0 2px", fontWeight:600 }}>{inv.clientName||"—"}</p></div>
              <button className="ivh-icon" style={sharedSt.iconBtn} onClick={onClose}><Icon name="x" size={18}/></button>
            </div>

            {/* Channel toggle */}
            <div style={sharedSt.segWrap}>
              {(["email","whatsapp"] as const).map((c,idx) => (
                <button key={c} type="button" className={`ivh-seg${ch===c?" on":""}`}
                  style={{ ...sharedSt.segBtn, ...(idx===1?{borderLeft:`1px solid ${LINE}`}:null), ...(ch===c?(c==="whatsapp"?{background:WA,color:"#fff"}:sharedSt.segBtnOn):null) }}
                  onClick={() => { setCh(c); setErr(""); }}>
                  <Icon name={c==="email"?"mail":"whatsapp"} size={14}/> {c==="email"?"Email":"WhatsApp"}
                </button>
              ))}
            </div>

            {ch === "email" ? (
              <>
                <div style={{ padding:"11px 14px", background:"#fffcf9", border:`1px solid ${LINE}`, fontSize:12.5, color:"#545a67", lineHeight:1.55, margin:"12px 0" }}>The invoice is included in the email — the client sees it without downloading anything.</div>
                <label style={{ display:"block" }}><span style={sharedSt.fieldLabel}>Send to</span><input className="ivh-in" style={sharedSt.editInput} type="email" value={emailTo} onChange={e=>setEmailTo(e.target.value)} placeholder="client@example.com" autoFocus/></label>
                <label style={{ display:"block", marginTop:10 }}><span style={sharedSt.fieldLabel}>Subject</span><input className="ivh-in" style={sharedSt.editInput} value={subject} onChange={e=>setSubject(e.target.value)}/></label>
                <label style={{ display:"block", marginTop:10 }}><span style={sharedSt.fieldLabel}>Message</span><textarea className="ivh-in" style={{ ...sharedSt.editInput as any, minHeight:122, resize:"vertical", lineHeight:1.5 }} value={emailMsg} onChange={e=>setEmailMsg(e.target.value)}/></label>
              </>
            ) : (
              <>
                <div style={{ padding:"11px 14px", background:"#effaf3", border:"1px solid #cfead9", fontSize:12.5, color:"#2f6a45", lineHeight:1.55, margin:"12px 0" }}>Opens WhatsApp with the message ready to send.{inv.pdfUrl?" A link to the invoice PDF is added automatically.":""}</div>
                <label style={{ display:"block" }}><span style={sharedSt.fieldLabel}>WhatsApp number</span><input className="ivh-in" style={sharedSt.editInput} value={waTo} onChange={e=>setWaTo(e.target.value)} placeholder="e.g. 7405179066" autoFocus/></label>
                <label style={{ display:"block", marginTop:10 }}><span style={sharedSt.fieldLabel}>Message</span><textarea className="ivh-in" style={{ ...sharedSt.editInput as any, minHeight:132, resize:"vertical", lineHeight:1.5 }} value={waMsg} onChange={e=>setWaMsg(e.target.value)}/></label>
              </>
            )}

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", margin:"14px 0 2px", background:"#fbf7f3", border:`1px solid ${LINE}` }}>
              <span style={{ fontSize:12.5, color:"#8a8f9a", fontWeight:600 }}>Total{due>0.005?` · balance ${rupee(due)}`:""}</span>
              <span style={{ fontSize:16, fontWeight:800, color:TERRA, fontVariantNumeric:"tabular-nums" }}>{rupee(total)}</span>
            </div>

            {err && <div style={{ ...sharedSt.errBanner, marginTop:4, marginBottom:0 }}>{err}</div>}

            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:18 }}>
              <button className="ivh-ghost" style={sharedSt.ghostBtn} onClick={onClose} disabled={busy}>Cancel</button>
              {ch === "email"
                ? <button className="ivh-save" style={sharedSt.saveBtn} onClick={sendEmail} disabled={busy||!emailTo.trim()}>{busy?<span className="ivh-spin" style={sharedSt.spin}/>:<><Icon name="mail" size={15}/> Send email</>}</button>
                : <button className="ivh-wabtn" style={{ ...sharedSt.saveBtn, background:WA }} onClick={sendWa} disabled={waDigits(waTo).length<10}><Icon name="whatsapp" size={16}/> Open WhatsApp</button>
              }
            </div>
          </>
        )}
      </div>
    </div>
  );
}