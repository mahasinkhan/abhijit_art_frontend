// frontend/src/components/ChatWidget.tsx
import { useState, useEffect } from "react";
import api from "../api"; // 👈 your axios instance (adjust path if different)

const ACCENT = "#d9542f";
const ACCENT_DK = "#b8401f";
const INK = "#2a231d";
const LINE = "#e6ddcd";
const CREAM = "#fffdf8";
const BG = "#f7f3ea";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  /* Footer (and anywhere else) can open this with:
     window.dispatchEvent(new CustomEvent("aa:open-chat", { detail: { message: "…" } })) */
  useEffect(() => {
    const onOpen = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message as string | undefined;
      setSent(false);
      if (msg) setForm((f) => ({ ...f, message: msg }));
      setOpen(true);
    };
    window.addEventListener("aa:open-chat", onOpen as EventListener);
    return () => window.removeEventListener("aa:open-chat", onOpen as EventListener);
  }, []);

  const submit = async () => {
    setError("");
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Please enter your name and mobile number.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/visitors/lead", { ...form, page: window.location.pathname });
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Panel ── */}
      {open && (
        <div className="cw-panel" role="dialog" aria-label="Chat with Abhijit Art">
          {/* header */}
          <div className="cw-head">
            <div className="cw-avatar">A</div>
            <div style={{ flex: 1 }}>
              <div className="cw-name">Abhijit Art</div>
              <div className="cw-status">
                <span className="cw-dot" /> Typically replies in minutes
              </div>
            </div>
            <button className="cw-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>

          {/* body */}
          <div className="cw-body">
            <div className="cw-bubble">👋 Hi there! Welcome to <b>Abhijit Art</b>.</div>
            <div className="cw-bubble">
              {sent
                ? "Thank you! Our team will reach out to you shortly. 🎉"
                : "Leave your details and we'll get back to you with the best quote for your project."}
            </div>

            {!sent ? (
              <div className="cw-form">
                <input
                  className="cw-input" placeholder="Your name *"
                  value={form.name} onChange={(e) => set("name", e.target.value)}
                />
                <input
                  className="cw-input" placeholder="Mobile number *" inputMode="tel"
                  value={form.phone} onChange={(e) => set("phone", e.target.value)}
                />
                <input
                  className="cw-input" placeholder="Email (optional)" type="email"
                  value={form.email} onChange={(e) => set("email", e.target.value)}
                />
                <textarea
                  className="cw-input" placeholder="What do you need? (optional)" rows={2}
                  value={form.message} onChange={(e) => set("message", e.target.value)}
                />
                {error && <div className="cw-err">{error}</div>}
                <button className="cw-send" onClick={submit} disabled={loading}>
                  {loading ? "Sending…" : "Send →"}
                </button>
              </div>
            ) : (
              <button className="cw-send" style={{ marginTop: 6 }} onClick={() => { setSent(false); setForm({ name: "", phone: "", email: "", message: "" }); }}>
                Send another message
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Floating button ── */}
      <button className="cw-fab" onClick={() => setOpen((o) => !o)} aria-label="Chat with us">
        {open ? (
          <span style={{ fontSize: 26, lineHeight: 1 }}>×</span>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
        {!open && <span className="cw-ping" />}
      </button>

      <style>{`
        .cw-fab {
          position: fixed; bottom: 24px; right: 24px; z-index: 1500;
          width: 58px; height: 58px; border-radius: 50%; border: none; cursor: pointer;
          background: linear-gradient(135deg, ${ACCENT}, ${ACCENT_DK});
          color: #fff; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 14px 30px -8px ${ACCENT}88; transition: transform .2s ease, box-shadow .2s ease;
        }
        .cw-fab:hover { transform: translateY(-3px) scale(1.04); box-shadow: 0 18px 36px -8px ${ACCENT}aa; }
        .cw-ping { position: absolute; inset: 0; border-radius: 50%; box-shadow: 0 0 0 0 ${ACCENT}55; animation: cw-ping 2.4s infinite; }
        @keyframes cw-ping { 0% { box-shadow: 0 0 0 0 ${ACCENT}55; } 70% { box-shadow: 0 0 0 15px ${ACCENT}00; } 100% { box-shadow: 0 0 0 0 ${ACCENT}00; } }

        .cw-panel {
          position: fixed; bottom: 94px; right: 24px; z-index: 1500;
          width: 356px; max-width: calc(100vw - 32px); max-height: 74vh;
          background: ${BG}; border: 1px solid ${LINE}; border-radius: 20px; overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow: 0 30px 64px -28px rgba(42,35,29,.5);
          font-family: 'DM Sans', system-ui, sans-serif;
          animation: cw-up .28s cubic-bezier(.2,.8,.2,1);
        }
        @keyframes cw-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        .cw-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px;
          background: linear-gradient(135deg, ${ACCENT}, ${ACCENT_DK}); color: #fff; }
        .cw-avatar { width: 40px; height: 40px; border-radius: 50%; flex: none;
          background: rgba(255,255,255,.20); border: 1px solid rgba(255,255,255,.35);
          display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; }
        .cw-name { font-weight: 800; font-size: 15px; letter-spacing: .2px; }
        .cw-status { font-size: 12px; opacity: .92; display: flex; align-items: center; gap: 6px; margin-top: 1px; }
        .cw-dot { width: 8px; height: 8px; border-radius: 50%; background: #6ee787; display: inline-block; box-shadow: 0 0 0 2px rgba(255,255,255,.3); }
        .cw-x { margin-left: auto; background: none; border: none; color: #fff; font-size: 26px; line-height: 1; cursor: pointer; opacity: .9; transition: opacity .2s ease; }
        .cw-x:hover { opacity: 1; }

        .cw-body { padding: 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; overscroll-behavior: contain; }
        .cw-bubble { align-self: flex-start; background: #fff; border: 1px solid ${LINE}; color: ${INK};
          padding: 11px 14px; border-radius: 14px 14px 14px 4px; font-size: 14px; line-height: 1.55; max-width: 92%;
          box-shadow: 0 2px 10px rgba(42,35,29,.05); }

        .cw-form { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
        .cw-input { width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 12px;
          border: 1px solid ${LINE}; background: ${CREAM}; color: ${INK}; font-size: 14px; font-family: inherit; outline: none;
          transition: border-color .2s ease, box-shadow .2s ease; }
        .cw-input::placeholder { color: #a99e92; }
        .cw-input:focus { border-color: ${ACCENT}; box-shadow: 0 0 0 3px ${ACCENT}1f; }
        textarea.cw-input { resize: vertical; min-height: 64px; }
        .cw-err { color: ${ACCENT_DK}; font-size: 13px; }
        .cw-send { width: 100%; padding: 13px; border: none; border-radius: 12px; cursor: pointer;
          background: linear-gradient(135deg, ${ACCENT}, #e57a45); color: #fff; font-weight: 800; font-size: 14.5px; letter-spacing: .3px;
          box-shadow: 0 12px 24px -12px ${ACCENT}cc; transition: transform .2s ease, box-shadow .2s ease, opacity .2s ease; }
        .cw-send:hover { transform: translateY(-1px); box-shadow: 0 16px 30px -12px ${ACCENT}dd; }
        .cw-send:disabled { opacity: .6; cursor: default; transform: none; }

        @media (max-width: 480px) {
          .cw-panel { right: 16px; left: 16px; bottom: 88px; width: auto; max-width: none; }
          .cw-fab { right: 16px; bottom: 16px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cw-fab, .cw-send, .cw-input, .cw-x { transition: none; }
          .cw-ping { animation: none; }
          .cw-panel { animation: none; }
        }
      `}</style>
    </>
  );
}
