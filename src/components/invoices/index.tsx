// src/components/invoices/index.tsx
// ── Invoices page — state orchestration only ──────────────────────────────
// All rendering is delegated to child components.
// Add new features by adding new child components, not by growing this file.

import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import {
  Invoice, InvStatus, CustomerRow, Period,
  INK, MUTE, LINE, CARD, SANS,
  num, round2, rupee, fmt, effectivePaid, periodSince,
  PERIOD_OPTIONS, GLOBAL_CSS, csvCell, errMessage, REQ_TIMEOUT,
  STATUS_META, srcMeta, methodSummary,
} from "./types";
import { printInvoice, previewInvoice } from "./PrintUtils";

// ── Child components ───────────────────────────────────────────────────────
import Icon          from "./Icon";
import StatsBar      from "./StatsBar";
import InvoiceTable  from "./InvoiceTable";
import CustomerTable from "./CustomerTable";
import CustomerDrawer from "./CustomerDrawer";
import StatementModal from "./StatementModal";
import PaymentModal  from "./PaymentModal";
import EditModal     from "./EditModal";
import SendModal     from "./SendModal";
import DeleteModal   from "./DeleteModal";

export default function Invoices() {
  // ── Data ─────────────────────────────────────────────────────────────────
  const [list,       setList]       = useState<Invoice[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState("");

  // ── Filters ───────────────────────────────────────────────────────────────
  const [q,        setQ]        = useState("");
  const [filter,   setFilter]   = useState<"all"|InvStatus>("all");
  const [period,   setPeriod]   = useState<Period>("all");
  const [viewMode, setViewMode] = useState<"customers"|"all">("customers");

  // ── Modal targets ─────────────────────────────────────────────────────────
  const [payTarget,  setPayTarget]  = useState<Invoice|null>(null);
  const [editTarget, setEditTarget] = useState<Invoice|null>(null);
  const [delTarget,  setDelTarget]  = useState<Invoice|null>(null);
  const [sendTarget, setSendTarget] = useState<{inv:Invoice;ch:"email"|"whatsapp"}|null>(null);
  const [drillKey,   setDrillKey]   = useState<string|null>(null);
  const [stmtKey,    setStmtKey]    = useState<string|null>(null);

  const rootRef = useRef<HTMLDivElement>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = async (initial = false) => {
    initial ? setLoading(true) : setRefreshing(true); setError("");
    try {
      const res = await api.get("/api/invoices", { timeout: REQ_TIMEOUT });
      setList(Array.isArray(res.data) ? res.data : []);
    } catch(e:any) {
      setError(errMessage(e, "Couldn't load invoices."));
    } finally {
      initial ? setLoading(false) : setRefreshing(false);
    }
  };
  useEffect(() => { load(true); }, []);

  // ── Background scroll lock while any modal is open ────────────────────────
  useEffect(() => {
    const open = payTarget||editTarget||delTarget||sendTarget||drillKey||stmtKey;
    if (!open) return;
    const html=document.documentElement, body=document.body;
    const prevHtml=html.style.cssText, prevBody=body.style.cssText;
    html.style.setProperty("overflow","hidden","important");
    body.style.setProperty("overflow","hidden","important");
    const locked: Array<{el:HTMLElement;prev:string}> = [];
    document.querySelectorAll<HTMLElement>("*").forEach(el=>{
      if(el.hasAttribute("data-modal-scroll")||el.closest("[data-modal-scroll]")) return;
      const oy=getComputedStyle(el).overflowY;
      if((oy==="auto"||oy==="scroll")&&el.scrollHeight>el.clientHeight){
        locked.push({el,prev:el.style.cssText});
        el.style.setProperty("overflow","hidden","important");
      }
    });
    return () => {
      html.style.cssText=prevHtml;
      body.style.cssText=prevBody;
      locked.forEach(({el,prev})=>{ el.style.cssText=prev; });
    };
  }, [payTarget,editTarget,delTarget,sendTarget,drillKey,stmtKey]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const periodList = useMemo(() => {
    const since=periodSince(period); if(!since) return list;
    const t=since.getTime();
    return list.filter(inv=>{
      const dt=new Date(inv.date);
      return !isNaN(dt.getTime()) && dt.getTime()>=t;
    });
  }, [list, period]);

  const shown = useMemo(() => {
    const needle=q.trim().toLowerCase();
    return periodList.filter(inv=>{
      if(filter!=="all"&&inv.status!==filter) return false;
      if(!needle) return true;
      return inv.invoiceNo.toLowerCase().includes(needle)
        ||(inv.clientName||"").toLowerCase().includes(needle)
        ||(inv.clientEmail||"").toLowerCase().includes(needle)
        ||(inv.clientPhone||"").toLowerCase().includes(needle);
    });
  }, [periodList, q, filter]);

  const stats = useMemo(() => {
    let billed=0, received=0, outstanding=0, cash=0, online=0;
    for (const inv of periodList) {
      if(inv.status==="cancelled") continue;
      const t=num(inv.total); const p=effectivePaid(inv);
      billed+=t; received+=p; outstanding+=Math.max(t-p,0);
      for (const pay of Array.isArray(inv.payments)?inv.payments:[]) {
        const amt=num(pay.amount);
        if(pay.method==="online") online+=amt; else cash+=amt;
      }
    }
    return {
      count:periodList.length,
      billed:round2(billed), received:round2(received),
      outstanding:round2(outstanding), cash:round2(cash), online:round2(online),
    };
  }, [periodList]);

  const customerRows = useMemo((): CustomerRow[] => {
    const map=new Map<string,CustomerRow>();
    for (const inv of periodList) {
      const rawPhone=(inv.clientPhone||"").replace(/\D/g,"");
      const key=rawPhone.slice(-10)||(inv.clientName||"").trim().toLowerCase()||inv.id;
      const total=num(inv.total); const paid=effectivePaid(inv);
      const existing=map.get(key);
      if (existing) {
        existing.invoices.push(inv);
        if(inv.status!=="cancelled"){
          existing.billed+=total; existing.paid+=paid;
          existing.due+=Math.max(total-paid,0);
        }
        if(new Date(inv.date)>new Date(existing.lastDate)) existing.lastDate=inv.date;
        if(!existing.email&&inv.clientEmail) existing.email=inv.clientEmail;
      } else {
        map.set(key,{
          key, name:inv.clientName||"—", phone:inv.clientPhone,
          email:inv.clientEmail, invoices:[inv],
          billed:inv.status!=="cancelled"?total:0,
          paid:inv.status!=="cancelled"?paid:0,
          due:inv.status!=="cancelled"?Math.max(total-paid,0):0,
          lastDate:inv.date,
        });
      }
    }
    let rows=Array.from(map.values()).map(r=>({
      ...r,
      billed:round2(r.billed), paid:round2(r.paid), due:round2(r.due),
      invoices:r.invoices.sort((a,b)=>
        new Date(b.createdAt||b.date).getTime()-new Date(a.createdAt||a.date).getTime()
      ),
    }));
    const needle=q.trim().toLowerCase();
    if(needle) rows=rows.filter(r=>
      r.name.toLowerCase().includes(needle)
      ||(r.phone||"").includes(needle)
      ||(r.email||"").toLowerCase().includes(needle)
    );
    return rows.sort((a,b)=>b.due-a.due||new Date(b.lastDate).getTime()-new Date(a.lastDate).getTime());
  }, [periodList, q]);

  const drillRow = useMemo(() => customerRows.find(r=>r.key===drillKey)||null, [customerRows,drillKey]);
  const stmtRow  = useMemo(() => customerRows.find(r=>r.key===stmtKey)||null,  [customerRows,stmtKey]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const updateInvoice = (updated: Invoice) => {
    setList(rows => rows.map(r => r.id===updated.id ? updated : r));
    setPayTarget(cur  => cur&&cur.id===updated.id   ? updated : cur);
    setEditTarget(cur => cur&&cur.id===updated.id   ? updated : cur);
  };
  const deleteInvoice = (id: string) => setList(rows => rows.filter(r=>r.id!==id));

  const openStatement = (key: string) => { setStmtKey(key); setDrillKey(null); };

  const exportCsv = () => {
    const head=["Invoice No","Date","Client","Phone","Email","GSTIN","Source","Method","Subtotal","Discount","GST","Total","Paid","Due","Status"];
    const body=shown.map(inv=>{
      const total=num(inv.total); const paid=effectivePaid(inv);
      const ms=methodSummary(inv); const sm=srcMeta(inv.source);
      return [
        inv.invoiceNo, fmt(inv.date), inv.clientName||"", inv.clientPhone||"",
        inv.clientEmail||"", inv.clientGstin||"", sm.label, ms?ms.label:"",
        num(inv.subtotal).toFixed(2), num(inv.discountAmt).toFixed(2),
        num(inv.taxAmt).toFixed(2), total.toFixed(2), paid.toFixed(2),
        Math.max(total-paid,0).toFixed(2), STATUS_META[inv.status].label,
      ].map(csvCell).join(",");
    });
    const csv=[head.map(csvCell).join(","),...body].join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    const a=document.createElement("a");
    a.href=url; a.download=`invoices-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:SANS, color:INK, minWidth:0, maxWidth:"100%" }} ref={rootRef}>

      {/* Top toolbar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:10, flexWrap:"wrap", marginBottom:16 }}>
        <button className="ivh-ghost" style={st.ghostBtn} onClick={exportCsv} disabled={!shown.length}>
          <Icon name="csv" size={15}/> Export CSV
        </button>
        <button className="ivh-ghost" style={st.ghostBtn} onClick={() => load(false)} disabled={refreshing}>
          <Icon name="refresh" size={15}/> {refreshing?"Refreshing…":"Refresh"}
        </button>
      </div>

      {/* KPI stats */}
      <StatsBar {...stats} period={period} onPeriodChange={setPeriod}/>

      {/* View toggle */}
      <div style={st.viewToggle}>
        <button className={`ivh-vtab${viewMode==="customers"?" on":""}`} style={st.vtab} onClick={()=>setViewMode("customers")}>
          <Icon name="user" size={15}/> By Customer
        </button>
        <button className={`ivh-vtab${viewMode==="all"?" on":""}`} style={st.vtab} onClick={()=>setViewMode("all")}>
          <Icon name="receipt" size={15}/> All Invoices
        </button>
      </div>

      {/* Search + period */}
      <div style={st.toolbar}>
        <div style={{ flex:1 }}/>
        <select className="ivh-datesel" style={st.dateSel} value={period} onChange={e=>setPeriod(e.target.value as Period)}>
          {PERIOD_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={st.searchWrap}>
          <span style={st.searchIcon}><Icon name="search" size={15}/></span>
          <input
            className="ivh-in" style={st.searchIn}
            placeholder={viewMode==="customers"?"Search customers by name or phone…":"Search by name, phone or invoice no…"}
            value={q} onChange={e=>setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Main content */}
      {viewMode === "customers"
        ? <CustomerTable rows={customerRows} loading={loading} refreshing={refreshing} onDrill={k=>setDrillKey(k)}/>
        : <InvoiceTable
            shown={shown} loading={loading} refreshing={refreshing} error={error}
            filter={filter} onFilter={setFilter} onRetry={()=>load(true)}
            onPrint={printInvoice}
            onEdit={inv=>{ if(inv.status!=="paid"&&inv.status!=="cancelled") setEditTarget(inv); }}
            onPay={setPayTarget}
            onSend={(inv,ch)=>setSendTarget({inv,ch})}
            onDelete={setDelTarget}
          />
      }

      {/* Modals & drawers */}
      {drillRow   && (
        <CustomerDrawer
          row={drillRow}
          onClose={()=>setDrillKey(null)}
          onPay={setPayTarget}
          onPrint={printInvoice}
          onEdit={inv=>{ if(inv.status!=="paid"&&inv.status!=="cancelled") setEditTarget(inv); }}
          onPreview={previewInvoice}
          onStatement={openStatement}
        />
      )}
      {stmtRow    && <StatementModal row={stmtRow}   onClose={()=>setStmtKey(null)}/>}
      {payTarget  && <PaymentModal   inv={payTarget}  onClose={()=>setPayTarget(null)}  onUpdate={updateInvoice}/>}
      {editTarget && <EditModal      inv={editTarget} onClose={()=>setEditTarget(null)} onUpdate={updateInvoice}/>}
      {delTarget  && <DeleteModal    inv={delTarget}  onClose={()=>setDelTarget(null)}  onDelete={deleteInvoice}/>}
      {sendTarget && <SendModal      inv={sendTarget.inv} channel={sendTarget.ch} onClose={()=>setSendTarget(null)}/>}

      <style>{GLOBAL_CSS}</style>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  ghostBtn:   { display:"inline-flex", alignItems:"center", gap:7, padding:"10px 16px", borderRadius:0, border:`1px solid ${LINE}`, background:CARD, color:INK, fontFamily:SANS, fontWeight:700, fontSize:13.5, cursor:"pointer" },
  viewToggle: { display:"flex", gap:0, marginBottom:16, border:"1px solid #f0e6dc", width:"fit-content", overflow:"hidden" },
  vtab:       { display:"inline-flex", alignItems:"center", gap:7, padding:"10px 20px", border:"none", background:"#fff", color:MUTE, fontFamily:SANS, fontWeight:700, fontSize:13.5, cursor:"pointer" },
  toolbar:    { display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:14 },
  dateSel:    { padding:"9px 12px", border:`1px solid ${LINE}`, borderRadius:0, background:CARD, color:"#545a67", fontFamily:SANS, fontWeight:700, fontSize:13, cursor:"pointer", colorScheme:"light" as const },
  searchWrap: { position:"relative", flex:"1 1 200px", maxWidth:340, minWidth:180 },
  searchIcon: { position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#b6bac3", display:"inline-flex", pointerEvents:"none" },
  searchIn:   { width:"100%", boxSizing:"border-box" as const, padding:"10px 12px 10px 36px", border:"1px solid #e6dcd2", borderRadius:0, fontSize:14, fontFamily:SANS, background:"#fff", color:INK },
};