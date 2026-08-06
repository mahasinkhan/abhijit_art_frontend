import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api";
import { useAuth } from "../context/AuthContext";

/* ══════════════════════════════════════════════════════════════
   MY BOOKINGS  ·  "orders list" layout
   Left filter rail (Order Status + Order Time) + search + list rows
   with a status column — Flipkart-style My Orders page in the warm
   brand system (terracotta / gold / cream).

   FONT: Avenir Next LT Pro (single family for headings + body).
   LAYOUT: full-width — no max-width container, no side gaps.

   DATA: GET /bookings/mine  (res.data = the array).
   ══════════════════════════════════════════════════════════════ */

/* ── single brand font everywhere ── */
const FONT = "'Avenir Next LT Pro', 'Avenir Next', Avenir, 'Segoe UI', system-ui, sans-serif";

/* ── warm brand tokens ── */
const CREAM = "#faf6ee";
const CARD = "#ffffff";
const INK = "#2a2320";
const MUTE = "#8b7f74";
const FAINT = "#b6a99c";
const LINE = "#ece3d5";
const TERRA = "#d9542f";
const GOLD = "#c2974a";
const GREEN = "#2f9e5f";
const RED = "#c0453a";
const BLUE = "#3f76c9";

/* ── status → category / colour / copy ── */
type Cat = "pending" | "confirmed" | "completed" | "cancelled" | "other";
function category(key: string): Cat {
  if (key === "pending") return "pending";
  if (["confirmed", "accepted", "approved", "processing", "in-progress", "in_progress"].includes(key))
    return "confirmed";
  if (["completed", "delivered", "done"].includes(key)) return "completed";
  if (["cancelled", "canceled", "rejected", "declined"].includes(key)) return "cancelled";
  return "other";
}
const CAT_META: Record<Cat, { fg: string; bg: string; bar: string; label: string; desc: string }> = {
  pending: { fg: "#9a6a12", bg: "#fbf1d9", bar: GOLD, label: "Pending", desc: "Your request is awaiting confirmation from our team." },
  confirmed: { fg: "#1f4f9c", bg: "#e9f0fb", bar: BLUE, label: "Confirmed", desc: "Confirmed — we've started preparing your order." },
  completed: { fg: "#1c6b41", bg: "#e6f5ec", bar: GREEN, label: "Completed", desc: "All done. Thanks for choosing Abhijit Art!" },
  cancelled: { fg: "#9a2f27", bg: "#fbeceb", bar: RED, label: "Cancelled", desc: "This request was cancelled." },
  other: { fg: MUTE, bg: "#f2ede3", bar: FAINT, label: "Booking", desc: "We'll update the status here as it progresses." },
};
const titleCase = (s: string) => s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* ── date helpers ── */
const parse = (d: unknown) => {
  if (!d) return null;
  const dt = new Date(d as string);
  return isNaN(dt.getTime()) ? null : dt;
};
const fmtDateTime = (d: unknown) => {
  const dt = parse(d);
  if (!dt) return "";
  return (
    dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
};
const fmtDate = (d: unknown) => {
  const dt = parse(d);
  return dt ? dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
};

/* ── normalise a raw booking ── */
type Booking = {
  id: string;
  service: string;
  quantity: number;
  notes: string;
  statusKey: string;
  createdAt: unknown;
  delivery: string;
  address: string;
  preferredDate: unknown;
  designLink: string;
};
function normalize(b: any, i: number): Booking {
  const service =
    b?.serviceName ??
    (typeof b?.service === "string" ? b.service : b?.service?.name) ??
    b?.name ??
    "Service";
  return {
    id: String(b?.id ?? b?._id ?? i),
    service: String(service),
    quantity: Number(b?.quantity ?? 1),
    notes: String(b?.notes ?? b?.note ?? "").trim(),
    statusKey: String(b?.status ?? "pending").toLowerCase().trim(),
    createdAt: b?.createdAt ?? b?.created_at ?? b?.date ?? null,
    delivery: String(b?.deliveryMethod ?? b?.delivery ?? "").toLowerCase(),
    address: String(b?.address ?? "").trim(),
    preferredDate: b?.preferredDate ?? b?.preferred_date ?? null,
    designLink: String(b?.designLink ?? b?.design_link ?? "").trim(),
  };
}

/* ── icons ── */
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const map: Record<string, JSX.Element> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" {...p} />
        <path d="m20 20-3.2-3.2" {...p} />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" {...p} />
        <path d="M12 7v5l3 2" {...p} />
      </>
    ),
    truck: (
      <>
        <rect x="1.5" y="6" width="12" height="9" rx="1" {...p} />
        <path d="M13.5 9h4l3 3v3h-7z" {...p} />
        <circle cx="6" cy="17.5" r="1.7" {...p} />
        <circle cx="17" cy="17.5" r="1.7" {...p} />
      </>
    ),
    store: (
      <>
        <path d="M4 9h16v11H4z" {...p} />
        <path d="M3 9 5 4h14l2 5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" {...p} />
      </>
    ),
    link: (
      <>
        <path d="M14 4h6v6M20 4l-9 9" {...p} />
        <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" {...p} />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" {...p} />
        <circle cx="12" cy="10" r="2.5" {...p} />
      </>
    ),
    inbox: (
      <>
        <path d="M3 12h5l2 3h4l2-3h5" {...p} />
        <path d="M4.5 6.5 3 12v7a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-7l-1.5-5.5A2 2 0 0 0 17.6 5H6.4a2 2 0 0 0-1.9 1.5z" {...p} />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2 20h20L12 3z" {...p} />
        <path d="M12 9v5M12 17h.01" {...p} />
      </>
    ),
    refresh: <path d="M20 11a8 8 0 1 0-1.5 5.5M20 5v6h-6" {...p} />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" {...p} />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
      {map[name]}
    </svg>
  );
}

