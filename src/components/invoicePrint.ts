// src/components/invoicePrint.ts
export type InvoicePrintData = {
  logoSrc: string; qrSrc: string; bizName: string; bizPan?: string; bizGstin?: string;
  bizAddress?: string; bizPhone?: string; bizEmail?: string;
  invNo: string; invDate: string; invTime?: string;
  clientName: string; clientAddr?: string; clientPhone?: string; clientGstin?: string;
  items: { desc: string; qty: number; rate: number; size?: string; unit?: string }[];
  discType: string; discVal: number; taxPct: number;
  subtotal: number; discountAmt: number; taxAmt: number; total: number; paidAmount: number;
  notes?: string; warranty?: string;
};

const esc = (s:any)=>String(s??"").replace(/[&<>"']/g,(c:string)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]as string));
const sizeCell = (it:{size?:string}) => it.size ? esc(it.size) : "—";
const qtyCell  = (it:{qty:number;unit?:string}) => `${it.qty}${it.unit?` ${esc(it.unit)}`:""}`;
const rateCell = (it:{rate:number;unit?:string}, r:string) => `₹${r}${it.unit?`/${esc(it.unit)}`:""}`;

export function buildFullA4HTML(p: InvoicePrintData): string {
  const e=esc;
  const fmtN=(n:number)=>Math.round(n).toLocaleString("en-IN");
  const taxable=p.subtotal-p.discountAmt; const cgst=p.taxAmt/2; const due=Math.max(p.total-p.paidAmount,0);
  function amtWords(n:number):string{const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];const m=Math.round(n);if(m===0)return"Zero Only";function b(x:number):string{if(x<20)return ones[x];if(x<100)return tens[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");return ones[Math.floor(x/100)]+" Hundred"+(x%100?" "+b(x%100):"");}let r="";if(m>=10000000)r+=b(Math.floor(m/10000000))+" Crore ";if(m>=100000)r+=b(Math.floor((m%10000000)/100000))+" Lakh ";if(m>=1000)r+=b(Math.floor((m%100000)/1000))+" Thousand ";r+=b(m%1000);return r.trim()+" Only";}
  const rows=p.items.map((it,i)=>{const lt=it.qty*it.rate;const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0;const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0;return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td c">${sizeCell(it)}</td><td class="td r">${qtyCell(it)}</td><td class="td r">${rateCell(it,fmtN(it.rate))}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}<br/><small>${p.discType==="percent"?p.discVal+"%":""}</small></td>`:""}${p.taxPct>0?`<td class="td r">₹${fmtN(lx)}<br/><small>${p.taxPct}%</small></td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`;}).join("");
  const css=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
body{font-family:'Inter',Arial,sans-serif;font-size:8.5pt;color:#1a1a2e;background:#f0ece4;display:flex;justify-content:center;padding:8px}
.page{width:210mm;height:297mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden}
.hdr{display:flex;align-items:center;gap:4mm;padding:5mm 6mm 3.5mm;border-bottom:3px solid #e89a3c;background:linear-gradient(135deg,#fff2e6 0%,#fff8f0 50%,#fff 100%);flex-shrink:0}
.logo{width:26mm;height:26mm;object-fit:contain;flex-shrink:0}
.logo-fb{width:20mm;height:20mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f0e8d0;border:1px solid #c8a84b;border-radius:50%;font-size:9pt;font-weight:800;color:#8a6a1c}
.biz{flex:1;min-width:0}
.biz-name{font-size:16pt;font-weight:900;color:#c56a3a;line-height:1.05}
.biz-pan{font-size:7pt;color:#444;font-weight:600;margin-top:1mm}
.biz-addr{font-size:6.5pt;color:#666;margin-top:.8mm}
.biz-sub{font-size:6.5pt;color:#666;margin-top:.5mm;display:flex;flex-wrap:wrap;gap:3.5mm}
.inv-meta{text-align:right;flex-shrink:0;align-self:center}
.inv-eyebrow{font-size:11pt;font-weight:900;letter-spacing:3px;color:#c56a3a;margin-bottom:1.5mm}
.inv-row{display:flex;gap:6mm;justify-content:flex-end}
.inv-col{text-align:right}
.inv-lbl{font-size:6.5pt;font-weight:700;color:#8a8f9a;text-transform:uppercase;letter-spacing:.5px}
.inv-val{font-size:9.5pt;font-weight:800;color:#c56a3a;margin-top:.4mm}
.inv-time{font-size:6pt;font-weight:600;color:#888;margin-top:.2mm}
.billto{display:flex;align-items:baseline;flex-wrap:wrap;gap:1mm 6mm;padding:3mm 6mm;border-bottom:1px solid #f0e0d0;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%);flex-shrink:0}
.bt-lbl{font-size:7pt;font-weight:800;color:#c56a3a;text-transform:uppercase;letter-spacing:.7px;border-bottom:1.5px solid #e89a3c;padding-bottom:.5mm}
.bt-name{font-size:9.5pt;font-weight:800}
.bt-line{font-size:6.5pt;color:#555}
.tblwrap{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column}
.tbl{width:100%;border-collapse:collapse}
.th{background:#c56a3a;color:#fff;padding:2.2mm 3mm;font-size:6.8pt;font-weight:700;text-align:left}
.td{padding:2.2mm 3mm;border-bottom:.5px solid #ede8dc;font-size:8pt;vertical-align:top}
.td small{font-size:5.5pt;color:#888;display:block}
.tbl tbody tr:nth-child(even) td{background:#fdfaf5}
.sub-row td{background:#f5f0e8;font-weight:800;font-size:8.5pt;padding:2.4mm 3mm;border-top:1.5px solid #c8a84b}
.r{text-align:right}.c{text-align:center}.bold{font-weight:700}
.bot{display:flex;border-top:1px solid #e8e0cc;flex-shrink:0}
.bot-l{flex:1.15;padding:3.5mm 5mm;display:flex;flex-direction:column;gap:2.5mm;border-right:1px solid #e8e0cc}
.bot-r{flex:1;padding:3.5mm 5mm;display:flex;flex-direction:column;gap:1mm}
.t-lbl{font-size:7pt;font-weight:800;color:#c56a3a;margin-bottom:.4mm}
.t-txt{font-size:6.2pt;color:#555;line-height:1.5}
.qr-row{display:flex;gap:5mm;align-items:flex-end;margin-top:auto;padding-top:2mm}
.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:1.5mm}
.qr-img{width:36mm;height:36mm;object-fit:contain}
.qr-lbl{font-size:6.5pt;font-weight:700;color:#c56a3a;text-align:center}
.sig{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}
.sig-line{width:30mm;border-bottom:.5px solid #888;margin:1mm auto .5mm}
.sig-lbl{font-size:5.5pt;color:#555}
.t-row{display:flex;justify-content:space-between;font-size:8pt;padding:1.2mm 0;border-bottom:.5px solid #ede8dc}
.grand{background:#c56a3a;color:#fff;padding:3mm 3.5mm;margin-top:1.5mm}
.g-row{display:flex;justify-content:space-between;align-items:baseline;font-size:9pt;font-weight:700}
.g-val{font-size:14pt;font-weight:900}
.g-due{display:flex;justify-content:space-between;font-size:7pt;color:#ffccaa;margin-top:.5mm}
.words{border:.5px solid #f0d8c0;padding:2mm 2.5mm;margin-top:1.5mm;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)}
.w-lbl{font-size:6pt;font-weight:700;color:#c56a3a;margin-bottom:.3mm}
.w-txt{font-size:7.5pt;color:#333;font-weight:600;line-height:1.35}
.thankyou{text-align:right;font-size:9pt;font-weight:800;color:#c56a3a;padding:2mm 6mm 3mm;font-style:italic;flex-shrink:0}
@media print{@page{size:A4 portrait;margin:0}html,body{background:#fff !important;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}.page{box-shadow:none;border:none;width:100%;height:100vh}.th,.grand,.sub-row td,.hdr,.billto,.words{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head><body>
  <div class="page">
    <div class="hdr">
      ${p.logoSrc?`<img src="${e(p.logoSrc)}" class="logo" onerror="this.style.display='none'"/>`:`<div class="logo-fb">${e(p.bizName.slice(0,2))}</div>`}
      <div class="biz">
        <div class="biz-name">${e(p.bizName)}</div>
        ${p.bizPan?`<div class="biz-pan">Pan No &nbsp;<b>${e(p.bizPan)}</b></div>`:""}
        ${p.bizAddress?`<div class="biz-addr">📍 ${e(p.bizAddress)}</div>`:""}
        <div class="biz-sub">${p.bizPhone?`<span>📞 ${e(p.bizPhone)}</span>`:""}${p.bizEmail?`<span>✉ ${e(p.bizEmail)}</span>`:""}${p.bizGstin?`<span>GSTIN: ${e(p.bizGstin)}</span>`:""}</div>
      </div>
      <div class="inv-meta">
        <div class="inv-eyebrow">INVOICE</div>
        <div class="inv-row">
          <div class="inv-col"><div class="inv-lbl">Invoice Date</div><div class="inv-val">${e(p.invDate)}</div>${p.invTime?`<div class="inv-time">${e(p.invTime)}</div>`:""}</div>
          <div class="inv-col"><div class="inv-lbl">Invoice No</div><div class="inv-val">#${e(p.invNo)}</div></div>
        </div>
      </div>
    </div>
    <div class="billto">
      <span class="bt-lbl">Bill To</span>
      <span class="bt-name">${e(p.clientName)||"—"}</span>
      ${p.clientPhone?`<span class="bt-line">📞 ${e(p.clientPhone)}</span>`:""}
      ${p.clientGstin?`<span class="bt-line">GSTIN: ${e(p.clientGstin)}</span>`:""}
      ${p.clientAddr?`<span class="bt-line">${e(p.clientAddr)}</span>`:""}
    </div>
    <div class="tblwrap">
      <table class="tbl">
        <thead><tr>
          <th class="th c" style="width:9mm">No</th><th class="th">Items</th>
          <th class="th c" style="width:18mm">Size</th>
          <th class="th r" style="width:18mm">Qty</th><th class="th r" style="width:24mm">Rate</th>
          ${p.discountAmt>0?`<th class="th r" style="width:18mm">Disc.</th>`:""}
          ${p.taxPct>0?`<th class="th r" style="width:16mm">Tax</th>`:""}
          <th class="th r" style="width:24mm">Total</th>
        </tr></thead>
        <tbody>${rows||`<tr><td colspan="8" class="td c" style="color:#aaa;padding:6mm">No items</td></tr>`}</tbody>
        <tfoot><tr class="sub-row">
          <td colspan="3"><b>SUBTOTAL</b></td>
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
          <div class="sig"><img src="/images/Signature.png" alt="Signature" style="height:12mm;width:auto;display:block;margin:auto auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div>
        </div>
      </div>
      <div class="bot-r">
        <div class="t-row"><span>Taxable Amount</span><span>₹${taxable.toFixed(2)}</span></div>
        ${cgst>0?`<div class="t-row"><span>CGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}
        ${cgst>0?`<div class="t-row"><span>SGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}
        ${p.paidAmount>0.005?`<div class="t-row"><span>Amount Received</span><span style="color:#15803d">−₹${p.paidAmount.toFixed(2)}</span></div>`:""}
        <div class="grand">
          <div class="g-row"><span>Total Amount</span><span class="g-val">₹${p.total.toFixed(2)}</span></div>
          ${due>0.005?`<div class="g-due"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:""}
        </div>
        <div class="words"><div class="w-lbl">Total Amount (in words)</div><div class="w-txt">${amtWords(p.total)}</div></div>
      </div>
    </div>
    <div class="thankyou">Thank you for your business!</div>
  </div>
  <script>setTimeout(()=>window.print(),420)</script></body></html>`;
}

export function buildLandscapeA4HTML(p: InvoicePrintData): string {
  const e=esc;
  const fmtN=(n:number)=>Math.round(n).toLocaleString("en-IN");
  const taxable=p.subtotal-p.discountAmt; const cgst=p.taxAmt/2; const due=Math.max(p.total-p.paidAmount,0);
  function amtWords(n:number):string{const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];const m=Math.round(n);if(m===0)return"Zero Only";function b(x:number):string{if(x<20)return ones[x];if(x<100)return tens[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");return ones[Math.floor(x/100)]+" Hundred"+(x%100?" "+b(x%100):"");}let r="";if(m>=10000000)r+=b(Math.floor(m/10000000))+" Crore ";if(m>=100000)r+=b(Math.floor((m%10000000)/100000))+" Lakh ";if(m>=1000)r+=b(Math.floor((m%100000)/1000))+" Thousand ";r+=b(m%1000);return r.trim()+" Only";}
  const rows=p.items.map((it,i)=>{const lt=it.qty*it.rate;const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0;const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0;return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td c">${sizeCell(it)}</td><td class="td r">${qtyCell(it)}</td><td class="td r">${rateCell(it,fmtN(it.rate))}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}<br/><small>${p.discType==="percent"?p.discVal+"%":""}</small></td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}<br/><small>${p.taxPct}%</small></td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`;}).join("");
  const css=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
body{font-family:'Inter',Arial,sans-serif;font-size:8pt;color:#1a1a2e;background:#f0ece4;display:flex;justify-content:center;padding:6px}
.page{width:297mm;height:210mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden}
.hdr{display:flex;align-items:center;gap:4mm;padding:3mm 5mm 2.5mm;border-bottom:2.5px solid #e89a3c;background:linear-gradient(135deg,#fff2e6 0%,#fff8f0 50%,#fff 100%);flex-shrink:0}
.logo{width:19mm;height:19mm;object-fit:contain;flex-shrink:0}
.logo-fb{width:14mm;height:14mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f0e8d0;border:1px solid #c8a84b;border-radius:50%;font-size:7pt;font-weight:800;color:#8a6a1c}
.biz{flex:1;min-width:0}
.biz-name{font-size:13pt;font-weight:900;color:#c56a3a;line-height:1.1}
.biz-pan{font-size:6.5pt;color:#444;font-weight:600;margin-top:.5mm}
.biz-addr{font-size:5.8pt;color:#666;margin-top:.4mm}
.biz-sub{font-size:5.8pt;color:#666;margin-top:.3mm;display:flex;flex-wrap:wrap;gap:3mm}
.inv-meta{text-align:right;flex-shrink:0;align-self:center}
.inv-eyebrow{font-size:9pt;font-weight:900;letter-spacing:2.5px;color:#c56a3a;margin-bottom:1mm}
.inv-row{display:flex;gap:5mm;justify-content:flex-end}
.inv-col{text-align:right}
.inv-lbl{font-size:6pt;font-weight:700;color:#8a8f9a;text-transform:uppercase;letter-spacing:.4px}
.inv-val{font-size:8.5pt;font-weight:800;color:#c56a3a;margin-top:.3mm}
.inv-time{font-size:5.5pt;font-weight:600;color:#888;margin-top:.2mm}
.main{display:flex;flex:1;min-height:0}
.left{flex:1;min-width:0;display:flex;flex-direction:column;border-right:1.5px solid #eadcc8}
.right{width:82mm;flex-shrink:0;display:flex;flex-direction:column;gap:1mm;padding:3mm 4mm;background:linear-gradient(180deg,#fffaf4 0%,#fff 45%)}
.billto{display:flex;align-items:baseline;flex-wrap:wrap;gap:1mm 5mm;padding:2mm 4mm;border-bottom:1px solid #f0e0d0;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%);flex-shrink:0}
.bt-lbl{font-size:6.5pt;font-weight:800;color:#c56a3a;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #e89a3c;padding-bottom:.4mm}
.bt-name{font-size:8.5pt;font-weight:800}
.bt-line{font-size:6pt;color:#555}
.tblwrap{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column}
.tbl{width:100%;border-collapse:collapse}
.th{background:#c56a3a;color:#fff;padding:1.8mm 2.5mm;font-size:6.2pt;font-weight:700;text-align:left}
.td{padding:1.7mm 2.5mm;border-bottom:.5px solid #ede8dc;font-size:7.2pt;vertical-align:top}
.td small{font-size:5pt;color:#888;display:block}
.tbl tbody tr:nth-child(even) td{background:#fdfaf5}
.sub-row td{background:#f5f0e8;font-weight:800;font-size:8pt;padding:1.8mm 2.5mm;border-top:1.5px solid #c8a84b}
.r{text-align:right}.c{text-align:center}.bold{font-weight:700}
.terms{display:flex;gap:8mm;padding:2mm 4mm 2.5mm;border-top:1px solid #ede4d4;flex-shrink:0;margin-top:auto}
.t-lbl{font-size:6.5pt;font-weight:800;color:#c56a3a;margin-bottom:.4mm}
.t-txt{font-size:5.8pt;color:#555;line-height:1.45;max-width:110mm}
.t-row{display:flex;justify-content:space-between;font-size:7.5pt;padding:1.2mm 0;border-bottom:.5px solid #ede8dc}
.grand{background:#c56a3a;color:#fff;padding:2.5mm 3mm;margin-top:1.5mm}
.g-row{display:flex;justify-content:space-between;align-items:baseline;font-size:8.5pt;font-weight:700}
.g-val{font-size:13pt;font-weight:900}
.g-due{display:flex;justify-content:space-between;font-size:7pt;color:#ffccaa;margin-top:.6mm}
.words{border:.5px solid #f0d8c0;padding:1.8mm 2.2mm;margin-top:1.5mm;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)}
.w-lbl{font-size:5.8pt;font-weight:700;color:#c56a3a;margin-bottom:.3mm}
.w-txt{font-size:7pt;color:#333;font-weight:600;line-height:1.35}
.payrow{display:flex;gap:5mm;align-items:flex-end;margin-top:auto;padding-top:2mm}
.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:1.2mm}
.qr-lbl{font-size:6pt;font-weight:700;color:#c56a3a;text-align:center}
.qr-img{width:30mm;height:30mm;object-fit:contain}
.sig{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}
.sig-line{width:26mm;border-bottom:.5px solid #888;margin:.8mm auto .4mm}
.sig-lbl{font-size:5.2pt;color:#555}
.thankyou{text-align:right;font-size:8.5pt;font-weight:800;color:#c56a3a;padding-top:2mm;font-style:italic}
@media print{@page{size:A4 landscape;margin:0}html,body{background:#fff !important;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}.page{box-shadow:none;border:none;width:100%;height:100vh}.th,.grand,.sub-row td,.hdr,.billto,.words{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head><body>
  <div class="page">
    <div class="hdr">
      ${p.logoSrc?`<img src="${e(p.logoSrc)}" class="logo" onerror="this.style.display='none'"/>`:`<div class="logo-fb">${e(p.bizName.slice(0,2))}</div>`}
      <div class="biz">
        <div class="biz-name">${e(p.bizName)}</div>
        ${p.bizPan?`<div class="biz-pan">Pan No &nbsp;<b>${e(p.bizPan)}</b></div>`:""}
        ${p.bizAddress?`<div class="biz-addr">📍 ${e(p.bizAddress)}</div>`:""}
        <div class="biz-sub">${p.bizPhone?`<span>📞 ${e(p.bizPhone)}</span>`:""}${p.bizEmail?`<span>✉ ${e(p.bizEmail)}</span>`:""}${p.bizGstin?`<span>GSTIN: ${e(p.bizGstin)}</span>`:""}</div>
      </div>
      <div class="inv-meta">
        <div class="inv-eyebrow">INVOICE</div>
        <div class="inv-row">
          <div class="inv-col"><div class="inv-lbl">Invoice Date</div><div class="inv-val">${e(p.invDate)}</div>${p.invTime?`<div class="inv-time">${e(p.invTime)}</div>`:""}</div>
          <div class="inv-col"><div class="inv-lbl">Invoice No</div><div class="inv-val">#${e(p.invNo)}</div></div>
        </div>
      </div>
    </div>
    <div class="main">
      <div class="left">
        <div class="billto">
          <span class="bt-lbl">Bill To</span>
          <span class="bt-name">${e(p.clientName)||"—"}</span>
          ${p.clientPhone?`<span class="bt-line">📞 ${e(p.clientPhone)}</span>`:""}
          ${p.clientGstin?`<span class="bt-line">GSTIN: ${e(p.clientGstin)}</span>`:""}
          ${p.clientAddr?`<span class="bt-line">${e(p.clientAddr)}</span>`:""}
        </div>
        <div class="tblwrap">
          <table class="tbl">
            <thead><tr>
              <th class="th c" style="width:8mm">No</th><th class="th">Items</th>
              <th class="th c" style="width:16mm">Size</th>
              <th class="th r" style="width:16mm">Qty</th><th class="th r" style="width:22mm">Rate</th>
              ${p.discountAmt>0?`<th class="th r" style="width:16mm">Disc.</th>`:""}
              ${p.taxPct>0?`<th class="th r" style="width:15mm">Tax</th>`:""}
              <th class="th r" style="width:22mm">Total</th>
            </tr></thead>
            <tbody>${rows||`<tr><td colspan="8" class="td c" style="color:#aaa;padding:5mm">No items</td></tr>`}</tbody>
            <tfoot><tr class="sub-row">
              <td class="c">Sub.</td><td colspan="2"><b>SUBTOTAL</b></td>
              <td class="r">${p.items.reduce((s,it)=>s+it.qty,0)}</td>
              <td class="r">${fmtN(p.subtotal)}</td>
              ${p.discountAmt>0?`<td class="r">₹${fmtN(p.discountAmt)}</td>`:""}
              ${p.taxPct>0?`<td class="r">${fmtN(p.taxAmt)}</td>`:""}
              <td class="r">₹${fmtN(taxable)}</td>
            </tr></tfoot>
          </table>
        </div>
        <div class="terms">
          <div><div class="t-lbl">Terms &amp; Conditions</div><div class="t-txt">${e(p.notes||"Keep the invoices for Future References")}</div></div>
          ${p.warranty?`<div><div class="t-lbl">Warranty</div><div class="t-txt">${e(p.warranty)}</div></div>`:""}
        </div>
      </div>
      <div class="right">
        <div class="t-row"><span>Taxable Amount</span><span>₹${taxable.toFixed(2)}</span></div>
        ${cgst>0?`<div class="t-row"><span>CGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}
        ${cgst>0?`<div class="t-row"><span>SGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}
        ${p.paidAmount>0.005?`<div class="t-row"><span>Amount Received</span><span style="color:#15803d">−₹${p.paidAmount.toFixed(2)}</span></div>`:""}
        <div class="grand">
          <div class="g-row"><span>Total Amount</span><span class="g-val">₹${p.total.toFixed(2)}</span></div>
          ${due>0.005?`<div class="g-due"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:""}
        </div>
        <div class="words"><div class="w-lbl">Total Amount (in words)</div><div class="w-txt">${amtWords(p.total)}</div></div>
        <div class="payrow">
          ${p.qrSrc?`<div class="qr-wrap"><div class="qr-lbl">Payment QR Code</div><img src="${e(p.qrSrc)}" class="qr-img"/></div>`:""}
          <div class="sig"><img src="/images/Signature.png" alt="Signature" style="height:10mm;width:auto;display:block;margin:auto auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div>
        </div>
        <div class="thankyou">Thank you for your business!</div>
      </div>
    </div>
  </div>
  <script>setTimeout(()=>window.print(),420)</script></body></html>`;
}

export function buildSideBySideA4HTML(p: InvoicePrintData): string {
  const e=esc;
  const fmtN=(n:number)=>Math.round(n).toLocaleString("en-IN");
  const taxable=p.subtotal-p.discountAmt; const cgst=p.taxAmt/2; const due=Math.max(p.total-p.paidAmount,0);
  function amtWords(n:number):string{const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];const m=Math.round(n);if(m===0)return"Zero Only";function b(x:number):string{if(x<20)return ones[x];if(x<100)return tens[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");return ones[Math.floor(x/100)]+" Hundred"+(x%100?" "+b(x%100):"");}let r="";if(m>=10000000)r+=b(Math.floor(m/10000000))+" Crore ";if(m>=100000)r+=b(Math.floor((m%10000000)/100000))+" Lakh ";if(m>=1000)r+=b(Math.floor((m%100000)/1000))+" Thousand ";r+=b(m%1000);return r.trim()+" Only";}
  const rows=p.items.map((it,i)=>{const lt=it.qty*it.rate;const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0;const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0;return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td c">${sizeCell(it)}</td><td class="td r">${qtyCell(it)}</td><td class="td r">${rateCell(it,fmtN(it.rate))}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}<br/><small>${p.discType==="percent"?p.discVal+"%":""}</small></td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}<br/><small>${p.taxPct}%</small></td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`;}).join("");
  const bill = `
    <div class="bill">
      <div class="hdr">
        ${p.logoSrc?`<img src="${e(p.logoSrc)}" class="logo" onerror="this.style.display='none'"/>`:`<div class="logo-fb">${e(p.bizName.slice(0,2))}</div>`}
        <div class="biz">
          <div class="biz-name">${e(p.bizName)}</div>
          ${p.bizPan?`<div class="biz-pan">PAN: <b>${e(p.bizPan)}</b></div>`:""}
          ${p.bizAddress?`<div class="biz-addr">📍 ${e(p.bizAddress)}</div>`:""}
          <div class="biz-sub">${p.bizPhone?`<span>📞 ${e(p.bizPhone)}</span>`:""}${p.bizGstin?`<span>GSTIN: ${e(p.bizGstin)}</span>`:""}</div>
        </div>
        <div class="inv-meta">
          <div class="inv-eyebrow">INVOICE</div>
          <div class="inv-lbl">Date</div><div class="inv-val">${e(p.invDate)}</div>
          ${p.invTime?`<div class="inv-time">${e(p.invTime)}</div>`:""}
          <div class="inv-lbl" style="margin-top:1mm">No.</div><div class="inv-val">#${e(p.invNo)}</div>
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
          <th class="th c" style="width:6mm">No</th>
          <th class="th">Items</th>
          <th class="th c" style="width:13mm">Size</th>
          <th class="th r" style="width:12mm">Qty</th>
          <th class="th r" style="width:15mm">Rate</th>
          ${p.discountAmt>0?`<th class="th r" style="width:11mm">Disc.</th>`:""}
          ${p.taxPct>0?`<th class="th r" style="width:10mm">Tax</th>`:""}
          <th class="th r" style="width:14mm">Total</th>
        </tr></thead>
        <tbody>${rows||`<tr><td colspan="8" class="td c" style="color:#aaa">No items</td></tr>`}</tbody>
        <tfoot><tr class="sub-row">
          <td class="c">Sub.</td><td colspan="2"><b>SUBTOTAL</b></td>
          <td class="r">${p.items.reduce((s,it)=>s+it.qty,0)}</td>
          <td class="r">₹${fmtN(p.subtotal)}</td>
          ${p.discountAmt>0?`<td class="r">₹${fmtN(p.discountAmt)}</td>`:""}
          ${p.taxPct>0?`<td class="r">${fmtN(p.taxAmt)}</td>`:""}
          <td class="r">₹${fmtN(taxable)}</td>
        </tr></tfoot>
      </table>
      <div class="bot">
        <div class="bot-l">
          <div class="t-lbl">Terms &amp; Conditions</div>
          <div class="t-txt">${e(p.notes||"Keep the invoices for Future References")}</div>
          ${p.warranty?`<div class="t-lbl" style="margin-top:1.5mm">Warranty</div><div class="t-txt">${e(p.warranty)}</div>`:""}
          <div class="pay-row">
            ${p.qrSrc?`<div class="qr-wrap"><div class="qr-lbl">Payment QR</div><img src="${e(p.qrSrc)}" class="qr-img"/></div>`:""}
            <div class="sig"><img src="/images/Signature.png" style="height:9mm;width:auto;display:block;margin:auto auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div>
          </div>
        </div>
        <div class="bot-r">
          <div class="t-row"><span>Taxable Amt</span><span>₹${taxable.toFixed(2)}</span></div>
          ${cgst>0?`<div class="t-row"><span>CGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}
          ${cgst>0?`<div class="t-row"><span>SGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}
          ${p.paidAmount>0.005?`<div class="t-row"><span>Received</span><span style="color:#15803d">−₹${p.paidAmount.toFixed(2)}</span></div>`:""}
          <div class="grand">
            <div class="g-row"><span>Total</span><span class="g-val">₹${p.total.toFixed(2)}</span></div>
            ${due>0.005?`<div class="g-due"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:""}
          </div>
          <div class="words"><div class="w-lbl">Amount in words</div><div class="w-txt">${amtWords(p.total)}</div></div>
          <div class="thankyou">Thank you for your business!</div>
        </div>
      </div>
    </div>`;
  const css=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
html,body{width:297mm;height:210mm;overflow:hidden;margin:0;padding:0}
body{font-family:'Inter',Arial,sans-serif;font-size:7.5pt;color:#1a1a2e;background:#fff}
.page{width:297mm;height:210mm;background:#fff;display:flex;flex-direction:row;overflow:hidden;position:fixed;top:0;left:0}
.bill{width:148.5mm;height:210mm;display:flex;flex-direction:column;overflow:hidden;flex-shrink:0}
.cut{width:2px;height:210mm;border-left:2px dashed #c8a84b;position:relative;flex-shrink:0}
.cut::before{content:'✂';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(90deg);background:#fff;padding:2mm 0;font-size:9pt;color:#888}
.hdr{display:flex;align-items:center;gap:2.5mm;padding:2.5mm 3mm 2mm;border-bottom:2px solid #e89a3c;background:linear-gradient(135deg,#fff2e6 0%,#fff8f0 50%,#fff 100%);flex-shrink:0}
.logo{width:16mm;height:16mm;object-fit:contain;flex-shrink:0}
.logo-fb{width:12mm;height:12mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f0e8d0;border:1px solid #c8a84b;border-radius:50%;font-size:6pt;font-weight:800;color:#8a6a1c}
.biz{flex:1;min-width:0}
.biz-name{font-size:10pt;font-weight:900;color:#c56a3a;line-height:1.1}
.biz-pan{font-size:5.5pt;color:#444;font-weight:600;margin-top:.3mm}
.biz-addr{font-size:5pt;color:#666;margin-top:.3mm}
.biz-sub{font-size:5pt;color:#666;margin-top:.2mm;display:flex;flex-wrap:wrap;gap:2mm}
.inv-meta{text-align:right;flex-shrink:0}
.inv-eyebrow{font-size:7pt;font-weight:900;letter-spacing:2px;color:#c56a3a;margin-bottom:.8mm}
.inv-lbl{font-size:5pt;font-weight:700;color:#8a8f9a;text-transform:uppercase;letter-spacing:.4px}
.inv-val{font-size:7.5pt;font-weight:800;color:#c56a3a}
.inv-time{font-size:4.5pt;color:#888}
.billto{padding:1.8mm 3mm;border-bottom:1px solid #f0e0d0;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%);flex-shrink:0}
.bt-lbl{font-size:5.5pt;font-weight:800;color:#c56a3a;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #e89a3c;display:inline-block;padding-bottom:.3mm;margin-bottom:.5mm}
.bt-name{font-size:7.5pt;font-weight:800}
.bt-line{font-size:5pt;color:#555;margin-top:.2mm}
.tbl{width:100%;border-collapse:collapse;flex-shrink:0}
.th{background:#c56a3a;color:#fff;padding:1.5mm 2mm;font-size:5.5pt;font-weight:700;text-align:left}
.td{padding:1.5mm 2mm;border-bottom:.5px solid #ede8dc;font-size:6.5pt;vertical-align:top}
.td small{font-size:4.5pt;color:#888;display:block}
.tbl tbody tr:nth-child(even) td{background:#fdfaf5}
.sub-row td{background:#f5f0e8;font-weight:800;font-size:7pt;padding:1.5mm 2mm;border-top:1.5px solid #c8a84b}
.r{text-align:right}.c{text-align:center}.bold{font-weight:700}
.bot{display:flex;flex:1;border-top:1px solid #e8e0cc;min-height:0}
.bot-l{flex:1.1;padding:2mm 3mm;display:flex;flex-direction:column;border-right:1px solid #e8e0cc}
.bot-r{flex:1;padding:2mm 2.5mm;display:flex;flex-direction:column;gap:.8mm}
.t-lbl{font-size:5.5pt;font-weight:800;color:#c56a3a;margin-bottom:.2mm}
.t-txt{font-size:4.8pt;color:#555;line-height:1.4}
.pay-row{display:flex;gap:3mm;align-items:flex-end;margin-top:auto}
.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:.8mm}
.qr-img{width:22mm;height:22mm;object-fit:contain}
.qr-lbl{font-size:4.5pt;font-weight:700;color:#c56a3a;text-align:center}
.sig{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}
.sig-line{width:20mm;border-bottom:.5px solid #888;margin:.6mm auto .3mm}
.sig-lbl{font-size:4.5pt;color:#555}
.t-row{display:flex;justify-content:space-between;font-size:6.5pt;padding:.8mm 0;border-bottom:.5px solid #ede8dc}
.grand{background:#c56a3a;color:#fff;padding:2mm 2.5mm;margin-top:1mm}
.g-row{display:flex;justify-content:space-between;align-items:baseline;font-size:7.5pt;font-weight:700}
.g-val{font-size:11pt;font-weight:900}
.g-due{display:flex;justify-content:space-between;font-size:5.5pt;color:#ffccaa;margin-top:.3mm}
.words{border:.5px solid #f0d8c0;padding:1.2mm 1.8mm;margin-top:1mm;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)}
.w-lbl{font-size:4.8pt;font-weight:700;color:#c56a3a;margin-bottom:.2mm}
.w-txt{font-size:5.8pt;color:#333;font-weight:600;line-height:1.3}
.thankyou{text-align:right;font-size:7pt;font-weight:800;color:#c56a3a;margin-top:auto;padding-top:2mm;font-style:italic}
@page{size:297mm 210mm;margin:0}
@media print{html,body{background:#fff !important;width:297mm;height:210mm}*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}.page{box-shadow:none;width:297mm;height:210mm}.bill{width:148.5mm;height:210mm}.cut{height:210mm}}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head><body>
<div class="page">
  ${bill}
  <div class="cut"></div>
  <div class="bill"></div>
</div>
<script>setTimeout(()=>window.print(),420)</script></body></html>`;
}

export function buildSingleHalfA4HTML(p: InvoicePrintData): string {
  const e=esc;
  const fmtN=(n:number)=>Math.round(n).toLocaleString("en-IN");
  const taxable=p.subtotal-p.discountAmt; const cgst=p.taxAmt/2; const due=Math.max(p.total-p.paidAmount,0);
  function amtWords(n:number):string{const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];const m=Math.round(n);if(m===0)return"Zero Only";function b(x:number):string{if(x<20)return ones[x];if(x<100)return tens[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");return ones[Math.floor(x/100)]+" Hundred"+(x%100?" "+b(x%100):"");}let r="";if(m>=10000000)r+=b(Math.floor(m/10000000))+" Crore ";if(m>=100000)r+=b(Math.floor((m%10000000)/100000))+" Lakh ";if(m>=1000)r+=b(Math.floor((m%100000)/1000))+" Thousand ";r+=b(m%1000);return r.trim()+" Only";}
  const rows=p.items.map((it,i)=>{const lt=it.qty*it.rate;const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0;const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0;return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td c">${sizeCell(it)}</td><td class="td r">${qtyCell(it)}</td><td class="td r">${rateCell(it,fmtN(it.rate))}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}<br/><small>${p.discType==="percent"?p.discVal+"%":""}</small></td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}<br/><small>${p.taxPct}%</small></td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`;}).join("");
  const css=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
html,body{width:6in;height:8in;margin:0;padding:0;overflow:hidden}
body{font-family:'Inter',Arial,sans-serif;font-size:8pt;color:#1a1a2e;background:#fff}
.page{width:6in;height:8in;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.hdr{display:flex;align-items:center;gap:3mm;padding:3mm 4mm 2.5mm;border-bottom:2.5px solid #e89a3c;background:linear-gradient(135deg,#fff2e6 0%,#fff8f0 50%,#fff 100%);flex-shrink:0}
.logo{width:20mm;height:20mm;object-fit:contain;flex-shrink:0}
.logo-fb{width:16mm;height:16mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f0e8d0;border:1px solid #c8a84b;border-radius:50%;font-size:8pt;font-weight:800;color:#8a6a1c}
.biz{flex:1;min-width:0}
.biz-pan{font-size:6.5pt;color:#444;font-weight:600}
.biz-addr{font-size:6pt;color:#666;margin-top:.6mm;line-height:1.3}
.biz-sub{font-size:6pt;color:#666;margin-top:.6mm;display:flex;flex-wrap:wrap;gap:1mm 2.5mm}
.inv-meta{text-align:right;flex-shrink:0}
.inv-eyebrow{font-size:9pt;font-weight:900;letter-spacing:2px;color:#c56a3a;margin-bottom:1mm}
.inv-lbl{font-size:5.5pt;font-weight:700;color:#8a8f9a;text-transform:uppercase;letter-spacing:.4px}
.inv-val{font-size:8pt;font-weight:800;color:#c56a3a;margin-top:.2mm}
.inv-time{font-size:5pt;color:#888;margin-top:.2mm}
.billto{display:flex;align-items:baseline;flex-wrap:wrap;gap:1mm 3mm;padding:2mm 4mm;border-bottom:1px solid #f0e0d0;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%);flex-shrink:0}
.bt-lbl{font-size:6pt;font-weight:800;color:#c56a3a;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #e89a3c;padding-bottom:.4mm}
.bt-name{font-size:8.5pt;font-weight:800}
.bt-line{font-size:6pt;color:#555}
.tblwrap{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column}
.tbl{width:100%;border-collapse:collapse}
.th{background:#c56a3a;color:#fff;padding:1.8mm 2mm;font-size:5.6pt;font-weight:700;text-align:left}
.td{padding:1.8mm 2mm;border-bottom:.5px solid #ede8dc;font-size:6.6pt;vertical-align:top}
.td small{font-size:4.5pt;color:#888;display:block}
.tbl tbody tr:nth-child(even) td{background:#fdfaf5}
.sub-row td{background:#f5f0e8;font-weight:800;font-size:7pt;padding:1.8mm 2mm;border-top:1.5px solid #c8a84b}
.r{text-align:right}.c{text-align:center}.bold{font-weight:700}
.bot{display:flex;border-top:1px solid #e8e0cc;flex-shrink:0}
.bot-l{flex:1.15;padding:2.5mm 3.5mm;display:flex;flex-direction:column;gap:1.5mm;border-right:1px solid #e8e0cc}
.bot-r{flex:1;padding:2.5mm 3.5mm;display:flex;flex-direction:column;gap:.8mm}
.t-lbl{font-size:6pt;font-weight:800;color:#c56a3a;margin-bottom:.3mm}
.t-txt{font-size:5.5pt;color:#555;line-height:1.4}
.qr-row{display:flex;gap:3mm;align-items:flex-end;margin-top:auto;padding-top:2mm}
.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:1mm}
.qr-img{width:22mm;height:22mm;object-fit:contain}
.qr-lbl{font-size:5.5pt;font-weight:700;color:#c56a3a;text-align:center}
.sig{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}
.sig-line{width:24mm;border-bottom:.5px solid #888;margin:1mm auto .4mm}
.sig-lbl{font-size:5pt;color:#555}
.t-row{display:flex;justify-content:space-between;font-size:6.5pt;padding:1mm 0;border-bottom:.5px solid #ede8dc}
.grand{background:#c56a3a;color:#fff;padding:2mm 2.5mm;margin-top:1.5mm}
.g-row{display:flex;justify-content:space-between;align-items:baseline;font-size:8pt;font-weight:700}
.g-val{font-size:11pt;font-weight:900}
.g-due{display:flex;justify-content:space-between;font-size:6pt;color:#ffccaa;margin-top:.4mm}
.words{border:.5px solid #f0d8c0;padding:1.5mm 2mm;margin-top:1.5mm;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)}
.w-lbl{font-size:5.5pt;font-weight:700;color:#c56a3a;margin-bottom:.3mm}
.w-txt{font-size:6.5pt;color:#333;font-weight:600;line-height:1.3}
.thankyou{text-align:right;font-size:8pt;font-weight:800;color:#c56a3a;padding:2mm 4mm 2.5mm;font-style:italic;flex-shrink:0}
@page{size:6in 8in;margin:0}
@media print{html,body{background:#fff !important}.page{box-shadow:none}.th,.grand,.sub-row td,.hdr,.billto,.words{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head><body>
  <div class="page">
    <div class="hdr">
      ${p.logoSrc?`<img src="${e(p.logoSrc)}" class="logo" onerror="this.style.display='none'"/>`:`<div class="logo-fb">${e(p.bizName.slice(0,2))}</div>`}
      <div class="biz">
        ${p.bizPan?`<div class="biz-pan">PAN&nbsp; <b>${e(p.bizPan)}</b></div>`:""}
        ${p.bizAddress?`<div class="biz-addr">📍 ${e(p.bizAddress)}</div>`:""}
        <div class="biz-sub">${p.bizPhone?`<span>📞 ${e(p.bizPhone)}</span>`:""}${p.bizEmail?`<span>✉ ${e(p.bizEmail)}</span>`:""}${p.bizGstin?`<span>GSTIN: ${e(p.bizGstin)}</span>`:""}</div>
      </div>
      <div class="inv-meta">
        <div class="inv-eyebrow">INVOICE</div>
        <div class="inv-lbl">Invoice Date</div><div class="inv-val">${e(p.invDate)}</div>
        ${p.invTime?`<div class="inv-time">${e(p.invTime)}</div>`:""}
        <div class="inv-lbl" style="margin-top:1.5mm">Invoice No</div><div class="inv-val">#${e(p.invNo)}</div>
      </div>
    </div>
    <div class="billto">
      <span class="bt-lbl">Bill To</span>
      <span class="bt-name">${e(p.clientName)||"—"}</span>
      ${p.clientPhone?`<span class="bt-line">📞 ${e(p.clientPhone)}</span>`:""}
      ${p.clientGstin?`<span class="bt-line">GSTIN: ${e(p.clientGstin)}</span>`:""}
      ${p.clientAddr?`<span class="bt-line">${e(p.clientAddr)}</span>`:""}
    </div>
    <div class="tblwrap">
      <table class="tbl">
        <thead><tr>
          <th class="th c" style="width:7mm">No</th><th class="th">Items</th>
          <th class="th c" style="width:14mm">Size</th>
          <th class="th r" style="width:13mm">Qty</th><th class="th r" style="width:17mm">Rate</th>
          ${p.discountAmt>0?`<th class="th r" style="width:13mm">Disc.</th>`:""}
          ${p.taxPct>0?`<th class="th r" style="width:11mm">Tax</th>`:""}
          <th class="th r" style="width:18mm">Total</th>
        </tr></thead>
        <tbody>${rows||`<tr><td colspan="8" class="td c" style="color:#aaa;padding:6mm">No items</td></tr>`}</tbody>
        <tfoot><tr class="sub-row">
          <td class="c">Sub.</td><td colspan="2"><b>SUBTOTAL</b></td>
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
        <div class="t-row"><span>Taxable Amount</span><span>₹${taxable.toFixed(2)}</span></div>
        ${cgst>0?`<div class="t-row"><span>CGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}
        ${cgst>0?`<div class="t-row"><span>SGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}
        ${p.paidAmount>0.005?`<div class="t-row"><span>Amount Received</span><span style="color:#15803d">−₹${p.paidAmount.toFixed(2)}</span></div>`:""}
        <div class="grand"><div class="g-row"><span>Total Amount</span><span class="g-val">₹${p.total.toFixed(2)}</span></div>${due>0.005?`<div class="g-due"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:""}</div>
        <div class="words"><div class="w-lbl">Total Amount (in words)</div><div class="w-txt">${amtWords(p.total)}</div></div>
      </div>
    </div>
    <div class="thankyou">Thank you for your business!</div>
  </div>
  <script>setTimeout(()=>window.print(),420)</script></body></html>`;
}

export function buildTwoUpA4HTML(p: InvoicePrintData): string {
  const e=esc;
  const fmtN=(n:number)=>Math.round(n).toLocaleString("en-IN");
  const taxable=p.subtotal-p.discountAmt; const cgst=p.taxAmt/2; const due=Math.max(p.total-p.paidAmount,0);
  function amtWords(n:number):string{const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];const m=Math.round(n);if(m===0)return"Zero Only";function b(x:number):string{if(x<20)return ones[x];if(x<100)return tens[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");return ones[Math.floor(x/100)]+" Hundred"+(x%100?" "+b(x%100):"");}let r="";if(m>=10000000)r+=b(Math.floor(m/10000000))+" Crore ";if(m>=100000)r+=b(Math.floor((m%10000000)/100000))+" Lakh ";if(m>=1000)r+=b(Math.floor((m%100000)/1000))+" Thousand ";r+=b(m%1000);return r.trim()+" Only";}
  const rows=p.items.map((it,i)=>{const lt=it.qty*it.rate;const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0;const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0;return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td c">${sizeCell(it)}</td><td class="td r">${qtyCell(it)}</td><td class="td r">${rateCell(it,fmtN(it.rate))}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}<br/><small>${p.discType==="percent"?p.discVal+"%":""}</small></td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}<br/><small>${p.taxPct}%</small></td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`;}).join("");
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
          <th class="th c" style="width:13mm">Size</th>
          <th class="th r" style="width:12mm">Qty</th><th class="th r" style="width:15mm">Rate</th>
          ${p.discountAmt>0?`<th class="th r" style="width:11mm">Disc.</th>`:""}
          ${p.taxPct>0?`<th class="th r" style="width:10mm">Tax</th>`:""}
          <th class="th r" style="width:14mm">Total</th>
        </tr></thead>
        <tbody>${rows||`<tr><td colspan="8" class="td c" style="color:#aaa">No items</td></tr>`}</tbody>
        <tfoot><tr class="sub-row">
          <td class="c">Sub.</td><td colspan="2"><b>SUBTOTAL</b></td>
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
            ${p.qrSrc?`<div class="qr-wrap"><div class="qr-lbl">Payment QR Code</div><img src="${e(p.qrSrc)}" class="qr-img"/></div>`:""}
            <div class="sig"><img src="/images/Signature.png" alt="Signature" style="height:9mm;width:auto;display:block;margin:auto auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div>
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
    .inv-time{font-size:4.5pt;color:#888}
    .billto{padding:2mm 4mm;border-bottom:1px solid #e8e0cc;background:#fffdf7;flex-shrink:0}
    .bt-lbl{font-size:6pt;font-weight:800;color:#1a2a6e;text-transform:uppercase;letter-spacing:.6px;padding-bottom:.8mm;border-bottom:1.5px solid #c8a84b;display:inline-block;margin-bottom:.8mm}
    .bt-name{font-size:7.5pt;font-weight:700}.bt-line{font-size:5.5pt;color:#555;margin-top:.3mm}
    .tbl{width:100%;border-collapse:collapse;flex-shrink:0}
    .th{background:#1a2a6e;color:#fff;padding:1.5mm 2mm;font-size:5.5pt;font-weight:700;text-align:left}
    .td{padding:1.5mm 2mm;border-bottom:.5px solid #ede8dc;font-size:6.5pt;vertical-align:top}
    .td small{font-size:4.5pt;color:#888;display:block}
    .sub-row td{background:#f5f0e8;font-weight:800;font-size:7pt;padding:1.5mm 2mm;border-top:1.5px solid #c8a84b}
    .r{text-align:right}.c{text-align:center}.bold{font-weight:700}
    .bot{display:flex;flex:1;border-top:1px solid #e8e0cc;min-height:0}
    .bot-l{flex:1.1;padding:2.5mm 3.5mm;display:flex;flex-direction:column;gap:1.5mm;border-right:1px solid #e8e0cc}
    .bot-r{flex:1;padding:2.5mm 3.5mm;display:flex;flex-direction:column;gap:.8mm}
    .t-lbl{font-size:6pt;font-weight:800;color:#1a2a6e;margin-bottom:.3mm}
    .t-txt{font-size:5pt;color:#555;line-height:1.4}
    .qr-row{display:flex;gap:2.5mm;align-items:flex-end;margin-top:auto}
    .qr-wrap{display:flex;flex-direction:column;align-items:center;gap:.8mm}
    .qr-img{width:18mm;height:18mm;object-fit:contain}
    .qr-lbl{font-size:5pt;font-weight:700;color:#1a2a6e;text-align:center}
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

export function buildInvoicePopupHTML(p: InvoicePrintData): string {
  const e=esc;
  const fmtN=(n:number)=>Math.round(n).toLocaleString("en-IN");
  const taxable=p.subtotal-p.discountAmt; const cgst=p.taxAmt/2; const due=Math.max(p.total-p.paidAmount,0);
  function amtWords(n:number):string{const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];const m=Math.round(n);if(m===0)return"Zero Only";function b(x:number):string{if(x<20)return ones[x];if(x<100)return tens[Math.floor(x/10)]+(x%10?" "+ones[x%10]:"");return ones[Math.floor(x/100)]+" Hundred"+(x%100?" "+b(x%100):"");}let r="";if(m>=10000000)r+=b(Math.floor(m/10000000))+" Crore ";if(m>=100000)r+=b(Math.floor((m%10000000)/100000))+" Lakh ";if(m>=1000)r+=b(Math.floor((m%100000)/1000))+" Thousand ";r+=b(m%1000);return r.trim()+" Only";}
  const rows=p.items.map((it,i)=>{const lt=it.qty*it.rate;const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0;const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0;return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td c">${sizeCell(it)}</td><td class="td r">${qtyCell(it)}</td><td class="td r">${rateCell(it,fmtN(it.rate))}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}<br/><small>${p.discType==="percent"?p.discVal+"%":""}</small></td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}<br/><small>${p.taxPct}%</small></td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`;}).join("");
  const css=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',Arial,sans-serif;font-size:8pt;color:#1a1a2e;background:#f0ece4;display:flex;justify-content:center;padding:8px}.page{width:148mm;min-height:210mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.18);display:flex;flex-direction:column;border:1px solid #e0d8c8}.hdr{display:flex;align-items:center;gap:4mm;padding:4mm 5mm 3mm;border-bottom:2.5px solid #c8a84b;background:linear-gradient(135deg,#fdfaf3 0%,#fff 60%)}.hdr-logo{width:26mm;height:26mm;object-fit:contain;flex-shrink:0}.hdr-biz{flex:1}.hdr-biz-name{font-size:13pt;font-weight:900;color:#1a2a6e;letter-spacing:-.3px;line-height:1.1}.hdr-biz-pan{font-size:6.5pt;color:#444;font-weight:600;margin-top:1mm}.hdr-biz-addr{font-size:5.5pt;color:#666;margin-top:1mm}.hdr-biz-sub{font-size:5.5pt;color:#666;margin-top:.5mm;display:flex;flex-wrap:wrap;gap:3mm}.hdr-inv{text-align:right;flex-shrink:0;align-self:center}.hdr-inv-row{display:flex;gap:5mm;justify-content:flex-end}.hdr-inv-col{text-align:right}.hdr-inv-lbl{font-size:6pt;font-weight:700;color:#8a8f9a;text-transform:uppercase;letter-spacing:.5px}.hdr-inv-val{font-size:8.5pt;font-weight:800;color:#1a2a6e;margin-top:.5mm}.parties{display:flex;border-bottom:1px solid #e8e0cc;background:#fffdf7}.party{flex:1;padding:2.5mm 4mm;border-right:1px solid #e8e0cc}.party:last-child{border-right:none}.party-lbl{font-size:6.5pt;font-weight:800;color:#1a2a6e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:1.5mm;padding-bottom:1mm;border-bottom:1.5px solid #c8a84b}.party-name{font-size:8pt;font-weight:700;color:#1a1a2e}.party-line{font-size:6pt;color:#555;margin-top:.5mm;line-height:1.4}.tbl{width:100%;border-collapse:collapse}.th{background:#1a2a6e;color:#fff;padding:2mm 2.5mm;font-size:6pt;font-weight:700;text-align:left}.td{padding:2mm 2.5mm;border-bottom:.5px solid #ede8dc;font-size:7pt;vertical-align:top}.td small{font-size:5pt;color:#888;display:block}.subtotal-row td{background:#f5f0e8;font-weight:800;font-size:7.5pt;padding:2mm 2.5mm;border-top:1.5px solid #c8a84b}.r{text-align:right}.c{text-align:center}.bold{font-weight:700}.bot{display:flex;flex:1;border-top:1px solid #e8e0cc;min-height:0}.bot-left{flex:1.1;padding:3mm 4mm;display:flex;flex-direction:column;gap:2mm;border-right:1px solid #e8e0cc}.bot-right{flex:1;padding:3mm 4mm;display:flex;flex-direction:column;gap:1mm}.terms-lbl{font-size:6.5pt;font-weight:800;color:#1a2a6e;margin-bottom:.5mm}.terms-txt{font-size:5.5pt;color:#555;line-height:1.5}.qr-row{display:flex;gap:3mm;align-items:flex-end;margin-top:auto}.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:1mm}.qr-img{width:22mm;height:22mm;object-fit:contain}.qr-lbl{font-size:5.5pt;font-weight:700;color:#1a2a6e;text-align:center}.sig-wrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center;padding-bottom:1mm}.sig-line{width:22mm;border-bottom:.5px solid #888;margin:1mm auto .5mm}.sig-lbl{font-size:5pt;color:#555}.tot-row{display:flex;justify-content:space-between;font-size:7pt;padding:.8mm 0;border-bottom:.5px solid #ede8dc}.tot-lbl{color:#555}.tot-val{font-weight:700;font-variant-numeric:tabular-nums}.grand-box{background:#1a2a6e;color:#fff;padding:2.5mm 3mm;margin-top:1.5mm}.grand-row{display:flex;justify-content:space-between;align-items:baseline}.grand-lbl{font-size:8pt;font-weight:700}.grand-val{font-size:11pt;font-weight:900}.due-row{display:flex;justify-content:space-between;font-size:7pt;color:#ffccaa;margin-top:.5mm}.words-box{border:.5px solid #e0d8c8;padding:1.5mm 2mm;margin-top:1.5mm;background:#fffdf7}.words-lbl{font-size:5.5pt;font-weight:700;color:#1a2a6e;margin-bottom:.5mm}.words-txt{font-size:6pt;color:#333;font-weight:600}@media print{@page{size:A5 portrait;margin:0}body{background:#fff;padding:0}.page{box-shadow:none;border:none;width:100%;min-height:100vh}}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head><body><div class="page"><div class="hdr">${p.logoSrc?`<img src="${e(p.logoSrc)}" alt="${e(p.bizName)}" class="hdr-logo" onerror="this.style.display='none'"/>`:`<div style="width:26mm;height:26mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f0e8d0;border:1px solid #c8a84b;border-radius:50%;font-size:8pt;font-weight:800;color:#8a6a1c">${e(p.bizName.slice(0,2))}</div>`}<div class="hdr-biz"><div class="hdr-biz-name">${e(p.bizName)}</div>${p.bizPan?`<div class="hdr-biz-pan">Pan No &nbsp;<b>${e(p.bizPan)}</b></div>`:""}${p.bizAddress?`<div class="hdr-biz-addr">📍 ${e(p.bizAddress)}</div>`:""}<div class="hdr-biz-sub">${p.bizPhone?`<span>📞 ${e(p.bizPhone)}</span>`:""}${p.bizEmail?`<span>✉ ${e(p.bizEmail)}</span>`:""}${p.bizGstin?`<span>GSTIN: ${e(p.bizGstin)}</span>`:""}</div></div><div class="hdr-inv"><div class="hdr-inv-row"><div class="hdr-inv-col"><div class="hdr-inv-lbl">Invoice Date</div><div class="hdr-inv-val">${e(p.invDate)}</div></div><div class="hdr-inv-col"><div class="hdr-inv-lbl">Invoice No</div><div class="hdr-inv-val">#${e(p.invNo)}</div></div></div></div></div><div class="parties"><div class="party"><div class="party-lbl">Bill To</div><div class="party-name">${e(p.clientName)||"—"}</div>${p.clientAddr?`<div class="party-line">${e(p.clientAddr)}</div>`:""}${p.clientPhone?`<div class="party-line">📞 ${e(p.clientPhone)}</div>`:""}${p.clientGstin?`<div class="party-line">GSTIN: ${e(p.clientGstin)}</div>`:""}</div></div><table class="tbl"><thead><tr><th class="th c" style="width:7mm">No</th><th class="th">Items</th><th class="th c" style="width:14mm">Size</th><th class="th r" style="width:13mm">Qty.</th><th class="th r" style="width:16mm">Rate</th>${p.discountAmt>0?`<th class="th r" style="width:13mm">Disc.</th>`:""}${p.taxPct>0?`<th class="th r" style="width:11mm">Tax</th>`:""}<th class="th r" style="width:16mm">Total</th></tr></thead><tbody>${rows||`<tr><td colspan="8" class="td c" style="color:#aaa;padding:4mm">No items</td></tr>`}</tbody><tfoot><tr class="subtotal-row"><td class="c">Sub.</td><td colspan="2"><b>SUBTOTAL</b></td><td class="r">${p.items.reduce((s,it)=>s+it.qty,0)}</td><td class="r">${fmtN(p.subtotal)}</td>${p.discountAmt>0?`<td class="r">₹${fmtN(p.discountAmt)}</td>`:""}${p.taxPct>0?`<td class="r">${fmtN(p.taxAmt)}</td>`:""}<td class="r">₹${fmtN(taxable)}</td></tr></tfoot></table><div class="bot"><div class="bot-left">${p.notes?`<div><div class="terms-lbl">Terms &amp; Conditions</div><div class="terms-txt">${e(p.notes)}</div></div>`:""}${p.warranty?`<div><div class="terms-lbl">Warranty</div><div class="terms-txt">${e(p.warranty)}</div></div>`:""}<div class="qr-row">${p.qrSrc?`<div class="qr-wrap"><div class="qr-lbl">Payment QR Code</div><img src="${e(p.qrSrc)}" alt="UPI QR" class="qr-img"/></div>`:""}<div class="sig-wrap"><img src="/images/Signature.png" alt="Signature" style="height:10mm;width:auto;display:block;margin:auto auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div></div></div><div class="bot-right"><div class="tot-row"><span class="tot-lbl">Taxable Amount</span><span class="tot-val">₹${taxable.toFixed(2)}</span></div>${cgst>0?`<div class="tot-row"><span class="tot-lbl">CGST @${p.taxPct/2}%</span><span class="tot-val">${cgst.toFixed(2)}</span></div>`:""}${cgst>0?`<div class="tot-row"><span class="tot-lbl">SGST @${p.taxPct/2}%</span><span class="tot-val">${cgst.toFixed(2)}</span></div>`:""}${p.paidAmount>0.005?`<div class="tot-row"><span class="tot-lbl">Amount Received</span><span class="tot-val" style="color:#15803d">−₹${p.paidAmount.toFixed(2)}</span></div>`:""}<div class="grand-box"><div class="grand-row"><span class="grand-lbl">Total Amount</span><span class="grand-val">₹${p.total.toFixed(2)}</span></div>${due>0.005?`<div class="due-row"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:""}</div><div class="words-box"><div class="words-lbl">Total Amount (in words)</div><div class="words-txt">${amtWords(p.total)}</div></div></div></div></div><script>setTimeout(()=>window.print(),420)</script></body></html>`;
}

export function amtWordsPreview(n: number): string {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const m = Math.round(n); if (m === 0) return "Zero Only";
  function b(x: number): string { if (x < 20) return ones[x]; if (x < 100) return tens[Math.floor(x/10)] + (x%10 ? " " + ones[x%10] : ""); return ones[Math.floor(x/100)] + " Hundred" + (x%100 ? " " + b(x%100) : ""); }
  let r = ""; if (m >= 10000000) r += b(Math.floor(m/10000000)) + " Crore "; if (m >= 100000) r += b(Math.floor((m%10000000)/100000)) + " Lakh "; if (m >= 1000) r += b(Math.floor((m%100000)/1000)) + " Thousand "; r += b(m%1000); return r.trim() + " Only";
}