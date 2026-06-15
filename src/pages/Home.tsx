import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import DigitalServices from "../components/DigitalServices";
import HowItWorks from "../components/HowItWorks";


/* ══════════════════════════════════════════════════════════════
   ABHIJIT ART — Home (Refined Serif Edition)
   "How It Works" sits right after the hero — rebuilt to match the
   reference: SVG icon badges, ghost numbers, chevron connectors,
   outlined-icon stat row. Professional, restrained motion.
   ══════════════════════════════════════════════════════════════ */

const INK = "#141419";
const MUTED = "#6c6c78";
const PINK = "#ff2e63";
const PINK_DK = "#e01b50";
const BLUE = "#2f6bff";
const BLUE_DK = "#1d4fd6";
const PAGE = "#ffffff";
const SOFT = "#f7f8fb";
const CARD = "#ffffff";
const BORDER = "#ececf1";
const NAVY = "#1b2d6b";
// Brand logo shown at the top of the How It Works card (place file in /public/images/)
const LOGO = "/images/abhijit_art_logo.png";

const products = [
  { name: "Visiting Cards", price: "₹299", emoji: "📇", bg: "#efeaff" },
  { name: "Custom T-Shirts", price: "₹299", emoji: "👕", bg: "#ffe7ef" },
  { name: "LED Boards", price: "₹1,499", emoji: "🔠", bg: "#e7f0ff" },
  { name: "Name Plates", price: "₹599", emoji: "🏷️", bg: "#fdf3d8" },
  { name: "Stickers", price: "₹199", emoji: "🌈", bg: "#e4f6ee" },
  { name: "Printed Mugs", price: "₹349", emoji: "☕", bg: "#efeaff" },
];

