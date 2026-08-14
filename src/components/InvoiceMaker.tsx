import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";

/* ══════════════════════════════════════════════════════════════
   INVOICE MAKER  ·  admin billing tool

   Same design system as the Inventory module: DM Sans throughout,
   square corners, warm orange-glow cards, hairline borders, heavy
   tabular figures. The invoice PAPER stays plain white — it previews
   a printed document, so it must not carry the UI's tint.

   Fill in business + client details and line items → live preview
   → download as PDF (print popup). Supports an advance / part payment
   (shows Advance paid + Balance due) and a cash/online payment method.
   Typing a Client name suggests customers billed before and fills their
   details (new invoice number is kept, so it's always a fresh bill).
   Every downloaded/emailed bill is also saved to the Invoices history —
   opt-in, asked exactly once, then automatic. Send on WhatsApp opens a
   wa.me chat with the invoice PDF link prefilled. Fully client-side.
   ══════════════════════════════════════════════════════════════ */

/* ── tokens (aligned to the admin/inventory system) ── */
const INK = "#1f2430";
const BODY = "#545a67";
const MUTE = "#8a8f9a";
const FAINT = "#b6bac3";
const LINE = "#f0e6dc";      // warm hairline, matches the glow cards
const LINE_COOL = "#ececf1"; // neutral hairline for the paper
const SOFT = "#fafbfc";
const CARD = "#ffffff";
const TERRA = "#d9542f";
const TERRA_DK = "#c8481f";
const GREEN = "#15733f";
const WA = "#1fa855";        // WhatsApp accent green
const WA_DK = "#178544";

const SANS = "'DM Sans', system-ui, sans-serif";

/* the shared card surface: ivory base + soft orange glow from the top-left */
const GLOW =
  "radial-gradient(120% 140% at 0% 0%, rgba(217,84,47,.075) 0%, rgba(217,84,47,.022) 42%, rgba(217,84,47,0) 72%), linear-gradient(180deg, #fffcf9 0%, #ffffff 60%)";
const GLOW_SHADOW = "0 1px 2px rgba(17,20,30,.04), 0 10px 26px -18px rgba(217,84,47,.28)";

const rupee = (n: number) =>
  "₹" + (Number.isFinite(n) ? n : 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: any) => {
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

type Item = { id: string; desc: string; qty: string; rate: string };
type Party = { name: string; address: string; phone: string; email: string; gstin: string; pan: string };
type PayMethod = "cash" | "online";
/* a past customer, distilled from saved invoices for the name autocomplete */
type CustomerLite = { name: string; phone: string; email: string; gstin: string; address: string };

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);

/* persist the business profile so it's entered only once (safe if storage is unavailable) */
const BIZ_KEY = "aa_invoice_business_v4";
const loadBiz = (): Party => {
  try {
    const s = localStorage.getItem(BIZ_KEY);
    if (s) return JSON.parse(s);
  } catch {
    /* ignore */
  }
  return {
    name: "Abhijit Art",
    address: "Rabindra Sadan, Shakti Mandir Club, SS Sen Road\nBerhampore, West Bengal - 742101",
    phone: "7405179066",
    email: "abhijitart85@gmail.com",
    gstin: "19AQFPD8346K1ZH",
    pan: "AQFPD8346K",
  };
};

/* one-time opt-in for saving invoices to the history. After the user answers
   once, every generated bill is saved (or not) automatically without asking. */
const AUTOSAVE_KEY = "aa_invoice_autosave";
const loadAutosave = (): "on" | "off" | "" => {
  try {
    const v = localStorage.getItem(AUTOSAVE_KEY);
    return v === "on" || v === "off" ? v : "";
  } catch {
    return "";
  }
};

const nextInvoiceNo = () => {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  let seq = 1;
  try {
    seq = (parseInt(localStorage.getItem("aa_invoice_seq") || "0", 10) || 0) + 1;
  } catch {
    seq = Math.floor(Math.random() * 900) + 100;
  }
  return `AA-${stamp}-${String(seq).padStart(3, "0")}`;
};

/* ── icons ── */
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const map: Record<string, JSX.Element> = {
    plus: <path d="M12 5v14M5 12h14" {...p} />,
    trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" {...p} />,
    download: (<><path d="M12 3v12M7 10l5 5 5-5" {...p} /><path d="M5 21h14" {...p} /></>),
    reset: <path d="M20 11a8 8 0 1 0-1.5 5.5M20 5v6h-6" {...p} />,
    receipt: <path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21zM9 8h6M9 12h6M9 16h4" {...p} />,
    mail: <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3.2 6.5 12 13l8.8-6.5" {...p} />,
    send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" {...p} />,
    check: <path d="M20 6 9 17l-5-5" {...p} />,
    x: <path d="M18 6 6 18M6 6l12 12" {...p} />,
    user: (<><circle cx="12" cy="8" r="4" {...p} /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" {...p} /></>),
    banknote: (<><rect x="2" y="6" width="20" height="12" rx="2" {...p} /><circle cx="12" cy="12" r="2.5" {...p} /><path d="M6 12h.01M18 12h.01" {...p} /></>),
    card: (<><rect x="2.5" y="5" width="19" height="14" rx="2" {...p} /><path d="M2.5 9.5h19" {...p} /></>),
    /* WhatsApp: outlined speech bubble + solid handset */
    whatsapp: (
      <>
        <path d="M3.8 20.2 5 16.4A8.4 8.4 0 1 1 8.2 19l-4.4 1.2z" {...p} />
        <path
          d="M9.2 8.6c-.15 0-.4.05-.6.3-.2.25-.75.73-.75 1.77s.77 2.05.88 2.2c.1.14 1.5 2.4 3.68 3.28 1.83.72 2.2.58 2.6.55.4-.04 1.24-.5 1.42-1 .18-.5.18-.9.12-1l-.55-.27s-1.05-.52-1.22-.58c-.16-.06-.28-.1-.4.1l-.55.7c-.1.12-.2.13-.37.05-.16-.08-.9-.33-1.66-1.05-.6-.55-1.02-1.22-1.14-1.42-.1-.2-.01-.3.07-.4l.28-.35c.1-.12.13-.2.2-.34.06-.13.03-.25 0-.35-.05-.1-.4-1.13-.6-1.55-.14-.3-.28-.3-.4-.3H9.2z"
          fill="currentColor"
          stroke="none"
        />
      </>
    ),
  };
  return (<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>{map[name]}</svg>);
}

/* small labelled field */
function Field({ label, children, half, hint }: { label: string; children: React.ReactNode; half?: boolean; hint?: string }) {
  return (
    <label style={{ ...st.field, ...(half ? { flex: 1, minWidth: 0 } : {}) }}>
      <span style={st.fieldLabel}>
        {label}
        {hint && <span style={st.fieldHint}> · {hint}</span>}
      </span>
      {children}
    </label>
  );
}

