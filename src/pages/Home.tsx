import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DigitalServices from "../components/DigitalServices";
import BookServiceModal, { type BookTarget } from "../components/BookServiceModal";
import HeroSection from "../components/home/HeroSection";
import ServicesSection from "../components/home/ServicesSection";
import WorkFanSection from "../components/home/WorkFanSection";
import ProcessSection from "../components/home/ProcessSection";
import CtaSection from "../components/home/CtaSection";
import PricesSection from "../components/home/PricesSection";
import "../styles/home.css";

/*  - 
   ABHIJIT ART  -  Home
   Restyled to match the About page: ivory canvas, terracotta +
   gold accents, Fraunces display / DM Sans body / Pinyon Script
   for the one decorative flourish. No pink, no navy, no blue.
   Corner radii follow the shared scale: 4px buttons, 6px cards,
   8px large panels; circles stay circular.
   Service images live in public/images/home/Services/ (capital S).
    -  */

/*  -  design tokens (same values as About)  -  */
const IVORY = "#f7f3ea";      // page canvas
const IVORY_2 = "#f2ebdd";    // image placeholder tint only  -  every section is flat IVORY
const CARD = "#fffdf8";       // card surface
const INK = "#2a231d";        // headings
const INK_2 = "#4c4239";      // strong body
const MUTED = "#7b7167";      // secondary text
const TERRA = "#d9542f";      // primary accent
const TERRA_DK = "#b23f1e";   // primary accent, pressed/gradient end
const GOLD = "#c2974a";       // secondary accent
const LINE = "#e7dcc8";       // hairlines & borders

const SERIF = "'Fraunces', 'Playfair Display', serif";
const SANS = "'DM Sans', sans-serif";
const SCRIPT = "'Pinyon Script', cursive";

const SHADOW_SM = "0 8px 26px rgba(42,35,29,.06)";
const SHADOW_MD = "0 18px 46px rgba(42,35,29,.09)";

/* single place to change if the folder ever moves */
const SVC_IMG = "/images/home/services";

const products = [
  { name: "Visiting Cards", price: "\u20B9299" },
  { name: "Custom T-Shirts", price: "\u20B9299" },
  { name: "LED Boards", price: "\u20B91,499" },
  { name: "Name Plates", price: "\u20B9599" },
  { name: "Stickers", price: "\u20B9199" },
  { name: "Printed Mugs", price: "\u20B9349" },
];

/*  -  inline SVG icons (no external dependency)  -  */
type IcoProps = { size?: number; stroke?: number };
const baseIco = (size: number, stroke: number) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});

