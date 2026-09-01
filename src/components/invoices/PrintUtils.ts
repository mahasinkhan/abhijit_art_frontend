// src/components/invoices/PrintUtils.ts
import { Invoice, num, round2, effectivePaid } from "./types";

const e = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c: string) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const fmtN = (n: number) => Math.round(n).toLocaleString("en-IN");
const fmtD = (d: string) => { const dt = new Date(d); if (isNaN(dt.getTime())) return d; return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }); };
const fmtTime = (d: string) => { if (!d) return ""; const dt = new Date(d); return isNaN(dt.getTime()) ? "" : dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); };
const sizeCell = (it:{size?:string}) => it.size ? e(it.size) : "—";
const pcsCell  = (it:{size?:string;pcs?:number}) => (it.size && it.pcs && it.pcs > 1) ? String(it.pcs) : "—";
const qtyCell  = (it:{qty:number;unit?:string}) => `${it.qty}${it.unit?` ${e(it.unit)}`:""}`;
const rateCell = (it:{rate:number;unit?:string}, r:string) => `₹${r}${it.unit?`/${e(it.unit)}`:""}`;

function amtWords(n: number): string {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const m = Math.round(n); if (m === 0) return "Zero Only";
  function b(x: number): string { if (x < 20) return ones[x]; if (x < 100) return tens[Math.floor(x/10)] + (x%10 ? " "+ones[x%10] : ""); return ones[Math.floor(x/100)]+" Hundred"+(x%100 ? " "+b(x%100) : ""); }
  let r = "";
  if (m >= 10000000) r += b(Math.floor(m/10000000))+" Crore ";
  if (m >= 100000)   r += b(Math.floor((m%10000000)/100000))+" Lakh ";
  if (m >= 1000)     r += b(Math.floor((m%100000)/1000))+" Thousand ";
  r += b(m%1000);
  return r.trim()+" Only";
}

type PrintParams = {
  logoSrc:string; qrSrc:string; bizName:string; bizPan?:string; bizGstin?:string;
  bizAddress?:string; bizPhone?:string; bizEmail?:string; invTime?:string;
  invNo:string; invDate:string; clientName:string; clientAddr?:string;
  clientPhone?:string; clientGstin?:string;
  items:{desc:string;qty:number;rate:number;size?:string;unit?:string;pcs?:number}[];
  discType:string; discVal:number; taxPct:number;
  subtotal:number; discountAmt:number; taxAmt:number; total:number;
  paidAmount:number; notes?:string; warranty?:string; fullyPaid?:boolean;
};

