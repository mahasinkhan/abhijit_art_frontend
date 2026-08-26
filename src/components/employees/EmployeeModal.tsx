// src/components/employees/EmployeeModal.tsx
import { useState } from "react";
import type { Employee } from "../../services/employee.api";

const ACCENT = "#d9542f";

interface Props {
  editEmp:  Employee | null;
  onSave:   (data: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  onClose:  () => void;
  saving:   boolean;
  error:    string;
}

export function EmployeeModal({ editEmp, onSave, onClose, saving, error }: Props) {
  const [form,   setForm]   = useState({ name: editEmp?.name || "", email: editEmp?.email || "", phone: editEmp?.phone || "", password: "" });
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="ep-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ep-modal">
        <button className="ep-close" onClick={onClose}>×</button>
        <div className="ep-mtitle">{editEmp ? "Edit Employee" : "Add New Employee"}</div>

        {error && <div className="ep-err">{error}</div>}

        <div className="ep-grid2">
          <div>
            <label className="ep-lbl">Full Name *</label>
            <input className="ep-inp" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Rahul Das" />
          </div>
          <div>
            <label className="ep-lbl">Email *</label>
            <input className="ep-inp" type="email" value={form.email}
              disabled={!!editEmp}
              style={editEmp ? { opacity: .5, cursor: "not-allowed" } : {}}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="rahul@abhijitart.com" />
            {editEmp && <div className="ep-hint">Email can't be changed after creation.</div>}
          </div>
          <div>
            <label className="ep-lbl">Phone</label>
            <input className="ep-inp" value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="9876543210" />
          </div>
          <div>
            <label className="ep-lbl">{editEmp ? "New Password" : "Password *"}</label>
            <div className="ep-pw">
              <input className="ep-inp" type={showPw ? "text" : "password"} value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editEmp ? "Leave blank to keep current" : "Min 6 characters"}
                autoComplete="new-password" />
              <button type="button" className="ep-eye" onClick={() => setShowPw((v) => !v)}>
                {showPw
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
            {editEmp && <div className="ep-hint">Fill only to reset password.</div>}
          </div>

          <button className="ep-save" disabled={saving} onClick={() => onSave(form)}>
            {saving ? "Saving…" : editEmp ? "Save Changes" : "Create Employee Account"}
          </button>
        </div>
      </div>
    </div>
  );
}