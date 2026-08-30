// src/components/income-expense/PersonModal.tsx
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

  const clash = useMemo(() => {
    const d = normalisePhone(phone);
    if (d.length < 10) return null;
    return payees.find((p) => p.phone === d && p.id !== editing?.id) || null;
  }, [phone, payees, editing]);

  // a linked staff account can't be turned into an outsider
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
    <div className="ie-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ie-modal small">
        <button className="ie-close" onClick={onClose}>×</button>

        <div className="ie-mhead">
          <div className="ie-mtitle">{editing ? "Edit person" : "Add person"}</div>
          <div className="ie-msub">
            Phone number is the identity — one number, one person, however the name is typed.
          </div>
        </div>

        <div className="ie-mbody">
          {error && <div className="ie-err">{error}</div>}

          <div className="ie-grid">
            <div className="ie-2col">
              <div>
                <label className="ie-lbl">Name *</label>
                <input className="ie-inp" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Full name" autoFocus
                  onKeyDown={(e) => e.key === "Enter" && submit()} />
              </div>
              <div>
                <label className="ie-lbl">Phone *</label>
                <input className="ie-inp" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit number" inputMode="numeric"
                  onKeyDown={(e) => e.key === "Enter" && submit()} />
              </div>
            </div>

            {clash && (
              <div className="ie-clash">
                <span><b>{clash.name}</b> already uses this number.</span>
              </div>
            )}

            <div className="ie-2col">
              <div>
                <label className="ie-lbl">They are</label>
                <div className="ie-seg full">
                  <button className={kind === "outsider" ? "on" : ""} disabled={lockedKind}
                    onClick={() => setKind("outsider")}>Outside</button>
                  <button className={kind === "employee" ? "on" : ""} disabled={lockedKind}
                    onClick={() => setKind("employee")}>Employee</button>
                </div>
                {lockedKind && (
                  <div className="ie-hint">Linked to a staff login, so this stays “Employee”.</div>
                )}
              </div>
              <div>
                <label className="ie-lbl">Role (optional)</label>
                <input className="ie-inp" value={role} onChange={(e) => setRole(e.target.value)}
                  placeholder="Driver, landlord, designer…" />
              </div>
            </div>

            <div>
              <label className="ie-lbl">Note (optional)</label>
              <input className="ie-inp" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth remembering" />
            </div>

            {editing && (
              <label className="ie-check standalone">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Active — uncheck to hide them from the picker without losing history
              </label>
            )}

            <button className="ie-save" disabled={!canSave || saving} onClick={submit}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add person"}
            </button>

            {!canSave && !saving && !clash && (
              <div className="ie-hint center">
                {!name.trim() ? "Name is required." : "Enter a valid 10-digit phone number."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}