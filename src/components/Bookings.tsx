import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";

/* ══════════════════════════════════════════════════════════════
   ABHIJIT ART — Bookings (admin)

   Same design system as Customers / Inventory: DM Sans, square
   corners, warm orange-glow cards, hairline borders, tabular
   figures, filters in the top toolbar.

   Backend:
     GET   /bookings                    all bookings, newest first
     PATCH /bookings/:id/status         { status, totalAmount? }

   A booking can't be marked confirmed or completed until it has a
   total value — the modal collects it, because that figure is what
   the client's invoice is built from.
   ══════════════════════════════════════════════════════════════ */

/* ── tokens ── */
const CARD = "#ffffff";
const INK = "#1f2430";
const BODY = "#545a67";
const MUTE = "#8a8f9a";
const FAINT = "#b6bac3";
const LINE = "#f0e6dc";
const LINE2 = "#f4f5f7";
const BGSOFT = "#fafbfc";

const ACCENT = "#d9542f";
const ACCENT_DK = "#c8481f";
const GOLD = "#c68a2e";
const BLUE = "#3b6fd4";
const POS = "#17a35b";
const NEG = "#dd4b3e";

const SANS = "'DM Sans', system-ui, sans-serif";

const GLOW =
  "radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.075) 0%, rgba(217,84,47,.022) 42%, rgba(217,84,47,0) 72%), linear-gradient(180deg, #fffcf9 0%, #ffffff 60%)";
const GLOW_SHADOW = "0 1px 2px rgba(17,20,30,.04), 0 10px 26px -18px rgba(217,84,47,.28)";

const STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_META: Record<string, { label: string; color: string; soft: string }> = {
  pending:   { label: "Pending",   color: GOLD, soft: "#fbf3e3" },
  confirmed: { label: "Confirmed", color: BLUE, soft: "#eaf0fb" },
  completed: { label: "Completed", color: POS,  soft: "#e8f6ee" },
  cancelled: { label: "Cancelled", color: NEG,  soft: "#fdecea" },
};

interface BUser { name: string; email: string; phone?: string }
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
  totalAmount?: number | null;
  status: string;
  createdAt: string;
  /* price breakdown, set when the order total was confirmed */
  unitRate?: number | null;
  subtotal?: number | null;
  discountType?: string | null;
  discountValue?: number | null;
  discountAmount?: number | null;
  taxPercent?: number | null;
  taxAmount?: number | null;
}

/* What gets persisted with the total, so the client's invoice can show the
   same discount and GST lines the admin priced it with. Both the typed inputs
   and the computed amounts are sent: an invoice is a financial record, so it
   should reproduce what was agreed even if this calculation changes later. */
type Breakdown = {
  unitRate: number;
  subtotal: number;
  discountType: "amount" | "percent";
  discountValue: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
};

/* the order-total form: only rate / discount / GST are typed by the admin */
type TotalForm = {
  id: string;
  status: string;
  service: string;
  qty: string;
  rate: string;
  discType: "amount" | "percent";
  discVal: string;
  taxPct: string;
};

const rupee = (n: unknown) =>
  "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const dateFmt = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/* ── icons ── */
