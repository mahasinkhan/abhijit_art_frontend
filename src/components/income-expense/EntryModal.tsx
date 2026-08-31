// src/components/income-expense/EntryModal.tsx
import { useEffect, useRef, useState } from "react";
import type { Entry, EntryInput, PayMethod, TxnCategory, TxnKind } from "../../services/incomeExpense.api";
import { CATEGORY_META, catsFor, NEEDS_PAYEE } from "../../services/incomeExpense.api";
import type { Payee, PayeeKind } from "../../services/payee.api";
import { PayeePicker } from "./PayeePicker";
import { isoDate, rupees, KIND_META, RED, MUTED, LINE, INK, FAINT } from "./types";

interface Props {
  editing:          Entry | null;
  startKind?:       TxnKind;            // ignored — tracker is expense-only, kept for caller compat
  defaultCategory?: TxnCategory;        // preselect a category (Salary / Outside quick buttons)
  payees:           Payee[];
  saving:           boolean;
  error:            string;
  defaultPayeeId?:  string;
  onCreatePayee:    (data: { name: string; phone: string; kind: PayeeKind; role?: string }) => Promise<Payee>;
  onSyncEmployees?: () => void;
  syncing?:         boolean;
  onSave:           (data: EntryInput) => void;
  onClose:          () => void;
}

