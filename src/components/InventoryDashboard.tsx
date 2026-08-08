import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import api from "../api";

/* ══════════════════════════════════════════════════════════════
   INVENTORY OVERVIEW

   Quiet, data-forward dashboard matched to the admin shell. The
   period filter (granularity + calendar range) lives in the parent
   toolbar (Inventory.tsx) and is passed in as props; this component
   just consumes gran/from/to.

   The filter drives the FLOW section — Purchased / Consumed / Wastage
   KPIs, the trend line, and net investment. The on-hand panels (Stock
   value, Value by category, Top items, Needs restocking) are always
   live/current.

   Preset ranges (set in the parent): Daily = today · Weekly = last 7
   days · Monthly = last 1 month · Yearly = last 1 year — all ending
   today. The trend chart buckets FINER than the range so the line
   isn't a single dot: Weekly/Monthly are drawn by day, Yearly by
   month (see bucketGran). Daily is a single day, so it's one point.

   Data: GET /inventory/dashboard?granularity=&from=&to=
   ══════════════════════════════════════════════════════════════ */

/* ── tokens (aligned to the admin shell) ── */
const CARD = "#ffffff";
const INK = "#1f2430";
const BODY = "#545a67";
const MUTE = "#8a8f9a";
const FAINT = "#b6bac3";
const LINE = "#ececf1";
const LINE2 = "#f4f5f7";
const BGSOFT = "#fafbfc";

const ACCENT = "#d9542f"; // terra — the single accent
const HERO_TINT = "#fdf9f5";
const POS = "#17a35b"; // stock in / gain
const NEG = "#dd4b3e"; // out / loss
const NEG_SOFT = "#fdecea";
const GOLD = "#c68a2e";

const SANS = "'DM Sans', system-ui, sans-serif";

const RAMP = [ACCENT, "#c68a2e", "#5b7fb0", "#4a9a6a", "#a86b8c", "#7d8592", "#d0a24a", "#6f7cae"];

const MOVE_META: Record<string, { label: string; color: string }> = {
  opening: { label: "Opening", color: MUTE },
  purchase: { label: "Purchase", color: POS },
  consumption: { label: "Consumption", color: ACCENT },
  wastage: { label: "Wastage", color: NEG },
  returned: { label: "Return", color: GOLD },
  adjustment: { label: "Adjustment", color: "#7d8592" },
};

type Gran = "day" | "week" | "month" | "year";

type Dash = {
  range?: { from: string; to: string; granularity: Gran };
  kpis: {
    totalItems: number; stockValue: number; lowCount: number; outCount: number;
    purchaseValue: number; consumptionValue: number; wastageValue: number; movementCount: number;
  };
  trend: { key: string; label: string; purchase: number; consumption: number; wastage: number }[];
  categories: { name: string; value: number; count: number }[];
  topByValue: { id: string; name: string; sku: string; unit: string; quantity: number; value: number }[];
  lowItems: { id: string; name: string; sku: string; unit: string; quantity: number; reorderLevel: number; out: boolean }[];
  recent: {
    id: string; type: string; quantity: number; delta: number; balance: number;
    unitCost: number | null; reference: string; createdAt: string;
    item: { name: string; sku: string; unit: string } | null;
    supplier: { name: string } | null;
    user: { name: string } | null;
    booking: { serviceName: string } | null;
  }[];
};

