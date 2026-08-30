import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Bookings         = lazy(() => import("../components/Bookings"));
const Customers        = lazy(() => import("../components/Customers"));
const Inventory        = lazy(() => import("../components/inventory"));
const InvoiceMaker     = lazy(() => import("../components/billing"));
const Invoices         = lazy(() => import("../components/invoices"));
const PaymentReminders = lazy(() => import("../components/PaymentReminders"));
const IncomeExpense    = lazy(() => import("../components/income-expense"));
const Activity         = lazy(() => import("../components/Activity"));
const AdminPostUpload  = lazy(() => import("../components/AdminPostUpload"));
const PostFeed         = lazy(() => import("../components/PostFeed"));
const Settings         = lazy(() => import("../components/Settings"));
const Tasks            = lazy(() => import("../components/tasks"));
const Employees        = lazy(() => import("../components/employees"));
const QuickOrders      = lazy(() => import("../components/quick-order"));

type Tab = "bookings" | "customers" | "inventory" | "billing" | "billing50" | "invoices" | "reminders" | "expenses" | "activity" | "posts" | "employees" | "tasks" | "khata" | "settings";

const ACCENT = "#d9542f";

/* ── inline icons ── */
const ico = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const IconBookings  = () => (<svg {...ico}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6M9 16h6" /></svg>);
const IconBilling   = () => (<svg {...ico}><path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>);
const IconInvoices  = () => (<svg {...ico}><path d="M16 3H6a2 2 0 0 0-2 2v11" /><rect x="8" y="6" width="12" height="15" rx="2" /><path d="M11 11h6M11 15h4" /></svg>);
const IconBilling50 = () => (<svg {...ico}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M4 12h16" strokeDasharray="3 2" /><path d="M7 6h7M7 9h5" /></svg>);
const IconReminders = () => (<svg {...ico}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>);
const IconExpenses  = () => (<svg {...ico}><path d="M3 7V6a2 2 0 0 1 2-2h11" /><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M17 13h2" /><path d="M8 11h5M8 14h5l-3.5 3.5" /></svg>);
const IconActivity  = () => (<svg {...ico}><path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>);
const IconPosts     = () => (<svg {...ico}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>);
const IconSettings  = () => (<svg {...ico}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>);
const IconCustomers = () => (<svg {...ico}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
const IconInventory = () => (<svg {...ico}><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.3 7 12 12l8.7-5M12 22V12" /></svg>);
const IconEmployees = () => (<svg {...ico}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>);
const IconKhata     = () => (<svg {...ico}><path d="M4 6h16M4 10h16M4 14h8M4 18h6"/></svg>);
const IconTasks     = () => (<svg {...ico}><rect x="9" y="3" width="13" height="13" rx="1"/><path d="M5 7H2a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-3"/><path d="m5 12 2 2 4-4"/></svg>);

const NAV: { id: Tab; label: string; Icon: () => JSX.Element }[] = [
  { id: "bookings",  label: "Bookings",  Icon: IconBookings  },
  { id: "customers", label: "Customers", Icon: IconCustomers },
  { id: "inventory", label: "Inventory", Icon: IconInventory },
  { id: "billing",   label: "Billing 100%",  Icon: IconBilling   },
  { id: "billing50", label: "Billing 50%",   Icon: IconBilling50 },
  { id: "invoices",  label: "Invoices",  Icon: IconInvoices  },
  { id: "reminders", label: "Reminders", Icon: IconReminders },
  { id: "expenses",  label: "Income & Expense", Icon: IconExpenses },
  { id: "activity",  label: "Activity",  Icon: IconActivity  },
  { id: "posts",     label: "Posts",     Icon: IconPosts     },
  { id: "khata",     label: "Quick Orders", Icon: IconKhata },
  { id: "employees", label: "Employees", Icon: IconEmployees },
  { id: "tasks",     label: "Tasks",     Icon: IconTasks     },
  { id: "settings",  label: "Settings",  Icon: IconSettings  },
];

const TITLES: Record<Tab, string> = {
  bookings:  "Bookings",
  customers: "Customers",
  inventory: "Inventory",
  billing:   "Billing 100% — full page",
  billing50: "Billing 50% — half page",
  invoices:  "Invoices",
  reminders: "Payment reminders",
  expenses:  "Income & Expense",
  activity:  "Activity",
  posts:     "Posts",
  khata:     "Quick Orders",
  employees: "Employees",
  tasks:     "Tasks",
  settings:  "Settings",
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [feedKey,        setFeedKey]        = useState(0);
  const [activeTab,      setActiveTab]      = useState<Tab>("bookings");
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [taskPrefillEmp, setTaskPrefillEmp] = useState<string | null>(null);

  const handleLogout = () => { logout(); navigate("/login"); };
  const initial = (user?.name?.[0] || "A").toUpperCase();

  return (
    <div className="adm-layout">

      <div
        className={`adm-backdrop${drawerOpen ? " on" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />

      <aside className={`adm-sidebar${drawerOpen ? " open" : ""}`}>
        <div className="adm-sidebar-inner">
          <div className="adm-brand">
            <img src="/images/abhijit_art_logo.png" alt="Abhijit Art" className="adm-logo" />
          </div>
          <p className="adm-eyebrow">Menu</p>
          <nav className="adm-nav">
            {NAV.map(({ id, label, Icon }) => (
              <button
                key={id} title={label}
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
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </span>
            <span className="adm-navlabel">Back to Website</span>
          </a>
        </div>
      </aside>

      <div className="adm-content">
        <header className="adm-header">
          <button className="adm-burger" onClick={() => setDrawerOpen(true)}
            aria-label="Open menu" aria-expanded={drawerOpen}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6"  x2="21" y2="6"  />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
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

        <main className={`adm-main${activeTab === "inventory" ? " no-pad" : ""}`}>
          <Suspense fallback={<p style={{ padding: 20, color: "#aaa" }}>Loading…</p>}>
            {activeTab === "bookings"  && <Bookings />}
            {activeTab === "customers" && <Customers />}
            {activeTab === "inventory" && <Inventory />}
            {activeTab === "billing"   && <InvoiceMaker variant="full" />}
            {activeTab === "billing50" && <InvoiceMaker variant="half" />}
            {activeTab === "invoices"  && <Invoices />}
            {activeTab === "reminders" && <PaymentReminders />}
            {activeTab === "expenses"  && <IncomeExpense />}
            {activeTab === "activity"  && <Activity />}
            {activeTab === "posts"     && (
              <div>
                <AdminPostUpload onPostCreated={() => setFeedKey(k => k + 1)} />
                <PostFeed isAdmin={true} refreshKey={feedKey} />
              </div>
            )}
            {activeTab === "khata"     && <QuickOrders />}
            {activeTab === "employees" && (
              <Employees
                onAssignTask={id => { setTaskPrefillEmp(id); setActiveTab("tasks"); }}
              />
            )}
            {activeTab === "tasks" && (
              <Tasks
                prefillEmployeeId={taskPrefillEmp}
                onPrefillConsumed={() => setTaskPrefillEmp(null)}
                onGoToBilling={() => setActiveTab("billing")}
              />
            )}
            {activeTab === "settings"  && <Settings />}
          </Suspense>
        </main>
      </div>

      <style>{`
        .adm-layout {
          display: flex; min-height: 100vh;
          background: #f5f6f8; color: #1f2430;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .adm-content {
          flex: 1; min-width: 0; max-width: 100%;
          display: flex; flex-direction: column; overflow-x: hidden;
        }
        .adm-main {
          padding: 28px clamp(16px,3vw,36px) 60px;
          min-width: 0; max-width: 100%;
        }
        .adm-main.no-pad {
          padding: 0; display: flex; flex-direction: column; flex: 1; min-height: 0;
        }
        .adm-sidebar {
          position: sticky; top: 0; height: 100vh; flex-shrink: 0;
          width: 248px; box-sizing: border-box;
          background: #ffffff; border-right: 1px solid #ebebf0;
          display: flex; flex-direction: column;
          padding: 20px 14px;
        }
        .adm-sidebar-inner {
          display: flex; flex-direction: column; gap: 6px;
          flex: 1; overflow-y: auto; min-height: 0;
        }
        .adm-brand {
          display: flex; align-items: center; justify-content: flex-start;
          gap: 10px; padding: 2px 8px 16px;
          border-bottom: 1px solid #f1f1f5; min-height: 44px;
        }
        .adm-logo { height: 34px; width: auto; display: block; }
        .adm-eyebrow {
          margin: 12px 12px 6px; font-size: 10.5px; font-weight: 800;
          letter-spacing: 1.4px; text-transform: uppercase; color: #aeb2bd;
        }
        .adm-nav { display: flex; flex-direction: column; gap: 4px; }
        .adm-navitem {
          position: relative; display: flex; align-items: center; gap: 13px;
          width: 100%; border: none; background: transparent; color: #5b626f;
          padding: 11px 14px; border-radius: 0;
          font-size: 14.5px; font-weight: 600; cursor: pointer; text-align: left;
          font-family: inherit; transition: background .16s ease, color .16s ease;
          white-space: nowrap; overflow: hidden; text-decoration: none;
        }
        .adm-navicon { display: inline-flex; flex-shrink: 0; }
        .adm-navitem:hover  { background: #f5f6f8; color: #1f2430; }
        .adm-navitem.on     { background: ${ACCENT}14; color: ${ACCENT}; }
        .adm-navitem.on::before {
          content: ""; position: absolute; left: 0; top: 9px; bottom: 9px;
          width: 3px; border-radius: 0; background: ${ACCENT};
        }
        .adm-header {
          position: sticky; top: 0; z-index: 10;
          background: #fff; border-bottom: 1px solid #ebebf0;
          padding: 0 clamp(16px,3vw,36px); height: 66px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .adm-htitle  { margin: 0; font-size: 20px; font-weight: 800; color: #1f2430; letter-spacing: -0.3px; }
        .adm-hright  { display: flex; align-items: center; gap: 14px; }
        .adm-user    { display: flex; align-items: center; gap: 10px; }
        .adm-avatar  {
          width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
          background: ${ACCENT}; color: #fff;
          font-weight: 700; font-size: 15px;
          display: flex; align-items: center; justify-content: center;
        }
        .adm-uname  { font-weight: 600; font-size: 14.5px; color: #1f2430; }
        .adm-logout {
          background: #fff; color: #1f2430; border: 1px solid #e0e0e8;
          padding: 9px 18px; border-radius: 0;
          font-weight: 700; font-size: 14px; cursor: pointer;
          font-family: inherit; transition: background .16s ease;
        }
        .adm-logout:hover { background: #f5f6f8; }
        .adm-backlink {
          text-decoration: none; margin-top: auto;
          border-top: 1px solid #f1f1f5; border-radius: 0;
          padding-top: 16px; padding-bottom: 4px; color: #5b626f;
        }
        .adm-backlink:hover { background: ${ACCENT}0e; color: ${ACCENT}; border-radius: 0; }
        .adm-burger {
          display: none; background: transparent; border: none; color: #1f2430;
          cursor: pointer; padding: 6px; margin-right: 4px; align-items: center;
        }
        .adm-backdrop {
          display: none; position: fixed; inset: 0;
          background: rgba(24,22,28,.45); z-index: 40;
          opacity: 0; transition: opacity .22s ease;
        }
        @media (max-width: 860px) {
          .adm-header   { position: fixed; top: 0; left: 0; right: 0; z-index: 45; }
          .adm-content  { padding-top: 64px; }
          .adm-burger   { display: inline-flex; }
          .adm-backdrop { display: block; pointer-events: none; }
          .adm-backdrop.on { opacity: 1; pointer-events: auto; }
          .adm-sidebar {
            position: fixed; top: 0; left: 0; bottom: 0; height: 100vh;
            width: 264px; padding: 20px 14px; z-index: 50;
            border-right: 1px solid #ebebf0; border-bottom: none;
            transform: translateX(-100%);
            transition: transform .26s cubic-bezier(.22,1,.36,1);
            overflow: hidden;
          }
          .adm-sidebar-inner { overflow-y: auto; }
          .adm-sidebar.open { transform: translateX(0); }
          .adm-nav { flex-direction: column; gap: 4px; overflow-x: visible; }
          .adm-uname  { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .adm-sidebar, .adm-navitem, .adm-logout { transition: none; }
        }
      `}</style>
    </div>
  );
}