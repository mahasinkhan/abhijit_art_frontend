import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api";
import { useAuth } from "../context/AuthContext";

/* ══════════════════════════════════════════════════════════════
   BOOKING DETAILS  ·  single-booking view (order-details style)
   Timeline · service details · delivery · invoice summary · rating.

   THEME: strictly two-tone — Light Silver + Premium Gold.
   FONT: Avenir Next LT Pro.  LAYOUT: full-width, no side gaps.

   INVOICE: Inzawin-style professional layout — logo + company
   info rows (PHONE / EMAIL / PAN / GSTIN), INVOICE title with
   accent bar, boxed invoice number, BILL TO / ORDER DETAILS
   cards, item table, totals + amount in words, DIGITAL signature
   block stamped with the order-completion date & time, footer.
   INVOICE DATE = the date the order was marked Completed
   (booking.updatedAt); falls back to today while not completed.

   PRICING: when the admin confirmed the order they recorded how the
   total was reached — rate, discount and GST. Those are stored on the
   booking, so the invoice prints real Discount/GST rows. Before the
   order is priced it still falls back to a single estimate line.
   ══════════════════════════════════════════════════════════════ */

/* ── single brand font everywhere ── */
const FONT = "'Avenir Next LT Pro', 'Avenir Next', Avenir, 'Segoe UI', system-ui, sans-serif";

/* ── company constants (used on the invoice) ── */
const CO_EMAIL = "abhijitart85@gmail.com";
const CO_PHONE = "7405179066";
const CO_PAN = "AQFPD8346K";
const CO_GSTIN = "19AQFPD8346K1ZH";

/* ── Gold + Silver two-tone tokens ── */
const SILVER = "#f3f4f6";    // page background — light silver
const CARD = "#ffffff";
const INK = "#23262c";       // deep charcoal text
const MUTE = "#7b8290";      // silver-grey secondary text
const FAINT = "#a9afba";     // lightest silver text
const LINE = "#e3e6ec";      // silver hairlines
const SLATE = "#5b626e";     // dark silver (cancelled / neutral-strong)
const SLATEBG = "#eceef1";   // silver tint background
const GOLDD = "#a8842a";     // premium gold — deep (text / accents)
const GOLD = "#c9a24d";      // premium gold — main
const GOLDBG = "#f7f1e2";    // soft gold tint background

type Cat = "pending" | "confirmed" | "completed" | "cancelled" | "other";
function category(key: string): Cat {
  if (key === "pending") return "pending";
  if (["confirmed", "accepted", "approved", "processing", "in-progress", "in_progress"].includes(key)) return "confirmed";
  if (["completed", "delivered", "done"].includes(key)) return "completed";
  if (["cancelled", "canceled", "rejected", "declined"].includes(key)) return "cancelled";
  return "other";
}
/* two-tone status meta: gold for live/positive states, silver for cancelled/other */
const CAT_META: Record<Cat, { fg: string; bg: string; bar: string; label: string }> = {
  pending: { fg: MUTE, bg: SLATEBG, bar: FAINT, label: "Pending" },
  confirmed: { fg: GOLDD, bg: GOLDBG, bar: GOLD, label: "Confirmed" },
  completed: { fg: GOLDD, bg: GOLDBG, bar: GOLDD, label: "Completed" },
  cancelled: { fg: SLATE, bg: SLATEBG, bar: SLATE, label: "Cancelled" },
  other: { fg: MUTE, bg: SLATEBG, bar: FAINT, label: "Booking" },
};
const titleCase = (s: string) => s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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
const fmtDateInv = (d: unknown) => {
  const dt = parse(d);
  return dt ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
};
const fmtDateTimeInv = (d: unknown) => {
  const dt = parse(d);
  if (!dt) return "";
  return (
    dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " +
    dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase()
  );
};
const rupee = (n: number) => "₹" + n.toLocaleString("en-IN");
const money = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── amount in words (Indian numbering: crore / lakh / thousand) ── */
function amountInWords(num: number): string {
  if (!Number.isFinite(num) || num <= 0) return "";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (n: number): string =>
    n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  const three = (n: number): string =>
    n >= 100 ? ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + two(n % 100) : "") : two(n);
  let n = Math.round(num);
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push(three(crore) + " Crore");
  if (lakh) parts.push(two(lakh) + " Lakh");
  if (thousand) parts.push(two(thousand) + " Thousand");
  if (n) parts.push(three(n));
  return "INR " + parts.join(" ") + " Only";
}

