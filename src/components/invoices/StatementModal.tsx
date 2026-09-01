// src/components/invoices/StatementModal.tsx
import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import {
  CustomerRow, InvStatus, MONTH_NAMES,
  INK, MUTE, FAINT, TERRA, GREEN, LINE, SANS,
  num, round2, rupee as makeRupee, fmt, effectivePaid, sharedSt,
} from "./types";
import Icon from "./Icon";

const rupee = makeRupee;

interface Props {
  row:     CustomerRow;
  onClose: () => void;
}

type AcctPayment = { id: string; amount: number; method: "cash" | "online"; note: string; paidAt: string };

export default function StatementModal({ row, onClose }: Props) {
  const [stFrom,   setStFrom]   = useState("");
  const [stTo,     setStTo]     = useState("");
  const [stStatus, setStStatus] = useState<"all"|InvStatus>("all");
  const [stMonth,  setStMonth]  = useState("");
  const [stYear,   setStYear]   = useState("");

  // account-level payments (the ones shown in Payment History) — fetched so the
  // statement includes them, not just the per-invoice advances.
  const [acctPays, setAcctPays] = useState<AcctPayment[]>([]);

  const customerId = useMemo(
    () => (row.invoices.find(i => (i as any).customerId) as any)?.customerId as string | undefined,
    [row.invoices],
  );

  useEffect(() => {
    if (!customerId) { setAcctPays([]); return; }
    api.get(`/api/customer-payments/${customerId}/ledger`)
      .then(r => setAcctPays(Array.isArray(r.data?.payments) ? r.data.payments : []))
      .catch(() => setAcctPays([]));
  }, [customerId]);

  const years = useMemo(() => {
    const set = new Set<string>();
    const add = (d:string) => { const dt=new Date(d); if(!isNaN(dt.getTime())) set.add(String(dt.getFullYear())); };
    for (const inv of row.invoices) { add(inv.createdAt||inv.date); for (const p of Array.isArray(inv.payments)?inv.payments:[]) add(p.createdAt); }
    for (const p of acctPays) add(p.paidAt);
    return Array.from(set).sort().reverse();
  }, [row, acctPays]);

  const txns = useMemo(() => {
    const list: Array<{ t:number;date:string;kind:"invoice"|"payment";desc:string;sub:string;debit:number;credit:number }> = [];
    for (const inv of row.invoices) {
      if (stStatus !== "all" && inv.status !== stStatus) continue;
      const pays    = Array.isArray(inv.payments)?inv.payments:[];
      const advPays = pays.filter(p=>/advance/i.test(p.note||""));
      const later   = pays.filter(p=>!/advance/i.test(p.note||""));
      const advSum  = round2(advPays.reduce((s,p)=>s+num(p.amount),0));
      const advMeth = Array.from(new Set(advPays.map(p=>p.method==="online"?"Online":"Cash")));
      list.push({ t:new Date(inv.createdAt||inv.date).getTime(), date:inv.createdAt||inv.date, kind:"invoice", desc:`Invoice ${inv.invoiceNo}`, sub:(inv.items||[]).map(it=>`${it.qty}× ${it.desc}`).join(", ")+(advSum>0?`  ·  Advance ${advMeth.join("/")}`:``), debit:num(inv.total), credit:advSum });
      for (const p of later) list.push({ t:new Date(p.createdAt).getTime(), date:p.createdAt, kind:"payment", desc:`Payment · ${inv.invoiceNo}`, sub:p.method==="online"?"Online":"Cash", debit:0, credit:num(p.amount) });
    }
    // account-level payments (not tied to one invoice)
    if (stStatus === "all") {
      for (const p of acctPays) {
        list.push({ t:new Date(p.paidAt).getTime(), date:p.paidAt, kind:"payment", desc:`Payment received`, sub:(p.method==="online"?"Online":"Cash")+(p.note?`  ·  ${p.note}`:``), debit:0, credit:num(p.amount) });
      }
    }
    let filtered = list;
    if (stFrom)  { const tf=new Date(stFrom+"T00:00:00").getTime(); filtered=filtered.filter(x=>x.t>=tf); }
    if (stTo)    { const tt=new Date(stTo+"T23:59:59").getTime();   filtered=filtered.filter(x=>x.t<=tt); }
    if (stMonth) filtered=filtered.filter(x=>new Date(x.date).getMonth()+1===Number(stMonth));
    if (stYear)  filtered=filtered.filter(x=>new Date(x.date).getFullYear()===Number(stYear));
    filtered.sort((a,b)=>a.t-b.t||a.desc.localeCompare(b.desc));
    let bal=0;
    return filtered.map(x=>{ bal=round2(bal+x.debit-x.credit); return { ...x, balance:bal }; });
  }, [row, acctPays, stFrom, stTo, stStatus, stMonth, stYear]);

  const totals = useMemo(() => {
    let debit=0, credit=0;
    for (const x of txns) { debit+=x.debit; credit+=x.credit; }
    return { debit:round2(debit), credit:round2(credit), balance:round2(debit-credit) };
  }, [txns]);

  const clearFilters = () => { setStFrom(""); setStTo(""); setStStatus("all"); setStMonth(""); setStYear(""); };
  const hasFilters   = !!(stFrom||stTo||stStatus!=="all"||stMonth||stYear);

  const download = async () => {
    const esc  = (s:any) => String(s??"").replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string));
    const fmtN = (n:number) => n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
    const toB64 = (src:string) => fetch(src).then(r=>r.blob()).then(b=>new Promise<string>(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result as string);fr.readAsDataURL(b)})).catch(()=>"");
    const logo = await toB64("/images/abhijit_art_logo.png");
    const biz  = { name:"Abhijit Art", pan:"AQFPD8346K", gstin:"19AQFPD8346K1ZH", address:"Rabindra Sadan, Shakti Mandir Club, SS Sen Road Berhampore, West Bengal - 742101", phone:"7405179066", email:"abhijitart85@gmail.com" };
    const mName  = stMonth ? MONTH_NAMES[Number(stMonth)-1] : "";
    const period = (stMonth&&stYear)?`${mName} ${stYear}`:stMonth?mName:stYear?stYear:(stFrom||stTo)?`${stFrom?fmt(stFrom+"T00:00:00"):"Beginning"} — ${stTo?fmt(stTo+"T00:00:00"):"Today"}`:"All time";
    const rows = txns.map(x=>`<tr class="${x.kind}"><td>${esc(fmt(x.date))}</td><td><b>${esc(x.desc)}</b>${x.sub?`<div class="sub">${esc(x.sub)}</div>`:""}</td><td class="r">${x.debit?fmtN(x.debit):"—"}</td><td class="r cr">${x.credit?fmtN(x.credit):"—"}</td><td class="r bal">${fmtN(x.balance)}</td></tr>`).join("");
    const css=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}body{font-family:'Inter',Arial,sans-serif;color:#1a1a2e;padding:14mm 12mm;font-size:9pt}.hdr{display:flex;align-items:center;gap:4mm;border-bottom:2.5px solid #e89a3c;padding-bottom:3mm;margin-bottom:4mm}.logo{width:20mm;height:20mm;object-fit:contain}.bizn{font-size:15pt;font-weight:900;color:#c56a3a}.bizd{font-size:6.5pt;color:#666;margin-top:1mm;line-height:1.5}.title{text-align:center;font-size:12pt;font-weight:800;color:#c56a3a;letter-spacing:1px;margin:3mm 0}.meta{display:flex;justify-content:space-between;background:#fff6ee;border:1px solid #f0e0d0;padding:3mm;margin-bottom:3mm;font-size:8pt}.meta b{color:#c56a3a}table{width:100%;border-collapse:collapse;font-size:8pt}th{background:#c56a3a;color:#fff;padding:2mm;text-align:left;font-weight:700;font-size:7.5pt}td{padding:2mm;border-bottom:.5px solid #eee;vertical-align:top}.r{text-align:right;font-variant-numeric:tabular-nums}.cr{color:#15803d;font-weight:700}.bal{font-weight:800}tr.payment td{background:#f6fbf7}.sub{font-size:6.5pt;color:#888;margin-top:.5mm}tfoot td{background:#f5f0e8;font-weight:800;font-size:8.5pt;padding:2.5mm 2mm;border-top:1.5px solid #c8a84b}.summ{display:flex;gap:6mm;justify-content:flex-end;margin-top:4mm;font-size:9pt}.summ b{font-size:10pt}.foot{margin-top:8mm;text-align:center;font-size:7pt;color:#999}@media print{@page{size:A4 portrait;margin:0}body{padding:12mm}}`;
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Statement — ${esc(row.name)}</title><style>${css}</style></head><body><div class="hdr">${logo?`<img src="${logo}" class="logo"/>`:""}  <div><div class="bizn">${esc(biz.name)}</div><div class="bizd">PAN ${esc(biz.pan)} · GSTIN ${esc(biz.gstin)}<br/>${esc(biz.address)}<br/>📞 ${esc(biz.phone)} · ✉ ${esc(biz.email)}</div></div></div><div class="title">INVOICE &amp; PAYMENT STATEMENT</div><div class="meta"><div><b>Customer:</b> ${esc(row.name)}${row.phone?`<br/><b>Phone:</b> ${esc(row.phone)}`:""}</div><div style="text-align:right"><b>Period:</b> ${esc(period)}<br/><b>Generated:</b> ${esc(fmt(new Date().toISOString()))}</div></div><table><thead><tr><th>Date</th><th>Particulars</th><th class="r">Bill (₹)</th><th class="r">Received (₹)</th><th class="r">Balance (₹)</th></tr></thead><tbody>${rows||`<tr><td colspan="5" style="text-align:center;color:#aaa;padding:6mm">No transactions</td></tr>`}</tbody><tfoot><tr><td colspan="2">Total</td><td class="r">${fmtN(totals.debit)}</td><td class="r" style="color:#15803d">${fmtN(totals.credit)}</td><td class="r" style="color:${totals.balance>0?"#c2461f":"#15803d"}">${fmtN(totals.balance)}</td></tr></tfoot></table><div class="summ"><span>Total Billed: <b>₹${fmtN(totals.debit)}</b></span><span>Received: <b style="color:#15803d">₹${fmtN(totals.credit)}</b></span><span>Balance Due: <b style="color:${totals.balance>0?"#c2461f":"#15803d"}">${totals.balance>0?"₹"+fmtN(totals.balance):"Cleared"}</b></span></div><div class="foot">Computer-generated statement · ${esc(biz.name)}</div><script>setTimeout(()=>window.print(),400)</script></body></html>`;
    const w=window.open("","_blank","width=820,height=1000"); if(!w) return; w.document.write(html); w.document.close();
  };

  return (
    <div style={sharedSt.backdrop} onClick={onClose}>
      <div style={st.modal} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={st.head}>
          <div><h2 style={sharedSt.modalTitle}>Invoice &amp; Payment Statement</h2><div style={{ fontSize:13, color:MUTE, fontWeight:600 }}>{row.name}{row.phone?` · ${row.phone}`:""}</div></div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button style={st.dlBtn} onClick={download}><Icon name="download" size={15}/> Download PDF</button>
            <button style={{ ...sharedSt.iconBtn, width:36, height:36, border:"1px solid #e6dcd2", fontSize:22 }} onClick={onClose}>×</button>
          </div>
        </div>

        {/* Filters */}
        <div style={st.filters}>
          <label style={st.fLabel}>From<input type="date" className="ivh-in" style={st.dateIn} value={stFrom} onChange={e=>setStFrom(e.target.value)}/></label>
          <label style={st.fLabel}>To<input type="date" className="ivh-in" style={st.dateIn} value={stTo} onChange={e=>setStTo(e.target.value)}/></label>
          <label style={st.fLabel}>Month
            <select className="ivh-datesel" style={st.sel} value={stMonth} onChange={e=>setStMonth(e.target.value)}>
              <option value="">All months</option>
              {MONTH_NAMES.map((n,i)=><option key={i} value={String(i+1)}>{n}</option>)}
            </select>
          </label>
          <label style={st.fLabel}>Year
            <select className="ivh-datesel" style={st.sel} value={stYear} onChange={e=>setStYear(e.target.value)}>
              <option value="">All years</option>
              {years.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label style={st.fLabel}>Status
            <select className="ivh-datesel" style={st.sel} value={stStatus} onChange={e=>setStStatus(e.target.value as any)}>
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </label>
          {hasFilters && <button style={st.clearBtn} onClick={clearFilters}>Clear</button>}
        </div>

        {/* Table */}
        <div data-modal-scroll style={st.tableWrap}>
          <table style={st.table}>
            <thead><tr>
              <th style={st.th}>Date</th>
              <th style={st.th}>Particulars</th>
              <th style={{ ...st.th, textAlign:"right" }}>Bill (₹)</th>
              <th style={{ ...st.th, textAlign:"right" }}>Received (₹)</th>
              <th style={{ ...st.th, textAlign:"right" }}>Balance (₹)</th>
            </tr></thead>
            <tbody>
              {txns.length === 0
                ? <tr><td colSpan={5} style={{ ...st.td, textAlign:"center", color:MUTE, padding:"24px" }}>No transactions for the selected filters.</td></tr>
                : txns.map((x,i) => (
                  <tr key={i} style={x.kind==="payment"?{background:"#f6fbf7"}:undefined}>
                    <td style={{ ...st.td, whiteSpace:"nowrap" }}>{fmt(x.date)}</td>
                    <td style={st.td}><div style={{ fontWeight:700, color:INK }}>{x.desc}</div>{x.sub&&<div style={{ fontSize:11.5, color:MUTE, marginTop:2 }}>{x.sub}</div>}</td>
                    <td style={{ ...st.td, textAlign:"right", fontVariantNumeric:"tabular-nums", color:x.debit?INK:FAINT }}>{x.debit?rupee(x.debit).replace("₹",""):"—"}</td>
                    <td style={{ ...st.td, textAlign:"right", fontVariantNumeric:"tabular-nums", color:x.credit?GREEN:FAINT, fontWeight:x.credit?700:400 }}>{x.credit?rupee(x.credit).replace("₹",""):"—"}</td>
                    <td style={{ ...st.td, textAlign:"right", fontVariantNumeric:"tabular-nums", fontWeight:800, color:x.balance>0?TERRA:GREEN }}>{rupee(x.balance).replace("₹","")}</td>
                  </tr>
                ))
              }
            </tbody>
            <tfoot>
              <tr>
                <td style={st.tf} colSpan={2}>Total</td>
                <td style={{ ...st.tf, textAlign:"right" }}>{rupee(totals.debit).replace("₹","")}</td>
                <td style={{ ...st.tf, textAlign:"right", color:GREEN }}>{rupee(totals.credit).replace("₹","")}</td>
                <td style={{ ...st.tf, textAlign:"right", color:totals.balance>0?TERRA:GREEN }}>{rupee(totals.balance).replace("₹","")}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Summary */}
        <div style={{ display:"flex", gap:18, justifyContent:"flex-end", flexWrap:"wrap", marginTop:14, fontSize:13, color:"#545a67" }}>
          <span>Total Billed: <b style={{ color:INK }}>{rupee(totals.debit)}</b></span>
          <span>Total Received: <b style={{ color:GREEN }}>{rupee(totals.credit)}</b></span>
          <span>Balance Due: <b style={{ color:totals.balance>0?TERRA:GREEN }}>{totals.balance>0?rupee(totals.balance):"✓ Cleared"}</b></span>
        </div>
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  modal:    { width:"min(1080px,100%)", maxHeight:"calc(100vh - 40px)", background:"#fffdfb", boxShadow:"0 30px 80px rgba(24,22,28,.34)", display:"flex", flexDirection:"column", overflow:"hidden", padding:"18px 20px" },
  head:     { display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:14 },
  dlBtn:    { display:"inline-flex", alignItems:"center", gap:6, padding:"9px 16px", border:"none", background:GREEN, color:"#fff", fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", borderRadius:0, whiteSpace:"nowrap" },
  filters:  { display:"flex", alignItems:"flex-end", gap:10, flexWrap:"wrap", marginBottom:14, paddingBottom:14, borderBottom:`1px solid ${LINE}` },
  fLabel:   { display:"flex", flexDirection:"column", gap:4, fontSize:11, fontWeight:700, letterSpacing:0.4, textTransform:"uppercase", color:MUTE },
  dateIn:   { padding:"7px 10px", border:"1px solid #e6dcd2", borderRadius:0, fontSize:13, fontFamily:SANS, background:"#fff", color:INK, colorScheme:"light" as const },
  sel:      { padding:"7px 10px", border:`1px solid ${LINE}`, borderRadius:0, background:"#fff", color:"#545a67", fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", colorScheme:"light" as const },
  clearBtn: { padding:"8px 12px", border:`1px solid ${LINE}`, background:"#fff", color:"#545a67", fontFamily:SANS, fontWeight:700, fontSize:12.5, cursor:"pointer", borderRadius:0 },
  tableWrap:{ overflowX:"auto", overflowY:"auto", overscrollBehavior:"contain", maxHeight:"calc(100vh - 300px)", border:`1px solid ${LINE}` },
  table:    { width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:560 },
  th:       { textAlign:"left", padding:"10px 12px", fontSize:10.5, letterSpacing:0.5, textTransform:"uppercase", color:"#fff", background:TERRA, fontWeight:700, whiteSpace:"nowrap" },
  td:       { padding:"10px 12px", borderBottom:"1px solid #f4f1ec", color:"#2a2f3a", verticalAlign:"top" },
  tf:       { padding:"12px", background:"#faf6f1", fontWeight:800, fontSize:13.5, borderTop:`1.5px solid ${LINE}`, color:INK },
};