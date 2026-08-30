// src/components/billing/BillingPreview.tsx
import { useState } from "react";
import { LineItem, Party, Totals, MUTE, CARD, num, fmtDate, amtWords } from "./types";

export type BillVariant = "full" | "half";

interface Props {
  biz:         Party;
  client:      Party;
  invNo:       string;
  date:        string;
  items:       LineItem[];
  totals:      Totals;
  advancePaid: number;
  balanceDue:  number;
  taxPct:      string;
  qrBase64:    string;
  logoBase64:  string;
  sigBase64:   string;
  notes?:      string;
  warranty?:   string;
  variant?:    BillVariant;
}

const ORANGE = "#c56a3a";
const RULE   = "#ede8dc";

export default function BillingPreview(p: Props) {
  const [logoOk, setLogoOk] = useState(true);
  const half = p.variant === "half";

  const { subtotal, discountAmt, taxAmt, total } = p.totals;
  const taxable = subtotal - discountAmt;
  const cgst = taxAmt / 2;
  const visibleItems = p.items.filter(it => it.desc.trim() || num(it.rate) > 0);
  const cols = 4 + (discountAmt > 0 ? 1 : 0) + (num(p.taxPct) > 0 ? 1 : 0);

  const renderCard = () => (
    <div style={{
      width:"100%", height:"100%", background:CARD,
      fontFamily:"'Inter',Arial,sans-serif", color:"#1a1a2e",
      display:"flex", flexDirection:"column" as const, overflow:"hidden",
    }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", gap:9, padding:"12px 14px 10px", borderBottom:"2.5px solid #e89a3c", background:"linear-gradient(135deg,#fff2e6 0%,#fff8f0 50%,#fff 100%)", flexShrink:0 }}>
                {logoOk
          ? <img src={p.logoBase64 || "/images/abhijit_art_logo.png"} alt={p.biz.name} style={{ width:56,height:56,objectFit:"contain",flexShrink:0 }} onError={()=>setLogoOk(false)}/>
          : <div style={{ width:56,height:56,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#f0e8d0",border:"1px solid #c8a84b",borderRadius:"50%",fontSize:13,fontWeight:800,color:"#8a6a1c" }}>{(p.biz.name||"").slice(0,2)}</div>}
        <div style={{ flex:1, minWidth:0 }}>
          {p.biz.name && <div style={{ fontSize:19,fontWeight:900,color:ORANGE,lineHeight:1.05 }}>{p.biz.name}</div>}
          {p.biz.pan && <div style={{ fontSize:9,color:"#444",fontWeight:600,marginTop:2 }}>Pan No&nbsp; <b>{p.biz.pan}</b></div>}
          {p.biz.address && <div style={{ fontSize:8.5,color:"#666",marginTop:2,lineHeight:1.35,whiteSpace:"pre-line" as const }}>📍 {p.biz.address}</div>}
          <div style={{ fontSize:8.5,color:"#666",marginTop:2,display:"flex",flexWrap:"wrap" as const,gap:"2px 8px" }}>
            {p.biz.phone && <span>📞 {p.biz.phone}</span>}
            {p.biz.email && <span>✉ {p.biz.email}</span>}
            {p.biz.gstin && <span>GSTIN: {p.biz.gstin}</span>}
          </div>
        </div>
        <div style={{ textAlign:"right" as const, flexShrink:0, alignSelf:"center" }}>
          <div style={{ fontSize:13,fontWeight:900,letterSpacing:3,color:ORANGE,marginBottom:5 }}>INVOICE</div>
          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            {[{l:"Invoice Date",v:fmtDate(p.date)},{l:"Invoice No",v:`#${p.invNo}`}].map(r=>(
              <div key={r.l} style={{ textAlign:"right" as const }}>
                <div style={{ fontSize:7.5,fontWeight:700,color:"#8a8f9a",textTransform:"uppercase" as const,letterSpacing:.5 }}>{r.l}</div>
                <div style={{ fontSize:11,fontWeight:800,color:ORANGE,marginTop:1 }}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bill To ────────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"baseline", flexWrap:"wrap" as const, gap:"3px 14px", padding:"9px 14px", borderBottom:"1px solid #f0e0d0", background:"linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)", flexShrink:0 }}>
        <span style={{ fontSize:8.5,fontWeight:800,color:ORANGE,textTransform:"uppercase" as const,letterSpacing:.7,borderBottom:"1.5px solid #e89a3c",paddingBottom:2 }}>Bill To</span>
        <span style={{ fontSize:12,fontWeight:800 }}>{p.client.name||"—"}</span>
        {p.client.phone && <span style={{ fontSize:8.5,color:"#555" }}>📞 {p.client.phone}</span>}
        {p.client.gstin && <span style={{ fontSize:8.5,color:"#555" }}>GSTIN: {p.client.gstin}</span>}
        {p.client.address && <span style={{ fontSize:8.5,color:"#555" }}>{p.client.address}</span>}
      </div>

      {/* ── Items ──────────────────────────────────────────────── */}
      <div style={{ flex:1, minHeight:0, overflow:"hidden", display:"flex", flexDirection:"column" as const }}>
        <table style={{ width:"100%", borderCollapse:"collapse" as const }}>
          <thead>
            <tr>
              {[
                { t:"No",    w:26 as number|undefined, a:"center" as const },
                { t:"Items", w:undefined,              a:"left"   as const },
                { t:"Qty",   w:34,                     a:"right"  as const },
                { t:"Rate",  w:58,                     a:"right"  as const },
                ...(discountAmt>0 ? [{ t:"Disc.", w:50, a:"right" as const }] : []),
                ...(num(p.taxPct)>0 ? [{ t:"Tax", w:44, a:"right" as const }] : []),
                { t:"Total", w:64, a:"right" as const },
              ].map(h => (
                <th key={h.t} style={{ background:ORANGE, color:"#fff", padding:"5px 6px", fontSize:8.5, fontWeight:700, textAlign:h.a, width:h.w }}>{h.t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleItems.length === 0
              ? <tr><td colSpan={cols} style={{ textAlign:"center" as const,color:"#aaa",padding:"18px 0",fontSize:10 }}>No items yet</td></tr>
              : visibleItems.map((it, i) => {
                  const lt = num(it.qty)*num(it.rate);
                  const ld = discountAmt>0&&subtotal>0?(lt/subtotal)*discountAmt:0;
                  const lx = taxAmt>0&&subtotal>0?(lt/subtotal)*taxAmt:0;
                  const td = { padding:"5px 6px", borderBottom:`.5px solid ${RULE}`, fontSize:10 };
                  return (
                    <tr key={it.id} style={{ background: i%2 ? "#fdfaf5" : "transparent" }}>
                      <td style={{ ...td, textAlign:"center" as const, color:"#aaa" }}>{i+1}.</td>
                      <td style={td}>{it.desc||"—"}</td>
                      <td style={{ ...td, textAlign:"right" as const }}>{num(it.qty)}</td>
                      <td style={{ ...td, textAlign:"right" as const, fontVariantNumeric:"tabular-nums" }}>₹{num(it.rate).toLocaleString("en-IN")}</td>
                      {discountAmt>0&&<td style={{ ...td, textAlign:"right" as const, fontVariantNumeric:"tabular-nums" }}>₹{Math.round(ld).toLocaleString("en-IN")}</td>}
                      {num(p.taxPct)>0&&<td style={{ ...td, textAlign:"right" as const, fontVariantNumeric:"tabular-nums" }}>{Math.round(lx).toLocaleString("en-IN")}</td>}
                      <td style={{ ...td, textAlign:"right" as const, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>₹{Math.round(lt-ld+lx).toLocaleString("en-IN")}</td>
                    </tr>
                  );
                })}
          </tbody>
          <tfoot>
            <tr style={{ background:"#f5f0e8", fontWeight:800, borderTop:"1.5px solid #c8a84b" }}>
              <td style={{ padding:6,textAlign:"center" as const,fontSize:10 }}>Sub.</td>
              <td style={{ padding:6,fontSize:10.5 }}><b>SUBTOTAL</b></td>
              <td style={{ padding:6,textAlign:"right" as const,fontSize:10.5 }}>{visibleItems.reduce((s,it)=>s+num(it.qty),0)}</td>
              <td style={{ padding:6,textAlign:"right" as const,fontSize:10.5,fontVariantNumeric:"tabular-nums" }}>{Math.round(subtotal).toLocaleString("en-IN")}</td>
              {discountAmt>0&&<td style={{ padding:6,textAlign:"right" as const,fontSize:10.5,fontVariantNumeric:"tabular-nums" }}>₹{Math.round(discountAmt).toLocaleString("en-IN")}</td>}
              {num(p.taxPct)>0&&<td style={{ padding:6,textAlign:"right" as const,fontSize:10.5,fontVariantNumeric:"tabular-nums" }}>{Math.round(taxAmt).toLocaleString("en-IN")}</td>}
              <td style={{ padding:6,textAlign:"right" as const,fontSize:10.5,fontVariantNumeric:"tabular-nums" }}>₹{Math.round(taxable).toLocaleString("en-IN")}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Bottom: terms + QR + signature | totals ───────────── */}
      <div style={{ display:"flex", borderTop:"1px solid #e8e0cc", flexShrink:0 }}>
        <div style={{ flex:1.15, padding:"10px 13px", display:"flex", flexDirection:"column" as const, gap:7, borderRight:"1px solid #e8e0cc" }}>
          <div>
            <div style={{ fontSize:9,fontWeight:800,color:ORANGE,marginBottom:2 }}>Terms &amp; Conditions</div>
            <div style={{ fontSize:8,color:"#555",lineHeight:1.5 }}>{p.notes?.trim() || "Keep the invoices for Future References"}</div>
          </div>
          {p.warranty?.trim() && (
            <div>
              <div style={{ fontSize:9,fontWeight:800,color:ORANGE,marginBottom:2 }}>Warranty</div>
              <div style={{ fontSize:8,color:"#555",lineHeight:1.5 }}>{p.warranty}</div>
            </div>
          )}
          <div style={{ display:"flex",gap:12,alignItems:"flex-end",marginTop:"auto",paddingTop:6 }}>
            {p.qrBase64 && (
              <div style={{ display:"flex",flexDirection:"column" as const,alignItems:"center",gap:3 }}>
                <div style={{ fontSize:7.5,fontWeight:700,color:ORANGE,textAlign:"center" as const }}>Payment QR Code</div>
                <img src={p.qrBase64} alt="QR" style={{ width:78,height:78,objectFit:"contain" }}/>
              </div>
            )}
            <div style={{ flex:1,display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"flex-end",textAlign:"center" as const }}>
              {p.sigBase64 && <img src={p.sigBase64} alt="Signature" style={{ height:28,width:"auto",display:"block",margin:"auto auto 3px" }}/>}
              <div style={{ width:56,borderBottom:".5px solid #888",margin:"3px auto 2px" }}/>
              <div style={{ fontSize:7,color:"#555" }}>Authorised Signatory</div>
            </div>
          </div>
        </div>

        <div style={{ flex:1, padding:"10px 13px", display:"flex", flexDirection:"column" as const, gap:2 }}>
          {[
            { l:"Taxable Amount", v:`₹${taxable.toFixed(2)}` },
            ...(cgst>0?[{l:`CGST @${num(p.taxPct)/2}%`,v:`₹${cgst.toFixed(2)}`},{l:`SGST @${num(p.taxPct)/2}%`,v:`₹${cgst.toFixed(2)}`}]:[]),
            ...(p.advancePaid>0?[{l:"Amount Received",v:`−₹${p.advancePaid.toFixed(2)}`,green:true}]:[]),
          ].map(r => (
            <div key={r.l} style={{ display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`.5px solid ${RULE}`,fontSize:9.5 }}>
              <span>{r.l}</span><span style={{ fontVariantNumeric:"tabular-nums", ...((r as any).green?{color:"#15803d"}:{}) }}>{r.v}</span>
            </div>
          ))}
          <div style={{ background:ORANGE,color:"#fff",padding:"8px 9px",marginTop:5 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:10,fontWeight:700 }}>
              <span>Total Amount</span><span style={{ fontSize:17,fontWeight:900,fontVariantNumeric:"tabular-nums" }}>₹{total.toFixed(2)}</span>
            </div>
            {p.balanceDue>0 && <div style={{ display:"flex",justifyContent:"space-between",fontSize:8,color:"#ffccaa",marginTop:2 }}><span>Balance Due</span><span>₹{p.balanceDue.toFixed(2)}</span></div>}
          </div>
          <div style={{ border:".5px solid #f0d8c0",padding:"5px 6px",marginTop:5,background:"linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)" }}>
            <div style={{ fontSize:7.5,fontWeight:700,color:ORANGE,marginBottom:1 }}>Total Amount (in words)</div>
            <div style={{ fontSize:9,color:"#333",fontWeight:600,lineHeight:1.35 }}>{amtWords(total)}</div>
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div style={{ textAlign:"right" as const,fontSize:11,fontWeight:800,color:ORANGE,padding:"7px 14px 10px",fontStyle:"italic",flexShrink:0 }}>
        Thank you for your business!
      </div>
    </div>
  );

  const labelRow = (note: string) => (
    <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:8 }}>
      <span style={{ fontSize:11, fontWeight:700, letterSpacing:.8, textTransform:"uppercase" as const, color:MUTE }}>Preview</span>
      <span style={{ fontSize:10.5, color:MUTE }}>{note}</span>
    </div>
  );

  // ── Half: plain 6 inch × 8 inch upright bill (laser printer, custom paper) ──
  if (half) {
    return (
      <div style={{ position:"sticky", top:20, minWidth:0 }}>
        {labelRow("6 × 8 inch")}
        <div style={{ width:"100%", aspectRatio:"6 / 8", border:"1px solid #e0d8c8", boxShadow:"0 4px 20px rgba(0,0,0,.13)", overflow:"hidden" }}>
          {renderCard()}
        </div>
      </div>
    );
  }

  // ── Full: one bill fills the A4 portrait sheet ─────────
  return (
    <div style={{ position:"sticky", top:20, minWidth:0 }}>
      {labelRow("A4 · 210 × 297 mm")}
      <div style={{ width:"100%", aspectRatio:"210 / 297", border:"1px solid #e0d8c8", boxShadow:"0 4px 20px rgba(0,0,0,.13)", overflow:"hidden" }}>
        {renderCard()}
      </div>
    </div>
  );
}