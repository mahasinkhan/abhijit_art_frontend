// src/components/PaymentReminders.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";

/* ══════════════════════════════════════════════════════════════
   PAYMENT REMINDERS  ·  outstanding-balance worklist

   A dedicated tab that lists every invoice still carrying a balance
   due (unpaid / partial — paid & cancelled are hidden) and lets you
   nudge the client to clear it, one of two ways:

     • Send email   → premium branded reminder + the invoice PDF attached
                      (built server-side from the stored bill)
     • Send WhatsApp → opens wa.me with the note + amount + a link to the
                      invoice PDF pre-filled

   The editable field is a short PERSONAL NOTE (no figures). The email
   renders the amount in a styled card and attaches the PDF; WhatsApp gets
   the figures + a signed PDF link appended automatically here. Either
   channel records lastRemindedAt + bumps reminderCount on the invoice
   (audited server-side), so you can see who was reminded when and avoid
   double-nudging. Read-only on money — this tab never edits an amount, so
   it needs no PIN.

   Same design system as InvoiceMaker / Invoices / Inventory:
   DM Sans, square corners, warm orange-glow cards, hairline borders,
   tabular figures. CSS prefix: pr-.

   Backend contract (invoiceRoutes.ts):
     POST /api/invoices/:id/remind
       body { channel: "email" | "whatsapp", subject?, message? }
       → email sends the mail (+ PDF), whatsapp just records; both update
         lastRemindedAt/reminderCount and return the updated invoice.
     GET  /api/invoices  → each invoice carries a signed `pdfUrl` (or null).
   ════════════════════════════════════════════════════════════════ */

/* ---------- tokens (mirror the rest of the admin) ---------- */
const T = {
  ivory: "#f7f3ea",
  paper: "#fffdf8",
  ink: "#2a231d",
  sub: "#6f6357",
  faint: "#9a8f81",
  terra: "#d9542f",
  terraDeep: "#b8431f",
  gold: "#c2974a",
  line: "#e7ddcb",
  lineSoft: "#efe7d8",
  ok: "#3f7d54",
  okBg: "#eaf3ec",
};
const FONT =
  "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/* ---------- types ---------- */
type PaymentMethod = "cash" | "online";
type InvoiceStatus = "unpaid" | "partial" | "paid" | "cancelled";
type CustomerSource = "online" | "offline";

interface Payment {
  id: string;
  amount: number | string;
  method: PaymentMethod;
  createdAt: string;
}
interface Business {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  pan?: string;
}
interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientGstin?: string | null;
  clientAddr?: string | null;
  source: CustomerSource;
  business?: Business | null;
  items?: unknown;
  total: number | string;
  paidAmount: number | string;
  status: InvoiceStatus;
  payments?: Payment[];
  lastRemindedAt?: string | null;
  reminderCount?: number;
  notes?: string | null;
  pdfUrl?: string | null; // signed, public link to the invoice PDF (or null)
}

