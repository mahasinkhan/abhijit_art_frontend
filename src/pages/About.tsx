import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const INK = "#2a231d";
const MUTED = "#7c726a";
const ACCENT = "#d9542f";
const ACCENT_DK = "#b8401f";
const GOLD = "#c2974a";
const LINE = "#e6ddcd";
const CARD = "#ffffff";
const CREAM = "#fffdf8";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

type Ico = { size?: number; stroke?: number };
const base = (s: number, w: number) => ({
  width: s, height: s, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});
const Star = ({ size = 22, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><polygon points="12 2 14.9 8.6 22 9.3 16.7 14 18.2 21 12 17.3 5.8 21 7.3 14 2 9.3 9.1 8.6 12 2" /></svg>);
const Factory = ({ size = 22, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><path d="M2 20a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V8l-6 4V8l-6 4V4a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z" /><path d="M7 16h.01M11 16h.01M15 16h.01" /></svg>);
const Handshake = ({ size = 22, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
const Scissors = ({ size = 22, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>);
const Printer = ({ size = 22, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>);
const Zap = ({ size = 22, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>);
const Monitor = ({ size = 22, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>);
const Wrench = ({ size = 22, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>);
const Cpu = ({ size = 22, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" /></svg>);
const Code = ({ size = 22, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>);

const milestones = [
  { year: "2000", title: "Established", Icon: Star, desc: "Avijit Art opens its doors in Durgapur — the beginning of our journey in printing and design." },
  { year: "2005", title: "Manufacturing Facility", Icon: Factory, desc: "We set up our own manufacturing facility, bringing production fully in-house." },
  { year: "2010", title: "Business Partnerships", Icon: Handshake, desc: "Tied up with small and medium businesses across the region as a trusted production partner." },
  { year: "2014", title: "Cutting Plotter Machine", Icon: Scissors, desc: "Added a precision cutting plotter to expand our sticker and vinyl-cutting work." },
  { year: "2017", title: "Flex Printing Machine", Icon: Printer, desc: "Installed a flex printing machine for large-format banners, hoardings and signage." },
  { year: "2018", title: "Laser Cutting Machine", Icon: Zap, desc: "Brought in laser cutting for fine, intricate detailing and clean edges." },
  { year: "2019", title: "Digital Printing Machine", Icon: Monitor, desc: "Adopted digital printing for sharp, high-quality output at higher volumes." },
  { year: "2024", title: "Channel Bending Machine", Icon: Wrench, desc: "Added a channel-bending machine for premium 3D lettering and illuminated signage." },
  { year: "2025", title: "CNC Machine", Icon: Cpu, desc: "Introduced CNC machining for advanced, precise fabrication and finishing." },
  { year: "2026", title: "Software Service", Icon: Code, desc: "Expanded into software — websites, web apps and custom systems for our clients." },
];

/* hero stat + trusted-by icons */
const Award = ({ size = 30, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><circle cx="12" cy="8" r="6" /><path d="M8.2 13.9 7 23l5-3 5 3-1.2-9.1" /></svg>);
const Box = ({ size = 30, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.3 7 12 12 20.7 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>);
const Gear = ({ size = 30, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></svg>);
const GradCap = ({ size = 26, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5" /></svg>);
const Cross = ({ size = 26, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>);
const Bag = ({ size = 26, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>);
const Utensils = ({ size = 26, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><path d="M6 2v7a2 2 0 0 0 4 0V2" /><path d="M8 9v13" /><path d="M18 2c-1.7 0-3 1.8-3 4.5S16.3 11 18 11" /><path d="M18 2v20" /></svg>);
const Building = ({ size = 26, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" /></svg>);
const Calendar = ({ size = 26, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>);
const Landmark = ({ size = 26, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><line x1="3" y1="22" x2="21" y2="22" /><line x1="6" y1="18" x2="6" y2="11" /><line x1="10" y1="18" x2="10" y2="11" /><line x1="14" y1="18" x2="14" y2="11" /><line x1="18" y1="18" x2="18" y2="11" /><polygon points="12 2 20 7 4 7" /></svg>);

const heroStats = [
  { Icon: Award, n: "25+", l: "Years of Excellence" },
  { Icon: Handshake, n: "15,000+", l: "Happy Customers" },
  { Icon: Box, n: "50,000+", l: "Orders Delivered" },
  { Icon: Gear, n: "10+", l: "In-house Services" },
];

const trusted = [
  { Icon: GradCap, l: "Schools" },
  { Icon: Cross, l: "Hospitals" },
  { Icon: Bag, l: "Retail Stores" },
  { Icon: Utensils, l: "Restaurants" },
  { Icon: Building, l: "Corporates" },
  { Icon: Calendar, l: "Event Organizers" },
  { Icon: Landmark, l: "Government Offices" },
];

const services = [
  { e: "🖼️", n: "Flex Printing & Painting" },
  { e: "🔆", n: "Laser Cutting" },
  { e: "🖨️", n: "Digital Printing" },
  { e: "✂️", n: "Sticker Cutting (Plotter)" },
  { e: "📑", n: "Stamp Making" },
  { e: "🪪", n: "ID Card Holder" },
  { e: "💳", n: "PVC Card" },
  { e: "☕", n: "Cup Printing" },
  { e: "💡", n: "LED Module" },
  { e: "🪧", n: "Channel Bending Signage" },
  { e: "⚙️", n: "CNC Fabrication" },
  { e: "💻", n: "Software Service" },
];

export default function About() {
  return (
    <div style={s.page}>
      {/* ── HERO ── */}
      <section style={s.heroWrap}>
        {/* dotted decoration pinned to the hero's top-left corner */}
        <span className="ab-dots ab-dots-corner" aria-hidden />
        <div style={s.inner}>
          <div className="ab-hero-grid">
            {/* left */}
            <motion.div className="ab-hero-left" {...fadeUp}>
              <div className="ab-hero-left-body">
                <div className="ab-fancy-head">
                  <span className="ab-kicker">Since 2000</span>
                  <h1 className="ab-fancy-big">Complete Creative House</h1>
                  <span className="ab-accent-rule" aria-hidden />
                </div>
                <p style={s.heroP}>
                  For over <strong style={s.hl}>25 years</strong>, Abhijit Art has helped businesses make a
                  lasting impression — through premium printing, signage, branding, laser cutting, digital
                  displays, software and custom manufacturing.
                </p>
                <p style={s.heroP}>
                  We pair time-honoured craftsmanship with modern technology to deliver work that's precise,
                  dependable and built to stand out.
                </p>
                <div className="ab-hero-btns">
                  <Link to="/services" style={s.btnSolid}>EXPLORE SERVICES&nbsp;&nbsp;→</Link>
                  <Link to="/contact" style={s.btnOutline}>GET A QUOTE&nbsp;&nbsp;→</Link>
                </div>
              </div>
            </motion.div>

            {/* right — drop your showcase image at public/images/about/hero-showcase.png */}
            <motion.div
              className="ab-hero-media"
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <img
                src="/images/about/transparent.png"
                alt="Abhijit Art branding showcase"
                style={s.heroImg}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </motion.div>
          </div>

          {/* stat bar */}
          <motion.div className="ab-statbar" {...fadeUp}>
            {heroStats.map((st) => {
              const I = st.Icon;
              return (
                <div className="ab-statcell" key={st.l}>
                  <span style={s.statIco}><I size={32} /></span>
                  <div>
                    <div style={s.statBig}>{st.n}</div>
                    <div style={s.statSmall}>{st.l}</div>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* trusted by */}
          <motion.div className="ab-trusted" {...fadeUp}>
            <p className="ab-trusted-title">TRUSTED BY BUSINESSES<br />ACROSS WEST BENGAL</p>
            <div className="ab-trusted-list">
              {trusted.map((t) => {
                const I = t.Icon;
                return (
                  <div className="ab-trusted-item" key={t.l}>
                    <span style={s.trustIco}><I size={24} /></span>
                    <span style={s.trustLabel}>{t.l}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STORY ── */}
      <section style={s.sectionWrap}>
        <div style={s.inner}>
          <motion.div style={s.story} {...fadeUp}>
            <p style={{ ...s.eyebrow, textAlign: "left" }}>OUR STORY</p>
            <div className="ab-story-grid">
              <h2 style={s.storyHead}>Craftsmanship, modern machinery,<br />and an eye for detail.</h2>
              <div>
                <p style={s.storyP}>
                  Avijit Art is a full-service printing, design and manufacturing house. What began in 2000 as a
                  small printing shop has steadily grown into a complete production facility — and, most recently,
                  a software studio too.
                </p>
                <p style={s.storyP}>
                  We work with individuals, businesses, schools and events, pairing hands-on craftsmanship with
                  modern machinery to deliver quality work, fast turnaround and fair pricing on every order.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section style={s.sectionWrap}>
        <div style={s.inner}>
          <motion.div {...fadeUp} style={{ textAlign: "center" }}>
            <p className="ab-script-label">Our Journey</p>
          </motion.div>

          <div className="ab-tl">
            <motion.div
              className="ab-tl-line"
              style={{ transformOrigin: "top" }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
            {milestones.map((m, i) => {
              const color = i % 2 === 0 ? ACCENT : GOLD;
              const side = i % 2 === 0 ? "right" : "left";
              const Icon = m.Icon;
              return (
                <div className={`ab-tl-row ${side}`} key={m.year}>
                  <div className="ab-tl-content-wrap">
                    <motion.div
                      className="ab-tl-content"
                      initial={{ opacity: 0, x: side === "right" ? 36 : -36 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                      <p style={{ ...s.tlYear, color }}>{m.year}</p>
                      <h3 style={s.tlTitle}>{m.title}</h3>
                      <p style={s.tlDesc}>{m.desc}</p>
                    </motion.div>
                  </div>
                  <motion.div
                    className="ab-tl-node" style={{ borderColor: color, color }}
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
                  >
                    <Icon />
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section style={s.sectionWrap}>
        <div style={s.inner}>
          <motion.div {...fadeUp}>
            <p style={s.eyebrow}>WHAT WE DO</p>
            <h2 style={s.sectionTitle}>Everything under one roof.</h2>
          </motion.div>
          <div className="ab-svc-grid">
            {services.map((sv, i) => (
              <motion.div
                key={sv.n} className="ab-svc-card" style={s.svcCard}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.06, ease: "easeOut" }}
              >
                <span style={s.svcEmoji}>{sv.e}</span>
                <span style={s.svcName}>{sv.n}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VISIT + CONTACT ── */}
      <section style={{ ...s.sectionWrap, paddingBottom: 70 }}>
        <div style={s.inner}>
          <div className="ab-visit-grid">
            <motion.div style={s.visitCard} {...fadeUp}>
              <h3 style={s.visitHead}>Visit us</h3>
              <p style={s.visitLine}>📍 Durgapur, West Bengal, India</p>
              <p style={s.visitLine}>🕐 Mon – Sat: 9:00 AM – 8:00 PM</p>
              <p style={s.visitLine}>🕐 Sunday: 10:00 AM – 4:00 PM</p>
              <p style={s.visitLine}>📞 Call us for orders and enquiries</p>
            </motion.div>

            <motion.div
              style={s.contactCard}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
            >
              <h3 style={s.contactHead}>Have a custom order?</h3>
              <p style={s.contactSub}>
                Tell us what you need — we're happy to discuss your requirements and give you the best price.
              </p>
              <p style={s.contactMail}>📧 admin@avijitart.com</p>
              <Link to="/register" style={s.cta}>Book a Service →</Link>
            </motion.div>
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&display=swap');
        /* page spans the full viewport regardless of parent container width */
        html, body { overflow-x: clip; }

        /* ── Cursive section label (Pinyon Script) ── */
        .ab-script-label {
          font-family: 'Pinyon Script', 'Brush Script MT', cursive; font-weight: 400;
          font-size: clamp(40px, 6vw, 78px); line-height: 1.1; color: ${GOLD};
          margin: 0 0 8px; transform: rotate(-2deg); text-align: center;
        }

        /* ── Hero fancy heading: refined serif (reference style) ── */
        .ab-fancy-head { margin: 0 0 18px; }
        .ab-kicker {
          display: inline-flex; align-items: center; gap: 12px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px; font-weight: 700; letter-spacing: 3px;
          text-transform: uppercase; color: ${ACCENT};
          margin: 0 0 16px 2px;
        }
        .ab-kicker::before {
          content: ""; width: 30px; height: 2px; border-radius: 2px;
          background: ${ACCENT};
        }
        .ab-fancy-big {
          font-family: 'Fraunces', serif; font-weight: 500;
          font-size: clamp(30px, 3.6vw, 46px); line-height: 1.05; letter-spacing: 0.5px;
          color: ${INK}; margin: 0;
        }

        /* ── Hero left: premium decoration ── */
        .ab-hero-left { position: relative; }
        .ab-hero-left-body { position: relative; z-index: 1; }

        .ab-dots {
          position: absolute; z-index: 0; pointer-events: none;
          background-image: radial-gradient(circle, rgba(42,35,29,0.22) 2px, transparent 2.2px);
          background-size: 20px 20px;
        }
        /* field pinned to the hero's top-left corner */
        .ab-dots-corner {
          width: 190px; height: 115px;
          top: 24px; left: clamp(20px, 4vw, 80px);
          -webkit-mask-image: radial-gradient(ellipse at top left, #000 34%, transparent 74%);
                  mask-image: radial-gradient(ellipse at top left, #000 34%, transparent 74%);
        }
        @media (max-width: 920px) { .ab-dots-corner { width: 140px; height: 90px; top: 16px; } }

        .ab-accent-rule {
          display: block; width: 64px; height: 3px; border-radius: 3px;
          margin: 18px 0 6px;
          background: linear-gradient(90deg, ${ACCENT}, ${GOLD});
        }

        /* ── Hero ── */
        .ab-hero-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 40px; align-items: center; }
        @media (max-width: 920px) { .ab-hero-grid { grid-template-columns: 1fr; gap: 32px; } }
        .ab-eyebrow-line { color: ${ACCENT}; font-weight: 800; letter-spacing: 3px; font-size: 13px; margin: 0 0 20px; position: relative; padding-bottom: 12px; }
        .ab-eyebrow-line::after { content: ""; position: absolute; left: 0; bottom: 0; width: 46px; height: 3px; border-radius: 2px; background: ${ACCENT}; }
        .ab-hero-btns { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 20px; }
        .ab-hero-media { aspect-ratio: 5 / 4; width: 100%; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 70% 30%, #f6dcc6 0%, #f7f3ea 70%); }
        @media (max-width: 920px) { .ab-hero-media { max-width: 560px; margin: 0 auto; aspect-ratio: 4 / 3; } }

        .ab-statbar {
          position: relative; overflow: hidden;
          display: grid; grid-template-columns: repeat(4, 1fr);
          background: linear-gradient(180deg, #fffefb 0%, ${CREAM} 100%);
          border: 1px solid ${LINE}; border-radius: 6px;
          padding: 14px 12px; margin-top: 24px;
          box-shadow: 0 10px 30px rgba(42,35,29,0.06), 0 0 0 1px rgba(217,84,47,0.04) inset, 0 0 22px rgba(217,84,47,0.05);
          transition: box-shadow .4s ease, transform .4s ease;
        }
        .ab-statbar::before {
          content: ""; position: absolute; top: 0; left: -60%; width: 45%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent);
          transform: skewX(-18deg); animation: ab-sheen 6s ease-in-out infinite;
        }
        @keyframes ab-sheen { 0% { left: -60%; } 55% { left: 130%; } 100% { left: 130%; } }
        .ab-statbar:hover { box-shadow: 0 16px 40px rgba(42,35,29,0.10), 0 0 30px rgba(217,84,47,0.16); transform: translateY(-2px); }
        .ab-statcell { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 14px; padding: 6px 16px; border-right: 1px solid ${LINE}; }
        .ab-statcell:last-child { border-right: none; }
        @media (max-width: 820px) { .ab-statbar { grid-template-columns: repeat(2, 1fr); gap: 8px 0; } .ab-statcell:nth-child(2n) { border-right: none; } .ab-statcell { padding: 14px; } }
        @media (max-width: 440px) { .ab-statbar { grid-template-columns: 1fr; } .ab-statcell { border-right: none; border-bottom: 1px solid ${LINE}; padding: 14px; } .ab-statcell:last-child { border-bottom: none; } }

        .ab-trusted {
          position: relative; display: flex; align-items: center; gap: 28px; flex-wrap: wrap;
          background: linear-gradient(180deg, #fffefb 0%, ${CREAM} 100%);
          border: 1px solid ${LINE}; border-radius: 6px; padding: 14px 28px; margin-top: 18px;
          box-shadow: 0 10px 28px rgba(42,35,29,0.05), 0 0 18px rgba(194,151,74,0.05);
          transition: box-shadow .4s ease, transform .4s ease;
        }
        .ab-trusted:hover { box-shadow: 0 16px 38px rgba(42,35,29,0.09), 0 0 26px rgba(194,151,74,0.16); transform: translateY(-2px); }
        .ab-trusted-title { font-weight: 800; font-size: 13px; letter-spacing: 1px; color: ${INK}; margin: 0; line-height: 1.45; flex-shrink: 0; position: relative; padding-left: 0; }
        .ab-trusted-list { display: flex; flex: 1; flex-wrap: wrap; min-width: 0; }
        .ab-trusted-item { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 4px 18px; border-left: 1px solid ${LINE}; flex: 1; min-width: 96px; }
        @media (max-width: 980px) { .ab-trusted-item { border-left: none; flex: 0 0 auto; } .ab-trusted-list { gap: 20px 14px; } }

        .ab-stats { display: flex; gap: 48px; justify-content: center; flex-wrap: wrap; margin-top: 30px; }

        .ab-story-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; margin-top: 14px; }
        @media (max-width: 760px) { .ab-story-grid { grid-template-columns: 1fr; gap: 18px; } }

        /* ── Timeline — fixed-height rows + absolutely-positioned content/node ── */
        .ab-tl { position: relative; max-width: 1180px; margin: 44px auto 0; }
        .ab-tl-line { position: absolute; top: 75px; bottom: 75px; left: 50%; margin-left: -1px; width: 2px; background: ${LINE}; }
        .ab-tl-row { position: relative; height: 150px; }
        .ab-tl-content-wrap { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; width: calc(50% - 52px); }
        .ab-tl-row.right .ab-tl-content-wrap { left: calc(50% + 52px); justify-content: flex-start; }
        .ab-tl-row.left  .ab-tl-content-wrap { right: calc(50% + 52px); justify-content: flex-end; }
        .ab-tl-content { max-width: 440px; }
        .ab-tl-row.right .ab-tl-content { text-align: left; }
        .ab-tl-row.left  .ab-tl-content { text-align: right; }
        .ab-tl-node {
          position: absolute; left: 50%; margin-left: -27px; top: 50%; margin-top: -27px;
          width: 54px; height: 54px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: ${CREAM}; border: 2px solid ${ACCENT};
          box-shadow: 0 6px 18px rgba(42,35,29,0.10); z-index: 1;
        }
        @media (max-width: 720px) {
          .ab-tl-line { left: 25px; margin-left: 0; top: 28px; bottom: 28px; }
          .ab-tl-row { height: auto; min-height: 116px; }
          .ab-tl-content-wrap { position: static; width: auto; display: block; padding: 18px 0 18px 62px; }
          .ab-tl-content { max-width: none; text-align: left !important; }
          .ab-tl-node { left: 25px; margin-left: -24px; width: 48px; height: 48px; }
        }

        /* ── Services grid ── */
        .ab-svc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 34px; }
        @media (max-width: 980px) { .ab-svc-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 720px) { .ab-svc-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 460px) { .ab-svc-grid { grid-template-columns: 1fr; } }
        .ab-svc-card { transition: transform .25s ease, box-shadow .25s ease, border-color .2s ease; }
        .ab-svc-card:hover { transform: translateY(-4px); border-color: ${ACCENT}; box-shadow: 0 16px 36px rgba(42,35,29,0.10); }

        /* ── Visit grid ── */
        .ab-visit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 760px) { .ab-visit-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  /* full-bleed: ignore the parent .container max-width */
  page: { width: "100vw", marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)", color: INK, fontFamily: "'DM Sans', system-ui, sans-serif" },

  /* wide inner wrapper with comfortable side gutters */
  inner: { width: "100%", maxWidth: 1680, margin: "0 auto", padding: "0 clamp(20px, 4vw, 80px)", boxSizing: "border-box" },

  heroWrap: { position: "relative", minHeight: "calc(100vh - 92px)", display: "flex", alignItems: "center", padding: "20px 0 30px" },
  sectionWrap: { padding: "44px 0" },
  eyebrow: { textAlign: "center", color: ACCENT, fontWeight: 800, letterSpacing: 3, fontSize: 12, margin: "0 0 14px" },
  heroTitle: { fontFamily: "'Fraunces', serif", fontWeight: 800, fontSize: "clamp(34px, 4.4vw, 58px)", lineHeight: 1.06, margin: "0 0 22px", color: INK, letterSpacing: -0.5 },
  heroAccent: { backgroundImage: `linear-gradient(120deg, ${ACCENT} 0%, ${GOLD} 100%)`, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" },
  heroP: { color: MUTED, fontSize: 15, lineHeight: 1.6, margin: "0 0 10px", maxWidth: 560 },
  hl: { color: ACCENT, fontWeight: 800 },
  btnSolid: { display: "inline-flex", alignItems: "center", background: ACCENT, color: "#fff", padding: "14px 26px", borderRadius: 4, fontWeight: 800, fontSize: 13, letterSpacing: 1, textDecoration: "none", boxShadow: `0 10px 24px ${ACCENT}40` },
  btnOutline: { display: "inline-flex", alignItems: "center", background: "transparent", color: ACCENT_DK, padding: "14px 26px", borderRadius: 4, fontWeight: 800, fontSize: 13, letterSpacing: 1, textDecoration: "none", border: `1.5px solid ${ACCENT}` },
  heroImg: { width: "100%", height: "100%", display: "block", objectFit: "contain" },
  statIco: { color: ACCENT, display: "inline-flex", flexShrink: 0 },
  statBig: { fontFamily: "'Fraunces', serif", fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 800, color: ACCENT, lineHeight: 1 },
  statSmall: { fontSize: 13.5, color: MUTED, fontWeight: 600, marginTop: 4 },
  trustIco: { color: "#8a7e72", display: "inline-flex" },
  trustLabel: { fontSize: 11, fontWeight: 700, color: "#6b6258", letterSpacing: 0.5, textTransform: "uppercase", textAlign: "center", lineHeight: 1.3 },

  story: { background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: "42px clamp(28px, 4vw, 56px)", boxShadow: "0 8px 26px rgba(42,35,29,0.05)" },
  storyHead: { fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "clamp(22px, 3vw, 32px)", lineHeight: 1.2, margin: 0, color: INK },
  storyP: { color: MUTED, fontSize: 16, lineHeight: 1.8, margin: "0 0 14px" },

  sectionTitle: { textAlign: "center", fontFamily: "'Fraunces', serif", fontWeight: 800, fontSize: "clamp(26px, 4vw, 40px)", margin: "0 0 4px", color: INK, letterSpacing: -0.4 },
  titleAccent: { fontStyle: "italic", color: ACCENT },

  tlYear: { fontSize: 12, fontWeight: 800, letterSpacing: 2, margin: "0 0 6px" },
  tlTitle: { fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 700, margin: "0 0 6px", color: INK },
  tlDesc: { fontSize: 14.5, color: MUTED, lineHeight: 1.65, margin: 0 },

  svcCard: { background: CARD, border: `1px solid ${LINE}`, borderRadius: 6, padding: "24px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", boxShadow: "0 6px 18px rgba(42,35,29,0.04)" },
  svcEmoji: { fontSize: 30, lineHeight: 1 },
  svcName: { fontSize: 14.5, fontWeight: 700, color: INK },

  visitCard: { background: CREAM, border: `1px solid ${LINE}`, borderRadius: 8, padding: "34px clamp(28px, 3vw, 44px)", boxShadow: "0 6px 20px rgba(42,35,29,0.05)" },
  visitHead: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, margin: "0 0 16px", color: ACCENT },
  visitLine: { color: MUTED, fontSize: 15.5, margin: "0 0 12px", lineHeight: 1.5 },
  contactCard: { background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DK} 100%)`, borderRadius: 8, padding: "34px clamp(28px, 3vw, 44px)", color: "#fff", boxShadow: `0 18px 44px ${ACCENT}33` },
  contactHead: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, margin: "0 0 10px", color: "#fff" },
  contactSub: { color: "rgba(255,255,255,0.92)", fontSize: 15.5, lineHeight: 1.65, margin: "0 0 16px" },
  contactMail: { color: "#fff", fontWeight: 700, fontSize: 15.5, margin: "0 0 20px" },
  cta: { display: "inline-block", background: "#fff", color: ACCENT_DK, padding: "12px 26px", borderRadius: 4, fontWeight: 800, fontSize: 15, textDecoration: "none", boxShadow: "0 8px 20px rgba(0,0,0,0.12)" },
};