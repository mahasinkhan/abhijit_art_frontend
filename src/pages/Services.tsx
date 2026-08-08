import { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useAnimationFrame } from "framer-motion";
import api from "../api";
import { useAuth } from "../context/AuthContext";

/* ──────────────────────────────────────────────────────────────
   SERVICES PAGE

   Design brief: simple, premium, professional. Which meant removing
   things rather than adding them —

     · ONE accent (terracotta) with gold as a quiet secondary, instead
       of six per-card colours competing for attention.
     · Service items read as dot-separated text rather than 64 bullet
       icons across the grid.
     · The card image no longer collapses on hover and "Book now" is
       always visible — the old hover-reveal hid the primary action
       completely on touch devices.
     · Card language matches the Home page (image · icon badge · title ·
       one line) so the two pages feel like the same site.

   IMAGE ASSETS
     /public/services/{printing,signage,fabrication,promotional,
                       merchandise,led,website,marketing}.jpg
     /public/images/gallery/work_{1..17}.jpeg  (+ award, papercup, etc.)

   HERO_IMG must be a CUT-OUT product shot on a transparent or ivory
   background. Do NOT point it at hero_image.jpeg — that file is a full
   banner with a dark navy background and the headline baked in.
   ────────────────────────────────────────────────────────────── */
const HERO_IMG = "/images/services/hero_product.png";

/* ── warm brand tokens — matched to Home / About ── */
const PAGE = "#f7f3ea";       // ivory page background
const WHITE = "#ffffff";      // card surface
const INK = "#2a231d";        // headings / primary text
const SLATE = "#6f6357";      // muted text on light
const LINE = "#e7ddcd";       // warm hairline border
const DEEP = "#241d17";       // darkest band (CTA start)
const DEEP2 = "#3a2f26";      // gradient stop for dark bands
const PANEL = "#2a231d";      // dark cards (why-choose / stats)
const FOG = "#c6b9a8";        // muted text on dark
const BLUSH = "#efe2d0";      // soft disc behind the hero product shot

/* one accent, one secondary — that's the whole palette now */
const TERRA = "#d9542f";
const TERRA_DK = "#c8461f";
const GOLD = "#c2974a";

/* ───────────────────────── data ───────────────────────── */
const SERVICES = [
  {
    n: "01", icon: "printer", img: "/services/printing.jpg",
    title: "Printing Solutions",
    items: ["Digital Printing", "One Way Vision", "Flex Printing", "Backlit Printing",
            "Vinyl Printing", "Roll-Up Standee", "Eco-Solvent Printing", "Banner Printing"],
  },
  {
    n: "02", icon: "sign", img: "/services/signage.jpg",
    title: "Signage & Branding",
    items: ["ACP Sign Board", "Neon Sign", "Acrylic Sign Board", "Channel Letter",
            "Glow Sign Board", "Reception Branding", "LED Sign Board", "Office Signage"],
  },
  {
    n: "03", icon: "zap", img: "/services/fabrication.jpg",
    title: "Fabrication & Laser Works",
    items: ["Laser Cutting", "Wooden Engraving", "CNC Cutting", "Metal Name Plates",
            "Acrylic Fabrication", "Custom Displays", "MDF Cutting"],
  },
  {
    n: "04", icon: "gift", img: "/services/promotional.jpg",
    title: "Promotional Products",
    items: ["Visiting Cards", "Brochures", "PVC Cards", "Flyers", "ID Cards",
            "Catalogues", "Letterheads", "Stickers", "Stamp Making"],
  },
  {
    n: "05", icon: "mug", img: "/services/merchandise.jpg",
    title: "Custom Merchandise",
    items: ["Mug Printing", "Corporate Gifts", "T-Shirt Printing", "Photo Frames",
            "Gift Printing", "Customized Products"],
  },
  {
    n: "06", icon: "monitor", img: "/services/led.jpg",
    title: "LED & Display Solutions",
    items: ["LED Modules", "LED Glow Boards", "LED Signage", "Indoor Displays",
            "LED Video Wall", "Outdoor Displays"],
  },
  {
    n: "07", icon: "code", img: "/services/website.jpg",
    title: "Website Development",
    items: ["Business Websites", "School Management Software", "Ecommerce Websites",
            "Billing Software", "Landing Pages", "SEO Ready Websites", "Custom Web Applications"],
  },
  {
    n: "08", icon: "megaphone", img: "/services/marketing.jpg",
    title: "Digital Marketing",
    items: ["Google Ads", "Local SEO", "Facebook Ads", "Content Marketing",
            "Instagram Marketing", "Lead Generation", "SEO"],
  },
];

const WHY = [
  { icon: "truck", title: "Fast Delivery", text: "Projects completed on time without compromising quality." },
  { icon: "factory", title: "In-House Production", text: "Printing, fabrication and design under one roof." },
  { icon: "medal", title: "Premium Materials", text: "Only high-quality materials and finishing." },
  { icon: "users", title: "Complete Branding Partner", text: "Offline and online solutions from a single team." },
];

const PROCESS = [
  { n: "01", icon: "grid", title: "Consultation", text: "Understanding your requirement." },
  { n: "02", icon: "pen", title: "Design", text: "Creative concepts and approval." },
  { n: "03", icon: "cog", title: "Production", text: "Printing, fabrication or development." },
  { n: "04", icon: "truck", title: "Delivery", text: "Installation or deployment." },
];

const INDUSTRIES = [
  { icon: "store", label: "Retail Stores" },
  { icon: "utensils", label: "Restaurants" },
  { icon: "cap", label: "Schools & Colleges" },
  { icon: "hospital", label: "Hospitals" },
  { icon: "bulb", label: "Startups" },
  { icon: "building", label: "Corporate Offices" },
  { icon: "home", label: "Real Estate" },
  { icon: "calendar", label: "Event Companies" },
];

