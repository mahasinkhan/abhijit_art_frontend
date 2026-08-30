// src/components/income-expense/EntryModal.tsx
import { useEffect, useRef, useState } from "react";
import type { Entry, EntryInput, PayMethod, TxnCategory, TxnKind } from "../../services/incomeExpense.api";
import { CATEGORY_META, catsFor, NEEDS_PAYEE } from "../../services/incomeExpense.api";
import type { Payee, PayeeKind } from "../../services/payee.api";
import { PayeePicker } from "./PayeePicker";
import { isoDate, rupees, KIND_META } from "./types";

interface Props {
  editing: Entry | null;
  startKind: TxnKind;
  payees:  Payee[];
  saving:  boolean;
  error:   string;
  defaultPayeeId?: string;
  onCreatePayee: (data: { name: string; phone: string; kind: PayeeKind; role?: string }) => Promise<Payee>;
  onSyncEmployees?: () => void;
  syncing?: boolean;
  onSave:  (data: EntryInput) => void;
  onClose: () => void;
}

export function EntryModal({
  editing, startKind, payees, saving, error, defaultPayeeId,
  onCreatePayee, onSyncEmployees, syncing, onSave, onClose,
}: Props) {
  const [kind,     setKind]     = useState<TxnKind>(editing?.kind || startKind);
  const [date,     setDate]     = useState(editing ? editing.date.slice(0, 10) : isoDate());
  const [category, setCategory] = useState<TxnCategory>(
    editing?.category || (startKind === "income" ? "sale" : "food")
  );
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

  /** Flipping direction has to drop a category from the other side. */
  function switchKind(k: TxnKind) {
    if (k === kind) return;
    setKind(k);
    setCategory(k === "income" ? "sale" : "food");
  }

  const km  = KIND_META[kind];
  const amt = Number(amount);
  const validAmount = Number.isFinite(amt) && amt > 0;
  const payeeRequired = NEEDS_PAYEE.includes(category);
  const canSave = !!title.trim() && validAmount && (!payeeRequired || !!payeeId);

  function submit() {
    if (!canSave || saving) return;
    onSave({
      kind, date, category,
      title: title.trim(),
      amount: Math.round(amt * 100) / 100,
      method,
      payeeId: payeeId || null,
      notes: notes.trim(),
    });
  }

  return (
    <div className="ie-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ie-modal wide">
        <button className="ie-close" onClick={onClose}>×</button>

        <div className="ie-mhead">
          <div className="ie-mtitle">{editing ? "Edit entry" : km.label}</div>
        </div>

        <div className="ie-mbody">
          {error && <div className="ie-err">{error}</div>}

          {/* direction first — everything else follows from it */}
          <div className="ie-kindsel">
            <button className={`ie-kindbtn${kind === "income" ? " on in" : ""}`}
              onClick={() => switchKind("income")}>
              <b>Money in</b><span>you received</span>
            </button>
            <button className={`ie-kindbtn${kind === "expense" ? " on out" : ""}`}
              onClick={() => switchKind("expense")}>
              <b>Money out</b><span>you paid</span>
            </button>
          </div>

          <div className="ie-mgrid">
            <div className="ie-mcol">
              <div className="ie-2col">
                <div>
                  <label className="ie-lbl">Amount *</label>
                  <input className="ie-inp ie-amtinp" type="number" min="1" step="0.01"
                    style={{ color: km.color }}
                    value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
                    onKeyDown={(e) => e.key === "Enter" && submit()} />
                </div>
                <div>
                  <label className="ie-lbl">{kind === "income" ? "Received in" : "Paid by"}</label>
                  <div className="ie-seg full">
                    <button className={method === "cash" ? "on" : ""} onClick={() => setMethod("cash")}>Cash</button>
                    <button className={method === "online" ? "on" : ""} onClick={() => setMethod("online")}>Online</button>
                  </div>
                </div>
              </div>

              <div>
                <label className="ie-lbl">What for? *</label>
                <input ref={firstRef} className="ie-inp" value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={kind === "income" ? "e.g. counter sale, loan repaid"
                                                 : "e.g. office lunch, auto fare, salary"}
                  onKeyDown={(e) => e.key === "Enter" && submit()} />
              </div>

              <div>
                <label className="ie-lbl">Category</label>
                <div className="ie-cats">
                  {catsFor(kind).map((c) => {
                    const meta = CATEGORY_META[c];
                    const on = category === c;
                    return (
                      <button key={c} className={`ie-cat-pick${on ? " on" : ""}`}
                        style={on ? { borderColor: meta.color, color: meta.color, background: `${meta.color}12` } : {}}
                        onClick={() => setCategory(c)}>
                        <i style={{ background: meta.color }} />{meta.label}
                      </button>
                    );
                  })}
                </div>
                {CATEGORY_META[category]?.hint && (
                  <div className="ie-hint">{CATEGORY_META[category].hint}</div>
                )}
              </div>

              <div className="ie-2col">
                <div>
                  <label className="ie-lbl">Date</label>
                  <input type="date" className="ie-inp" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="ie-lbl">Note</label>
                  <input className="ie-inp" value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional"
                    onKeyDown={(e) => e.key === "Enter" && submit()} />
                </div>
              </div>
            </div>

            <div className="ie-mcol">
              <label className="ie-lbl">
                {kind === "income" ? "Received from" : "Paid to"}
                {payeeRequired ? " *" : <span className="ie-opt"> — optional</span>}
              </label>
              <PayeePicker
                payees={payees}
                value={payeeId}
                onChange={setPayeeId}
                onCreate={onCreatePayee}
                onSync={onSyncEmployees}
                syncing={syncing}
                allowNobody={!payeeRequired}
              />
              {payeeRequired && (
                <div className="ie-hint">
                  Pick a person so the balance stays correct.
                </div>
              )}
            </div>
          </div>

          <button className="ie-save" disabled={!canSave || saving}
            style={{ background: km.color }} onClick={submit}>
            {saving ? "Saving…"
              : editing ? "Save changes"
              : `Save ${km.sign}${validAmount ? rupees(amt) : ""}`}
          </button>

          {!canSave && !saving && (
            <div className="ie-hint center">
              {!validAmount   ? "Enter an amount."
                : !title.trim() ? "Write what it was for."
                : "Pick the person."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}