export function EntryModal({
  editing, defaultCategory, payees, saving, error, defaultPayeeId,
  onCreatePayee, onSyncEmployees, syncing, onSave, onClose,
}: Props) {
  const [date,     setDate]     = useState(editing ? editing.date.slice(0,10) : isoDate());
  const [category, setCategory] = useState<TxnCategory>(editing?.category || defaultCategory || "" as TxnCategory);
  const [title,    setTitle]    = useState(editing?.title || "");
  const [amount,   setAmount]   = useState(editing ? String(editing.amount) : "");
  const [method,   setMethod]   = useState<PayMethod>(editing?.method || "cash");
  const [notes,    setNotes]    = useState(editing?.notes || "");
  const [payeeId,  setPayeeId]  = useState(editing?.payeeId || defaultPayeeId || "");

  const amtRef = useRef<HTMLInputElement>(null);
  useEffect(() => { amtRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const km            = KIND_META.expense;
  const amt           = Number(amount);
  const validAmount   = Number.isFinite(amt) && amt > 0;
  const payeeRequired = NEEDS_PAYEE.includes(category);
  const canSave       = !!title.trim() && validAmount && (!payeeRequired || !!payeeId);

  const sortedPayees = [...payees].sort((a, b) => a.name.localeCompare(b.name));

  function submit() {
    if (!canSave || saving) return;
    onSave({
      kind: "expense", date,
      category: (category || "other") as TxnCategory,
      title:    title.trim(),
      amount:   Math.round(amt * 100) / 100,
      method,
      payeeId:  payeeId || null,
      notes:    notes.trim(),
    });
  }

  return (
    <div className="ie-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"#fff", width:"100%", maxWidth:940, borderRadius:6,
        position:"relative", display:"flex", flexDirection:"column",
        maxHeight:"calc(100vh - 48px)", overflow:"hidden",
        boxShadow:"0 8px 40px rgba(0,0,0,.18)",
        fontFamily:"'DM Sans',system-ui,sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding:"16px 20px 14px", borderBottom:`1px solid ${LINE}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:11 }}>
            <span style={{ width:34, height:34, borderRadius:8, background:"#fdeaee", color:RED, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, lineHeight:1 }}>−</span>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:INK }}>{editing ? "Edit expense" : "Add expense"}</div>
              <div style={{ fontSize:12, color:MUTED }}>Money going out</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:MUTED, lineHeight:1 }}>×</button>
        </div>

        {/* Body — two column grid */}
        <div style={{ padding:"20px", overflowY:"auto", display:"grid", gridTemplateColumns:"1fr 340px", gap:20, alignItems:"start" }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {error && (
              <div style={{ background:"#fef2ee", border:`1px solid #f0d2c8`, color:"#b23c1c", padding:"10px 14px", fontSize:13, borderRadius:4 }}>{error}</div>
            )}

            {/* Amount */}
            <div style={{ textAlign:"center", padding:"8px 0" }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.8, color:MUTED, marginBottom:10 }}>Amount *</div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <span style={{ fontSize:30, fontWeight:900, color:MUTED }}>₹</span>
                <input
                  ref={amtRef}
                  type="number" min="1" step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submit()}
                  placeholder="0"
                  style={{
                    border:"none", borderBottom:`3px solid ${RED}`,
                    outline:"none", fontSize:38, fontWeight:900,
                    color:RED, width:200,
                    textAlign:"center", fontFamily:"inherit", background:"transparent",
                  }}
                />
              </div>
            </div>

            {/* Cash / Online */}
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              {(["cash","online"] as PayMethod[]).map(m => (
                <button key={m} onClick={() => setMethod(m)} style={{
                  padding:"9px 28px", fontFamily:"inherit", fontSize:13, fontWeight:700,
                  cursor:"pointer", borderRadius:4, transition:"all .15s",
                  border:`2px solid ${method===m?RED:LINE}`,
                  background:method===m?"#fdeaee":"#fff",
                  color:method===m?RED:MUTED,
                }}>
                  {m === "cash" ? "💵 Cash" : "📱 Online"}
                </button>
              ))}
            </div>

            {/* What Purpose */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.8, color:MUTED, marginBottom:6 }}>What Purpose? *</div>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                placeholder="e.g. lunch, auto fare, salary, flex printing"
                style={{ width:"100%", padding:"10px 14px", border:`1px solid ${LINE}`, fontSize:14, fontFamily:"inherit", color:INK, outline:"none", boxSizing:"border-box" as const }}
              />
            </div>

            {/* Category pills */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.8, color:MUTED, marginBottom:8 }}>
                Category <span style={{ fontWeight:400, textTransform:"none" as const, letterSpacing:0, color:FAINT }}>— tap to select</span>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {catsFor("expense").map(c => {
                  const meta = CATEGORY_META[c];
                  const on   = category === c;
                  return (
                    <button key={c} onClick={() => setCategory(on ? "" as TxnCategory : c)} style={{
                      padding:"7px 14px", fontFamily:"inherit", fontSize:13, fontWeight:700,
                      cursor:"pointer", borderRadius:20, transition:"all .15s",
                      border:`2px solid ${on?meta.color:LINE}`,
                      background:on?`${meta.color}18`:"#fff",
                      color:on?meta.color:MUTED,
                      display:"flex", alignItems:"center", gap:5,
                    }}>
                      <span style={{ width:7, height:7, borderRadius:"50%", background:on?meta.color:MUTED, flexShrink:0, display:"inline-block" }}/>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              {category && CATEGORY_META[category]?.hint && (
                <div style={{ fontSize:12, color:FAINT, marginTop:6, fontStyle:"italic" }}>{CATEGORY_META[category].hint}</div>
              )}
            </div>

            {/* Date + Note */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.8, color:MUTED, marginBottom:6 }}>Date</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ width:"100%", padding:"9px 12px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK, outline:"none", boxSizing:"border-box" as const }} />
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.8, color:MUTED, marginBottom:6 }}>Note</div>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional"
                  onKeyDown={e => e.key === "Enter" && submit()}
                  style={{ width:"100%", padding:"9px 12px", border:`1px solid ${LINE}`, fontSize:13, fontFamily:"inherit", color:INK, outline:"none", boxSizing:"border-box" as const }} />
              </div>
            </div>

            {/* Save button */}
            <button onClick={submit} disabled={!canSave || saving} style={{
              width:"100%", padding:"14px", border:"none", borderRadius:4,
              background: canSave?RED:"#e7e1d7",
              color: canSave?"#fff":"#a8a49c",
              fontFamily:"inherit", fontSize:16, fontWeight:800,
              cursor: canSave?"pointer":"not-allowed", transition:"all .15s",
            }}>
              {saving ? "Saving…" : editing ? "Save changes" : `Save ${km.sign}${validAmount?rupees(amt):""}`}
            </button>

            {!canSave && !saving && (
              <div style={{ textAlign:"center", fontSize:13, color:FAINT }}>
                {!validAmount ? "Enter an amount." : !title.trim() ? "Write what it was for." : "Pick the person."}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN — Person picker ── */}
          <div style={{ borderLeft:`1px solid ${LINE}`, paddingLeft:20 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:.8, color:MUTED, marginBottom:8 }}>
              Paid to
              {payeeRequired
                ? <span style={{ color:RED, marginLeft:4 }}>*</span>
                : <span style={{ fontWeight:400, textTransform:"none" as const, letterSpacing:0, color:FAINT, marginLeft:4 }}>— optional</span>
              }
            </div>
            <PayeePicker
              payees={sortedPayees}
              value={payeeId}
              onChange={setPayeeId}
              onCreate={onCreatePayee}
              onSync={onSyncEmployees}
              syncing={syncing}
              allowNobody={!payeeRequired}
            />
          </div>

        </div>
      </div>
    </div>
  );
}