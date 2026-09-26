// src/components/income-expense/index.tsx
// ─────────────────────────────────────────────────────────────────────────
// Two screens over one cash book, behind the security PIN.
//
// REGISTER is the day sheet, modelled on the paper/Excel book the studio
// already keeps: pick a date, income left, expense right, each row a name, an
// amount, cash/online — and on both sides what the money was for. Every entry
// stands on its own line and is never rolled up with another.
//
// Inside each side, CASH and ONLINE are kept apart with their own running
// subtotal, because the drawer and the bank are counted separately at close.
//
// The add form sits directly under the column header, so a new entry never
// needs a scroll to the bottom of a long day.
//
// The person is CHOSEN BY TYPING, not by hunting: the list of names outgrew
// the browser's own drop-down long ago, and a wheel is a poor way to find one
// name among forty. PersonPicker opens a box you type into — a name or a
// number — and the keyboard does the rest.
//
// A new name is saved as a person by NAME — the number is optional, because
// at the counter a name is always written down and a number often never is.
//
// EDITING opens a proper dialog rather than turning the row into a strip of
// tiny inputs: a correction is worth seeing in full — what it was, what it is
// becoming — before it is saved. It asks for the security PIN, as removing an
// entry does, because changing a figure carries the same weight. The server
// checks the PIN and records the change field by field, so Activity shows who
// changed what, from what, to what.
//
// Every date goes through DateField, which shows DD/MM/YYYY on every machine.
// A native date input follows the browser's own locale, so the same page read
// 16/09 here and 09/16 on the client's computer — on a screen full of money
// that ambiguity is a real hazard.
//
// LEDGER is the same data read the other way: by person, or as a running
// income/expense statement over a month, a chosen range, or everything. One
// search box narrows it — a name, a number or a word from the purpose — and
// the totals, the CSV and the print all follow what is on screen.
// ─────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  cashbookApi,
  type Entry, type EntryInput, type PayMethod, type TxnKind,
} from "../../services/incomeExpense.api";
import { payeeApi, type Payee, type PayeeKind } from "../../services/payee.api";
import PinGate, { useCashbookLock } from "./PinGate";
import DateField from "./DateField";
import {
  ACCENT, GOLD, INK, MUTED, FAINT, LINE, LINE_SOFT, WASH, GREEN, RED, BLUE,
  rupeesExact, isoDate, fmtDate, fmtDayLabel, round2, initials, toCsv, downloadCsv,
} from "./types";

/* A phone may ride along on the entry itself (a walk-in with no person
 * record) or come from the linked payee. Both are read the same way. */
type EntryRow = Entry & { phone?: string | null };
const phoneOf = (e: EntryRow) => (e.phone || e.payee?.phone || "").trim();

/** What came back from trying to save a person: the row, or why it failed. */
type PayeeResult = { payee: Payee } | { error: string };

/** The value the person field carries while a brand-new name is being typed. */
const NEW_PERSON = "__other__";

/* ── icons ──────────────────────────────────────────────────────────────── */
const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

const SearchIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
  </svg>
);

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
  const [editing, setEditing] = useState<EntryRow | null>(null);

  const loadPayees = useCallback(async () => {
    if (!unlocked) return;
    try { setPayees(await payeeApi.list({})); } catch { /* the picker just stays short */ }
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

  /** A correction moves money on the books, so it carries the PIN the same way
   *  a removal does — the server checks it. It can also land on another day,
   *  in which case the register follows it there rather than letting the fix
   *  look like a disappearance. */
  const saveEdit = async (id: string, patch: Partial<EntryInput>, newDate: string, pin: string) => {
    await cashbookApi.update(id, patch, pin);
    setEditing(null);
    if (newDate !== date) setDate(newDate);
    else { await load(); await loadPayees(); }
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

  /**
   * A name typed here becomes a person, so the list grows on its own and
   * nobody visits a separate screen to pay a new vendor.
   *
   * The NAME is the identity, so the number can be left blank — and a name
   * already on file comes back from the server as a 409 carrying that record,
   * which is reused rather than treated as a failure. Anything else is a real
   * error and is returned for the form to show: silently dropping it is what
   * used to leave new names out of the list with nothing to explain it.
   */
  const addPayee = async (name: string, phone: string, kind: PayeeKind): Promise<PayeeResult> => {
    try {
      const row = await payeeApi.create({ name, phone: phone.trim(), kind });
      await loadPayees();
      return { payee: row };
    } catch (err: any) {
      const existing = err?.response?.data?.payee as Payee | undefined;
      if (existing?.id) { await loadPayees(); return { payee: existing }; }
      return { error: err?.response?.data?.error || "Could not save that name." };
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
              <DateField value={date} max={isoDate()} onChange={setDate} width={150} title="Jump to a day" />
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
                    onAdd={addEntry} onRemove={removeEntry} onAddPayee={addPayee} onEdit={setEditing} />
            <Column kind="expense" rows={expense} payees={payees} loading={loading} viewDate={date}
                    onAdd={addEntry} onRemove={removeEntry} onAddPayee={addPayee} onEdit={setEditing} />
          </div>
        </>
      ) : (
        <Ledger anchorDate={date} payees={payees} onEdit={setEditing} />
      )}

      {editing && (
        <EditModal
          entry={editing}
          payees={payees}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
          onAddPayee={addPayee}
        />
      )}
    </div>
  );
}

/* ── searchable person picker ────────────────────────────────────────────────
   The studio's list of names passed forty a while ago, and a native <select>
   offers nothing but a wheel to get down it — SARUK SK sat below the fold on
   both columns. This opens the same list under a box you type into: a name, or
   a phone number by its digits, with arrows to move, Enter to take and Escape
   to back out. Nothing is hidden that the old list showed — employees still
   come first, others after — only the hunting is gone.

   The "+ New name…" row carries whatever was typed into the new-name panel, so
   a name that isn't on file yet is one keystroke away from being one.         */
function PersonPicker({
  value, onChange, payees, placeholder = "Choose person…", noneLabel, tone = "expense", style,
}: {
  value: string;
  /** the picked id ("" = nobody, NEW_PERSON = a new name), plus what was typed */
  onChange: (id: string, typed: string) => void;
  payees: Payee[];
  placeholder?: string;
  /** when given, a row at the top that clears the person */
  noneLabel?: string;
  tone?: TxnKind;
  style?: React.CSSProperties;
}) {
  const [open, setOpen]     = useState(false);
  const [q, setQ]           = useState("");
  const [active, setActive] = useState(0);

  const wrapRef  = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef  = useRef<HTMLDivElement | null>(null);

  const tint = tone === "income" ? GREEN : RED;

  const selected = payees.find((p) => p.id === value) || null;
  const isNew    = value === NEW_PERSON;

  /* A name matches on any part of it, so "sk" finds MINTU SK; a number matches
   * on digits alone, so 8609339511 is found by "8609" or "8609 33". */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return payees;
    const digits = term.replace(/\D/g, "");
    const words  = term.split(/\s+/).filter(Boolean);
    return payees.filter((p) => {
      const name = (p.name || "").toLowerCase();
      if (words.every((w) => name.includes(w))) return true;
      if (digits && (p.phone || "").replace(/\D/g, "").includes(digits)) return true;
      return false;
    });
  }, [payees, q]);

  const employees = useMemo(() => filtered.filter((p) => p.kind === "employee"), [filtered]);
  const outsiders = useMemo(() => filtered.filter((p) => p.kind !== "employee"), [filtered]);

  type Item = { key: string; row: "none" | "payee" | "new"; payee?: Payee; group?: string };
  const items = useMemo<Item[]>(() => {
    const list: Item[] = [];
    if (noneLabel && !q.trim()) list.push({ key: "__none__", row: "none" });
    employees.forEach((p, i) => list.push({ key: p.id, row: "payee", payee: p, group: i === 0 ? "Employees" : undefined }));
    outsiders.forEach((p, i) => list.push({ key: p.id, row: "payee", payee: p, group: i === 0 ? "Others" : undefined }));
    list.push({ key: NEW_PERSON, row: "new" });
    return list;
  }, [employees, outsiders, noneLabel, q]);

  /* Close when the click lands anywhere else on the page. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* Opening starts from a clean search with the cursor already in it. */
  useEffect(() => {
    if (!open) return;
    setQ(""); setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => { setActive(0); }, [q]);

  /* Keep the highlighted row inside the visible strip while arrowing. */
  useLayoutEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.querySelector<HTMLElement>(`[data-i="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const take = (i: number) => {
    const it = items[i];
    if (!it) return;
    if (it.row === "none")      onChange("", "");
    else if (it.row === "new")  onChange(NEW_PERSON, q.trim());
    else                        onChange(it.payee!.id, "");
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") { e.preventDefault(); setOpen(true); }
      return;
    }
    const last = items.length - 1;
    if (e.key === "ArrowDown")      { e.preventDefault(); setActive((i) => (i >= last ? 0 : i + 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setActive((i) => (i <= 0 ? last : i - 1)); }
    else if (e.key === "Enter")     { e.preventDefault(); take(active); }
    else if (e.key === "Escape")    { e.preventDefault(); setOpen(false); }
    else if (e.key === "Tab")       { setOpen(false); }
  };

  const label = isNew ? "+ New name…" : selected ? selected.name : placeholder;
  const muted = !isNew && !selected;

  return (
    <div ref={wrapRef} style={{ position: "relative", ...style }}>
      <button
        type="button"
        className="ie-in ie-picker"
        style={{ ...st.in, ...pk.trigger, borderColor: open ? ACCENT : LINE, color: muted ? FAINT : INK }}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={selected?.phone ? `${selected.name} · ${selected.phone}` : label}
      >
        <span style={pk.triggerText}>{label}</span>
        <span style={{ color: FAINT, fontSize: 10, flexShrink: 0 }}>▼</span>
      </button>

      {open && (
        <div style={pk.pop}>
          <div style={pk.searchWrap}>
            <span style={pk.searchIcon}><SearchIcon size={13} /></span>
            <input
              ref={inputRef}
              className="ie-in"
              style={pk.searchIn}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="Type a name or number…"
            />
          </div>

          <div ref={listRef} className="ie-colbody" style={pk.list} role="listbox">
            {items.map((it, i) => {
              const on = i === active;

              if (it.row === "none") {
                return (
                  <button
                    key={it.key} type="button" data-i={i} role="option" aria-selected={!value}
                    onMouseEnter={() => setActive(i)} onClick={() => take(i)}
                    style={{ ...pk.opt, background: on ? WASH : "transparent", color: MUTED, fontStyle: "italic" }}
                  >{noneLabel}</button>
                );
              }

              if (it.row === "new") {
                return (
                  <div key={it.key}>
                    <div style={pk.sep} />
                    <button
                      type="button" data-i={i} role="option" aria-selected={isNew}
                      onMouseEnter={() => setActive(i)} onClick={() => take(i)}
                      style={{ ...pk.opt, background: on ? WASH : "transparent", color: tint, fontWeight: 700 }}
                    >+ {q.trim() ? `Add “${q.trim()}”` : "New name…"}</button>
                  </div>
                );
              }

              const p = it.payee!;
              return (
                <div key={it.key}>
                  {it.group && <div style={pk.group}>{it.group}</div>}
                  <button
                    type="button" data-i={i} role="option" aria-selected={p.id === value}
                    onMouseEnter={() => setActive(i)} onClick={() => take(i)}
                    style={{ ...pk.opt, background: on ? WASH : p.id === value ? "#fdf6ef" : "transparent", display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span style={{ ...st.avatar, width: 22, height: 22, fontSize: 9, background: p.kind === "employee" ? ACCENT : GOLD }}>
                      {initials(p.name)}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: p.id === value ? 700 : 500 }}>
                      {p.name}
                    </span>
                    {p.phone && <span style={pk.optPhone}>{p.phone}</span>}
                  </button>
                </div>
              );
            })}

            {employees.length === 0 && outsiders.length === 0 && q.trim() && (
              <div style={pk.none}>Nobody on file matches “{q.trim()}”.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── one side of the register ───────────────────────────────────────────── */
function Column({
  kind, rows, payees, loading, viewDate, onAdd, onRemove, onAddPayee, onEdit,
}: {
  kind: TxnKind;
  rows: EntryRow[];
  payees: Payee[];
  loading: boolean;
  viewDate: string;
  onAdd: (d: EntryInput & { date: string }) => Promise<void>;
  onRemove: (id: string) => void;
  onAddPayee: (name: string, phone: string, kind: PayeeKind) => Promise<PayeeResult>;
  onEdit: (e: EntryRow) => void;
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
            <MethodGroup method="cash"   rows={cashRows}   total={cashTotal}   tint={tint} onRemove={onRemove} onEdit={onEdit} />
            <MethodGroup method="online" rows={onlineRows} total={onlineTotal} tint={tint} onRemove={onRemove} onEdit={onEdit} />
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
  method, rows, total, tint, onRemove, onEdit,
}: {
  method: PayMethod;
  rows: EntryRow[];
  total: number;
  tint: string;
  onRemove: (id: string) => void;
  onEdit: (e: EntryRow) => void;
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

              {/* Two matched buttons in one slot. A correction and a removal
                  are different enough that neither should be the one you hit
                  by accident, so each gets its own bordered target. */}
              <span style={st.rowActs}>
                <button
                  type="button"
                  className="ie-act ie-edit"
                  style={st.act}
                  onClick={() => onEdit(e)}
                  title="Edit this entry"
                  aria-label="Edit entry"
                ><PencilIcon /></button>
                <button
                  type="button"
                  className="ie-act ie-del"
                  style={st.act}
                  onClick={() => onRemove(e.id)}
                  title="Remove — needs the security PIN"
                  aria-label="Remove entry"
                ><TrashIcon /></button>
              </span>
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
  onAddPayee: (name: string, phone: string, kind: PayeeKind) => Promise<PayeeResult>;
}) {
  const isIn = kind === "income";

  const [payeeId,   setPayeeId]   = useState("");
  const [typed,     setTyped]     = useState("");
  const [newKind,   setNewKind]   = useState<PayeeKind>("outsider");
  const [phone,     setPhone]     = useState("");
  const [purpose,   setPurpose]   = useState("");
  const [amount,    setAmount]    = useState("");
  const [method,    setMethod]    = useState<PayMethod>("cash");
  const [when,      setWhen]      = useState(viewDate);
  const [busy,      setBusy]      = useState(false);
  const [err,       setErr]       = useState("");

  // Follow the day being viewed — today when the page opens, and whatever the
  // arrows land on after that. Still free to override for a single entry.
  useEffect(() => { setWhen(viewDate); }, [viewDate]);

  const nameRef  = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const amtRef   = useRef<HTMLInputElement | null>(null);

  const isNew = payeeId === NEW_PERSON;

  // Picking a saved person fills their number in, so it is visible before the
  // entry is written rather than only afterwards on the row.
  useEffect(() => {
    if (isNew) { setPhone(""); return; }
    const p = payees.find((x) => x.id === payeeId);
    setPhone(p?.phone || "");
  }, [payeeId, payees, isNew]);

  const reset = () => {
    setAmount(""); setTyped(""); setPurpose(""); setPayeeId(""); setPhone("");
    setNewKind("outsider");
  };

  const submit = async () => {
    let picked = payees.find((p) => p.id === payeeId) || null;
    const name = isNew ? typed.trim() : (picked?.name || "");
    const n    = Number(amount);

    if (!name)                         { setErr("Choose a person, or pick “+ New name…”."); return; }
    if (!Number.isFinite(n) || n <= 0) { setErr("Enter an amount."); return; }

    setBusy(true); setErr("");
    try {
      // A brand-new name is remembered as a person — staff or outside, as
      // chosen. The number is optional; leaving it blank is normal.
      if (isNew) {
        const r = await onAddPayee(name, phone, newKind);
        if ("error" in r) { setErr(r.error); setBusy(false); return; }
        picked = r.payee;
      }

      await onAdd({
        kind,
        date: when,
        // The person drives the category, so staff payments still report as
        // salary with no category selector on screen.
        category: isIn
          ? (picked?.kind === "employee" ? "loan_back" : "other_income")
          : (picked?.kind === "employee" ? "salary"    : "other"),
        title: name,
        amount: round2(n),
        method,
        payeeId: picked?.id ?? null,
        phone: phone.trim(),
        notes: purpose.trim(),
      } as EntryInput & { date: string });
      reset();
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
        {/* Both sides pick from the SAME list of people, so a customer who
            pays at the counter and is later paid for a job shows one history.
            Typing narrows it; nothing here has to be scrolled to. */}
        <PersonPicker
          value={payeeId}
          payees={payees}
          tone={kind}
          style={{ flex: 1, minWidth: 130 }}
          onChange={(id, q) => {
            setPayeeId(id);
            if (id === NEW_PERSON) setTyped(q);   // carry the search into the new-name box
            setErr("");
          }}
        />

        <input
          ref={phoneRef} className="ie-in"
          style={{ ...st.in, width: 138 }}
          type="tel" inputMode="tel" maxLength={15}
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") amtRef.current?.focus(); }}
          title="Contact number — leave it blank if you don't have one"
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

      {/* A new name needs two things from you: the name, and which list it
          belongs in. The number stays optional. */}
      {isNew && (
        <div style={st.newWrap}>
          <input
            ref={nameRef} className="ie-in"
            style={{ ...st.in, flex: 1, minWidth: 160 }}
            placeholder="New name — the number above is optional"
            value={typed}
            onChange={(e) => { setTyped(e.target.value); setErr(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") amtRef.current?.focus(); }}
            autoFocus
          />
          <div style={st.segInline}>
            {([["employee", "Employee"], ["outsider", "Other person"]] as [PayeeKind, string][]).map(([k, label], i) => (
              <button
                key={k}
                type="button"
                onClick={() => setNewKind(k)}
                style={{
                  ...st.segBtn,
                  borderLeft: i ? `1px solid ${LINE}` : "none",
                  background: newKind === k ? (k === "employee" ? ACCENT : GOLD) : "#fff",
                  color: newKind === k ? "#fff" : MUTED,
                }}
              >{label}</button>
            ))}
          </div>
        </div>
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

        <DateField
          value={when}
          max={isoDate()}
          onChange={setWhen}
          highlight={backdated}
          width={146}
          title="Date this money moved"
        />

        <div style={st.segInline}>
          {(["cash", "online"] as const).map((m, i) => (
            <button
              key={m}
              type="button"
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
          type="button"
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

/* ── edit dialog ────────────────────────────────────────────────────────────
   A correction gets a proper form rather than a row turned into tiny inputs:
   every field of the entry is visible at once, the original is shown at the
   top for comparison, and Save is only offered once something has actually
   changed. The direction can be switched too — an amount written on the wrong
   side is one of the commonest mistakes in a two-column book.

   The PIN field appears only once there IS a change, and deliberately does NOT
   take focus: it materialises on the first keystroke of an edit, so grabbing
   the cursor would tear it out of the field being typed in.

   Two small defences against the browser's password manager, which otherwise
   reads a password box next to a text box as a login form and offers to
   remember the studio's security PIN under whatever was last typed — the
   purpose of an expense, in one case. The field is marked as a one-time code,
   and a decoy username sits above it out of sight for the manager to latch
   onto instead. Neither is decoration: without them the prompt appears on
   every single edit. */
function EditModal({
  entry, payees, onClose, onSave, onAddPayee,
}: {
  entry: EntryRow;
  payees: Payee[];
  onClose: () => void;
  onSave: (id: string, patch: Partial<EntryInput>, newDate: string, pin: string) => Promise<void>;
  onAddPayee: (name: string, phone: string, kind: PayeeKind) => Promise<PayeeResult>;
}) {
  const [kind,    setKind]    = useState<TxnKind>(entry.kind);
  const [payeeId, setPayeeId] = useState(entry.payeeId || "");
  const [typed,   setTyped]   = useState(entry.payeeId ? "" : entry.title);
  const [newKind, setNewKind] = useState<PayeeKind>("outsider");
  const [phone,   setPhone]   = useState(phoneOf(entry));
  const [purpose, setPurpose] = useState(entry.notes || "");
  const [amount,  setAmount]  = useState(String(entry.amount));
  const [method,  setMethod]  = useState<PayMethod>(entry.method);
  const [when,    setWhen]    = useState(entry.date.slice(0, 10));
  const [pin,     setPin]     = useState("");
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState("");

  const isNew = payeeId === NEW_PERSON;

  // Escape closes, as it does in every dialog the studio already uses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Switching to a saved person adopts their number, so the field shows what
  // will actually be stored rather than the previous person's.
  useEffect(() => {
    if (isNew) return;
    if (!payeeId) return;
    const p = payees.find((x) => x.id === payeeId);
    if (p) setPhone(p.phone || "");
  }, [payeeId, payees, isNew]);

  const current = payees.find((p) => p.id === payeeId) || null;
  const name = isNew ? typed.trim() : (current?.name || typed.trim());
  const n    = Number(amount);

  const dirty =
    kind !== entry.kind ||
    (payeeId || null) !== (entry.payeeId || null) ||
    name !== entry.title ||
    phone.trim() !== phoneOf(entry) ||
    purpose.trim() !== (entry.notes || "") ||
    round2(n) !== entry.amount ||
    method !== entry.method ||
    when !== entry.date.slice(0, 10);

  const save = async () => {
    if (!name)                         { setErr("A name is needed."); return; }
    if (!Number.isFinite(n) || n <= 0) { setErr("Enter an amount greater than 0."); return; }
    if (!pin.trim())                   { setErr("The security PIN is needed to save a change."); return; }

    setBusy(true); setErr("");
    try {
      let picked = current;
      if (isNew) {
        const r = await onAddPayee(typed.trim(), phone, newKind);
        if ("error" in r) { setErr(r.error); setBusy(false); return; }
        picked = r.payee;
      }

      await onSave(entry.id, {
        kind,
        date: when,
        category: kind === "income"
          ? (picked?.kind === "employee" ? "loan_back" : "other_income")
          : (picked?.kind === "employee" ? "salary"    : "other"),
        title: name,
        amount: round2(n),
        method,
        payeeId: picked?.id ?? null,
        phone: phone.trim(),
        notes: purpose.trim(),
      } as Partial<EntryInput>, when, pin.trim());
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Could not save that change.");
      setPin("");
      setBusy(false);
    }
  };

  const tint = kind === "income" ? GREEN : RED;

  return (
    <div style={st.backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={st.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ ...st.modalHead, borderTopColor: tint }}>
          <div style={{ minWidth: 0 }}>
            <div style={st.modalTitle}>Edit entry</div>
            {/* What it says right now, so the change can be read against it. */}
            <div style={st.modalSub}>
              {entry.kind === "income" ? "Income" : "Expense"} · {entry.title} · {rupeesExact(entry.amount)}
              {" "}{entry.method} · {fmtDate(entry.date.slice(0, 10))}
            </div>
          </div>
          <button type="button" className="ie-nav" style={st.closeBtn} onClick={onClose} title="Close">×</button>
        </div>

        <div style={st.modalBody}>
          {/* Direction first — everything below reads differently once it
              changes, and a figure on the wrong side is a common slip. The
              two words are the ones written on the register itself, and the
              pair is only as wide as it needs to be. */}
          <Field label="Direction">
            <div style={st.segInline}>
              {(["income", "expense"] as const).map((k, i) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  style={{
                    ...st.segBtn, padding: "10px 24px",
                    borderLeft: i ? `1px solid ${LINE}` : "none",
                    background: kind === k ? (k === "income" ? GREEN : RED) : "#fff",
                    color: kind === k ? "#fff" : MUTED,
                  }}
                >{k === "income" ? "Income" : "Expense"}</button>
              ))}
            </div>
          </Field>

          <Field label="Person">
            <PersonPicker
              value={payeeId}
              payees={payees}
              tone={kind}
              placeholder="Nobody / walk-in"
              noneLabel="Nobody / walk-in"
              style={{ width: "100%" }}
              onChange={(id, q) => {
                setPayeeId(id);
                if (id === NEW_PERSON && q) setTyped(q);
                setErr("");
              }}
            />
          </Field>

          {isNew ? (
            <Field label="New name">
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <input
                  className="ie-in"
                  style={{ ...st.in, flex: 1, minWidth: 150 }}
                  placeholder="Name — the number below is optional"
                  value={typed}
                  onChange={(e) => { setTyped(e.target.value); setErr(""); }}
                />
                <div style={st.segInline}>
                  {([["employee", "Employee"], ["outsider", "Other"]] as [PayeeKind, string][]).map(([k, label], i) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setNewKind(k)}
                      style={{
                        ...st.segBtn,
                        borderLeft: i ? `1px solid ${LINE}` : "none",
                        background: newKind === k ? (k === "employee" ? ACCENT : GOLD) : "#fff",
                        color: newKind === k ? "#fff" : MUTED,
                      }}
                    >{label}</button>
                  ))}
                </div>
              </div>
            </Field>
          ) : !payeeId ? (
            /* With nobody attached the row still needs something to be called,
               so the written name stays editable on its own. */
            <Field label="Name on the entry">
              <input
                className="ie-in"
                style={{ ...st.in, width: "100%" }}
                value={typed}
                onChange={(e) => { setTyped(e.target.value); setErr(""); }}
              />
            </Field>
          ) : null}

          <div style={st.fieldRow}>
            <Field label="Amount" grow>
              <input
                className="ie-in"
                style={{ ...st.in, width: "100%", fontWeight: 800, fontSize: 15 }}
                type="number" min="0" inputMode="decimal"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setErr(""); }}
              />
            </Field>
            <Field label="Paid by" grow>
              <div style={{ ...st.seg, width: "100%" }}>
                {(["cash", "online"] as const).map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    style={{
                      ...st.segBtn, flex: 1, padding: "10px 0",
                      borderLeft: i ? `1px solid ${LINE}` : "none",
                      background: method === m ? (m === "cash" ? "#6b625a" : BLUE) : "#fff",
                      color: method === m ? "#fff" : MUTED,
                    }}
                  >{m === "cash" ? "Cash" : "Online"}</button>
                ))}
              </div>
            </Field>
          </div>

          <div style={st.fieldRow}>
            <Field label="Phone" grow>
              <input
                className="ie-in"
                style={{ ...st.in, width: "100%" }}
                type="tel" inputMode="tel" maxLength={15}
                placeholder="Optional"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setErr(""); }}
              />
            </Field>
            <Field label="Date" grow>
              <DateField value={when} max={isoDate()} onChange={setWhen} width="100%" />
            </Field>
          </div>

          <Field label="Purpose">
            <input
              className="ie-in"
              style={{ ...st.in, width: "100%" }}
              placeholder="What this money was for"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </Field>

          {/* Appears once there is something to save. */}
          {dirty && (
            <div style={st.pinWrap}>
              {/* The decoy: hidden from sight and from tabbing, but visible to
                  the password manager, which stops guessing at the fields the
                  studio actually types into. */}
              <input
                type="text"
                name="username"
                autoComplete="username"
                value="cashbook"
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                style={st.decoy}
              />
              <Field label="Security PIN">
                <input
                  className="ie-in"
                  style={{ ...st.in, width: "100%", letterSpacing: 4, fontWeight: 700 }}
                  type="password"
                  inputMode="numeric"
                  name="cashbook-pin"
                  autoComplete="one-time-code"
                  data-lpignore="true"
                  data-form-type="other"
                  data-1p-ignore="true"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setErr(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") save(); }}
                />
              </Field>
            </div>
          )}

          {err && <div style={st.addErr}>{err}</div>}
        </div>

        <div style={st.modalFoot}>
          <span style={{ fontSize: 11.5, color: FAINT, marginRight: "auto" }}>
            {dirty
              ? "The PIN is checked on the server; the change is recorded in Activity."
              : "Nothing changed yet."}
          </span>
          <button type="button" className="ie-ghost" style={st.ghostBtn} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ie-add"
            style={{ ...st.addBtn, background: tint, opacity: dirty && pin.trim() ? 1 : 0.45 }}
            onClick={save}
            disabled={busy || !dirty || !pin.trim()}
          >{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <label style={{ display: "block", marginBottom: 13, flex: grow ? 1 : undefined, minWidth: grow ? 140 : undefined }}>
      <span style={st.fieldLbl}>{label}</span>
      {children}
    </label>
  );
}

/* ── ledger ─────────────────────────────────────────────────────────────── */
function Ledger({
  anchorDate, payees, onEdit,
}: {
  anchorDate: string;
  payees: Payee[];
  onEdit: (e: EntryRow) => void;
}) {
  const [view, setView] = useState<LedgerView>("expense");
  const [span, setSpan] = useState<Span>("month");
  const [from, setFrom] = useState(monthStart(anchorDate));
  const [to,   setTo]   = useState(isoDate());
  const [query, setQuery] = useState("");

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

  /**
   * One box, three things worth searching for: who ("azad"), how to reach them
   * ("8609"), and what it was for ("flex"). A number is matched on digits only,
   * so 8609339511 is found by "86093" or "8609 33".
   *
   * Filtering happens on the rows already fetched, and EVERYTHING downstream —
   * the person list, the totals, the CSV and the print — reads the filtered
   * set, so what you export is exactly what you were looking at.
   */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    const digits = q.replace(/\D/g, "");
    return rows.filter((e) => {
      const hay = [e.title, e.notes, e.payee?.name].filter(Boolean).join(" ").toLowerCase();
      if (hay.includes(q)) return true;
      if (digits) {
        const ph = phoneOf(e).replace(/\D/g, "");
        if (ph && ph.includes(digits)) return true;
      }
      return false;
    });
  }, [rows, query]);

  const incomeRows  = useMemo(() => visible.filter((e) => e.kind === "income"),  [visible]);
  const expenseRows = useMemo(() => visible.filter((e) => e.kind === "expense"), [visible]);

  /** Oldest first with a running total — the way a passbook reads. */
  const withRunning = (list: EntryRow[]) => {
    const sorted = [...list].sort((a, b) =>
      a.date.localeCompare(b.date) || (a.createdAt || "").localeCompare(b.createdAt || ""));
    let run = 0;
    return sorted.map((e) => { run = round2(run + e.amount); return { ...e, running: run }; });
  };

  /** Both directions per person, so one page answers "where do we stand". */
  const people = useMemo(() => {
    const map = new Map<string, {
      id: string; name: string; kind: string; phone: string;
      paid: number; received: number; count: number;
    }>();
    for (const e of visible) {
      if (!e.payeeId || !e.payee) continue;
      if (!map.has(e.payeeId)) {
        map.set(e.payeeId, {
          id: e.payeeId, name: e.payee.name, kind: e.payee.kind,
          phone: e.payee.phone || "", paid: 0, received: 0, count: 0,
        });
      }
      const p = map.get(e.payeeId)!;
      if (e.kind === "expense") p.paid     = round2(p.paid + e.amount);
      else                      p.received = round2(p.received + e.amount);
      p.count += 1;
    }
    return [...map.values()].sort((a, b) => (b.paid + b.received) - (a.paid + a.received));
  }, [visible]);

  /** A person's page is the whole relationship — money out and money in, in
   *  one column, so the balance between us reads off the bottom. */
  const personRows = useMemo(
    () => withRunning(visible.filter((e) => e.payeeId === person)),
    [visible, person],
  );
  const selected   = payees.find((p) => p.id === person) || null;
  const personPaid = sum(personRows.filter((e) => e.kind === "expense"));
  const personGot  = sum(personRows.filter((e) => e.kind === "income"));

  const spanLabel = span === "month" ? monthName(anchorDate)
    : span === "all" ? "All time"
    : `${fmtDate(range.from)} – ${fmtDate(range.to)}`;

  // A filtered statement says so on the page and on the printout, so nobody
  // reads a narrowed total as the month's total.
  const scopeLabel = query.trim() ? `${spanLabel} · “${query.trim()}”` : spanLabel;

  const exportRows = (list: (EntryRow & { running?: number })[], name: string) => {
    const header = ["Date", "Type", "Name", "Phone", "Purpose", "Person", "Method", "Amount", "Running total"];
    const body = list.map((e) => [
      fmtDate(e.date.slice(0, 10)), e.kind === "income" ? "Income" : "Expense",
      e.title, phoneOf(e), e.notes || "",
      e.payee?.name || "", e.method, e.amount, e.running ?? "",
    ]);
    const tag = query.trim() ? `-${query.trim().replace(/[^\w]+/g, "-")}` : "";
    downloadCsv(`${name}${tag}-${range.from}-to-${range.to}.csv`, toCsv([header, ...body]));
  };

  const printRows = (
    list: (EntryRow & { running?: number })[],
    heading: string, total: number, tint: string, twoWay = false,
  ) => {
    const cashTotal   = sum(list, "cash");
    const onlineTotal = sum(list, "online");
    const outTotal    = sum(list.filter((e) => e.kind === "expense"));
    const inTotal     = sum(list.filter((e) => e.kind === "income"));
    const body = list.map((e) => {
      const ph = phoneOf(e);
      return `
      <tr>
        <td>${fmtDate(e.date.slice(0, 10))}</td>
        <td><b>${e.title}</b>${ph ? `<div class="n">${ph}</div>` : ""}${e.notes ? `<div class="n">${e.notes}</div>` : ""}</td>
        ${twoWay ? `<td><span class="m">${e.kind === "income" ? "Income" : "Expense"}</span></td>` : ""}
        <td><span class="m">${e.method === "cash" ? "Cash" : "Online"}</span></td>
        <td class="amt">${rupeesExact(e.amount)}</td>
        <td class="run">${rupeesExact(e.running || 0)}</td>
      </tr>`;
    }).join("");
    const cols = twoWay ? 4 : 3;
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
        <div class="title"><h1>${heading}</h1><div class="per">${scopeLabel}</div></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Name, phone &amp; purpose</th>${twoWay ? "<th>Type</th>" : ""}<th>Method</th><th>Amount</th><th>Running</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot>
          ${twoWay ? `
          <tr><td class="lbl" colspan="${cols}">Paid to them</td><td class="tot" colspan="2">${rupeesExact(outTotal)}</td></tr>
          <tr><td class="lbl" colspan="${cols}">Received from them</td><td class="tot" colspan="2">${rupeesExact(inTotal)}</td></tr>` : ""}
          <tr><td class="lbl" colspan="${cols}">Cash</td><td class="tot" colspan="2">${rupeesExact(cashTotal)}</td></tr>
          <tr><td class="lbl" colspan="${cols}">Online</td><td class="tot" colspan="2">${rupeesExact(onlineTotal)}</td></tr>
          <tr class="grand"><td class="lbl" colspan="${cols}">${twoWay ? "Balance" : "Total"} · ${list.length} ${list.length === 1 ? "entry" : "entries"}</td><td class="tot" colspan="2">${rupeesExact(total)}</td></tr>
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
              type="button"
              onClick={() => { setView(id); setPerson(""); }}
              style={{ ...st.tabBtn, background: view === id ? INK : "#fff", color: view === id ? "#fff" : MUTED }}
            >{label}</button>
          ))}
        </div>

        {/* One box for a name, a number or a word from the purpose. */}
        <div style={st.searchWrap}>
          <span style={st.searchIcon}><SearchIcon /></span>
          <input
            className="ie-in"
            style={st.searchIn}
            placeholder="Search name, phone or purpose…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }}
          />
          {query && (
            <button type="button" className="ie-clear" style={st.searchClear} onClick={() => setQuery("")} title="Clear search">×</button>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginLeft: "auto" }}>
          <div style={st.tabs}>
            {([["month", monthName(anchorDate).split(" ")[0]], ["range", "Range"], ["all", "All time"]] as [Span, string][]).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSpan(id)}
                style={{ ...st.tabBtn, fontSize: 12.5, padding: "8px 14px", background: span === id ? "#6b625a" : "#fff", color: span === id ? "#fff" : MUTED }}
              >{label}</button>
            ))}
          </div>
          {span === "range" && (
            <>
              <DateField value={from} max={to} onChange={setFrom} width={146} title="From" />
              <span style={{ color: FAINT, fontSize: 12 }}>to</span>
              <DateField value={to} min={from} max={isoDate()} onChange={setTo} width={146} title="To" />
            </>
          )}
        </div>
      </div>

      {/* What the search actually did, in one line — a total that shrank
          should never look like money that went missing. */}
      {query.trim() && !loading && (
        <div style={st.filterNote}>
          Showing {visible.length} of {rows.length} entr{rows.length === 1 ? "y" : "ies"} matching “{query.trim()}”.
          {" "}<button type="button" className="ie-link" style={st.linkBtn} onClick={() => setQuery("")}>Clear</button>
        </div>
      )}

      {err && <div style={st.error}>{err}</div>}

      {loading ? (
        <div style={{ ...st.panel, padding: 60, textAlign: "center", color: FAINT }}>Loading…</div>
      ) : view === "person" ? (
        person && selected ? (
          <LedgerTable
            heading={selected.name}
            sub={`${selected.phone || "No phone"} · ${selected.kind === "employee" ? "Employee" : "Other person"} · ${scopeLabel}`}
            rows={personRows}
            tint={INK}
            twoWay
            standing={{ paid: personPaid, received: personGot }}
            onBack={() => setPerson("")}
            onEdit={onEdit}
            onExport={() => exportRows(personRows, `ledger-${selected.name}`)}
            onPrint={() => printRows(personRows, `${selected.name} — Statement`,
              round2(personPaid - personGot), INK, true)}
          />
        ) : (
          <div style={st.panel}>
            <div style={st.panelHead}>
              <span style={st.panelTitle}>People · {scopeLabel}</span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
                <span style={st.splitPill}>
                  <span style={{ ...st.splitLbl, color: MUTED }}>Paid out</span>
                  <span style={{ ...st.splitVal, color: RED }}>{rupeesExact(sum(expenseRows))}</span>
                </span>
                <span style={st.splitPill}>
                  <span style={{ ...st.splitLbl, color: MUTED }}>Received</span>
                  <span style={{ ...st.splitVal, color: GREEN }}>{rupeesExact(sum(incomeRows))}</span>
                </span>
              </span>
            </div>
            <div className="ie-colbody" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {people.length === 0 ? (
                <div style={st.empty}>
                  {query.trim() ? "Nobody matches that search." : "Nobody linked to an entry in this period."}
                </div>
              ) : people.map((p) => {
                const bal = round2(p.paid - p.received);
                return (
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
                    {/* Both directions side by side — the net is what matters,
                        but neither figure should have to be dug out. */}
                    <span style={st.twoWayCell}>
                      <span style={{ ...st.twoWayVal, color: RED }}>−{rupeesExact(p.paid)}</span>
                      <span style={{ ...st.twoWayVal, color: GREEN }}>+{rupeesExact(p.received)}</span>
                    </span>
                    <span style={{ ...st.rowAmt, color: bal >= 0 ? RED : GREEN }}>{rupeesExact(Math.abs(bal))}</span>
                    <span style={{ color: FAINT, fontSize: 13, width: 16, textAlign: "right" }}>›</span>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        <LedgerTable
          heading={view === "income" ? "Income ledger" : "Expense ledger"}
          sub={scopeLabel}
          rows={withRunning(view === "income" ? incomeRows : expenseRows)}
          tint={view === "income" ? GREEN : RED}
          emptyNote={query.trim() ? "Nothing matches that search." : "Nothing in this period."}
          onEdit={onEdit}
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
  heading, sub, rows, tint, onBack, onExport, onPrint, onEdit, twoWay, standing, emptyNote,
}: {
  heading: string; sub: string;
  rows: (EntryRow & { running: number })[];
  tint: string;
  onBack?: () => void;
  onExport: () => void;
  onPrint: () => void;
  onEdit?: (e: EntryRow) => void;
  /** a person's page mixes both directions, so each row is labelled */
  twoWay?: boolean;
  standing?: { paid: number; received: number };
  emptyNote?: string;
}) {
  const total       = round2(rows.reduce((s, e) => s + e.amount, 0));
  const cashTotal   = sum(rows, "cash");
  const onlineTotal = sum(rows, "online");
  const balance     = standing ? round2(standing.paid - standing.received) : 0;

  return (
    <div style={st.panel}>
      <div style={st.panelHead}>
        {onBack && <button type="button" className="ie-nav" style={{ ...st.navBtn, width: 30, height: 30, fontSize: 15 }} onClick={onBack}>‹</button>}
        <div style={{ minWidth: 0 }}>
          <div style={st.panelTitle}>{heading}</div>
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{sub} · {rows.length} {rows.length === 1 ? "entry" : "entries"}</div>
        </div>

        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {standing ? (
            <>
              <span style={st.splitPill}>
                <span style={{ ...st.splitLbl, color: MUTED }}>Paid</span>
                <span style={{ ...st.splitVal, color: RED }}>{rupeesExact(standing.paid)}</span>
              </span>
              <span style={st.splitPill}>
                <span style={{ ...st.splitLbl, color: MUTED }}>Received</span>
                <span style={{ ...st.splitVal, color: GREEN }}>{rupeesExact(standing.received)}</span>
              </span>
              <span style={st.splitPill}>
                <span style={{ ...st.splitLbl, color: MUTED }}>{balance >= 0 ? "They owe" : "We owe"}</span>
                <span style={{ ...st.panelTotal, color: balance >= 0 ? RED : GREEN }}>{rupeesExact(Math.abs(balance))}</span>
              </span>
            </>
          ) : (
            <>
              <span style={st.splitPill}>
                <span style={{ ...st.splitLbl, color: "#7a6f66" }}>Cash</span>
                <span style={{ ...st.splitVal, color: tint }}>{rupeesExact(cashTotal)}</span>
              </span>
              <span style={st.splitPill}>
                <span style={{ ...st.splitLbl, color: BLUE }}>Online</span>
                <span style={{ ...st.splitVal, color: tint }}>{rupeesExact(onlineTotal)}</span>
              </span>
              <span style={{ ...st.panelTotal, color: tint }}>{rupeesExact(total)}</span>
            </>
          )}
        </span>

        <button type="button" className="ie-ghost" style={st.ghostBtn} onClick={onExport} disabled={!rows.length}>CSV</button>
        <button type="button" className="ie-ghost" style={{ ...st.ghostBtn, background: INK, color: "#fff", borderColor: INK }} onClick={onPrint} disabled={!rows.length}>Print</button>
      </div>

      <div className="ie-colbody" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {rows.length === 0 ? (
          <div style={st.empty}>{emptyNote || "Nothing in this period."}</div>
        ) : (
          <table style={st.table}>
            <thead>
              <tr>
                <th style={st.th}>Date</th>
                <th style={st.th}>Name, phone &amp; purpose</th>
                {twoWay && <th style={st.th}>Type</th>}
                <th style={st.th}>Method</th>
                <th style={{ ...st.th, textAlign: "right" }}>Amount</th>
                <th style={{ ...st.th, textAlign: "right" }}>Running</th>
                {onEdit && <th style={{ ...st.th, width: 52 }} />}
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const ph  = phoneOf(e);
                const out = e.kind === "expense";
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
                    {twoWay && (
                      <td style={st.td}>
                        <span style={{ ...st.chip, background: out ? "#fdeaee" : "#e8f6ee", color: out ? RED : GREEN }}>
                          {out ? "Expense" : "Income"}
                        </span>
                      </td>
                    )}
                    <td style={st.td}>
                      <span style={{ ...st.chip, ...(e.method === "cash" ? st.chipCash : st.chipOnline) }}>
                        {e.method === "cash" ? "Cash" : "Online"}
                      </span>
                    </td>
                    <td style={{ ...st.td, textAlign: "right", fontWeight: 800, color: twoWay ? (out ? RED : GREEN) : tint, whiteSpace: "nowrap" }}>
                      {twoWay ? (out ? "−" : "+") : ""}{rupeesExact(e.amount)}
                    </td>
                    <td style={{ ...st.td, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{rupeesExact(e.running)}</td>
                    {onEdit && (
                      <td style={{ ...st.td, textAlign: "right", padding: "6px 12px" }}>
                        <button
                          type="button"
                          className="ie-act ie-edit"
                          style={st.act}
                          onClick={() => onEdit(e)}
                          title="Edit this entry"
                          aria-label="Edit entry"
                        ><PencilIcon /></button>
                      </td>
                    )}
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
  .ie-row .ie-act,.ie-trow .ie-act{opacity:0;transition:opacity .15s,background .12s,border-color .12s,color .12s;}
  .ie-row:hover .ie-act,.ie-trow:hover .ie-act{opacity:1;}
  .ie-act:focus-visible{opacity:1;outline:none;border-color:${ACCENT};box-shadow:0 0 0 3px ${ACCENT}1f;}
  .ie-edit:hover{color:${ACCENT} !important;background:#fdf1eb;border-color:${ACCENT}66 !important;}
  .ie-del:hover{color:${RED} !important;background:#fdeaee;border-color:${RED}55 !important;}
  .ie-nav:hover:not(:disabled){border-color:${ACCENT}66;color:${ACCENT};}
  .ie-today:hover:not(:disabled){background:${ACCENT};color:#fff;border-color:${ACCENT};}
  .ie-add:hover:not(:disabled){filter:brightness(1.1);}
  .ie-add:disabled{opacity:.6;cursor:default;}
  .ie-ghost:hover:not(:disabled){filter:brightness(.96);}
  .ie-ghost:disabled{opacity:.45;cursor:not-allowed;}
  .ie-in:focus{outline:none;border-color:${ACCENT};box-shadow:0 0 0 3px ${ACCENT}1f;}
  .ie-picker:hover{border-color:${ACCENT}66;}
  .ie-clear:hover{color:${RED} !important;}
  .ie-link:hover{text-decoration:underline;}
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
  twoWayCell:{ display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-end", flexShrink: 0, minWidth: 88 },
  twoWayVal: { fontSize: 11.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  rowActs:   { display: "flex", alignItems: "center", gap: 5, flexShrink: 0, marginLeft: 4 },
  act:       { width: 28, height: 28, border: `1px solid ${LINE}`, background: "#fff", color: MUTED, cursor: "pointer", flexShrink: 0, padding: 0, borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center" },

  addWrap:   { padding: "12px 16px", borderBottom: `1px solid ${LINE}`, background: WASH },
  addRow:    { display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" },
  newWrap:   { display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", marginTop: 7, padding: "9px 10px", background: "#fff", border: `1px dashed ${ACCENT}66` },
  in:        { boxSizing: "border-box", padding: "9px 11px", border: `1px solid ${LINE}`, background: "#fff", fontSize: 13, fontFamily: "inherit", color: INK, colorScheme: "light", transition: "border-color .15s, box-shadow .15s" },
  seg:       { display: "flex", border: `1px solid ${LINE}`, flexShrink: 0 },
  /** Only as wide as its buttons — for a pair sitting on its own line. */
  segInline: { display: "inline-flex", border: `1px solid ${LINE}`, width: "fit-content", flexShrink: 0 },
  segBtn:    { padding: "9px 13px", border: "none", fontSize: 11.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" },
  addBtn:    { padding: "9px 20px", border: "none", color: "#fff", fontSize: 13, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", flexShrink: 0, transition: "filter .15s" },
  addErr:    { fontSize: 12, color: RED, marginTop: 7, fontWeight: 600 },
  backdated: { fontSize: 11.5, color: ACCENT, marginTop: 7, fontWeight: 600 },

  backdrop:  { position: "fixed", inset: 0, background: "rgba(42,35,29,.42)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6vh 16px 24px", zIndex: 1000, overflowY: "auto" },
  modal:     { background: "#fff", border: `1px solid ${LINE}`, width: "100%", maxWidth: 520, boxShadow: "0 18px 48px rgba(42,35,29,.22)", display: "flex", flexDirection: "column" },
  modalHead: { display: "flex", alignItems: "flex-start", gap: 12, padding: "15px 18px", borderTop: "3px solid", borderBottom: `1px solid ${LINE_SOFT}`, background: WASH },
  modalTitle:{ fontSize: 15.5, fontWeight: 800 },
  modalSub:  { fontSize: 11.5, color: MUTED, marginTop: 3, lineHeight: 1.5 },
  closeBtn:  { width: 28, height: 28, marginLeft: "auto", border: `1px solid ${LINE}`, background: "#fff", color: MUTED, fontSize: 17, lineHeight: 1, cursor: "pointer", flexShrink: 0, transition: "all .15s" },
  modalBody: { padding: "16px 18px 4px" },
  modalFoot: { display: "flex", alignItems: "center", gap: 8, padding: "13px 18px", borderTop: `1px solid ${LINE_SOFT}`, background: WASH, flexWrap: "wrap" },
  fieldRow:  { display: "flex", gap: 11, flexWrap: "wrap" },
  fieldLbl:  { display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: MUTED, marginBottom: 5 },
  pinWrap:   { position: "relative", padding: "12px 13px 1px", marginTop: 3, background: "#fdf6ef", border: `1px solid ${ACCENT}33` },
  /** Off-screen but not display:none — a hidden field the manager ignores. */
  decoy:     { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", border: 0, opacity: 0 },

  ledgerBar: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 },
  searchWrap:{ position: "relative", display: "flex", alignItems: "center", flex: "1 1 240px", maxWidth: 340, minWidth: 190 },
  searchIcon:{ position: "absolute", left: 11, color: FAINT, pointerEvents: "none", display: "inline-flex" },
  searchIn:  { boxSizing: "border-box", width: "100%", padding: "9px 30px 9px 32px", border: `1px solid ${LINE}`, background: "#fff", fontSize: 13, fontFamily: "inherit", color: INK, transition: "border-color .15s, box-shadow .15s" },
  searchClear:{ position: "absolute", right: 6, width: 22, height: 22, border: "none", background: "transparent", color: FAINT, fontSize: 17, lineHeight: 1, cursor: "pointer", padding: 0, transition: "color .12s" },
  filterNote:{ display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", marginBottom: 12, background: "#fdf6ef", border: `1px solid ${ACCENT}33`, fontSize: 12.5, color: "#7a5240", fontWeight: 600 },
  linkBtn:   { border: "none", background: "transparent", color: ACCENT, fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", padding: 0 },

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

/* ── person picker styles ───────────────────────────────────────────────── */
const pk: Record<string, React.CSSProperties> = {
  trigger:    { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: "pointer", textAlign: "left", fontWeight: 600 },
  triggerText:{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pop:        { position: "absolute", zIndex: 80, top: "calc(100% + 4px)", left: 0, right: 0, minWidth: 230, background: "#fff", border: `1px solid ${LINE}`, boxShadow: "0 14px 32px rgba(42,35,29,.18)" },
  searchWrap: { position: "relative", display: "flex", alignItems: "center", padding: 8, borderBottom: `1px solid ${LINE_SOFT}`, background: WASH },
  searchIcon: { position: "absolute", left: 19, color: FAINT, pointerEvents: "none", display: "inline-flex" },
  searchIn:   { boxSizing: "border-box", width: "100%", padding: "8px 10px 8px 30px", border: `1px solid ${LINE}`, background: "#fff", fontSize: 13, fontFamily: "inherit", color: INK },
  list:       { maxHeight: 248, overflowY: "auto", padding: "4px 0" },
  group:      { padding: "7px 12px 3px", fontSize: 9.5, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", color: FAINT },
  opt:        { width: "100%", textAlign: "left", padding: "7px 12px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: INK, cursor: "pointer", lineHeight: 1.35 },
  optPhone:   { fontSize: 11, color: MUTED, fontVariantNumeric: "tabular-nums", flexShrink: 0 },
  sep:        { height: 1, background: LINE_SOFT, margin: "4px 0" },
  none:       { padding: "14px 12px", fontSize: 12.5, color: FAINT },
};