import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";

/* ── Design tokens (shared system) ─────────────────────────────────────────── */
const CARD="#ffffff",INK="#1f2430",BODY="#545a67",MUTE="#8a8f9a",FAINT="#b6bac3";
const LINE="#f0e6dc",LINE2="#f4f5f7",BGSOFT="#fafbfc";
const ACCENT="#d9542f",ACCENT_DK="#c8481f",POS="#17a35b",NEG="#dd4b3e",GOLD="#c68a2e";
const SANS="'DM Sans', system-ui, sans-serif";
const GLOW="radial-gradient(120% 140% at 0% 0%,rgba(217,84,47,.075) 0%,rgba(217,84,47,.022) 42%,rgba(217,84,47,0) 72%),linear-gradient(180deg,#fffcf9 0%,#ffffff 60%)";
const GSHADOW="0 1px 2px rgba(17,20,30,.04),0 10px 26px -18px rgba(217,84,47,.28)";

/* ── Types ──────────────────────────────────────────────────────────────────── */
export type Customer = {
  id:string; name:string; email?:string|null; phone?:string|null;
  gstin?:string|null; address?:string|null; source?:string|null;
  createdAt:string; invoiceCount:number; billed:number; paid:number; due:number;
};
type FormState = { name:string; email:string; phone:string; gstin:string; address:string };

/* ── API helpers ────────────────────────────────────────────────────────────── */
const customerApi = {
  list:   (q="",source="") => { const p=new URLSearchParams(); if(q) p.set("q",q); if(source) p.set("source",source); return api.get(`/api/customers?${p}`); },
  create: (data:FormState&{source:string}) => api.post("/api/customers", data),
  update: (id:string, data:Partial<FormState>) => api.patch(`/api/customers/${id}`, data),
  remove: (id:string) => api.delete(`/api/customers/${id}`),
  email:  (customerIds:string[], subject:string, body:string, ctaLabel?:string, ctaUrl?:string) =>
    api.post("/api/customers/email", { customerIds, subject, body, ctaLabel, ctaUrl }),
};

/* ── Email templates ────────────────────────────────────────────────────────── */
const TEMPLATES = [
  { id:"blank",        label:"Blank",           subject:"",                                              body:"" },
  { id:"offer",        label:"Special offer",   subject:"A special offer for you from Abhijit Art",      body:"Hi {{first_name}},\n\nWe're running a special offer this month on our printing services — flex banners, visiting cards, LED signage and more.\n\nReply or call us on 7405179066 and we'll put together a quote.\n\nWarm regards,\nAbhijit Art",      ctaLabel:"See our services", ctaUrl:"https://abhijitart.com/services" },
  { id:"festive",      label:"Festive discount", subject:"Festive season discount — Abhijit Art",        body:"Dear {{name}},\n\nWishing you a wonderful festive season from Abhijit Art.\n\nWe're offering a discount on all bulk printing orders this month.\n\nWarm regards,\nAbhijit Art", ctaLabel:"Place an order", ctaUrl:"https://abhijitart.com/services" },
  { id:"query",        label:"Query reply",      subject:"Regarding your enquiry — Abhijit Art",         body:"Hi {{first_name}},\n\nThank you for getting in touch with Abhijit Art.\n\n[ Write your answer here ]\n\nWarm regards,\nAbhijit Art" },
  { id:"readycollect", label:"Order ready",      subject:"Your order is ready for collection",           body:"Hi {{first_name}},\n\nYour order is printed and ready for collection at our Berhampore studio.\n\nWarm regards,\nAbhijit Art" },
  { id:"thanks",       label:"Thank you",        subject:"Thank you for choosing Abhijit Art",           body:"Hi {{first_name}},\n\nThank you for your recent order — it was a pleasure working with you.\n\nWarm regards,\nAbhijit Art" },
];

/* ── Utilities ──────────────────────────────────────────────────────────────── */
const rupee = (n:number) => "₹"+n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const dateFmt = (s:string) => new Date(s).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
const errMsg = (e:any) => e?.response?.data?.error || e?.response?.data?.message || "Something went wrong.";
const blankForm = ():FormState => ({name:"",email:"",phone:"",gstin:"",address:""});

