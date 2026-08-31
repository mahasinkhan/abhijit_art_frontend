// src/components/income-expense/EntryList.tsx
import type { Entry } from "../../services/incomeExpense.api";
import { CATEGORY_META, catsFor } from "../../services/incomeExpense.api";
import { formatPhone } from "../../services/payee.api";
import { PERIOD_LABEL, type Period } from "../../hooks/useIncomeExpense";
import {
  rupees, rupeesExact, fmtDayLabel, initials,
  KIND_META, METHOD_META, toCsv, downloadCsv,
  ACCENT, GOLD, GREEN, RED, MUTED,
} from "./types";

interface DayGroup { date: string; income: number; expense: number; items: Entry[]; }

interface Props {
  byDay:    DayGroup[];
  entries:  Entry[];
  loading:  boolean;
  error:    string;
  shown:    { income: number; expense: number; net: number };

  period: Period;
  range:  { from: string; to: string };
  onPeriod: (p: Period) => void;
  onCustomRange: (from: string, to: string) => void;

  kind:     string; onKind:     (v: string) => void;
  category: string; onCategory: (v: string) => void;
  method:   string; onMethod:   (v: string) => void;
  search:   string; onSearch:   (v: string) => void;
  payeeId:  string; onPayee:    (v: string) => void;
  dirty:    boolean; onClear:   () => void;

  onAddIncome:  () => void;
  onAddExpense: () => void;
  onEdit:   (e: Entry) => void;
  onDelete: (e: Entry) => void;
  busyId:   string | null;
}

const PERIODS: Period[] = ["today", "week", "month", "year", "all"];