/* ---------- money / number helpers ---------- */
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const inr = (n: number) =>
  "₹" +
  round2(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const inr0 = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const balanceOf = (inv: Invoice) => round2(num(inv.total) - num(inv.paidAmount));

/* ---------- date helpers ---------- */
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(+d)) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function relTime(iso?: string | null) {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (isNaN(+d)) return "Never";
  const diff = Date.now() - d.getTime();
  const day = 86400000;
  const days = Math.floor(diff / day);
  if (diff < 3600000)
    return Math.max(1, Math.floor(diff / 60000)) + " min ago";
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return days + " days ago";
  const months = Math.floor(days / 30);
  if (months < 12) return months + (months === 1 ? " month ago" : " months ago");
  return fmtDate(iso);
}
function ageDays(iso?: string | null) {
  if (!iso) return 0;
  const d = new Date(iso);
  if (isNaN(+d)) return 0;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

/* ---------- WhatsApp link (Indian numbers) ---------- */
function waLink(phone: string | null | undefined, text: string) {
  let d = (phone || "").replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;
  else if (d.length === 11 && d.startsWith("0")) d = "91" + d.slice(1);
  else if (d.length === 12 && d.startsWith("91")) {
    /* already fine */
  } else if (d.length > 12 && d.startsWith("91")) d = d.slice(0, 12);
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

/* ---------- reminder copy ---------- */
function firstName(full: string) {
  const p = (full || "").trim().split(/\s+/)[0];
  return p || "there";
}
function bizName(inv: Invoice) {
  return inv.business?.name?.trim() || "Abhijit Art";
}

/* short PERSONAL NOTE (no figures) — the email shows the amount in a card,
   WhatsApp appends the figures below via balanceBlock() */
function defaultNote(inv: Invoice) {
  const name = firstName(inv.clientName);
  const b = bizName(inv);
  return `Hi ${name}, this is a gentle reminder from ${b} about the invoice below. Whenever it's convenient, we'd appreciate it if you could clear the outstanding balance. Thank you for your business!`;
}

/* the figures block appended to the WhatsApp message (WhatsApp is plain text,
   so it can't show the styled card the email uses). Includes the signed PDF
   link when the backend provided one. */
function balanceBlock(inv: Invoice) {
  const bal = balanceOf(inv);
  let s =
    `Invoice ${inv.invoiceNo} (${fmtDate(inv.date)})\n` +
    `Amount due: ${inr(bal)}\n` +
    `Invoice total ${inr(num(inv.total))} · Received ${inr(num(inv.paidAmount))}`;
  if (inv.pdfUrl) s += `\n\n📄 Invoice PDF: ${inv.pdfUrl}`;
  return s;
}

function defaultSubject(inv: Invoice) {
  return `Payment reminder — invoice ${inv.invoiceNo}`;
}

/* ═══════════════════════════ component ═══════════════════════════ */
export default function PaymentReminders() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "todo" | "done">("all");
  const [sort, setSort] = useState<"oldest" | "due" | "recent">("oldest");

  // reminder modal
  const [openId, setOpenId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState<null | "email" | "whatsapp">(null);
  const [modalErr, setModalErr] = useState("");
  const [modalNote, setModalNote] = useState("");
  const [okAnim, setOkAnim] = useState<null | "email" | "whatsapp">(null);
  const okTimer = useRef<number | null>(null);

  /* ---- load ---- */
  async function load(initial = false) {
    if (!initial) setRefreshing(true);
    setErr("");
    try {
      const { data } = await api.get<Invoice[]>("/api/invoices");
      setInvoices(Array.isArray(data) ? data : []);
    } catch {
      setErr("Couldn't load invoices. Check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => {
    load(true);
    return () => {
      if (okTimer.current) window.clearTimeout(okTimer.current);
    };
  }, []);

  /* ---- outstanding, filtered, sorted ---- */
  const outstanding = useMemo(
    () =>
      invoices.filter(
        (i) =>
          i.status !== "paid" &&
          i.status !== "cancelled" &&
          balanceOf(i) > 0.005
      ),
    [invoices]
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = outstanding.filter((i) => {
      if (tab === "todo" && (i.reminderCount || 0) > 0) return false;
      if (tab === "done" && (i.reminderCount || 0) === 0) return false;
      if (!needle) return true;
      return (
        i.clientName?.toLowerCase().includes(needle) ||
        (i.clientPhone || "").toLowerCase().includes(needle) ||
        (i.clientEmail || "").toLowerCase().includes(needle) ||
        i.invoiceNo?.toLowerCase().includes(needle)
      );
    });
    list = [...list].sort((a, b) => {
      if (sort === "due") return balanceOf(b) - balanceOf(a);
      if (sort === "recent") {
        const ta = a.lastRemindedAt ? +new Date(a.lastRemindedAt) : 0;
        const tb = b.lastRemindedAt ? +new Date(b.lastRemindedAt) : 0;
        return tb - ta;
      }
      // oldest invoice first — chase the stalest debts
      return +new Date(a.date) - +new Date(b.date);
    });
    return list;
  }, [outstanding, q, tab, sort]);

  /* ---- stat cards ---- */
  const stats = useMemo(() => {
    const totalDue = outstanding.reduce((s, i) => s + balanceOf(i), 0);
    const notReminded = outstanding.filter(
      (i) => (i.reminderCount || 0) === 0
    ).length;
    const reminded = outstanding.length - notReminded;
    return {
      count: outstanding.length,
      totalDue: round2(totalDue),
      notReminded,
      reminded,
    };
  }, [outstanding]);

  const current = openId ? invoices.find((i) => i.id === openId) || null : null;

  /* ---- modal open/close ---- */
  function openRemind(inv: Invoice) {
    setOpenId(inv.id);
    setSubject(defaultSubject(inv));
    setMessage(defaultNote(inv));
    setSending(null);
    setModalErr("");
    setModalNote("");
    setOkAnim(null);
  }
  function closeModal() {
    if (sending) return;
    setOpenId(null);
    setOkAnim(null);
    setModalErr("");
    setModalNote("");
    if (okTimer.current) window.clearTimeout(okTimer.current);
  }
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, sending]);

  function applyUpdated(updated: Invoice) {
    setInvoices((list) =>
      list.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
    );
  }
  function flashSuccess(kind: "email" | "whatsapp") {
    setOkAnim(kind);
    if (okTimer.current) window.clearTimeout(okTimer.current);
    okTimer.current = window.setTimeout(() => {
      setOpenId(null);
      setOkAnim(null);
    }, 1500);
  }

  /* ---- send email ---- */
  async function sendEmail() {
    if (!current || sending) return;
    if (!current.clientEmail) {
      setModalErr("No email on file for this client — use WhatsApp instead.");
      return;
    }
    setSending("email");
    setModalErr("");
    setModalNote("");
    try {
      const { data } = await api.post<Invoice>(
        `/api/invoices/${current.id}/remind`,
        { channel: "email", subject, message }
      );
      if (data && data.id) applyUpdated(data);
      flashSuccess("email");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Couldn't send the email. Please try again.";
      setModalErr(msg);
    } finally {
      setSending(null);
    }
  }

  /* ---- send WhatsApp (open link first, then record) ---- */
  async function sendWhatsApp() {
    if (!current || sending) return;
    if (!current.clientPhone) {
      setModalErr("No phone number on file for this client.");
      return;
    }
    // WhatsApp is plain text — append the figures (+ PDF link) under the note
    const waText = `${message}\n\n${balanceBlock(current)}`;
    // open with the user gesture so the popup isn't blocked
    window.open(waLink(current.clientPhone, waText), "_blank", "noopener");
    setSending("whatsapp");
    setModalErr("");
    setModalNote("");
    try {
      const { data } = await api.post<Invoice>(
        `/api/invoices/${current.id}/remind`,
        { channel: "whatsapp", message }
      );
      if (data && data.id) applyUpdated(data);
      flashSuccess("whatsapp");
    } catch {
      // WhatsApp already opened — just couldn't log it
      setModalNote(
        "Opened WhatsApp, but couldn't log the reminder. Send the message, then Refresh."
      );
    } finally {
      setSending(null);
    }
  }

  /* ---- CSV export ---- */
  function exportCsv() {
    const head = [
      "Invoice No",
      "Date",
      "Client",
      "Phone",
      "Email",
      "Total",
      "Received",
      "Balance Due",
      "Status",
      "Reminders Sent",
      "Last Reminded",
    ];
    const lines = rows.map((i) =>
      [
        i.invoiceNo,
        fmtDate(i.date),
        i.clientName,
        i.clientPhone || "",
        i.clientEmail || "",
        round2(num(i.total)),
        round2(num(i.paidAmount)),
        balanceOf(i),
        i.status,
        i.reminderCount || 0,
        i.lastRemindedAt ? fmtDate(i.lastRemindedAt) : "Never",
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [head.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-reminders-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ═══════════════════════════ render ═══════════════════════════ */
  return (
    <div className="pr-root">
      <style>{CSS}</style>

      {/* header row */}
      <div className="pr-head">
        <div>
          <h2 className="pr-title">Payment reminders</h2>
          <p className="pr-lead">
            Invoices still carrying a balance. Nudge clients by email or
            WhatsApp — settled and cancelled bills drop off automatically.
          </p>
        </div>
        <div className="pr-head-actions">
          <button
            className="pr-btn ghost"
            onClick={() => load(false)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            className="pr-btn ghost"
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* stat cards */}
      <div className="pr-stats">
        <Stat label="Outstanding" value={String(stats.count)} sub="invoices" />
        <Stat
          label="Total due"
          value={inr0(stats.totalDue)}
          sub="across all clients"
          accent
        />
        <Stat
          label="Not reminded"
          value={String(stats.notReminded)}
          sub="need a first nudge"
        />
        <Stat
          label="Reminded"
          value={String(stats.reminded)}
          sub="already contacted"
        />
      </div>

      {/* toolbar */}
      <div className="pr-toolbar">
        <div className="pr-search">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path
              d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone or invoice no"
          />
        </div>

        <div className="pr-seg" role="tablist" aria-label="Filter">
          {(
            [
              ["all", "All"],
              ["todo", "Not reminded"],
              ["done", "Reminded"],
            ] as const
          ).map(([k, lbl]) => (
            <button
              key={k}
              className={"pr-seg-btn" + (tab === k ? " on" : "")}
              onClick={() => setTab(k)}
            >
              {lbl}
            </button>
          ))}
        </div>

        <select
          className="pr-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          aria-label="Sort"
        >
          <option value="oldest">Oldest first</option>
          <option value="due">Highest due</option>
          <option value="recent">Recently reminded</option>
        </select>
      </div>

      {/* table / states */}
      {loading ? (
        <div className="pr-card pr-state">Loading outstanding invoices…</div>
      ) : err ? (
        <div className="pr-card pr-state err">{err}</div>
      ) : rows.length === 0 ? (
        <div className="pr-card pr-state empty">
          {outstanding.length === 0 ? (
            <>
              <div className="pr-empty-mark">✓</div>
              <strong>All settled.</strong>
              <span>No invoices have a balance due right now.</span>
            </>
          ) : (
            <>
              <strong>Nothing matches that filter.</strong>
              <span>Try clearing the search or switching tabs.</span>
            </>
          )}
        </div>
      ) : (
        <div className={"pr-card pr-tablewrap" + (refreshing ? " dim" : "")}>
          <table className="pr-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th className="r">Total</th>
                <th className="r">Received</th>
                <th className="r">Balance due</th>
                <th>Last reminded</th>
                <th className="r">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const bal = balanceOf(i);
                const overdue = ageDays(i.date) >= 30;
                const cnt = i.reminderCount || 0;
                return (
                  <tr key={i.id}>
                    <td>
                      <div className="pr-inv">{i.invoiceNo}</div>
                      <div className="pr-muted">
                        {fmtDate(i.date)}
                        {overdue && <span className="pr-old">{ageDays(i.date)}d old</span>}
                      </div>
                    </td>
                    <td>
                      <div className="pr-name">{i.clientName}</div>
                      <div className="pr-muted">
                        {i.clientPhone || "no phone"}
                        {" · "}
                        <span
                          className={
                            "pr-src " + (i.source === "online" ? "on" : "off")
                          }
                        >
                          {i.source === "online" ? "Online" : "Walk-in"}
                        </span>
                      </div>
                    </td>
                    <td className="r num">{inr(num(i.total))}</td>
                    <td className="r num">{inr(num(i.paidAmount))}</td>
                    <td className="r num due">{inr(bal)}</td>
                    <td>
                      <span className={"pr-when " + (cnt ? "sent" : "never")}>
                        {relTime(i.lastRemindedAt)}
                      </span>
                      {cnt > 0 && (
                        <span className="pr-cnt">
                          {cnt} {cnt === 1 ? "reminder" : "reminders"}
                        </span>
                      )}
                    </td>
                    <td className="r">
                      <button
                        className="pr-btn solid sm"
                        onClick={() => openRemind(i)}
                      >
                        Remind
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* reminder modal */}
      {current && (
        <div className="pr-overlay" onMouseDown={closeModal}>
          <div
            className="pr-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {okAnim ? (
              <SuccessPanel kind={okAnim} />
            ) : (
              <>
                <div className="pr-m-head">
                  <div>
                    <h3>Send reminder</h3>
                    <p>
                      {current.clientName} · {current.invoiceNo}
                    </p>
                  </div>
                  <button className="pr-x" onClick={closeModal} aria-label="Close">
                    ✕
                  </button>
                </div>

                <div className="pr-money">
                  <div>
                    <span>Total</span>
                    <strong>{inr(num(current.total))}</strong>
                  </div>
                  <div>
                    <span>Received</span>
                    <strong>{inr(num(current.paidAmount))}</strong>
                  </div>
                  <div className="due">
                    <span>Balance due</span>
                    <strong>{inr(balanceOf(current))}</strong>
                  </div>
                </div>

                <div className="pr-lastline">
                  {current.reminderCount
                    ? `Last reminded ${relTime(
                        current.lastRemindedAt
                      ).toLowerCase()} · ${current.reminderCount} sent so far`
                    : "Not reminded yet."}
                </div>

                <label className="pr-lbl">Email subject</label>
                <input
                  className="pr-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={!!sending}
                />

                <label className="pr-lbl">Personal note</label>
                <textarea
                  className="pr-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  disabled={!!sending}
                />
                <div className="pr-hint">
                  Shown above the amount summary in the email (which also attaches
                  the invoice PDF). WhatsApp adds the amount details
                  {current.pdfUrl ? " and a link to the invoice PDF" : ""}{" "}
                  automatically.
                </div>

                {modalErr && <div className="pr-alert err">{modalErr}</div>}
                {modalNote && <div className="pr-alert note">{modalNote}</div>}

                <div className="pr-m-actions">
                  <button
                    className="pr-btn solid"
                    onClick={sendEmail}
                    disabled={!!sending || !current.clientEmail}
                    title={
                      current.clientEmail
                        ? "Send branded email with the invoice PDF attached"
                        : "No email on file"
                    }
                  >
                    {sending === "email" ? "Sending…" : "Send email"}
                  </button>
                  <button
                    className="pr-btn wa"
                    onClick={sendWhatsApp}
                    disabled={!!sending || !current.clientPhone}
                    title={
                      current.clientPhone
                        ? "Open WhatsApp with the message ready"
                        : "No phone on file"
                    }
                  >
                    {sending === "whatsapp" ? "Opening…" : "Send on WhatsApp"}
                  </button>
                </div>
                {!current.clientEmail && (
                  <div className="pr-hint dim">
                    No email on file — WhatsApp only for this client.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- stat card ---------- */
function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={"pr-card pr-stat" + (accent ? " accent" : "")}>
      <span className="pr-stat-label">{label}</span>
      <span className="pr-stat-value">{value}</span>
      {sub && <span className="pr-stat-sub">{sub}</span>}
    </div>
  );
}

/* ---------- success panel (checkmark draw) ---------- */
function SuccessPanel({ kind }: { kind: "email" | "whatsapp" }) {
  return (
    <div className="pr-success">
      <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden>
        <circle className="pr-ring" cx="36" cy="36" r="32" />
        <path className="pr-tick" d="M22 37.5l9.5 9.5L51 27" />
      </svg>
      <strong>
        {kind === "email" ? "Reminder emailed" : "Reminder logged"}
      </strong>
      <span>
        {kind === "email"
          ? "The client has been sent a branded reminder with the invoice PDF."
          : "WhatsApp opened — send the message to finish."}
      </span>
    </div>
  );
}

/* ═══════════════════════════ styles ═══════════════════════════ */
const CSS = `
.pr-root{font-family:${FONT};color:${T.ink};font-variant-numeric:tabular-nums;}
.pr-root *{box-sizing:border-box;}

.pr-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:18px;}
.pr-title{margin:0;font-size:22px;font-weight:700;letter-spacing:-.01em;}
.pr-lead{margin:4px 0 0;color:${T.sub};font-size:13.5px;max-width:560px;line-height:1.5;}
.pr-head-actions{display:flex;gap:8px;}

/* cards */
.pr-card{
  position:relative;background:${T.paper};border:1px solid ${T.line};border-radius:0;
  background-image:radial-gradient(120% 120% at 0% 0%, rgba(217,84,47,.06) 0%, rgba(217,84,47,0) 42%);
  box-shadow:0 1px 2px rgba(217,84,47,.05),0 8px 22px -18px rgba(90,50,20,.35);
}

/* stats */
.pr-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;}
.pr-stat{padding:16px 16px 14px;display:flex;flex-direction:column;gap:2px;}
.pr-stat-label{font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;color:${T.faint};font-weight:600;}
.pr-stat-value{font-size:26px;font-weight:700;letter-spacing:-.01em;line-height:1.15;}
.pr-stat-sub{font-size:12px;color:${T.sub};}
.pr-stat.accent .pr-stat-value{color:${T.terra};}
.pr-stat.accent{border-color:#f0cbbb;}

/* toolbar */
.pr-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px;}
.pr-search{display:flex;align-items:center;gap:8px;background:${T.paper};border:1px solid ${T.line};padding:0 12px;height:38px;flex:1;min-width:220px;color:${T.faint};}
.pr-search input{border:0;outline:0;background:transparent;font-family:${FONT};font-size:14px;color:${T.ink};width:100%;}
.pr-seg{display:inline-flex;border:1px solid ${T.line};background:${T.paper};height:38px;}
.pr-seg-btn{border:0;background:transparent;padding:0 14px;font-family:${FONT};font-size:13px;font-weight:600;color:${T.sub};cursor:pointer;border-right:1px solid ${T.lineSoft};}
.pr-seg-btn:last-child{border-right:0;}
.pr-seg-btn.on{background:${T.terra};color:#fff;}
.pr-select{height:38px;border:1px solid ${T.line};background:${T.paper};font-family:${FONT};font-size:13px;font-weight:600;color:${T.ink};padding:0 12px;cursor:pointer;}

/* buttons */
.pr-btn{font-family:${FONT};font-weight:600;font-size:13.5px;border-radius:0;cursor:pointer;border:1px solid transparent;padding:0 16px;height:38px;transition:background .15s,border-color .15s,opacity .15s;}
.pr-btn.sm{height:32px;padding:0 14px;font-size:13px;}
.pr-btn.solid{background:${T.terra};color:#fff;border-color:${T.terra};}
.pr-btn.solid:hover:not(:disabled){background:${T.terraDeep};border-color:${T.terraDeep};}
.pr-btn.ghost{background:transparent;color:${T.ink};border-color:${T.line};}
.pr-btn.ghost:hover:not(:disabled){border-color:${T.gold};color:${T.terraDeep};}
.pr-btn.wa{background:#1f9d55;color:#fff;border-color:#1f9d55;}
.pr-btn.wa:hover:not(:disabled){background:#178045;border-color:#178045;}
.pr-btn:disabled{opacity:.5;cursor:not-allowed;}

/* states */
.pr-state{padding:34px 20px;text-align:center;color:${T.sub};font-size:14px;display:flex;flex-direction:column;align-items:center;gap:6px;}
.pr-state.err{color:${T.terraDeep};}
.pr-state.empty strong{font-size:16px;color:${T.ink};}
.pr-empty-mark{width:46px;height:46px;border-radius:50%;background:${T.okBg};color:${T.ok};display:grid;place-items:center;font-size:22px;font-weight:700;margin-bottom:4px;}

/* table */
.pr-tablewrap{overflow-x:auto;transition:opacity .2s;}
.pr-tablewrap.dim{opacity:.55;pointer-events:none;}
.pr-table{width:100%;border-collapse:collapse;font-size:14px;min-width:760px;}
.pr-table thead th{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:${T.faint};font-weight:600;padding:12px 16px;border-bottom:1px solid ${T.line};background:rgba(247,243,234,.6);}
.pr-table th.r,.pr-table td.r{text-align:right;}
.pr-table tbody td{padding:13px 16px;border-bottom:1px solid ${T.lineSoft};vertical-align:middle;}
.pr-table tbody tr:last-child td{border-bottom:0;}
.pr-table tbody tr:hover td{background:rgba(217,84,47,.03);}
.pr-inv{font-weight:600;}
.pr-name{font-weight:600;}
.pr-muted{font-size:12px;color:${T.sub};margin-top:2px;}
.pr-old{margin-left:8px;color:${T.terraDeep};font-weight:600;}
.num{font-weight:500;}
.due{color:${T.terra};font-weight:700;}
.pr-src{font-weight:600;}
.pr-src.on{color:#2f6f8f;}
.pr-src.off{color:${T.gold};}
.pr-when{font-size:13px;}
.pr-when.never{color:${T.faint};}
.pr-when.sent{color:${T.ink};font-weight:500;}
.pr-cnt{display:block;font-size:11.5px;color:${T.sub};margin-top:1px;}

/* modal */
.pr-overlay{position:fixed;inset:0;background:rgba(42,35,29,.44);display:grid;place-items:center;padding:20px;z-index:1000;animation:pr-fade .16s ease;}
.pr-modal{background:${T.paper};border:1px solid ${T.line};width:100%;max-width:520px;max-height:90vh;overflow:auto;padding:22px;box-shadow:0 30px 80px -30px rgba(60,30,10,.5);animation:pr-pop .18s cubic-bezier(.2,.9,.3,1.1);}
.pr-m-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px;}
.pr-m-head h3{margin:0;font-size:18px;font-weight:700;}
.pr-m-head p{margin:3px 0 0;color:${T.sub};font-size:13px;}
.pr-x{border:0;background:transparent;font-size:16px;color:${T.faint};cursor:pointer;line-height:1;padding:4px;}
.pr-x:hover{color:${T.ink};}

.pr-money{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:${T.line};border:1px solid ${T.line};margin-bottom:12px;}
.pr-money>div{background:${T.ivory};padding:10px 12px;display:flex;flex-direction:column;gap:2px;}
.pr-money span{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:${T.faint};font-weight:600;}
.pr-money strong{font-size:16px;font-weight:700;}
.pr-money .due strong{color:${T.terra};}

.pr-lastline{font-size:12.5px;color:${T.sub};margin-bottom:14px;}
.pr-lbl{display:block;font-size:12px;font-weight:600;color:${T.sub};margin:0 0 5px;}
.pr-input,.pr-textarea{width:100%;font-family:${FONT};font-size:14px;color:${T.ink};background:#fff;border:1px solid ${T.line};border-radius:0;padding:9px 11px;outline:0;margin-bottom:12px;transition:border-color .15s;}
.pr-input:focus,.pr-textarea:focus{border-color:${T.terra};}
.pr-textarea{resize:vertical;line-height:1.5;white-space:pre-wrap;}
.pr-hint{font-size:11.5px;color:${T.faint};margin:-6px 0 14px;}
.pr-hint.dim{margin:8px 0 0;}

.pr-alert{padding:9px 12px;font-size:13px;margin-bottom:12px;border:1px solid;border-radius:0;}
.pr-alert.err{background:#fbeae6;border-color:#f0c4b7;color:${T.terraDeep};}
.pr-alert.note{background:#fff6e6;border-color:#f0dcb0;color:#8a6a1f;}

.pr-m-actions{display:flex;gap:10px;}
.pr-m-actions .pr-btn{flex:1;}

/* success */
.pr-success{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:24px 8px 8px;}
.pr-success strong{font-size:17px;font-weight:700;margin-top:4px;}
.pr-success span{font-size:13px;color:${T.sub};max-width:340px;line-height:1.5;}
.pr-ring{fill:none;stroke:${T.ok};stroke-width:4;opacity:.25;}
.pr-tick{fill:none;stroke:${T.ok};stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:60;stroke-dashoffset:60;animation:pr-draw .5s .1s ease forwards;}

@keyframes pr-fade{from{opacity:0}to{opacity:1}}
@keyframes pr-pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
@keyframes pr-draw{to{stroke-dashoffset:0}}

@media (max-width:900px){
  .pr-stats{grid-template-columns:repeat(2,1fr);}
}
@media (max-width:560px){
  .pr-head-actions{width:100%;}
  .pr-head-actions .pr-btn{flex:1;}
  .pr-money{grid-template-columns:1fr;}
}
@media (prefers-reduced-motion:reduce){
  .pr-overlay,.pr-modal{animation:none;}
  .pr-tick{animation:none;stroke-dashoffset:0;}
}
`;