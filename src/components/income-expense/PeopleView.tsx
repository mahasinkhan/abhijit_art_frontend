// src/components/income-expense/PeopleView.tsx
import { useEffect, useState } from "react";
import type { Payee, PayeeDetail } from "../../services/payee.api";
import { formatPhone } from "../../services/payee.api";
import { CATEGORY_META } from "../../services/incomeExpense.api";
import {
  rupees, rupeesExact, fmtDate, monthLabel, initials,
  KIND_META, METHOD_META, toCsv, downloadCsv,
  ACCENT, GOLD, GREEN, RED, MUTED, FAINT,
} from "./types";

interface Props {
  shown:   Payee[];
  totals:  { people: number; employees: number; outsiders: number; paid: number; received: number; owed: number };
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
  onSeeEntries: (id: string) => void;
  /** open the entry modal pre-set to this person */
  onPay:     (p: Payee) => void;
  onReceive: (p: Payee) => void;
}

export function PeopleView({
  shown, totals, loading, error,
  kind, onKind, search, onSearch, showInactive, onShowInactive,
  getDetail, onCreate, onEdit, onDelete, onSync, syncing,
  onSeeEntries, onPay, onReceive,
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
      ["Name", "Phone", "Type", "Role", "Entries", "Paid out", "Received back", "Balance", "Last entry", "Active"],
      ...shown.map((p) => [
        p.name, formatPhone(p.phone),
        p.kind === "employee" ? "Employee" : "Outside",
        p.role || "",
        p.entryCount, p.paid, p.received, p.net,
        p.lastEntryAt ? fmtDate(p.lastEntryAt) : "",
        p.active ? "Yes" : "No",
      ]),
    ];
    downloadCsv("people.csv", toCsv(rows));
  }

  return (
    <>
      <div className="ie-stats">
        <div className="ie-stat" style={{ borderLeftColor: MUTED }}>
          <div className="ie-stat-n">{totals.people}</div>
          <div className="ie-stat-l">People</div>
        </div>
        <div className="ie-stat" style={{ borderLeftColor: ACCENT }}>
          <div className="ie-stat-n" style={{ color: ACCENT }}>{totals.employees}</div>
          <div className="ie-stat-l">Employees</div>
        </div>
        <div className="ie-stat" style={{ borderLeftColor: GOLD }}>
          <div className="ie-stat-n" style={{ color: GOLD }}>{totals.outsiders}</div>
          <div className="ie-stat-l">Outside</div>
        </div>
        <div className="ie-stat" style={{ borderLeftColor: RED }}>
          <div className="ie-stat-n" style={{ color: RED }}>{rupees(totals.paid)}</div>
          <div className="ie-stat-l">Paid out</div>
        </div>
        <div className="ie-stat big" style={{ borderLeftColor: totals.owed > 0 ? ACCENT : GREEN }}>
          <div className="ie-stat-n" style={{ color: totals.owed > 0 ? ACCENT : GREEN }}>
            {rupees(totals.owed)}
          </div>
          <div className="ie-stat-l">Still to collect</div>
        </div>
      </div>

      <div className="ie-bar">
        <input className="ie-search" placeholder="Search name, phone or role…"
          value={search} onChange={(e) => onSearch(e.target.value)} />

        <div className="ie-seg">
          <button className={!kind ? "on" : ""} onClick={() => onKind("")}>Everyone</button>
          <button className={kind === "employee" ? "on" : ""} onClick={() => onKind("employee")}>Employees</button>
          <button className={kind === "outsider" ? "on" : ""} onClick={() => onKind("outsider")}>Outside</button>
        </div>

        <label className="ie-check">
          <input type="checkbox" checked={showInactive}
            onChange={(e) => onShowInactive(e.target.checked)} />
          Show inactive
        </label>

        <button className="ie-ghost" onClick={onSync} disabled={syncing}>
          {syncing ? "Pulling…" : "Pull in employees"}
        </button>
        <button className="ie-ghost" onClick={exportPeople} disabled={shown.length === 0}>Export CSV</button>
        <button className="ie-add out" onClick={onCreate}>+ Add person</button>
      </div>

      {error && <div className="ie-err">{error}</div>}

      {loading ? (
        <div className="ie-loadempty">Loading…</div>
      ) : shown.length === 0 ? (
        <div className="ie-loadempty">
          {search || kind
            ? "Nobody matches that."
            : "No people yet — add someone, or pull in your employees."}
        </div>
      ) : (
        <div className="ie-people">
          {shown.map((p) => {
            const open = openId === p.id;
            return (
              <div key={p.id} className={`ie-person${open ? " open" : ""}${p.active ? "" : " off"}`}>
                <button className="ie-person-h" onClick={() => setOpenId(open ? null : p.id)}>
                  <span className="ie-av lg" style={{ background: p.kind === "employee" ? ACCENT : GOLD }}>
                    {initials(p.name)}
                  </span>
                  <span className="ie-person-main">
                    <span className="ie-person-name">
                      {p.name}
                      {!p.active && <em className="ie-off-tag">inactive</em>}
                    </span>
                    <span className="ie-person-sub">
                      {formatPhone(p.phone)}
                      {" · "}{p.kind === "employee" ? "Employee" : "Outside"}
                      {p.role ? ` · ${p.role}` : ""}
                    </span>
                  </span>
                  <span className="ie-person-r">
                    {p.net !== 0 ? (
                      <span className="ie-person-amt" style={{ color: p.net > 0 ? RED : GREEN }}>
                        {p.net > 0 ? `${rupees(p.net)} to collect` : `${rupees(-p.net)} to pay`}
                      </span>
                    ) : (
                      <span className="ie-person-amt" style={{ color: FAINT }}>settled</span>
                    )}
                    <span className="ie-person-cnt">
                      −{rupees(p.paid)} out · +{rupees(p.received)} in
                    </span>
                  </span>
                  <span className="ie-caret">{open ? "▴" : "▾"}</span>
                </button>

                {open && (
                  <div className="ie-person-body">
                    {dLoading || !detail ? (
                      <div className="ie-pempty">Loading history…</div>
                    ) : (() => {
                      // guard against an older API shape — a mismatch should
                      // show an empty history, never blank the whole page
                      const entries = detail.entries ?? [];
                      const months  = detail.byMonth ?? [];
                      const cats    = detail.byCategory ?? [];
                      return (
                      <>
                        <div className="ie-pd-top">
                          <div className="ie-pd-figs">
                            <div><span>Paid out</span><b style={{ color: RED }}>{rupees(detail.paid)}</b></div>
                            <div><span>Received</span><b style={{ color: GREEN }}>{rupees(detail.received)}</b></div>
                            <div>
                              <span>Balance</span>
                              <b style={{ color: detail.net > 0 ? RED : detail.net < 0 ? GREEN : FAINT }}>
                                {detail.net === 0 ? "settled"
                                  : detail.net > 0 ? `${rupees(detail.net)} to collect`
                                  : `${rupees(-detail.net)} to pay`}
                              </b>
                            </div>
                          </div>
                          <div className="ie-pd-actions">
                            <button className="ie-icon pay" onClick={() => onPay(p)}>Pay</button>
                            <button className="ie-icon get" onClick={() => onReceive(p)}>Receive</button>
                            <button className="ie-icon" onClick={() => onSeeEntries(p.id)}>See entries</button>
                            <button className="ie-icon" onClick={() => onEdit(p)}>Edit</button>
                            <button className="ie-icon danger" onClick={() => onDelete(p)}>Delete</button>
                          </div>
                        </div>

                        {cats.length > 0 && (
                          <div className="ie-pd-cats">
                            {cats.map((c) => {
                              const meta = CATEGORY_META[c.category as keyof typeof CATEGORY_META];
                              const km   = KIND_META[c.kind as "income" | "expense"];
                              return (
                                <span key={`${c.kind}-${c.category}`} className="ie-pd-cat">
                                  <i style={{ background: meta?.color || MUTED }} />
                                  {meta?.label || c.category}
                                  <b style={{ color: km.color }}>{km.sign}{rupees(c.amount)}</b>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {entries.length === 0 ? (
                          <div className="ie-pempty">Nothing recorded yet.</div>
                        ) : months.map((m) => {
                          const rows = entries.filter((e) => e.date.slice(0, 7) === m.month);
                          const mNet = Math.round((m.expense - m.income) * 100) / 100;
                          return (
                            <div key={m.month} className="ie-pd-month">
                              <div className="ie-pd-month-h">
                                <b>{monthLabel(m.month)}</b>
                                <em>
                                  {m.expense > 0 && <i style={{ color: RED }}>−{rupees(m.expense)}</i>}
                                  {m.income > 0 && <i style={{ color: GREEN }}>+{rupees(m.income)}</i>}
                                  {mNet !== 0 && (
                                    <i style={{ color: mNet > 0 ? RED : GREEN, fontWeight: 800 }}>
                                      {mNet > 0 ? `${rupees(mNet)} due` : `${rupees(-mNet)} received`}
                                    </i>
                                  )}
                                </em>
                              </div>
                              {rows.map((e) => {
                                const cat = CATEGORY_META[e.category as keyof typeof CATEGORY_META];
                                const met = METHOD_META[e.method];
                                const km  = KIND_META[e.kind];
                                return (
                                  <div key={e.id} className="ie-pd-row">
                                    <span className="ie-pd-date">{fmtDate(e.date)}</span>
                                    <span className="ie-pd-title">
                                      {e.title}
                                      <em style={{ color: cat?.color }}>{cat?.label}</em>
                                    </span>
                                    <span className="ie-method" style={{ background: met.bg, color: met.color }}>
                                      {met.label}
                                    </span>
                                    <span className="ie-pd-amt" style={{ color: km.color }}>
                                      {km.sign}{rupeesExact(e.amount)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </>
                      );
                    })()}
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