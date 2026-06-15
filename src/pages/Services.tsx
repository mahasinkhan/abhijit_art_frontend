import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";
import { useAuth } from "../context/AuthContext";

interface Service {
  id: string; // ← Prisma/Postgres uses `id`
  name: string;
  description: string;
  icon: string;
}

/* ── brand tokens (matches Home) ── */
const INK = "#141419";
const MUTED = "#6c6c78";
const PINK = "#ff2e63";
const PINK_DK = "#e01b50";
const BLUE = "#2f6bff";
const SOFT = "#f7f8fb";
const CARD = "#ffffff";
const BORDER = "#ececf1";

/* step slide animation (direction-aware) */
const panelV = {
  enter: (d: number) => ({ opacity: 0, x: d > 0 ? 36 : -36 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d > 0 ? -36 : 36 }),
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

export default function Services() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Service | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState("");
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    api
      .get("/services")
      .then((res) => setServices(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // auto-dismiss the success toast
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(""), 5000);
    return () => clearTimeout(t);
  }, [done]);

  const openBooking = (service: Service) => {
    if (!user) return navigate("/login");
    setDone("");
    setStep(1);
    setDir(1);
    setForm({ ...emptyForm, contactPhone: user.phone || "" });
    setBooking(service);
  };

  const closeBooking = () => {
    setBooking(null);
    setStep(1);
  };

  // primary button: step 1 advances, step 2 submits
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
    if (!booking) return;
    setSubmitting(true);
    try {
      await api.post("/bookings", { serviceId: booking.id, ...form });
      const name = booking.name;
      closeBooking();
      setDone(`Your booking for "${name}" was sent! Check "My Bookings".`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={st.page}>
      {/* ════════ HEADER ════════ */}
      <section style={st.hero}>
        <div style={st.blobA} />
        <div style={st.blobB} />
        <div style={st.container}>
          <motion.p
            style={st.eyebrow}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            WHAT WE OFFER
          </motion.p>
          <motion.h1
            style={st.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            Our <span style={st.titleAccent}>Services</span>
          </motion.h1>
          <motion.p
            style={st.sub}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
          >
            Premium printing, signage and fabrication — crafted with precision and delivered fast.
          </motion.p>
          <motion.span
            style={st.rule}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          />
        </div>
      </section>

      {/* ════════ GRID ════════ */}
      <section style={st.gridSection}>
        <div style={st.container}>
          <div className="svc-grid">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="svc-skel" />)
              : services.map((s, i) => (
                  <motion.div
                    key={s.id}
                    className="svc-card"
                    style={st.card}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.45, delay: (i % 5) * 0.06, ease: "easeOut" }}
                    whileHover={{ y: -10 }}
                  >
                    <div className="svc-icon" style={st.icon}>
                      <span style={st.iconEmoji}>{s.icon}</span>
                    </div>
                    <h3 style={st.name}>{s.name}</h3>
                    <p style={st.desc}>{s.description}</p>
                    <button className="svc-btn" style={st.btn} onClick={() => openBooking(s)}>
                      Book Now <span>→</span>
                    </button>
                  </motion.div>
                ))}
          </div>

          {!loading && services.length === 0 && (
            <p style={{ textAlign: "center", color: MUTED, marginTop: 40 }}>
              No services available right now. Please check back soon.
            </p>
          )}
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section style={st.ctaSection}>
        <motion.div
          style={st.ctaCard}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <div style={st.ctaGlow} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={st.ctaTitle}>Need something custom?</h2>
            <p style={st.ctaSub}>Tell us what you need — we'll craft it and give you the best price.</p>
          </div>
          <button style={st.ctaBtn} onClick={() => navigate("/contact")}>Contact Us →</button>
        </motion.div>
      </section>

      {/* ════════ SUCCESS TOAST ════════ */}
      <AnimatePresence>
        {done && (
          <motion.div
            style={st.toast}
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          >
            <span style={st.toastTick}>✓</span>
            <span>{done}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════ BOOKING MODAL ════════ */}
      <AnimatePresence>
        {booking && (
          <motion.div
            style={st.backdrop}
            onClick={closeBooking}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="svc-modal"
              style={st.modal}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 22 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
            >
              <div style={st.modalHead}>
                <span style={st.modalIcon}>{booking.icon}</span>
                <div>
                  <p style={st.modalLabel}>BOOK SERVICE</p>
                  <h3 style={st.modalTitle}>{booking.name}</h3>
                </div>
              </div>

              {/* progress */}
              <div style={st.steps}>
                <span style={{ ...st.stepSeg, background: PINK }} />
                <span style={{ ...st.stepSeg, background: step >= 2 ? PINK : BORDER }} />
              </div>
              <p style={st.stepLabel}>
                Step {step} of 2 — {step === 1 ? "Order basics" : "Delivery & details"}
              </p>

              <form onSubmit={handlePrimary}>
                <motion.div layout transition={{ duration: 0.28, ease: "easeOut" }} style={{ overflow: "hidden" }}>
                  <AnimatePresence mode="wait" custom={dir} initial={false}>
                    {step === 1 ? (
                      <motion.div
                        key="step1"
                        custom={dir}
                        variants={panelV}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.28, ease: "easeOut" }}
                      >
                        <label style={st.label}>Quantity</label>
                        <input
                          className="svc-input"
                          type="number"
                          min="1"
                          value={form.quantity}
                          onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                        />

                        <label style={st.label}>Contact phone</label>
                        <input
                          className="svc-input"
                          value={form.contactPhone}
                          onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                          placeholder="Your phone number"
                        />

                        <label style={st.label}>Details / notes</label>
                        <textarea
                          className="svc-input"
                          rows={3}
                          value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          placeholder="Size, colour, design link, etc."
                        />

                        <div style={st.modalActions}>
                          <button type="button" className="svc-ghost" style={st.ghostBtn} onClick={closeBooking}>
                            Cancel
                          </button>
                          <button type="submit" className="svc-btn" style={st.confirmBtn}>
                            Continue <span>→</span>
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="step2"
                        custom={dir}
                        variants={panelV}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.28, ease: "easeOut" }}
                      >
                        <label style={st.label}>Delivery method</label>
                        <div style={st.segRow}>
                          <button
                            type="button"
                            style={{ ...st.segBtn, ...(form.deliveryMethod === "pickup" ? st.segOn : {}) }}
                            onClick={() => setForm({ ...form, deliveryMethod: "pickup" })}
                          >
                            Pickup
                          </button>
                          <button
                            type="button"
                            style={{ ...st.segBtn, ...(form.deliveryMethod === "delivery" ? st.segOn : {}) }}
                            onClick={() => setForm({ ...form, deliveryMethod: "delivery" })}
                          >
                            Delivery
                          </button>
                        </div>

                        <AnimatePresence initial={false}>
                          {form.deliveryMethod === "delivery" && (
                            <motion.div
                              key="addr"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: "easeOut" }}
                              style={{ overflow: "hidden" }}
                            >
                              <label style={st.label}>Delivery address</label>
                              <textarea
                                className="svc-input"
                                rows={2}
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                placeholder="Where should we deliver?"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <label style={st.label}>Preferred date</label>
                        <input
                          className="svc-input"
                          type="date"
                          value={form.preferredDate}
                          onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                        />

                        <label style={st.label}>
                          Design file link <span style={st.opt}>(optional)</span>
                        </label>
                        <input
                          className="svc-input"
                          type="url"
                          value={form.designLink}
                          onChange={(e) => setForm({ ...form, designLink: e.target.value })}
                          placeholder="Google Drive / Dropbox link"
                        />

                        <div style={st.modalActions}>
                          <button
                            type="button"
                            className="svc-ghost"
                            style={st.ghostBtn}
                            onClick={() => { setDir(-1); setStep(1); }}
                          >
                            ← Back
                          </button>
                          <button type="submit" className="svc-btn" style={st.confirmBtn} disabled={submitting}>
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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');

        .svc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }
        @media (max-width: 1100px) { .svc-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 760px)  { .svc-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; } }
        @media (max-width: 460px)  { .svc-grid { grid-template-columns: 1fr; } }

        .svc-card::before {
          content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, ${PINK}, ${BLUE});
          transform: scaleX(0); transform-origin: left; transition: transform .35s ease;
        }
        .svc-card:hover::before { transform: scaleX(1); }
        .svc-card:hover { box-shadow: 0 24px 50px rgba(20,20,25,.12) !important; border-color: ${PINK}55 !important; }
        .svc-card .svc-icon { transition: transform .3s ease; }
        .svc-card:hover .svc-icon { transform: scale(1.08) rotate(-3deg); }

        .svc-btn span { display: inline-block; transition: transform .25s ease; }
        .svc-btn:hover span { transform: translateX(4px); }
        .svc-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 28px ${PINK}55; }
        .svc-btn:disabled { opacity: .7; cursor: default; }

        .svc-ghost:hover { background: ${SOFT}; }

        .svc-input { width: 100%; box-sizing: border-box; padding: 11px 14px; border: 1px solid ${BORDER};
          border-radius: 10px; font-size: 14px; font-family: inherit; margin-top: 6px; outline: none;
          transition: border-color .2s, box-shadow .2s; background: #fff; color: ${INK}; }
        .svc-input:focus { border-color: ${PINK}; box-shadow: 0 0 0 3px ${PINK}22; }

        .svc-skel { height: 240px; border-radius: 22px;
          background: linear-gradient(90deg, #ececf1 25%, #f5f5f8 37%, #ececf1 63%);
          background-size: 400% 100%; animation: svcShimmer 1.3s ease-in-out infinite; }
        @keyframes svcShimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

        @media (prefers-reduced-motion: reduce) {
          .svc-card::before, .svc-card .svc-icon, .svc-btn span, .svc-skel { transition: none !important; animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────── styles ───────────────────────── */
const st: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh", color: INK, fontFamily: "'DM Sans', sans-serif",
    background: SOFT,
    backgroundImage: "radial-gradient(rgba(20,20,25,0.04) 1px, transparent 1.6px)",
    backgroundSize: "24px 24px",
  },
  container: { maxWidth: 1280, margin: "0 auto", width: "100%", boxSizing: "border-box", padding: "0 clamp(16px, 4vw, 40px)", position: "relative", zIndex: 1 },

  /* header */
  hero: { position: "relative", overflow: "hidden", textAlign: "center", padding: "72px 0 44px" },
  blobA: { position: "absolute", top: -120, left: -80, width: 380, height: 380, borderRadius: "50%", background: `radial-gradient(circle, ${PINK}22, transparent 65%)`, pointerEvents: "none" },
  blobB: { position: "absolute", top: -60, right: -60, width: 340, height: 340, borderRadius: "50%", background: `radial-gradient(circle, ${BLUE}1c, transparent 65%)`, pointerEvents: "none" },
  eyebrow: { color: PINK, fontWeight: 800, letterSpacing: 3, fontSize: 12.5, margin: "0 0 12px" },
  title: { fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 1.05, margin: "0 0 16px", color: INK, letterSpacing: -1 },
  titleAccent: { fontStyle: "italic", color: PINK },
  sub: { color: MUTED, fontSize: 17, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 18px" },
  rule: { display: "inline-block", width: 70, height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${PINK}, ${BLUE})` },

  /* grid */
  gridSection: { padding: "20px 0 60px" },
  card: { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: "34px 24px 28px", textAlign: "center", boxShadow: "0 8px 26px rgba(20,20,25,.05)", position: "relative", overflow: "hidden" },
  icon: { width: 72, height: 72, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", background: `linear-gradient(145deg, ${PINK}16, ${BLUE}12)`, border: `1px solid ${PINK}22` },
  iconEmoji: { fontSize: 34, lineHeight: 1 },
  name: { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: INK },
  desc: { fontSize: 13.5, color: MUTED, lineHeight: 1.6, margin: "0 0 20px", minHeight: 44 },
  btn: { display: "inline-flex", alignItems: "center", gap: 8, background: PINK, color: "#fff", border: "none", padding: "12px 26px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: `0 10px 22px ${PINK}40`, fontFamily: "inherit", transition: "transform .25s ease, box-shadow .25s ease" },

  /* CTA */
  ctaSection: { padding: "0 0 80px" },
  ctaCard: { position: "relative", overflow: "hidden", maxWidth: 1280, margin: "0 auto", boxSizing: "border-box", marginLeft: "auto", marginRight: "auto", width: "calc(100% - clamp(32px, 8vw, 80px))", background: `linear-gradient(120deg, ${PINK} 0%, ${PINK_DK} 100%)`, borderRadius: 26, padding: "40px clamp(28px, 4vw, 52px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap", boxShadow: `0 26px 60px ${PINK}3a` },
  ctaGlow: { position: "absolute", top: -70, right: -40, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,.14)", pointerEvents: "none" },
  ctaTitle: { fontFamily: "'Playfair Display', serif", fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 800, margin: "0 0 8px", color: "#fff", letterSpacing: -0.5 },
  ctaSub: { color: "rgba(255,255,255,.92)", fontSize: 15.5, margin: 0, maxWidth: 520 },
  ctaBtn: { background: "#fff", color: PINK_DK, border: "none", padding: "14px 30px", borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", position: "relative", zIndex: 1, boxShadow: "0 10px 24px rgba(0,0,0,.16)" },

  /* toast */
  toast: { position: "fixed", top: 90, left: "50%", transform: "translateX(-50%)", zIndex: 1100, display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${BORDER}`, borderLeft: "4px solid #1eae5c", color: INK, padding: "13px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600, boxShadow: "0 16px 40px rgba(20,20,25,.16)", maxWidth: "90vw" },
  toastTick: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "#1eae5c", color: "#fff", fontSize: 13, flexShrink: 0 },

  /* modal */
  backdrop: { position: "fixed", inset: 0, background: "rgba(10,10,15,.55)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000 },
  modal: { background: CARD, borderRadius: 22, padding: "28px 28px 26px", width: "100%", maxWidth: 440, boxShadow: "0 30px 80px rgba(0,0,0,.32)", boxSizing: "border-box" },
  modalHead: { display: "flex", alignItems: "center", gap: 14, marginBottom: 18 },
  modalIcon: { fontSize: 28, width: 54, height: 54, flexShrink: 0, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(145deg, ${PINK}16, ${BLUE}12)`, border: `1px solid ${PINK}22` },
  modalLabel: { margin: 0, color: PINK, fontWeight: 800, letterSpacing: 2, fontSize: 11 },
  modalTitle: { margin: "2px 0 0", fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: INK },

  /* step progress */
  steps: { display: "flex", gap: 6, marginBottom: 8 },
  stepSeg: { flex: 1, height: 4, borderRadius: 4, transition: "background .3s ease" },
  stepLabel: { margin: "0 0 16px", fontSize: 12.5, fontWeight: 600, color: MUTED },

  label: { display: "block", fontSize: 13, fontWeight: 600, color: INK, marginTop: 14 },
  opt: { color: MUTED, fontWeight: 500, fontSize: 12 },

  /* delivery segmented control */
  segRow: { display: "flex", gap: 10, marginTop: 8 },
  segBtn: { flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#fff", color: MUTED, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all .2s ease" },
  segOn: { borderColor: PINK, background: PINK, color: "#fff", boxShadow: `0 8px 18px ${PINK}45` },

  modalActions: { display: "flex", gap: 12, marginTop: 24 },
  ghostBtn: { flex: 1, background: "#fff", color: INK, border: `1px solid ${BORDER}`, padding: "12px 0", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "background .2s ease" },
  confirmBtn: { flex: 1.4, justifyContent: "center", gap: 6, background: PINK, color: "#fff", border: "none", padding: "12px 0", borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: `0 10px 22px ${PINK}45`, fontFamily: "inherit", display: "inline-flex", alignItems: "center", transition: "transform .25s ease, box-shadow .25s ease" },
};