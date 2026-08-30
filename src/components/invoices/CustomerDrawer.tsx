// src/components/invoices/CustomerDrawer.tsx
import { useState } from "react";
import { CustomerRow, Invoice, INK, MUTE, TERRA, GREEN, LINE, SANS, num, round2, rupee as makeRupee, fmt, fmtTime, effectivePaid, STATUS_META, sharedSt } from "./types";
import Icon from "./Icon";

const rupee = makeRupee;

interface Props {
  row:          CustomerRow;
  onClose:      () => void;
  onPay:        (inv: Invoice) => void;
  onPrint:      (inv: Invoice) => void;
  onEdit:       (inv: Invoice) => void;
  onPreview:    (inv: Invoice) => void;
  onStatement:  (key: string) => void;
}

const withFormat = (inv: Invoice, format: "full" | "half"): Invoice => ({
  ...inv,
  business: { ...((inv.business || {}) as any), format },
});

const savedFormat = (inv: Invoice): "half" | "full" =>
  ((inv.business || {}) as any).format === "full" ? "full" : "half";

export default function CustomerDrawer({ row, onClose, onPay, onPrint, onEdit, onPreview, onStatement }: Props) {
  const [q, setQ]               = useState("");
  const [paidOpen, setPaidOpen] = useState(false);

  const filtered = q.trim()
    ? row.invoices.filter(inv => inv.invoiceNo.toLowerCase().includes(q.toLowerCase()))
    : row.invoices;

  const isPaid     = (inv: Invoice) => inv.status === "paid" || round2(num(inv.total) - effectivePaid(inv)) <= 0.005;
  const paidInvs   = filtered.filter(isPaid);
  const activeInvs = filtered.filter(inv => !isPaid(inv));

  return (
    <div style={sharedSt.backdrop} onClick={onClose}>
      <div data-modal-scroll style={st.drawer} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={st.head}>
          <div>
            <h2 style={st.name}>{row.name}</h2>
            {row.phone && <div style={st.phone}><Icon name="phone" size={12}/> {row.phone}</div>}
          </div>
          <div style={st.searchWrap}>
            <span style={st.searchIcon}><Icon name="search" size={15}/></span>
            <input style={st.searchIn} placeholder="Search invoice no…" value={q} onChange={e => setQ(e.target.value)}/>
            {q && <button style={st.searchClear} onClick={() => setQ("")}>×</button>}
          </div>
          <button style={st.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Stats */}
        <div style={st.stats}>
          {[
            { label:"Total Billed", val:rupee(row.billed), color:INK   },
            { label:"Paid",         val:rupee(row.paid),   color:GREEN  },
            { label:"Balance Due",  val:row.due>0?rupee(row.due):"✓ Cleared", color:row.due>0?TERRA:GREEN },
          ].map(s => (
            <div key={s.label} style={st.stat}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:0.4, textTransform:"uppercase", color:"#9ca3af", marginBottom:5 }}>{s.label}</div>
              <div style={{ fontSize:15.5, fontWeight:800, fontVariantNumeric:"tabular-nums", color:s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Statement CTA */}
        <button style={st.stmtCta} onClick={() => onStatement(row.key)}>
          <Icon name="csv" size={15}/> View Invoice &amp; Payment Statement
        </button>

        {/* Outstanding count */}
        <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:0.6, textTransform:"uppercase", color:"#9ca3af", marginBottom:8 }}>
          {activeInvs.length}{q ? ` of ${row.invoices.length}` : ""} outstanding invoice{activeInvs.length!==1?"s":""}
        </div>

        {/* Paid section (collapsible) */}
        {paidInvs.length > 0 && (
          <div style={st.paidSection}>
            <button style={st.paidHead} onClick={() => setPaidOpen(v => !v)}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:7 }}>
                <Icon name="lock" size={13}/> Paid &amp; locked · {paidInvs.length}
              </span>
              <span style={{ fontSize:16, transform:paidOpen?"rotate(90deg)":"none", transition:"transform .15s" }}>›</span>
            </button>
            {paidOpen && (
              <div style={st.paidList}>
                {paidInvs.map(inv => (
                  <PaidCard key={inv.id} inv={inv} onPrint={onPrint} onPreview={onPreview}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active invoices */}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {filtered.length === 0
            ? <div style={{ padding:"18px", textAlign:"center", color:MUTE, fontSize:13 }}>No invoices match "{q}".</div>
            : activeInvs.length === 0
              ? <div style={{ padding:"18px", textAlign:"center", color:GREEN, fontSize:13, fontWeight:600 }}>✓ All invoices are fully paid.</div>
              : activeInvs.map(inv => (
                  <ActiveCard key={inv.id} inv={inv} onPay={onPay} onPrint={onPrint} onEdit={onEdit} onPreview={onPreview}/>
                ))
          }
        </div>
      </div>
    </div>
  );
}

// ── Format badge ──────────────────────────────────────────────────────────
function FormatBadge({ format }: { format: "half" | "full" }) {
  return (
    <span style={{
      fontSize:9, fontWeight:800, padding:"2px 6px",
      textTransform:"uppercase", letterSpacing:0.5,
      background: format === "half" ? "#fff3e0" : "#e8f0fe",
      color:       format === "half" ? "#b45309"  : "#1a56db",
      border:      format === "half" ? "1px solid #fcd34d" : "1px solid #93c5fd",
    }}>
      {format === "half" ? "Half (6×8)" : "Full (A4)"}
    </span>
  );
}

// ── Print button (uses saved format automatically) ────────────────────────
function PrintBtn({ inv, onPrint }: { inv: Invoice; onPrint: (i:Invoice) => void }) {
  const format = savedFormat(inv);
  return (
    <button
      className="ivh-icon"
      style={st.actionBtn}
      onClick={() => onPrint(withFormat(inv, format))}
      title={`Print ${format === "half" ? "Half (6×8)" : "Full (A4)"}`}
    >
      <Icon name="download" size={14}/>
      <span style={{ fontSize:11.5, fontWeight:600 }}>Print</span>
    </button>
  );
}

// ── Active card ───────────────────────────────────────────────────────────
function ActiveCard({
  inv, onPay, onPrint, onEdit, onPreview,
}: {
  inv:       Invoice;
  onPay:     (i:Invoice) => void;
  onPrint:   (i:Invoice) => void;
  onEdit:    (i:Invoice) => void;
  onPreview: (i:Invoice) => void;
}) {
  const m     = STATUS_META[inv.status];
  const total = num(inv.total);
  const paid  = effectivePaid(inv);
  const due   = round2(Math.max(total - paid, 0));

  return (
    <div style={st.card}>
      <div style={st.cardTopRow}>
        <button className="ivh-nolink" style={st.invNo} onClick={() => onPreview(inv)}>
          {inv.invoiceNo}
        </button>
        <span style={{ ...st.badge, background:m.bg, color:m.fg }}>{m.label}</span>
        <FormatBadge format={savedFormat(inv)}/>
        <div style={{ marginLeft:"auto", textAlign:"right" }}>
          <div style={{ fontSize:14, fontWeight:800, color:INK, fontVariantNumeric:"tabular-nums" }}>{rupee(total)}</div>
          <div style={{ fontSize:11, color:due>0?TERRA:GREEN, fontWeight:700 }}>{due>0?`Due ${rupee(due)}`:"Paid"}</div>
        </div>
      </div>
      <div style={st.cardMeta}>
        {fmt(inv.date)} · {fmtTime(inv.createdAt)} — {(inv.items||[]).map(it=>`${it.qty}× ${it.desc}`).join(", ")||"—"}
      </div>
      <div style={st.cardActions}>
        <button className="ivh-icon" style={st.actionBtn} onClick={() => onPay(inv)} disabled={inv.status==="cancelled"}>
          <Icon name="banknote" size={14}/> <span style={{ fontSize:11.5, fontWeight:600 }}>Payment</span>
        </button>
        <button className="ivh-icon" style={st.actionBtn} onClick={() => onEdit(inv)} disabled={inv.status==="cancelled"}>
          <Icon name="edit" size={14}/> <span style={{ fontSize:11.5, fontWeight:600 }}>Edit</span>
        </button>
        <button className="ivh-icon" style={st.actionBtn} onClick={() => onPreview(inv)}>
          <Icon name="search" size={14}/> <span style={{ fontSize:11.5, fontWeight:600 }}>Preview</span>
        </button>
        <PrintBtn inv={inv} onPrint={onPrint}/>
      </div>
    </div>
  );
}

// ── Paid card ─────────────────────────────────────────────────────────────
function PaidCard({
  inv, onPrint, onPreview,
}: {
  inv:       Invoice;
  onPrint:   (i:Invoice) => void;
  onPreview: (i:Invoice) => void;
}) {
  const total = num(inv.total);

  return (
    <div style={{ ...st.card, background:"#f6fbf7", borderColor:"#cfe8d8" }}>
      <div style={st.cardTopRow}>
        <button className="ivh-nolink" style={st.invNo} onClick={() => onPreview(inv)}>
          {inv.invoiceNo}
        </button>
        <span style={{ ...st.badge, background:"#eafaf0", color:GREEN, display:"inline-flex", alignItems:"center", gap:3 }}>
          <Icon name="lock" size={10}/> PAID
        </span>
        <FormatBadge format={savedFormat(inv)}/>
        <div style={{ marginLeft:"auto" }}>
          <div style={{ fontSize:14, fontWeight:800, color:INK, fontVariantNumeric:"tabular-nums" }}>{rupee(total)}</div>
          <div style={{ fontSize:11, color:GREEN, fontWeight:700 }}>Cleared</div>
        </div>
      </div>
      <div style={st.cardMeta}>
        {fmt(inv.date)} · {fmtTime(inv.createdAt)} — {(inv.items||[]).map(it=>`${it.qty}× ${it.desc}`).join(", ")||"—"}
      </div>
      <div style={st.cardActions}>
        <button className="ivh-icon" style={st.actionBtn} onClick={() => onPreview(inv)}>
          <Icon name="search" size={14}/> <span style={{ fontSize:11.5, fontWeight:600 }}>Preview</span>
        </button>
        <PrintBtn inv={inv} onPrint={onPrint}/>
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  drawer:      { width:"min(900px,100%)", maxHeight:"calc(100vh - 40px)", background:"#fffdfb", boxShadow:"0 30px 80px rgba(24,22,28,.34)", display:"flex", flexDirection:"column", overflowY:"auto", overscrollBehavior:"contain", padding:"14px 22px" },
  head:        { display:"flex", alignItems:"center", gap:10, marginBottom:12 },
  name:        { fontSize:17, fontWeight:800, margin:0, color:INK, letterSpacing:-0.3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  phone:       { display:"flex", alignItems:"center", gap:5, fontSize:13, color:MUTE, marginTop:5 },
  closeBtn:    { width:36, height:36, border:`1px solid #e6dcd2`, background:"#fff", color:"#545a67", fontSize:22, lineHeight:1, cursor:"pointer", flexShrink:0, borderRadius:0 },
  searchWrap:  { position:"relative", flex:1, minWidth:120 },
  searchIcon:  { position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:MUTE, display:"inline-flex", pointerEvents:"none" },
  searchIn:    { width:"100%", boxSizing:"border-box", padding:"8px 30px 8px 32px", border:"1px solid #e6dcd2", borderRadius:0, fontSize:13, fontFamily:SANS, background:"#fff", color:INK },
  searchClear: { position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", width:22, height:22, border:"none", background:"transparent", color:MUTE, fontSize:18, lineHeight:1, cursor:"pointer" },
  stats:       { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 },
  stat:        { background:"linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)", border:"1px solid #f0e0d0", padding:"10px 11px" },
  stmtCta:     { width:"100%", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7, padding:"10px 14px", marginBottom:14, border:"none", background:TERRA, color:"#fff", fontFamily:SANS, fontWeight:700, fontSize:13.5, cursor:"pointer", borderRadius:0 },
  paidSection: { marginBottom:10, border:"1px solid #cfe8d8", background:"#f6fbf7" },
  paidHead:    { width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", border:"none", background:"transparent", color:GREEN, fontFamily:SANS, fontWeight:700, fontSize:12.5, cursor:"pointer", letterSpacing:0.3 },
  paidList:    { display:"flex", flexDirection:"column", gap:6, padding:"0 8px 8px" },
  card:        { display:"grid", gridTemplateColumns:"1fr auto", gap:"3px 12px", alignItems:"start", padding:"9px 11px", background:"#fff", border:`1px solid ${LINE}` },
  cardTopRow:  { display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", gridColumn:"1 / -1" },
  cardMeta:    { gridColumn:"1 / -1", fontSize:11.5, color:"#6b7280", lineHeight:1.45, wordBreak:"break-word", marginTop:1 },
  cardActions: { gridColumn:"1 / -1", display:"flex", gap:8, marginTop:2, flexWrap:"wrap", alignItems:"center" },
  invNo:       { border:"none", background:"transparent", padding:0, fontFamily:SANS, fontWeight:800, fontSize:13.5, color:TERRA, cursor:"pointer", textAlign:"left" },
  badge:       { fontSize:10, fontWeight:700, padding:"2px 7px", textTransform:"uppercase", letterSpacing:0.3 },
  actionBtn:   { display:"inline-flex", alignItems:"center", gap:5, padding:"5px 11px", border:"1px solid #e6dcd2", background:"#fff", color:"#545a67", cursor:"pointer", borderRadius:0, fontFamily:"inherit" },
};