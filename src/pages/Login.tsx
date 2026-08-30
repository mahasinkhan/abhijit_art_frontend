import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(identifier, password);
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "employee") navigate("/employee");
      else navigate("/services");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aa-auth">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=DM+Sans:wght@400;500;600&display=swap');

        .aa-auth * { box-sizing: border-box; }
        .aa-auth{
          --ink:#2a231d; --terra:#d9542f; --gold:#c2974a;
          --paper:#ffffff; --line:#e6ddce; --muted:#8b7f70;
          min-height:100vh; width:100%;
          display:flex; align-items:center; justify-content:center;
          padding:34px 22px;
          font-family:'DM Sans', system-ui, sans-serif; color:var(--ink);
          background:
            radial-gradient(rgba(90,44,24,.05) 1px, transparent 1px) 0 0 / 24px 24px,
            radial-gradient(720px 520px at 8% 12%, rgba(240,180,143,.55), transparent 60%),
            radial-gradient(780px 640px at 94% 90%, rgba(194,151,74,.40), transparent 62%),
            radial-gradient(620px 460px at 88% 4%, rgba(217,84,47,.18), transparent 55%),
            linear-gradient(135deg, #fdf9f3 0%, #f7eee1 46%, #f1e3d1 100%);
        }

        /* ---------- FLOATING CARD ---------- */
        .aa-card{
          width:min(1160px, 100%);
          display:grid; grid-template-columns:0.95fr 1.05fr;
          background:var(--paper); border-radius:28px; overflow:hidden;
          box-shadow:
            0 30px 70px rgba(90,44,24,.16),
            0 10px 26px rgba(90,44,24,.10),
            0 0 70px rgba(217,84,47,.22),
            0 0 120px rgba(194,151,74,.16);
          animation: aaGlow 5s ease-in-out infinite;
        }
        @keyframes aaGlow{
          0%,100%{
            box-shadow:
              0 30px 70px rgba(90,44,24,.16),
              0 10px 26px rgba(90,44,24,.10),
              0 0 55px rgba(217,84,47,.16),
              0 0 100px rgba(194,151,74,.12);
          }
          50%{
            box-shadow:
              0 30px 70px rgba(90,44,24,.18),
              0 10px 26px rgba(90,44,24,.12),
              0 0 90px rgba(217,84,47,.32),
              0 0 150px rgba(194,151,74,.24);
          }
        }
        @media (prefers-reduced-motion: reduce){ .aa-card{ animation: none; } }

        /* ---------- LEFT MEDIA PANEL ---------- */
        .aa-card__media{ padding:14px; }
        .aa-media__inner{
          position:relative; height:100%; min-height:600px; border-radius:22px; overflow:hidden;
          display:flex; flex-direction:column; justify-content:space-between; padding:30px 32px;
          color:#f6ece1; background-color:#2a1912;
          background-image:
            linear-gradient(155deg, rgba(24,16,11,.42) 0%, rgba(110,45,20,.86) 100%),
            url('/images/auth/login-bg.jpg'),
            linear-gradient(150deg, #1f1813 0%, #3a231a 45%, #7a3418 100%);
          background-size:cover; background-position:center; background-repeat:no-repeat;
        }
        .aa-media__logo{
          align-self:flex-start; display:inline-flex; background:#fff;
          padding:10px 15px; border-radius:12px; box-shadow:0 10px 26px rgba(0,0,0,.28);
        }
        .aa-media__logo img{ height:30px; width:auto; display:block; }
        .aa-media__body{ margin:auto 0; }
        .aa-eyebrow{
          display:inline-block; font-size:12px; letter-spacing:.18em; text-transform:uppercase;
          color:var(--gold); font-weight:600; margin-bottom:14px;
        }
        .aa-media__title{
          font-family:'Playfair Display', Georgia, serif; font-weight:600;
          font-size:clamp(28px,3vw,42px); line-height:1.12; margin:0 0 16px;
        }
        .aa-media__title span{ color:#f0b48f; font-style:italic; }
        .aa-media__text{ color:#e6d6c8; font-size:15px; line-height:1.7; margin:0 0 28px; max-width:380px; }
        .aa-media__list{ list-style:none; padding:0; margin:0; display:grid; gap:14px; }
        .aa-media__list li{ display:flex; align-items:center; gap:13px; font-size:14px; color:#f0e6da; }
        .aa-media__list i{
          flex:0 0 auto; width:24px; height:24px; border-radius:50%; display:grid; place-items:center;
          background:rgba(194,151,74,.20); border:1px solid rgba(194,151,74,.55); color:var(--gold);
        }
        .aa-media__foot{ font-size:12.5px; color:rgba(246,236,225,.62); }

        /* ---------- RIGHT FORM PANEL ---------- */
        .aa-card__form{ display:flex; align-items:center; justify-content:center; padding:44px 48px; }
        .aa-form-wrap{ width:100%; max-width:400px; }
        .aa-back{
          display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:500;
          color:var(--muted); text-decoration:none; margin-bottom:22px; transition:color .2s;
        }
        .aa-back:hover{ color:var(--terra); }
        .aa-logo-mobile{ display:none; height:38px; margin-bottom:20px; }
        .aa-title{
          font-family:'Playfair Display', Georgia, serif; font-weight:600;
          font-size:30px; line-height:1.15; margin:0 0 6px; color:var(--ink);
        }
        .aa-sub{ color:var(--muted); font-size:14px; margin:0 0 22px; }
        .aa-sub a{ color:var(--terra); font-weight:600; text-decoration:none; }
        .aa-sub a:hover{ text-decoration:underline; }
        .aa-error{ padding:10px 13px; border-radius:11px; font-size:13px; margin-bottom:16px; background:#fdece7; border:1px solid #f4c4b4; color:#b23c1c; }
        .aa-form{ display:grid; gap:15px; }
        .aa-field{ display:grid; gap:6px; }
        .aa-field label{ font-size:12.5px; font-weight:500; color:#5f5347; }
        .aa-inputwrap{
          position:relative; display:flex; align-items:center;
          background:#fff; border:1px solid var(--line); border-radius:11px;
          transition:border-color .2s, box-shadow .2s;
        }
        .aa-inputwrap:focus-within{ border-color:var(--terra); box-shadow:0 0 0 4px rgba(217,84,47,.12); }
        .aa-inputwrap > svg{ width:17px; height:17px; margin-left:13px; color:#a89a89; flex:0 0 auto; }
        .aa-inputwrap input{
          flex:1; min-width:0; border:0; outline:0; background:transparent;
          padding:12px 13px; font-size:14.5px; color:var(--ink); font-family:inherit;
        }
        .aa-inputwrap input::placeholder{ color:#b7ab9c; }
        .aa-eye{ border:0; background:transparent; cursor:pointer; padding:0 13px; color:#a89a89; display:grid; place-items:center; }
        .aa-eye:hover{ color:var(--terra); }
        .aa-eye svg{ width:17px; height:17px; }
        .aa-formrow{ display:flex; align-items:center; justify-content:space-between; margin-top:2px; }
        .aa-check{ display:flex; align-items:center; gap:9px; font-size:13px; color:#5f5347; }
        .aa-check input{ width:16px; height:16px; accent-color:var(--terra); cursor:pointer; }
        .aa-link{ font-size:13px; font-weight:600; color:var(--terra); text-decoration:none; }
        .aa-link:hover{ text-decoration:underline; }
        .aa-btn{
          margin-top:4px; width:100%; border:0; cursor:pointer;
          background:var(--terra); color:#fff; font-family:inherit; font-size:15px; font-weight:600;
          padding:14px 16px; border-radius:999px; box-shadow:0 10px 24px rgba(217,84,47,.28);
          transition:transform .15s, box-shadow .2s, background .2s;
        }
        .aa-btn:hover:not(:disabled){ background:#c5471f; transform:translateY(-1px); box-shadow:0 14px 28px rgba(217,84,47,.34); }
        .aa-btn:active:not(:disabled){ transform:translateY(0); }
        .aa-btn:disabled{ opacity:.55; cursor:not-allowed; box-shadow:none; }

        /* ---------- RESPONSIVE ---------- */
        @media (max-width:880px){
          .aa-card{ grid-template-columns:1fr; }
          .aa-card__media{ display:none; }
          .aa-logo-mobile{ display:block; }
          .aa-card__form{ padding:38px 26px; }
        }
      `}</style>

      <div className="aa-card">
        {/* LEFT — media / brand */}
        <aside className="aa-card__media">
          <div className="aa-media__inner">
            <div className="aa-media__logo">
              <img src="/images/abhijit_art_logo.png" alt="Abhijit Art" />
            </div>

            <div className="aa-media__body">
              <span className="aa-eyebrow">Client Portal</span>
              <h2 className="aa-media__title">Welcome <span>back</span>.</h2>
              <p className="aa-media__text">
                Sign in to manage your orders, track your jobs in real time,
                and download your invoices — all in one place.
              </p>
              <ul className="aa-media__list">
                {["Flex & large-format printing", "Creative design studio", "Digital marketing & branding"].map((t) => (
                  <li key={t}>
                    <i>
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    </i>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="aa-media__foot">Durgapur, West Bengal · Printing &amp; Design Studio</div>
          </div>
        </aside>

        {/* RIGHT — form */}
        <main className="aa-card__form">
          <div className="aa-form-wrap">
            <Link to="/" className="aa-back">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Back to home
            </Link>

            <img src="/images/abhijit_art_logo.png" alt="Abhijit Art" className="aa-logo-mobile" />

            <h1 className="aa-title">Welcome back</h1>
            <p className="aa-sub">New to Abhijit Art? <Link to="/register">Create an account</Link></p>

            {error && <div className="aa-error">{error}</div>}

            <form onSubmit={submit} className="aa-form">
              <div className="aa-field">
                <label htmlFor="identifier">Email or Username</label>
                <div className="aa-inputwrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                  <input id="identifier" type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com or EMP001" autoCapitalize="none" autoComplete="username" required />
                </div>
              </div>

              <div className="aa-field">
                <label htmlFor="password">Password</label>
                <div className="aa-inputwrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  <input id="password" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
                  <button type="button" className="aa-eye" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="aa-formrow">
                <label className="aa-check">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="aa-link">Forgot password?</Link>
              </div>

              <button className="aa-btn" type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Log in"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}