import { useEffect, useState } from "react";
import api from "../api";

/* Security PIN setup card for the admin Settings tab. Reuses AdminDashboard's
   .adm-* styles so it matches Account / Change Password with no extra CSS.
     - No PIN yet  → set one, confirmed with your ACCOUNT password (bootstrap).
     - PIN exists  → change it, confirmed with the CURRENT PIN.
   The PIN is what gates delete / cancel / payment on invoices. */
export default function SecurityPinCard() {
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadStatus = async () => {
    try {
      const res = await api.get("/security/status");
      setPinSet(Boolean(res.data?.pinSet));
    } catch {
      setPinSet(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadStatus(); }, []);

  const submit = async () => {
    setMsg(null);
    if (next.length < 4) return setMsg({ type: "err", text: "PIN must be at least 4 characters." });
    if (next !== confirm) return setMsg({ type: "err", text: "New PINs do not match." });
    if (pinSet && !current) return setMsg({ type: "err", text: "Enter your current PIN." });
    if (!pinSet && !password) return setMsg({ type: "err", text: "Enter your account password to confirm." });

    setSaving(true);
    try {
      await api.post("/security/pin", pinSet
        ? { newPin: next, currentPin: current }
        : { newPin: next, password });
      setMsg({
        type: "ok",
        text: pinSet ? "PIN updated." : "Security PIN set — it's now required for delete, cancel and payment changes.",
      });
      setCurrent(""); setNext(""); setConfirm(""); setPassword("");
      setPinSet(true);
    } catch (err: any) {
      setMsg({ type: "err", text: err?.response?.data?.message || "Couldn't save the PIN." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="adm-scard">
      <h3 className="adm-stitle">Security PIN</h3>
      <p className="adm-ssub">
        {loading
          ? "Checking…"
          : pinSet
            ? "A PIN is set. It's required to delete or cancel an invoice, or change a payment."
            : "Set a PIN to protect sensitive actions (delete, cancel, edit a payment). Until it's set, those actions are blocked."}
      </p>

      {!loading && (
        <>
          {pinSet ? (
            <label className="adm-field">
              <span>Current PIN</span>
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
                placeholder="••••" autoComplete="off" inputMode="numeric" />
            </label>
          ) : (
            <label className="adm-field">
              <span>Your account password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Confirm it's you" autoComplete="current-password" />
            </label>
          )}

          <label className="adm-field">
            <span>{pinSet ? "New PIN" : "New security PIN"}</span>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)}
              placeholder="At least 4 digits" autoComplete="off" inputMode="numeric" />
          </label>
          <label className="adm-field">
            <span>Confirm new PIN</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-type the PIN" autoComplete="off" inputMode="numeric" />
          </label>

          {msg && <p className={msg.type === "ok" ? "adm-ok" : "adm-err"}>{msg.text}</p>}

          <button className="adm-save" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : pinSet ? "Update PIN" : "Set PIN"}
          </button>
        </>
      )}
    </section>
  );
}