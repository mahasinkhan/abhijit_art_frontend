import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import AdminPostUpload from "../components/AdminPostUpload";
import PostFeed from "../components/PostFeed";
import VisitorsAdmin from "../components/VisitorsAdmin";

interface BUser { name: string; email: string; phone?: string; }
interface Booking {
  id: string;
  user: BUser;
  serviceName: string;
  quantity: number;
  notes: string;
  contactPhone: string;
  deliveryMethod?: string;
  address?: string;
  preferredDate?: string | null;
  designLink?: string;
  status: string;
  createdAt: string;
}

type Tab = "bookings" | "posts" | "visitors" | "settings";

const ACCENT = "#d9542f";
const STATUSES = ["pending", "confirmed", "completed", "cancelled"];
const STATUS_COLORS: Record<string, string> = {
  pending:   "#d68910",
  confirmed: "#2f6bff",
  completed: "#1eae5c",
  cancelled: "#e0413a",
};

/* ── inline icons ── */
const ico = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const IconBookings = () => (<svg {...ico}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6M9 16h6" /></svg>);
const IconPosts = () => (<svg {...ico}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>);
const IconVisitors = () => (<svg {...ico}><line x1="6" y1="20" x2="6" y2="14" /><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /></svg>);
const IconSettings = () => (<svg {...ico}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>);

const NAV: { id: Tab; label: string; Icon: () => JSX.Element }[] = [
  { id: "bookings", label: "Bookings", Icon: IconBookings },
  { id: "posts", label: "Posts", Icon: IconPosts },
  { id: "visitors", label: "Visitors", Icon: IconVisitors },
  { id: "settings", label: "Settings", Icon: IconSettings },
];
const TITLES: Record<Tab, string> = { bookings: "Bookings", posts: "Posts", visitors: "Visitors", settings: "Settings" };

/* ════════════════════════════════════════════════════
   Settings panel — account controls (change password etc.)
   ════════════════════════════════════════════════════ */
function SettingsPanel({ user }: { user: { name?: string; email?: string } | null }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const changePassword = async () => {
    setMsg(null);
    if (!cur || !next) return setMsg({ type: "err", text: "Please fill in all password fields." });
    if (next.length < 6) return setMsg({ type: "err", text: "New password must be at least 6 characters." });
    if (next !== confirm) return setMsg({ type: "err", text: "New passwords do not match." });
    setSaving(true);
    try {
      // 🔧 Backend route — adjust path if yours differs
      await api.patch("/auth/change-password", { currentPassword: cur, newPassword: next });
      setMsg({ type: "ok", text: "Password updated successfully." });
      setCur(""); setNext(""); setConfirm("");
    } catch (err: any) {
      setMsg({ type: "err", text: err?.response?.data?.message || "Could not update password. Check your current password." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-settings">
      {/* Account info */}
      <section className="adm-scard">
        <h3 className="adm-stitle">Account</h3>
        <p className="adm-ssub">Your admin profile details.</p>
        <div className="adm-srow"><span className="adm-slabel">Name</span><span className="adm-sval">{user?.name || "—"}</span></div>
        <div className="adm-srow"><span className="adm-slabel">Email</span><span className="adm-sval">{user?.email || "—"}</span></div>
        <div className="adm-srow"><span className="adm-slabel">Role</span><span className="adm-pill">Admin</span></div>
      </section>

      {/* Change password */}
      <section className="adm-scard">
        <h3 className="adm-stitle">Change Password</h3>
        <p className="adm-ssub">Use a strong password you don't use elsewhere.</p>

        <label className="adm-field">
          <span>Current password</span>
          <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </label>
        <label className="adm-field">
          <span>New password</span>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
        </label>
        <label className="adm-field">
          <span>Confirm new password</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-type new password" autoComplete="new-password" />
        </label>

        {msg && <p className={msg.type === "ok" ? "adm-ok" : "adm-err"}>{msg.text}</p>}

        <button className="adm-save" onClick={changePassword} disabled={saving}>
          {saving ? "Saving…" : "Update Password"}
        </button>
      </section>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [feedKey, setFeedKey]     = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("bookings");
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const load = () => api.get("/bookings").then((res) => setBookings(res.data || []));
  useEffect(() => { load(); }, []);

  const changeStatus = async (id: string, status: string) => {
    setOpenMenu(null);
    const prev = bookings;
    // optimistic: update the row in place immediately
    setBookings((list) => list.map((b) => (b.id === id ? { ...b, status } : b)));
    try {
      await api.patch(`/bookings/${id}/status`, { status });
    } catch {
      setBookings(prev); // revert if the server rejected it
    }
  };
  const handleLogout = () => { logout(); navigate("/login"); };

  const exportBookings = () => {
    const head = ["Date", "Client", "Email", "Contact", "Service", "Qty", "Delivery", "Address", "Expected Date", "Design Link", "Notes", "Status"];
    const rows = bookings.map((b) => [
      new Date(b.createdAt).toLocaleDateString(),
      b.user?.name || "",
      b.user?.email || "",
      b.contactPhone || b.user?.phone || "",
      b.serviceName || "",
      String(b.quantity ?? ""),
      b.deliveryMethod || "",
      b.address || "",
      b.preferredDate ? new Date(b.preferredDate).toLocaleDateString() : "",
      b.designLink || "",
      (b.notes || "").replace(/\n/g, " "),
      b.status || "",
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = STATUSES.reduce((acc, st) => {
    acc[st] = bookings.filter((b) => b.status === st).length;
    return acc;
  }, {} as Record<string, number>);

  const initial = (user?.name?.[0] || "A").toUpperCase();

  return (
    <div className={`adm-layout${collapsed ? " collapsed" : ""}`}>
      {/* ── Sidebar ── */}
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <img src="/images/abhijit_art_logo.png" alt="Abhijit Art" className="adm-logo" />
        </div>

        <p className="adm-eyebrow">Menu</p>
        <nav className="adm-nav">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              title={label}
              className={`adm-navitem${activeTab === id ? " on" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              <span className="adm-navicon"><Icon /></span>
              <span className="adm-navlabel">{label}</span>
            </button>
          ))}
        </nav>

        {/* Back to Website — pinned to the bottom */}
        <a href="/" className="adm-navitem adm-backlink" title="Back to Website">
          <span className="adm-navicon">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </span>
          <span className="adm-navlabel">Back to Website</span>
        </a>

        {/* collapse / expand toggle */}
        <button
          className="adm-toggle"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand" : "Collapse"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
               style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform .2s ease" }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </aside>

      {/* ── Right column ── */}
      <div className="adm-content">
        {/* Header */}
        <header className="adm-header">
          <h1 className="adm-htitle">{TITLES[activeTab]}</h1>

          <div className="adm-hright">
            <div className="adm-user">
              <div className="adm-avatar">{initial}</div>
              <span className="adm-uname">{user?.name || "Admin"}</span>
            </div>
            <button className="adm-logout" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        {/* Main */}
        <main className="adm-main">
          {activeTab === "bookings" && (
            <>
              <div className="adm-stats">
                <div className="adm-statcard"><div className="adm-statnum" style={{ color: "#1f2430" }}>{bookings.length}</div><div className="adm-statlbl">Total</div></div>
                {STATUSES.map((s) => (
                  <div className="adm-statcard" key={s}>
                    <div className="adm-statnum" style={{ color: STATUS_COLORS[s] }}>{counts[s]}</div>
                    <div className="adm-statlbl">{s}</div>
                  </div>
                ))}
              </div>

              <div className="adm-toolbar">
                <h2 className="adm-toolbar-title">All Bookings</h2>
                <button className="adm-export" onClick={exportBookings} disabled={bookings.length === 0}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export CSV
                </button>
              </div>

              <div className="adm-card">
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr><th>Date</th><th>Client</th><th>Contact</th><th>Service</th><th>Qty</th><th>Delivery</th><th>Expected</th><th>Design</th><th>Notes</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => {
                        const color = STATUS_COLORS[b.status] || "#6b7280";
                        return (
                          <tr key={b.id}>
                            <td style={{ whiteSpace: "nowrap" }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{b.user?.name}</div>
                              <div className="adm-muted">{b.user?.email}</div>
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>{b.contactPhone || b.user?.phone || "—"}</td>
                            <td>{b.serviceName}</td>
                            <td>{b.quantity}</td>
                            <td style={{ whiteSpace: "nowrap", textTransform: "capitalize" }}>
                              {b.deliveryMethod
                                ? <span className={`adm-dtag ${b.deliveryMethod === "delivery" ? "del" : "pick"}`}>{b.deliveryMethod}</span>
                                : <span className="adm-muted">—</span>}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {b.preferredDate ? new Date(b.preferredDate).toLocaleDateString() : <span className="adm-muted">—</span>}
                            </td>
                            <td>
                              {b.designLink
                                ? <a className="adm-link" href={b.designLink} target="_blank" rel="noopener noreferrer">View ↗</a>
                                : <span className="adm-muted">—</span>}
                            </td>
                            <td style={{ maxWidth: 220 }}>{b.notes || <span className="adm-muted">—</span>}</td>
                            <td>
                              <div className="adm-statuswrap">
                                <button
                                  type="button"
                                  className="adm-statusbtn"
                                  style={{ color, borderColor: `${color}55`, background: `${color}12` }}
                                  onClick={() => setOpenMenu(openMenu === b.id ? null : b.id)}
                                >
                                  <span className="adm-dot" style={{ background: color }} />
                                  {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                                  <svg width="11" height="7" viewBox="0 0 11 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
                                    <path d="M1 1l4.5 4.5L10 1" />
                                  </svg>
                                </button>
                                {openMenu === b.id && (
                                  <>
                                    <div className="adm-menuback" onClick={() => setOpenMenu(null)} />
                                    <div className="adm-menu">
                                      {STATUSES.map((sOpt) => (
                                        <button
                                          key={sOpt}
                                          type="button"
                                          className={`adm-menuitem${b.status === sOpt ? " sel" : ""}`}
                                          onClick={() => changeStatus(b.id, sOpt)}
                                        >
                                          <span className="adm-dot" style={{ background: STATUS_COLORS[sOpt] }} />
                                          {sOpt.charAt(0).toUpperCase() + sOpt.slice(1)}
                                          {b.status === sOpt && (
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                                              <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {bookings.length === 0 && <p className="adm-empty">No bookings yet.</p>}
              </div>
            </>
          )}

          {activeTab === "posts" && (
            <div>
              <AdminPostUpload onPostCreated={() => setFeedKey((k) => k + 1)} />
              <PostFeed isAdmin={true} refreshKey={feedKey} />
            </div>
          )}

          {activeTab === "visitors" && <VisitorsAdmin />}

          {activeTab === "settings" && <SettingsPanel user={user} />}
        </main>
      </div>

      <style>{`
        .adm-layout { display: flex; min-height: 100vh; background: #f5f6f8; color: #1f2430; font-family: 'DM Sans', system-ui, sans-serif; }
        .adm-content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .adm-main { padding: 28px clamp(16px,3vw,36px) 60px; }

        /* ── sidebar ── */
        .adm-sidebar {
          position: sticky; top: 0; height: 100vh; flex-shrink: 0;
          width: 248px; box-sizing: border-box;
          background: #ffffff; border-right: 1px solid #ebebf0;
          display: flex; flex-direction: column; gap: 6px;
          padding: 20px 14px;
          transition: width .22s ease, padding .22s ease;
        }
        .adm-brand { display: flex; align-items: center; justify-content: flex-start; gap: 10px; padding: 2px 8px 16px; border-bottom: 1px solid #f1f1f5; min-height: 44px; }
        .adm-logo { height: 34px; width: auto; display: block; transition: height .2s ease; }
        .adm-eyebrow { margin: 12px 12px 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; color: #aeb2bd; }
        .adm-nav { display: flex; flex-direction: column; gap: 4px; }
        .adm-navitem {
          position: relative; display: flex; align-items: center; gap: 13px; width: 100%;
          border: none; background: transparent; color: #5b626f;
          padding: 11px 14px; border-radius: 11px;
          font-size: 14.5px; font-weight: 600; cursor: pointer; text-align: left;
          font-family: inherit; transition: background .16s ease, color .16s ease;
          white-space: nowrap; overflow: hidden;
        }
        .adm-navicon { display: inline-flex; flex-shrink: 0; }
        .adm-navitem:hover { background: #f5f6f8; color: #1f2430; }
        .adm-navitem.on { background: ${ACCENT}14; color: ${ACCENT}; }
        .adm-navitem.on::before { content: ""; position: absolute; left: 0; top: 9px; bottom: 9px; width: 3px; border-radius: 0 3px 3px 0; background: ${ACCENT}; }

        .adm-toggle {
          position: absolute; right: -13px; top: 50%; transform: translateY(-50%);
          width: 26px; height: 26px; border-radius: 50%;
          background: #fff; border: 1px solid #e0e0e8; color: #5b626f;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          box-shadow: 0 2px 8px rgba(20,20,25,.10); z-index: 20; transition: color .16s, border-color .16s;
        }
        .adm-toggle:hover { color: ${ACCENT}; border-color: ${ACCENT}55; }

        .adm-layout.collapsed .adm-sidebar { width: 76px; padding-left: 10px; padding-right: 10px; }
        .adm-layout.collapsed .adm-navlabel,
        .adm-layout.collapsed .adm-eyebrow { display: none; }
        .adm-layout.collapsed .adm-navitem { justify-content: center; gap: 0; padding: 12px 0; }
        .adm-layout.collapsed .adm-brand { justify-content: center; padding-left: 0; padding-right: 0; }
        .adm-layout.collapsed .adm-logo { height: 30px; }

        /* ── header ── */
        .adm-header {
          position: sticky; top: 0; z-index: 10;
          background: #fff; border-bottom: 1px solid #ebebf0;
          padding: 0 clamp(16px,3vw,36px); height: 66px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .adm-htitle { margin: 0; font-size: 20px; font-weight: 800; color: #1f2430; letter-spacing: -0.3px; }
        .adm-hright { display: flex; align-items: center; gap: 14px; }
        .adm-user { display: flex; align-items: center; gap: 10px; }
        .adm-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; background: ${ACCENT}; color: #fff; font-weight: 700; font-size: 15px; display: flex; align-items: center; justify-content: center; }
        .adm-uname { font-weight: 600; font-size: 14.5px; color: #1f2430; }
        .adm-logout { background: #fff; color: #1f2430; border: 1px solid #e0e0e8; padding: 9px 18px; border-radius: 10px; font-weight: 700; font-size: 14px; cursor: pointer; font-family: inherit; transition: background .16s ease; }
        .adm-logout:hover { background: #f5f6f8; }

        /* ── stats ── */
        .adm-stats { display: grid; grid-template-columns: repeat(5,1fr); gap: 16px; margin-bottom: 22px; }
        @media (max-width: 980px) { .adm-stats { grid-template-columns: repeat(3,1fr); } }
        @media (max-width: 560px) { .adm-stats { grid-template-columns: repeat(2,1fr); } }
        .adm-statcard { background: #fff; border: 1px solid #ececf1; border-radius: 14px; padding: 18px 20px; box-shadow: 0 4px 14px rgba(20,20,25,.04); }
        .adm-statnum { font-size: 30px; font-weight: 800; line-height: 1; }
        .adm-statlbl { font-size: 13px; color: #6b7280; margin-top: 7px; text-transform: capitalize; }

        /* ── toolbar ── */
        .adm-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
        .adm-toolbar-title { margin: 0; font-size: 16px; font-weight: 800; color: #1f2430; }
        .adm-export { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #1f2430; border: 1px solid #e0e0e8; padding: 9px 16px; border-radius: 10px; font-weight: 700; font-size: 13.5px; cursor: pointer; font-family: inherit; transition: background .16s, color .16s, border-color .16s; }
        .adm-export:hover { background: ${ACCENT}0e; color: ${ACCENT}; border-color: ${ACCENT}44; }
        .adm-export:disabled { opacity: .5; cursor: default; }

        /* ── table ── */
        .adm-card { background: #fff; border: 1px solid #ececf1; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 14px rgba(20,20,25,.04); }
        .adm-table-wrap { overflow-x: auto; }
        .adm-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 980px; }
        .adm-table th { text-align: left; padding: 14px 20px; font-size: 11.5px; letter-spacing: .6px; text-transform: uppercase; color: #8a8f9a; background: #fafafb; border-bottom: 1px solid #eceff3; font-weight: 700; white-space: nowrap; }
        .adm-table td { padding: 15px 20px; border-bottom: 1px solid #f0f1f4; color: #2a2f3a; vertical-align: top; }
        .adm-table tbody tr:last-child td { border-bottom: none; }
        .adm-table tbody tr { transition: background .15s ease; }
        .adm-table tbody tr:hover { background: #fafbfc; }
        .adm-muted { color: #9aa0ab; font-size: 12.5px; }
        .adm-link { color: ${ACCENT}; font-weight: 700; font-size: 13px; text-decoration: none; white-space: nowrap; }
        .adm-link:hover { text-decoration: underline; }
        .adm-empty { text-align: center; padding: 40px; color: #9aa0ab; font-size: 14.5px; margin: 0; }
        .adm-statuswrap { position: relative; display: inline-block; }
        .adm-statusbtn { display: inline-flex; align-items: center; gap: 7px; border: 1px solid; border-radius: 999px; padding: 6px 12px 6px 11px; font-size: 12.5px; font-weight: 700; font-family: inherit; cursor: pointer; outline: none; white-space: nowrap; transition: filter .15s ease; }
        .adm-statusbtn:hover { filter: brightness(0.97); }
        .adm-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .adm-menuback { position: fixed; inset: 0; z-index: 30; }
        .adm-menu { position: absolute; top: calc(100% + 6px); right: 0; z-index: 31; min-width: 176px; background: #fff; border: 1px solid #edeef1; border-radius: 13px; box-shadow: 0 10px 34px rgba(20,20,25,.12); padding: 5px; }
        .adm-menuitem { display: flex; align-items: center; gap: 10px; width: 100%; border: none; background: transparent; color: #3a3f4a; padding: 9px 12px; border-radius: 9px; font-size: 13.5px; font-weight: 600; cursor: pointer; text-align: left; font-family: inherit; transition: background .12s ease; }
        .adm-menuitem:hover { background: #f6f7f9; }
        .adm-menuitem.sel { color: #1f2430; font-weight: 700; }

        /* ── settings ── */
        .adm-settings { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; max-width: 920px; align-items: start; }
        @media (max-width: 760px) { .adm-settings { grid-template-columns: 1fr; } }
        .adm-scard { background: #fff; border: 1px solid #ececf1; border-radius: 16px; padding: 24px; box-shadow: 0 4px 14px rgba(20,20,25,.04); }
        .adm-stitle { margin: 0 0 4px; font-size: 17px; font-weight: 800; color: #1f2430; }
        .adm-ssub { margin: 0 0 18px; font-size: 13.5px; color: #8a8f9a; }
        .adm-srow { display: flex; align-items: center; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid #f2f2f6; }
        .adm-srow:last-child { border-bottom: none; }
        .adm-slabel { color: #8a8f9a; font-size: 13.5px; font-weight: 600; }
        .adm-sval { color: #1f2430; font-size: 14px; font-weight: 600; }
        .adm-pill { font-size: 12px; font-weight: 800; letter-spacing: .4px; color: ${ACCENT}; background: ${ACCENT}14; border: 1px solid ${ACCENT}33; padding: 3px 11px; border-radius: 999px; }
        .adm-field { display: block; margin-bottom: 14px; }
        .adm-field span { display: block; font-size: 13px; font-weight: 600; color: #5b626f; margin-bottom: 6px; }
        .adm-field input { width: 100%; box-sizing: border-box; padding: 11px 14px; border-radius: 11px; border: 1px solid #e2e2e9; background: #fcfcfd; color: #1f2430; font-size: 14px; font-family: inherit; outline: none; transition: border-color .16s, box-shadow .16s; }
        .adm-field input:focus { border-color: ${ACCENT}; box-shadow: 0 0 0 3px ${ACCENT}1f; }
        .adm-ok { color: #1eae5c; font-size: 13.5px; margin: 2px 0 14px; font-weight: 600; }
        .adm-err { color: #e0413a; font-size: 13.5px; margin: 2px 0 14px; font-weight: 600; }
        .adm-save { background: ${ACCENT}; color: #fff; border: none; padding: 12px 22px; border-radius: 11px; font-weight: 800; font-size: 14.5px; cursor: pointer; font-family: inherit; box-shadow: 0 8px 20px ${ACCENT}40; transition: opacity .16s; }
        .adm-save:hover { opacity: .92; }
        .adm-save:disabled { opacity: .6; cursor: default; }

        .adm-backlink { text-decoration: none; margin-top: auto; border-top: 1px solid #f1f1f5; border-radius: 0; padding-top: 16px; padding-bottom: 4px; color: #5b626f; }
        .adm-backlink:hover { background: ${ACCENT}0e; color: ${ACCENT}; border-radius: 11px; }
        .adm-dtag { display: inline-block; padding: 4px 11px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .adm-dtag.del { color: ${ACCENT}; background: ${ACCENT}14; border: 1px solid ${ACCENT}33; }
        .adm-dtag.pick { color: #5b626f; background: #f1f2f5; border: 1px solid #e4e5ea; }

        /* ── mobile ── */
        @media (max-width: 860px) {
          .adm-layout, .adm-layout.collapsed { flex-direction: column; }
          .adm-sidebar, .adm-layout.collapsed .adm-sidebar { width: 100%; height: auto; position: static; border-right: none; border-bottom: 1px solid #ebebf0; padding: 14px; }
          .adm-brand { border-bottom: none; padding-bottom: 0; }
          .adm-eyebrow, .adm-layout.collapsed .adm-eyebrow { display: none; }
          .adm-nav { flex-direction: row; gap: 6px; overflow-x: auto; }
          .adm-navlabel, .adm-layout.collapsed .adm-navlabel { display: inline; }
          .adm-navitem, .adm-layout.collapsed .adm-navitem { justify-content: flex-start; gap: 10px; padding: 10px 14px; white-space: nowrap; }
          .adm-toggle { display: none; }
          .adm-uname { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .adm-sidebar, .adm-navitem, .adm-logout, .adm-toggle, .adm-table tbody tr, .adm-save, .adm-field input { transition: none; }
        }
      `}</style>
    </div>
  );
}