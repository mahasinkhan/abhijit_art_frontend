// src/pages/Portfolio.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/* ── design tokens (identical to About / Home) ── */
const IVORY   = "#f7f3ea";
const CARD    = "#fffdf8";
const INK     = "#2a231d";
const INK_2   = "#4c4239";
const MUTED   = "#7b7167";
const TERRA   = "#d9542f";
const TERRA_DK = "#b23f1e";
const GOLD    = "#c2974a";
const LINE    = "#e7dcc8";

const SERIF  = "'Fraunces', 'Playfair Display', serif";
const SANS   = "'DM Sans', sans-serif";
const SCRIPT = "'Pinyon Script', cursive";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

/* ── inline SVG icons ── */
type Ico = { size?: number; stroke?: number };
const base = (s: number, w: number) => ({
  width: s, height: s, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: w,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});
const GridIcon    = ({ size = 20, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>);
const ImageIcon   = ({ size = 20, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>);
const ZapIcon     = ({ size = 20, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>);
const PrinterIcon = ({ size = 20, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" rx="1" /></svg>);
const LayersIcon  = ({ size = 20, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>);
const MonitorIcon = ({ size = 20, stroke = 1.8 }: Ico) => (<svg {...base(size, stroke)}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>);
const XIcon       = ({ size = 20, stroke = 2 }: Ico) => (<svg {...base(size, stroke)}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const ChevronL    = ({ size = 22, stroke = 2 }: Ico) => (<svg {...base(size, stroke)}><polyline points="15 18 9 12 15 6" /></svg>);
const ChevronR    = ({ size = 22, stroke = 2 }: Ico) => (<svg {...base(size, stroke)}><polyline points="9 18 15 12 9 6" /></svg>);

/* ── categories ── */
const CATS = ["All", "Signage", "Laser Cutting", "Digital Printing", "Flex & Banner", "Cards & Branding", "Software"] as const;
type Cat = typeof CATS[number];

/* ── portfolio items ── */
type Item = {
  id: number;
  title: string;
  cat: Exclude<Cat, "All">;
  img: string;
  desc: string;
  tags: string[];
};

const items: Item[] = [
  /* Signage */
  { id: 1,  cat: "Signage",           title: "LED Channel Letter Board",      img: "/images/gallery/work_1.jpeg",             desc: "Custom 3D channel-bent LED lettering for a retail storefront. Fabricated in-house using our channel bending machine.",        tags: ["LED", "Channel Bending", "Retail"] },
  { id: 2,  cat: "Signage",           title: "Acrylic Backlit Sign",          img: "/images/gallery/work_2.jpeg",             desc: "Precision-cut acrylic panel with integrated LED backlighting for a corporate reception area.",                                 tags: ["Acrylic", "LED", "Corporate"] },
  { id: 3,  cat: "Signage",           title: "Restaurant Signage",            img: "/images/gallery/work_3.jpeg",             desc: "Full shopfront signage package including name board, menu boards and decorative lettering.",                                   tags: ["Restaurant", "Name Board", "Full Package"] },
  /* Laser Cutting */
  { id: 4,  cat: "Laser Cutting",     title: "Decorative MDF Panel",          img: "/images/gallery/work_4.jpeg",             desc: "Intricate geometric pattern laser-cut from 6mm MDF for an interior décor project.",                                           tags: ["MDF", "Interior", "Geometric"] },
  { id: 5,  cat: "Laser Cutting",     title: "Acrylic Trophy",                img: "/images/gallery/work_5.jpeg",             desc: "Laser-engraved and cut acrylic trophy with custom logo and text, produced for a school annual event.",                       tags: ["Acrylic", "Trophy", "Engraving"] },
  { id: 6,  cat: "Laser Cutting",     title: "Wooden Name Plate",             img: "/images/gallery/work_6.jpeg",             desc: "Precision laser-cut wooden name plate with fine detail lettering for an office door.",                                       tags: ["Wood", "Name Plate", "Office"] },
  /* Digital Printing */
  { id: 7,  cat: "Digital Printing",  title: "Mug & Merchandise Print",       img: "/images/gallery/papercup.jpeg",           desc: "High-resolution sublimation printing on ceramic mugs — ideal for corporate gifting and promotions.",                        tags: ["Mug", "Sublimation", "Gift"] },
  { id: 8,  cat: "Digital Printing",  title: "Event Standee",                 img: "/images/gallery/work_7.jpeg",             desc: "Vibrant 6×2 ft roll-up standee for a product launch event, printed on premium display film.",                              tags: ["Standee", "Event", "Roll-Up"] },
  { id: 9,  cat: "Digital Printing",  title: "ID Card Set",                   img: "/images/gallery/volunteer_id_card.jpeg",  desc: "Bulk ID card printing for a volunteer team — double-sided PVC with custom lanyard.",                                         tags: ["ID Card", "PVC", "Bulk"] },
  /* Flex & Banner */
  { id: 10, cat: "Flex & Banner",     title: "Outdoor Hoarding",              img: "/images/gallery/work_8.jpeg",             desc: "Large-format outdoor flex hoarding (10×6 ft) for a real estate campaign with bold typography.",                            tags: ["Hoarding", "Outdoor", "Real Estate"] },
  { id: 11, cat: "Flex & Banner",     title: "Event Backdrop",                img: "/images/gallery/work_9.jpeg",             desc: "Full-bleed event backdrop with sponsor logos and brand artwork, printed on matte flex.",                                    tags: ["Backdrop", "Event", "Sponsor"] },
  { id: 12, cat: "Flex & Banner",     title: "Shop Canopy Banner",            img: "/images/gallery/work_10.jpeg",            desc: "Weather-proof canopy banner with grommets installed at a local grocery store frontage.",                                   tags: ["Canopy", "Retail", "Outdoor"] },
  /* Cards & Branding */
  { id: 13, cat: "Cards & Branding",  title: "Premium Visiting Cards",        img: "/images/gallery/resturant_card.jpeg",     desc: "Soft-touch laminated visiting cards with spot UV branding for a restaurant group.",                                         tags: ["Visiting Card", "Spot UV", "Lamination"] },
  { id: 14, cat: "Cards & Branding",  title: "Brand Sticker Set",             img: "/images/gallery/work_11.jpeg",            desc: "Die-cut vinyl sticker set in multiple sizes for a product packaging rebrand.",                                             tags: ["Sticker", "Die-Cut", "Vinyl"] },
  { id: 15, cat: "Cards & Branding",  title: "Award Certificate",             img: "/images/gallery/award.jpeg",              desc: "Printed and foil-finished award certificate for an annual school prize giving ceremony.",                                   tags: ["Certificate", "Foil", "Award"] },
  /* Software */
  { id: 16, cat: "Software",          title: "E-Commerce Website",            img: "/images/gallery/work_12.jpeg",            desc: "Full-stack Next.js storefront with admin panel, product management and online payments for a local retailer.",            tags: ["Next.js", "E-Commerce", "Admin Panel"] },
  { id: 17, cat: "Software",          title: "Booking & CRM System",          img: "/images/gallery/work_13.jpeg",            desc: "Custom booking platform with calendar integration, customer portal and SMS notifications for a service business.",        tags: ["CRM", "Booking", "Node.js"] },
  { id: 18, cat: "Software",          title: "Staff Management Portal",       img: "/images/gallery/work_14.jpeg",            desc: "Internal HRMS web app for attendance, payroll and leave management built on React + Prisma.",                            tags: ["HRMS", "React", "Prisma"] },
];

/* category icon map */
const CatIcon: Record<Exclude<Cat, "All">, React.FC<Ico>> = {
  "Signage":          MonitorIcon,
  "Laser Cutting":    ZapIcon,
  "Digital Printing": PrinterIcon,
  "Flex & Banner":    ImageIcon,
  "Cards & Branding": LayersIcon,
  "Software":         GridIcon,
};

/* stat strip */
const stats = [
  { n: "25+",    l: "Years in Business" },
  { n: "15,000+",l: "Happy Clients"     },
  { n: "50,000+",l: "Orders Delivered"  },
  { n: "10+",    l: "Services Offered"  },
];

export default function Portfolio() {
  const [active, setActive] = useState<Cat>("All");
  const [lightbox, setLightbox] = useState<Item | null>(null);

  const visible = active === "All" ? items : items.filter((it) => it.cat === active);

  /* lightbox prev / next */
  const lb = lightbox;
  const lbIdx = lb ? visible.findIndex((it) => it.id === lb.id) : -1;
  const lbPrev = lbIdx > 0 ? visible[lbIdx - 1] : null;
  const lbNext = lbIdx >= 0 && lbIdx < visible.length - 1 ? visible[lbIdx + 1] : null;

  return (
    <div style={s.page}>

      {/* ── HERO ── */}
      <section style={s.heroWrap}>
        <span className="pf-dots" aria-hidden />
        <div style={s.inner}>
          <motion.div style={s.heroContent} {...fadeUp}>
            <p className="pf-kicker">Our Work</p>
            <h1 style={s.heroTitle}>
              Built with craft.<br />
              <span style={s.heroAccent}>Delivered with pride.</span>
            </h1>
            <span style={s.titleRule} />
            <p style={s.heroSub}>
              Over <strong style={s.hl}>25 years</strong> of printing, signage, fabrication and software
              — here's a selection of the work we're most proud of.
            </p>
          </motion.div>

          {/* stat strip */}
          <motion.div className="pf-statbar" {...fadeUp}>
            {stats.map((st) => (
              <div className="pf-statcell" key={st.l}>
                <div style={s.statN}>{st.n}</div>
                <div style={s.statL}>{st.l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FILTER + GRID ── */}
      <section style={s.gridSection}>
        <div style={s.inner}>

          {/* filter tabs */}
          <motion.div className="pf-tabs" {...fadeUp}>
            {CATS.map((cat) => (
              <button
                key={cat}
                className={`pf-tab ${active === cat ? "is-active" : ""}`}
                onClick={() => setActive(cat)}
              >
                {cat !== "All" && (
                  <span style={{ color: active === cat ? "#fff" : TERRA, display: "inline-flex", marginRight: 6 }}>
                    {(() => { const I = CatIcon[cat]; return <I size={14} stroke={2} />; })()}
                  </span>
                )}
                {cat}
              </button>
            ))}
          </motion.div>

          {/* masonry-style grid */}
          <div className="pf-grid">
            <AnimatePresence mode="popLayout">
              {visible.map((item, i) => (
                <motion.div
                  key={item.id}
                  className="pf-card"
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, delay: (i % 4) * 0.05, ease: "easeOut" }}
                  onClick={() => setLightbox(item)}
                >
                  <div className="pf-card-media">
                    <img
                      src={item.img}
                      alt={item.title}
                      style={s.cardImg}
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="pf-card-overlay">
                      <span style={s.overlayView}>View Project →</span>
                    </div>
                  </div>
                  <div style={s.cardBody}>
                    <span style={s.cardCat}>{item.cat}</span>
                    <h3 style={s.cardTitle}>{item.title}</h3>
                    <div style={s.tagRow}>
                      {item.tags.slice(0, 3).map((t) => (
                        <span key={t} style={s.tag}>{t}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {visible.length === 0 && (
            <p style={{ textAlign: "center", color: MUTED, padding: "60px 0" }}>
              No items in this category yet — check back soon.
            </p>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={s.ctaSection}>
        <div style={s.inner}>
          <motion.div style={s.ctaBox} {...fadeUp}>
            <div style={s.ctaGlow} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <p className="pf-script">Let's create something</p>
              <h2 style={s.ctaTitle}>Have a project in mind?</h2>
              <p style={s.ctaSub}>
                Printing, signage, laser cutting or custom software — tell us what you need
                and we'll make it happen.
              </p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <Link to="/services" style={s.btnSolid}>Explore Services →</Link>
                <Link to="/about"    style={s.btnOutline}>About Us →</Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── LIGHTBOX ── */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            style={s.lbBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <motion.div
              style={s.lbPanel}
              initial={{ opacity: 0, scale: 0.93, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 30 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* image */}
              <div style={s.lbImgWrap}>
                <img
                  src={lightbox.img}
                  alt={lightbox.title}
                  style={s.lbImg}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              {/* info */}
              <div style={s.lbInfo}>
                <span style={s.cardCat}>{lightbox.cat}</span>
                <h2 style={s.lbTitle}>{lightbox.title}</h2>
                <p style={s.lbDesc}>{lightbox.desc}</p>
                <div style={{ ...s.tagRow, marginTop: 16 }}>
                  {lightbox.tags.map((t) => (
                    <span key={t} style={s.tag}>{t}</span>
                  ))}
                </div>
                <Link to="/services" style={{ ...s.btnSolid, marginTop: 28, display: "inline-flex" }}>
                  Book a Similar Service →
                </Link>
              </div>

              {/* close */}
              <button style={s.lbClose} onClick={() => setLightbox(null)} aria-label="Close">
                <XIcon size={20} />
              </button>

              {/* prev / next */}
              {lbPrev && (
                <button style={{ ...s.lbNav, ...s.lbNavL }} onClick={() => setLightbox(lbPrev)} aria-label="Previous">
                  <ChevronL />
                </button>
              )}
              {lbNext && (
                <button style={{ ...s.lbNav, ...s.lbNavR }} onClick={() => setLightbox(lbNext)} aria-label="Next">
                  <ChevronR />
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;0,9..144,900;1,9..144,400&family=DM+Sans:wght@400;500;600;700&family=Pinyon+Script&display=swap');
        html, body { overflow-x: clip; }

        /* dots decoration */
        .pf-dots {
          position: absolute; top: 28px; left: clamp(20px, 4vw, 80px);
          width: 190px; height: 115px; pointer-events: none; z-index: 0;
          background-image: radial-gradient(circle, rgba(42,35,29,.22) 2px, transparent 2.2px);
          background-size: 20px 20px;
          -webkit-mask-image: radial-gradient(ellipse at top left, #000 34%, transparent 74%);
                  mask-image: radial-gradient(ellipse at top left, #000 34%, transparent 74%);
        }

        /* kicker */
        .pf-kicker {
          display: inline-flex; align-items: center; gap: 12px;
          font-family: ${SANS}; font-size: 13px; font-weight: 700;
          letter-spacing: 3px; text-transform: uppercase;
          color: ${TERRA}; margin: 0 0 16px 2px;
        }
        .pf-kicker::before {
          content: ""; width: 30px; height: 2px; border-radius: 2px; background: ${TERRA};
        }

        /* script label */
        .pf-script {
          font-family: ${SCRIPT}; color: ${GOLD};
          font-size: clamp(32px, 5vw, 60px); line-height: 1.1;
          margin: 0 0 8px; font-weight: 400;
        }

        /* stat bar */
        .pf-statbar {
          display: grid; grid-template-columns: repeat(4, 1fr);
          background: ${CARD}; border: 1px solid ${LINE};
          border-radius: 6px; padding: 14px 12px; margin-top: 32px;
          box-shadow: 0 10px 30px rgba(42,35,29,.06);
        }
        .pf-statcell {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 4px; padding: 12px 16px;
          border-right: 1px solid ${LINE}; text-align: center;
        }
        .pf-statcell:last-child { border-right: none; }
        @media (max-width: 760px) {
          .pf-statbar { grid-template-columns: repeat(2, 1fr); }
          .pf-statcell:nth-child(2n) { border-right: none; }
          .pf-statcell:nth-child(n+3) { border-top: 1px solid ${LINE}; }
        }
        @media (max-width: 440px) {
          .pf-statbar { grid-template-columns: 1fr; }
          .pf-statcell { border-right: none !important; border-bottom: 1px solid ${LINE}; }
          .pf-statcell:last-child { border-bottom: none; }
        }

        /* filter tabs */
        .pf-tabs {
          display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 40px;
        }
        .pf-tab {
          display: inline-flex; align-items: center;
          padding: 9px 18px; border-radius: 999px; cursor: pointer;
          font-family: ${SANS}; font-size: 12.5px; font-weight: 700;
          letter-spacing: .8px; text-transform: uppercase;
          border: 1.5px solid ${LINE}; background: ${CARD}; color: ${INK_2};
          transition: all .25s ease;
        }
        .pf-tab:hover { border-color: ${TERRA}; color: ${TERRA}; }
        .pf-tab.is-active { background: ${TERRA}; border-color: ${TERRA}; color: #fff; box-shadow: 0 8px 20px ${TERRA}44; }

        /* portfolio grid */
        .pf-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 1100px) { .pf-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 760px)  { .pf-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; } }
        @media (max-width: 480px)  { .pf-grid { grid-template-columns: 1fr; } }

        /* card */
        .pf-card {
          background: ${CARD}; border: 1px solid ${LINE}; border-radius: 8px;
          overflow: hidden; cursor: pointer;
          box-shadow: 0 6px 20px rgba(42,35,29,.05);
          transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s, border-color .3s;
        }
        .pf-card:hover { transform: translateY(-6px); box-shadow: 0 18px 40px rgba(42,35,29,.11); border-color: ${TERRA}55; }

        .pf-card-media {
          position: relative; overflow: hidden;
          aspect-ratio: 4 / 3; background: #f0e8dc;
        }
        .pf-card-overlay {
          position: absolute; inset: 0;
          background: rgba(42,35,29,.52);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity .3s ease;
        }
        .pf-card:hover .pf-card-overlay { opacity: 1; }

        /* lightbox backdrop */
        @media (max-width: 720px) {
          .pf-lb-panel { flex-direction: column !important; }
        }
      `}</style>
    </div>
  );
}

/* ── styles ── */
const s: Record<string, React.CSSProperties> = {
  page: {
    background: IVORY, color: INK, fontFamily: SANS,
    width: "100vw", maxWidth: "100vw",
    marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)",
    overflowX: "clip",
  },
  inner: {
    maxWidth: 1600, margin: "0 auto", width: "100%", boxSizing: "border-box",
    paddingLeft: "clamp(16px, 3vw, 40px)", paddingRight: "clamp(16px, 3vw, 40px)",
    position: "relative", zIndex: 1,
  },

  /* hero */
  heroWrap: { position: "relative", background: IVORY, padding: "56px 0 48px", overflow: "hidden" },
  heroContent: { maxWidth: 720 },
  heroTitle: {
    fontFamily: SERIF, fontSize: "clamp(34px, 4.4vw, 58px)", fontWeight: 700,
    lineHeight: 1.06, margin: "0 0 0", color: INK, letterSpacing: -0.5,
  },
  heroAccent: { color: TERRA },
  titleRule: { display: "block", width: 64, height: 3, borderRadius: 3, background: TERRA, margin: "22px 0 20px" },
  heroSub: { color: MUTED, fontSize: 16, lineHeight: 1.75, maxWidth: 560, margin: "0 0 0" },
  hl: { color: TERRA, fontWeight: 800 },
  statN: { fontFamily: SERIF, fontSize: "clamp(22px, 2.6vw, 32px)", fontWeight: 800, color: TERRA, lineHeight: 1 },
  statL: { fontSize: 13, color: MUTED, fontWeight: 600, marginTop: 4 },

  /* grid section */
  gridSection: { padding: "64px 0 80px" },

  /* card */
  cardImg: { width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform .45s cubic-bezier(.2,.8,.2,1)" },
  overlayView: { color: "#fff", fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" },
  cardBody: { padding: "16px 18px 20px" },
  cardCat: { fontSize: 10.5, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", color: GOLD },
  cardTitle: { fontFamily: SERIF, fontSize: 18, fontWeight: 700, margin: "6px 0 10px", color: INK, lineHeight: 1.25 },
  tagRow: { display: "flex", flexWrap: "wrap" as const, gap: 6 },
  tag: { fontSize: 11, fontWeight: 600, color: MUTED, background: "#f0e8dc", borderRadius: 999, padding: "3px 10px", letterSpacing: 0.4 },

  /* cta */
  ctaSection: { padding: "0 0 80px" },
  ctaBox: {
    position: "relative", overflow: "hidden",
    background: `linear-gradient(122deg, ${TERRA} 0%, ${TERRA_DK} 100%)`,
    borderRadius: 8, padding: "clamp(40px, 5vw, 70px) clamp(28px, 5vw, 72px)",
    boxShadow: `0 28px 60px ${TERRA}33`,
  },
  ctaGlow: { position: "absolute", top: -90, right: -50, width: 340, height: 340, borderRadius: "50%", background: "rgba(255,255,255,.13)", pointerEvents: "none" },
  ctaTitle: { fontFamily: SERIF, fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 700, margin: "0 0 12px", color: "#fff", lineHeight: 1.14, letterSpacing: -0.5 },
  ctaSub: { color: "rgba(255,255,255,.9)", fontSize: 16, lineHeight: 1.7, margin: "0 0 28px", maxWidth: 540 },
  btnSolid: { background: "#fff", color: TERRA_DK, padding: "14px 28px", borderRadius: 4, textDecoration: "none", fontWeight: 800, fontSize: 13, letterSpacing: 1, display: "inline-flex", alignItems: "center", boxShadow: "0 8px 20px rgba(0,0,0,.12)" },
  btnOutline: { background: "rgba(255,255,255,.15)", color: "#fff", padding: "14px 28px", borderRadius: 4, textDecoration: "none", fontWeight: 800, fontSize: 13, letterSpacing: 1, border: "1.5px solid rgba(255,255,255,.45)", display: "inline-flex", alignItems: "center" },

  /* lightbox */
  lbBackdrop: { position: "fixed", inset: 0, background: "rgba(42,35,29,.72)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(6px)" },
  lbPanel: { position: "relative", display: "flex", flexDirection: "row" as const, background: CARD, borderRadius: 10, overflow: "hidden", maxWidth: 960, width: "100%", maxHeight: "90vh", boxShadow: "0 40px 90px rgba(42,35,29,.35)" },
  lbImgWrap: { flex: "1.1", minWidth: 0, background: "#f0e8dc", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  lbImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  lbInfo: { flex: 1, padding: "44px 36px 44px 36px", overflowY: "auto" as const, display: "flex", flexDirection: "column" as const, justifyContent: "center" },
  lbTitle: { fontFamily: SERIF, fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 700, margin: "8px 0 14px", color: INK, lineHeight: 1.2 },
  lbDesc: { color: MUTED, fontSize: 15, lineHeight: 1.75, margin: 0 },
  lbClose: { position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: "50%", border: `1px solid ${LINE}`, background: CARD, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: INK, zIndex: 10 },
  lbNav: { position: "absolute", top: "50%", transform: "translateY(-50%)", width: 42, height: 42, borderRadius: "50%", border: `1px solid ${LINE}`, background: CARD, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: TERRA, zIndex: 10, boxShadow: "0 6px 18px rgba(42,35,29,.12)" },
  lbNavL: { left: 12 },
  lbNavR: { right: 12 },
};