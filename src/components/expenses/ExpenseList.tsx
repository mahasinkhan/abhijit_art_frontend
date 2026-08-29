// src/components/expenses/ExpenseList.tsx
import type { Expense } from "../../services/expense.api";
import { CATEGORY_META, CATEGORY_LIST } from "../../services/expense.api";
import { formatPhone } from "../../services/payee.api";
import { PERIOD_LABEL, type Period } from "../../hooks/useExpenses";
import {
  rupees, rupeesExact, fmtDayLabel, initials,
  METHOD_META, toCsv, downloadCsv, ACCENT, GOLD, MUTED,
} from "./types";

interface DayGroup { date: string; total: number; items: Expense[]; }

interface Props {
  byDay:      DayGroup[];
  expenses:   Expense[];
  loading:    boolean;
  error:      string;
  shownTotal: number;

  period: Period;
  range:  { from: string; to: string };
  onPeriod: (p: Period) => void;
  onCustomRange: (from: string, to: string) => void;

  category: string; onCategory: (v: string) => void;
  method:   string; onMethod:   (v: string) => void;
  search:   string; onSearch:   (v: string) => void;
  payeeId:  string; onPayee:    (v: string) => void;
  dirty:    boolean; onClear:   () => void;

  onAdd:    () => void;
  onEdit:   (e: Expense) => void;
  onDelete: (e: Expense) => void;
  busyId:   string | null;
}

const PERIODS: Period[] = ["today", "week", "month", "year", "all"];

export function ExpenseList({
  byDay, expenses, loading, error, shownTotal,
  period, range, onPeriod, onCustomRange,
  category, onCategory, method, onMethod, search, onSearch,
  payeeId, onPayee, dirty, onClear,
  onAdd, onEdit, onDelete, busyId,
}: Props) {

  // name of the person currently filtered on, for the chip
  const filteredName = payeeId
    ? expenses.find((e) => e.payeeId === payeeId)?.payee?.name || "this person"
    : "";

  function exportCsv() {
    const rows: (string | number)[][] = [
      ["Date", "Title", "Category", "Paid to", "Phone", "Type", "Method", "Amount", "Notes", "Added by"],
      ...expenses.map((e) => [
        e.date.slice(0, 10),
        e.title,
        CATEGORY_META[e.category]?.label || e.category,
        e.payee?.name || "",
        e.payee ? formatPhone(e.payee.phone) : "",
        e.payee?.kind === "employee" ? "Employee" : "Outside",
        METHOD_META[e.method]?.label || e.method,
        e.amount,
        e.notes || "",
        e.createdBy?.name || "",
      ]),
      [],
      ["Total", "", "", "", "", "", "", shownTotal],
    ];
    downloadCsv(`expenses-${range.from}-to-${range.to}.csv`, toCsv(rows));
  }

  return (
    <>
      {/* period presets + custom range */}
      <div className="ex-bar">
        <div className="ex-seg">
          {PERIODS.map((p) => (
            <button key={p} className={period === p ? "on" : ""} onClick={() => onPeriod(p)}>
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>

        <div className="ex-dates">
          <input type="date" className="ex-date" value={range.from}
            onChange={(e) => onCustomRange(e.target.value, range.to)} />
          <span className="ex-to">to</span>
          <input type="date" className="ex-date" value={range.to}
            onChange={(e) => onCustomRange(range.from, e.target.value)} />
        </div>

        <button className="ex-add" onClick={onAdd}>+ Add expense</button>
      </div>

      {/* filters */}
      <div className="ex-bar">
        <input className="ex-search" placeholder="Search title, person, phone or note…"
          value={search} onChange={(e) => onSearch(e.target.value)} />

        <select className="ex-sel" value={category} onChange={(e) => onCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORY_LIST.map((c) => (
            <option key={c} value={c}>{CATEGORY_META[c].label}</option>
          ))}
        </select>

        <select className="ex-sel" value={method} onChange={(e) => onMethod(e.target.value)}>
          <option value="">Cash &amp; online</option>
          <option value="cash">Cash only</option>
          <option value="online">Online only</option>
        </select>

        {payeeId && (
          <button className="ex-chip" onClick={() => onPayee("")}>
            {filteredName} ✕
          </button>
        )}
        {dirty && <button className="ex-link" onClick={onClear}>Clear filters</button>}

        <button className="ex-ghost" onClick={exportCsv} disabled={expenses.length === 0}>Export CSV</button>
      </div>

      {error && <div className="ex-err">{error}</div>}

      {loading ? (
        <div className="ex-loadempty">Loading…</div>
      ) : expenses.length === 0 ? (
        <div className="ex-loadempty">
          {dirty ? "Nothing matches these filters."
                 : `No expenses recorded for ${PERIOD_LABEL[period].toLowerCase()}.`}
        </div>
      ) : (
        <>
          <div className="ex-showing">
            Showing <b>{expenses.length}</b> {expenses.length === 1 ? "entry" : "entries"} ·
            total <b>{rupees(shownTotal)}</b>
          </div>

          <div className="ex-days">
            {byDay.map((g) => (
              <div key={g.date} className="ex-day">
                <div className="ex-day-h">
                  <b>{fmtDayLabel(g.date)}</b>
                  <span>{g.items.length} {g.items.length === 1 ? "entry" : "entries"}</span>
                  <em>{rupees(g.total)}</em>
                </div>

                {g.items.map((e) => {
                  const cat  = CATEGORY_META[e.category];
                  const met  = METHOD_META[e.method];
                  const busy = busyId === e.id;
                  const isEmp = e.payee?.kind === "employee";
                  return (
                    <div key={e.id} className="ex-row" style={{ borderLeftColor: cat?.color || MUTED }}>
                      <div className="ex-row-main">
                        <div className="ex-row-top">
                          <span className="ex-row-title">{e.title}</span>
                          <span className="ex-cat" style={{ color: cat?.color }}>{cat?.label}</span>
                        </div>
                        <div className="ex-row-sub">
                          <button className="ex-who link"
                            onClick={() => onPayee(e.payeeId)}
                            title="Show only their payments">
                            <span className="ex-av sm" style={{ background: isEmp ? ACCENT : GOLD }}>
                              {initials(e.payee?.name || "")}
                            </span>
                            {e.payee?.name || "—"}
                          </button>
                          {e.payee?.phone && <span className="ex-phone">{formatPhone(e.payee.phone)}</span>}
                          <span className="ex-method" style={{ background: met.bg, color: met.color }}>{met.label}</span>
                          {e.notes && <span className="ex-note">{e.notes}</span>}
                        </div>
                      </div>

                      <div className="ex-row-r">
                        <span className="ex-amt">{rupeesExact(e.amount)}</span>
                        <button className="ex-icon" onClick={() => onEdit(e)}>Edit</button>
                        <button className="ex-icon danger" disabled={busy} onClick={() => onDelete(e)}>
                          {busy ? "…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}