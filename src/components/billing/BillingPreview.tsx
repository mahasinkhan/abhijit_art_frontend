// src/components/billing/BillingPreview.tsx
import { useState } from "react";
import {
  LineItem, Party, Totals,
  INK, MUTE, LINE, CARD, TERRA, GREEN, GOLD,
  rupee, num, dec, fmtDate, amtWords,
} from "./types";

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
}

export default function BillingPreview(p: Props) {
  const [logoOk, setLogoOk] = useState(true);
  const { subtotal, discountAmt, taxAmt, total } = p.totals;
  const taxable = subtotal - discountAmt;
  const cgst = taxAmt / 2;
  const visibleItems = p.items.filter(it => it.desc.trim() || num(it.rate) > 0);

  return (
    <div style={{ position:"sticky", top:20, minWidth:0 }}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:.8, textTransform:"uppercase" as const, color:MUTE, marginBottom:8 }}>
        Preview
      </div>

      <div style={{ background:CARD, border:"1px solid #e0d8c8", fontFamily:"'Inter',Arial,sans-serif", fontSize:7, color:"#1a1a2e", display:"flex", flexDirection:"column" as const, boxShadow:"0 2px 12px rgba(0,0,0,.12)" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 8px 5px", borderBottom:"2px solid #e89a3c", background:"linear-gradient(135deg,#fff2e6 0%,#fff8f0 50%,#fff 100%)" }}>
          {p.logoBase64
            ? <img src={p.logoBase64} alt={p.biz.name} style={{ width:44,height:44,objectFit:"contain",flexShrink:0 }}/>
            : logoOk
              ? <img src="/images/abhijit_art_logo.png" alt={p.biz.name} style={{ width:44,height:44,objectFit:"contain",flexShrink:0 }} onError={()=>setLogoOk(false)}/>
              : <div style={{ width:44,height:44,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#f0e8d0",border:"1px solid #c8a84b",borderRadius:"50%",fontSize:7,fontWeight:800,color:"#8a6a1c" }}>{(p.biz.name||"AA").slice(0,2)}</div>}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:10,fontWeight:900,color:"#c56a3a",lineHeight:1.1 }}>{p.biz.name||"Abhijit Art"}</div>
            {p.biz.pan && <div style={{ fontSize:5.5,color:"#444",fontWeight:600,marginTop:1 }}>Pan No &nbsp;<b>{p.biz.pan}</b></div>}
            {p.biz.address && <div style={{ fontSize:5,color:"#666",marginTop:1 }}>📍 {p.biz.address}</div>}
            <div style={{ fontSize:5,color:"#666",marginTop:1,display:"flex",flexWrap:"wrap" as const,gap:5 }}>
              {p.biz.phone && <span>📞 {p.biz.phone}</span>}
              {p.biz.email && <span>✉ {p.biz.email}</span>}
              {p.biz.gstin && <span>GSTIN: {p.biz.gstin}</span>}
            </div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0, alignSelf:"center" }}>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              {[{l:"Invoice Date",v:fmtDate(p.date)},{l:"Invoice No",v:`#${p.invNo}`}].map(r=>(
                <div key={r.l} style={{ textAlign:"right" }}>
                  <div style={{ fontSize:5,fontWeight:700,color:"#8a8f9a",textTransform:"uppercase" as const,letterSpacing:.4 }}>{r.l}</div>
                  <div style={{ fontSize:7,fontWeight:800,color:"#c56a3a",marginTop:1 }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div style={{ padding:"4px 8px",borderBottom:"1px solid #f0e0d0",background:"linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)" }}>
          <div style={{ fontSize:5.5,fontWeight:800,color:"#c56a3a",textTransform:"uppercase" as const,letterSpacing:.6,paddingBottom:1,borderBottom:"1.5px solid #e89a3c",display:"inline-block",marginBottom:2 }}>Bill To</div>
          <div style={{ fontSize:7,fontWeight:700 }}>{p.client.name||"—"}</div>
          {p.client.address && <div style={{ fontSize:5.5,color:"#555",marginTop:1 }}>{p.client.address}</div>}
          {p.client.phone   && <div style={{ fontSize:5.5,color:"#555",marginTop:1 }}>📞 {p.client.phone}</div>}
          {p.client.gstin   && <div style={{ fontSize:5.5,color:"#555",marginTop:1 }}>GSTIN: {p.client.gstin}</div>}
        </div>

        {/* Items table */}
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:6 }}>
          <thead>
            <tr>
              <th style={{ background:"#c56a3a",color:"#fff",padding:"2px 3px",fontSize:5.5,fontWeight:700,textAlign:"left",width:20,textAlign:"center" as const }}>No</th>
              <th style={{ background:"#c56a3a",color:"#fff",padding:"2px 3px",fontSize:5.5,fontWeight:700,textAlign:"left" }}>Items</th>
              <th style={{ background:"#c56a3a",color:"#fff",padding:"2px 3px",fontSize:5.5,fontWeight:700,textAlign:"right",width:28 }}>Qty</th>
              <th style={{ background:"#c56a3a",color:"#fff",padding:"2px 3px",fontSize:5.5,fontWeight:700,textAlign:"right",width:50 }}>Rate</th>
              {discountAmt > 0 && <th style={{ background:"#c56a3a",color:"#fff",padding:"2px 3px",fontSize:5.5,fontWeight:700,textAlign:"right",width:44 }}>Disc.</th>}
              {num(p.taxPct) > 0 && <th style={{ background:"#c56a3a",color:"#fff",padding:"2px 3px",fontSize:5.5,fontWeight:700,textAlign:"right",width:38 }}>Tax</th>}
              <th style={{ background:"#c56a3a",color:"#fff",padding:"2px 3px",fontSize:5.5,fontWeight:700,textAlign:"right",width:54 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.length === 0
              ? <tr><td colSpan={6} style={{ textAlign:"center",color:"#aaa",padding:"4px" }}>No items yet</td></tr>
              : visibleItems.map((it, i) => {
                  const lt = num(it.qty)*num(it.rate);
                  const ld = discountAmt>0&&subtotal>0?(lt/subtotal)*discountAmt:0;
                  const lx = taxAmt>0&&subtotal>0?(lt/subtotal)*taxAmt:0;
                  return (
                    <tr key={it.id}>
                      <td style={{ padding:"2px 3px",borderBottom:".5px solid #ede8dc",textAlign:"center",color:"#aaa" }}>{i+1}.</td>
                      <td style={{ padding:"2px 3px",borderBottom:".5px solid #ede8dc" }}>{it.desc||"—"}</td>
                      <td style={{ padding:"2px 3px",borderBottom:".5px solid #ede8dc",textAlign:"right" }}>{num(it.qty)}</td>
                      <td style={{ padding:"2px 3px",borderBottom:".5px solid #ede8dc",textAlign:"right",fontVariantNumeric:"tabular-nums" }}>₹{num(it.rate).toLocaleString("en-IN")}</td>
                      {discountAmt>0&&<td style={{ padding:"2px 3px",borderBottom:".5px solid #ede8dc",textAlign:"right",fontVariantNumeric:"tabular-nums" }}>₹{Math.round(ld).toLocaleString("en-IN")}</td>}
                      {num(p.taxPct)>0&&<td style={{ padding:"2px 3px",borderBottom:".5px solid #ede8dc",textAlign:"right",fontVariantNumeric:"tabular-nums" }}>{Math.round(lx).toLocaleString("en-IN")}</td>}
                      <td style={{ padding:"2px 3px",borderBottom:".5px solid #ede8dc",textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums" }}>₹{Math.round(lt-ld+lx).toLocaleString("en-IN")}</td>
                    </tr>
                  );
                })}
          </tbody>
          <tfoot>
            <tr style={{ background:"linear-gradient(135deg,#fff0e0 0%,#fdf4ea 100%)",fontWeight:800 }}>
              <td style={{ padding:"2px 3px",textAlign:"center" }}>Sub.</td>
              <td style={{ padding:"2px 3px" }}><b>SUBTOTAL</b></td>
              <td style={{ padding:"2px 3px",textAlign:"right" }}>{visibleItems.reduce((s,it)=>s+num(it.qty),0)}</td>
              <td style={{ padding:"2px 3px",textAlign:"right",fontVariantNumeric:"tabular-nums" }}>{Math.round(subtotal).toLocaleString("en-IN")}</td>
              {discountAmt>0&&<td style={{ padding:"2px 3px",textAlign:"right",fontVariantNumeric:"tabular-nums" }}>₹{Math.round(discountAmt).toLocaleString("en-IN")}</td>}
              {num(p.taxPct)>0&&<td style={{ padding:"2px 3px",textAlign:"right",fontVariantNumeric:"tabular-nums" }}>{Math.round(taxAmt).toLocaleString("en-IN")}</td>}
              <td style={{ padding:"2px 3px",textAlign:"right",fontVariantNumeric:"tabular-nums" }}>₹{Math.round(taxable).toLocaleString("en-IN")}</td>
            </tr>
          </tfoot>
        </table>

        {/* Bottom */}
        <div style={{ display:"flex",flex:1,borderTop:"1px solid #e8e0cc",minHeight:80 }}>
          {/* Left: terms + QR + sig */}
          <div style={{ flex:1.1,padding:"5px 7px",display:"flex",flexDirection:"column" as const,gap:3,borderRight:"1px solid #e8e0cc" }}>
            {(p.notes||"").trim() && <div><div style={{ fontSize:5.5,fontWeight:800,color:"#c56a3a",marginBottom:1 }}>Terms & Conditions</div><div style={{ fontSize:5,color:"#555",lineHeight:1.4 }}>{p.notes}</div></div>}
            <div style={{ display:"flex",gap:5,alignItems:"flex-end",marginTop:"auto" }}>
              {p.qrBase64 && (
                <div style={{ display:"flex",flexDirection:"column" as const,alignItems:"center",gap:1 }}>
                  <div style={{ fontSize:4.5,fontWeight:700,color:"#c56a3a",textAlign:"center" }}>Payment QR</div>
                  <img src={p.qrBase64} alt="QR" style={{ width:56,height:56,objectFit:"contain",border:".5px solid #ddd" }}/>
                  <div style={{ fontSize:4,color:"#555",textAlign:"center" }}>UPI: 9932913826@okbizaxis</div>
                </div>
              )}
              <div style={{ flex:1,display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"flex-end",textAlign:"center" }}>
                {p.sigBase64 && <img src={p.sigBase64} alt="Signature" style={{ height:18,width:"auto",display:"block",margin:"0 auto 2px" }}/>}
                <div style={{ width:28,borderBottom:".5px solid #888",margin:"2px auto 1px" }}/>
                <div style={{ fontSize:4.5,color:"#555" }}>Authorised Signatory</div>
              </div>
            </div>
          </div>

          {/* Right: totals */}
          <div style={{ flex:1,padding:"5px 7px",display:"flex",flexDirection:"column" as const,gap:2 }}>
            {[
              { l:"Taxable Amount", v:`₹${taxable.toFixed(2)}` },
              ...(cgst>0?[{l:`CGST @${num(p.taxPct)/2}%`,v:`₹${cgst.toFixed(2)}`},{l:`SGST @${num(p.taxPct)/2}%`,v:`₹${cgst.toFixed(2)}`}]:[]),
              ...(p.advancePaid>0?[{l:"Amount Received",v:`−₹${p.advancePaid.toFixed(2)}`,green:true}]:[]),
            ].map(r => (
              <div key={r.l} style={{ display:"flex",justifyContent:"space-between",padding:"1px 0",borderBottom:".5px solid #ede8dc",fontSize:6.5 }}>
                <span>{r.l}</span><span style={r.green?{color:"#15803d"}:{}}>{r.v}</span>
              </div>
            ))}
            <div style={{ background:"#c56a3a",color:"#fff",padding:"3px 4px",marginTop:2 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",fontSize:6.5,fontWeight:700 }}>
                <span>Total Amount</span><span style={{ fontSize:10,fontWeight:800,fontVariantNumeric:"tabular-nums" }}>₹{total.toFixed(2)}</span>
              </div>
              {p.balanceDue>0 && <div style={{ display:"flex",justifyContent:"space-between",fontSize:5.5,color:"#ffccaa",marginTop:1 }}><span>Balance Due</span><span>₹{p.balanceDue.toFixed(2)}</span></div>}
            </div>
            <div style={{ border:".5px solid #f0d8c0",padding:"2px 3px",marginTop:2,background:"linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)" }}>
              <div style={{ fontSize:5,fontWeight:700,color:"#c56a3a",marginBottom:1 }}>Total Amount (in words)</div>
              <div style={{ fontSize:5.5,color:"#333",fontWeight:600 }}>{amtWords(total)}</div>
            </div>
            <div style={{ textAlign:"right",fontSize:7,fontWeight:800,color:"#c56a3a",marginTop:"auto",paddingTop:6,fontStyle:"italic" }}>Thank you for your business!</div>
          </div>
        </div>
      </div>
    </div>
  );
}