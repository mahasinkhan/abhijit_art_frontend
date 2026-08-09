import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type NavItem = { to: string; label: string };

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [ink, setInk] = useState({ x: 0, w: 0, on: false });

  const navRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const links: NavItem[] = [
    { to: "/", label: "Home" },
    { to: "/services", label: "Services" },
    { to: "/about", label: "About" },
    { to: "/digital-marketing", label: "Digital Marketing" },
    { to: "/software-service", label: "Software Service" },
    ...(user && user.role === "client" ? [{ to: "/my-bookings", label: "My Bookings" }] : []),
    ...(user && user.role === "admin" ? [{ to: "/admin", label: "Dashboard" }] : []),
  ];

  const activeIndex = links.findIndex((l) => l.to === location.pathname);

  /* ---- sliding ink rule (desktop) ---- */
  const moveInk = useCallback((i: number) => {
    const nav = navRef.current;
    const el = i >= 0 ? itemRefs.current[i] : null;
    if (!nav || !el) {
      setInk((p) => ({ ...p, on: false }));
      return;
    }
    const nb = nav.getBoundingClientRect();
    const eb = el.getBoundingClientRect();
    setInk({ x: eb.left - nb.left + 14, w: Math.max(eb.width - 28, 14), on: true });
  }, []);

  useEffect(() => {
    moveInk(activeIndex);
    const t = window.setTimeout(() => moveInk(activeIndex), 260); // after webfonts swap
    const onResize = () => moveInk(activeIndex);
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [activeIndex, moveInk, location.pathname]);

  /* ---- scroll solidify ---- */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ---- close drawer on route change ---- */
  useEffect(() => setMenuOpen(false), [location.pathname]);

  /* ---- lock scroll (BOTH html + body so a sticky header can't scroll away) + Esc ---- */
  useEffect(() => {
    const html = document.documentElement;
    html.style.overflow = menuOpen ? "hidden" : "";
    document.body.style.overflow = menuOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = "";
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setMenuOpen(false);
  };

  const initial = (user?.name?.trim()?.[0] || "U").toUpperCase();
  const firstName = user?.name?.trim()?.split(" ")[0] || "Account";

  return (
    <header className={`aa-hdr ${scrolled ? "is-stuck" : ""} ${menuOpen ? "is-open" : ""}`}>
      <style>{CSS}</style>

      <div className="aa-hdr-veil" aria-hidden="true" />

      <div className="aa-hdr-shell">
        {/* Logo */}
        <Link to="/" className="aa-hdr-brand" aria-label="Abhijit Art — home">
          <img
            src="/images/abhijit_art_logo.png"
            alt="Abhijit Art — For all printing solutions"
            className="aa-hdr-logo"
          />
          <span className="aa-hdr-est">
            Est.<b>2000</b>
          </span>
        </Link>

        {/* Desktop nav */}
        <div
          className="aa-hdr-nav aa-only-desktop"
          ref={navRef}
          onMouseLeave={() => moveInk(activeIndex)}
        >
          {links.map((l, i) => (
            <Link
              key={l.to}
              to={l.to}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className={`aa-nav-link ${location.pathname === l.to ? "is-active" : ""}`}
              onMouseEnter={() => moveInk(i)}
              onFocus={() => moveInk(i)}
            >
              {l.label}
            </Link>
          ))}
          <span
            className="aa-nav-ink"
            aria-hidden="true"
            style={{
              transform: `translateX(${ink.x}px)`,
              width: ink.w,
              opacity: ink.on ? 1 : 0,
            }}
          />
        </div>

        {/* Desktop actions */}
        <div className="aa-hdr-actions aa-only-desktop">
          {!user && (
            <>
              <Link to="/login" className="aa-btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="aa-btn-solid">
                Register free
              </Link>
            </>
          )}
          {user && (
            <>
              <div className="aa-user">
                <span className="aa-avatar">{initial}</span>
                <span className="aa-username">{firstName}</span>
              </div>
              <button className="aa-btn-ghost" onClick={handleLogout}>
                Log out
              </button>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button
          className="aa-burger"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
        </button>
      </div>

      {/* Mobile drawer — portaled to <body> so no page CSS (overflow clip / sticky) can hide it */}
      {createPortal(
        <div className={`aa-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
          <div className="aa-menu-backdrop" onClick={() => setMenuOpen(false)} />
          <aside className="aa-menu-panel" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="aa-menu-head">
              <img
                src="/images/abhijit_art_logo.png"
                alt="Abhijit Art"
                className="aa-menu-logo"
              />
              <button
                className="aa-menu-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <span />
                <span />
              </button>
            </div>

            <nav className="aa-menu-nav">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`aa-menu-link ${location.pathname === l.to ? "is-active" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                  <span className="aa-menu-chev" aria-hidden="true">→</span>
                </Link>
              ))}
            </nav>

            <div className="aa-menu-foot">
              {!user && (
                <>
                  <Link to="/login" className="aa-btn-ghost wide" onClick={() => setMenuOpen(false)}>
                    Log in
                  </Link>
                  <Link to="/register" className="aa-btn-solid wide" onClick={() => setMenuOpen(false)}>
                    Register free
                  </Link>
                </>
              )}
              {user && (
                <>
                  <div className="aa-user wide">
                    <span className="aa-avatar">{initial}</span>
                    <span className="aa-username">{firstName}</span>
                  </div>
                  <button className="aa-btn-ghost wide" onClick={handleLogout}>
                    Log out
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>,
        document.body
      )}
    </header>
  );
}

const CSS = `
.aa-hdr{
  --ivory:#f7f3ea; --ink:#2a231d; --terra:#d9542f; --gold:#c2974a;
  position:sticky; top:0; z-index:1000;
  padding:14px 20px 10px;
  font-family:"DM Sans",system-ui,-apple-system,sans-serif;
}
.aa-hdr *{box-sizing:border-box;}
.aa-hdr a{text-decoration:none;}
.aa-hdr :focus-visible{outline:2px solid var(--terra); outline-offset:3px; border-radius:10px;}

.aa-hdr-veil{
  position:absolute; inset:0; pointer-events:none; opacity:0;
  background:linear-gradient(to bottom, rgba(247,243,234,.95), rgba(247,243,234,0));
  transition:opacity .35s ease;
}
.aa-hdr.is-stuck .aa-hdr-veil{opacity:1;}

/* ---------- capsule ---------- */
.aa-hdr-shell{
  position:relative; max-width:1320px; margin:0 auto;
  display:flex; align-items:center; gap:16px;
  padding:9px 10px 9px 18px;
  border-radius:999px;
  background:rgba(255,255,255,.58);
  -webkit-backdrop-filter:blur(18px) saturate(170%);
  backdrop-filter:blur(18px) saturate(170%);
  border:1px solid rgba(42,35,29,.07);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.75), 0 10px 30px -22px rgba(42,35,29,.55);
  transition:background .35s ease, box-shadow .35s ease, padding .35s ease, border-color .35s ease;
}
.aa-hdr.is-stuck .aa-hdr-shell{
  background:rgba(255,255,255,.86);
  border-color:rgba(42,35,29,.1);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.8), 0 20px 44px -30px rgba(42,35,29,.75);
  padding:6px 10px 6px 18px;
}

/* ---------- brand ---------- */
.aa-hdr-brand{display:flex; align-items:center; gap:12px; margin-right:auto;}
.aa-hdr-logo{height:46px; width:auto; display:block; transition:height .35s ease;}
.aa-hdr.is-stuck .aa-hdr-logo{height:40px;}
.aa-hdr-est{
  display:none; align-items:center; gap:4px;
  padding-left:12px; border-left:1px solid rgba(42,35,29,.14);
  font-size:9.5px; letter-spacing:.16em; text-transform:uppercase;
  color:rgba(42,35,29,.45);
}
.aa-hdr-est b{color:var(--terra); font-weight:700; letter-spacing:.1em;}
@media (min-width:1400px){ .aa-hdr-est{display:flex;} }

/* ---------- nav ---------- */
.aa-hdr-nav{position:relative; display:flex; align-items:center; gap:2px;}
.aa-nav-link{
  position:relative; padding:11px 14px;
  font-size:11.5px; font-weight:600; letter-spacing:.1em; text-transform:uppercase;
  color:rgba(42,35,29,.6); white-space:nowrap;
  border-radius:10px; transition:color .25s ease;
}
.aa-nav-link:hover{color:var(--ink);}
.aa-nav-link.is-active{color:var(--ink);}
.aa-nav-ink{
  position:absolute; left:0; bottom:3px; height:2px; border-radius:2px;
  background:linear-gradient(90deg,var(--terra),var(--gold));
  box-shadow:0 0 12px -3px rgba(217,84,47,.9);
  transition:transform .45s cubic-bezier(.22,.9,.24,1), width .45s cubic-bezier(.22,.9,.24,1), opacity .25s ease;
  pointer-events:none;
}

/* ---------- actions (shared by desktop + drawer) ---------- */
.aa-hdr-actions{display:flex; align-items:center; gap:10px; padding-left:14px; border-left:1px solid rgba(42,35,29,.1);}
.aa-btn-ghost{
  display:inline-flex; align-items:center; justify-content:center;
  padding:9px 16px; border-radius:999px; cursor:pointer;
  font-size:11.5px; font-weight:600; letter-spacing:.1em; text-transform:uppercase;
  color:var(--ink); background:transparent; border:1px solid rgba(42,35,29,.16);
  font-family:inherit; transition:border-color .25s ease, color .25s ease, background .25s ease;
}
.aa-btn-ghost:hover{border-color:var(--terra); color:var(--terra); background:rgba(217,84,47,.06);}
.aa-btn-solid{
  position:relative; overflow:hidden;
  display:inline-flex; align-items:center; justify-content:center;
  padding:10px 18px; border-radius:999px; border:0; cursor:pointer;
  font-size:11.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  color:#fff; background:linear-gradient(135deg,var(--terra),#e57a45);
  box-shadow:0 12px 24px -14px rgba(217,84,47,.95);
  font-family:inherit; transition:transform .25s ease, box-shadow .25s ease;
}
.aa-btn-solid:hover{transform:translateY(-1px); box-shadow:0 16px 30px -14px rgba(217,84,47,1);}
.aa-btn-solid::after{
  content:""; position:absolute; top:0; left:-60%; width:40%; height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);
  transform:skewX(-20deg); transition:left .6s ease;
}
.aa-btn-solid:hover::after{left:120%;}

.aa-user{
  display:flex; align-items:center; gap:9px;
  padding:4px 14px 4px 4px; border-radius:999px;
  background:rgba(217,84,47,.07); border:1px solid rgba(217,84,47,.14);
}
.aa-avatar{
  width:30px; height:30px; border-radius:50%; flex:none;
  display:grid; place-items:center;
  background:linear-gradient(135deg,var(--terra),var(--gold));
  color:#fff; font-size:12.5px; font-weight:700;
}
.aa-username{
  font-size:11.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
  color:var(--ink); max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}

/* ---------- burger ---------- */
.aa-burger{
  display:none; margin-left:auto; width:42px; height:42px; flex:none;
  border-radius:14px; border:1px solid rgba(42,35,29,.14); background:rgba(255,255,255,.6);
  cursor:pointer; place-items:center; gap:5px; padding:0;
}
.aa-burger span{display:block; width:16px; height:1.8px; border-radius:2px; background:var(--ink); transition:transform .3s ease, opacity .3s ease;}
.aa-hdr.is-open .aa-burger span:first-child{transform:translateY(3.4px) rotate(45deg);}
.aa-hdr.is-open .aa-burger span:last-child{transform:translateY(-3.4px) rotate(-45deg);}

/* ---------- mobile drawer (portaled to <body>) ---------- */
.aa-menu{
  --ivory:#f7f3ea; --ink:#2a231d; --terra:#d9542f; --gold:#c2974a;
  position:fixed; inset:0; z-index:2000;
  font-family:"DM Sans",system-ui,-apple-system,sans-serif;
  pointer-events:none;                 /* inert while closed */
}
.aa-menu.open{pointer-events:auto;}
.aa-menu *{box-sizing:border-box;}
.aa-menu a{text-decoration:none;}
.aa-menu :focus-visible{outline:2px solid var(--terra); outline-offset:3px; border-radius:10px;}

.aa-menu-backdrop{
  position:absolute; inset:0;
  background:rgba(30,24,19,.42);
  -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px);
  opacity:0; transition:opacity .35s ease;
}
.aa-menu.open .aa-menu-backdrop{opacity:1;}

.aa-menu-panel{
  position:absolute; top:0; right:0; height:100%;
  width:min(360px, 88vw);
  display:flex; flex-direction:column;
  background:var(--ivory);
  border-left:1px solid rgba(42,35,29,.08);
  box-shadow:-24px 0 60px -30px rgba(42,35,29,.7);
  transform:translateX(100%);
  transition:transform .4s cubic-bezier(.22,.9,.24,1);
  overflow-y:auto;
  overscroll-behavior:contain;
}
.aa-menu.open .aa-menu-panel{transform:translateX(0);}

.aa-menu-head{
  position:sticky; top:0; z-index:1;
  display:flex; align-items:center; justify-content:space-between;
  padding:18px 18px 14px; background:var(--ivory);
  border-bottom:1px solid rgba(42,35,29,.08);
}
.aa-menu-logo{height:40px; width:auto; display:block;}
.aa-menu-close{
  position:relative; width:40px; height:40px; flex:none;
  display:grid; place-items:center;
  border-radius:12px; border:1px solid rgba(42,35,29,.14); background:#fff; cursor:pointer;
}
.aa-menu-close span{position:absolute; width:16px; height:1.8px; border-radius:2px; background:var(--ink);}
.aa-menu-close span:first-child{transform:rotate(45deg);}
.aa-menu-close span:last-child{transform:rotate(-45deg);}

.aa-menu-nav{display:flex; flex-direction:column; padding:10px;}
.aa-menu-link{
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 14px; border-radius:12px;
  font-size:13px; font-weight:600; letter-spacing:.08em; text-transform:uppercase;
  color:rgba(42,35,29,.72);
  transition:background .2s ease, color .2s ease;
}
.aa-menu-link:hover{background:rgba(217,84,47,.06); color:var(--ink);}
.aa-menu-link.is-active{color:var(--terra); background:rgba(217,84,47,.08);}
.aa-menu-chev{opacity:0; transform:translateX(-6px); color:var(--terra); transition:opacity .2s ease, transform .2s ease;}
.aa-menu-link:hover .aa-menu-chev, .aa-menu-link.is-active .aa-menu-chev{opacity:1; transform:translateX(0);}

.aa-menu-foot{
  margin-top:auto; padding:16px;
  display:flex; flex-direction:column; gap:10px;
  border-top:1px solid rgba(42,35,29,.08);
}
.aa-btn-ghost.wide,.aa-btn-solid.wide,.aa-user.wide{width:100%; justify-content:center; padding-top:13px; padding-bottom:13px;}
.aa-user.wide{padding:8px 14px;}

/* ---------- breakpoints ---------- */
@media (max-width:1220px){
  .aa-only-desktop{display:none !important;}
  .aa-burger{display:grid;}
}
@media (max-width:600px){
  .aa-hdr{padding:10px 12px 8px;}
  .aa-hdr-shell{padding:8px 8px 8px 14px;}
  .aa-hdr-logo{height:38px;}
}
@media (prefers-reduced-motion:reduce){
  .aa-hdr *,.aa-hdr *::after,.aa-menu *{transition-duration:.01ms !important; animation-duration:.01ms !important;}
}
`;  