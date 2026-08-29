// src/components/inventory/MoveDrawer.tsx
import { useMemo, useState } from "react";
import api from "../../api";
import Icon from "./Icon";
import PinField from "./PinField";
import { InventoryItem, MovementType, MOV_LABEL, MOV_SIGN, INK, LINE, IVORY, CARD, MUTE, GREEN, RED, TERRA, dec, sharedSt, unitLabel } from "./types";

interface Props {
  item:    InventoryItem;
  onClose: () => void;
  onSaved: () => void;
}

export default function MoveDrawer({ item, onClose, onSaved }: Props) {
  const [form, setForm] = useState({ type:"adjustment" as MovementType, delta:"", note:"", pin:"" });
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);
  const f = (k: string) => (v: string) => setForm(p => ({...p,[k]:v}));

  const unitName = unitLabel(item.unit);

  const projBalance = useMemo(() => {
    const d    = parseFloat(form.delta) || 0;
    const sign = MOV_SIGN[form.type] ?? 1;
    return dec(item.quantity) + sign * Math.abs(d);
  }, [item.quantity, form.delta, form.type]);

  const save = async () => {
    if (!form.delta || parseFloat(form.delta) <= 0) { setErr("Enter a positive quantity."); return; }
    if (!form.pin) { setErr("Enter your security PIN."); return; }
    setBusy(true); setErr("");
    try {
      await api.post(`/api/inventory/items/${item.id}/move`, {
        type:     form.type,
        quantity: parseFloat(form.delta),   // backend reads 'quantity' for purchase/consumption/etc
        delta:    parseFloat(form.delta),   // backend reads 'delta' for adjustment type
        note:     form.note,
        pin:      form.pin,
      });
      onSaved();
    } catch(e:any) { setErr(e?.response?.data?.error || "Couldn't record."); }
    finally { setBusy(false); }
  };

  const balColor = projBalance < 0 ? RED : projBalance <= dec(item.reorderLevel) ? "#b45309" : GREEN;

  return (
    <div style={sharedSt.backdrop} onClick={() => !busy && onClose()}>
      <div style={{ ...sharedSt.drawer, maxWidth:440 }} onClick={e => e.stopPropagation()}>
        <div style={sharedSt.dHead}>
          <h3 style={sharedSt.dTitle}>Move stock · {item.name}</h3>
          <button style={sharedSt.closeBtn} onClick={onClose}><Icon name="x" size={18}/></button>
        </div>

        <div style={sharedSt.dBody}>
          {/* Balance preview */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, background:LINE, border:`1px solid ${LINE}`, marginBottom:18 }}>
            {[
              { label:"Current", val:dec(item.quantity), color:INK },
              { label:"After",   val:projBalance,         color:balColor },
            ].map(b => (
              <div key={b.label} style={{ background:CARD, padding:"16px 20px", textAlign:"center" }}>
                <div style={{ fontSize:10.5, color:MUTE, textTransform:"uppercase", letterSpacing:.7, marginBottom:6 }}>{b.label}</div>
                <div style={{ fontSize:26, fontWeight:900, color:b.color, fontVariantNumeric:"tabular-nums" }}>{b.val.toFixed(2)}</div>
                <div style={{ fontSize:11.5, color:MUTE }}>{unitName}</div>
              </div>
            ))}
          </div>

          <label style={sharedSt.field}><span style={sharedSt.lbl}>Movement type</span>
            <select style={sharedSt.inp} value={form.type} onChange={e => f("type")(e.target.value)}>
              {(["purchase","consumption","wastage","returned","adjustment"] as MovementType[]).map(t => (
                <option key={t} value={t}>{MOV_LABEL[t]}</option>
              ))}
            </select></label>

          <label style={sharedSt.field}><span style={sharedSt.lbl}>Quantity ({unitName})</span>
            <input style={sharedSt.inp} type="number" min="0.001" step="0.001" autoFocus
              value={form.delta} onChange={e => f("delta")(e.target.value)} placeholder="0"/></label>

          <label style={sharedSt.field}><span style={sharedSt.lbl}>Note (optional)</span>
            <input style={sharedSt.inp} value={form.note} onChange={e => f("note")(e.target.value)}/></label>

          <PinField value={form.pin} onChange={f("pin")}/>
          {err && <div style={sharedSt.errBox}>{err}</div>}
        </div>

        <div style={sharedSt.dFoot}>
          <button style={sharedSt.ghostBtn} onClick={onClose} disabled={busy}>Cancel</button>
          <button style={{ ...sharedSt.ctaBtn, marginLeft:"auto" }} onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Record movement"}
          </button>
        </div>
      </div>
    </div>
  );
}