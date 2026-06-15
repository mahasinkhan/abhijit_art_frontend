import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* ══════════════════════════════════════════════════════════════
   ABHIJIT ART — Software Service  (→ /software-service)
   Page opens with a FULL-SCREEN industry showcase (no intro text):
   your industry graphics auto-crossfade edge-to-edge at the top.
   Then: solutions grid · moving marquee · team · CTA.
   Images: public/images/software/
   Team photos: public/images/software/team/
   ══════════════════════════════════════════════════════════════ */

const INK = "#141419";
const MUTED = "#6c6c78";
const PINK = "#ff2e63";
const BLUE = "#2f6bff";
const BLUE_DK = "#1d4fd6";
const VIOLET = "#8b5cf6";
const ORANGE = "#ff9d2e";
const BORDER = "#ececf1";
const SOFT = "#f7f8fb";
const NAVY = "#0a142e";

type Ico = { size?: number; stroke?: number };
const base = (s: number, w: number) => ({
  width: s, height: s, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});
const CloudIcon = ({ size = 26, stroke = 2 }: Ico) => (<svg {...base(size, stroke)}><path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5 1.5A4 4 0 0 0 6 19z" /><path d="m8 13 2-2 2 2 2-2" /></svg>);
const CartIcon = ({ size = 26, stroke = 2 }: Ico) => (<svg {...base(size, stroke)}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>);
const UsersIcon = ({ size = 26, stroke = 2 }: Ico) => (<svg {...base(size, stroke)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
const BuildingIcon = ({ size = 26, stroke = 2 }: Ico) => (<svg {...base(size, stroke)}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" /></svg>);
const ChartIcon = ({ size = 26, stroke = 2 }: Ico) => (<svg {...base(size, stroke)}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>);
const CodeIcon = ({ size = 26, stroke = 2 }: Ico) => (<svg {...base(size, stroke)}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>);

/* Team social icons */
const LinkedInIcon = ({ size = 17 }: Ico) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.5c0-1.3-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21h-4z" />
  </svg>
);
const MailIcon = ({ size = 17, stroke = 2 }: Ico) => (<svg {...base(size, stroke)}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></svg>);

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
  { name: "SaaS Applications", desc: "Scalable, multi-tenant SaaS platforms built to grow with you.", Icon: CloudIcon, c: BLUE },
  { name: "E-Commerce", desc: "Powerful online stores with payments, inventory and orders.", Icon: CartIcon, c: VIOLET },
  { name: "HRMS", desc: "Human resource management — attendance, payroll and more.", Icon: UsersIcon, c: PINK },
  { name: "Management Systems", desc: "Custom admin panels to manage everything efficiently.", Icon: BuildingIcon, c: ORANGE },
  { name: "ERP", desc: "Enterprise resource planning tailored to your workflow.", Icon: ChartIcon, c: BLUE_DK },
  { name: "Custom Software", desc: "Bespoke web & business software built around your needs.", Icon: CodeIcon, c: VIOLET },
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
      {/* ── FULL-SCREEN industry showcase (top of page) ── */}
      <div className="sw-show" style={s.showcaseFull}>
        {industries.map((it, i) => (
          <img key={it.img} src={it.img} alt={it.label}
            style={{ ...s.slide, opacity: i === idx ? 1 : 0 }} />
        ))}
        <div style={s.dots}>
          {industries.map((it, i) => (
            <button key={it.img} aria-label={`Show ${it.label}`} onClick={() => setIdx(i)}
              style={{ ...s.dot, ...(i === idx ? s.dotActive : {}) }} />
          ))}
        </div>
      </div>

      {/* ── SOLUTIONS ── */}
      <section style={{ ...s.full, ...s.bleed, background: "#fff", padding: "56px 0" }}>
        <div style={s.container}>
          <p style={s.eyebrow}>SOFTWARE DEVELOPMENT</p>
          <h2 style={s.h2}>Complete Solutions for Every Business</h2>
          <p style={s.lead}>Modern, scalable and secure software — built end to end for growth.</p>
          <div className="sw-grid">
            {solutions.map((it) => {
              const Icon = it.Icon;
              return (
                <div key={it.name} className="sw-card" style={s.solCard}>
                  <span style={{ ...s.solIcon, color: "#fff", background: `linear-gradient(145deg, ${it.c}, ${it.c}cc)`, boxShadow: `0 12px 26px ${it.c}40` }}><Icon /></span>
                  <h3 style={s.solName}>{it.name}</h3>
                  <p style={s.solDesc}>{it.desc}</p>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: "center", marginTop: 44 }}>
            <Link to="/contact" style={s.btnBlue}>Get a Free Quote <span style={{ marginLeft: 6 }}>→</span></Link>
          </div>
        </div>
      </section>

      {/* ── MOVING MARQUEE — tech stack with original logos (light background) ── */}
      <section className="sw-marquee" style={s.marqueeSection} aria-label="Technologies we use">
        <div style={s.container}>
          <p style={s.eyebrow}>OUR STACK</p>
          <h2 style={{ ...s.h2, marginBottom: 30 }}>What Technology We Use</h2>
        </div>
        <div style={s.marqueeViewport}>
          <div style={{ ...s.marqueeFade, left: 0, background: "linear-gradient(90deg, #fff 0%, rgba(255,255,255,0) 100%)" }} />
          <div style={{ ...s.marqueeFade, right: 0, background: "linear-gradient(270deg, #fff 0%, rgba(255,255,255,0) 100%)" }} />
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

      {/* ── TEAM — "The people behind the products" ── */}
      <section style={s.teamSection}>
        <div style={s.teamGridBg} />
        <div style={{ ...s.container, position: "relative", zIndex: 1 }}>
          <div className="sw-team-head" style={s.teamHead}>
            <h2 style={s.teamTitle}>
              The people behind<br />
              <span style={s.teamTitleAccent}>the products.</span>
            </h2>
            <p style={s.teamIntro}>
              A compact team of dedicated senior professionals, personally committed to the outcome of every project we take on.
            </p>
          </div>

          <div className="sw-team-grid">
            {team.map((m, i) => (
              <article key={m.name} className="sw-team-card" style={s.teamCard}>
                <div style={s.teamMediaWrap}>
                  <img src={m.img} alt={m.name} style={s.teamImg} />
                  <div style={s.teamOverlay} />

                  <div style={s.teamBadge}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <span style={s.teamBadgeDot}>•</span>
                    <span>{m.cat}</span>
                  </div>

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

      {/* ── CTA ── */}
      <section style={{ ...s.full, ...s.bleed, background: "#fff", padding: "56px 0" }}>
        <div className="sw-cta" style={{ ...s.container, ...s.cta }}>
          <div style={s.ctaGlow} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={s.ctaTitle}>Let's Build Something<br />Amazing Together</h2>
            <p style={s.ctaSub}>Tell us your idea — we'll turn it into a powerful digital product.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to="/contact" style={s.ctaBtnLight}>Start Your Project</Link>
              <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" style={s.ctaBtnWa}>💬 Chat on WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        /* Flush the full-screen hero under the sticky header — scoped to this page only.
           Reverts automatically when you navigate away (this <style> unmounts with the page). */
        main.container { padding-top: 0 !important; margin-top: 0 !important; }
        html, body { overflow-x: clip; }
        .sw-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 52px; }
        @media (max-width: 900px) { .sw-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .sw-grid { grid-template-columns: 1fr; } }
        .sw-card { transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s, border-color .3s; }
        .sw-card:hover { transform: translateY(-6px); box-shadow: 0 24px 50px rgba(20,20,25,.10); border-color: #2f6bff33; }

        /* Moving marquee — two identical groups, slide exactly one group width
           so it loops with no blank gap on either edge at any screen width. */
        .sw-marquee-track {
          display: flex;
          width: max-content;
          animation: sw-scroll 45s linear infinite;
          will-change: transform;
        }
        .sw-marquee-group { display: flex; flex-shrink: 0; }
        .sw-marquee:hover .sw-marquee-track { animation-play-state: paused; }
        @keyframes sw-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sw-marquee-track { animation: none; }
        }

        /* Team */
        .sw-team-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 28px; }
        .sw-team-card { transition: transform .35s cubic-bezier(.2,.8,.2,1); }
        .sw-team-card:hover { transform: translateY(-6px); }
        .sw-team-card:hover img { transform: scale(1.04); }
        @media (max-width: 760px) {
          .sw-team-grid { grid-template-columns: 1fr; }
          .sw-team-head { flex-direction: column !important; align-items: flex-start !important; }
        }

        @media (max-width: 880px) {
          .sw-cta { flex-direction: column !important; text-align: center; }
        }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { background: "#fff", color: INK, fontFamily: "'DM Sans', sans-serif" },
  container: { maxWidth: "none", margin: "0 auto", width: "100%", boxSizing: "border-box", paddingLeft: "clamp(20px,4vw,64px)", paddingRight: "clamp(20px,4vw,64px)" },

  /* break a section out of any parent max-width so it truly spans edge-to-edge */
  bleed: { width: "100vw", marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" },

  /* every non-hero section fills one screen and centres its content vertically */
  full: { minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" },

  /* full-bleed full-screen showcase, flush at the very top */
  showcaseFull: {
    position: "relative", width: "100vw", marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)",
    aspectRatio: "16 / 9", maxHeight: "100vh", overflow: "hidden", background: NAVY,
  },
  slide: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "opacity .8s ease" },
  dots: { position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, padding: "9px 14px", borderRadius: 30, background: "rgba(10,15,30,.4)", backdropFilter: "blur(4px)", zIndex: 2 },
  dot: { width: 9, height: 9, padding: 0, borderRadius: "50%", border: "none", cursor: "pointer", background: "rgba(255,255,255,.55)", transition: "all .3s ease" },
  dotActive: { width: 24, borderRadius: 5, background: "#fff" },

  eyebrow: { textAlign: "center", color: BLUE_DK, fontWeight: 800, letterSpacing: 3, fontSize: 12, margin: "0 0 12px" },
  h2: { textAlign: "center", fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 800, margin: "0 0 12px", color: INK, letterSpacing: -0.5 },
  lead: { textAlign: "center", color: MUTED, fontSize: 16, margin: 0 },

  btnBlue: { display: "inline-flex", alignItems: "center", background: BLUE, color: "#fff", padding: "14px 30px", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 15, boxShadow: `0 14px 30px ${BLUE}45` },

  solCard: { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 22, padding: "30px 26px", boxShadow: "0 8px 26px rgba(20,20,25,.05)" },
  solIcon: { width: 58, height: 58, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  solName: { margin: "0 0 8px", fontFamily: "'Playfair Display', serif", fontSize: 21, fontWeight: 800, color: INK },
  solDesc: { margin: 0, fontSize: 14.5, color: MUTED, lineHeight: 1.65 },

  /* ── Moving marquee (tech stack, light) ── */
  marqueeSection: { position: "relative", width: "100vw", marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)", background: "#fff", padding: "52px 0", overflow: "hidden" },
  marqueeViewport: { position: "relative", width: "100%", overflow: "hidden" },
  marqueeFade: { position: "absolute", top: 0, bottom: 0, width: "clamp(48px, 10vw, 140px)", zIndex: 2, pointerEvents: "none" },
  techPill: { display: "inline-flex", alignItems: "center", gap: 11, flexShrink: 0, margin: "0 10px", padding: "12px 22px", whiteSpace: "nowrap", borderRadius: 14, background: SOFT, border: `1px solid ${BORDER}`, fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700, color: INK },
  techLogo: { width: 22, height: 22, objectFit: "contain", flexShrink: 0 },

  /* ── Team ── */
  teamSection: { background: "#fff", padding: "48px 0", position: "relative", overflow: "hidden", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", width: "100vw", marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" },
  teamGridBg: {
    position: "absolute", inset: 0,
    backgroundImage: `linear-gradient(${BORDER} 1px, transparent 1px), linear-gradient(90deg, ${BORDER} 1px, transparent 1px)`,
    backgroundSize: "54px 54px",
    WebkitMaskImage: "radial-gradient(circle at 50% 25%, #000 0%, transparent 72%)",
    maskImage: "radial-gradient(circle at 50% 25%, #000 0%, transparent 72%)",
    opacity: 0.55, pointerEvents: "none",
  },
  teamHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 40, flexWrap: "wrap", marginBottom: 34 },
  teamTitle: { fontFamily: "'Playfair Display', serif", fontSize: "clamp(34px, 5.5vw, 48px)", fontWeight: 800, lineHeight: 1.04, margin: 0, color: INK, letterSpacing: -0.5 },
  teamTitleAccent: { fontStyle: "italic", color: BLUE },
  teamIntro: { color: MUTED, fontSize: 16, lineHeight: 1.6, maxWidth: 440, margin: 0 },

  teamCard: { display: "flex", flexDirection: "column" },
  teamMediaWrap: { position: "relative", borderRadius: 20, overflow: "hidden", height: "clamp(260px, 46vh, 440px)", background: NAVY, boxShadow: "0 20px 50px rgba(20,20,25,.12)" },
  teamImg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform .5s cubic-bezier(.2,.8,.2,1)" },
  teamOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,12,28,.88) 0%, rgba(8,12,28,.30) 46%, rgba(8,12,28,0) 70%)" },

  teamBadge: { position: "absolute", top: 16, left: 16, display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.93)", padding: "7px 13px", borderRadius: 30, fontSize: 11, fontWeight: 800, letterSpacing: 1, color: INK, backdropFilter: "blur(4px)" },
  teamBadgeDot: { color: BLUE },

  teamSocials: { position: "absolute", top: 16, right: 16, display: "flex", gap: 8 },
  teamSocialBtn: { width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,.93)", display: "flex", alignItems: "center", justifyContent: "center", color: BLUE_DK, textDecoration: "none", backdropFilter: "blur(4px)" },

  teamCaption: { position: "absolute", left: 22, right: 22, bottom: 22, zIndex: 1 },
  teamQuote: { fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 15.5, color: "#fff", margin: "0 0 14px", lineHeight: 1.4, display: "flex", gap: 6 },
  teamQuoteMark: { color: "#5aa0ff", fontSize: 24, fontWeight: 800, lineHeight: 1 },
  teamRule: { height: 1, background: "rgba(255,255,255,.32)", margin: "0 0 12px" },
  teamName: { fontFamily: "'Playfair Display', serif", fontSize: 23, fontWeight: 800, color: "#fff", margin: "0 0 4px" },
  teamRole: { fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: "#5aa0ff", margin: 0 },
  teamDesc: { color: MUTED, fontSize: 14.5, lineHeight: 1.65, margin: "20px 4px 0" },

  cta: { background: `linear-gradient(120deg, ${BLUE} 0%, ${VIOLET} 100%)`, borderRadius: 26, padding: "54px 50px", position: "relative", overflow: "hidden", boxShadow: `0 28px 64px ${BLUE}3a` },
  ctaGlow: { position: "absolute", top: -80, right: -40, width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,.14)", pointerEvents: "none" },
  ctaTitle: { fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 800, margin: "0 0 12px", color: "#fff", lineHeight: 1.15 },
  ctaSub: { color: "#fff", opacity: .92, margin: "0 0 26px", fontSize: 15 },
  ctaBtnLight: { background: "#fff", color: INK, padding: "14px 28px", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 14 },
  ctaBtnWa: { background: "rgba(0,0,0,.22)", color: "#fff", padding: "14px 28px", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 14 },
};