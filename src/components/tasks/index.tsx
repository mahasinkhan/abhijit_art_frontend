// src/components/tasks/index.tsx
import { useRef, useState } from "react";
import { useTasks }      from "../../hooks/useTasks";
import { taskApi }       from "../../services/task.api";
import { TaskStats }     from "./TaskStats";
import { TaskList }      from "./TaskList";
import { TaskDetail }    from "./TaskDetail";
import { TaskModal }     from "./TaskModal";
import type { TaskStatus } from "../../services/task.api";

const API_BASE  = import.meta.env.VITE_API_URL || "http://localhost:5000";
const ACCENT    = "#d9542f";
const ACCENT_DK = "#b8421f";
const INK       = "#2a231d";
const MUTED     = "#8a8378";
const FAINT     = "#b3ab9f";
const LINE      = "#e7e1d7";
const LINE_SOFT = "#f1ece3";
const WASH      = "#faf8f3";
const GOLD      = "#c2974a";

export default function Tasks({
  prefillEmployeeId,
  onPrefillConsumed,
  onGoToBilling,
}: {
  prefillEmployeeId?: string | null;
  onPrefillConsumed?: () => void;
  onGoToBilling?:     () => void;
}) {
  const {
    employees, invoices, loading,
    selectedId, setSelectedId,
    selected, selectedBill,
    filter, setFilter,
    search, setSearch,
    stats, displayed,
    updateStatus, deleteTask,
    reload,
  } = useTasks();

  const [showModal, setShowModal] = useState(false);
  const [editTask,  setEditTask]  = useState<any>(null);
  const [saving,    setSaving]    = useState(false);
  const [lightbox,  setLightbox]  = useState<string | null>(null);

  // prefill from Employees tab
  const prefillRef = useRef(prefillEmployeeId);
  if (prefillEmployeeId && prefillEmployeeId !== prefillRef.current) {
    prefillRef.current = prefillEmployeeId;
    setEditTask(null); setShowModal(true); onPrefillConsumed?.();
  }

  function openCreate() { setEditTask(null); setShowModal(true); }
  function openEdit(task: any) { setEditTask(task); setShowModal(true); }

  async function handleSaveCreate(
    jobs: { it: any; a: any }[],
    form: any,
    images: File[]
  ) {
    setSaving(true);
    try {
      const linksArr = form.links.split(",").map((l: string) => l.trim()).filter(Boolean);
      let firstId: string | null = null;
      for (const { it, a } of jobs) {
        const qty = Number(it.qty) || 0, rate = Number(it.rate) || 0, amt = qty * rate;
        const desc =
          `${qty} × ${it.desc || "Item"} — ₹${amt.toLocaleString("en-IN")}` +
          (a.instruction.trim() ? `\n→ ${a.instruction.trim()}` : "") +
          (form.generalNotes.trim() ? `\n\nNotes: ${form.generalNotes.trim()}` : "");
        const fd = new FormData();
        fd.append("title",         it.desc || "Item");
        fd.append("description",   desc);
        fd.append("assignedToId",  a.assignedToId);
        fd.append("priority",      form.priority);
        fd.append("deadline",      form.deadline);
        fd.append("orderDate",     form.orderDate);
        fd.append("customerName",  it.clientName  || "");
        fd.append("customerPhone", it.clientPhone || "");
        fd.append("customerEmail", it.clientEmail || "");
        fd.append("amount",        String(amt));
        fd.append("advancePaid",   "0");
        fd.append("invoiceId",     it.invoiceId  || "");
        fd.append("invoiceNo",     it.invoiceNo  || "");
        fd.append("links",         JSON.stringify(linksArr));
        images.forEach((f) => fd.append("images", f));
        const task = await taskApi.create(fd);
        if (!firstId) firstId = task.id;
      }
      if (firstId) setSelectedId(firstId);
      setShowModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create tasks");
    } finally { setSaving(false); }
  }

  async function handleSaveEdit(
    id: string, form: any, images: File[], removeImages: string[]
  ) {
    setSaving(true);
    try {
      const linksArr = form.links.split(",").map((l: string) => l.trim()).filter(Boolean);
      const fd = new FormData();
      fd.append("title",        form.title);
      fd.append("description",  form.description);
      fd.append("assignedToId", form.assignedToId);
      fd.append("priority",     form.priority);
      fd.append("deadline",     form.deadline);
      fd.append("orderDate",    form.orderDate);
      fd.append("links",        JSON.stringify(linksArr));
      images.forEach((f) => fd.append("newImages", f));
      if (removeImages.length) fd.append("removeImages", JSON.stringify(removeImages));
      await taskApi.update(id, fd);
      setShowModal(false);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to save task");
    } finally { setSaving(false); }
  }

  return (
    <div className="tk">
      <style>{`
        .tk { font-family:'DM Sans',system-ui,sans-serif; color:${INK}; font-variant-numeric:tabular-nums; }
        .tk * { box-sizing:border-box; }
        .tk-stats { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:18px; }
        .tk-stat { background:#fff; border:1px solid ${LINE}; border-radius:3px; padding:15px 16px; display:flex; flex-direction:column; gap:6px; }
        .tk-stat-n { font-size:1.55rem; font-weight:700; line-height:1; letter-spacing:-.01em; }
        .tk-stat-l { font-size:.66rem; text-transform:uppercase; letter-spacing:.08em; color:${MUTED}; display:flex; align-items:center; gap:6px; }
        .tk-stat-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .tk-stat.over .tk-stat-n { color:${ACCENT}; }
        .tk-bar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:14px; }
        .tk-search { padding:9px 12px; border:1px solid ${LINE}; border-radius:3px; font-size:.85rem; width:250px; font-family:inherit; color:${INK}; background:#fff; }
        .tk-search::placeholder { color:${FAINT}; }
        .tk-sel { padding:9px 10px; border:1px solid ${LINE}; border-radius:3px; font-size:.82rem; background:#fff; font-family:inherit; color:${INK}; }
        .tk-search:focus,.tk-sel:focus { outline:none; border-color:${ACCENT}; }
        .tk-assign { margin-left:auto; background:${ACCENT}; color:#fff; border:none; border-radius:3px; padding:10px 18px; font-size:.85rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .tk-assign:hover { background:${ACCENT_DK}; }
        .tk-split { display:grid; grid-template-columns:minmax(300px,380px) 1fr; gap:16px; align-items:start; }
        .tk-list { background:#fff; border:1px solid ${LINE}; border-radius:3px; max-height:calc(100vh - 250px); overflow-y:auto; }
        .tk-count { padding:11px 16px; font-size:.7rem; text-transform:uppercase; letter-spacing:.07em; color:${MUTED}; border-bottom:1px solid ${LINE_SOFT}; position:sticky; top:0; background:#fff; z-index:1; }
        .tk-row { display:grid; grid-template-columns:3px 1fr; align-items:stretch; border-bottom:1px solid ${LINE_SOFT}; cursor:pointer; }
        .tk-row:last-child { border-bottom:none; }
        .tk-row:hover { background:${WASH}; }
        .tk-row.sel { background:#fdf2ee; }
        .tk-row-stripe { width:3px; }
        .tk-row-body { padding:13px 14px; min-width:0; }
        .tk-row-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
        .tk-row-title { font-weight:600; font-size:.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tk-row.sel .tk-row-title { color:${ACCENT_DK}; }
        .tk-row-sub { font-size:.76rem; color:${MUTED}; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tk-row-foot { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:8px; }
        .tk-row-money { font-size:.78rem; font-weight:600; color:${INK}; }
        .tk-badge { display:inline-block; padding:2px 9px; border-radius:3px; font-size:.68rem; font-weight:700; white-space:nowrap; }
        .tk-dl { font-size:.72rem; font-weight:600; }
        .tk-dl.ok{color:${MUTED};} .tk-dl.soon{color:#b45309;} .tk-dl.over{color:${ACCENT};} .tk-dl.done{color:#2f7a3f;} .tk-dl.ready{color:#9a6a12;}
        .tk-detail { background:#fff; border:1px solid ${LINE}; border-radius:3px; min-height:360px; }
        .tk-empty { display:flex; align-items:center; justify-content:center; min-height:360px; color:${FAINT}; font-size:.9rem; text-align:center; padding:40px; line-height:1.6; }
        .tk-d-head { display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap; padding:22px 24px 16px; border-bottom:1px solid ${LINE_SOFT}; }
        .tk-d-headmain { flex:1; min-width:200px; }
        .tk-d-title { font-size:1.15rem; font-weight:700; line-height:1.3; }
        .tk-d-sub { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:7px; font-size:.8rem; color:${MUTED}; }
        .tk-d-sub b { color:${INK}; font-weight:600; }
        .tk-chip { display:inline-flex; align-items:center; gap:5px; padding:2px 9px; border-radius:3px; font-size:.7rem; font-weight:700; }
        .tk-chip-dot { width:6px; height:6px; border-radius:50%; }
        .tk-d-actions { display:flex; gap:7px; }
        .tk-abtn { background:#fff; border:1px solid ${LINE}; border-radius:3px; padding:6px 13px; font-size:.78rem; font-weight:600; cursor:pointer; font-family:inherit; color:${INK}; }
        .tk-abtn:hover { background:${WASH}; border-color:#d8cfc0; }
        .tk-abtn.danger { color:${ACCENT}; border-color:#f0d2c8; }
        .tk-abtn.danger:hover { background:#fef2ee; }
        .tk-d-body { padding:20px 24px 24px; }
        .tk-sec { margin-top:22px; }
        .tk-sec:first-child { margin-top:0; }
        .tk-sec-l { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:${MUTED}; margin-bottom:10px; }
        .tk-statusctl { display:inline-flex; border:1px solid ${LINE}; border-radius:3px; overflow:hidden; flex-wrap:wrap; }
        .tk-sc { padding:8px 16px; border:none; border-right:1px solid ${LINE}; font-size:.78rem; font-weight:600; cursor:pointer; background:#fff; font-family:inherit; color:${MUTED}; }
        .tk-sc:last-child { border-right:none; }
        .tk-sc:hover:not(.on) { background:${WASH}; color:${INK}; }
        .tk-sc.on { color:#fff; font-weight:700; }
        .tk-cards { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .tk-card { border:1px solid ${LINE}; border-radius:3px; padding:16px; background:${WASH}; }
        .tk-card-l { font-size:.66rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:${FAINT}; margin-bottom:11px; }
        .tk-kv { display:flex; align-items:baseline; justify-content:space-between; gap:12px; font-size:.85rem; padding:3px 0; }
        .tk-kv .k { color:${MUTED}; } .tk-kv .v { font-weight:600; text-align:right; }
        .tk-kv .v.due { color:${ACCENT}; } .tk-kv .v.paid { color:#2f7a3f; }
        .tk-cust-name { font-weight:700; font-size:.95rem; margin-bottom:6px; }
        .tk-cust-line { font-size:.82rem; color:${INK}; margin-bottom:2px; }
        .tk-cust-line.dim { color:${MUTED}; font-size:.78rem; }
        .tk-invpill { display:inline-block; background:#fff; border:1px solid ${LINE}; color:${INK}; padding:3px 10px; border-radius:3px; font-size:.72rem; font-weight:700; margin:6px 0; }
        .tk-dates { font-size:.76rem; color:${MUTED}; margin-top:6px; }
        .tk-billsplit { border-top:1px solid ${LINE}; margin-top:10px; padding-top:10px; }
        .tk-desc { font-size:.88rem; line-height:1.65; white-space:pre-wrap; background:${WASH}; border-left:3px solid ${GOLD}; border-radius:0 3px 3px 0; padding:13px 15px; }
        .tk-links a { color:${ACCENT}; font-size:.82rem; display:block; margin-bottom:5px; word-break:break-all; text-decoration:none; }
        .tk-links a:hover { text-decoration:underline; }
        .tk-imgs { display:flex; flex-wrap:wrap; gap:10px; }
        .tk-img { width:112px; height:84px; object-fit:cover; border:1px solid ${LINE}; border-radius:3px; cursor:pointer; }
        .tk-img:hover { border-color:${ACCENT}; }
        .tk-notes { background:${WASH}; border:1px solid ${LINE}; border-radius:3px; padding:13px 15px; font-size:.85rem; white-space:pre-wrap; line-height:1.6; }
        .tk-tl { padding-left:2px; }
        .tk-tl-step { display:grid; grid-template-columns:16px 1fr; gap:14px; }
        .tk-tl-rail { display:flex; flex-direction:column; align-items:center; }
        .tk-tl-dot { width:12px; height:12px; border-radius:50%; border:2px solid ${LINE}; background:#fff; flex-shrink:0; margin-top:3px; }
        .tk-tl-dot.done { background:#2f7a3f; border-color:#2f7a3f; }
        .tk-tl-dot.active { background:#1e5fa8; border-color:#1e5fa8; }
        .tk-tl-dot.cancel { background:${MUTED}; border-color:${MUTED}; }
        .tk-tl-line { width:2px; flex:1; background:${LINE_SOFT}; min-height:20px; }
        .tk-tl-line.done { background:#c7e0cd; }
        .tk-tl-body { padding-bottom:18px; }
        .tk-tl-step:last-child .tk-tl-body { padding-bottom:0; }
        .tk-tl-t { font-size:.86rem; font-weight:600; }
        .tk-tl-when { font-size:.77rem; color:${MUTED}; margin-top:2px; }
        .tk-tl-dur { font-size:.72rem; color:${FAINT}; margin-top:1px; }
        .tk-ov { position:fixed; inset:0; background:rgba(31,36,48,.5); z-index:1000; display:flex; align-items:center; justify-content:center; padding:24px 20px; overflow:hidden; }
        .tk-modal { background:#fff; width:100%; max-width:680px; border-radius:4px; position:relative; display:flex; flex-direction:column; max-height:calc(100vh - 48px); overflow:hidden; }
        .tk-mhead { padding:22px 26px 18px; border-bottom:1px solid ${LINE_SOFT}; flex-shrink:0; }
        .tk-mtitle { font-size:1.05rem; font-weight:700; }
        .tk-msub { font-size:.8rem; color:${MUTED}; margin-top:4px; line-height:1.5; }
        .tk-mbody { padding:22px 26px 26px; overflow-y:auto; flex:1 1 auto; min-height:0; max-height:calc(100vh - 170px); overscroll-behavior:contain; }
        .tk-mbody::-webkit-scrollbar { width:5px; }
        .tk-mbody::-webkit-scrollbar-thumb { background:${LINE}; border-radius:10px; }
        .tk-close { position:absolute; top:16px; right:18px; background:none; border:none; font-size:1.4rem; line-height:1; cursor:pointer; color:${MUTED}; z-index:1; }
        .tk-close:hover { color:${INK}; }
        .tk-lbl { display:block; font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:${MUTED}; margin-bottom:6px; }
        .tk-inp { width:100%; padding:9px 12px; border:1px solid ${LINE}; border-radius:3px; font-size:.88rem; font-family:inherit; color:${INK}; background:#fff; }
        .tk-inp:focus { outline:none; border-color:${ACCENT}; }
        .tk-ta { min-height:92px; resize:vertical; }
        .tk-2col { display:grid; grid-template-columns:1fr 1fr; gap:13px; }
        .tk-seg { display:flex; border:1px solid ${LINE}; border-radius:3px; overflow:hidden; }
        .tk-seg button { flex:1; padding:8px; border:none; border-right:1px solid ${LINE}; background:#fff; font-size:.78rem; cursor:pointer; font-family:inherit; color:${MUTED}; }
        .tk-seg button:last-child { border-right:none; }
        .tk-seg button.on { background:${ACCENT}; color:#fff; font-weight:700; }
        .tk-save { background:${ACCENT}; color:#fff; border:none; border-radius:3px; padding:12px; width:100%; font-size:.9rem; font-weight:700; cursor:pointer; font-family:inherit; margin-top:4px; }
        .tk-save:hover:not(:disabled) { background:${ACCENT_DK}; }
        .tk-save:disabled { opacity:.45; cursor:not-allowed; }
        .tk-grid { display:grid; gap:14px; }
        .tk-fieldset { border:1px solid ${LINE}; border-radius:3px; padding:16px; }
        .tk-fs-l { display:flex; align-items:center; gap:9px; font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:${INK}; margin-bottom:14px; }
        .tk-fs-num { width:20px; height:20px; border-radius:3px; background:${ACCENT}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:.72rem; }
        .tk-bp { position:relative; }
        .tk-bp-dd { position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid ${LINE}; border-top:none; border-radius:0 0 3px 3px; z-index:30; max-height:260px; overflow-y:auto; box-shadow:0 10px 26px rgba(20,20,25,.1); }
        .tk-bp-item { padding:11px 13px; cursor:pointer; border-bottom:1px solid ${LINE_SOFT}; display:flex; justify-content:space-between; gap:10px; align-items:center; }
        .tk-bp-item:hover { background:${WASH}; }
        .tk-bp-item .l b { font-size:.86rem; } .tk-bp-item .l span { font-size:.76rem; color:${MUTED}; margin-left:8px; }
        .tk-bp-item .r { font-size:.83rem; font-weight:700; white-space:nowrap; }
        .tk-bp-none { padding:16px 13px; text-align:center; }
        .tk-bp-none p { font-size:.82rem; color:${MUTED}; margin:0 0 10px; line-height:1.5; }
        .tk-bp-mkbtn { background:${ACCENT}; color:#fff; border:none; border-radius:3px; padding:8px 15px; font-size:.8rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .tk-bill-chip { border:1px solid ${LINE}; border-radius:3px; background:${WASH}; padding:15px 16px; }
        .tk-bill-chip-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
        .tk-bill-chip-top b { font-size:.95rem; }
        .tk-bill-chip .sub { font-size:.8rem; color:${MUTED}; margin-top:4px; }
        .tk-bill-figs { display:flex; gap:22px; margin-top:12px; }
        .tk-bill-figs div span { font-size:.62rem; text-transform:uppercase; letter-spacing:.05em; color:${FAINT}; display:block; margin-bottom:2px; }
        .tk-bill-figs div b { font-size:.95rem; }
        .tk-bill-figs .due b { color:${ACCENT}; }
        .tk-change { background:#fff; border:1px solid ${LINE}; border-radius:3px; padding:6px 13px; font-size:.76rem; font-weight:600; cursor:pointer; font-family:inherit; color:${INK}; flex-shrink:0; }
        .tk-change:hover { background:${WASH}; }
        .tk-item { border:1px solid ${LINE}; border-radius:3px; padding:13px; margin-bottom:9px; }
        .tk-item:last-child { margin-bottom:0; }
        .tk-item-head { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:10px; }
        .tk-item-head b { font-weight:600; font-size:.88rem; }
        .tk-item-head .r { display:flex; align-items:center; gap:9px; flex-shrink:0; }
        .tk-item-head .amt { font-weight:700; font-size:.85rem; white-space:nowrap; }
        .tk-item-x { background:#fff; border:1px solid ${LINE}; color:${ACCENT}; width:22px; height:22px; border-radius:3px; font-size:15px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; }
        .tk-item-x:hover { background:#fef2ee; border-color:#f0d2c8; }
        .tk-item-2 { display:grid; grid-template-columns:minmax(150px,190px) 1fr; gap:8px; }
        .tk-item-2 select,.tk-item-2 input { padding:8px 10px; border:1px solid ${LINE}; border-radius:3px; font-size:.82rem; font-family:inherit; width:100%; color:${INK}; background:#fff; }
        .tk-item-2 select:focus,.tk-item-2 input:focus { outline:none; border-color:${ACCENT}; }
        .tk-item.skipped { display:flex; align-items:center; justify-content:space-between; gap:10px; background:${WASH}; color:${MUTED}; padding:11px 13px; }
        .tk-item.skipped .s { font-size:.82rem; text-decoration:line-through; }
        .tk-item.skipped button { background:none; border:none; color:${ACCENT}; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .tk-createcount { font-size:.8rem; font-weight:600; color:#2f7a3f; margin-top:12px; padding-top:12px; border-top:1px solid ${LINE_SOFT}; }
        .tk-createcount.zero { color:${MUTED}; font-weight:500; }
        .tk-thumb { position:relative; width:80px; height:66px; }
        .tk-thumb img { width:100%; height:100%; object-fit:cover; border-radius:3px; }
        .tk-thumb-x { position:absolute; top:2px; right:2px; background:${ACCENT}; color:#fff; border:none; border-radius:3px; width:18px; height:18px; font-size:11px; cursor:pointer; line-height:1; }
        .tk-thumb.rm img { opacity:.35; }
        .tk-thumb.rm::after { content:'✕'; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:1.3rem; color:${ACCENT}; font-weight:700; }
        .tk-lb { position:fixed; inset:0; background:rgba(0,0,0,.9); z-index:2000; display:flex; align-items:center; justify-content:center; cursor:zoom-out; }
        .tk-lb img { max-width:92vw; max-height:92vh; object-fit:contain; }
        .tk-hint { font-size:.74rem; color:${FAINT}; text-align:center; line-height:1.5; }
        @media (max-width:1000px){ .tk-split{ grid-template-columns:1fr; } .tk-list{ max-height:none; } }
        @media (max-width:560px){ .tk-stats{ grid-template-columns:repeat(2,1fr); } .tk-search{ width:100%; } .tk-2col{ grid-template-columns:1fr; } .tk-item-2{ grid-template-columns:1fr; } .tk-cards{ grid-template-columns:1fr; } }
      `}</style>

      <TaskStats {...stats} />

      <div className="tk-split">
        <TaskList
          tasks={displayed} employees={employees} loading={loading}
          selectedId={selectedId} filter={filter} search={search}
          onSelect={setSelectedId}
          onFilter={(patch) => setFilter((f) => ({ ...f, ...patch }))}
          onSearch={setSearch}
          onCreate={openCreate}
        />

        {selected ? (
          <TaskDetail
            key={selected.id}
            task={selected}
            bill={selectedBill}
            onEdit={() => openEdit(selected)}
            onDelete={() => deleteTask(selected.id)}
            onStatus={(s) => updateStatus(selected.id, s)}
            onImage={(src) => setLightbox(src)}
          />
        ) : (
          <div className="tk-detail tk-empty">
            {displayed.length === 0
              ? "No tasks yet — click \"+ Assign task\" to create tasks from a bill."
              : "Select a task to see the customer, billing and progress timeline."}
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal
          editTask={editTask}
          employees={employees}
          invoices={invoices}
          saving={saving}
          onGoToBilling={onGoToBilling}
          onSaveCreate={handleSaveCreate}
          onSaveEdit={handleSaveEdit}
          onClose={() => setShowModal(false)}
        />
      )}

      {lightbox && (
        <div className="tk-lb" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Full size" />
        </div>
      )}
    </div>
  );
}