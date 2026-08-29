// src/components/expenses/ExpenseStats.tsx
import type { ExpenseSummary } from "../../services/expense.api";
import { CATEGORY_META } from "../../services/expense.api";
import { formatPhone } from "../../services/payee.api";
import { PERIOD_LABEL, type Period } from "../../hooks/useExpenses";
import { rupees, initials, ACCENT, GOLD, GREEN, BLUE, FAINT } from "./types";

interface Props {
  summary:  ExpenseSummary | null;
  period:   Period;
  loading:  boolean;
  payeeId:  string;
  onPayee:  (id: string) => void;
  category: string;
  onCategory: (c: string) => void;
}

export function ExpenseStats({
  summary, period, loading, payeeId, onPayee, category, onCategory,
}: Props) {
  const s = summary;
  const total  = s?.total  ?? 0;
  const cash   = s?.cash   ?? 0;
  const online = s?.online ?? 0;
  const today  = s?.today  ?? 0;

  const cats   = s?.byCategory ?? [];
  const payees = s?.byPayee    ?? [];
  const maxCat = Math.max(1, ...cats.map((c) => c.amount));
  const maxPay = Math.max(1, ...payees.map((p) => p.amount));

  return (
    <>
      <div className="ex-stats">
        <div className="ex-stat" style={{ borderLeftColor: ACCENT }}>
          <div className="ex-stat-n" style={{ color: ACCENT }}>{rupees(today)}</div>
          <div className="ex-stat-l">Spent today</div>
        </div>
        <div className="ex-stat" style={{ borderLeftColor: GOLD }}>
          <div className="ex-stat-n">{rupees(total)}</div>
          <div className="ex-stat-l">{PERIOD_LABEL[period]}</div>
        </div>
        <div className="ex-stat" style={{ borderLeftColor: GREEN }}>
          <div className="ex-stat-n" style={{ color: GREEN }}>{rupees(cash)}</div>
          <div className="ex-stat-l">Cash</div>
        </div>
        <div className="ex-stat" style={{ borderLeftColor: BLUE }}>
          <div className="ex-stat-n" style={{ color: BLUE }}>{rupees(online)}</div>
          <div className="ex-stat-l">Online</div>
        </div>
        <div className="ex-stat" style={{ borderLeftColor: FAINT }}>
          <div className="ex-stat-n">{s?.count ?? 0}</div>
          <div className="ex-stat-l">Entries</div>
        </div>
      </div>

      {loading && !s ? null : (
        <div className="ex-split">
          {/* where the money went */}
          <div className="ex-panel">
            <div className="ex-panel-h">
              <b>Where it went</b>
              {category && <button className="ex-link" onClick={() => onCategory("")}>Clear</button>}
            </div>
            {cats.length === 0 ? (
              <div className="ex-empty">Nothing recorded in this period.</div>
            ) : (
              <div className="ex-bars">
                {cats.map((c) => {
                  const meta = CATEGORY_META[c.category];
                  const on   = category === c.category;
                  return (
                    <button key={c.category}
                      className={`ex-bar${on ? " on" : ""}`}
                      onClick={() => onCategory(on ? "" : c.category)}
                      title={`${c.count} entr${c.count === 1 ? "y" : "ies"}`}>
                      <div className="ex-bar-top">
                        <span className="ex-bar-name">
                          <i style={{ background: meta.color }} />{meta.label}
                        </span>
                        <span className="ex-bar-amt">{rupees(c.amount)}</span>
                      </div>
                      <div className="ex-bar-track">
                        <div className="ex-bar-fill"
                          style={{ width: `${(c.amount / maxCat) * 100}%`, background: meta.color }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* who got paid — grouped by person, i.e. by phone number */}
          <div className="ex-panel">
            <div className="ex-panel-h">
              <b>Who got paid</b>
              {payeeId && <button className="ex-link" onClick={() => onPayee("")}>Clear</button>}
            </div>
            {payees.length === 0 ? (
              <div className="ex-empty">No payments in this period.</div>
            ) : (
              <div className="ex-payees">
                {payees.slice(0, 8).map((p) => {
                  const on = payeeId === p.id;
                  return (
                    <button key={p.id} className={`ex-payee${on ? " on" : ""}`}
                      onClick={() => onPayee(on ? "" : p.id)}
                      title="Click to see only their payments">
                      <span className="ex-av" style={{ background: p.kind === "employee" ? ACCENT : GOLD }}>
                        {initials(p.name)}
                      </span>
                      <span className="ex-payee-main">
                        <span className="ex-payee-name">{p.name}</span>
                        <span className="ex-payee-sub">
                          {formatPhone(p.phone)} · {p.count} payment{p.count === 1 ? "" : "s"}
                        </span>
                        <span className="ex-payee-track">
                          <i style={{ width: `${(p.amount / maxPay) * 100}%`,
                                      background: p.kind === "employee" ? ACCENT : GOLD }} />
                        </span>
                      </span>
                      <span className="ex-payee-amt">{rupees(p.amount)}</span>
                    </button>
                  );
                })}
                {payees.length > 8 && (
                  <div className="ex-more">{payees.length - 8} more — see the People tab</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}