// ══ FULL A4 ════════════════════════════════════════════════════════════════
export function buildFullA4HTML(p: PrintParams): string {
  const taxable = p.subtotal - p.discountAmt; const cgst = p.taxAmt/2; const due = Math.max(p.total - p.paidAmount, 0);
  const rows = p.items.map((it,i) => { const lt=it.qty*it.rate; const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0; const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0; return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td c">${sizeCell(it)}</td><td class="td c">${pcsCell(it)}</td><td class="td r">${qtyCell(it)}</td><td class="td r">${rateCell(it,fmtN(it.rate))}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}</td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}</td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`; }).join("");
  const css = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
body{font-family:'Inter',Arial,sans-serif;font-size:9pt;color:#1a1a2e;background:#f0ece4;display:flex;justify-content:center;padding:8px}
.page{width:210mm;min-height:297mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.18);display:flex;flex-direction:column}
.inv{flex:1;display:flex;flex-direction:column}
.hdr{display:flex;align-items:center;gap:4mm;padding:4mm 5mm 3.5mm;border-bottom:2.5px solid #c56a3a;background:#fff}
.logo{width:28mm;height:28mm;object-fit:contain;flex-shrink:0}
.logo-fb{width:16mm;height:16mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#fdf0e7;border:1px solid #f2ddd0;border-radius:50%;font-size:8pt;font-weight:800;color:#c56a3a}
.divider{width:.4mm;align-self:stretch;background:#f2ddd0;margin:1mm 1mm;flex-shrink:0}
.biz{flex:1}.biz-name{font-size:14pt;font-weight:900;color:#2a231d;line-height:1.1}.biz-pan{font-size:7pt;color:#444;font-weight:600;margin-top:.6mm}.biz-addr{font-size:6.5pt;color:#8a8378;margin-top:1mm;line-height:1.45}.biz-sub{font-size:6.5pt;color:#8a8378;margin-top:1mm;display:flex;flex-direction:column;gap:.5mm}
.inv-meta{text-align:right;flex-shrink:0;align-self:flex-start}.inv-row{display:flex;gap:5mm;justify-content:flex-end}.inv-col{text-align:right}.inv-lbl{font-size:6.5pt;font-weight:700;color:#8a8378;text-transform:uppercase;letter-spacing:.4px}.inv-val{font-size:9pt;font-weight:800;color:#2a231d;margin-top:.3mm}
.inv-eyebrow{font-size:12pt;font-weight:900;letter-spacing:3px;color:#c56a3a;margin-bottom:2mm}
.billto{padding:2.5mm 5mm;border-bottom:1px solid #f2ddd0;background:#fff}
.bt-lbl{font-size:6.5pt;font-weight:700;color:#c56a3a;text-transform:uppercase;letter-spacing:.9px;margin-bottom:1mm}.bt-name{font-size:10pt;font-weight:800;color:#2a231d}.bt-line{font-size:6.5pt;color:#8a8378;margin-top:.5mm}
.tbl{width:100%;border-collapse:collapse}
.th{background:#fdf0e7;color:#7a5240;padding:2.2mm 2.5mm;font-size:7pt;font-weight:700;text-align:left;border-top:.3mm solid #f2ddd0;border-bottom:.3mm solid #f2ddd0}
.td{padding:2.2mm 2.5mm;border-bottom:.3px solid #f6ece4;font-size:8pt;vertical-align:top}
.td small{font-size:5.5pt;color:#8a8378;display:block}
.sub-row td{background:#fdf0e7;font-weight:800;font-size:9pt;padding:2.2mm 2.5mm;border-top:.3mm solid #f2ddd0}
.r{text-align:right}.c{text-align:center}.bold{font-weight:700}
.bot{display:flex;flex:1;border-top:1px solid #f2ddd0;min-height:80mm}
.bot-l{flex:1.1;padding:3mm 4mm;display:flex;flex-direction:column;gap:2.5mm;border-right:1px solid #f2ddd0}
.bot-r{flex:1;padding:3mm 4mm;display:flex;flex-direction:column;gap:1.5mm}
.t-lbl{font-size:7pt;font-weight:800;color:#c56a3a;margin-bottom:.4mm}.t-txt{font-size:6.5pt;color:#8a8378;line-height:1.4}
.qr-row{display:flex;gap:5mm;align-items:flex-end;margin-top:auto;padding-top:2mm}
.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:2mm}.qr-img{width:40mm;height:40mm;object-fit:contain}.qr-lbl{font-size:7pt;font-weight:700;color:#c56a3a;text-align:center}
.sig{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}.sig-line{width:28mm;border-bottom:.5px solid #b3ab9f;margin:.8mm auto .4mm}.sig-lbl{font-size:6pt;color:#8a8378}
.t-row{display:flex;justify-content:space-between;font-size:8pt;padding:1.2mm 0;border-bottom:.3px solid #f6ece4;color:#8a8378}
.grand{background:#fdf0e7;border:.3mm solid #f2ddd0;padding:3mm 3.5mm;margin-top:2mm}
.g-row{display:flex;justify-content:space-between;align-items:baseline;font-size:9pt;font-weight:700;color:#7a5240}.g-val{font-size:14pt;font-weight:900;color:#c56a3a}
.g-recv{display:flex;justify-content:space-between;font-size:7.5pt;color:#15803d;font-weight:700;margin-top:1.5mm;padding-top:1.5mm;border-top:.3mm solid #f2ddd0}
.g-due{display:flex;justify-content:space-between;font-size:8pt;color:#7a5240;font-weight:700;margin-top:1mm}
.g-paid{display:flex;justify-content:center;font-size:8.5pt;font-weight:800;letter-spacing:1px;color:#15803d;margin-top:1.5mm;padding-top:1.5mm;border-top:.3mm solid #f2ddd0}
.words{padding:2mm .5mm;margin-top:2mm}.w-lbl{font-size:6.5pt;font-weight:700;color:#c56a3a;margin-bottom:.5mm}.w-txt{font-size:7.5pt;color:#2a231d;font-weight:600}
.thankyou{display:flex;align-items:center;gap:2mm;font-size:9pt;font-weight:800;color:#c56a3a;margin-top:auto;padding:3mm 5mm 4mm;font-style:italic}
.thankyou::before,.thankyou::after{content:"";flex:1;height:.2mm;background:#c56a3a;opacity:.45}
@media print{
  @page{size:A4 portrait;margin:0}
  html,body{background:#fff !important;padding:0}
  .page{box-shadow:none;width:100%;min-height:100vh}
  .inv{min-height:100vh}
  .bot{min-height:0;flex:1}
}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head><body><div class="page"><div class="inv"><div class="hdr">${p.logoSrc?`<img src="${e(p.logoSrc)}" class="logo" onerror="this.style.display='none'"/>`:`<div class="logo-fb">${e(p.bizName.slice(0,2))}</div>`}<div class="divider"></div><div class="biz"><div class="biz-name">${e(p.bizName)}</div>${p.bizAddress?`<div class="biz-addr">${e(p.bizAddress)}</div>`:""}<div class="biz-sub">${p.bizPhone?`<span>${e(p.bizPhone)}</span>`:""}${p.bizEmail?`<span>${e(p.bizEmail)}</span>`:""}${p.bizGstin?`<span>GSTIN: ${e(p.bizGstin)}</span>`:""}${p.bizPan?`<span>PAN: ${e(p.bizPan)}</span>`:""}</div></div><div class="inv-meta"><div class="inv-eyebrow">INVOICE</div><div class="inv-row"><div class="inv-col"><div class="inv-lbl">Invoice No</div><div class="inv-val">${e(p.invNo)}</div></div><div class="inv-col"><div class="inv-lbl">Invoice Date</div><div class="inv-val">${e(p.invDate)}</div>${p.invTime?`<div style="font-size:6pt;color:#b3ab9f">${e(p.invTime)}</div>`:""}</div></div></div></div><div class="billto"><div class="bt-lbl">Bill To</div><div class="bt-name">${e(p.clientName)||"—"}</div>${p.clientAddr?`<div class="bt-line">${e(p.clientAddr)}</div>`:""}${p.clientPhone?`<div class="bt-line">${e(p.clientPhone)}</div>`:""}${p.clientGstin?`<div class="bt-line">GSTIN: ${e(p.clientGstin)}</div>`:""}</div><table class="tbl"><thead><tr><th class="th c" style="width:7mm">No.</th><th class="th">Description</th><th class="th c" style="width:20mm">Size</th><th class="th c" style="width:12mm">Pcs</th><th class="th r" style="width:18mm">Qty</th><th class="th r" style="width:24mm">Rate</th>${p.discountAmt>0?`<th class="th r" style="width:15mm">Disc.</th>`:""}${p.taxPct>0?`<th class="th r" style="width:14mm">Tax</th>`:""}<th class="th r" style="width:22mm">Amount</th></tr></thead><tbody>${rows||`<tr><td colspan="9" class="td c" style="color:#c4bdb2">No items</td></tr>`}</tbody><tfoot><tr class="sub-row"><td colspan="4"><b>Subtotal</b></td><td class="r">${p.items.reduce((s,it)=>s+it.qty,0)}</td><td class="r">${fmtN(p.subtotal)}</td>${p.discountAmt>0?`<td class="r">₹${fmtN(p.discountAmt)}</td>`:""}${p.taxPct>0?`<td class="r">${fmtN(p.taxAmt)}</td>`:""}<td class="r">₹${fmtN(taxable)}</td></tr></tfoot></table><div class="bot"><div class="bot-l"><div><div class="t-lbl">Terms &amp; Conditions</div><div class="t-txt">${e(p.notes||"Keep the invoices for Future References")}</div></div>${p.warranty?`<div><div class="t-lbl">Warranty</div><div class="t-txt">${e(p.warranty)}</div></div>`:""}<div class="qr-row">${p.qrSrc?`<div class="qr-wrap"><div class="qr-lbl">Payment QR Code</div><img src="${e(p.qrSrc)}" class="qr-img"/></div>`:""}<div class="sig"><img src="/images/Signature.png" alt="" style="height:14mm;width:auto;display:block;margin:auto auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div></div></div><div class="bot-r">${cgst>0?`<div class="t-row"><span>CGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}${cgst>0?`<div class="t-row"><span>SGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}<div class="grand"><div class="g-row"><span>Total Amount</span><span class="g-val">₹${p.total.toFixed(2)}</span></div>${p.paidAmount>0.005?`<div class="g-recv"><span>Amount Received</span><span>−₹${p.paidAmount.toFixed(2)}</span></div>`:""}${due>0.005?`<div class="g-due"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:p.fullyPaid||p.paidAmount>=p.total-0.005?`<div class="g-paid"><span>✓ PAID IN FULL</span></div>`:""}</div><div class="words"><div class="w-lbl">Total Amount (in words)</div><div class="w-txt">${amtWords(p.total)}</div></div></div></div><div class="thankyou">Thank you for your business!</div></div></div><script>setTimeout(()=>window.print(),420)</script></body></html>`;
}

// ══ Billing 50% — 6 inch × 8 inch ═════════════════════════════════════════
export function buildSingleHalfA4HTML(p: PrintParams): string {
  const taxable = p.subtotal - p.discountAmt; const cgst = p.taxAmt/2; const due = Math.max(p.total - p.paidAmount, 0);
  const paidInFull = p.fullyPaid || p.paidAmount >= p.total - 0.005;
  const rows = p.items.map((it,i) => { const lt=it.qty*it.rate; const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0; const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0; return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td c">${sizeCell(it)}</td><td class="td c">${pcsCell(it)}</td><td class="td r">${qtyCell(it)}</td><td class="td r">${rateCell(it,fmtN(it.rate))}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}<br/><small>${p.discType==="percent"?p.discVal+"%":""}</small></td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}<br/><small>${p.taxPct}%</small></td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`; }).join("");
  const css=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
html,body{width:6in;height:8in;margin:0;padding:0;overflow:hidden}
body{font-family:'Inter',Arial,sans-serif;font-size:8pt;color:#1a1a2e;background:#fff}
.page{width:6in;height:8in;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.hdr{display:flex;align-items:center;gap:3mm;padding:3mm 4mm 2.5mm;border-bottom:2px solid #c56a3a;background:#fff;flex-shrink:0}
.logo{width:20mm;height:20mm;object-fit:contain;flex-shrink:0}
.logo-fb{width:16mm;height:16mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#fdf0e7;border:1px solid #f2ddd0;border-radius:50%;font-size:8pt;font-weight:800;color:#c56a3a}
.divider{width:.4mm;align-self:stretch;background:#f2ddd0;margin:1mm .5mm;flex-shrink:0}
.biz{flex:1;min-width:0}
.biz-name{font-size:11pt;font-weight:900;color:#2a231d;line-height:1.1}
.biz-pan{font-size:6.5pt;color:#444;font-weight:600}
.biz-addr{font-size:6pt;color:#8a8378;margin-top:.8mm;line-height:1.4}
.biz-sub{font-size:6pt;color:#8a8378;margin-top:.8mm;display:flex;flex-direction:column;gap:.4mm}
.inv-meta{text-align:right;flex-shrink:0;align-self:flex-start}
.inv-eyebrow{font-size:9pt;font-weight:900;letter-spacing:2px;color:#c56a3a;margin-bottom:1.2mm}
.inv-lbl{font-size:5.5pt;font-weight:700;color:#8a8378;text-transform:uppercase;letter-spacing:.4px}
.inv-val{font-size:8pt;font-weight:800;color:#2a231d;margin-top:.2mm}
.inv-time{font-size:5pt;color:#b3ab9f;margin-top:.2mm}
.billto{padding:2mm 4mm;border-bottom:1px solid #f2ddd0;background:#fff;flex-shrink:0}
.bt-lbl{font-size:5.5pt;font-weight:700;color:#c56a3a;text-transform:uppercase;letter-spacing:.9px;margin-bottom:.8mm}
.bt-name{font-size:9pt;font-weight:800;color:#2a231d}
.bt-line{font-size:6pt;color:#8a8378;margin-top:.4mm}
.tblwrap{min-height:0;overflow:hidden;display:flex;flex-direction:column}
.tbl{width:100%;border-collapse:collapse}
.th{background:#fdf0e7;color:#7a5240;padding:1.8mm 2mm;font-size:5.6pt;font-weight:700;text-align:left;border-top:.3mm solid #f2ddd0;border-bottom:.3mm solid #f2ddd0}
.td{padding:1.8mm 2mm;border-bottom:.3px solid #f6ece4;font-size:6.6pt;vertical-align:top}
.td small{font-size:4.5pt;color:#8a8378;display:block}
.sub-row td{background:#fdf0e7;font-weight:800;font-size:7pt;padding:1.8mm 2mm;border-top:.3mm solid #f2ddd0}
.r{text-align:right}.c{text-align:center}.bold{font-weight:700}
.bot{display:flex;border-top:1px solid #f2ddd0;flex-shrink:0;margin-top:auto}
.bot-l{flex:1.15;padding:2.5mm 3.5mm;display:flex;flex-direction:column;gap:1.5mm;border-right:1px solid #f2ddd0}
.bot-r{flex:1;padding:2.5mm 3.5mm;display:flex;flex-direction:column;gap:.8mm}
.t-lbl{font-size:6pt;font-weight:800;color:#c56a3a;margin-bottom:.3mm}
.t-txt{font-size:5.5pt;color:#8a8378;line-height:1.4}
.qr-row{display:flex;gap:3mm;align-items:flex-end;margin-top:auto;padding-top:2mm}
.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:1mm}
.qr-img{width:22mm;height:22mm;object-fit:contain}
.qr-lbl{font-size:5.5pt;font-weight:700;color:#c56a3a;text-align:center}
.sig{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}
.sig-line{width:24mm;border-bottom:.5px solid #b3ab9f;margin:1mm auto .4mm}
.sig-lbl{font-size:5pt;color:#8a8378}
.t-row{display:flex;justify-content:space-between;font-size:6.5pt;padding:1mm 0;border-bottom:.3px solid #f6ece4;color:#8a8378}
.grand{background:#fdf0e7;border:.3mm solid #f2ddd0;padding:2.2mm 2.5mm;margin-top:1.5mm}
.g-row{display:flex;justify-content:space-between;align-items:baseline;font-size:8pt;font-weight:700;color:#7a5240}
.g-val{font-size:11pt;font-weight:900;color:#c56a3a}
.g-recv{display:flex;justify-content:space-between;font-size:6pt;color:#15803d;font-weight:700;margin-top:1.2mm;padding-top:1.2mm;border-top:.3mm solid #f2ddd0}
.g-due{display:flex;justify-content:space-between;font-size:6.5pt;color:#7a5240;font-weight:700;margin-top:.8mm}
.g-paid{display:flex;justify-content:center;font-size:6.5pt;font-weight:800;letter-spacing:1px;color:#15803d;margin-top:1.2mm;padding-top:1.2mm;border-top:.3mm solid #f2ddd0}
.words{padding:1.5mm .5mm;margin-top:1.2mm}
.w-lbl{font-size:5.5pt;font-weight:700;color:#c56a3a;margin-bottom:.3mm}
.w-txt{font-size:6.5pt;color:#2a231d;font-weight:600;line-height:1.3}
.thankyou{display:flex;align-items:center;gap:2mm;font-size:8pt;font-weight:800;color:#c56a3a;padding:2.5mm 4mm 3mm;font-style:italic;flex-shrink:0}
.thankyou::before,.thankyou::after{content:"";flex:1;height:.2mm;background:#c56a3a;opacity:.45}
@page{size:6in 8in;margin:0}
@media print{html,body{background:#fff !important}.page{box-shadow:none}.th,.grand,.sub-row td,.hdr,.billto{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}}`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head><body>
  <div class="page">
    <div class="hdr">
      ${p.logoSrc?`<img src="${e(p.logoSrc)}" class="logo" onerror="this.style.display='none'"/>`:`<div class="logo-fb">${e(p.bizName.slice(0,2))}</div>`}
      <div class="divider"></div>
      <div class="biz">
        ${p.bizName?`<div class="biz-name">${e(p.bizName)}</div>`:""}
        ${p.bizAddress?`<div class="biz-addr">${e(p.bizAddress)}</div>`:""}
        <div class="biz-sub">${p.bizPhone?`<span>${e(p.bizPhone)}</span>`:""}${p.bizEmail?`<span>${e(p.bizEmail)}</span>`:""}${p.bizGstin?`<span>GSTIN: ${e(p.bizGstin)}</span>`:""}${p.bizPan?`<span>PAN: ${e(p.bizPan)}</span>`:""}</div>
      </div>
      <div class="inv-meta">
        <div class="inv-eyebrow">INVOICE</div>
        <div class="inv-lbl">Invoice No</div><div class="inv-val">${e(p.invNo)}</div>
        <div class="inv-lbl" style="margin-top:1.5mm">Invoice Date</div><div class="inv-val">${e(p.invDate)}</div>
        ${p.invTime?`<div class="inv-time">${e(p.invTime)}</div>`:""}
      </div>
    </div>
    <div class="billto">
      <div class="bt-lbl">Bill To</div>
      <div class="bt-name">${e(p.clientName)||"—"}</div>
      ${p.clientAddr?`<div class="bt-line">${e(p.clientAddr)}</div>`:""}
      ${p.clientPhone?`<div class="bt-line">${e(p.clientPhone)}</div>`:""}
      ${p.clientGstin?`<div class="bt-line">GSTIN: ${e(p.clientGstin)}</div>`:""}
    </div>
    <div class="tblwrap">
      <table class="tbl">
        <thead><tr>
          <th class="th c" style="width:7mm">No.</th><th class="th">Description</th>
          <th class="th c" style="width:16mm">Size</th>
          <th class="th c" style="width:10mm">Pcs</th>
          <th class="th r" style="width:13mm">Qty</th><th class="th r" style="width:17mm">Rate</th>
          ${p.discountAmt>0?`<th class="th r" style="width:13mm">Disc.</th>`:""}
          ${p.taxPct>0?`<th class="th r" style="width:11mm">Tax</th>`:""}
          <th class="th r" style="width:18mm">Amount</th>
        </tr></thead>
        <tbody>${rows||`<tr><td colspan="9" class="td c" style="color:#c4bdb2;padding:6mm">No items</td></tr>`}</tbody>
        <tfoot><tr class="sub-row">
          <td colspan="4"><b>Subtotal</b></td>
          <td class="r">${p.items.reduce((s,it)=>s+it.qty,0)}</td>
          <td class="r">${fmtN(p.subtotal)}</td>
          ${p.discountAmt>0?`<td class="r">₹${fmtN(p.discountAmt)}</td>`:""}
          ${p.taxPct>0?`<td class="r">${fmtN(p.taxAmt)}</td>`:""}
          <td class="r">₹${fmtN(taxable)}</td>
        </tr></tfoot>
      </table>
    </div>
    <div class="bot">
      <div class="bot-l">
        <div><div class="t-lbl">Terms &amp; Conditions</div><div class="t-txt">${e(p.notes||"Keep the invoices for Future References")}</div></div>
        ${p.warranty?`<div><div class="t-lbl">Warranty</div><div class="t-txt">${e(p.warranty)}</div></div>`:""}
        <div class="qr-row">
          ${p.qrSrc?`<div class="qr-wrap"><div class="qr-lbl">Payment QR Code</div><img src="${e(p.qrSrc)}" class="qr-img"/></div>`:""}
          <div class="sig"><img src="/images/Signature.png" alt="Signature" style="height:10mm;width:auto;display:block;margin:auto auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div>
        </div>
      </div>
      <div class="bot-r">
        ${cgst>0?`<div class="t-row"><span>CGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}
        ${cgst>0?`<div class="t-row"><span>SGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}
        <div class="grand"><div class="g-row"><span>Total Amount</span><span class="g-val">₹${p.total.toFixed(2)}</span></div>${p.paidAmount>0.005?`<div class="g-recv"><span>Amount Received</span><span>−₹${p.paidAmount.toFixed(2)}</span></div>`:""}${due>0.005?`<div class="g-due"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:paidInFull?`<div class="g-paid"><span>✓ PAID IN FULL</span></div>`:""}</div>
        <div class="words"><div class="w-lbl">Total Amount (in words)</div><div class="w-txt">${amtWords(p.total)}</div></div>
      </div>
    </div>
    <div class="thankyou">Thank you for your business!</div>
  </div>
  <script>setTimeout(()=>window.print(),420)</script></body></html>`;
}

// ── shared item builder ───────────────────────────────────────────────────
function buildItems(inv: Invoice) {
  return (Array.isArray(inv.items) ? inv.items : []).map((it:any) => ({
    desc:String(it.desc||""), qty:Number(it.qty)||0, rate:Number(it.rate)||0,
    size:(Number(it.width)>0&&Number(it.height)>0)?`${Number(it.width)} × ${Number(it.height)}`:"",
    unit:String(it.unit||""),
    pcs:Number(it.pcs)||0,
  }));
}

function buildParams(inv: Invoice, logoB64: string, qrB64: string): PrintParams {
  const biz  = (inv.business || {}) as any;
  const paid = effectivePaid(inv);
  return {
    logoSrc: logoB64 || '/images/abhijit_art_logo.png',
    qrSrc:   qrB64,
    bizName:    biz.name    || "",
    bizPan:     biz.pan     || "AQFPD8346K",
    bizGstin:   biz.gstin   || "19AQFPD8346K1ZH",
    bizAddress: biz.address || "Rabindra Sadan, Shakti Mandir Club, SS Sen Road Berhampore, West Bengal - 742101",
    bizPhone:   biz.phone   || "7405179066",
    bizEmail:   biz.email   || "abhijitart85@gmail.com",
    invNo: inv.invoiceNo, invDate: fmtD(inv.date), invTime: fmtTime(inv.createdAt),
    clientName: inv.clientName || "—", clientAddr: inv.clientAddr || "",
    clientPhone: inv.clientPhone || "", clientGstin: inv.clientGstin || "",
    items: buildItems(inv),
    discType: inv.discType || "amount", discVal: num(inv.discVal), taxPct: num(inv.taxPct),
    subtotal: num(inv.subtotal), discountAmt: num(inv.discountAmt), taxAmt: num(inv.taxAmt), total: num(inv.total),
    paidAmount: paid, notes: inv.notes || "", warranty: inv.warranty || "",
    fullyPaid: inv.status === "paid" || (num(inv.total) - paid) <= 0.005,
  };
}

async function loadAssets(): Promise<{ logoB64:string; qrB64:string; sigB64:string }> {
  const toB64 = (src: string) => fetch(src).then(r=>r.blob()).then(b=>new Promise<string>(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result as string);fr.readAsDataURL(b)})).catch(()=>'');
  const [qrB64, logoB64, sigB64] = await Promise.all([toB64('/images/QR.jpeg'), toB64('/images/abhijit_art_logo.png'), toB64('/images/Signature.png')]);
  return { logoB64, qrB64, sigB64 };
}

export async function printInvoice(inv: Invoice) {
  const { logoB64, qrB64, sigB64 } = await loadAssets();
  const biz = (inv.business || {}) as any;
  const build = biz.format === "half" ? buildSingleHalfA4HTML : buildFullA4HTML;
  let html = build(buildParams(inv, logoB64, qrB64));
  html = html.replace(/<script>setTimeout\(\(\)=>window\.print\(\),\d+\)<\/script>/g, "");
  if (sigB64) html = html.replace(/src="\/images\/Signature\.png"/g, `src="${sigB64}"`);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    const w = window.open("", "_blank", "width=820,height=1160");
    if (!w) return;
    w.document.write(build(buildParams(inv, logoB64, qrB64)).replace(/src="\/images\/Signature\.png"/g, `src="${sigB64}"`));
    w.document.close();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => { setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 1000); };

  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    const win = iframe.contentWindow;
    if (!win) { cleanup(); return; }
    win.onafterprint = cleanup;
    win.focus();
    win.print();
    setTimeout(cleanup, 60000);
  };

  if (iframe.contentWindow) {
    iframe.contentWindow.onload = () => setTimeout(fire, 300);
  }
  setTimeout(() => { if (iframe.parentNode) fire(); }, 800);
}

export async function previewInvoice(inv: Invoice) {
  const { logoB64, qrB64, sigB64 } = await loadAssets();
  const biz = (inv.business || {}) as any;
  const build = biz.format === "half" ? buildSingleHalfA4HTML : buildFullA4HTML;
  const w = window.open("","_blank","width=820,height=1160");
  if (!w) return;
  let html = build(buildParams(inv, logoB64, qrB64));
  html = html.replace(/<script>setTimeout\(\(\)=>window\.print\(\),\d+\)<\/script>/g, "");
  if (sigB64) html = html.replace(/src="\/images\/Signature\.png"/g, `src="${sigB64}"`);
  w.document.write(html); w.document.close();
}