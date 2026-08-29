// src/components/expenses/PersonModal.tsx
import { useEffect, useMemo, useState } from "react";
import type { Payee, PayeeInput, PayeeKind } from "../../services/payee.api";
import { normalisePhone, formatPhone } from "../../services/payee.api";

interface Props {
  editing: Payee | null;
  payees:  Payee[];
  saving:  boolean;
  error:   string;
  onSave:  (data: PayeeInput) => void;
  onClose: () => void;
}

export function PersonModal({ editing, payees, saving, error, onSave, onClose }: Props) {
  const [name,   setName]   = useState(editing?.name || "");
  const [phone,  setPhone]  = useState(editing ? formatPhone(editing.phone) : "");
  const [kind,   setKind]   = useState<PayeeKind>(editing?.kind || "outsider");
  const [role,   setRole]   = useState(editing?.role || "");
  const [notes,  setNotes]  = useState(editing?.notes || "");
  const [active, setActive] = useState(editing ? editing.active : true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** someone else already owns this number */
  const clash = useMemo(() => {
    const d = normalisePhone(phone);
    if (d.length < 10) return null;
    return payees.find((p) => p.phone === d && p.id !== editing?.id) || null;
  }, [phone, payees, editing]);

  // a linked employee account can't be turned into an outsider
  const lockedKind = !!editing?.userId;

  const digits  = normalisePhone(phone);
  const canSave = !!name.trim() && digits.length >= 10 && !clash;

  function submit() {
    if (!canSave || saving) return;
    onSave({
      name: name.trim(),
      phone: digits,
      kind,
      role: role.trim(),
      notes: notes.trim(),
      active,
    });
  }

  return (
    <div className="ex-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ex-modal small">
        <button className="ex-close" onClick={onClose}>×</button>

        <div className="ex-mhead">
          <div className="ex-mtitle">{editing ? "Edit person" : "Add person"}</div>
          <div className="ex-msub">
            Phone number is the identity — one number, one person, however the name is typed.
          </div>
        </div>

        <div className="ex-mbody">
          {error && <div className="ex-err">{error}</div>}

          <div className="ex-grid">
            <div className="ex-2col">
              <div>
                <label className="ex-lbl">Name *</label>
                <input className="ex-inp" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Full name" autoFocus
                  onKeyDown={(e) => e.key === "Enter" && submit()} />
              </div>
              <div>
                <label className="ex-lbl">Phone *</label>
                <input className="ex-inp" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit number" inputMode="numeric"
                  onKeyDown={(e) => e.key === "Enter" && submit()} />
              </div>
            </div>

            {clash && (
              <div className="ex-clash">
                <span><b>{clash.name}</b> already uses this number.</span>
              </div>
            )}

            <div className="ex-2col">
              <div>
                <label className="ex-lbl">They are</label>
                <div className="ex-seg full">
                  <button className={kind === "outsider" ? "on" : ""} disabled={lockedKind}
                    onClick={() => setKind("outsider")}>Outside</button>
                  <button className={kind === "employee" ? "on" : ""} disabled={lockedKind}
                    onClick={() => setKind("employee")}>Employee</button>
                </div>
                {lockedKind && (
                  <div className="ex-hint">Linked to a staff login, so this stays “Employee”.</div>
                )}
              </div>
              <div>
                <label className="ex-lbl">Role (optional)</label>
                <input className="ex-inp" value={role} onChange={(e) => setRole(e.target.value)}
                  placeholder="Driver, landlord, designer…" />
              </div>
            </div>

            <div>
              <label className="ex-lbl">Note (optional)</label>
              <input className="ex-inp" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth remembering" />
            </div>

            {editing && (
              <label className="ex-check standalone">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Active — uncheck to hide them from the picker without losing history
              </label>
            )}

            <button className="ex-save" disabled={!canSave || saving} onClick={submit}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add person"}
            </button>

            {!canSave && !saving && !clash && (
              <div className="ex-hint center">
                {!name.trim() ? "Name is required." : "Enter a valid 10-digit phone number."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}