const STATS = [
  { value: "5000+", label: "Projects Completed" },
  { value: "1000+", label: "Happy Clients" },
  { value: "10+", label: "Years Experience" },
  { value: "50+", label: "Services Offered" },
];

/* Real gallery assets from /public/images/gallery/. */
const PORTFOLIO = [
  { img: "/images/gallery/work_1.jpeg", label: "Work 1" },
  { img: "/images/gallery/work_2.jpeg", label: "Work 2" },
  { img: "/images/gallery/work_3.jpeg", label: "Work 3" },
  { img: "/images/gallery/work_4.jpeg", label: "Work 4" },
  { img: "/images/gallery/work_5.jpeg", label: "Work 5" },
  { img: "/images/gallery/work_6.jpeg", label: "Work 6" },
  { img: "/images/gallery/work_7.jpeg", label: "Work 7" },
  { img: "/images/gallery/work_8.jpeg", label: "Work 8" },
  { img: "/images/gallery/work_9.jpeg", label: "Work 9" },
  { img: "/images/gallery/work_10.jpeg", label: "Work 10" },
  { img: "/images/gallery/work_11.jpeg", label: "Work 11" },
  { img: "/images/gallery/work_12.jpeg", label: "Work 12" },
  { img: "/images/gallery/work_13.jpeg", label: "Work 13" },
  { img: "/images/gallery/work_14.jpeg", label: "Work 14" },
  { img: "/images/gallery/work_15.jpeg", label: "Work 15" },
  { img: "/images/gallery/work_16.jpeg", label: "Work 16" },
  { img: "/images/gallery/work_17.jpeg", label: "Work 17" },
  { img: "/images/gallery/award.jpeg", label: "Award & Recognition" },
  { img: "/images/gallery/papercup.jpeg", label: "Branded Paper Cup" },
  { img: "/images/gallery/resturant_card.jpeg", label: "Restaurant Card" },
  { img: "/images/gallery/volunteer_id_card.jpeg", label: "Volunteer ID Card" },
];

