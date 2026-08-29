// src/components/expenses/ExpenseModal.tsx
import { useEffect, useRef, useState } from "react";
import type { Expense, ExpenseCategory, ExpenseInput, PayMethod } from "../../services/expense.api";
import { CATEGORY_META, CATEGORY_LIST } from "../../services/expense.api";
import type { Payee, PayeeKind } from "../../services/payee.api";
import { PayeePicker } from "./PayeePicker";
import { isoDate, rupees } from "./types";

interface Props {
  editing: Expense | null;
  payees:  Payee[];
  saving:  boolean;
  error:   string;
  defaultPayeeId?: string;
  onCreatePayee: (data: { name: string; phone: string; kind: PayeeKind; role?: string }) => Promise<Payee>;
  onSyncEmployees?: () => void;
  syncing?: boolean;
  onSave:  (data: ExpenseInput) => void;
  onClose: () => void;
}

export function ExpenseModal({
  editing, payees, saving, error, defaultPayeeId,
  onCreatePayee, onSyncEmployees, syncing, onSave, onClose,
}: Props) {
  const [date,     setDate]     = useState(editing ? editing.date.slice(0, 10) : isoDate());
  const [category, setCategory] = useState<ExpenseCategory>(editing?.category || "other");
  const [title,    setTitle]    = useState(editing?.title || "");
  const [amount,   setAmount]   = useState(editing ? String(editing.amount) : "");
  const [method,   setMethod]   = useState<PayMethod>(editing?.method || "cash");
  const [notes,    setNotes]    = useState(editing?.notes || "");
  const [payeeId,  setPayeeId]  = useState(editing?.payeeId || defaultPayeeId || "");

  const firstRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const amt = Number(amount);
  const validAmount = Number.isFinite(amt) && amt > 0;
  const canSave = !!title.trim() && validAmount && !!payeeId;

  function submit() {
    if (!canSave || saving) return;
    onSave({
      date, category,
      title: title.trim(),
      amount: Math.round(amt * 100) / 100,
      method, payeeId,
      notes: notes.trim(),
    });
  }

  return (
    <div className="ex-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ex-modal wide">
        <button className="ex-close" onClick={onClose}>×</button>

        <div className="ex-mhead">
          <div className="ex-mtitle">{editing ? "Edit expense" : "Add expense"}</div>
          <div className="ex-msub">
            {editing ? "Change anything and save."
                     : "Money that went out — salary, advance, rent, tea, anything."}
          </div>
        </div>

        <div className="ex-mbody">
          {error && <div className="ex-err">{error}</div>}

          <div className="ex-mgrid">
            {/* ── left: what and how much ── */}
            <div className="ex-mcol">
              <div>
                <label className="ex-lbl">What was it for? *</label>
                <input ref={firstRef} className="ex-inp" value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. August salary, flex roll, auto fare"
                  onKeyDown={(e) => e.key === "Enter" && submit()} />
              </div>

              <div className="ex-2col">
                <div>
                  <label className="ex-lbl">Amount *</label>
                  <input className="ex-inp ex-amtinp" type="number" min="1" step="0.01"
                    value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
                    onKeyDown={(e) => e.key === "Enter" && submit()} />
                </div>
                <div>
                  <label className="ex-lbl">Paid by</label>
                  <div className="ex-seg full">
                    <button className={method === "cash" ? "on" : ""} onClick={() => setMethod("cash")}>Cash</button>
                    <button className={method === "online" ? "on" : ""} onClick={() => setMethod("online")}>Online</button>
                  </div>
                </div>
              </div>

              <div>
                <label className="ex-lbl">Category</label>
                <div className="ex-cats">
                  {CATEGORY_LIST.map((c) => {
                    const meta = CATEGORY_META[c];
                    const on = category === c;
                    return (
                      <button key={c} className={`ex-cat-pick${on ? " on" : ""}`}
                        style={on ? { borderColor: meta.color, color: meta.color, background: `${meta.color}12` } : {}}
                        onClick={() => setCategory(c)}>
                        <i style={{ background: meta.color }} />{meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ex-2col">
                <div>
                  <label className="ex-lbl">Date</label>
                  <input type="date" className="ex-inp" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="ex-lbl">Note (optional)</label>
                  <input className="ex-inp" value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything to remember"
                    onKeyDown={(e) => e.key === "Enter" && submit()} />
                </div>
              </div>
            </div>

            {/* ── right: who got it ── */}
            <div className="ex-mcol">
              <label className="ex-lbl">Who got the money? *</label>
              <PayeePicker
                payees={payees}
                value={payeeId}
                onChange={setPayeeId}
                onCreate={onCreatePayee}
                onSync={onSyncEmployees}
                syncing={syncing}
              />
            </div>
          </div>

          <button className="ex-save" disabled={!canSave || saving} onClick={submit}>
            {saving ? "Saving…" : editing ? "Save changes" : `Record ${validAmount ? rupees(amt) : "expense"}`}
          </button>

          {!canSave && !saving && (
            <div className="ex-hint center">
              {!title.trim()   ? "Write what the money was for."
                : !validAmount ? "Enter an amount above 0."
                : "Choose who got the money."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}