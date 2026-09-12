// src/components/income-expense/index.tsx
// ─────────────────────────────────────────────────────────────────────────
// Two screens over one cash book, behind the security PIN.
//
// REGISTER is the day sheet, modelled on the paper/Excel book the studio
// already keeps: pick a date, income left, expense right, each row a name, an
// amount, cash/online — and on both sides what the money was for.
//
// Inside each side, CASH and ONLINE are kept apart with their own running
// subtotal, because the drawer and the bank are counted separately at close.
//
// The add form sits directly under the column header, so a new entry never
// needs a scroll to the bottom of a long day.
//
// LEDGER is the same data read the other way: by person, or as a running
// income/expense statement over a month, a chosen range, or everything.
//
// Categories still live in the database; they're chosen for you here, so a
// payment to a staff member keeps reporting as salary with nothing on screen
// to think about.
//
// The PIN gate on this page is a UI lock only. DELETING an entry asks for the
// PIN separately and the server verifies that one, so a removed money record
// always leaves an audit entry naming who did it.
// ─────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cashbookApi,
  type Entry, type EntryInput, type PayMethod, type TxnKind,
} from "../../services/incomeExpense.api";
import { payeeApi, type Payee } from "../../services/payee.api";
import PinGate, { useCashbookLock } from "./PinGate";
import {
  ACCENT, GOLD, INK, MUTED, FAINT, LINE, LINE_SOFT, WASH, GREEN, RED, BLUE,
  rupeesExact, isoDate, fmtDate, fmtDayLabel, round2, initials, toCsv, downloadCsv,
} from "./types";

/* A phone may ride along on the entry itself (income, where there is no person
 * record) or come from the linked payee (expense). Both are read the same way. */
type EntryRow = Entry & { phone?: string | null };
const phoneOf = (e: EntryRow) => (e.phone || e.payee?.phone || "").trim();

/* ── date helpers ───────────────────────────────────────────────────────── */
const shiftDay = (d: string, by: number) => {
  const x = new Date(`${d}T00:00:00`);
  x.setDate(x.getDate() + by);
  return isoDate(x);
};
const monthStart = (d: string) => `${d.slice(0, 7)}-01`;
const monthEnd = (d: string) => {
  const x = new Date(`${d.slice(0, 7)}-01T00:00:00`);
  x.setMonth(x.getMonth() + 1); x.setDate(0);
  return isoDate(x);
};
const monthName = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

type Tab        = "register" | "ledger";
type LedgerView = "person" | "income" | "expense";
type Span       = "month" | "range" | "all";

const sum = (list: Entry[], m?: PayMethod) =>
  round2(list.filter((e) => !m || e.method === m).reduce((s, e) => s + e.amount, 0));

