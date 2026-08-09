import { Link } from "react-router-dom";

/* Studio location — to pin the EXACT spot, open Google Maps → Share →
   "Embed a map" and paste that iframe's src into MAP_EMBED below. */
const MAP_QUERY = "Abhijit Art, Berhampore, Murshidabad, West Bengal";
const MAP_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&z=15&output=embed`;
const MAP_DIR = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(MAP_QUERY)}`;

const printItems = [
  "Flex printing",
  "Laser cutting",
  "Digital printing",
  "Sticker cutting",
  "Stamp making",
  "PVC cards",
];

export default function Footer() {
  const year = new Date().getFullYear();

  const toTop = () =>
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });

  /* open the ChatWidget (it listens for this event); optional prefilled message */
  const openChat = (message?: string) =>
    window.dispatchEvent(new CustomEvent("aa:open-chat", { detail: message ? { message } : {} }));

  return (
    <footer className="aaf">
      <style>{CSS}</style>

      <div className="aaf-inner">
        {/* ── Map ── */}
        <div className="aaf-map">
          <iframe
            className="aaf-map-frame"
            title="Abhijit Art studio location"
            src={MAP_EMBED}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <div className="aaf-map-card">
            <span className="aaf-map-eyebrow">Visit the studio</span>
            <h4 className="aaf-map-title">Abhijit Art</h4>
            <p className="aaf-map-addr">
              Berhampore, Murshidabad,<br />West Bengal, India
            </p>
            <a className="aaf-map-dir" href={MAP_DIR} target="_blank" rel="noreferrer">
              Get directions
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

        <div className="aaf-grid">
          {/* Brand */}
          <div className="aaf-brand">
            <p className="aaf-eyebrow">Since 2000 · Berhampore</p>

            <img
              src="/images/abhijit_art_logo.png"
              alt="Abhijit Art — For all printing solutions"
              className="aaf-logo"
            />

            <p className="aaf-blurb">
              A printing and design studio in Berhampore, Murshidabad. Flex, digital print, laser
              cutting, signage and branding — done properly, delivered on time.
            </p>

            {/* press colour bar */}
            <div className="aaf-swatch" aria-hidden="true">
              <span /><span /><span /><span /><span />
            </div>

            <div className="aaf-socials">
              {/* Replace href with the real profile URL when ready */}
              <a href="#" onClick={(e) => e.preventDefault()} aria-label="Abhijit Art on Facebook" className="aaf-social">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                  <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.29-.04-1.27-.13-2.42-.13-2.4 0-4.05 1.47-4.05 4.16V9.9H7.5V13h2.73v8h3.27z" />
                </svg>
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} aria-label="Abhijit Art on Instagram" className="aaf-social">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                  <circle cx="12" cy="12" r="3.8" />
                  <circle cx="17.1" cy="6.9" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a href="https://wa.me/917405179066" target="_blank" rel="noreferrer" aria-label="Abhijit Art on WhatsApp" className="aaf-social">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                  <path d="M12 2a10 10 0 0 0-8.53 15.2L2 22l4.94-1.42A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.2 14.8l-.35-.21-2.5.72.73-2.42-.23-.37A8 8 0 0 1 12 4zm-3.1 4.1c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.34 1 2.5c.12.16 1.7 2.72 4.19 3.7 2.06.82 2.48.66 2.93.62.45-.04 1.44-.59 1.65-1.16.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28s-1.44-.71-1.66-.79c-.22-.08-.38-.12-.55.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.03-.38-1.96-1.21-.72-.64-1.21-1.44-1.35-1.68-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.32-.75-1.8-.19-.46-.39-.4-.54-.41h-.45z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Explore */}
          <nav className="aaf-col" aria-label="Footer navigation">
            <h4 className="aaf-head">Explore</h4>
            <Link to="/" className="aaf-link">Home</Link>
            <Link to="/services" className="aaf-link">Services</Link>
            <Link to="/about" className="aaf-link">About us</Link>
            <Link to="/digital-marketing" className="aaf-link">Digital marketing</Link>
            <Link to="/software-service" className="aaf-link">Software service</Link>
          </nav>

          {/* Work — each opens the chat with a prefilled enquiry */}
          <div className="aaf-col">
            <h4 className="aaf-head">What we print</h4>
            <ul className="aaf-print">
              {printItems.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="aaf-print-btn"
                    onClick={() => openChat(`Hi! I'd like a quote for ${item}.`)}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact card */}
          <div className="aaf-card">
            <h4 className="aaf-head">Contact</h4>

            <div className="aaf-fact">
              <span className="aaf-label">Studio</span>
              <span className="aaf-value">Berhampore, Murshidabad<br />West Bengal, India</span>
            </div>
            <div className="aaf-fact">
              <span className="aaf-label">Email</span>
              <a className="aaf-value aaf-mailto" href="mailto:abhijitart85@gmail.com">
                abhijitart85@gmail.com
              </a>
            </div>
            <div className="aaf-fact">
              <span className="aaf-label">Open</span>
              <span className="aaf-value">
                Open daily · 10:00 AM – 8:00 PM<br />Tuesday · Closed
              </span>
            </div>

            <button type="button" className="aaf-cta" onClick={() => openChat("Hi! I'd like to start a new project with Abhijit Art.")}>
              Start your project
            </button>
          </div>
        </div>

        {/* Base line */}
        <div className="aaf-base">
          <p className="aaf-fine">© {year} Abhijit Art. All rights reserved.</p>
          <div className="aaf-base-right">
            <Link to="/login" className="aaf-fine-link">Log in</Link>
            <span className="aaf-dot" aria-hidden="true">·</span>
            <Link to="/register" className="aaf-fine-link">Register</Link>
            <button className="aaf-top" onClick={toTop}>
              Back to top
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

