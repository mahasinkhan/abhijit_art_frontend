import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/* ══════════════════════════════════════════════════════════════
   ABHIJIT ART — Digital Marketing & Advertising  (→ /digital-marketing)
   Built from the advertising flyer: every channel we advertise on.
   On-brand pink accent + colourful channel bubbles.
   Animation: Framer Motion entrance-only (whileInView, once) +
   cheap CSS float → no scroll-jank, no perf hit.
   Requires: npm install framer-motion
   ══════════════════════════════════════════════════════════════ */

const INK = "#141419";
const MUTED = "#6c6c78";
const PINK = "#ff2e63";
const PINK_DK = "#e01b50";
const BLUE = "#2f6bff";
const VIOLET = "#8b5cf6";
const ORANGE = "#ff9d2e";
const GREEN = "#22c55e";
const RED = "#ef4444";
const SKY = "#0ea5e9";
const BORDER = "#ececf1";
const SOFT = "#f7f8fb";

/* ── inline icons ── */
type Ico = { size?: number; stroke?: number };
const b = (s: number, w: number) => ({ width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });
const ShareIcon = ({ size = 24, stroke = 2 }: Ico) => (<svg {...b(size, stroke)}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" /></svg>);
const PlayIcon = ({ size = 24, stroke = 2 }: Ico) => (<svg {...b(size, stroke)}><rect x="2" y="5" width="20" height="14" rx="3" /><polygon points="10 9 15 12 10 15" fill="currentColor" stroke="none" /></svg>);
const TvIcon = ({ size = 24, stroke = 2 }: Ico) => (<svg {...b(size, stroke)}><rect x="2" y="7" width="20" height="13" rx="2" /><polyline points="8 3 12 7 16 3" /></svg>);
const RadioIcon = ({ size = 24, stroke = 2 }: Ico) => (<svg {...b(size, stroke)}><circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.25a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" /></svg>);
const MsgIcon = ({ size = 24, stroke = 2 }: Ico) => (<svg {...b(size, stroke)}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" /></svg>);
const MailIcon = ({ size = 24, stroke = 2 }: Ico) => (<svg {...b(size, stroke)}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></svg>);
const TruckIcon = ({ size = 24, stroke = 2 }: Ico) => (<svg {...b(size, stroke)}><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>);
const ShirtIcon = ({ size = 24, stroke = 2 }: Ico) => (<svg {...b(size, stroke)}><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" /></svg>);
const CupIcon = ({ size = 24, stroke = 2 }: Ico) => (<svg {...b(size, stroke)}><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="2" x2="6" y2="4" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="14" y1="2" x2="14" y2="4" /></svg>);
const BillboardIcon = ({ size = 24, stroke = 2 }: Ico) => (<svg {...b(size, stroke)}><rect x="3" y="4" width="18" height="11" rx="2" /><path d="M9 19v-4M15 19v-4M8 22h8" /></svg>);
const MegaphoneIcon = ({ size = 24, stroke = 2 }: Ico) => (<svg {...b(size, stroke)}><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>);
const UserIcon = ({ size = 24, stroke = 2 }: Ico) => (<svg {...b(size, stroke)}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>);
const CheckIcon = ({ size = 16 }: Ico) => (<svg {...b(size, 3)}><polyline points="20 6 9 17 4 12" /></svg>);

const channels = [
  { name: "Social Media Ads", desc: "Facebook & Instagram campaigns that reach the right people.", Icon: ShareIcon, c: PINK },
  { name: "Google & YouTube Ads", desc: "Search and video ads that put you on top.", Icon: PlayIcon, c: RED },
  { name: "TV Commercials", desc: "Local TV ad design and placement.", Icon: TvIcon, c: BLUE },
  { name: "FM Radio Ads", desc: "Catchy radio spots for wide local reach.", Icon: RadioIcon, c: ORANGE },
  { name: "SMS & WhatsApp", desc: "Bulk SMS and WhatsApp marketing.", Icon: MsgIcon, c: GREEN },
  { name: "Email Marketing", desc: "Newsletters and promotional email blasts.", Icon: MailIcon, c: VIOLET },
  { name: "Vehicle Branding", desc: "Car, van and auto-rickshaw wraps.", Icon: TruckIcon, c: INK },
  { name: "Apparel Branding", desc: "Branded t-shirts, caps and uniforms.", Icon: ShirtIcon, c: SKY },
  { name: "Mug & Merchandise", desc: "Printed mugs, pens and giveaways.", Icon: CupIcon, c: PINK_DK },
  { name: "Hoardings & OOH", desc: "Billboards, bus-stops and outdoor ads.", Icon: BillboardIcon, c: ORANGE },
  { name: "On-ground Promotions", desc: "Megaphone announcements and event promos.", Icon: MegaphoneIcon, c: PINK },
  { name: "Walking / Human Ads", desc: "Sandwich-board and mascot advertising.", Icon: UserIcon, c: VIOLET },
];

const whyUs = [
  "One team for every channel",
  "Local audience expertise",
  "Creative design included",
  "Measurable results & reporting",
];

/* 8 channels arranged in a ring for the hero */
const ring = [channels[0], channels[1], channels[2], channels[3], channels[9], channels[10], channels[6], channels[5]];

const EASE: [number, number, number, number] = [0.2, 0.8, 0.2, 1];

export default function DigitalMarketing() {
  const R = 142; // ring radius (px)
  return (
    <div style={s.page}>
      {/* ── HERO ── */}
      <section style={s.hero}>
        <div style={s.glowPink} />
        <div style={s.glowOrange} />
        <div style={s.container}>
          <div className="dm-hero" style={s.heroInner}>
            <motion.div
              style={s.heroLeft}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <span style={s.pill}>● Digital Marketing & Advertising</span>
              <h1 style={s.h1}>We Put Your Brand <span style={s.h1Accent}>Everywhere</span></h1>
              <p style={s.heroSub}>
                From social media and Google ads to hoardings, vehicles and radio —
                one team to advertise your business across every channel.
              </p>
              <div style={s.heroBtns}>
                <Link to="/contact" style={s.btnPink}>Book a Free Consultation <span style={{ marginLeft: 6 }}>→</span></Link>
                <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" style={s.btnGhost}>💬 Chat on WhatsApp</a>
              </div>
              <div style={s.trustRow}>
                {whyUs.slice(0, 3).map((t) => (
                  <span key={t} style={s.trustItem}><span style={s.trustDot} />{t}</span>
                ))}
              </div>
            </motion.div>

            {/* animated channel ring */}
            <div className="dm-ringwrap" style={s.ringWrap}>
              <motion.div
                style={s.ring}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: EASE }}
              >
                <div style={s.ringCircle} />
                {/* center badge */}
                <motion.div
                  style={s.ringCenter}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.15 }}
                >
                  <MegaphoneIcon size={34} stroke={2} />
                  <span style={s.ringCenterText}>ADVERTISING</span>
                </motion.div>

                {ring.map((ch, i) => {
                  const Icon = ch.Icon;
                  const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
                  const x = Math.cos(angle) * R;
                  const y = Math.sin(angle) * R;
                  return (
                    <motion.div
                      key={ch.name}
                      className="dm-bubble"
                      style={{ ...s.bubble, left: "50%", top: "50%", marginLeft: x - 32, marginTop: y - 32, color: ch.c, animationDelay: `${i * 0.4}s` }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 240, damping: 15, delay: 0.25 + i * 0.07 }}
                    >
                      <Icon size={26} stroke={2} />
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CHANNELS ── */}
      <section style={{ background: "#fff", padding: "90px 0" }}>
        <div style={s.container}>
          <p style={s.eyebrow}>WHERE WE ADVERTISE</p>
          <h2 style={s.h2}>Every Channel, One Team</h2>
          <p style={s.lead}>We get your brand seen — online, on air, on the road and on the ground.</p>

          <div className="dm-grid">
            {channels.map((ch, i) => {
              const Icon = ch.Icon;
              return (
                <motion.div
                  key={ch.name} className="dm-card" style={s.card}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, delay: (i % 4) * 0.06, ease: EASE }}
                >
                  <span style={{ ...s.cardIcon, color: "#fff", background: `linear-gradient(145deg, ${ch.c}, ${ch.c}cc)`, boxShadow: `0 12px 24px ${ch.c}40` }}>
                    <Icon />
                  </span>
                  <h3 style={s.cardName}>{ch.name}</h3>
                  <p style={s.cardDesc}>{ch.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section style={{ background: SOFT, padding: "84px 0" }}>
        <div style={s.container}>
          <p style={s.eyebrow}>WHY ABHIJIT ART</p>
          <h2 style={s.h2}>Advertising Made Simple</h2>
          <ul className="dm-why" style={s.whyList}>
            {whyUs.map((w, i) => (
              <motion.li
                key={w} style={s.whyItem}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: EASE }}
              >
                <span style={s.whyCheck}><CheckIcon /></span>{w}
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "#fff", padding: "0 0 90px" }}>
        <div className="dm-cta" style={{ ...s.container, ...s.cta }}>
          <div style={s.ctaGlow} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={s.ctaTitle}>Ready to Get Noticed?</h2>
            <p style={s.ctaSub}>Tell us your goal — we'll build a campaign that brings real customers.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to="/contact" style={s.ctaBtnLight}>Start a Campaign</Link>
              <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" style={s.ctaBtnWa}>💬 Chat on WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .dm-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; margin-top: 52px; }
        @media (max-width: 1080px) { .dm-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 760px)  { .dm-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 460px)  { .dm-grid { grid-template-columns: 1fr; } }
        .dm-card { transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s, border-color .3s; }
        .dm-card:hover { transform: translateY(-6px); box-shadow: 0 22px 46px rgba(20,20,25,.10); border-color: ${PINK}33; }

        .dm-why { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; max-width: 760px; margin: 36px auto 0; }
        @media (max-width: 560px) { .dm-why { grid-template-columns: 1fr; } }

        @keyframes dmFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        .dm-bubble { animation: dmFloat 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .dm-bubble { animation: none !important; } }

        @media (max-width: 900px) {
          .dm-hero { flex-direction: column !important; }
          .dm-hero h1 { font-size: 42px !important; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────── styles ───────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page: { background: "#fff", color: INK, fontFamily: "'DM Sans', sans-serif" },
  container: { maxWidth: 1280, margin: "0 auto", width: "100%", boxSizing: "border-box", paddingLeft: "clamp(16px,4vw,40px)", paddingRight: "clamp(16px,4vw,40px)", position: "relative", zIndex: 1 },

  hero: { position: "relative", overflow: "hidden", padding: "80px 0", background: "linear-gradient(180deg, #fff5f8 0%, #ffffff 100%)" },
  glowPink: { position: "absolute", top: -140, left: -110, width: 480, height: 480, borderRadius: "50%", background: `radial-gradient(circle, ${PINK}1f, transparent 64%)`, pointerEvents: "none" },
  glowOrange: { position: "absolute", top: -120, right: -110, width: 480, height: 480, borderRadius: "50%", background: `radial-gradient(circle, ${ORANGE}1c, transparent 64%)`, pointerEvents: "none" },
  heroInner: { display: "flex", gap: 48, alignItems: "center" },
  heroLeft: { flex: 1, minWidth: 300 },
  pill: { display: "inline-block", background: `${PINK}12`, color: PINK_DK, border: `1px solid ${PINK}33`, padding: "7px 16px", borderRadius: 30, fontSize: 12.5, fontWeight: 700, marginBottom: 24 },
  h1: { fontFamily: "'Playfair Display', serif", fontSize: 54, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.2, margin: "0 0 22px", color: INK },
  h1Accent: { background: `linear-gradient(120deg, ${PINK} 0%, ${ORANGE} 100%)`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", fontStyle: "italic" },
  heroSub: { color: MUTED, fontSize: 17, lineHeight: 1.75, maxWidth: 480, margin: "0 0 30px" },
  heroBtns: { display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 },
  btnPink: { display: "inline-flex", alignItems: "center", background: PINK, color: "#fff", padding: "14px 28px", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 15, boxShadow: `0 14px 30px ${PINK}45` },
  btnGhost: { display: "inline-flex", alignItems: "center", background: "#fff", color: INK, padding: "14px 26px", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 15, border: `1px solid ${BORDER}` },
  trustRow: { display: "flex", flexWrap: "wrap", gap: "10px 22px" },
  trustItem: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, color: MUTED, fontWeight: 600 },
  trustDot: { width: 7, height: 7, borderRadius: "50%", background: PINK },

  /* ring */
  ringWrap: { flex: 1, minWidth: 300, display: "flex", justifyContent: "center", alignItems: "center" },
  ring: { position: "relative", width: 360, height: 360 },
  ringCircle: { position: "absolute", inset: 18, borderRadius: "50%", border: `2px dashed ${PINK}33` },
  ringCenter: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 132, height: 132, borderRadius: "50%", color: "#fff", background: `linear-gradient(145deg, ${PINK}, ${PINK_DK})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: `0 18px 40px ${PINK}55`, zIndex: 2 },
  ringCenterText: { fontSize: 11, fontWeight: 800, letterSpacing: 1.5 },
  bubble: { position: "absolute", width: 64, height: 64, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 26px rgba(20,20,25,.12)", border: `1px solid ${BORDER}`, zIndex: 1 },

  /* sections */
  eyebrow: { textAlign: "center", color: PINK, fontWeight: 800, letterSpacing: 3, fontSize: 12, margin: "0 0 12px" },
  h2: { textAlign: "center", fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 800, margin: "0 0 12px", color: INK, letterSpacing: -0.5 },
  lead: { textAlign: "center", color: MUTED, fontSize: 16, margin: 0 },

  card: { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "26px 22px", boxShadow: "0 8px 24px rgba(20,20,25,.05)" },
  cardIcon: { width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  cardName: { margin: "0 0 7px", fontSize: 17, fontWeight: 800, color: INK },
  cardDesc: { margin: 0, fontSize: 13.5, color: MUTED, lineHeight: 1.6 },

  whyList: { listStyle: "none", padding: 0 },
  whyItem: { display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: INK, fontWeight: 600, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 18px" },
  whyCheck: { width: 26, height: 26, flexShrink: 0, borderRadius: "50%", color: "#fff", background: PINK, display: "flex", alignItems: "center", justifyContent: "center" },

  cta: { background: `linear-gradient(120deg, ${PINK} 0%, ${PINK_DK} 100%)`, borderRadius: 26, padding: "54px 50px", position: "relative", overflow: "hidden", boxShadow: `0 28px 64px ${PINK}40` },
  ctaGlow: { position: "absolute", top: -80, right: -40, width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,.14)", pointerEvents: "none" },
  ctaTitle: { fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 800, margin: "0 0 12px", color: "#fff", lineHeight: 1.15 },
  ctaSub: { color: "#fff", opacity: .92, margin: "0 0 26px", fontSize: 15 },
  ctaBtnLight: { background: "#fff", color: INK, padding: "14px 28px", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 14 },
  ctaBtnWa: { background: "rgba(0,0,0,.22)", color: "#fff", padding: "14px 28px", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 14 },
};