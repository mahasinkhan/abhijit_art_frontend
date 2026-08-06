import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";
import { useAuth } from "../context/AuthContext";

/* ══════════════════════════════════════════════════════════════
   BOOK SERVICE MODAL — shared by the Services page and the Home
   page service/product cards.

   The caller only decides WHICH service is being booked; auth
   gating, the two-step form, the POST and the success toast all
   live in here so both pages behave identically.

   Usage:
     const [booking, setBooking] = useState<BookTarget | null>(null);
     <button onClick={() => setBooking({ title: "Flex Printing" })}>Order</button>
     <BookServiceModal service={booking} onClose={() => setBooking(null)} />
   ══════════════════════════════════════════════════════════════ */

const INK = "#2a231d";
const SLATE = "#6f6357";
const LINE = "#e7ddcd";
const PAGE = "#f7f3ea";
const TERRA = "#d9542f";
const GOLD = "#c2974a";

export type BookTarget = {
  /** sent to the API as serviceName — must match how the card is labelled */
  title: string;
  /** accent for the header chip; falls back to terracotta */
  color?: string;
  /** any icon element; the caller owns its own icon set */
  icon?: React.ReactNode;
};

type Props = {
  service: BookTarget | null;
  onClose: () => void;
};

const emptyForm = {
  quantity: 1,
  notes: "",
  contactPhone: "",
  deliveryMethod: "pickup",
  address: "",
  preferredDate: "",
  designLink: "",
};

/* direction-aware step slide */
const panelV = {
  enter: (d: number) => ({ opacity: 0, x: d > 0 ? 36 : -36 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d > 0 ? -36 : 36 }),
};

