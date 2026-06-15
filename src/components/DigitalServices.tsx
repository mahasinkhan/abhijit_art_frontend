import { Link } from "react-router-dom";

/* ══════════════════════════════════════════════════════════════
   ABHIJIT ART — Digital Services  (matched cards)
   Two identical cards: media panel on top (16:10) + content below.
   Software = image (blue accent) · Marketing = megaphone (pink).
   One effect only: a soft accent glow behind each card.
   Software image → public/images/software/sodtware_image.jpeg
   ══════════════════════════════════════════════════════════════ */

const INK = "#141419";
const MUTED = "#6c6c78";
const PINK = "#ff2e63";
const PINK_DK = "#e01b50";
const BLUE = "#2f6bff";
const BLUE_DK = "#1d4fd6";
const BORDER = "#ececf1";

const CheckIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/* megaphone broadcasting (pink) — no image file needed */
const MegaphoneIllu = () => (
  <svg viewBox="0 0 240 168" width="190" aria-hidden style={{ maxWidth: "70%", height: "auto" }}>
    <g stroke={PINK} fill="none" strokeWidth="2.4" strokeLinecap="round">
      <path d="M150 70 A22 22 0 0 1 150 100" opacity="0.85" />
      <path d="M159 62 A34 34 0 0 1 159 108" opacity="0.55" />
      <path d="M168 54 A46 46 0 0 1 168 116" opacity="0.3" />
    </g>
    <rect x="58" y="96" width="12" height="26" rx="4" fill="#b9123f" transform="rotate(18 64 109)" />
    <path d="M62 72 L96 64 L132 50 L132 120 L96 106 L62 98 Z" fill={PINK} />
    <path d="M96 64 L132 50 L132 120 L96 106 Z" fill={PINK_DK} opacity="0.55" />
    <rect x="55" y="70" width="14" height="30" rx="5" fill={PINK_DK} />
    <ellipse cx="132" cy="85" rx="6" ry="35" fill="#ff5c83" />
    <g><circle cx="170" cy="34" r="16" fill={PINK} />
      <path d="M170 41c-5-3-8-6-8-10 0-2.6 3.6-3.8 5.4-1.4l2.6 3 2.6-3c1.8-2.4 5.4-1.2 5.4 1.4 0 4-3 7-8 10z" fill="#fff" /></g>
    <g><circle cx="205" cy="66" r="15" fill={BLUE} />
      <path d="M198 60h14v9h-7l-4 4v-4h-3z" fill="#fff" /></g>
    <g><circle cx="190" cy="108" r="15" fill="#ff9bb3" />
      <circle cx="190" cy="103" r="4.2" fill="#fff" />
      <path d="M182 116a8 7 0 0 1 16 0z" fill="#fff" /></g>
  </svg>
);

type Pillar = {
  key: string;
  kind: "image" | "illu";
  img?: string;
  name: string;
  tag: string;
  desc: string;
  points: string[];
  cta: string;
  to: string;
  accent: string;
  accentDk: string;
  tint: string;
  glow: string;
};

const pillars: Pillar[] = [
  {
    key: "software",
    kind: "image",
    img: "/images/software/sodtware_image.jpeg",
    name: "Software Development",
    tag: "Websites & Apps",
    desc: "Custom websites, web apps and business software — built fast, mobile-ready and made to convert.",
    points: [
      "Business websites & landing pages",
      "Custom web & admin software",
      "E-commerce & online ordering",
      "Mobile-friendly, SEO-ready builds",
    ],
    cta: "Get a Free Quote",
    to: "/contact",
    accent: BLUE,
    accentDk: BLUE_DK,
    tint: "#eef3ff",
    glow: BLUE,
  },
  {
    key: "marketing",
    kind: "illu",
    name: "Digital Marketing",
    tag: "Promotion & Ads",
    desc: "Get your brand in front of the right people — paid ads, social media and campaigns that bring real customers.",
    points: [
      "Google & Meta (Facebook / Instagram) ads",
      "Social media management & posts",
      "SEO & local business visibility",
      "Festive & promotional campaigns",
    ],
    cta: "Book a Free Consultation",
    to: "/contact",
    accent: PINK,
    accentDk: PINK_DK,
    tint: "#ffeef4",
    glow: PINK,
  },
];

