// src/components/inventory/SupplierDrawer.tsx
import { useState } from "react";
import api from "../../api";
import Icon from "./Icon";
import PinField from "./PinField";
import { Supplier, sharedSt } from "./types";

interface Props {
  supplier: Supplier | "new";
  onClose:  () => void;
  onSaved:  () => void;
}

const blank = () => ({ name:"", phone:"", email:"", gstin:"", address:"", notes:"", pin:"" });

export default function SupplierDrawer({ supplier, onClose, onSaved }: Props) {
  const [form, setForm] = useState(supplier === "new" ? blank() : {
    name:    supplier.name,
    phone:   supplier.phone    || "",
    email:   supplier.email    || "",
    gstin:   supplier.gstin    || "",
    address: supplier.address  || "",
    notes:   supplier.notes    || "",
    pin:     "",
  });
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);
  const f = (k: string) => (v: string) => setForm(p => ({...p,[k]:v}));

  const save = async () => {
    if (!form.name.trim()) { setErr("Supplier name is required."); return; }
    if (!form.pin)         { setErr("Enter your security PIN."); return; }
    setBusy(true); setErr("");
    const body = { name:form.name.trim(), phone:form.phone, email:form.email, gstin:form.gstin, address:form.address, notes:form.notes, pin:form.pin };
    try {
      if (supplier === "new") await api.post("/api/inventory/suppliers", body);
      else                    await api.patch(`/api/inventory/suppliers/${supplier.id}`, body);
      onSaved();
    } catch(e:any) { setErr(e?.response?.data?.error || "Couldn't save."); }
    finally { setBusy(false); }
  };

  const del = async () => {
    if (!form.pin) { setErr("Enter your security PIN."); return; }
    if (!confirm("Delete this supplier?")) return;
    setBusy(true);
    try {
      await api.delete(`/api/inventory/suppliers/${(supplier as Supplier).id}`, { data:{ pin:form.pin } });
      onSaved();
    } catch(e:any) { setErr(e?.response?.data?.error || "Couldn't delete."); }
    finally { setBusy(false); }
  };

  return (
    <div style={sharedSt.backdrop} onClick={() => !busy && onClose()}>
      <div style={{ ...sharedSt.drawer, maxWidth:440 }} onClick={e => e.stopPropagation()}>
        <div style={sharedSt.dHead}>
          <h3 style={sharedSt.dTitle}>{supplier === "new" ? "Add supplier" : "Edit supplier"}</h3>
          <button style={sharedSt.closeBtn} onClick={onClose}><Icon name="x" size={18}/></button>
        </div>

        <div style={sharedSt.dBody}>
          <label style={sharedSt.field}><span style={sharedSt.lbl}>Supplier name *</span>
            <input style={sharedSt.inp} autoFocus value={form.name} onChange={e=>f("name")(e.target.value)}/></label>

          <div style={sharedSt.row2}>
            <label style={sharedSt.field}><span style={sharedSt.lbl}>Phone</span>
              <input style={sharedSt.inp} value={form.phone} onChange={e=>f("phone")(e.target.value)}/></label>
            <label style={sharedSt.field}><span style={sharedSt.lbl}>Email</span>
              <input style={sharedSt.inp} value={form.email} onChange={e=>f("email")(e.target.value)}/></label>
          </div>

          <label style={sharedSt.field}><span style={sharedSt.lbl}>GSTIN</span>
            <input style={sharedSt.inp} value={form.gstin} onChange={e=>f("gstin")(e.target.value.toUpperCase())}/></label>

          <label style={sharedSt.field}><span style={sharedSt.lbl}>Address</span>
            <textarea style={{...sharedSt.inp,minHeight:64,resize:"vertical"}} value={form.address} onChange={e=>f("address")(e.target.value)}/></label>

          <label style={sharedSt.field}><span style={sharedSt.lbl}>Notes</span>
            <textarea style={{...sharedSt.inp,minHeight:56,resize:"vertical"}} value={form.notes} onChange={e=>f("notes")(e.target.value)}/></label>

          <PinField value={form.pin} onChange={f("pin")}/>
          {err && <div style={sharedSt.errBox}>{err}</div>}
        </div>

        <div style={sharedSt.dFoot}>
          {supplier !== "new" && (
            <button style={sharedSt.delBtn} onClick={del} disabled={busy}>
              <Icon name="trash" size={14}/> Delete
            </button>
          )}
          <div style={{ marginLeft:"auto", display:"flex", gap:10 }}>
            <button style={sharedSt.ghostBtn} onClick={onClose} disabled={busy}>Cancel</button>
            <button style={sharedSt.ctaBtn}   onClick={save}    disabled={busy}>{busy?"Saving…":"Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}