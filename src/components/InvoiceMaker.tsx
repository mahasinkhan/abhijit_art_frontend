import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";

const INK = "#1f2430";
const BODY = "#545a67";
const MUTE = "#8a8f9a";
const FAINT = "#b6bac3";
const LINE = "#f0e6dc";
const LINE_COOL = "#ececf1";
const SOFT = "#fafbfc";
const CARD = "#ffffff";
const TERRA = "#d9542f";
const TERRA_DK = "#c8481f";
const GREEN = "#15733f";
const WA = "#1fa855";
const WA_DK = "#178544";
const SANS = "'DM Sans', system-ui, sans-serif";
const GLOW = "radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.075) 0%, rgba(217,84,47,.022) 42%, rgba(217,84,47,0) 72%), linear-gradient(180deg, #fffcf9 0%, #ffffff 60%)";
const GLOW_SHADOW = "0 1px 2px rgba(17,20,30,.04), 0 10px 26px -18px rgba(217,84,47,.28)";

const rupee = (n: number) => "₹" + (Number.isFinite(n) ? n : 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: any) => { const n = parseFloat(String(v)); return Number.isFinite(n) ? n : 0; };

type Item = { id: string; desc: string; qty: string; rate: string };
type Party = { name: string; address: string; phone: string; email: string; gstin: string; pan: string };
type PayMethod = "cash" | "online";
type CustomerLite = { name: string; phone: string; email: string; gstin: string; address: string };

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);

const BIZ_KEY = "aa_invoice_business_v4";
const loadBiz = (): Party => {
  try { const s = localStorage.getItem(BIZ_KEY); if (s) return JSON.parse(s); } catch {}
  return { name: "Abhijit Art", address: "Rabindra Sadan, Shakti Mandir Club, SS Sen Road\nBerhampore, West Bengal - 742101", phone: "7478482106 (Office) | 9932913826 (Abhijit)", email: "abhijitart85@gmail.com", gstin: "19AQFPD8346K1ZH", pan: "AQFPD8346K" };
};

const AUTOSAVE_KEY = "aa_invoice_autosave";
const loadAutosave = (): "on" | "off" | "" => { try { const v = localStorage.getItem(AUTOSAVE_KEY); return v === "on" || v === "off" ? v : ""; } catch { return ""; } };

