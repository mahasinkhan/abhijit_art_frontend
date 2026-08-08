import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";

/* ══════════════════════════════════════════════════════════════
   ABHIJIT ART — Customers (admin)

   Two jobs beyond listing:
     1. Manual entry for walk-in / offline customers. They are ordinary
        User rows with source="offline", so their bookings and invoices
        link exactly like a self-registered client's.
     2. Send email to one or many customers — offers, festive discounts,
        query replies — from reusable templates with {{name}} tokens.

   Backend (all admin-only, backend/src/routes/userRoutes.ts):
     GET    /users?q=&source=     list + order counts
     POST   /users                create a walk-in customer
     PATCH  /users/:id            edit details
     DELETE /users/:id            (refuses admins / customers with orders)
     POST   /users/email          { userIds, subject, body, ctaLabel?, ctaUrl? }

   Same design system as Inventory: DM Sans, square corners, warm
   orange-glow cards, hairline borders, tabular figures.
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
const POS = "#17a35b";
const NEG = "#dd4b3e";
const GOLD = "#c68a2e";

const SANS = "'DM Sans', system-ui, sans-serif";

const GLOW =
  "radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.075) 0%, rgba(217,84,47,.022) 42%, rgba(217,84,47,0) 72%), linear-gradient(180deg, #fffcf9 0%, #ffffff 60%)";
const GLOW_SHADOW = "0 1px 2px rgba(17,20,30,.04), 0 10px 26px -18px rgba(217,84,47,.28)";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  address?: string | null;
  notes?: string | null;
  source?: string | null;
  createdAt: string;
  _count?: { bookings: number };
};

const dateFmt = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/* ── reusable email templates. {{name}} is filled per recipient ── */
type Template = { id: string; label: string; subject: string; body: string; ctaLabel?: string; ctaUrl?: string };

const TEMPLATES: Template[] = [
  {
    id: "blank",
    label: "Blank",
    subject: "",
    body: "",
  },
  {
    id: "offer",
    label: "Special offer",
    subject: "A special offer for you from Abhijit Art",
    body:
      "Hi {{first_name}},\n\n" +
      "We're running a special offer this month on our printing services — flex banners, visiting cards, LED signage and more.\n\n" +
      "Reply to this email or call us on 7405179066 and we'll put together a quote for whatever you need.\n\n" +
      "Warm regards,\nAbhijit Art",
    ctaLabel: "See our services",
    ctaUrl: "https://abhijitart.com/services",
  },
  {
    id: "festive",
    label: "Festive discount",
    subject: "Festive season discount — Abhijit Art",
    body:
      "Dear {{name}},\n\n" +
      "Wishing you and your family a wonderful festive season from all of us at Abhijit Art.\n\n" +
      "To celebrate, we're offering a discount on all bulk printing orders placed this month — banners, hoardings, pamphlets and packaging.\n\n" +
      "Get in touch and we'll help you plan it.\n\n" +
      "Warm regards,\nAbhijit Art",
    ctaLabel: "Place an order",
    ctaUrl: "https://abhijitart.com/services",
  },
  {
    id: "query",
    label: "Query reply",
    subject: "Regarding your enquiry — Abhijit Art",
    body:
      "Hi {{first_name}},\n\n" +
      "Thank you for getting in touch with Abhijit Art. Regarding your enquiry:\n\n" +
      "[ Write your answer here ]\n\n" +
      "Do let me know if you'd like anything clarified — happy to help.\n\n" +
      "Warm regards,\nAbhijit Art",
  },
  {
    id: "readycollect",
    label: "Order ready",
    subject: "Your order is ready for collection",
    body:
      "Hi {{first_name}},\n\n" +
      "Good news — your order is printed and ready for collection at our Berhampore studio.\n\n" +
      "We're open through the week; just drop in whenever it suits you, or reply here if you'd prefer delivery.\n\n" +
      "Warm regards,\nAbhijit Art",
  },
  {
    id: "thanks",
    label: "Thank you",
    subject: "Thank you for choosing Abhijit Art",
    body:
      "Hi {{first_name}},\n\n" +
      "Thank you for your recent order — it was a pleasure working with you.\n\n" +
      "If you were happy with the work, we'd love for you to keep us in mind for your next project. And if anything wasn't quite right, please tell us so we can put it right.\n\n" +
      "Warm regards,\nAbhijit Art",
  },
];