export function EntryList({
  byDay, entries, loading, error, shown,
  period, range, onPeriod, onCustomRange,
  kind, onKind, category, onCategory, method, onMethod, search, onSearch,
  payeeId, onPayee, dirty, onClear,
  onAddIncome, onAddExpense, onEdit, onDelete, busyId,
}: Props) {

  const filteredName = payeeId
    ? entries.find((e) => e.payeeId === payeeId)?.payee?.name || "this person"
    : "";

  const catOptions = kind === "income" ? catsFor("income")
    : kind === "expense" ? catsFor("expense")
    : [...catsFor("expense"), ...catsFor("income")];

  function exportCsv() {
    const rows: (string | number)[][] = [
      ["Date", "In / Out", "Title", "Category", "Person", "Phone", "Method", "Amount", "Notes", "Added by"],
      ...entries.map((e) => [
        e.date.slice(0, 10),
        KIND_META[e.kind].short,
        e.title,
        CATEGORY_META[e.category]?.label || e.category,
        e.payee?.name || "",
        e.payee ? formatPhone(e.payee.phone) : "",
        METHOD_META[e.method]?.label || e.method,
        e.kind === "income" ? e.amount : -e.amount,
        e.notes || "",
        e.createdBy?.name || "",
      ]),
      [],
      ["Income",  "", "", "", "", "", "", shown.income],
      ["Expense", "", "", "", "", "", "", shown.expense],
      ["Net",     "", "", "", "", "", "", shown.net],
    ];
    downloadCsv(`cashbook-${range.from}-to-${range.to}.csv`, toCsv(rows));
  }

  return (
    <>
      {/* period + the two add buttons */}
      <div className="ie-bar">
        <div className="ie-seg">
          {PERIODS.map((p) => (
            <button key={p} className={period === p ? "on" : ""} onClick={() => onPeriod(p)}>
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>

        <div className="ie-dates">
          <input type="date" className="ie-date" value={range.from}
            onChange={(e) => onCustomRange(e.target.value, range.to)} />
          <span className="ie-to">to</span>
          <input type="date" className="ie-date" value={range.to}
            onChange={(e) => onCustomRange(range.from, e.target.value)} />
        </div>

        <div className="ie-addwrap">
          <button className="ie-add in"  onClick={onAddIncome}>+ Income</button>
          <button className="ie-add out" onClick={onAddExpense}>+ Expense</button>
        </div>
      </div>

      {/* filters */}
      <div className="ie-bar">
        <div className="ie-seg">
          <button className={!kind ? "on" : ""} onClick={() => onKind("")}>Both</button>
          <button className={kind === "income" ? "on green" : ""} onClick={() => onKind("income")}>In</button>
          <button className={kind === "expense" ? "on red" : ""} onClick={() => onKind("expense")}>Out</button>
        </div>

        <input className="ie-search" placeholder="Search title, person, phone or note…"
          value={search} onChange={(e) => onSearch(e.target.value)} />

        <select className="ie-sel" value={category} onChange={(e) => onCategory(e.target.value)}>
          <option value="">All categories</option>
          {catOptions.map((c) => (
            <option key={c} value={c}>{CATEGORY_META[c].label}</option>
          ))}
        </select>

        <select className="ie-sel" value={method} onChange={(e) => onMethod(e.target.value)}>
          <option value="">Cash &amp; online</option>
          <option value="cash">Cash only</option>
          <option value="online">Online only</option>
        </select>

        {payeeId && <button className="ie-chip" onClick={() => onPayee("")}>{filteredName} ✕</button>}
        {dirty && <button className="ie-link" onClick={onClear}>Clear filters</button>}

        <button className="ie-ghost" onClick={exportCsv} disabled={entries.length === 0}>Export CSV</button>
      </div>

      {error && <div className="ie-err">{error}</div>}

      {loading ? (
        <div className="ie-loadempty">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="ie-loadempty">
          {dirty ? "Nothing matches these filters."
                 : `Nothing recorded for ${PERIOD_LABEL[period].toLowerCase()}.`}
        </div>
      ) : (
        <>
          <div className="ie-showing">
            <b>{entries.length}</b> {entries.length === 1 ? "entry" : "entries"} ·
            in <b style={{ color: GREEN }}>{rupees(shown.income)}</b> ·
            out <b style={{ color: RED }}>{rupees(shown.expense)}</b> ·
            net <b style={{ color: shown.net >= 0 ? GREEN : ACCENT }}>
              {shown.net < 0 ? "−" : ""}{rupees(Math.abs(shown.net))}
            </b>
          </div>

          <div className="ie-days">
            {byDay.map((g) => {
              const dayNet = Math.round((g.income - g.expense) * 100) / 100;
              return (
                <div key={g.date} className="ie-day">
                  <div className="ie-day-h">
                    <b>{fmtDayLabel(g.date)}</b>
                    <span>{g.items.length} {g.items.length === 1 ? "entry" : "entries"}</span>
                    <em>
                      {g.income > 0 && <i style={{ color: GREEN }}>+{rupees(g.income)}</i>}
                      {g.expense > 0 && <i style={{ color: RED }}>−{rupees(g.expense)}</i>}
                      <i style={{ color: dayNet >= 0 ? GREEN : ACCENT, fontWeight: 800 }}>
                        {dayNet < 0 ? "−" : ""}{rupees(Math.abs(dayNet))}
                      </i>
                    </em>
                  </div>

                  {g.items.map((e) => {
                    const km   = KIND_META[e.kind];
                    const cat  = CATEGORY_META[e.category];
                    const met  = METHOD_META[e.method];
                    const busy = busyId === e.id;
                    const isEmp = e.payee?.kind === "employee";
                    return (
                      <div key={e.id} className="ie-row" style={{ borderLeftColor: km.color }}>
                        <div className="ie-row-main">
                          <div className="ie-row-top">
                            <span className="ie-kind" style={{ background: km.bg, color: km.color }}>
                              {km.short}
                            </span>
                            <span className="ie-row-title">{e.title}</span>
                            <span className="ie-cat" style={{ color: cat?.color }}>{cat?.label}</span>
                          </div>
                          <div className="ie-row-sub">
                            {e.payee ? (
                              <button className="ie-who" onClick={() => onPayee(e.payeeId!)}
                                title="Show only their entries">
                                <span className="ie-av sm" style={{ background: isEmp ? ACCENT : GOLD }}>
                                  {initials(e.payee.name)}
                                </span>
                                {e.payee.name}
                                <span className="ie-phone">{formatPhone(e.payee.phone)}</span>
                              </button>
                            ) : (
                              <span className="ie-nobody">No person</span>
                            )}
                            <span className="ie-method" style={{ background: met.bg, color: met.color }}>{met.label}</span>
                            {e.notes && <span className="ie-note">{e.notes}</span>}
                          </div>
                        </div>

                        <div className="ie-row-r">
                          <span className="ie-amt" style={{ color: km.color }}>
                            {km.sign}{rupeesExact(e.amount)}
                          </span>
                          <button className="ie-icon" onClick={() => onEdit(e)}>Edit</button>
                          <button className="ie-icon danger" disabled={busy} onClick={() => onDelete(e)}>
                            {busy ? "…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}