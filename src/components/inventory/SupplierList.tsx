// src/components/inventory/SupplierList.tsx
// ── Suppliers tab: list with outstanding balance + quick actions ───────────

import { useState } from "react";
import api from "../../api";
import Icon from "./Icon";
import SupplierStatement from "./SupplierStatement";
import {
  Supplier, INK, BODY, MUTE, LINE, IVORY, CARD,
  TERRA, TERRA_DK, GREEN, AMBER, RED, SANS,
  dec, rupee, rfmt, dtfmt, sharedSt,
} from "./types";

interface SupplierWithBalance extends Supplier {
  totalPurchased: string;
  totalPaid:      string;
  lastPurchaseAt?: string;
}

interface Props {
  suppliers: SupplierWithBalance[];
  loading:   boolean;
  onAdd:     () => void;
  onEdit:    (s: Supplier) => void;
  onRefresh: () => void;
}

function downloadStatement(sup: SupplierWithBalance, purchased: number, paid: number, outstanding: number) {
  // Fetch full statement then build printable HTML
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
        h1{font-size:22px;font-weight:900;color:#1a1d27;margin-bottom:4px}
        .sub{color:#8a8f9a;font-size:13px;margin-bottom:24px}
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
      <h1>Supplier Statement</h1>
      <div class="sub">${esc(sup.name)}${sup.phone?` &nbsp;·&nbsp; 📞 ${esc(sup.phone)}`:""} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div>
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
          <th>Date</th>
          <th>Type</th>
          <th>Reference</th>
          <th>Note</th>
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

interface SupplierWithBalance extends Supplier {
  totalPurchased: string;
  totalPaid:      string;
  lastPurchaseAt?: string;
}

interface Props {
  suppliers: SupplierWithBalance[];
  loading:   boolean;
  onAdd:     () => void;
  onEdit:    (s: Supplier) => void;
  onRefresh: () => void;
}

export default function SupplierList({ suppliers, loading, onAdd, onEdit, onRefresh }: Props) {
  const [openId, setOpenId] = useState<string|null>(null);

  // ── Open statement view ────────────────────────────────────────────────────
  if (openId) {
    return (
      <SupplierStatement
        supplierId = {openId}
        onBack     = {() => { setOpenId(null); onRefresh(); }}
      />
    );
  }

  const totalOutstanding = suppliers.reduce((s,sup) => s + Math.max(dec(sup.totalPurchased)-dec(sup.totalPaid),0), 0);
  const totalPurchased   = suppliers.reduce((s,sup) => s + dec(sup.totalPurchased), 0);

  return (
    <div style={st.wrap}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={st.topBar}>
        <div>
          <h2 style={st.title}>Suppliers</h2>
          <p style={st.sub}>Manage vendors, track purchases and outstanding payments</p>
        </div>
        <button className="inv-cta" style={sharedSt.ctaBtn} onClick={onAdd}>
          <Icon name="plus" size={14} color="#fff"/> Add supplier
        </button>
      </div>

      {/* ── Summary strip ───────────────────────────────────────────────── */}
      {suppliers.length > 0 && (
        <div style={st.summaryStrip}>
          {[
            { label:"Total suppliers", val:String(suppliers.length), color:INK },
            { label:"Total purchased", val:rupee(totalPurchased), color:INK },
            { label:"Total outstanding", val:rupee(totalOutstanding), color:totalOutstanding>0?TERRA:GREEN },
          ].map(k => (
            <div key={k.label} style={st.sumItem}>
              <div style={st.sumLabel}>{k.label}</div>
              <div style={{ fontSize:20, fontWeight:900, color:k.color, fontVariantNumeric:"tabular-nums" }}>{k.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Supplier cards ──────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding:"60px 0", textAlign:"center", color:MUTE }}>Loading…</div>
      ) : suppliers.length === 0 ? (
        <div style={st.emptyState}>
          <div style={{ fontSize:32, marginBottom:12 }}>🏭</div>
          <div style={{ fontWeight:700, color:INK, fontSize:16, marginBottom:6 }}>No suppliers yet</div>
          <div style={{ color:MUTE, fontSize:13, marginBottom:18 }}>Add your first supplier to start tracking purchases and payments.</div>
          <button className="inv-cta" style={sharedSt.ctaBtn} onClick={onAdd}>
            <Icon name="plus" size={14} color="#fff"/> Add supplier
          </button>
        </div>
      ) : (
        <div style={st.cardGrid}>
          {suppliers.map(sup => {
            const purchased   = dec(sup.totalPurchased);
            const paid        = dec(sup.totalPaid);
            const outstanding = Math.max(purchased - paid, 0);
            const pctPaid     = purchased > 0 ? Math.min((paid/purchased)*100, 100) : 100;
            const isSettled   = outstanding <= 0;

            return (
              <div key={sup.id} style={st.card}>
                {/* Card header */}
                <div style={st.cardHead}>
                  <div style={st.avatar}>{sup.name.slice(0,2).toUpperCase()}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={st.suppName}>{sup.name}</div>
                    {sup.phone && <div style={st.suppMeta}>📞 {sup.phone}</div>}
                    {sup.email && <div style={st.suppMeta}>✉ {sup.email}</div>}
                  </div>
                  <button style={st.editBtn} onClick={()=>onEdit(sup)} title="Edit supplier">
                    <Icon name="edit" size={14} color={MUTE}/>
                  </button>
                </div>

                {/* Balance bar */}
                <div style={st.balanceSection}>
                  <div style={st.balRow}>
                    <span style={{ fontSize:12, color:MUTE }}>Purchased</span>
                    <span style={{ fontSize:13, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{rupee(purchased)}</span>
                  </div>
                  <div style={st.balRow}>
                    <span style={{ fontSize:12, color:MUTE }}>Paid</span>
                    <span style={{ fontSize:13, fontWeight:700, color:GREEN, fontVariantNumeric:"tabular-nums" }}>{rupee(paid)}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height:5, background:LINE, borderRadius:3, margin:"8px 0" }}>
                    <div style={{ height:5, borderRadius:3, background:isSettled?GREEN:TERRA, width:`${pctPaid}%`, transition:"width .4s ease" }}/>
                  </div>
                  {/* Outstanding */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:12, color:MUTE }}>Outstanding</span>
                    <span style={{ fontSize:15, fontWeight:900, color:isSettled?GREEN:TERRA, fontVariantNumeric:"tabular-nums" }}>
                      {isSettled ? "Settled ✓" : rupee(outstanding)}
                    </span>
                  </div>
                </div>

                {/* Last purchase */}
                {sup.lastPurchaseAt && (
                  <div style={st.lastPurchase}>
                    Last purchase: {dtfmt(sup.lastPurchaseAt).split(",")[0]}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display:"flex", gap:8, marginTop:12 }}>
                  <button
                    className="inv-cta"
                    style={{ ...sharedSt.ctaBtn, flex:1, justifyContent:"center", fontSize:12.5 }}
                    onClick={() => setOpenId(sup.id)}
                  >
                    View statement
                  </button>
                  <button
                    className="inv-ghost"
                    style={{ ...sharedSt.ghostBtn, flex:1, justifyContent:"center", fontSize:12.5 }}
                    onClick={() => downloadStatement(sup, purchased, paid, outstanding)}
                  >
                    ↓ Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrap:          { padding:"24px 24px 60px", display:"flex", flexDirection:"column", gap:20, fontFamily:SANS },
  topBar:        { display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap" },
  title:         { fontSize:22, fontWeight:900, color:INK, margin:0, letterSpacing:-.3 },
  sub:           { fontSize:13, color:MUTE, margin:"4px 0 0" },
  summaryStrip:  { display:"flex", gap:1, background:LINE, border:`1px solid ${LINE}` },
  sumItem:       { flex:1, background:CARD, padding:"16px 20px" },
  sumLabel:      { fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, marginBottom:6 },
  cardGrid:      { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 },
  card:          { background:CARD, border:`1px solid ${LINE}`, padding:"18px 20px", display:"flex", flexDirection:"column" },
  cardHead:      { display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 },
  avatar:        { width:40, height:40, borderRadius:"50%", background:`${TERRA}18`, color:TERRA, fontWeight:800, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  suppName:      { fontSize:15, fontWeight:800, color:INK, lineHeight:1.2 },
  suppMeta:      { fontSize:11.5, color:MUTE, marginTop:3 },
  editBtn:       { background:"none", border:`1px solid ${LINE}`, cursor:"pointer", width:30, height:30, display:"grid", placeItems:"center" },
  balanceSection:{ borderTop:`1px solid ${LINE}`, paddingTop:14 },
  balRow:        { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 },
  lastPurchase:  { fontSize:11, color:MUTE, marginTop:8, paddingTop:8, borderTop:`1px solid ${LINE}` },
  emptyState:    { padding:"60px 0", textAlign:"center", color:MUTE } as React.CSSProperties,
};