/* ── icons ── */
const Ico = ({ d, size = 18, sw = 1.8 }: { d: string; size?: number; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const I = {
  people: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  walkin: "M13 4v6l4 2M9 21l-1-7-3-2 1-5 3-1 2 3 3 1M10 3.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z",
  spark: "M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8",
  mail: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3.2 6.5 12 13l8.8-6.5",
  plus: "M12 5v14M5 12h14",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  trash: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6",
  x: "M18 6 6 18M6 6l12 12",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z",
};

export default function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [source, setSource] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editCustomer, setEditCustomer] = useState<Customer | "new" | null>(null);
  const [mailTo, setMailTo] = useState<Customer[] | null>(null);

  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (source) params.set("source", source);
      const { data } = await api.get(`/users?${params.toString()}`);
      setRows(data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Couldn't load customers.");
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }, [q, source]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  /* stats */
  const stats = useMemo(() => {
    const clients = rows.filter((c) => c.role !== "admin");
    const offline = clients.filter((c) => c.source === "offline");
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const fresh = clients.filter((c) => new Date(c.createdAt).getTime() > cutoff);
    return { total: rows.length, clients: clients.length, offline: offline.length, fresh: fresh.length };
  }, [rows]);

  /* selection — only customers with an email can be mailed */
  const mailable = rows.filter((c) => !!c.email);
  const allPicked = mailable.length > 0 && mailable.every((c) => selected.has(c.id));
  const toggleAll = () =>
    setSelected(allPicked ? new Set() : new Set(mailable.map((c) => c.id)));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const pickedRows = rows.filter((c) => selected.has(c.id));

  const exportCsv = () => {
    const head = ["Name", "Email", "Phone", "Role", "Source", "Address", "Notes", "Joined", "Orders"];
    const body = rows.map((c) => [
      c.name || "", c.email || "", c.phone || "", c.role || "",
      c.source || "online", c.address || "", (c.notes || "").replace(/\n/g, " "),
      dateFmt(c.createdAt), String(c._count?.bookings ?? 0),
    ]);
    const csv = [head, ...body]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={s.wrap}>
      <style>{CSS}</style>

      {/* ── top toolbar ── */}
      <div style={s.topRow}>
        <div className="cst-filters">
          <div style={s.searchBox}>
            <span style={s.searchIco}><Ico d={I.search} size={17} /></span>
            <input
              style={s.searchInput}
              placeholder="Search name, email or phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select style={s.select} value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All customers</option>
            <option value="online">Registered online</option>
            <option value="offline">Walk-in / offline</option>
          </select>
          {(q || source) && (
            <button className="cst-clear" onClick={() => { setQ(""); setSource(""); }}>Clear</button>
          )}
        </div>

        <div style={s.topActions}>
          <button className="cst-ghost" onClick={exportCsv} disabled={!rows.length}>
            <Ico d={I.download} size={16} /> Export CSV
          </button>
          <button className="cst-solid" onClick={() => setEditCustomer("new")}>
            <Ico d={I.plus} size={16} /> Add customer
          </button>
        </div>
      </div>

      {/* ── stat cards ── */}
      <div className="cst-stats">
        <Stat icon={I.people} accent={INK} label="Total customers" value={String(stats.total)} sub={`${stats.clients} client${stats.clients === 1 ? "" : "s"}`} />
        <Stat icon={I.walkin} accent={ACCENT} label="Walk-in / offline" value={String(stats.offline)} sub="Added by hand" />
        <Stat icon={I.spark} accent={POS} label="New (30 days)" value={String(stats.fresh)} sub="Recently joined" />
        <Stat icon={I.mail} accent={GOLD} label="Selected" value={String(selected.size)} sub="Ready to email" />
      </div>

      {/* ── selection action bar ── */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            style={s.selBar}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <span style={s.selText}>
              <b>{selected.size}</b> customer{selected.size === 1 ? "" : "s"} selected
            </span>
            <div style={{ display: "flex", gap: 10, marginLeft: "auto", flexWrap: "wrap" }}>
              <button className="cst-ghost sm" onClick={() => setSelected(new Set())}>Clear selection</button>
              <button className="cst-solid sm" onClick={() => setMailTo(pickedRows)}>
                <Ico d={I.send} size={15} /> Compose email
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── table ── */}
      {loading && !loadedOnce ? (
        <TableSkeleton />
      ) : error ? (
        <div style={s.errorBox}>{error}</div>
      ) : rows.length === 0 ? (
        <div style={s.emptyCard}>
          <span style={s.emptyIco}><Ico d={I.people} size={28} /></span>
          <h3 style={s.emptyTitle}>{q || source ? "No customers match your filters" : "No customers yet"}</h3>
          <p style={s.emptyText}>
            {q || source
              ? "Try clearing the search or the source filter."
              : "Add a walk-in customer by hand, or wait for clients to register on the site."}
          </p>
          {!(q || source) && (
            <button className="cst-solid" onClick={() => setEditCustomer("new")} style={{ marginTop: 16 }}>
              <Ico d={I.plus} size={16} /> Add customer
            </button>
          )}
        </div>
      ) : (
        <div style={s.tableCard} className={loading ? "cst-refreshing" : ""}>
          <div className="cst-table-scroll">
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: 42 }}>
                    <input type="checkbox" className="cst-check" checked={allPicked} onChange={toggleAll} aria-label="Select all" />
                  </th>
                  <th style={s.th}>Customer</th>
                  <th style={s.th}>Phone</th>
                  <th style={s.th}>Source</th>
                  <th style={s.th}>Joined</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Orders</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const offline = c.source === "offline";
                  const admin = c.role === "admin";
                  return (
                    <tr key={c.id} className="cst-row">
                      <td style={s.td}>
                        <input
                          type="checkbox"
                          className="cst-check"
                          checked={selected.has(c.id)}
                          onChange={() => toggleOne(c.id)}
                          disabled={!c.email}
                          aria-label={`Select ${c.name}`}
                        />
                      </td>
                      <td style={s.td}>
                        <div style={s.nameCell}>
                          <span style={s.nameMain}>
                            {c.name || "—"}
                            {admin && <span style={s.adminTag}>Admin</span>}
                          </span>
                          <span style={s.nameSub}>{c.email}</span>
                        </div>
                      </td>
                      <td style={{ ...s.td, fontVariantNumeric: "tabular-nums" }}>
                        {c.phone || <span style={s.dash}>—</span>}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.srcTag, ...(offline ? s.srcOffline : s.srcOnline) }}>
                          {offline ? "Walk-in" : "Online"}
                        </span>
                      </td>
                      <td style={{ ...s.td, whiteSpace: "nowrap" }}>{dateFmt(c.createdAt)}</td>
                      <td style={{ ...s.tdNum }}>{c._count?.bookings ?? 0}</td>
                      <td style={{ ...s.td, textAlign: "right" }}>
                        <div style={s.actions}>
                          <button className="cst-mini" onClick={() => setMailTo([c])} title="Email this customer" disabled={!c.email}>
                            <Ico d={I.mail} size={15} /> Email
                          </button>
                          <button className="cst-iconbtn" onClick={() => setEditCustomer(c)} title="Edit details">
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

      {/* ── modals ── */}
      <AnimatePresence>
        {editCustomer && (
          <CustomerDrawer
            key="cust-drawer"
            customer={editCustomer === "new" ? null : editCustomer}
            onClose={() => setEditCustomer(null)}
            onDone={(msg) => { setEditCustomer(null); setToast(msg); load(); }}
          />
        )}
        {mailTo && (
          <EmailDrawer
            key="mail-drawer"
            recipients={mailTo}
            onClose={() => setMailTo(null)}
            onSent={(msg) => { setMailTo(null); setSelected(new Set()); setToast(msg); }}
          />
        )}
      </AnimatePresence>

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
    <motion.div className="cst-stat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <span style={{ ...s.statIco, color: accent, background: `${accent}12` }}><Ico d={icon} size={19} /></span>
      <div style={{ minWidth: 0 }}>
        <div style={s.statValue}>{value}</div>
        <div style={s.statLabel}>{label}</div>
        <div style={s.statSub}>{sub}</div>
      </div>
    </motion.div>
  );
}

