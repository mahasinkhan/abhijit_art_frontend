// src/components/invoices/CustomerDrawer.tsx
import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import { CustomerRow, Invoice, INK, MUTE, TERRA, GREEN, LINE, SANS, num, round2, rupee as makeRupee, fmt, fmtTime, STATUS_META, sharedSt } from "./types";
import Icon from "./Icon";

const rupee = makeRupee;

interface Props {
  row:          CustomerRow;
  onClose:      () => void;
  onPrint:      (inv: Invoice) => void;
  onEdit:       (inv: Invoice) => void;
  onPreview:    (inv: Invoice) => void;
  onStatement:  (key: string) => void;
  /** called after a payment is recorded/removed so the parent list refreshes */
  onChanged?:   () => void;
}

type LedgerInvoice = {
  id: string; invoiceNo: string; date: string; createdAt: string;
  total: number; legacyPaid: number; allocated: number; settled: number;
  due: number; status: "paid" | "partial" | "unpaid";
};

type PaymentRow = {
  id: string; amount: number; method: "cash" | "online";
  note: string; paidAt: string; createdAt: string;
};

type Ledger = {
  billed: number; paid: number; balance: number; advance: number;
  invoices: LedgerInvoice[]; payments: PaymentRow[];
};

const withFormat = (inv: Invoice, format: "full" | "half"): Invoice => ({
  ...inv,
  business: { ...((inv.business || {}) as any), format },
});

const savedFormat = (inv: Invoice): "half" | "full" =>
  ((inv.business || {}) as any).format === "full" ? "full" : "half";

const today = () => new Date().toISOString().slice(0, 10);

