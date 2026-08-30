// src/components/invoices/PrintUtils.ts
import { Invoice, num, round2, effectivePaid } from "./types";

const e = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c: string) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const fmtN = (n: number) => Math.round(n).toLocaleString("en-IN");
const fmtD = (d: string) => { const dt = new Date(d); if (isNaN(dt.getTime())) return d; return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }); };
const fmtTime = (d: string) => { if (!d) return ""; const dt = new Date(d); return isNaN(dt.getTime()) ? "" : dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); };

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
  items:{desc:string;qty:number;rate:number}[];
  discType:string; discVal:number; taxPct:number;
  subtotal:number; discountAmt:number; taxAmt:number; total:number;
  paidAmount:number; notes?:string; warranty?:string; fullyPaid?:boolean;
};

// ══ FULL A4 — one invoice filling the whole portrait sheet ═════════════════
export function buildFullA4HTML(p: PrintParams): string {
  const taxable = p.subtotal - p.discountAmt; const cgst = p.taxAmt/2; const due = Math.max(p.total - p.paidAmount, 0);
  const rows = p.items.map((it,i) => { const lt=it.qty*it.rate; const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0; const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0; return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td r">${it.qty}</td><td class="td r">₹${fmtN(it.rate)}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}</td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}</td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`; }).join("");
  const css = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
body{font-family:'Inter',Arial,sans-serif;font-size:9pt;color:#1a1a2e;background:#f0ece4;display:flex;justify-content:center;padding:8px}
.page{width:210mm;min-height:297mm;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.18);display:flex;flex-direction:column}
.inv{flex:1;display:flex;flex-direction:column}
.hdr{display:flex;align-items:center;gap:4mm;padding:4mm 5mm 3.5mm;border-bottom:2.5px solid #e89a3c;background:linear-gradient(135deg,#fff2e6 0%,#fff8f0 50%,#fff 100%)}
.logo{width:28mm;height:28mm;object-fit:contain;flex-shrink:0}
.logo-fb{width:16mm;height:16mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f0e8d0;border:1px solid #c8a84b;border-radius:50%;font-size:8pt;font-weight:800;color:#8a6a1c}
.biz{flex:1}.biz-name{font-size:14pt;font-weight:900;color:#c56a3a;line-height:1.1}.biz-pan{font-size:7pt;color:#444;font-weight:600;margin-top:.6mm}.biz-addr{font-size:6.5pt;color:#666;margin-top:.6mm}.biz-sub{font-size:6.5pt;color:#666;margin-top:.4mm;display:flex;flex-wrap:wrap;gap:3mm}
.inv-meta{text-align:right;flex-shrink:0;align-self:center}.inv-row{display:flex;gap:5mm;justify-content:flex-end}.inv-col{text-align:right}.inv-lbl{font-size:6.5pt;font-weight:700;color:#8a8f9a;text-transform:uppercase;letter-spacing:.4px}.inv-val{font-size:9pt;font-weight:800;color:#c56a3a;margin-top:.3mm}
.billto{padding:2.5mm 5mm;border-bottom:1px solid #f0e0d0;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)}
.bt-lbl{font-size:7pt;font-weight:800;color:#c56a3a;text-transform:uppercase;letter-spacing:.6px;padding-bottom:.8mm;border-bottom:1.5px solid #e89a3c;display:inline-block;margin-bottom:.8mm}.bt-name{font-size:9pt;font-weight:700}.bt-line{font-size:6.5pt;color:#555;margin-top:.4mm}
.tbl{width:100%;border-collapse:collapse}
.th{background:#c56a3a;color:#fff;padding:2mm 2.5mm;font-size:7pt;font-weight:700;text-align:left}
.td{padding:2mm 2.5mm;border-bottom:.5px solid #ede8dc;font-size:8pt;vertical-align:top}
.sub-row td{background:#f5f0e8;font-weight:800;font-size:9pt;padding:2mm 2.5mm;border-top:1.5px solid #c8a84b}
.r{text-align:right}.c{text-align:center}.bold{font-weight:700}
.bot{display:flex;flex:1;border-top:1px solid #e8e0cc;min-height:80mm}
.bot-l{flex:1.1;padding:3mm 4mm;display:flex;flex-direction:column;gap:2.5mm;border-right:1px solid #e8e0cc}
.bot-r{flex:1;padding:3mm 4mm;display:flex;flex-direction:column;gap:1.5mm}
.t-lbl{font-size:7pt;font-weight:800;color:#c56a3a;margin-bottom:.4mm}.t-txt{font-size:6.5pt;color:#555;line-height:1.4}
.qr-row{display:flex;gap:5mm;align-items:flex-end;margin-top:auto;padding-top:2mm}
.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:2mm}.qr-img{width:40mm;height:40mm;object-fit:contain}.qr-lbl{font-size:7pt;font-weight:700;color:#c56a3a;text-align:center}
.sig{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}.sig-line{width:28mm;border-bottom:.5px solid #888;margin:.8mm auto .4mm}.sig-lbl{font-size:6pt;color:#555}
.t-row{display:flex;justify-content:space-between;font-size:8pt;padding:1.2mm 0;border-bottom:.5px solid #ede8dc}
.grand{background:#c56a3a;color:#fff;padding:2.5mm 3mm;margin-top:2mm}
.g-row{display:flex;justify-content:space-between;align-items:baseline;font-size:9pt}.g-val{font-size:13pt;font-weight:900}
.g-due{display:flex;justify-content:space-between;font-size:7pt;color:#ffccaa;margin-top:.4mm}
.g-paid{display:flex;justify-content:center;font-size:8.5pt;font-weight:800;letter-spacing:1px;color:#8affc0;margin-top:1mm;padding-top:1mm;border-top:.5px solid rgba(255,255,255,.35)}
.words{border:.5px solid #f0d8c0;padding:2mm 2.5mm;margin-top:2mm;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)}.w-lbl{font-size:6.5pt;font-weight:700;color:#c56a3a;margin-bottom:.3mm}.w-txt{font-size:7.5pt;color:#333;font-weight:600}
.thankyou{text-align:right;font-size:9pt;font-weight:800;color:#c56a3a;margin-top:auto;padding-top:4mm;font-style:italic}
@media print{
  @page{size:A4 portrait;margin:0}
  html,body{background:#fff !important;padding:0}
  .page{box-shadow:none;width:100%;min-height:100vh}
  .inv{min-height:100vh}
  .bot{min-height:0;flex:1}
}`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head><body><div class="page"><div class="inv"><div class="hdr">${p.logoSrc?`<img src="${e(p.logoSrc)}" class="logo" onerror="this.style.display='none'"/>`:`<div class="logo-fb">${e(p.bizName.slice(0,2))}</div>`}<div class="biz"><div class="biz-name">${e(p.bizName)}</div>${p.bizPan?`<div class="biz-pan">Pan No &nbsp;<b>${e(p.bizPan)}</b></div>`:""}${p.bizAddress?`<div class="biz-addr">📍 ${e(p.bizAddress)}</div>`:""}<div class="biz-sub">${p.bizPhone?`<span>📞 ${e(p.bizPhone)}</span>`:""}${p.bizEmail?`<span>✉ ${e(p.bizEmail)}</span>`:""}${p.bizGstin?`<span>GSTIN: ${e(p.bizGstin)}</span>`:""}</div></div><div class="inv-meta"><div class="inv-row"><div class="inv-col"><div class="inv-lbl">Invoice Date</div><div class="inv-val">${e(p.invDate)}</div>${p.invTime?`<div style="font-size:6pt;color:#888">${e(p.invTime)}</div>`:""}</div><div class="inv-col"><div class="inv-lbl">Invoice No</div><div class="inv-val">#${e(p.invNo)}</div></div></div></div></div><div class="billto"><div class="bt-lbl">Bill To</div><div class="bt-name">${e(p.clientName)||"—"}</div>${p.clientAddr?`<div class="bt-line">${e(p.clientAddr)}</div>`:""}${p.clientPhone?`<div class="bt-line">📞 ${e(p.clientPhone)}</div>`:""}${p.clientGstin?`<div class="bt-line">GSTIN: ${e(p.clientGstin)}</div>`:""}</div><table class="tbl"><thead><tr><th class="th c" style="width:7mm">No</th><th class="th">Items</th><th class="th r" style="width:11mm">Qty</th><th class="th r" style="width:18mm">Rate</th>${p.discountAmt>0?`<th class="th r" style="width:15mm">Disc.</th>`:""}${p.taxPct>0?`<th class="th r" style="width:14mm">Tax</th>`:""}<th class="th r" style="width:20mm">Total</th></tr></thead><tbody>${rows||`<tr><td colspan="6" class="td c" style="color:#aaa">No items</td></tr>`}</tbody><tfoot><tr class="sub-row"><td class="c">Sub.</td><td><b>SUBTOTAL</b></td><td class="r">${p.items.reduce((s,it)=>s+it.qty,0)}</td><td class="r">${fmtN(p.subtotal)}</td>${p.discountAmt>0?`<td class="r">₹${fmtN(p.discountAmt)}</td>`:""}${p.taxPct>0?`<td class="r">${fmtN(p.taxAmt)}</td>`:""}<td class="r">₹${fmtN(taxable)}</td></tr></tfoot></table><div class="bot"><div class="bot-l"><div><div class="t-lbl">Terms &amp; Conditions</div><div class="t-txt">${e(p.notes||"Keep the invoices for Future References")}</div></div>${p.warranty?`<div><div class="t-lbl">Warranty</div><div class="t-txt">${e(p.warranty)}</div></div>`:""}<div class="qr-row">${p.qrSrc?`<div class="qr-wrap"><div class="qr-lbl">Payment QR Code</div><img src="${e(p.qrSrc)}" class="qr-img"/></div>`:""}<div class="sig"><img src="/images/Signature.png" alt="" style="height:14mm;width:auto;display:block;margin:auto auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div></div></div><div class="bot-r"><div class="t-row"><span>Taxable Amount</span><span>₹${taxable.toFixed(2)}</span></div>${cgst>0?`<div class="t-row"><span>CGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""} ${cgst>0?`<div class="t-row"><span>SGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}${p.paidAmount>0.005?`<div class="t-row"><span>Amount Received</span><span style="color:#15803d">−₹${p.paidAmount.toFixed(2)}</span></div>`:""}<div class="grand"><div class="g-row"><span>Total Amount</span><span class="g-val">₹${p.total.toFixed(2)}</span></div>${due>0.005?`<div class="g-due"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:p.fullyPaid||p.paidAmount>=p.total-0.005?`<div class="g-paid"><span>✓ PAID IN FULL</span></div>`:""}</div><div class="words"><div class="w-lbl">Total Amount (in words)</div><div class="w-txt">${amtWords(p.total)}</div></div><div class="thankyou">Thank you for your business!</div></div></div></div></div><script>setTimeout(()=>window.print(),420)</script></body></html>`;
}

// ══ HALF A4 — one invoice on the top half (rotated), blank bottom half ══════
export function buildSingleHalfA4HTML(p: PrintParams): string {
  const taxable = p.subtotal - p.discountAmt; const cgst = p.taxAmt/2; const due = Math.max(p.total - p.paidAmount, 0);
  const paidInFull = p.fullyPaid || p.paidAmount >= p.total - 0.005;
  const rows = p.items.map((it,i) => { const lt=it.qty*it.rate; const ld=p.discountAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.discountAmt:0; const lx=p.taxAmt>0&&p.subtotal>0?(lt/p.subtotal)*p.taxAmt:0; return `<tr><td class="td c">${i+1}.</td><td class="td">${e(it.desc)}</td><td class="td r">${it.qty}</td><td class="td r">₹${fmtN(it.rate)}</td>${p.discountAmt>0?`<td class="td r">₹${fmtN(ld)}<br/><small>${p.discType==="percent"?p.discVal+"%":""}</small></td>`:""}${p.taxPct>0?`<td class="td r">${fmtN(lx)}<br/><small>${p.taxPct}%</small></td>`:""}<td class="td r bold">₹${fmtN(lt-ld+lx)}</td></tr>`; }).join("");

  const card = `
    <div class="card">
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
            <th class="th c" style="width:8mm">No</th><th class="th">Items</th>
            <th class="th r" style="width:11mm">Qty</th><th class="th r" style="width:18mm">Rate</th>
            ${p.discountAmt>0?`<th class="th r" style="width:15mm">Disc.</th>`:""}
            ${p.taxPct>0?`<th class="th r" style="width:13mm">Tax</th>`:""}
            <th class="th r" style="width:20mm">Total</th>
          </tr></thead>
          <tbody>${rows||`<tr><td colspan="7" class="td c" style="color:#aaa;padding:6mm">No items</td></tr>`}</tbody>
          <tfoot><tr class="sub-row">
            <td class="c">Sub.</td><td><b>SUBTOTAL</b></td>
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
            <div class="sig"><img src="/images/Signature.png" alt="Signature" style="height:11mm;width:auto;display:block;margin:auto auto 1mm" onerror="this.style.display='none'"/><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div>
          </div>
        </div>
        <div class="bot-r">
          <div class="t-row"><span>Taxable Amount</span><span>₹${taxable.toFixed(2)}</span></div>
          ${cgst>0?`<div class="t-row"><span>CGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}
          ${cgst>0?`<div class="t-row"><span>SGST @${p.taxPct/2}%</span><span>${cgst.toFixed(2)}</span></div>`:""}
          ${p.paidAmount>0.005?`<div class="t-row"><span>Amount Received</span><span style="color:#15803d">−₹${p.paidAmount.toFixed(2)}</span></div>`:""}
          <div class="grand">
            <div class="g-row"><span>Total Amount</span><span class="g-val">₹${p.total.toFixed(2)}</span></div>
            ${due>0.005?`<div class="g-due"><span>Balance Due</span><span>₹${due.toFixed(2)}</span></div>`:paidInFull?`<div class="g-paid"><span>✓ PAID IN FULL</span></div>`:""}
          </div>
          <div class="words"><div class="w-lbl">Total Amount (in words)</div><div class="w-txt">${amtWords(p.total)}</div></div>
        </div>
      </div>

      <div class="thankyou">Thank you for your business!</div>
    </div>`;

  const css = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
html,body{width:210mm;height:297mm;margin:0;padding:0;overflow:hidden}
body{font-family:'Inter',Arial,sans-serif;font-size:7.5pt;color:#1a1a2e;background:#fff}
.page{width:210mm;height:297mm;background:#fff;position:fixed;top:0;left:0;display:flex;flex-direction:column;overflow:hidden}
.slot{position:relative;width:210mm;height:148.5mm;overflow:hidden}
.cutline{position:absolute;left:0;right:0;top:148.5mm;border-top:1.5px dashed #b9b3a4;z-index:4}
.cutmark{position:absolute;top:148.5mm;left:50%;transform:translate(-50%,-50%);background:#fff;padding:0 3mm;font-size:9pt;color:#999;z-index:5}
.card{position:absolute;left:calc((210mm - 148.5mm) / 2);top:calc((148.5mm - 210mm) / 2);width:148.5mm;height:210mm;transform:rotate(-90deg);transform-origin:center center;display:flex;flex-direction:column;background:#fff;overflow:hidden}
.hdr{display:flex;align-items:flex-start;gap:3mm;padding:3.5mm 4mm 3mm;border-bottom:2.5px solid #e89a3c;background:linear-gradient(135deg,#fff2e6 0%,#fff8f0 50%,#fff 100%);flex-shrink:0}
.logo{width:22mm;height:22mm;object-fit:contain;flex-shrink:0}
.logo-fb{width:18mm;height:18mm;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f0e8d0;border:1px solid #c8a84b;border-radius:50%;font-size:8pt;font-weight:800;color:#8a6a1c}
.biz{flex:1;min-width:0;padding-top:.5mm}
.biz-pan{font-size:6.5pt;color:#444;font-weight:600}
.biz-addr{font-size:6pt;color:#666;margin-top:.8mm;line-height:1.35}
.biz-sub{font-size:6pt;color:#666;margin-top:.8mm;display:flex;flex-wrap:wrap;gap:1mm 3mm}
.inv-meta{text-align:right;flex-shrink:0}
.inv-eyebrow{font-size:9.5pt;font-weight:900;letter-spacing:2.5px;color:#c56a3a;margin-bottom:1.5mm}
.inv-lbl{font-size:6pt;font-weight:700;color:#8a8f9a;text-transform:uppercase;letter-spacing:.4px}
.inv-val{font-size:8.5pt;font-weight:800;color:#c56a3a;margin-top:.3mm}
.inv-time{font-size:5.5pt;color:#888;margin-top:.2mm}
.billto{display:flex;align-items:baseline;flex-wrap:wrap;gap:1mm 4mm;padding:2.5mm 4mm;border-bottom:1px solid #f0e0d0;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%);flex-shrink:0}
.bt-lbl{font-size:6.5pt;font-weight:800;color:#c56a3a;text-transform:uppercase;letter-spacing:.6px;border-bottom:1.5px solid #e89a3c;padding-bottom:.5mm}
.bt-name{font-size:9pt;font-weight:800}
.bt-line{font-size:6.5pt;color:#555}
.tblwrap{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column}
.tbl{width:100%;border-collapse:collapse}
.th{background:#c56a3a;color:#fff;padding:2mm 2.5mm;font-size:6.5pt;font-weight:700;text-align:left}
.td{padding:2mm 2.5mm;border-bottom:.5px solid #ede8dc;font-size:7.5pt;vertical-align:top}
.td small{font-size:5pt;color:#888;display:block}
.tbl tbody tr:nth-child(even) td{background:#fdfaf5}
.sub-row td{background:#f5f0e8;font-weight:800;font-size:8pt;padding:2mm 2.5mm;border-top:1.5px solid #c8a84b}
.r{text-align:right}.c{text-align:center}.bold{font-weight:700}
.bot{display:flex;border-top:1px solid #e8e0cc;flex-shrink:0}
.bot-l{flex:1.15;padding:3mm 4mm;display:flex;flex-direction:column;gap:2mm;border-right:1px solid #e8e0cc}
.bot-r{flex:1;padding:3mm 4mm;display:flex;flex-direction:column;gap:1mm}
.t-lbl{font-size:6.5pt;font-weight:800;color:#c56a3a;margin-bottom:.3mm}
.t-txt{font-size:6pt;color:#555;line-height:1.5}
.qr-row{display:flex;gap:4mm;align-items:flex-end;margin-top:auto;padding-top:2mm}
.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:1.2mm}
.qr-img{width:26mm;height:26mm;object-fit:contain}
.qr-lbl{font-size:6pt;font-weight:700;color:#c56a3a;text-align:center}
.sig{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}
.sig-line{width:26mm;border-bottom:.5px solid #888;margin:1mm auto .4mm}
.sig-lbl{font-size:5.5pt;color:#555}
.t-row{display:flex;justify-content:space-between;font-size:7pt;padding:1mm 0;border-bottom:.5px solid #ede8dc}
.grand{background:#c56a3a;color:#fff;padding:2.5mm 3mm;margin-top:1.5mm}
.g-row{display:flex;justify-content:space-between;align-items:baseline;font-size:8.5pt;font-weight:700}
.g-val{font-size:12pt;font-weight:900}
.g-due{display:flex;justify-content:space-between;font-size:6.5pt;color:#ffccaa;margin-top:.4mm}
.g-paid{display:flex;justify-content:center;font-size:6.5pt;font-weight:800;letter-spacing:1px;color:#8affc0;margin-top:1mm;padding-top:1mm;border-top:.5px solid rgba(255,255,255,.35)}
.words{border:.5px solid #f0d8c0;padding:1.8mm 2.2mm;margin-top:1.5mm;background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)}
.w-lbl{font-size:5.8pt;font-weight:700;color:#c56a3a;margin-bottom:.3mm}
.w-txt{font-size:6.8pt;color:#333;font-weight:600;line-height:1.35}
.thankyou{text-align:right;font-size:8.5pt;font-weight:800;color:#c56a3a;padding:2.5mm 4mm 3mm;font-style:italic;flex-shrink:0}
@page{size:A4 portrait;margin:0}
@media print{html,body{background:#fff !important}.page{box-shadow:none}.th,.grand,.sub-row td,.hdr,.billto,.words{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}}`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${e(p.invNo)}</title><style>${css}</style></head><body>
  <div class="page">
    <div class="slot">${card}</div>
    <div class="slot" style="background:#fff;"></div>
    <div class="cutline"></div>
    <span class="cutmark">✂</span>
  </div>
  <script>setTimeout(()=>window.print(),420)</script></body></html>`;
}

// ── Print helper ──────────────────────────────────────────────────────────
export async function printInvoice(inv: Invoice) {
  const toB64 = (src: string) => fetch(src).then(r=>r.blob()).then(b=>new Promise<string>(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result as string);fr.readAsDataURL(b)})).catch(()=>'');
  const [qrB64, logoB64, sigB64] = await Promise.all([toB64('/images/QR.jpeg'), toB64('/images/abhijit_art_logo.png'), toB64('/images/Signature.png')]);
  const biz  = (inv.business || {}) as any;
  const paid = effectivePaid(inv);

  const build = biz.format === "half" ? buildSingleHalfA4HTML : buildFullA4HTML;

  const w = window.open("","_blank","width=820,height=1160");
  if (!w) return;
  let html = build({
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
    items: (Array.isArray(inv.items) ? inv.items : []).map((it:any) => ({ desc:String(it.desc||""), qty:Number(it.qty)||0, rate:Number(it.rate)||0 })),
    discType: inv.discType || "amount", discVal: num(inv.discVal), taxPct: num(inv.taxPct),
    subtotal: num(inv.subtotal), discountAmt: num(inv.discountAmt), taxAmt: num(inv.taxAmt), total: num(inv.total),
    paidAmount: paid, notes: inv.notes || "", warranty: inv.warranty || "",
    fullyPaid: inv.status === "paid" || (num(inv.total) - paid) <= 0.005,
  });
  if (sigB64) html = html.replace(/src="\/images\/Signature\.png"/g, `src="${sigB64}"`);
  w.document.write(html); w.document.close();
}