/* ── service thumbnail (tries /images/services/<slug>.jpeg → .jpg → initial tile) ── */
function Thumb({ name }: { name: string }) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const [ext, setExt] = useState<"jpeg" | "jpg" | "none">("jpeg");
  return (
    <div style={st.thumb}>
      {ext !== "none" && (
        <img
          src={`/images/services/${slug}.${ext}`}
          alt={name}
          loading="lazy"
          onError={() => setExt(ext === "jpeg" ? "jpg" : "none")}
          style={st.thumbImg}
        />
      )}
      {ext === "none" && <span style={st.thumbInitial}>{(name[0] || "?").toUpperCase()}</span>}
    </div>
  );
}

/* labelled meta piece in a row */
function Meta({ icon, children }: { icon?: string; children: React.ReactNode }) {
  return (
    <span style={st.metaItem}>
      {icon && (
        <span style={{ color: TERRA, display: "inline-flex" }}>
          <Icon name={icon} size={14} />
        </span>
      )}
      {children}
    </span>
  );
}

/* checkbox filter row */
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="mb-check" style={st.check}>
      <input type="checkbox" checked={checked} onChange={onChange} style={st.checkbox} />
      <span>{label}</span>
    </label>
  );
}

const STATUS_OPTS: { key: Cat; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

/* ───────────────────────── page ───────────────────────── */
export default function MyBookings() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [raw, setRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusSet, setStatusSet] = useState<Set<Cat>>(new Set());
  const [timeSet, setTimeSet] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/bookings/mine");
      const d = res.data;
      const list = Array.isArray(d) ? d : d?.bookings ?? d?.data ?? [];
      setRaw(Array.isArray(list) ? list : []);
    } catch {
      setError("We couldn't load your bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const yr = now.getFullYear();
  const prev = yr - 1;
  const TIME_OPTS = [
    { key: "last30", label: "Last 30 days" },
    { key: String(yr), label: String(yr) },
    { key: String(prev), label: String(prev) },
    { key: "older", label: "Older" },
  ];

  const bookings = useMemo(() => raw.map(normalize), [raw]);
  const sorted = useMemo(
    () =>
      [...bookings].sort((a, b) => (parse(b.createdAt)?.getTime() ?? 0) - (parse(a.createdAt)?.getTime() ?? 0)),
    [bookings]
  );

  const inTime = (d: unknown, key: string) => {
    const dt = parse(d);
    if (!dt) return false;
    if (key === "last30") return now.getTime() - dt.getTime() <= 30 * 864e5;
    if (key === "older") return dt.getFullYear() < prev;
    return dt.getFullYear() === Number(key);
  };

  const visible = useMemo(
    () =>
      sorted.filter((b) => {
        if (search.trim() && !`${b.service} ${b.notes}`.toLowerCase().includes(search.trim().toLowerCase()))
          return false;
        if (statusSet.size && !statusSet.has(category(b.statusKey))) return false;
        if (timeSet.size && !Array.from(timeSet).some((k) => inTime(b.createdAt, k))) return false;
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sorted, search, statusSet, timeSet]
  );

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  };
  const anyFilter = statusSet.size > 0 || timeSet.size > 0 || search.trim().length > 0;
  const clearAll = () => {
    setStatusSet(new Set());
    setTimeSet(new Set());
    setSearch("");
  };
  const firstName = user?.name?.split(" ")[0];

  return (
    <div style={st.page}>
      <div style={st.wrap}>
        {/* page header */}
        <div style={st.head}>
          <div>
            <span style={st.eyebrow}>YOUR ACCOUNT</span>
            <h1 style={st.title}>My Bookings</h1>
          </div>
          <button className="mb-cta mb-cta-head" style={st.cta} onClick={() => navigate("/services")}>
            Book a service <Icon name="arrow" size={16} />
          </button>
        </div>

        <div className="mb-layout" style={st.layout}>
          {/* ── filter sidebar ── */}
          <aside className="mb-side" style={st.side}>
            <div style={st.sideHead}>
              <h2 style={st.sideTitle}>Filters</h2>
              {anyFilter && (
                <button className="mb-clear" style={st.clear} onClick={clearAll}>
                  Clear
                </button>
              )}
            </div>

            <p style={st.groupLabel}>ORDER STATUS</p>
            {STATUS_OPTS.map((o) => (
              <Check
                key={o.key}
                label={o.label}
                checked={statusSet.has(o.key)}
                onChange={() => toggle(statusSet, o.key, setStatusSet)}
              />
            ))}

            <div style={st.groupDivider} />

            <p style={st.groupLabel}>ORDER TIME</p>
            {TIME_OPTS.map((o) => (
              <Check
                key={o.key}
                label={o.label}
                checked={timeSet.has(o.key)}
                onChange={() => toggle(timeSet, o.key, setTimeSet)}
              />
            ))}
          </aside>

          {/* ── main column ── */}
          <section style={{ minWidth: 0 }}>
            {/* search */}
            <div style={st.searchRow}>
              <span style={st.searchIcon}>
                <Icon name="search" size={18} />
              </span>
              <input
                className="mb-input"
                style={st.searchInput}
                placeholder="Search your bookings here"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="mb-cta" style={st.searchBtn} type="button">
                <Icon name="search" size={16} /> Search
              </button>
            </div>

            {/* states */}
            {loading ? (
              <div style={st.list}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="mb-skel" style={st.skel} />
                ))}
              </div>
            ) : error ? (
              <div style={st.state}>
                <span style={{ ...st.stateIcon, color: RED, background: "#fbeceb" }}>
                  <Icon name="alert" size={26} />
                </span>
                <h3 style={st.stateTitle}>Something went wrong</h3>
                <p style={st.stateText}>{error}</p>
                <button className="mb-cta" style={st.cta} onClick={load}>
                  <Icon name="refresh" size={16} /> Try again
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div style={st.state}>
                <span style={{ ...st.stateIcon, color: TERRA, background: "#fbeee7" }}>
                  <Icon name="inbox" size={26} />
                </span>
                <h3 style={st.stateTitle}>{sorted.length === 0 ? "No bookings yet" : "No matches"}</h3>
                <p style={st.stateText}>
                  {sorted.length === 0
                    ? firstName
                      ? `Once you book a service, ${firstName}, it'll appear here so you can track its status.`
                      : "Once you book a service, it'll appear here so you can track its status."
                    : "No bookings match your filters or search."}
                </p>
                {sorted.length === 0 ? (
                  <button className="mb-cta" style={st.cta} onClick={() => navigate("/services")}>
                    Browse services <Icon name="arrow" size={16} />
                  </button>
                ) : (
                  <button className="mb-ghost" style={st.ghost} onClick={clearAll}>
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <motion.div
                style={st.list}
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              >
                {visible.map((b) => {
                  const cat = category(b.statusKey);
                  const meta = CAT_META[cat];
                  const label = cat === "other" ? titleCase(b.statusKey) : meta.label;
                  return (
                    <motion.article
                      key={b.id}
                      className="mb-row"
                      style={st.row}
                      variants={{
                        hidden: { opacity: 0, y: 14 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
                      }}
                    >
                      {/* left: product-style details */}
                      <div style={st.rowMain}>
                        <Thumb name={b.service} />
                        <div style={{ minWidth: 0 }}>
                          <h3 style={st.svc}>{b.service}</h3>
                          <div style={st.metaRow}>
                            <Meta>
                              Qty <strong style={st.metaStrong}>{b.quantity}</strong>
                            </Meta>
                            {b.delivery && (
                              <Meta icon={b.delivery === "delivery" ? "truck" : "store"}>
                                {titleCase(b.delivery)}
                              </Meta>
                            )}
                            {b.preferredDate && <Meta icon="clock">Preferred {fmtDate(b.preferredDate)}</Meta>}
                          </div>
                          {b.notes && <p style={st.note}>“{b.notes}”</p>}
                          {b.delivery === "delivery" && b.address && (
                            <p style={st.addr}>
                              <span style={{ color: TERRA }}>
                                <Icon name="pin" size={13} />
                              </span>
                              {b.address}
                            </p>
                          )}
                          {b.designLink && (
                            <a
                              href={b.designLink}
                              target="_blank"
                              rel="noreferrer"
                              className="mb-file"
                              style={st.file}
                            >
                              <Icon name="link" size={13} /> View design file
                            </a>
                          )}
                        </div>
                      </div>

                      {/* right: status column */}
                      <div className="mb-row-status" style={st.rowStatus}>
                        <div style={st.statusLabel}>
                          <span style={{ ...st.statusDot, background: meta.bar }} />
                          <span style={{ color: meta.fg }}>{label}</span>
                        </div>
                        <p style={st.statusDesc}>{meta.desc}</p>
                        {fmtDateTime(b.createdAt) && (
                          <p style={st.statusDate}>
                            <Icon name="clock" size={13} /> Requested {fmtDateTime(b.createdAt)}
                          </p>
                        )}
                        <button
                          className="mb-details"
                          style={st.detailsBtn}
                          onClick={() =>
                            navigate(`/my-bookings/${b.id}`, {
                              state: { booking: raw.find((r) => String(r.id ?? r._id) === b.id) },
                            })
                          }
                        >
                          View details <Icon name="arrow" size={13} />
                        </button>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
            )}
          </section>
        </div>
      </div>

      {/* ───────────────────────── css ───────────────────────── */}
      <style>{`
        /* Avenir Next LT Pro — uses the locally installed font if present,
           otherwise falls back to files in public/fonts/ (add them there
           if you have the .woff2 files; harmless 404s are ignored). */
        @font-face {
          font-family: 'Avenir Next LT Pro';
          src: local('Avenir Next LT Pro'), local('AvenirNextLTPro-Regular'),
               url('/fonts/AvenirNextLTPro-Regular.woff2') format('woff2');
          font-weight: 400; font-style: normal; font-display: swap;
        }
        @font-face {
          font-family: 'Avenir Next LT Pro';
          src: local('Avenir Next LT Pro Medium'), local('AvenirNextLTPro-Medium'),
               url('/fonts/AvenirNextLTPro-Medium.woff2') format('woff2');
          font-weight: 500; font-style: normal; font-display: swap;
        }
        @font-face {
          font-family: 'Avenir Next LT Pro';
          src: local('Avenir Next LT Pro Demi'), local('AvenirNextLTPro-Demi'),
               url('/fonts/AvenirNextLTPro-Demi.woff2') format('woff2');
          font-weight: 600; font-style: normal; font-display: swap;
        }
        @font-face {
          font-family: 'Avenir Next LT Pro';
          src: local('Avenir Next LT Pro Bold'), local('AvenirNextLTPro-Bold'),
               url('/fonts/AvenirNextLTPro-Bold.woff2') format('woff2');
          font-weight: 700; font-style: normal; font-display: swap;
        }

        .mb-cta {
          border: none; cursor: pointer; font-family: inherit; font-weight: 700;
          display: inline-flex; align-items: center; gap: 8px;
          background: ${TERRA}; color: #fff; box-shadow: 0 10px 22px ${TERRA}30;
          transition: transform .22s ease, box-shadow .22s ease, background .22s ease;
        }
        .mb-cta:hover { transform: translateY(-2px); box-shadow: 0 15px 28px ${TERRA}44; background: #c8481f; }
        .mb-cta svg { transition: transform .22s ease; }
        .mb-cta:hover svg { transform: translateX(2px); }

        .mb-ghost, .mb-clear { transition: background .2s, border-color .2s, color .2s; }
        .mb-ghost:hover { background: #fff; border-color: ${GOLD}; }
        .mb-clear:hover { color: ${TERRA}; }

        .mb-input { transition: border-color .2s, box-shadow .2s; }
        .mb-input:focus { border-color: ${TERRA}; box-shadow: 0 0 0 3px ${TERRA}1f; }

        .mb-check { transition: color .18s; }
        .mb-check:hover { color: ${INK}; }
        .mb-check input { accent-color: ${TERRA}; }

        .mb-row { transition: box-shadow .3s, border-color .3s, transform .3s; }
        .mb-row:hover { box-shadow: 0 18px 40px rgba(42,35,32,.10); border-color: ${GOLD}55; }

        .mb-file { transition: color .2s; }
        .mb-file:hover { color: ${TERRA}; }

        .mb-details { transition: background .2s, border-color .2s, color .2s; }
        .mb-details:hover { background: ${CARD}; border-color: ${GOLD}; color: ${TERRA}; }
        .mb-details svg { transition: transform .2s; }
        .mb-details:hover svg { transform: translateX(2px); }

        .mb-skel {
          background: linear-gradient(100deg, #f3ece1 30%, #f9f4ec 50%, #f3ece1 70%);
          background-size: 220% 100%; animation: mbShimmer 1.3s ease-in-out infinite;
        }
        @keyframes mbShimmer { 0% { background-position: 100% 0; } 100% { background-position: -120% 0; } }

        @media (max-width: 900px) {
          .mb-layout { grid-template-columns: 1fr !important; }
          .mb-side { position: static !important; }
        }
        @media (max-width: 680px) {
          .mb-row { flex-direction: column !important; }
          .mb-row-status { flex: none !important; border-left: none !important; border-top: 1px solid ${LINE} !important; padding-left: 0 !important; padding-top: 16px !important; margin-top: 4px; }
          .mb-cta.mb-cta-head { width: 100%; justify-content: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mb-cta, .mb-row, .mb-check, .mb-cta svg { transition: none !important; }
          .mb-skel { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────── styles ───────────────────────── */
const st: Record<string, React.CSSProperties> = {
  page: { background: CREAM, minHeight: "100vh", color: INK, fontFamily: FONT },
  /* full-width — no max-width container, small edge padding only */
  wrap: {
    width: "100%",
    boxSizing: "border-box",
    padding: "clamp(20px, 3vw, 40px) clamp(14px, 2vw, 28px) 64px",
  },

  head: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 24 },
  eyebrow: { display: "block", color: TERRA, fontSize: 12, fontWeight: 700, letterSpacing: 3, marginBottom: 8 },
  title: { fontFamily: FONT, fontSize: "clamp(28px, 3.6vw, 42px)", fontWeight: 700, letterSpacing: -0.5, margin: 0, lineHeight: 1.05 },
  cta: { padding: "12px 22px", borderRadius: 12, fontSize: 14.5 },

  layout: { display: "grid", gridTemplateColumns: "248px minmax(0,1fr)", gap: 24, alignItems: "start" },

  /* sidebar */
  side: { background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: "20px 20px 24px", position: "sticky", top: 90, boxShadow: "0 6px 20px rgba(42,35,32,.05)" },
  sideHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, paddingBottom: 12, borderBottom: `1px solid ${LINE}` },
  sideTitle: { fontFamily: FONT, fontSize: 19, fontWeight: 700, margin: 0, letterSpacing: -0.2 },
  clear: { border: "none", background: "transparent", color: MUTE, fontFamily: "inherit", fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: 0 },
  groupLabel: { color: FAINT, fontSize: 11.5, fontWeight: 700, letterSpacing: 1.6, margin: "18px 0 10px" },
  groupDivider: { height: 1, background: LINE, margin: "18px 0 0" },
  check: { display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontSize: 14, fontWeight: 500, color: MUTE, cursor: "pointer" },
  checkbox: { width: 16, height: 16, cursor: "pointer" },

  /* search */
  searchRow: { position: "relative", display: "flex", gap: 12, marginBottom: 20 },
  searchIcon: { position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: FAINT, pointerEvents: "none" },
  searchInput: {
    flex: 1,
    minWidth: 0,
    boxSizing: "border-box",
    padding: "13px 16px 13px 44px",
    border: `1px solid ${LINE}`,
    borderRadius: 12,
    fontSize: 14.5,
    fontFamily: "inherit",
    background: CARD,
    color: INK,
    outline: "none",
  },
  searchBtn: { padding: "0 22px", borderRadius: 12, fontSize: 14.5 },

  /* list + rows */
  list: { display: "flex", flexDirection: "column", gap: 14 },
  row: {
    display: "flex",
    gap: 24,
    background: CARD,
    border: `1px solid ${LINE}`,
    borderRadius: 14,
    padding: "20px 22px",
    boxShadow: "0 6px 18px rgba(42,35,32,.04)",
  },
  rowMain: { display: "flex", gap: 16, flex: 1, minWidth: 0 },

  thumb: {
    width: 76,
    height: 76,
    flexShrink: 0,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    display: "grid",
    placeItems: "center",
    background: `linear-gradient(135deg, ${TERRA}22, ${GOLD}22)`,
    border: `1px solid ${LINE}`,
  },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  thumbInitial: { fontFamily: FONT, fontSize: 28, fontWeight: 700, color: TERRA },

  svc: { fontFamily: FONT, fontSize: 18, fontWeight: 700, letterSpacing: -0.2, margin: "0 0 8px", lineHeight: 1.2, color: INK },
  metaRow: { display: "flex", flexWrap: "wrap", gap: "6px 16px" },
  metaItem: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: MUTE, fontWeight: 500 },
  metaStrong: { color: INK, fontWeight: 700, marginLeft: 2 },
  note: { margin: "12px 0 0", fontSize: 13.5, color: "#5f574e", lineHeight: 1.5, fontStyle: "italic", wordBreak: "break-word" },
  addr: { display: "flex", alignItems: "flex-start", gap: 6, margin: "10px 0 0", fontSize: 13, color: MUTE, lineHeight: 1.5 },
  file: { display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 13, fontWeight: 700, color: GOLD, textDecoration: "none" },

  rowStatus: { flex: "0 0 300px", borderLeft: `1px solid ${LINE}`, paddingLeft: 22 },
  statusLabel: { display: "flex", alignItems: "center", gap: 9, fontSize: 15, fontWeight: 700 },
  statusDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  statusDesc: { margin: "8px 0 0", fontSize: 13.5, color: MUTE, lineHeight: 1.55 },
  statusDate: { display: "inline-flex", alignItems: "center", gap: 6, margin: "12px 0 0", fontSize: 12.5, color: FAINT, fontWeight: 500 },
  detailsBtn: { display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, padding: "8px 15px", borderRadius: 10, border: `1px solid ${LINE}`, background: "transparent", color: INK, fontFamily: "inherit", fontWeight: 700, fontSize: 13, cursor: "pointer" },

  /* skeleton + states */
  skel: { height: 128, borderRadius: 14, border: `1px solid ${LINE}` },
  state: { textAlign: "center", maxWidth: 440, margin: "clamp(28px,5vw,56px) auto", display: "flex", flexDirection: "column", alignItems: "center" },
  stateIcon: { width: 64, height: 64, borderRadius: 18, display: "grid", placeItems: "center", marginBottom: 18 },
  stateTitle: { fontFamily: FONT, fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: -0.3 },
  stateText: { color: MUTE, fontSize: 15, lineHeight: 1.6, margin: "0 0 22px" },
  ghost: { padding: "11px 22px", borderRadius: 12, border: `1px solid ${LINE}`, background: "transparent", color: INK, fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer" },
};