const CSS = `
.aaf{
  --ivory:#f7f3ea; --ink:#2a231d; --terra:#d9542f; --gold:#c2974a;
  position:relative; overflow:hidden;
  background:
    radial-gradient(800px 320px at 6% 108%, rgba(217,84,47,.07), transparent 70%),
    radial-gradient(700px 300px at 94% -8%, rgba(194,151,74,.08), transparent 70%),
    var(--ivory);
  color:var(--ink);
  font-family:"DM Sans",system-ui,-apple-system,sans-serif;
}
.aaf *{box-sizing:border-box;}
.aaf a{text-decoration:none;}
.aaf :focus-visible{outline:2px solid var(--terra); outline-offset:3px; border-radius:6px;}

.aaf-inner{position:relative; max-width:1320px; margin:0 auto; padding:72px 40px 26px;}

/* ── map ── */
.aaf-map{
  position:relative; margin-bottom:60px; border-radius:24px; overflow:hidden;
  border:1px solid rgba(42,35,29,.08); background:#e8e2d5;
  box-shadow:0 28px 56px -36px rgba(42,35,29,.6);
}
.aaf-map-frame{display:block; width:100%; height:340px; border:0;
  filter:grayscale(.18) contrast(1.03) brightness(1.02);}
.aaf-map::after{
  content:""; position:absolute; inset:0; pointer-events:none;
  box-shadow:inset 0 0 90px rgba(42,35,29,.14);
  background:linear-gradient(105deg, rgba(247,243,234,.30), transparent 34%);
}
.aaf-map-card{
  position:absolute; left:26px; bottom:26px; z-index:2; max-width:312px;
  padding:22px 24px; border-radius:18px;
  background:rgba(255,255,255,.86);
  -webkit-backdrop-filter:blur(16px) saturate(150%); backdrop-filter:blur(16px) saturate(150%);
  border:1px solid rgba(255,255,255,.7);
  box-shadow:0 20px 44px -22px rgba(42,35,29,.6);
}
.aaf-map-card::before{content:""; display:block; width:40px; height:3px; border-radius:3px;
  margin-bottom:14px; background:linear-gradient(90deg,var(--terra),var(--gold));}
.aaf-map-eyebrow{font-size:9.5px; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:var(--gold);}
.aaf-map-title{margin:6px 0 8px; font-size:20px; font-weight:800; color:var(--ink); letter-spacing:-.01em;}
.aaf-map-addr{margin:0 0 16px; font-size:13.5px; line-height:1.6; color:rgba(42,35,29,.66);}
.aaf-map-dir{
  display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:999px;
  font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  color:#fff; background:linear-gradient(135deg,var(--terra),#e57a45);
  box-shadow:0 12px 24px -14px rgba(217,84,47,.9); transition:transform .25s ease, box-shadow .25s ease;
}
.aaf-map-dir:hover{transform:translateY(-2px); box-shadow:0 16px 30px -14px rgba(217,84,47,1);}

.aaf-grid{display:grid; gap:48px 44px; grid-template-columns:1.45fr .8fr .9fr 1.1fr;}

/* brand */
.aaf-eyebrow{
  margin:0 0 18px; font-size:10px; font-weight:700; letter-spacing:.22em; text-transform:uppercase;
  color:var(--gold);
}
.aaf-logo{display:block; height:64px; width:auto;}
.aaf-blurb{
  margin:22px 0 0; max-width:38ch; font-size:14px; line-height:1.78; color:rgba(42,35,29,.6);
}

/* press colour bar */
.aaf-swatch{display:flex; gap:4px; margin-top:26px;}
.aaf-swatch span{width:26px; height:7px; border-radius:2px;}
.aaf-swatch span:nth-child(1){background:#d9542f;}
.aaf-swatch span:nth-child(2){background:#e0764a;}
.aaf-swatch span:nth-child(3){background:#c2974a;}
.aaf-swatch span:nth-child(4){background:#8a6a3b;}
.aaf-swatch span:nth-child(5){background:#2a231d;}

.aaf-socials{display:flex; gap:10px; margin-top:24px;}
.aaf-social{
  width:36px; height:36px; border-radius:50%; display:grid; place-items:center;
  color:rgba(42,35,29,.55); border:1px solid rgba(42,35,29,.13); background:rgba(255,255,255,.6);
  transition:color .25s ease, border-color .25s ease, background .25s ease, transform .25s ease;
}
.aaf-social:hover{
  color:#fff; border-color:transparent; transform:translateY(-2px);
  background:linear-gradient(135deg,var(--terra),var(--gold));
}

/* columns */
.aaf-col{display:flex; flex-direction:column;}
.aaf-head{
  margin:0 0 20px; padding-bottom:12px;
  font-size:10px; font-weight:700; letter-spacing:.22em; text-transform:uppercase;
  color:var(--terra); border-bottom:1px solid rgba(42,35,29,.1);
}
.aaf-link{
  position:relative; width:fit-content; padding:6px 0;
  font-size:14px; color:rgba(42,35,29,.62); transition:color .25s ease;
}
.aaf-link::after{
  content:""; position:absolute; left:0; bottom:4px; height:1px; width:100%;
  background:var(--terra); transform:scaleX(0); transform-origin:left;
  transition:transform .3s cubic-bezier(.22,.9,.24,1);
}
.aaf-link:hover{color:var(--ink);}
.aaf-link:hover::after{transform:scaleX(1);}

/* what we print (clickable → chat) */
.aaf-print{list-style:none; margin:0; padding:0; display:flex; flex-direction:column;}
.aaf-print-btn{
  position:relative; width:fit-content; margin:0; padding:6px 0 6px 16px; text-align:left;
  font-family:inherit; font-size:14px; color:rgba(42,35,29,.62);
  background:none; border:0; cursor:pointer; transition:color .25s ease;
}
.aaf-print-btn::before{content:""; position:absolute; left:0; top:14px; width:6px; height:1px;
  background:var(--terra); transition:width .25s ease;}
.aaf-print-btn:hover{color:var(--ink);}
.aaf-print-btn:hover::before{width:12px;}

/* contact card */
.aaf-card{
  padding:26px 26px 28px; border-radius:24px;
  background:rgba(255,255,255,.72);
  border:1px solid rgba(42,35,29,.07);
  box-shadow:0 22px 44px -34px rgba(42,35,29,.85);
}
.aaf-fact{display:flex; flex-direction:column; gap:4px; padding:9px 0;}
.aaf-label{font-size:9.5px; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:rgba(42,35,29,.38);}
.aaf-value{font-size:14px; line-height:1.6; color:rgba(42,35,29,.75);}
.aaf-mailto{transition:color .25s ease;}
.aaf-mailto:hover{color:var(--terra);}
.aaf-cta{
  margin-top:20px; width:100%;
  display:inline-flex; align-items:center; justify-content:center; padding:13px 22px; border-radius:999px;
  font-family:inherit; font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase;
  color:#fff; background:linear-gradient(135deg,var(--terra),#e57a45); border:0; cursor:pointer;
  box-shadow:0 14px 26px -14px rgba(217,84,47,.95);
  transition:transform .25s ease, box-shadow .25s ease;
}
.aaf-cta:hover{transform:translateY(-2px); box-shadow:0 18px 32px -14px rgba(217,84,47,1);}

/* base */
.aaf-base{
  display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;
  margin-top:62px; padding-top:22px; border-top:1px solid rgba(42,35,29,.09);
}
.aaf-fine{margin:0; font-size:12.5px; color:rgba(42,35,29,.45);}
.aaf-base-right{display:flex; align-items:center; gap:14px;}
.aaf-fine-link{font-size:12.5px; color:rgba(42,35,29,.6); transition:color .25s ease;}
.aaf-fine-link:hover{color:var(--terra);}
.aaf-dot{color:rgba(42,35,29,.28);}
.aaf-top{
  display:inline-flex; align-items:center; gap:8px; margin-left:6px;
  padding:9px 16px; border-radius:999px; cursor:pointer; font-family:inherit;
  font-size:10.5px; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
  color:var(--ink); background:transparent; border:1px solid rgba(42,35,29,.16);
  transition:color .25s ease, border-color .25s ease, background .25s ease;
}
.aaf-top:hover{color:var(--terra); border-color:var(--terra); background:rgba(217,84,47,.06);}

@media (max-width:1080px){
  .aaf-grid{grid-template-columns:1fr 1fr; gap:44px 32px;}
  .aaf-brand{grid-column:1 / -1;}
}
@media (max-width:640px){
  .aaf-inner{padding:52px 22px 24px;}
  .aaf-map{margin-bottom:40px;}
  .aaf-map-frame{height:240px;}
  .aaf-map-card{
    position:static; max-width:none; border-radius:0;
    background:rgba(255,255,255,.92); -webkit-backdrop-filter:none; backdrop-filter:none;
    box-shadow:none; border:0; border-top:1px solid rgba(42,35,29,.08);
  }
  .aaf-grid{grid-template-columns:1fr; gap:38px;}
  .aaf-logo{height:56px;}
  .aaf-base{justify-content:flex-start; margin-top:44px;}
}
@media (prefers-reduced-motion:reduce){
  .aaf *,.aaf *::after{transition-duration:.01ms !important;}
}
`;