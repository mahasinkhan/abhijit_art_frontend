import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/* ══════════════════════════════════════════════════════════════
   ABHIJIT ART — Digital Marketing & Advertising  (→ /digital-marketing)
   Hero visual: plain static image, no frame / circle / card.
     public/images/Digital_Marketing/digital_marketing.png
     →  referenced as /images/Digital_Marketing/digital_marketing.png
   Rest of the page unchanged (channels grid, why-us, CTA).
   Requires: npm install framer-motion
   ══════════════════════════════════════════════════════════════ */

/* ── Site tokens ── */
const IVORY = "#f7f3ea";
const INK = "#2a231d";
const TERRA = "#d9542f";
const GOLD = "#c2974a";
const CLAY = "#b8452a";
const BRASS = "#a8823c";
const MUTED = "#6f6257";
const BORDER = "#e6ddcd";
const CARD = "#fffdf8";

const DISPLAY = "'Fraunces', 'Playfair Display', serif";
const BODY = "'DM Sans', sans-serif";
const SCRIPT = "'Pinyon Script', cursive";

/* ── inline icons ── */
type Ico = { size?: number; stroke?: number };
const b = (s: number, w: number) => ({ width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });
const ShareIcon = ({ size = 24, stroke = 1.7 }: Ico) => (<svg {...b(size, stroke)}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" /></svg>);
const PlayIcon = ({ size = 24, stroke = 1.7 }: Ico) => (<svg {...b(size, stroke)}><rect x="2" y="5" width="20" height="14" rx="3" /><polygon points="10 9 15 12 10 15" fill="currentColor" stroke="none" /></svg>);
const TvIcon = ({ size = 24, stroke = 1.7 }: Ico) => (<svg {...b(size, stroke)}><rect x="2" y="7" width="20" height="13" rx="2" /><polyline points="8 3 12 7 16 3" /></svg>);
const RadioIcon = ({ size = 24, stroke = 1.7 }: Ico) => (<svg {...b(size, stroke)}><circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.25a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" /></svg>);
const MsgIcon = ({ size = 24, stroke = 1.7 }: Ico) => (<svg {...b(size, stroke)}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" /></svg>);
const MailIcon = ({ size = 24, stroke = 1.7 }: Ico) => (<svg {...b(size, stroke)}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></svg>);
const TruckIcon = ({ size = 24, stroke = 1.7 }: Ico) => (<svg {...b(size, stroke)}><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>);
const ShirtIcon = ({ size = 24, stroke = 1.7 }: Ico) => (<svg {...b(size, stroke)}><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" /></svg>);
const CupIcon = ({ size = 24, stroke = 1.7 }: Ico) => (<svg {...b(size, stroke)}><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="2" x2="6" y2="4" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="14" y1="2" x2="14" y2="4" /></svg>);
const BillboardIcon = ({ size = 24, stroke = 1.7 }: Ico) => (<svg {...b(size, stroke)}><rect x="3" y="4" width="18" height="11" rx="2" /><path d="M9 19v-4M15 19v-4M8 22h8" /></svg>);
const MegaphoneIcon = ({ size = 24, stroke = 1.7 }: Ico) => (<svg {...b(size, stroke)}><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>);
const UserIcon = ({ size = 24, stroke = 1.7 }: Ico) => (<svg {...b(size, stroke)}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>);
const CheckIcon = ({ size = 15 }: Ico) => (<svg {...b(size, 2.6)}><polyline points="20 6 9 17 4 12" /></svg>);

const channels = [
  { name: "Social Media Ads", desc: "Facebook and Instagram campaigns that reach the right people.", Icon: ShareIcon, c: TERRA },
  { name: "Google & YouTube Ads", desc: "Search and video ads that put you on top.", Icon: PlayIcon, c: GOLD },
  { name: "TV Commercials", desc: "Local TV ad design and placement.", Icon: TvIcon, c: CLAY },
  { name: "FM Radio Ads", desc: "Catchy radio spots for wide local reach.", Icon: RadioIcon, c: BRASS },
  { name: "SMS & WhatsApp", desc: "Bulk SMS and WhatsApp marketing.", Icon: MsgIcon, c: TERRA },
  { name: "Email Marketing", desc: "Newsletters and promotional email blasts.", Icon: MailIcon, c: GOLD },
  { name: "Vehicle Branding", desc: "Car, van and auto-rickshaw wraps.", Icon: TruckIcon, c: CLAY },
  { name: "Apparel Branding", desc: "Branded t-shirts, caps and uniforms.", Icon: ShirtIcon, c: BRASS },
  { name: "Mug & Merchandise", desc: "Printed mugs, pens and giveaways.", Icon: CupIcon, c: TERRA },
  { name: "Hoardings & OOH", desc: "Billboards, bus-stops and outdoor ads.", Icon: BillboardIcon, c: GOLD },
  { name: "On-ground Promotions", desc: "Megaphone announcements and event promos.", Icon: MegaphoneIcon, c: CLAY },
  { name: "Walking / Human Ads", desc: "Sandwich-board and mascot advertising.", Icon: UserIcon, c: BRASS },
];

const whyUs = [
  "One team for every channel",
  "Local audience expertise",
  "Creative design included",
  "Measurable results & reporting",
];

const EASE: [number, number, number, number] = [0.2, 0.8, 0.2, 1];

export default function DigitalMarketing() {
  return (
    <div style={s.page}>
      {/* ══ HERO ══ */}
      <section style={s.hero}>
        <div style={s.container}>
          <div className="dm-hero" style={s.heroInner}>
            <motion.div
              style={s.heroLeft}
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <p style={s.eyebrowLeft}><span style={s.eyebrowRule} />DIGITAL MARKETING · SINCE 2000</p>
              <h1 style={s.h1}>
                We Put Your Brand<br />
                <span style={s.h1Accent}>Everywhere.</span>
              </h1>
              <div style={s.heroRule} />
              <p style={s.heroSub}>
                From social media and Google ads to hoardings, vehicles and radio —
                one team to advertise your business across every channel.
              </p>
              <div style={s.heroBtns}>
                <Link to="/contact" style={s.btnSolid}>BOOK A FREE CONSULTATION <span style={{ marginLeft: 8 }}>→</span></Link>
                <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" style={s.btnGhost}>CHAT ON WHATSAPP</a>
              </div>
              <div style={s.trustRow}>
                {whyUs.slice(0, 3).map((t) => (
                  <span key={t} style={s.trustItem}><span style={s.trustDot} />{t}</span>
                ))}
              </div>
            </motion.div>

            {/* hero image — plain, no frame */}
            <motion.div
              className="dm-heroimg"
              style={s.heroImgWrap}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <img
                src="/images/Digital_Marketing/digital_marketing.png"
                alt="Abhijit Art — digital marketing & advertising"
                style={s.heroImg}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ CHANNELS ══ */}
      <section style={s.section}>
        <div style={s.container}>
          <p style={s.eyebrow}>WHERE WE ADVERTISE</p>
          <h2 style={s.h2}>Every Channel, <span style={s.italicAccent}>One Team</span></h2>
          <p style={s.lead}>We get your brand seen — online, on air, on the road and on the ground.</p>

          <div className="dm-grid">
            {channels.map((ch, i) => {
              const Icon = ch.Icon;
              return (
                <motion.div
                  key={ch.name} className="dm-card" style={s.card}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, delay: (i % 4) * 0.06, ease: EASE }}
                >
                  <span style={{ ...s.cardIcon, color: ch.c, borderColor: `${ch.c}44`, background: `${ch.c}12` }}>
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

      {/* ══ WHY US ══ */}
      <section style={{ ...s.section, paddingTop: 0 }}>
        <div style={s.container}>
          <p style={s.eyebrow}>WHY ABHIJIT ART</p>
          <h2 style={s.h2}>Advertising Made <span style={s.italicAccent}>Simple</span></h2>
          <p style={s.lead}>One point of contact, one invoice, and creative that stays on brand across every channel.</p>
          <ul className="dm-why" style={s.whyList}>
            {whyUs.map((w, i) => (
              <motion.li
                key={w} style={s.whyItem}
                initial={{ opacity: 0, y: 14 }}
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

      {/* ══ CTA ══ */}
      <section style={s.ctaSection}>
        <div style={s.container}>
          <div className="dm-cta" style={s.cta}>
            <div style={s.ctaGlow} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <p style={s.ctaScript}>ready when you are</p>
              <h2 style={s.ctaTitle}>Tell us your goal — we&rsquo;ll<br />build the campaign around it.</h2>
              <p style={s.ctaSub}>Free consultation, clear budgets, and reporting you can actually read.</p>
            </div>
            <div style={{ ...s.ctaBtns, position: "relative", zIndex: 1 }}>
              <Link to="/contact" style={s.ctaBtnSolid}>START A CAMPAIGN</Link>
              <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" style={s.ctaBtnGhost}>CHAT ON WHATSAPP</a>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        /* Reset only the page wrapper (not the header) so this page runs
           edge-to-edge and sits flush under the floating header.
           Scoped to this page — reverts when you navigate away.
           No overflow-x on html/body: that breaks the sticky header. */
        main {
          padding-top: 0 !important;
          margin-top: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          max-width: none !important;
          width: 100% !important;
        }

        .dm-hero { display: grid; grid-template-columns: 1.05fr 1fr; gap: clamp(32px, 5vw, 72px); align-items: center; }
        @media (max-width: 940px) { .dm-hero { grid-template-columns: 1fr; } }
        @media (max-width: 940px) { .dm-heroimg { min-height: auto; margin-top: 6px; } }

        .dm-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 50px; }
        @media (max-width: 1080px) { .dm-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 760px)  { .dm-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 460px)  { .dm-grid { grid-template-columns: 1fr; } }
        .dm-card { transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s, border-color .35s; }
        .dm-card:hover { transform: translateY(-6px); box-shadow: 0 22px 46px rgba(42,35,29,.10); border-color: ${TERRA}55; }

        .dm-why { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; max-width: 820px; margin: 40px auto 0; }
        @media (max-width: 560px) { .dm-why { grid-template-columns: 1fr; } }

        @media (max-width: 880px) { .dm-cta { flex-direction: column !important; align-items: flex-start !important; } }

        a:focus-visible, button:focus-visible { outline: 2px solid ${TERRA}; outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) {
          .dm-card { transition: none; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────── styles ───────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page: { background: IVORY, color: INK, fontFamily: BODY },
  container: { maxWidth: "none", margin: "0 auto", width: "100%", boxSizing: "border-box", paddingLeft: "clamp(18px,3.2vw,56px)", paddingRight: "clamp(18px,3.2vw,56px)" },

  /* ── Hero ── */
  hero: { background: IVORY, paddingTop: "clamp(16px, 2.4vw, 34px)", paddingBottom: "clamp(48px, 7vw, 80px)" },
  heroInner: {},
  heroLeft: {},
  eyebrowLeft: { display: "flex", alignItems: "center", gap: 14, color: TERRA, fontWeight: 700, letterSpacing: 3, fontSize: 12.5, margin: "0 0 22px" },
  eyebrowRule: { display: "inline-block", width: 40, height: 2, background: TERRA, borderRadius: 2 },
  h1: { fontFamily: DISPLAY, fontSize: "clamp(42px, 6vw, 76px)", fontWeight: 800, lineHeight: 1.02, letterSpacing: -1.2, margin: 0, color: INK },
  h1Accent: { color: TERRA },
  heroRule: { width: 82, height: 3, background: GOLD, borderRadius: 3, margin: "26px 0 22px" },
  heroSub: { color: MUTED, fontSize: "clamp(15px, 1.5vw, 17.5px)", lineHeight: 1.75, maxWidth: 520, margin: 0 },
  heroBtns: { display: "flex", gap: 14, flexWrap: "wrap", margin: "34px 0 30px" },
  trustRow: { display: "flex", flexWrap: "wrap", gap: "10px 26px" },
  trustItem: { display: "inline-flex", alignItems: "center", gap: 9, fontSize: 13.5, color: MUTED, fontWeight: 600 },
  trustDot: { width: 6, height: 6, borderRadius: "50%", background: GOLD },

  btnSolid: { display: "inline-flex", alignItems: "center", background: TERRA, color: "#fff", padding: "16px 30px", borderRadius: 4, textDecoration: "none", fontWeight: 700, fontSize: 13, letterSpacing: 1.6, boxShadow: `0 14px 30px ${TERRA}33` },
  btnGhost: { display: "inline-flex", alignItems: "center", background: "transparent", color: INK, padding: "16px 30px", borderRadius: 4, textDecoration: "none", fontWeight: 700, fontSize: 13, letterSpacing: 1.6, border: `1px solid ${INK}33` },

  /* ── Hero image — plain, no frame ── */
  heroImgWrap: { position: "relative", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 380 },
  heroImg: { width: "100%", maxWidth: 540, height: "auto", display: "block", objectFit: "contain" },

  /* ── Sections ── */
  section: { background: IVORY, padding: "clamp(64px, 9vw, 104px) 0" },
  eyebrow: { textAlign: "center", color: TERRA, fontWeight: 700, letterSpacing: 3, fontSize: 12.5, margin: "0 0 16px" },
  h2: { textAlign: "center", fontFamily: DISPLAY, fontSize: "clamp(32px, 4.4vw, 52px)", fontWeight: 800, margin: "0 0 14px", color: INK, letterSpacing: -0.8, lineHeight: 1.1 },
  italicAccent: { fontStyle: "italic", color: TERRA },
  lead: { textAlign: "center", color: MUTED, fontSize: 16.5, lineHeight: 1.7, margin: "0 auto", maxWidth: 620 },

  card: { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "28px 24px", boxShadow: "0 6px 20px rgba(42,35,29,.04)" },
  cardIcon: { width: 52, height: 52, borderRadius: 4, border: "1px solid", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  cardName: { margin: "0 0 9px", fontFamily: DISPLAY, fontSize: 19, fontWeight: 800, color: INK, letterSpacing: -0.2 },
  cardDesc: { margin: 0, fontSize: 14, color: MUTED, lineHeight: 1.7 },

  whyList: { listStyle: "none", padding: 0 },
  whyItem: { display: "flex", alignItems: "center", gap: 13, fontSize: 15.5, color: INK, fontWeight: 600, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "17px 20px" },
  whyCheck: { width: 26, height: 26, flexShrink: 0, borderRadius: "50%", color: "#fff", background: TERRA, display: "flex", alignItems: "center", justifyContent: "center" },

  /* ── CTA ── */
  ctaSection: { background: IVORY, padding: "0 0 clamp(64px, 9vw, 104px)" },
  cta: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 40, flexWrap: "wrap", background: INK, borderRadius: 8, padding: "clamp(38px, 5vw, 64px) clamp(28px, 4vw, 60px)", position: "relative", overflow: "hidden" },
  ctaGlow: { position: "absolute", top: -120, right: -80, width: 380, height: 380, borderRadius: "50%", background: `${GOLD}22`, pointerEvents: "none" },
  ctaScript: { fontFamily: SCRIPT, fontSize: 30, color: GOLD, margin: "0 0 8px", lineHeight: 1 },
  ctaTitle: { fontFamily: DISPLAY, fontSize: "clamp(28px, 3.6vw, 44px)", fontWeight: 800, margin: "0 0 14px", color: "#fdfaf4", lineHeight: 1.15, letterSpacing: -0.6 },
  ctaSub: { color: "#d8ccbd", margin: 0, fontSize: 15.5, lineHeight: 1.7, maxWidth: 520 },
  ctaBtns: { display: "flex", gap: 12, flexWrap: "wrap" },
  ctaBtnSolid: { background: TERRA, color: "#fff", padding: "16px 30px", borderRadius: 4, textDecoration: "none", fontWeight: 700, fontSize: 13, letterSpacing: 1.6 },
  ctaBtnGhost: { background: "transparent", color: "#fdfaf4", padding: "16px 30px", borderRadius: 4, textDecoration: "none", fontWeight: 700, fontSize: 13, letterSpacing: 1.6, border: "1px solid rgba(253,250,244,.35)" },
};