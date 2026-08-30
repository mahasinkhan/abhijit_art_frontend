// src/components/income-expense/EntryStats.tsx
import type { Summary } from "../../services/incomeExpense.api";
import { CATEGORY_META } from "../../services/incomeExpense.api";
import { formatPhone } from "../../services/payee.api";
import { PERIOD_LABEL, type Period } from "../../hooks/useIncomeExpense";
import { rupees, initials, ACCENT, GOLD, GREEN, RED, FAINT } from "./types";

interface Props {
  summary:  Summary | null;
  period:   Period;
  loading:  boolean;
  payeeId:  string;
  onPayee:  (id: string) => void;
  category: string;
  onCategory: (c: string) => void;
}

export function EntryStats({
  summary, period, loading, payeeId, onPayee, category, onCategory,
}: Props) {
  const s = summary;
  const income  = s?.income  ?? 0;
  const expense = s?.expense ?? 0;
  const net     = s?.net     ?? 0;

  const inCats  = (s?.byCategory ?? []).filter((c) => c.kind === "income");
  const outCats = (s?.byCategory ?? []).filter((c) => c.kind === "expense");
  const people  = s?.byPayee ?? [];

  const maxIn  = Math.max(1, ...inCats.map((c) => c.amount));
  const maxOut = Math.max(1, ...outCats.map((c) => c.amount));

  const catList = (list: typeof inCats, max: number, empty: string) =>
    list.length === 0
      ? <div className="ie-empty">{empty}</div>
      : (
        <div className="ie-bars">
          {list.map((c) => {
            const meta = CATEGORY_META[c.category];
            const on = category === c.category;
            return (
              <button key={`${c.kind}-${c.category}`}
                className={`ie-bar${on ? " on" : ""}`}
                onClick={() => onCategory(on ? "" : c.category)}>
                <div className="ie-bar-top">
                  <span className="ie-bar-name">
                    <i style={{ background: meta?.color }} />{meta?.label || c.category}
                  </span>
                  <span className="ie-bar-amt">{rupees(c.amount)}</span>
                </div>
                <div className="ie-bar-track">
                  <div className="ie-bar-fill"
                    style={{ width: `${(c.amount / max) * 100}%`, background: meta?.color }} />
                </div>
              </button>
            );
          })}
        </div>
      );

  return (
    <>
      {/* three numbers, nothing else */}
      <div className="ie-stats3">
        <div className="ie-big" style={{ borderTopColor: GREEN }}>
          <div className="ie-big-l">Money in</div>
          <div className="ie-big-n" style={{ color: GREEN }}>{rupees(income)}</div>
          <div className="ie-big-s">Today {rupees(s?.todayIn ?? 0)}</div>
        </div>
        <div className="ie-big" style={{ borderTopColor: RED }}>
          <div className="ie-big-l">Money out</div>
          <div className="ie-big-n" style={{ color: RED }}>{rupees(expense)}</div>
          <div className="ie-big-s">Today {rupees(s?.todayOut ?? 0)}</div>
        </div>
        <div className="ie-big wash" style={{ borderTopColor: net >= 0 ? GREEN : ACCENT }}>
          <div className="ie-big-l">{net >= 0 ? "Left over" : "Short by"}</div>
          <div className="ie-big-n" style={{ color: net >= 0 ? GREEN : ACCENT }}>
            {net < 0 ? "−" : ""}{rupees(Math.abs(net))}
          </div>
          <div className="ie-big-s">{PERIOD_LABEL[period]} · {s?.count ?? 0} entries</div>
        </div>
      </div>

      {loading && !s ? null : (
        <div className="ie-split3">
          <div className="ie-panel">
            <div className="ie-panel-h">
              <b>Money in</b>
              {category && <button className="ie-link" onClick={() => onCategory("")}>Clear</button>}
            </div>
            {catList(inCats, maxIn, "Nothing came in.")}
          </div>

          <div className="ie-panel">
            <div className="ie-panel-h">
              <b>Money out</b>
              {category && <button className="ie-link" onClick={() => onCategory("")}>Clear</button>}
            </div>
            {catList(outCats, maxOut, "Nothing spent.")}
          </div>

          <div className="ie-panel">
            <div className="ie-panel-h">
              <b>People</b>
              {payeeId && <button className="ie-link" onClick={() => onPayee("")}>Clear</button>}
            </div>
            {people.length === 0 ? (
              <div className="ie-empty">Nobody involved.</div>
            ) : (
              <div className="ie-payees">
                {people.slice(0, 6).map((p) => {
                  const on = payeeId === p.id;
                  return (
                    <button key={p.id} className={`ie-payee${on ? " on" : ""}`}
                      onClick={() => onPayee(on ? "" : p.id)}>
                      <span className="ie-av" style={{ background: p.kind === "employee" ? ACCENT : GOLD }}>
                        {initials(p.name)}
                      </span>
                      <span className="ie-payee-main">
                        <span className="ie-payee-name">{p.name}</span>
                        <span className="ie-payee-sub">{formatPhone(p.phone)}</span>
                      </span>
                      <span className="ie-payee-r">
                        <span className="ie-payee-amt" style={{ color: RED }}>−{rupees(p.paid)}</span>
                        {p.received > 0 && (
                          <span className="ie-payee-amt sm" style={{ color: GREEN }}>+{rupees(p.received)}</span>
                        )}
                        {p.net > 0 && <span className="ie-owes">to collect {rupees(p.net)}</span>}
                      </span>
                    </button>
                  );
                })}
                {people.length > 6 && (
                  <div className="ie-more">{people.length - 6} more — open the People tab</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}