export default function BookServiceModal({ service, onClose }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({ ...emptyForm });
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const title = service?.title ?? null;
  const accent = service?.color || TERRA;

  /* opening: send signed-out visitors to login, otherwise reset the form */
  useEffect(() => {
    if (!title) return;
    if (!user) {
      onClose();
      navigate("/login");
      return;
    }
    setStep(1);
    setDir(1);
    setError("");
    setDone("");
    setForm({ ...emptyForm, contactPhone: user.phone || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, user]);

  /* esc to close + lock the page behind the modal */
  useEffect(() => {
    if (!service) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [service, onClose]);

  /* toast auto-dismiss */
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(""), 5000);
    return () => clearTimeout(t);
  }, [done]);

  const handlePrimary = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setDir(1);
      setStep(2);
      return;
    }
    submitBooking();
  };

  const submitBooking = async () => {
    if (!service) return;
    setSubmitting(true);
    setError("");
    try {
      /* category cards have no DB id — the backend resolves by name */
      await api.post("/bookings", { serviceName: service.title, ...form });
      const name = service.title;
      onClose();
      setDone(`Your booking for "${name}" was sent! Check "My Bookings".`);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "We couldn't send that booking. Please check your details and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* ── success toast ── */}
      <AnimatePresence>
        {done && (
          <motion.div
            style={s.toast}
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          >
            <span style={s.toastTick}>✓</span>
            <span>{done}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── modal ── */}
      <AnimatePresence>
        {service && (
          <motion.div
            style={s.backdrop}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`Book ${service.title}`}
              style={s.modal}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 22 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
            >
              <div style={s.modalHead}>
                {service.icon && (
                  <span style={{ ...s.modalIcon, color: accent, background: `${accent}16` }}>
                    {service.icon}
                  </span>
                )}
                <div>
                  <p style={s.modalLabel}>BOOK SERVICE</p>
                  <h3 style={s.modalTitle}>{service.title}</h3>
                </div>
              </div>

              <div style={s.steps}>
                <span style={{ ...s.stepSeg, background: TERRA }} />
                <span style={{ ...s.stepSeg, background: step >= 2 ? TERRA : LINE }} />
              </div>
              <p style={s.stepLabel}>
                Step {step} of 2 — {step === 1 ? "Order basics" : "Delivery & details"}
              </p>

              <form onSubmit={handlePrimary}>
                <motion.div layout transition={{ duration: 0.28, ease: "easeOut" }} style={{ overflow: "hidden" }}>
                  <AnimatePresence mode="wait" custom={dir} initial={false}>
                    {step === 1 ? (
                      <motion.div key="s1" custom={dir} variants={panelV} initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: "easeOut" }}>
                        <label style={s.mLabel}>Quantity</label>
                        <input className="bsm-input" type="number" min="1" value={form.quantity}
                          onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />

                        <label style={s.mLabel}>Contact phone</label>
                        <input className="bsm-input" value={form.contactPhone} placeholder="Your phone number"
                          onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />

                        <label style={s.mLabel}>Details / notes</label>
                        <textarea className="bsm-input" rows={3} value={form.notes} placeholder="Size, colour, design link, etc."
                          onChange={(e) => setForm({ ...form, notes: e.target.value })} />

                        <div style={s.modalActions}>
                          <button type="button" className="bsm-ghost" style={s.ghostBtn} onClick={onClose}>Cancel</button>
                          <button type="submit" className="bsm-solid" style={s.confirmBtn}>Continue <span>→</span></button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="s2" custom={dir} variants={panelV} initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: "easeOut" }}>
                        <label style={s.mLabel}>Delivery method</label>
                        <div style={s.segRow}>
                          {["pickup", "delivery"].map((m) => (
                            <button key={m} type="button"
                              style={{ ...s.segBtn, ...(form.deliveryMethod === m ? s.segOn : {}) }}
                              onClick={() => setForm({ ...form, deliveryMethod: m })}>
                              {m === "pickup" ? "Pickup" : "Delivery"}
                            </button>
                          ))}
                        </div>

                        <AnimatePresence initial={false}>
                          {form.deliveryMethod === "delivery" && (
                            <motion.div key="addr" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} style={{ overflow: "hidden" }}>
                              <label style={s.mLabel}>Delivery address</label>
                              <textarea className="bsm-input" rows={2} value={form.address} placeholder="Where should we deliver?"
                                onChange={(e) => setForm({ ...form, address: e.target.value })} />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <label style={s.mLabel}>Preferred date</label>
                        <input className="bsm-input" type="date" value={form.preferredDate}
                          onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} />

                        <label style={s.mLabel}>Design file link <span style={s.opt}>(optional)</span></label>
                        <input className="bsm-input" type="url" value={form.designLink} placeholder="Google Drive / Dropbox link"
                          onChange={(e) => setForm({ ...form, designLink: e.target.value })} />

                        {error && <p style={s.error}>{error}</p>}

                        <div style={s.modalActions}>
                          <button type="button" className="bsm-ghost" style={s.ghostBtn} onClick={() => { setDir(-1); setStep(1); }}>← Back</button>
                          <button type="submit" className="bsm-solid" style={s.confirmBtn} disabled={submitting}>
                            {submitting ? "Sending…" : "Confirm Booking"}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .bsm-input {
          width: 100%; box-sizing: border-box; padding: 11px 14px; border: 1px solid ${LINE};
          border-radius: 4px; font-size: 14px; font-family: inherit; margin-top: 6px; outline: none;
          transition: border-color .2s, box-shadow .2s; background: #fff; color: ${INK};
        }
        .bsm-input:focus { border-color: ${TERRA}; box-shadow: 0 0 0 3px ${TERRA}22; }
        .bsm-ghost { transition: background .2s; }
        .bsm-ghost:hover { background: ${PAGE}; }
        .bsm-solid {
          background: ${TERRA}; color: #fff; border: none; cursor: pointer;
          font-family: inherit; font-weight: 700; letter-spacing: .6px;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 10px 26px rgba(217,84,47,.28);
          transition: transform .25s, box-shadow .25s, background .25s;
        }
        .bsm-solid span { display: inline-block; transition: transform .25s; }
        .bsm-solid:hover:not(:disabled) { transform: translateY(-2px); background: #c8461f; box-shadow: 0 16px 34px rgba(217,84,47,.38); }
        .bsm-solid:hover:not(:disabled) span { transform: translateX(4px); }
        .bsm-solid:disabled { opacity: .65; cursor: not-allowed; }
        @media (prefers-reduced-motion: reduce) {
          .bsm-solid, .bsm-solid span { transition: none !important; }
        }
      `}</style>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  toast: {
    position: "fixed", top: 90, left: "50%", transform: "translateX(-50%)", zIndex: 1100,
    display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${LINE}`,
    borderLeft: `4px solid ${GOLD}`, color: INK, padding: "13px 20px", borderRadius: 6,
    fontSize: 14, fontWeight: 600, boxShadow: "0 16px 40px rgba(42,35,29,.18)", maxWidth: "90vw",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  toastTick: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22,
    borderRadius: "50%", background: GOLD, color: "#fff", fontSize: 13, flexShrink: 0,
  },
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(36,29,23,.55)", backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20, zIndex: 1000,
  },
  modal: {
    background: "#fff", borderRadius: 8, padding: "28px 28px 26px", width: "100%", maxWidth: 440,
    border: `1px solid ${LINE}`, boxShadow: "0 30px 80px rgba(36,29,23,.32)", boxSizing: "border-box",
    fontFamily: "'DM Sans', system-ui, sans-serif", color: INK,
    maxHeight: "90vh", overflowY: "auto",
  },
  modalHead: { display: "flex", alignItems: "center", gap: 14, marginBottom: 18 },
  modalIcon: { width: 54, height: 54, flexShrink: 0, borderRadius: 6, display: "grid", placeItems: "center" },
  modalLabel: { margin: 0, color: TERRA, fontWeight: 800, letterSpacing: 2, fontSize: 11 },
  modalTitle: { margin: "2px 0 0", fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: INK },
  steps: { display: "flex", gap: 6, marginBottom: 8 },
  stepSeg: { flex: 1, height: 4, borderRadius: 4, transition: "background .3s ease" },
  stepLabel: { margin: "0 0 16px", fontSize: 12.5, fontWeight: 600, color: SLATE },
  mLabel: { display: "block", fontSize: 13, fontWeight: 600, color: INK, marginTop: 14 },
  opt: { color: SLATE, fontWeight: 500, fontSize: 12 },
  segRow: { display: "flex", gap: 10, marginTop: 8 },
  segBtn: {
    flex: 1, padding: "11px 0", borderRadius: 4, border: `1px solid ${LINE}`, background: "#fff",
    color: SLATE, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all .2s ease",
  },
  segOn: { borderColor: TERRA, background: TERRA, color: "#fff", boxShadow: `0 8px 18px ${TERRA}45` },
  error: {
    margin: "16px 0 0", padding: "10px 12px", borderRadius: 4, fontSize: 13, lineHeight: 1.5,
    color: "#8a2f16", background: "#fdeee9", border: "1px solid #f3cfc2",
  },
  modalActions: { display: "flex", gap: 12, marginTop: 24 },
  ghostBtn: {
    flex: 1, background: "#fff", color: INK, border: `1px solid ${LINE}`, padding: "12px 0",
    borderRadius: 4, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
  },
  confirmBtn: { flex: 1.4, padding: "12px 0", borderRadius: 4, fontSize: 14, fontWeight: 800 },
};