/* ── Icons ──────────────────────────────────────────────────────────────────── */
const Ico = memo(({d,size=18,sw=1.8}:{d:string;size?:number;sw?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
));
const IC = {
  people:  "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  invoice: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  spark:   "M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8",
  mail:    "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3.2 6.5 12 13l8.8-6.5",
  plus:    "M12 5v14M5 12h14",
  search:  "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  edit:    "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:   "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6",
  x:       "M18 6 6 18M6 6l12 12",
  csv:     "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  send:    "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z",
  phone:   "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.1 3.4 2 2 0 0 1 3.07 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z",
};

/* ═══════════════════════════ MAIN PAGE ═══════════════════════════════════════ */
export default function Customers() {
  const [rows,       setRows]       = useState<Customer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error,      setError]      = useState("");
  const [q,          setQ]          = useState("");
  const [source,     setSource]     = useState("");
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [editCust,   setEditCust]   = useState<Customer|"new"|null>(null);
  const [mailTo,     setMailTo]     = useState<Customer[]|null>(null);
  const [toast,      setToast]      = useState("");

  useEffect(() => { if(!toast) return; const t=setTimeout(()=>setToast(""),4000); return ()=>clearTimeout(t); },[toast]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const {data} = await customerApi.list(q, source);
      setRows(Array.isArray(data) ? data : []);
    } catch(e:any) { setError(errMsg(e)); }
    finally { setLoading(false); setLoadedOnce(true); }
  }, [q, source]);

  useEffect(() => { const t=setTimeout(load,250); return ()=>clearTimeout(t); }, [load]);

  const stats = useMemo(() => ({
    total:    rows.length,
    fresh:    rows.filter(c => Date.now()-new Date(c.createdAt).getTime() < 30*864e5).length,
    totalDue: rows.reduce((s,c)=>s+(c.due||0),0),
    selected: selected.size,
  }), [rows, selected]);

  /* selection */
  const mailable  = rows.filter(c=>!!c.email);
  const allPicked = mailable.length>0 && mailable.every(c=>selected.has(c.id));
  const toggleAll = () => setSelected(allPicked ? new Set() : new Set(mailable.map(c=>c.id)));
  const toggleOne = (id:string) => setSelected(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });

  const exportCsv = () => {
    const head = ["Name","Email","Phone","GSTIN","Address","Source","Joined","Invoices","Billed","Paid","Due"];
    const body = rows.map(c=>[c.name||"",c.email||"",c.phone||"",c.gstin||"",c.address||"",c.source||"billing",dateFmt(c.createdAt),c.invoiceCount,c.billed,c.paid,c.due]);
    const csv  = [head,...body].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a    = Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([csv],{type:"text/csv"})),download:`customers-${new Date().toISOString().slice(0,10)}.csv`});
    a.click();
  };

  const done = (msg:string) => { setEditCust(null); setMailTo(null); setSelected(new Set()); setToast(msg); load(); };

  return (
    <div style={{fontFamily:SANS,color:INK,minWidth:0,maxWidth:"100%"}}>
      <style>{CSS}</style>

      {/* toolbar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:18}}>
        <div className="cst-filters">
          <div style={{position:"relative",flex:"1 1 220px",minWidth:0}}>
            <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:MUTE}}><Ico d={IC.search} size={17}/></span>
            <input className="cst-input" style={{paddingLeft:40}} placeholder="Search name, email or phone…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <select className="cst-sel" value={source} onChange={e=>setSource(e.target.value)}>
            <option value="">All customers</option>
            <option value="billing">From billing</option>
            <option value="offline">Walk-in / manual</option>
          </select>
          {(q||source) && <button className="cst-ghost" onClick={()=>{setQ("");setSource("");}}>Clear</button>}
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="cst-ghost" onClick={exportCsv} disabled={!rows.length}><Ico d={IC.csv} size={16}/> Export CSV</button>
          <button className="cst-solid" onClick={()=>setEditCust("new")}><Ico d={IC.plus} size={16}/> Add customer</button>
        </div>
      </div>

      {/* stat cards */}
      <div className="cst-stats">
        {[
          {icon:IC.people,  accent:INK,    label:"Total customers", value:String(stats.total),          sub:`${rows.filter(c=>c.invoiceCount>0).length} billed`},
          {icon:IC.spark,   accent:POS,    label:"New (30 days)",   value:String(stats.fresh),          sub:"Recently added"},
          {icon:IC.invoice, accent:ACCENT, label:"Total due",       value:rupee(stats.totalDue),        sub:"Outstanding across all"},
          {icon:IC.mail,    accent:GOLD,   label:"Selected",        value:String(stats.selected),       sub:"Ready to email"},
        ].map(({icon,accent,label,value,sub}) => (
          <motion.div key={label} className="cst-stat" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.35}}>
            <span style={{width:38,height:38,display:"grid",placeItems:"center",flexShrink:0,color:accent,background:`${accent}12`}}><Ico d={icon} size={19}/></span>
            <div><div style={{fontSize:22,fontWeight:800,color:INK,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{value}</div>
              <div style={{fontSize:12,color:BODY,marginTop:4,fontWeight:700}}>{label}</div>
              <div style={{fontSize:11.5,color:MUTE,marginTop:2}}>{sub}</div></div>
          </motion.div>
        ))}
      </div>

      {/* selection bar */}
      <AnimatePresence>
        {selected.size>0 && (
          <motion.div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:14,padding:"12px 16px",background:"#fffcf9",border:`1px solid ${LINE}`,fontSize:13}}
            initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
            <span style={{fontWeight:700,color:INK}}>{selected.size} selected</span>
            <div style={{display:"flex",gap:10,marginLeft:"auto"}}>
              <button className="cst-ghost sm" onClick={()=>setSelected(new Set())}>Clear</button>
              <button className="cst-solid sm" onClick={()=>setMailTo(rows.filter(c=>selected.has(c.id)))}><Ico d={IC.send} size={15}/> Compose email</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* table / empty / error */}
      {!loadedOnce && loading ? <Skeleton/> : error ? (
        <div style={{background:"#fdecea",border:"1px solid #f3cfc2",color:"#8a2f16",padding:"14px 18px",marginTop:16}}>{error}</div>
      ) : rows.length===0 ? (
        <div style={{background:CARD,border:"1px dashed #ddd0c4",padding:"50px 24px",textAlign:"center",marginTop:16}}>
          <div style={{width:58,height:58,background:"#fdeee9",color:ACCENT,display:"inline-grid",placeItems:"center",marginBottom:14}}><Ico d={IC.people} size={28}/></div>
          <h3 style={{fontSize:18,fontWeight:800,margin:"0 0 8px",color:INK}}>{q||source?"No customers match":"No customers yet"}</h3>
          <p style={{color:MUTE,fontSize:13.5,lineHeight:1.65,margin:"0 auto",maxWidth:360}}>
            {q||source?"Try clearing the search or filter.":"Customers are added automatically from billing, or manually here."}
          </p>
          {!(q||source) && <button className="cst-solid" style={{marginTop:16}} onClick={()=>setEditCust("new")}><Ico d={IC.plus} size={16}/> Add customer</button>}
        </div>
      ) : (
        <div style={{background:CARD,border:"1px solid #ececf1",overflow:"hidden",boxShadow:"0 1px 2px rgba(17,20,30,.04)",marginTop:16}} className={loading?"cst-fading":""}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:860}}>
              <thead>
                <tr style={{background:BGSOFT}}>
                  <th style={{...TH,width:42}}><input type="checkbox" className="cst-chk" checked={allPicked} onChange={toggleAll}/></th>
                  {["Customer","Phone","Source","Added","Invoices","Billed","Due",""].map(h=>(
                    <th key={h} style={{...TH,textAlign:["Invoices","Billed","Due"].includes(h)?"right":"left"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(c=>(
                  <tr key={c.id} className="cst-row">
                    <td style={TD}><input type="checkbox" className="cst-chk" checked={selected.has(c.id)} onChange={()=>toggleOne(c.id)} disabled={!c.email}/></td>
                    <td style={TD}>
                      <div style={{fontWeight:700,color:INK}}>{c.name||"—"}</div>
                      <div style={{fontSize:12,color:MUTE}}>{c.email||<span style={{color:FAINT}}>No email</span>}</div>
                      {c.address && <div style={{fontSize:11,color:MUTE}}>{c.address}</div>}
                    </td>
                    <td style={{...TD,fontVariantNumeric:"tabular-nums"}}>
                      {c.phone?<span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{color:MUTE,lineHeight:0}}><Ico d={IC.phone} size={12}/></span>{c.phone}</span>:<span style={{color:FAINT}}>—</span>}
                    </td>
                    <td style={TD}><span style={{display:"inline-block",padding:"3px 10px",fontSize:11.5,fontWeight:700,...(c.source==="offline"?{background:"#fdeee9",color:ACCENT}:{background:"#eef1f5",color:BODY})}}>{c.source==="offline"?"Walk-in":"Billing"}</span></td>
                    <td style={{...TD,whiteSpace:"nowrap"}}>{dateFmt(c.createdAt)}</td>
                    <td style={{...TD,textAlign:"right",fontWeight:700}}>{c.invoiceCount}</td>
                    <td style={{...TD,textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{c.billed>0?rupee(c.billed):"—"}</td>
                    <td style={{...TD,textAlign:"right",fontWeight:800,fontVariantNumeric:"tabular-nums",color:c.due>0?ACCENT:c.billed>0?POS:MUTE}}>{c.due>0?rupee(c.due):c.billed>0?"Paid ✓":"—"}</td>
                    <td style={{...TD,textAlign:"right"}}>
                      <div style={{display:"inline-flex",gap:6}}>
                        <button className="cst-mini" onClick={()=>setMailTo([c])} disabled={!c.email}><Ico d={IC.mail} size={14}/> Email</button>
                        <button className="cst-icon" onClick={()=>setEditCust(c)}><Ico d={IC.edit} size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* modals */}
      <AnimatePresence>
        {editCust && <CustomerModal key="edit" customer={editCust==="new"?null:editCust} onClose={()=>setEditCust(null)} onDone={done}/>}
        {mailTo   && <EmailModal   key="mail" recipients={mailTo} onClose={()=>setMailTo(null)} onDone={done}/>}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div style={{position:"fixed",top:22,left:"50%",transform:"translateX(-50%)",zIndex:1200,display:"flex",alignItems:"center",gap:10,background:INK,color:"#fff",padding:"12px 20px",fontSize:13.5,fontWeight:600,boxShadow:"0 16px 40px rgba(24,22,28,.32)",maxWidth:"90vw"}}
            initial={{opacity:0,y:-18}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-18}}>
            <span style={{display:"inline-grid",placeItems:"center",width:20,height:20,borderRadius:"50%",background:GOLD,color:"#fff",fontSize:12}}>✓</span>{toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════ CUSTOMER MODAL ═══════════════════════════════════════ */
function CustomerModal({customer,onClose,onDone}:{customer:Customer|null;onClose:()=>void;onDone:(msg:string)=>void}) {
  const editing = !!customer;
  const [f,    setF]    = useState<FormState>(customer ? {name:customer.name||"",email:customer.email||"",phone:customer.phone||"",gstin:customer.gstin||"",address:customer.address||""} : blankForm());
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");
  const [del,  setDel]  = useState(false);
  const set = (k:keyof FormState) => (v:string) => setF(p=>({...p,[k]:v}));

  const save = async () => {
    if (!f.name.trim()) { setErr("Name is required."); return; }
    if (!editing && !f.phone.trim()) { setErr("Phone is required."); return; }
    setBusy(true); setErr("");
    try {
      editing ? await customerApi.update(customer!.id, f) : await customerApi.create({...f,source:"offline"});
      onDone(editing?"Customer updated.":"Customer added.");
    } catch(e:any) { setErr(errMsg(e)); setBusy(false); }
  };

  const remove = async () => {
    setBusy(true); setErr("");
    try { await customerApi.remove(customer!.id); onDone("Customer deleted."); }
    catch(e:any) { setErr(errMsg(e)); setBusy(false); setDel(false); }
  };

  return (
    <Modal title={editing?"Edit customer":"Add customer"} onClose={onClose}>
      {!editing && <p style={{marginBottom:16,padding:"10px 14px",background:"#fffcf9",border:`1px solid ${LINE}`,fontSize:12.5,color:BODY,lineHeight:1.55}}>
        Add a walk-in customer. They'll appear in billing autocomplete and invoices link automatically.
      </p>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {([["Full name *","name","Customer name",false],["Phone"+(editing?"":" *"),"phone","9876543210",false],["Email (optional)","email","email@example.com",false],["GSTIN (optional)","gstin","22AAAAA0000A1Z5",false]] as const).map(([lbl,key,ph])=>(
          <div key={key} style={{gridColumn:key==="name"||key==="gstin"?"1/-1":"auto"}}>
            <label style={{display:"block",fontSize:12.5,fontWeight:700,color:INK,marginBottom:5}}>{lbl}</label>
            <input className="cst-input" value={f[key as keyof FormState]} onChange={e=>set(key as keyof FormState)(e.target.value)} placeholder={ph} autoFocus={key==="name"} style={key==="gstin"?{fontFamily:"monospace"}:{}}/>
          </div>
        ))}
        <div style={{gridColumn:"1/-1"}}>
          <label style={{display:"block",fontSize:12.5,fontWeight:700,color:INK,marginBottom:5}}>Address</label>
          <textarea className="cst-input" rows={2} value={f.address} onChange={e=>set("address")(e.target.value)} placeholder="Shop / area, town" style={{resize:"vertical"}}/>
        </div>
      </div>
      {err && <div style={{marginTop:12,padding:"10px 14px",fontSize:13,color:"#8a2f16",background:"#fdecea",border:"1px solid #f3cfc2"}}>{err}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20,paddingTop:16,borderTop:`1px solid ${LINE}`,flexWrap:"wrap",gap:10}}>
        {editing ? del ? (
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:13,fontWeight:600,color:INK}}>Delete this customer?</span>
            <button className="cst-ghost sm" onClick={()=>setDel(false)}>No</button>
            <button className="cst-danger sm" onClick={remove} disabled={busy}>Yes, delete</button>
          </div>
        ) : <button className="cst-danger-ghost" onClick={()=>setDel(true)}><Ico d={IC.trash} size={15}/> Delete</button>
        : <span/>}
        {!del && <div style={{display:"flex",gap:10,marginLeft:"auto"}}>
          <button className="cst-ghost" onClick={onClose}>Cancel</button>
          <button className="cst-solid" onClick={save} disabled={busy||!f.name.trim()}>{busy?"Saving…":editing?"Save changes":"Add customer"}</button>
        </div>}
      </div>
    </Modal>
  );
}

/* ═══════════════════ EMAIL MODAL ══════════════════════════════════════════ */
function EmailModal({recipients,onClose,onDone}:{recipients:Customer[];onClose:()=>void;onDone:(msg:string)=>void}) {
  const init = TEMPLATES[1];
  const [tpl,setTpl] = useState(init.id);
  const [sub,setSub] = useState(init.subject);
  const [body,setBody] = useState(init.body);
  const [cta,setCta] = useState({label:init.ctaLabel||"",url:init.ctaUrl||""});
  const [busy,setBusy] = useState(false);
  const [err,setErr] = useState("");
  const [report,setReport] = useState<{sent:number;failed:number;results:any[]}|null>(null);

  const pickTpl = (id:string) => { const t=TEMPLATES.find(x=>x.id===id); if(!t) return; setTpl(id); setSub(t.subject); setBody(t.body); setCta({label:t.ctaLabel||"",url:t.ctaUrl||""}); };
  const withEmail = recipients.filter(r=>!!r.email);
  const sample = withEmail[0];
  const preview = useMemo(()=>{
    const nm=sample?.name||"there"; const first=nm.split(/\s+/)[0];
    return body.replace(/\{\{\s*first_name\s*\}\}/gi,first).replace(/\{\{\s*name\s*\}\}/gi,nm);
  },[body,sample]);

  const send = async () => {
    setBusy(true); setErr("");
    try {
      const {data} = await customerApi.email(withEmail.map(r=>r.id),sub,body,cta.label||undefined,cta.url||undefined);
      if (data.failed>0) { setReport(data); setBusy(false); }
      else onDone(`Email sent to ${data.sent} customer${data.sent===1?"":"s"}.`);
    } catch(e:any) { setErr(errMsg(e)); setBusy(false); }
  };

  if (report) return (
    <Modal title="Send report" onClose={onClose} wide>
      <div style={{display:"flex",gap:28,paddingBottom:16,borderBottom:`1px solid ${LINE}`,marginBottom:4}}>
        {[{v:report.sent,c:POS,l:"sent"},{v:report.failed,c:NEG,l:"failed"}].map(({v,c,l})=>(
          <div key={l} style={{fontSize:30,fontWeight:800,color:c,display:"flex",alignItems:"baseline",gap:7}}>{v}<span style={{fontSize:12,fontWeight:700,color:MUTE,textTransform:"uppercase"}}>{l}</span></div>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",maxHeight:300,overflowY:"auto"}}>
        {report.results.map((r:any,i:number)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 2px",borderBottom:`1px solid ${LINE2}`}}>
            <span style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:r.ok?POS:NEG}}/>
            <span style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:INK}}>{r.name||r.email}</div><div style={{fontSize:11.5,color:MUTE}}>{r.email}</div></span>
            <span style={{fontSize:12,fontWeight:700,color:r.ok?POS:NEG}}>{r.ok?"Sent":r.error||"Failed"}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:16,paddingTop:16,borderTop:`1px solid ${LINE}`}}>
        <button className="cst-solid" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );

  return (
    <Modal title={withEmail.length===1?"Email customer":`Email ${withEmail.length} customers`} onClose={onClose} wide>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",color:MUTE,marginBottom:8}}>To</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {withEmail.slice(0,8).map(r=><span key={r.id} style={{padding:"5px 11px",background:CARD,border:`1px solid ${LINE}`,fontSize:12.5,fontWeight:600,color:INK}}>{r.name||r.email}</span>)}
          {withEmail.length>8 && <span style={{padding:"5px 11px",background:"#fdeee9",fontSize:12.5,fontWeight:700,color:ACCENT}}>+{withEmail.length-8} more</span>}
        </div>
        {recipients.length!==withEmail.length && <div style={{marginTop:6,fontSize:12,color:GOLD,fontWeight:600}}>{recipients.length-withEmail.length} skipped — no email on file.</div>}
      </div>
      <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",color:MUTE,marginBottom:8}}>Template</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {TEMPLATES.map(t=><button key={t.id} className={`cst-tpl${tpl===t.id?" on":""}`} onClick={()=>pickTpl(t.id)}>{t.label}</button>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {[["Subject","text",sub,(v:string)=>setSub(v),"1/-1","Subject line"],["Message","textarea",body,(v:string)=>setBody(v),"1/-1","Hi {{first_name}}, …"],["Button text","text",cta.label,(v:string)=>setCta(p=>({...p,label:v})),"auto","See our services"],["Button link","text",cta.url,(v:string)=>setCta(p=>({...p,url:v})),"auto","https://…"]].map(([lbl,type,val,onChange,col,ph])=>(
          <div key={String(lbl)} style={{gridColumn:String(col)}}>
            <label style={{display:"block",fontSize:12.5,fontWeight:700,color:INK,marginBottom:5}}>{String(lbl)}</label>
            {type==="textarea"
              ? <textarea className="cst-input" rows={8} value={String(val)} onChange={e=>(onChange as any)(e.target.value)} placeholder={String(ph)} style={{resize:"vertical"}}/>
              : <input className="cst-input" value={String(val)} onChange={e=>(onChange as any)(e.target.value)} placeholder={String(ph)}/>}
          </div>
        ))}
      </div>
      <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",color:MUTE,margin:"16px 0 8px"}}>Preview {sample?`— as ${sample.name||sample.email} will see it`:""}</div>
      <div style={{border:"1px solid #ececf1",overflow:"hidden"}}>
        <div style={{background:"#2a231d",padding:"16px 20px"}}><div style={{fontSize:16,fontWeight:800,color:"#fff"}}>Abhijit Art</div><div style={{fontSize:10,fontWeight:700,letterSpacing:1.1,textTransform:"uppercase",color:"#c2974a",marginTop:3}}>Printing &amp; Design Studio</div></div>
        <div style={{padding:"18px 20px 20px"}}>
          <div style={{fontSize:14.5,fontWeight:800,color:INK,marginBottom:10}}>{sub||<span style={{color:FAINT}}>(no subject)</span>}</div>
          <div style={{fontSize:13,color:BODY,lineHeight:1.7,whiteSpace:"pre-line"}}>{preview||<span style={{color:FAINT}}>(empty)</span>}</div>
          {cta.label&&cta.url&&<div style={{display:"inline-block",marginTop:16,padding:"11px 22px",background:ACCENT,color:"#fff",fontSize:13,fontWeight:700}}>{cta.label}</div>}
        </div>
      </div>
      {err && <div style={{marginTop:12,padding:"10px 14px",fontSize:13,color:"#8a2f16",background:"#fdecea",border:"1px solid #f3cfc2"}}>{err}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20,paddingTop:16,borderTop:`1px solid ${LINE}`,flexWrap:"wrap",gap:10}}>
        <span style={{fontSize:11.5,color:MUTE,maxWidth:260,lineHeight:1.5}}>Each customer gets their own email — nobody sees the others.</span>
        <div style={{display:"flex",gap:10}}>
          <button className="cst-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="cst-solid" onClick={send} disabled={busy||!sub.trim()||!body.trim()||!withEmail.length}>
            {busy?"Sending…":<><Ico d={IC.send} size={15}/> Send{withEmail.length>1?` to ${withEmail.length}`:""}</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Shared modal shell ─────────────────────────────────────────────────────── */
function Modal({title,children,onClose,wide}:{title:string;children:React.ReactNode;onClose:()=>void;wide?:boolean}) {
  useEffect(()=>{
    const fn=(e:KeyboardEvent)=>e.key==="Escape"&&onClose();
    window.addEventListener("keydown",fn); document.body.style.overflow="hidden";
    return ()=>{ window.removeEventListener("keydown",fn); document.body.style.overflow=""; };
  },[onClose]);
  return (
    <motion.div style={{position:"fixed",inset:0,background:"rgba(24,22,28,.5)",backdropFilter:"blur(3px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,boxSizing:"border-box"}}
      onClick={onClose} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.18}}>
      <motion.div style={{width:"100%",maxWidth:wide?660:520,maxHeight:"calc(100vh - 40px)",background:"#fffdfb",border:`1px solid ${LINE}`,boxShadow:"0 30px 80px rgba(24,22,28,.34)",display:"flex",flexDirection:"column",boxSizing:"border-box",overflow:"hidden"}}
        onClick={e=>e.stopPropagation()} initial={{opacity:0,scale:.94,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.96,y:12}} transition={{type:"spring",stiffness:300,damping:26}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"17px 22px",borderBottom:`1px solid ${LINE}`,background:CARD,flexShrink:0}}>
          <h3 style={{fontSize:17,fontWeight:800,margin:0,color:INK,letterSpacing:-.2}}>{title}</h3>
          <button className="cst-icon" onClick={onClose}><Ico d={IC.x} size={18}/></button>
        </div>
        <div style={{padding:22,overflowY:"auto",flex:1}}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

function Skeleton() {
  return (
    <div style={{background:CARD,border:"1px solid #ececf1",marginTop:16}}>
      {[...Array(5)].map((_,i)=>(
        <div key={i} style={{display:"flex",gap:24,padding:"16px 18px",borderBottom:`1px solid ${LINE2}`,alignItems:"center"}}>
          {[24,16,12,18].map((w,j)=><div key={j} className="cst-skel" style={{width:`${w}%`,height:16}}/>)}
        </div>
      ))}
    </div>
  );
}

/* ── Shared style constants ─────────────────────────────────────────────────── */
const TH:React.CSSProperties = {textAlign:"left",padding:"11px 16px",fontSize:10.5,fontWeight:700,letterSpacing:.7,textTransform:"uppercase",color:MUTE,borderBottom:"1px solid #ececf1",whiteSpace:"nowrap"};
const TD:React.CSSProperties = {padding:"13px 16px",fontSize:13.5,color:INK,borderBottom:`1px solid ${LINE2}`,verticalAlign:"middle"};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  .cst-filters{display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex:1 1 340px;min-width:0}
  .cst-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:16px}
  @media(max-width:1040px){.cst-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:460px){.cst-stats{grid-template-columns:minmax(0,1fr)}}
  .cst-stat{display:flex;align-items:center;gap:13px;padding:17px 18px;background:${GLOW};border:1px solid ${LINE};box-shadow:${GSHADOW}}
  .cst-input{width:100%;box-sizing:border-box;padding:10px 13px;border:1px solid #e6dcd2;font-size:14px;font-family:${SANS};background:${CARD};color:${INK};outline:none;transition:border-color .2s,box-shadow .2s;line-height:1.55}
  .cst-input:focus{border-color:${ACCENT};box-shadow:0 0 0 3px ${ACCENT}22}
  textarea.cst-input{resize:vertical;min-height:58px}
  .cst-sel{padding:10px 13px;border:1px solid #e6dcd2;background:${CARD};font-size:14px;font-family:${SANS};color:${INK};cursor:pointer;outline:none}
  .cst-solid{display:inline-flex;align-items:center;gap:8px;background:${ACCENT};color:#fff;border:0;padding:11px 18px;font-family:${SANS};font-size:13.5px;font-weight:700;cursor:pointer;transition:transform .2s,background .2s}
  .cst-solid:hover:not(:disabled){transform:translateY(-1px);background:${ACCENT_DK}}
  .cst-solid:disabled{opacity:.5;cursor:not-allowed}
  .cst-solid.sm{padding:8px 14px;font-size:12.5px}
  .cst-ghost{display:inline-flex;align-items:center;gap:8px;background:${CARD};color:${INK};border:1px solid #e6dcd2;padding:11px 18px;font-family:${SANS};font-size:13.5px;font-weight:700;cursor:pointer;transition:background .2s,border-color .2s,color .2s}
  .cst-ghost:hover:not(:disabled){background:#fffcf9;border-color:${ACCENT}55;color:${ACCENT}}
  .cst-ghost:disabled{opacity:.5;cursor:not-allowed}
  .cst-ghost.sm{padding:8px 14px;font-size:12.5px}
  .cst-danger{display:inline-flex;align-items:center;gap:7px;background:${NEG};color:#fff;border:0;padding:8px 14px;font-family:${SANS};font-size:12.5px;font-weight:700;cursor:pointer}
  .cst-danger:hover:not(:disabled){background:#c23c30}
  .cst-danger-ghost{display:inline-flex;align-items:center;gap:7px;background:transparent;color:${NEG};border:1px solid ${NEG}44;padding:10px 16px;font-family:${SANS};font-size:13px;font-weight:700;cursor:pointer;transition:background .2s}
  .cst-danger-ghost:hover{background:#fdecea}
  .cst-mini{display:inline-flex;align-items:center;gap:6px;background:${INK};color:#fff;border:0;padding:7px 12px;font-family:${SANS};font-size:12px;font-weight:700;cursor:pointer;transition:background .2s,transform .2s;white-space:nowrap}
  .cst-mini:hover:not(:disabled){background:#33394a;transform:translateY(-1px)}
  .cst-mini:disabled{opacity:.4;cursor:not-allowed}
  .cst-icon{width:34px;height:34px;border:1px solid #e6dcd2;background:${CARD};color:${BODY};display:grid;place-items:center;cursor:pointer;transition:all .2s;flex-shrink:0}
  .cst-icon:hover{color:${ACCENT};border-color:${ACCENT}55;background:#fffcf9}
  .cst-tpl{background:${CARD};border:1px solid #e6dcd2;color:${BODY};padding:7px 13px;font-family:${SANS};font-size:12.5px;font-weight:700;cursor:pointer;transition:all .18s;white-space:nowrap}
  .cst-tpl:hover{border-color:${ACCENT}55;color:${ACCENT}}
  .cst-tpl.on{background:${ACCENT};border-color:${ACCENT};color:#fff}
  .cst-chk{width:16px;height:16px;accent-color:${ACCENT};cursor:pointer}
  .cst-chk:disabled{cursor:not-allowed;opacity:.4}
  .cst-row:hover td{background:${BGSOFT}}
  .cst-fading{opacity:.55;pointer-events:none;transition:opacity .2s}
  .cst-skel{background:linear-gradient(90deg,#eef0f3 25%,#f6f7f9 37%,#eef0f3 63%);background-size:400% 100%;animation:cstShimmer 1.4s ease infinite}
  @keyframes cstShimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
  @media(max-width:560px){.cst-filters{width:100%}}
  @media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;