const Ico = ({ d, size = 17, sw = 1.9 }: { d: string; size?: number; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const I = {
  clipboard: "M9 2h6v4H9zM15 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2",
  check: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 12.5l2.5 2.5 4.5-5",
  double: "M2 13l4 4L14 7M12 15l2 2 8-10",
  ban: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  chevron: "M6 9l6 6 6-6",
  x: "M18 6 6 18M6 6l12 12",
  rupee: "M6 3h12M6 8h12M9 3c3 0 5 2 5 5s-2 5-5 5H6l7 8",
};

export default function Bookings() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  /* Order-total modal — required before confirmed / completed. Service and
     quantity come straight from what the client ordered; the admin supplies
     rate, discount and GST, and the total is derived (see TotalForm above). */
  const [amountModal, setAmountModal] = useState<TotalForm | null>(null);
  const [amountErr, setAmountErr] = useState("");
  const [amountSaving, setAmountSaving] = useState(false);

  /* Live breakdown for the modal.

     Booking.totalAmount is Int (whole ₹), so every money figure here is
     rounded to rupees and the total is built from the ALREADY-ROUNDED parts:
     total = subtotal − discount + tax. Rounding only at the end would let the
     printed lines disagree with the stored total by a rupee, which on an
     invoice is a real problem. */
  const calc = useMemo(() => {
    const n = (v: unknown) => {
      const x = Number(v);
      return Number.isFinite(x) ? x : 0;
    };
    const qty = n(amountModal?.qty);
    const rate = n(amountModal?.rate);
    const subtotal = Math.round(qty * rate);
    const dv = n(amountModal?.discVal);
    const discount = Math.min(
      amountModal?.discType === "percent" ? Math.round((subtotal * dv) / 100) : Math.round(dv),
      subtotal,
    );
    const taxable = Math.max(subtotal - discount, 0);
    const tax = Math.round((taxable * n(amountModal?.taxPct)) / 100);
    return { qty, rate, subtotal, discount, taxable, tax, total: taxable + tax };
  }, [amountModal]);

  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/bookings");
      setRows(data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Couldn't load bookings.");
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* PATCH with optimistic update; reverts and surfaces the server message on failure */
  const applyStatus = async (
    id: string,
    status: string,
    totalAmount: number | null,
    breakdown?: Breakdown,
  ) => {
    const prev = rows;
    setRows((list) =>
      list.map((b) =>
        b.id === id
          ? { ...b, status, ...(totalAmount != null ? { totalAmount } : {}), ...(breakdown || {}) }
          : b,
      ),
    );
    try {
      await api.patch(`/bookings/${id}/status`, {
        status,
        ...(totalAmount != null ? { totalAmount } : {}),
        ...(breakdown || {}),
      });
      setToast(`Marked ${STATUS_META[status]?.label.toLowerCase() || status}.`);
      return true;
    } catch (err: any) {
      setRows(prev); // revert — the server rejected it
      setError(err?.response?.data?.message || "Could not update the booking status.");
      setTimeout(() => setError(""), 5000);
      return false;
    }
  };

  const changeStatus = (id: string, status: string) => {
    setOpenMenu(null);
    const b = rows.find((x) => x.id === id);
    const hasTotal = !!(b?.totalAmount && b.totalAmount > 0);
    // a confirmed/completed job must carry a value — the invoice depends on it
    if ((status === "confirmed" || status === "completed") && !hasTotal) {
      setAmountErr("");
      setAmountModal({
        id,
        status,
        service: b?.serviceName || "",
        qty: String(b?.quantity ?? 1),   // what the client actually ordered
        rate: "",
        discType: "amount",
        discVal: "0",
        taxPct: "0",
      });
      return;
    }
    applyStatus(id, status, null);
  };

  const setField = (k: keyof TotalForm, v: string) =>
    setAmountModal((m) => (m ? ({ ...m, [k]: v } as TotalForm) : m));

  const submitAmount = async () => {
    if (!amountModal) return;
    if (calc.qty <= 0) return setAmountErr("Quantity must be greater than 0.");
    if (calc.rate <= 0) return setAmountErr("Enter a rate per unit.");
    if (calc.total <= 0) return setAmountErr("The total works out to zero — check the discount.");
    setAmountErr("");
    setAmountSaving(true);

    /* The breakdown travels with the total so the client's invoice can print
       real Subtotal / Discount / GST lines instead of zeroes. Money values are
       whole rupees (matching Booking.totalAmount Int); only the typed rate and
       the percentages keep two decimals. */
    const round2 = (v: number) => Math.round(v * 100) / 100;
    const breakdown: Breakdown = {
      unitRate: round2(calc.rate),
      subtotal: calc.subtotal,
      discountType: amountModal.discType,
      discountValue: round2(Number(amountModal.discVal) || 0),
      discountAmount: calc.discount,
      taxPercent: round2(Number(amountModal.taxPct) || 0),
      taxAmount: calc.tax,
    };

    const ok = await applyStatus(amountModal.id, amountModal.status, calc.total, breakdown);
    setAmountSaving(false);
    if (ok) setAmountModal(null);
  };

  /* counts come from the full set, not the filtered view */
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of STATUSES) c[s] = rows.filter((b) => b.status === s).length;
    return c;
  }, [rows]);

  /* client-side filtering — /bookings returns the whole list */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false;
      if (!term) return true;
      return [b.user?.name, b.user?.email, b.contactPhone, b.serviceName, b.notes]
        .some((v) => String(v || "").toLowerCase().includes(term));
    });
  }, [rows, q, statusFilter]);

  const exportCsv = () => {
    const head = ["Date", "Client", "Email", "Contact", "Service", "Qty", "Total", "Delivery", "Address", "Expected", "Design Link", "Notes", "Status"];
    const body = filtered.map((b) => [
      dateFmt(b.createdAt),
      b.user?.name || "",
      b.user?.email || "",
      b.contactPhone || b.user?.phone || "",
      b.serviceName || "",
      String(b.quantity ?? ""),
      b.totalAmount ? String(b.totalAmount) : "",
      b.deliveryMethod || "",
      b.address || "",
      b.preferredDate ? dateFmt(b.preferredDate) : "",
      b.designLink || "",
      (b.notes || "").replace(/\n/g, " "),
      b.status || "",
    ]);
    const csv = [head, ...body]
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

  const revenue = useMemo(
    () => rows.filter((b) => b.status === "completed").reduce((s, b) => s + (Number(b.totalAmount) || 0), 0),
    [rows],
  );

  return (
    <div style={s.wrap}>
      <style>{CSS}</style>

      {/* ── top toolbar ── */}
      <div style={s.topRow}>
        <div className="bk-filters">
          <div style={s.searchBox}>
            <span style={s.searchIco}><Ico d={I.search} size={17} /></span>
            <input
              style={s.searchInput}
              placeholder="Search client, service, phone or notes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select style={s.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((st) => (
              <option key={st} value={st}>{STATUS_META[st].label}</option>
            ))}
          </select>
          {(q || statusFilter) && (
            <button className="bk-clear" onClick={() => { setQ(""); setStatusFilter(""); }}>Clear</button>
          )}
        </div>

        <button className="bk-ghost" onClick={exportCsv} disabled={!filtered.length}>
          <Ico d={I.download} size={16} /> Export CSV
        </button>
      </div>

      {/* ── stat cards ── */}
      <div className="bk-stats">
        <Stat icon={I.clipboard} accent={INK}  label="Total"     value={String(rows.length)}      sub="All bookings" />
        <Stat icon={I.clock}     accent={GOLD} label="Pending"   value={String(counts.pending)}   sub="Awaiting action" />
        <Stat icon={I.check}     accent={BLUE} label="Confirmed" value={String(counts.confirmed)} sub="In progress" />
        <Stat icon={I.double}    accent={POS}  label="Completed" value={String(counts.completed)} sub={revenue > 0 ? rupee(revenue) + " billed" : "Delivered"} />
        <Stat icon={I.ban}       accent={NEG}  label="Cancelled" value={String(counts.cancelled)} sub="Not proceeding" />
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {/* ── table ── */}
      {loading && !loadedOnce ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <div style={s.emptyCard}>
          <span style={s.emptyIco}><Ico d={I.clipboard} size={26} /></span>
          <h3 style={s.emptyTitle}>No bookings yet</h3>
          <p style={s.emptyText}>Orders placed on the website will appear here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={s.emptyCard}>
          <span style={s.emptyIco}><Ico d={I.search} size={26} /></span>
          <h3 style={s.emptyTitle}>No bookings match your filters</h3>
          <p style={s.emptyText}>Try clearing the search or the status filter.</p>
        </div>
      ) : (
        <div style={s.tableCard} className={loading ? "bk-refreshing" : ""}>
          <div className="bk-table-scroll">
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Date</th>
                  <th style={s.th}>Client</th>
                  <th style={s.th}>Contact</th>
                  <th style={s.th}>Service</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Qty</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Total</th>
                  <th style={s.th}>Delivery</th>
                  <th style={s.th}>Expected</th>
                  <th style={s.th}>Design</th>
                  <th style={s.th}>Notes</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const meta = STATUS_META[b.status] || STATUS_META.pending;
                  return (
                    <tr key={b.id} className="bk-row">
                      <td style={{ ...s.td, whiteSpace: "nowrap", color: BODY }}>{dateFmt(b.createdAt)}</td>
                      <td style={s.td}>
                        <div style={s.nameCell}>
                          <span style={s.nameMain}>{b.user?.name || "—"}</span>
                          <span style={s.nameSub}>{b.user?.email}</span>
                        </div>
                      </td>
                      <td style={{ ...s.td, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                        {b.contactPhone || b.user?.phone || <span style={s.dash}>—</span>}
                      </td>
                      <td style={s.td}>{b.serviceName}</td>
                      <td style={s.tdNum}>{b.quantity}</td>
                      <td style={{ ...s.tdNum, fontWeight: 800 }}>
                        {b.totalAmount && b.totalAmount > 0 ? rupee(b.totalAmount) : <span style={s.dash}>—</span>}
                      </td>
                      <td style={s.td}>
                        {b.deliveryMethod ? (
                          <span style={{ ...s.tag, ...(b.deliveryMethod === "delivery" ? s.tagTerra : s.tagGrey) }}>
                            {b.deliveryMethod}
                          </span>
                        ) : <span style={s.dash}>—</span>}
                      </td>
                      <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                        {b.preferredDate ? dateFmt(b.preferredDate) : <span style={s.dash}>—</span>}
                      </td>
                      <td style={s.td}>
                        {b.designLink ? (
                          <a style={s.link} href={b.designLink} target="_blank" rel="noopener noreferrer">View ↗</a>
                        ) : <span style={s.dash}>—</span>}
                      </td>
                      <td style={{ ...s.td, maxWidth: 200, fontSize: 12.5, color: BODY }}>
                        {b.notes || <span style={s.dash}>—</span>}
                      </td>
                      <td style={{ ...s.td, textAlign: "right" }}>
                        <div style={s.statusWrap}>
                          <button
                            type="button"
                            className="bk-statusbtn"
                            style={{ color: meta.color, borderColor: `${meta.color}55`, background: meta.soft }}
                            onClick={() => setOpenMenu(openMenu === b.id ? null : b.id)}
                          >
                            <span style={{ ...s.dot, background: meta.color }} />
                            {meta.label}
                            <Ico d={I.chevron} size={13} sw={2.2} />
                          </button>
                          {openMenu === b.id && (
                            <>
                              <div style={s.menuBack} onClick={() => setOpenMenu(null)} />
                              <div style={s.menu}>
                                {STATUSES.map((sOpt) => (
                                  <button
                                    key={sOpt}
                                    type="button"
                                    className={`bk-menuitem${b.status === sOpt ? " sel" : ""}`}
                                    onClick={() => changeStatus(b.id, sOpt)}
                                  >
                                    <span style={{ ...s.dot, background: STATUS_META[sOpt].color }} />
                                    {STATUS_META[sOpt].label}
                                    {b.status === sOpt && (
                                      <span style={{ marginLeft: "auto", color: POS }}>
                                        <Ico d="M20 6 9 17l-5-5" size={13} sw={2.6} />
                                      </span>
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
        </div>
      )}

      {/* ── total-value modal ── */}
      <AnimatePresence>
        {amountModal && (
          <motion.div
            style={s.backdrop}
            onClick={() => !amountSaving && setAmountModal(null)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              style={s.modal}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
            >
              <div style={s.modalHead}>
                <h3 style={s.modalTitle}>Set order total</h3>
                <button className="bk-iconbtn" onClick={() => setAmountModal(null)} aria-label="Close">
                  <Ico d={I.x} size={17} />
                </button>
              </div>

              <div style={s.modalBody}>
                <p style={s.modalSub}>
                  Price up this order to mark it{" "}
                  <b style={{ color: STATUS_META[amountModal.status]?.color }}>
                    {STATUS_META[amountModal.status]?.label.toLowerCase()}
                  </b>. The total is what the client's invoice is built from.
                </p>

                {/* what the client ordered — from the booking, not typed again */}
                <div style={s.orderBox}>
                  <div>
                    <div style={s.orderLabel}>Ordered</div>
                    <div style={s.orderName}>{amountModal.service || "—"}</div>
                  </div>
                  <div style={s.orderQty}>
                    <span style={s.orderQtyVal}>{amountModal.qty || "0"}</span>
                    <span style={s.orderQtyUnit}>qty</span>
                  </div>
                </div>

                <div style={s.grid2}>
                  <div>
                    <label style={s.fieldLabel}>Quantity</label>
                    <input
                      className="bk-input" type="number" min="0" step="any"
                      value={amountModal.qty}
                      onChange={(e) => { setAmountErr(""); setField("qty", e.target.value); }}
                    />
                  </div>
                  <div>
                    <label style={s.fieldLabel}>Rate / unit (₹)</label>
                    <input
                      className="bk-input" type="number" min="0" step="any" autoFocus
                      value={amountModal.rate}
                      placeholder="0"
                      onChange={(e) => { setAmountErr(""); setField("rate", e.target.value); }}
                      onKeyDown={(e) => e.key === "Enter" && submitAmount()}
                    />
                  </div>
                  <div>
                    <label style={s.fieldLabel}>Discount</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <select
                        className="bk-input" style={{ width: 62, flex: "none" }}
                        value={amountModal.discType}
                        onChange={(e) => setField("discType", e.target.value as "amount" | "percent")}
                      >
                        <option value="amount">₹</option>
                        <option value="percent">%</option>
                      </select>
                      <input
                        className="bk-input" type="number" min="0" step="any"
                        value={amountModal.discVal}
                        onChange={(e) => { setAmountErr(""); setField("discVal", e.target.value); }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={s.fieldLabel}>GST %</label>
                    <input
                      className="bk-input" type="number" min="0" step="any"
                      value={amountModal.taxPct}
                      onChange={(e) => { setAmountErr(""); setField("taxPct", e.target.value); }}
                    />
                  </div>
                </div>

                {/* live breakdown */}
                <div style={s.calcBox}>
                  <Row label={`Subtotal  (${amountModal.qty || 0} × ${rupee(calc.rate)})`} value={rupee(calc.subtotal)} />
                  {calc.discount > 0 && (
                    <Row
                      label={`Discount${amountModal.discType === "percent" ? ` (${Number(amountModal.discVal) || 0}%)` : ""}`}
                      value={"− " + rupee(calc.discount)}
                    />
                  )}
                  {calc.tax > 0 && <Row label={`GST (${Number(amountModal.taxPct) || 0}%)`} value={rupee(calc.tax)} />}
                  <div style={s.calcTotal}>
                    <span>Total</span>
                    <span style={s.calcTotalVal}>{rupee(calc.total)}</span>
                  </div>
                </div>

                {amountErr && <div style={s.formErr}>{amountErr}</div>}
              </div>

              <div style={s.modalFoot}>
                <button className="bk-ghost" onClick={() => setAmountModal(null)} disabled={amountSaving}>Cancel</button>
                <button className="bk-solid" onClick={submitAmount} disabled={amountSaving || calc.total <= 0}>
                  {amountSaving ? "Saving…" : `Confirm ${rupee(calc.total)}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div style={s.toast} initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}>
            <span style={s.toastTick}>✓</span>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────── stat card ─────────────────────────── */
function Stat({ icon, accent, label, value, sub }: { icon: string; accent: string; label: string; value: string; sub: string }) {
  return (
    <motion.div className="bk-stat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="bk-stat-top">
        <span className="bk-stat-label">{label}</span>
        <span className="bk-stat-ico" style={{ color: accent, background: `${accent}14` }}>
          <Ico d={icon} size={17} />
        </span>
      </div>
      <div className="bk-stat-value" style={{ color: accent }}>{value}</div>
      <div className="bk-stat-sub">{sub}</div>
    </motion.div>
  );
}

/* one line of the modal's live breakdown */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={s.calcRow}>
      <span style={s.calcLabel}>{label}</span>
      <span style={s.calcVal}>{value}</span>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div style={s.tableCard}>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={s.skelRow}>
          <div className="bk-skel" style={{ width: "18%", height: 15 }} />
          <div className="bk-skel" style={{ width: "24%", height: 15 }} />
          <div className="bk-skel" style={{ width: "14%", height: 15 }} />
          <div className="bk-skel" style={{ width: "20%", height: 15 }} />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── styles ─────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  wrap: { fontFamily: SANS, color: INK, minWidth: 0, maxWidth: "100%" },

  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 18 },
  searchBox: { position: "relative", flex: "1 1 240px", minWidth: 0 },
  searchIco: { position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: MUTE },
  searchInput: {
    width: "100%", boxSizing: "border-box", padding: "11px 14px 11px 40px", borderRadius: 0,
    border: "1px solid #e6dcd2", background: CARD, fontSize: 14, fontFamily: SANS, color: INK, outline: "none",
  },
  select: {
    padding: "11px 14px", borderRadius: 0, border: "1px solid #e6dcd2", background: CARD,
    fontSize: 14, fontFamily: SANS, color: INK, cursor: "pointer", outline: "none",
  },

  /* table */
  tableCard: { background: CARD, border: "1px solid #ececf1", borderRadius: 0, overflow: "hidden", boxShadow: "0 1px 2px rgba(17,20,30,.04)", marginTop: 16, minWidth: 0, maxWidth: "100%" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 1080 },
  th: { textAlign: "left", padding: "11px 16px", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase", color: MUTE, borderBottom: "1px solid #ececf1", whiteSpace: "nowrap", background: BGSOFT },
  td: { padding: "13px 16px", fontSize: 13.5, color: INK, borderBottom: `1px solid ${LINE2}`, verticalAlign: "middle" },
  tdNum: { padding: "13px 16px", fontSize: 13.5, fontWeight: 700, textAlign: "right", borderBottom: `1px solid ${LINE2}`, verticalAlign: "middle", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: INK },

  nameCell: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0 },
  nameMain: { fontWeight: 700, color: INK },
  nameSub: { fontSize: 12, color: MUTE, overflow: "hidden", textOverflow: "ellipsis" },
  dash: { color: FAINT },
  tag: { display: "inline-block", padding: "3px 10px", fontSize: 11.5, fontWeight: 700, textTransform: "capitalize", whiteSpace: "nowrap" },
  tagTerra: { background: "#fdeee9", color: ACCENT },
  tagGrey: { background: "#eef1f5", color: BODY },
  link: { color: ACCENT, fontWeight: 700, fontSize: 12.5, textDecoration: "none", whiteSpace: "nowrap" },

  /* status pill + menu */
  statusWrap: { position: "relative", display: "inline-block" },
  dot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0, display: "inline-block" },
  menuBack: { position: "fixed", inset: 0, zIndex: 30 },
  menu: {
    position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 31, minWidth: 172,
    background: CARD, border: `1px solid ${LINE}`, boxShadow: "0 14px 38px rgba(17,20,30,.14)", padding: 4,
  },

  errorBox: { background: "#fdecea", border: "1px solid #f3cfc2", color: "#8a2f16", padding: "13px 17px", fontSize: 13.5, marginTop: 16 },
  skelRow: { display: "flex", gap: 24, padding: "16px 18px", borderBottom: `1px solid ${LINE2}`, alignItems: "center" },

  emptyCard: { background: CARD, border: "1px dashed #ddd0c4", padding: "50px 24px", textAlign: "center", marginTop: 16 },
  emptyIco: { display: "inline-grid", placeItems: "center", width: 56, height: 56, background: "#fdeee9", color: ACCENT, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: INK },
  emptyText: { color: MUTE, fontSize: 13.5, lineHeight: 1.65, margin: 0, maxWidth: 380, marginLeft: "auto", marginRight: "auto" },

  /* modal */
  backdrop: { position: "fixed", inset: 0, background: "rgba(24,22,28,.5)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box" },
  modal: { width: "100%", maxWidth: 480, maxHeight: "calc(100vh - 40px)", overflowY: "auto", background: "#fffdfb", border: `1px solid ${LINE}`, boxShadow: "0 30px 80px rgba(24,22,28,.34)", display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" },
  modalHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "17px 22px", borderBottom: `1px solid ${LINE}`, background: CARD },
  modalTitle: { fontSize: 17, fontWeight: 800, margin: 0, color: INK, letterSpacing: -0.2 },
  modalBody: { padding: 22 },
  modalSub: { margin: "0 0 18px", fontSize: 13, color: BODY, lineHeight: 1.6 },
  modalFoot: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: `1px solid ${LINE}`, background: CARD, flexWrap: "wrap" },
  fieldLabel: { display: "block", fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 6 },
  grid2: { display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 14 },

  /* what the client ordered — read straight off the booking */
  orderBox: {
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14,
    padding: "13px 15px", background: "#fffcf9", border: `1px solid ${LINE}`, marginBottom: 18,
  },
  orderLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: MUTE },
  orderName: { fontSize: 14.5, fontWeight: 700, color: INK, marginTop: 3 },
  orderQty: { textAlign: "right", display: "flex", flexDirection: "column", flexShrink: 0 },
  orderQtyVal: { fontSize: 22, fontWeight: 800, color: ACCENT, lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  orderQtyUnit: { fontSize: 10.5, color: MUTE, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.6 },

  /* live total breakdown */
  calcBox: { marginTop: 18, paddingTop: 14, borderTop: `1px solid ${LINE}` },
  calcRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "5px 0" },
  calcLabel: { fontSize: 12.5, color: MUTE },
  calcVal: { fontSize: 13, fontWeight: 700, color: INK, fontVariantNumeric: "tabular-nums" },
  calcTotal: {
    display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12,
    marginTop: 8, paddingTop: 11, borderTop: `1px solid ${LINE}`, fontSize: 14, fontWeight: 800, color: INK,
  },
  calcTotalVal: { fontSize: 19, fontWeight: 800, color: ACCENT, fontVariantNumeric: "tabular-nums" },
  formErr: { marginTop: 14, padding: "11px 14px", fontSize: 13, lineHeight: 1.5, color: "#8a2f16", background: "#fdecea", border: "1px solid #f3cfc2" },

  /* toast */
  toast: {
    position: "fixed", top: 22, left: "50%", transform: "translateX(-50%)", zIndex: 1200,
    display: "flex", alignItems: "center", gap: 10, background: INK, color: "#fff",
    padding: "12px 20px", fontSize: 13.5, fontWeight: 600,
    boxShadow: "0 16px 40px rgba(24,22,28,.32)", maxWidth: "90vw",
  },
  toastTick: { display: "inline-grid", placeItems: "center", width: 20, height: 20, borderRadius: "50%", background: GOLD, color: "#fff", fontSize: 12, flexShrink: 0 },
};

const CSS = `
  .bk-filters { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1 1 340px; min-width: 0; }

  .bk-stats { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 14px; }
  .bk-stats > * { min-width: 0; }
  @media (max-width: 1180px) { .bk-stats { grid-template-columns: repeat(3, minmax(0,1fr)); } }
  @media (max-width: 720px)  { .bk-stats { grid-template-columns: repeat(2, minmax(0,1fr)); } }
  @media (max-width: 440px)  { .bk-stats { grid-template-columns: minmax(0,1fr); } }

  /* the shared warm card surface used across Inventory / Customers */
  .bk-stat {
    padding: 18px 20px 16px;
    background: ${GLOW}; border: 1px solid ${LINE}; box-shadow: ${GLOW_SHADOW};
  }
  .bk-stat-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .bk-stat-label { font-size: 11px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: ${MUTE}; padding-top: 3px; }
  .bk-stat-ico { width: 32px; height: 32px; display: grid; place-items: center; flex-shrink: 0; }
  .bk-stat-value { font-size: 25px; font-weight: 800; letter-spacing: -.6px; line-height: 1.05; margin: 10px 0 5px; font-variant-numeric: tabular-nums; }
  .bk-stat-sub { font-size: 12px; color: ${MUTE}; font-weight: 500; }

  .bk-solid {
    display: inline-flex; align-items: center; gap: 8px; background: ${ACCENT}; color: #fff; border: 0;
    padding: 11px 18px; font-family: ${SANS}; font-size: 13.5px; font-weight: 700; cursor: pointer;
    box-shadow: 0 10px 24px ${ACCENT}33; transition: transform .2s, background .2s, opacity .2s;
  }
  .bk-solid:hover:not(:disabled) { transform: translateY(-1px); background: ${ACCENT_DK}; }
  .bk-solid:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }

  .bk-ghost {
    display: inline-flex; align-items: center; gap: 8px; background: ${CARD}; color: ${INK};
    border: 1px solid #e6dcd2; padding: 11px 18px; font-family: ${SANS};
    font-size: 13.5px; font-weight: 700; cursor: pointer; transition: background .2s, border-color .2s, color .2s;
  }
  .bk-ghost:hover:not(:disabled) { background: #fffcf9; border-color: ${ACCENT}55; color: ${ACCENT}; }
  .bk-ghost:disabled { opacity: .5; cursor: not-allowed; }

  .bk-clear {
    background: transparent; border: 1px solid #e6dcd2; color: ${BODY}; padding: 11px 14px;
    font-family: ${SANS}; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s; white-space: nowrap;
  }
  .bk-clear:hover { color: ${ACCENT}; border-color: ${ACCENT}55; background: #fffcf9; }

  .bk-iconbtn {
    width: 34px; height: 34px; border: 1px solid #e6dcd2; background: ${CARD};
    color: ${BODY}; display: grid; place-items: center; cursor: pointer; transition: all .2s; flex-shrink: 0;
  }
  .bk-iconbtn:hover { color: ${ACCENT}; border-color: ${ACCENT}55; background: #fffcf9; }

  .bk-statusbtn {
    display: inline-flex; align-items: center; gap: 7px; border: 1px solid; border-radius: 0;
    padding: 7px 11px; font-size: 12.5px; font-weight: 700; font-family: ${SANS};
    cursor: pointer; outline: none; white-space: nowrap; transition: filter .15s;
  }
  .bk-statusbtn:hover { filter: brightness(.97); }

  .bk-menuitem {
    display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: transparent;
    color: ${BODY}; padding: 9px 12px; font-size: 13px; font-weight: 600; cursor: pointer;
    text-align: left; font-family: ${SANS}; transition: background .12s;
  }
  .bk-menuitem:hover { background: ${BGSOFT}; }
  .bk-menuitem.sel { color: ${INK}; font-weight: 700; }

  .bk-input {
    width: 100%; box-sizing: border-box; padding: 10px 13px; border: 1px solid #e6dcd2; border-radius: 0;
    font-size: 14px; font-family: ${SANS}; background: ${CARD}; color: ${INK}; outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .bk-input:focus { border-color: ${ACCENT}; box-shadow: 0 0 0 3px ${ACCENT}22; }

  .bk-row:hover td { background: ${BGSOFT}; }
  .bk-table-scroll { overflow-x: auto; max-width: 100%; }
  .bk-refreshing { opacity: .55; transition: opacity .2s; pointer-events: none; }

  .bk-skel {
    background: linear-gradient(90deg, #eef0f3 25%, #f6f7f9 37%, #eef0f3 63%);
    background-size: 400% 100%; animation: bkShimmer 1.4s ease infinite;
  }
  @keyframes bkShimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

  @media (max-width: 560px) { .bk-filters { width: 100%; } }
  @media (prefers-reduced-motion: reduce) {
    .bk-stat, .bk-solid, .bk-skel { transition: none !important; animation: none !important; }
  }
`;