export default function DigitalServices() {
  return (
    <section id="digital-services" style={st.wrap}>
      <div className="ds-grid">
        {pillars.map((p) => (
          <div key={p.key} className="ds-col">
            <div className="ds-glow" style={{ background: `radial-gradient(60% 55% at 50% 12%, ${p.glow}55, transparent 72%)` }} />

            <div style={st.card}>
              {/* media panel — 16:10 */}
              <div style={{ ...st.media, background: p.tint }}>
                {p.kind === "image" ? (
                  <img
                    src={p.img}
                    alt={p.name}
                    style={st.mediaImg}
                    onError={(e) => { e.currentTarget.style.opacity = "0"; }}
                  />
                ) : (
                  <MegaphoneIllu />
                )}
              </div>

              {/* words below */}
              <div style={st.body}>
                <span style={{ ...st.tag, color: p.accentDk, background: `${p.accent}14`, border: `1px solid ${p.accent}30` }}>
                  {p.tag}
                </span>
                <h3 style={st.cardName}>{p.name}</h3>
                <p style={st.cardDesc}>{p.desc}</p>

                <ul style={st.list}>
                  {p.points.map((pt) => (
                    <li key={pt} style={st.listItem}>
                      <span style={{ ...st.check, color: p.accentDk, background: `${p.accent}16` }}>
                        <CheckIcon />
                      </span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>

                <Link to={p.to} style={{ ...st.cta, background: p.accent, boxShadow: `0 12px 26px ${p.accent}45` }}>
                  {p.cta} <span style={st.ctaArrow}>→</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .ds-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          align-items: stretch;
          max-width: 1080px;
          margin: 0 auto;
        }
        @media (max-width: 860px) { .ds-grid { grid-template-columns: 1fr; gap: 26px; } }

        .ds-col { position: relative; height: 100%; }
        .ds-glow {
          position: absolute; inset: -18px; border-radius: 34px;
          filter: blur(28px); opacity: .5; z-index: 0;
          transition: opacity .35s ease; pointer-events: none;
        }
        .ds-col:hover .ds-glow { opacity: .9; }
      `}</style>
    </section>
  );
}

/* ───────────────────────── styles ───────────────────────── */
const st: Record<string, React.CSSProperties> = {
  wrap: {
    position: "relative",
    padding: "56px clamp(16px, 3vw, 40px)",
    background: "#ffffff",
    fontFamily: "'DM Sans', sans-serif",
    color: INK,
  },

  card: {
    position: "relative", zIndex: 1, height: "100%",
    background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 24, overflow: "hidden",
    boxShadow: "0 18px 50px rgba(20,20,25,.07)",
    display: "flex", flexDirection: "column",
  },

  /* media panel — fixed 16:10 so both cards match */
  media: {
    width: "100%", aspectRatio: "1 / 1", position: "relative",
    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  mediaImg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" },

  body: { padding: "26px 30px 28px", display: "flex", flexDirection: "column", flex: 1 },
  tag: { alignSelf: "flex-start", display: "inline-block", padding: "4px 13px", borderRadius: 30, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.4, marginBottom: 12 },
  cardName: { margin: "0 0 12px", fontFamily: "'Playfair Display', serif", fontSize: 27, fontWeight: 800, color: INK, letterSpacing: -0.4 },
  cardDesc: { color: MUTED, fontSize: 15, lineHeight: 1.7, margin: "0 0 20px" },

  list: { listStyle: "none", padding: 0, margin: "0 0 24px", display: "grid", gap: 13 },
  listItem: { display: "flex", alignItems: "flex-start", gap: 12, fontSize: 14.5, color: INK, lineHeight: 1.5, fontWeight: 500 },
  check: { width: 22, height: 22, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 },

  cta: {
    marginTop: "auto", alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 9,
    color: "#fff", padding: "13px 26px", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 14.5,
  },
  ctaArrow: { transform: "translateY(1px)" },
};