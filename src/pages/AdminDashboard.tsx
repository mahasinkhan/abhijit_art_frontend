import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Bookings         = lazy(() => import("../components/Bookings"));
const Customers        = lazy(() => import("../components/Customers"));
const Inventory        = lazy(() => import("../components/Inventory"));
const InvoiceMaker     = lazy(() => import("../components/InvoiceMaker"));
const Invoices         = lazy(() => import("../components/Invoices"));
const PaymentReminders = lazy(() => import("../components/PaymentReminders"));
const Activity         = lazy(() => import("../components/Activity"));
const AdminPostUpload  = lazy(() => import("../components/AdminPostUpload"));
const PostFeed         = lazy(() => import("../components/PostFeed"));
const Settings         = lazy(() => import("../components/Settings"));

type Tab = "bookings" | "customers" | "inventory" | "billing" | "invoices" | "reminders" | "activity" | "posts" | "settings";

const ACCENT = "#d9542f";

/* ── inline icons ── */
const ico = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const IconBookings  = () => (<svg {...ico}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6M9 16h6" /></svg>);
const IconBilling   = () => (<svg {...ico}><path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>);
const IconInvoices  = () => (<svg {...ico}><path d="M16 3H6a2 2 0 0 0-2 2v11" /><rect x="8" y="6" width="12" height="15" rx="2" /><path d="M11 11h6M11 15h4" /></svg>);
const IconReminders = () => (<svg {...ico}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>);
const IconActivity  = () => (<svg {...ico}><path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>);
const IconPosts     = () => (<svg {...ico}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>);
const IconSettings  = () => (<svg {...ico}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>);
const IconCustomers = () => (<svg {...ico}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
const IconInventory = () => (<svg {...ico}><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.3 7 12 12l8.7-5M12 22V12" /></svg>);

const NAV: { id: Tab; label: string; Icon: () => JSX.Element }[] = [
  { id: "bookings",  label: "Bookings",  Icon: IconBookings  },
  { id: "customers", label: "Customers", Icon: IconCustomers },
  { id: "inventory", label: "Inventory", Icon: IconInventory },
  { id: "billing",   label: "Billing",   Icon: IconBilling   },
  { id: "invoices",  label: "Invoices",  Icon: IconInvoices  },
  { id: "reminders", label: "Reminders", Icon: IconReminders },
  { id: "activity",  label: "Activity",  Icon: IconActivity  },
  { id: "posts",     label: "Posts",     Icon: IconPosts     },
  { id: "settings",  label: "Settings",  Icon: IconSettings  },
];

const TITLES: Record<Tab, string> = {
  bookings: "Bookings", customers: "Customers", inventory: "Inventory",
  billing: "Billing", invoices: "Invoices", reminders: "Payment reminders",
  activity: "Activity", posts: "Posts", settings: "Settings",
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [feedKey, setFeedKey]     = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("bookings");
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };
  const initial = (user?.name?.[0] || "A").toUpperCase();

  return (
    <div className={`adm-layout${collapsed ? " collapsed" : ""}`}>
      {/* ── Sidebar ── */}
      <div className={`adm-backdrop${drawerOpen ? " on" : ""}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`adm-sidebar${drawerOpen ? " open" : ""}`}>
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
              onClick={() => { setActiveTab(id); setDrawerOpen(false); }}
            >
              <span className="adm-navicon"><Icon /></span>
              <span className="adm-navlabel">{label}</span>
            </button>
          ))}
        </nav>

        <a href="/" className="adm-navitem adm-backlink" title="Back to Website">
          <span className="adm-navicon">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </span>
          <span className="adm-navlabel">Back to Website</span>
        </a>

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
        <header className="adm-header">
          <button className="adm-burger" onClick={() => setDrawerOpen(true)} aria-label="Open menu" aria-expanded={drawerOpen}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h1 className="adm-htitle">{TITLES[activeTab]}</h1>
          <div className="adm-hright">
            <div className="adm-user">
              <div className="adm-avatar">{initial}</div>
              <span className="adm-uname">{user?.name || "Admin"}</span>
            </div>
            <button className="adm-logout" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <main className="adm-main">
          <Suspense fallback={<p style={{ padding: 20, color: "#aaa" }}>Loading…</p>}>
            {activeTab === "bookings"  && <Bookings />}
            {activeTab === "customers" && <Customers />}
            {activeTab === "inventory" && <Inventory />}
            {activeTab === "billing"   && <InvoiceMaker />}
            {activeTab === "invoices"  && <Invoices />}
            {activeTab === "reminders" && <PaymentReminders />}
            {activeTab === "activity"  && <Activity />}
            {activeTab === "posts"     && (
              <div>
                <AdminPostUpload onPostCreated={() => setFeedKey((k) => k + 1)} />
                <PostFeed isAdmin={true} refreshKey={feedKey} />
              </div>
            )}
            {activeTab === "settings"  && <Settings />}
          </Suspense>
        </main>
      </div>

      <style>{`
        .adm-layout { display: flex; min-height: 100vh; background: #f5f6f8; color: #1f2430; font-family: 'DM Sans', system-ui, sans-serif; }
        .adm-content { flex: 1; min-width: 0; max-width: 100%; display: flex; flex-direction: column; overflow-x: hidden; }
        .adm-main { padding: 28px clamp(16px,3vw,36px) 60px; min-width: 0; max-width: 100%; }

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
          padding: 11px 14px; border-radius: 0;
          font-size: 14.5px; font-weight: 600; cursor: pointer; text-align: left;
          font-family: inherit; transition: background .16s ease, color .16s ease;
          white-space: nowrap; overflow: hidden;
        }
        .adm-navicon { display: inline-flex; flex-shrink: 0; }
        .adm-navitem:hover { background: #f5f6f8; color: #1f2430; }
        .adm-navitem.on { background: ${ACCENT}14; color: ${ACCENT}; }
        .adm-navitem.on::before { content: ""; position: absolute; left: 0; top: 9px; bottom: 9px; width: 3px; border-radius: 0; background: ${ACCENT}; }

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
        .adm-logout { background: #fff; color: #1f2430; border: 1px solid #e0e0e8; padding: 9px 18px; border-radius: 0; font-weight: 700; font-size: 14px; cursor: pointer; font-family: inherit; transition: background .16s ease; }
        .adm-logout:hover { background: #f5f6f8; }

        .adm-backlink { text-decoration: none; margin-top: auto; border-top: 1px solid #f1f1f5; border-radius: 0; padding-top: 16px; padding-bottom: 4px; color: #5b626f; }
        .adm-backlink:hover { background: ${ACCENT}0e; color: ${ACCENT}; border-radius: 0; }

        /* ── mobile ── */
        .adm-burger { display: none; background: transparent; border: none; color: #1f2430; cursor: pointer; padding: 6px; margin-right: 4px; align-items: center; }
        .adm-backdrop { display: none; position: fixed; inset: 0; background: rgba(24,22,28,.45); z-index: 40; opacity: 0; transition: opacity .22s ease; }
        /* adm-drawercss */
        @media (max-width: 860px) {
          .adm-burger { display: inline-flex; }
          .adm-backdrop { display: block; pointer-events: none; }
          .adm-backdrop.on { opacity: 1; pointer-events: auto; }
          .adm-sidebar, .adm-layout.collapsed .adm-sidebar { position: fixed; top: 0; left: 0; bottom: 0; height: 100vh; width: 264px; padding: 20px 14px; z-index: 50; border-right: 1px solid #ebebf0; border-bottom: none; transform: translateX(-100%); transition: transform .26s cubic-bezier(.22,1,.36,1); overflow-y: auto; }
          .adm-sidebar.open, .adm-layout.collapsed .adm-sidebar.open { transform: translateX(0); }
          .adm-nav { flex-direction: column; gap: 4px; overflow-x: visible; }
          .adm-navlabel, .adm-layout.collapsed .adm-navlabel { display: inline; }
          .adm-eyebrow, .adm-layout.collapsed .adm-eyebrow { display: block; }
          .adm-navitem, .adm-layout.collapsed .adm-navitem { justify-content: flex-start; gap: 13px; padding: 12px 14px; }
          .adm-toggle { display: none; }
          .adm-uname { display: none; }
        }
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
          .adm-sidebar, .adm-navitem, .adm-logout, .adm-toggle { transition: none; }
        }
      `}</style>
    </div>
  );
}