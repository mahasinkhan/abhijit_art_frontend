import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const change = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!agreed) return setError("Please accept the Terms & Conditions to continue.");
    setLoading(true);
    try {
      await register(form);
      navigate("/services");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const social = (provider: string) => setNotice(`${provider} sign-up isn't connected yet — coming soon.`);

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
            radial-gradient(1000px 620px at 50% -8%, rgba(217,84,47,.30), transparent 60%),
            linear-gradient(160deg, #241812 0%, #3c2016 52%, #5e2c18 100%);
        }

        /* ---------- FLOATING CARD ---------- */
        .aa-card{
  width:min(1160px, 100%);   /* was min(1040px, 100%) */
  display:grid; grid-template-columns:0.95fr 1.05fr;
  background:var(--paper); border-radius:28px; overflow:hidden;
  box-shadow:0 40px 90px rgba(0,0,0,.45), 0 10px 30px rgba(0,0,0,.25);
}

        /* ---------- LEFT MEDIA PANEL ---------- */
        .aa-card__media{ padding:14px; }
        .aa-media__inner{
          position:relative; height:100%; min-height:560px; border-radius:22px; overflow:hidden;
          display:flex; flex-direction:column; justify-content:space-between; padding:30px 32px;
          color:#f6ece1; background-color:#2a1912;
          background-image:
            linear-gradient(155deg, rgba(24,16,11,.42) 0%, rgba(110,45,20,.86) 100%),
            url('/images/auth/register-bg.jpg'),
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
        .aa-error, .aa-notice{ padding:10px 13px; border-radius:11px; font-size:13px; margin-bottom:16px; }
        .aa-error{ background:#fdece7; border:1px solid #f4c4b4; color:#b23c1c; }
        .aa-notice{ background:#fbf3e3; border:1px solid #ecd8ac; color:#8a6d2e; }
        .aa-form{ display:grid; gap:15px; }
        .aa-row{ display:grid; grid-template-columns:1fr 1fr; gap:13px; }
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
        .aa-check{ display:flex; align-items:center; gap:9px; font-size:13px; color:#5f5347; margin-top:2px; }
        .aa-check input{ width:16px; height:16px; accent-color:var(--terra); cursor:pointer; }
        .aa-check a{ color:var(--terra); font-weight:600; text-decoration:none; }
        .aa-check a:hover{ text-decoration:underline; }
        .aa-btn{
          margin-top:4px; width:100%; border:0; cursor:pointer;
          background:var(--terra); color:#fff; font-family:inherit; font-size:15px; font-weight:600;
          padding:14px 16px; border-radius:999px; box-shadow:0 10px 24px rgba(217,84,47,.28);
          transition:transform .15s, box-shadow .2s, background .2s;
        }
        .aa-btn:hover:not(:disabled){ background:#c5471f; transform:translateY(-1px); box-shadow:0 14px 28px rgba(217,84,47,.34); }
        .aa-btn:active:not(:disabled){ transform:translateY(0); }
        .aa-btn:disabled{ opacity:.55; cursor:not-allowed; box-shadow:none; }
        .aa-or{ display:flex; align-items:center; gap:14px; color:var(--muted); font-size:12px; margin:20px 0; text-transform:uppercase; letter-spacing:.06em; }
        .aa-or::before, .aa-or::after{ content:""; height:1px; flex:1; background:var(--line); }
        .aa-social{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .aa-soc{
          display:flex; align-items:center; justify-content:center; gap:9px;
          border:1px solid var(--line); background:#fff; border-radius:11px;
          padding:11px; font-size:13.5px; font-weight:500; color:var(--ink);
          font-family:inherit; cursor:pointer; transition:border-color .2s, background .2s;
        }
        .aa-soc:hover{ border-color:#cbbfab; background:#fbf8f2; }

        /* ---------- RESPONSIVE ---------- */
        @media (max-width:880px){
          .aa-card{ grid-template-columns:1fr; }
          .aa-card__media{ display:none; }
          .aa-logo-mobile{ display:block; }
          .aa-card__form{ padding:38px 26px; }
        }
        @media (max-width:460px){
          .aa-row{ grid-template-columns:1fr; }
          .aa-social{ grid-template-columns:1fr; }
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
              <h2 className="aa-media__title">Bring your brand to <span>life</span>.</h2>
              <p className="aa-media__text">
                Create your account to place print orders, track your jobs in real time,
                and manage your designs — all in one place.
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

            <h1 className="aa-title">Create a client account</h1>
            <p className="aa-sub">Already have an account? <Link to="/login">Sign in</Link></p>

            {error && <div className="aa-error">{error}</div>}
            {notice && <div className="aa-notice">{notice}</div>}

            <form onSubmit={submit} className="aa-form">
              <div className="aa-row">
                <div className="aa-field">
                  <label htmlFor="name">Full name</label>
                  <div className="aa-inputwrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    <input id="name" name="name" value={form.name} onChange={change} placeholder="Rahul Sharma" required />
                  </div>
                </div>

                <div className="aa-field">
                  <label htmlFor="phone">Phone</label>
                  <div className="aa-inputwrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    <input id="phone" name="phone" value={form.phone} onChange={change} placeholder="+91 98xxxxxxxx" />
                  </div>
                </div>
              </div>

              <div className="aa-field">
                <label htmlFor="email">Email address</label>
                <div className="aa-inputwrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                  <input id="email" type="email" name="email" value={form.email} onChange={change} placeholder="you@example.com" required />
                </div>
              </div>

              <div className="aa-field">
                <label htmlFor="password">Password</label>
                <div className="aa-inputwrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  <input id="password" type={showPw ? "text" : "password"} name="password" value={form.password} onChange={change} placeholder="Create a strong password" required />
                  <button type="button" className="aa-eye" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <label className="aa-check">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>I agree to the <Link to="/terms">Terms &amp; Conditions</Link></span>
              </label>

              <button className="aa-btn" type="submit" disabled={loading || !agreed}>
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>

            <div className="aa-or">or</div>

            <div className="aa-social">
              <button type="button" className="aa-soc" onClick={() => social("Google")}>
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" /></svg>
                Google
              </button>
              <button type="button" className="aa-soc" onClick={() => social("Facebook")}>
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z" /></svg>
                Facebook
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}