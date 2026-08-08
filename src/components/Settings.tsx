import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

/* ══════════════════════════════════════════════════════════════
   SETTINGS  ·  account, password, security PIN

   Self-contained settings page in the warm-glow system (matches Invoices /
   Activity / Inventory). Replaces the old inline SettingsPanel + SecurityPin.
   Every secret field has a show/hide eye toggle. The PIN is min 6 digits and
   gates delete / cancel / payment on invoices. Prefix set-.
   ══════════════════════════════════════════════════════════════ */

const INK = "#1f2430";
const BODY = "#545a67";
const MUTE = "#8a8f9a";
const FAINT = "#b6bac3";
const LINE = "#f0e6dc";
const CARD = "#ffffff";
const TERRA = "#d9542f";
const TERRA_DK = "#c8481f";
const GREEN = "#15733f";
const SANS = "'DM Sans', system-ui, sans-serif";

const GLOW =
  "radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.075) 0%, rgba(217,84,47,.022) 42%, rgba(217,84,47,0) 72%), linear-gradient(180deg, #fffcf9 0%, #ffffff 60%)";
const GLOW_SHADOW = "0 1px 2px rgba(17,20,30,.04), 0 10px 26px -18px rgba(217,84,47,.28)";

const PIN_MIN = 6;