/* nullable number coercion — Postgres Decimals can arrive as strings */
const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* tolerant of both raw API bookings and MyBookings' normalised shape */
function normalize(b: any) {
  const service =
    b?.serviceName ??
    (typeof b?.service === "string" ? b.service : b?.service?.name) ??
    b?.name ??
    "Service";
  const rawTotal = Number(b?.totalAmount ?? 0);
  return {
    id: String(b?.id ?? b?._id ?? ""),
    serviceId: b?.serviceId ?? null,
    service: String(service),
    quantity: Number(b?.quantity ?? 1),
    notes: String(b?.notes ?? b?.note ?? "").trim(),
    statusKey: String(b?.status ?? b?.statusKey ?? "pending").toLowerCase().trim(),
    createdAt: b?.createdAt ?? b?.created_at ?? b?.date ?? null,
    /* last status change — for a Completed booking this is the completion timestamp */
    updatedAt: b?.updatedAt ?? b?.updated_at ?? null,
    delivery: String(b?.deliveryMethod ?? b?.delivery ?? "").toLowerCase(),
    address: String(b?.address ?? "").trim(),
    preferredDate: b?.preferredDate ?? b?.preferred_date ?? null,
    designLink: String(b?.designLink ?? b?.design_link ?? "").trim(),
    contactPhone: String(b?.contactPhone ?? b?.phone ?? "").trim(),
    rating: Number(b?.rating ?? 0),
    /* admin-confirmed order total (set when the booking is confirmed) */
    totalAmount: Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : null,
    /* how that total was reached, recorded at confirm time. unitRate /
       discountValue / taxPercent are Decimal columns — the API coerces them to
       numbers, and numOrNull() guards anything that slips through as a string. */
    unitRate: numOrNull(b?.unitRate),
    subtotal: numOrNull(b?.subtotal),
    discountType: String(b?.discountType ?? ""),
    discountValue: numOrNull(b?.discountValue),
    discountAmount: numOrNull(b?.discountAmount),
    taxPercent: numOrNull(b?.taxPercent),
    taxAmount: numOrNull(b?.taxAmount),
  };
}

