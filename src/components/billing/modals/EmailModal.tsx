// src/components/billing/modals/EmailModal.tsx
import { btnSt, INK, LINE, CARD, BODY, TERRA, MUTE, rupee, SANS } from "../types";

interface Props {
  invNo:    string;
  bizName:  string;
  total:    number;
  itemCount:number;
  to:       string; subject: string; message: string;
  busy:     boolean; err: string; sent: string;
  onChange: (k:"to"|"subject"|"message", v:string) => void;
  onSend:   () => void;
  onClose:  () => void;
}

export default function EmailModal({ invNo, bizName, total, itemCount, to, subject, message, busy, err, sent, onChange, onSend, onClose }: Props) {
  return (
    <div style={btnSt.backdrop} onClick={() => !busy && onClose()}>
      <div style={btnSt.modal} onClick={e => e.stopPropagation()}>
        <div style={btnSt.modalHead}>
          <h3 style={{ fontSize:17, fontWeight:800, margin:0, color:INK }}>Email invoice {invNo}</h3>
          <button style={{ width:34,height:34,border:`1px solid ${LINE}`,background:CARD,color:"#8a8f9a",display:"grid",placeItems:"center",cursor:"pointer",borderRadius:0 }} onClick={onClose}>✕</button>
        </div>
        <div style={btnSt.modalBody}>
          {sent ? (
            <div style={btnSt.ok}>{sent}</div>
          ) : (
            <>
              <div style={{ padding:"11px 14px", background:"#fffcf9", border:`1px solid ${LINE}`, fontSize:12.5, color:BODY, lineHeight:1.55, marginBottom:4 }}>
                The invoice is included in the email — client sees it without downloading anything.
              </div>
              <label style={btnSt.field}><span style={btnSt.lbl}>Send to</span>
                <input style={btnSt.inp} type="email" value={to} onChange={e=>onChange("to",e.target.value)} placeholder="client@example.com" autoFocus/></label>
              <label style={btnSt.field}><span style={btnSt.lbl}>Subject</span>
                <input style={btnSt.inp} value={subject} onChange={e=>onChange("subject",e.target.value)}/></label>
              <label style={btnSt.field}><span style={btnSt.lbl}>Message</span>
                <textarea style={{...btnSt.inp,minHeight:130,resize:"vertical"}} value={message} onChange={e=>onChange("message",e.target.value)}/></label>
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
            ? <button style={{...btnSt.cta,marginLeft:"auto"}} onClick={onClose}>Done</button>
            : <>
                <button style={btnSt.ghost} onClick={onClose} disabled={busy}>Cancel</button>
                <button style={btnSt.cta} onClick={onSend} disabled={busy||!to.trim()||!subject.trim()}>
                  {busy?"Sending…":"Send invoice"}
                </button>
              </>
          }
        </div>
      </div>
    </div>
  );
}