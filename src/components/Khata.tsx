import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../api";

// ── Types ──
interface KhataItem { desc: string; qty: number; rate: number; }
interface KhataEntry {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: KhataItem[];
  description: string;
  amount: number;
  advancePaid: number;
  paymentMethod: "cash" | "online";
  status: "unbilled" | "billed";
  invoiceNo?: string;
  entryDate: string;
  createdAt: string;
}
interface LedgerRow {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  totalOrders: number;
  unbilledCount?: number;
  totalAmount: number;
  totalAdvance: number;
  totalDue: number;
}
interface CustomerRec { id: string; name: string; phone: string; email: string; }

// ── Constants ──
const ACCENT = "#d9542f";
const GOLD   = "#c2974a";

// ── Helpers ──
const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtTimeSec(d: string) {
  if (!d) return "";
  const dt = new Date(d); if (isNaN(dt.getTime())) return "";
  return dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

const EMPTY_ITEM = (): KhataItem => ({ desc: "", qty: 1, rate: 0 });

export default function Khata() {
  const [view, setView]           = useState<"daily" | "ledger">("daily");
  const [date, setDate]           = useState(todayStr());
  const [entries, setEntries]     = useState<KhataEntry[]>([]);
  const [ledger, setLedger]       = useState<LedgerRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRec[]>([]);
  const [loading, setLoading]     = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [combining, setCombining] = useState(false);

  // modal
  const [showModal, setShowModal]     = useState(false);
  const [editEntry, setEditEntry]     = useState<KhataEntry | null>(null);
  const [saving, setSaving]           = useState(false);

  // customer picker inside modal
  const [custQuery, setCustQuery]     = useState("");
  const [custSel, setCustSel]         = useState<CustomerRec | null>(null);
  const [custDdOpen, setCustDdOpen]   = useState(false);

  // add-customer popup
  const [showAddCust, setShowAddCust] = useState(false);
  const [newCust, setNewCust]         = useState({ name: "", phone: "", email: "", address: "" });
  const [addingCust, setAddingCust]   = useState(false);
  const [addCustErr, setAddCustErr]   = useState("");

  // form
  const [items, setItems]             = useState<KhataItem[]>([EMPTY_ITEM()]);
  const [desc, setDesc]               = useState("");
  const [advance, setAdvance]         = useState("");
  const [payMethod, setPayMethod]     = useState<"cash" | "online">("cash");
  const [entryDate, setEntryDate]     = useState(todayStr());

  // ledger drill
  const [ledgerCust, setLedgerCust]   = useState<LedgerRow | null>(null);
  const [custEntries, setCustEntries] = useState<KhataEntry[]>([]);
  const [loadingCust, setLoadingCust] = useState(false);

  // ── Load ──
  const loadEntries = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get(`/api/khata?date=${date}`); setEntries(data); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [date]);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/api/khata/ledger"); setLedger(data); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const loadCustomers = useCallback(async () => {
    try { const { data } = await api.get("/api/users"); setCustomers(data || []); }
    catch { /* ignore */ }
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);
  useEffect(() => { if (view === "daily") loadEntries(); else loadLedger(); }, [view, loadEntries, loadLedger]);

  // customer search dropdown
  const custMatches = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.phone || "").includes(custQuery.trim())
    ).slice(0, 8);
  }, [custQuery, customers]);

  // auto-calc amount from items
  const calcAmount = useMemo(() =>
    items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0),
    [items]
  );
  const advNum = parseFloat(advance) || 0;
  const dueNum = Math.max(0, calcAmount - advNum);

  // ── Modal helpers ──
  function openCreate() {
    setEditEntry(null);
    setCustSel(null); setCustQuery(""); setCustDdOpen(false);
    setItems([EMPTY_ITEM()]); setDesc(""); setAdvance(""); setPayMethod("cash"); setEntryDate(todayStr());
    setShowModal(true);
  }
  function openEdit(e: KhataEntry) {
    setEditEntry(e);
    const match = customers.find((c) => c.id === e.customerId) ||
                  customers.find((c) => c.phone === e.customerPhone) || null;
    setCustSel(match || { id: e.customerId || "", name: e.customerName, phone: e.customerPhone, email: e.customerEmail });
    setCustQuery(""); setCustDdOpen(false);
    setItems(e.items.length ? e.items : [EMPTY_ITEM()]);
    setDesc(e.description || "");
    setAdvance(e.advancePaid ? String(e.advancePaid) : "");
    setPayMethod(e.paymentMethod);
    setEntryDate(e.entryDate.slice(0, 10));
    setShowModal(true);
  }
  function addItem() { setItems((p) => [...p, EMPTY_ITEM()]); }
  function updateItem(i: number, patch: Partial<KhataItem>) {
    setItems((p) => p.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  }
  function removeItem(i: number) { setItems((p) => p.filter((_, idx) => idx !== i)); }

  function selectCustomer(c: CustomerRec) {
    setCustSel(c); setCustDdOpen(false); setCustQuery("");
  }
  function openAddCustomer(name: string) {
    setNewCust({ name: name.trim(), phone: "", email: "", address: "" });
    setAddCustErr(""); setCustDdOpen(false); setShowAddCust(true);
  }
  async function saveNewCustomer() {
    setAddCustErr("");
    if (!newCust.name.trim()) { setAddCustErr("Full name is required."); return; }
    setAddingCust(true);
    try {
      const { data } = await api.post("/api/users", {
        name: newCust.name.trim(), phone: newCust.phone.trim(),
        email: newCust.email.trim() || `walkin_${Date.now()}@abhijitart.com`,
        address: newCust.address.trim(),
      });
      const rec: CustomerRec = { id: data.id, name: data.name, phone: data.phone || "", email: data.email || "" };
      setCustomers((p) => [rec, ...p]);
      setCustSel(rec); setShowAddCust(false);
    } catch (err: any) {
      setAddCustErr(err.response?.data?.message || err.response?.data?.error || "Failed to add customer.");
    } finally { setAddingCust(false); }
  }

  const canSave = !!(custSel && items.some((it) => it.desc.trim()) && calcAmount > 0);

  async function saveEntry() {
    if (!canSave || !custSel) return;
    setSaving(true);
    try {
      const payload = {
        customerId:    custSel.id || null,
        customerName:  custSel.name,
        customerPhone: custSel.phone,
        customerEmail: custSel.email,
        items:         items.filter((it) => it.desc.trim()),
        description:   desc,
        amount:        calcAmount,
        advancePaid:   advNum,
        paymentMethod: payMethod,
        entryDate,
      };
      if (editEntry) {
        const { data } = await api.patch(`/api/khata/${editEntry.id}`, payload);
        setEntries((p) => p.map((e) => e.id === data.id ? data : e));
      } else {
        const { data } = await api.post("/api/khata", payload);
        setEntries((p) => [data, ...p]);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save entry");
    } finally { setSaving(false); }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this khata entry?")) return;
    try { await api.delete(`/api/khata/${id}`); setEntries((p) => p.filter((e) => e.id !== id)); }
    catch (err: any) { alert(err.response?.data?.error || "Failed to delete"); }
  }

  async function convertToInvoice(id: string) {
    if (!confirm("Convert this entry to a full invoice? This cannot be undone.")) return;
    setConverting(id);
    try {
      const { data } = await api.post(`/api/khata/${id}/convert`);
      setEntries((p) => p.map((e) => e.id === id ? { ...e, status: "billed", invoiceNo: data.invoiceNo } : e));
      alert(`Invoice ${data.invoiceNo} created!`);
    } catch (err: any) { alert(err.response?.data?.error || "Failed to convert"); }
    finally { setConverting(null); }
  }

  // Merge all unbilled entries for the drilled customer into ONE invoice
  async function convertCombined() {
    const unbilled = custEntries.filter((e) => e.status !== "billed");
    if (unbilled.length === 0) { alert("No unbilled entries to combine."); return; }
    if (unbilled.length === 1) { convertToInvoice(unbilled[0].id); return; }
    if (!confirm(`Combine ${unbilled.length} unbilled orders into ONE invoice for ${ledgerCust?.customerName}? This cannot be undone.`)) return;
    setCombining(true);
    try {
      const { data } = await api.post("/api/khata/convert-combined", { entryIds: unbilled.map((e) => e.id) });
      // mark all as billed in the drawer
      setCustEntries((p) => p.map((e) => unbilled.some((u) => u.id === e.id) ? { ...e, status: "billed", invoiceNo: data.invoiceNo } : e));
      setEntries((p) => p.map((e) => unbilled.some((u) => u.id === e.id) ? { ...e, status: "billed", invoiceNo: data.invoiceNo } : e));
      alert(`Combined invoice ${data.invoiceNo} created from ${data.mergedCount} orders!`);
      loadLedger();
    } catch (err: any) { alert(err.response?.data?.error || "Failed to create combined invoice"); }
    finally { setCombining(false); }
  }

  async function drillCustomer(row: LedgerRow) {
    setLedgerCust(row); setLoadingCust(true);
    try {
      const params = row.customerId ? `customerId=${row.customerId}` : ``;
      const { data } = await api.get(`/api/khata?${params}`);
      setCustEntries(data.filter((e: KhataEntry) =>
        row.customerId ? e.customerId === row.customerId : e.customerName === row.customerName
      ));
    } catch { /* ignore */ } finally { setLoadingCust(false); }
  }

  // ── Summary (daily) ──
  const totalToday = entries.reduce((s, e) => s + Number(e.amount), 0);
  const totalAdv   = entries.reduce((s, e) => s + Number(e.advancePaid), 0);
  const totalDue   = Math.max(0, totalToday - totalAdv);

  return (
    <div className="kh">
      <style>{`
        .kh { font-family:'DM Sans',system-ui,sans-serif; color:#1f2430; font-variant-numeric:tabular-nums; }
        .kh * { box-sizing:border-box; }
        .kh-topbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:18px; }
        .kh-tabs { display:flex; border:1px solid #d9dce3; }
        .kh-tab { padding:8px 18px; border:none; background:#fff; font-size:.84rem; font-weight:600; cursor:pointer; font-family:inherit; color:#6b7280; }
        .kh-tab.on { background:${ACCENT}; color:#fff; }
        .kh-date { padding:8px 12px; border:1px solid #d9dce3; font-size:.84rem; font-family:inherit; }
        .kh-date:focus { outline:2px solid ${ACCENT}; outline-offset:-1px; }
        .kh-add { margin-left:auto; background:${ACCENT}; color:#fff; border:none; padding:9px 18px; font-size:.84rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .kh-add:hover { background:#b8421f; }
        .kh-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:18px; }
        .kh-stat { background:#fff; border:1px solid #e8e8ee; border-top:3px solid #cfd3db; padding:14px 16px; }
        .kh-stat.total { border-top-color:${GOLD}; }
        .kh-stat.adv   { border-top-color:#15803d; }
        .kh-stat.due   { border-top-color:${ACCENT}; }
        .kh-stat-n { font-size:1.5rem; font-weight:700; line-height:1; }
        .kh-stat.due .kh-stat-n { color:${ACCENT}; }
        .kh-stat-l { font-size:.68rem; text-transform:uppercase; letter-spacing:.07em; color:#6b7280; margin-top:4px; }
        /* entries */
        .kh-list { display:grid; gap:10px; }
        .kh-card { background:#fff; border:1px solid #e8e8ee; padding:0; }
        .kh-card-head { display:flex; align-items:center; gap:10px; padding:12px 14px; border-bottom:1px solid #f0f0f4; }
        .kh-card-head .name { font-weight:700; font-size:.95rem; flex:1; min-width:0; }
        .kh-card-head .phone { font-size:.8rem; color:#6b7280; }
        .kh-card-head .time { font-size:.75rem; color:#9ca3af; }
        .kh-card-head .status { padding:2px 8px; border-radius:999px; font-size:.68rem; font-weight:700; }
        .kh-card-head .status.unbilled { background:#fef3c7; color:#92400e; }
        .kh-card-head .status.billed { background:#dcfce7; color:#15803d; }
        .kh-card-body { padding:12px 14px; }
        .kh-items { font-size:.84rem; margin-bottom:10px; }
        .kh-item-row { display:flex; justify-content:space-between; gap:8px; padding:4px 0; border-bottom:1px dashed #f0f0f4; }
        .kh-item-row:last-child { border-bottom:none; }
        .kh-item-row .d { flex:1; min-width:0; color:#374151; }
        .kh-item-row .r { font-weight:600; white-space:nowrap; }
        .kh-note { font-size:.8rem; color:#6b7280; font-style:italic; margin-bottom:8px; }
        .kh-billing { display:flex; gap:18px; align-items:center; flex-wrap:wrap; }
        .kh-billing div span { font-size:.62rem; text-transform:uppercase; letter-spacing:.04em; color:#9ca3af; display:block; }
        .kh-billing div b { font-size:.9rem; font-weight:700; }
        .kh-billing .due b { color:${ACCENT}; }
        .kh-billing .paid b { color:#15803d; }
        .kh-billing .pm { background:#f3f4f6; padding:2px 8px; border-radius:999px; font-size:.7rem; font-weight:700; color:#374151; }
        .kh-card-actions { display:flex; gap:6px; padding:10px 14px; border-top:1px solid #f0f0f4; }
        .kh-abtn { padding:5px 12px; border:1px solid #d9dce3; font-size:.76rem; cursor:pointer; font-family:inherit; background:#fff; color:#1f2430; }
        .kh-abtn:hover { background:#f5f5f8; }
        .kh-abtn.primary { background:${GOLD}; color:#fff; border-color:${GOLD}; }
        .kh-abtn.primary:hover { background:#a87c35; }
        .kh-abtn.danger { color:${ACCENT}; border-color:#f5c4bb; }
        .kh-abtn.danger:hover { background:#fef2ee; }
        /* ledger */
        .kh-combine-btn { width:100%; padding:11px 16px; border:none; background:${ACCENT}; color:#fff; font-family:inherit; font-size:.84rem; font-weight:700; cursor:pointer; transition:background .15s; }
        .kh-combine-btn:hover:not(:disabled) { background:#c2461f; }
        .kh-combine-btn:disabled { opacity:.55; cursor:not-allowed; }
        .kh-ledger { background:#fff; border:1px solid #e8e8ee; }
        .kh-unbilled-badge { display:inline-block; margin-left:8px; padding:1px 8px; font-size:.66rem; font-weight:700; letter-spacing:.02em; color:#b45309; background:#fef3c7; border:1px solid #fde68a; border-radius:999px; vertical-align:middle; }
        /* drill drawer */
        /* Ledger table — matches Invoices "By Customer" page */
        .kh-lcard { background:#fff; border:1px solid #ececf1; }
        .kh-ltbl-wrap { overflow-x:auto; }
        .kh-ltbl { width:100%; border-collapse:collapse; font-size:14px; }
        .kh-ltbl th { text-align:left; padding:13px 18px; font-size:10.5px; letter-spacing:.07em; text-transform:uppercase; color:#8a8f9a; background:#fafbfc; border-bottom:1px solid #ececf1; font-weight:700; white-space:nowrap; }
        .kh-ltbl th.rgt { text-align:right; } .kh-ltbl th.ctr { text-align:center; }
        .kh-ltbl td { padding:14px 18px; border-bottom:1px solid #f4f1ec; color:#2a2f3a; vertical-align:middle; }
        .kh-ltbl td.rgt { text-align:right; font-variant-numeric:tabular-nums; } .kh-ltbl td.ctr { text-align:center; }
        .kh-ltbl td.bold { font-weight:700; } .kh-ltbl td.faint { color:#b6bac3; } .kh-ltbl td.grn { color:#15733f; }
        .kh-ltbl td.chev { color:#b6bac3; font-size:1.1rem; }
        .kh-ltr { cursor:pointer; transition:background .12s; }
        .kh-ltr:hover td { background:#fff6ee; }
        .kh-ltname { font-weight:700; font-size:14px; color:#1f2430; }
        .kh-ltphone { font-size:12px; color:#b6bac3; margin-top:2px; }

        /* Drill modal — matches Invoices customer statement drawer */
        .kh-backdrop { position:fixed; inset:0; background:rgba(24,22,28,.5); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; box-sizing:border-box; }
        .kh-modal2b { width:min(480px,100%); max-height:calc(100vh - 40px); background:#fffdfb; box-shadow:0 30px 80px rgba(24,22,28,.34); display:flex; flex-direction:column; overflow-y:auto; overscroll-behavior:contain; padding:18px; }
        .kh-mdl-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; }
        .kh-mdl-name { font-size:19px; font-weight:800; margin:0; color:#1f2430; letter-spacing:-.02em; }
        .kh-mdl-phone { font-size:13px; color:#8a8f9a; margin-top:5px; }
        .kh-mdl-close { width:36px; height:36px; border:1px solid #e6dcd2; background:#fff; color:#545a67; font-size:22px; line-height:1; cursor:pointer; flex-shrink:0; }
        .kh-mdl-close:hover { background:#f3f0ec; }
        .kh-mdl-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px; }
        .kh-mdl-stat { background:linear-gradient(135deg,#fff6ee 0%,#fffaf5 100%); border:1px solid #f0e0d0; padding:10px 11px; }
        .kh-mdl-stat .l { font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:#9ca3af; margin-bottom:5px; }
        .kh-mdl-stat .v { font-size:15.5px; font-weight:800; font-variant-numeric:tabular-nums; color:#1f2430; }
        .kh-mdl-stat .v.grn { color:#15733f; }
        .kh-mdl-listlbl { font-size:10.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#9ca3af; margin-bottom:8px; }
        .kh-mdl-list { display:flex; flex-direction:column; gap:6px; }
        .kh-stmt { display:grid; grid-template-columns:1fr auto; gap:6px 10px; align-items:center; padding:10px 12px; background:#fff; border:1px solid #f0e6dc; }
        .kh-stmt-l { display:flex; align-items:center; gap:8px; flex-wrap:wrap; min-width:0; }
        .kh-stmt-no { font-weight:800; font-size:13.5px; color:#c56a3a; }
        .kh-stmt-no.unb { color:#8a8f9a; }
        .kh-stmt-date { font-size:11.5px; color:#8a8f9a; }
        .kh-stmt-mid { grid-column:1 / -1; font-size:12px; color:#6b7280; line-height:1.4; }
        .kh-stmt-r { text-align:right; grid-row:1; grid-column:2; }
        .kh-stmt-total { font-size:14px; font-weight:800; color:#1f2430; font-variant-numeric:tabular-nums; }
        .kh-stmt-due { font-size:11.5px; font-weight:700; }
        .kh-stmt-actions { grid-column:1 / -1; display:flex; gap:7px; margin-top:2px; }
        .kh-mini { padding:5px 12px; border:1px solid #d9dce3; font-size:.76rem; cursor:pointer; font-family:inherit; background:#fff; color:#1f2430; font-weight:600; }
        .kh-mini:hover { background:#f5f5f8; }
        .kh-mini.primary { background:${GOLD}; color:#fff; border-color:${GOLD}; }
        .kh-mini.primary:hover { background:#a87c35; }
        .kh-mini:disabled { opacity:.55; cursor:not-allowed; }
        /* modal */
        .kh-ov { position:fixed; inset:0; background:rgba(31,36,48,.5); z-index:1000; display:flex; align-items:flex-start; justify-content:center; padding:24px 20px; overflow-y:auto; }
        .kh-modal { background:#fff; width:100%; max-width:600px; padding:26px; position:relative; margin:auto; }
        .kh-close { position:absolute; top:14px; right:16px; background:none; border:none; font-size:1.3rem; cursor:pointer; color:#6b7280; }
        .kh-mtitle { font-size:1.05rem; font-weight:700; margin-bottom:16px; }
        .kh-lbl { display:block; font-size:.74rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; margin-bottom:5px; }
        .kh-inp { width:100%; padding:9px 12px; border:1px solid #d4c8b0; font-size:.88rem; font-family:inherit; }
        .kh-inp:focus { outline:2px solid ${ACCENT}; outline-offset:-1px; }
        .kh-grid { display:grid; gap:13px; }
        .kh-2col { display:grid; grid-template-columns:1fr 1fr; gap:13px; }
        .kh-3col { display:grid; grid-template-columns:1fr 80px 100px 32px; gap:6px; align-items:end; }
        .kh-3col-head { display:grid; grid-template-columns:1fr 80px 100px 32px; gap:6px; }
        .kh-3col-head span { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#9ca3af; }
        .kh-rm { background:#fff; border:1px solid #f5c4bb; color:${ACCENT}; width:28px; height:36px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; }
        .kh-add-item { background:#faf9f7; border:1px dashed #d4c8b0; color:#6b7280; padding:8px; font-size:.82rem; cursor:pointer; font-family:inherit; width:100%; }
        .kh-add-item:hover { background:#f3f0e8; }
        .kh-pm { display:flex; border:1px solid #d4c8b0; }
        .kh-pm button { flex:1; padding:9px; border:none; background:#fff; font-size:.82rem; cursor:pointer; font-family:inherit; font-weight:600; }
        .kh-pm button.on { background:${ACCENT}; color:#fff; }
        .kh-save { background:${ACCENT}; color:#fff; border:none; padding:11px; width:100%; font-size:.9rem; font-weight:700; cursor:pointer; font-family:inherit; margin-top:4px; }
        .kh-save:disabled { opacity:.5; cursor:not-allowed; }
        .kh-fieldset { border:1px solid #eceaf0; padding:16px; }
        .kh-fs-l { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:${ACCENT}; margin-bottom:12px; }
        /* cust picker */
        .kh-cp { position:relative; }
        .kh-cp-dd { position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid #d9dce3; border-top:none; z-index:30; max-height:220px; overflow-y:auto; box-shadow:0 8px 20px rgba(20,20,25,.12); }
        .kh-cp-item { padding:9px 12px; cursor:pointer; border-bottom:1px solid #f2f2f6; }
        .kh-cp-item:hover { background:#faf9f7; }
        .kh-cp-item b { font-size:.86rem; } .kh-cp-item span { font-size:.76rem; color:#6b7280; margin-left:8px; }
        .kh-cp-add { padding:10px 12px; cursor:pointer; font-size:.82rem; font-weight:700; color:${ACCENT}; background:#fdf6f3; }
        .kh-cp-add:hover { background:#fbe9e2; }
        .kh-chip { display:flex; align-items:center; justify-content:space-between; gap:10px; border:1px solid #e4d9c8; background:#faf9f7; padding:11px 14px; }
        .kh-chip b { font-size:.9rem; }
        .kh-chip .sub { font-size:.78rem; color:#6b7280; margin-top:2px; }
        .kh-chip-chg { background:#fff; border:1px solid #d9dce3; padding:5px 10px; font-size:.76rem; cursor:pointer; font-family:inherit; }
        /* add-cust popup */
        .kh-ov2 { position:fixed; inset:0; background:rgba(31,36,48,.55); z-index:1100; display:flex; align-items:center; justify-content:center; padding:20px; }
        .kh-modal2 { background:#fff; width:100%; max-width:420px; padding:26px; position:relative; }
        .kh-err { background:#fef2ee; border:1px solid #f5c4bb; color:#b23c1c; padding:9px 12px; font-size:.82rem; margin-bottom:12px; }
        .kh-empty { padding:40px 20px; text-align:center; color:#9ca3af; font-size:.9rem; }
        @media(max-width:640px){ .kh-ltbl th:nth-child(3), .kh-ltbl td:nth-child(3){ display:none; } .kh-ltbl th, .kh-ltbl td{ padding:11px 12px; } .kh-mdl-stats{ grid-template-columns:repeat(3,1fr); } }
      `}</style>

      {/* Topbar */}
      <div className="kh-topbar">
        <div className="kh-tabs">
          <button className={`kh-tab${view === "daily" ? " on" : ""}`} onClick={() => { setView("daily"); setLedgerCust(null); }}>📋 Daily Register</button>
          <button className={`kh-tab${view === "ledger" ? " on" : ""}`} onClick={() => { setView("ledger"); setLedgerCust(null); }}>📒 Customer Ledger</button>
        </div>
        {view === "daily" && (
          <input type="date" className="kh-date" value={date} onChange={(e) => setDate(e.target.value)} />
        )}
        <button className="kh-add" onClick={openCreate}>+ New Entry</button>
      </div>

      {/* Daily view */}
      {view === "daily" && (
        <>
          <div className="kh-stats">
            <div className="kh-stat total">
              <div className="kh-stat-n">{rupees(totalToday)}</div>
              <div className="kh-stat-l">Total Orders · {entries.length}</div>
            </div>
            <div className="kh-stat adv">
              <div className="kh-stat-n">{rupees(totalAdv)}</div>
              <div className="kh-stat-l">Advance Received</div>
            </div>
            <div className="kh-stat due">
              <div className="kh-stat-n">{rupees(totalDue)}</div>
              <div className="kh-stat-l">Balance Due</div>
            </div>
          </div>

          {loading ? <div className="kh-empty">Loading…</div>
          : entries.length === 0 ? <div className="kh-empty">No entries for {fmtDate(date + "T00:00:00")}. Click "+ New Entry" to record an order.</div>
          : (
            <div className="kh-list">
              {entries.map((e) => {
                const amt = Number(e.amount), adv = Number(e.advancePaid), due = Math.max(0, amt - adv);
                return (
                  <div key={e.id} className="kh-card">
                    <div className="kh-card-head">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="name">{e.customerName}</div>
                        {e.customerPhone && <div className="phone">📞 {e.customerPhone}</div>}
                      </div>
                      <div className="time">{fmtTimeSec(e.createdAt)}</div>
                      <span className={`status ${e.status}`}>{e.status === "billed" ? `🧾 ${e.invoiceNo}` : "Unbilled"}</span>
                    </div>
                    <div className="kh-card-body">
                      <div className="kh-items">
                        {e.items.map((it, i) => (
                          <div key={i} className="kh-item-row">
                            <span className="d">{Number(it.qty)} × {it.desc}</span>
                            <span className="r">{rupees((Number(it.qty) || 0) * (Number(it.rate) || 0))}</span>
                          </div>
                        ))}
                      </div>
                      {e.description && <div className="kh-note">"{e.description}"</div>}
                      <div className="kh-billing">
                        <div><span>Amount</span><b>{rupees(amt)}</b></div>
                        <div className="paid"><span>Advance</span><b>{rupees(adv)}</b></div>
                        <div className="due"><span>Due</span><b>{due > 0 ? rupees(due) : "✓ Paid"}</b></div>
                        <span className="pm">{e.paymentMethod === "cash" ? "💵 Cash" : "📱 Online"}</span>
                      </div>
                    </div>
                    <div className="kh-card-actions">
                      {e.status === "unbilled" && <>
                        <button className="kh-abtn primary" disabled={converting === e.id} onClick={() => convertToInvoice(e.id)}>
                          {converting === e.id ? "Converting…" : "→ Make Invoice"}
                        </button>
                        <button className="kh-abtn" onClick={() => openEdit(e)}>Edit</button>
                        <button className="kh-abtn danger" onClick={() => deleteEntry(e.id)}>Delete</button>
                      </>}
                      {e.status === "billed" && <span style={{ fontSize: ".8rem", color: "#15803d", fontWeight: 600 }}>✓ Invoice created · {e.invoiceNo}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Ledger view */}
      {view === "ledger" && (
        <>
          {loading ? <div className="kh-empty">Loading…</div>
          : ledger.length === 0 ? <div className="kh-empty">No ledger entries yet.</div>
          : (
            <div className="kh-lcard">
              <div className="kh-ltbl-wrap">
                <table className="kh-ltbl">
                  <thead>
                    <tr>
                      <th style={{ width: 34 }}>#</th>
                      <th>Customer</th>
                      <th className="ctr" style={{ width: 90 }}>Orders</th>
                      <th className="rgt" style={{ width: 130 }}>Total Billed</th>
                      <th className="rgt" style={{ width: 130 }}>Advance</th>
                      <th className="rgt" style={{ width: 130 }}>Balance Due</th>
                      <th style={{ width: 50 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((row, i) => (
                      <tr key={i} className="kh-ltr" onClick={() => drillCustomer(row)}>
                        <td className="faint ctr">{i + 1}</td>
                        <td>
                          <div className="kh-ltname">{row.customerName}{row.unbilledCount ? <span className="kh-unbilled-badge">{row.unbilledCount} unbilled</span> : null}</div>
                          {row.customerPhone && <div className="kh-ltphone">{row.customerPhone}</div>}
                        </td>
                        <td className="ctr bold">{row.totalOrders}</td>
                        <td className="rgt bold">{rupees(row.totalAmount)}</td>
                        <td className="rgt bold grn">{rupees(row.totalAdvance)}</td>
                        <td className="rgt bold" style={{ color: row.totalDue > 0 ? ACCENT : "#15803d" }}>{row.totalDue > 0 ? rupees(row.totalDue) : "✓ Cleared"}</td>
                        <td className="ctr chev">›</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Ledger drill drawer — centered modal matching the Invoices page */}
      {ledgerCust && (
        <div className="kh-backdrop" onClick={() => setLedgerCust(null)}>
          <div className="kh-modal2b" data-modal-scroll onClick={(e) => e.stopPropagation()}>
            <div className="kh-mdl-head">
              <div>
                <h2 className="kh-mdl-name">{ledgerCust.customerName}</h2>
                {ledgerCust.customerPhone && <div className="kh-mdl-phone">{ledgerCust.customerPhone}</div>}
              </div>
              <button className="kh-mdl-close" onClick={() => setLedgerCust(null)}>×</button>
            </div>

            <div className="kh-mdl-stats">
              <div className="kh-mdl-stat"><div className="l">Total Billed</div><div className="v">{rupees(ledgerCust.totalAmount)}</div></div>
              <div className="kh-mdl-stat"><div className="l">Advance</div><div className="v grn">{rupees(ledgerCust.totalAdvance)}</div></div>
              <div className="kh-mdl-stat"><div className="l">Balance Due</div><div className="v" style={{ color: ledgerCust.totalDue > 0 ? ACCENT : "#15803d" }}>{ledgerCust.totalDue > 0 ? rupees(ledgerCust.totalDue) : "✓ Cleared"}</div></div>
            </div>

            {(() => {
              const unbilledCount = custEntries.filter((e) => e.status !== "billed").length;
              return unbilledCount > 1 ? (
                <button className="kh-combine-btn" disabled={combining} onClick={convertCombined}>
                  {combining ? "Creating combined invoice…" : `Combine ${unbilledCount} orders into one invoice`}
                </button>
              ) : null;
            })()}

            <div className="kh-mdl-listlbl">{custEntries.length} order{custEntries.length !== 1 ? "s" : ""} · statement</div>
            <div className="kh-mdl-list">
              {loadingCust ? <div className="kh-empty">Loading…</div>
              : custEntries.length === 0 ? <div className="kh-empty">No entries found.</div>
              : custEntries.map((e) => {
                const amt = Number(e.amount), adv = Number(e.advancePaid), due = Math.max(0, amt - adv);
                const title = e.items.map((it) => `${Number(it.qty)}× ${it.desc}`).join(", ");
                return (
                  <div key={e.id} className="kh-stmt">
                    <div className="kh-stmt-l">
                      {e.status === "billed"
                        ? <span className="kh-stmt-no">{e.invoiceNo}</span>
                        : <span className="kh-stmt-no unb">Order</span>}
                      <span className="kh-stmt-date">{fmtDate(e.entryDate)} · {fmtTimeSec(e.createdAt)}</span>
                      {e.status === "billed"
                        ? <span className="kh-tag billed">Billed</span>
                        : <span className="kh-tag unbilled">Unbilled</span>}
                    </div>
                    <div className="kh-stmt-mid">{title}{e.description ? ` — ${e.description}` : ""}</div>
                    <div className="kh-stmt-r">
                      <div className="kh-stmt-total">{rupees(amt)}</div>
                      <div className="kh-stmt-due" style={{ color: due > 0 ? ACCENT : "#15803d" }}>{due > 0 ? `Due ${rupees(due)}` : "Paid"}</div>
                    </div>
                    {e.status === "unbilled" && (
                      <div className="kh-stmt-actions">
                        <button className="kh-mini primary" disabled={converting === e.id} onClick={() => convertToInvoice(e.id)}>{converting === e.id ? "…" : "Make Invoice"}</button>
                        <button className="kh-mini" onClick={() => openEdit(e)}>Edit</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Entry modal */}
      {showModal && (
        <div className="kh-ov" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="kh-modal">
            <button className="kh-close" onClick={() => setShowModal(false)}>×</button>
            <div className="kh-mtitle">{editEntry ? "Edit Khata Entry" : "New Khata Entry"}</div>
            <div className="kh-grid">
              {/* Customer */}
              <div className="kh-fieldset">
                <div className="kh-fs-l">Customer</div>
                {custSel ? (
                  <div className="kh-chip">
                    <div><b>{custSel.name}</b><div className="sub">{custSel.phone || "no phone"}</div></div>
                    <button className="kh-chip-chg" onClick={() => setCustSel(null)}>Change</button>
                  </div>
                ) : (
                  <div className="kh-cp">
                    <label className="kh-lbl">Search or type name *</label>
                    <input className="kh-inp" value={custQuery}
                      onChange={(e) => { setCustQuery(e.target.value); setCustDdOpen(true); }}
                      onFocus={() => setCustDdOpen(true)}
                      onBlur={() => setTimeout(() => setCustDdOpen(false), 180)}
                      placeholder="Type name or phone…" autoComplete="off" />
                    {custDdOpen && (
                      <div className="kh-cp-dd">
                        {custMatches.map((c) => (
                          <div key={c.id} className="kh-cp-item" onMouseDown={() => selectCustomer(c)}>
                            <b>{c.name}</b>{c.phone && <span>{c.phone}</span>}
                          </div>
                        ))}
                        <div className="kh-cp-add" onMouseDown={() => openAddCustomer(custQuery)}>
                          + Add new customer{custQuery.trim() ? ` "${custQuery.trim()}"` : ""}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="kh-fieldset">
                <div className="kh-fs-l">Items</div>
                <div className="kh-3col-head">
                  <span>Description</span><span>Qty</span><span>Rate (₹)</span><span />
                </div>
                {items.map((it, i) => (
                  <div key={i} className="kh-3col" style={{ marginTop: 6 }}>
                    <input className="kh-inp" value={it.desc} onChange={(e) => updateItem(i, { desc: e.target.value })} placeholder="e.g. Flex Banner 6×4 ft" />
                    <input className="kh-inp" type="number" min="1" value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} />
                    <input className="kh-inp" type="number" min="0" value={it.rate} onChange={(e) => updateItem(i, { rate: Number(e.target.value) })} />
                    {items.length > 1 && <button className="kh-rm" onClick={() => removeItem(i)}>×</button>}
                  </div>
                ))}
                <button className="kh-add-item" style={{ marginTop: 8 }} onClick={addItem}>+ Add item</button>
                <div style={{ marginTop: 10, fontWeight: 700, fontSize: ".95rem", textAlign: "right" }}>
                  Total: {rupees(calcAmount)}
                </div>
              </div>

              {/* Billing */}
              <div className="kh-fieldset">
                <div className="kh-fs-l">Payment</div>
                <div className="kh-2col">
                  <div>
                    <label className="kh-lbl">Advance Received (₹)</label>
                    <input className="kh-inp" type="number" min="0" value={advance}
                      onChange={(e) => setAdvance(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className="kh-lbl">Balance Due</label>
                    <input className="kh-inp" value={dueNum > 0 ? `₹${Math.round(dueNum).toLocaleString("en-IN")}` : "✓ Fully paid"} readOnly style={{ color: dueNum > 0 ? ACCENT : "#15803d", fontWeight: 700 }} />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label className="kh-lbl">Payment Method</label>
                  <div className="kh-pm">
                    <button className={payMethod === "cash" ? "on" : ""} onClick={() => setPayMethod("cash")}>💵 Cash</button>
                    <button className={payMethod === "online" ? "on" : ""} onClick={() => setPayMethod("online")}>📱 Online / UPI</button>
                  </div>
                </div>
              </div>

              {/* Notes + date */}
              <div className="kh-2col">
                <div>
                  <label className="kh-lbl">Note (optional)</label>
                  <input className="kh-inp" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Any special instruction…" />
                </div>
                <div>
                  <label className="kh-lbl">Date</label>
                  <input type="date" className="kh-inp" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                </div>
              </div>

              <button className="kh-save" disabled={saving || !canSave} onClick={saveEntry}>
                {saving ? "Saving…" : editEntry ? "Save Changes" : "Save Entry"}
              </button>
              {!canSave && <div style={{ fontSize: ".74rem", color: "#9ca3af", textAlign: "center" }}>Select a customer and add at least one item with an amount.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Add-customer popup */}
      {showAddCust && (
        <div className="kh-ov2" onClick={(e) => e.target === e.currentTarget && setShowAddCust(false)}>
          <div className="kh-modal2">
            <button className="kh-close" onClick={() => setShowAddCust(false)}>×</button>
            <div className="kh-mtitle">Add Customer</div>
            {addCustErr && <div className="kh-err">{addCustErr}</div>}
            <div className="kh-grid">
              <div><label className="kh-lbl">Full Name *</label><input className="kh-inp" value={newCust.name} onChange={(e) => setNewCust((c) => ({ ...c, name: e.target.value }))} /></div>
              <div><label className="kh-lbl">Phone</label><input className="kh-inp" value={newCust.phone} onChange={(e) => setNewCust((c) => ({ ...c, phone: e.target.value }))} placeholder="9876543210" /></div>
              <div><label className="kh-lbl">Email</label><input className="kh-inp" type="email" value={newCust.email} onChange={(e) => setNewCust((c) => ({ ...c, email: e.target.value }))} placeholder="optional" /></div>
              <div><label className="kh-lbl">Address</label><input className="kh-inp" value={newCust.address} onChange={(e) => setNewCust((c) => ({ ...c, address: e.target.value }))} placeholder="Shop / area, town" /></div>
              <button className="kh-save" disabled={addingCust} onClick={saveNewCustomer}>{addingCust ? "Adding…" : "Add & Continue"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}