/* ── inline SVG icons (no external dependency) ─────────────── */
type IcoProps = { size?: number; stroke?: number };
const baseIco = (size: number, stroke: number) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});
const FileIcon = ({ size = 30, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /><line x1="8" y1="9" x2="10" y2="9" />
  </svg>
);
const CloudUpIcon = ({ size = 30, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 4 16.25" />
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
  </svg>
);
const ClipCheckIcon = ({ size = 30, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="m9 14 2 2 4-4" />
  </svg>
);
const TruckIcon = ({ size = 30, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" />
  </svg>
);
const UsersIcon = ({ size = 22, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const ClipIcon = ({ size = 22, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
);
const AwardIcon = ({ size = 22, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <circle cx="12" cy="8" r="6" /><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11" />
  </svg>
);
const SmileIcon = ({ size = 22, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);
const ChevIcon = ({ size = 16, stroke = 2.4 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}><polyline points="9 18 15 12 9 6" /></svg>
);

/* ── service icons ─────────────────────────────────────────── */
const ImageIcon = ({ size = 26, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" />
  </svg>
);
const SparkIcon = ({ size = 26, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}><path d="m12 3 1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2L12 3Z" /></svg>
);
const PrinterIcon = ({ size = 26, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" rx="1" />
  </svg>
);
const ScissorsIcon = ({ size = 26, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);
const StampIcon = ({ size = 26, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <rect x="6" y="16" width="12" height="4" rx="1" />
    <path d="M9 16v-2a3 3 0 0 0-.8-2A3 3 0 0 1 7.5 8 4.5 4.5 0 0 1 12 4a4.5 4.5 0 0 1 4.5 4 3 3 0 0 1-.7 2 3 3 0 0 0-.8 2v2" />
  </svg>
);
const CreditCardIcon = ({ size = 26, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
);
const CupIcon = ({ size = 26, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    <line x1="6" y1="2" x2="6" y2="4" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="14" y1="2" x2="14" y2="4" />
  </svg>
);
const GridIcon = ({ size = 26, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);
const LayersIcon = ({ size = 26, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
  </svg>
);
const IdCardIcon = ({ size = 26, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="8" cy="10" r="2" />
    <path d="M14 9h4M14 13h4M5 16c.5-1.5 2-2 3-2s2.5.5 3 2" />
  </svg>
);
const UploadIcon = ({ size = 18, stroke = 2.2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

/* ── trusted-by strip icons (lighter stroke) ───────────────── */
const CapIcon = ({ size = 26, stroke = 1.7 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M22 10 12 5 2 10l10 5 10-5Z" />
    <path d="M6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5" />
    <path d="M22 10v6" />
  </svg>
);
const HospitalIcon = ({ size = 26, stroke = 1.7 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);
const BagIcon = ({ size = 26, stroke = 1.7 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
const DiningIcon = ({ size = 26, stroke = 1.7 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M5 2v6a2 2 0 0 0 4 0V2" />
    <line x1="7" y1="8" x2="7" y2="22" />
    <path d="M17 2c1.6 0 2.5 2 2.5 5v4H15V7c0-3 .9-5 2-5Z" />
    <line x1="17" y1="11" x2="17" y2="22" />
  </svg>
);
const OfficeIcon = ({ size = 26, stroke = 1.7 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <rect x="5" y="2" width="14" height="20" rx="1.5" />
    <path d="M9 22v-4h6v4" />
    <path d="M9 6h.01M12 6h.01M15 6h.01M9 10h.01M12 10h.01M15 10h.01M9 14h.01M12 14h.01M15 14h.01" />
  </svg>
);
const CalendarIcon = ({ size = 26, stroke = 1.7 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const LandmarkIcon = ({ size = 26, stroke = 1.7 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <polygon points="12 2 21 8 3 8" />
    <line x1="4" y1="11" x2="4" y2="18" /><line x1="9" y1="11" x2="9" y2="18" />
    <line x1="15" y1="11" x2="15" y2="18" /><line x1="20" y1="11" x2="20" y2="18" />
    <line x1="2" y1="21" x2="22" y2="21" />
  </svg>
);

/* ── feature-strip icons (white on a navy circle) ──────────── */
const BoltIcon = ({ size = 22 }: IcoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h8l-1 8 11-12h-8z" /></svg>
);
const ShieldIcon = ({ size = 22, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
);
const BoxIcon = ({ size = 22, stroke = 2 }: IcoProps) => (
  <svg {...baseIco(size, stroke)}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.3 7 12 12 20.7 7" /><line x1="12" y1="22" x2="12" y2="12" />
  </svg>
);
const PaletteIcon = ({ size = 22, stroke = 2 }: IcoProps) => (
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
  { name: "Flex Printing", sub: "High quality prints for banners, hoardings and large formats.", Icon: ImageIcon, tint: "#ffe7ef", img: "/images/services/flex-printing.jpeg" },
  { name: "Laser Cutting", sub: "Precision laser cutting for acrylic, wood, MDF and more.", Icon: SparkIcon, tint: "#e4f6ee", img: "/images/services/laser-cutting.jpeg" },
  { name: "Digital Printing", sub: "High resolution digital prints with vibrant colour quality.", Icon: PrinterIcon, tint: "#efeaff", img: "/images/services/digital-printing.jpeg" },
  { name: "Sticker Cutting", sub: "Custom sticker cutting in any shape, size or quantity.", Icon: ScissorsIcon, tint: "#fdf3d8", img: "/images/services/sticker-cutting.jpeg" },
  { name: "Stamp Making", sub: "All types of custom stamps for personal or business use.", Icon: StampIcon, tint: "#e7f0ff", img: "/images/services/stamp-making.jpeg" },
  { name: "PVC Card", sub: "Professional ID & PVC card printing with premium finishing.", Icon: CreditCardIcon, tint: "#ffe7ef", img: "/images/services/pvc-card.jpeg" },
  { name: "Cup Printing", sub: "Custom printed mugs & cups for gifts, branding and promotions.", Icon: CupIcon, tint: "#e4f6ee", img: "/images/services/cup-printing.jpeg" },
  { name: "LED Module", sub: "High quality LED boards & modules for bright display solutions.", Icon: GridIcon, tint: "#efeaff", img: "/images/services/led-module.jpeg" },
  { name: "Acrylic Board", sub: "Premium acrylic board printing for a sleek and modern look.", Icon: LayersIcon, tint: "#fdf3d8", img: "/images/services/acrylic-board.jpeg" },
  { name: "Visiting Card", sub: "Professional visiting cards with unique designs and finishes.", Icon: IdCardIcon, tint: "#e7f0ff", img: "/images/services/visiting-card.jpeg" },
];

const steps = [
  { title: "Choose Service", sub: "Select the printing service you need", Icon: FileIcon },
  { title: "Upload Design", sub: "Upload your design or requirement", Icon: CloudUpIcon },
  { title: "Confirm Order", sub: "We confirm and start the printing", Icon: ClipCheckIcon },
  { title: "Fast Delivery", sub: "Get your order delivered fast", Icon: TruckIcon },
];

const stats = [
  { value: "2500+", label: "Happy Clients", Icon: UsersIcon },
  { value: "5000+", label: "Projects Completed", Icon: ClipIcon },
  { value: "10+", label: "Years Experience", Icon: AwardIcon },
  { value: "99%", label: "Client Satisfaction", Icon: SmileIcon },
];

/* ── reveal-on-scroll hook ─────────────────────────────────── */
function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ── animated count-up for the stat numbers ────────────────── */
function CountUp({ value, run }: { value: string; run: boolean }) {
  const match = value.match(/^([\d,]+)(.*)$/);
  const target = match ? parseInt(match[1].replace(/,/g, ""), 10) : 0;
  const suffix = match ? match[2] : "";
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const dur = 1600;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target]);
  return (
    <>
      {n}
      {suffix}
    </>
  );
}

/* ── Gallery coverflow carousel (center image flat, sides tilted in 3D) ── */
function GalleryCoverflow() {
  // Real gallery photos from /public/images/gallery/ (square 1:1 images)
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

  // square slide size + spacing derived from it, so cards never overlap
  const slideW = Math.min(460, Math.max(240, Math.round(vw * 0.32)));
  const spacing = Math.round(slideW * 1.02);

  return (
    <section style={gx.wrap}>
      <div style={gx.inner}>
        <p style={gx.eyebrow}>OUR GALLERY</p>
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
                ? `0 26px 60px rgba(20,20,25,.22), 0 0 46px ${PINK}4d, 0 0 0 4px rgba(255,255,255,.7)`
                : "0 16px 34px rgba(20,20,25,.16)",
            };
            return (
              <div key={src + i} className="gx-card" style={slideStyle} onClick={() => !isActive && setActive(i)}>
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

          <button aria-label="Previous" style={{ ...gx.nav, ...gx.navL }} onClick={() => go(-1)}>‹</button>
          <button aria-label="Next" style={{ ...gx.nav, ...gx.navR }} onClick={() => go(1)}>›</button>
        </div>
      </div>
    </section>
  );
}

/* ── Testimonials slider (avatar overlapping card, animated with Framer Motion) ── */
function ReviewsSlider() {
  const reviews = [
    { name: "Rahul Sharma", role: "Business Owner, Sharma Traders", initials: "RS", text: "Abhijit Art provides the best quality printing services. Fast delivery and amazing work — highly recommended!" },
    { name: "Priya Das", role: "Marketing Head, Das Retail Group", initials: "PD", text: "From our shop signage to flex banners, everything was crisp and delivered on time. The team understood exactly what we wanted." },
    { name: "Amit Roy", role: "Event Manager, Roy Events", initials: "AR", text: "We order all our event standees and stickers here. Consistent quality, fair pricing, and they never miss a deadline." },
    { name: "Sneha Paul", role: "Founder, Paul Boutique", initials: "SP", text: "Our visiting cards and PVC tags came out beautifully. The finishing quality is genuinely premium." },
    { name: "Tarun Ghosh", role: "Owner, Ghosh Sweets", initials: "TG", text: "Their LED signboard transformed our storefront — bright, clean, and installed without any hassle." },
    { name: "Mou Sen", role: "Manager, Sen Pharmacy", initials: "MS", text: "Reliable for bulk printing. Whenever we need urgent orders, they always come through on time." },
  ];
  // duplicate the list so the marquee can loop seamlessly
  const loop = [...reviews, ...reviews];

  return (
    <section style={rv.wrap}>
      <div style={rv.inner}>
        <motion.h2
          style={rv.heading}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <span style={rv.headingSlash}>//</span> What our clients say
        </motion.h2>
      </div>

      <div className="rv-marquee">
        <div className="rv-track">
          {loop.map((r, i) => (
            <div key={i} style={rv.col}>
              <div style={rv.card}>
                <span style={rv.qicon} aria-hidden>&#10078;&#10078;</span>
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

  // Smooth-scroll to the Digital Services section when linked via /#digital-services
  useEffect(() => {
    if (hash === "#digital-services") {
      // small timeout lets the section mount before we scroll
      const t = setTimeout(() => {
        document.getElementById("digital-services")?.scrollIntoView({ behavior: "smooth" });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [hash]);

  return (
    <div style={st.page}>
      {/* ════════ HERO ════════ */}
      <section style={st.heroWrap}>
        <div style={st.heroBlob} />
        <div style={st.container}>
          <div className="aa-hero" style={st.heroInner}>
            <div className="aa-rise aa-hero-left" style={st.heroLeft}>
              <h1 style={st.heroTitle}>
                <span style={st.heroLine1}>Print Whatever</span>
                <span style={st.heroLine2}>You Want.</span>
              </h1>
              <p style={st.heroSub}>
                From t-shirt design to flex, laser cutting and stationery —
                we print everything to make your brand stand out.
              </p>
              <div style={st.heroBtns}>
                <Link to="/services" style={st.btnPink}>
                  Order Now <span style={st.btnArrow}>→</span>
                </Link>
                <Link to="/services" style={st.btnGhost}>Upload Design <UploadIcon /></Link>
              </div>
            </div>

            <div className="aa-rise aa-delay aa-hero-right" style={st.heroRight}>
              <img
                src="/images/abhijit_art_hero.png"
                alt="Abhijit Art — Printing & Design Studio showcasing flex printer, custom mug, visiting cards and branding materials"
                style={st.heroImage}
              />
            </div>
          </div>

          {/* Feature strip */}
          <div className="aa-feature-strip" style={st.featureStrip}>
            {features.map((f) => {
              const Icon = f.Icon;
              return (
                <div key={f.title} className="aa-feature-item" style={st.featureItem}>
                  <span style={st.featureIcon}><Icon /></span>
                  <div>
                    <p style={st.featureTitle}>{f.title}</p>
                    <p style={st.featureSub}>{f.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════ HOW IT WORKS ════════ */}
      <HowItWorks />

      {/* ════════ OUR SERVICES ════════ */}
      <section style={{ background: SOFT, padding: "96px 0" }}>
        <div style={st.container}>
          <div style={st.eyebrowRow}>
            <span style={st.eyeDash} />
            <span style={st.eyebrow2}>OUR SERVICES</span>
            <span style={st.eyeDash} />
          </div>
          <h2 style={st.h2}>Everything We Print &amp; Create</h2>
          <p style={st.lead}>Premium printing, signage and fabrication — all under one roof.</p>

          <div className="svc-grid">
            {services.map((sv) => {
              const Icon = sv.Icon;
              return (
                <div key={sv.name} className="aa-card" style={st.svcCard}>
                  <div style={st.svcMediaWrap}>
                    <div className="svc-media" style={{ ...st.svcMedia, background: sv.tint }}>
                      <img
                        src={sv.img}
                        alt={sv.name}
                        className="svc-zoom"
                        style={st.svcImg}
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    </div>
                    <div style={st.svcBadge}><Icon /></div>
                  </div>
                  <div style={st.svcBody}>
                    <h3 style={st.svcName}>{sv.name}</h3>
                    <p style={st.svcDesc}>{sv.sub}</p>
                    <div className="svc-order-wrap">
                      <div className="svc-order-inner">
                        <Link to="/services" className="svc-order">Order Now <span aria-hidden>→</span></Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: 52 }}>
            <Link to="/services" style={st.btnPinkLg}>View All Services →</Link>
          </div>
        </div>
      </section>

      {/* ════════ DIGITAL SERVICES — second pillar (Software + Marketing) ════════ */}
      <DigitalServices />

      {/* ════════ FEATURED PRODUCTS ════════ */}
      <section style={{ background: SOFT, padding: "96px 0" }}>
        <div style={st.container}>
          <p style={st.eyebrow}>OUR PRODUCTS</p>
          <h2 style={st.h2}>Featured Products</h2>
          <p style={st.lead}>High quality products for your brand</p>

          <div style={st.productGrid}>
            {products.map((p) => (
              <div key={p.name} className="aa-card" style={st.productCard}>
                <div style={{ ...st.productThumb, background: p.bg }}>{p.emoji}</div>
                <h4 style={st.productName}>{p.name}</h4>
                <p style={st.productPrice}>Starting {p.price}</p>
                <Link to="/services" style={st.orderBtn}>Order Now →</Link>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 48 }}>
            <Link to="/products" style={st.btnDark}>View All Products →</Link>
          </div>
        </div>
      </section>

      {/* ════════ WORK GALLERY (coverflow carousel) ════════ */}
      <GalleryCoverflow />

      {/* ════════ REVIEWS ════════ */}
      <ReviewsSlider />

      {/* ════════ CTA BANNER ════════ */}
      <section style={{ background: PAGE, padding: "0 0 96px" }}>
        <div className="aa-cta" style={{ ...st.container, ...st.ctaBanner }}>
          <div style={st.ctaGlow} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={st.ctaTitle}>Need Custom Printing<br />For Your Business?</h2>
            <p style={st.ctaSub}>Get premium quality printing with fast delivery</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to="/contact" style={st.ctaBtnLight}>Contact Us Now</Link>
              <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" style={st.ctaBtnWa}>
                💬 Chat on WhatsApp
              </a>
            </div>
          </div>
          <div style={st.ctaOffer}>
            <p style={st.offerUpto}>UPTO</p>
            <p style={st.offerPct}>30%</p>
            <p style={st.offerOff}>OFF</p>
            <p style={st.offerNote}>For Bulk Orders</p>
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&family=DM+Sans:wght@400;500;600;700&family=Archivo:wght@500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

        html, body { overflow-x: clip; }

        .aa-card { transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s, border-color .3s; }
        .aa-card:hover { transform: translateY(-8px); box-shadow: 0 24px 50px rgba(20,20,25,.10); border-color: ${PINK}44; }

        /* services card — image shrinks so Order Now fits, card height stays ~constant */
        .svc-media { height: 170px; transition: height .4s cubic-bezier(.2,.8,.2,1); }
        .aa-card:hover .svc-media { height: 118px; }
        .svc-order-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .4s cubic-bezier(.2,.8,.2,1); }
        .aa-card:hover .svc-order-wrap { grid-template-rows: 1fr; }
        .svc-order-inner { overflow: hidden; }
        .svc-order {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 14px;
          background: ${PINK}; color: #fff; padding: 9px 22px; border-radius: 10px;
          font-size: 13px; font-weight: 700; text-decoration: none; box-shadow: 0 8px 18px ${PINK}40;
          opacity: 0; transform: translateY(8px);
          transition: opacity .35s ease .05s, transform .35s cubic-bezier(.2,.8,.2,1) .05s, box-shadow .25s ease;
        }
        .aa-card:hover .svc-order { opacity: 1; transform: translateY(0); }
        .svc-order:hover { box-shadow: 0 12px 24px ${PINK}55; }
        @media (prefers-reduced-motion: reduce) {
          .svc-media, .svc-order-wrap, .svc-order { transition: none; }
        }

        /* feature strip — thin dividers, responsive */
        .aa-feature-item { border-left: 1px solid ${BORDER}; }
        .aa-feature-item:first-child { border-left: none; }
        @media (max-width: 760px) {
          .aa-feature-strip { grid-template-columns: repeat(2, 1fr) !important; }
          .aa-feature-item:nth-child(odd) { border-left: none; }
          .aa-feature-item:nth-child(n+3) { border-top: 1px solid ${BORDER}; }
        }
        @media (max-width: 460px) {
          .aa-feature-strip { grid-template-columns: 1fr !important; }
          .aa-feature-item { border-left: none !important; }
          .aa-feature-item:nth-child(n+2) { border-top: 1px solid ${BORDER}; }
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

        /* services grid — 5 up, responsive */
        .svc-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 26px; margin-top: 56px; align-items: start; }
        @media (max-width: 1200px) { .svc-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 760px)  { .svc-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; } }
        @media (max-width: 460px)  { .svc-grid { grid-template-columns: 1fr; } }

        /* trusted-by strip — wraps on smaller screens */
        @media (max-width: 1024px) {
          .tb-bar { flex-wrap: wrap !important; row-gap: 24px !important; padding: 24px 18px !important; }
          .tb-label { flex: 1 0 100% !important; text-align: center; padding: 0 0 4px !important; }
          .tb-item { flex: 1 0 28% !important; border-left: none !important; }
        }
        @media (max-width: 560px) {
          .tb-item { flex: 1 0 45% !important; }
          .tb-item span:last-child { white-space: normal !important; }
        }

        @keyframes aaRise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
        @keyframes aaFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .aa-rise { animation: aaRise .8s cubic-bezier(.2,.8,.2,1) both; }
        .aa-delay { animation-delay: .15s; }
        .aa-hero-img { animation: aaFloat 5s ease-in-out infinite; }

        /* How It Works — refined, professional motion */
        @keyframes aaPulse {
          0%   { transform: scale(.86); opacity: .5; }
          70%  { opacity: 0; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        .aa-pulse { animation: aaPulse 2.8s cubic-bezier(.4,0,.2,1) infinite; }

        @keyframes aaFlow { from { background-position: 0 0; } to { background-position: 14px 0; } }
        .aa-flowline { background-size: 14px 100% !important; animation: aaFlow 1.4s linear infinite; }

        @keyframes aaNudge { 0%,100% { transform: translateX(0); } 50% { transform: translateX(3px); } }
        .aa-nudge { animation: aaNudge 1.8s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .aa-pulse, .aa-flowline, .aa-nudge, .aa-hero-img { animation: none !important; }
        }

        @media (max-width: 920px) {
          .aa-hero { flex-direction: column !important; }
          .aa-hero-left h1 { font-size: 52px !important; }
          .aa-hero-right { max-width: 100% !important; }
          .aa-rail { display: none !important; }
          .aa-steps { flex-wrap: wrap !important; gap: 36px 20px !important; }
          .aa-step { flex: 1 1 42% !important; }
          .aa-statsbar { flex-wrap: wrap !important; }
          .aa-stat { flex: 1 1 42% !important; border-left: none !important; }
          .aa-cta { flex-direction: column !important; text-align: center; }
        }
        @media (max-width: 540px) {
          .aa-hero-left h1 { font-size: 40px !important; }
          .aa-step { flex: 1 1 100% !important; }
          .aa-stat { flex: 1 1 100% !important; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────── styles ───────────────────────── */
const st: Record<string, React.CSSProperties> = {
  page: {
    background: PAGE, color: INK, fontFamily: "'DM Sans', sans-serif",
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
  heroWrap: { position: "relative", background: PAGE, padding: "24px 0 40px", overflow: "hidden" },
  heroBlob: {
    position: "absolute", top: -180, right: -140, width: 620, height: 620, borderRadius: "50%",
    background: `radial-gradient(circle at 32% 30%, ${BLUE}16, transparent 62%), radial-gradient(circle at 70% 75%, ${PINK}10, transparent 60%)`,
    pointerEvents: "none",
  },
  heroInner: { display: "flex", gap: 48, alignItems: "center", position: "relative", zIndex: 1 },
  heroLeft: { flex: 1, minWidth: 300 },
  badge: {
    display: "inline-block", background: `${PINK}12`, color: PINK_DK, border: `1px solid ${PINK}33`,
    padding: "7px 16px", borderRadius: 30, fontSize: 12.5, fontWeight: 700, marginBottom: 28, letterSpacing: 0.3,
    fontFamily: "'DM Sans', sans-serif",
  },
  heroTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: 68, fontWeight: 800,
    lineHeight: 1.05, margin: "0 0 26px", letterSpacing: -1.5, color: INK,
  },
  heroLine1: { display: "block", fontStyle: "normal", fontWeight: 900 },
  heroLine2: { display: "block", fontStyle: "italic", color: PINK, fontWeight: 700 },
  heroSub: { color: MUTED, fontSize: 17, lineHeight: 1.75, maxWidth: 460, margin: "0 0 34px", fontFamily: "'DM Sans', sans-serif" },
  heroBtns: { display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 34, alignItems: "center" },
  btnArrow: { display: "inline-block", marginLeft: 8, transform: "translateY(1px)" },
  watch: { display: "flex", alignItems: "center", gap: 12 },
  playCircle: {
    width: 46, height: 46, borderRadius: "50%", background: BLUE, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
    boxShadow: `0 10px 22px ${BLUE}44`,
  },
  watchTitle: { margin: 0, color: INK, fontWeight: 700, fontSize: 14 },
  watchSub: { margin: 0, color: MUTED, fontSize: 12.5 },
  heroRight: { flex: 1.25, minWidth: 300, display: "flex", justifyContent: "center", alignItems: "center" },
  heroImage: { width: "100%", maxWidth: 760, maxHeight: "min(520px, 52vh)", height: "auto", objectFit: "contain", filter: "drop-shadow(0 20px 50px rgba(20,20,25,.12))" },

  /* FEATURE STRIP */
  featureStrip: {
    marginTop: 80, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 20,
    padding: "6px 8px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
    boxShadow: "0 18px 50px rgba(20,20,25,.07)", position: "relative", zIndex: 1,
  },
  featureItem: { display: "flex", alignItems: "center", gap: 14, padding: "12px 22px" },
  featureIcon: { width: 44, height: 44, flexShrink: 0, borderRadius: "50%", background: NAVY, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 18px ${NAVY}40` },
  featureTitle: { margin: 0, fontWeight: 700, fontSize: 15, color: INK },
  featureSub: { margin: 0, fontSize: 13, color: MUTED },

  /* shared */
  eyebrow: { textAlign: "center", color: PINK, fontWeight: 800, letterSpacing: 3, fontSize: 12, margin: "0 0 12px", fontFamily: "'DM Sans', sans-serif" },
  h2: { textAlign: "center", fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 800, margin: "0 0 12px", color: INK, letterSpacing: -0.5 },
  lead: { textAlign: "center", color: MUTED, fontSize: 16, margin: 0 },

  /* HOW IT WORKS band */
  howWrap: {
    background: "#ffffff",
    padding: "88px 0", position: "relative", overflow: "hidden",
  },
  howDots: {
    position: "absolute", top: -120, right: -90, width: 460, height: 460, borderRadius: "50%",
    background: `radial-gradient(circle, ${PINK}24, transparent 66%)`,
    pointerEvents: "none",
  },
  howRings: {
    position: "absolute", bottom: -150, left: -130, width: 480, height: 480, borderRadius: "50%",
    background: `radial-gradient(circle, ${PINK}1c, transparent 66%)`,
    pointerEvents: "none",
  },

  howLogo: {
    display: "block", margin: "0 auto 8px", height: 130, width: "auto",
    maxWidth: "90%", objectFit: "contain",
  },

  howCard: {
    background: `linear-gradient(160deg, #ffffff 0%, #fff4f8 55%, #ffe9f1 100%)`,
    borderRadius: 28, padding: "56px 48px 60px",
    border: "1px solid #ffe1ec",
    boxShadow: `0 40px 90px ${PINK}33, 0 0 70px ${PINK}22`,
  },

  stepRow: { marginTop: 48, display: "flex", gap: 20, position: "relative", alignItems: "flex-start" },

  /* connector rail */
  railWrap: { position: "absolute", left: 0, right: 0, top: 0, height: 132, pointerEvents: "none", zIndex: 0 },
  railLine: {
    position: "absolute", top: 65, left: "12.5%", right: "12.5%", height: 2,
    background: `repeating-linear-gradient(90deg, ${PINK}66 0 6px, transparent 6px 14px)`,
  },
  chevDot: {
    position: "absolute", top: 66, transform: "translate(-50%,-50%)",
    width: 32, height: 32, borderRadius: "50%", background: "#fff",
    border: `1px solid ${PINK}22`, boxShadow: `0 6px 16px ${PINK_DK}1f`,
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  stepItem: { flex: 1, textAlign: "center", position: "relative", zIndex: 1, minWidth: 0 },
  iconArea: { position: "relative", height: 132, display: "flex", alignItems: "center", justifyContent: "center" },
  badgeWrap: {
    position: "relative", width: 94, height: 94, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "#fff", boxShadow: `0 0 0 7px ${PINK}0d, 0 16px 30px ${PINK}26`,
    zIndex: 1,
  },
  pulseRing: {
    position: "absolute", inset: 0, borderRadius: "50%",
    border: `2px solid ${PINK}`, zIndex: 0,
  },
  badgeInner: {
    width: 70, height: 70, borderRadius: "50%", color: "#fff",
    background: `linear-gradient(145deg, ${PINK} 0%, ${PINK_DK} 100%)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: `0 10px 22px ${PINK}55`, zIndex: 1,
  },
  stepTitle: { margin: "4px 0 6px", fontSize: 17, fontWeight: 700, color: INK },
  stepSub: { margin: 0, fontSize: 13.5, color: MUTED, lineHeight: 1.55, maxWidth: 190, marginLeft: "auto", marginRight: "auto" },

  /* stats */
  statsBar: {
    marginTop: 54, display: "flex", alignItems: "center",
    background: `linear-gradient(120deg, ${PINK} 0%, ${PINK_DK} 100%)`,
    borderRadius: 24, padding: "24px 16px",
    boxShadow: `0 26px 64px ${PINK}3a`,
  },
  statItem: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "6px 18px" },
  statIcon: {
    width: 52, height: 52, flexShrink: 0, borderRadius: "50%", color: "#fff",
    border: "1.5px solid rgba(255,255,255,.45)", background: "rgba(255,255,255,.08)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  statValue: { margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 900, color: "#fff", lineHeight: 1.05 },
  statLabel: { margin: "3px 0 0", fontSize: 13.5, color: "rgba(255,255,255,.82)", fontWeight: 500 },

  /* SERVICES */
  eyebrowRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 14 },
  eyeDash: { width: 28, height: 2, background: PINK, borderRadius: 2, display: "block", opacity: 0.7 },
  eyebrow2: { color: PINK, fontWeight: 800, letterSpacing: 3, fontSize: 12.5, fontFamily: "'DM Sans', sans-serif" },
  svcCard: {
    background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: 14,
    boxShadow: "0 8px 26px rgba(20,20,25,.05)", position: "relative",
  },
  svcMediaWrap: { position: "relative" },
  svcMedia: {
    borderRadius: 16, overflow: "hidden", color: PINK, position: "relative",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  svcImg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" },
  svcBadge: {
    position: "absolute", left: "50%", bottom: -27, transform: "translateX(-50%)",
    width: 54, height: 54, borderRadius: "50%", color: "#fff",
    background: `linear-gradient(145deg, ${PINK} 0%, ${PINK_DK} 100%)`,
    border: "3px solid #fff", boxShadow: `0 10px 22px ${PINK}55`,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  svcBody: { paddingTop: 40, paddingBottom: 6, textAlign: "center" },
  svcName: { margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: INK },
  svcDesc: { margin: 0, fontSize: 13.5, color: MUTED, lineHeight: 1.6, maxWidth: 230, marginLeft: "auto", marginRight: "auto" },
  btnPinkLg: {
    display: "inline-flex", alignItems: "center", gap: 8, background: PINK, color: "#fff",
    padding: "15px 34px", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 15,
    boxShadow: `0 14px 30px ${PINK}45`,
  },

  /* PRODUCTS */
  productGrid: { marginTop: 52, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 22 },
  productCard: { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 18, textAlign: "center", boxShadow: "0 6px 20px rgba(20,20,25,.04)" },
  productThumb: { height: 130, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50, marginBottom: 16 },
  productName: { margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: INK },
  productPrice: { margin: "0 0 16px", fontSize: 14, color: PINK, fontWeight: 700 },
  orderBtn: { display: "block", background: INK, color: "#fff", padding: "11px 0", borderRadius: 12, textDecoration: "none", fontSize: 13, fontWeight: 700 },

  /* REVIEWS */
  reviewCard: { marginTop: 48, maxWidth: 720, marginLeft: "auto", marginRight: "auto", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: "40px 38px", boxShadow: "0 16px 44px rgba(20,20,25,.07)", textAlign: "center" },
  quoteMark: { fontFamily: "'Playfair Display', serif", fontSize: 64, color: PINK, lineHeight: 0.4, margin: "0 0 8px" },
  stars: { color: "#f5b21a", letterSpacing: 4, margin: "0 0 18px", fontSize: 20 },
  reviewText: { color: INK, lineHeight: 1.7, margin: "0 0 24px", fontSize: 18, fontWeight: 500 },
  reviewer: { display: "flex", alignItems: "center", gap: 12, justifyContent: "center" },
  reviewAvatar: { width: 48, height: 48, borderRadius: "50%", background: PINK, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 },
  reviewName: { margin: 0, color: INK, fontWeight: 700, textAlign: "left" },
  reviewRole: { margin: 0, color: MUTED, fontSize: 13, textAlign: "left" },

  /* CTA */
  ctaBanner: { background: `linear-gradient(120deg, ${PINK} 0%, ${PINK_DK} 100%)`, borderRadius: 26, padding: "54px 50px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap", position: "relative", overflow: "hidden", boxShadow: `0 28px 64px ${PINK}40` },
  ctaGlow: { position: "absolute", top: -80, right: -40, width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,.14)", pointerEvents: "none" },
  ctaTitle: { fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 800, margin: "0 0 12px", color: "#fff", lineHeight: 1.15, letterSpacing: -0.5 },
  ctaSub: { color: "#fff", opacity: 0.92, margin: "0 0 26px", fontSize: 15 },
  ctaBtnLight: { background: "#fff", color: INK, padding: "14px 28px", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 14 },
  ctaBtnWa: { background: "rgba(0,0,0,0.22)", color: "#fff", padding: "14px 28px", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 14 },
  ctaOffer: { color: "#fff", textAlign: "center", flexShrink: 0, position: "relative", zIndex: 1 },
  offerUpto: { margin: 0, fontSize: 14, opacity: 0.9, letterSpacing: 2 },
  offerPct: { margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 68, fontWeight: 900, lineHeight: 1 },
  offerOff: { margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: 2 },
  offerNote: { margin: "6px 0 0", fontSize: 13, opacity: 0.9 },

  /* buttons */
  btnPink: { background: PINK, color: "#fff", padding: "15px 30px", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 15, boxShadow: `0 12px 28px ${PINK}45`, display: "inline-flex", alignItems: "center" },
  btnGhost: { background: "#fff", color: INK, padding: "15px 30px", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 15, border: `1px solid ${BORDER}`, display: "inline-flex", alignItems: "center", gap: 8 },
  btnDark: { display: "inline-block", background: INK, color: "#fff", padding: "14px 32px", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 14 },
};

/* ── trusted-by strip styles ── */
const tb: Record<string, React.CSSProperties> = {
  wrap: { background: PAGE, padding: "8px 0 36px" },
  bar: {
    background: "#faf8f2", border: "1px solid #efe9dd", borderRadius: 22,
    display: "flex", alignItems: "center", padding: "22px 14px",
    boxShadow: "0 10px 30px rgba(20,20,25,.04)",
  },
  label: {
    flex: "0 0 auto", padding: "0 26px 0 18px", lineHeight: 1.4,
    fontWeight: 800, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", color: "#3a342c",
  },
  item: {
    flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
    alignItems: "center", gap: 10, padding: "0 12px", borderLeft: "1px solid #e7e0d2",
  },
  icon: { color: "#8a8175", display: "flex" },
  name: {
    fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase",
    color: "#6b6356", textAlign: "center", whiteSpace: "nowrap",
  },
};

/* ── gallery coverflow styles ── */
const gx: Record<string, React.CSSProperties> = {
  wrap: { background: "linear-gradient(180deg, #fafafd 0%, #eef0f6 100%)", padding: "84px 0 80px", color: INK, overflow: "hidden", width: "100%" },
  inner: { maxWidth: 1600, margin: "0 auto", padding: "0 clamp(16px, 3vw, 40px)", textAlign: "center", boxSizing: "border-box", position: "relative", zIndex: 1 },
  eyebrow: { color: PINK, fontWeight: 800, letterSpacing: 3, fontSize: 12, margin: "0 0 12px" },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 800, margin: "0 0 14px", color: INK, letterSpacing: -0.5 },
  rule: { display: "inline-block", width: 64, height: 3, borderRadius: 2, background: PINK },

  stage: { position: "relative", height: "clamp(300px, 32vw, 380px)", marginTop: 48, perspective: 1500 },
  glow: {
    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    background: `radial-gradient(circle, ${PINK}40 0%, ${PINK}18 38%, transparent 70%)`,
    filter: "blur(34px)", zIndex: 0, pointerEvents: "none",
  },
  slide: {
    position: "absolute", top: "50%", left: "50%",
    borderRadius: 18, overflow: "hidden", background: "#e9e9f1",
    transition: "transform .6s cubic-bezier(.25,.8,.25,1), opacity .6s ease, box-shadow .6s ease",
  },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  overlay: { position: "absolute", inset: 0, background: "rgba(20,20,28,.22)" },

  nav: {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 48, height: 48, borderRadius: "50%", border: "none",
    background: PINK, color: "#fff", fontSize: 26, lineHeight: 1, cursor: "pointer",
    zIndex: 100, boxShadow: `0 10px 24px ${PINK}66`,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  navL: { left: "clamp(6px, 1.5vw, 28px)" },
  navR: { right: "clamp(6px, 1.5vw, 28px)" },

  dots: { display: "flex", gap: 8, justifyContent: "center", marginTop: 30 },
  dot: { width: 9, height: 9, borderRadius: 9, border: "none", background: "rgba(255,255,255,.3)", cursor: "pointer", padding: 0, transition: "all .3s ease" },
  dotActive: { background: PINK, width: 26, borderRadius: 5 },
};

/* ── testimonials slider styles ── */
const rv: Record<string, React.CSSProperties> = {
  wrap: { padding: "84px 0", position: "relative", overflow: "hidden" },
  inner: { maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px, 3vw, 40px)", position: "relative", zIndex: 1 },
  heading: { fontFamily: "'JetBrains Mono', 'Courier New', monospace", fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 700, margin: "0 0 6px", color: INK, letterSpacing: -0.5 },
  headingSlash: { color: PINK },

  col: { width: "clamp(280px, 30vw, 360px)", flex: "0 0 auto" },
  card: {
    position: "relative", background: "#ffffff", border: `1px solid ${BORDER}`,
    borderRadius: 12, padding: "24px 24px 28px", minHeight: 180,
    boxShadow: "0 10px 30px rgba(20,20,25,.06)",
  },
  qicon: { display: "block", color: PINK, fontSize: 28, lineHeight: 1, marginBottom: 14, fontWeight: 700, letterSpacing: -2 },
  text: { fontFamily: "'JetBrains Mono', 'Courier New', monospace", color: "#4a4a55", fontSize: 14, lineHeight: 1.7, margin: 0 },
  tail: {
    position: "absolute", bottom: -8, left: 28, width: 15, height: 15,
    background: "#ffffff", borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
    transform: "rotate(45deg)",
  },

  person: { display: "flex", alignItems: "center", gap: 12, marginTop: 22, paddingLeft: 4 },
  avatar: {
    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
    background: `linear-gradient(145deg, ${PINK}, ${PINK_DK})`, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'JetBrains Mono', 'Courier New', monospace", fontWeight: 700, fontSize: 14,
    boxShadow: `0 6px 16px ${PINK}40`,
  },
  name: { fontFamily: "'JetBrains Mono', 'Courier New', monospace", color: INK, fontWeight: 700, fontSize: 14, margin: 0 },
  role: { fontFamily: "'JetBrains Mono', 'Courier New', monospace", color: MUTED, fontSize: 12.5, margin: "2px 0 0" },
};