export default function CustomerDrawer({ row, onClose, onPrint, onEdit, onPreview, onStatement, onChanged }: Props) {
  const [q, setQ]               = useState("");
  const [paidOpen, setPaidOpen] = useState(false);
  const [payOpen, setPayOpen]   = useState(false);
  const [histOpen, setHistOpen] = useState(false);

  const [ledger, setLedger]   = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState("");

  // payment form
  const [amt, setAmt]       = useState("");
  const [method, setMethod] = useState<"cash" | "online">("cash");
  const [note, setNote]     = useState("");
  const [date, setDate]     = useState(today);
  const [pin, setPin]       = useState("");
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  /** the customer record these invoices belong to */
  const customerId = useMemo(
    () => (row.invoices.find(i => (i as any).customerId) as any)?.customerId as string | undefined,
    [row.invoices],
  );

  const loadLedger = () => {
    if (!customerId) { setLoading(false); return; }
    setLoading(true); setErr("");
    api.get(`/api/customer-payments/${customerId}/ledger`)
      .then(r => setLedger(r.data))
      .catch(e => {
        console.error("[drawer] ledger load failed", e);
        setErr(e?.response?.data?.error || "Couldn't load this account.");
      })
      .finally(() => setLoading(false));
  };
  useEffect(loadLedger, [customerId]);

  const savePayment = async () => {
    const n = Number(amt);
    if (!Number.isFinite(n) || n <= 0) { setFormErr("Enter an amount greater than zero."); return; }
    if (!pin.trim())                   { setFormErr("Enter the security PIN to record this payment."); return; }
    setSaving(true); setFormErr("");
    try {
      await api.post("/api/customer-payments", {
        customerId, amount: n, method, note: note.trim(), paidAt: date, pin: pin.trim(),
      });
      setAmt(""); setNote(""); setPin(""); setPayOpen(false);
      loadLedger();
      onChanged?.();
    } catch (e: any) {
      setFormErr(e?.response?.data?.error || "Couldn't record this payment.");
    } finally { setSaving(false); }
  };

  const removePayment = async (id: string) => {
    // deleting a payment moves money → confirm the security PIN, same as
    // invoice delete/cancel. The backend rejects the request without it.
    const enteredPin = window.prompt("Enter the security PIN to remove this payment:");
    if (enteredPin === null) return;          // cancelled
    if (!enteredPin.trim()) { alert("Security PIN is required to remove a payment."); return; }
    try {
      await api.delete(`/api/customer-payments/${id}`, { data: { pin: enteredPin.trim() } });
      loadLedger();
      onChanged?.();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Couldn't remove this payment.");
    }
  };

  // ledger drives the numbers when it's available; row is the fallback
  const billed  = ledger ? ledger.billed  : row.billed;
  const paid    = ledger ? ledger.paid    : row.paid;
  const balance = ledger ? ledger.balance : row.due;
  const advance = ledger?.advance || 0;

  const dueOf = (inv: Invoice) => {
    const l = ledger?.invoices.find(x => x.id === inv.id);
    if (l) return l.due;
    return round2(Math.max(num(inv.total) - num(inv.paidAmount), 0));
  };

  const filtered = q.trim()
    ? row.invoices.filter(inv => inv.invoiceNo.toLowerCase().includes(q.toLowerCase()))
    : row.invoices;

  const isPaid     = (inv: Invoice) => dueOf(inv) <= 0.005;
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
            { label:"Total Billed", val:rupee(billed), color:INK   },
            { label:"Paid",         val:rupee(paid),   color:GREEN },
            { label:"Balance Due",  val:balance>0?rupee(balance):"✓ Cleared", color:balance>0?TERRA:GREEN },
          ].map(s => (
            <div key={s.label} style={st.stat}>
              <div style={st.statLbl}>{s.label}</div>
              <div style={{ fontSize:15.5, fontWeight:800, fontVariantNumeric:"tabular-nums", color:s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        {advance > 0.005 && (
          <div style={st.advance}>
            Advance in hand: <b>{rupee(advance)}</b> — will settle the next bill automatically.
          </div>
        )}

        {/* Actions */}
        <div style={st.ctaRow}>
          <button style={st.payCta} onClick={() => { setPayOpen(v => !v); setFormErr(""); }} disabled={!customerId}>
            <Icon name="banknote" size={15}/> {payOpen ? "Cancel" : "Record Payment"}
          </button>
          <button style={st.histCta} onClick={() => setHistOpen(true)} disabled={!ledger?.payments.length}>
            <Icon name="search" size={15}/> Payment History{ledger?.payments.length ? ` · ${ledger.payments.length}` : ""}
          </button>
          <button style={st.stmtCta} onClick={() => onStatement(row.key)}>
            <Icon name="csv" size={15}/> Statement
          </button>
        </div>

        {!customerId && (
          <div style={st.warn}>
            These invoices aren't linked to a customer record yet, so account payments are unavailable. Add the customer in <b>Customers</b> and re-save one invoice to link them.
          </div>
        )}
        {err && <div style={st.warn}>{err}</div>}

        {/* Payment form */}
        {payOpen && customerId && (
          <div style={st.payBox}>
            <div style={st.payRow}>
              <input style={{ ...st.in, width:130, fontWeight:800, fontSize:15, color:GREEN }} type="number" min="0"
                placeholder="Amount" value={amt} autoFocus
                onChange={e => setAmt(e.target.value)}
                onKeyDown={e => e.key === "Enter" && savePayment()}/>
              <div style={{ display:"flex", border:`1px solid ${LINE}` }}>
                {(["cash","online"] as const).map((m, i) => (
                  <button key={m} onClick={() => setMethod(m)}
                    style={{ padding:"9px 16px", border:"none", borderLeft: i ? `1px solid ${LINE}` : "none",
                             background: method===m ? (m==="cash"?GREEN:"#1a56db") : "#fff",
                             color: method===m ? "#fff" : MUTE,
                             fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                    {m === "cash" ? "Cash" : "Online"}
                  </button>
                ))}
              </div>
              <input style={{ ...st.in, width:140 }} type="date" value={date} onChange={e => setDate(e.target.value)}/>
              <input style={{ ...st.in, flex:1, minWidth:130 }} placeholder="Note (optional)" value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => e.key === "Enter" && savePayment()}/>
                            <input
                style={{ ...st.in, width:120, letterSpacing:2, WebkitTextSecurity:"disc" as any }}
                inputMode="numeric" name="acct-pin" autoComplete="off" autoCorrect="off"
                autoCapitalize="off" spellCheck={false} data-lpignore="true" data-1p-ignore="true"
                placeholder="PIN" value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && savePayment()}/>
              <button style={st.saveBtn} onClick={savePayment} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            {formErr && <div style={{ fontSize:12, color:TERRA, marginTop:7 }}>{formErr}</div>}
            <div style={{ fontSize:11, color:MUTE, marginTop:8 }}>
              Goes against the account, not one bill. Oldest invoice settles first. Security PIN required.
            </div>
          </div>
        )}

        {/* Outstanding count */}
        <div style={st.sectionLbl}>
          {loading ? "Loading…" : `${activeInvs.length}${q ? ` of ${row.invoices.length}` : ""} outstanding invoice${activeInvs.length!==1?"s":""}`}
        </div>

        {/* Paid section (collapsible) */}
        {paidInvs.length > 0 && (
          <div style={st.paidSection}>
            <button style={st.paidHead} onClick={() => setPaidOpen(v => !v)}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:7 }}>
                <Icon name="lock" size={13}/> Settled · {paidInvs.length}
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
              ? <div style={{ padding:"18px", textAlign:"center", color:GREEN, fontSize:13, fontWeight:600 }}>✓ Every invoice is settled.</div>
              : activeInvs.map(inv => (
                  <ActiveCard key={inv.id} inv={inv} due={dueOf(inv)} onPrint={onPrint} onEdit={onEdit} onPreview={onPreview}/>
                ))
          }
        </div>

        {histOpen && ledger && (
          <PaymentHistory
            name={row.name}
            payments={ledger.payments}
            paid={paid}
            billed={billed}
            balance={balance}
            onRemove={removePayment}
            onClose={() => setHistOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── Payment history modal ─────────────────────────────────────────────────
function PaymentHistory({
  name, payments, paid, billed, balance, onRemove, onClose,
}: {
  name: string;
  payments: PaymentRow[];
  paid: number; billed: number; balance: number;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
    const stamp = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  // oldest first so the running total reads like a passbook
  const rows = [...payments].reverse();
  let run = 0;
  const withRunning = rows.map(p => {
    run = Math.round((run + p.amount) * 100) / 100;
    return { ...p, running: run };
  }).reverse();

  const cash   = payments.filter(p => p.method === "cash").reduce((s, p) => s + p.amount, 0);
  const online = payments.filter(p => p.method === "online").reduce((s, p) => s + p.amount, 0);

  return (
    <div style={sharedSt.backdrop} onClick={onClose}>
      <div style={hst.modal} onClick={e => e.stopPropagation()}>
        <div style={hst.head}>
          <div>
            <div style={hst.title}>Payment History</div>
            <div style={hst.sub}>{name} · {payments.length} payment{payments.length !== 1 ? "s" : ""}</div>
          </div>
          <button style={hst.close} onClick={onClose}>×</button>
        </div>

        <div style={hst.summary}>
          {[
            { l: "Billed",   v: rupee(billed),  c: INK },
            { l: "Received", v: rupee(paid),    c: GREEN },
                        balance > 0.005
              ? { l: "Balance Due", v: rupee(balance), c: TERRA }
              : paid - billed > 0.005
                ? { l: "Advance", v: rupee(paid - billed), c: "#1a56db" }
                : { l: "Balance", v: "✓ Cleared", c: GREEN },
            { l: "Cash",     v: rupee(cash),    c: "#545a67" },
            { l: "Online",   v: rupee(online),  c: "#1a56db" },
          ].map(s => (
            <div key={s.l}>
              <div style={hst.sumLbl}>{s.l}</div>
              <div style={{ fontSize:14, fontWeight:800, color:s.c, fontVariantNumeric:"tabular-nums" }}>{s.v}</div>
            </div>
          ))}
        </div>

        <div style={hst.tblWrap}>
          <table style={hst.tbl}>
            <thead>
              <tr>
                {["Date & time", "Method", "Note", "Amount", "Running total", ""].map((h, i) => (
                  <th key={h + i} style={{ ...hst.th, textAlign: i >= 3 && i < 5 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withRunning.map(p => (
                <tr key={p.id}>
                  <td style={hst.td}>{stamp(p.paidAt)}</td>
                  <td style={hst.td}><span style={hst.method}>{p.method === "cash" ? "Cash" : "Online"}</span></td>
                  <td style={{ ...hst.td, color:"#6b7280", fontStyle: p.note ? "normal" : "italic" }}>{p.note || "—"}</td>
                  <td style={{ ...hst.td, textAlign:"right", fontWeight:800, color:GREEN, fontVariantNumeric:"tabular-nums" }}>{rupee(p.amount)}</td>
                  <td style={{ ...hst.td, textAlign:"right", fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{rupee(p.running)}</td>
                  <td style={{ ...hst.td, textAlign:"right" }}>
                    <button style={hst.del} onClick={() => onRemove(p.id)} title="Remove this payment">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={hst.foot}>
          Removing a payment asks for the security PIN, then re-settles every invoice automatically.
        </div>
      </div>
    </div>
  );
}

const hst: Record<string, React.CSSProperties> = {
  modal:   { width:"min(860px,100%)", maxHeight:"calc(100vh - 60px)", background:"#fff", boxShadow:"0 30px 80px rgba(24,22,28,.34)", display:"flex", flexDirection:"column", overflow:"hidden" },
  head:    { display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, padding:"16px 20px", borderBottom:`1px solid ${LINE}` },
  title:   { fontSize:16, fontWeight:800, color:INK },
  sub:     { fontSize:12.5, color:MUTE, marginTop:3 },
  close:   { width:32, height:32, border:`1px solid #e6dcd2`, background:"#fff", color:"#545a67", fontSize:20, lineHeight:1, cursor:"pointer", flexShrink:0 },
  summary: { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, padding:"13px 20px", borderBottom:`1px solid ${LINE}`, background:"#fffcf9" },
  sumLbl:  { fontSize:10, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", color:"#9ca3af", marginBottom:4 },
  tblWrap: { flex:1, overflowY:"auto", padding:"0 20px" },
  tbl:     { width:"100%", borderCollapse:"collapse", fontSize:13 },
  th:      { position:"sticky", top:0, background:"#fdf0e7", color:"#7a5240", padding:"9px 10px", fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:.4, borderBottom:`1px solid ${LINE}` },
  td:      { padding:"10px", borderBottom:"1px solid #f6ece4", color:INK },
  method:  { fontSize:10.5, fontWeight:700, padding:"2px 8px", background:"#f1ece3", color:"#7a6f66", textTransform:"uppercase", letterSpacing:.3 },
  del:     { width:24, height:24, border:"none", background:"transparent", color:"#b3ab9f", fontSize:19, lineHeight:1, cursor:"pointer" },
  foot:    { padding:"11px 20px", borderTop:`1px solid ${LINE}`, fontSize:11.5, color:MUTE, background:"#fffcf9" },
};

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
  inv, due, onPrint, onEdit, onPreview,
}: {
  inv:       Invoice;
  due:       number;
  onPrint:   (i:Invoice) => void;
  onEdit:    (i:Invoice) => void;
  onPreview: (i:Invoice) => void;
}) {
  const total = num(inv.total);
  const partial = due > 0.005 && due < total - 0.005;
  const m = partial ? STATUS_META["partial"] : STATUS_META["unpaid"];

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
          <div style={{ fontSize:11, color:TERRA, fontWeight:700 }}>Due {rupee(due)}</div>
        </div>
      </div>
      <div style={st.cardMeta}>
        {fmt(inv.date)} · {fmtTime(inv.createdAt)} — {(inv.items||[]).map(it=>`${it.qty}× ${it.desc}`).join(", ")||"—"}
      </div>
      <div style={st.cardActions}>
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
          <Icon name="lock" size={10}/> SETTLED
        </span>
        <FormatBadge format={savedFormat(inv)}/>
        <div style={{ marginLeft:"auto", textAlign:"right" }}>
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
  drawer:      { width:"min(1200px,100%)", maxHeight:"calc(100vh - 40px)", background:"#fffdfb", boxShadow:"0 30px 80px rgba(24,22,28,.34)", display:"flex", flexDirection:"column", overflowY:"auto", overscrollBehavior:"contain", padding:"14px 24px" },
  head:        { display:"flex", alignItems:"center", gap:10, marginBottom:12 },
  name:        { fontSize:17, fontWeight:800, margin:0, color:INK, letterSpacing:-0.3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  phone:       { display:"flex", alignItems:"center", gap:5, fontSize:13, color:MUTE, marginTop:5 },
  closeBtn:    { width:36, height:36, border:`1px solid #e6dcd2`, background:"#fff", color:"#545a67", fontSize:22, lineHeight:1, cursor:"pointer", flexShrink:0, borderRadius:0 },
  searchWrap:  { position:"relative", flex:1, minWidth:120 },
  searchIcon:  { position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:MUTE, display:"inline-flex", pointerEvents:"none" },
  searchIn:    { width:"100%", boxSizing:"border-box", padding:"8px 30px 8px 32px", border:"1px solid #e6dcd2", borderRadius:0, fontSize:13, fontFamily:SANS, background:"#fff", color:INK },
  searchClear: { position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", width:22, height:22, border:"none", background:"transparent", color:MUTE, fontSize:18, lineHeight:1, cursor:"pointer" },
  stats:       { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 },
  stat:        { background:"linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%)", border:"1px solid #f0e0d0", padding:"10px 11px" },
  statLbl:     { fontSize:11, fontWeight:700, letterSpacing:0.4, textTransform:"uppercase", color:"#9ca3af", marginBottom:5 },
  advance:     { padding:"8px 12px", marginBottom:12, background:"#eafaf0", border:"1px solid #bfe3cd", fontSize:12.5, color:"#15733f" },
  warn:        { padding:"9px 13px", marginBottom:12, background:"#fdecea", border:"1px solid #f3cfc2", fontSize:12.5, color:"#8a2f16", lineHeight:1.5 },
  ctaRow:      { display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" },
  payCta:      { flex:"1 1 220px", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7, padding:"10px 14px", border:"none", background:GREEN, color:"#fff", fontFamily:SANS, fontWeight:700, fontSize:13.5, cursor:"pointer", borderRadius:0 },
  histCta:     { flex:"1 1 200px", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7, padding:"10px 14px", border:`1px solid ${LINE}`, background:"#fff", color:INK, fontFamily:SANS, fontWeight:700, fontSize:13.5, cursor:"pointer", borderRadius:0 },
  stmtCta:     { flex:"1 1 200px", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7, padding:"10px 14px", border:"none", background:TERRA, color:"#fff", fontFamily:SANS, fontWeight:700, fontSize:13.5, cursor:"pointer", borderRadius:0 },
  payBox:      { padding:"13px 14px", marginBottom:14, background:"#f6fbf7", border:"1px solid #cfe8d8" },
  payRow:      { display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" },
  in:          { boxSizing:"border-box", padding:"9px 12px", border:`1px solid ${LINE}`, borderRadius:0, fontSize:13, fontFamily:SANS, background:"#fff", color:INK },
  saveBtn:     { padding:"9px 24px", border:"none", background:GREEN, color:"#fff", fontFamily:SANS, fontWeight:700, fontSize:13.5, cursor:"pointer", borderRadius:0 },
  payList:     { marginBottom:14, border:`1px solid ${LINE}`, background:"#fff", padding:"10px 12px" },
  payItem:     { display:"flex", alignItems:"center", gap:12, padding:"7px 0", borderBottom:"1px solid #f6ece4", flexWrap:"wrap" },
  moreBtn:     { marginTop:8, border:"none", background:"transparent", color:TERRA, fontFamily:SANS, fontWeight:700, fontSize:12.5, cursor:"pointer", padding:0 },
  method:      { fontSize:10.5, fontWeight:700, padding:"2px 8px", background:"#f1ece3", color:"#7a6f66", textTransform:"uppercase", letterSpacing:0.3 },
  delBtn:      { marginLeft:"auto", width:24, height:24, border:"none", background:"transparent", color:"#b3ab9f", fontSize:19, lineHeight:1, cursor:"pointer" },
  sectionLbl:  { fontSize:10.5, fontWeight:700, letterSpacing:0.6, textTransform:"uppercase", color:"#9ca3af", marginBottom:8 },
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