/* ── page ───────────────────────────────────────────────────────────────── */
export default function IncomeExpense() {
  const { unlocked, unlock, lock } = useCashbookLock();

  const [tab, setTab]   = useState<Tab>("register");
  const [date, setDate] = useState(isoDate());

  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [payees, setPayees]   = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const loadPayees = useCallback(async () => {
    if (!unlocked) return;
    try { setPayees(await payeeApi.list({})); } catch { /* dropdown just stays short */ }
  }, [unlocked]);
  useEffect(() => { loadPayees(); }, [loadPayees]);

  const load = useCallback(async () => {
    if (!unlocked) return;
    setError("");
    try {
      setEntries(await cashbookApi.list({ from: date, to: date }));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Could not load this day.");
    } finally {
      setLoading(false);
    }
  }, [date, unlocked]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const income  = useMemo(() => entries.filter((e) => e.kind === "income"),  [entries]);
  const expense = useMemo(() => entries.filter((e) => e.kind === "expense"), [entries]);

  const inTotal  = sum(income);
  const outTotal = sum(expense);
  const net      = round2(inTotal - outTotal);

  /* Cash and bank are reconciled separately at close, so the day's net is
   * carried through split as well as combined. */
  const cashNet   = round2(sum(income, "cash")   - sum(expense, "cash"));
  const onlineNet = round2(sum(income, "online") - sum(expense, "online"));

  /** Each entry carries its own date, so yesterday's auto fare can be written
   *  up today. When that date isn't the one on screen the register follows it,
   *  otherwise the row would save correctly and then vanish. */
  const addEntry = async (data: EntryInput & { date: string }) => {
    await cashbookApi.create(data);
    if (data.date !== date) setDate(data.date);
    else await load();
  };

  /** Removing an entry erases money from the book, so the PIN is asked for
   *  here and checked again on the server — the page-level unlock isn't
   *  enough. The backend writes an audit row before the delete lands. */
  const removeEntry = async (id: string) => {
    const pin = window.prompt("Enter the security PIN to remove this entry:");
    if (pin === null) return;                    // cancelled
    if (!pin.trim()) { alert("Security PIN is required to remove an entry."); return; }
    try {
      await cashbookApi.remove(id, pin.trim());
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Could not remove that entry.");
    }
  };

  /** A name typed on the expense side becomes a person, so the dropdown grows
   *  on its own and nobody visits a separate screen to pay a new vendor. The
   *  phone typed alongside it becomes that person's identity — two new names
   *  with a blank number would collide on the unique phone. */
  const addPayee = async (name: string, phone: string): Promise<Payee | null> => {
    try {
      const row = await payeeApi.create({ name, phone: phone.trim(), kind: "outsider" });
      await loadPayees();
      return row;
    } catch (err: any) {
      // 409 hands back the person who already owns that number — reuse them.
      const existing = err?.response?.data?.payee as Payee | undefined;
      if (existing?.id) { await loadPayees(); return existing; }
      return null;   // phone required or something else — the entry still saves
    }
  };

  if (!unlocked) return <PinGate onUnlock={unlock} />;

  const isToday = date === isoDate();

  return (
    <div style={st.page}>
      <style>{CSS}</style>

      {/* ── header ── */}
      <div style={st.head}>
        <div style={{ minWidth: 0 }}>
          <h1 style={st.title}>Income &amp; Expense</h1>
          <div style={st.sub}>{tab === "register" ? fmtDayLabel(date) : "Ledger"}</div>
        </div>

        <div style={st.headRight}>
          <div style={st.tabs}>
            {([["register", "Register"], ["ledger", "Ledger"]] as [Tab, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{ ...st.tabBtn, background: tab === id ? ACCENT : "#fff", color: tab === id ? "#fff" : MUTED }}
              >{label}</button>
            ))}
          </div>

          {tab === "register" && (
            <div style={st.dateBar}>
              <button className="ie-nav" style={st.navBtn} onClick={() => setDate(shiftDay(date, -1))} title="Previous day">‹</button>
              <input
                type="date" value={date} max={isoDate()}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                style={st.dateInput}
              />
              <button
                className="ie-nav"
                style={{ ...st.navBtn, opacity: isToday ? 0.3 : 1, cursor: isToday ? "default" : "pointer" }}
                onClick={() => !isToday && setDate(shiftDay(date, 1))}
                disabled={isToday} title="Next day"
              >›</button>
              <button
                className="ie-today"
                style={{ ...st.todayBtn, opacity: isToday ? 0.45 : 1 }}
                onClick={() => setDate(isoDate())} disabled={isToday}
              >Today</button>
            </div>
          )}

          {/* Puts the book away without waiting for the tab to close. */}
          <button className="ie-nav" style={st.lockBtn} onClick={lock} title="Lock this section">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Lock
          </button>
        </div>
      </div>

      {error && <div style={st.error}>{error}</div>}

      {tab === "register" ? (
        <>
          {/* ── the day's totals, read before the detail ── */}
          <div style={st.cards}>
            <Tally label="Total income"  value={inTotal}  color={GREEN} accent="#f2faf5"
                   cash={sum(income, "cash")}  online={sum(income, "online")} />
            <Tally label="Total expense" value={outTotal} color={RED} accent="#fdf3f5"
                   cash={sum(expense, "cash")} online={sum(expense, "online")} />
            <div style={{ ...st.tally, background: net >= 0 ? "#f2faf5" : "#fdf3f5", borderColor: net >= 0 ? "#cfe8d8" : "#f3cfd7" }}>
              <div style={st.tallyLbl}>{net >= 0 ? "In hand today" : "Short by"}</div>
              <div style={{ ...st.tallyVal, color: net >= 0 ? GREEN : RED }}>{rupeesExact(Math.abs(net))}</div>
              {/* Split the same way the money is actually held. */}
              <div style={st.tallySplit}>
                In drawer {rupeesExact(cashNet)} · In bank {rupeesExact(onlineNet)}
              </div>
              <div style={{ ...st.tallySplit, marginTop: 2, color: FAINT }}>
                {entries.length} entr{entries.length === 1 ? "y" : "ies"} today
              </div>
            </div>
          </div>

          <div className="ie-cols" style={st.columns}>
            <Column kind="income"  rows={income}  payees={payees} loading={loading} viewDate={date}
                    onAdd={addEntry} onRemove={removeEntry} onAddPayee={addPayee} />
            <Column kind="expense" rows={expense} payees={payees} loading={loading} viewDate={date}
                    onAdd={addEntry} onRemove={removeEntry} onAddPayee={addPayee} />
          </div>
        </>
      ) : (
        <Ledger anchorDate={date} payees={payees} />
      )}
    </div>
  );
}