/* ── icons ── */
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const map: Record<string, JSX.Element> = {
    user: (<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...p} /><circle cx="12" cy="7" r="4" {...p} /></>),
    key: (<><circle cx="7.5" cy="15.5" r="4.5" {...p} /><path d="M10.7 12.3 21 2m-4 4 2 2m-5 1 2 2" {...p} /></>),
    shield: (<><path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z" {...p} /><path d="m9 12 2 2 4-4" {...p} /></>),
    eye: (<><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" {...p} /><circle cx="12" cy="12" r="3" {...p} /></>),
    eyeOff: (<><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.4 18.4 0 0 1-2.16 3.19M6.6 6.6A18.4 18.4 0 0 0 1 12s4 8 11 8a9.1 9.1 0 0 0 3.4-.66" {...p} /><path d="M10.6 10.6a2 2 0 0 0 2.83 2.83" {...p} /><path d="m1 1 22 22" {...p} /></>),
  };
  return (<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>{map[name]}</svg>);
}

/* labeled password/PIN input with a show/hide eye */
function SecretInput({
  label, hint, value, onChange, placeholder, autoFocus, autoComplete = "off", numeric,
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoFocus?: boolean; autoComplete?: string; numeric?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <label style={st.field}>
      <span style={st.fieldLabel}>
        {label}{hint && <span style={st.hint}> · {hint}</span>}
      </span>
      <div style={st.secretWrap}>
        <input
          className="set-in"
          style={st.secretInput}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          inputMode={numeric ? "numeric" : undefined}
        />
        <button type="button" className="set-eye" style={st.eyeBtn} onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide" : "Show"} tabIndex={-1}>
          <Icon name={show ? "eyeOff" : "eye"} size={17} />
        </button>
      </div>
    </label>
  );
}

/* small card header with an icon */
function CardHead({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={st.cardHead}>
      <span style={st.cardIcon}><Icon name={icon} size={17} /></span>
      <div>
        <h3 style={st.cardTitle}>{title}</h3>
        <p style={st.cardSub}>{sub}</p>
      </div>
    </div>
  );
}

/* ───────────────────────── component ───────────────────────── */
export default function Settings() {
  const { user } = useAuth();

  /* change password */
  const [cur, setCur] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const changePassword = async () => {
    setPwMsg(null);
    if (!cur || !nextPw) return setPwMsg({ type: "err", text: "Please fill in all password fields." });
    if (nextPw.length < 6) return setPwMsg({ type: "err", text: "New password must be at least 6 characters." });
    if (nextPw !== confirmPw) return setPwMsg({ type: "err", text: "New passwords do not match." });
    setPwSaving(true);
    try {
      await api.patch("/auth/change-password", { currentPassword: cur, newPassword: nextPw });
      setPwMsg({ type: "ok", text: "Password updated successfully." });
      setCur(""); setNextPw(""); setConfirmPw("");
    } catch (err: any) {
      setPwMsg({ type: "err", text: err?.response?.data?.message || "Could not update password. Check your current password." });
    } finally {
      setPwSaving(false);
    }
  };

  /* security PIN */
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [pinLoading, setPinLoading] = useState(true);
  const [accPw, setAccPw] = useState("");
  const [curPin, setCurPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pinSaving, setPinSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/security/status");
        setPinSet(Boolean(res.data?.pinSet));
      } catch {
        setPinSet(null);
      } finally {
        setPinLoading(false);
      }
    })();
  }, []);

  const savePin = async () => {
    setPinMsg(null);
    if (newPin.length < PIN_MIN) return setPinMsg({ type: "err", text: `PIN must be at least ${PIN_MIN} digits.` });
    if (newPin !== confirmPin) return setPinMsg({ type: "err", text: "New PINs do not match." });
    if (pinSet && !curPin) return setPinMsg({ type: "err", text: "Enter your current PIN." });
    if (!pinSet && !accPw) return setPinMsg({ type: "err", text: "Enter your account password to confirm." });

    setPinSaving(true);
    try {
      await api.post("/api/security/pin", pinSet
        ? { newPin, currentPin: curPin }
        : { newPin, password: accPw });
      setPinMsg({
        type: "ok",
        text: pinSet ? "PIN updated." : "Security PIN set — it now protects delete, cancel and payment changes.",
      });
      setAccPw(""); setCurPin(""); setNewPin(""); setConfirmPin("");
      setPinSet(true);
    } catch (err: any) {
      setPinMsg({ type: "err", text: err?.response?.data?.message || "Couldn't save the PIN." });
    } finally {
      setPinSaving(false);
    }
  };

  const roleLabel = (user?.role ? String(user.role) : "admin");

  return (
    <div style={st.page}>
      <p style={st.intro}>Manage your account, password and security.</p>

      <div className="set-grid" style={st.grid}>
        {/* Account — full width */}
        <section className="set-card set-account" style={st.card}>
          <CardHead icon="user" title="Account" sub="Your admin profile details." />
          <div className="set-accgrid" style={st.accGrid}>
            <div>
              <div style={st.accLbl}>Name</div>
              <div style={st.accVal}>{user?.name || "—"}</div>
            </div>
            <div>
              <div style={st.accLbl}>Email</div>
              <div style={st.accVal}>{user?.email || "—"}</div>
            </div>
            <div>
              <div style={st.accLbl}>Role</div>
              <span style={st.rolePill}>{roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)}</span>
            </div>
          </div>
        </section>

        {/* Change Password */}
        <section className="set-card" style={st.card}>
          <CardHead icon="key" title="Change Password" sub="Use a strong password you don't use elsewhere." />

          <SecretInput label="Current password" value={cur} onChange={setCur} placeholder="••••••••" autoComplete="current-password" />
          <SecretInput label="New password" hint="min 6 characters" value={nextPw} onChange={setNextPw} placeholder="At least 6 characters" autoComplete="new-password" />
          <SecretInput label="Confirm new password" value={confirmPw} onChange={setConfirmPw} placeholder="Re-type new password" autoComplete="new-password" />

          {pwMsg && <p style={pwMsg.type === "ok" ? st.ok : st.err}>{pwMsg.text}</p>}

          <button className="set-save" style={st.saveBtn} onClick={changePassword} disabled={pwSaving}>
            {pwSaving ? "Saving…" : "Update password"}
          </button>
        </section>

        {/* Security PIN */}
        <section className="set-card" style={st.card}>
          <CardHead
            icon="shield"
            title="Security PIN"
            sub={
              pinLoading
                ? "Checking…"
                : pinSet
                  ? "Required to delete or cancel an invoice, or change a payment."
                  : `Set a ${PIN_MIN}-digit PIN to protect sensitive actions. Until it's set, those actions are blocked.`
            }
          />

          {!pinLoading && (
            <>
              {pinSet ? (
                <SecretInput label="Current PIN" value={curPin} onChange={setCurPin} placeholder="••••••" numeric />
              ) : (
                <SecretInput label="Your account password" hint="confirm it's you" value={accPw} onChange={setAccPw} placeholder="Account password" autoComplete="current-password" />
              )}

              <SecretInput label={pinSet ? "New PIN" : "New security PIN"} hint={`${PIN_MIN} digits`} value={newPin} onChange={setNewPin} placeholder={`At least ${PIN_MIN} digits`} numeric />
              <SecretInput label="Confirm new PIN" value={confirmPin} onChange={setConfirmPin} placeholder="Re-type the PIN" numeric />

              {pinMsg && <p style={pinMsg.type === "ok" ? st.ok : st.err}>{pinMsg.text}</p>}

              <button className="set-save" style={st.saveBtn} onClick={savePin} disabled={pinSaving}>
                {pinSaving ? "Saving…" : pinSet ? "Update PIN" : "Set PIN"}
              </button>
            </>
          )}
        </section>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .set-card { background: ${GLOW}; border: 1px solid ${LINE}; box-shadow: ${GLOW_SHADOW}; }
        .set-in { transition: border-color .18s, box-shadow .18s; }
        .set-in:focus { border-color: ${TERRA}; box-shadow: 0 0 0 3px ${TERRA}22; outline: none; }
        .set-eye { transition: color .16s; }
        .set-eye:hover { color: ${TERRA}; }
        .set-save { transition: all .18s ease; }
        .set-save:hover:not(:disabled) { background: ${TERRA_DK}; box-shadow: 0 12px 26px ${TERRA}40; transform: translateY(-1px); }
        .set-save:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }

        .set-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .set-account { grid-column: 1 / -1; }
        .set-accgrid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        @media (max-width: 760px) {
          .set-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .set-accgrid { grid-template-columns: minmax(0, 1fr) !important; gap: 16px !important; }
        }
        @media (prefers-reduced-motion: reduce) { .set-in,.set-eye,.set-save { transition: none !important; } }
      `}</style>
    </div>
  );
}

/* ───────────────────────── styles ───────────────────────── */
const st: Record<string, React.CSSProperties> = {
  page: { fontFamily: SANS, color: INK, minWidth: 0, maxWidth: "100%" },
  intro: { color: MUTE, fontSize: 13.5, margin: "0 0 18px" },
  grid: { display: "grid", gap: 20, maxWidth: 980, alignItems: "start" },

  card: { borderRadius: 0, padding: "22px 24px", minWidth: 0 },
  cardHead: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 },
  cardIcon: { width: 38, height: 38, flexShrink: 0, display: "grid", placeItems: "center", background: "#fff", border: `1px solid ${LINE}`, color: TERRA },
  cardTitle: { fontSize: 16.5, fontWeight: 800, margin: 0, letterSpacing: -0.2, color: INK },
  cardSub: { fontSize: 12.5, color: MUTE, margin: "3px 0 0", lineHeight: 1.5 },

  accGrid: { display: "grid", gap: 20, alignItems: "start" },
  accLbl: { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: MUTE, marginBottom: 5 },
  accVal: { fontSize: 14.5, fontWeight: 700, color: INK, wordBreak: "break-word" },
  rolePill: { display: "inline-block", fontSize: 12, fontWeight: 800, letterSpacing: 0.3, color: GREEN, background: "#e8f6ee", border: "1px solid #bfe3cd", padding: "4px 12px" },

  field: { display: "block", marginBottom: 14 },
  fieldLabel: { display: "block", fontSize: 12.5, fontWeight: 700, color: BODY, marginBottom: 6 },
  hint: { fontWeight: 500, color: MUTE, fontSize: 11.5 },
  secretWrap: { position: "relative" },
  secretInput: {
    width: "100%", boxSizing: "border-box", padding: "11px 44px 11px 14px", border: `1px solid #e6dcd2`, borderRadius: 0,
    fontSize: 14.5, fontFamily: SANS, background: "#fff", color: INK, colorScheme: "light",
  },
  eyeBtn: {
    position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 32, height: 32,
    display: "grid", placeItems: "center", border: "none", background: "transparent", color: MUTE, cursor: "pointer",
  },

  ok: { color: GREEN, fontSize: 13, fontWeight: 600, margin: "2px 0 14px" },
  err: { color: "#c0392b", fontSize: 13, fontWeight: 600, margin: "2px 0 14px" },

  saveBtn: {
    marginTop: 4, padding: "11px 22px", borderRadius: 0, border: "none", background: TERRA, color: "#fff",
    fontFamily: SANS, fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: `0 10px 22px ${TERRA}30`,
  },
};
