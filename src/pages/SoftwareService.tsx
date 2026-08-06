import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* ══════════════════════════════════════════════════════════════
   ABHIJIT ART — Software Service  (→ /software-service)
   Redesigned to match Home / About / Services:
   flat ivory background, Fraunces + DM Sans, terracotta + gold.
   Hero is real markup (eyebrow · headline · copy · buttons on the
   left, crossfading industry showcase on the right).
   Images: public/images/software/
   Team photos: public/images/software/team/
   ══════════════════════════════════════════════════════════════ */

/* ── Site tokens (same as Home/About/Services) ── */
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

type Ico = { size?: number; stroke?: number };
const base = (s: number, w: number) => ({
  width: s, height: s, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});
const CloudIcon = ({ size = 26, stroke = 1.7 }: Ico) => (<svg {...base(size, stroke)}><path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5 1.5A4 4 0 0 0 6 19z" /><path d="m8 13 2-2 2 2 2-2" /></svg>);
const CartIcon = ({ size = 26, stroke = 1.7 }: Ico) => (<svg {...base(size, stroke)}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>);
const UsersIcon = ({ size = 26, stroke = 1.7 }: Ico) => (<svg {...base(size, stroke)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
const BuildingIcon = ({ size = 26, stroke = 1.7 }: Ico) => (<svg {...base(size, stroke)}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" /></svg>);
const ChartIcon = ({ size = 26, stroke = 1.7 }: Ico) => (<svg {...base(size, stroke)}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>);
const CodeIcon = ({ size = 26, stroke = 1.7 }: Ico) => (<svg {...base(size, stroke)}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>);

/* Team social icons */
const LinkedInIcon = ({ size = 17 }: Ico) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.5c0-1.3-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21h-4z" />
  </svg>
);
const MailIcon = ({ size = 17, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></svg>);

const industries = [
  { img: "/images/software/ecommerce.jpeg", label: "E-Commerce" },
  { img: "/images/software/hospitals_clinics.jpeg", label: "Hospitals & Clinics" },
  { img: "/images/software/hotel_resturant.jpeg", label: "Hotels & Restaurants" },
  { img: "/images/software/real_estate.jpeg", label: "Real Estate" },
  { img: "/images/software/travel_agency.jpeg", label: "Travel & Tourism" },
  { img: "/images/software/gym_fitness.jpeg", label: "Gym & Fitness" },
  { img: "/images/software/food_manufacturing.jpeg", label: "Food & Manufacturing" },
  { img: "/images/software/school_coaching.jpeg", label: "Coaching Centres & Schools" },
];

const solutions = [
  { name: "SaaS Applications", desc: "Scalable, multi-tenant platforms built to grow with you.", Icon: CloudIcon, c: TERRA },
  { name: "E-Commerce", desc: "Online stores with payments, inventory and order tracking.", Icon: CartIcon, c: GOLD },
  { name: "HRMS", desc: "Attendance, payroll, leave and employee records in one place.", Icon: UsersIcon, c: CLAY },
  { name: "Management Systems", desc: "Custom admin panels to run the day-to-day without spreadsheets.", Icon: BuildingIcon, c: BRASS },
  { name: "ERP", desc: "Enterprise resource planning shaped around your workflow.", Icon: ChartIcon, c: TERRA },
  { name: "Custom Software", desc: "Bespoke web and business software built around your needs.", Icon: CodeIcon, c: GOLD },
];

/* ── Tech stack shown in the moving marquee (logos via Simple Icons CDN) ── */
const tech = [
  { name: "React", slug: "react" },
  { name: "Next.js", slug: "nextdotjs" },
  { name: "Node.js", slug: "nodedotjs" },
  { name: "Laravel", slug: "laravel" },
  { name: "Flutter", slug: "flutter" },
  { name: "Dart", slug: "dart" },
  { name: "MongoDB", slug: "mongodb" },
  { name: "MySQL", slug: "mysql" },
  { name: "JavaScript", slug: "javascript" },
  { name: "Python", slug: "python" },
  { name: "PostgreSQL", slug: "postgresql" },
  { name: "AWS", slug: "amazonwebservices" },
  { name: "GitHub", slug: "github" },
];

/* ── TEAM members ── */
const team = [
  {
    cat: "LEADERSHIP",
    name: "Mahasin Khan",
    role: "TEAM LEAD",
    img: "/images/software/team/mahasin-khan.jpg",
    linkedin: "#",
    email: "mahasin@abhijitart.com",
    quote: "Lead with clarity, deliver with care.",
    desc: "3+ years leading full-stack delivery teams. Worked in London, UK and shipped 25+ industry-level projects from concept to launch.",
  },
  {
    cat: "ENGINEERING",
    name: "Jyotiprova Ghosh",
    role: "SOFTWARE ENGINEER",
    img: "/images/software/team/jyotiprova-ghosh.jpg",
    linkedin: "#",
    email: "jyotiprova@abhijitart.com",
    quote: "Clean code is the quiet kind of craft.",
    desc: "2+ years building robust web & software solutions. Worked in London, UK and contributed to 25+ industry-level projects.",
  },
];

export default function SoftwareService() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((p) => (p + 1) % industries.length), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={s.page}>
      {/* ══ HERO ══ */}
      <section style={{ ...s.bleed, ...s.heroSection }}>
        <div style={{ ...s.container, ...s.heroInner }} className="sw-hero">
          {/* left — copy */}
          <div style={s.heroCopy}>
            <p style={s.eyebrowLeft}><span style={s.eyebrowRule} />SOFTWARE SERVICE · SINCE 2000</p>
            <h1 style={s.h1}>
              Software That Runs<br />
              <span style={s.h1Accent}>Your Business.</span>
            </h1>
            <div style={s.heroRule} />
            <p style={s.heroLead}>
              From e-commerce stores to HRMS, ERP and custom platforms — we design,
              build and maintain the software your business actually works on.
            </p>
            <div style={s.heroBtns}>
              <a href="#solutions" style={s.btnSolid}>EXPLORE SOLUTIONS <span style={{ marginLeft: 8 }}>→</span></a>
              <Link to="/contact" style={s.btnGhost}>GET A FREE QUOTE</Link>
            </div>
            <div style={s.stats} className="sw-stats">
              {[["25+", "Projects delivered"], ["8", "Industries served"], ["100%", "In-house build"]].map(([n, l]) => (
                <div key={l} style={s.stat}>
                  <span style={s.statNum}>{n}</span>
                  <span style={s.statLabel}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* right — crossfading industry showcase */}
          <div style={s.heroMedia}>
            <div style={s.heroBlob} />
            <div style={s.showcase}>
              {industries.map((it, i) => (
                <img key={it.img} src={it.img} alt={it.label}
                  style={{ ...s.slide, opacity: i === idx ? 1 : 0 }} />
              ))}
              <div style={s.showcaseShade} />
              <span style={s.showcaseChip}>{industries[idx].label}</span>
            </div>
            <div style={s.dots}>
              {industries.map((it, i) => (
                <button key={it.img} aria-label={`Show ${it.label}`} onClick={() => setIdx(i)}
                  style={{ ...s.dot, ...(i === idx ? s.dotActive : {}) }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ SOLUTIONS ══ */}
      <section id="solutions" style={{ ...s.bleed, ...s.section }}>
        <div style={s.container}>
          <p style={s.eyebrow}>WHAT WE BUILD</p>
          <h2 style={s.h2}>Complete Solutions for <span style={s.italicAccent}>Every Business</span></h2>
          <p style={s.lead}>Modern, scalable and secure software — built end to end, and looked after long after launch.</p>

          <div className="sw-grid">
            {solutions.map((it) => {
              const Icon = it.Icon;
              return (
                <div key={it.name} className="sw-card" style={s.solCard}>
                  <span style={{ ...s.solIcon, color: it.c, borderColor: `${it.c}44`, background: `${it.c}12` }}><Icon /></span>
                  <h3 style={s.solName}>{it.name}</h3>
                  <p style={s.solDesc}>{it.desc}</p>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: 46 }}>
            <Link to="/contact" style={s.btnSolid}>GET A FREE QUOTE <span style={{ marginLeft: 8 }}>→</span></Link>
          </div>
        </div>
      </section>

      {/* ══ TECH MARQUEE ══ */}
      <section className="sw-marquee" style={{ ...s.bleed, ...s.marqueeSection }} aria-label="Technologies we use">
        <div style={s.container}>
          <p style={s.eyebrow}>OUR STACK</p>
          <h2 style={{ ...s.h2, marginBottom: 32 }}>The Tools We <span style={s.italicAccent}>Build With</span></h2>
        </div>
        <div style={s.marqueeViewport}>
          <div style={{ ...s.marqueeFade, left: 0, background: `linear-gradient(90deg, ${IVORY} 0%, rgba(247,243,234,0) 100%)` }} />
          <div style={{ ...s.marqueeFade, right: 0, background: `linear-gradient(270deg, ${IVORY} 0%, rgba(247,243,234,0) 100%)` }} />
          <div className="sw-marquee-track">
            {[0, 1].map((g) => (
              <div className="sw-marquee-group" key={g} aria-hidden={g === 1}>
                {[...tech, ...tech].map((t, i) => (
                  <span key={`${g}-${i}`} style={s.techPill}>
                    <img
                      src={`https://cdn.simpleicons.org/${t.slug}`}
                      alt={`${t.name} logo`}
                      style={s.techLogo}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                    {t.name}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TEAM ══ */}
      <section style={{ ...s.bleed, ...s.section }}>
        <div style={s.container}>
          <div className="sw-team-head" style={s.teamHead}>
            <div>
              <p style={s.eyebrowLeft}><span style={s.eyebrowRule} />THE STUDIO</p>
              <h2 style={s.teamTitle}>
                The people behind<br />
                <span style={s.teamTitleAccent}>the products</span>
              </h2>
            </div>
            <p style={s.teamIntro}>
              A compact team of senior professionals, personally committed to the outcome
              of every project we take on.
            </p>
          </div>

          <div className="sw-team-grid">
            {team.map((m) => (
              <article key={m.name} className="sw-team-card" style={s.teamCard}>
                <div style={s.teamMediaWrap}>
                  <img src={m.img} alt={m.name} style={s.teamImg} />
                  <div style={s.teamOverlay} />

                  <div style={s.teamBadge}>{m.cat}</div>

                  <div style={s.teamSocials}>
                    <a href={m.linkedin} target="_blank" rel="noreferrer" style={s.teamSocialBtn} aria-label={`${m.name} on LinkedIn`}><LinkedInIcon /></a>
                    <a href={`mailto:${m.email}`} style={s.teamSocialBtn} aria-label={`Email ${m.name}`}><MailIcon /></a>
                  </div>

                  <div style={s.teamCaption}>
                    <p style={s.teamQuote}><span style={s.teamQuoteMark}>“</span>{m.quote}</p>
                    <div style={s.teamRule} />
                    <h3 style={s.teamName}>{m.name}</h3>
                    <p style={s.teamRole}>{m.role}</p>
                  </div>
                </div>
                <p style={s.teamDesc}>{m.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ ...s.bleed, ...s.ctaSection }}>
        <div style={s.container}>
          <div className="sw-cta" style={s.cta}>
            <div style={s.ctaGlow} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <p style={s.ctaScript}>let&rsquo;s begin</p>
              <h2 style={s.ctaTitle}>Tell us your idea — we&rsquo;ll<br />build it into a product.</h2>
              <p style={s.ctaSub}>Free consultation, clear timelines, and one team from design to launch.</p>
            </div>
            <div style={{ ...s.ctaBtns, position: "relative", zIndex: 1 }}>
              <Link to="/contact" style={s.ctaBtnSolid}>START YOUR PROJECT</Link>
              <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" style={s.ctaBtnGhost}>CHAT ON WHATSAPP</a>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        /* Reset only the page wrapper (not the header) so this page runs
           edge-to-edge and sits flush under the floating header.
           Scoped to this page — reverts when you navigate away.
           NOTE: no overflow-x on html/body — that breaks position: sticky
           on the header and makes it jitter while scrolling. */
        main {
          padding-top: 0 !important;
          margin-top: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          max-width: none !important;
          width: 100% !important;
        }

        .sw-hero { display: grid; grid-template-columns: 1.05fr 1fr; gap: clamp(32px, 5vw, 72px); align-items: center; }
        @media (max-width: 940px) { .sw-hero { grid-template-columns: 1fr; } }
        .sw-stats { display: flex; gap: clamp(24px, 4vw, 48px); flex-wrap: wrap; }

        .sw-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 50px; }
        @media (max-width: 900px) { .sw-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .sw-grid { grid-template-columns: 1fr; } }
        .sw-card { transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s, border-color .35s; }
        .sw-card:hover { transform: translateY(-6px); box-shadow: 0 22px 46px rgba(42,35,29,.10); border-color: ${TERRA}55; }

        .sw-marquee-track { display: flex; width: max-content; animation: sw-scroll 45s linear infinite; will-change: transform; }
        .sw-marquee-group { display: flex; flex-shrink: 0; }
        .sw-marquee:hover .sw-marquee-track { animation-play-state: paused; }
        @keyframes sw-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        .sw-team-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 28px; }
        .sw-team-card { transition: transform .35s cubic-bezier(.2,.8,.2,1); }
        .sw-team-card:hover { transform: translateY(-6px); }
        .sw-team-card:hover img { transform: scale(1.04); }
        @media (max-width: 760px) {
          .sw-team-grid { grid-template-columns: 1fr; }
          .sw-team-head { flex-direction: column !important; align-items: flex-start !important; }
        }

        @media (max-width: 880px) { .sw-cta { flex-direction: column !important; align-items: flex-start !important; text-align: left; } }

        a:focus-visible, button:focus-visible { outline: 2px solid ${TERRA}; outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) {
          .sw-marquee-track { animation: none; }
          .sw-card, .sw-team-card, .sw-team-card img { transition: none; }
        }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { background: IVORY, color: INK, fontFamily: BODY },
  container: { maxWidth: "none", margin: "0 auto", width: "100%", boxSizing: "border-box", paddingLeft: "clamp(18px,3.2vw,56px)", paddingRight: "clamp(18px,3.2vw,56px)" },
  /* sections already span the wrapper (main is reset above), so no 100vw
     trick is needed — 100vw includes the scrollbar and causes the shake */
  bleed: { width: "100%", background: IVORY },

  /* ── Hero ── */
  heroSection: { paddingTop: "clamp(16px, 2.4vw, 34px)", paddingBottom: "clamp(48px, 7vw, 80px)" },
  heroInner: {},
  heroCopy: {},
  eyebrowLeft: { display: "flex", alignItems: "center", gap: 14, color: TERRA, fontWeight: 700, letterSpacing: 3, fontSize: 12.5, margin: "0 0 22px" },
  eyebrowRule: { display: "inline-block", width: 40, height: 2, background: TERRA, borderRadius: 2 },
  h1: { fontFamily: DISPLAY, fontSize: "clamp(42px, 6vw, 76px)", fontWeight: 800, lineHeight: 1.02, letterSpacing: -1.2, margin: 0, color: INK },
  h1Accent: { color: TERRA },
  heroRule: { width: 82, height: 3, background: GOLD, borderRadius: 3, margin: "26px 0 22px" },
  heroLead: { color: MUTED, fontSize: "clamp(15px, 1.5vw, 17.5px)", lineHeight: 1.75, maxWidth: 520, margin: 0 },
  heroBtns: { display: "flex", gap: 14, flexWrap: "wrap", margin: "34px 0 42px" },

  btnSolid: { display: "inline-flex", alignItems: "center", background: TERRA, color: "#fff", padding: "16px 30px", borderRadius: 4, textDecoration: "none", fontWeight: 700, fontSize: 13, letterSpacing: 1.6, boxShadow: `0 14px 30px ${TERRA}33` },
  btnGhost: { display: "inline-flex", alignItems: "center", background: "transparent", color: INK, padding: "16px 30px", borderRadius: 4, textDecoration: "none", fontWeight: 700, fontSize: 13, letterSpacing: 1.6, border: `1px solid ${INK}33` },

  stats: {},
  stat: { display: "flex", flexDirection: "column", gap: 4 },
  statNum: { fontFamily: DISPLAY, fontSize: 30, fontWeight: 800, color: INK, lineHeight: 1 },
  statLabel: { fontSize: 12.5, letterSpacing: 1, color: MUTED, textTransform: "uppercase" },

  heroMedia: { position: "relative", display: "flex", flexDirection: "column", alignItems: "center" },
  heroBlob: { position: "absolute", top: "-6%", right: "-10%", width: "78%", aspectRatio: "1", borderRadius: "50%", background: "#efe4d2", zIndex: 0 },
  showcase: { position: "relative", zIndex: 1, width: "100%", aspectRatio: "16 / 9", borderRadius: 6, overflow: "hidden", background: IVORY, boxShadow: "0 30px 70px rgba(42,35,29,.16)", border: `1px solid ${BORDER}` },
  slide: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", transition: "opacity .9s ease" },
  showcaseShade: { display: "none" },
  showcaseChip: { position: "absolute", left: 16, bottom: 16, zIndex: 2, background: "rgba(255,253,248,.96)", color: INK, padding: "9px 16px", borderRadius: 3, fontSize: 12, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", border: `1px solid ${BORDER}`, boxShadow: "0 6px 18px rgba(42,35,29,.12)" },
  dots: { position: "relative", zIndex: 1, display: "flex", gap: 7, marginTop: 20, flexWrap: "wrap", justifyContent: "center" },
  dot: { width: 8, height: 8, padding: 0, borderRadius: 99, border: "none", cursor: "pointer", background: "#d8cdb9", transition: "all .3s ease" },
  dotActive: { width: 26, background: TERRA },

  /* ── Generic section ── */
  section: { padding: "clamp(64px, 9vw, 110px) 0" },
  eyebrow: { textAlign: "center", color: TERRA, fontWeight: 700, letterSpacing: 3, fontSize: 12.5, margin: "0 0 16px" },
  h2: { textAlign: "center", fontFamily: DISPLAY, fontSize: "clamp(32px, 4.4vw, 52px)", fontWeight: 800, margin: "0 0 14px", color: INK, letterSpacing: -0.8, lineHeight: 1.1 },
  italicAccent: { fontStyle: "italic", color: TERRA },
  lead: { textAlign: "center", color: MUTED, fontSize: 16.5, lineHeight: 1.7, margin: "0 auto", maxWidth: 620 },

  solCard: { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "32px 28px", boxShadow: "0 6px 20px rgba(42,35,29,.04)" },
  solIcon: { width: 56, height: 56, borderRadius: 4, border: "1px solid", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  solName: { margin: "0 0 10px", fontFamily: DISPLAY, fontSize: 22, fontWeight: 800, color: INK, letterSpacing: -0.3 },
  solDesc: { margin: 0, fontSize: 14.8, color: MUTED, lineHeight: 1.7 },

  /* ── Marquee ── */
  marqueeSection: { position: "relative", padding: "clamp(48px, 7vw, 84px) 0", overflow: "hidden" },
  marqueeViewport: { position: "relative", width: "100%", overflow: "hidden" },
  marqueeFade: { position: "absolute", top: 0, bottom: 0, width: "clamp(48px, 10vw, 150px)", zIndex: 2, pointerEvents: "none" },
  techPill: { display: "inline-flex", alignItems: "center", gap: 11, flexShrink: 0, margin: "0 9px", padding: "13px 22px", whiteSpace: "nowrap", borderRadius: 4, background: CARD, border: `1px solid ${BORDER}`, fontFamily: BODY, fontSize: 15.5, fontWeight: 700, color: INK },
  techLogo: { width: 22, height: 22, objectFit: "contain", flexShrink: 0 },

  /* ── Team ── */
  teamHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 40, flexWrap: "wrap", marginBottom: 42 },
  teamTitle: { fontFamily: DISPLAY, fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 800, lineHeight: 1.04, margin: 0, color: INK, letterSpacing: -1 },
  teamTitleAccent: { fontStyle: "italic", color: TERRA },
  teamIntro: { color: MUTED, fontSize: 16, lineHeight: 1.75, maxWidth: 400, margin: 0 },

  teamCard: { display: "flex", flexDirection: "column" },
  teamMediaWrap: { position: "relative", borderRadius: 6, overflow: "hidden", height: "clamp(300px, 48vh, 470px)", background: INK, boxShadow: "0 22px 54px rgba(42,35,29,.14)" },
  teamImg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform .5s cubic-bezier(.2,.8,.2,1)" },
  teamOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(30,24,19,.90) 0%, rgba(30,24,19,.30) 48%, rgba(30,24,19,0) 72%)" },

  teamBadge: { position: "absolute", top: 16, left: 16, background: "rgba(255,253,248,.94)", padding: "8px 14px", borderRadius: 3, fontSize: 11, fontWeight: 800, letterSpacing: 1.6, color: INK },
  teamSocials: { position: "absolute", top: 16, right: 16, display: "flex", gap: 8 },
  teamSocialBtn: { width: 34, height: 34, borderRadius: 3, background: "rgba(255,253,248,.94)", display: "flex", alignItems: "center", justifyContent: "center", color: TERRA, textDecoration: "none" },

  teamCaption: { position: "absolute", left: 24, right: 24, bottom: 24, zIndex: 1 },
  teamQuote: { fontFamily: DISPLAY, fontStyle: "italic", fontSize: 16, color: "#fff", margin: "0 0 14px", lineHeight: 1.45, display: "flex", gap: 6 },
  teamQuoteMark: { color: GOLD, fontSize: 26, fontWeight: 800, lineHeight: 1 },
  teamRule: { height: 1, background: "rgba(255,255,255,.28)", margin: "0 0 13px" },
  teamName: { fontFamily: DISPLAY, fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 5px", letterSpacing: -0.3 },
  teamRole: { fontSize: 11.5, fontWeight: 800, letterSpacing: 1.8, color: GOLD, margin: 0 },
  teamDesc: { color: MUTED, fontSize: 14.8, lineHeight: 1.7, margin: "22px 2px 0" },

  /* ── CTA ── */
  ctaSection: { padding: "0 0 clamp(64px, 9vw, 110px)" },
  cta: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 40, flexWrap: "wrap", background: INK, borderRadius: 8, padding: "clamp(38px, 5vw, 64px) clamp(28px, 4vw, 60px)", position: "relative", overflow: "hidden" },
  ctaGlow: { position: "absolute", top: -120, right: -80, width: 380, height: 380, borderRadius: "50%", background: `${GOLD}22`, pointerEvents: "none" },
  ctaScript: { fontFamily: SCRIPT, fontSize: 30, color: GOLD, margin: "0 0 8px", lineHeight: 1 },
  ctaTitle: { fontFamily: DISPLAY, fontSize: "clamp(28px, 3.6vw, 44px)", fontWeight: 800, margin: "0 0 14px", color: "#fdfaf4", lineHeight: 1.15, letterSpacing: -0.6 },
  ctaSub: { color: "#d8ccbd", margin: 0, fontSize: 15.5, lineHeight: 1.7, maxWidth: 520 },
  ctaBtns: { display: "flex", gap: 12, flexWrap: "wrap" },
  ctaBtnSolid: { background: TERRA, color: "#fff", padding: "16px 30px", borderRadius: 4, textDecoration: "none", fontWeight: 700, fontSize: 13, letterSpacing: 1.6 },
  ctaBtnGhost: { background: "transparent", color: "#fdfaf4", padding: "16px 30px", borderRadius: 4, textDecoration: "none", fontWeight: 700, fontSize: 13, letterSpacing: 1.6, border: "1px solid rgba(253,250,244,.35)" },
};