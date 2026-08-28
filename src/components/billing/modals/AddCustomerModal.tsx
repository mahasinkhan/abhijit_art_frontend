// src/components/billing/modals/AddCustomerModal.tsx
import { useState } from "react";
import api from "../../../api";
import { btnSt, SANS, LINE, CARD, TERRA, INK } from "../types";

interface Props {
  initialName:  string;
  initialPhone: string;
  initialEmail: string;
  initialAddr:  string;
  onClose:      () => void;
  onAdded:      (name:string, phone:string, email:string, address:string) => void;
}

export default function AddCustomerModal({ initialName, initialPhone, initialEmail, initialAddr, onClose, onAdded }: Props) {
  const [form, setForm] = useState({ name:initialName, phone:initialPhone, email:initialEmail, address:initialAddr, notes:"" });
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);
  const f = (k: string) => (v: string) => setForm(p => ({...p, [k]:v}));

  const submit = async () => {
    if (!form.name.trim()) { setErr("Name is required."); return; }
    setBusy(true); setErr("");
    try {
      await api.post("/api/customers", { name:form.name.trim(), email:form.email.trim(), phone:form.phone.trim(), address:form.address.trim(), source:"offline" });
      onAdded(form.name.trim(), form.phone.trim(), form.email.trim(), form.address.trim());
    } catch(e:any) { setErr(e?.response?.data?.message || "Couldn't add the customer."); }
    finally { setBusy(false); }
  };

  return (
    <div style={btnSt.backdrop} onClick={() => !busy && onClose()}>
      <div style={btnSt.modal} onClick={e => e.stopPropagation()}>
        <div style={btnSt.modalHead}>
          <h3 style={{ fontSize:17, fontWeight:800, margin:0, color:INK }}>Add customer first</h3>
          <button style={{ width:34,height:34,border:`1px solid ${LINE}`,background:CARD,color:"#8a8f9a",display:"grid",placeItems:"center",cursor:"pointer",borderRadius:0 }} onClick={onClose}>✕</button>
        </div>
        <div style={btnSt.modalBody}>
          <div style={{ padding:"11px 14px", background:"#fffcf9", border:`1px solid ${LINE}`, fontSize:12.5, color:"#545a67", lineHeight:1.55, marginBottom:4 }}>
            This customer isn't registered yet. Add them once and billing continues automatically.
          </div>
          <label style={btnSt.field}><span style={btnSt.lbl}>Full name *</span>
            <input style={btnSt.inp} value={form.name} onChange={e=>f("name")(e.target.value)} autoFocus/></label>
          <div style={{ display:"flex", gap:12 }}>
            <label style={{...btnSt.field,flex:1}}><span style={btnSt.lbl}>Phone</span>
              <input style={btnSt.inp} value={form.phone} onChange={e=>f("phone")(e.target.value)} placeholder="9876543210"/></label>
            <label style={{...btnSt.field,flex:1}}><span style={btnSt.lbl}>Email (optional)</span>
              <input style={btnSt.inp} type="email" value={form.email} onChange={e=>f("email")(e.target.value)}/></label>
          </div>
          <label style={btnSt.field}><span style={btnSt.lbl}>Address (optional)</span>
            <textarea style={{...btnSt.inp,minHeight:58,resize:"vertical"}} value={form.address} onChange={e=>f("address")(e.target.value)}/></label>
          <label style={btnSt.field}><span style={btnSt.lbl}>Notes (optional)</span>
            <textarea style={{...btnSt.inp,minHeight:56,resize:"vertical"}} value={form.notes} onChange={e=>f("notes")(e.target.value)}/></label>
          {err && <div style={btnSt.err}>{err}</div>}
        </div>
        <div style={btnSt.modalFoot}>
          <button style={btnSt.ghost} onClick={onClose} disabled={busy}>Cancel</button>
          <button style={btnSt.cta} onClick={submit} disabled={busy||!form.name.trim()}>
            {busy ? "Adding…" : "Add & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}