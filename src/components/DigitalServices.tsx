import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/* ══════════════════════════════════════════════════════════════
   ABHIJIT ART — Digital Services (second pillar)
   Simplified: no image panels, no blue/pink card tints. One ivory
   canvas, two quiet cards, terracotta as the only accent.
   Drop in at: src/components/DigitalServices.tsx
   ══════════════════════════════════════════════════════════════ */

const IVORY = "#f7f3ea";
const CARD = "#fffdf8";
const INK = "#2a231d";
const MUTED = "#7b7167";
const TERRA = "#d9542f";
const TERRA_DK = "#b23f1e";
const LINE = "#e7dcc8";

const SERIF = "'Fraunces', 'Playfair Display', serif";
const SANS = "'DM Sans', system-ui, sans-serif";

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

type Ico = { size?: number; stroke?: number };
const base = (s: number, w: number) => ({
  width: s, height: s, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});

const CodeIcon = ({ size = 26, stroke = 1.7 }: Ico) => (
  <svg {...base(size, stroke)}>
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
  </svg>
);
const MegaphoneIcon = ({ size = 26, stroke = 1.7 }: Ico) => (
  <svg {...base(size, stroke)}>
    <path d="M3 11v2a1 1 0 0 0 1 1h3l7 4V6L7 10H4a1 1 0 0 0-1 1z" />
    <path d="M18 9a3 3 0 0 1 0 6" />
    <path d="M7 14v5a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4" />
  </svg>
);
const CheckIcon = ({ size = 15, stroke = 2.4 }: Ico) => (
  <svg {...base(size, stroke)}><polyline points="20 6 9 17 4 12" /></svg>
);

const pillars = [
  {
    label: "Websites & Apps",
    title: "Software Development",
    desc: "Custom websites, web apps and business software — built fast, mobile-ready and made to convert.",
    Icon: CodeIcon,
    points: [
      "Business websites & landing pages",
      "Custom web & admin software",
      "E-commerce & online ordering",
      "Mobile-friendly, SEO-ready builds",
    ],
    cta: "Get a Free Quote",
    to: "/contact",
    solid: true,
  },
  {
    label: "Promotion & Ads",
    title: "Digital Marketing",
    desc: "Get your brand in front of the right people — paid ads, social media and campaigns that bring real customers.",
    Icon: MegaphoneIcon,
    points: [
      "Google & Meta (Facebook / Instagram) ads",
      "Social media management & posts",
      "SEO & local business visibility",
      "Festive & promotional campaigns",
    ],
    cta: "Book a Free Consultation",
    to: "/contact",
    solid: false,
  },
];

export default function DigitalServices() {
  return (
    <section id="digital-services" style={ds.section}>
      <div style={ds.inner}>
        <motion.div style={{ textAlign: "center" }} {...fadeUp}>
          <p style={ds.eyebrow}>
            <span style={ds.eyeDash} />
            <span>Digital Services</span>
          </p>
          <h2 style={ds.title}>The studio also builds online.</h2>
          <p style={ds.lead}>
            Same team, same standards — now for your website, software and campaigns.
          </p>
        </motion.div>

        <div className="ds-grid">
          {pillars.map((p, i) => {
            const Icon = p.Icon;
            return (
              <motion.div
                key={p.title}
                className="ds-card"
                style={ds.card}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
              >
                <span style={ds.icon}><Icon /></span>
                <p style={ds.label}>{p.label}</p>
                <h3 style={ds.cardTitle}>{p.title}</h3>
                <p style={ds.desc}>{p.desc}</p>

                <ul style={ds.list}>
                  {p.points.map((pt) => (
                    <li key={pt} style={ds.li}>
                      <span style={ds.tick}><CheckIcon /></span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>

                <Link to={p.to} style={p.solid ? ds.btnSolid : ds.btnOutline}>
                  {p.cta}&nbsp;&nbsp;→
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      <style>{`
        .ds-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 26px;
          max-width: 1080px; margin: 52px auto 0;
        }
        @media (max-width: 860px) { .ds-grid { grid-template-columns: 1fr; gap: 20px; } }

        .ds-card { transition: border-color .25s ease, box-shadow .25s ease, transform .25s ease; }
        .ds-card:hover {
          transform: translateY(-4px);
          border-color: ${TERRA}55;
          box-shadow: 0 18px 44px rgba(42,35,29,.09);
        }
        @media (prefers-reduced-motion: reduce) { .ds-card { transition: none; } }

        .ds-card a:focus-visible { outline: 2px solid ${TERRA}; outline-offset: 3px; }
      `}</style>
    </section>
  );
}

const ds: Record<string, React.CSSProperties> = {
  section: { background: IVORY, padding: "96px 0", fontFamily: SANS, color: INK },
  inner: { maxWidth: 1600, margin: "0 auto", padding: "0 clamp(16px, 3vw, 40px)", boxSizing: "border-box" },

  eyebrow: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
    color: TERRA, fontWeight: 700, letterSpacing: 2.6, fontSize: 12,
    textTransform: "uppercase", margin: "0 0 16px",
  },
  eyeDash: { width: 34, height: 2, background: TERRA, borderRadius: 2, display: "block", flexShrink: 0 },
  title: { fontFamily: SERIF, fontSize: "clamp(28px, 3.4vw, 44px)", fontWeight: 700, margin: "0 0 14px", color: INK, letterSpacing: -0.8, lineHeight: 1.12 },
  lead: { color: MUTED, fontSize: 16.5, lineHeight: 1.75, margin: 0 },

  card: {
    background: CARD, border: `1px solid ${LINE}`, borderRadius: 18,
    padding: "40px clamp(26px, 3vw, 40px) 36px",
    boxShadow: "0 8px 26px rgba(42,35,29,.05)",
    display: "flex", flexDirection: "column", alignItems: "flex-start",
  },
  icon: { color: TERRA, display: "inline-flex", marginBottom: 20 },
  label: {
    color: MUTED, fontSize: 11.5, fontWeight: 700, letterSpacing: 2,
    textTransform: "uppercase", margin: "0 0 10px",
  },
  cardTitle: { fontFamily: SERIF, fontSize: 26, fontWeight: 700, margin: "0 0 12px", color: INK, letterSpacing: -0.5 },
  desc: { color: MUTED, fontSize: 15.5, lineHeight: 1.7, margin: "0 0 26px" },

  list: { listStyle: "none", padding: 0, margin: "0 0 32px", display: "grid", gap: 13, width: "100%" },
  li: { display: "flex", alignItems: "flex-start", gap: 11, fontSize: 14.5, color: INK, lineHeight: 1.5 },
  tick: { color: TERRA, display: "inline-flex", flexShrink: 0, marginTop: 2 },

  btnSolid: {
    marginTop: "auto", display: "inline-flex", alignItems: "center",
    background: TERRA, color: "#fff", padding: "15px 28px", borderRadius: 8,
    textDecoration: "none", fontWeight: 700, fontSize: 12.5, letterSpacing: 1.2,
    textTransform: "uppercase", boxShadow: `0 10px 24px ${TERRA}2e`,
  },
  btnOutline: {
    marginTop: "auto", display: "inline-flex", alignItems: "center",
    background: "transparent", color: TERRA_DK, padding: "15px 28px", borderRadius: 8,
    textDecoration: "none", fontWeight: 700, fontSize: 12.5, letterSpacing: 1.2,
    textTransform: "uppercase", border: `1px solid ${TERRA}66`,
  },
};