/* ── icons ── */
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const map: Record<string, JSX.Element> = {
    check: <path d="m4 12 5 5L20 6" {...p} />,
    x: <path d="M6 6l12 12M18 6 6 18" {...p} />,
    clock: (<><circle cx="12" cy="12" r="9" {...p} /><path d="M12 7v5l3 2" {...p} /></>),
    truck: (<><rect x="1.5" y="6" width="12" height="9" rx="1" {...p} /><path d="M13.5 9h4l3 3v3h-7z" {...p} /><circle cx="6" cy="17.5" r="1.7" {...p} /><circle cx="17" cy="17.5" r="1.7" {...p} /></>),
    store: (<><path d="M4 9h16v11H4z" {...p} /><path d="M3 9 5 4h14l2 5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" {...p} /></>),
    pin: (<><path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" {...p} /><circle cx="12" cy="10" r="2.5" {...p} /></>),
    phone: <path d="M5 3h3l2 5-2 1a12 12 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" {...p} />,
    note: (<><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" {...p} /><path d="M14 3v5h5M8 13h8M8 17h5" {...p} /></>),
    link: (<><path d="M14 4h6v6M20 4l-9 9" {...p} /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" {...p} /></>),
    download: (<><path d="M12 3v12M7 10l5 5 5-5" {...p} /><path d="M5 21h14" {...p} /></>),
    back: <path d="M15 5l-7 7 7 7" {...p} />,
    user: (<><circle cx="12" cy="8" r="4" {...p} /><path d="M4 21a8 8 0 0 1 16 0" {...p} /></>),
    alert: (<><path d="M12 3 2 20h20L12 3z" {...p} /><path d="M12 9v5M12 17h.01" {...p} /></>),
  };
  return (<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>{map[name]}</svg>);
}

function Star({ filled, size = 30 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <path
        d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.98 6.2 21.08l1.1-6.47L2.6 10.03l6.5-.95z"
        fill={filled ? GOLD : "none"}
        stroke={filled ? GOLD : "#ccd1d9"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ───────────────────────── page ───────────────────────── */
export default function BookingDetails() {
  const { id } = useParams();
  const { state } = useLocation() as { state?: { booking?: any } };
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rawBooking, setRawBooking] = useState<any>(state?.booking ?? null);
  const [loading, setLoading] = useState(!state?.booking);
  const [error, setError] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [icon, setIcon] = useState<string>("");

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [rated, setRated] = useState(false);
  const [rateErr, setRateErr] = useState("");

  /* fetch booking by id when not passed via router state */
  useEffect(() => {
    if (rawBooking) return;
    (async () => {
      try {
        const res = await api.get("/bookings/mine");
        const list = Array.isArray(res.data) ? res.data : res.data?.bookings ?? res.data?.data ?? [];
        const found = list.find((x: any) => String(x.id ?? x._id) === String(id));
        if (found) setRawBooking(found);
        else setError("We couldn't find this booking.");
      } catch {
        setError("We couldn't load this booking.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const b = useMemo(() => (rawBooking ? normalize(rawBooking) : null), [rawBooking]);

  /* seed rating from the booking */
  useEffect(() => {
    if (b && b.rating > 0) {
      setRating(b.rating);
      setRated(true);
    }
  }, [b]);

  /* look up starting price + icon for the linked service (estimate only) */
  useEffect(() => {
    if (!b) return;
    (async () => {
      try {
        const res = await api.get("/services");
        const svcs = Array.isArray(res.data) ? res.data : res.data?.services ?? [];
        const match = svcs.find(
          (s: any) =>
            (b.serviceId && s.id === b.serviceId) ||
            String(s.name || "").toLowerCase() === b.service.toLowerCase()
        );
        if (match) {
          if (typeof match.priceFrom === "number" && match.priceFrom > 0) setPrice(match.priceFrom);
          if (match.icon) setIcon(String(match.icon));
        }
      } catch {
        /* pricing is optional — ignore */
      }
    })();
  }, [b]);

  /* the endpoint exists now, so surface a failure instead of silently
     keeping a selection the server never stored */
  const submitRating = async (n: number) => {
    const prev = rating;
    setRating(n);
    setRated(true);
    setRateErr("");
    try {
      await api.patch(`/bookings/${b!.id}/rating`, { rating: n });
    } catch (err: any) {
      setRating(prev);
      setRated(prev > 0);
      setRateErr(err?.response?.data?.message || "Couldn't save your rating just now.");
    }
  };

  /* ══════════════════════════════════════════════════════════
     INVOICE — Inzawin-style professional layout, gold + silver
     Invoice Date = order completion date; digital signature is
     stamped with the completion date & time.
     ══════════════════════════════════════════════════════════ */
  const downloadInvoice = () => {
    if (!b) return;
    const esc = (s: unknown) =>
      String(s ?? "").replace(/[&<>"']/g, (ch) => (({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[ch]));

    /* confirmed total (admin-set) beats the priceFrom estimate */
    const finalTotal = b.totalAmount;                       // null until confirmed
    const estUnit = price ?? 0;
    const amount = finalTotal ?? (estUnit ? estUnit * b.quantity : 0);

    /* When the admin priced this order we hold the real breakdown, so the item
       line shows rate × qty BEFORE discount/GST and the totals block carries
       the Discount and GST rows. Unpriced bookings keep the old behaviour: a
       single estimate line with no deductions. */
    const hasBreak = (b.subtotal ?? 0) > 0;
    const lineAmount = hasBreak ? b.subtotal! : amount;
    const rate = hasBreak
      ? b.unitRate ?? (b.quantity > 0 ? lineAmount / b.quantity : 0)
      : amount && b.quantity > 0 ? amount / b.quantity : 0;
    const discAmt = hasBreak ? b.discountAmount ?? 0 : 0;
    const discLabel =
      b.discountType === "percent" && (b.discountValue ?? 0) > 0
        ? `Discount (${b.discountValue}%)`
        : "Discount";
    const taxPct = hasBreak ? b.taxPercent ?? 0 : 0;
    const taxAmt = hasBreak ? b.taxAmount ?? 0 : 0;

    const words = amount ? amountInWords(amount) : "";

    const INV = "INV" + b.id.replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase();
    const ORD = "OD" + b.id.replace(/[^a-z0-9]/gi, "").slice(-10).toUpperCase();
    const c = category(b.statusKey);
    const cm = CAT_META[c];
    const statusLabel = c === "other" ? titleCase(b.statusKey) : cm.label;
    const isDelivery = b.delivery === "delivery";
    const fulfil = isDelivery ? "Delivery" : "Pickup";

    /* order-completion timestamp: updatedAt when Completed, else now (draft/estimate) */
    const completedAt = c === "completed" ? parse(b.updatedAt) : null;
    const invoiceMoment = completedAt ?? new Date();

    const win = window.open("", "_blank", "width=860,height=1050");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${INV}</title>
      <style>
        *{box-sizing:border-box;font-family:'Avenir Next LT Pro','Avenir Next',Avenir,'Segoe UI',Arial,sans-serif;margin:0;padding:0}
        body{color:#23262c;background:#fff;font-size:13px;line-height:1.5}
        .sheet{max-width:780px;margin:0 auto;padding:42px 44px 28px}

        /* ── header ── */
        .top{display:flex;justify-content:space-between;align-items:flex-start;gap:28px}
        .logo{height:56px;width:auto;display:block;margin-bottom:14px}
        .addr{color:#7b8290;font-size:12px;line-height:1.6;max-width:320px;margin-bottom:12px}
        .inforow{display:flex;align-items:center;gap:8px;font-size:12px;margin-top:5px}
        .ilab{color:#a9afba;font-weight:700;font-size:10px;letter-spacing:1px;min-width:52px}
        .ival{color:#23262c;font-weight:600}
        .doc{text-align:right;min-width:280px}
        .t{font-size:27px;font-weight:800;letter-spacing:6px;color:#23262c}
        .tbar{height:4px;width:100%;background:#a8842a;margin-top:6px;border-radius:2px}
        .invbox{background:#f7f1e2;border:1px solid #e9dfc6;border-radius:8px;padding:10px 14px;margin-top:16px;text-align:left}
        .invbox .lab{display:flex;align-items:center;gap:6px;color:#a8842a;font-size:10px;font-weight:800;letter-spacing:1.2px}
        .invbox .no{font-size:18px;font-weight:800;letter-spacing:.6px;color:#23262c;margin-top:3px}
        .kv{width:100%;margin-top:12px;border-collapse:collapse}
        .kv td{padding:3.5px 0;font-size:12.5px}
        .kv .k{color:#7b8290;text-align:left}
        .kv .v{text-align:right;font-weight:700;color:#23262c}
        .kv .v.gold{color:#a8842a}

        /* ── bill to / order details cards ── */
        .cards{display:flex;gap:18px;margin-top:26px}
        .cardbx{flex:1;border:1px solid #e3e6ec;border-radius:10px;padding:16px 18px}
        .chead{display:flex;align-items:center;gap:7px;color:#a8842a;font-size:10.5px;font-weight:800;letter-spacing:1.4px;margin-bottom:10px}
        .cname{font-size:14.5px;font-weight:800;color:#23262c;margin-bottom:4px}
        .cmut{color:#7b8290;font-size:12px;line-height:1.6}
        .crow{display:flex;justify-content:space-between;gap:14px;padding:3.5px 0;font-size:12.5px}
        .crow .k{color:#7b8290}
        .crow .v{font-weight:700;color:#23262c;text-align:right}
        .crow .v.gold{color:#a8842a}

        /* ── items table ── */
        .items{width:100%;border-collapse:collapse;margin-top:26px}
        .items th{background:#eceef1;color:#5b626e;font-size:10.5px;letter-spacing:1px;text-transform:uppercase;text-align:left;padding:11px 14px;font-weight:800;border-top:2px solid #23262c;border-bottom:1px solid #e3e6ec}
        .items td{padding:14px;border-bottom:1px solid #eaecf1;font-size:13px;vertical-align:middle}
        .r{text-align:right}.ctr{text-align:center;color:#a9afba}
        .desc{display:flex;align-items:center;gap:12px}
        .thumb{width:42px;height:42px;flex-shrink:0;border-radius:8px;background:linear-gradient(135deg,#f7f1e2,#eceef1);border:1px solid #e9dfc6;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;color:#a8842a}
        .dname{font-weight:700;color:#23262c;line-height:1.35}

        /* ── bottom: note+digital signature | totals ── */
        .bottom{display:flex;gap:18px;margin-top:22px;align-items:stretch}
        .bleft{flex:1;display:flex;flex-direction:column;gap:14px}
        .notebx{border:1px solid #e9dfc6;background:#f7f1e2;border-radius:10px;padding:13px 15px;font-size:12px;color:#5c5344;line-height:1.6}
        .sig{border:1px solid #e3e6ec;border-radius:10px;padding:16px 18px;flex:1;display:flex;flex-direction:column;justify-content:flex-end}
        .dsig{border:1.5px dashed #c9a24d;background:#fdfaf2;border-radius:8px;padding:11px 13px;margin-bottom:12px}
        .dsigname{font-weight:800;font-size:14px;letter-spacing:1.5px;color:#a8842a}
        .dsigmeta{color:#5b626e;font-size:10.5px;line-height:1.65;margin-top:4px}
        .dsigmeta b{color:#23262c}
        .siglab{font-weight:800;font-size:12.5px;color:#23262c}
        .sigsub{color:#7b8290;font-size:11.5px}
        .bright{width:300px;flex-shrink:0}
        .tots{width:100%;border-collapse:collapse}
        .tots td{padding:6px 2px;font-size:13px}
        .tots .k{color:#7b8290}
        .tots .v{text-align:right;font-weight:700;color:#23262c}
        .tots .v.minus{color:#5b626e}
        .grand{display:flex;justify-content:space-between;align-items:center;border-top:2px solid #23262c;margin-top:8px;padding:12px 2px 10px}
        .grand .gk{font-size:16px;font-weight:800;color:#a8842a;letter-spacing:.4px}
        .grand .gv{font-size:19px;font-weight:800;color:#a8842a}
        .words{background:#f7f1e2;border:1px solid #e9dfc6;border-radius:8px;padding:10px 13px;margin-top:6px}
        .words .lab{color:#a8842a;font-size:9.5px;font-weight:800;letter-spacing:1.3px;margin-bottom:3px}
        .words .val{font-size:12px;font-weight:700;color:#23262c;line-height:1.5}

        /* ── footer strip ── */
        .fstrip{display:flex;justify-content:space-around;gap:16px;border:1px solid #e3e6ec;border-radius:10px;padding:14px 18px;margin-top:28px}
        .fitem{display:flex;align-items:center;gap:9px}
        .fic{width:30px;height:30px;border-radius:50%;background:#f7f1e2;border:1px solid #e9dfc6;display:flex;align-items:center;justify-content:center;font-size:13px}
        .flab{color:#a8842a;font-size:9.5px;font-weight:800;letter-spacing:1.2px}
        .fval{font-size:12px;font-weight:700;color:#23262c}
        .fsub{font-size:10.5px;color:#a9afba}
        .disc{text-align:center;color:#a9afba;font-size:10.5px;margin-top:16px}
        @media print{.sheet{padding:20px 24px}}
      </style></head><body>
      <div class="sheet">

        <!-- header -->
        <div class="top">
          <div>
            <img class="logo" src="/images/abhijit_art_logo.png" alt="Abhijit Art"/>
            <div class="addr">Rabindra Sadan, Shakti Mandir Club, SS Sen Road (Old Post Office Road), Berhampore, West Bengal - 742101, India</div>
            <div class="inforow"><span class="ilab">&#9742; PHONE</span><span class="ival">${CO_PHONE}</span></div>
            <div class="inforow"><span class="ilab">&#9993; EMAIL</span><span class="ival">${CO_EMAIL}</span></div>
            <div class="inforow"><span class="ilab">&#128196; PAN</span><span class="ival">${CO_PAN}</span></div>
            <div class="inforow"><span class="ilab">&#127970; GSTIN</span><span class="ival">${CO_GSTIN}</span></div>
          </div>
          <div class="doc">
            <div class="t">INVOICE</div>
            <div class="tbar"></div>
            <div class="invbox">
              <div class="lab">&#128196; INVOICE NO.</div>
              <div class="no">${INV}</div>
            </div>
            <table class="kv">
              <tr><td class="k">Invoice Date</td><td class="v">${fmtDateInv(invoiceMoment)}</td></tr>
              <tr><td class="k">Payment Terms</td><td class="v">${isDelivery ? "Cash on Delivery" : "Pay on Pickup"}</td></tr>
              <tr><td class="k">Status</td><td class="v gold">${statusLabel}</td></tr>
            </table>
          </div>
        </div>

        <!-- bill to / order details -->
        <div class="cards">
          <div class="cardbx">
            <div class="chead">&#128100; BILL TO</div>
            <div class="cname">${esc((user?.name || "Customer").toUpperCase())}</div>
            <div class="cmut">
              ${isDelivery && b.address ? esc(b.address) + "<br/>" : ""}
              ${b.contactPhone ? "Phone: " + esc(b.contactPhone) + "<br/>" : ""}
              ${user?.email ? esc(user.email) : ""}
            </div>
          </div>
          <div class="cardbx">
            <div class="chead">&#128203; ORDER DETAILS</div>
            <div class="crow"><span class="k">Order ID</span><span class="v">${ORD}</span></div>
            <div class="crow"><span class="k">Order Date</span><span class="v">${fmtDateInv(b.createdAt)}</span></div>
            <div class="crow"><span class="k">Invoice Date</span><span class="v">${fmtDateInv(invoiceMoment)}</span></div>
            <div class="crow"><span class="k">Fulfilment</span><span class="v">${fulfil}</span></div>
            <div class="crow"><span class="k">Status</span><span class="v gold">${statusLabel}</span></div>
          </div>
        </div>

        <!-- items -->
        <table class="items">
          <thead><tr>
            <th style="width:36px">#</th><th>Description</th>
            <th class="r" style="width:60px">Qty</th>
            <th class="r" style="width:110px">Rate (&#8377;)</th>
            <th class="r" style="width:120px">Amount (&#8377;)</th>
          </tr></thead>
          <tbody><tr>
            <td class="ctr">1</td>
            <td><div class="desc"><div class="thumb">${esc((b.service[0] || "?").toUpperCase())}</div><div class="dname">${esc(b.service)}</div></div></td>
            <td class="r">${b.quantity}</td>
            <td class="r">${rate ? money(rate) : "&mdash;"}</td>
            <td class="r"><b>${lineAmount ? money(lineAmount) : "&mdash;"}</b></td>
          </tr></tbody>
        </table>

        <!-- bottom -->
        <div class="bottom">
          <div class="bleft">
            ${b.notes ? `<div class="notebx"><b>Note:</b> ${esc(b.notes)}</div>` : ""}
            <div class="sig">
              <div class="dsig">
                <div class="dsigname">ABHIJIT ART</div>
                <div class="dsigmeta">
                  Digitally signed by <b>Abhijit Art</b><br/>
                  ${completedAt
                    ? `Order completed: <b>${fmtDateTimeInv(completedAt)}</b><br/>`
                    : ""}
                  Signed on: <b>${fmtDateTimeInv(invoiceMoment)}</b>
                </div>
              </div>
              <div class="siglab">Authorized Signatory</div>
              <div class="sigsub">Abhijit Art &middot; Berhampore, West Bengal</div>
            </div>
          </div>
          <div class="bright">
            <table class="tots">
              <tr><td class="k">Subtotal</td><td class="v">${lineAmount ? rupee(lineAmount) : "&mdash;"}</td></tr>
              ${discAmt > 0 ? `<tr><td class="k">${discLabel}</td><td class="v minus">&minus; ${rupee(discAmt)}</td></tr>` : ""}
              ${taxAmt > 0 ? `<tr><td class="k">GST (${taxPct}%)</td><td class="v">${rupee(taxAmt)}</td></tr>` : ""}
            </table>
            <div class="grand">
              <span class="gk">TOTAL</span>
              <span class="gv">${amount ? rupee(amount) : "To be confirmed"}</span>
            </div>
            ${words ? `<div class="words"><div class="lab">AMOUNT IN WORDS</div><div class="val">${words}</div></div>` : ""}
          </div>
        </div>

        <!-- footer strip -->
        <div class="fstrip">
          <div class="fitem"><div class="fic">&#9993;</div><div><div class="flab">EMAIL US</div><div class="fval">${CO_EMAIL}</div></div></div>
          <div class="fitem"><div class="fic">&#9742;</div><div><div class="flab">CALL US</div><div class="fval">${CO_PHONE}</div><div class="fsub">Mon&ndash;Sat &middot; 10 AM &ndash; 7 PM</div></div></div>
          <div class="fitem"><div class="fic">&#127760;</div><div><div class="flab">VISIT US</div><div class="fval">Abhijit Art, Berhampore</div></div></div>
        </div>

        <div class="disc">
          ${finalTotal
            ? "This is a computer-generated invoice, digitally signed &mdash; no physical signature required."
            : "This is an estimate &mdash; final pricing is confirmed by our team once the request is reviewed. Computer-generated, no physical signature required."}
        </div>
      </div>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 320);
  };

  /* ── states ── */
  if (loading) {
    return (
      <div style={st.page}>
        <div style={st.wrap}>
          <div className="bd-skel" style={{ ...st.skel, height: 40, width: 200, marginBottom: 24 }} />
          <div className="bd-layout" style={st.layout}>
            <div className="bd-skel" style={{ ...st.skel, height: 360 }} />
            <div className="bd-skel" style={{ ...st.skel, height: 300 }} />
          </div>
        </div>
        <Style />
      </div>
    );
  }
  if (error || !b) {
    return (
      <div style={st.page}>
        <div style={{ ...st.wrap, textAlign: "center" }}>
          <span style={{ ...st.stateIcon, color: SLATE, background: SLATEBG }}>
            <Icon name="alert" size={26} />
          </span>
          <h2 style={st.stateTitle}>{error || "Booking not found"}</h2>
          <button className="bd-back" style={st.backBtn} onClick={() => navigate("/my-bookings")}>
            <Icon name="back" size={16} /> Back to My Bookings
          </button>
        </div>
        <Style />
      </div>
    );
  }

  const cat = category(b.statusKey);
  const meta = CAT_META[cat];
  const statusLabel = cat === "other" ? titleCase(b.statusKey) : meta.label;

  const steps =
    cat === "cancelled"
      ? [
          { label: "Requested", sub: fmtDate(b.createdAt), done: true, bad: false },
          { label: "Cancelled", sub: "", done: true, bad: true },
        ]
      : [
          { label: "Requested", sub: fmtDate(b.createdAt), done: true, bad: false },
          { label: "Confirmed", sub: "", done: cat === "confirmed" || cat === "completed", bad: false },
          { label: "Completed", sub: "", done: cat === "completed", bad: false },
        ];

  /* confirmed total (admin-set) beats the priceFrom estimate */
  const finalTotal = b.totalAmount;                          // null until admin confirms with a value
  const estUnit = price ?? 0;
  const estTotal = estUnit * b.quantity;
  /* prefer the rate the admin actually charged — inferring it from the total is
     wrong the moment a discount or GST is involved */
  const unitFinal =
    b.unitRate ??
    (finalTotal && b.quantity > 0 && finalTotal % b.quantity === 0 ? finalTotal / b.quantity : null);
  const priced = (b.subtotal ?? 0) > 0;

  return (
    <div style={st.page}>
      <div style={st.wrap}>
        <button className="bd-back" style={st.backLink} onClick={() => navigate("/my-bookings")}>
          <Icon name="back" size={16} /> My Bookings
        </button>

        <div className="bd-layout" style={st.layout}>
          {/* ── main column ── */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* header + timeline */}
            <section style={st.card}>
              <div style={st.headRow}>
                <div style={st.thumb}>
                  {icon ? <span style={st.thumbEmoji}>{icon}</span> : <span style={st.thumbInitial}>{(b.service[0] || "?").toUpperCase()}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={st.svcName}>{b.service}</h1>
                  <p style={st.provider}>Service by <strong>Abhijit Art</strong></p>
                  <p style={st.orderId}>Booking #{b.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <span style={{ ...st.badge, color: meta.fg, background: meta.bg }}>
                  <span style={{ ...st.badgeDot, background: meta.bar }} />
                  {statusLabel}
                </span>
              </div>

              <div style={st.divider} />

              {/* timeline — gold for done, silver for pending / cancelled */}
              <div style={st.timeline}>
                {steps.map((s, i) => {
                  const color = s.bad ? SLATE : s.done ? GOLD : "#ccd1d9";
                  return (
                    <div key={s.label} style={st.tStep}>
                      <div style={st.tRail}>
                        <span style={{ ...st.tDot, background: s.done ? color : "#fff", borderColor: color }}>
                          {s.done && <Icon name={s.bad ? "x" : "check"} size={13} />}
                        </span>
                        {i < steps.length - 1 && (
                          <span style={{ ...st.tLine, background: steps[i + 1].done ? GOLD : LINE }} />
                        )}
                      </div>
                      <div style={{ paddingBottom: i < steps.length - 1 ? 22 : 0 }}>
                        <p style={{ ...st.tLabel, color: s.done ? INK : FAINT }}>{s.label}</p>
                        {s.sub && <p style={st.tSub}>{s.sub}</p>}
                        {s.label === "Requested" && <p style={st.tSub}>{fmtDateTime(b.createdAt)}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(b.notes || b.designLink) && (
                <>
                  <div style={st.divider} />
                  {b.notes && (
                    <div style={st.noteBox}>
                      <span style={{ color: FAINT }}><Icon name="note" size={15} /></span>
                      <p style={st.noteText}>“{b.notes}”</p>
                    </div>
                  )}
                  {b.designLink && (
                    <a href={b.designLink} target="_blank" rel="noreferrer" className="bd-file" style={st.file}>
                      <Icon name="link" size={14} /> View attached design file
                    </a>
                  )}
                </>
              )}
            </section>

            {/* rating */}
            <section style={{ ...st.card, marginTop: 16 }}>
              <h2 style={st.cardTitle}>Rate your experience</h2>
              <p style={st.cardSub}>
                {rateErr
                  ? rateErr
                  : rated
                  ? "Thanks for your feedback!"
                  : cat === "completed"
                  ? "Tap a star to rate this service."
                  : "You can rate this once your order is completed."}
              </p>
              <div style={st.stars} onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className="bd-star"
                    style={{ ...st.starBtn, ...(cat === "completed" ? null : st.starOff) }}
                    onMouseEnter={() => cat === "completed" && setHover(n)}
                    onClick={() => cat === "completed" && submitRating(n)}
                    disabled={cat !== "completed"}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  >
                    <Star filled={(hover || rating) >= n} />
                  </button>
                ))}
              </div>
            </section>
          </motion.div>

          {/* ── right column ── */}
          <motion.aside
            style={st.side}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            {/* delivery / pickup */}
            <section style={st.card}>
              <h2 style={st.cardTitle}>{b.delivery === "delivery" ? "Delivery details" : "Pickup details"}</h2>
              <div style={st.kv}>
                <span style={{ color: GOLDD }}><Icon name={b.delivery === "delivery" ? "truck" : "store"} size={17} /></span>
                <div>
                  <p style={st.kvMain}>{titleCase(b.delivery || "pickup")}</p>
                  {b.delivery === "delivery" ? (
                    <p style={st.kvSub}>{b.address || "Address to be shared"}</p>
                  ) : (
                    <p style={st.kvSub}>Collect from Abhijit Art, Durgapur</p>
                  )}
                </div>
              </div>
              <div style={st.kv}>
                <span style={{ color: GOLDD }}><Icon name="user" size={17} /></span>
                <div>
                  <p style={st.kvMain}>{user?.name || "You"}</p>
                  {b.contactPhone && <p style={st.kvSub}>{b.contactPhone}</p>}
                </div>
              </div>
              {b.preferredDate && (
                <div style={st.kv}>
                  <span style={{ color: GOLDD }}><Icon name="clock" size={17} /></span>
                  <div>
                    <p style={st.kvMain}>Preferred date</p>
                    <p style={st.kvSub}>{fmtDate(b.preferredDate)}</p>
                  </div>
                </div>
              )}
            </section>

            {/* invoice summary — confirmed total wins over estimate */}
            <section style={{ ...st.card, marginTop: 16 }}>
              <h2 style={st.cardTitle}>Booking summary</h2>
              <div style={st.line}>
                <span style={st.lineLabel}>{b.service}</span>
                <span style={st.lineVal}>
                  {unitFinal ? rupee(unitFinal) : finalTotal ? rupee(finalTotal) : estUnit ? rupee(estUnit) : "—"}
                </span>
              </div>
              <div style={st.line}>
                <span style={st.lineLabel}>Quantity</span>
                <span style={st.lineVal}>× {b.quantity}</span>
              </div>
              <div style={st.line}>
                <span style={st.lineLabel}>Fulfilment</span>
                <span style={st.lineVal}>{titleCase(b.delivery || "pickup")}</span>
              </div>

              {/* the same breakdown the invoice prints — only once priced */}
              {priced && (
                <>
                  <div style={st.line}>
                    <span style={st.lineLabel}>Subtotal</span>
                    <span style={st.lineVal}>{rupee(b.subtotal!)}</span>
                  </div>
                  {(b.discountAmount ?? 0) > 0 && (
                    <div style={st.line}>
                      <span style={st.lineLabel}>
                        Discount
                        {b.discountType === "percent" && (b.discountValue ?? 0) > 0 ? ` (${b.discountValue}%)` : ""}
                      </span>
                      <span style={{ ...st.lineVal, color: SLATE }}>− {rupee(b.discountAmount!)}</span>
                    </div>
                  )}
                  {(b.taxAmount ?? 0) > 0 && (
                    <div style={st.line}>
                      <span style={st.lineLabel}>GST ({b.taxPercent}%)</span>
                      <span style={st.lineVal}>{rupee(b.taxAmount!)}</span>
                    </div>
                  )}
                </>
              )}

              <div style={st.totalRow}>
                <span>{finalTotal ? "Total" : "Estimated total"}</span>
                <span style={{ color: GOLDD }}>
                  {finalTotal ? rupee(finalTotal) : estUnit ? rupee(estTotal) : "To be confirmed"}
                </span>
              </div>
              <p style={st.estNote}>
                {finalTotal
                  ? "Order total confirmed by our team."
                  : estUnit
                  ? "Estimated from the service's starting price — final amount confirmed on approval."
                  : "Final pricing is confirmed by our team once the request is reviewed."}
              </p>
              <button className="bd-invoice" style={st.invoiceBtn} onClick={downloadInvoice}>
                <Icon name="download" size={16} /> Download invoice
              </button>
            </section>
          </motion.aside>
        </div>
      </div>
      <Style />
    </div>
  );
}

/* scoped hover/motion css */
function Style() {
  return (
    <style>{`
      /* Avenir Next LT Pro — uses the locally installed font if present,
         otherwise falls back to files in public/fonts/. */
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

      .bd-back, .bd-file, .bd-invoice, .bd-star { transition: all .2s ease; }
      .bd-back:hover { color: ${GOLDD}; }
      .bd-file:hover { color: ${GOLDD}; }
      .bd-invoice:hover { background: ${GOLDBG}; border-color: ${GOLD}; }
      .bd-star { cursor: pointer; }
      .bd-star:hover { transform: scale(1.12); }
      .bd-star:disabled { cursor: default; }
      .bd-star:disabled:hover { transform: none; }
      .bd-skel { background: linear-gradient(100deg,#e9ebef 30%,#f4f5f7 50%,#e9ebef 70%); background-size:220% 100%; animation: bdSh 1.3s ease-in-out infinite; }
      @keyframes bdSh { 0%{background-position:100% 0} 100%{background-position:-120% 0} }
      @media (max-width: 880px) { .bd-layout { grid-template-columns: 1fr !important; } }
      @media (prefers-reduced-motion: reduce) { .bd-back,.bd-file,.bd-invoice,.bd-star { transition:none !important } .bd-skel{animation:none !important} }
    `}</style>
  );
}

/* ───────────────────────── styles ───────────────────────── */
const st: Record<string, React.CSSProperties> = {
  page: { background: SILVER, minHeight: "100vh", color: INK, fontFamily: FONT },
  /* full-width — no max-width container, small edge padding only */
  wrap: { width: "100%", boxSizing: "border-box", padding: "clamp(20px, 3vw, 40px) clamp(14px, 2vw, 28px) 64px" },
  backLink: { display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 18, border: "none", background: "transparent", color: MUTE, fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: 0 },
  layout: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 22, alignItems: "start" },

  card: { background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: "22px 24px", boxShadow: "0 6px 20px rgba(35,38,44,.05)" },
  cardTitle: { fontFamily: FONT, fontSize: 17, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.2 },
  cardSub: { color: MUTE, fontSize: 13.5, margin: "0 0 16px" },
  divider: { height: 1, background: LINE, margin: "20px 0" },

  headRow: { display: "flex", alignItems: "flex-start", gap: 16 },
  thumb: { width: 64, height: 64, flexShrink: 0, borderRadius: 14, display: "grid", placeItems: "center", background: `linear-gradient(135deg, ${GOLD}26, ${SILVER})`, border: `1px solid #e9dfc6` },
  thumbEmoji: { fontSize: 30, lineHeight: 1 },
  thumbInitial: { fontFamily: FONT, fontSize: 26, fontWeight: 700, color: GOLDD },
  svcName: { fontFamily: FONT, fontSize: 23, fontWeight: 700, letterSpacing: -0.4, margin: 0, lineHeight: 1.15 },
  provider: { color: MUTE, fontSize: 13.5, margin: "6px 0 0" },
  orderId: { color: FAINT, fontSize: 12.5, margin: "3px 0 0", letterSpacing: 0.3 },
  badge: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 },
  badgeDot: { width: 7, height: 7, borderRadius: "50%" },

  timeline: { display: "flex", flexDirection: "column" },
  tStep: { display: "flex", gap: 14 },
  tRail: { display: "flex", flexDirection: "column", alignItems: "center" },
  tDot: { width: 24, height: 24, borderRadius: "50%", border: "2px solid", display: "grid", placeItems: "center", color: "#fff", flexShrink: 0 },
  tLine: { width: 2, flex: 1, marginTop: 2, minHeight: 22 },
  tLabel: { fontSize: 15, fontWeight: 700, margin: 0 },
  tSub: { fontSize: 12.5, color: FAINT, margin: "2px 0 0" },

  noteBox: { display: "flex", gap: 9, padding: "12px 14px", background: SILVER, border: `1px solid ${LINE}`, borderRadius: 12 },
  noteText: { margin: 0, fontSize: 13.5, color: "#565c66", lineHeight: 1.55, fontStyle: "italic", wordBreak: "break-word" },
  file: { display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 13.5, fontWeight: 700, color: GOLDD, textDecoration: "none" },

  stars: { display: "flex", gap: 6 },
  starBtn: { border: "none", background: "transparent", padding: 2, lineHeight: 0 },
  starOff: { opacity: 0.5 },

  side: {},
  kv: { display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: `1px solid ${LINE}` },
  kvMain: { fontSize: 14, fontWeight: 700, margin: 0, color: INK },
  kvSub: { fontSize: 13, color: MUTE, margin: "2px 0 0", lineHeight: 1.5, wordBreak: "break-word" },

  line: { display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", fontSize: 14 },
  lineLabel: { color: MUTE },
  lineVal: { color: INK, fontWeight: 600 },
  totalRow: { display: "flex", justifyContent: "space-between", gap: 12, marginTop: 8, paddingTop: 14, borderTop: `1px solid ${LINE}`, fontSize: 16, fontWeight: 800 },
  estNote: { fontSize: 11.5, color: FAINT, lineHeight: 1.5, margin: "12px 0 16px" },
  invoiceBtn: { width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", borderRadius: 12, border: `1px solid ${LINE}`, background: CARD, color: INK, fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer" },

  skel: { borderRadius: 16, border: `1px solid ${LINE}` },
  stateIcon: { width: 64, height: 64, borderRadius: 18, display: "grid", placeItems: "center", margin: "40px auto 18px" },
  stateTitle: { fontFamily: FONT, fontSize: 23, fontWeight: 700, margin: "0 0 22px" },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 12, border: "none", background: GOLDD, color: "#fff", fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer" },
};