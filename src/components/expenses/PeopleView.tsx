// src/components/expenses/PeopleView.tsx
import { useEffect, useState } from "react";
import type { Payee, PayeeDetail, PayeeKind } from "../../services/payee.api";
import { formatPhone, normalisePhone } from "../../services/payee.api";
import { CATEGORY_META } from "../../services/expense.api";
import {
  rupees, rupeesExact, fmtDate, initials,
  METHOD_META, toCsv, downloadCsv,
  ACCENT, GOLD, GREEN, BLUE, MUTED, FAINT,
} from "./types";

interface Props {
  shown:   Payee[];
  totals:  { people: number; employees: number; outsiders: number; paid: number };
  loading: boolean;
  error:   string;

  kind:   string; onKind:   (v: string) => void;
  search: string; onSearch: (v: string) => void;
  showInactive: boolean; onShowInactive: (v: boolean) => void;

  getDetail: (id: string) => Promise<PayeeDetail>;
  onCreate:  () => void;
  onEdit:    (p: Payee) => void;
  onDelete:  (p: Payee) => void;
  onSync:    () => void;
  syncing:   boolean;
  /** jump to the Expenses tab filtered to this person */
  onSeeExpenses: (id: string) => void;
}

const monthLabel = (m: string) =>
  new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

export function PeopleView({
  shown, totals, loading, error,
  kind, onKind, search, onSearch, showInactive, onShowInactive,
  getDetail, onCreate, onEdit, onDelete, onSync, syncing, onSeeExpenses,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PayeeDetail | null>(null);
  const [dLoading, setDLoading] = useState(false);

  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    let alive = true;
    setDLoading(true);
    getDetail(openId)
      .then((d) => { if (alive) setDetail(d); })
      .catch(() => { if (alive) setDetail(null); })
      .finally(() => { if (alive) setDLoading(false); });
    return () => { alive = false; };
  }, [openId, getDetail]);

  function exportPeople() {
    const rows: (string | number)[][] = [
      ["Name", "Phone", "Type", "Role", "Payments", "Total paid", "Last paid", "Active"],
      ...shown.map((p) => [
        p.name, formatPhone(p.phone),
        p.kind === "employee" ? "Employee" : "Outside",
        p.role || "",
        p.paymentCount, p.totalPaid,
        p.lastPaidAt ? fmtDate(p.lastPaidAt) : "",
        p.active ? "Yes" : "No",
      ]),
    ];
    downloadCsv("people.csv", toCsv(rows));
  }

  return (
    <>
      {/* who we pay */}
      <div className="ex-stats">
        <div className="ex-stat" style={{ borderLeftColor: MUTED }}>
          <div className="ex-stat-n">{totals.people}</div>
          <div className="ex-stat-l">People</div>
        </div>
        <div className="ex-stat" style={{ borderLeftColor: ACCENT }}>
          <div className="ex-stat-n" style={{ color: ACCENT }}>{totals.employees}</div>
          <div className="ex-stat-l">Employees</div>
        </div>
        <div className="ex-stat" style={{ borderLeftColor: GOLD }}>
          <div className="ex-stat-n" style={{ color: GOLD }}>{totals.outsiders}</div>
          <div className="ex-stat-l">Outside</div>
        </div>
        <div className="ex-stat" style={{ borderLeftColor: GREEN }}>
          <div className="ex-stat-n">{rupees(totals.paid)}</div>
          <div className="ex-stat-l">Paid all time</div>
        </div>
      </div>

      {/* toolbar */}
      <div className="ex-bar">
        <input className="ex-search" placeholder="Search name, phone or role…"
          value={search} onChange={(e) => onSearch(e.target.value)} />

        <div className="ex-seg">
          <button className={!kind ? "on" : ""} onClick={() => onKind("")}>Everyone</button>
          <button className={kind === "employee" ? "on" : ""} onClick={() => onKind("employee")}>Employees</button>
          <button className={kind === "outsider" ? "on" : ""} onClick={() => onKind("outsider")}>Outside</button>
        </div>

        <label className="ex-check">
          <input type="checkbox" checked={showInactive}
            onChange={(e) => onShowInactive(e.target.checked)} />
          Show inactive
        </label>

        <button className="ex-ghost" onClick={onSync} disabled={syncing}>
          {syncing ? "Syncing…" : "Pull in employees"}
        </button>
        <button className="ex-ghost" onClick={exportPeople} disabled={shown.length === 0}>Export CSV</button>
        <button className="ex-add" onClick={onCreate}>+ Add person</button>
      </div>

      {error && <div className="ex-err">{error}</div>}

      {loading ? (
        <div className="ex-loadempty">Loading…</div>
      ) : shown.length === 0 ? (
        <div className="ex-loadempty">
          {search || kind
            ? "Nobody matches that."
            : "No people yet — add someone, or pull in your employees."}
        </div>
      ) : (
        <div className="ex-people">
          {shown.map((p) => {
            const open = openId === p.id;
            return (
              <div key={p.id} className={`ex-person${open ? " open" : ""}${p.active ? "" : " off"}`}>
                <button className="ex-person-h" onClick={() => setOpenId(open ? null : p.id)}>
                  <span className="ex-av lg" style={{ background: p.kind === "employee" ? ACCENT : GOLD }}>
                    {initials(p.name)}
                  </span>
                  <span className="ex-person-main">
                    <span className="ex-person-name">
                      {p.name}
                      {!p.active && <em className="ex-off-tag">inactive</em>}
                    </span>
                    <span className="ex-person-sub">
                      {formatPhone(p.phone)}
                      {" · "}{p.kind === "employee" ? "Employee" : "Outside"}
                      {p.role ? ` · ${p.role}` : ""}
                    </span>
                  </span>
                  <span className="ex-person-r">
                    <span className="ex-person-amt">{rupees(p.totalPaid)}</span>
                    <span className="ex-person-cnt">
                      {p.paymentCount} payment{p.paymentCount === 1 ? "" : "s"}
                      {p.lastPaidAt ? ` · last ${fmtDate(p.lastPaidAt)}` : ""}
                    </span>
                  </span>
                  <span className="ex-caret">{open ? "▴" : "▾"}</span>
                </button>

                {open && (
                  <div className="ex-person-body">
                    {dLoading || !detail ? (
                      <div className="ex-pempty">Loading history…</div>
                    ) : (
                      <>
                        <div className="ex-pd-top">
                          <div className="ex-pd-figs">
                            <div><span>Total</span><b>{rupees(detail.totalPaid)}</b></div>
                            <div><span>Cash</span><b style={{ color: GREEN }}>{rupees(detail.cash)}</b></div>
                            <div><span>Online</span><b style={{ color: BLUE }}>{rupees(detail.online)}</b></div>
                          </div>
                          <div className="ex-pd-actions">
                            <button className="ex-icon" onClick={() => onSeeExpenses(p.id)}>See in expenses</button>
                            <button className="ex-icon" onClick={() => onEdit(p)}>Edit</button>
                            <button className="ex-icon danger" onClick={() => onDelete(p)}>Delete</button>
                          </div>
                        </div>

                        {detail.byCategory.length > 0 && (
                          <div className="ex-pd-cats">
                            {detail.byCategory.map((c) => {
                              const meta = CATEGORY_META[c.category as keyof typeof CATEGORY_META];
                              return (
                                <span key={c.category} className="ex-pd-cat">
                                  <i style={{ background: meta?.color || MUTED }} />
                                  {meta?.label || c.category} {rupees(c.amount)}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {detail.expenses.length === 0 ? (
                          <div className="ex-pempty">No payments recorded yet.</div>
                        ) : (
                          <>
                            {detail.byMonth.map((m) => {
                              const rows = detail.expenses.filter((e) => e.date.slice(0, 7) === m.month);
                              return (
                                <div key={m.month} className="ex-pd-month">
                                  <div className="ex-pd-month-h">
                                    <b>{monthLabel(m.month)}</b>
                                    <em>{rupees(m.amount)}</em>
                                  </div>
                                  {rows.map((e) => {
                                    const cat = CATEGORY_META[e.category as keyof typeof CATEGORY_META];
                                    const met = METHOD_META[e.method];
                                    return (
                                      <div key={e.id} className="ex-pd-row">
                                        <span className="ex-pd-date">{fmtDate(e.date)}</span>
                                        <span className="ex-pd-title">
                                          {e.title}
                                          <em style={{ color: cat?.color }}>{cat?.label}</em>
                                        </span>
                                        <span className="ex-method" style={{ background: met.bg, color: met.color }}>
                                          {met.label}
                                        </span>
                                        <span className="ex-pd-amt">{rupeesExact(e.amount)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}