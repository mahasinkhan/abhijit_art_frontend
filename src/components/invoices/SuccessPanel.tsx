// src/components/invoices/SuccessPanel.tsx
import { GREEN } from "./types";

export default function SuccessPanel({ title, detail, tone = GREEN }: { title: string; detail?: string; tone?: string }) {
  return (
    <div className="ivh-success" style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", padding:"26px 8px 30px" }}>
      <div className="ivh-successring" style={{ width:84, height:84, borderRadius:"50%", border:"1px solid", display:"grid", placeItems:"center", marginBottom:16, background:`${tone}14`, borderColor:`${tone}44` }}>
        <svg width="46" height="46" viewBox="0 0 52 52" aria-hidden>
          <circle className="ivh-checkcircle" cx="26" cy="26" r="23" fill="none" stroke={tone} strokeWidth="3" />
          <path className="ivh-checkmark" fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M15 27 L23 34 L38 18" />
        </svg>
      </div>
      <div className="ivh-successtitle" style={{ fontSize:19, fontWeight:800, letterSpacing:-0.2, color:tone }}>{title}</div>
      {detail && <div className="ivh-successsub" style={{ fontSize:13, color:"#8a8f9a", marginTop:6, fontWeight:600, fontVariantNumeric:"tabular-nums" }}>{detail}</div>}
    </div>
  );
}