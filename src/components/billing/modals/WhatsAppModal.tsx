// src/components/billing/modals/WhatsAppModal.tsx
import { btnSt, INK, LINE, CARD, BODY, MUTE, TERRA, WA, WA_DK, rupee, SANS, waDigits } from "../types";

interface Props {
  invNo:    string;
  total:    number;
  itemCount:number;
  to:       string; message: string;
  busy:     boolean; err: string; sent: string;
  onChange: (k:"to"|"message", v:string) => void;
  onSend:   () => void;
  onClose:  () => void;
}

export default function WhatsAppModal({ invNo, total, itemCount, to, message, busy, err, sent, onChange, onSend, onClose }: Props) {
  const valid = waDigits(to).length >= 10;
  return (
    <div style={btnSt.backdrop} onClick={() => !busy && onClose()}>
      <div style={btnSt.modal} onClick={e => e.stopPropagation()}>
        <div style={btnSt.modalHead}>
          <h3 style={{ fontSize:17, fontWeight:800, margin:0, color:INK }}>Send invoice {invNo} on WhatsApp</h3>
          <button style={{ width:34,height:34,border:`1px solid ${LINE}`,background:CARD,color:"#8a8f9a",display:"grid",placeItems:"center",cursor:"pointer",borderRadius:0 }} onClick={onClose}>✕</button>
        </div>
        <div style={btnSt.modalBody}>
          {sent ? (
            <div style={btnSt.ok}>{sent}</div>
          ) : (
            <>
              <div style={{ padding:"11px 14px", background:"#effaf3", border:"1px solid #cfead9", fontSize:12.5, color:"#2f6a45", lineHeight:1.55, marginBottom:4 }}>
                Opens WhatsApp with this message ready. A PDF link is added automatically.
              </div>
              <label style={btnSt.field}><span style={btnSt.lbl}>WhatsApp number · 10-digit or with country code</span>
                <input style={btnSt.inp} value={to} onChange={e=>onChange("to",e.target.value)} placeholder="e.g. 9876543210" autoFocus/></label>
              <label style={btnSt.field}><span style={btnSt.lbl}>Message</span>
                <textarea style={{...btnSt.inp,minHeight:150,resize:"vertical"}} value={message} onChange={e=>onChange("message",e.target.value)}/></label>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:18, paddingTop:14, borderTop:`1px solid ${LINE}`, fontSize:12.5, color:MUTE, fontWeight:600 }}>
                <span>{itemCount} line item{itemCount!==1?"s":""}</span>
                <span style={{ fontSize:17, fontWeight:800, color:TERRA, fontVariantNumeric:"tabular-nums" }}>{rupee(total)}</span>
              </div>
            </>
          )}
          {err && <div style={btnSt.err}>{err}</div>}
        </div>
        <div style={btnSt.modalFoot}>
          {sent
            ? <button style={{...btnSt.waCta,marginLeft:"auto"}} onClick={onClose}>Done</button>
            : <>
                <button style={btnSt.ghost} onClick={onClose} disabled={busy}>Cancel</button>
                <button style={btnSt.waCta} onClick={onSend} disabled={busy||!valid}>
                  {busy?"Preparing…":"Open WhatsApp"}
                </button>
              </>
          }
        </div>
      </div>
    </div>
  );
}