/* ── icons ── */
const Ico = ({ d, size = 17, sw = 1.9 }: { d: string; size?: number; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const I = {
  rupee: "M6 3h12M6 8h12M9 3c3 0 5 2 5 5s-2 5-5 5H6l7 8",
  /* arrow down into a tray = stock in */
  stockIn: "M12 3v10M8 9l4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  /* arrow up out of a tray = stock out */
  stockOut: "M12 21V11M8 15l4-4 4 4M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2",
  trash: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6",
};

/* ── formatters (all coerce, so a stray string never crashes a tab) ── */
const inr = (v: unknown) => "₹" + Math.round(Number(v) || 0).toLocaleString("en-IN");
const inrShort = (v: unknown) => {
  const x = Number(v) || 0;
  if (x >= 1e7) return "₹" + (x / 1e7).toFixed(1).replace(/\.0$/, "") + "Cr";
  if (x >= 1e5) return "₹" + (x / 1e5).toFixed(1).replace(/\.0$/, "") + "L";
  if (x >= 1e3) return "₹" + (x / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
  return "₹" + Math.round(x);
};
const qtyFmt = (v: unknown) => {
  const x = Number(v);
  if (!Number.isFinite(x)) return "0";
  return Number.isInteger(x) ? String(x) : String(parseFloat(x.toFixed(3)));
};
const dateTimeFmt = (str: string) =>
  new Date(str).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const prettyRange = (from: string, to: string) => {
  if (!from || !to) return "";
  const f = new Date(from), t = new Date(to);
  const sameYear = f.getFullYear() === t.getFullYear();
  const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const fl = f.toLocaleDateString("en-IN", sameYear ? opt : { ...opt, year: "numeric" });
  const tl = t.toLocaleDateString("en-IN", { ...opt, year: "numeric" });
  return `${fl} – ${tl}`;
};

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
/* parse a YYYY-MM-DD string into a LOCAL date (avoids the UTC shift that
   `new Date("2026-08-01")` introduces, which would break the equality checks) */
const parseYmd = (str: string) => {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
/* when a "Jump to" range is exactly one calendar year or one calendar month,
   name it ("2026" / "August 2026") instead of showing a raw date span */
const periodTitle = (from: string, to: string): string | null => {
  if (!from || !to) return null;
  const f = parseYmd(from), t = parseYmd(to);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime();

  // whole year: 1 Jan → 31 Dec (or → today, for the current year)
  if (f.getMonth() === 0 && f.getDate() === 1) {
    const yearEnd = new Date(f.getFullYear(), 11, 31);
    const curYearToToday = f.getFullYear() === today.getFullYear() && sameDay(t, today);
    if (sameDay(t, yearEnd) || curYearToToday) return String(f.getFullYear());
  }
  // whole month: 1st → last day (or → today, for the current month)
  if (f.getDate() === 1) {
    const monthEnd = new Date(f.getFullYear(), f.getMonth() + 1, 0);
    const sameMonth = f.getFullYear() === t.getFullYear() && f.getMonth() === t.getMonth();
    const curMonthToToday =
      f.getFullYear() === today.getFullYear() && f.getMonth() === today.getMonth() && sameDay(t, today);
    if ((sameMonth && sameDay(t, monthEnd)) || curMonthToToday)
      return `${MONTHS_FULL[f.getMonth()]} ${f.getFullYear()}`;
  }
  return null;
};

/* ── default range helpers — used when the parent passes no filter,
   so this component always renders standalone instead of hanging.
   Mirrors the parent's presets: today / last 7 days / last 1 month /
   last 1 year, all ending today. ── */
const pad2 = (x: number) => String(x).padStart(2, "0");
const ymd = (dt: Date) => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
const rangeFor = (g: Gran): { from: string; to: string } => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // today
  let f: Date;
  if (g === "day") f = end;                                                                   // today only
  else if (g === "week") f = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6);  // last 7 days
  else if (g === "year") f = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());  // last 1 year
  else f = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());                    // last 1 month
  return { from: ymd(f), to: ymd(end) };
};

/* the range each preset covers — surfaced in the caption */
const PRESET_WORD: Record<Gran, string> = {
  day: "today",
  week: "last 7 days",
  month: "last month",
  year: "last year",
};
const GRAN_WORD: Record<Gran, string> = { day: "Daily", week: "Weekly", month: "Monthly", year: "Yearly" };

