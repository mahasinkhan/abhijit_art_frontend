// src/components/invoices/DeleteModal.tsx
import { useState } from "react";
import api from "../../api";
import { Invoice, MUTE, SANS, sharedSt, errMessage, REQ_TIMEOUT, rupee as makeRupee, num } from "./types";
import Icon from "./Icon";
import SuccessPanel from "./SuccessPanel";

const rupee = makeRupee;

interface Props {
  inv:      Invoice;
  onClose:  () => void;
  onDelete: (id: string) => void;
}

export default function DeleteModal({ inv, onClose, onDelete }: Props) {
  const [pin,      setPin]      = useState("");
  const [err,      setErr]      = useState("");
  const [deleting, setDeleting] = useState(false);
  const [done,     setDone]     = useState(false);

  const confirm = async () => {
    setDeleting(true); setErr("");
    try {
      await api.delete(`/api/invoices/${inv.id}`, { data:{ pin:pin.trim() }, timeout:REQ_TIMEOUT });
      setDone(true);
      setTimeout(() => { onDelete(inv.id); onClose(); }, 1600);
    } catch(e:any) { setErr(errMessage(e,"Couldn't delete the invoice.")); }
    finally { setDeleting(false); }
  };

  return (
    <div style={sharedSt.backdrop} onClick={() => !deleting && !done && onClose()}>
      <div data-modal-scroll className="ivh-modal" style={sharedSt.modal} onClick={e=>e.stopPropagation()}>
        {done
          ? <SuccessPanel title="Invoice deleted" detail={inv.invoiceNo} tone="#b3261e"/>
          : <>
              <h3 style={sharedSt.modalTitle}>Delete invoice {inv.invoiceNo}?</h3>
              <p style={{ fontSize:13.5, color:"#545a67", lineHeight:1.6, margin:"0 0 20px" }}>
                This removes the saved record for <b>{inv.clientName||"—"}</b> ({rupee(num(inv.total))}) and its whole payment history, permanently.
              </p>
              <label style={{ display:"block", marginBottom:4 }}>
                <span style={sharedSt.fieldLabel}><span style={{ display:"inline-flex", verticalAlign:"-2px", marginRight:5, color:MUTE }}><Icon name="lock" size={13}/></span>Security PIN · required to delete</span>
                <input className="ivh-in" style={sharedSt.pinInput} type="password" value={pin} name="aa-delete-pin" autoComplete="one-time-code" inputMode="numeric" data-1p-ignore data-lpignore="true" data-form-type="other" autoFocus onChange={e=>setPin(e.target.value)} placeholder="••••••" onKeyDown={e=>{ if(e.key==="Enter"&&pin.trim()&&!deleting) confirm(); }}/>
              </label>
              {err && <div style={{ ...sharedSt.errBanner, marginTop:12, marginBottom:0 }}>{err}</div>}
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 }}>
                <button className="ivh-ghost"   style={sharedSt.ghostBtn} onClick={onClose}  disabled={deleting}>Cancel</button>
                <button className="ivh-del-cta" style={st.delCta}         onClick={confirm}  disabled={deleting||!pin.trim()}>
                  {deleting?<span className="ivh-spin" style={sharedSt.spin}/>:"Delete invoice"}
                </button>
              </div>
            </>
        }
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  delCta: { padding:"10px 18px", borderRadius:0, border:"none", background:"#d33", color:"#fff", fontFamily:SANS, fontWeight:800, fontSize:14, cursor:"pointer", minWidth:128, display:"inline-flex", alignItems:"center", justifyContent:"center" },
};