function TableSkeleton() {
  return (
    <div style={s.tableCard}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={s.skelRow}>
          <div className="cst-skel" style={{ width: "24%", height: 16 }} />
          <div className="cst-skel" style={{ width: "16%", height: 16 }} />
          <div className="cst-skel" style={{ width: "12%", height: 16 }} />
          <div className="cst-skel" style={{ width: "18%", height: 16 }} />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════ ADD / EDIT CUSTOMER ═══════════════════ */
function CustomerDrawer({
  customer, onClose, onDone,
}: {
  customer: Customer | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const editing = !!customer;
  const [f, setF] = useState({
    name: customer?.name || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    address: customer?.address || "",
    notes: customer?.notes || "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      if (editing) {
        await api.patch(`/users/${customer!.id}`, f);
        onDone("Customer updated.");
      } else {
        await api.post("/api/users", f);
        onDone("Walk-in customer added.");
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Couldn't save this customer.");
      setBusy(false);
    }
  };

  const del = async () => {
    setBusy(true);
    setErr("");
    try {
      await api.delete(`/users/${customer!.id}`);
      onDone("Customer deleted.");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Couldn't delete this customer.");
      setBusy(false);
      setConfirmDel(false);
    }
  };

  const valid = f.name.trim() && f.email.trim();

  return (
    <Modal title={editing ? "Edit customer" : "Add walk-in customer"} onClose={onClose}>
      {!editing && (
        <p style={s.hintLine}>
          For customers who order in person. They're saved like any other client, so their
          bookings and invoices link up normally.
        </p>
      )}

      <div style={s.formGrid}>
        <Field label="Full name" full>
          <input className="cst-input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Sounak Ghosal" autoFocus />
        </Field>
        <Field label="Email" hint="Needed to send offers" full>
          <input className="cst-input" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" />
        </Field>
        <Field label="Phone" full>
          <input className="cst-input" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9876543210" />
        </Field>
        <Field label="Address" full>
          <textarea className="cst-input" rows={2} value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Shop / area, town" />
        </Field>
        <Field label="Notes" hint="Internal only" full>
          <textarea className="cst-input" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="What they usually order, payment terms, who referred them…" />
        </Field>
      </div>

      {err && <div style={s.formErr}>{err}</div>}

      <div style={s.modalFoot}>
        {editing ? (
          confirmDel ? (
            <div style={s.confirmRow}>
              <span style={s.confirmText}>Delete this customer?</span>
              <button className="cst-ghost sm" onClick={() => setConfirmDel(false)}>No</button>
              <button className="cst-danger sm" onClick={del} disabled={busy}>Yes, delete</button>
            </div>
          ) : (
            <button className="cst-danger-ghost" onClick={() => setConfirmDel(true)}>
              <Ico d={I.trash} size={15} /> Delete
            </button>
          )
        ) : <span />}
        {!confirmDel && (
          <div style={s.footBtns}>
            <button className="cst-ghost" onClick={onClose}>Cancel</button>
            <button className="cst-solid" onClick={save} disabled={busy || !valid}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add customer"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ═══════════════════ EMAIL COMPOSER ═══════════════════ */
function EmailDrawer({
  recipients, onClose, onSent,
}: {
  recipients: Customer[];
  onClose: () => void;
  onSent: (msg: string) => void;
}) {
  const [tpl, setTpl] = useState("offer");
  const [subject, setSubject] = useState(TEMPLATES.find((t) => t.id === "offer")!.subject);
  const [body, setBody] = useState(TEMPLATES.find((t) => t.id === "offer")!.body);
  const [ctaLabel, setCtaLabel] = useState(TEMPLATES.find((t) => t.id === "offer")!.ctaLabel || "");
  const [ctaUrl, setCtaUrl] = useState(TEMPLATES.find((t) => t.id === "offer")!.ctaUrl || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [report, setReport] = useState<{ sent: number; failed: number; results: any[] } | null>(null);

  const pickTemplate = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTpl(id);
    setSubject(t.subject);
    setBody(t.body);
    setCtaLabel(t.ctaLabel || "");
    setCtaUrl(t.ctaUrl || "");
  };

  const withEmail = recipients.filter((r) => !!r.email);
  const sample = withEmail[0];
  /* preview shows the first recipient's tokens filled in */
  const preview = useMemo(() => {
    const nm = sample?.name || "there";
    const first = nm.split(/\s+/)[0];
    return body.replace(/\{\{\s*first_name\s*\}\}/gi, first).replace(/\{\{\s*name\s*\}\}/gi, nm);
  }, [body, sample]);

  const send = async () => {
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/api/users/email", {
        userIds: withEmail.map((r) => r.id),
        subject,
        body,
        ctaLabel: ctaLabel.trim() || undefined,
        ctaUrl: ctaUrl.trim() || undefined,
      });
      if (data.failed > 0) {
        // partial success — keep the modal open so the failures are visible
        setReport(data);
        setBusy(false);
      } else {
        onSent(`Email sent to ${data.sent} customer${data.sent === 1 ? "" : "s"}.`);
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Couldn't send the email.");
      setBusy(false);
    }
  };

  const valid = subject.trim() && body.trim() && withEmail.length > 0;

  if (report) {
    return (
      <Modal title="Send report" onClose={onClose} wide>
        <div style={s.reportTop}>
          <div style={{ ...s.reportStat, color: POS }}>{report.sent}<span style={s.reportLbl}>sent</span></div>
          <div style={{ ...s.reportStat, color: NEG }}>{report.failed}<span style={s.reportLbl}>failed</span></div>
        </div>
        <div style={s.reportList}>
          {report.results.map((r, i) => (
            <div key={i} style={s.reportRow}>
              <span style={{ ...s.reportDot, background: r.ok ? POS : NEG }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={s.reportName}>{r.name || r.email}</div>
                <div style={s.reportMail}>{r.email}</div>
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: r.ok ? POS : NEG }}>
                {r.ok ? "Sent" : r.error || "Failed"}
              </span>
            </div>
          ))}
        </div>
        <div style={s.modalFoot}>
          <span />
          <div style={s.footBtns}>
            <button className="cst-solid" onClick={onClose}>Done</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={withEmail.length === 1 ? "Email customer" : `Email ${withEmail.length} customers`} onClose={onClose} wide>
      {/* recipients */}
      <div style={s.recipWrap}>
        <div style={s.recipLabel}>To</div>
        <div style={s.recipChips}>
          {withEmail.slice(0, 8).map((r) => (
            <span key={r.id} style={s.chip}>{r.name || r.email}</span>
          ))}
          {withEmail.length > 8 && <span style={s.chipMore}>+{withEmail.length - 8} more</span>}
        </div>
        {recipients.length !== withEmail.length && (
          <div style={s.recipWarn}>{recipients.length - withEmail.length} skipped — no email on file.</div>
        )}
      </div>

      {/* templates */}
      <div style={s.tplLabel}>Template</div>
      <div style={s.tplGrid}>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            className={`cst-tpl ${tpl === t.id ? "on" : ""}`}
            onClick={() => pickTemplate(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.formGrid}>
        <Field label="Subject" full>
          <input className="cst-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="A special offer for you" />
        </Field>
        <Field label="Message" hint="Use {{name}} or {{first_name}} to personalise" full>
          <textarea className="cst-input" rows={9} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi {{first_name}}, …" />
        </Field>
        <Field label="Button text" hint="Optional">
          <input className="cst-input" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="See our services" />
        </Field>
        <Field label="Button link" hint="Must start with https://">
          <input className="cst-input" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://abhijitart.com/services" />
        </Field>
      </div>

      {/* preview */}
      <div style={s.previewLabel}>Preview {sample ? `— as ${sample.name || sample.email} will see it` : ""}</div>
      <div style={s.previewBox}>
        <div style={s.previewHead}>
          <div style={s.previewBrand}>Abhijit Art</div>
          <div style={s.previewTag}>Printing &amp; Design Studio</div>
        </div>
        <div style={s.previewBody}>
          <div style={s.previewSubject}>{subject || <span style={{ color: FAINT }}>(no subject)</span>}</div>
          <div style={s.previewText}>{preview || <span style={{ color: FAINT }}>(empty message)</span>}</div>
          {ctaLabel && ctaUrl && <div style={s.previewCta}>{ctaLabel}</div>}
        </div>
      </div>

      {err && <div style={s.formErr}>{err}</div>}

      <div style={s.modalFoot}>
        <span style={s.sendNote}>
          Each customer gets their own email — nobody sees the other recipients.
        </span>
        <div style={s.footBtns}>
          <button className="cst-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="cst-solid" onClick={send} disabled={busy || !valid}>
            {busy ? "Sending…" : <><Ico d={I.send} size={15} /> Send{withEmail.length > 1 ? ` to ${withEmail.length}` : ""}</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════ shared modal shell ═══════════════════ */
function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
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
        style={{ ...s.modal, maxWidth: wide ? 660 : 520 }}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        <div style={s.modalHead}>
          <h3 style={s.modalTitle}>{title}</h3>
          <button className="cst-iconbtn" onClick={onClose} aria-label="Close"><Ico d={I.x} size={18} /></button>
        </div>
        <div style={s.modalBody}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children, full, hint }: { label: string; children: React.ReactNode; full?: boolean; hint?: string }) {
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

/* ─────────────────────────── styles ─────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  wrap: { fontFamily: SANS, color: INK, minWidth: 0, maxWidth: "100%" },

  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 18 },
  topActions: { display: "flex", gap: 10, flexWrap: "wrap" },

  searchBox: { position: "relative", flex: "1 1 220px", minWidth: 0 },
  searchIco: { position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: MUTE },
  searchInput: {
    width: "100%", boxSizing: "border-box", padding: "11px 14px 11px 40px", borderRadius: 0,
    border: `1px solid #e6dcd2`, background: CARD, fontSize: 14, fontFamily: SANS, color: INK, outline: "none",
  },
  select: {
    padding: "11px 14px", borderRadius: 0, border: `1px solid #e6dcd2`, background: CARD,
    fontSize: 14, fontFamily: SANS, color: INK, cursor: "pointer", outline: "none",
  },

  /* stats */
  statIco: { width: 38, height: 38, borderRadius: 0, display: "grid", placeItems: "center", flexShrink: 0 },
  statValue: { fontSize: 24, fontWeight: 800, color: INK, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: BODY, marginTop: 5, fontWeight: 700 },
  statSub: { fontSize: 11.5, color: MUTE, marginTop: 2 },

  /* selection bar */
  selBar: {
    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 16, padding: "12px 16px",
    background: "#fffcf9", border: `1px solid ${LINE}`, fontSize: 13, color: BODY,
  },
  selText: { fontSize: 13, color: INK, fontWeight: 600 },

  /* table */
  tableCard: { background: CARD, border: `1px solid #ececf1`, borderRadius: 0, overflow: "hidden", boxShadow: "0 1px 2px rgba(17,20,30,.04)", marginTop: 16, minWidth: 0, maxWidth: "100%" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 820 },
  th: { textAlign: "left", padding: "11px 16px", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase", color: MUTE, borderBottom: `1px solid #ececf1`, whiteSpace: "nowrap", background: BGSOFT },
  td: { padding: "13px 16px", fontSize: 13.5, color: INK, borderBottom: `1px solid ${LINE2}`, verticalAlign: "middle" },
  tdNum: { padding: "13px 16px", fontSize: 13.5, fontWeight: 700, textAlign: "right", borderBottom: `1px solid ${LINE2}`, verticalAlign: "middle", fontVariantNumeric: "tabular-nums" },

  nameCell: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0 },
  nameMain: { fontWeight: 700, color: INK, display: "inline-flex", alignItems: "center", gap: 8 },
  nameSub: { fontSize: 12, color: MUTE, overflow: "hidden", textOverflow: "ellipsis" },
  adminTag: { fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: ACCENT, background: "#fdeee9", padding: "2px 7px" },
  dash: { color: FAINT },
  srcTag: { display: "inline-block", padding: "3px 10px", fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" },
  srcOnline: { background: "#eef1f5", color: BODY },
  srcOffline: { background: "#fdeee9", color: ACCENT },
  actions: { display: "inline-flex", gap: 6, alignItems: "center", justifyContent: "flex-end" },

  errorBox: { background: "#fdecea", border: "1px solid #f3cfc2", color: "#8a2f16", padding: "14px 18px", fontSize: 14, marginTop: 16 },
  skelRow: { display: "flex", gap: 24, padding: "16px 18px", borderBottom: `1px solid ${LINE2}`, alignItems: "center" },

  emptyCard: { background: CARD, border: `1px dashed #ddd0c4`, padding: "50px 24px", textAlign: "center", marginTop: 16 },
  emptyIco: { display: "inline-grid", placeItems: "center", width: 58, height: 58, background: "#fdeee9", color: ACCENT, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: INK },
  emptyText: { color: MUTE, fontSize: 13.5, lineHeight: 1.65, margin: 0, maxWidth: 380, marginLeft: "auto", marginRight: "auto" },

  /* modal */
  backdrop: { position: "fixed", inset: 0, background: "rgba(24,22,28,.5)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box" },
  modal: { width: "100%", maxHeight: "calc(100vh - 40px)", background: "#fffdfb", border: `1px solid ${LINE}`, boxShadow: "0 30px 80px rgba(24,22,28,.34)", display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden" },
  modalHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "17px 22px", borderBottom: `1px solid ${LINE}`, background: CARD, flexShrink: 0 },
  modalTitle: { fontSize: 17, fontWeight: 800, margin: 0, color: INK, letterSpacing: -0.2 },
  modalBody: { padding: 22, overflowY: "auto", flex: 1 },

  formGrid: { display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 14 },
  fieldLabel: { display: "block", fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 6 },
  fieldHint: { fontWeight: 500, color: MUTE, fontSize: 11.5 },

  hintLine: { marginBottom: 18, padding: "11px 14px", background: "#fffcf9", border: `1px solid ${LINE}`, fontSize: 12.5, color: BODY, lineHeight: 1.55 },
  formErr: { marginTop: 16, padding: "11px 14px", fontSize: 13, lineHeight: 1.5, color: "#8a2f16", background: "#fdecea", border: "1px solid #f3cfc2" },

  modalFoot: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 22, paddingTop: 16, borderTop: `1px solid ${LINE}`, flexWrap: "wrap" },
  footBtns: { display: "flex", gap: 10, marginLeft: "auto" },
  confirmRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  confirmText: { fontSize: 13, color: INK, fontWeight: 600 },
  sendNote: { fontSize: 11.5, color: MUTE, maxWidth: 260, lineHeight: 1.5 },

  /* recipients */
  recipWrap: { marginBottom: 18 },
  recipLabel: { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: MUTE, marginBottom: 8 },
  recipChips: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: { padding: "5px 11px", background: CARD, border: `1px solid ${LINE}`, fontSize: 12.5, fontWeight: 600, color: INK },
  chipMore: { padding: "5px 11px", background: "#fdeee9", border: `1px solid #f3d8cc`, fontSize: 12.5, fontWeight: 700, color: ACCENT },
  recipWarn: { marginTop: 8, fontSize: 12, color: GOLD, fontWeight: 600 },

  /* templates */
  tplLabel: { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: MUTE, marginBottom: 8 },
  tplGrid: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 },

  /* email preview */
  previewLabel: { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: MUTE, margin: "20px 0 8px" },
  previewBox: { border: `1px solid #ececf1`, background: CARD, overflow: "hidden" },
  previewHead: { background: "#2a231d", padding: "16px 20px" },
  previewBrand: { fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: -0.3 },
  previewTag: { fontSize: 10, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase", color: "#c2974a", marginTop: 3 },
  previewBody: { padding: "18px 20px 20px" },
  previewSubject: { fontSize: 14.5, fontWeight: 800, color: INK, marginBottom: 10 },
  previewText: { fontSize: 13, color: BODY, lineHeight: 1.7, whiteSpace: "pre-line" },
  previewCta: { display: "inline-block", marginTop: 16, padding: "11px 22px", background: ACCENT, color: "#fff", fontSize: 13, fontWeight: 700 },

  /* send report */
  reportTop: { display: "flex", gap: 28, paddingBottom: 16, borderBottom: `1px solid ${LINE}`, marginBottom: 4 },
  reportStat: { fontSize: 30, fontWeight: 800, display: "flex", alignItems: "baseline", gap: 7, fontVariantNumeric: "tabular-nums" },
  reportLbl: { fontSize: 12, fontWeight: 700, color: MUTE, textTransform: "uppercase", letterSpacing: 0.6 },
  reportList: { display: "flex", flexDirection: "column", maxHeight: 300, overflowY: "auto" },
  reportRow: { display: "flex", alignItems: "center", gap: 11, padding: "11px 2px", borderBottom: `1px solid ${LINE2}` },
  reportDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  reportName: { fontSize: 13, fontWeight: 600, color: INK },
  reportMail: { fontSize: 11.5, color: MUTE, marginTop: 1 },

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
  .cst-filters { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1 1 340px; min-width: 0; }

  .cst-stats { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px; }
  .cst-stats > * { min-width: 0; }
  @media (max-width: 1040px) { .cst-stats { grid-template-columns: repeat(2, minmax(0,1fr)); } }
  @media (max-width: 460px) { .cst-stats { grid-template-columns: minmax(0,1fr); } }

  /* shared warm card surface, same as Inventory */
  .cst-stat {
    display: flex; align-items: center; gap: 13px; padding: 17px 18px;
    background: ${GLOW}; border: 1px solid ${LINE}; box-shadow: ${GLOW_SHADOW};
  }

  .cst-solid {
    display: inline-flex; align-items: center; gap: 8px; background: ${ACCENT}; color: #fff; border: 0;
    padding: 11px 18px; font-family: ${SANS}; font-size: 13.5px; font-weight: 700; cursor: pointer;
    box-shadow: 0 10px 24px ${ACCENT}33; transition: transform .2s, box-shadow .2s, background .2s, opacity .2s;
  }
  .cst-solid:hover:not(:disabled) { transform: translateY(-1px); background: ${ACCENT_DK}; }
  .cst-solid:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }

  .cst-ghost {
    display: inline-flex; align-items: center; gap: 8px; background: ${CARD}; color: ${INK};
    border: 1px solid #e6dcd2; padding: 11px 18px; font-family: ${SANS};
    font-size: 13.5px; font-weight: 700; cursor: pointer; transition: background .2s, border-color .2s, color .2s;
  }
  .cst-ghost:hover:not(:disabled) { background: #fffcf9; border-color: ${ACCENT}55; color: ${ACCENT}; }
  .cst-ghost:disabled { opacity: .5; cursor: not-allowed; }
  .cst-ghost.sm, .cst-solid.sm, .cst-danger.sm { padding: 8px 14px; font-size: 12.5px; }

  .cst-clear {
    background: transparent; border: 1px solid #e6dcd2; color: ${BODY}; padding: 11px 14px;
    font-family: ${SANS}; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s; white-space: nowrap;
  }
  .cst-clear:hover { color: ${ACCENT}; border-color: ${ACCENT}55; background: #fffcf9; }

  .cst-danger {
    display: inline-flex; align-items: center; gap: 7px; background: ${NEG}; color: #fff; border: 0;
    padding: 11px 18px; font-family: ${SANS}; font-size: 13.5px; font-weight: 700; cursor: pointer;
  }
  .cst-danger:hover:not(:disabled) { background: #c23c30; }
  .cst-danger-ghost {
    display: inline-flex; align-items: center; gap: 7px; background: transparent; color: ${NEG};
    border: 1px solid ${NEG}44; padding: 10px 16px; font-family: ${SANS};
    font-size: 13px; font-weight: 700; cursor: pointer; transition: background .2s;
  }
  .cst-danger-ghost:hover { background: #fdecea; }

  .cst-mini {
    display: inline-flex; align-items: center; gap: 6px; background: ${INK}; color: #fff; border: 0;
    padding: 8px 13px; font-family: ${SANS}; font-size: 12.5px; font-weight: 700;
    cursor: pointer; transition: background .2s, transform .2s; white-space: nowrap;
  }
  .cst-mini:hover:not(:disabled) { background: #33394a; transform: translateY(-1px); }
  .cst-mini:disabled { opacity: .4; cursor: not-allowed; }

  .cst-iconbtn {
    width: 34px; height: 34px; border: 1px solid #e6dcd2; background: ${CARD};
    color: ${BODY}; display: grid; place-items: center; cursor: pointer; transition: all .2s; flex-shrink: 0;
  }
  .cst-iconbtn:hover { color: ${ACCENT}; border-color: ${ACCENT}55; background: #fffcf9; }

  .cst-tpl {
    background: ${CARD}; border: 1px solid #e6dcd2; color: ${BODY}; padding: 8px 14px;
    font-family: ${SANS}; font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all .18s; white-space: nowrap;
  }
  .cst-tpl:hover { border-color: ${ACCENT}55; color: ${ACCENT}; }
  .cst-tpl.on { background: ${ACCENT}; border-color: ${ACCENT}; color: #fff; }

  .cst-input {
    width: 100%; box-sizing: border-box; padding: 10px 13px; border: 1px solid #e6dcd2;
    font-size: 14px; font-family: ${SANS}; background: ${CARD}; color: ${INK}; outline: none;
    transition: border-color .2s, box-shadow .2s; line-height: 1.55;
  }
  .cst-input:focus { border-color: ${ACCENT}; box-shadow: 0 0 0 3px ${ACCENT}22; }
  textarea.cst-input { resize: vertical; min-height: 58px; }

  .cst-check { width: 16px; height: 16px; accent-color: ${ACCENT}; cursor: pointer; }
  .cst-check:disabled { cursor: not-allowed; opacity: .4; }

  .cst-row:hover td { background: ${BGSOFT}; }
  .cst-table-scroll { overflow-x: auto; max-width: 100%; }
  .cst-refreshing { opacity: .55; transition: opacity .2s ease; pointer-events: none; }

  .cst-skel {
    background: linear-gradient(90deg, #eef0f3 25%, #f6f7f9 37%, #eef0f3 63%);
    background-size: 400% 100%; animation: cstShimmer 1.4s ease infinite;
  }
  @keyframes cstShimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

  @media (max-width: 560px) {
    .cst-filters { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cst-stat, .cst-solid, .cst-mini, .cst-skel { transition: none !important; animation: none !important; }
  }
`;