/* ───────────────────────── icons ───────────────────────── */
function Icon({ name, size = 22, stroke = "currentColor", sw = 1.8 }: { name: string; size?: number; stroke?: string; sw?: number }) {
  const p = { fill: "none", stroke, strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const map: Record<string, JSX.Element> = {
    printer: <><rect x="6" y="3" width="12" height="6" rx="1" {...p} /><path d="M6 14H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" {...p} /><rect x="6" y="13" width="12" height="8" rx="1" {...p} /></>,
    sign: <><rect x="4" y="4" width="16" height="9" rx="2" {...p} /><path d="M12 13v7M8 20h8" {...p} /></>,
    zap: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" {...p} />,
    gift: <><rect x="3" y="9" width="18" height="11" rx="1" {...p} /><path d="M12 9v11M3 13h18M12 9S9 9 8 7.5 9 4 10 5s2 4 2 4 1-3 2-4 3 .5 2 2.5S12 9 12 9z" {...p} /></>,
    mug: <><path d="M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z" {...p} /><path d="M16 10h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2" {...p} /><path d="M8 3v2M11 3v2" {...p} /></>,
    monitor: <><rect x="3" y="4" width="18" height="12" rx="2" {...p} /><path d="M9 20h6M12 16v4" {...p} /></>,
    code: <path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" {...p} />,
    megaphone: <><path d="M3 11v2a2 2 0 0 0 2 2h2l8 5V4l-8 5H5a2 2 0 0 0-2 2z" {...p} /><path d="M17 9a3 3 0 0 1 0 6" {...p} /></>,
    truck: <><rect x="1.5" y="6" width="12" height="9" rx="1" {...p} /><path d="M13.5 9h4l3 3v3h-7z" {...p} /><circle cx="6" cy="17.5" r="1.8" {...p} /><circle cx="17" cy="17.5" r="1.8" {...p} /></>,
    factory: <><path d="M3 21V9l6 4V9l6 4V5l3 2v14z" {...p} /><path d="M3 21h18" {...p} /></>,
    medal: <><circle cx="12" cy="14" r="5" {...p} /><path d="M9 2h6l-2 6h-2L9 2z" {...p} /></>,
    users: <><circle cx="9" cy="8" r="3" {...p} /><path d="M3 20a6 6 0 0 1 12 0" {...p} /><path d="M16 5.2A3 3 0 0 1 16 11M21 20a6 6 0 0 0-3.5-5.5" {...p} /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" {...p} /><rect x="14" y="3" width="7" height="7" rx="1.5" {...p} /><rect x="3" y="14" width="7" height="7" rx="1.5" {...p} /><rect x="14" y="14" width="7" height="7" rx="1.5" {...p} /></>,
    pen: <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" {...p} />,
    cog: <><circle cx="12" cy="12" r="3.2" {...p} /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" {...p} /></>,
    store: <><path d="M4 9h16v11H4z" {...p} /><path d="M3 9 5 4h14l2 5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" {...p} /></>,
    utensils: <path d="M5 3v8a2 2 0 0 0 2 2v8M9 3v8M7 3v6M16 3c-2 0-3 2-3 5s1 4 3 4v9" {...p} />,
    cap: <><path d="M2 9 12 5l10 4-10 4L2 9z" {...p} /><path d="M6 11v4c0 1.5 2.7 3 6 3s6-1.5 6-3v-4M22 9v5" {...p} /></>,
    hospital: <><rect x="4" y="3" width="16" height="18" rx="1.5" {...p} /><path d="M12 8v6M9 11h6" {...p} /></>,
    bulb: <><path d="M9 18h6M10 21h4" {...p} /><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" {...p} /></>,
    building: <><rect x="5" y="3" width="14" height="18" rx="1" {...p} /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" {...p} /></>,
    home: <path d="M4 11 12 4l8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" {...p} />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" {...p} /><path d="M3 9h18M8 3v4M16 3v4" {...p} /></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" {...p} /><circle cx="12" cy="12" r="2.6" {...p} /></>,
    phone: <path d="M5 3h3l2 5-2 1a12 12 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" {...p} />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" {...p} />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {map[name]}
    </svg>
  );
}

/* graceful image w/ gradient fallback */
function Media({ src, alt, c1, c2, style }: { src: string; alt: string; c1: string; c2: string; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${c1}, ${c2})`, ...style }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}

const rise = (d = 0) => ({
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, delay: d, ease: "easeOut" as const },
});

const EASE = [0.22, 1, 0.36, 1] as const;
const gridV = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const cardV = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};
const headV = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/* work-process: build step by step */
const procContV = { hidden: {}, show: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } } };
const stepV = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } };
const arrowV = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4, ease: EASE } } };

/* booking form defaults */
const emptyForm = {
  quantity: 1,
  notes: "",
  contactPhone: "",
  deliveryMethod: "pickup",
  address: "",
  preferredDate: "",
  designLink: "",
};

/* direction-aware step slide */
const panelV = {
  enter: (d: number) => ({ opacity: 0, x: d > 0 ? 36 : -36 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d > 0 ? -36 : 36 }),
};

type Svc = (typeof SERVICES)[number];
type PortfolioItem = { img: string; label: string };

/* ─────────────────────────────────────────────────────────────
   PORTFOLIO MARQUEE
   Infinite auto-scroll you can grab & drag.
   ───────────────────────────────────────────────────────────── */
function PortfolioMarquee({ items, speed = 55 }: { items: PortfolioItem[]; speed?: number }) {
  const baseX = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const setWidth = useRef(0);       // width of ONE copy of the list
  const paused = useRef(false);     // hover
  const dragging = useRef(false);   // active pointer drag
  const reduced = useRef(false);    // prefers-reduced-motion
  const start = useRef({ x: 0, base: 0 });

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = items.length;
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const cards = track.children;
      if (cards.length > n) {
        setWidth.current =
          (cards[n] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft;
      } else {
        setWidth.current = track.scrollWidth / 2;
      }
    };
    measure();
    window.addEventListener("resize", measure);
    const imgs = Array.from(trackRef.current?.querySelectorAll("img") ?? []);
    imgs.forEach((im) => im.addEventListener("load", measure));
    return () => {
      window.removeEventListener("resize", measure);
      imgs.forEach((im) => im.removeEventListener("load", measure));
    };
  }, [items.length]);

  const wrap = (v: number) => {
    const w = setWidth.current;
    if (!w) return v;
    let n = v;
    while (n <= -w) n += w;
    while (n > 0) n -= w;
    return n;
  };

  useAnimationFrame((_, delta) => {
    if (paused.current || dragging.current || reduced.current || !setWidth.current) return;
    const dt = Math.min(delta, 40);
    baseX.set(wrap(baseX.get() - speed * (dt / 1000)));
  });

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    start.current = { x: e.clientX, base: baseX.get() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    baseX.set(wrap(start.current.base + (e.clientX - start.current.x)));
  };
  const onUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const loop = [...items, ...items];

  return (
    <div
      className="ab-marquee"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <motion.div ref={trackRef} className="ab-marquee-track" style={{ x: baseX }}>
        {loop.map((p, i) => (
          <div className="ab-marquee-card" style={st.portCard} key={i}>
            <Media src={p.img} alt={p.label} c1={i % 2 ? GOLD : TERRA} c2={DEEP2} style={st.portMedia} />
            <span className="ab-port-label" style={st.portLabel}>{p.label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ───────────────────────── page ───────────────────────── */
export default function Services() {
  const navigate = useNavigate();
  const { user } = useAuth();

  /* booking modal state */
  const [booking, setBooking] = useState<Svc | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState("");

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(""), 5000);
    return () => clearTimeout(t);
  }, [done]);

  const openBooking = (s: Svc) => {
    if (!user) return navigate("/login");
    setDone("");
    setStep(1);
    setDir(1);
    setForm({ ...emptyForm, contactPhone: user.phone || "" });
    setBooking(s);
  };
  const closeBooking = () => { setBooking(null); setStep(1); };

  const handlePrimary = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { setDir(1); setStep(2); return; }
    submitBooking();
  };

  const submitBooking = async () => {
    if (!booking) return;
    setSubmitting(true);
    try {
      // these cards are categories without a DB id — send the name.
      await api.post("/api/bookings", { serviceName: booking.title, ...form });
      const name = booking.title;
      closeBooking();
      setDone(`Your booking for "${name}" was sent! Check "My Bookings".`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={st.page}>
      {/* ════════ HERO ════════ */}
      <section style={st.hero}>
        <div className="ab-hero-grid" style={st.container}>
          <motion.div
            style={st.heroLeft}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span style={st.heroEyebrow}>
              <i style={st.heroDash} />
              OUR SERVICES
            </span>
            <h1 style={st.heroTitle}>
              Everything your brand needs
              <span style={st.heroTitleAccent}>designed, printed &amp; delivered.</span>
            </h1>
            <p style={st.heroText}>
              From premium printing and signage to websites, digital marketing and custom
              fabrication — Abhijit Art helps businesses build a powerful brand presence
              both online and offline.
            </p>
            <div style={st.heroBtns}>
              <button className="ab-solid-btn" style={st.heroQuoteBtn} onClick={() => navigate("/contact")}>
                GET FREE QUOTE <span>→</span>
              </button>
              <button className="ab-hero-outline" style={st.heroOutlineBtn} onClick={() => navigate("/portfolio")}>
                VIEW PORTFOLIO <Icon name="eye" size={18} />
              </button>
            </div>
          </motion.div>

          <motion.div
            className="ab-hero-art"
            style={st.heroArt}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          >
            <span style={st.heroBlob} />
            <img
              src={HERO_IMG}
              alt="Printing, signage and branding work by Abhijit Art"
              style={st.heroImg}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
            />
          </motion.div>
        </div>
      </section>

      {/* ════════ SERVICES GRID ════════ */}
      <section style={st.svcSection}>
        <div style={st.container}>
          <motion.div
            style={st.svcHeading}
            variants={headV}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
          >
            <span style={st.eyebrow}>WHAT WE OFFER</span>
            <h2 style={st.sectionTitle}>Eight ways we can help</h2>
            <p style={st.sectionSub}>
              Printing, signage, fabrication and digital — every brand need, handled end to end
              under one roof.
            </p>
          </motion.div>

          <motion.div
            className="ab-svc-grid"
            variants={gridV}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.08 }}
          >
            {SERVICES.map((s) => (
              <motion.article key={s.title} className="ab-svc-card" style={st.svcCard} variants={cardV}>
                {/* inset image with the icon badge centred on its lower edge */}
                <div style={st.svcMediaWrap}>
                  <div style={st.svcMedia}>
                    <Media src={s.img} alt={s.title} c1={TERRA} c2={DEEP2} style={{ width: "100%", height: "100%" }} />
                  </div>
                  <span style={st.svcBadge}>
                    <Icon name={s.icon} size={18} stroke={TERRA} />
                  </span>
                </div>

                <div style={st.svcBody}>
                  <h3 style={st.svcTitle}>{s.title}</h3>
                  {/* the item list IS the description — no invented strapline */}
                  <p style={st.svcItems}>{s.items.join(" · ")}</p>
                  <button className="ab-book-link" style={st.bookLink} onClick={() => openBooking(s)}>
                    Book now <Icon name="arrow" size={14} sw={2.2} />
                  </button>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════ WHY CHOOSE ════════ */}
      <section style={st.section}>
        <div style={st.container}>
          <motion.div style={st.whyBand} {...rise()}>
            <div style={st.whyHead}>
              <span style={st.whyKicker}>WHY CHOOSE</span>
              <h2 style={st.whyTitle}>Abhijit Art</h2>
            </div>
            <div className="ab-why-grid">
              {WHY.map((w) => (
                <div key={w.title} style={st.whyItem}>
                  <span style={st.whyIcon}><Icon name={w.icon} size={24} stroke={GOLD} /></span>
                  <h4 style={st.whyItemTitle}>{w.title}</h4>
                  <p style={st.whyItemText}>{w.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════ WORK PROCESS ════════ */}
      <section style={st.section}>
        <div style={st.container}>
          <motion.div style={st.svcHeading} {...rise()}>
            <span style={st.eyebrow}>HOW IT WORKS</span>
            <h2 style={st.sectionTitle}>Our process</h2>
          </motion.div>
          <motion.div
            className="ab-proc-row"
            variants={procContV}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            {PROCESS.map((p, i) => (
              <Fragment key={p.n}>
                <motion.div className="ab-proc-card" style={st.procCard} variants={stepV}>
                  <span style={st.procIcon}><Icon name={p.icon} size={21} stroke={TERRA} /></span>
                  <span style={st.procNum}>{p.n}</span>
                  <h4 style={st.procTitle}>{p.title}</h4>
                  <p style={st.procText}>{p.text}</p>
                </motion.div>
                {i < PROCESS.length - 1 && (
                  <motion.span className="ab-proc-arrow" style={st.procArrow} variants={arrowV}>→</motion.span>
                )}
              </Fragment>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════ INDUSTRIES + STATS ════════ */}
      <section style={st.section}>
        <div style={{ ...st.container, ...st.indWrap }}>
          <motion.div style={st.indBox} {...rise()}>
            <p style={st.indKicker}>INDUSTRIES WE SERVE</p>
            <div className="ab-ind-grid">
              {INDUSTRIES.map((ind) => (
                <div key={ind.label} style={st.indItem}>
                  <span style={st.indIcon}><Icon name={ind.icon} size={22} stroke={SLATE} /></span>
                  <span style={st.indLabel}>{ind.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div style={st.statBox} {...rise(0.08)}>
            <div className="ab-stat-grid">
              {STATS.map((s) => (
                <div key={s.label} style={st.statItem}>
                  <span style={st.statValue}>{s.value}</span>
                  <span style={st.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════ PORTFOLIO PREVIEW ════════ */}
      <section style={st.section}>
        <div style={st.container}>
          <motion.div style={st.svcHeading} {...rise()}>
            <span style={st.eyebrow}>OUR WORK</span>
            <h2 style={st.sectionTitle}>Recent projects</h2>
          </motion.div>
          <PortfolioMarquee items={PORTFOLIO} />
          <div style={{ textAlign: "center", marginTop: 30 }}>
            <button className="ab-solid-btn" style={st.primaryBtn} onClick={() => navigate("/portfolio")}>
              EXPLORE PORTFOLIO <span>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section style={{ ...st.section, paddingBottom: 80 }}>
        <div style={st.container}>
          <motion.div style={st.ctaBand} {...rise()}>
            <span style={st.ctaWatermark}>A</span>
            <div style={{ position: "relative", zIndex: 1 }}>
              <p style={st.ctaKicker}>READY TO GROW YOUR BRAND?</p>
              <h2 style={st.ctaTitle}>
                Let's create something
                <br />
                <span style={st.ctaTitleAccent}>amazing together.</span>
              </h2>
            </div>
            <div style={st.ctaRight}>
              <p style={st.ctaText}>
                Whether you need a signboard, a website, a marketing campaign or complete branding —
                Abhijit Art is your one-stop creative partner.
              </p>
              <div style={st.ctaBtns}>
                <button className="ab-solid-btn" style={st.primaryBtn} onClick={() => navigate("/contact")}>
                  REQUEST A QUOTE <span>→</span>
                </button>
                <a href="tel:+917405179066" className="ab-call-btn" style={st.callBtn}>
                  <Icon name="phone" size={18} />
                  <span>
                    <small style={{ display: "block", fontSize: 11, opacity: 0.8 }}>Call now</small>
                    +91 74051 79066
                  </span>
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════ SUCCESS TOAST ════════ */}
      <AnimatePresence>
        {done && (
          <motion.div
            style={st.toast}
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          >
            <span style={st.toastTick}>✓</span>
            <span>{done}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════ BOOKING MODAL ════════ */}
      <AnimatePresence>
        {booking && (
          <motion.div
            style={st.backdrop}
            onClick={closeBooking}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              style={st.modal}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 22 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
            >
              <div style={st.modalHead}>
                <span style={st.modalIcon}>
                  <Icon name={booking.icon} size={21} stroke={TERRA} />
                </span>
                <div>
                  <p style={st.modalLabel}>BOOK SERVICE</p>
                  <h3 style={st.modalTitle}>{booking.title}</h3>
                </div>
              </div>

              <div style={st.steps}>
                <span style={{ ...st.stepSeg, background: TERRA }} />
                <span style={{ ...st.stepSeg, background: step >= 2 ? TERRA : LINE }} />
              </div>
              <p style={st.stepLabel}>
                Step {step} of 2 — {step === 1 ? "Order basics" : "Delivery & details"}
              </p>

              <form onSubmit={handlePrimary}>
                <motion.div layout transition={{ duration: 0.28, ease: "easeOut" }} style={{ overflow: "hidden" }}>
                  <AnimatePresence mode="wait" custom={dir} initial={false}>
                    {step === 1 ? (
                      <motion.div key="s1" custom={dir} variants={panelV} initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: "easeOut" }}>
                        <label style={st.mLabel}>Quantity</label>
                        <input className="ab-input" type="number" min="1" value={form.quantity}
                          onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />

                        <label style={st.mLabel}>Contact phone</label>
                        <input className="ab-input" value={form.contactPhone} placeholder="Your phone number"
                          onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />

                        <label style={st.mLabel}>Details / notes</label>
                        <textarea className="ab-input" rows={3} value={form.notes} placeholder="Size, colour, design link, etc."
                          onChange={(e) => setForm({ ...form, notes: e.target.value })} />

                        <div style={st.modalActions}>
                          <button type="button" className="ab-ghost" style={st.ghostBtn} onClick={closeBooking}>Cancel</button>
                          <button type="submit" className="ab-solid-btn" style={st.confirmBtn}>Continue <span>→</span></button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="s2" custom={dir} variants={panelV} initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: "easeOut" }}>
                        <label style={st.mLabel}>Delivery method</label>
                        <div style={st.segRow}>
                          {["pickup", "delivery"].map((m) => (
                            <button key={m} type="button"
                              style={{ ...st.segBtn, ...(form.deliveryMethod === m ? st.segOn : {}) }}
                              onClick={() => setForm({ ...form, deliveryMethod: m })}>
                              {m === "pickup" ? "Pickup" : "Delivery"}
                            </button>
                          ))}
                        </div>

                        <AnimatePresence initial={false}>
                          {form.deliveryMethod === "delivery" && (
                            <motion.div key="addr" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} style={{ overflow: "hidden" }}>
                              <label style={st.mLabel}>Delivery address</label>
                              <textarea className="ab-input" rows={2} value={form.address} placeholder="Where should we deliver?"
                                onChange={(e) => setForm({ ...form, address: e.target.value })} />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <label style={st.mLabel}>Preferred date</label>
                        <input className="ab-input" type="date" value={form.preferredDate}
                          onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} />

                        <label style={st.mLabel}>Design file link <span style={st.opt}>(optional)</span></label>
                        <input className="ab-input" type="url" value={form.designLink} placeholder="Google Drive / Dropbox link"
                          onChange={(e) => setForm({ ...form, designLink: e.target.value })} />

                        <div style={st.modalActions}>
                          <button type="button" className="ab-ghost" style={st.ghostBtn} onClick={() => { setDir(-1); setStep(1); }}>← Back</button>
                          <button type="submit" className="ab-solid-btn" style={st.confirmBtn} disabled={submitting}>
                            {submitting ? "Sending…" : "Confirm booking"}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────────────────────── css ───────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700;800&display=swap');

        /* flat terracotta buttons */
        .ab-solid-btn {
          background: ${TERRA}; color: #fff; border: none; cursor: pointer;
          font-family: inherit; font-weight: 700; letter-spacing: .6px;
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          box-shadow: 0 10px 26px rgba(217,84,47,.24); transition: transform .25s, box-shadow .25s, background .25s;
        }
        .ab-solid-btn span { transition: transform .25s; display: inline-block; }
        .ab-solid-btn:hover { transform: translateY(-2px); background: ${TERRA_DK}; box-shadow: 0 16px 34px rgba(217,84,47,.32); }
        .ab-solid-btn:hover span { transform: translateX(4px); }

        .ab-hero-outline { transition: border-color .2s, color .2s, transform .25s; }
        .ab-hero-outline:hover { border-color: ${TERRA}; color: ${TERRA}; transform: translateY(-2px); }

        /* hero */
        .ab-hero-grid {
          display: grid; grid-template-columns: minmax(0,1.05fr) minmax(0,1fr);
          gap: clamp(24px, 4vw, 56px); align-items: center;
        }
        @media (max-width: 900px) {
          .ab-hero-grid { grid-template-columns: 1fr; gap: 30px; }
          .ab-hero-art { max-width: 480px; margin: 0 auto; }
        }

        /* ── services grid: 4-up so eight cards fill two even rows ── */
        .ab-svc-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 24px; }
        @media (max-width: 1180px) { .ab-svc-grid { grid-template-columns: repeat(3, minmax(0,1fr)); } }
        @media (max-width: 860px)  { .ab-svc-grid { grid-template-columns: repeat(2, minmax(0,1fr)); gap: 18px; } }
        @media (max-width: 560px)  { .ab-svc-grid { grid-template-columns: minmax(0,1fr); } }

        /* the only card animation: a small lift on hover */
        .ab-svc-card { transition: transform .25s ease, box-shadow .25s ease; }
        .ab-svc-card:hover { transform: translateY(-4px); box-shadow: 0 14px 30px rgba(42,35,29,.09); }

        /* the CTA is always visible — it just warms up on hover */
        .ab-book-link { transition: color .2s, gap .2s; }
        .ab-book-link:hover { color: ${TERRA_DK}; gap: 10px; }

        /* booking form */
        .ab-input {
          width: 100%; box-sizing: border-box; padding: 11px 14px; border: 1px solid ${LINE};
          border-radius: 10px; font-size: 14px; font-family: inherit; margin-top: 6px; outline: none;
          transition: border-color .2s, box-shadow .2s; background: #fff; color: ${INK};
        }
        .ab-input:focus { border-color: ${TERRA}; box-shadow: 0 0 0 3px ${TERRA}22; }
        .ab-ghost { transition: background .2s; }
        .ab-ghost:hover { background: ${PAGE}; }

        /* why-choose */
        .ab-why-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 28px; flex: 1; }
        @media (max-width: 880px) { .ab-why-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (max-width: 460px) { .ab-why-grid { grid-template-columns: minmax(0,1fr); } }

        /* process */
        .ab-proc-row { display: flex; align-items: stretch; gap: 10px; }
        .ab-proc-card { flex: 1; transition: transform .3s, box-shadow .3s; }
        .ab-proc-card:hover { transform: translateY(-5px); box-shadow: 0 18px 36px rgba(42,35,29,.08); }
        @media (max-width: 880px) {
          .ab-proc-row { flex-direction: column; }
          .ab-proc-arrow { transform: rotate(90deg); align-self: center; }
        }

        /* industries + stats */
        .ab-ind-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 24px 12px; }
        @media (max-width: 520px) { .ab-ind-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        .ab-stat-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 32px 40px; }

        /* moving portfolio strip */
        .ab-marquee {
          position: relative; overflow: hidden; cursor: grab;
          user-select: none; -webkit-user-select: none; touch-action: pan-y;
          -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 5%, #000 95%, transparent 100%);
                  mask-image: linear-gradient(90deg, transparent 0, #000 5%, #000 95%, transparent 100%);
        }
        .ab-marquee:active { cursor: grabbing; }
        .ab-marquee-track { display: flex; gap: 16px; width: max-content; will-change: transform; }
        .ab-marquee-card {
          position: relative; flex: 0 0 auto; width: clamp(200px, 18vw, 260px);
          transition: transform .35s cubic-bezier(.22,1,.36,1);
        }
        .ab-marquee-card img { pointer-events: none; -webkit-user-drag: none; }
        .ab-marquee:hover .ab-marquee-card:hover { transform: translateY(-6px); }
        .ab-marquee-card:hover .ab-port-label { opacity: 1; transform: translateY(0); }
        @media (max-width: 540px) { .ab-marquee-track { gap: 12px; } .ab-marquee-card { width: 62vw; } }

        .ab-call-btn:hover { background: #fff; color: ${INK}; }

        @media (prefers-reduced-motion: reduce) {
          .ab-solid-btn, .ab-svc-card, .ab-proc-card, .ab-marquee-card, .ab-solid-btn span { transition: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────── styles ───────────────────────── */
const st: Record<string, React.CSSProperties> = {
  page: { background: PAGE, color: INK, fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: "100vh", overflowX: "hidden" },
  container: { maxWidth: 1400, margin: "0 auto", width: "100%", boxSizing: "border-box", padding: "0 clamp(18px, 4vw, 56px)", position: "relative" },
  section: { padding: "clamp(40px, 6vw, 72px) 0" },

  /* hero */
  hero: { position: "relative", padding: "clamp(96px, 13vh, 148px) 0 clamp(36px, 5vw, 64px)" },
  heroLeft: { position: "relative", zIndex: 1 },
  heroEyebrow: { display: "inline-flex", alignItems: "center", gap: 14, color: TERRA, fontSize: 12.5, fontWeight: 700, letterSpacing: 3, marginBottom: 20 },
  heroDash: { display: "inline-block", width: 34, height: 2, background: TERRA },
  heroTitle: { fontFamily: "'Fraunces', serif", fontSize: "clamp(34px, 4.8vw, 60px)", fontWeight: 600, color: INK, lineHeight: 1.06, letterSpacing: -1.1, margin: 0 },
  heroTitleAccent: { display: "block", color: TERRA },
  heroText: { color: SLATE, fontSize: "clamp(15px, 1.15vw, 16.5px)", lineHeight: 1.85, margin: "24px 0 32px", maxWidth: 520 },
  heroBtns: { display: "flex", gap: 14, flexWrap: "wrap" },
  heroQuoteBtn: { padding: "15px 28px", borderRadius: 10, fontSize: 13.5 },
  heroOutlineBtn: {
    padding: "15px 26px", borderRadius: 10, fontSize: 13.5, fontWeight: 700, letterSpacing: ".6px", cursor: "pointer",
    fontFamily: "inherit", background: WHITE, color: INK, border: `1px solid ${LINE}`,
    display: "inline-flex", alignItems: "center", gap: 10,
  },
  heroArt: { position: "relative", width: "100%", display: "grid", placeItems: "center" },
  heroBlob: { position: "absolute", top: "6%", left: "50%", transform: "translateX(-50%)", width: "76%", aspectRatio: "1 / 1", borderRadius: "50%", background: BLUSH, zIndex: 0 },
  heroImg: { position: "relative", zIndex: 1, width: "100%", height: "auto", display: "block", objectFit: "contain" },

  primaryBtn: { padding: "14px 26px", borderRadius: 10, fontSize: 13.5 },

  /* shared section heading */
  svcSection: { padding: "clamp(44px, 6vw, 80px) 0" },
  svcHeading: { textAlign: "center", maxWidth: 620, margin: "0 auto clamp(32px, 4vw, 48px)" },
  eyebrow: { display: "inline-block", color: TERRA, fontSize: 12, fontWeight: 700, letterSpacing: 3.4, marginBottom: 14 },
  sectionTitle: { fontFamily: "'Fraunces', serif", fontSize: "clamp(28px, 3.6vw, 42px)", fontWeight: 600, color: INK, margin: "0 0 14px", letterSpacing: -0.6 },
  sectionSub: { color: SLATE, fontSize: 15.5, lineHeight: 1.75, margin: 0 },

  /* ── service card: image · badge · title · one line · items · CTA ── */
  /* card matches the Home grid exactly: inset image, badge centred on its
     lower edge, everything below centre-aligned */
  svcCard: {
    position: "relative", background: WHITE, border: `1px solid ${LINE}`, borderRadius: 14,
    padding: 11, display: "flex", flexDirection: "column", textAlign: "center",
    boxShadow: "0 3px 14px rgba(42,35,29,.05)",
  },
  svcMediaWrap: { position: "relative", flexShrink: 0 },
  svcMedia: { width: "100%", aspectRatio: "3 / 2", overflow: "hidden", borderRadius: 10 },
  svcBadge: {
    position: "absolute", left: "50%", bottom: -20, transform: "translateX(-50%)",
    width: 40, height: 40, borderRadius: "50%", background: WHITE,
    display: "grid", placeItems: "center", boxShadow: "0 4px 14px rgba(42,35,29,.16)",
  },
  svcBody: { padding: "30px 12px 12px", display: "flex", flexDirection: "column", flex: 1, alignItems: "center" },
  svcTitle: { fontSize: 15.5, fontWeight: 700, color: INK, margin: "0 0 4px", lineHeight: 1.3, letterSpacing: -0.1 },
  /* the list is now the card's body copy, so it reads a shade darker */
  svcItems: { fontSize: 12.5, color: SLATE, lineHeight: 1.75, margin: "14px 0 16px", flex: 1 },
  bookLink: {
    display: "inline-flex", alignItems: "center", gap: 6, marginTop: "auto", padding: 0,
    border: "none", background: "transparent", color: TERRA, fontFamily: "inherit",
    fontWeight: 700, fontSize: 12.5, cursor: "pointer",
  },

  /* booking modal + toast */
  toast: {
    position: "fixed", top: 90, left: "50%", transform: "translateX(-50%)", zIndex: 1100,
    display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${LINE}`,
    borderLeft: `4px solid ${GOLD}`, color: INK, padding: "13px 20px", borderRadius: 12,
    fontSize: 14, fontWeight: 600, boxShadow: "0 16px 40px rgba(42,35,29,.18)", maxWidth: "90vw",
  },
  toastTick: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22,
    borderRadius: "50%", background: GOLD, color: "#fff", fontSize: 13, flexShrink: 0,
  },
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(36,29,23,.55)", backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20, zIndex: 1000,
  },
  modal: {
    background: "#fff", borderRadius: 20, padding: "26px 26px 24px", width: "100%", maxWidth: 430,
    border: `1px solid ${LINE}`, boxShadow: "0 30px 80px rgba(36,29,23,.32)", boxSizing: "border-box",
  },
  modalHead: { display: "flex", alignItems: "center", gap: 14, marginBottom: 18 },
  modalIcon: { width: 48, height: 48, flexShrink: 0, borderRadius: 14, display: "grid", placeItems: "center", background: `${TERRA}14` },
  modalLabel: { margin: 0, color: TERRA, fontWeight: 800, letterSpacing: 2, fontSize: 10.5 },
  modalTitle: { margin: "3px 0 0", fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 600, color: INK },
  steps: { display: "flex", gap: 6, marginBottom: 8 },
  stepSeg: { flex: 1, height: 3, borderRadius: 3, transition: "background .3s ease" },
  stepLabel: { margin: "0 0 16px", fontSize: 12.5, fontWeight: 600, color: SLATE },
  mLabel: { display: "block", fontSize: 13, fontWeight: 600, color: INK, marginTop: 14 },
  opt: { color: SLATE, fontWeight: 500, fontSize: 12 },
  segRow: { display: "flex", gap: 10, marginTop: 8 },
  segBtn: {
    flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${LINE}`, background: "#fff",
    color: SLATE, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", transition: "all .2s ease",
  },
  segOn: { borderColor: TERRA, background: TERRA, color: "#fff", boxShadow: `0 8px 18px ${TERRA}40` },
  modalActions: { display: "flex", gap: 12, marginTop: 24 },
  ghostBtn: {
    flex: 1, background: "#fff", color: INK, border: `1px solid ${LINE}`, padding: "12px 0",
    borderRadius: 11, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
  },
  confirmBtn: { flex: 1.4, justifyContent: "center", gap: 6, padding: "12px 0", borderRadius: 11, fontSize: 14, fontWeight: 800 },

  /* why choose */
  whyBand: { background: PANEL, borderRadius: 20, padding: "clamp(28px,3.5vw,44px)", display: "flex", gap: 40, flexWrap: "wrap", boxShadow: "0 22px 52px rgba(36,29,23,.22)" },
  whyHead: { minWidth: 190, flex: "0 0 190px" },
  whyKicker: { color: GOLD, fontSize: 11.5, fontWeight: 700, letterSpacing: 2.5 },
  whyTitle: { fontFamily: "'Fraunces', serif", color: "#fff", fontSize: 30, fontWeight: 600, margin: "8px 0 0", letterSpacing: -0.5 },
  whyItem: {},
  whyIcon: { display: "inline-flex", marginBottom: 12 },
  whyItemTitle: { color: "#fff", fontSize: 15, fontWeight: 700, margin: "0 0 6px" },
  whyItemText: { color: FOG, fontSize: 12.5, lineHeight: 1.65, margin: 0 },

  /* process */
  procCard: { background: WHITE, border: `1px solid ${LINE}`, borderRadius: 14, padding: "24px 20px", boxShadow: "0 4px 14px rgba(42,35,29,.05)" },
  procIcon: { width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: `${TERRA}12`, marginBottom: 14 },
  procNum: { display: "block", fontSize: 11.5, fontWeight: 800, color: TERRA, letterSpacing: 1.2, marginBottom: 4 },
  procTitle: { fontSize: 16, fontWeight: 700, color: INK, margin: "0 0 5px" },
  procText: { fontSize: 12.5, color: SLATE, lineHeight: 1.55, margin: 0 },
  procArrow: { color: "#d8cab4", fontSize: 20, fontWeight: 700, alignSelf: "center" },

  /* industries + stats */
  indWrap: { display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 22, alignItems: "stretch" },
  indBox: { background: WHITE, border: `1px solid ${LINE}`, borderRadius: 18, padding: "30px clamp(22px,3vw,34px)", boxShadow: "0 4px 16px rgba(42,35,29,.05)" },
  indKicker: { color: TERRA, fontSize: 12, fontWeight: 700, letterSpacing: 2.5, margin: "0 0 22px" },
  indItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 9, textAlign: "center" },
  indIcon: { width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", background: PAGE, border: `1px solid ${LINE}` },
  indLabel: { fontSize: 12.5, fontWeight: 600, color: SLATE },
  statBox: { background: PANEL, borderRadius: 18, padding: "clamp(28px,4vw,44px)", display: "grid", placeItems: "center", boxShadow: "0 22px 52px rgba(36,29,23,.22)" },
  statItem: { textAlign: "center" },
  statValue: { display: "block", fontFamily: "'Fraunces', serif", color: "#fff", fontSize: "clamp(32px,3.8vw,44px)", fontWeight: 600, lineHeight: 1, letterSpacing: -1 },
  statLabel: { display: "block", color: FOG, fontSize: 12.5, marginTop: 8 },

  /* portfolio */
  portCard: { borderRadius: 13, overflow: "hidden", boxShadow: "0 8px 22px rgba(42,35,29,.10)" },
  portMedia: { width: "100%", aspectRatio: "3 / 4" },
  portLabel: {
    position: "absolute", left: 10, right: 10, bottom: 10, color: "#fff", fontSize: 12, fontWeight: 700,
    background: "rgba(36,29,23,.72)", padding: "7px 10px", borderRadius: 9, opacity: 0,
    transform: "translateY(6px)", transition: "opacity .3s, transform .3s", backdropFilter: "blur(4px)",
  },

  /* cta */
  ctaBand: {
    position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${DEEP} 0%, ${DEEP2} 100%)`,
    borderRadius: 22, padding: "clamp(32px,4vw,52px)", display: "grid",
    gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)", gap: "clamp(24px,4vw,48px)", alignItems: "center",
    boxShadow: "0 28px 66px rgba(36,29,23,.34)",
  },
  ctaWatermark: { position: "absolute", right: -10, bottom: -50, fontSize: 260, fontWeight: 700, color: "rgba(255,255,255,.045)", lineHeight: 1, pointerEvents: "none", fontFamily: "'Fraunces', serif" },
  ctaKicker: { color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: 2.5, margin: "0 0 14px" },
  ctaTitle: { fontFamily: "'Fraunces', serif", color: "#fff", fontSize: "clamp(27px,3.4vw,40px)", fontWeight: 600, lineHeight: 1.14, margin: 0, letterSpacing: -0.5 },
  ctaTitleAccent: { color: GOLD },
  ctaRight: { position: "relative", zIndex: 1 },
  ctaText: { color: FOG, fontSize: 14.5, lineHeight: 1.75, margin: "0 0 22px" },
  ctaBtns: { display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" },
  callBtn: {
    display: "inline-flex", alignItems: "center", gap: 11, padding: "11px 22px", borderRadius: 11,
    border: "1px solid rgba(255,255,255,.25)", color: "#fff", fontWeight: 700, fontSize: 14.5,
    textDecoration: "none", transition: "background .2s, color .2s",
  },
};
