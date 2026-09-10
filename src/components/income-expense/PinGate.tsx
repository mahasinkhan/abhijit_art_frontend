// src/components/income-expense/PinGate.tsx
// ─────────────────────────────────────────────────────────────────────────
// Locks the cash book behind the security PIN. This is a VIEW guard, not
// authorisation: the API is still reachable by anyone with an admin session,
// so it protects against the screen being left open or opened over someone's
// shoulder — not against a determined user. Real enforcement would mean
// sending the PIN with every income-expense request.
//
// The unlock lives in sessionStorage, so it lasts the tab and no longer.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import api from "../../api";
import { ACCENT, INK, MUTED, FAINT, LINE, RED } from "./types";

const UNLOCK_KEY = "aa-ie-unlocked";

export function useCashbookLock() {
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem(UNLOCK_KEY) === "1"; } catch { return false; }
  });

  const unlock = () => {
    try { sessionStorage.setItem(UNLOCK_KEY, "1"); } catch { /* private mode */ }
    setUnlocked(true);
  };

  const lock = () => {
    try { sessionStorage.removeItem(UNLOCK_KEY); } catch { /* private mode */ }
    setUnlocked(false);
  };

  return { unlocked, unlock, lock };
}

export default function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin]   = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const submit = async () => {
    const clean = pin.trim();
    if (!clean) { setErr("Enter the PIN."); return; }
    setBusy(true); setErr("");
    try {
      await api.post("/api/security/verify", { pin: clean });
      onUnlock();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Incorrect PIN.");
      setPin("");
      ref.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={st.wrap}>
      <div style={st.card}>
        <div style={st.lock}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 style={st.title}>Income &amp; Expense is locked</h2>
        <p style={st.sub}>Enter the security PIN to open the cash book.</p>

        <input
          ref={ref}
          style={{ ...st.input, borderColor: err ? RED : LINE }}
          inputMode="numeric"
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          data-lpignore="true" data-1p-ignore="true"
          placeholder="••••••"
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />

        {err && <div style={st.err}>{err}</div>}

        <button style={{ ...st.btn, opacity: busy ? 0.65 : 1 }} onClick={submit} disabled={busy}>
          {busy ? "Checking…" : "Unlock"}
        </button>

        <div style={st.hint}>Same PIN as billing. Set or change it in Settings.</div>
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrap:  { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 180px)", padding: 24 },
  card:  { width: "100%", maxWidth: 340, background: "#fff", border: `1px solid ${LINE}`, padding: "30px 28px 26px", textAlign: "center", boxShadow: "0 1px 3px rgba(42,35,29,.06)" },
  lock:  { width: 54, height: 54, margin: "0 auto 16px", borderRadius: "50%", background: "#fdf2ee", color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: 800, margin: 0, color: INK, letterSpacing: -0.2 },
  sub:   { fontSize: 13, color: MUTED, margin: "6px 0 20px", lineHeight: 1.5 },
  input: { width: "100%", boxSizing: "border-box", padding: "12px 14px", border: "1px solid", background: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: 8, textAlign: "center", fontFamily: "inherit", color: INK, colorScheme: "light", WebkitTextSecurity: "disc" as any },
  err:   { fontSize: 12.5, color: RED, marginTop: 9, fontWeight: 600 },
  btn:   { width: "100%", marginTop: 16, padding: "11px 20px", border: "none", background: ACCENT, color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" },
  hint:  { fontSize: 11.5, color: FAINT, marginTop: 16, lineHeight: 1.5 },
};