/* service icons */
const ImageIcon = ({ size = 26, stroke = 1.8 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" />
  </svg>
);
const SparkIcon = ({ size = 26, stroke = 1.8 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}><path d="m12 3 1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2L12 3Z" /></svg>
);
const PrinterIcon = ({ size = 26, stroke = 1.8 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" rx="1" />
  </svg>
);
const ScissorsIcon = ({ size = 26, stroke = 1.8 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);
const StampIcon = ({ size = 26, stroke = 1.8 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <rect x="6" y="16" width="12" height="4" rx="1" />
    <path d="M9 16v-2a3 3 0 0 0-.8-2A3 3 0 0 1 7.5 8 4.5 4.5 0 0 1 12 4a4.5 4.5 0 0 1 4.5 4 3 3 0 0 1-.7 2 3 3 0 0 0-.8 2v2" />
  </svg>
);
const CreditCardIcon = ({ size = 26, stroke = 1.8 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
);
const CupIcon = ({ size = 26, stroke = 1.8 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    <line x1="6" y1="2" x2="6" y2="4" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="14" y1="2" x2="14" y2="4" />
  </svg>
);
const GridIcon = ({ size = 26, stroke = 1.8 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);
const LayersIcon = ({ size = 26, stroke = 1.8 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
  </svg>
);
const IdCardIcon = ({ size = 26, stroke = 1.8 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="8" cy="10" r="2" />
    <path d="M14 9h4M14 13h4M5 16c.5-1.5 2-2 3-2s2.5.5 3 2" />
  </svg>
);
const UploadIcon = ({ size = 16, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

/* feature-strip icons  -  outlined, terracotta (matches About stat bar) */
const BoltIcon = ({ size = 26, stroke = 1.6 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}><path d="M13 2 3 14h8l-1 8 11-12h-8z" /></svg>
);
const ShieldIcon = ({ size = 26, stroke = 1.6 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
);
const BoxIcon = ({ size = 26, stroke = 1.6 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.3 7 12 12 20.7 7" /><line x1="12" y1="22" x2="12" y2="12" />
  </svg>
);
const PaletteIcon = ({ size = 26, stroke = 1.6 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <circle cx="13.5" cy="6.5" r=".7" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="10.5" r=".7" fill="currentColor" stroke="none" />
    <circle cx="8.5" cy="7.5" r=".7" fill="currentColor" stroke="none" />
    <circle cx="6.5" cy="12.5" r=".7" fill="currentColor" stroke="none" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.7 1.7-1.7H16c3 0 5.5-2.5 5.5-5.5C21.5 5.6 17.2 2 12 2z" />
  </svg>
);

const features = [
  { Icon: BoltIcon, title: "Same Day Printing", sub: "Fast & reliable delivery" },
  { Icon: ShieldIcon, title: "Premium Quality", sub: "Best quality materials" },
  { Icon: BoxIcon, title: "Bulk Orders", sub: "Special discounts available" },
  { Icon: PaletteIcon, title: "Custom Design Support", sub: "Expert design assistance" },
];

const services = [
  { name: "Flex Printing", sub: "High quality prints for banners, hoardings and large formats.", Icon: ImageIcon, tint: "#f6e8d8", img: `${SVC_IMG}/flex.jpeg` },
  { name: "Laser Cutting", sub: "Precision laser cutting for acrylic, wood, MDF and more.", Icon: SparkIcon, tint: "#f1e9d7", img: `${SVC_IMG}/laser_cutting.jpeg` },
  { name: "Digital Printing", sub: "High resolution digital prints with vibrant colour quality.", Icon: PrinterIcon, tint: "#f7e4d8", img: `${SVC_IMG}/digital_printing.jpeg` },
  { name: "Sticker Cutting", sub: "Custom sticker cutting in any shape, size or quantity.", Icon: ScissorsIcon, tint: "#f5ead3", img: `${SVC_IMG}/sticker.jpeg` },
  { name: "Stamp Making", sub: "All types of custom stamps for personal or business use.", Icon: StampIcon, tint: "#eee7d6", img: `${SVC_IMG}/stamp.jpeg` },
  { name: "PVC Card", sub: "Professional ID & PVC card printing with premium finishing.", Icon: CreditCardIcon, tint: "#f6e8d8", img: `${SVC_IMG}/pvc-card.jpeg` },
  { name: "Cup Printing", sub: "Custom printed mugs & cups for gifts, branding and promotions.", Icon: CupIcon, tint: "#f1e9d7", img: `${SVC_IMG}/cup.jpeg` },
  { name: "LED Module", sub: "High quality LED boards & modules for bright display solutions.", Icon: GridIcon, tint: "#f7e4d8", img: `${SVC_IMG}/led-module.jpeg` },
  { name: "Acrylic Board", sub: "Premium acrylic board printing for a sleek and modern look.", Icon: LayersIcon, tint: "#f5ead3", img: `${SVC_IMG}/acrylic-board.jpeg` },
  { name: "Visiting Card", sub: "Professional visiting cards with unique designs and finishes.", Icon: IdCardIcon, tint: "#eee7d6", img: `${SVC_IMG}/visiting-card.jpeg` },
];

/*  -  section label:  -  EYEBROW (About page style)  -  */
function Eyebrow({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p style={{ ...st.eyebrowRow, justifyContent: center ? "center" : "flex-start" }}>
      <span style={st.eyeDash} />
      <span style={st.eyebrowText}>{children}</span>
    </p>
  );
}

/*  -  Gallery coverflow carousel (center image flat, sides tilted in 3D)  -  */
function GalleryCoverflow() {
  const gallery = [
    "/images/gallery/work_1.jpeg",
    "/images/gallery/work_2.jpeg",
    "/images/gallery/work_3.jpeg",
    "/images/gallery/work_4.jpeg",
    "/images/gallery/work_5.jpeg",
    "/images/gallery/work_6.jpeg",
    "/images/gallery/work_7.jpeg",
    "/images/gallery/work_8.jpeg",
    "/images/gallery/work_9.jpeg",
    "/images/gallery/work_10.jpeg",
    "/images/gallery/work_11.jpeg",
    "/images/gallery/work_12.jpeg",
    "/images/gallery/work_13.jpeg",
    "/images/gallery/work_14.jpeg",
    "/images/gallery/work_15.jpeg",
    "/images/gallery/work_16.jpeg",
    "/images/gallery/work_17.jpeg",
    "/images/gallery/award.jpeg",
    "/images/gallery/papercup.jpeg",
    "/images/gallery/resturant_card.jpeg",
    "/images/gallery/volunteer_id_card.jpeg",
  ];
  const n = gallery.length;
  const [active, setActive] = useState(Math.floor(n / 2));
  const [paused, setPaused] = useState(false);
  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((a) => (a + 1) % n), 3500);
    return () => clearInterval(t);
  }, [paused, n]);

  const go = (d: number) => setActive((a) => (a + d + n) % n);

  const slideW = Math.min(460, Math.max(240, Math.round(vw * 0.32)));
  const spacing = Math.round(slideW * 1.02);

  return (
    <section style={gx.wrap}>
      <div style={gx.inner}>
        <p style={gx.script}>Our Gallery</p>
        <h2 style={gx.title}>Work we&rsquo;ve put our name on</h2>
        <span style={gx.rule} />

        <div
          style={{ ...gx.stage, height: slideW + 40 }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div style={{ ...gx.glow, width: slideW * 1.5, height: slideW * 1.5 }} />
          {gallery.map((src, i) => {
            let offset = i - active;
            if (offset > n / 2) offset -= n;
            if (offset < -n / 2) offset += n;
            const abs = Math.abs(offset);
            const isActive = offset === 0;
            const slideStyle: React.CSSProperties = {
              ...gx.slide,
              width: slideW,
              height: slideW,
              transform: `translate(-50%, -50%) translateX(${offset * spacing}px) rotateY(${offset * -34}deg) scale(${isActive ? 1 : 0.8}) translateZ(${-abs * 70}px)`,
              zIndex: 50 - abs,
              opacity: abs > 1 ? 0 : 1,
              pointerEvents: abs > 1 ? "none" : "auto",
              cursor: isActive ? "default" : "pointer",
              boxShadow: isActive
                ? `0 26px 60px rgba(42,35,29,.22), 0 0 46px ${TERRA}3d, 0 0 0 5px ${CARD}`
                : "0 16px 34px rgba(42,35,29,.14)",
            };
            return (
              <div key={src + i} style={slideStyle} onClick={() => !isActive && setActive(i)}>
                <img
                  src={src}
                  alt={`Gallery image ${i + 1}`}
                  style={gx.img}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                {!isActive && <div style={gx.overlay} />}
              </div>
            );
          })}

          <button aria-label="Previous" style={{ ...gx.nav, ...gx.navL }} onClick={() => go(-1)}>&#8249;</button>
          <button aria-label="Next" style={{ ...gx.nav, ...gx.navR }} onClick={() => go(1)}>&#8250;</button>
        </div>
      </div>
    </section>
  );
}

/*  -  Testimonials marquee  -  */
function ReviewsSlider() {
  const reviews = [
    { name: "Rahul Sharma", role: "Business Owner, Sharma Traders", initials: "RS", text: "Abhijit Art provides the best quality printing services. Fast delivery and amazing work, highly recommended!" },
    { name: "Priya Das", role: "Marketing Head, Das Retail Group", initials: "PD", text: "From our shop signage to flex banners, everything was crisp and delivered on time. The team understood exactly what we wanted." },
    { name: "Amit Roy", role: "Event Manager, Roy Events", initials: "AR", text: "We order all our event standees and stickers here. Consistent quality, fair pricing, and they never miss a deadline." },
    { name: "Sneha Paul", role: "Founder, Paul Boutique", initials: "SP", text: "Our visiting cards and PVC tags came out beautifully. The finishing quality is genuinely premium." },
    { name: "Tarun Ghosh", role: "Owner, Ghosh Sweets", initials: "TG", text: "Their LED signboard transformed our storefront: bright, clean, and installed without any hassle." },
    { name: "Mou Sen", role: "Manager, Sen Pharmacy", initials: "MS", text: "Reliable for bulk printing. Whenever we need urgent orders, they always come through on time." },
  ];
  const loop = [...reviews, ...reviews];

  return (
    <section style={rv.wrap}>
      <div style={rv.inner}>
        <Eyebrow>In their words</Eyebrow>
        <motion.h2
          style={rv.heading}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          What our clients say
        </motion.h2>
      </div>

      <div className="rv-marquee">
        <div className="rv-track">
          {loop.map((r, i) => (
            <div key={i} style={rv.col}>
              <div style={rv.card}>
                <span style={rv.qicon} aria-hidden>&ldquo;</span>
                <p style={rv.text}>{r.text}</p>
                <span style={rv.tail} aria-hidden />
              </div>
              <div style={rv.person}>
                <div style={rv.avatar}>{r.initials}</div>
                <div style={{ textAlign: "left" }}>
                  <p style={rv.name}>{r.name}</p>
                  <p style={rv.role}>{r.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { hash } = useLocation();

  /* which card is being booked  -  null closes the modal */
  const [booking, setBooking] = useState<BookTarget | null>(null);

  useEffect(() => {
    if (hash === "#digital-services") {
      const t = setTimeout(() => {
        document.getElementById("digital-services")?.scrollIntoView({ behavior: "smooth" });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [hash]);

  return (
    <div style={st.page}>
      {/* SHEET 01 - HERO (redesign) */}
      <div className="ap-home">
        <HeroSection image="/images/abhijit_art_hero.png" />
        <ServicesSection />
        <ProcessSection />
        <WorkFanSection />
        <PricesSection />
        <CtaSection />
      </div>

      {/* legacy feature strip, HowItWorks and services grid removed - replaced by sheets 02 and 04 */}

      {/*  -  DIGITAL SERVICES  -  second pillar (Software + Marketing)  -  */}
      <DigitalServices />

      {/* legacy featured products removed - replaced by sheet 06 */}
      {/*  -  WORK GALLERY (coverflow carousel)  -  */}
      <GalleryCoverflow />

      {/*  -  REVIEWS  -  */}
      <ReviewsSlider />

      {/* legacy CTA banner removed - replaced by sheet 05 */}
      {/*  -  BOOKING MODAL (shared with the Services page)  -  */}
      <BookServiceModal service={booking} onClose={() => setBooking(null)} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,400;1,9..144,600;1,9..144,700&family=DM+Sans:wght@400;500;600;700&family=Pinyon+Script&display=swap');

        html, body { overflow-x: clip; }

        .aa-card { transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s, border-color .3s; }
        .aa-card:hover { transform: translateY(-8px); box-shadow: ${SHADOW_MD}; border-color: ${TERRA}55; }

        /* services card  -  image shrinks so Order Now fits, card height stays ~constant */
        .svc-media { height: 170px; transition: height .4s cubic-bezier(.2,.8,.2,1); }
        .aa-card:hover .svc-media { height: 118px; }
        .svc-order-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .4s cubic-bezier(.2,.8,.2,1); }
        .aa-card:hover .svc-order-wrap { grid-template-rows: 1fr; }
        .svc-order-inner { overflow: hidden; }
        .svc-order {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 14px;
          background: ${TERRA}; color: #fff; padding: 10px 22px; border-radius: 4px;
          font-family: ${SANS}; font-size: 12px; font-weight: 700; letter-spacing: 1.1;
          text-transform: uppercase; text-decoration: none; box-shadow: 0 8px 18px ${TERRA}38;
          border: 0; cursor: pointer;
          opacity: 0; transform: translateY(8px);
          transition: opacity .35s ease .05s, transform .35s cubic-bezier(.2,.8,.2,1) .05s, background .25s ease;
        }
        .aa-card:hover .svc-order { opacity: 1; transform: translateY(0); }
        .svc-order:hover { background: ${TERRA_DK}; }
        @media (prefers-reduced-motion: reduce) {
          .svc-media, .svc-order-wrap, .svc-order { transition: none; }
        }

        /* feature strip  -  thin warm dividers */
        .aa-feature-item { border-left: 1px solid ${LINE}; }
        .aa-feature-item:first-child { border-left: none; }
        @media (max-width: 760px) {
          .aa-feature-strip { grid-template-columns: repeat(2, 1fr) !important; }
          .aa-feature-item:nth-child(odd) { border-left: none; }
          .aa-feature-item:nth-child(n+3) { border-top: 1px solid ${LINE}; }
        }
        @media (max-width: 460px) {
          .aa-feature-strip { grid-template-columns: 1fr !important; }
          .aa-feature-item { border-left: none !important; }
          .aa-feature-item:nth-child(n+2) { border-top: 1px solid ${LINE}; }
        }

        /* testimonials marquee */
        .rv-marquee {
          margin-top: 34px; overflow: hidden; width: 100%;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
                  mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
        }
        .rv-track {
          display: flex; gap: 22px; width: max-content; padding: 6px 0;
          animation: rvScroll 48s linear infinite;
        }
        .rv-marquee:hover .rv-track { animation-play-state: paused; }
        @keyframes rvScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .rv-track { animation: none; } }

        /* featured products  -  rate-card rows */
        .aa-price-grid {
          margin: 54px auto 0; max-width: 1080px;
          display: grid; grid-template-columns: repeat(2, 1fr);
          column-gap: clamp(30px, 5vw, 80px);
        }
        @media (max-width: 720px) { .aa-price-grid { grid-template-columns: 1fr; } }

        .aa-price-row {
          position: relative; width: 100%;
          display: flex; align-items: baseline; justify-content: space-between; gap: 20px;
          padding: 21px 2px; background: none; border: 0; cursor: pointer;
          font-family: inherit; text-align: left;
          border-bottom: 1px solid ${LINE};
        }
        .aa-price-row::after {
          content: ""; position: absolute; left: 0; bottom: -1px; height: 1px; width: 100%;
          background: ${TERRA}; transform: scaleX(0); transform-origin: left;
          transition: transform .5s cubic-bezier(.2,.8,.2,1);
        }
        .aa-price-row:hover::after { transform: scaleX(1); }

        .aa-price-name {
          font-family: ${SERIF}; font-size: 19px; font-weight: 700; color: ${INK};
          letter-spacing: -0.2px;
          transition: transform .4s cubic-bezier(.2,.8,.2,1), color .3s ease;
        }
        .aa-price-row:hover .aa-price-name { transform: translateX(7px); color: ${TERRA}; }

        .aa-price-right { display: inline-flex; align-items: baseline; gap: 11px; flex-shrink: 0; }
        .aa-price-from {
          font-size: 11px; letter-spacing: 1.6px; text-transform: uppercase; color: ${MUTED};
        }
        .aa-price-val { font-size: 15.5px; font-weight: 700; color: ${GOLD}; }
        .aa-price-arrow {
          color: ${TERRA}; font-size: 15px; opacity: 0; transform: translateX(-9px);
          transition: opacity .3s ease, transform .4s cubic-bezier(.2,.8,.2,1);
        }
        .aa-price-row:hover .aa-price-arrow { opacity: 1; transform: translateX(0); }

        /* touch devices never hover  -  keep the affordance visible */
        @media (hover: none) {
          .aa-price-arrow { opacity: .55; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .aa-price-row::after, .aa-price-name, .aa-price-arrow { transition: none; }
        }

        /* services grid  -  5 up, responsive */
        .svc-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 26px; margin-top: 56px; align-items: start; }
        @media (max-width: 1200px) { .svc-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 760px)  { .svc-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; } }
        @media (max-width: 460px)  { .svc-grid { grid-template-columns: 1fr; } }

        @keyframes aaRise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
        .aa-rise { animation: aaRise .8s cubic-bezier(.2,.8,.2,1) both; }
        .aa-delay { animation-delay: .15s; }

        a:focus-visible, button:focus-visible {
          outline: 2px solid ${TERRA}; outline-offset: 3px; border-radius: 4px;
        }

        @media (prefers-reduced-motion: reduce) { .aa-rise { animation: none !important; } }

        @media (max-width: 920px) {
          .aa-hero { flex-direction: column !important; }
          .aa-hero-left h1 { font-size: 52px !important; }
          .aa-hero-right { max-width: 100% !important; }
          .aa-cta { flex-direction: column !important; text-align: center; }
        }
        @media (max-width: 540px) {
          .aa-hero-left h1 { font-size: 40px !important; }
        }
      `}</style>
    </div>
  );
}

/*  -  styles  -  */
const st: Record<string, React.CSSProperties> = {
  page: {
    background: IVORY, color: INK, fontFamily: SANS,
    width: "100vw", maxWidth: "100vw",
    marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)",
    overflowX: "clip",
  },
  container: {
    maxWidth: 1600, margin: "0 auto", width: "100%", boxSizing: "border-box",
    paddingLeft: "clamp(16px, 3vw, 40px)", paddingRight: "clamp(16px, 3vw, 40px)",
    position: "relative", zIndex: 1,
  },

  /* HERO */
  heroWrap: { position: "relative", background: IVORY, padding: "40px 0 48px", overflow: "hidden" },
  heroDots: {
    position: "absolute", top: 86, left: 58, width: 230, height: 150,
    backgroundImage: `radial-gradient(${INK}26 1.6px, transparent 1.7px)`,
    backgroundSize: "24px 24px", opacity: 0.75, pointerEvents: "none",
  },
  heroInner: { display: "flex", gap: 48, alignItems: "center", position: "relative", zIndex: 1 },
  heroLeft: { flex: 1, minWidth: 300 },

  heroTitle: {
    fontFamily: SERIF, fontSize: 70, fontWeight: 700,
    lineHeight: 1.03, margin: "10px 0 0", letterSpacing: -1.8, color: INK,
  },
  heroLine1: { display: "block" },
  heroLine2: { display: "block", color: TERRA },
  titleRule: { display: "block", width: 74, height: 3, background: TERRA, borderRadius: 3, margin: "24px 0 26px" },
  heroSub: { color: MUTED, fontSize: 17, lineHeight: 1.8, maxWidth: 470, margin: "0 0 34px", fontFamily: SANS },
  heroBtns: { display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" },
  btnArrow: { display: "inline-block", marginLeft: 10, transform: "translateY(1px)" },

  heroRight: { flex: 1.2, minWidth: 300, display: "flex", justifyContent: "center", alignItems: "center", position: "relative" },
  heroArc: {
    position: "absolute", top: "6%", right: "8%", width: "62%", paddingBottom: "62%",
    borderRadius: "50%",
    background: `radial-gradient(circle at 35% 30%, ${TERRA}2e, ${GOLD}1f 55%, transparent 72%)`,
    pointerEvents: "none",
  },
  heroImage: {
    width: "100%", maxWidth: 760, maxHeight: "min(520px, 52vh)", height: "auto",
    objectFit: "contain", position: "relative", zIndex: 1,
    filter: "drop-shadow(0 22px 46px rgba(42,35,29,.14))",
  },

  /* FEATURE STRIP */
  featureStrip: {
    marginTop: 78, background: CARD, border: `1px solid ${LINE}`, borderRadius: 8,
    padding: "8px 8px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
    boxShadow: SHADOW_SM, position: "relative", zIndex: 1,
  },
  featureItem: { display: "flex", alignItems: "center", gap: 15, padding: "16px 22px" },
  featureIcon: { width: 44, height: 44, flexShrink: 0, color: TERRA, display: "flex", alignItems: "center", justifyContent: "center" },
  featureTitle: { margin: 0, fontFamily: SERIF, fontWeight: 700, fontSize: 17, color: INK, letterSpacing: -0.2 },
  featureSub: { margin: "2px 0 0", fontSize: 13, color: MUTED },

  /* shared section furniture */
  eyebrowRow: { display: "flex", alignItems: "center", gap: 14, margin: "0 0 16px" },
  eyeDash: { width: 34, height: 2, background: TERRA, borderRadius: 2, display: "block", flexShrink: 0 },
  eyebrowText: {
    color: TERRA, fontFamily: SANS, fontWeight: 700, letterSpacing: 2.6,
    fontSize: 12, textTransform: "uppercase",
  },
  h2: { fontFamily: SERIF, fontSize: 44, fontWeight: 700, margin: "0 0 14px", color: INK, letterSpacing: -0.8, lineHeight: 1.12 },
  lead: { color: MUTED, fontSize: 16.5, margin: 0, lineHeight: 1.75 },

  /* SERVICES */
  svcCard: {
    background: CARD, border: `1px solid ${LINE}`, borderRadius: 6, padding: 14,
    boxShadow: SHADOW_SM, position: "relative",
  },
  svcMediaWrap: { position: "relative" },
  svcMedia: {
    borderRadius: 4, overflow: "hidden", color: TERRA, position: "relative",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  svcImg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" },
  svcBadge: {
    position: "absolute", left: "50%", bottom: -27, transform: "translateX(-50%)",
    width: 54, height: 54, borderRadius: "50%", color: TERRA,
    background: CARD, border: `1px solid ${TERRA}44`,
    boxShadow: "0 10px 22px rgba(42,35,29,.12)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  svcBody: { paddingTop: 40, paddingBottom: 6, textAlign: "center" },
  svcName: { margin: "0 0 8px", fontFamily: SERIF, fontSize: 19, fontWeight: 700, color: INK, letterSpacing: -0.3 },
  svcDesc: { margin: 0, fontSize: 13.5, color: MUTED, lineHeight: 1.65, maxWidth: 230, marginLeft: "auto", marginRight: "auto" },

  /* PRODUCTS  -  rate-card list */
  priceNote: {
    textAlign: "center", color: MUTED, fontSize: 13, lineHeight: 1.7,
    margin: "34px auto 0", maxWidth: 460,
  },

  /* CTA */
  ctaBanner: {
    background: `linear-gradient(122deg, ${TERRA} 0%, ${TERRA_DK} 100%)`, borderRadius: 8,
    padding: "56px 52px", display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 32, flexWrap: "wrap", position: "relative", overflow: "hidden",
    boxShadow: `0 28px 60px ${TERRA}33`,
  },
  ctaGlow: { position: "absolute", top: -90, right: -50, width: 340, height: 340, borderRadius: "50%", background: "rgba(255,255,255,.13)", pointerEvents: "none" },
  ctaTitle: { fontFamily: SERIF, fontSize: 38, fontWeight: 700, margin: "0 0 12px", color: "#fff", lineHeight: 1.14, letterSpacing: -0.8 },
  ctaSub: { color: "#fff", opacity: 0.9, margin: "0 0 28px", fontSize: 15.5 },
  ctaBtnLight: {
    background: IVORY, color: INK, padding: "15px 30px", borderRadius: 4, textDecoration: "none",
    fontWeight: 700, fontSize: 12.5, letterSpacing: 1.2, textTransform: "uppercase",
  },
  ctaBtnWa: {
    background: "rgba(42,35,29,.22)", color: "#fff", padding: "15px 30px", borderRadius: 4,
    border: "1px solid rgba(255,255,255,.35)", textDecoration: "none",
    fontWeight: 700, fontSize: 12.5, letterSpacing: 1.2, textTransform: "uppercase",
  },
  ctaOffer: { color: "#fff", textAlign: "center", flexShrink: 0, position: "relative", zIndex: 1 },
  offerUpto: { margin: 0, fontSize: 12.5, opacity: 0.9, letterSpacing: 3 },
  offerPct: { margin: 0, fontFamily: SERIF, fontSize: 72, fontWeight: 700, lineHeight: 1 },
  offerOff: { margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 3 },
  offerNote: { margin: "8px 0 0", fontSize: 13, opacity: 0.9 },

  /* buttons */
  btnSolid: {
    background: TERRA, color: "#fff", padding: "17px 32px", borderRadius: 4, textDecoration: "none",
    fontWeight: 700, fontSize: 12.5, letterSpacing: 1.3, textTransform: "uppercase",
    boxShadow: `0 12px 26px ${TERRA}33`, display: "inline-flex", alignItems: "center",
  },
  btnOutline: {
    background: "transparent", color: INK, padding: "17px 32px", borderRadius: 4, textDecoration: "none",
    fontWeight: 700, fontSize: 12.5, letterSpacing: 1.3, textTransform: "uppercase",
    border: `1px solid ${INK}33`, display: "inline-flex", alignItems: "center", gap: 10,
  },
  btnSolidLg: {
    display: "inline-flex", alignItems: "center", gap: 8, background: TERRA, color: "#fff",
    padding: "17px 36px", borderRadius: 4, textDecoration: "none", fontWeight: 700,
    fontSize: 12.5, letterSpacing: 1.3, textTransform: "uppercase", boxShadow: `0 12px 26px ${TERRA}33`,
  },
};

/*  -  gallery coverflow styles  -  */
const gx: Record<string, React.CSSProperties> = {
  wrap: { background: IVORY, padding: "88px 0 84px", color: INK, overflow: "hidden", width: "100%" },
  inner: { maxWidth: 1600, margin: "0 auto", padding: "0 clamp(16px, 3vw, 40px)", textAlign: "center", boxSizing: "border-box", position: "relative", zIndex: 1 },
  script: { fontFamily: SCRIPT, color: GOLD, fontSize: 42, margin: "0 0 6px", lineHeight: 1.2 },
  title: { fontFamily: SERIF, fontSize: 40, fontWeight: 700, margin: "0 0 16px", color: INK, letterSpacing: -0.8 },
  rule: { display: "inline-block", width: 64, height: 2, borderRadius: 2, background: TERRA },

  stage: { position: "relative", height: "clamp(300px, 32vw, 380px)", marginTop: 48, perspective: 1500 },
  glow: {
    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    background: `radial-gradient(circle, ${TERRA}33 0%, ${GOLD}1f 40%, transparent 70%)`,
    filter: "blur(34px)", zIndex: 0, pointerEvents: "none",
  },
  slide: {
    position: "absolute", top: "50%", left: "50%",
    borderRadius: 8, overflow: "hidden", background: IVORY_2,
    transition: "transform .6s cubic-bezier(.25,.8,.25,1), opacity .6s ease, box-shadow .6s ease",
  },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  overlay: { position: "absolute", inset: 0, background: "rgba(42,35,29,.24)" },

  nav: {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 48, height: 48, borderRadius: "50%", border: `1px solid ${LINE}`,
    background: CARD, color: TERRA, fontSize: 26, lineHeight: 1, cursor: "pointer",
    zIndex: 100, boxShadow: "0 10px 24px rgba(42,35,29,.14)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  navL: { left: "clamp(6px, 1.5vw, 28px)" },
  navR: { right: "clamp(6px, 1.5vw, 28px)" },
};

/*  -  testimonials styles  -  */
const rv: Record<string, React.CSSProperties> = {
  wrap: { background: IVORY, padding: "88px 0", position: "relative", overflow: "hidden" },
  inner: { maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px, 3vw, 40px)", position: "relative", zIndex: 1 },
  heading: { fontFamily: SERIF, fontSize: "clamp(28px, 3.4vw, 42px)", fontWeight: 700, margin: 0, color: INK, letterSpacing: -0.8 },

  col: { width: "clamp(280px, 30vw, 360px)", flex: "0 0 auto" },
  card: {
    position: "relative", background: CARD, border: `1px solid ${LINE}`,
    borderRadius: 6, padding: "26px 26px 28px", minHeight: 180,
    boxShadow: SHADOW_SM,
  },
  qicon: { display: "block", fontFamily: SERIF, color: GOLD, fontSize: 52, lineHeight: 0.7, marginBottom: 14, fontWeight: 700 },
  text: { fontFamily: SANS, color: INK_2, fontSize: 14.5, lineHeight: 1.75, margin: 0 },
  tail: {
    position: "absolute", bottom: -8, left: 30, width: 15, height: 15,
    background: CARD, borderRight: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`,
    transform: "rotate(45deg)",
  },

  person: { display: "flex", alignItems: "center", gap: 12, marginTop: 22, paddingLeft: 4 },
  avatar: {
    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
    background: `linear-gradient(145deg, ${TERRA}, ${TERRA_DK})`, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: SANS, fontWeight: 700, fontSize: 14, letterSpacing: 0.5,
    boxShadow: `0 6px 16px ${TERRA}33`,
  },
  name: { fontFamily: SERIF, color: INK, fontWeight: 700, fontSize: 15.5, margin: 0 },
  role: { fontFamily: SANS, color: MUTED, fontSize: 12.5, margin: "3px 0 0" },
};
