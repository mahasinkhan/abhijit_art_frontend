// src/components/billing/modals/AutosaveModal.tsx
import { btnSt, INK } from "../types";

interface Props {
  onDecide: (choice: "on" | "off") => void;
}

export default function AutosaveModal({ onDecide }: Props) {
  return (
    <div style={{ ...btnSt.backdrop, zIndex:1100 }}>
      <div style={{ ...btnSt.modal, maxWidth:440 }}>
        <div style={btnSt.modalHead}>
          <h3 style={{ fontSize:17, fontWeight:800, margin:0, color:INK }}>Save invoices automatically?</h3>
        </div>
        <div style={btnSt.modalBody}>
          <p style={{ margin:0, fontSize:13.5, lineHeight:1.65, color:"#545a67" }}>
            Keep every invoice you download or email in the <b>Invoices</b> tab. You'll only be asked this once.
            You can still hit <b>Save invoice</b> any time to save manually.
          </p>
        </div>
        <div style={btnSt.modalFoot}>
          <button style={btnSt.ghost} onClick={() => onDecide("off")}>Don't save</button>
          <button style={btnSt.cta}   onClick={() => onDecide("on")}>Yes, save automatically</button>
        </div>
      </div>
    </div>
  );
}