/* ── one side of the register ───────────────────────────────────────────── */
function Column({
  kind, rows, payees, loading, viewDate, onAdd, onRemove, onAddPayee,
}: {
  kind: TxnKind;
  rows: EntryRow[];
  payees: Payee[];
  loading: boolean;
  viewDate: string;
  onAdd: (d: EntryInput & { date: string }) => Promise<void>;
  onRemove: (id: string) => void;
  onAddPayee: (name: string, phone: string) => Promise<Payee | null>;
}) {
  const isIn  = kind === "income";
  const tint  = isIn ? GREEN : RED;
  const total = round2(rows.reduce((s, e) => s + e.amount, 0));

  const cashRows   = rows.filter((e) => e.method === "cash");
  const onlineRows = rows.filter((e) => e.method === "online");
  const cashTotal   = round2(cashRows.reduce((s, e) => s + e.amount, 0));
  const onlineTotal = round2(onlineRows.reduce((s, e) => s + e.amount, 0));

  return (
    <section style={{ ...st.col, borderTopColor: tint }}>
      <div style={{ ...st.colHead, background: isIn ? "#f4fbf6" : "#fdf5f7" }}>
        <span style={{ ...st.colDot, background: tint }} />
        <span style={{ ...st.colTitle, color: tint }}>{isIn ? "Income" : "Expense"}</span>
        <span style={st.colCount}>{rows.length}</span>
        <span style={{ ...st.colTotal, color: tint }}>{rupeesExact(total)}</span>
      </div>

      {/* The form sits at the TOP: a long day no longer has to be scrolled
          past before the next entry can be written. */}
      <AddRow kind={kind} payees={payees} viewDate={viewDate} onAdd={onAdd} onAddPayee={onAddPayee} />

      <div className="ie-colbody" style={st.colBody}>
        {loading ? (
          <div style={st.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={st.empty}>
            <div style={{ fontSize: 30, opacity: 0.25, marginBottom: 8 }}>{isIn ? "＋" : "−"}</div>
            Nothing yet — add the first {isIn ? "receipt" : "payment"} above.
          </div>
        ) : (
          <>
            <MethodGroup method="cash"   rows={cashRows}   total={cashTotal}   tint={tint} onRemove={onRemove} />
            <MethodGroup method="online" rows={onlineRows} total={onlineTotal} tint={tint} onRemove={onRemove} />
          </>
        )}
      </div>

      {/* Foot repeats the split, so the two figures are readable without
          scrolling back up through the rows. */}
      {!loading && rows.length > 0 && (
        <div style={st.colFoot}>
          <span style={st.footCell}>
            <span style={{ ...st.footLbl, color: "#7a6f66" }}>Cash</span>
            <span style={{ ...st.footVal, color: tint }}>{rupeesExact(cashTotal)}</span>
          </span>
          <span style={{ ...st.footCell, borderLeft: `1px solid ${LINE}` }}>
            <span style={{ ...st.footLbl, color: BLUE }}>Online</span>
            <span style={{ ...st.footVal, color: tint }}>{rupeesExact(onlineTotal)}</span>
          </span>
          <span style={{ ...st.footCell, borderLeft: `1px solid ${LINE}`, background: "#fff" }}>
            <span style={st.footLbl}>Total</span>
            <span style={{ ...st.footVal, color: tint, fontSize: 15 }}>{rupeesExact(total)}</span>
          </span>
        </div>
      )}
    </section>
  );
}

/* ── cash / online block inside a column ────────────────────────────────── */
function MethodGroup({
  method, rows, total, tint, onRemove,
}: {
  method: PayMethod;
  rows: EntryRow[];
  total: number;
  tint: string;
  onRemove: (id: string) => void;
}) {
  const isCash = method === "cash";
  const label  = isCash ? "Cash" : "Online";
  const accent = isCash ? "#7a6f66" : BLUE;

  return (
    <div>
      {/* Sticky so the heading and its subtotal stay in view while the block
          is scrolled — on a 20-entry day you still know which pile you're in. */}
      <div style={{ ...st.grpHead, background: isCash ? "#f7f4ef" : "#eff5fc", borderLeftColor: accent }}>
        <span style={{ ...st.grpLbl, color: accent }}>{label}</span>
        <span style={st.grpCount}>{rows.length}</span>
        <span style={{ ...st.grpTotal, color: rows.length ? tint : FAINT }}>{rupeesExact(total)}</span>
      </div>

      {rows.length === 0 ? (
        <div style={st.grpEmpty}>No {label.toLowerCase()} entries.</div>
      ) : (
        rows.map((e, i) => {
          const ph = phoneOf(e);
          return (
            <div key={e.id} className="ie-row" style={st.row}>
              <span style={st.rowNo}>{i + 1}</span>
              <span style={{ ...st.avatar, background: e.payee ? (e.payee.kind === "employee" ? ACCENT : GOLD) : LINE_SOFT, color: e.payee ? "#fff" : FAINT }}>
                {e.payee ? initials(e.payee.name) : "·"}
              </span>
              <span style={st.rowMain}>
                <span style={st.rowName}>{e.title || e.payee?.name || "—"}</span>
                {(e.notes || ph) && (
                  <span style={st.rowNote}>
                    {ph && (
                      <a href={`tel:${ph}`} className="ie-tel" style={st.tel} onClick={(ev) => ev.stopPropagation()}>
                        {ph}
                      </a>
                    )}
                    {ph && e.notes ? <span style={{ color: FAINT }}> · </span> : null}
                    {e.notes}
                  </span>
                )}
              </span>
              <span style={{ ...st.rowAmt, color: tint }}>{rupeesExact(e.amount)}</span>
              <button className="ie-del" style={st.del} onClick={() => onRemove(e.id)} title="Remove (needs the security PIN)">×</button>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ── inline add form ────────────────────────────────────────────────────── */
function AddRow({
  kind, payees, viewDate, onAdd, onAddPayee,
}: {
  kind: TxnKind;
  payees: Payee[];
  viewDate: string;
  onAdd: (d: EntryInput & { date: string }) => Promise<void>;
  onAddPayee: (name: string, phone: string) => Promise<Payee | null>;
}) {
  const isIn = kind === "income";

  // Expense names come from the people already in the database; income names
  // are typed, because a counter sale isn't a person on the payroll.
  const [payeeId, setPayeeId] = useState("");
  const [typed,   setTyped]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [purpose, setPurpose] = useState("");
  const [amount,  setAmount]  = useState("");
  const [method,  setMethod]  = useState<PayMethod>("cash");
  const [when,    setWhen]    = useState(viewDate);
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState("");

  // Follow the day being viewed — today when the page opens, and whatever the
  // arrows land on after that. Still free to override for a single entry.
  useEffect(() => { setWhen(viewDate); }, [viewDate]);

  const nameRef  = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const amtRef   = useRef<HTMLInputElement | null>(null);
  const custom   = isIn || payeeId === "__other__";

  const employees = payees.filter((p) => p.kind === "employee");
  const outsiders = payees.filter((p) => p.kind !== "employee");

  // Picking a saved person fills their number in, so it is visible before the
  // entry is written rather than only afterwards on the row.
  useEffect(() => {
    if (isIn) return;
    if (payeeId === "__other__") { setPhone(""); return; }
    const p = payees.find((x) => x.id === payeeId);
    setPhone(p?.phone || "");
  }, [payeeId, payees, isIn]);

  const reset = () => {
    setAmount(""); setTyped(""); setPurpose(""); setPayeeId(""); setPhone("");
  };

  const submit = async () => {
    let picked = payees.find((p) => p.id === payeeId) || null;
    const name = custom ? typed.trim() : (picked?.name || "");
    const n    = Number(amount);

    if (!name)                         { setErr("Enter a name."); return; }
    if (!Number.isFinite(n) || n <= 0) { setErr("Enter an amount."); return; }

    setBusy(true); setErr("");
    try {
      // A brand-new expense name is remembered as a person, with the number
      // typed here as its identity, so it's one tap next time.
      if (!isIn && payeeId === "__other__") picked = await onAddPayee(name, phone);

      await onAdd({
        kind,
        date: when,
        // The picked person drives the category, so staff payments still land
        // under salary without a category selector on screen.
        category: isIn ? "other_income" : (picked?.kind === "employee" ? "salary" : "other"),
        title: name,
        amount: round2(n),
        method,
        payeeId: picked?.id ?? null,
        phone: phone.trim(),
        notes: purpose.trim(),
      } as EntryInput & { date: string });
      reset();
      nameRef.current?.focus();
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Could not save that.");
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") submit(); };
  const backdated = when !== viewDate;

  return (
    <div style={st.addWrap}>
      {/* line 1 — who, their number, how much */}
      <div style={st.addRow}>
        {isIn ? (
          <input
            ref={nameRef} className="ie-in"
            style={{ ...st.in, flex: 1, minWidth: 120 }}
            placeholder="Name"
            value={typed}
            onChange={(e) => { setTyped(e.target.value); setErr(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") phoneRef.current?.focus(); }}
          />
        ) : (
          <select
            className="ie-in"
            style={{ ...st.in, flex: 1, minWidth: 120, cursor: "pointer" }}
            value={payeeId}
            onChange={(e) => { setPayeeId(e.target.value); setErr(""); }}
          >
            <option value="">Choose person…</option>
            {employees.length > 0 && (
              <optgroup label="Employees">
                {employees.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            )}
            {outsiders.length > 0 && (
              <optgroup label="Others">
                {outsiders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            )}
            <option value="__other__">+ New name…</option>
          </select>
        )}

        <input
          ref={phoneRef} className="ie-in"
          style={{ ...st.in, width: 138 }}
          type="tel" inputMode="tel" maxLength={15}
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") amtRef.current?.focus(); }}
          title="Contact number for this entry"
        />

        <input
          ref={amtRef} className="ie-in"
          style={{ ...st.in, width: 108, fontWeight: 800, fontSize: 14.5 }}
          type="number" min="0" inputMode="decimal"
          placeholder="₹ Amount"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setErr(""); }}
          onKeyDown={onKey}
        />
      </div>

      {!isIn && payeeId === "__other__" && (
        <input
          ref={nameRef} className="ie-in"
          style={{ ...st.in, width: "100%", marginTop: 7 }}
          placeholder="Type the new name — it'll be saved with the number above"
          value={typed}
          onChange={(e) => { setTyped(e.target.value); setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") phoneRef.current?.focus(); }}
          autoFocus
        />
      )}

      {/* line 2 — what for, when, how paid */}
      <div style={{ ...st.addRow, marginTop: 7 }}>
        {/* What the money was for — on BOTH sides. A receipt needs explaining
            as much as a payment does: six months on, "Ramesh ₹4,000" means
            nothing without "advance returned" or "banner job" next to it. */}
        <input
          className="ie-in"
          style={{ ...st.in, flex: 1, minWidth: 140 }}
          placeholder={isIn
            ? "Purpose (optional) — counter sale, advance returned…"
            : "Purpose (optional) — flex material, auto fare, tea…"}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          onKeyDown={onKey}
        />

        <input
          className="ie-in"
          style={{ ...st.in, width: 132, ...(backdated ? { borderColor: ACCENT, color: ACCENT, fontWeight: 700 } : {}) }}
          type="date"
          value={when}
          max={isoDate()}
          onChange={(e) => e.target.value && setWhen(e.target.value)}
          title="Date this money moved"
        />

        <div style={st.seg}>
          {(["cash", "online"] as const).map((m, i) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              style={{
                ...st.segBtn,
                borderLeft: i ? `1px solid ${LINE}` : "none",
                background: method === m ? (m === "cash" ? "#6b625a" : BLUE) : "#fff",
                color: method === m ? "#fff" : MUTED,
              }}
            >{m === "cash" ? "Cash" : "Online"}</button>
          ))}
        </div>

        <button
          className="ie-add"
          style={{ ...st.addBtn, background: isIn ? GREEN : RED }}
          onClick={submit} disabled={busy}
        >{busy ? "…" : "Add"}</button>
      </div>

      {backdated && (
        <div style={st.backdated}>Saving to {fmtDate(when)} — the register will jump there.</div>
      )}
      {err && <div style={st.addErr}>{err}</div>}
    </div>
  );
}

/* ── ledger ─────────────────────────────────────────────────────────────── */
function Ledger({ anchorDate, payees }: { anchorDate: string; payees: Payee[] }) {
  const [view, setView] = useState<LedgerView>("expense");
  const [span, setSpan] = useState<Span>("month");
  const [from, setFrom] = useState(monthStart(anchorDate));
  const [to,   setTo]   = useState(isoDate());

  const [rows, setRows]     = useState<EntryRow[]>([]);
  const [loading, setLoad]  = useState(true);
  const [err, setErr]       = useState("");
  const [person, setPerson] = useState("");   // drill-down inside By person

  /** The three spans resolve to one range, so the fetch below stays simple. */
  const range = useMemo(() => {
    if (span === "month") return { from: monthStart(anchorDate), to: monthEnd(anchorDate) };
    if (span === "all")   return { from: "2000-01-01", to: isoDate() };
    return { from, to };
  }, [span, anchorDate, from, to]);

  useEffect(() => {
    let alive = true;
    setLoad(true); setErr("");
    cashbookApi.list({ from: range.from, to: range.to })
      .then((r) => { if (alive) setRows(r); })
      .catch((e: any) => { if (alive) setErr(e?.response?.data?.error || "Could not load the ledger."); })
      .finally(() => { if (alive) setLoad(false); });
    return () => { alive = false; };
  }, [range.from, range.to]);

  const incomeRows  = useMemo(() => rows.filter((e) => e.kind === "income"),  [rows]);
  const expenseRows = useMemo(() => rows.filter((e) => e.kind === "expense"), [rows]);

  /** Oldest first with a running total — the way a passbook reads. */
  const withRunning = (list: EntryRow[]) => {
    const sorted = [...list].sort((a, b) =>
      a.date.localeCompare(b.date) || (a.createdAt || "").localeCompare(b.createdAt || ""));
    let run = 0;
    return sorted.map((e) => { run = round2(run + e.amount); return { ...e, running: run }; });
  };

  const people = useMemo(() => {
    const map = new Map<string, { id: string; name: string; kind: string; phone: string; paid: number; count: number }>();
    for (const e of expenseRows) {
      if (!e.payeeId || !e.payee) continue;
      if (!map.has(e.payeeId)) map.set(e.payeeId, { id: e.payeeId, name: e.payee.name, kind: e.payee.kind, phone: e.payee.phone || "", paid: 0, count: 0 });
      const p = map.get(e.payeeId)!;
      p.paid = round2(p.paid + e.amount); p.count += 1;
    }
    return [...map.values()].sort((a, b) => b.paid - a.paid);
  }, [expenseRows]);

  const personRows = useMemo(
    () => withRunning(expenseRows.filter((e) => e.payeeId === person)),
    [expenseRows, person],
  );
  const selected = payees.find((p) => p.id === person) || null;

  const spanLabel = span === "month" ? monthName(anchorDate)
    : span === "all" ? "All time"
    : `${fmtDate(range.from)} – ${fmtDate(range.to)}`;

  const exportRows = (list: (EntryRow & { running?: number })[], name: string) => {
    const header = ["Date", "Name", "Phone", "Purpose", "Person", "Method", "Amount", "Running total"];
    const body = list.map((e) => [
      fmtDate(e.date.slice(0, 10)), e.title, phoneOf(e), e.notes || "",
      e.payee?.name || "", e.method, e.amount, e.running ?? "",
    ]);
    downloadCsv(`${name}-${range.from}-to-${range.to}.csv`, toCsv([header, ...body]));
  };

  const printRows = (list: (EntryRow & { running?: number })[], heading: string, total: number, tint: string) => {
    const cashTotal   = sum(list, "cash");
    const onlineTotal = sum(list, "online");
    const body = list.map((e) => {
      const ph = phoneOf(e);
      return `
      <tr>
        <td>${fmtDate(e.date.slice(0, 10))}</td>
        <td><b>${e.title}</b>${ph ? `<div class="n">${ph}</div>` : ""}${e.notes ? `<div class="n">${e.notes}</div>` : ""}</td>
        <td><span class="m">${e.method === "cash" ? "Cash" : "Online"}</span></td>
        <td class="amt">${rupeesExact(e.amount)}</td>
        <td class="run">${rupeesExact(e.running || 0)}</td>
      </tr>`;
    }).join("");
    const w = window.open("", "_blank", "width=860,height=720");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${heading}</title><style>
      *{box-sizing:border-box} body{margin:0;font-family:'DM Sans',system-ui,Arial,sans-serif;color:#2a231d;background:#fff;padding:30px}
      .wrap{max-width:760px;margin:0 auto}
      .head{background:#fdf2ee;border:1px solid #f0d2c8;padding:18px 22px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
      .brand{font-size:19px;font-weight:800}.brand small{display:block;font-size:11.5px;font-weight:600;color:#8a8378;margin-top:2px}
      .title{text-align:right}.title h1{margin:0;font-size:19px;font-weight:900;letter-spacing:1px;color:${tint};text-transform:uppercase}
      .title .per{font-size:11.5px;color:#8a8378;margin-top:4px}
      table{width:100%;border-collapse:collapse;font-size:12.5px}
      thead th{background:${tint};color:#fff;text-align:left;padding:9px 11px;font-size:10.5px;letter-spacing:.5px;text-transform:uppercase}
      thead th:last-child,thead th:nth-last-child(2){text-align:right}
      tbody td{padding:8px 11px;border-bottom:1px solid #f1ece3;vertical-align:top}
      tbody tr:nth-child(even){background:#faf8f3}
      .n{font-size:11px;color:#8a8378;margin-top:2px}
      td.amt{color:${tint};font-weight:800;text-align:right;white-space:nowrap}
      td.run{font-weight:700;text-align:right;white-space:nowrap}
      .m{background:#f1ece3;color:#7a6f66;padding:1px 7px;font-size:10.5px;font-weight:700}
      tfoot td{padding:11px;border-top:1px solid #e8e0d4;font-weight:700;font-size:12.5px}
      tfoot tr.grand td{border-top:2px solid ${tint};font-weight:900;font-size:14px}
      tfoot .lbl{color:#8a8378;text-transform:uppercase;font-size:11px;letter-spacing:.5px;font-weight:700}
      tfoot .tot{text-align:right;color:${tint}}
      .foot{margin-top:20px;font-size:10.5px;color:#b3ab9f;text-align:center}
      @media print{body{padding:0}}
    </style></head><body><div class="wrap">
      <div class="head">
        <div class="brand">Abhijit Art<small>Printing &amp; Design</small></div>
        <div class="title"><h1>${heading}</h1><div class="per">${spanLabel}</div></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Name, phone &amp; purpose</th><th>Method</th><th>Amount</th><th>Running</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot>
          <tr><td class="lbl" colspan="3">Cash</td><td class="tot" colspan="2">${rupeesExact(cashTotal)}</td></tr>
          <tr><td class="lbl" colspan="3">Online</td><td class="tot" colspan="2">${rupeesExact(onlineTotal)}</td></tr>
          <tr class="grand"><td class="lbl" colspan="3">Total · ${list.length} ${list.length === 1 ? "entry" : "entries"}</td><td class="tot" colspan="2">${rupeesExact(total)}</td></tr>
        </tfoot>
      </table>
      <div class="foot">Generated ${fmtDate(isoDate())} · Abhijit Art</div>
    </div><script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* ── controls ── */}
      <div style={st.ledgerBar}>
        <div style={st.tabs}>
          {([["expense", "Expense"], ["income", "Income"], ["person", "By person"]] as [LedgerView, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setView(id); setPerson(""); }}
              style={{ ...st.tabBtn, background: view === id ? INK : "#fff", color: view === id ? "#fff" : MUTED }}
            >{label}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginLeft: "auto" }}>
          <div style={st.tabs}>
            {([["month", monthName(anchorDate).split(" ")[0]], ["range", "Range"], ["all", "All time"]] as [Span, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setSpan(id)}
                style={{ ...st.tabBtn, fontSize: 12.5, padding: "8px 14px", background: span === id ? "#6b625a" : "#fff", color: span === id ? "#fff" : MUTED }}
              >{label}</button>
            ))}
          </div>
          {span === "range" && (
            <>
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={st.dateInput} />
              <span style={{ color: FAINT, fontSize: 12 }}>to</span>
              <input type="date" value={to} min={from} max={isoDate()} onChange={(e) => setTo(e.target.value)} style={st.dateInput} />
            </>
          )}
        </div>
      </div>

      {err && <div style={st.error}>{err}</div>}

      {loading ? (
        <div style={{ ...st.panel, padding: 60, textAlign: "center", color: FAINT }}>Loading…</div>
      ) : view === "person" ? (
        person && selected ? (
          <LedgerTable
            heading={selected.name}
            sub={`${selected.phone || "No phone"} · ${selected.kind} · ${spanLabel}`}
            rows={personRows}
            tint={RED}
            onBack={() => setPerson("")}
            onExport={() => exportRows(personRows, `ledger-${selected.name}`)}
            onPrint={() => printRows(personRows, `${selected.name} — Statement`, sum(personRows), RED)}
          />
        ) : (
          <div style={st.panel}>
            <div style={st.panelHead}>
              <span style={st.panelTitle}>People paid · {spanLabel}</span>
              <span style={{ ...st.panelTotal, color: RED, marginLeft: "auto" }}>{rupeesExact(sum(expenseRows))}</span>
            </div>
            <div className="ie-colbody" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {people.length === 0 ? (
                <div style={st.empty}>No person-linked expenses in this period.</div>
              ) : people.map((p) => (
                <div key={p.id} className="ie-row" style={{ ...st.row, cursor: "pointer" }} onClick={() => setPerson(p.id)}>
                  <span style={{ ...st.avatar, width: 32, height: 32, fontSize: 11, background: p.kind === "employee" ? ACCENT : GOLD }}>
                    {initials(p.name)}
                  </span>
                  <span style={st.rowMain}>
                    <span style={{ ...st.rowName, fontSize: 14 }}>{p.name}</span>
                    <span style={st.rowNote}>
                      {p.phone ? `${p.phone} · ` : ""}{p.count} {p.count === 1 ? "entry" : "entries"}
                    </span>
                  </span>
                  <span style={{ ...st.rowAmt, color: RED }}>{rupeesExact(p.paid)}</span>
                  <span style={{ color: FAINT, fontSize: 13, width: 16, textAlign: "right" }}>›</span>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        <LedgerTable
          heading={view === "income" ? "Income ledger" : "Expense ledger"}
          sub={spanLabel}
          rows={withRunning(view === "income" ? incomeRows : expenseRows)}
          tint={view === "income" ? GREEN : RED}
          onExport={() => exportRows(withRunning(view === "income" ? incomeRows : expenseRows), `${view}-ledger`)}
          onPrint={() => {
            const list = withRunning(view === "income" ? incomeRows : expenseRows);
            printRows(list, view === "income" ? "Income Statement" : "Expense Statement", sum(list), view === "income" ? GREEN : RED);
          }}
        />
      )}
    </div>
  );
}

function LedgerTable({
  heading, sub, rows, tint, onBack, onExport, onPrint,
}: {
  heading: string; sub: string;
  rows: (EntryRow & { running: number })[];
  tint: string;
  onBack?: () => void;
  onExport: () => void;
  onPrint: () => void;
}) {
  const total       = round2(rows.reduce((s, e) => s + e.amount, 0));
  const cashTotal   = sum(rows, "cash");
  const onlineTotal = sum(rows, "online");

  return (
    <div style={st.panel}>
      <div style={st.panelHead}>
        {onBack && <button className="ie-nav" style={{ ...st.navBtn, width: 30, height: 30, fontSize: 15 }} onClick={onBack}>‹</button>}
        <div style={{ minWidth: 0 }}>
          <div style={st.panelTitle}>{heading}</div>
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{sub} · {rows.length} {rows.length === 1 ? "entry" : "entries"}</div>
        </div>

        {/* The split is carried into the ledger too, so a month reads the same
            way a day does. */}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={st.splitPill}>
            <span style={{ ...st.splitLbl, color: "#7a6f66" }}>Cash</span>
            <span style={{ ...st.splitVal, color: tint }}>{rupeesExact(cashTotal)}</span>
          </span>
          <span style={st.splitPill}>
            <span style={{ ...st.splitLbl, color: BLUE }}>Online</span>
            <span style={{ ...st.splitVal, color: tint }}>{rupeesExact(onlineTotal)}</span>
          </span>
          <span style={{ ...st.panelTotal, color: tint }}>{rupeesExact(total)}</span>
        </span>

        <button className="ie-ghost" style={st.ghostBtn} onClick={onExport} disabled={!rows.length}>CSV</button>
        <button className="ie-ghost" style={{ ...st.ghostBtn, background: INK, color: "#fff", borderColor: INK }} onClick={onPrint} disabled={!rows.length}>Print</button>
      </div>

      <div className="ie-colbody" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {rows.length === 0 ? (
          <div style={st.empty}>Nothing in this period.</div>
        ) : (
          <table style={st.table}>
            <thead>
              <tr>
                <th style={st.th}>Date</th>
                <th style={st.th}>Name, phone &amp; purpose</th>
                <th style={st.th}>Method</th>
                <th style={{ ...st.th, textAlign: "right" }}>Amount</th>
                <th style={{ ...st.th, textAlign: "right" }}>Running</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const ph = phoneOf(e);
                return (
                  <tr key={e.id} className="ie-trow">
                    <td style={{ ...st.td, whiteSpace: "nowrap", color: MUTED }}>{fmtDate(e.date.slice(0, 10))}</td>
                    <td style={st.td}>
                      <div style={{ fontWeight: 700 }}>{e.title}</div>
                      {ph && (
                        <div style={{ fontSize: 11.5, marginTop: 2 }}>
                          <a href={`tel:${ph}`} className="ie-tel" style={st.tel}>{ph}</a>
                        </div>
                      )}
                      {e.notes && <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{e.notes}</div>}
                    </td>
                    <td style={st.td}>
                      <span style={{ ...st.chip, ...(e.method === "cash" ? st.chipCash : st.chipOnline) }}>
                        {e.method === "cash" ? "Cash" : "Online"}
                      </span>
                    </td>
                    <td style={{ ...st.td, textAlign: "right", fontWeight: 800, color: tint, whiteSpace: "nowrap" }}>{rupeesExact(e.amount)}</td>
                    <td style={{ ...st.td, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{rupeesExact(e.running)}</td>
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

/* ── totals card ────────────────────────────────────────────────────────── */
function Tally({ label, value, color, accent, cash, online }: {
  label: string; value: number; color: string; accent: string; cash: number; online: number;
}) {
  return (
    <div style={{ ...st.tally, background: accent, borderColor: `${color}22` }}>
      <div style={st.tallyLbl}>{label}</div>
      <div style={{ ...st.tallyVal, color }}>{rupeesExact(value)}</div>
      {/* Two figures on their own line each — the split is read as often as
          the total, so it isn't squeezed into small print. */}
      <div style={st.tallyRow}>
        <span style={{ ...st.tallyPill, background: "#fff" }}>
          <span style={{ ...st.tallyPillLbl, color: "#7a6f66" }}>Cash</span>
          <span style={{ ...st.tallyPillVal, color }}>{rupeesExact(cash)}</span>
        </span>
        <span style={{ ...st.tallyPill, background: "#fff" }}>
          <span style={{ ...st.tallyPillLbl, color: BLUE }}>Online</span>
          <span style={{ ...st.tallyPillVal, color }}>{rupeesExact(online)}</span>
        </span>
      </div>
    </div>
  );
}

/* ── styles ─────────────────────────────────────────────────────────────── */
const CSS = `
  .ie-row:hover{background:${WASH};}
  .ie-row .ie-del{opacity:0;transition:opacity .15s;}
  .ie-row:hover .ie-del{opacity:1;}
  .ie-del:hover{color:${RED} !important;background:#fdeaee;}
  .ie-nav:hover:not(:disabled){border-color:${ACCENT}66;color:${ACCENT};}
  .ie-today:hover:not(:disabled){background:${ACCENT};color:#fff;border-color:${ACCENT};}
  .ie-add:hover:not(:disabled){filter:brightness(1.1);}
  .ie-add:disabled{opacity:.6;cursor:default;}
  .ie-ghost:hover:not(:disabled){filter:brightness(.96);}
  .ie-ghost:disabled{opacity:.45;cursor:not-allowed;}
  .ie-in:focus{outline:none;border-color:${ACCENT};box-shadow:0 0 0 3px ${ACCENT}1f;}
  .ie-trow:hover td{background:${WASH};}
  .ie-tel{color:${BLUE};text-decoration:none;}
  .ie-tel:hover{text-decoration:underline;}
  .ie-colbody::-webkit-scrollbar{width:8px;}
  .ie-colbody::-webkit-scrollbar-thumb{background:${LINE};border-radius:8px;}
  @media (max-width: 900px){ .ie-cols{grid-template-columns:1fr !important;} }
`;

const st: Record<string, React.CSSProperties> = {
  page:      { padding: "18px 26px 26px", color: INK, display: "flex", flexDirection: "column", minHeight: "calc(100vh - 74px)" },
  head:      { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 16 },
  title:     { fontSize: 23, fontWeight: 800, margin: 0, letterSpacing: -0.4 },
  sub:       { fontSize: 13.5, color: MUTED, marginTop: 4, fontWeight: 600 },
  headRight: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },

  tabs:      { display: "flex", border: `1px solid ${LINE}`, overflow: "hidden", flexShrink: 0 },
  tabBtn:    { padding: "9px 18px", border: "none", borderRight: `1px solid ${LINE}`, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" },

  dateBar:   { display: "flex", alignItems: "center", gap: 6 },
  navBtn:    { width: 34, height: 36, border: `1px solid ${LINE}`, background: "#fff", color: MUTED, fontSize: 19, lineHeight: 1, cursor: "pointer", transition: "all .15s", flexShrink: 0 },
  dateInput: { padding: "8px 11px", border: `1px solid ${LINE}`, background: "#fff", fontSize: 13, fontFamily: "inherit", color: INK, colorScheme: "light" },
  todayBtn:  { padding: "9px 15px", border: `1px solid ${LINE}`, background: "#fff", color: ACCENT, fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", transition: "all .15s" },
  lockBtn:   { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", border: `1px solid ${LINE}`, background: "#fff", color: MUTED, fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", transition: "all .15s" },
  error:     { padding: "10px 14px", marginBottom: 14, background: "#fdecea", border: "1px solid #f3cfc2", fontSize: 13, color: "#8a2f16" },

  cards:     { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 16 },
  tally:     { background: "#fff", border: `1px solid ${LINE}`, padding: "13px 16px" },
  tallyLbl:  { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: MUTED, marginBottom: 5 },
  tallyVal:  { fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums", letterSpacing: -0.5 },
  tallySplit:{ fontSize: 11.5, color: MUTED, marginTop: 5 },
  tallyRow:  { display: "flex", gap: 8, marginTop: 9, flexWrap: "wrap" },
  tallyPill: { display: "inline-flex", alignItems: "baseline", gap: 6, padding: "4px 9px", border: `1px solid ${LINE}` },
  tallyPillLbl: { fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" },
  tallyPillVal: { fontSize: 12.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" },

  columns:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, flex: 1, minHeight: 0 },
  col:       { background: "#fff", border: `1px solid ${LINE}`, borderTop: "3px solid", display: "flex", flexDirection: "column", minHeight: 0, boxShadow: "0 1px 3px rgba(42,35,29,.05)" },
  colHead:   { display: "flex", alignItems: "center", gap: 9, padding: "12px 16px", borderBottom: `1px solid ${LINE_SOFT}` },
  colDot:    { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  colTitle:  { fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" },
  colCount:  { fontSize: 11, fontWeight: 700, color: MUTED, background: "#fff", border: `1px solid ${LINE}`, padding: "1px 7px", borderRadius: 20 },
  colTotal:  { marginLeft: "auto", fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums" },
  colBody:   { flex: 1, minHeight: 190, overflowY: "auto" },
  colFoot:   { display: "flex", borderTop: `1px solid ${LINE}`, background: WASH },
  footCell:  { flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "9px 14px", minWidth: 0 },
  footLbl:   { fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: MUTED },
  footVal:   { fontSize: 13.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" },
  empty:     { padding: "48px 16px", textAlign: "center", color: FAINT, fontSize: 13 },

  grpHead:   { position: "sticky", top: 0, zIndex: 1, display: "flex", alignItems: "center", gap: 8, padding: "7px 16px 7px 13px", borderTop: `1px solid ${LINE_SOFT}`, borderBottom: `1px solid ${LINE_SOFT}`, borderLeft: "3px solid" },
  grpLbl:    { fontSize: 10.5, fontWeight: 800, letterSpacing: 0.9, textTransform: "uppercase" },
  grpCount:  { fontSize: 10.5, fontWeight: 700, color: MUTED, background: "#fff", border: `1px solid ${LINE}`, padding: "0 6px", borderRadius: 20 },
  grpTotal:  { marginLeft: "auto", fontSize: 13.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" },
  grpEmpty:  { padding: "10px 16px", fontSize: 12, color: FAINT },

  row:       { display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: `1px solid ${LINE_SOFT}`, transition: "background .12s" },
  rowNo:     { fontSize: 11.5, color: FAINT, width: 16, flexShrink: 0, fontVariantNumeric: "tabular-nums", textAlign: "right" },
  avatar:    { width: 26, height: 26, borderRadius: "50%", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 },
  rowMain:   { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 },
  rowName:   { fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowNote:   { fontSize: 11.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  tel:       { fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  chip:      { fontSize: 10, fontWeight: 700, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 0.3, flexShrink: 0, borderRadius: 3 },
  chipCash:  { background: "#f1ece3", color: "#7a6f66" },
  chipOnline:{ background: "#e6eff9", color: BLUE },
  rowAmt:    { fontSize: 14.5, fontWeight: 800, fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: 78, textAlign: "right" },
  del:       { width: 24, height: 24, border: "none", background: "transparent", color: FAINT, fontSize: 18, lineHeight: 1, cursor: "pointer", flexShrink: 0, padding: 0, borderRadius: 4, transition: "all .12s" },

  addWrap:   { padding: "12px 16px", borderBottom: `1px solid ${LINE}`, background: WASH },
  addRow:    { display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" },
  in:        { boxSizing: "border-box", padding: "9px 11px", border: `1px solid ${LINE}`, background: "#fff", fontSize: 13, fontFamily: "inherit", color: INK, colorScheme: "light", transition: "border-color .15s, box-shadow .15s" },
  seg:       { display: "flex", border: `1px solid ${LINE}`, flexShrink: 0 },
  segBtn:    { padding: "9px 13px", border: "none", fontSize: 11.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" },
  addBtn:    { padding: "9px 20px", border: "none", color: "#fff", fontSize: 13, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", flexShrink: 0, transition: "filter .15s" },
  addErr:    { fontSize: 12, color: RED, marginTop: 7, fontWeight: 600 },
  backdated: { fontSize: 11.5, color: ACCENT, marginTop: 7, fontWeight: 600 },

  ledgerBar: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 },
  panel:     { background: "#fff", border: `1px solid ${LINE}`, display: "flex", flexDirection: "column", flex: 1, minHeight: 0, boxShadow: "0 1px 3px rgba(42,35,29,.05)" },
  panelHead: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${LINE_SOFT}`, background: WASH, flexWrap: "wrap" },
  panelTitle:{ fontSize: 14.5, fontWeight: 800 },
  panelTotal:{ fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums" },
  splitPill: { display: "inline-flex", alignItems: "baseline", gap: 6 },
  splitLbl:  { fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" },
  splitVal:  { fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums" },
  ghostBtn:  { padding: "7px 15px", border: `1px solid ${LINE}`, background: "#fff", color: MUTED, fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", transition: "filter .15s" },

  table:     { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:        { position: "sticky", top: 0, background: "#fdf0e7", color: "#7a5240", padding: "9px 14px", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, textAlign: "left", borderBottom: `1px solid ${LINE}` },
  td:        { padding: "10px 14px", borderBottom: `1px solid ${LINE_SOFT}`, transition: "background .12s" },
};