/* The trend line buckets FINER than the preset range, so a short range
   isn't reduced to a single point. Jump-to (custom) mode already arrives
   with the right granularity from the parent (month for a whole year, day
   for a single month), so it's passed through untouched. */
const bucketFor = (gran: Gran, custom: boolean): Gran =>
  custom ? gran : gran === "year" ? "month" : "day";

type DashProps = { gran?: Gran; from?: string; to?: string; custom?: boolean };

export default function InventoryDashboard(props: DashProps = {}) {
  /* fall back to a sensible window if the parent doesn't supply one */
  const gran: Gran = props.gran || "month";
  const custom = !!props.custom;
  const fallback = useMemo(() => rangeFor(gran), [gran]);
  const from = props.from || fallback.from;
  const to = props.to || fallback.to;
  /* granularity actually sent to the API for the trend buckets */
  const bucketGran = bucketFor(gran, custom);
  /* a named period ("August 2026" / "2026") when Jump-to lands on a whole
     month or year; otherwise null → show the raw range */
  const periodName = custom ? periodTitle(from, to) : null;

  const [d, setD] = useState<Dash | null>(null);
  const [firstLoad, setFirstLoad] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ granularity: bucketGran, from, to });
      const { data } = await api.get(`/api/inventory/dashboard?${params.toString()}`);
      setD(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Couldn't load the dashboard.");
    } finally {
      setBusy(false);
      setFirstLoad(false);
    }
  }, [bucketGran, from, to]);

  /* debounce so dragging the calendar doesn't spam the API */
  useEffect(() => {
    if (!from || !to) return;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load, from, to]);

  if (firstLoad && !d) {
    return error ? <div style={s.errorBox}>{error}</div> : <DashSkeleton />;
  }
  if (!d) return <div style={s.errorBox}>{error || "Couldn't load the dashboard."}</div>;

  const k = d.kpis;
  const netFlow = k.purchaseValue - k.consumptionValue - k.wastageValue;

  return (
    <div style={s.wrap}>
      <style>{CSS}</style>

      <div className="ivd-caption">
        {custom ? (
          periodName ? (
            <><b>{periodName}</b> · {prettyRange(from, to)}.</>
          ) : (
            <><b>Selected range</b> · {prettyRange(from, to)}.</>
          )
        ) : (
          <><b>{GRAN_WORD[gran]}</b> · {PRESET_WORD[gran]} ({prettyRange(from, to)}).</>
        )}
        {" "}Flow figures follow this period; on-hand values are live.
        {busy && <span className="ivd-updating"> · Updating…</span>}
      </div>

      {error && <div style={{ ...s.errorBox, marginBottom: 16 }}>{error}</div>}

      {/* everything below dims while a new range is loading */}
      <div className={busy ? "ivd-dim" : ""}>
        {/* ── KPI row ── */}
        <div className="ivd-kpis">
          <Kpi label="Stock value" value={inr(k.stockValue)} sub={`${k.totalItems} active item${k.totalItems === 1 ? "" : "s"}`} accent={INK} icon={I.rupee} primary />
          <Kpi label="Purchased" value={inr(k.purchaseValue)} sub="Into stock" accent={POS} icon={I.stockIn} />
          <Kpi label="Consumed" value={inr(k.consumptionValue)} sub="Used on jobs" accent={ACCENT} icon={I.stockOut} />
          <Kpi label="Wastage" value={inr(k.wastageValue)} sub="Written off" accent={NEG} icon={I.trash} />
        </div>

        {/* ── alert strip ── */}
        {(k.lowCount > 0 || k.outCount > 0) && (
          <div style={s.alertStrip}>
            <span style={s.alertIco}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" />
              </svg>
            </span>
            <span>
              {k.outCount > 0 && <b style={{ color: "#8a2f1a" }}>{k.outCount} out of stock</b>}
              {k.outCount > 0 && k.lowCount > 0 && <span style={{ color: "#c9b79a" }}> · </span>}
              {k.lowCount > 0 && <span>{k.lowCount} running low</span>}
              {" — restock soon to avoid job delays."}
            </span>
          </div>
        )}

        {/* ── charts row ── */}
        <div className="ivd-grid-2">
          <Panel title="Stock flow" subtitle="Purchases, consumption and wastage over the selected period">
            <TrendChart data={d.trend} />
            <div style={s.legend}>
              <LegendDot color={POS} label="Purchased" />
              <LegendDot color={ACCENT} label="Consumed" />
              <LegendDot color={NEG} label="Wastage" />
            </div>
            <div style={s.netRow}>
              <span style={s.netLabel}>Net stock investment</span>
              <span style={{ ...s.netVal, color: netFlow >= 0 ? POS : NEG }}>
                {netFlow >= 0 ? "+" : "−"}{inr(Math.abs(netFlow))}
              </span>
            </div>
          </Panel>

          <Panel title="Value by category" subtitle="Where your stock money sits (current)">
            {d.categories.length === 0 ? (
              <EmptyMini text="No categorised stock yet." />
            ) : (
              <CategoryDonut data={d.categories} total={k.stockValue} />
            )}
          </Panel>
        </div>

        {/* ── top items + low stock ── */}
        <div className="ivd-grid-2">
          <Panel title="Top items by value" subtitle="Your most valuable stock on hand (current)">
            {d.topByValue.length === 0 ? (
              <EmptyMini text="No items yet." />
            ) : (
              <BarList data={d.topByValue} />
            )}
          </Panel>

          <Panel title="Needs restocking" subtitle="At or below reorder level (current)">
            {d.lowItems.length === 0 ? (
              <EmptyMini text="Everything is above its reorder level." />
            ) : (
              <div style={s.lowList}>
                {d.lowItems.slice(0, 7).map((it) => (
                  <div key={it.id} style={s.lowRow}>
                    <div style={{ minWidth: 0 }}>
                      <div style={s.lowName}>{it.name}</div>
                      <div style={s.lowSku}>{it.sku}</div>
                    </div>
                    <div style={s.lowRight}>
                      <span style={{ ...s.lowBadge, ...(it.out ? s.lowBadgeOut : s.lowBadgeLow) }}>
                        {it.out ? "Out of stock" : `${qtyFmt(it.quantity)} ${it.unit} left`}
                      </span>
                      <span style={s.lowReorder}>reorder at {qtyFmt(it.reorderLevel)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* ── recent activity ── */}
        <Panel title="Recent activity" subtitle="The latest stock movements across all items" full>
          {d.recent.length === 0 ? (
            <EmptyMini text="No stock movements recorded yet." />
          ) : (
            <div className="ivd-table-scroll">
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>When</th>
                    <th style={s.th}>Item</th>
                    <th style={s.th}>Type</th>
                    <th style={{ ...s.th, textAlign: "right" }}>Change</th>
                    <th style={{ ...s.th, textAlign: "right" }}>Balance</th>
                    <th style={s.th}>By / Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recent.map((m) => {
                    const meta = MOVE_META[m.type] || MOVE_META.adjustment;
                    const up = Number(m.delta) >= 0;
                    return (
                      <tr key={m.id} className="ivd-row">
                        <td style={{ ...s.td, color: BODY }}>{dateTimeFmt(m.createdAt)}</td>
                        <td style={s.td}>
                          <div style={s.recItem}>{m.item?.name || "—"}</div>
                          <div style={s.recSku}>{m.item?.sku || ""}</div>
                        </td>
                        <td style={s.td}>
                          <span style={s.typeCell}>
                            <span style={{ ...s.typeDot, background: meta.color }} />
                            <span style={s.typeLabel}>{meta.label}</span>
                          </span>
                        </td>
                        <td style={{ ...s.tdNum, color: up ? POS : NEG }}>
                          {up ? "+" : "−"}{qtyFmt(Math.abs(Number(m.delta)))} {m.item?.unit || ""}
                        </td>
                        <td style={{ ...s.tdNum, color: INK }}>{qtyFmt(m.balance)}</td>
                        <td style={s.td}>
                          <span style={s.recBy}>{m.user?.name || "—"}</span>
                          {(m.supplier?.name || m.reference || m.booking) && (
                            <span style={s.recRef}>
                              {m.supplier?.name ? ` · ${m.supplier.name}` : ""}
                              {m.reference ? ` · #${m.reference}` : ""}
                              {m.booking ? ` · ${m.booking.serviceName}` : ""}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ─────────────────────────── KPI card ─────────────────────────── */
function Kpi({
  label, value, sub, accent, icon, primary,
}: {
  label: string; value: string; sub: string; accent: string; icon: string; primary?: boolean;
}) {
  return (
    <motion.div
      className={`ivd-kpi${primary ? " primary" : ""}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="ivd-kpi-top">
        <span className="ivd-kpi-label">{label}</span>
        <span className="ivd-kpi-ico" style={{ color: accent, background: `${accent}14` }}>
          <Ico d={icon} size={17} />
        </span>
      </div>
      <div className="ivd-kpi-value" style={{ fontSize: primary ? 32 : 25, color: accent }}>{value}</div>
      <div className="ivd-kpi-sub">{sub}</div>
    </motion.div>
  );
}

/* ─────────────────────────── panel shell ─────────────────────────── */
function Panel({
  title, subtitle, children, full,
}: {
  title: string; subtitle?: string; children: React.ReactNode; full?: boolean;
}) {
  return (
    <motion.section
      style={s.panel}
      className={`ivd-panel${full ? " ivd-panel-full" : ""}`}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div style={s.panelHead}>
        <h3 style={s.panelTitle}>{title}</h3>
        {subtitle && <p style={s.panelSub}>{subtitle}</p>}
      </div>
      {children}
    </motion.section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={s.legendItem}>
      <span style={{ ...s.legendDot, background: color }} />
      {label}
    </span>
  );
}

function EmptyMini({ text }: { text: string }) {
  return <div style={s.emptyMini}>{text}</div>;
}

/* ═══════════════════ multi-line trend (SVG) ═══════════════════ */
function TrendChart({ data }: { data: Dash["trend"] }) {
  const W = 520;
  const H = 196;
  const padL = 40;
  const padB = 28;
  const padT = 12;
  const innerW = W - padL - 12;
  const innerH = H - padB - padT;
  const n = data.length;

  const max = Math.max(1, ...data.flatMap((m) => [m.purchase, m.consumption, m.wastage]));
  const xAt = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW);
  const yAt = (v: number) => padT + innerH - (v / max) * innerH;

  const series: { key: keyof Dash["trend"][number]; color: string }[] = [
    { key: "purchase", color: POS },
    { key: "consumption", color: ACCENT },
    { key: "wastage", color: NEG },
  ];

  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i);
  const shortTick = (tv: number) =>
    tv >= 1e5 ? (tv / 1e5).toFixed(1).replace(/\.0$/, "") + "L"
    : tv >= 1e3 ? Math.round(tv / 1000) + "k"
    : String(Math.round(tv));

  const labelStep = Math.max(1, Math.ceil(n / 8)); // ~8 labels max
  const showDots = n <= 24;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {tickVals.map((tv, i) => {
        const y = yAt(tv);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - 12} y2={y} stroke={i === 0 ? LINE : LINE2} strokeWidth={1} />
            <text x={padL - 8} y={y + 3} textAnchor="end" fontSize={9.5} fill={FAINT} fontFamily={SANS}>
              {shortTick(tv)}
            </text>
          </g>
        );
      })}

      {data.map((m, i) =>
        i % labelStep === 0 || i === n - 1 ? (
          <text key={m.key} x={xAt(i)} y={H - 9} textAnchor="middle" fontSize={10.5} fill={MUTE} fontFamily={SANS} fontWeight={600}>
            {m.label}
          </text>
        ) : null
      )}

      {series.map((se) => {
        const pts = data.map((m, i) => `${xAt(i)},${yAt(m[se.key] as number)}`).join(" ");
        return (
          <g key={se.key as string}>
            {n > 1 && (
              <polyline points={pts} fill="none" stroke={se.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            )}
            {showDots &&
              data.map((m, i) => (
                <circle key={i} cx={xAt(i)} cy={yAt(m[se.key] as number)} r={n === 1 ? 4 : 2.6} fill={se.color}>
                  <title>{`${m.label} · ${MOVE_META[se.key as string].label}: ${inr(m[se.key] as number)}`}</title>
                </circle>
              ))}
          </g>
        );
      })}
    </svg>
  );
}

/* ═══════════════════ category donut (SVG) ═══════════════════ */
function CategoryDonut({ data, total }: { data: Dash["categories"]; total: number }) {
  const size = 150;
  const r = 57;
  const stroke = 16;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const sum = data.reduce((a, b) => a + b.value, 0) || 1;
  const gap = data.length > 1 ? 3 : 0;

  let offset = 0;
  const arcs = data.map((c, i) => {
    const frac = c.value / sum;
    const len = Math.max(0, frac * circ - gap);
    const arc = { color: RAMP[i % RAMP.length], len, offset, name: c.name, value: c.value, pct: Math.round(frac * 100) };
    offset += frac * circ;
    return arc;
  });

  return (
    <div style={s.donutWrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={LINE2} strokeWidth={stroke} />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r} fill="none"
            stroke={a.color} strokeWidth={stroke}
            strokeDasharray={`${a.len} ${circ - a.len}`}
            strokeDashoffset={-a.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          >
            <title>{`${a.name}: ${inr(a.value)} (${a.pct}%)`}</title>
          </circle>
        ))}
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize={9} fill={MUTE} fontFamily={SANS} fontWeight={700} letterSpacing={1}>
          TOTAL
        </text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize={16} fontWeight={800} fill={INK} fontFamily={SANS}>
          {inrShort(total)}
        </text>
      </svg>
      <div style={s.donutLegend}>
        {arcs.map((a, i) => (
          <div key={i} style={s.donutLegendRow}>
            <span style={{ ...s.legendDot, background: a.color }} />
            <span style={s.donutLegendName}>{a.name}</span>
            <span style={s.donutLegendVal}>{inrShort(a.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════ horizontal bar list ═══════════════════ */
function BarList({ data }: { data: Dash["topByValue"] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={s.barList}>
      {data.map((it, i) => (
        <div key={it.id} style={s.barRow}>
          <div style={s.barLabel}>
            <span style={s.barName}>{it.name}</span>
            <span style={s.barVal}>{inr(it.value)}</span>
          </div>
          <div style={s.barTrack}>
            <motion.div
              style={{ ...s.barFill, background: ACCENT }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(it.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </div>
          <span style={s.barMeta}>{qtyFmt(it.quantity)} {it.unit}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── skeleton ─────────────────────────── */
function DashSkeleton() {
  return (
    <div style={s.wrap}>
      <style>{CSS}</style>
      <div className="ivd-skel" style={{ height: 18, borderRadius: 0, maxWidth: 360, marginBottom: 18 }} />
      <div className="ivd-kpis">
        {[...Array(4)].map((_, i) => <div key={i} className="ivd-skel" style={{ height: 104, borderRadius: 0 }} />)}
      </div>
      <div className="ivd-grid-2" style={{ marginTop: 16 }}>
        <div className="ivd-skel" style={{ height: 300, borderRadius: 0 }} />
        <div className="ivd-skel" style={{ height: 300, borderRadius: 0 }} />
      </div>
    </div>
  );
}

/* ─────────────────────────── styles ─────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  wrap: { fontFamily: SANS, color: INK, minWidth: 0, maxWidth: "100%" },

  errorBox: { background: NEG_SOFT, border: `1px solid #f3cfc2`, color: "#8a2f16", padding: "14px 18px", borderRadius: 0, fontSize: 14 },

  /* alert */
  alertStrip: {
    display: "flex", alignItems: "center", gap: 11, marginTop: 16, padding: "12px 16px",
    background: "#fbf3e3", border: "1px solid #efdcb2", borderRadius: 0, color: "#8a6a1c", fontSize: 13, lineHeight: 1.5,
  },
  alertIco: { color: GOLD, flexShrink: 0, display: "inline-flex" },

  /* panel */
  panel: { padding: "22px 24px" }, /* surface + glow live in .ivd-panel so the gradient can layer */
  panelHead: { marginBottom: 18 },
  panelTitle: { fontSize: 16, fontWeight: 800, margin: 0, color: INK, letterSpacing: -0.2 },
  panelSub: { fontSize: 12.5, color: MUTE, margin: "4px 0 0" },

  legend: { display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap" },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: BODY, fontWeight: 600 },
  legendDot: { width: 9, height: 9, borderRadius: 0, flexShrink: 0 },

  netRow: { marginTop: 14, paddingTop: 14, borderTop: `1px solid ${LINE2}`, display: "flex", justifyContent: "space-between", alignItems: "center" },
  netLabel: { fontSize: 12.5, color: MUTE, fontWeight: 600 },
  netVal: { fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums" },

  /* donut */
  donutWrap: { display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" },
  donutLegend: { flex: "1 1 140px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 },
  donutLegendRow: { display: "flex", alignItems: "center", gap: 9 },
  donutLegendName: { flex: 1, fontSize: 13, color: INK, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  donutLegendVal: { fontSize: 13, color: BODY, fontWeight: 700, fontVariantNumeric: "tabular-nums" },

  /* bar list */
  barList: { display: "flex", flexDirection: "column", gap: 16 },
  barRow: { display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 10px", alignItems: "center" },
  barLabel: { gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 },
  barName: { fontSize: 13.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  barVal: { fontSize: 13, fontWeight: 800, color: INK, flexShrink: 0, fontVariantNumeric: "tabular-nums" },
  barTrack: { height: 7, borderRadius: 0, background: LINE2, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 0 },
  barMeta: { fontSize: 11.5, color: MUTE, fontWeight: 600, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" },

  /* low list */
  lowList: { display: "flex", flexDirection: "column" },
  lowRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${LINE2}` },
  lowName: { fontSize: 13.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  lowSku: { fontSize: 11.5, color: MUTE, marginTop: 2 },
  lowRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 },
  lowBadge: { padding: "3px 10px", borderRadius: 0, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" },
  lowBadgeLow: { background: "#fbf3e3", color: "#a06f1e" },
  lowBadgeOut: { background: NEG_SOFT, color: NEG },
  lowReorder: { fontSize: 11, color: MUTE, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" },

  /* recent table */
  table: { width: "100%", borderCollapse: "collapse", minWidth: 720 },
  th: { textAlign: "left", padding: "11px 16px", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase", color: MUTE, borderBottom: `1px solid ${LINE}`, whiteSpace: "nowrap", background: BGSOFT },
  td: { padding: "12px 16px", fontSize: 13, color: INK, borderBottom: `1px solid ${LINE2}`, whiteSpace: "nowrap", verticalAlign: "middle" },
  tdNum: { padding: "12px 16px", fontSize: 13, fontWeight: 700, textAlign: "right", borderBottom: `1px solid ${LINE2}`, whiteSpace: "nowrap", verticalAlign: "middle", fontVariantNumeric: "tabular-nums" },
  recItem: { fontWeight: 600, color: INK },
  recSku: { fontSize: 11.5, color: MUTE, marginTop: 2 },
  typeCell: { display: "inline-flex", alignItems: "center", gap: 8 },
  typeDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  typeLabel: { fontSize: 13, fontWeight: 600, color: BODY },
  recBy: { fontWeight: 600, color: INK },
  recRef: { color: MUTE, fontSize: 12.5 },

  emptyMini: { padding: "34px 0", textAlign: "center", color: MUTE, fontSize: 13.5 },
};

const CSS = `
  .ivd-caption { font-size: 12.5px; color: ${MUTE}; margin: 0 2px 18px; }
  .ivd-caption b { color: ${BODY}; font-weight: 700; }
  .ivd-updating { color: ${ACCENT}; font-weight: 600; }

  .ivd-dim { opacity: .5; transition: opacity .2s ease; pointer-events: none; }

  .ivd-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
  .ivd-kpis > * { min-width: 0; }
  @media (max-width: 1040px) { .ivd-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 460px) { .ivd-kpis { grid-template-columns: 1fr; } }

  /* every card shares the same warm surface: ivory base + a soft orange
     glow bleeding in from the top-left. Radius stays clean because nothing
     is absolutely positioned against the edges any more. */
  .ivd-kpi, .ivd-panel {
    position: relative;
    background:
      radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.075) 0%, rgba(217,84,47,.022) 42%, rgba(217,84,47,0) 72%),
      linear-gradient(180deg, #fffcf9 0%, ${CARD} 60%);
    border: 1px solid #f0e6dc;
    border-radius: 0;
    box-shadow: 0 1px 2px rgba(17,20,30,.04), 0 10px 26px -18px rgba(217,84,47,.28);
    overflow: hidden;
  }

  .ivd-kpi { padding: 20px 22px 18px; }
  .ivd-panel { min-width: 0; max-width: 100%; }
  .ivd-kpi.primary {
    background:
      radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.14) 0%, rgba(217,84,47,.05) 45%, rgba(217,84,47,0) 78%),
      linear-gradient(180deg, #fff8f3 0%, #fffdfb 65%);
    border-color: #ecdacd;
  }
  .ivd-kpi-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .ivd-kpi-label { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: ${MUTE}; padding-top: 3px; }
  .ivd-kpi-ico { width: 32px; height: 32px; display: grid; place-items: center; flex-shrink: 0; }
  .ivd-kpi-value { font-weight: 800; letter-spacing: -0.6px; line-height: 1.05; margin: 10px 0 5px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
  .ivd-kpi-sub { font-size: 12px; color: ${MUTE}; font-weight: 500; }

  .ivd-grid-2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; margin-top: 16px; }
  .ivd-grid-2 > * { min-width: 0; }
  @media (max-width: 1100px) { .ivd-grid-2 { grid-template-columns: minmax(0, 1fr); } }

  /* a standalone full-width panel sits outside .ivd-grid-2, so it needs the
     same top spacing itself — otherwise it butts against the row above */
  .ivd-panel-full { margin-top: 16px; }

  .ivd-row:hover td { background: ${BGSOFT}; }
  /* the wide table scrolls INSIDE its panel — min-width:0 on the panel stops
     it from stretching the grid and forcing the whole page sideways */
  .ivd-table-scroll { overflow-x: auto; max-width: 100%; }

  .ivd-skel {
    background: linear-gradient(90deg, #eef0f3 25%, #f6f7f9 37%, #eef0f3 63%);
    background-size: 400% 100%; animation: ivdShimmer 1.4s ease infinite; border: 1px solid ${LINE};
  }
  @keyframes ivdShimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

  @media (prefers-reduced-motion: reduce) {
    .ivd-kpi, .ivd-skel, .ivd-dim { animation: none !important; transition: none !important; }
  }
`;
