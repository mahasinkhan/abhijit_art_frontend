import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";
import InventoryDashboard from "./InventoryDashboard";

/* ══════════════════════════════════════════════════════════════
   ABHIJIT ART — Inventory Management (admin)

   Backend: /api/inventory  (all admin-only)
     GET    /items?q=&category=&low=1        list + computed `low`
     GET    /items/:id                        item + movement ledger
     POST   /items                            create (opening stock → movement)
     PATCH  /items/:id                        edit details (never qty)
     DELETE /items/:id
     POST   /items/:id/move                   the ONLY qty-changing call
     GET    /summary                          totals + valuation
     GET    /dashboard?granularity=&from=&to= overview data (period-filtered)
     GET    /categories
     GET    /movements?limit=
     GET/POST/PATCH/DELETE /suppliers

   Every WRITE (add/edit/delete item, move stock, supplier changes) requires
   the security PIN — sent in the request body and verified server-side — and
   is written to the Activity audit log. Reads stay open.

   Mounts inside AdminDashboard as the "Inventory" tab. Self-contained:
   its own fetch, its own drawers, its own scoped `inv-` CSS. The period
   filter lives in the top toolbar here and is passed to the dashboard.

   PERF: the initial paint should fire as FEW Neon queries as possible.
   The default Overview tab is drawn by <InventoryDashboard/> with its own
   single fetch, so nothing here runs until the user opens Stock Items or
   Suppliers. Each tab loads once, then its data lives in this component's
   (always-mounted) state, so switching back is instant with no refetch.
   ══════════════════════════════════════════════════════════════ */

/* ── tokens (shared site palette) ── */
const IVORY = "#f7f3ea";
const CARD = "#ffffff";
const INK = "#2a231d";
const SLATE = "#6f6357";
const LINE = "#e7ddcd";
const TERRA = "#d9542f";
const TERRA_DK = "#b23f1e";
const GOLD = "#c2974a";
const GREEN = "#3f7d4e";
const RED = "#c0433a";
const AMBER = "#c98a2e";

const SERIF = "'Fraunces', 'Playfair Display', serif";
const SANS = "'DM Sans', system-ui, sans-serif";

const UNITS = ["piece", "sqft", "metre", "roll", "sheet", "litre", "kg", "box", "set"];

/* movement types → label + colour + sign hint */
const MOVE_META: Record<string, { label: string; color: string; sign: "+" | "-" | "±" }> = {
  opening: { label: "Opening", color: SLATE, sign: "+" },
  purchase: { label: "Purchase (Stock In)", color: GREEN, sign: "+" },
  consumption: { label: "Consumption (Stock Out)", color: TERRA, sign: "-" },
  wastage: { label: "Wastage", color: RED, sign: "-" },
  returned: { label: "Return (Stock In)", color: GOLD, sign: "+" },
  adjustment: { label: "Adjustment", color: AMBER, sign: "±" },
};

type Item = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  quantity: string | number;
  reorderLevel: string | number;
  costPrice: string | number;
  sellPrice: string | number | null;
  location: string;
  imageUrl: string;
  active: boolean;
  supplierId: string | null;
  supplier?: { name: string } | null;
  createdAt?: string;
  updatedAt?: string;
  low?: boolean;
};

type Movement = {
  id: string;
  type: string;
  quantity: string | number;
  delta: string | number;
  balance: string | number;
  unitCost: string | number | null;
  reference: string;
  note: string;
  createdAt: string;
  supplier?: { name: string } | null;
  user?: { name: string } | null;
  booking?: { id: string; serviceName: string } | null;
};

type Supplier = {
  id: string;
  name: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  notes: string;
  active: boolean;
  _count?: { items: number };
};

type Summary = { totalItems: number; lowCount: number; outCount: number; stockValue: number };

