// src/components/billing/index.tsx
// ── Thin shell: all state + data fetching + actions, zero UI ─────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import {
  LineItem, Party, CustomerLite, StockItem, PayMethod, DiscType, Totals,
  uid, today, num, rupee, waDigits, bumpSeq, loadBiz, saveBizToStorage,
  nextInvoiceNo, computeTotals,
  btnSt, TERRA, TERRA_DK, WA, MUTE, SANS, INK, GREEN,
} from "./types";
import { buildFullA4HTML, type InvoicePrintData } from "../invoicePrint";
import BillingForm    from "./BillingForm";
import BillingPreview from "./BillingPreview";
import EmailModal     from "./modals/EmailModal";
import WhatsAppModal  from "./modals/WhatsAppModal";
import AddCustomerModal from "./modals/AddCustomerModal";

// ── Icon ──────────────────────────────────────────────────────────────────────
function Icon({ name, size=16 }: { name:string; size?:number }) {
  const p = { fill:"none", stroke:"currentColor", strokeWidth:1.8, strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
  const map: Record<string,JSX.Element> = {
    download:  (<><path d="M12 3v12M7 10l5 5 5-5" {...p}/><path d="M5 21h14" {...p}/></>),
    reset:     <path d="M20 11a8 8 0 1 0-1.5 5.5M20 5v6h-6" {...p}/>,
    mail:      <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3.2 6.5 12 13l8.8-6.5" {...p}/>,
    save:      (<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" {...p}/><path d="M17 21v-8H7v8M7 3v5h8" {...p}/></>),
    check:     <path d="M20 6 9 17l-5-5" {...p}/>,
    warn:      (<><path d="M12 9v4M12 17h.01" {...p}/><path d="M10.3 3.9 2.4 17.4A1.9 1.9 0 0 0 4 20.3h16a1.9 1.9 0 0 0 1.6-2.9L13.7 3.9a1.9 1.9 0 0 0-3.4 0z" {...p}/></>),
    close:     <path d="M6 6l12 12M18 6 6 18" {...p}/>,
    whatsapp:  (<><path d="M3.8 20.2 5 16.4A8.4 8.4 0 1 1 8.2 19l-4.4 1.2z" {...p}/><path d="M9.2 8.6c-.15 0-.4.05-.6.3-.2.25-.75.73-.75 1.77s.77 2.05.88 2.2c.1.14 1.5 2.4 3.68 3.28 1.83.72 2.2.58 2.6.55.4-.04 1.24-.5 1.42-1 .18-.5.18-.9.12-1l-.55-.27s-1.05-.52-1.22-.58c-.16-.06-.28-.1-.4.1l-.55.7c-.1.12-.2.13-.37.05-.16-.08-.9-.33-1.66-1.05-.6-.55-1.02-1.22-1.14-1.42-.1-.2-.01-.3.07-.4l.28-.35c.1-.12.13-.2.2-.34.06-.13.03-.25 0-.35-.05-.1-.4-1.13-.6-1.55-.14-.3-.28-.3-.4-.3H9.2z" fill="currentColor" stroke="none" /></>),
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{flexShrink:0}} aria-hidden>{map[name]}</svg>;
}

// ── Turn any axios/network failure into a readable line ──────────────────────
function saveErrorText(e: any): string {
  const st  = e?.response?.status;
  const msg = e?.response?.data?.message || e?.response?.data?.error;
  if (msg) return `Save failed (${st ?? "?"}): ${msg}`;
  if (st === 401 || st === 403) return "Save failed (401) — session expired. Log out and log in again.";
  if (st === 404) return "Save failed (404) — /api/invoices not found. Check VITE_API_URL (no trailing /api).";
  if (st) return `Save failed (${st}).`;
  if (e?.message) return `Save failed — ${e.message} (backend running?)`;
  return "Save failed — could not reach the server.";
}

type SavedInvoice = { id?: string; invNo: string; pdfUrl?: string; stock?: string; stockWarn?: boolean };

// Turn the backend `stock` sync object into a short human line + warn flag.
function describeStock(stock: any): { text: string; warn: boolean } {
  if (!stock) return { text: "", warn: false };
  if (stock.error) return { text: `Stock not updated — ${stock.error}`, warn: true };
  const n = Number(stock.movementCount || 0);
  const unresolved = Array.isArray(stock.unresolved) ? stock.unresolved.length : 0;
  if (!stock.changed && !n && !unresolved) return { text: "", warn: false }; // pure-service bill
  let text = n ? `Stock updated — ${n} item${n === 1 ? "" : "s"} consumed` : "Stock checked";
  const low = Array.isArray(stock.warnings) ? stock.warnings.length : 0;
  if (low) text += `, ${low} now low/out`;
  if (unresolved) text += `, ${unresolved} line(s) unmatched (item deleted)`;
  return { text, warn: unresolved > 0 };
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Billing() {

  // ── Core state ───────────────────────────────────────────────────────────
  const [biz,       setBiz]      = useState<Party>(loadBiz);
  const [client,    setClient]   = useState<Party>({ name:"",address:"",phone:"",email:"",gstin:"",pan:"" });
  const [invNo,     setInvNo]    = useState(nextInvoiceNo);
  const [date,      setDate]     = useState(today);
  const [items,     setItems]    = useState<LineItem[]>([{ id:uid(), desc:"", qty:"1", rate:"" }]);
  const [discType,  setDiscType] = useState<DiscType>("amount");
  const [discVal,   setDiscVal]  = useState("0");
  const [taxPct,    setTaxPct]   = useState("0");
  const [notes,     setNotes]    = useState("Keep the invoices for Future References");
  const [warranty,  setWarranty] = useState("");
  const [advance,   setAdvance]  = useState("0");
  const [payMethod, setPayMethod]= useState<PayMethod>("cash");

  // ── UI state ─────────────────────────────────────────────────────────────
  const [bizSaved,  setBizSaved] = useState(false);
  const [savedTick, setSavedTick]= useState(false);
  const [savingNow, setSavingNow]= useState(false);
  const [saveErr,   setSaveErr]  = useState("");

  // The current invoice once it has been saved. Cleared on ANY content edit,
  // so Download / WhatsApp / Email only ever act on an up-to-date saved bill.
  const [savedInv,  setSavedInv] = useState<SavedInvoice | null>(null);

  // ── Images ────────────────────────────────────────────────────────────────
  const [qrBase64,   setQrBase64]   = useState("");
  const [logoBase64, setLogoBase64] = useState("");
  const [sigBase64,  setSigBase64]  = useState("");

  // ── Data ──────────────────────────────────────────────────────────────────
  const [customers,   setCustomers]   = useState<CustomerLite[]>([]);
  const [dbCustomers, setDbCustomers] = useState<CustomerLite[]>([]);
  const [stockItems,  setStockItems]  = useState<StockItem[]>([]);
  const [stockCats,   setStockCats]   = useState<string[]>([]);
  const [catFilter,   setCatFilter]   = useState("");

  // ── Modals ────────────────────────────────────────────────────────────────
  const [mailOpen,  setMailOpen]  = useState(false);
  const [mailTo,    setMailTo]    = useState("");
  const [mailSubj,  setMailSubj]  = useState("");
  const [mailMsg,   setMailMsg]   = useState("");
  const [mailBusy,  setMailBusy]  = useState(false);
  const [mailErr,   setMailErr]   = useState("");
  const [mailSent,  setMailSent]  = useState("");

  const [waOpen,    setWaOpen]    = useState(false);
  const [waTo,      setWaTo]      = useState("");
  const [waMsg,     setWaMsg]     = useState("");
  const [waBusy,    setWaBusy]    = useState(false);
  const [waErr,     setWaErr]     = useState("");
  const [waSent,    setWaSent]    = useState("");

  const [addCustOpen,  setAddCustOpen]  = useState(false);
  const pendingAction = useRef<(()=>void)|null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const totals: Totals = useMemo(() => computeTotals(items, discType, discVal, taxPct), [items, discType, discVal, taxPct]);
  const advancePaid = Math.min(Math.max(num(advance), 0), totals.total);
  const balanceDue  = Math.max(totals.total - advancePaid, 0);
  const hasLines    = items.some(it => it.desc.trim() || num(it.rate) > 0);
  const canExport   = !!savedInv;               // exports unlock only after a save

  // ── Load images ───────────────────────────────────────────────────────────
  useEffect(() => {
    const toB64 = (src: string) => new Promise<string>(res => {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => { const c = document.createElement("canvas"); c.width=img.naturalWidth; c.height=img.naturalHeight; c.getContext("2d")!.drawImage(img,0,0); res(c.toDataURL()); };
      img.onerror = () => res(""); img.src = src;
    });
    toB64("/images/QR.jpeg").then(setQrBase64);
    toB64("/images/abhijit_art_logo.png").then(setLogoBase64);
    toB64("/images/Signature.png").then(setSigBase64);
  }, []);

  // ── Load customers ────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/api/invoices").then(r => {
      const seen = new Set<string>(); const out: CustomerLite[] = [];
      for (const inv of Array.isArray(r.data)?r.data:[]) {
        const name = String(inv.clientName||"").trim(); const phone = String(inv.clientPhone||"").trim();
        if (!name&&!phone) continue;
        const k = (phone||name).toLowerCase(); if(seen.has(k)) continue; seen.add(k);
        out.push({ name, phone, email:String(inv.clientEmail||"").trim(), gstin:String(inv.clientGstin||"").trim(), address:String(inv.clientAddr||"").trim() });
      }
      setCustomers(out);
    }).catch(e => console.warn("[billing] customer list load failed:", e));
  }, []);

  const loadDbCustomers = () => {
    api.get("/api/users").then(r => {
      setDbCustomers((Array.isArray(r.data)?r.data:[]).map((u:any) => ({ name:String(u.name||"").trim(), phone:String(u.phone||"").trim(), email:String(u.email||"").trim(), gstin:"", address:String(u.address||"").trim() })));
    }).catch(e => console.warn("[billing] users load failed:", e));
  };
  useEffect(() => { loadDbCustomers(); }, []);

  // ── Load stock items ──────────────────────────────────────────────────────
  const loadStock = () => {
    api.get("/api/inventory/items").then(r => {
      const rows: StockItem[] = Array.isArray(r.data)?r.data:[];
      setStockItems(rows);
      setStockCats(Array.from(new Set(rows.map(r=>r.category).filter(Boolean))).sort() as string[]);
    }).catch(e => console.warn("[billing] inventory load failed:", e));
  };
  useEffect(() => { loadStock(); }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const normPhone = (v: string) => v.replace(/[\s\-()]/g,"").replace(/^\+91/,"").replace(/^0+/,"");

  const clientIsRegistered = () => {
    const np = normPhone(client.phone.trim()); const nm = client.name.trim().toLowerCase();
    return dbCustomers.some(c => {
      const cp = normPhone(c.phone);
      if (np&&cp&&np===cp) return true;
      if (nm&&c.name.trim().toLowerCase()===nm) return true;
      return false;
    });
  };

  const withCustomer = (action: ()=>void) => {
    if (!client.name.trim()) { action(); return; }
    if (clientIsRegistered()) { action(); return; }
    pendingAction.current = action;
    setAddCustOpen(true);
  };

  // Closing the add-customer modal must NEVER swallow the invoice action.
  const closeAddCustomer = () => {
    setAddCustOpen(false);
    const act = pendingAction.current; pendingAction.current = null;
    if (act) setTimeout(act, 50);   // continue without registering the customer
  };

  const invoicePayload = () => ({
    invNo, date, biz, client,
    items: items.filter(it=>it.desc.trim()||num(it.rate)>0).map(it=>({
      desc:it.desc, qty:num(it.qty), rate:num(it.rate),
      ...(it.itemId?{itemId:it.itemId}:{}),
    })),
    discType, discVal, taxPct, notes, warranty, paidAmount:advancePaid, paymentMethod:payMethod,
  });

  // ── SAVE — persist + consume stock. Number is NOT rolled here, so the saved
  //          bill stays on screen and can be exported. "New invoice" rolls it. ─
  const persistInvoice = async (): Promise<boolean> => {
    if (!hasLines || savingNow) return false;
    setSaveErr(""); setSavingNow(true);
    try {
      const res = await api.post("/api/invoices", invoicePayload());
      const inv = res?.data || {};
      const s = describeStock(inv.stock);
      bumpSeq(invNo);                              // reserve this number for good
      setSavedInv({
        id:        inv.id,
        invNo,
        pdfUrl:    inv.pdfUrl || "",
        stock:     s.text,
        stockWarn: s.warn,
      });
      loadStock();                                 // refresh on-hand quantities
      setSavedTick(true); setTimeout(()=>setSavedTick(false), 3000);
      return true;
    } catch (e:any) {
      console.error("[billing] POST /api/invoices failed", e?.response?.status, e?.response?.data || e);
      setSaveErr(saveErrorText(e));
      return false;
    } finally {
      setSavingNow(false);
    }
  };

  const saveNow = () => { persistInvoice(); };

  // Any edit to invoice content invalidates the saved copy → must re-save.
  const contentKey = useMemo(
    () => JSON.stringify({ items, client, biz, date, invNo, discType, discVal, taxPct, notes, warranty, advance, payMethod }),
    [items, client, biz, date, invNo, discType, discVal, taxPct, notes, warranty, advance, payMethod]
  );
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setSavedInv(null);
  }, [contentKey]);

  const resetBilling = () => {
    setClient({name:"",address:"",phone:"",email:"",gstin:"",pan:""});
    setItems([{id:uid(),desc:"",qty:"1",rate:""}]);
    setDiscVal("0"); setTaxPct("0"); setNotes("Keep the invoices for Future References");
    setWarranty(""); setAdvance("0"); setPayMethod("cash");
    setDate(today()); setInvNo(nextInvoiceNo()); setCatFilter("");
    setSavedInv(null); setSaveErr("");
  };

  const saveBiz = () => { saveBizToStorage(biz); setBizSaved(true); setTimeout(()=>setBizSaved(false),2000); };

  // ── Download PDF — full A4 portrait, one bill per sheet (needs saved bill) ─
  const download = () => {
    if (!savedInv) return;
    const printedNo = savedInv.invNo;
    const fmtD = (d:string) => { const dt=new Date(d); if(isNaN(dt.getTime()))return d; return dt.toLocaleDateString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric"}); };
    const payload: InvoicePrintData = {
      logoSrc:logoBase64||"/images/abhijit_art_logo.png", qrSrc:qrBase64,
      bizName:biz.name, bizPan:biz.pan, bizGstin:biz.gstin, bizAddress:biz.address, bizPhone:biz.phone, bizEmail:biz.email,
      invNo:printedNo, invDate:fmtD(date), invTime:new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}),
      clientName:client.name, clientAddr:client.address, clientPhone:client.phone, clientGstin:client.gstin,
      items: items.filter(it=>it.desc.trim()||num(it.rate)>0).map(it=>({desc:it.desc,qty:num(it.qty),rate:num(it.rate)})),
      discType, discVal:num(discVal), taxPct:num(taxPct),
      subtotal:totals.subtotal, discountAmt:totals.discountAmt, taxAmt:totals.taxAmt, total:totals.total,
      paidAmount:advancePaid, notes, warranty,
    };
    const w = window.open("","_blank","width=1280,height=820");
    if (!w) { setSaveErr("Popup blocked — allow popups for this site to get the PDF."); return; }
    const html = buildFullA4HTML(payload).replace(/src="\/images\/Signature\.png"/g, `src="${sigBase64||'/images/Signature.png'}"`);
    w.document.write(html); w.document.close();
  };

  // ── Email (needs saved bill) ────────────────────────────────────────────────
  const openMail = () => {
    if (!savedInv) return;
    setMailErr(""); setMailSent(""); setMailTo(client.email||"");
    setMailSubj(`Invoice ${savedInv.invNo} from ${biz.name||"Abhijit Art"}`);
    setMailMsg(`Dear ${client.name||"Customer"},\n\nPlease find your invoice ${savedInv.invNo} for a total of ${rupee(totals.total)}.\n\nWarm regards,\n${biz.name||"Abhijit Art"}`);
    setMailOpen(true);
  };

  const sendMail = async () => {
    setMailBusy(true); setMailErr("");
    try {
      await api.post("/api/invoices/email", { to:mailTo.trim(), subject:mailSubj, message:mailMsg, invoiceId:savedInv?.id, invoice:invoicePayload(), paidAmount:advancePaid });
      setMailSent(`Invoice emailed to ${mailTo.trim()}.`);
    } catch(e:any) {
      console.error("[billing] POST /api/invoices/email failed", e?.response?.status, e?.response?.data || e);
      setMailErr(e?.response?.data?.message||"Couldn't send.");
    }
    finally { setMailBusy(false); }
  };

  // ── WhatsApp (needs saved bill; reuses its PDF link) ────────────────────────
  const openWA = () => {
    if (!savedInv) return;
    setWaErr(""); setWaSent(""); setWaTo(client.phone||"");
    setWaMsg(`Dear ${client.name||"Customer"},\n\nHere is your invoice ${savedInv.invNo} from ${biz.name||"Abhijit Art"}.\n\nTotal: ${rupee(totals.total)}${advancePaid>0?`\nAdvance paid: ${rupee(advancePaid)}\nBalance due: ${rupee(balanceDue)}`:""}\n\nThank you for your business!`);
    setWaOpen(true);
  };

  const sendWA = async () => {
    const digits = waDigits(waTo);
    if (digits.length < 10) { setWaErr("Enter a valid 10-digit mobile number."); return; }
    setWaBusy(true); setWaErr("");
    let pdfUrl = savedInv?.pdfUrl || "";
    if (!pdfUrl && savedInv?.id) {
      try { const g = await api.get(`/api/invoices/${savedInv.id}`); pdfUrl = g?.data?.pdfUrl || ""; }
      catch (e) { console.warn("[billing] pdfUrl refetch failed", e); }
    }
    const finalMsg = waMsg + (pdfUrl?`\n\n📄 Invoice PDF: ${pdfUrl}`:"");
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(finalMsg)}`;
    window.open(url,"_blank");
    setWaBusy(false); setWaSent(`Opening WhatsApp for +${digits}…`);
    setTimeout(()=>{ setWaOpen(false); setWaSent(""); },1500);
  };

  // Save button style — turns green once the invoice is saved.
  const saveBtnStyle: React.CSSProperties = savedInv
    ? { ...btnSt.save, background:"#e8f6ee", borderColor:"#bfe3cd", color:GREEN }
    : btnSt.save;

  // ═══════════════════════════════════════════════════════ RENDER ════════════
  return (
    <div style={{ fontFamily:SANS, color:INK, minWidth:0, maxWidth:"100%" }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:20, flexWrap:"wrap", marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, margin:0, letterSpacing:-.6, color:INK }}>Invoice maker</h1>
          <p style={{ color:MUTE, fontSize:13.5, margin:"6px 0 0" }}>Save the invoice, then download / WhatsApp / email it.</p>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          {savedTick && (
            <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 13px", fontSize:12.5, fontWeight:700, color:GREEN, background:"#e8f6ee", border:"1px solid #bfe3cd" }}>
              <Icon name="check" size={14}/> Saved
            </span>
          )}
          <button className="bl-toolbar" style={btnSt.ghost} onClick={resetBilling}><Icon name="reset" size={15}/> New invoice</button>
          <button className="bl-toolbar-save" style={saveBtnStyle} onClick={()=>withCustomer(saveNow)} disabled={!hasLines||savingNow}>
            <Icon name={savedInv?"check":"save"} size={15}/>{savingNow?"Saving…":(savedInv?"Saved ✓":"Save invoice")}
          </button>
          <button className="bl-toolbar" style={btnSt.ghost} onClick={openMail} disabled={!canExport}><Icon name="mail" size={15}/> Send by email</button>
          <button className="bl-toolbar-wa" style={btnSt.ghost} onClick={openWA} disabled={!canExport}><span style={{color:WA,display:"inline-flex"}}><Icon name="whatsapp" size={16}/></span> WhatsApp</button>
          <button className="bl-toolbar-cta" style={btnSt.cta} onClick={download} disabled={!canExport}><Icon name="download" size={16}/> Download PDF</button>
        </div>
      </div>

      {/* ── Save error banner ─────────────────────────────────────────────── */}
      {saveErr && (
        <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:16, padding:"12px 15px", background:"#fdecea", border:"1px solid #f3cfc2", color:"#8a2f16", fontSize:13, lineHeight:1.55 }}>
          <span style={{ marginTop:1, flexShrink:0 }}><Icon name="warn" size={16}/></span>
          <span style={{ flex:1 }}>
            <b style={{ display:"block", marginBottom:2 }}>Not saved to Invoices</b>
            {saveErr}
            <span style={{ display:"block", marginTop:4, opacity:.8 }}>Open the browser console for the full response.</span>
          </span>
          <button onClick={()=>setSaveErr("")} title="Dismiss"
            style={{ background:"none", border:"none", color:"#8a2f16", cursor:"pointer", padding:2, lineHeight:0, flexShrink:0 }}>
            <Icon name="close" size={15}/>
          </button>
        </div>
      )}

      {/* ── State hints ───────────────────────────────────────────────────── */}
      {!hasLines && (
        <div style={{ marginBottom:16, padding:"11px 15px", background:"#fbf3e3", border:"1px solid #efdcb2", fontSize:12.5, color:"#8a6a1c", lineHeight:1.55 }}>
          Add a line item below to begin.
        </div>
      )}

      {hasLines && !savedInv && (
        <div style={{ marginBottom:16, padding:"11px 15px", background:"#fbf3e3", border:"1px solid #efdcb2", fontSize:12.5, color:"#8a6a1c", lineHeight:1.55 }}>
          Press <b>Save invoice</b> to store it and consume stock. Download PDF, WhatsApp and Send by email unlock right after.
        </div>
      )}

      {savedInv && (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, padding:"11px 15px", background:"#e8f6ee", border:"1px solid #bfe3cd", fontSize:12.5, color:"#1f6b41", lineHeight:1.55 }}>
          <span style={{ display:"inline-flex", flexShrink:0 }}><Icon name="check" size={16}/></span>
          <span style={{ flex:1 }}>
            Invoice <b>{savedInv.invNo}</b> saved{savedInv.stock && !savedInv.stockWarn ? <> · {savedInv.stock}</> : null}. You can download the PDF, send it on WhatsApp or email it now.
          </span>
        </div>
      )}

      {savedInv && savedInv.stockWarn && savedInv.stock && (
        <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:16, padding:"11px 15px", background:"#fbf3e3", border:"1px solid #efdcb2", fontSize:12.5, color:"#8a6a1c", lineHeight:1.55 }}>
          <span style={{ marginTop:1, flexShrink:0 }}><Icon name="warn" size={15}/></span>
          <span style={{ flex:1 }}>{savedInv.stock}. The bill is saved — open <b>Inventory</b> to reconcile the affected item(s).</span>
        </div>
      )}

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="bl-layout" style={{ display:"grid", gridTemplateColumns:"minmax(0,1.35fr) minmax(0,1fr)", gap:18, alignItems:"start" }}>
        <BillingForm
          biz={biz} client={client} invNo={invNo} date={date}
          items={items} discType={discType} discVal={discVal} taxPct={taxPct}
          notes={notes} warranty={warranty} advance={advance} payMethod={payMethod}
          advancePaid={advancePaid} balanceDue={balanceDue} total={totals.total}
          stockItems={stockItems} stockCats={stockCats} catFilter={catFilter}
          customers={customers} dbCustomers={dbCustomers} bizSaved={bizSaved}
          onBizChange={setBiz} onClientChange={setClient}
          onInvNoChange={setInvNo} onDateChange={setDate}
          onItemsChange={setItems} onDiscTypeChange={setDiscType}
          onDiscValChange={setDiscVal} onTaxPctChange={setTaxPct}
          onNotesChange={setNotes} onWarrantyChange={setWarranty}
          onAdvanceChange={setAdvance} onPayMethodChange={setPayMethod}
          onCatFilterChange={setCatFilter} onSaveBiz={saveBiz}
        />
        <BillingPreview
          biz={biz} client={client} invNo={invNo} date={date}
          items={items} totals={totals} advancePaid={advancePaid} balanceDue={balanceDue}
          taxPct={taxPct} qrBase64={qrBase64} logoBase64={logoBase64} sigBase64={sigBase64}
          notes={notes} warranty={warranty}
        />
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {mailOpen && (
        <EmailModal invNo={savedInv?.invNo || invNo} bizName={biz.name} total={totals.total}
          itemCount={items.filter(it=>it.desc.trim()||num(it.rate)>0).length}
          to={mailTo} subject={mailSubj} message={mailMsg}
          busy={mailBusy} err={mailErr} sent={mailSent}
          onChange={(k,v)=>{ if(k==="to")setMailTo(v); else if(k==="subject")setMailSubj(v); else setMailMsg(v); }}
          onSend={sendMail} onClose={()=>setMailOpen(false)}/>
      )}
      {waOpen && (
        <WhatsAppModal invNo={savedInv?.invNo || invNo} total={totals.total}
          itemCount={items.filter(it=>it.desc.trim()||num(it.rate)>0).length}
          to={waTo} message={waMsg}
          busy={waBusy} err={waErr} sent={waSent}
          onChange={(k,v)=>{ if(k==="to")setWaTo(v); else setWaMsg(v); }}
          onSend={sendWA} onClose={()=>setWaOpen(false)}/>
      )}
      {addCustOpen && (
        <AddCustomerModal
          initialName={client.name} initialPhone={client.phone}
          initialEmail={client.email} initialAddr={client.address}
          onClose={closeAddCustomer}
          onAdded={(name,phone,email,address)=>{
            loadDbCustomers();
            setClient(cl=>({...cl,name,phone,email,address}));
            setAddCustOpen(false);
            const act=pendingAction.current; pendingAction.current=null;
            setTimeout(()=>act&&act(),60);
          }}/>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .bl-toolbar:hover:not(:disabled){ background:#fffcf9!important; border-color:${TERRA}55!important; color:${TERRA}!important; }
        .bl-toolbar-wa:hover:not(:disabled){ background:#edfaf1!important; border-color:${WA}66!important; color:${WA}!important; }
        .bl-toolbar-save:hover:not(:disabled){ background:${TERRA}!important; color:#fff!important; border-color:${TERRA}!important; }
        .bl-toolbar-cta:hover:not(:disabled){ background:${TERRA_DK}!important; transform:translateY(-1px); box-shadow:0 12px 26px ${TERRA}40!important; }
        .bl-toolbar:disabled,.bl-toolbar-wa:disabled,.bl-toolbar-save:disabled,.bl-toolbar-cta:disabled{ opacity:.45; cursor:not-allowed; }
        @media(max-width:1100px){ .bl-layout{ grid-template-columns:minmax(0,1fr)!important; } }
        @media(prefers-reduced-motion:reduce){ *{ transition:none!important; } }
      `}</style>
    </div>
  );
}