/* ───────────────────────── component ───────────────────────── */
export default function InvoiceMaker() {
  const [biz, setBiz] = useState<Party>(loadBiz);
  const [client, setClient] = useState<Party>({ name: "", address: "", phone: "", email: "", gstin: "", pan: "" });
  const [invNo, setInvNo] = useState(nextInvoiceNo);
  const [date, setDate] = useState(today);
  const [items, setItems] = useState<Item[]>([{ id: uid(), desc: "", qty: "1", rate: "" }]);
  const [discType, setDiscType] = useState<"amount" | "percent">("amount");
  const [discVal, setDiscVal] = useState("0");
  const [taxPct, setTaxPct] = useState("0");
  const [notes, setNotes] = useState("Thank you for your business!");
  const [saved, setSaved] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const [warranty, setWarranty] = useState("");
  const [advance, setAdvance] = useState("0"); // advance / part payment received now
  const [payMethod, setPayMethod] = useState<PayMethod>("cash"); // how the customer is paying — cash vs online

  /* customer autocomplete — distilled from saved invoices, for the name field */
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [nameSuggestOpen, setNameSuggestOpen] = useState(false);
  const [activeSug, setActiveSug] = useState(-1);

  /* auto-save to the Invoices history — asked once, then remembered */
  const [autosave, setAutosave] = useState<"on" | "off" | "">(loadAutosave);
  const [askSave, setAskSave] = useState(false);   // one-time opt-in modal
  const [savedTick, setSavedTick] = useState(false); // brief "Saved" confirmation
  const pendingSave = useRef<Record<string, unknown> | null>(null); // bill awaiting the opt-in answer

  /* send-by-email modal */
  const [mailOpen, setMailOpen] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailMessage, setMailMessage] = useState("");
  const [mailBusy, setMailBusy] = useState(false);
  const [mailErr, setMailErr] = useState("");
  const [mailSent, setMailSent] = useState("");

  /* send-on-whatsapp modal */
  const [waOpen, setWaOpen] = useState(false);
  const [waTo, setWaTo] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waBusy, setWaBusy] = useState(false);
  const [waErr, setWaErr] = useState("");
  const [waSent, setWaSent] = useState("");

  /* pull saved invoices once and distil a unique customer list (newest first,
     keyed on phone-or-name) for the client-name autocomplete. Best-effort. */
  useEffect(() => {
    let alive = true;
    api
      .get("/api/invoices")
      .then((res) => {
        if (!alive) return;
        const seen = new Set<string>();
        const out: CustomerLite[] = [];
        for (const inv of Array.isArray(res.data) ? res.data : []) {
          const name = String(inv.clientName || "").trim();
          const phone = String(inv.clientPhone || "").trim();
          if (!name && !phone) continue;
          const key = (phone || name).toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({
            name,
            phone,
            email: String(inv.clientEmail || "").trim(),
            gstin: String(inv.clientGstin || "").trim(),
            address: String(inv.clientAddr || "").trim(),
          });
        }
        setCustomers(out);
      })
      .catch(() => { /* best-effort — no suggestions if it fails */ });
    return () => { alive = false; };
  }, []);

  const nameQuery = client.name.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!nameQuery) return [];
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(nameQuery) ||
          c.phone.toLowerCase().includes(nameQuery) ||
          c.email.toLowerCase().includes(nameQuery),
      )
      .slice(0, 6);
  }, [customers, nameQuery]);

  /* fill the whole client block from a picked customer; keep the invoice number
     as-is so this stays a brand-new bill, not an edit of their old one */
  const pickCustomer = (c: CustomerLite) => {
    setClient((cl) => ({ ...cl, name: c.name, phone: c.phone, email: c.email, gstin: c.gstin, address: c.address }));
    setNameSuggestOpen(false);
    setActiveSug(-1);
  };

  /* totals */
  const { subtotal, discountAmt, taxable, taxAmt, total } = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + num(it.qty) * num(it.rate), 0);
    const discountAmt = discType === "percent" ? (subtotal * num(discVal)) / 100 : Math.min(num(discVal), subtotal);
    const taxable = Math.max(subtotal - discountAmt, 0);
    const taxAmt = (taxable * num(taxPct)) / 100;
    return { subtotal, discountAmt, taxable, taxAmt, total: taxable + taxAmt };
  }, [items, discType, discVal, taxPct]);

  /* advance / balance for a part payment — advance can't exceed the total */
  const advancePaid = Math.min(Math.max(num(advance), 0), total);
  const balanceDue = Math.max(total - advancePaid, 0);

  const setItem = (id: string, key: keyof Item, val: string) =>
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
  const addItem = () => setItems((rows) => [...rows, { id: uid(), desc: "", qty: "1", rate: "" }]);
  const removeItem = (id: string) => setItems((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));

  const saveBusiness = () => {
    try {
      localStorage.setItem(BIZ_KEY, JSON.stringify(biz));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const resetInvoice = () => {
    setClient({ name: "", address: "", phone: "", email: "", gstin: "", pan: "" });
    setItems([{ id: uid(), desc: "", qty: "1", rate: "" }]);
    setDiscVal("0");
    setTaxPct("0");
    setNotes("Thank you for your business!");
    setWarranty("");
    setAdvance("0");
    setPayMethod("cash");
    setNameSuggestOpen(false);
    setDate(today());
    setInvNo(nextInvoiceNo());
  };

  /* the invoice payload the /invoices endpoint accepts. Totals are recomputed
     on the server, and it's keyed on invoiceNo, so Download-then-Send on the
     same bill updates one record instead of creating two. paidAmount carries
     the advance; the server clamps it to the total. paymentMethod = cash|online. */
  const invoicePayload = () => ({
    invNo, date, biz, client,
    items: items.filter((it) => it.desc.trim() || num(it.rate) > 0),
    discType, discVal, taxPct, notes, warranty, paidAmount: advancePaid,
    paymentMethod: payMethod,
  });

  /* fire-and-forget POST — a save hiccup must never block the PDF/email the
     user actually asked for; a short "Saved to Invoices" tick confirms it landed */
  const persistInvoice = (payload: Record<string, unknown>) => {
    api
      .post("/api/invoices", payload)
      .then(() => {
        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 2600);
      })
      .catch(() => {
        /* best-effort history save — ignore failures */
      });
  };

  /* called whenever an invoice is generated (download or email). Saves
     automatically once the user has opted in; the very first time, it asks a
     single question and remembers the answer for good. */
  const maybeSaveInvoice = () => {
    if (autosave === "on") return persistInvoice(invoicePayload());
    if (autosave === "off") return;
    // undecided → capture this bill and ask once
    pendingSave.current = invoicePayload();
    setAskSave(true);
  };

  /* the user's one-time choice from the opt-in prompt */
  const decideAutosave = (choice: "on" | "off") => {
    setAutosave(choice);
    try { localStorage.setItem(AUTOSAVE_KEY, choice); } catch { /* ignore */ }
    setAskSave(false);
    if (choice === "on" && pendingSave.current) persistInvoice(pendingSave.current);
    pendingSave.current = null;
  };

  /* bump the saved sequence so the next invoice number increments (shared by
     Download / Email / WhatsApp) */
  const bumpSeq = () => {
    try {
      const m = invNo.match(/(\d+)$/);
      if (m) localStorage.setItem("aa_invoice_seq", m[1]);
    } catch { /* ignore */ }
  };

  const openMail = () => {
    setMailErr("");
    setMailSent("");
    setMailTo(client.email || "");
    setMailSubject(`Invoice ${invNo} from ${biz.name || "Abhijit Art"}`);
    setMailMessage(
      `Dear ${client.name || "Customer"},\n\n` +
        `Please find your invoice ${invNo} below, for a total of ${rupee(total)}.\n\n` +
        `Do let us know if anything needs correcting — just reply to this email.\n\n` +
        `Warm regards,\n${biz.name || "Abhijit Art"}`,
    );
    setMailOpen(true);
  };

  const sendInvoice = async () => {
    setMailBusy(true);
    setMailErr("");
    try {
      await api.post("/api/invoices/email", {
        to: mailTo.trim(),
        subject: mailSubject,
        message: mailMessage,
        invoice: {
          invNo, date, biz, client,
          items: items.filter((it) => it.desc.trim() || num(it.rate) > 0),
          discType, discVal, taxPct, notes, warranty, paidAmount: advancePaid,
        },
      });
      setMailSent(`Invoice emailed to ${mailTo.trim()}.`);
      maybeSaveInvoice(); // save to the Invoices history (asks once, then auto)
      setMailBusy(false);
      bumpSeq(); // so the next invoice is a new number
    } catch (e: any) {
      setMailErr(e?.response?.data?.message || "Couldn't send the invoice.");
      setMailBusy(false);
    }
  };

  const openWhatsApp = () => {
    setWaErr("");
    setWaSent("");
    setWaTo(client.phone || "");
    setWaMessage(
      `Dear ${client.name || "Customer"},\n\n` +
        `Here is your invoice ${invNo} from ${biz.name || "Abhijit Art"}.\n\n` +
        `Total: ${rupee(total)}` +
        (advancePaid > 0 ? `\nAdvance paid: ${rupee(advancePaid)}\nBalance due: ${rupee(balanceDue)}` : "") +
        `\n\nThank you for your business!`,
    );
    setWaOpen(true);
  };

  /* opens WhatsApp with the message prefilled. wa.me can't attach a file, so
     we save the bill first, grab its shareable PDF link and append it to the
     text. The blank tab is opened synchronously (before any await) so the
     browser doesn't treat the later redirect as a blocked popup. Because a
     "send" makes the bill a real issued invoice, this always persists it —
     the PDF link needs a saved record — regardless of the autosave opt-in. */
  const sendWhatsApp = async () => {
    const digits = waDigits(waTo);
    if (digits.length < 10) {
      setWaErr("Enter a valid WhatsApp number — a 10-digit Indian mobile, or one with its country code.");
      return;
    }
    setWaBusy(true);
    setWaErr("");

    const win = window.open("about:blank", "_blank"); // keep the user-gesture alive

    let pdfUrl = "";
    try {
      const res = await api.post("/api/invoices", invoicePayload());
      const inv = res?.data || {};
      pdfUrl = inv.pdfUrl || "";
      // some responses don't inline the signed link — fetch it by id as a fallback
      if (!pdfUrl && inv.id) {
        try {
          const g = await api.get(`/api/invoices/${inv.id}`);
          pdfUrl = g?.data?.pdfUrl || "";
        } catch { /* ignore — send the message without a link */ }
      }
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 2600);
      bumpSeq();
    } catch {
      /* saving / link generation failed — still open WhatsApp with the text */
    }

    const finalMsg = waMessage + (pdfUrl ? `\n\n📄 Invoice PDF: ${pdfUrl}` : "");
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(finalMsg)}`;
    if (win) win.location.href = url;
    else window.open(url, "_blank");

    setWaBusy(false);
    setWaSent(`Opening WhatsApp for +${digits}…`);
    setTimeout(() => { setWaOpen(false); setWaSent(""); }, 1500);
  };

  const hasLines = items.some((it) => it.desc.trim() || num(it.rate) > 0);

  const download = () => {
    bumpSeq(); // increment the next invoice number

    maybeSaveInvoice(); // save to the Invoices history (asks once, then auto)

    const signedAt = signStamp(); // capture the signing moment for the PDF

    const rows = items
      .filter((it) => it.desc.trim() || num(it.rate) > 0)
      .map(
        (it, i) => `<tr>
          <td class="c">${i + 1}</td>
          <td>${escapeHtml(it.desc) || "—"}</td>
          <td class="r">${num(it.qty)}</td>
          <td class="r">${rupee(num(it.rate))}</td>
          <td class="r">${rupee(num(it.qty) * num(it.rate))}</td>
        </tr>`
      )
      .join("");

    const totRows =
      `<tr><td class="lbl">Subtotal</td><td class="r">${rupee(subtotal)}</td></tr>` +
      (discountAmt > 0
        ? `<tr><td class="lbl">Discount${discType === "percent" ? ` (${num(discVal)}%)` : ""}</td><td class="r">− ${rupee(
            discountAmt
          )}</td></tr>`
        : "") +
      (num(taxPct) > 0 ? `<tr><td class="lbl">GST (${num(taxPct)}%)</td><td class="r">${rupee(taxAmt)}</td></tr>` : "") +
      `<tr class="grand"><td class="lbl">Total</td><td class="r">${rupee(total)}</td></tr>` +
      (advancePaid > 0
        ? `<tr><td class="lbl">Advance paid</td><td class="r" style="color:${GREEN}">− ${rupee(advancePaid)}</td></tr>` +
          `<tr class="due"><td class="lbl">Balance due</td><td class="r">${rupee(balanceDue)}</td></tr>`
        : "");

    const bizName = escapeHtml(biz.name) || "Abhijit Art";
    const signatureHtml = `<div class="sign">
        <div class="sign-cap">For ${bizName}</div>
        <div class="sign-name">${bizName}</div>
        <div class="sign-line"></div>
        <div class="sign-role">Authorized Signatory</div>
        <div class="sign-meta">Digitally signed · ${signedAt}</div>
      </div>`;

    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(invNo)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;font-family:'DM Sans',Arial,Helvetica,sans-serif}
        body{margin:0;padding:44px;color:${INK}}
        h1{margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;color:${TERRA}}
        .top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
        .muted{color:${MUTE};font-size:12.5px;line-height:1.5}
        .inv-title{text-align:right}
        .inv-title .big{font-size:22px;font-weight:800;letter-spacing:2px;color:${INK}}
        .parties{display:flex;justify-content:space-between;gap:24px;margin:28px 0 6px}
        .lab{font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:${FAINT};font-weight:700;margin-bottom:5px}
        .strong{font-weight:700;font-size:14px}
        table.items{width:100%;border-collapse:collapse;margin-top:22px}
        table.items th{background:${SOFT};color:${MUTE};font-size:11px;letter-spacing:.4px;text-transform:uppercase;text-align:left;padding:11px 10px;border-bottom:2px solid ${LINE_COOL}}
        table.items td{padding:11px 10px;border-bottom:1px solid ${LINE_COOL};font-size:13.5px;vertical-align:top}
        .r{text-align:right;font-variant-numeric:tabular-nums}.c{text-align:center;color:${MUTE}}
        .totals{width:300px;margin-left:auto;margin-top:18px;border-collapse:collapse}
        .totals td{padding:7px 4px;font-size:13.5px}
        .totals .lbl{color:${MUTE}}
        .totals .r{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
        .totals .grand td{border-top:2px solid ${LINE_COOL};padding-top:12px;font-size:17px;font-weight:800}
        .totals .grand .r{color:${TERRA}}
        .totals .due td{padding-top:10px;font-size:15px;font-weight:800;color:${INK}}
        .totals .due .r{color:${TERRA}}
        .sign{margin-top:44px;text-align:right}
        .sign-cap{font-size:11px;color:${MUTE}}
        .sign-name{font-family:'Pinyon Script',cursive;font-size:34px;color:${TERRA};line-height:1;margin:2px 0}
        .sign-line{width:180px;border-bottom:1px solid ${INK};margin:6px 0 6px auto}
        .sign-role{font-size:11px;color:${INK};font-weight:700;letter-spacing:.3px}
        .sign-meta{font-size:10.5px;color:${FAINT};font-weight:600;margin-top:3px}
        .notes{margin-top:30px;padding-top:16px;border-top:1px solid ${LINE_COOL};font-size:12.5px;color:${MUTE};line-height:1.6}
        .foot{margin-top:40px;text-align:center;font-size:11px;color:${FAINT}}
        @media print{body{padding:24px}}
      </style></head><body>
      <div class="top">
        <div>
          <img src="/images/abhijit_art_logo.png" alt="${bizName}" style="height:76px;width:auto;display:block;margin-bottom:8px" onerror="this.outerHTML='<h1>${bizName}</h1>'" />
          <div class="muted">${escapeLines(biz.address)}<br/>
            ${biz.phone ? "☎ " + escapeHtml(biz.phone) + " &nbsp;" : ""}${biz.email ? "✉ " + escapeHtml(biz.email) : ""}
            ${biz.gstin ? "<br/>GSTIN: " + escapeHtml(biz.gstin) : ""}${biz.pan ? "<br/>PAN: " + escapeHtml(biz.pan) : ""}</div>
        </div>
        <div class="inv-title">
          <div class="big">INVOICE</div>
          <div class="muted">No: <b>${escapeHtml(invNo)}</b><br/>
            Date: ${fmt(date)}</div>
        </div>
      </div>
      <div class="parties">
        <div>
          <div class="lab">Bill to</div>
          <div class="strong">${escapeHtml(client.name) || "—"}</div>
          <div class="muted">${escapeLines(client.address)}${client.phone ? "<br/>☎ " + escapeHtml(client.phone) : ""}${
      client.email ? "<br/>✉ " + escapeHtml(client.email) : ""
    }${client.gstin ? "<br/>GSTIN: " + escapeHtml(client.gstin) : ""}</div>
        </div>
      </div>
      <table class="items"><thead><tr><th style="width:34px">#</th><th>Description</th><th class="r" style="width:60px">Qty</th><th class="r" style="width:110px">Rate</th><th class="r" style="width:120px">Amount</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="5" class="c" style="padding:22px">No items</td></tr>`}</tbody></table>
      <table class="totals"><tbody>${totRows}</tbody></table>
      ${signatureHtml}
      ${notes.trim() || warranty.trim() ? `<div class="notes">${notes.trim() ? `<b>Notes:</b> ${escapeHtml(notes)}` : ""}${notes.trim() && warranty.trim() ? "<br/>" : ""}${warranty.trim() ? `<b>Warranty:</b> ${escapeHtml(warranty)}` : ""}</div>` : ""}
      <div class="foot">Generated by Abhijit Art · ${new Date().toLocaleDateString("en-IN")}</div>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  };

  return (
    <div style={st.page}>
      <div style={st.head}>
        <div>
          <h1 style={st.title}>Invoice maker</h1>
          <p style={st.sub}>Create an invoice — fill the details and download as PDF.</p>
        </div>
        <div style={st.headActions}>
          {savedTick && (
            <span style={st.savedChip}>
              <Icon name="check" size={14} /> Saved to Invoices
            </span>
          )}
          <button className="iv-ghost" style={st.ghostBtn} onClick={resetInvoice}>
            <Icon name="reset" size={15} /> New invoice
          </button>
          <button
            className="iv-ghost"
            style={st.ghostBtn}
            onClick={openMail}
            disabled={!hasLines}
            title={hasLines ? "Email this invoice to the client" : "Add at least one line item first"}
          >
            <Icon name="mail" size={15} /> Send by email
          </button>
          <button
            className="iv-wa"
            style={st.ghostBtn}
            onClick={openWhatsApp}
            disabled={!hasLines}
            title={hasLines ? "Send this invoice on WhatsApp" : "Add at least one line item first"}
          >
            <span style={{ color: WA, display: "inline-flex" }}><Icon name="whatsapp" size={16} /></span> Send on WhatsApp
          </button>
          <button className="iv-cta" style={st.cta} onClick={download} disabled={!hasLines}
            title={hasLines ? "Open a printable PDF" : "Add at least one line item first"}>
            <Icon name="download" size={16} /> Download PDF
          </button>
        </div>
      </div>

      {!hasLines && (
        <div style={st.needItems}>
          Add a line item below to enable <b>Send by email</b>, <b>Send on WhatsApp</b> and <b>Download PDF</b>.
        </div>
      )}

      <div className="iv-layout" style={st.layout}>
        {/* ── form ── */}
        <div style={{ minWidth: 0 }}>
          {/* business */}
          <section className="iv-card" style={st.card}>
            <div style={st.cardHead}>
              <h2 style={st.cardTitle}>Your business</h2>
              <button className="iv-link" style={st.saveLink} onClick={saveBusiness}>
                {saved ? "Saved ✓" : "Save as default"}
              </button>
            </div>
            <div style={st.row}>
              <Field label="Business name" half>
                <input className="iv-in" style={st.input} value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} />
              </Field>
              <Field label="Phone" half>
                <input className="iv-in" style={st.input} value={biz.phone} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} />
              </Field>
            </div>
            <Field label="Address" hint="Press Enter for a new line">
              <textarea className="iv-in" style={st.inputArea} rows={2} value={biz.address} onChange={(e) => setBiz({ ...biz, address: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className="iv-in" style={st.input} value={biz.email} onChange={(e) => setBiz({ ...biz, email: e.target.value })} />
            </Field>
            <div style={st.row}>
              <Field label="GSTIN" half>
                <input className="iv-in" style={st.input} value={biz.gstin} onChange={(e) => setBiz({ ...biz, gstin: e.target.value })} />
              </Field>
              <Field label="PAN" half>
                <input className="iv-in" style={st.input} value={biz.pan} onChange={(e) => setBiz({ ...biz, pan: e.target.value })} />
              </Field>
            </div>
          </section>

          {/* invoice meta + client */}
          <section className="iv-card" style={{ ...st.card, marginTop: 16 }}>
            <h2 style={st.cardTitle}>Invoice details</h2>
            <div style={st.row}>
              <Field label="Invoice no." half>
                <input className="iv-in" style={st.input} value={invNo} onChange={(e) => setInvNo(e.target.value)} />
              </Field>
              <Field label="Date" hint="Defaults to today" half>
                <input className="iv-in" style={st.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>

            <div style={st.subHead}>Bill to</div>
            <div style={st.row}>
              {/* client name — autocomplete from past customers */}
              <div style={{ ...st.field, flex: 1, minWidth: 0, position: "relative" }}>
                <span style={st.fieldLabel}>
                  Client name<span style={st.fieldHint}> · type to search saved customers</span>
                </span>
                <input
                  className="iv-in"
                  style={st.input}
                  value={client.name}
                  placeholder="Customer name"
                  autoComplete="off"
                  onChange={(e) => { setClient({ ...client, name: e.target.value }); setNameSuggestOpen(true); setActiveSug(-1); }}
                  onFocus={() => { if (client.name.trim()) setNameSuggestOpen(true); }}
                  onBlur={() => setTimeout(() => setNameSuggestOpen(false), 120)}
                  onKeyDown={(e) => {
                    if (!nameSuggestOpen || suggestions.length === 0) return;
                    if (e.key === "ArrowDown") { e.preventDefault(); setActiveSug((i) => Math.min(i + 1, suggestions.length - 1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveSug((i) => Math.max(i - 1, 0)); }
                    else if (e.key === "Enter") { if (activeSug >= 0) { e.preventDefault(); pickCustomer(suggestions[activeSug]); } }
                    else if (e.key === "Escape") { setNameSuggestOpen(false); }
                  }}
                />
                {nameSuggestOpen && suggestions.length > 0 && (
                  <div style={st.suggestBox}>
                    {suggestions.map((c, i) => (
                      <button
                        key={(c.phone || c.name) + i}
                        type="button"
                        className="iv-sug"
                        style={{ ...st.suggestItem, ...(i === activeSug ? { background: "#fffcf9" } : null) }}
                        onMouseDown={(e) => { e.preventDefault(); pickCustomer(c); }}
                      >
                        <span style={st.suggestName}>{c.name || "—"}</span>
                        <span style={st.suggestMeta}>{c.phone || c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Field label="Phone" half>
                <input className="iv-in" style={st.input} value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
              </Field>
            </div>
            <Field label="Address" hint="Press Enter for a new line">
              <textarea className="iv-in" style={st.inputArea} rows={2} value={client.address} onChange={(e) => setClient({ ...client, address: e.target.value })} />
            </Field>
            <div style={st.row}>
              <Field label="Email" half>
                <input className="iv-in" style={st.input} value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
              </Field>
              <Field label="GSTIN (optional)" half>
                <input className="iv-in" style={st.input} value={client.gstin} onChange={(e) => setClient({ ...client, gstin: e.target.value })} />
              </Field>
            </div>
          </section>

          {/* items */}
          <section className="iv-card" style={{ ...st.card, marginTop: 16 }}>
            <h2 style={st.cardTitle}>Items</h2>
            <div className="iv-itemgrid" style={st.itemHead}>
              <span>Description</span>
              <span style={{ textAlign: "right" }}>Qty</span>
              <span style={{ textAlign: "right" }}>Rate (₹)</span>
              <span style={{ textAlign: "right" }}>Amount</span>
              <span />
            </div>
            {items.map((it) => (
              <div key={it.id} className="iv-itemgrid" style={st.itemRow}>
                <input className="iv-in" style={st.input} placeholder="Service / product" value={it.desc} onChange={(e) => setItem(it.id, "desc", e.target.value)} />
                <input className="iv-in" style={st.inputNum} type="number" min="0" value={it.qty} onChange={(e) => setItem(it.id, "qty", e.target.value)} />
                <input className="iv-in" style={st.inputNum} type="number" min="0" placeholder="0" value={it.rate} onChange={(e) => setItem(it.id, "rate", e.target.value)} />
                <span style={st.colAmtVal}>{rupee(num(it.qty) * num(it.rate))}</span>
                <button className="iv-del" style={st.delBtn} onClick={() => removeItem(it.id)} aria-label="Remove item" disabled={items.length === 1}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
            <button className="iv-add" style={st.addBtn} onClick={addItem}>
              <Icon name="plus" size={15} /> Add item
            </button>

            <div style={st.divider} />
            <div style={st.row}>
              <Field label="Discount" half>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="iv-in" style={{ ...st.input, width: 70, flex: "none" }} value={discType} onChange={(e) => setDiscType(e.target.value as any)}>
                    <option value="amount">₹</option>
                    <option value="percent">%</option>
                  </select>
                  <input className="iv-in" style={st.input} type="number" min="0" value={discVal} onChange={(e) => setDiscVal(e.target.value)} />
                </div>
              </Field>
              <Field label="GST %" half>
                <input className="iv-in" style={st.input} type="number" min="0" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} />
              </Field>
            </div>

            {/* payment method — cash vs online (UPI/card/bank). Saved on the bill
                and editable later in the Invoices tab. Kept off the printed PDF. */}
            <div style={st.field}>
              <span style={st.fieldLabel}>
                Payment method<span style={st.fieldHint}> · how they paid</span>
              </span>
              <div style={st.segWrap}>
                {(["cash", "online"] as PayMethod[]).map((mth, idx) => (
                  <button
                    key={mth}
                    type="button"
                    className="iv-seg"
                    style={{ ...st.segBtn, ...(idx === 1 ? { borderLeft: `1px solid ${LINE}` } : null), ...(payMethod === mth ? st.segBtnOn : null) }}
                    onClick={() => setPayMethod(mth)}
                  >
                    <Icon name={mth === "cash" ? "banknote" : "card"} size={14} /> {mth === "cash" ? "Cash" : "Online"}
                  </button>
                ))}
              </div>
            </div>

            {/* advance / part payment */}
            <div style={st.row}>
              <Field label="Advance received (₹)" hint="Optional — paid now" half>
                <input className="iv-in" style={st.input} type="number" min="0" value={advance}
                  placeholder="0" onChange={(e) => setAdvance(e.target.value)} />
              </Field>
              <Field label="Balance due" half>
                <div style={{ ...st.readVal, color: balanceDue > 0 || advancePaid === 0 ? INK : GREEN }}>
                  {advancePaid > 0 && balanceDue === 0 ? "Paid in full" : rupee(balanceDue)}
                </div>
              </Field>
            </div>

            <Field label="Notes / terms">
              <textarea className="iv-in" style={{ ...st.input, minHeight: 62, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Field label="Warranty details">
              <textarea
                className="iv-in"
                style={{ ...st.input, minHeight: 56, resize: "vertical" }}
                value={warranty}
                placeholder="e.g. 6 months warranty on LED & signage boards; printed material not covered."
                onChange={(e) => setWarranty(e.target.value)}
              />
            </Field>
          </section>
        </div>

        {/* ── live preview ── */}
        <div style={{ minWidth: 0 }}>
          <div className="iv-preview" style={st.previewWrap}>
            <div style={st.previewLabel}>Preview</div>
            <div style={st.paper}>
              <div style={st.pTop}>
                <div>
                  {logoOk ? (
                    <img
                      src="/images/abhijit_art_logo.png"
                      alt={biz.name || "Abhijit Art"}
                      onError={() => setLogoOk(false)}
                      style={{ height: 64, width: "auto", display: "block", marginBottom: 10 }}
                    />
                  ) : (
                    <div style={st.pBiz}>{biz.name || "Abhijit Art"}</div>
                  )}
                  <div style={st.pMuted}>
                    {biz.address}
                    {biz.phone && <><br />☎ {biz.phone}</>}
                    {biz.email && <><br />✉ {biz.email}</>}
                    {biz.gstin && <><br />GSTIN: {biz.gstin}</>}
                    {biz.pan && <><br />PAN: {biz.pan}</>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={st.pInvoice}>INVOICE</div>
                  <div style={st.pMuted}>
                    No: <b>{invNo}</b>
                    <br />Date: {fmt(date)}
                  </div>
                </div>
              </div>

              <div style={st.pLab}>Bill to</div>
              <div style={st.pStrong}>{client.name || "—"}</div>
              <div style={st.pMuted}>
                {client.address}
                {client.phone && <><br />☎ {client.phone}</>}
                {client.email && <><br />✉ {client.email}</>}
                {client.gstin && <><br />GSTIN: {client.gstin}</>}
              </div>

              <table style={st.pTable}>
                <thead>
                  <tr>
                    <th style={{ ...st.pTh, width: 26 }}>#</th>
                    <th style={st.pTh}>Description</th>
                    <th style={{ ...st.pTh, textAlign: "right", width: 44 }}>Qty</th>
                    <th style={{ ...st.pTh, textAlign: "right", width: 80 }}>Rate</th>
                    <th style={{ ...st.pTh, textAlign: "right", width: 88 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter((it) => it.desc.trim() || num(it.rate) > 0).length === 0 ? (
                    <tr><td colSpan={5} style={st.pEmpty}>No items yet</td></tr>
                  ) : (
                    items
                      .filter((it) => it.desc.trim() || num(it.rate) > 0)
                      .map((it, i) => (
                        <tr key={it.id}>
                          <td style={{ ...st.pTd, color: FAINT, textAlign: "center" }}>{i + 1}</td>
                          <td style={st.pTd}>{it.desc || "—"}</td>
                          <td style={{ ...st.pTdNum }}>{num(it.qty)}</td>
                          <td style={{ ...st.pTdNum }}>{rupee(num(it.rate))}</td>
                          <td style={{ ...st.pTdNum }}>{rupee(num(it.qty) * num(it.rate))}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>

              <table style={st.pTotals}>
                <tbody>
                  <tr><td style={st.pTLbl}>Subtotal</td><td style={st.pTVal}>{rupee(subtotal)}</td></tr>
                  {discountAmt > 0 && (
                    <tr><td style={st.pTLbl}>Discount{discType === "percent" ? ` (${num(discVal)}%)` : ""}</td><td style={st.pTVal}>− {rupee(discountAmt)}</td></tr>
                  )}
                  {num(taxPct) > 0 && (
                    <tr><td style={st.pTLbl}>GST ({num(taxPct)}%)</td><td style={st.pTVal}>{rupee(taxAmt)}</td></tr>
                  )}
                  <tr><td style={st.pGrandLbl}>Total</td><td style={st.pGrandVal}>{rupee(total)}</td></tr>
                  {advancePaid > 0 && (
                    <>
                      <tr><td style={st.pTLbl}>Advance paid</td><td style={{ ...st.pTVal, color: GREEN }}>− {rupee(advancePaid)}</td></tr>
                      <tr><td style={st.pDueLbl}>Balance due</td><td style={st.pDueVal}>{rupee(balanceDue)}</td></tr>
                    </>
                  )}
                </tbody>
              </table>

              {/* digital signature */}
              <div style={st.pSign}>
                <div style={st.pSignCap}>For {biz.name || "Abhijit Art"}</div>
                <div style={st.pSignName}>{biz.name || "Abhijit Art"}</div>
                <div style={st.pSignLine} />
                <div style={st.pSignRole}>Authorized Signatory</div>
                <div style={st.pSignMeta}>Digitally signed · {signStamp()}</div>
              </div>

              {(notes.trim() || warranty.trim()) && (
                <div style={st.pNotes}>
                  {notes.trim() && <div><b>Notes:</b> {notes}</div>}
                  {warranty.trim() && (
                    <div style={{ marginTop: notes.trim() ? 6 : 0 }}><b>Warranty:</b> {warranty}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── send invoice by email ── */}
      {mailOpen && (
        <div style={st.backdrop} onClick={() => !mailBusy && setMailOpen(false)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <div style={st.modalHead}>
              <h3 style={st.modalTitle}>Email invoice {invNo}</h3>
              <button className="iv-x" style={st.xBtn} onClick={() => setMailOpen(false)} aria-label="Close">
                <Icon name="x" size={17} />
              </button>
            </div>

            <div style={st.modalBody}>
              {mailSent ? (
                <div style={st.okBox}>{mailSent}</div>
              ) : (
                <>
                  <div style={st.mailNote}>
                    The invoice is included in the email itself — the client sees it without
                    downloading anything. Totals are recalculated on the server before sending.
                  </div>

                  <Field label="Send to">
                    <input className="iv-in" style={st.input} type="email" value={mailTo}
                      onChange={(e) => setMailTo(e.target.value)} placeholder="client@example.com" autoFocus />
                  </Field>
                  <Field label="Subject">
                    <input className="iv-in" style={st.input} value={mailSubject}
                      onChange={(e) => setMailSubject(e.target.value)} />
                  </Field>
                  <Field label="Message">
                    <textarea className="iv-in" style={{ ...st.input, minHeight: 132, resize: "vertical" }}
                      value={mailMessage} onChange={(e) => setMailMessage(e.target.value)} />
                  </Field>

                  <div style={st.mailSummary}>
                    <span>{items.filter((it) => it.desc.trim() || num(it.rate) > 0).length} line item(s)</span>
                    <span style={st.mailTotal}>{rupee(total)}</span>
                  </div>
                </>
              )}

              {mailErr && <div style={st.errBox}>{mailErr}</div>}
            </div>

            <div style={st.modalFoot}>
              {mailSent ? (
                <button className="iv-cta" style={{ ...st.cta, marginLeft: "auto" }} onClick={() => setMailOpen(false)}>Done</button>
              ) : (
                <>
                  <button className="iv-ghost" style={st.ghostBtn} onClick={() => setMailOpen(false)} disabled={mailBusy}>Cancel</button>
                  <button
                    className="iv-cta"
                    style={st.cta}
                    onClick={sendInvoice}
                    disabled={mailBusy || !mailTo.trim() || !mailSubject.trim()}
                  >
                    {mailBusy ? "Sending…" : <><Icon name="send" size={15} /> Send invoice</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── send invoice on WhatsApp ── */}
      {waOpen && (
        <div style={st.backdrop} onClick={() => !waBusy && setWaOpen(false)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <div style={st.modalHead}>
              <h3 style={st.modalTitle}>Send invoice {invNo} on WhatsApp</h3>
              <button className="iv-x" style={st.xBtn} onClick={() => setWaOpen(false)} aria-label="Close">
                <Icon name="x" size={17} />
              </button>
            </div>

            <div style={st.modalBody}>
              {waSent ? (
                <div style={st.okBox}>{waSent}</div>
              ) : (
                <>
                  <div style={st.waNote}>
                    Opens WhatsApp with this message ready to send. A shareable link to the
                    invoice PDF is added automatically — WhatsApp can't attach the file itself.
                  </div>

                  <Field label="WhatsApp number" hint="10-digit mobile, or with country code">
                    <input className="iv-in" style={st.input} value={waTo}
                      onChange={(e) => setWaTo(e.target.value)} placeholder="e.g. 7405179066" autoFocus />
                  </Field>
                  <Field label="Message">
                    <textarea className="iv-in" style={{ ...st.input, minHeight: 150, resize: "vertical" }}
                      value={waMessage} onChange={(e) => setWaMessage(e.target.value)} />
                  </Field>

                  <div style={st.mailSummary}>
                    <span>{items.filter((it) => it.desc.trim() || num(it.rate) > 0).length} line item(s)</span>
                    <span style={st.mailTotal}>{rupee(total)}</span>
                  </div>
                </>
              )}

              {waErr && <div style={st.errBox}>{waErr}</div>}
            </div>

            <div style={st.modalFoot}>
              {waSent ? (
                <button className="iv-wacta" style={{ ...st.waCta, marginLeft: "auto" }} onClick={() => setWaOpen(false)}>Done</button>
              ) : (
                <>
                  <button className="iv-ghost" style={st.ghostBtn} onClick={() => setWaOpen(false)} disabled={waBusy}>Cancel</button>
                  <button
                    className="iv-wacta"
                    style={st.waCta}
                    onClick={sendWhatsApp}
                    disabled={waBusy || waDigits(waTo).length < 10}
                  >
                    {waBusy ? "Preparing…" : <><Icon name="whatsapp" size={16} /> Open WhatsApp</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── one-time: save invoices automatically? ── */}
      {askSave && (
        <div style={{ ...st.backdrop, zIndex: 1100 }}>
          <div style={{ ...st.modal, maxWidth: 440 }}>
            <div style={st.modalHead}>
              <h3 style={st.modalTitle}>Save invoices automatically?</h3>
            </div>
            <div style={st.modalBody}>
              <p style={st.askText}>
                Keep every invoice you download or email in the <b>Invoices</b> tab, so you can
                find, reopen and re-download any bill later. You'll only be asked this once — after
                this it happens automatically in the background.
              </p>
            </div>
            <div style={st.modalFoot}>
              <button className="iv-ghost" style={st.ghostBtn} onClick={() => decideAutosave("off")}>
                Don't save
              </button>
              <button className="iv-cta" style={st.cta} onClick={() => decideAutosave("on")}>
                <Icon name="receipt" size={15} /> Yes, save automatically
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .iv-x { transition: all .18s; }
        .iv-x:hover { color: ${TERRA}; border-color: ${TERRA}55; background: #fffcf9; }

        /* shared card surface — same warm glow as the inventory cards */
        .iv-card {
          background: ${GLOW};
          border: 1px solid ${LINE};
          box-shadow: ${GLOW_SHADOW};
        }

        /* one grid shared by the items header and every item row, so the
           column labels can never drift out of line with the inputs */
        .iv-itemgrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 78px 108px 96px 30px;
          gap: 8px;
          align-items: center;
        }
        @media (max-width: 700px) {
          .iv-itemgrid { grid-template-columns: minmax(0, 1fr) 64px 84px 84px 28px; gap: 6px; }
        }

        /* number spinners were eating ~16px of the Qty field and clipping "100" */
        .iv-in[type="number"] { -moz-appearance: textfield; appearance: textfield; }
        .iv-in[type="number"]::-webkit-outer-spin-button,
        .iv-in[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

        .iv-in { transition: border-color .18s, box-shadow .18s; }
        .iv-in:focus { border-color: ${TERRA}; box-shadow: 0 0 0 3px ${TERRA}22; outline: none; }
        .iv-cta, .iv-ghost, .iv-add, .iv-del, .iv-link, .iv-seg, .iv-sug, .iv-wa, .iv-wacta { transition: all .2s ease; }
        .iv-cta:hover:not(:disabled) { background: ${TERRA_DK}; box-shadow: 0 12px 26px ${TERRA}40; transform: translateY(-1px); }
        .iv-cta:disabled, .iv-ghost:disabled, .iv-wa:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
        .iv-ghost:hover:not(:disabled) { background: #fffcf9; border-color: ${TERRA}55; color: ${TERRA}; }
        /* WhatsApp button: same ghost shape as Send by email, green accent */
        .iv-wa:hover:not(:disabled) { background: #edfaf1; border-color: ${WA}66; color: ${WA_DK}; }
        .iv-wacta:hover:not(:disabled) { background: ${WA_DK}; box-shadow: 0 12px 26px ${WA}45; transform: translateY(-1px); }
        .iv-wacta:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
        .iv-add:hover { border-color: ${TERRA}66; color: ${TERRA}; background: #fffcf9; }
        .iv-del:hover:not(:disabled) { color: ${TERRA}; background: #fdecea; }
        .iv-del:disabled { opacity: .35; cursor: not-allowed; }
        .iv-link:hover { color: ${TERRA}; }
        .iv-seg:hover { color: ${TERRA}; }
        .iv-sug:hover { background: #fffcf9; }
        @media (max-width: 1100px) { .iv-layout { grid-template-columns: minmax(0,1fr) !important; } .iv-preview { position: static !important; } }
        @media (prefers-reduced-motion: reduce) { .iv-in,.iv-cta,.iv-ghost,.iv-add,.iv-del,.iv-link,.iv-seg,.iv-sug,.iv-wa,.iv-wacta { transition: none !important; } }
      `}</style>
    </div>
  );
}

/* helpers */
function fmt(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function signStamp() {
  return new Date().toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
/* normalise a phone for wa.me — digits only; a bare 10-digit Indian mobile
   gets +91, anything that already carries a country code is left as-is */
function waDigits(raw: string) {
  let d = String(raw || "").replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10) d = "91" + d;
  return d;
}
/* escape, then turn typed newlines into line breaks for the PDF */
function escapeLines(s: string) {
  return escapeHtml(s).replace(/\r?\n/g, "<br/>");
}
function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

/* ───────────────────────── styles ───────────────────────── */
const st: Record<string, React.CSSProperties> = {
  page: { fontFamily: SANS, color: INK, minWidth: 0, maxWidth: "100%" },

  head: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 22 },
  title: { fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.6, color: INK },
  sub: { color: MUTE, fontSize: 13.5, margin: "6px 0 0" },
  headActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  savedChip: { display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "center", padding: "8px 13px", fontSize: 12.5, fontWeight: 700, color: "#15733f", background: "#e8f6ee", border: "1px solid #bfe3cd", fontFamily: SANS, whiteSpace: "nowrap" },

  cta: {
    display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 0,
    border: "none", background: TERRA, color: "#fff", fontFamily: SANS, fontWeight: 700, fontSize: 13.5,
    cursor: "pointer", boxShadow: `0 10px 22px ${TERRA}30`,
  },
  ghostBtn: {
    display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 18px", borderRadius: 0,
    border: `1px solid ${LINE}`, background: CARD, color: INK, fontFamily: SANS, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
  },
  /* WhatsApp modal primary — filled green */
  waCta: {
    display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 0,
    border: "none", background: WA, color: "#fff", fontFamily: SANS, fontWeight: 700, fontSize: 13.5,
    cursor: "pointer", boxShadow: `0 10px 22px ${WA}30`,
  },

  layout: { display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, alignItems: "start" },

  /* surface + glow come from .iv-card so the gradient can layer */
  card: { borderRadius: 0, padding: "20px 22px", minWidth: 0 },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: 800, margin: "0 0 12px", letterSpacing: -0.2, color: INK },
  subHead: { fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: MUTE, marginTop: 20 },
  saveLink: { border: "none", background: "transparent", color: MUTE, fontFamily: SANS, fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: 0 },

  row: { display: "flex", gap: 12, flexWrap: "wrap" },
  field: { display: "block", marginTop: 12 },
  fieldLabel: { display: "block", fontSize: 12.5, fontWeight: 700, color: BODY, marginBottom: 6 },
  fieldHint: { fontWeight: 500, color: MUTE, fontSize: 11.5 },
  input: {
    width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid #e6dcd2`, borderRadius: 0,
    fontSize: 14, fontFamily: SANS, background: "#fff", color: INK, colorScheme: "light",
  },
  readVal: {
    width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${LINE}`, borderRadius: 0,
    fontSize: 14, fontWeight: 800, fontFamily: SANS, background: "#fbf7f3", color: INK,
    fontVariantNumeric: "tabular-nums", display: "flex", alignItems: "center", minHeight: 40,
  },

  inputArea: {
    width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid #e6dcd2`, borderRadius: 0,
    fontSize: 14, fontFamily: SANS, background: "#fff", color: INK, resize: "vertical", minHeight: 58, lineHeight: 1.5,
  },

  inputNum: {
    width: "100%", boxSizing: "border-box", padding: "10px 10px", border: `1px solid #e6dcd2`, borderRadius: 0,
    fontSize: 14, fontFamily: SANS, background: "#fff", color: INK, colorScheme: "light",
    textAlign: "right", fontVariantNumeric: "tabular-nums",
  },

  /* customer autocomplete dropdown */
  suggestBox: {
    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 60, marginTop: 4,
    background: CARD, border: `1px solid ${LINE}`, boxShadow: "0 16px 38px -14px rgba(24,22,28,.30)",
    maxHeight: 240, overflowY: "auto",
  },
  suggestItem: {
    display: "flex", alignItems: "baseline", gap: 10, width: "100%", textAlign: "left",
    padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer",
    fontFamily: SANS, borderBottom: `1px solid #f4f1ec`,
  },
  suggestName: { fontWeight: 700, color: INK, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  suggestMeta: { fontSize: 12, color: MUTE, marginLeft: "auto", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" },

  itemHead: { fontSize: 10.5, fontWeight: 700, color: MUTE, letterSpacing: 0.7, textTransform: "uppercase", padding: "0 2px 8px" },
  itemRow: { marginBottom: 8 },
  colAmtVal: { textAlign: "right", fontSize: 13, fontWeight: 800, color: INK, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" },
  addBtn: {
    display: "inline-flex", alignItems: "center", gap: 7, marginTop: 4, padding: "9px 15px", borderRadius: 0,
    border: `1px dashed #ddd0c4`, background: "transparent", color: BODY, fontFamily: SANS, fontWeight: 700, fontSize: 13, cursor: "pointer",
  },
  delBtn: { width: 30, height: 30, flex: "none", display: "grid", placeItems: "center", borderRadius: 0, border: "none", background: "transparent", color: FAINT, cursor: "pointer" },
  divider: { height: 1, background: "#f2e8de", margin: "18px 0 4px" },

  /* payment-method segmented toggle */
  segWrap: { display: "inline-flex", border: `1px solid ${LINE}`, background: CARD },
  segBtn: { padding: "10px 18px", border: "none", background: "transparent", color: BODY, fontFamily: SANS, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 },
  segBtnOn: { background: TERRA, color: "#fff" },

  /* ── send-invoice modal ── */
  backdrop: { position: "fixed", inset: 0, background: "rgba(24,22,28,.5)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box" },
  modal: { width: "100%", maxWidth: 520, maxHeight: "calc(100vh - 40px)", background: "#fffdfb", border: `1px solid ${LINE}`, boxShadow: "0 30px 80px rgba(24,22,28,.34)", display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden" },
  modalHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "17px 22px", borderBottom: `1px solid ${LINE}`, background: CARD, flexShrink: 0 },
  modalTitle: { fontSize: 17, fontWeight: 800, margin: 0, color: INK, letterSpacing: -0.2 },
  xBtn: { width: 34, height: 34, border: `1px solid #e6dcd2`, background: CARD, color: BODY, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0, borderRadius: 0 },
  modalBody: { padding: 22, overflowY: "auto", flex: 1 },
  modalFoot: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: `1px solid ${LINE}`, background: CARD, flexShrink: 0, flexWrap: "wrap" },
  needItems: { marginBottom: 16, padding: "11px 15px", background: "#fbf3e3", border: "1px solid #efdcb2", fontSize: 12.5, color: "#8a6a1c", lineHeight: 1.55 },
  mailNote: { padding: "11px 14px", background: "#fffcf9", border: `1px solid ${LINE}`, fontSize: 12.5, color: BODY, lineHeight: 1.55, marginBottom: 4 },
  waNote: { padding: "11px 14px", background: "#effaf3", border: "1px solid #cfead9", fontSize: 12.5, color: "#2f6a45", lineHeight: 1.55, marginBottom: 4 },
  mailSummary: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, paddingTop: 14, borderTop: `1px solid ${LINE}`, fontSize: 12.5, color: MUTE, fontWeight: 600 },
  mailTotal: { fontSize: 17, fontWeight: 800, color: TERRA, fontVariantNumeric: "tabular-nums" },
  okBox: { padding: "13px 16px", background: "#e8f6ee", border: "1px solid #bfe3cd", color: "#15733f", fontSize: 13.5, fontWeight: 600 },
  errBox: { marginTop: 16, padding: "11px 14px", fontSize: 13, lineHeight: 1.5, color: "#8a2f16", background: "#fdecea", border: "1px solid #f3cfc2" },
  askText: { margin: 0, fontSize: 13.5, lineHeight: 1.65, color: BODY },

  /* ── preview: the paper stays plain white, it previews a printed doc ── */
  previewWrap: { position: "sticky", top: 20, minWidth: 0 },
  previewLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: MUTE, marginBottom: 8 },
  paper: {
    background: "#fff", border: `1px solid ${LINE_COOL}`, borderRadius: 0, padding: "30px 30px 34px",
    boxShadow: "0 1px 2px rgba(17,20,30,.04), 0 14px 40px -20px rgba(17,20,30,.22)", minWidth: 0,
  },
  pTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" },
  pBiz: { fontSize: 22, fontWeight: 800, color: TERRA, letterSpacing: -0.5 },
  pMuted: { color: MUTE, fontSize: 12, lineHeight: 1.55, marginTop: 5, whiteSpace: "pre-line" },
  pInvoice: { fontSize: 20, fontWeight: 800, letterSpacing: 2, color: INK },
  pLab: { fontSize: 10.5, letterSpacing: 1.2, textTransform: "uppercase", color: FAINT, fontWeight: 700, margin: "26px 0 5px" },
  pStrong: { fontWeight: 700, fontSize: 14 },
  pTable: { width: "100%", borderCollapse: "collapse", marginTop: 22 },
  pTh: { background: SOFT, color: MUTE, fontSize: 10.5, letterSpacing: 0.7, textTransform: "uppercase", textAlign: "left", padding: "9px 8px", borderBottom: `1px solid ${LINE_COOL}`, fontWeight: 700 },
  pTd: { padding: "9px 8px", borderBottom: `1px solid #f4f5f7`, fontSize: 13, verticalAlign: "top", wordBreak: "break-word" },
  pTdNum: { padding: "9px 8px", borderBottom: `1px solid #f4f5f7`, fontSize: 13, verticalAlign: "top", textAlign: "right", fontVariantNumeric: "tabular-nums" },
  pEmpty: { padding: "22px 8px", textAlign: "center", color: FAINT, fontSize: 13 },
  pTotals: { width: 260, marginLeft: "auto", marginTop: 16, borderCollapse: "collapse" },
  pTLbl: { padding: "6px 4px", fontSize: 12.5, color: MUTE },
  pTVal: { padding: "6px 4px", fontSize: 13, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  pGrandLbl: { padding: "12px 4px 0", fontSize: 15, fontWeight: 800, borderTop: `1px solid ${LINE_COOL}` },
  pGrandVal: { padding: "12px 4px 0", fontSize: 16, fontWeight: 800, textAlign: "right", color: TERRA, borderTop: `1px solid ${LINE_COOL}`, fontVariantNumeric: "tabular-nums" },
  pDueLbl: { padding: "10px 4px 0", fontSize: 14, fontWeight: 800, color: INK },
  pDueVal: { padding: "10px 4px 0", fontSize: 15, fontWeight: 800, textAlign: "right", color: TERRA, fontVariantNumeric: "tabular-nums" },
  pSign: { marginTop: 34, textAlign: "right" },
  pSignCap: { fontSize: 11, color: MUTE },
  pSignName: { fontFamily: "'Pinyon Script', cursive", fontSize: 30, color: TERRA, lineHeight: 1, margin: "2px 0" },
  pSignLine: { width: 160, borderBottom: `1px solid ${INK}`, margin: "6px 0 6px auto" },
  pSignRole: { fontSize: 11, color: INK, fontWeight: 700, letterSpacing: 0.3 },
  pSignMeta: { fontSize: 10.5, color: FAINT, fontWeight: 600, marginTop: 3 },
  pNotes: { marginTop: 26, paddingTop: 15, borderTop: `1px solid ${LINE_COOL}`, fontSize: 12, color: MUTE, lineHeight: 1.6, wordBreak: "break-word" },
};