/* number helpers — API returns Decimals as strings */
const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
/* trim trailing zeros: 34.500 → 34.5, 10.000 → 10 */
const qtyFmt = (v: unknown) => {
  const x = n(v);
  return Number.isInteger(x) ? String(x) : String(parseFloat(x.toFixed(3)));
};
const inr = (v: unknown) =>
  "₹" + n(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const dateFmt = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = (s: string) =>
  new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/* ══════════════════ period filter (drives the Overview tab) ══════════════════ */
type Gran = "day" | "week" | "month" | "year";
/* which filter zone is currently driving the numbers */
type Mode = "preset" | "period";

const GRAN_TABS: { id: Gran; label: string }[] = [
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
  { id: "year", label: "Yearly" },
];
const PRESET_HINT: Record<Gran, string> = {
  day: "today",
  week: "last 7 days",
  month: "last month",
  year: "last year",
};
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad2 = (x: number) => String(x).padStart(2, "0");
const ymd = (dt: Date) => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
/* window per preset: today / last 7 days / last 1 month / last 1 year — all ending today */
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
/* clamp a date so we never ask the dashboard for data past today */
const clampToday = (dt: Date): Date => {
  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return dt > today ? today : dt;
};
/* one whole calendar year → Jan 1 … Dec 31 (clamped to today) */
const rangeForYear = (year: number): { from: string; to: string } => ({
  from: ymd(new Date(year, 0, 1)),
  to: ymd(clampToday(new Date(year, 11, 31))),
});
/* one calendar month → 1st … last day of that month (clamped to today) */
const rangeForMonth = (year: number, month: number): { from: string; to: string } => ({
  from: ymd(new Date(year, month, 1)),
  to: ymd(clampToday(new Date(year, month + 1, 0))),
});
function FilterBar({
  mode, gran, pYear, pMonth, years,
  onGran, onPeriod,
}: {
  mode: Mode; gran: Gran;
  pYear: number; pMonth: number | "all"; years: number[];
  onGran: (g: Gran) => void;
  onPeriod: (year: number, month: number | "all") => void;
}) {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();

  return (
    <div className="invfb">
      {/* ── rolling presets ── each sets its own window ending today
          (14 days / 12 weeks / 6 months / 5 years). ── */}
      <div className={`invfb-seg ${mode === "preset" ? "on" : ""}`} role="tablist" aria-label="Rolling period">
        {GRAN_TABS.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={mode === "preset" && gran === g.id}
            className={mode === "preset" && gran === g.id ? "on" : ""}
            title={`${g.label} — ${PRESET_HINT[g.id]}`}
            onClick={() => onGran(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <span className="invfb-div" aria-hidden="true" />

      {/* ── jump to a specific year (year-wise) or a month inside it
          (month-wise). Year is the anchor; leave the month on "Whole year"
          for a full-year view. ── */}
      <div className={`invfb-jump ${mode === "period" ? "on" : ""}`}>
        <span className="invfb-jlabel">Jump to</span>
        <select
          className="invfb-sel"
          aria-label="Year"
          value={String(pYear)}
          onChange={(e) => onPeriod(Number(e.target.value), pMonth)}
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          className="invfb-sel"
          aria-label="Month"
          value={pMonth === "all" ? "all" : String(pMonth)}
          onChange={(e) => onPeriod(pYear, e.target.value === "all" ? "all" : Number(e.target.value))}
        >
          <option value="all">Whole year</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i} disabled={pYear === thisYear && i > thisMonth}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ── icons ── */
const Ico = ({ d, size = 18, sw = 1.8 }: { d: string; size?: number; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const I = {
  box: "M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7 12 12l8.7-5M12 22V12",
  alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  empty: "M5 8h14l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 8zM3 8h18M9 8V6a3 3 0 0 1 6 0v2",
  rupee: "M6 3h12M6 8h12M9 3c3 0 5 2 5 5s-2 5-5 5H6l7 8",
  plus: "M12 5v14M5 12h14",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  trash: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6",
  x: "M18 6 6 18M6 6l12 12",
  arrow: "M5 12h14M13 6l6 6-6 6",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  history: "M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8M12 7v5l4 2",
  truck: "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12h2M22 18h-2M15 18H9M22 18v-4l-3-4h-5v8M6.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  chevron: "M9 18l6-6-6-6",
};

type Tab = "overview" | "items" | "suppliers";

export default function Inventory() {
  const [tab, setTab] = useState<Tab>("overview");

  /* period filter — owned here so it can sit in the top toolbar,
     passed down to the dashboard */
  const [gran, setGran] = useState<Gran>("month");
  const [from, setFrom] = useState(() => rangeFor("month").from);
  const [to, setTo] = useState(() => rangeFor("month").to);
  /* which filter zone is driving: rolling preset or a specific month/year */
  const [mode, setMode] = useState<Mode>("preset");
  /* specific month / year picker state (used when mode === "period") */
  const [pYear, setPYear] = useState<number>(() => new Date().getFullYear());
  const [pMonth, setPMonth] = useState<number | "all">("all");
  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => y - i); // this year … 5 years back
  }, []);

  /* rolling preset (Daily/Weekly/Monthly/Yearly) */
  const pickGran = (g: Gran) => {
    const r = rangeFor(g);
    setGran(g); setFrom(r.from); setTo(r.to); setMode("preset");
  };
  /* jump to a whole year (month = "all", monthly buckets) or one month
     inside it (daily buckets). Both reuse GET /dashboard via from/to. */
  const applyPeriod = (year: number, month: number | "all") => {
    let m = month;
    const now = new Date();
    // never let a future month through (e.g. after switching back to this year)
    if (m !== "all" && year === now.getFullYear() && m > now.getMonth()) m = "all";
    setPYear(year); setPMonth(m);
    if (m === "all") {
      const r = rangeForYear(year);
      setGran("month"); setFrom(r.from); setTo(r.to);
    } else {
      const r = rangeForMonth(year, m);
      setGran("day"); setFrom(r.from); setTo(r.to);
    }
    setMode("period");
  };

  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  /* drawers */
  const [editItem, setEditItem] = useState<Item | "new" | null>(null);
  const [moveItem, setMoveItem] = useState<Item | null>(null);
  const [historyItem, setHistoryItem] = useState<Item | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | "new" | null>(null);

  const [toast, setToast] = useState("");

  const flash = (m: string) => setToast(m);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── data ── */
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (cat) params.set("category", cat);
      if (lowOnly) params.set("low", "1");
      const [it, sm] = await Promise.all([
        api.get(`/api/inventory/items?${params.toString()}`),
        api.get("/api/inventory/summary"),
      ]);
      setItems(it.data);
      setSummary(sm.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Couldn't load inventory.");
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }, [q, cat, lowOnly]);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await api.get("/api/inventory/categories");
      setCategories(data);
    } catch {
      /* non-fatal */
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const { data } = await api.get("/api/inventory/suppliers");
      setSuppliers(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Couldn't load suppliers.");
    }
  }, []);

  /* Lazy-load per tab — the initial hit should fire as few Neon queries as
     possible. The default Overview tab is drawn by <InventoryDashboard/> with
     its own single fetch, so on first paint nothing here runs. Each tab loads
     once; its data then lives in this (always-mounted) component's state, so
     switching back is instant with no refetch. */
  const itemsInit = useRef(false);
  const suppInit = useRef(false);

  useEffect(() => {
    if (tab === "items" && !itemsInit.current) {
      itemsInit.current = true;
      loadItems();
      loadCategories();
      loadSuppliers(); // the item / move drawers need the supplier list
    }
    if (tab === "suppliers" && !suppInit.current) {
      suppInit.current = true;
      loadSuppliers();
    }
  }, [tab, loadItems, loadCategories, loadSuppliers]);

  /* re-run the item search when a filter changes (debounced) — only while the
     Stock Items tab is open and after its first load */
  useEffect(() => {
    if (tab !== "items" || !itemsInit.current) return;
    const t = setTimeout(loadItems, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cat, lowOnly]);

  // after a write: refresh the visible list immediately, and quietly
  // re-pull the lookup lists in the background (they rarely change and
  // shouldn't hold up the UI). loadItems already fetches the summary.
  const refreshAll = () => {
    loadItems();
    loadCategories();
  };

  /* ── CSV export (client-side, current filtered list) ── */
  const exportCsv = () => {
    const head = ["SKU", "Name", "Category", "Unit", "Quantity", "Reorder", "Cost", "Value", "Location", "Supplier", "Updated", "Status"];
    const rows = items.map((it) => [
      it.sku,
      it.name,
      it.category,
      it.unit,
      qtyFmt(it.quantity),
      qtyFmt(it.reorderLevel),
      n(it.costPrice),
      Math.round(n(it.quantity) * n(it.costPrice)),
      it.location,
      it.supplier?.name || "",
      it.updatedAt ? dateTimeFmt(it.updatedAt) : "",
      n(it.quantity) <= 0 ? "Out of stock" : it.low ? "Low" : "In stock",
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stat = summary;

  return (
    <div style={s.wrap}>
      <style>{CSS}</style>

      {/* top toolbar — per-tab filters on the left, view switcher on the right */}
      <div style={s.topRow}>
        {tab === "overview" ? (
          <FilterBar
            mode={mode} gran={gran}
            pYear={pYear} pMonth={pMonth} years={years}
            onGran={pickGran} onPeriod={applyPeriod}
          />
        ) : tab === "items" ? (
          <div className="inv-topfilters">
            <div style={s.searchBox}>
              <span style={s.searchIco}><Ico d={I.search} size={17} /></span>
              <input
                style={s.searchInput}
                placeholder="Search name, SKU or category…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select style={s.select} value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button className={`inv-chip ${lowOnly ? "on" : ""}`} onClick={() => setLowOnly((v) => !v)}>
              Low stock only
            </button>
            {(q || cat || lowOnly) && (
              <button
                className="inv-clear"
                onClick={() => { setQ(""); setCat(""); setLowOnly(false); }}
                title="Clear filters"
              >
                Clear
              </button>
            )}
          </div>
        ) : (
          <span />
        )}
        <div style={s.tabs}>
          <button className={`inv-tab ${tab === "overview" ? "on" : ""}`} onClick={() => setTab("overview")}>Overview</button>
          <button className={`inv-tab ${tab === "items" ? "on" : ""}`} onClick={() => setTab("items")}>Stock Items</button>
          <button className={`inv-tab ${tab === "suppliers" ? "on" : ""}`} onClick={() => setTab("suppliers")}>Suppliers</button>
        </div>
      </div>

      {tab === "overview" ? (
        <InventoryDashboard gran={gran} from={from} to={to} custom={mode === "period"} />
      ) : tab === "items" ? (
        <>
          {/* stat cards */}
          <div className="inv-stats">
            <StatCard icon={I.box} color={INK} label="Total items" value={stat ? String(stat.totalItems) : "—"} sub="Active in catalogue" />
            <StatCard icon={I.rupee} color={GOLD} label="Stock value" value={stat ? inr(stat.stockValue) : "—"} sub="At cost price" />
            <StatCard
              icon={I.alert}
              color={AMBER}
              label="Low stock"
              value={stat ? String(stat.lowCount) : "—"}
              sub={stat && stat.lowCount > 0 ? "Tap to filter" : "At or below reorder"}
              onClick={() => stat && stat.lowCount > 0 && setLowOnly(true)}
            />
            <StatCard icon={I.empty} color={RED} label="Out of stock" value={stat ? String(stat.outCount) : "—"} sub="Needs restocking" />
          </div>

          {/* actions — the filters themselves now live in the top toolbar */}
          <div style={{ ...s.toolbar, justifyContent: "flex-end" }}>
            <button className="inv-ghost" onClick={exportCsv} disabled={!items.length}>
              <Ico d={I.download} size={16} /> Export CSV
            </button>
            <button className="inv-solid" onClick={() => setEditItem("new")}>
              <Ico d={I.plus} size={16} /> Add Item
            </button>
          </div>

          {/* table */}
          {loading && !loadedOnce ? (
            <TableSkeleton />
          ) : error ? (
            <div style={s.errorBox}>{error}</div>
          ) : items.length === 0 ? (
            <EmptyState onAdd={() => setEditItem("new")} filtered={!!(q || cat || lowOnly)} />
          ) : (
            <div style={s.tableCard} className={loading ? "inv-refreshing" : ""}>
              <div className="inv-table-scroll">
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Item</th>
                      <th style={s.th}>Category</th>
                      <th style={{ ...s.th, textAlign: "right" }}>In Stock</th>
                      <th style={{ ...s.th, textAlign: "right" }}>Cost / Unit</th>
                      <th style={{ ...s.th, textAlign: "right" }}>Value</th>
                      <th style={s.th}>Supplier</th>
                      <th style={s.th}>Updated</th>
                      <th style={{ ...s.th, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const out = n(it.quantity) <= 0;
                      return (
                        <tr key={it.id} className="inv-row">
                          <td style={s.td}>
                            <div style={s.itemCell}>
                              <span style={s.itemName}>{it.name}</span>
                              <span style={s.itemSku}>{it.sku}{it.location ? ` · ${it.location}` : ""}</span>
                            </div>
                          </td>
                          <td style={s.td}>
                            {it.category ? <span style={s.catChip}>{it.category}</span> : <span style={s.dash}>—</span>}
                          </td>
                          <td style={{ ...s.td, textAlign: "right" }}>
                            <span style={s.qtyVal}>{qtyFmt(it.quantity)}</span>
                            <span style={s.qtyUnit}> {it.unit}</span>
                            <div>
                              {out ? (
                                <span style={{ ...s.badge, ...s.badgeRed }}>Out of stock</span>
                              ) : it.low ? (
                                <span style={{ ...s.badge, ...s.badgeAmber }}>Low · reorder {qtyFmt(it.reorderLevel)}</span>
                              ) : (
                                <span style={{ ...s.badge, ...s.badgeGreen }}>In stock</span>
                              )}
                            </div>
                          </td>
                          <td style={{ ...s.td, textAlign: "right" }}>{inr(it.costPrice)}</td>
                          <td style={{ ...s.td, textAlign: "right", fontWeight: 700 }}>
                            {inr(n(it.quantity) * n(it.costPrice))}
                          </td>
                          <td style={s.td}>
                            {it.supplier?.name || <span style={s.dash}>—</span>}
                          </td>
                          <td style={{ ...s.td, whiteSpace: "nowrap", color: SLATE, fontSize: 12.5 }}>
                            {it.updatedAt ? dateTimeFmt(it.updatedAt) : <span style={s.dash}>—</span>}
                          </td>
                          <td style={{ ...s.td, textAlign: "right" }}>
                            <div style={s.actions}>
                              <button className="inv-move" onClick={() => setMoveItem(it)} title="Stock in / out">
                                <Ico d={I.truck} size={15} /> Move
                              </button>
                              <button className="inv-iconbtn" onClick={() => setHistoryItem(it)} title="History">
                                <Ico d={I.history} size={16} />
                              </button>
                              <button className="inv-iconbtn" onClick={() => setEditItem(it)} title="Edit">
                                <Ico d={I.edit} size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <SuppliersTab
          suppliers={suppliers}
          onAdd={() => setEditSupplier("new")}
          onEdit={(sp) => setEditSupplier(sp)}
        />
      )}

      {/* ── drawers ── */}
      <AnimatePresence>
        {editItem && (
          <ItemDrawer
            key="item-drawer"
            item={editItem === "new" ? null : editItem}
            suppliers={suppliers}
            categories={categories}
            onClose={() => setEditItem(null)}
            onSaved={(msg) => { setEditItem(null); flash(msg); refreshAll(); }}
            onDeleted={(msg) => { setEditItem(null); flash(msg); refreshAll(); }}
          />
        )}
        {moveItem && (
          <MoveDrawer
            key="move-drawer"
            item={moveItem}
            suppliers={suppliers}
            onClose={() => setMoveItem(null)}
            onSaved={(msg) => { setMoveItem(null); flash(msg); refreshAll(); }}
          />
        )}
        {historyItem && (
          <HistoryDrawer
            key="history-drawer"
            item={historyItem}
            onClose={() => setHistoryItem(null)}
          />
        )}
        {editSupplier && (
          <SupplierDrawer
            key="supplier-drawer"
            supplier={editSupplier === "new" ? null : editSupplier}
            onClose={() => setEditSupplier(null)}
            onSaved={(msg) => { setEditSupplier(null); flash(msg); loadSuppliers(); }}
            onDeleted={(msg) => { setEditSupplier(null); flash(msg); loadSuppliers(); }}
          />
        )}
      </AnimatePresence>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            style={s.toast}
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
          >
            <span style={s.toastTick}>✓</span>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────── stat card ─────────────────────────── */
/* Same shape as the Overview KPI cards: label top-left, icon tile top-right,
   figure, then a sub-line. Every card is styled identically — no card gets a
   special border, so the row reads as one set. */
function StatCard({
  icon, color, label, value, sub, onClick,
}: {
  icon: string; color: string; label: string; value: string; sub: string; onClick?: () => void;
}) {
  return (
    <div
      className={`inv-stat ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="inv-stat-top">
        <span className="inv-stat-label">{label}</span>
        <span className="inv-stat-ico" style={{ color, background: `${color}14` }}>
          <Ico d={icon} size={17} />
        </span>
      </div>
      <div className="inv-stat-value" style={{ color }}>{value}</div>
      <div className="inv-stat-sub">{sub}</div>
    </div>
  );
}

/* ─────────────────────────── skeleton / empty ─────────────────────────── */
function TableSkeleton() {
  return (
    <div style={s.tableCard}>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={s.skelRow}>
          <div className="inv-skel" style={{ width: "26%", height: 16 }} />
          <div className="inv-skel" style={{ width: "14%", height: 16 }} />
          <div className="inv-skel" style={{ width: "12%", height: 16 }} />
          <div className="inv-skel" style={{ width: "18%", height: 16 }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd, filtered }: { onAdd: () => void; filtered: boolean }) {
  return (
    <div style={s.emptyCard}>
      <span style={s.emptyIco}><Ico d={I.box} size={30} /></span>
      <h3 style={s.emptyTitle}>{filtered ? "No items match your filters" : "No stock items yet"}</h3>
      <p style={s.emptyText}>
        {filtered
          ? "Try clearing the search or category filter."
          : "Add your first item — flex rolls, ink, laminate, mugs — to start tracking stock."}
      </p>
      {!filtered && (
        <button className="inv-solid" onClick={onAdd} style={{ marginTop: 16 }}>
          <Ico d={I.plus} size={16} /> Add Item
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════ ITEM DRAWER (add / edit) ═══════════════════════════ */
function ItemDrawer({
  item, suppliers, categories, onClose, onSaved, onDeleted,
}: {
  item: Item | null;
  suppliers: Supplier[];
  categories: string[];
  onClose: () => void;
  onSaved: (m: string) => void;
  onDeleted: (m: string) => void;
}) {
  const editing = !!item;
  const [f, setF] = useState({
    sku: item?.sku || "",
    name: item?.name || "",
    category: item?.category || "",
    unit: item?.unit || "piece",
    openingQty: "",
    reorderLevel: item ? qtyFmt(item.reorderLevel) : "",
    costPrice: item ? String(n(item.costPrice)) : "",
    sellPrice: item?.sellPrice != null ? String(n(item.sellPrice)) : "",
    location: item?.location || "",
    description: item?.description || "",
    supplierId: item?.supplierId || "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [pin, setPin] = useState("");

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      if (editing) {
        await api.patch(`/api/inventory/items/${item!.id}`, {
          sku: f.sku, name: f.name, category: f.category, unit: f.unit,
          reorderLevel: f.reorderLevel, costPrice: f.costPrice,
          sellPrice: f.sellPrice === "" ? null : f.sellPrice,
          location: f.location, description: f.description,
          supplierId: f.supplierId || null, pin,
        });
        onSaved("Item updated.");
      } else {
        await api.post("/api/inventory/items", {
          sku: f.sku, name: f.name, category: f.category, unit: f.unit,
          openingQty: f.openingQty, reorderLevel: f.reorderLevel,
          costPrice: f.costPrice, sellPrice: f.sellPrice === "" ? null : f.sellPrice,
          location: f.location, description: f.description,
          supplierId: f.supplierId || null, pin,
        });
        onSaved("Item added.");
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Couldn't save the item.");
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    setBusy(true);
    setErr("");
    try {
      await api.delete(`/api/inventory/items/${item!.id}`, { data: { pin } });
      onDeleted("Item deleted.");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Couldn't delete the item.");
      setBusy(false);
    }
  };

  return (
    <Drawer title={editing ? "Edit Item" : "Add Item"} onClose={onClose}>
      <div style={s.formGrid}>
        <Field label="SKU / Code" full>
          <input className="inv-input" value={f.sku} onChange={(e) => set("sku", e.target.value)} placeholder="FLX-3X50-WHT" />
        </Field>
        <Field label="Item name" full>
          <input className="inv-input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="White Flex Roll 3ft" />
        </Field>

        <Field label="Category">
          <input className="inv-input" list="inv-cat-list" value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="Flex / Ink / …" />
          <datalist id="inv-cat-list">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Unit">
          <select className="inv-input" value={f.unit} onChange={(e) => set("unit", e.target.value)}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>

        {!editing && (
          <Field label="Opening stock">
            <input className="inv-input" type="number" min="0" step="any" value={f.openingQty}
              onChange={(e) => set("openingQty", e.target.value)} placeholder="0" />
          </Field>
        )}
        <Field label="Reorder level" hint="Alert when stock falls to this">
          <input className="inv-input" type="number" min="0" step="any" value={f.reorderLevel}
            onChange={(e) => set("reorderLevel", e.target.value)} placeholder="0" />
        </Field>

        <Field label="Cost / unit (₹)">
          <input className="inv-input" type="number" min="0" step="any" value={f.costPrice}
            onChange={(e) => set("costPrice", e.target.value)} placeholder="0" />
        </Field>
        <Field label="Sell / unit (₹)" hint="Optional">
          <input className="inv-input" type="number" min="0" step="any" value={f.sellPrice}
            onChange={(e) => set("sellPrice", e.target.value)} placeholder="—" />
        </Field>

        <Field label="Storage location">
          <input className="inv-input" value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Rack B / Shelf 2" />
        </Field>
        <Field label="Supplier">
          <select className="inv-input" value={f.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
            <option value="">— none —</option>
            {suppliers.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
          </select>
        </Field>

        <Field label="Notes" full>
          <textarea className="inv-input" rows={2} value={f.description}
            onChange={(e) => set("description", e.target.value)} placeholder="Anything worth remembering about this item" />
        </Field>
      </div>

      {editing && (
        <p style={s.hintLine}>
          To change the quantity, close this and use <b>Move</b> — that keeps the stock history accurate.
        </p>
      )}

      <PinField value={pin} onChange={setPin} />

      {err && <div style={s.formErr}>{err}</div>}

      <div style={s.drawerFoot}>
        {editing ? (
          confirmDel ? (
            <div style={s.confirmRow}>
              <span style={s.confirmText}>Delete this item and its history?</span>
              <button className="inv-ghost sm" onClick={() => setConfirmDel(false)}>No</button>
              <button className="inv-danger sm" onClick={del} disabled={busy || !pin.trim()}>Yes, delete</button>
            </div>
          ) : (
            <button className="inv-danger-ghost" onClick={() => setConfirmDel(true)}>
              <Ico d={I.trash} size={15} /> Delete
            </button>
          )
        ) : <span />}

        {!confirmDel && (
          <div style={s.footBtns}>
            <button className="inv-ghost" onClick={onClose}>Cancel</button>
            <button className="inv-solid" onClick={save} disabled={busy || !f.sku.trim() || !f.name.trim() || !pin.trim()}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add item"}
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* ═══════════════════════════ MOVE DRAWER (stock in / out) ═══════════════════════════ */
function MoveDrawer({
  item, suppliers, onClose, onSaved,
}: {
  item: Item;
  suppliers: Supplier[];
  onClose: () => void;
  onSaved: (m: string) => void;
}) {
  const [type, setType] = useState<string>("purchase");
  const [qty, setQty] = useState("");
  const [newQty, setNewQty] = useState(qtyFmt(item.quantity)); // adjustment target
  const [unitCost, setUnitCost] = useState(String(n(item.costPrice)));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [supplierId, setSupplierId] = useState(item.supplierId || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pin, setPin] = useState("");

  const cur = n(item.quantity);
  const meta = MOVE_META[type];

  /* live projected balance */
  const projected = useMemo(() => {
    if (type === "adjustment") {
      const t = Number(newQty);
      return Number.isFinite(t) ? t : cur;
    }
    const qn = Number(qty);
    if (!Number.isFinite(qn) || qn <= 0) return cur;
    const adds = type === "purchase" || type === "returned" || type === "opening";
    return adds ? cur + qn : cur - qn;
  }, [type, qty, newQty, cur]);

  const willGoNegative = projected < 0;

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      const body: any = { type, reference, note, supplierId: supplierId || null, pin };
      if (type === "adjustment") {
        body.newQuantity = newQty;
      } else {
        body.quantity = qty;
        if (type === "purchase") body.unitCost = unitCost;
      }
      await api.post(`/api/inventory/items/${item.id}/move`, body);
      onSaved(`Stock updated — ${item.name} now ${qtyFmt(projected)} ${item.unit}.`);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Couldn't record the movement.");
      setBusy(false);
    }
  };

  const isAdjust = type === "adjustment";
  const valid = isAdjust
    ? Number.isFinite(Number(newQty)) && Number(newQty) !== cur && Number(newQty) >= 0
    : Number.isFinite(Number(qty)) && Number(qty) > 0 && !willGoNegative;

  return (
    <Drawer title="Move Stock" onClose={onClose}>
      <div style={s.moveItemHead}>
        <div>
          <div style={s.moveItemName}>{item.name}</div>
          <div style={s.moveItemSku}>{item.sku}</div>
        </div>
        <div style={s.moveCur}>
          <span style={s.moveCurVal}>{qtyFmt(item.quantity)}</span>
          <span style={s.moveCurUnit}>{item.unit} in stock</span>
        </div>
      </div>

      {/* movement type picker */}
      <div style={s.typeGrid}>
        {Object.entries(MOVE_META)
          .filter(([k]) => k !== "opening")
          .map(([k, m]) => (
            <button
              key={k}
              className={`inv-type ${type === k ? "on" : ""}`}
              style={type === k ? { borderColor: m.color, color: m.color, background: `${m.color}12` } : undefined}
              onClick={() => setType(k)}
            >
              <span style={{ ...s.typeSign, background: m.color }}>{m.sign}</span>
              {m.label}
            </button>
          ))}
      </div>

      <div style={s.formGrid}>
        {isAdjust ? (
          <Field label={`Set actual quantity (${item.unit})`} full hint="Use this after a physical stock count">
            <input className="inv-input" type="number" min="0" step="any" value={newQty}
              onChange={(e) => setNewQty(e.target.value)} />
          </Field>
        ) : (
          <Field label={`Quantity (${item.unit})`} full>
            <input className="inv-input" type="number" min="0" step="any" value={qty}
              onChange={(e) => setQty(e.target.value)} placeholder="0" autoFocus />
          </Field>
        )}

        {type === "purchase" && (
          <>
            <Field label="Cost / unit (₹)" hint="Updates the item's cost">
              <input className="inv-input" type="number" min="0" step="any" value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)} />
            </Field>
            <Field label="Supplier">
              <select className="inv-input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">— none —</option>
                {suppliers.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
              </select>
            </Field>
            <Field label="Bill / challan no." full>
              <input className="inv-input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
            </Field>
          </>
        )}

        <Field label="Note" full>
          <input className="inv-input" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={isAdjust ? "Reason for the correction" : "Optional"} />
        </Field>
      </div>

      {/* projected balance */}
      <div style={{ ...s.projBox, borderColor: willGoNegative ? RED : LINE }}>
        <span style={s.projLabel}>Balance after this</span>
        <span style={{ ...s.projVal, color: willGoNegative ? RED : INK }}>
          {qtyFmt(projected)} <small style={s.projUnit}>{item.unit}</small>
        </span>
      </div>
      {willGoNegative && <div style={s.formErr}>Not enough stock for this movement.</div>}

      <PinField value={pin} onChange={setPin} hint="required to move stock" />

      {err && <div style={s.formErr}>{err}</div>}

      <div style={s.drawerFoot}>
        <span />
        <div style={s.footBtns}>
          <button className="inv-ghost" onClick={onClose}>Cancel</button>
          <button
            className="inv-solid"
            style={{ background: meta.color, boxShadow: `0 10px 24px ${meta.color}40` }}
            onClick={submit}
            disabled={busy || !valid || !pin.trim()}
          >
            {busy ? "Saving…" : "Record movement"}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

/* ═══════════════════════════ HISTORY DRAWER ═══════════════════════════ */
function HistoryDrawer({ item, onClose }: { item: Item; onClose: () => void }) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/api/inventory/items/${item.id}`);
        setMovements(data.movements || []);
      } catch (e: any) {
        setErr(e?.response?.data?.message || "Couldn't load history.");
      } finally {
        setLoading(false);
      }
    })();
  }, [item.id]);

  return (
    <Drawer title="Stock History" onClose={onClose} wide>
      <div style={s.moveItemHead}>
        <div>
          <div style={s.moveItemName}>{item.name}</div>
          <div style={s.moveItemSku}>{item.sku}</div>
        </div>
        <div style={s.moveCur}>
          <span style={s.moveCurVal}>{qtyFmt(item.quantity)}</span>
          <span style={s.moveCurUnit}>{item.unit} now</span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "30px 0" }}><TableSkeleton /></div>
      ) : err ? (
        <div style={s.formErr}>{err}</div>
      ) : movements.length === 0 ? (
        <p style={s.emptyText}>No movements recorded yet.</p>
      ) : (
        <div style={s.historyList}>
          {movements.map((m) => {
            const meta = MOVE_META[m.type] || MOVE_META.adjustment;
            const up = n(m.delta) >= 0;
            return (
              <div key={m.id} style={s.histRow}>
                <span style={{ ...s.histDot, background: meta.color }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.histTop}>
                    <span style={{ ...s.histType, color: meta.color }}>{meta.label}</span>
                    <span style={{ ...s.histDelta, color: up ? GREEN : RED }}>
                      {up ? "+" : "−"}{qtyFmt(Math.abs(n(m.delta)))} {item.unit}
                    </span>
                  </div>
                  <div style={s.histMeta}>
                    {dateTimeFmt(m.createdAt)}
                    {m.user?.name ? ` · ${m.user.name}` : ""}
                    {m.supplier?.name ? ` · ${m.supplier.name}` : ""}
                    {m.reference ? ` · #${m.reference}` : ""}
                    {m.booking ? ` · order ${m.booking.serviceName}` : ""}
                  </div>
                  {m.note && <div style={s.histNote}>{m.note}</div>}
                </div>
                <div style={s.histBal}>
                  <span style={s.histBalVal}>{qtyFmt(m.balance)}</span>
                  <span style={s.histBalLabel}>balance</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

/* ═══════════════════════════ SUPPLIERS ═══════════════════════════ */
function SuppliersTab({
  suppliers, onAdd, onEdit,
}: {
  suppliers: Supplier[];
  onAdd: () => void;
  onEdit: (s: Supplier) => void;
}) {
  return (
    <>
      <div style={{ ...s.toolbar, justifyContent: "flex-end" }}>
        <button className="inv-solid" onClick={onAdd}><Ico d={I.plus} size={16} /> Add Supplier</button>
      </div>
      {suppliers.length === 0 ? (
        <div style={s.emptyCard}>
          <span style={s.emptyIco}><Ico d={I.truck} size={30} /></span>
          <h3 style={s.emptyTitle}>No suppliers yet</h3>
          <p style={s.emptyText}>Add the vendors you buy stock from so purchases can be linked to them.</p>
          <button className="inv-solid" onClick={onAdd} style={{ marginTop: 16 }}>
            <Ico d={I.plus} size={16} /> Add Supplier
          </button>
        </div>
      ) : (
        <div className="inv-sup-grid">
          {suppliers.map((sp) => (
            <div key={sp.id} className="inv-sup-card" onClick={() => onEdit(sp)}>
              <div style={s.supTop}>
                <span style={s.supAvatar}>{sp.name.trim()[0]?.toUpperCase() || "S"}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={s.supName}>{sp.name}</div>
                  <div style={s.supMeta}>{sp._count?.items ?? 0} item{(sp._count?.items ?? 0) === 1 ? "" : "s"}</div>
                </div>
                <span className="inv-sup-chev"><Ico d={I.chevron} size={16} /></span>
              </div>
              {(sp.phone || sp.email) && (
                <div style={s.supContact}>
                  {sp.phone && <span>{sp.phone}</span>}
                  {sp.email && <span style={s.supEmail}>{sp.email}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function SupplierDrawer({
  supplier, onClose, onSaved, onDeleted,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: (m: string) => void;
  onDeleted: (m: string) => void;
}) {
  const editing = !!supplier;
  const [f, setF] = useState({
    name: supplier?.name || "",
    phone: supplier?.phone || "",
    email: supplier?.email || "",
    gstin: supplier?.gstin || "",
    address: supplier?.address || "",
    notes: supplier?.notes || "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [pin, setPin] = useState("");
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      if (editing) await api.patch(`/api/inventory/suppliers/${supplier!.id}`, { ...f, pin });
      else await api.post("/api/inventory/suppliers", { ...f, pin });
      onSaved(editing ? "Supplier updated." : "Supplier added.");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Couldn't save the supplier.");
      setBusy(false);
    }
  };
  const del = async () => {
    setBusy(true);
    setErr("");
    try {
      await api.delete(`/api/inventory/suppliers/${supplier!.id}`, { data: { pin } });
      onDeleted("Supplier deleted.");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Couldn't delete the supplier.");
      setBusy(false);
    }
  };

  return (
    <Drawer title={editing ? "Edit Supplier" : "Add Supplier"} onClose={onClose}>
      <div style={s.formGrid}>
        <Field label="Supplier name" full>
          <input className="inv-input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Sky Vinyls" />
        </Field>
        <Field label="Phone">
          <input className="inv-input" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9876543210" />
        </Field>
        <Field label="Email">
          <input className="inv-input" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="sales@…" />
        </Field>
        <Field label="GSTIN">
          <input className="inv-input" value={f.gstin} onChange={(e) => set("gstin", e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Address">
          <input className="inv-input" value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Notes" full>
          <textarea className="inv-input" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Payment terms, contact person, etc." />
        </Field>
      </div>

      <PinField value={pin} onChange={setPin} />

      {err && <div style={s.formErr}>{err}</div>}

      <div style={s.drawerFoot}>
        {editing ? (
          confirmDel ? (
            <div style={s.confirmRow}>
              <span style={s.confirmText}>Delete this supplier?</span>
              <button className="inv-ghost sm" onClick={() => setConfirmDel(false)}>No</button>
              <button className="inv-danger sm" onClick={del} disabled={busy || !pin.trim()}>Yes</button>
            </div>
          ) : (
            <button className="inv-danger-ghost" onClick={() => setConfirmDel(true)}>
              <Ico d={I.trash} size={15} /> Delete
            </button>
          )
        ) : <span />}
        {!confirmDel && (
          <div style={s.footBtns}>
            <button className="inv-ghost" onClick={onClose}>Cancel</button>
            <button className="inv-solid" onClick={save} disabled={busy || !f.name.trim() || !pin.trim()}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add supplier"}
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* ═══════════════════════════ shared drawer shell ═══════════════════════════ */
function Drawer({
  title, children, onClose, wide,
}: {
  title: string; children: React.ReactNode; onClose: () => void; wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <motion.div
      style={s.backdrop}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        style={{ ...s.drawer, maxWidth: wide ? 640 : 520 }}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        <div style={s.drawerHead}>
          <h3 style={s.drawerTitle}>{title}</h3>
          <button className="inv-iconbtn" onClick={onClose} aria-label="Close"><Ico d={I.x} size={18} /></button>
        </div>
        <div style={s.drawerBody}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

function Field({
  label, children, full, hint,
}: {
  label: string; children: React.ReactNode; full?: boolean; hint?: string;
}) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "auto" }}>
      <label style={s.fieldLabel}>
        {label}
        {hint && <span style={s.fieldHint}> · {hint}</span>}
      </label>
      {children}
    </div>
  );
}

/* PIN field for the security-gated drawers. Opts out of browser / password-
   manager autofill so Brave/Chrome don't offer to "save password". */
function PinField({ value, onChange, hint = "required to save" }: { value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${LINE}` }}>
      <label style={s.fieldLabel}>
        <span style={{ display: "inline-flex", verticalAlign: "-2px", marginRight: 5, color: SLATE }}>
          <Ico d="M5 11h14v10H5z M7 11V7a5 5 0 0 1 10 0v4" size={13} />
        </span>
        Security PIN <span style={s.fieldHint}>· {hint}</span>
      </label>
      <input
        className="inv-input" type="password" value={value}
        name="aa-inv-pin" autoComplete="one-time-code" inputMode="numeric"
        data-1p-ignore data-lpignore="true" data-form-type="other"
        onChange={(e) => onChange(e.target.value)} placeholder="••••••"
        style={{ letterSpacing: 3, fontWeight: 700 }}
      />
    </div>
  );
}

/* ─────────────────────────── styles ─────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  wrap: { fontFamily: SANS, color: INK, minWidth: 0, maxWidth: "100%" },

  /* top toolbar: filters left, view switcher right */
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 20 },
  h2: { fontFamily: SERIF, fontSize: 28, fontWeight: 700, margin: 0, color: INK, letterSpacing: -0.5 },
  sub: { margin: "5px 0 0", color: SLATE, fontSize: 14 },
  tabs: { display: "inline-flex", gap: 4, background: "#f0e8da", padding: 4, borderRadius: 0, border: `1px solid ${LINE}` },

  toolbar: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "22px 0 18px" },
  searchBox: { position: "relative", flex: "1 1 260px", minWidth: 200 },
  searchIco: { position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: SLATE },
  searchInput: {
    width: "100%", boxSizing: "border-box", padding: "11px 14px 11px 40px", borderRadius: 0,
    border: `1px solid ${LINE}`, background: CARD, fontSize: 14, fontFamily: "inherit", color: INK, outline: "none",
  },
  select: {
    padding: "11px 14px", borderRadius: 0, border: `1px solid ${LINE}`, background: CARD,
    fontSize: 14, fontFamily: "inherit", color: INK, cursor: "pointer", outline: "none",
  },

  tableCard: { background: CARD, border: `1px solid ${LINE}`, borderRadius: 0, overflow: "hidden", boxShadow: "0 6px 20px rgba(42,35,29,.05)", minWidth: 0, maxWidth: "100%" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 940 },
  th: { textAlign: "left", padding: "14px 18px", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: SLATE, borderBottom: `1px solid ${LINE}`, whiteSpace: "nowrap", background: "#fdfbf6" },
  td: { padding: "14px 18px", fontSize: 14, color: INK, borderBottom: `1px solid #f2ebdd`, verticalAlign: "middle" },

  itemCell: { display: "flex", flexDirection: "column", gap: 3 },
  itemName: { fontWeight: 700, color: INK },
  itemSku: { fontSize: 12, color: SLATE, letterSpacing: 0.3 },
  catChip: { display: "inline-block", padding: "3px 10px", borderRadius: 0, background: "#f3ece0", color: "#8a7a63", fontSize: 12, fontWeight: 600 },
  dash: { color: "#c3b8a6" },

  qtyVal: { fontWeight: 700, fontSize: 15 },
  qtyUnit: { color: SLATE, fontSize: 12.5 },
  badge: { display: "inline-block", marginTop: 5, padding: "2px 9px", borderRadius: 0, fontSize: 11, fontWeight: 700 },
  badgeGreen: { background: "#e9f3ec", color: GREEN },
  badgeAmber: { background: "#fbf0dc", color: "#a06f1e" },
  badgeRed: { background: "#fbe9e7", color: RED },

  actions: { display: "inline-flex", gap: 6, alignItems: "center", justifyContent: "flex-end" },

  errorBox: { background: "#fbe9e7", border: "1px solid #f3cfc2", color: "#8a2f16", padding: "14px 18px", borderRadius: 0, fontSize: 14 },

  skelRow: { display: "flex", gap: 24, padding: "16px 18px", borderBottom: `1px solid #f2ebdd`, alignItems: "center" },

  emptyCard: { background: CARD, border: `1px dashed ${LINE}`, borderRadius: 0, padding: "56px 24px", textAlign: "center" },
  emptyIco: { display: "inline-grid", placeItems: "center", width: 66, height: 66, borderRadius: "50%", background: "#f3ece0", color: GOLD, marginBottom: 16 },
  emptyTitle: { fontFamily: SERIF, fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: INK },
  emptyText: { color: SLATE, fontSize: 14, lineHeight: 1.65, margin: 0, maxWidth: 380, marginLeft: "auto", marginRight: "auto" },

  /* backdrop + drawer */
  backdrop: { position: "fixed", inset: 0, background: "rgba(36,29,23,.5)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box" },
  drawer: { width: "100%", maxHeight: "calc(100vh - 40px)", background: IVORY, borderRadius: 0, border: `1px solid ${LINE}`, boxShadow: "0 30px 80px rgba(36,29,23,.34)", display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden" },
  drawerHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1px solid ${LINE}`, background: CARD, flexShrink: 0, borderRadius: 0 },
  drawerTitle: { fontFamily: SERIF, fontSize: 21, fontWeight: 700, margin: 0, color: INK },
  drawerBody: { padding: 24, overflowY: "auto", flex: 1 },

  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  fieldLabel: { display: "block", fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 6 },
  fieldHint: { fontWeight: 500, color: SLATE, fontSize: 11.5 },

  hintLine: { marginTop: 16, padding: "11px 14px", background: "#f3ece0", borderRadius: 0, fontSize: 12.5, color: "#7a6c56", lineHeight: 1.55 },
  formErr: { marginTop: 16, padding: "11px 14px", borderRadius: 0, fontSize: 13, lineHeight: 1.5, color: "#8a2f16", background: "#fdeee9", border: "1px solid #f3cfc2" },

  drawerFoot: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 24, paddingTop: 18, borderTop: `1px solid ${LINE}`, flexWrap: "wrap" },
  footBtns: { display: "flex", gap: 10, marginLeft: "auto" },
  confirmRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  confirmText: { fontSize: 13, color: INK, fontWeight: 600 },

  /* move drawer */
  moveItemHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "16px 18px", background: CARD, border: `1px solid ${LINE}`, borderRadius: 0, marginBottom: 18 },
  moveItemName: { fontWeight: 700, fontSize: 15.5, color: INK },
  moveItemSku: { fontSize: 12.5, color: SLATE, marginTop: 2 },
  moveCur: { textAlign: "right", display: "flex", flexDirection: "column" },
  moveCurVal: { fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: TERRA, lineHeight: 1 },
  moveCurUnit: { fontSize: 11.5, color: SLATE, marginTop: 3 },

  typeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 },
  typeSign: { width: 22, height: 22, borderRadius: "50%", color: "#fff", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 },

  projBox: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, padding: "14px 18px", borderRadius: 0, border: `1px solid ${LINE}`, background: CARD },
  projLabel: { fontSize: 13, color: SLATE, fontWeight: 600 },
  projVal: { fontFamily: SERIF, fontSize: 24, fontWeight: 700 },
  projUnit: { fontSize: 13, fontWeight: 600, color: SLATE },

  /* history */
  historyList: { display: "flex", flexDirection: "column", gap: 2, marginTop: 4 },
  histRow: { display: "flex", gap: 14, padding: "14px 4px", borderBottom: `1px solid #f2ebdd`, alignItems: "flex-start" },
  histDot: { width: 10, height: 10, borderRadius: "50%", marginTop: 5, flexShrink: 0 },
  histTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 },
  histType: { fontWeight: 700, fontSize: 14 },
  histDelta: { fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" },
  histMeta: { fontSize: 12, color: SLATE, marginTop: 3, lineHeight: 1.5 },
  histNote: { fontSize: 12.5, color: "#7a6c56", marginTop: 4, fontStyle: "italic" },
  histBal: { textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column" },
  histBalVal: { fontWeight: 700, fontSize: 14, color: INK },
  histBalLabel: { fontSize: 10.5, color: SLATE, textTransform: "uppercase", letterSpacing: 0.5 },

  /* suppliers */
  supTop: { display: "flex", alignItems: "center", gap: 12 },
  supAvatar: { width: 40, height: 40, borderRadius: 0, flexShrink: 0, display: "grid", placeItems: "center", background: `linear-gradient(135deg, ${TERRA}, ${GOLD})`, color: "#fff", fontWeight: 700, fontSize: 16 },
  supName: { fontWeight: 700, fontSize: 15, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  supMeta: { fontSize: 12.5, color: SLATE, marginTop: 2 },
  supContact: { marginTop: 12, paddingTop: 12, borderTop: `1px solid #f2ebdd`, display: "flex", flexDirection: "column", gap: 3, fontSize: 12.5, color: SLATE },
  supEmail: { color: "#8a7a63" },

  /* toast */
  toast: {
    position: "fixed", top: 22, left: "50%", transform: "translateX(-50%)", zIndex: 1200,
    display: "flex", alignItems: "center", gap: 10, background: INK, color: "#fff",
    padding: "12px 20px", borderRadius: 0, fontSize: 13.5, fontWeight: 600,
    boxShadow: "0 16px 40px rgba(36,29,23,.32)", maxWidth: "90vw",
  },
  toastTick: { display: "inline-grid", placeItems: "center", width: 20, height: 20, borderRadius: "50%", background: GOLD, color: "#fff", fontSize: 12, flexShrink: 0 },
};

const CSS = `
  .inv-tab {
    border: 0; background: transparent; padding: 8px 16px; border-radius: 0; cursor: pointer;
    font-family: ${SANS}; font-size: 13px; font-weight: 700; color: ${SLATE}; transition: all .2s;
  }
  .inv-tab.on { background: #fff; color: ${INK}; box-shadow: 0 2px 8px rgba(42,35,29,.1); }

  /* period filter bar (Overview tab) — two zones: rolling presets and a
     "Jump to" specific month/year picker. The active zone lights up
     (terracotta) so it's always clear which one is driving the numbers. */
  .invfb { display: inline-flex; align-items: center; gap: 14px; flex-wrap: wrap; }

  /* segmented rolling presets */
  .invfb-seg { display: inline-flex; gap: 3px; background: #f0e8da; padding: 4px; border-radius: 0; border: 1px solid ${LINE}; }
  .invfb-seg button {
    border: 0; background: transparent; padding: 8px 15px; border-radius: 0; cursor: pointer;
    font-family: ${SANS}; font-size: 13px; font-weight: 700; color: ${SLATE};
    transition: color .15s, background .15s, box-shadow .15s;
  }
  .invfb-seg button:hover { color: ${INK}; }
  .invfb-seg button.on { background: #fff; color: ${TERRA_DK}; box-shadow: 0 2px 8px rgba(42,35,29,.12); }

  /* thin divider between the two zones */
  .invfb-div { width: 1px; height: 26px; background: ${LINE}; flex-shrink: 0; }

  /* jump-to specific month / year */
  .invfb-jump {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 4px 6px 4px 11px; border: 1px solid transparent; border-radius: 0;
    transition: border-color .15s, background .15s;
  }
  .invfb-jump.on { border-color: ${TERRA}; background: ${TERRA}0a; }
  .invfb-jlabel {
    font-size: 10.5px; font-weight: 800; letter-spacing: .7px; text-transform: uppercase;
    color: #b7ac96; transition: color .15s; white-space: nowrap;
  }
  .invfb-jump.on .invfb-jlabel { color: ${TERRA}; }
  .invfb-sel {
    border: 1px solid ${LINE}; border-radius: 0; padding: 8px 12px; background: ${CARD}; color: ${INK};
    font-family: ${SANS}; font-size: 13px; font-weight: 700; outline: none; cursor: pointer;
    transition: border-color .15s, box-shadow .15s, color .15s; color-scheme: light;
  }
  .invfb-sel:hover { border-color: #d8cbb6; }
  .invfb-sel:focus { border-color: ${TERRA}; box-shadow: 0 0 0 3px ${TERRA}22; }
  .invfb-jump.on .invfb-sel { border-color: ${TERRA}; color: ${TERRA_DK}; }

  @media (max-width: 720px) {
    .invfb { width: 100%; gap: 12px; }
    .invfb-seg { flex: 1 1 100%; justify-content: space-between; }
    .invfb-div { display: none; }
    .invfb-jump { flex: 1 1 100%; }
    .invfb-jump .invfb-sel { flex: 1 1 0; min-width: 0; }
  }

  /* Stock Items filters, hoisted into the top toolbar */
  .inv-topfilters { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1 1 340px; min-width: 0; }
  .inv-topfilters > div:first-child { flex: 1 1 200px; min-width: 0; }
  .inv-clear {
    background: transparent; border: 1px solid ${LINE}; color: ${SLATE}; padding: 11px 14px; border-radius: 0;
    font-family: ${SANS}; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s; white-space: nowrap;
  }
  .inv-clear:hover { color: ${TERRA}; border-color: ${TERRA}55; background: ${TERRA}0c; }

  .inv-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
  .inv-stats > * { min-width: 0; }
  @media (max-width: 1040px) { .inv-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 460px) { .inv-stats { grid-template-columns: 1fr; } }
  .inv-stat {
    background:
      radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.075) 0%, rgba(217,84,47,.022) 42%, rgba(217,84,47,0) 72%),
      linear-gradient(180deg, #fffcf9 0%, ${CARD} 60%);
    border: 1px solid #f0e6dc; border-radius: 0; padding: 20px 22px 18px;
    box-shadow: 0 1px 2px rgba(17,20,30,.04), 0 10px 26px -18px rgba(217,84,47,.28);
    transition: transform .2s, box-shadow .2s;
  }
  .inv-stat-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .inv-stat-label { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #8a8f9a; padding-top: 3px; }
  .inv-stat-ico { width: 32px; height: 32px; display: grid; place-items: center; flex-shrink: 0; }
  .inv-stat-value { font-size: 25px; font-weight: 800; letter-spacing: -0.6px; line-height: 1.05; margin: 10px 0 5px; font-variant-numeric: tabular-nums; }
  .inv-stat-sub { font-size: 12px; color: #8a8f9a; font-weight: 500; }
  /* clickable cards lift on hover — the border never changes, so all four
     cards stay visually identical whatever the stock situation */
  .inv-stat.clickable { cursor: pointer; }
  .inv-stat.clickable:hover { transform: translateY(-2px); box-shadow: 0 1px 2px rgba(17,20,30,.04), 0 14px 30px -16px rgba(217,84,47,.36); }

  .inv-solid {
    display: inline-flex; align-items: center; gap: 8px; background: ${TERRA}; color: #fff; border: 0;
    padding: 11px 18px; border-radius: 0; font-family: ${SANS}; font-size: 13.5px; font-weight: 700;
    cursor: pointer; box-shadow: 0 10px 24px ${TERRA}33; transition: transform .2s, box-shadow .2s, background .2s, opacity .2s;
  }
  .inv-solid:hover:not(:disabled) { transform: translateY(-1px); background: ${TERRA_DK}; box-shadow: 0 14px 30px ${TERRA}44; }
  .inv-solid:disabled { opacity: .55; cursor: not-allowed; }

  .inv-ghost {
    display: inline-flex; align-items: center; gap: 8px; background: ${CARD}; color: ${INK};
    border: 1px solid ${LINE}; padding: 11px 18px; border-radius: 0; font-family: ${SANS};
    font-size: 13.5px; font-weight: 700; cursor: pointer; transition: background .2s, border-color .2s;
  }
  .inv-ghost:hover:not(:disabled) { background: ${IVORY}; border-color: #d8cbb6; }
  .inv-ghost:disabled { opacity: .5; cursor: not-allowed; }
  .inv-ghost.sm, .inv-danger.sm { padding: 8px 14px; font-size: 12.5px; }

  .inv-danger {
    display: inline-flex; align-items: center; gap: 7px; background: ${RED}; color: #fff; border: 0;
    padding: 11px 18px; border-radius: 0; font-family: ${SANS}; font-size: 13.5px; font-weight: 700; cursor: pointer;
  }
  .inv-danger:hover:not(:disabled) { background: #a5372f; }
  .inv-danger:disabled { opacity: .55; cursor: not-allowed; }
  .inv-danger-ghost {
    display: inline-flex; align-items: center; gap: 7px; background: transparent; color: ${RED};
    border: 1px solid ${RED}44; padding: 10px 16px; border-radius: 0; font-family: ${SANS};
    font-size: 13px; font-weight: 700; cursor: pointer; transition: background .2s;
  }
  .inv-danger-ghost:hover { background: #fbe9e7; }

  .inv-chip {
    background: ${CARD}; border: 1px solid ${LINE}; color: ${SLATE}; padding: 11px 16px; border-radius: 0;
    font-family: ${SANS}; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s; white-space: nowrap;
  }
  .inv-chip.on { background: ${AMBER}18; border-color: ${AMBER}; color: #9a6a1c; }

  .inv-iconbtn {
    width: 34px; height: 34px; border-radius: 0; border: 1px solid ${LINE}; background: ${CARD};
    color: ${SLATE}; display: grid; place-items: center; cursor: pointer; transition: all .2s; flex-shrink: 0;
  }
  .inv-iconbtn:hover { color: ${TERRA}; border-color: ${TERRA}55; background: ${TERRA}0c; }

  .inv-move {
    display: inline-flex; align-items: center; gap: 6px; background: ${INK}; color: #fff; border: 0;
    padding: 8px 13px; border-radius: 0; font-family: ${SANS}; font-size: 12.5px; font-weight: 700;
    cursor: pointer; transition: background .2s, transform .2s; white-space: nowrap;
  }
  .inv-move:hover { background: #3a2f26; transform: translateY(-1px); }

  .inv-row:hover td { background: #fdfbf6; }
  .inv-table-scroll { overflow-x: auto; max-width: 100%; }
  .inv-refreshing { opacity: .55; transition: opacity .2s ease; pointer-events: none; }

  .inv-input {
    width: 100%; box-sizing: border-box; padding: 10px 13px; border: 1px solid ${LINE}; border-radius: 0;
    font-size: 14px; font-family: ${SANS}; background: ${CARD}; color: ${INK}; outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .inv-input:focus { border-color: ${TERRA}; box-shadow: 0 0 0 3px ${TERRA}22; }
  textarea.inv-input { resize: vertical; min-height: 60px; }

  .inv-type {
    display: flex; align-items: center; gap: 10px; text-align: left; background: ${CARD};
    border: 1px solid ${LINE}; border-radius: 0; padding: 12px 14px; cursor: pointer;
    font-family: ${SANS}; font-size: 13px; font-weight: 700; color: ${SLATE}; transition: all .2s;
  }
  .inv-type:hover { border-color: #d8cbb6; }

  .inv-sup-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  .inv-sup-card {
    background: ${CARD}; border: 1px solid ${LINE}; border-radius: 0; padding: 18px; cursor: pointer;
    transition: transform .2s, box-shadow .2s, border-color .2s;
  }
  .inv-sup-card:hover { transform: translateY(-3px); box-shadow: 0 16px 34px rgba(42,35,29,.1); border-color: ${GOLD}66; }
  .inv-sup-chev { margin-left: auto; color: #c3b8a6; display: grid; place-items: center; }
  .inv-sup-card:hover .inv-sup-chev { color: ${TERRA}; }

  .inv-skel {
    border-radius: 0;
    background: linear-gradient(90deg, #efe7d8 25%, #f6f0e5 37%, #efe7d8 63%);
    background-size: 400% 100%; animation: invShimmer 1.4s ease infinite;
  }
  @keyframes invShimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

  @media (prefers-reduced-motion: reduce) {
    .inv-stat, .inv-solid, .inv-sup-card, .inv-move, .inv-skel { transition: none !important; animation: none !important; }
  }
`;