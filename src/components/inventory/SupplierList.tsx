// src/components/inventory/SupplierList.tsx
// ── Suppliers tab: table layout matching Stock Items ───────────────────────

import { useState } from "react";
import api from "../../api";
import Icon from "./Icon";
import SupplierStatement from "./SupplierStatement";
import OverviewFilters from "./OverviewFilters";
import {
  Supplier, INK, BODY, MUTE, LINE, IVORY, CARD,
  TERRA, TERRA_DK, GOLD, GOLD_LT, GREEN, AMBER, RED, SANS,
  dec, rupee, rfmt, dtfmt,
} from "./types";

interface SupplierWithBalance extends Supplier {
  totalPurchased: string;
  totalPaid:      string;
  lastPurchaseAt?: string;
}

interface Props {
  suppliers: SupplierWithBalance[];
  loading:   boolean;
  onAdd?:    () => void;
  onEdit:    (s: Supplier) => void;
  onRefresh: () => void;
  onStatementActions?: (a: any) => void;
}

// ── Print statement (unchanged) ──────────────────────────────────────────────
function downloadStatement(sup: SupplierWithBalance, purchased: number, paid: number, outstanding: number) {
  api.get(`/api/inventory/suppliers/${sup.id}/statement`).then(r => {
    const d = r.data;
    const entries: any[] = Array.isArray(d?.entries) ? d.entries : [];
    const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string));
    const fmt = (s: string) => s ? new Date(s).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";
    const rows = entries.map((e,i) => `
      <tr style="background:${i%2===0?"#fff":"#faf8f4"}">
        <td>${fmt(e.date||e.createdAt)}</td>
        <td><span class="badge ${e.kind==="purchase"?"purchase":"payment"}">${e.kind==="purchase"?"Purchase":"Payment"}</span></td>
        <td>${esc(e.ref ? `Bill #${e.ref}` : e.method ? e.method.charAt(0).toUpperCase()+e.method.slice(1) : "—")}</td>
        <td style="color:#8a8f9a">${esc(e.note||"—")}</td>
        <td class="r" style="color:#d9542f;font-weight:700">${e.debit>0?"₹"+Number(e.debit).toLocaleString("en-IN",{minimumFractionDigits:2}):""}</td>
        <td class="r" style="color:#15803d;font-weight:700">${e.credit>0?"₹"+Number(e.credit).toLocaleString("en-IN",{minimumFractionDigits:2}):""}</td>
        <td class="r" style="font-weight:800;color:${Number(e.balance)>0?"#d9542f":"#15803d"}">₹${Number(e.balance||0).toLocaleString("en-IN",{minimumFractionDigits:2})}</td>
      </tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>Supplier Statement — ${esc(sup.name)}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1a1d27;background:#fff;padding:32px}
        .doc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #ede8dc}
        .logo-box{flex-shrink:0}
        .logo-box img{height:56px;width:auto;display:block}
        .head-center{flex:1;text-align:center}
        .doc-title{font-size:20px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#1a1d27}
        .doc-sup{font-size:16px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#d9542f;margin-top:8px}
        .doc-contact{font-size:12px;color:#8a8f9a;margin-top:5px;line-height:1.6}
        .doc-gen{font-size:11px;color:#aab;margin-top:6px}
        .head-spacer{width:56px;flex-shrink:0}
        .cards{display:flex;gap:16px;margin-bottom:28px}
        .card{flex:1;padding:16px 18px;border:1px solid #ede8dc}
        .card-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#8a8f9a;margin-bottom:6px}
        .card-val{font-size:22px;font-weight:900;font-variant-numeric:tabular-nums}
        table{width:100%;border-collapse:collapse;font-size:12.5px}
        th{background:#faf8f4;padding:9px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#8a8f9a;border-bottom:2px solid #ede8dc;white-space:nowrap}
        th.r{text-align:right}
        td{padding:10px 12px;border-bottom:1px solid #ede8dc;vertical-align:top}
        td.r{text-align:right;font-variant-numeric:tabular-nums}
        .badge{display:inline-block;padding:2px 8px;font-size:11px;font-weight:700;border-radius:2px}
        .purchase{background:#fff2ee;color:#d9542f}
        .payment{background:#dcfce7;color:#15803d}
        tfoot td{background:#1a1d27;color:#fff;font-weight:800;font-size:13px;padding:12px}
        tfoot td.r{text-align:right;font-variant-numeric:tabular-nums}
        @media print{body{padding:16px}@page{margin:12mm}}
      </style>
    </head><body>
      <div class="doc-head">
        <div class="logo-box">
          <img src="${window.location.origin}/images/abhijit_art_logo.png" alt="Abhijit Art"
               onerror="this.style.display='none'" />
        </div>
        <div class="head-center">
          <div class="doc-title">Supplier Statement</div>
          <div class="doc-sup">${esc(sup.name)}</div>
          <div class="doc-contact">
            ${sup.phone ? `📞 ${esc(sup.phone)}` : ""}${sup.phone && sup.email ? " &nbsp;·&nbsp; " : ""}${sup.email ? `✉ ${esc(sup.email)}` : ""}
          </div>
          <div class="doc-gen">Generated ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div>
        </div>
        <div class="head-spacer"></div>
      </div>
      <div class="cards">
        <div class="card"><div class="card-label">Total Purchased</div><div class="card-val" style="color:#1a1d27">₹${purchased.toLocaleString("en-IN",{minimumFractionDigits:2})}</div></div>
        <div class="card"><div class="card-label">Total Paid</div><div class="card-val" style="color:#15803d">₹${paid.toLocaleString("en-IN",{minimumFractionDigits:2})}</div></div>
        <div class="card" style="background:${outstanding>0?"#fff8f5":"#f0fdf4"};border-color:${outstanding>0?"#d9542f33":"#15803d33"}">
          <div class="card-label">Balance Due</div>
          <div class="card-val" style="color:${outstanding>0?"#d9542f":"#15803d"}">₹${outstanding.toLocaleString("en-IN",{minimumFractionDigits:2})}${outstanding<=0?" ✓":""}</div>
        </div>
      </div>
      <table>
        <thead><tr>
          <th>Date</th><th>Type</th><th>Reference</th><th>Note</th>
          <th class="r">Amount Purchased (₹)</th>
          <th class="r">Amount Paid (₹)</th>
          <th class="r">Balance Due (₹)</th>
        </tr></thead>
        <tbody>${rows||"<tr><td colspan='7' style='text-align:center;color:#aaa;padding:24px'>No transactions yet.</td></tr>"}</tbody>
        <tfoot><tr>
          <td colspan="4">Total</td>
          <td class="r">₹${purchased.toLocaleString("en-IN",{minimumFractionDigits:2})}</td>
          <td class="r">₹${paid.toLocaleString("en-IN",{minimumFractionDigits:2})}</td>
          <td class="r">₹${outstanding.toLocaleString("en-IN",{minimumFractionDigits:2})}${outstanding<=0?" ✓":""}</td>
        </tr></tfoot>
      </table>
      <script>setTimeout(()=>window.print(),400)</script>
    </body></html>`;
    const w = window.open("","_blank","width=1100,height=800");
    if (w) { w.document.write(html); w.document.close(); }
  }).catch(() => alert("Couldn't load statement data."));
}

export default function SupplierList({ suppliers, loading, onEdit, onRefresh, onStatementActions }: Props) {
  const [openId, setOpenId] = useState<string|null>(null);
  const [search, setSearch] = useState("");

  // "Last purchase" date filter
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  // ── Open statement view ────────────────────────────────────────────────────
  if (openId) {
    return (
      <SupplierStatement
        supplierId = {openId}
        onBack     = {() => { setOpenId(null); onRefresh(); }}
        onActions  = {onStatementActions}
      />
    );
  }

  const totalOutstanding = suppliers.reduce((s,sup) => s + Math.max(dec(sup.totalPurchased)-dec(sup.totalPaid),0), 0);
  const totalPurchased   = suppliers.reduce((s,sup) => s + dec(sup.totalPurchased), 0);
  const totalPaid        = suppliers.reduce((s,sup) => s + dec(sup.totalPaid), 0);

  const shown = (() => {
    let list = suppliers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.phone||"").includes(search) ||
        (s.email||"").toLowerCase().includes(q));
    }
    // filter by last purchase date
    if (dateFrom) list = list.filter(s => (s.lastPurchaseAt||"").slice(0,10) >= dateFrom);
    if (dateTo)   list = list.filter(s => (s.lastPurchaseAt||"").slice(0,10) <= dateTo);
    return list;
  })();

  return (
    <div style={st.wrap}>

      {/* ── KPI strip (matches Stock Items) ─────────────────────────────── */}
      <div style={st.kpiStrip}>
        {[
          { label:"Total suppliers",   val: loading?"…":String(suppliers.length),   sub:"Active vendors",       accent: GOLD },
          { label:"Total purchased",   val: loading?"…":rupee(totalPurchased),       sub:"All-time",             accent: INK },
          { label:"Total paid",        val: loading?"…":rupee(totalPaid),            sub:"Settled so far",       accent: GREEN },
          { label:"Total outstanding", val: loading?"…":rupee(totalOutstanding),     sub:"Still owed",           accent: totalOutstanding>0?TERRA:GREEN },
        ].map(k => (
          <div key={k.label} style={st.kpiCard}>
            <div style={st.kpiLabel}>{k.label}</div>
            <div style={{ fontSize:26, fontWeight:900, color:k.accent, fontVariantNumeric:"tabular-nums", lineHeight:1 }}>{k.val}</div>
            <div style={{ fontSize:11, color:MUTE, marginTop:6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div style={st.toolbar}>
        <div style={st.searchWrap}>
          <Icon name="search" size={15} color={MUTE} />
          <input
            className="inv-search"
            style={st.searchIn}
            placeholder="Search supplier name, phone or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Date filter — filters suppliers by their last purchase date */}
        <div style={st.dateWrap}>
          <span style={st.dateLbl}>Last purchase</span>
          <OverviewFilters onChange={f => { setDateFrom(f.from); setDateTo(f.to); }} />
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div style={st.tableOuter}>
        {loading ? (
          <div style={st.empty}>Loading…</div>
        ) : shown.length === 0 ? (
          <div style={st.empty}>
            {suppliers.length === 0 ? "No suppliers yet — use Add supplier above to get started." : "No suppliers match the current filter."}
          </div>
        ) : (
          <table style={st.table}>
            <thead>
              <tr>
                {["Supplier","Contact","Purchased","Paid","Outstanding","Last Purchase",""].map(h => (
                  <th key={h} style={st.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((sup, idx) => {
                const purchased   = dec(sup.totalPurchased);
                const paid        = dec(sup.totalPaid);
                const outstanding = Math.max(purchased - paid, 0);
                const isSettled   = outstanding <= 0 && purchased > 0;
                return (
                  <tr key={sup.id} className="inv-row" style={{ background: idx%2===0 ? CARD : IVORY }}>
                    {/* Supplier */}
                    <td style={st.td}>
                      <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                        <div style={st.avatar}>{sup.name.slice(0,2).toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight:700, fontSize:13.5, color:INK }}>{sup.name}</div>
                          {sup.gstin && <div style={{ fontSize:10.5, color:MUTE, marginTop:1, fontFamily:"monospace" }}>{sup.gstin}</div>}
                        </div>
                      </div>
                    </td>
                    {/* Contact */}
                    <td style={{ ...st.td, fontSize:12.5, color:BODY }}>
                      {sup.phone && <div>{sup.phone}</div>}
                      {sup.email && <div style={{ color:MUTE, fontSize:11.5, marginTop:1 }}>{sup.email}</div>}
                      {!sup.phone && !sup.email && <span style={{ color:MUTE }}>—</span>}
                    </td>
                    {/* Purchased */}
                    <td style={{ ...st.td, fontVariantNumeric:"tabular-nums", fontWeight:700 }}>{rupee(purchased)}</td>
                    {/* Paid */}
                    <td style={{ ...st.td, fontVariantNumeric:"tabular-nums", fontWeight:700, color:paid>0?GREEN:MUTE }}>{rupee(paid)}</td>
                    {/* Outstanding */}
                    <td style={{ ...st.td, fontVariantNumeric:"tabular-nums" }}>
                      {isSettled ? (
                        <span style={{ color:GREEN, fontWeight:700, fontSize:12.5 }}>Settled ✓</span>
                      ) : (
                        <span style={{ color:outstanding>0?TERRA:MUTE, fontWeight:800 }}>{rupee(outstanding)}</span>
                      )}
                    </td>
                    {/* Last purchase */}
                    <td style={{ ...st.td, color:MUTE, fontSize:11.5, whiteSpace:"nowrap" }}>
                      {sup.lastPurchaseAt ? dtfmt(sup.lastPurchaseAt).split(",")[0] : "—"}
                    </td>
                    {/* Actions */}
                    <td style={{ ...st.td, textAlign:"right" }}>
                      <div style={{ display:"flex", gap:5, justifyContent:"flex-end" }}>
                        <button className="inv-cta" style={st.viewBtn} onClick={() => setOpenId(sup.id)}>
                          View
                        </button>
                        <button className="inv-icon" style={st.iconBtn} title="Download statement" onClick={() => downloadStatement(sup, purchased, paid, outstanding)}>
                          <Icon name="download" size={14}/>
                        </button>
                        <button className="inv-icon" style={st.iconBtn} title="Edit supplier" onClick={() => onEdit(sup)}>
                          <Icon name="edit" size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrap:       { flex:1, minWidth:0, display:"flex", flexDirection:"column", overflowY:"auto" },
  kpiStrip:   { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:1, background:LINE, borderBottom:`1px solid ${LINE}`, flexShrink:0 },
  kpiCard:    { background:CARD, padding:"22px 24px" },
  kpiLabel:   { fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, marginBottom:8 },
  toolbar:    { display:"flex", alignItems:"center", gap:10, padding:"13px 20px", borderBottom:`1px solid ${LINE}`, background:CARD, flexShrink:0, flexWrap:"wrap" },
  searchWrap: { display:"flex", alignItems:"center", gap:8, border:`1px solid ${LINE}`, background:CARD, padding:"9px 12px", flex:1, maxWidth:380, minWidth:160 },
  dateWrap:   { display:"inline-flex", alignItems:"center", gap:8, paddingLeft:12, borderLeft:`1px solid ${LINE}`, flexWrap:"wrap" },
  dateLbl:    { fontSize:10, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.9, whiteSpace:"nowrap" },
  searchIn:   { flex:1, border:"none", outline:"none", fontSize:13.5, fontFamily:SANS, color:INK, background:"transparent" },
  tableOuter: { flex:1, overflowX:"auto" },
  table:      { width:"100%", borderCollapse:"collapse", fontSize:13.5 },
  th:         { padding:"11px 16px", textAlign:"left", fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, borderBottom:`2px solid ${LINE}`, background:IVORY, whiteSpace:"nowrap" },
  td:         { padding:"13px 16px", borderBottom:`1px solid ${LINE}`, verticalAlign:"middle" },
  avatar:     { width:36, height:36, borderRadius:"50%", background:`${TERRA}18`, color:TERRA, fontWeight:800, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  viewBtn:    { padding:"7px 14px", background:TERRA, border:"none", color:"#fff", fontFamily:SANS, fontWeight:700, fontSize:12, cursor:"pointer" },
  iconBtn:    { width:32, height:32, display:"grid", placeItems:"center", border:`1px solid ${LINE}`, background:CARD, color:MUTE, cursor:"pointer", borderRadius:0, transition:"all .18s" },
  empty:      { padding:"60px 0", textAlign:"center", color:MUTE, fontFamily:SANS },
};