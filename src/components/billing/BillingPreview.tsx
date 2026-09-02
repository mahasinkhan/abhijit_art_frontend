// src/components/billing/BillingPreview.tsx
import { useState } from "react";
import { LineItem, Party, Totals, MUTE, CARD, num, fmtDate, amtWords } from "./types";

export type BillVariant = "full" | "half";

interface Props {
  biz:         Party;
  client:      Party;
  invNo:       string;
  date:        string;
  purpose?:    string;
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
const PEACH  = "#fdf0e7";
const RULE   = "#f2ddd0";
const INKC   = "#2a231d";
const SOFT   = "#8a8378";

export default function BillingPreview(p: Props) {
  const [logoOk, setLogoOk] = useState(true);
  const half = p.variant === "half";

  const { subtotal, discountAmt, taxAmt, total } = p.totals;
  const taxable = subtotal - discountAmt;
  const cgst = taxAmt / 2;
  const visibleItems = p.items.filter(it => it.desc.trim() || num(it.rate) > 0);
  const anyPcs = visibleItems.some(it => num(it.pcs) > 1);
  // base cols: No, Item, Size, [Pcs], Qty, Rate, Total; +Disc, +Tax
  const cols = 6 + (anyPcs ? 1 : 0) + (discountAmt > 0 ? 1 : 0) + (num(p.taxPct) > 0 ? 1 : 0);

  const renderCard = () => (
    <div style={{
      width:"100%", height:"100%", background:CARD,
      fontFamily:"'Inter',Arial,sans-serif", color:INKC,
      display:"flex", flexDirection:"column" as const, overflow:"hidden",
    }}>

      {/* ── Header ─────────────────────────────────────────────── */}
                 <div style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 14px 11px", borderBottom:`2px solid ${ORANGE}`, background:"#fff", flexShrink:0 }}>
        {logoOk
          ? <img src={p.logoBase64 || "/images/abhijit_art_logo.png"} alt={p.biz.name} style={{ width:54,height:54,objectFit:"contain",flexShrink:0 }} onError={()=>setLogoOk(false)}/>
          : <div style={{ width:54,height:54,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:PEACH,border:`1px solid ${RULE}`,borderRadius:"50%",fontSize:13,fontWeight:800,color:ORANGE }}>{(p.biz.name||"").slice(0,2)}</div>}

        <div style={{ width:1, alignSelf:"stretch", background:RULE, margin:"2px 4px", flexShrink:0 }}/>

        <div style={{ flex:1, minWidth:0 }}>
          {p.biz.name && <div style={{ fontSize:17,fontWeight:900,color:INKC,lineHeight:1.1 }}>{p.biz.name}</div>}
          {p.biz.address && <div style={{ fontSize:8.5,color:SOFT,marginTop:3,lineHeight:1.4,whiteSpace:"pre-line" as const }}>{p.biz.address}</div>}
          <div style={{ fontSize:8.5,color:SOFT,marginTop:3,display:"flex",flexDirection:"column" as const,gap:1.5 }}>
            {p.biz.phone && <span>{p.biz.phone}</span>}
            {p.biz.email && <span>{p.biz.email}</span>}
            {p.biz.gstin && <span>GSTIN: {p.biz.gstin}</span>}
            {p.biz.pan && <span>PAN: {p.biz.pan}</span>}
          </div>
        </div>

        <div style={{ textAlign:"right" as const, flexShrink:0, alignSelf:"flex-start" }}>
          <div style={{ fontSize:14,fontWeight:900,letterSpacing:3,color:ORANGE,marginBottom:6 }}>INVOICE</div>
                    {[{l:"Invoice No",v:p.invNo},{l:"Invoice Date",v:fmtDate(p.date)}].map(r=>(
            <div key={r.l} style={{ marginTop:3 }}>
              <div style={{ fontSize:7,fontWeight:700,color:SOFT,textTransform:"uppercase" as const,letterSpacing:.5 }}>{r.l}</div>
              <div style={{ fontSize:10.5,fontWeight:800,color:INKC,marginTop:1 }}>{r.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bill To ────────────────────────────────────────────── */}
      <div style={{ padding:"10px 14px 11px", borderBottom:`1px solid ${RULE}`, background:"#fff", flexShrink:0 }}>
        <div style={{ fontSize:7.5,fontWeight:700,color:ORANGE,textTransform:"uppercase" as const,letterSpacing:.9,marginBottom:4 }}>Bill To</div>
        <div style={{ fontSize:13,fontWeight:800,color:INKC,lineHeight:1.2 }}>{p.client.name||"—"}</div>
        {p.client.address && <div style={{ fontSize:8.5,color:SOFT,marginTop:2 }}>{p.client.address}</div>}
        <div style={{ fontSize:8.5,color:SOFT,marginTop:2,display:"flex",flexWrap:"wrap" as const,gap:"2px 10px" }}>
          {p.client.phone && <span>{p.client.phone}</span>}
          {p.client.gstin && <span>GSTIN: {p.client.gstin}</span>}
        </div>
      </div>

      {/* ── Purpose ────────────────────────────────────────────── */}
      {p.purpose?.trim() && (
        <div style={{ display:"flex", alignItems:"baseline", gap:8, padding:"7px 14px", borderBottom:`1px solid ${RULE}`, background:"#fff", flexShrink:0 }}>
          <span style={{ fontSize:7.5,fontWeight:700,color:ORANGE,textTransform:"uppercase" as const,letterSpacing:.9,flexShrink:0 }}>Purpose</span>
          <span style={{ fontSize:10,fontWeight:700,color:INKC,lineHeight:1.3 }}>{p.purpose}</span>
        </div>
      )}

      {/* ── Items ──────────────────────────────────────────────── */}
      <div style={{ flex:1, minHeight:0, overflow:"hidden", display:"flex", flexDirection:"column" as const }}>
        <table style={{ width:"100%", borderCollapse:"collapse" as const }}>
          <thead>
            <tr>
              {[
                { t:"No.",   w:26 as number|undefined, a:"center" as const },
                { t:"Description", w:undefined,        a:"left"   as const },
                { t:"Size",  w:52,                     a:"center" as const },
                ...(anyPcs ? [{ t:"Pcs", w:34, a:"center" as const }] : []),
                { t:"Qty",   w:52,                     a:"right"  as const },
                { t:"Rate",  w:62,                     a:"right"  as const },
                ...(discountAmt>0 ? [{ t:"Disc.", w:46, a:"right" as const }] : []),
                ...(num(p.taxPct)>0 ? [{ t:"Tax", w:40, a:"right" as const }] : []),
                { t:"Amount", w:64, a:"right" as const },
              ].map((h, hi) => (
                <th key={h.t+hi} style={{ background:PEACH, color:"#7a5240", padding:"7px 8px", fontSize:8, fontWeight:700, textAlign:h.a, width:h.w, borderTop:`1px solid ${RULE}`, borderBottom:`1px solid ${RULE}`, letterSpacing:.3 }}>{h.t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleItems.length === 0
              ? <tr><td colSpan={cols} style={{ textAlign:"center" as const,color:"#c4bdb2",padding:"20px 0",fontSize:10 }}>No items yet</td></tr>
              : visibleItems.map((it, i) => {
                  const lt = num(it.qty)*num(it.rate);
                  const ld = discountAmt>0&&subtotal>0?(lt/subtotal)*discountAmt:0;
                  const lx = taxAmt>0&&subtotal>0?(lt/subtotal)*taxAmt:0;
                  const td = { padding:"7px 8px", borderBottom:`.5px solid #f6ece4`, fontSize:9.5 };
                  const hasSize = num(it.width)>0 && num(it.height)>0;
                  const u = it.unit ? String(it.unit) : "";
                  const pc = num(it.pcs) > 0 ? num(it.pcs) : 1;
                  return (
                    <tr key={it.id}>
                      <td style={{ ...td, textAlign:"center" as const, color:"#b3ab9f" }}>{i+1}.</td>
                      <td style={{ ...td, fontWeight:600 }}>{it.desc||"—"}</td>
                      <td style={{ ...td, textAlign:"center" as const, color:SOFT, whiteSpace:"nowrap" as const }}>{hasSize ? `${num(it.width)} × ${num(it.height)}` : "—"}</td>
                      {anyPcs && <td style={{ ...td, textAlign:"center" as const, color:SOFT }}>{hasSize ? pc : "—"}</td>}
                      <td style={{ ...td, textAlign:"right" as const, whiteSpace:"nowrap" as const }}>{num(it.qty)}{u?` ${u}`:""}</td>
                      <td style={{ ...td, textAlign:"right" as const, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" as const }}>₹{num(it.rate).toLocaleString("en-IN")}{u?`/${u}`:""}</td>
                      {discountAmt>0&&<td style={{ ...td, textAlign:"right" as const, fontVariantNumeric:"tabular-nums", color:SOFT }}>₹{Math.round(ld).toLocaleString("en-IN")}</td>}
                      {num(p.taxPct)>0&&<td style={{ ...td, textAlign:"right" as const, fontVariantNumeric:"tabular-nums", color:SOFT }}>{Math.round(lx).toLocaleString("en-IN")}</td>}
                      <td style={{ ...td, textAlign:"right" as const, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>₹{Math.round(lt-ld+lx).toLocaleString("en-IN")}</td>
                    </tr>
                  );
                })}
          </tbody>
          <tfoot>
            <tr style={{ background:PEACH, fontWeight:800 }}>
              <td style={{ padding:"8px", fontSize:10, borderTop:`1px solid ${RULE}` }} colSpan={anyPcs ? 4 : 3}>Subtotal</td>
              <td style={{ padding:"8px", textAlign:"right" as const, fontSize:10, borderTop:`1px solid ${RULE}` }}>{visibleItems.reduce((s,it)=>s+num(it.qty),0)}</td>
              <td style={{ padding:"8px", textAlign:"right" as const, fontSize:10, borderTop:`1px solid ${RULE}`, fontVariantNumeric:"tabular-nums" }}>{Math.round(subtotal).toLocaleString("en-IN")}</td>
              {discountAmt>0&&<td style={{ padding:"8px", textAlign:"right" as const, fontSize:10, borderTop:`1px solid ${RULE}`, fontVariantNumeric:"tabular-nums" }}>₹{Math.round(discountAmt).toLocaleString("en-IN")}</td>}
              {num(p.taxPct)>0&&<td style={{ padding:"8px", textAlign:"right" as const, fontSize:10, borderTop:`1px solid ${RULE}`, fontVariantNumeric:"tabular-nums" }}>{Math.round(taxAmt).toLocaleString("en-IN")}</td>}
              <td style={{ padding:"8px", textAlign:"right" as const, fontSize:10, borderTop:`1px solid ${RULE}`, fontVariantNumeric:"tabular-nums" }}>₹{Math.round(taxable).toLocaleString("en-IN")}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Bottom: terms + QR + signature | totals ───────────── */}
      <div style={{ display:"flex", borderTop:`1px solid ${RULE}`, flexShrink:0 }}>
        <div style={{ flex:1.15, padding:"10px 13px", display:"flex", flexDirection:"column" as const, gap:7, borderRight:`1px solid ${RULE}` }}>
          <div>
            <div style={{ fontSize:9,fontWeight:800,color:ORANGE,marginBottom:2 }}>Terms &amp; Conditions</div>
            <div style={{ fontSize:8,color:SOFT,lineHeight:1.5 }}>{p.notes?.trim() || "Keep the invoices for Future References"}</div>
          </div>
          {p.warranty?.trim() && (
            <div>
              <div style={{ fontSize:9,fontWeight:800,color:ORANGE,marginBottom:2 }}>Warranty</div>
              <div style={{ fontSize:8,color:SOFT,lineHeight:1.5 }}>{p.warranty}</div>
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
              <div style={{ width:56,borderBottom:".5px solid #b3ab9f",margin:"3px auto 2px" }}/>
              <div style={{ fontSize:7,color:SOFT }}>Authorised Signatory</div>
            </div>
          </div>
        </div>

        <div style={{ flex:1, padding:"10px 13px", display:"flex", flexDirection:"column" as const, gap:2 }}>
                              {cgst > 0 && [
            {l:`CGST @${num(p.taxPct)/2}%`,v:`₹${cgst.toFixed(2)}`},
            {l:`SGST @${num(p.taxPct)/2}%`,v:`₹${cgst.toFixed(2)}`},
          ].map(r => (
            <div key={r.l} style={{ display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`.5px solid #f6ece4`,fontSize:9.5,color:SOFT }}>
              <span>{r.l}</span><span style={{ fontVariantNumeric:"tabular-nums", color:INKC, fontWeight:600 }}>{r.v}</span>
            </div>
          ))}
          <div style={{ background:PEACH,border:`1px solid ${RULE}`,padding:"10px 11px",marginTop:6 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:10,fontWeight:700,color:"#7a5240" }}>
              <span>Total Amount</span><span style={{ fontSize:17,fontWeight:900,fontVariantNumeric:"tabular-nums",color:ORANGE }}>₹{total.toFixed(2)}</span>
            </div>
            {p.advancePaid > 0 && (
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,marginTop:5,paddingTop:5,borderTop:`1px solid ${RULE}`,color:SOFT }}>
                <span>Amount Received</span><span style={{ color:"#15803d",fontWeight:700,fontVariantNumeric:"tabular-nums" }}>−₹{p.advancePaid.toFixed(2)}</span>
              </div>
            )}
            {p.balanceDue > 0 && (
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:9.5,marginTop:4,color:"#7a5240",fontWeight:700 }}>
                <span>Balance Due</span><span style={{ fontVariantNumeric:"tabular-nums" }}>₹{p.balanceDue.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div style={{ padding:"5px 2px",marginTop:4 }}>
            <div style={{ fontSize:7.5,fontWeight:700,color:ORANGE,marginBottom:1 }}>Total Amount (in words)</div>
            <div style={{ fontSize:9,color:INKC,fontWeight:600,lineHeight:1.35 }}>{amtWords(total)}</div>
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px 11px", flexShrink:0 }}>
        <div style={{ flex:1, height:1, background:ORANGE, opacity:.4 }}/>
        <span style={{ fontSize:11, fontWeight:800, color:ORANGE, fontStyle:"italic", whiteSpace:"nowrap" as const }}>
          Thank you for your business!
        </span>
        <div style={{ flex:1, height:1, background:ORANGE, opacity:.4 }}/>
      </div>
    </div>
  );

  const labelRow = (note: string) => (
    <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:8 }}>
      <span style={{ fontSize:11, fontWeight:700, letterSpacing:.8, textTransform:"uppercase" as const, color:MUTE }}>Preview</span>
      <span style={{ fontSize:10.5, color:MUTE }}>{note}</span>
    </div>
  );

  if (half) {
    return (
      <div style={{ position:"sticky", top:20, minWidth:0 }}>
        {labelRow("6 × 8 inch")}
        <div style={{ width:"100%", aspectRatio:"6 / 8", border:"1px solid #e8dcd0", boxShadow:"0 4px 20px rgba(0,0,0,.10)", overflow:"hidden" }}>
          {renderCard()}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:"sticky", top:20, minWidth:0 }}>
      {labelRow("A4 · 210 × 297 mm")}
      <div style={{ width:"100%", aspectRatio:"210 / 297", border:"1px solid #e8dcd0", boxShadow:"0 4px 20px rgba(0,0,0,.10)", overflow:"hidden" }}>
        {renderCard()}
      </div>
    </div>
  );
}