const nextInvoiceNo = () => {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  let seq = 1;
  try { seq = (parseInt(localStorage.getItem("aa_invoice_seq") || "0", 10) || 0) + 1; } catch { seq = Math.floor(Math.random() * 900) + 100; }
  return `AA-${stamp}-${String(seq).padStart(3, "0")}`;
};

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const map: Record<string, JSX.Element> = {
    plus: <path d="M12 5v14M5 12h14" {...p} />,
    trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" {...p} />,
    download: (<><path d="M12 3v12M7 10l5 5 5-5" {...p} /><path d="M5 21h14" {...p} /></>),
    reset: <path d="M20 11a8 8 0 1 0-1.5 5.5M20 5v6h-6" {...p} />,
    receipt: <path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21zM9 8h6M9 12h6M9 16h4" {...p} />,
    mail: <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3.2 6.5 12 13l8.8-6.5" {...p} />,
    send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" {...p} />,
    check: <path d="M20 6 9 17l-5-5" {...p} />,
    x: <path d="M18 6 6 18M6 6l12 12" {...p} />,
    user: (<><circle cx="12" cy="8" r="4" {...p} /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" {...p} /></>),
    banknote: (<><rect x="2" y="6" width="20" height="12" rx="2" {...p} /><circle cx="12" cy="12" r="2.5" {...p} /><path d="M6 12h.01M18 12h.01" {...p} /></>),
    card: (<><rect x="2.5" y="5" width="19" height="14" rx="2" {...p} /><path d="M2.5 9.5h19" {...p} /></>),
    save: (<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" {...p} /><path d="M17 21v-8H7v8M7 3v5h8" {...p} /></>),
    whatsapp: (<><path d="M3.8 20.2 5 16.4A8.4 8.4 0 1 1 8.2 19l-4.4 1.2z" {...p} /><path d="M9.2 8.6c-.15 0-.4.05-.6.3-.2.25-.75.73-.75 1.77s.77 2.05.88 2.2c.1.14 1.5 2.4 3.68 3.28 1.83.72 2.2.58 2.6.55.4-.04 1.24-.5 1.42-1 .18-.5.18-.9.12-1l-.55-.27s-1.05-.52-1.22-.58c-.16-.06-.28-.1-.4.1l-.55.7c-.1.12-.2.13-.37.05-.16-.08-.9-.33-1.66-1.05-.6-.55-1.02-1.22-1.14-1.42-.1-.2-.01-.3.07-.4l.28-.35c.1-.12.13-.2.2-.34.06-.13.03-.25 0-.35-.05-.1-.4-1.13-.6-1.55-.14-.3-.28-.3-.4-.3H9.2z" fill="currentColor" stroke="none" /></>),
  };
  return (<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>{map[name]}</svg>);
}

function Field({ label, children, half, hint }: { label: string; children: React.ReactNode; half?: boolean; hint?: string }) {
  return (
    <label style={{ ...st.field, ...(half ? { flex: 1, minWidth: 0 } : {}) }}>
      <span style={st.fieldLabel}>{label}{hint && <span style={st.fieldHint}> · {hint}</span>}</span>
      {children}
    </label>
  );
}


/* ═══════════════════════════════════════════════
   buildTwoUpA4HTML — 2 identical invoices on A4
   Top half + bottom half, dashed cut line between
   ═══════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════
   buildSingleHalfA4HTML
   1 invoice on top half of A4, bottom half blank.
   Print → cut → 2 physical copies from 2 sheets.
   ═══════════════════════════════════════════════════ */
function buildSingleHalfA4HTML(p: Parameters<typeof buildInvoicePopupHTML>[0]): string {
  const e=(s:any)=>String(s??"").replace(/[&<>"']/g,(c:string)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":'&#39;'}[c]as string));
  const fmtN=(n:number)=>Math.round(n).toLocaleString("en-IN");
  const taxable=p.subtotal-p.discountAmt; const cgst=p.taxAmt/2; const due=Math.max(p.total-p.paidAmount,0);
  function amtWords(n:number):string{const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];const m=Math.round(n);if(m===0)return"Zero Only";function b(x:number):string{if(x<20)return ones[x];if(x<100)return tens[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");return ones[Math.floor(x/100)]+" Hundred"+(x%100?" "+b(x%100):"");}let r="";if(m>=10000000)r+=b(Math.floor(m/10000000))+" Crore ";if(m>=100000)r+=b(Math.floor((m%10000000)/100000))+" Lakh ";if(m>=1000)r+=b(Math.floor((m%100000)/1000))+" Thousand ";r+=b(m%1000);return r.trim()+" Only";}
  const rows=p.items.map((it,i)=>{const lt=it.qty*it.rate;const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0;const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0;return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td r">${it.qty}</td><td class="td r">₹${fmtN(it.rate)}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}<br/><small>${p.discType==="percent"?p.discVal+"%":""}</small></td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}<br/><small>${p.taxPct}%</small></td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`;}).join("");
  const css=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}body{font-family:'Inter',Arial,sans-serif;font-size:8pt;color:#1a1a2e;background:#f0ece4;display:flex;justify-content:center;padding:6px}.page{width:210mm;height:297mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.18);display:flex;flex-direction:column}.inv{height:148.5mm;display:flex;flex-direction:column;overflow:hidden;border-bottom:2px dashed #aaa}.blank{flex:1;background:#fff}.hdr{display:flex;align-items:center;gap:3mm;padding:3mm 4mm 2.5mm;border-bottom:2.5px solid #e89a3c;background:linear-gradient(135deg,#fff2e6 0%,#fff8f0 50%,#fff 100%);flex-shrink:0}.logo{width:24mm;height:24mm;object-fit:contain;flex-shrink:0}.logo-fb{width:14mm;height:14mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f0e8d0;border:1px solid #c8a84b;border-radius:50%;font-size:7pt;font-weight:800;color:#8a6a1c}.biz{flex:1}.biz-name{font-size:12pt;font-weight:900;color:#c56a3a;line-height:1.1}.biz-pan{font-size:6.5pt;color:#444;font-weight:600;margin-top:.5mm}.biz-addr{font-size:5.5pt;color:#666;margin-top:.5mm}.biz-sub{font-size:5.5pt;color:#666;margin-top:.3mm;display:flex;flex-wrap:wrap;gap:2.5mm}.inv-meta{text-align:right;flex-shrink:0;align-self:center}.inv-row{display:flex;gap:4mm;justify-content:flex-end}.inv-col{text-align:right}.inv-lbl{font-size:6pt;font-weight:700;color:#8a8f9a;text-transform:uppercase;letter-spacing:.4px}.inv-val{font-size:8pt;font-weight:800;color:#c56a3a;margin-top:.3mm}.inv-time{font-size:5.5pt;font-weight:600;color:#888;margin-top:.2mm}.billto{padding:2mm 4mm;border-bottom:1px solid #f0e0d0;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%);flex-shrink:0}.bt-lbl{font-size:6.5pt;font-weight:800;color:#c56a3a;text-transform:uppercase;letter-spacing:.6px;padding-bottom:.8mm;border-bottom:1.5px solid #e89a3c;display:inline-block;margin-bottom:.8mm}.bt-name{font-size:8pt;font-weight:700}.bt-line{font-size:5.5pt;color:#555;margin-top:.3mm}.tbl{width:100%;border-collapse:collapse;flex-shrink:0}.th{background:#c56a3a;color:#fff;padding:1.8mm 2mm;font-size:6pt;font-weight:700;text-align:left}.td{padding:1.8mm 2mm;border-bottom:.5px solid #ede8dc;font-size:7pt;vertical-align:top}.td small{font-size:5pt;color:#888;display:block}.sub-row td{background:#f5f0e8;font-weight:800;font-size:8.5pt;padding:1.5mm 2mm;border-top:1.5px solid #c8a84b}.r{text-align:right}.c{text-align:center}.bold{font-weight:700}.bot{display:flex;flex:1;border-top:1px solid #e8e0cc;min-height:0}.bot-l{flex:1.1;padding:2.5mm 3.5mm;display:flex;flex-direction:column;gap:2mm;border-right:1px solid #e8e0cc}.bot-r{flex:1;padding:2.5mm 3.5mm;display:flex;flex-direction:column;gap:1mm}.t-lbl{font-size:6.5pt;font-weight:800;color:#c56a3a;margin-bottom:.3mm}.t-txt{font-size:5.5pt;color:#555;line-height:1.4}.qr-row{display:flex;gap:4mm;align-items:flex-end;margin-top:auto;padding-top:1mm}.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:1.5mm}.qr-img{width:34mm;height:34mm;object-fit:contain;border:.5px solid #ddd}.qr-lbl{font-size:6pt;font-weight:700;color:#c56a3a;text-align:center}.qr-badges{display:flex;gap:.8mm;flex-wrap:wrap;justify-content:center}.badge{font-size:4pt;font-weight:700;color:#c56a3a;border:.5px solid #e89a3c;padding:.2mm .8mm;background:#fff6ee}.qr-upi{font-size:4.5pt;color:#555;text-align:center}.sig{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}.sig-line{width:24mm;border-bottom:.5px solid #888;margin:.8mm auto .4mm}.sig-lbl{font-size:5pt;color:#555}.t-row{display:flex;justify-content:space-between;font-size:7pt;padding:1mm 0;border-bottom:.5px solid #ede8dc}.grand{background:#c56a3a;color:#fff;padding:2mm 2.5mm;margin-top:1.5mm}.g-row{display:flex;justify-content:space-between;align-items:baseline;font-size:8pt}.g-val{font-size:11pt;font-weight:900}.g-due{display:flex;justify-content:space-between;font-size:6.5pt;color:#ffccaa;margin-top:.3mm}.words{border:.5px solid #f0d8c0;padding:1.5mm 2mm;margin-top:1.5mm;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)}.w-lbl{font-size:5.5pt;font-weight:700;color:#c56a3a;margin-bottom:.3mm}.w-txt{font-size:6.5pt;color:#333;font-weight:600}.thankyou{text-align:right;font-size:8pt;font-weight:800;color:#c56a3a;margin-top:auto;padding-top:3mm;font-style:italic}@media print{@page{size:A4 portrait;margin:0}html,body{background:#fff !important;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}.page{box-shadow:none;border:none;width:100%;height:100vh}.inv{height:50vh}.blank{height:50vh}.th,.grand,.sub-row td,.hdr,.billto,.words{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head><body>
  <div class="page">
    <div class="inv">
      <div class="hdr">
        ${p.logoSrc?`<img src="${e(p.logoSrc)}" class="logo" onerror="this.style.display='none'"/>`:`<div class="logo-fb">${e(p.bizName.slice(0,2))}</div>`}
        <div class="biz"><div class="biz-name">${e(p.bizName)}</div>${p.bizPan?`<div class="biz-pan">Pan No &nbsp;<b>${e(p.bizPan)}</b></div>`:""}${p.bizAddress?`<div class="biz-addr">📍 ${e(p.bizAddress)}</div>`:""}<div class="biz-sub">${p.bizPhone?`<span>📞 ${e(p.bizPhone)}</span>`:""}${p.bizEmail?`<span>✉ ${e(p.bizEmail)}</span>`:""}${p.bizGstin?`<span>GSTIN: ${e(p.bizGstin)}</span>`:""}</div></div>
        <div class="inv-meta"><div class="inv-row"><div class="inv-col"><div class="inv-lbl">Invoice Date</div><div class="inv-val">${e(p.invDate)}</div>${p.invTime?`<div class="inv-time">${e(p.invTime)}</div>`:""}</div><div class="inv-col"><div class="inv-lbl">Invoice No</div><div class="inv-val">#${e(p.invNo)}</div></div></div></div>
      </div>
      <div class="billto"><div class="bt-lbl">Bill To</div><div class="bt-name">${e(p.clientName)||"—"}</div>${p.clientAddr?`<div class="bt-line">${e(p.clientAddr)}</div>`:""}${p.clientPhone?`<div class="bt-line">📞 ${e(p.clientPhone)}</div>`:""}${p.clientGstin?`<div class="bt-line">GSTIN: ${e(p.clientGstin)}</div>`:""}</div>
      <table class="tbl"><thead><tr><th class="th c" style="width:6mm">No</th><th class="th">Items</th><th class="th r" style="width:9mm">Qty</th><th class="th r" style="width:15mm">Rate</th>${p.discountAmt>0?`<th class="th r" style="width:13mm">Disc.</th>`:""}${p.taxPct>0?`<th class="th r" style="width:12mm">Tax</th>`:""}<th class="th r" style="width:16mm">Total</th></tr></thead><tbody>${rows||`<tr><td colspan="6" class="td c" style="color:#aaa">No items</td></tr>`}</tbody><tfoot><tr class="sub-row"><td class="c">Sub.</td><td><b>SUBTOTAL</b></td><td class="r">${p.items.reduce((s,it)=>s+it.qty,0)}</td><td class="r">${fmtN(p.subtotal)}</td>${p.discountAmt>0?`<td class="r">₹${fmtN(p.discountAmt)}</td>`:""}${p.taxPct>0?`<td class="r">${fmtN(p.taxAmt)}</td>`:""}<td class="r">₹${fmtN(taxable)}</td></tr></tfoot></table>
      <div class="bot">
        <div class="bot-l"><div><div class="t-lbl">Terms &amp; Conditions</div><div class="t-txt">${e(p.notes||"Keep the invoices for Future References")}</div></div>${p.warranty?`<div><div class="t-lbl">Warranty</div><div class="t-txt">${e(p.warranty)}</div></div>`:""}<div class="qr-row">${p.qrSrc?`<div class="qr-wrap"><div class="qr-lbl">Payment QR Code</div><img src="${e(p.qrSrc)}" class="qr-img"/><div class="qr-upi">UPI: 9932913826@okbizaxis</div></div>`:""}<div class="sig"><img src="/images/Signature.png" alt="Signature" style="height:11mm;width:auto;display:block;margin:8mm auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div></div></div>
        <div class="bot-r"><div class="t-row"><span>Taxable Amount</span><span>₹${taxable.toFixed(2)}</span></div>${cgst>0?`<div class="t-row"><span>CGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}${cgst>0?`<div class="t-row"><span>SGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}${p.paidAmount>0.005?`<div class="t-row"><span>Amount Received</span><span style="color:#15803d">−₹${p.paidAmount.toFixed(2)}</span></div>`:""}<div class="grand"><div class="g-row"><span>Total Amount</span><span class="g-val">₹${p.total.toFixed(2)}</span></div>${due>0.005?`<div class="g-due"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:""}</div><div class="words"><div class="w-lbl">Total Amount (in words)</div><div class="w-txt">${amtWords(p.total)}</div></div><div class="thankyou">Thank you for your business!</div></div>
      </div>
    </div>
    <div class="blank"></div>
  </div>
  <script>setTimeout(()=>window.print(),420)</script></body></html>`;
}


function buildTwoUpA4HTML(p: Parameters<typeof buildInvoicePopupHTML>[0]): string {
  const e=(s:any)=>String(s??"").replace(/[&<>"']/g,(c:string)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":'&#39;'}[c]as string));
  const fmtN=(n:number)=>Math.round(n).toLocaleString("en-IN");
  const taxable=p.subtotal-p.discountAmt; const cgst=p.taxAmt/2; const due=Math.max(p.total-p.paidAmount,0);
  function amtWords(n:number):string{const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];const m=Math.round(n);if(m===0)return"Zero Only";function b(x:number):string{if(x<20)return ones[x];if(x<100)return tens[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");return ones[Math.floor(x/100)]+" Hundred"+(x%100?" "+b(x%100):"");}let r="";if(m>=10000000)r+=b(Math.floor(m/10000000))+" Crore ";if(m>=100000)r+=b(Math.floor((m%10000000)/100000))+" Lakh ";if(m>=1000)r+=b(Math.floor((m%100000)/1000))+" Thousand ";r+=b(m%1000);return r.trim()+" Only";}
  const rows=p.items.map((it,i)=>{const lt=it.qty*it.rate;const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0;const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0;return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td r">${it.qty}</td><td class="td r">₹${fmtN(it.rate)}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}<br/><small>${p.discType==="percent"?p.discVal+"%":""}</small></td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}<br/><small>${p.taxPct}%</small></td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`;}).join("");

  const block = `
    <div class="inv">
      <div class="hdr">
        ${p.logoSrc?`<img src="${e(p.logoSrc)}" class="logo" onerror="this.style.display='none'"/>`:`<div class="logo-fb">${e(p.bizName.slice(0,2))}</div>`}
        <div class="biz">
          <div class="biz-name">${e(p.bizName)}</div>
          ${p.bizPan?`<div class="biz-pan">Pan No &nbsp;<b>${e(p.bizPan)}</b></div>`:""}
          ${p.bizAddress?`<div class="biz-addr">📍 ${e(p.bizAddress)}</div>`:""}
          <div class="biz-sub">${p.bizPhone?`<span>📞 ${e(p.bizPhone)}</span>`:""}${p.bizEmail?`<span>✉ ${e(p.bizEmail)}</span>`:""}${p.bizGstin?`<span>GSTIN: ${e(p.bizGstin)}</span>`:""}</div>
        </div>
        <div class="inv-meta">
          <div class="inv-row"><div class="inv-col"><div class="inv-lbl">Invoice Date</div><div class="inv-val">${e(p.invDate)}</div>${p.invTime?`<div class="inv-time">${e(p.invTime)}</div>`:""}</div><div class="inv-col"><div class="inv-lbl">Invoice No</div><div class="inv-val">#${e(p.invNo)}</div></div></div>
        </div>
      </div>
      <div class="billto">
        <div class="bt-lbl">Bill To</div>
        <div class="bt-name">${e(p.clientName)||"—"}</div>
        ${p.clientAddr?`<div class="bt-line">${e(p.clientAddr)}</div>`:""}
        ${p.clientPhone?`<div class="bt-line">📞 ${e(p.clientPhone)}</div>`:""}
        ${p.clientGstin?`<div class="bt-line">GSTIN: ${e(p.clientGstin)}</div>`:""}
      </div>
      <table class="tbl">
        <thead><tr>
          <th class="th c" style="width:6mm">No</th><th class="th">Items</th>
          <th class="th r" style="width:9mm">Qty</th><th class="th r" style="width:15mm">Rate</th>
          ${p.discountAmt>0?`<th class="th r" style="width:13mm">Disc.</th>`:""}
          ${p.taxPct>0?`<th class="th r" style="width:12mm">Tax</th>`:""}
          <th class="th r" style="width:16mm">Total</th>
        </tr></thead>
        <tbody>${rows||`<tr><td colspan="6" class="td c" style="color:#aaa">No items</td></tr>`}</tbody>
        <tfoot><tr class="sub-row">
          <td class="c">Sub.</td><td><b>SUBTOTAL</b></td>
          <td class="r">${p.items.reduce((s,it)=>s+it.qty,0)}</td>
          <td class="r">${fmtN(p.subtotal)}</td>
          ${p.discountAmt>0?`<td class="r">₹${fmtN(p.discountAmt)}</td>`:""}
          ${p.taxPct>0?`<td class="r">${fmtN(p.taxAmt)}</td>`:""}
          <td class="r">₹${fmtN(taxable)}</td>
        </tr></tfoot>
      </table>
      <div class="bot">
        <div class="bot-l">
          ${p.notes?`<div><div class="t-lbl">Terms &amp; Conditions</div><div class="t-txt">${e(p.notes)}</div></div>`:""}
          ${p.warranty?`<div><div class="t-lbl">Warranty</div><div class="t-txt">${e(p.warranty)}</div></div>`:""}
          <div class="qr-row">
            ${p.qrSrc?`<div class="qr-wrap"><div class="qr-lbl">Payment QR Code</div><img src="${e(p.qrSrc)}" class="qr-img"/><div class="qr-badges"><span class="badge">GPay</span><span class="badge">Paytm</span><span class="badge">PhonePe</span><span class="badge">UPI</span></div><div class="qr-upi">UPI: 9932913826@okbizaxis</div></div>`:""}
            <div class="sig"><img src="/images/Signature.png" alt="Signature" style="height:9mm;width:auto;display:block;margin:0 auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div>
          </div>
        </div>
        <div class="bot-r">
          <div class="t-row"><span>Taxable Amount</span><span>₹${taxable.toFixed(2)}</span></div>
          ${cgst>0?`<div class="t-row"><span>CGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""} 
          ${cgst>0?`<div class="t-row"><span>SGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}
          ${p.paidAmount>0.005?`<div class="t-row"><span>Amount Received</span><span style="color:#15803d">−₹${p.paidAmount.toFixed(2)}</span></div>`:""}
          <div class="grand"><div class="g-row"><span>Total Amount</span><span class="g-val">₹${p.total.toFixed(2)}</span></div>${due>0.005?`<div class="g-due"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:""}</div>
          <div class="words"><div class="w-lbl">Total Amount (in words)</div><div class="w-txt">${amtWords(p.total)}</div></div>
        </div>
      </div>
    </div>`;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',Arial,sans-serif;font-size:7.5pt;color:#1a1a2e;background:#f0ece4;display:flex;justify-content:center;padding:6px}
    .page{width:210mm;height:297mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.18);display:flex;flex-direction:column}
    .inv{height:148.5mm;display:flex;flex-direction:column;overflow:hidden;position:relative}
    .cut{width:100%;height:0;border-top:2px dashed #9999bb;position:relative;flex-shrink:0}
    .cut::before{content:'✂';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;padding:0 3mm;font-size:9pt;color:#888}
    /* Header */
    .hdr{display:flex;align-items:center;gap:3mm;padding:3mm 4mm 2.5mm;border-bottom:2px solid #c8a84b;background:linear-gradient(135deg,#fdfaf3 0%,#fff 60%);flex-shrink:0}
    .logo{width:22mm;height:22mm;object-fit:contain;flex-shrink:0}
    .logo-fb{width:14mm;height:14mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f0e8d0;border:1px solid #c8a84b;border-radius:50%;font-size:7pt;font-weight:800;color:#8a6a1c}
    .biz{flex:1}.biz-name{font-size:11pt;font-weight:900;color:#1a2a6e;line-height:1.1}
    .biz-pan{font-size:6pt;color:#444;font-weight:600;margin-top:.5mm}
    .biz-addr{font-size:5pt;color:#666;margin-top:.5mm}
    .biz-sub{font-size:5pt;color:#666;margin-top:.3mm;display:flex;flex-wrap:wrap;gap:2.5mm}
    .inv-meta{text-align:right;flex-shrink:0;align-self:center}
    .inv-row{display:flex;gap:4mm;justify-content:flex-end}
    .inv-col{text-align:right}
    .inv-lbl{font-size:5.5pt;font-weight:700;color:#8a8f9a;text-transform:uppercase;letter-spacing:.4px}
    .inv-val{font-size:7.5pt;font-weight:800;color:#1a2a6e;margin-top:.3mm}
    /* Bill To */
    .billto{padding:2mm 4mm;border-bottom:1px solid #e8e0cc;background:#fffdf7;flex-shrink:0}
    .bt-lbl{font-size:6pt;font-weight:800;color:#1a2a6e;text-transform:uppercase;letter-spacing:.6px;padding-bottom:.8mm;border-bottom:1.5px solid #c8a84b;display:inline-block;margin-bottom:.8mm}
    .bt-name{font-size:7.5pt;font-weight:700}.bt-line{font-size:5.5pt;color:#555;margin-top:.3mm}
    /* Table */
    .tbl{width:100%;border-collapse:collapse;flex-shrink:0}
    .th{background:#1a2a6e;color:#fff;padding:1.5mm 2mm;font-size:5.5pt;font-weight:700;text-align:left}
    .td{padding:1.5mm 2mm;border-bottom:.5px solid #ede8dc;font-size:6.5pt;vertical-align:top}
    .td small{font-size:4.5pt;color:#888;display:block}
    .sub-row td{background:#f5f0e8;font-weight:800;font-size:7pt;padding:1.5mm 2mm;border-top:1.5px solid #c8a84b}
    .r{text-align:right}.c{text-align:center}.bold{font-weight:700}
    /* Bottom */
    .bot{display:flex;flex:1;border-top:1px solid #e8e0cc;min-height:0}
    .bot-l{flex:1.1;padding:2.5mm 3.5mm;display:flex;flex-direction:column;gap:1.5mm;border-right:1px solid #e8e0cc}
    .bot-r{flex:1;padding:2.5mm 3.5mm;display:flex;flex-direction:column;gap:.8mm}
    .t-lbl{font-size:6pt;font-weight:800;color:#1a2a6e;margin-bottom:.3mm}
    .t-txt{font-size:5pt;color:#555;line-height:1.4}
    .qr-row{display:flex;gap:2.5mm;align-items:flex-end;margin-top:auto}
    .qr-wrap{display:flex;flex-direction:column;align-items:center;gap:.8mm}
    .qr-img{width:18mm;height:18mm;object-fit:contain;border:.5px solid #ddd}
    .qr-lbl{font-size:5pt;font-weight:700;color:#1a2a6e;text-align:center}
    .qr-badges{display:flex;gap:.8mm;flex-wrap:wrap;justify-content:center}
    .badge{font-size:3.5pt;font-weight:700;color:#1a2a6e;border:.5px solid #c8a84b;padding:.2mm .8mm;background:#fffdf0}
    .qr-upi{font-size:4pt;color:#555;text-align:center}
    .sig{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}
    .sig-line{width:20mm;border-bottom:.5px solid #888;margin:.8mm auto .4mm}
    .sig-lbl{font-size:4.5pt;color:#555}
    .t-row{display:flex;justify-content:space-between;font-size:6.5pt;padding:.6mm 0;border-bottom:.5px solid #ede8dc}
    .grand{background:#1a2a6e;color:#fff;padding:2mm 2.5mm;margin-top:1mm}
    .g-row{display:flex;justify-content:space-between;align-items:baseline}
    .g-val{font-size:10pt;font-weight:900}
    .g-due{display:flex;justify-content:space-between;font-size:6pt;color:#ffccaa;margin-top:.3mm}
    .words{border:.5px solid #e0d8c8;padding:1.2mm 1.8mm;margin-top:1mm;background:#fffdf7}
    .w-lbl{font-size:5pt;font-weight:700;color:#1a2a6e;margin-bottom:.3mm}
    .w-txt{font-size:5.5pt;color:#333;font-weight:600}
    @media print{@page{size:A4 portrait;margin:0}body{background:#fff;padding:0}.page{box-shadow:none;border:none;width:100%;height:100vh}.inv{height:50vh}.cut{break-after:avoid}}
  `;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head>
  <body><div class="page">${block}<div class="cut"></div>${block}</div>
  <script>setTimeout(()=>window.print(),420)</script></body></html>`;
}


function buildInvoicePopupHTML(p: {
  logoSrc:string;qrSrc:string;bizName:string;bizPan?:string;bizGstin?:string;bizAddress?:string;bizPhone?:string;bizEmail?:string;
  invNo:string;invDate:string;invTime?:string;clientName:string;clientAddr?:string;clientPhone?:string;clientGstin?:string;
  items:{desc:string;qty:number;rate:number}[];discType:string;discVal:number;taxPct:number;
  subtotal:number;discountAmt:number;taxAmt:number;total:number;paidAmount:number;notes?:string;warranty?:string;
}):string {
  const e=(s:any)=>String(s??"").replace(/[&<>"']/g,(c:string)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":'&#39;'}[c]as string));
  const fmtN=(n:number)=>Math.round(n).toLocaleString("en-IN");
  const taxable=p.subtotal-p.discountAmt; const cgst=p.taxAmt/2; const due=Math.max(p.total-p.paidAmount,0);
  function amtWords(n:number):string{const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];const m=Math.round(n);if(m===0)return"Zero Only";function b(x:number):string{if(x<20)return ones[x];if(x<100)return tens[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");return ones[Math.floor(x/100)]+" Hundred"+(x%100?" "+b(x%100):"");}let r="";if(m>=10000000)r+=b(Math.floor(m/10000000))+" Crore ";if(m>=100000)r+=b(Math.floor((m%10000000)/100000))+" Lakh ";if(m>=1000)r+=b(Math.floor((m%100000)/1000))+" Thousand ";r+=b(m%1000);return r.trim()+" Only";}
  const rows=p.items.map((it,i)=>{const lt=it.qty*it.rate;const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0;const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0;return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td r">${it.qty}</td><td class="td r">₹${fmtN(it.rate)}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}<br/><small>${p.discType==="percent"?p.discVal+"%":""}</small></td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}<br/><small>${p.taxPct}%</small></td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`;}).join("");
  const css=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',Arial,sans-serif;font-size:8pt;color:#1a1a2e;background:#f0ece4;display:flex;justify-content:center;padding:8px}.page{width:148mm;min-height:210mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.18);display:flex;flex-direction:column;border:1px solid #e0d8c8}.hdr{display:flex;align-items:center;gap:4mm;padding:4mm 5mm 3mm;border-bottom:2.5px solid #c8a84b;background:linear-gradient(135deg,#fdfaf3 0%,#fff 60%)}.hdr-logo{width:26mm;height:26mm;object-fit:contain;flex-shrink:0}.hdr-biz{flex:1}.hdr-biz-name{font-size:13pt;font-weight:900;color:#1a2a6e;letter-spacing:-.3px;line-height:1.1}.hdr-biz-pan{font-size:6.5pt;color:#444;font-weight:600;margin-top:1mm}.hdr-biz-addr{font-size:5.5pt;color:#666;margin-top:1mm}.hdr-biz-sub{font-size:5.5pt;color:#666;margin-top:.5mm;display:flex;flex-wrap:wrap;gap:3mm}.hdr-inv{text-align:right;flex-shrink:0;align-self:center}.hdr-inv-row{display:flex;gap:5mm;justify-content:flex-end}.hdr-inv-col{text-align:right}.hdr-inv-lbl{font-size:6pt;font-weight:700;color:#8a8f9a;text-transform:uppercase;letter-spacing:.5px}.hdr-inv-val{font-size:8.5pt;font-weight:800;color:#1a2a6e;margin-top:.5mm}.parties{display:flex;border-bottom:1px solid #e8e0cc;background:#fffdf7}.party{flex:1;padding:2.5mm 4mm;border-right:1px solid #e8e0cc}.party:last-child{border-right:none}.party-lbl{font-size:6.5pt;font-weight:800;color:#1a2a6e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:1.5mm;padding-bottom:1mm;border-bottom:1.5px solid #c8a84b}.party-name{font-size:8pt;font-weight:700;color:#1a1a2e}.party-line{font-size:6pt;color:#555;margin-top:.5mm;line-height:1.4}.tbl{width:100%;border-collapse:collapse}.th{background:#1a2a6e;color:#fff;padding:2mm 2.5mm;font-size:6pt;font-weight:700;text-align:left}.td{padding:2mm 2.5mm;border-bottom:.5px solid #ede8dc;font-size:7pt;vertical-align:top}.td small{font-size:5pt;color:#888;display:block}.subtotal-row td{background:#f5f0e8;font-weight:800;font-size:7.5pt;padding:2mm 2.5mm;border-top:1.5px solid #c8a84b}.r{text-align:right}.c{text-align:center}.bold{font-weight:700}.bot{display:flex;flex:1;border-top:1px solid #e8e0cc;min-height:0}.bot-left{flex:1.1;padding:3mm 4mm;display:flex;flex-direction:column;gap:2mm;border-right:1px solid #e8e0cc}.bot-right{flex:1;padding:3mm 4mm;display:flex;flex-direction:column;gap:1mm}.terms-lbl{font-size:6.5pt;font-weight:800;color:#1a2a6e;margin-bottom:.5mm}.terms-txt{font-size:5.5pt;color:#555;line-height:1.5}.qr-row{display:flex;gap:3mm;align-items:flex-end;margin-top:auto}.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:1mm}.qr-img{width:22mm;height:22mm;object-fit:contain;border:.5px solid #ddd}.qr-lbl{font-size:5.5pt;font-weight:700;color:#1a2a6e;text-align:center}.qr-badges{display:flex;gap:1mm;flex-wrap:wrap;justify-content:center}.qr-badge{font-size:4pt;font-weight:700;color:#1a2a6e;border:.5px solid #c8a84b;padding:.3mm 1mm;background:#fffdf0}.qr-upi{font-size:4.5pt;color:#555;text-align:center}.sig-wrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center;padding-bottom:1mm}.sig-line{width:22mm;border-bottom:.5px solid #888;margin:1mm auto .5mm}.sig-lbl{font-size:5pt;color:#555}.tot-row{display:flex;justify-content:space-between;font-size:7pt;padding:.8mm 0;border-bottom:.5px solid #ede8dc}.tot-lbl{color:#555}.tot-val{font-weight:700;font-variant-numeric:tabular-nums}.grand-box{background:#1a2a6e;color:#fff;padding:2.5mm 3mm;margin-top:1.5mm}.grand-row{display:flex;justify-content:space-between;align-items:baseline}.grand-lbl{font-size:8pt;font-weight:700}.grand-val{font-size:11pt;font-weight:900}.due-row{display:flex;justify-content:space-between;font-size:7pt;color:#ffccaa;margin-top:.5mm}.words-box{border:.5px solid #e0d8c8;padding:1.5mm 2mm;margin-top:1.5mm;background:#fffdf7}.words-lbl{font-size:5.5pt;font-weight:700;color:#1a2a6e;margin-bottom:.5mm}.words-txt{font-size:6pt;color:#333;font-weight:600}@media print{@page{size:A5 portrait;margin:0}body{background:#fff;padding:0}.page{box-shadow:none;border:none;width:100%;min-height:100vh}}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head><body><div class="page"><div class="hdr">${p.logoSrc?`<img src="${e(p.logoSrc)}" alt="${e(p.bizName)}" class="hdr-logo" onerror="this.style.display='none'"/>`:`<div style="width:26mm;height:26mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f0e8d0;border:1px solid #c8a84b;border-radius:50%;font-size:8pt;font-weight:800;color:#8a6a1c">${e(p.bizName.slice(0,2))}</div>`}<div class="hdr-biz"><div class="hdr-biz-name">${e(p.bizName)}</div>${p.bizPan?`<div class="hdr-biz-pan">Pan No &nbsp;<b>${e(p.bizPan)}</b></div>`:""}${p.bizAddress?`<div class="hdr-biz-addr">📍 ${e(p.bizAddress)}</div>`:""}<div class="hdr-biz-sub">${p.bizPhone?`<span>📞 ${e(p.bizPhone)}</span>`:""}${p.bizEmail?`<span>✉ ${e(p.bizEmail)}</span>`:""}${p.bizGstin?`<span>GSTIN: ${e(p.bizGstin)}</span>`:""}</div></div><div class="hdr-inv"><div class="hdr-inv-row"><div class="hdr-inv-col"><div class="hdr-inv-lbl">Invoice Date</div><div class="hdr-inv-val">${e(p.invDate)}</div></div><div class="hdr-inv-col"><div class="hdr-inv-lbl">Invoice No</div><div class="hdr-inv-val">#${e(p.invNo)}</div></div></div></div></div><div class="parties"><div class="party"><div class="party-lbl">Bill To</div><div class="party-name">${e(p.clientName)||"—"}</div>${p.clientAddr?`<div class="party-line">${e(p.clientAddr)}</div>`:""}${p.clientPhone?`<div class="party-line">📞 ${e(p.clientPhone)}</div>`:""}${p.clientGstin?`<div class="party-line">GSTIN: ${e(p.clientGstin)}</div>`:""}</div></div><table class="tbl"><thead><tr><th class="th c" style="width:7mm">No</th><th class="th">Items</th><th class="th r" style="width:10mm">Qty.</th><th class="th r" style="width:16mm">Rate</th>${p.discountAmt>0?`<th class="th r" style="width:14mm">Disc.</th>`:""}${p.taxPct>0?`<th class="th r" style="width:13mm">Tax</th>`:""}<th class="th r" style="width:17mm">Total</th></tr></thead><tbody>${rows||`<tr><td colspan="6" class="td c" style="color:#aaa;padding:4mm">No items</td></tr>`}</tbody><tfoot><tr class="subtotal-row"><td class="c">Sub.</td><td><b>SUBTOTAL</b></td><td class="r">${p.items.reduce((s,it)=>s+it.qty,0)}</td><td class="r">${fmtN(p.subtotal)}</td>${p.discountAmt>0?`<td class="r">₹${fmtN(p.discountAmt)}</td>`:""}${p.taxPct>0?`<td class="r">${fmtN(p.taxAmt)}</td>`:""}<td class="r">₹${fmtN(taxable)}</td></tr></tfoot></table><div class="bot"><div class="bot-left">${p.notes?`<div><div class="terms-lbl">Terms &amp; Conditions</div><div class="terms-txt">${e(p.notes)}</div></div>`:""}${p.warranty?`<div><div class="terms-lbl">Warranty</div><div class="terms-txt">${e(p.warranty)}</div></div>`:""}<div class="qr-row">${p.qrSrc?`<div class="qr-wrap"><div class="qr-lbl">Payment QR Code</div><img src="${e(p.qrSrc)}" alt="UPI QR" class="qr-img"/><div class="qr-badges"><span class="qr-badge">GPay</span><span class="qr-badge">Paytm</span><span class="qr-badge">PhonePe</span><span class="qr-badge">UPI</span></div><div class="qr-upi">UPI ID: 9932913826@okbizaxis</div></div>`:""}<div class="sig-wrap"><img src="/images/Signature.png" alt="Signature" style="height:10mm;width:auto;display:block;margin:0 auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div></div></div><div class="bot-right"><div class="tot-row"><span class="tot-lbl">Taxable Amount</span><span class="tot-val">₹${taxable.toFixed(2)}</span></div>${cgst>0?`<div class="tot-row"><span class="tot-lbl">CGST @${p.taxPct/2}%</span><span class="tot-val">${cgst.toFixed(2)}</span></div>`:""}${cgst>0?`<div class="tot-row"><span class="tot-lbl">SGST @${p.taxPct/2}%</span><span class="tot-val">${cgst.toFixed(2)}</span></div>`:""}${p.paidAmount>0.005?`<div class="tot-row"><span class="tot-lbl">Amount Received</span><span class="tot-val" style="color:#15803d">−₹${p.paidAmount.toFixed(2)}</span></div>`:""}<div class="grand-box"><div class="grand-row"><span class="grand-lbl">Total Amount</span><span class="grand-val">₹${p.total.toFixed(2)}</span></div>${due>0.005?`<div class="due-row"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:""}</div><div class="words-box"><div class="words-lbl">Total Amount (in words)</div><div class="words-txt">${amtWords(p.total)}</div></div></div></div></div><script>setTimeout(()=>window.print(),420)</script></body></html>`;
}

function amtWordsPreview(n: number): string {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const m = Math.round(n); if (m === 0) return "Zero Only";
  function b(x: number): string { if (x < 20) return ones[x]; if (x < 100) return tens[Math.floor(x/10)] + (x%10 ? " " + ones[x%10] : ""); return ones[Math.floor(x/100)] + " Hundred" + (x%100 ? " " + b(x%100) : ""); }
  let r = ""; if (m >= 10000000) r += b(Math.floor(m/10000000)) + " Crore "; if (m >= 100000) r += b(Math.floor((m%10000000)/100000)) + " Lakh "; if (m >= 1000) r += b(Math.floor((m%100000)/1000)) + " Thousand "; r += b(m%1000); return r.trim() + " Only";
}


export default function InvoiceMaker() {
  const [biz, setBiz] = useState<Party>(loadBiz);
  const [client, setClient] = useState<Party>({ name: "", address: "", phone: "", email: "", gstin: "", pan: "" });
  const [invNo, setInvNo] = useState(nextInvoiceNo);
  const [date, setDate] = useState(today);
  const [items, setItems] = useState<Item[]>([{ id: uid(), desc: "", qty: "1", rate: "" }]);
  const [discType, setDiscType] = useState<"amount" | "percent">("amount");
  const [discVal, setDiscVal] = useState("0");
  const [taxPct, setTaxPct] = useState("0");
  const [notes, setNotes] = useState("Keep the invoices for Future References");
  const [saved, setSaved] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const [qrBase64, setQrBase64] = useState<string>("");
  const [logoBase64, setLogoBase64] = useState<string>("");
  const [sigBase64, setSigBase64] = useState<string>("");
  const [warranty, setWarranty] = useState("");
  const [advance, setAdvance] = useState("0");
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [dbCustomers, setDbCustomers] = useState<CustomerLite[]>([]);
  const [addCustOpen, setAddCustOpen] = useState(false);
  const [addCustForm, setAddCustForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [addCustBusy, setAddCustBusy] = useState(false);
  const [addCustErr, setAddCustErr] = useState("");
  const pendingAction = useRef<null | (() => void)>(null);
  const [nameSuggestOpen, setNameSuggestOpen] = useState(false);
  const [activeSug, setActiveSug] = useState(-1);
  const [autosave, setAutosave] = useState<"on" | "off" | "">(loadAutosave);
  const [askSave, setAskSave] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [savingNow, setSavingNow] = useState(false);
  const pendingSave = useRef<Record<string, unknown> | null>(null);
  const [mailOpen, setMailOpen] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailMessage, setMailMessage] = useState("");
  const [mailBusy, setMailBusy] = useState(false);
  const [mailErr, setMailErr] = useState("");
  const [mailSent, setMailSent] = useState("");
  const [waOpen, setWaOpen] = useState(false);
  const [waTo, setWaTo] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waBusy, setWaBusy] = useState(false);
  const [waErr, setWaErr] = useState("");
  const [waSent, setWaSent] = useState("");

  useEffect(() => {
    const toB64 = (src: string) => new Promise<string>((resolve) => {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => { const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext("2d")!.drawImage(img, 0, 0); resolve(c.toDataURL()); };
      img.onerror = () => resolve(""); img.src = src;
    });
    toB64("/images/QR.jpeg").then(setQrBase64);
    toB64("/images/abhijit_art_logo.png").then(setLogoBase64);
    toB64("/images/Signature.png").then(setSigBase64);
  }, []);

  useEffect(() => {
    let alive = true;
    api.get("/api/invoices").then((res) => {
      if (!alive) return;
      const seen = new Set<string>();
      const out: CustomerLite[] = [];
      for (const inv of Array.isArray(res.data) ? res.data : []) {
        const name = String(inv.clientName || "").trim();
        const phone = String(inv.clientPhone || "").trim();
        if (!name && !phone) continue;
        const key = (phone || name).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ name, phone, email: String(inv.clientEmail || "").trim(), gstin: String(inv.clientGstin || "").trim(), address: String(inv.clientAddr || "").trim() });
      }
      setCustomers(out);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Load the real customer database (used to check if a client is registered)
  const loadDbCustomers = () => {
    api.get("/api/users").then((res) => {
      const rows = Array.isArray(res.data) ? res.data : [];
      setDbCustomers(rows.map((u: any) => ({ name: String(u.name || "").trim(), phone: String(u.phone || "").trim(), email: String(u.email || "").trim(), gstin: "", address: String(u.address || "").trim() })));
    }).catch(() => {});
  };
  useEffect(() => { loadDbCustomers(); }, []);

  const normPhone = (v: string) => v.replace(/[\s\-()]/g, "").replace(/^\+91/, "").replace(/^0+/, "");
  // Is the current client already a registered customer? (match by phone or name)
  const clientIsRegistered = () => {
    const np = normPhone(client.phone.trim());
    const nm = client.name.trim().toLowerCase();
    return dbCustomers.some((c) => {
      const cp = normPhone(c.phone);
      if (np && cp && np === cp) return true;
      if (nm && c.name.trim().toLowerCase() === nm) return true;
      return false;
    });
  };

  // Guard: run `action` only if client is registered; otherwise force the add-customer modal first.
  const withCustomer = (action: () => void) => {
    if (!client.name.trim()) { action(); return; } // no client set — nothing to enforce
    if (clientIsRegistered()) { action(); return; }
    pendingAction.current = action;
    setAddCustForm({ name: client.name.trim(), email: client.email.trim(), phone: client.phone.trim(), address: client.address.trim(), notes: "" });
    setAddCustErr(""); setAddCustOpen(true);
  };

  const submitAddCustomer = async () => {
    if (!addCustForm.name.trim()) { setAddCustErr("Name is required."); return; }
    setAddCustBusy(true); setAddCustErr("");
    try {
      await api.post("/api/users", { name: addCustForm.name.trim(), email: addCustForm.email.trim(), phone: addCustForm.phone.trim(), address: addCustForm.address.trim(), notes: addCustForm.notes.trim() });
      loadDbCustomers();
      // reflect any edits back into the invoice client
      setClient((cl) => ({ ...cl, name: addCustForm.name.trim(), phone: addCustForm.phone.trim(), email: addCustForm.email.trim(), address: addCustForm.address.trim() }));
      setAddCustOpen(false);
      const act = pendingAction.current; pendingAction.current = null;
      // slight delay so state settles before the action (e.g. opening print popup)
      setTimeout(() => act && act(), 60);
    } catch (e: any) {
      setAddCustErr(e?.response?.data?.message || "Couldn't add the customer.");
    } finally { setAddCustBusy(false); }
  };

  const nameQuery = client.name.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!nameQuery) return [];
    const seen = new Set<string>();
    const merged = [...dbCustomers, ...customers].filter((c) => {
      const k = (c.phone || c.name).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true;
    });
    return merged.filter((c) => c.name.toLowerCase().includes(nameQuery) || c.phone.toLowerCase().includes(nameQuery) || c.email.toLowerCase().includes(nameQuery)).slice(0, 6);
  }, [customers, dbCustomers, nameQuery]);

  const pickCustomer = (c: CustomerLite) => {
    setClient((cl) => ({ ...cl, name: c.name, phone: c.phone, email: c.email, gstin: c.gstin, address: c.address }));
    setNameSuggestOpen(false); setActiveSug(-1);
  };

  const { subtotal, discountAmt, taxable, taxAmt, total } = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + num(it.qty) * num(it.rate), 0);
    const discountAmt = discType === "percent" ? (subtotal * num(discVal)) / 100 : Math.min(num(discVal), subtotal);
    const taxable = Math.max(subtotal - discountAmt, 0);
    const taxAmt = (taxable * num(taxPct)) / 100;
    return { subtotal, discountAmt, taxable, taxAmt, total: taxable + taxAmt };
  }, [items, discType, discVal, taxPct]);

  const advancePaid = Math.min(Math.max(num(advance), 0), total);
  const balanceDue = Math.max(total - advancePaid, 0);

  const setItem = (id: string, key: keyof Item, val: string) => setItems((rows) => rows.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
  const addItem = () => setItems((rows) => [...rows, { id: uid(), desc: "", qty: "1", rate: "" }]);
  const removeItem = (id: string) => setItems((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));

  const saveBusiness = () => { try { localStorage.setItem(BIZ_KEY, JSON.stringify(biz)); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch {} };

  const resetInvoice = () => {
    setClient({ name: "", address: "", phone: "", email: "", gstin: "", pan: "" });
    setItems([{ id: uid(), desc: "", qty: "1", rate: "" }]);
    setDiscVal("0"); setTaxPct("0"); setNotes("Keep the invoices for Future References"); setWarranty(""); setAdvance("0"); setPayMethod("cash"); setNameSuggestOpen(false); setDate(today()); setInvNo(nextInvoiceNo());
  };

  const invoicePayload = () => ({ invNo, date, biz, client, items: items.filter((it) => it.desc.trim() || num(it.rate) > 0), discType, discVal, taxPct, notes, warranty, paidAmount: advancePaid, paymentMethod: payMethod });

  const persistInvoice = (payload: Record<string, unknown>) => {
    return api.post("/api/invoices", payload).then(() => { setSavedTick(true); setTimeout(() => setSavedTick(false), 2600); }).catch(() => {});
  };

  const maybeSaveInvoice = () => {
    if (autosave === "on") return persistInvoice(invoicePayload());
    if (autosave === "off") return;
    pendingSave.current = invoicePayload(); setAskSave(true);
  };

  const decideAutosave = (choice: "on" | "off") => {
    setAutosave(choice);
    try { localStorage.setItem(AUTOSAVE_KEY, choice); } catch {}
    setAskSave(false);
    if (choice === "on" && pendingSave.current) persistInvoice(pendingSave.current);
    pendingSave.current = null;
  };

  const bumpSeq = () => { try { const m = invNo.match(/(\d+)$/); if (m) localStorage.setItem("aa_invoice_seq", m[1]); } catch {} };

  const openMail = () => {
    setMailErr(""); setMailSent(""); setMailTo(client.email || "");
    setMailSubject(`Invoice ${invNo} from ${biz.name || "Abhijit Art"}`);
    setMailMessage(`Dear ${client.name || "Customer"},\n\nPlease find your invoice ${invNo} below, for a total of ${rupee(total)}.\n\nDo let us know if anything needs correcting — just reply to this email.\n\nWarm regards,\n${biz.name || "Abhijit Art"}`);
    setMailOpen(true);
  };

  const sendInvoice = async () => {
    setMailBusy(true); setMailErr("");
    try {
      await api.post("/api/invoices/email", { to: mailTo.trim(), subject: mailSubject, message: mailMessage, invoice: { invNo, date, biz, client, items: items.filter((it) => it.desc.trim() || num(it.rate) > 0), discType, discVal, taxPct, notes, warranty, paidAmount: advancePaid } });
      setMailSent(`Invoice emailed to ${mailTo.trim()}.`); maybeSaveInvoice(); setMailBusy(false); bumpSeq();
    } catch (e: any) { setMailErr(e?.response?.data?.message || "Couldn't send the invoice."); setMailBusy(false); }
  };

  const openWhatsApp = () => {
    setWaErr(""); setWaSent(""); setWaTo(client.phone || "");
    setWaMessage(`Dear ${client.name || "Customer"},\n\nHere is your invoice ${invNo} from ${biz.name || "Abhijit Art"}.\n\nTotal: ${rupee(total)}${advancePaid > 0 ? `\nAdvance paid: ${rupee(advancePaid)}\nBalance due: ${rupee(balanceDue)}` : ""}\n\nThank you for your business!`);
    setWaOpen(true);
  };

  const sendWhatsApp = async () => {
    const digits = waDigits(waTo);
    if (digits.length < 10) { setWaErr("Enter a valid WhatsApp number — a 10-digit Indian mobile, or one with its country code."); return; }
    setWaBusy(true); setWaErr("");
    const win = window.open("about:blank", "_blank");
    let pdfUrl = "";
    try {
      const res = await api.post("/api/invoices", invoicePayload());
      const inv = res?.data || {};
      pdfUrl = inv.pdfUrl || "";
      if (!pdfUrl && inv.id) { try { const g = await api.get(`/api/invoices/${inv.id}`); pdfUrl = g?.data?.pdfUrl || ""; } catch {} }
      setSavedTick(true); setTimeout(() => setSavedTick(false), 2600); bumpSeq();
    } catch {}
    const finalMsg = waMessage + (pdfUrl ? `\n\n📄 Invoice PDF: ${pdfUrl}` : "");
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(finalMsg)}`;
    if (win) win.location.href = url; else window.open(url, "_blank");
    setWaBusy(false); setWaSent(`Opening WhatsApp for +${digits}…`);
    setTimeout(() => { setWaOpen(false); setWaSent(""); }, 1500);
  };

  const hasLines = items.some((it) => it.desc.trim() || num(it.rate) > 0);

  // ── Manual save — always saves right now, regardless of the autosave setting ──
  const saveInvoiceNow = () => {
    if (!hasLines || savingNow) return;
    bumpSeq();
    setSavingNow(true);
    persistInvoice(invoicePayload()).finally(() => setSavingNow(false));
  };

  // ── 2-up A4 print ──
  const print2up = () => {
    const currentPayload = { invNo, date, biz, client, items: items.filter(it => it.desc.trim() || num(it.rate) > 0), discType, discVal, taxPct, notes, warranty, paidAmount: advancePaid, subtotal, discountAmt, taxAmt, total };
    function escH(s: string) { return String(s||"").replace(/[&<>"']/g,(c:string)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string)); }
    function fmtD(d: string) { if (!d) return ""; const dt = new Date(d); return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"}); }
    function amtWords(n: number): string {
      const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
      const t=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
      const m=Math.round(n); if(m===0) return "Zero Only";
      function b(x:number):string{if(x<20)return ones[x];if(x<100)return t[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");return ones[Math.floor(x/100)]+" Hundred"+(x%100?" "+b(x%100):"");}
      let r=""; if(m>=10000000)r+=b(Math.floor(m/10000000))+" Crore "; if(m>=100000)r+=b(Math.floor((m%10000000)/100000))+" Lakh "; if(m>=1000)r+=b(Math.floor((m%100000)/1000))+" Thousand "; r+=b(m%1000); return r.trim()+" Only";
    }
    const p = currentPayload;
    const _items = p.items; const _sub = num(p.subtotal); const _disc = num(p.discountAmt); const _tax = num(p.taxAmt); const _total = num(p.total); const _taxPct = num(p.taxPct); const _taxable = _sub - _disc; const _cgst = _tax/2; const _paid = Math.min(Math.max(num(p.paidAmount),0),_total); const _due = Math.max(_total-_paid,0);
    const b2 = p.biz||{} as any; const c2 = p.client||{} as any; const bizName = escH(b2.name||"Abhijit Art");
    const itemRows = _items.map((it:any,i:number)=>{ const lt=num(it.qty)*num(it.rate); const ld=_disc>0&&_sub>0?(lt/_sub)*_disc:0; const lx=_tax>0&&_sub>0?(lt/_sub)*_tax:0; return `<tr><td class="tc c">${i+1}.</td><td class="tc">${escH(it.desc||"Item")}</td><td class="tc r">${num(it.qty)}</td><td class="tc r">₹${num(it.rate).toLocaleString("en-IN")}</td>${_disc>0?`<td class="tc r">₹${Math.round(ld).toLocaleString("en-IN")}${p.discType==="percent"?`<br/><small>${num(p.discVal)}%</small>`:""}</td>`:""}${_tax>0?`<td class="tc r">₹${Math.round(lx).toLocaleString("en-IN")}<br/><small>${_taxPct}%</small></td>`:""}<td class="tc r bld">₹${Math.round(lt-ld+lx).toLocaleString("en-IN")}</td></tr>`; }).join("");
    const makeBlock=(isSecond:boolean)=>`<div class="block${isSecond?" second":""}"><div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div><div class="hdr"><div class="biz"><div class="bname">${bizName}</div>${b2.pan?`<div class="bsub">PAN: ${escH(b2.pan)}</div>`:""}${b2.gstin?`<div class="bsub">GSTIN: ${escH(b2.gstin)}</div>`:""}${b2.address?`<div class="baddr">${escH(b2.address)}</div>`:""}${b2.phone?`<div class="baddr">☎ ${escH(b2.phone)}</div>`:""}</div><div class="imeta"><div class="ilabel">INVOICE</div><div class="irow"><span class="ml">Invoice Date</span><span class="mv">${fmtD(p.date)}</span></div><div class="irow"><span class="ml">Invoice No</span><span class="mv ino">#${escH(p.invNo)}</span></div></div></div><div class="billto"><div class="slabel">Bill To</div><div class="cname">${escH(c2.name||"—")}</div>${c2.address?`<div class="cline">${escH(c2.address)}</div>`:""}${c2.phone?`<div class="cline">☎ ${escH(c2.phone)}</div>`:""}${c2.gstin?`<div class="cline">GSTIN: ${escH(c2.gstin)}</div>`:""}</div><table class="itable"><thead><tr><th style="width:6mm">No</th><th>Items</th><th class="r" style="width:12mm">Qty</th><th class="r" style="width:18mm">Rate</th>${_disc>0?`<th class="r" style="width:16mm">Disc.</th>`:""}${_tax>0?`<th class="r" style="width:16mm">Tax</th>`:""}<th class="r" style="width:20mm">Total</th></tr></thead><tbody>${itemRows||`<tr><td colspan="5" style="text-align:center;color:#999;padding:2mm">No items</td></tr>`}</tbody><tfoot><tr><td class="fc c">Sub.</td><td class="fc"></td><td class="fc r">${_items.reduce((s:number,it:any)=>s+num(it.qty),0)}</td><td class="fc r">₹${Math.round(_sub).toLocaleString("en-IN")}</td>${_disc>0?`<td class="fc r">₹${Math.round(_disc).toLocaleString("en-IN")}</td>`:""}${_tax>0?`<td class="fc r">₹${Math.round(_tax).toLocaleString("en-IN")}</td>`:""}<td class="fc r">₹${Math.round(_taxable).toLocaleString("en-IN")}</td></tr></tfoot></table><div class="bot"><div class="bleft">${p.notes?`<div><div class="tlabel">Terms &amp; Conditions</div><div class="tbody">${escH(p.notes)}</div></div>`:""}${p.warranty?`<div style="margin-top:1mm"><div class="tlabel">Warranty</div><div class="tbody">${escH(p.warranty)}</div></div>`:""}<div class="sig"><div class="sfor">For ${bizName}</div><div class="sline"></div><div class="srole">Authorised Signatory</div></div></div><div class="bright"><div class="summ"><div class="srow"><span>Taxable Amount</span><span>₹${_taxable.toFixed(2)}</span></div>${_cgst>0?`<div class="srow"><span>CGST @${_taxPct/2}%</span><span>₹${_cgst.toFixed(2)}</span></div>`:""}${_cgst>0?`<div class="srow"><span>SGST @${_taxPct/2}%</span><span>₹${_cgst.toFixed(2)}</span></div>`:""}${_paid>0?`<div class="srow"><span>Amount Received</span><span style="color:#15803d">−₹${_paid.toFixed(2)}</span></div>`:""}</div><div class="tbox"><div class="trow"><span>Total Amount</span><span class="tval">₹${_total.toFixed(2)}</span></div>${_due>0?`<div class="trow" style="margin-top:1mm"><span style="font-size:6pt;opacity:.8">Balance Due</span><span style="font-size:8pt;color:#ffccaa">₹${_due.toFixed(2)}</span></div>`:""}</div><div class="words"><b>Total Amount (in words)</b><br/>${amtWords(_total)}</div></div></div></div>`;
    const w=window.open("","_blank","width=900,height=1200"); if(!w)return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>2-up · ${escH(p.invNo)}</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',Arial,sans-serif;font-size:8.5pt;color:#1a1a2e;background:#e8e8f0;padding:10px}.page{width:210mm;min-height:297mm;padding:6mm 8mm;background:#fff;display:flex;flex-direction:column;gap:0;margin:0 auto;box-shadow:0 4px 24px rgba(0,0,80,.15)}.block{width:100%;height:140mm;box-sizing:border-box;padding:4mm 5mm;border:1px solid #c0c0d0;display:flex;flex-direction:column;gap:1.8mm;overflow:hidden;position:relative}.second{border-top:2.5px dashed #9999bb;margin-top:3mm}.corner{position:absolute;width:6mm;height:6mm;border-color:#1a1a6e;border-style:solid}.tl{top:1.5mm;left:1.5mm;border-width:1.5px 0 0 1.5px}.tr{top:1.5mm;right:1.5mm;border-width:1.5px 1.5px 0 0}.bl{bottom:1.5mm;left:1.5mm;border-width:0 0 1.5px 1.5px}.br{bottom:1.5mm;right:1.5mm;border-width:0 1.5px 1.5px 0}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid #1a1a6e;padding-bottom:1.5mm;gap:3mm}.bname{font-size:12pt;font-weight:800;color:#1a1a6e;line-height:1.1}.bsub{font-size:6pt;color:#555;margin-top:.3mm}.baddr{font-size:5.5pt;color:#666;margin-top:.2mm}.imeta{text-align:right;flex-shrink:0}.ilabel{font-size:10pt;font-weight:800;letter-spacing:2px;color:#1a1a6e;margin-bottom:.8mm}.irow{display:flex;gap:3mm;justify-content:flex-end;margin-bottom:.4mm}.ml{font-size:6pt;color:#888;white-space:nowrap}.mv{font-size:6.5pt;font-weight:700;color:#1a1a6e;white-space:nowrap}.ino{font-size:8pt;font-weight:800}.billto{padding:.8mm 0}.slabel{font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#1a1a6e;border-left:2px solid #1a1a6e;padding-left:2mm;margin-bottom:.4mm}.cname{font-size:7.5pt;font-weight:700}.cline{font-size:6pt;color:#555;margin-top:.2mm}.itable{width:100%;border-collapse:collapse;font-size:7pt}.itable thead th{background:#1a1a6e;color:#fff;padding:1mm 1.8mm;font-size:6.5pt;font-weight:700;text-align:left}.tc{padding:.7mm 1.8mm;border-bottom:.5px solid #e0e0f0;font-size:7pt;vertical-align:top}.tc small{font-size:5.5pt;color:#999;display:block}.fc{background:#e8e8f4;font-weight:700;font-size:7pt;padding:.7mm 1.8mm}.r{text-align:right}.c{text-align:center}.bld{font-weight:700}.bot{display:flex;gap:3mm;margin-top:auto;padding-top:1mm;align-items:flex-end}.bleft{flex:1.2;display:flex;flex-direction:column;gap:.8mm}.bright{flex:1;display:flex;flex-direction:column;gap:.8mm}.tlabel{font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#1a1a6e}.tbody{font-size:5.5pt;color:#555;line-height:1.4}.sig{border:.5px solid #ccc;padding:1.2mm 2mm .6mm;display:inline-block;min-width:26mm;margin-top:auto}.sfor{font-size:5.5pt;color:#777}.sline{height:5mm;border-bottom:.5px solid #999;margin:.6mm 0}.srole{font-size:5pt;color:#777;text-align:center}.summ{border:.5px solid #dde}.srow{display:flex;justify-content:space-between;padding:.7mm 1.5mm;font-size:6.5pt;border-bottom:.5px solid #dde}.srow:last-child{border-bottom:none}.tbox{background:#1a1a6e;color:#fff;padding:1.5mm 2mm}.trow{display:flex;justify-content:space-between;align-items:baseline;font-size:7pt;font-weight:700}.tval{font-size:10pt;font-weight:800}.words{font-size:5.5pt;color:#555;border:.5px solid #dde;padding:1mm;line-height:1.4}@media print{@page{size:A4 portrait;margin:0}body{background:#fff;padding:0}.page{box-shadow:none;margin:0;width:100%}.block{break-inside:avoid}}</style></head><body><div class="page">${makeBlock(false)}${makeBlock(true)}</div><script>setTimeout(()=>window.print(),450)</script></body></html>`);
    w.document.close();
  };

  const download = () => {
    bumpSeq(); maybeSaveInvoice();
    if (!hasLines) return;
    const fmtD = (d: string) => { const dt = new Date(d); if (isNaN(dt.getTime())) return d; return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }); };
    const payload = {
      logoSrc: logoBase64 || "/images/abhijit_art_logo.png",
      qrSrc: qrBase64,
      bizName: biz.name || "Abhijit Art",
      bizPan: biz.pan, bizGstin: biz.gstin,
      bizAddress: biz.address, bizPhone: biz.phone, bizEmail: biz.email,
      invNo, invDate: fmtD(date), invTime: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
      clientName: client.name, clientAddr: client.address,
      clientPhone: client.phone, clientGstin: client.gstin,
      items: items.filter(it => it.desc.trim() || num(it.rate) > 0).map(it => ({ desc: it.desc, qty: num(it.qty), rate: num(it.rate) })),
      discType, discVal: num(discVal), taxPct: num(taxPct),
      subtotal, discountAmt, taxAmt, total,
      paidAmount: advancePaid, notes, warranty,
    };
    const w = window.open("", "_blank", "width=820,height=1150");
    if (!w) return;
    const html = buildSingleHalfA4HTML(payload)
      .replace(/src="\/images\/Signature\.jpg"/g, `src="${sigBase64 || '/images/Signature.png'}"`);
    w.document.write(html);
    w.document.close();
  };


  return (
    <div style={st.page}>
      <div style={st.head}>
        <div>
          <h1 style={st.title}>Invoice maker</h1>
          <p style={st.sub}>Create an invoice — fill the details and download as PDF.</p>
        </div>
        <div style={st.headActions}>
          {savedTick && (<span style={st.savedChip}><Icon name="check" size={14} /> Saved to Invoices</span>)}
          <button className="iv-ghost" style={st.ghostBtn} onClick={resetInvoice}><Icon name="reset" size={15} /> New invoice</button>
          <button className="iv-ghost" style={st.ghostBtn} onClick={() => withCustomer(openMail)} disabled={!hasLines}><Icon name="mail" size={15} /> Send by email</button>
          <button className="iv-wa" style={st.ghostBtn} onClick={() => withCustomer(openWhatsApp)} disabled={!hasLines}><span style={{ color: WA, display: "inline-flex" }}><Icon name="whatsapp" size={16} /></span> Send on WhatsApp</button>
          <button className="iv-save" style={st.saveBtn} onClick={() => withCustomer(saveInvoiceNow)} disabled={!hasLines || savingNow}><Icon name="save" size={15} /> {savingNow ? "Saving…" : "Save invoice"}</button>
          <button className="iv-cta" style={st.cta} onClick={() => withCustomer(download)} disabled={!hasLines}><Icon name="download" size={16} /> Download PDF</button>
        </div>
      </div>

      {!hasLines && (<div style={st.needItems}>Add a line item below to enable <b>Send by email</b>, <b>Send on WhatsApp</b>, <b>Save invoice</b> and <b>Download PDF</b>.</div>)}

      <div className="iv-layout" style={st.layout}>
        {/* ── Left column: forms ── */}
        <div style={{ minWidth: 0 }}>
          <section className="iv-card" style={st.card}>
            <div style={st.cardHead}>
              <h2 style={st.cardTitle}>Your business</h2>
              <button className="iv-link" style={st.saveLink} onClick={saveBusiness}>{saved ? "Saved ✓" : "Save as default"}</button>
            </div>
            <div style={st.row}>
              <Field label="Business name" half><input className="iv-in" style={st.input} value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} /></Field>
              <Field label="Phone" half><input className="iv-in" style={st.input} value={biz.phone} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} /></Field>
            </div>
            <Field label="Address" hint="Press Enter for a new line"><textarea className="iv-in" style={st.inputArea} rows={2} value={biz.address} onChange={(e) => setBiz({ ...biz, address: e.target.value })} /></Field>
            <Field label="Email"><input className="iv-in" style={st.input} value={biz.email} onChange={(e) => setBiz({ ...biz, email: e.target.value })} /></Field>
            <div style={st.row}>
              <Field label="GSTIN" half><input className="iv-in" style={st.input} value={biz.gstin} onChange={(e) => setBiz({ ...biz, gstin: e.target.value.toUpperCase() })} /></Field>
              <Field label="PAN" half><input className="iv-in" style={st.input} value={biz.pan} onChange={(e) => setBiz({ ...biz, pan: e.target.value.toUpperCase() })} /></Field>
            </div>
          </section>

          <section className="iv-card" style={{ ...st.card, marginTop: 16 }}>
            <h2 style={st.cardTitle}>Invoice details</h2>
            <div style={st.row}>
              <Field label="Invoice no." half><input className="iv-in" style={st.input} value={invNo} onChange={(e) => setInvNo(e.target.value)} /></Field>
              <Field label="Date" hint="Defaults to today" half><input className="iv-in" style={st.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            </div>
            <div style={st.subHead}>Bill to</div>
            <div style={st.row}>
              <div style={{ ...st.field, flex: 1, minWidth: 0, position: "relative" }}>
                <span style={st.fieldLabel}>Client name<span style={st.fieldHint}> · type to search saved customers</span></span>
                <input className="iv-in" style={st.input} value={client.name} placeholder="Customer name" autoComplete="off"
                  onChange={(e) => { setClient({ ...client, name: e.target.value }); setNameSuggestOpen(true); setActiveSug(-1); }}
                  onFocus={() => { if (client.name.trim()) setNameSuggestOpen(true); }}
                  onBlur={() => setTimeout(() => setNameSuggestOpen(false), 120)}
                  onKeyDown={(e) => {
                    if (!nameSuggestOpen || suggestions.length === 0) return;
                    if (e.key === "ArrowDown") { e.preventDefault(); setActiveSug((i) => Math.min(i + 1, suggestions.length - 1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveSug((i) => Math.max(i - 1, 0)); }
                    else if (e.key === "Enter") { if (activeSug >= 0) { e.preventDefault(); pickCustomer(suggestions[activeSug]); } }
                    else if (e.key === "Escape") { setNameSuggestOpen(false); }
                  }} />
                {nameSuggestOpen && suggestions.length > 0 && (
                  <div style={st.suggestBox}>
                    {suggestions.map((c, i) => (
                      <button key={(c.phone || c.name) + i} type="button" className="iv-sug"
                        style={{ ...st.suggestItem, ...(i === activeSug ? { background: "#fffcf9" } : null) }}
                        onMouseDown={(e) => { e.preventDefault(); pickCustomer(c); }}>
                        <span style={st.suggestName}>{c.name || "—"}</span>
                        <span style={st.suggestMeta}>{c.phone || c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Field label="Phone" half><input className="iv-in" style={st.input} value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} /></Field>
            </div>
            <Field label="Address" hint="Press Enter for a new line"><textarea className="iv-in" style={st.inputArea} rows={2} value={client.address} onChange={(e) => setClient({ ...client, address: e.target.value })} /></Field>
            <div style={st.row}>
              <Field label="Email" half><input className="iv-in" style={st.input} value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} /></Field>
              <Field label="GSTIN (optional)" half><input className="iv-in" style={st.input} value={client.gstin} onChange={(e) => setClient({ ...client, gstin: e.target.value.toUpperCase() })} /></Field>
            </div>
          </section>

          <section className="iv-card" style={{ ...st.card, marginTop: 16 }}>
            <h2 style={st.cardTitle}>Items</h2>
            <div className="iv-itemgrid" style={st.itemHead}>
              <span>Description</span><span style={{ textAlign: "right" }}>Qty</span><span style={{ textAlign: "right" }}>Rate (₹)</span><span style={{ textAlign: "right" }}>Amount</span><span />
            </div>
            {items.map((it) => (
              <div key={it.id} className="iv-itemgrid" style={st.itemRow}>
                <input className="iv-in" style={st.input} placeholder="Service / product" value={it.desc} onChange={(e) => setItem(it.id, "desc", e.target.value)} />
                <input className="iv-in" style={st.inputNum} type="number" min="0" value={it.qty} onChange={(e) => setItem(it.id, "qty", e.target.value)} />
                <input className="iv-in" style={st.inputNum} type="number" min="0" placeholder="0" value={it.rate} onChange={(e) => setItem(it.id, "rate", e.target.value)} />
                <span style={st.colAmtVal}>{rupee(num(it.qty) * num(it.rate))}</span>
                <button className="iv-del" style={st.delBtn} onClick={() => removeItem(it.id)} aria-label="Remove item" disabled={items.length === 1}><Icon name="trash" size={15} /></button>
              </div>
            ))}
            <button className="iv-add" style={st.addBtn} onClick={addItem}><Icon name="plus" size={15} /> Add item</button>
            <div style={st.divider} />
            <div style={st.row}>
              <Field label="Discount" half>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="iv-in" style={{ ...st.input, width: 70, flex: "none" }} value={discType} onChange={(e) => setDiscType(e.target.value as any)}><option value="amount">₹</option><option value="percent">%</option></select>
                  <input className="iv-in" style={st.input} type="number" min="0" value={discVal} onChange={(e) => setDiscVal(e.target.value)} />
                </div>
              </Field>
              <Field label="GST %" half><input className="iv-in" style={st.input} type="number" min="0" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} /></Field>
            </div>
            <div style={st.field}>
              <span style={st.fieldLabel}>Payment method<span style={st.fieldHint}> · how they paid</span></span>
              <div style={st.segWrap}>
                {(["cash", "online"] as PayMethod[]).map((mth, idx) => (
                  <button key={mth} type="button" className="iv-seg"
                    style={{ ...st.segBtn, ...(idx === 1 ? { borderLeft: `1px solid ${LINE}` } : null), ...(payMethod === mth ? st.segBtnOn : null) }}
                    onClick={() => setPayMethod(mth)}>
                    <Icon name={mth === "cash" ? "banknote" : "card"} size={14} /> {mth === "cash" ? "Cash" : "Online"}
                  </button>
                ))}
              </div>
            </div>
            <div style={st.row}>
              <Field label="Advance received (₹)" hint="Optional — paid now" half>
                <input className="iv-in" style={st.input} type="number" min="0" value={advance} placeholder="0" onChange={(e) => setAdvance(e.target.value)} />
              </Field>
              <Field label="Balance due" half>
                <div style={{ ...st.readVal, color: balanceDue > 0 || advancePaid === 0 ? INK : GREEN }}>{advancePaid > 0 && balanceDue === 0 ? "Paid in full" : rupee(balanceDue)}</div>
              </Field>
            </div>
            <Field label="Notes / terms"><textarea className="iv-in" style={{ ...st.input, minHeight: 62, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            <Field label="Warranty details"><textarea className="iv-in" style={{ ...st.input, minHeight: 56, resize: "vertical" }} value={warranty} placeholder="e.g. 6 months warranty on LED & signage boards" onChange={(e) => setWarranty(e.target.value)} /></Field>
          </section>
        </div>

        {/* ── Right column: SRS-style live preview ── */}
        <div style={{ minWidth: 0 }}>
          <div className="iv-preview" style={st.previewWrap}>
            <div style={st.previewLabel}>Preview</div>
            <div style={st.pvPage}>
              {/* Header */}
              <div style={st.pvHdr}>
                {logoBase64
                  ? <img src={logoBase64} alt={biz.name} style={st.pvLogo} />
                  : logoOk
                    ? <img src="/images/abhijit_art_logo.png" alt={biz.name} style={st.pvLogo} onError={() => setLogoOk(false)} />
                    : <div style={st.pvLogoFb}>{(biz.name || "AA").slice(0, 2)}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={st.pvBizName}>{biz.name || "Abhijit Art"}</div>
                  {biz.pan && <div style={st.pvBizPan}>Pan No &nbsp;<b>{biz.pan}</b></div>}
                  {biz.address && <div style={st.pvBizAddr}>📍 {biz.address}</div>}
                  <div style={st.pvBizSub}>
                    {biz.phone && <span>📞 {biz.phone}</span>}
                    {biz.email && <span>✉ {biz.email}</span>}
                    {biz.gstin && <span>GSTIN: {biz.gstin}</span>}
                  </div>
                </div>
                <div style={st.pvInvMeta}>
                  <div style={st.pvInvRow}>
                    <div style={st.pvInvCol}><div style={st.pvInvLbl}>Invoice Date</div><div style={st.pvInvVal}>{fmt(date)}</div></div>
                    <div style={st.pvInvCol}><div style={st.pvInvLbl}>Invoice No</div><div style={st.pvInvVal}>#{invNo}</div></div>
                  </div>
                </div>
              </div>
              {/* Bill To */}
              <div style={st.pvBillTo}>
                <div style={st.pvBtLabel}>Bill To</div>
                <div style={st.pvBtName}>{client.name || "—"}</div>
                {client.address && <div style={st.pvBtLine}>{client.address}</div>}
                {client.phone && <div style={st.pvBtLine}>📞 {client.phone}</div>}
                {client.gstin && <div style={st.pvBtLine}>GSTIN: {client.gstin}</div>}
              </div>
              {/* Items table */}
              <table style={st.pvTable}>
                <thead><tr>
                  <th style={{ ...st.pvTh, width: 20, textAlign: "center" }}>No</th>
                  <th style={st.pvTh}>Items</th>
                  <th style={{ ...st.pvTh, textAlign: "right", width: 28 }}>Qty</th>
                  <th style={{ ...st.pvTh, textAlign: "right", width: 50 }}>Rate</th>
                  {discountAmt > 0 && <th style={{ ...st.pvTh, textAlign: "right", width: 44 }}>Disc.</th>}
                  {num(taxPct) > 0 && <th style={{ ...st.pvTh, textAlign: "right", width: 38 }}>Tax</th>}
                  <th style={{ ...st.pvTh, textAlign: "right", width: 54 }}>Total</th>
                </tr></thead>
                <tbody>
                  {items.filter(it => it.desc.trim() || num(it.rate) > 0).length === 0
                    ? <tr><td colSpan={6} style={{ ...st.pvTd, textAlign: "center", color: "#aaa" }}>No items yet</td></tr>
                    : items.filter(it => it.desc.trim() || num(it.rate) > 0).map((it, i) => {
                        const lt = num(it.qty) * num(it.rate);
                        const ld = discountAmt > 0 && subtotal > 0 ? (lt / subtotal) * discountAmt : 0;
                        const lx = taxAmt > 0 && subtotal > 0 ? (lt / subtotal) * taxAmt : 0;
                        return <tr key={it.id}>
                          <td style={{ ...st.pvTd, textAlign: "center", color: "#aaa" }}>{i + 1}.</td>
                          <td style={st.pvTd}>{it.desc || "—"}</td>
                          <td style={{ ...st.pvTd, textAlign: "right" }}>{num(it.qty)}</td>
                          <td style={{ ...st.pvTd, textAlign: "right" }}>₹{num(it.rate).toLocaleString("en-IN")}</td>
                          {discountAmt > 0 && <td style={{ ...st.pvTd, textAlign: "right" }}>₹{Math.round(ld).toLocaleString("en-IN")}</td>}
                          {num(taxPct) > 0 && <td style={{ ...st.pvTd, textAlign: "right" }}>{Math.round(lx).toLocaleString("en-IN")}</td>}
                          <td style={{ ...st.pvTd, textAlign: "right", fontWeight: 700 }}>₹{Math.round(lt - ld + lx).toLocaleString("en-IN")}</td>
                        </tr>;
                      })}
                </tbody>
                <tfoot><tr style={st.pvSubRow}>
                  <td style={{ ...st.pvTd, textAlign: "center" }}>Sub.</td>
                  <td style={st.pvTd}><b>SUBTOTAL</b></td>
                  <td style={{ ...st.pvTd, textAlign: "right" }}>{items.filter(it => it.desc.trim() || num(it.rate) > 0).reduce((s, it) => s + num(it.qty), 0)}</td>
                  <td style={{ ...st.pvTd, textAlign: "right" }}>{Math.round(subtotal).toLocaleString("en-IN")}</td>
                  {discountAmt > 0 && <td style={{ ...st.pvTd, textAlign: "right" }}>₹{Math.round(discountAmt).toLocaleString("en-IN")}</td>}
                  {num(taxPct) > 0 && <td style={{ ...st.pvTd, textAlign: "right" }}>{Math.round(taxAmt).toLocaleString("en-IN")}</td>}
                  <td style={{ ...st.pvTd, textAlign: "right" }}>₹{Math.round(subtotal - discountAmt).toLocaleString("en-IN")}</td>
                </tr></tfoot>
              </table>
              {/* Bottom */}
              <div style={st.pvBot}>
                <div style={st.pvBotL}>
                  {notes.trim() && <div><div style={st.pvTLbl}>Terms &amp; Conditions</div><div style={st.pvTTxt}>{notes}</div></div>}
                  {warranty.trim() && <div><div style={st.pvTLbl}>Warranty</div><div style={st.pvTTxt}>{warranty}</div></div>}
                  <div style={st.pvQrRow}>
                    {qrBase64 && (
                      <div style={st.pvQrWrap}>
                        <div style={st.pvQrLbl}>Payment QR Code</div>
                        <img src={qrBase64} alt="QR" style={st.pvQrImg} />
                        <div style={st.pvQrUpi}>UPI: 9932913826@okbizaxis</div>
                      </div>
                    )}
                    <div style={st.pvSig}>
                      {sigBase64 && <img src={sigBase64} alt="Signature" style={{ height: 18, width: "auto", display: "block", margin: "0 auto 2px" }} />}
                      <div style={st.pvSigLine} />
                      <div style={st.pvSigLbl}>Authorised Signatory</div>
                    </div>
                  </div>
                </div>
                <div style={st.pvBotR}>
                  <div style={st.pvTRow}><span>Taxable Amount</span><span>₹{(subtotal - discountAmt).toFixed(2)}</span></div>
                  {num(taxPct) > 0 && <><div style={st.pvTRow}><span>CGST @{num(taxPct) / 2}%</span><span>{(taxAmt / 2).toFixed(2)}</span></div><div style={st.pvTRow}><span>SGST @{num(taxPct) / 2}%</span><span>{(taxAmt / 2).toFixed(2)}</span></div></>}
                  {advancePaid > 0 && <div style={st.pvTRow}><span>Amount Received</span><span style={{ color: "#15803d" }}>−₹{advancePaid.toFixed(2)}</span></div>}
                  <div style={st.pvGrand}>
                    <div style={st.pvGrandRow}><span>Total Amount</span><span style={{ fontSize: 11, fontWeight: 900 }}>₹{total.toFixed(2)}</span></div>
                    {balanceDue > 0 && <div style={st.pvGrandDue}><span>Balance Due</span><span>₹{balanceDue.toFixed(2)}</span></div>}
                  </div>
                  <div style={st.pvWords}>
                    <div style={st.pvWordsLbl}>Total Amount (in words)</div>
                    <div style={st.pvWordsTxt}>{amtWordsPreview(total)}</div>
                  </div>
                  <div style={st.pvThankYou}>Thank you for your business!</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

      {/* ── Force Add Customer modal (before billing an unregistered client) ── */}
      {addCustOpen && (
        <div style={st.backdrop} onClick={() => !addCustBusy && setAddCustOpen(false)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <div style={st.modalHead}>
              <h3 style={st.modalTitle}>Add customer first</h3>
              <button className="iv-x" style={st.xBtn} onClick={() => setAddCustOpen(false)}><Icon name="x" size={17} /></button>
            </div>
            <div style={st.modalBody}>
              <div style={st.mailNote}>This customer isn't in your database yet. Add them once and the bill continues automatically — their invoices link up normally.</div>
              <Field label="Full name"><input className="iv-in" style={st.input} value={addCustForm.name} onChange={(e) => setAddCustForm({ ...addCustForm, name: e.target.value })} autoFocus /></Field>
              <div style={st.row}>
                <Field label="Phone" half><input className="iv-in" style={st.input} value={addCustForm.phone} onChange={(e) => setAddCustForm({ ...addCustForm, phone: e.target.value })} placeholder="9876543210" /></Field>
                <Field label="Email (optional)" half><input className="iv-in" style={st.input} type="email" value={addCustForm.email} onChange={(e) => setAddCustForm({ ...addCustForm, email: e.target.value })} placeholder="name@example.com" /></Field>
              </div>
              <Field label="Address (optional)"><textarea className="iv-in" style={st.inputArea} rows={2} value={addCustForm.address} onChange={(e) => setAddCustForm({ ...addCustForm, address: e.target.value })} placeholder="Shop / area, town" /></Field>
              <Field label="Notes (optional)"><textarea className="iv-in" style={st.inputArea} rows={2} value={addCustForm.notes} onChange={(e) => setAddCustForm({ ...addCustForm, notes: e.target.value })} placeholder="What they usually order, payment terms…" /></Field>
              {addCustErr && <div style={st.errBox}>{addCustErr}</div>}
            </div>
            <div style={st.modalFoot}>
              <button className="iv-ghost" style={st.ghostBtn} onClick={() => setAddCustOpen(false)} disabled={addCustBusy}>Cancel</button>
              <button className="iv-cta" style={st.cta} onClick={submitAddCustomer} disabled={addCustBusy || !addCustForm.name.trim()}>{addCustBusy ? "Adding…" : <><Icon name="check" size={15} /> Add &amp; Continue</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Email modal ── */}
      {mailOpen && (
        <div style={st.backdrop} onClick={() => !mailBusy && setMailOpen(false)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <div style={st.modalHead}>
              <h3 style={st.modalTitle}>Email invoice {invNo}</h3>
              <button className="iv-x" style={st.xBtn} onClick={() => setMailOpen(false)}><Icon name="x" size={17} /></button>
            </div>
            <div style={st.modalBody}>
              {mailSent ? (<div style={st.okBox}>{mailSent}</div>) : (
                <>
                  <div style={st.mailNote}>The invoice is included in the email — the client sees it without downloading anything.</div>
                  <Field label="Send to"><input className="iv-in" style={st.input} type="email" value={mailTo} onChange={(e) => setMailTo(e.target.value)} placeholder="client@example.com" autoFocus /></Field>
                  <Field label="Subject"><input className="iv-in" style={st.input} value={mailSubject} onChange={(e) => setMailSubject(e.target.value)} /></Field>
                  <Field label="Message"><textarea className="iv-in" style={{ ...st.input, minHeight: 132, resize: "vertical" }} value={mailMessage} onChange={(e) => setMailMessage(e.target.value)} /></Field>
                  <div style={st.mailSummary}><span>{items.filter((it) => it.desc.trim() || num(it.rate) > 0).length} line item(s)</span><span style={st.mailTotal}>{rupee(total)}</span></div>
                </>
              )}
              {mailErr && <div style={st.errBox}>{mailErr}</div>}
            </div>
            <div style={st.modalFoot}>
              {mailSent ? (<button className="iv-cta" style={{ ...st.cta, marginLeft: "auto" }} onClick={() => setMailOpen(false)}>Done</button>) : (<><button className="iv-ghost" style={st.ghostBtn} onClick={() => setMailOpen(false)} disabled={mailBusy}>Cancel</button><button className="iv-cta" style={st.cta} onClick={sendInvoice} disabled={mailBusy || !mailTo.trim() || !mailSubject.trim()}>{mailBusy ? "Sending…" : <><Icon name="send" size={15} /> Send invoice</>}</button></>)}
            </div>
          </div>
        </div>
      )}

      {/* ── WhatsApp modal ── */}
      {waOpen && (
        <div style={st.backdrop} onClick={() => !waBusy && setWaOpen(false)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <div style={st.modalHead}>
              <h3 style={st.modalTitle}>Send invoice {invNo} on WhatsApp</h3>
              <button className="iv-x" style={st.xBtn} onClick={() => setWaOpen(false)}><Icon name="x" size={17} /></button>
            </div>
            <div style={st.modalBody}>
              {waSent ? (<div style={st.okBox}>{waSent}</div>) : (
                <>
                  <div style={st.waNote}>Opens WhatsApp with this message ready to send. A shareable link to the invoice PDF is added automatically.</div>
                  <Field label="WhatsApp number" hint="10-digit mobile, or with country code"><input className="iv-in" style={st.input} value={waTo} onChange={(e) => setWaTo(e.target.value)} placeholder="e.g. 7405179066" autoFocus /></Field>
                  <Field label="Message"><textarea className="iv-in" style={{ ...st.input, minHeight: 150, resize: "vertical" }} value={waMessage} onChange={(e) => setWaMessage(e.target.value)} /></Field>
                  <div style={st.mailSummary}><span>{items.filter((it) => it.desc.trim() || num(it.rate) > 0).length} line item(s)</span><span style={st.mailTotal}>{rupee(total)}</span></div>
                </>
              )}
              {waErr && <div style={st.errBox}>{waErr}</div>}
            </div>
            <div style={st.modalFoot}>
              {waSent ? (<button className="iv-wacta" style={{ ...st.waCta, marginLeft: "auto" }} onClick={() => setWaOpen(false)}>Done</button>) : (<><button className="iv-ghost" style={st.ghostBtn} onClick={() => setWaOpen(false)} disabled={waBusy}>Cancel</button><button className="iv-wacta" style={st.waCta} onClick={sendWhatsApp} disabled={waBusy || waDigits(waTo).length < 10}>{waBusy ? "Preparing…" : <><Icon name="whatsapp" size={16} /> Open WhatsApp</>}</button></>)}
            </div>
          </div>
        </div>
      )}

      {/* ── Auto-save opt-in ── */}
      {askSave && (
        <div style={{ ...st.backdrop, zIndex: 1100 }}>
          <div style={{ ...st.modal, maxWidth: 440 }}>
            <div style={st.modalHead}><h3 style={st.modalTitle}>Save invoices automatically?</h3></div>
            <div style={st.modalBody}><p style={st.askText}>Keep every invoice you download or email in the <b>Invoices</b> tab. You'll only be asked this once. You can still hit <b>Save invoice</b> any time to save manually.</p></div>
            <div style={st.modalFoot}><button className="iv-ghost" style={st.ghostBtn} onClick={() => decideAutosave("off")}>Don't save</button><button className="iv-cta" style={st.cta} onClick={() => decideAutosave("on")}><Icon name="receipt" size={15} /> Yes, save automatically</button></div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .iv-x{transition:all .18s;} .iv-x:hover{color:${TERRA};border-color:${TERRA}55;background:#fffcf9;}
        .iv-card{background:${GLOW};border:1px solid ${LINE};box-shadow:${GLOW_SHADOW};}
        .iv-itemgrid{display:grid;grid-template-columns:minmax(0,1fr) 78px 108px 96px 30px;gap:8px;align-items:center;}
        @media(max-width:700px){.iv-itemgrid{grid-template-columns:minmax(0,1fr) 64px 84px 84px 28px;gap:6px;}}
        .iv-in[type="number"]{-moz-appearance:textfield;appearance:textfield;}
        .iv-in[type="number"]::-webkit-outer-spin-button,.iv-in[type="number"]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
        .iv-in{transition:border-color .18s,box-shadow .18s;} .iv-in:focus{border-color:${TERRA};box-shadow:0 0 0 3px ${TERRA}22;outline:none;}
        .iv-cta,.iv-ghost,.iv-add,.iv-del,.iv-link,.iv-seg,.iv-sug,.iv-wa,.iv-wacta,.iv-save{transition:all .2s ease;}
        .iv-cta:hover:not(:disabled){background:${TERRA_DK};box-shadow:0 12px 26px ${TERRA}40;transform:translateY(-1px);}
        .iv-cta:disabled,.iv-ghost:disabled,.iv-wa:disabled{opacity:.45;cursor:not-allowed;box-shadow:none;}
        .iv-ghost:hover:not(:disabled){background:#fffcf9;border-color:${TERRA}55;color:${TERRA};}
        .iv-wa:hover:not(:disabled){background:#edfaf1;border-color:${WA}66;color:${WA_DK};}
        .iv-wacta:hover:not(:disabled){background:${WA_DK};box-shadow:0 12px 26px ${WA}45;transform:translateY(-1px);}
        .iv-wacta:disabled{opacity:.45;cursor:not-allowed;box-shadow:none;}
        .iv-save:hover:not(:disabled){background:${TERRA};color:#fff;box-shadow:0 10px 22px ${TERRA}30;transform:translateY(-1px);}
        .iv-save:disabled{opacity:.45;cursor:not-allowed;box-shadow:none;}
        .iv-add:hover{border-color:${TERRA}66;color:${TERRA};background:#fffcf9;}
        .iv-del:hover:not(:disabled){color:${TERRA};background:#fdecea;} .iv-del:disabled{opacity:.35;cursor:not-allowed;}
        .iv-link:hover{color:${TERRA};} .iv-seg:hover{color:${TERRA};} .iv-sug:hover{background:#fffcf9;}
        @media(max-width:1100px){.iv-layout{grid-template-columns:minmax(0,1fr) !important;}.iv-preview{position:static !important;}}
        @media(prefers-reduced-motion:reduce){.iv-in,.iv-cta,.iv-ghost,.iv-add,.iv-del,.iv-link,.iv-seg,.iv-sug,.iv-wa,.iv-wacta,.iv-save{transition:none !important;}}
      `}</style>
      </div>
  );
}

function fmt(d: string) { if (!d) return ""; const dt = new Date(d); if (isNaN(dt.getTime())) return d; return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
function signStamp() { return new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }); }
function waDigits(raw: string) { let d = String(raw || "").replace(/\D/g, "").replace(/^0+/, ""); if (d.length === 10) d = "91" + d; return d; }
function escapeLines(s: string) { return escapeHtml(s).replace(/\r?\n/g, "<br/>"); }
function escapeHtml(s: string) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)); }

const st: Record<string, React.CSSProperties> = {
  page: { fontFamily: "'DM Sans',system-ui,sans-serif", color: "#1f2430", minWidth: 0, maxWidth: "100%" },
  head: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 22 },
  title: { fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.6, color: "#1f2430" },
  sub: { color: "#8a8f9a", fontSize: 13.5, margin: "6px 0 0" },
  headActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  savedChip: { display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "center", padding: "8px 13px", fontSize: 12.5, fontWeight: 700, color: "#15733f", background: "#e8f6ee", border: "1px solid #bfe3cd", fontFamily: "'DM Sans',system-ui,sans-serif", whiteSpace: "nowrap" },
  cta: { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 0, border: "none", background: "#d9542f", color: "#fff", fontFamily: "'DM Sans',system-ui,sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer", boxShadow: "0 10px 22px #d9542f30" },
  ghostBtn: { display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 18px", borderRadius: 0, border: "1px solid #f0e6dc", background: "#ffffff", color: "#1f2430", fontFamily: "'DM Sans',system-ui,sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" },
  waCta: { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 0, border: "none", background: "#1fa855", color: "#fff", fontFamily: "'DM Sans',system-ui,sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer", boxShadow: "0 10px 22px #1fa85530" },
  saveBtn: { display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 18px", borderRadius: 0, border: "1px solid #d9542f", background: "#ffffff", color: "#d9542f", fontFamily: "'DM Sans',system-ui,sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" },
  layout: { display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, alignItems: "start" },
  card: { borderRadius: 0, padding: "20px 22px", minWidth: 0, background: "radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.075) 0%, rgba(217,84,47,.022) 42%, rgba(217,84,47,0) 72%), linear-gradient(180deg, #fffcf9 0%, #ffffff 60%)", border: "1px solid #f0e6dc", boxShadow: "0 1px 2px rgba(17,20,30,.04), 0 10px 26px -18px rgba(217,84,47,.28)" },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: 800, margin: "0 0 12px", letterSpacing: -0.2, color: "#1f2430" },
  subHead: { fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" as const, color: "#8a8f9a", marginTop: 20 },
  saveLink: { border: "none", background: "transparent", color: "#8a8f9a", fontFamily: "'DM Sans',system-ui,sans-serif", fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: 0 },
  row: { display: "flex", gap: 12, flexWrap: "wrap" as const },
  field: { display: "block", marginTop: 12 },
  fieldLabel: { display: "block", fontSize: 12.5, fontWeight: 700, color: "#545a67", marginBottom: 6 },
  fieldHint: { fontWeight: 500, color: "#8a8f9a", fontSize: 11.5 },
  input: { width: "100%", boxSizing: "border-box" as const, padding: "10px 12px", border: "1px solid #e6dcd2", borderRadius: 0, fontSize: 14, fontFamily: "'DM Sans',system-ui,sans-serif", background: "#fff", color: "#1f2430", colorScheme: "light" as const },
  readVal: { width: "100%", boxSizing: "border-box" as const, padding: "10px 12px", border: "1px solid #f0e6dc", borderRadius: 0, fontSize: 14, fontWeight: 800, fontFamily: "'DM Sans',system-ui,sans-serif", background: "#fbf7f3", color: "#1f2430", fontVariantNumeric: "tabular-nums" as const, display: "flex", alignItems: "center", minHeight: 40 },
  inputArea: { width: "100%", boxSizing: "border-box" as const, padding: "10px 12px", border: "1px solid #e6dcd2", borderRadius: 0, fontSize: 14, fontFamily: "'DM Sans',system-ui,sans-serif", background: "#fff", color: "#1f2430", resize: "vertical" as const, minHeight: 58, lineHeight: 1.5 },
  inputNum: { width: "100%", boxSizing: "border-box" as const, padding: "10px 10px", border: "1px solid #e6dcd2", borderRadius: 0, fontSize: 14, fontFamily: "'DM Sans',system-ui,sans-serif", background: "#fff", color: "#1f2430", colorScheme: "light" as const, textAlign: "right" as const, fontVariantNumeric: "tabular-nums" as const },
  suggestBox: { position: "absolute" as const, top: "100%", left: 0, right: 0, zIndex: 60, marginTop: 4, background: "#ffffff", border: "1px solid #f0e6dc", boxShadow: "0 16px 38px -14px rgba(24,22,28,.30)", maxHeight: 240, overflowY: "auto" as const },
  suggestItem: { display: "flex", alignItems: "baseline", gap: 10, width: "100%", textAlign: "left" as const, padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "'DM Sans',system-ui,sans-serif", borderBottom: "1px solid #f4f1ec" },
  suggestName: { fontWeight: 700, color: "#1f2430", fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  suggestMeta: { fontSize: 12, color: "#8a8f9a", marginLeft: "auto", whiteSpace: "nowrap" as const, fontVariantNumeric: "tabular-nums" as const },
  itemHead: { fontSize: 10.5, fontWeight: 700, color: "#8a8f9a", letterSpacing: 0.7, textTransform: "uppercase" as const, padding: "0 2px 8px" },
  itemRow: { marginBottom: 8 },
  colAmtVal: { textAlign: "right" as const, fontSize: 13, fontWeight: 800, color: "#1f2430", fontVariantNumeric: "tabular-nums" as const, overflowWrap: "anywhere" as const },
  addBtn: { display: "inline-flex", alignItems: "center", gap: 7, marginTop: 4, padding: "9px 15px", borderRadius: 0, border: "1px dashed #ddd0c4", background: "transparent", color: "#545a67", fontFamily: "'DM Sans',system-ui,sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  delBtn: { width: 30, height: 30, flex: "none", display: "grid", placeItems: "center", borderRadius: 0, border: "none", background: "transparent", color: "#b6bac3", cursor: "pointer" },
  divider: { height: 1, background: "#f2e8de", margin: "18px 0 4px" },
  segWrap: { display: "inline-flex", border: "1px solid #f0e6dc", background: "#ffffff" },
  segBtn: { padding: "10px 18px", border: "none", background: "transparent", color: "#545a67", fontFamily: "'DM Sans',system-ui,sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 },
  segBtnOn: { background: "#d9542f", color: "#fff" },
  backdrop: { position: "fixed" as const, inset: 0, background: "rgba(24,22,28,.5)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box" as const },
  modal: { width: "100%", maxWidth: 520, maxHeight: "calc(100vh - 40px)", background: "#fffdfb", border: "1px solid #f0e6dc", boxShadow: "0 30px 80px rgba(24,22,28,.34)", display: "flex", flexDirection: "column" as const, boxSizing: "border-box" as const, overflow: "hidden" },
  modalHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "17px 22px", borderBottom: "1px solid #f0e6dc", background: "#ffffff", flexShrink: 0 },
  modalTitle: { fontSize: 17, fontWeight: 800, margin: 0, color: "#1f2430", letterSpacing: -0.2 },
  xBtn: { width: 34, height: 34, border: "1px solid #e6dcd2", background: "#ffffff", color: "#545a67", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0, borderRadius: 0 },
  modalBody: { padding: 22, overflowY: "auto" as const, flex: 1 },
  modalFoot: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderBottom: "1px solid #f0e6dc", background: "#ffffff", flexShrink: 0, flexWrap: "wrap" as const },
  needItems: { marginBottom: 16, padding: "11px 15px", background: "#fbf3e3", border: "1px solid #efdcb2", fontSize: 12.5, color: "#8a6a1c", lineHeight: 1.55 },
  mailNote: { padding: "11px 14px", background: "#fffcf9", border: "1px solid #f0e6dc", fontSize: 12.5, color: "#545a67", lineHeight: 1.55, marginBottom: 4 },
  waNote: { padding: "11px 14px", background: "#effaf3", border: "1px solid #cfead9", fontSize: 12.5, color: "#2f6a45", lineHeight: 1.55, marginBottom: 4 },
  mailSummary: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, paddingTop: 14, borderTop: "1px solid #f0e6dc", fontSize: 12.5, color: "#8a8f9a", fontWeight: 600 },
  mailTotal: { fontSize: 17, fontWeight: 800, color: "#d9542f", fontVariantNumeric: "tabular-nums" as const },
  okBox: { padding: "13px 16px", background: "#e8f6ee", border: "1px solid #bfe3cd", color: "#15733f", fontSize: 13.5, fontWeight: 600 },
  errBox: { marginTop: 16, padding: "11px 14px", fontSize: 13, lineHeight: 1.5, color: "#8a2f16", background: "#fdecea", border: "1px solid #f3cfc2" },
  askText: { margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "#545a67" },
  // ── SRS Preview panel ──
  previewWrap: { position: "sticky" as const, top: 20, minWidth: 0 },
  previewLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" as const, color: "#8a8f9a", marginBottom: 8 },
  pvPage: { background: "#fff", border: "1px solid #e0d8c8", fontFamily: "'Inter',Arial,sans-serif", fontSize: 7, color: "#1a1a2e", display: "flex", flexDirection: "column" as const, boxShadow: "0 2px 12px rgba(0,0,0,.12)" },
  pvHdr: { display: "flex", alignItems: "center", gap: 6, padding: "6px 8px 5px", borderBottom: "2px solid #e89a3c", background: "linear-gradient(135deg,#fff2e6 0%,#fff8f0 50%,#fff 100%)" },
  pvLogo: { width: 44, height: 44, objectFit: "contain" as const, flexShrink: 0 },
  pvLogoFb: { width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f0e8d0", border: "1px solid #c8a84b", borderRadius: "50%", fontSize: 7, fontWeight: 800, color: "#8a6a1c" },
  pvBizName: { fontSize: 10, fontWeight: 900, color: "#c56a3a", lineHeight: 1.1 },
  pvBizPan: { fontSize: 5.5, color: "#444", fontWeight: 600, marginTop: 1 },
  pvBizAddr: { fontSize: 5, color: "#666", marginTop: 1 },
  pvBizSub: { fontSize: 5, color: "#666", marginTop: 1, display: "flex", flexWrap: "wrap" as const, gap: 5 },
  pvInvMeta: { textAlign: "right" as const, flexShrink: 0, alignSelf: "center" },
  pvInvRow: { display: "flex", gap: 8, justifyContent: "flex-end" },
  pvInvCol: { textAlign: "right" as const },
  pvInvLbl: { fontSize: 5, fontWeight: 700, color: "#8a8f9a", textTransform: "uppercase" as const, letterSpacing: 0.4 },
  pvInvVal: { fontSize: 7, fontWeight: 800, color: "#c56a3a", marginTop: 1 },
  pvBillTo: { padding: "4px 8px", borderBottom: "1px solid #f0e0d0", background: "linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)" },
  pvBtLabel: { fontSize: 5.5, fontWeight: 800, color: "#c56a3a", textTransform: "uppercase" as const, letterSpacing: 0.6, paddingBottom: 1, borderBottom: "1.5px solid #e89a3c", display: "inline-block", marginBottom: 2 },
  pvBtName: { fontSize: 7, fontWeight: 700 },
  pvBtLine: { fontSize: 5.5, color: "#555", marginTop: 1 },
  pvTable: { width: "100%", borderCollapse: "collapse" as const, fontSize: 6 },
  pvTh: { background: "#c56a3a", color: "#fff", padding: "2px 3px", fontSize: 5.5, fontWeight: 700, textAlign: "left" as const },
  pvTd: { padding: "2px 3px", borderBottom: "0.5px solid #ede8dc", fontSize: 6, verticalAlign: "top" as const },
  pvSubRow: { background: "linear-gradient(135deg,#fff0e0 0%,#fdf4ea 100%)", fontWeight: 800 },
  pvBot: { display: "flex", flex: 1, borderTop: "1px solid #e8e0cc", minHeight: 80 },
  pvBotL: { flex: 1.1, padding: "5px 7px", display: "flex", flexDirection: "column" as const, gap: 3, borderRight: "1px solid #e8e0cc" },
  pvBotR: { flex: 1, padding: "5px 7px", display: "flex", flexDirection: "column" as const, gap: 2 },
  pvTLbl: { fontSize: 5.5, fontWeight: 800, color: "#c56a3a", marginBottom: 1 },
  pvTTxt: { fontSize: 5, color: "#555", lineHeight: 1.4 },
  pvQrRow: { display: "flex", gap: 5, alignItems: "flex-end", marginTop: "auto" },
  pvQrWrap: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 1 },
  pvQrImg: { width: 56, height: 56, objectFit: "contain" as const, border: "0.5px solid #ddd" },
  pvQrLbl: { fontSize: 4.5, fontWeight: 700, color: "#c56a3a", textAlign: "center" as const },
  pvQrBadges: { display: "flex", gap: 1, flexWrap: "wrap" as const, justifyContent: "center" },
  pvBadge: { fontSize: 3.5, fontWeight: 700, color: "#c56a3a", border: "0.5px solid #c8a84b", padding: "0.5px 1.5px", background: "#fffdf0" },
  pvQrUpi: { fontSize: 4, color: "#555", textAlign: "center" as const },
  pvSig: { flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "flex-end", textAlign: "center" as const },
  pvSigLine: { width: 28, borderBottom: "0.5px solid #888", margin: "2px auto 1px" },
  pvSigLbl: { fontSize: 4.5, color: "#555" },
  pvTRow: { display: "flex", justifyContent: "space-between", fontSize: 6, padding: "1px 0", borderBottom: "0.5px solid #ede8dc" },
  pvGrand: { background: "#c56a3a", color: "#fff", padding: "3px 4px", marginTop: 2 },
  pvGrandRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 6.5, fontWeight: 700 },
  pvGrandDue: { display: "flex", justifyContent: "space-between", fontSize: 5.5, color: "#ffccaa", marginTop: 1 },
  pvWords: { border: "0.5px solid #f0d8c0", padding: "2px 3px", marginTop: 2, background: "linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)" },
  pvWordsLbl: { fontSize: 5, fontWeight: 700, color: "#c56a3a", marginBottom: 1 },
  pvWordsTxt: { fontSize: 5.5, color: "#333", fontWeight: 600 },
  pvThankYou: { textAlign: "right" as const, fontSize: 7, fontWeight: 800, color: "#c56a3a", marginTop: "auto", paddingTop: 6, fontStyle: "italic" as const },
};