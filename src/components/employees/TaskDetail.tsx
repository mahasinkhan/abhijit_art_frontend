// src/components/employees/TaskDetail.tsx
import type { Task, TaskStatus, TaskPriority } from "../../services/employee-task.api";
import { fmtDate, fmtDateTime, rupees } from "../../hooks/useMyTasks";

const API_BASE   = import.meta.env.VITE_API_URL || "http://localhost:5000";
const ACCENT     = "#d9542f";
const ACCENT_DK  = "#b8421f";
const GOLD       = "#c2974a";
const INK        = "#2a231d";
const MUTED      = "#8a8378";
const FAINT      = "#b3ab9f";
const LINE       = "#e7e1d7";
const LINE_SOFT  = "#f1ece3";
const WASH       = "#faf8f3";
const GREEN      = "#2f7a3f";

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "#a8a29a" },
  medium: { label: "Medium", color: GOLD      },
  high:   { label: "High",   color: ACCENT    },
  urgent: { label: "Urgent", color: "#7c3aed" },
};

interface Props {
  task:          Task;
  isMe:          boolean;
  notesDraft:    string;
  setNotesDraft: (v: string) => void;
  busy:          "" | "status" | "notes" | "deliver";
  onClose:       () => void;
  onStatus:      (s: TaskStatus, kind: "status" | "notes") => void;
  onDeliver:     (delivered: boolean) => void;
  onImage:       (src: string) => void;
}

export function TaskDetail({
  task, isMe, notesDraft, setNotesDraft,
  busy, onClose, onStatus, onDeliver, onImage,
}: Props) {
  const pm          = PRIORITY_META[task.priority];
  const isPending   = task.status === "pending";
  const isProgress  = task.status === "in_progress";
  const isCompleted = task.status === "completed";
  const delivered   = !!task.deliveredAt;
  const editable    = isPending || isProgress;
  const hasCustomer = !!(task.customerName || task.customerPhone || task.invoiceNo || (task.amount || 0) > 0);

  return (
    <div className="tdx">
      <style>{`
        .tdx { background:#fff; border:1px solid ${LINE}; border-radius:6px; font-family:'DM Sans',system-ui,sans-serif; color:${INK}; overflow:hidden; }
        .tdx * { box-sizing:border-box; }

        /* Header */
        .tdx-head { display:flex; align-items:flex-start; gap:14px; padding:18px 24px; border-bottom:1px solid ${LINE_SOFT}; background:${WASH}; }
        .tdx-head-main { flex:1; min-width:0; }
        .tdx-title { font-size:1.22rem; font-weight:800; line-height:1.25; letter-spacing:-.01em; }
        .tdx-meta { font-size:.8rem; color:${MUTED}; margin-top:6px; line-height:1.5; }
        .tdx-meta b { color:${INK}; }
        .tdx-prio { display:inline-flex; align-items:center; gap:6px; font-size:.8rem; font-weight:700; white-space:nowrap; margin-top:3px; }
        .tdx-prio-dot { width:8px; height:8px; border-radius:50%; }
        .tdx-close { background:none; border:none; font-size:1.5rem; line-height:1; cursor:pointer; color:${MUTED}; padding:2px 6px; margin:-2px -6px 0 0; }
        .tdx-close:hover { color:${INK}; }

        /* 2-column body */
        .tdx-body { display:grid; grid-template-columns:1.05fr 1fr; gap:0; }
        .tdx-col { padding:22px 24px; min-width:0; }
        .tdx-col.left  { border-right:1px solid ${LINE_SOFT}; }
        .tdx-sec { margin-top:22px; }
        .tdx-sec:first-child { margin-top:0; }
        .tdx-sec-l { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:${MUTED}; margin-bottom:10px; }

        /* Order-for KV card */
        .tdx-kv { border:1px solid ${LINE}; border-radius:5px; overflow:hidden; }
        .tdx-kv-row { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:10px 14px; border-bottom:1px solid ${LINE_SOFT}; }
        .tdx-kv-row:last-child { border-bottom:none; }
        .tdx-kv-row:nth-child(even) { background:${WASH}; }
        .tdx-kv-k { font-size:.78rem; color:${MUTED}; font-weight:600; white-space:nowrap; }
        .tdx-kv-v { font-size:.92rem; font-weight:700; color:${INK}; text-align:right; word-break:break-word; }
        .tdx-kv-v.money { color:${GREEN}; font-variant-numeric:tabular-nums; }

        /* Task details */
        .tdx-desc { font-size:.92rem; line-height:1.6; white-space:pre-line; color:${INK}; background:${WASH}; border-left:3px solid ${GOLD}; padding:12px 14px; border-radius:0 4px 4px 0; }

        /* Images */
        .tdx-imgs { display:flex; gap:9px; flex-wrap:wrap; }
        .tdx-img { width:82px; height:82px; object-fit:cover; border:1px solid ${LINE}; border-radius:4px; cursor:zoom-in; transition:border-color .12s; }
        .tdx-img:hover { border-color:${ACCENT}; }

        /* Links */
        .tdx-links a { display:block; font-size:.84rem; color:#1e5fa8; word-break:break-all; margin-bottom:4px; text-decoration:none; }
        .tdx-links a:hover { text-decoration:underline; }

        /* Notes */
        .tdx-ta { width:100%; min-height:120px; resize:vertical; padding:12px 14px; border:1px solid ${LINE}; border-radius:5px; font-size:.9rem; font-family:inherit; color:${INK}; line-height:1.5; }
        .tdx-ta:focus { outline:none; border-color:${ACCENT}; box-shadow:0 0 0 3px rgba(217,84,47,.12); }
        .tdx-notes-ro { font-size:.9rem; line-height:1.6; white-space:pre-line; color:${INK}; background:${WASH}; border:1px solid ${LINE_SOFT}; border-radius:5px; padding:12px 14px; }
        .tdx-notes-ro.empty { color:${FAINT}; font-style:italic; }

        /* Buttons */
        .tdx-actions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:12px; }
        .tdx-btn { border:none; border-radius:5px; padding:11px 20px; font-size:.88rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .tdx-btn:disabled { opacity:.55; cursor:not-allowed; }
        .tdx-btn.primary { background:${ACCENT}; color:#fff; } .tdx-btn.primary:hover:not(:disabled){ background:${ACCENT_DK}; }
        .tdx-btn.go { background:${GREEN}; color:#fff; } .tdx-btn.go:hover:not(:disabled){ background:#276634; }
        .tdx-btn.blue { background:#1e5fa8; color:#fff; } .tdx-btn.blue:hover:not(:disabled){ background:#184e8a; }
        .tdx-btn.ghost { background:#fff; border:1px solid ${LINE}; color:${INK}; } .tdx-btn.ghost:hover:not(:disabled){ background:${WASH}; }
        .tdx-hint { font-size:.74rem; color:${FAINT}; margin-top:9px; }

        /* Deliver boxes */
        .tdx-deliver { border-radius:6px; padding:16px 18px; }
        .tdx-deliver.ready { background:#fdf2ee; border:1px solid #f3c9ba; }
        .tdx-deliver.done  { background:#eaf6ec; border:1px solid #bfe3c6; }
        .tdx-deliver-t { font-size:.98rem; font-weight:800; color:${INK}; display:flex; align-items:center; gap:8px; }
        .tdx-deliver.ready .tdx-deliver-t { color:${ACCENT_DK}; }
        .tdx-deliver.done  .tdx-deliver-t { color:${GREEN}; }
        .tdx-deliver-p { font-size:.82rem; color:${MUTED}; margin-top:5px; line-height:1.5; }
        .tdx-tick { display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; background:${GREEN}; color:#fff; font-size:.72rem; }

        @media (max-width:820px){
          .tdx-body { grid-template-columns:1fr; }
          .tdx-col.left { border-right:none; border-bottom:1px solid ${LINE_SOFT}; }
        }
      `}</style>

      {/* Header */}
      <div className="tdx-head">
        <div className="tdx-head-main">
          <div className="tdx-title">{task.title}</div>
          <div className="tdx-meta">
            Assigned by <b>{task.createdBy.name}</b>
            {" · "}Created {fmtDate(task.createdAt)}
            {task.deadline && <> · Deliver by {fmtDate(task.deadline)}</>}
            {delivered && <> · <span style={{ color: GREEN, fontWeight: 600 }}>Delivered {fmtDate(task.deliveredAt)}</span></>}
          </div>
        </div>
        <span className="tdx-prio" style={{ color: pm.color }}>
          <span className="tdx-prio-dot" style={{ background: pm.color }} />{pm.label}
        </span>
        <button className="tdx-close" onClick={onClose} title="Close">×</button>
      </div>

      {/* Body — 2 columns */}
      <div className="tdx-body">

        {/* ── LEFT: order info, task details, refs ── */}
        <div className="tdx-col left">
          {hasCustomer && (
            <div className="tdx-sec">
              <div className="tdx-sec-l">Order for</div>
              <div className="tdx-kv">
                {task.customerName  && <div className="tdx-kv-row"><span className="tdx-kv-k">Customer</span><span className="tdx-kv-v">{task.customerName}</span></div>}
                {task.customerPhone && <div className="tdx-kv-row"><span className="tdx-kv-k">Phone</span><span className="tdx-kv-v">{task.customerPhone}</span></div>}
                {task.invoiceNo     && <div className="tdx-kv-row"><span className="tdx-kv-k">Bill</span><span className="tdx-kv-v">{task.invoiceNo}</span></div>}
                {(task.amount || 0) > 0 && <div className="tdx-kv-row"><span className="tdx-kv-k">Order value</span><span className="tdx-kv-v money">{rupees(task.amount)}</span></div>}
              </div>
            </div>
          )}

          {task.description && (
            <div className="tdx-sec">
              <div className="tdx-sec-l">Task details</div>
              <div className="tdx-desc">{task.description}</div>
            </div>
          )}

          {task.images.length > 0 && (
            <div className="tdx-sec">
              <div className="tdx-sec-l">Reference images</div>
              <div className="tdx-imgs">
                {task.images.map((img, i) => (
                  <img key={i} src={`${API_BASE}${img}`} alt={`ref-${i + 1}`}
                    className="tdx-img" onClick={() => onImage(`${API_BASE}${img}`)} />
                ))}
              </div>
            </div>
          )}

          {task.links.length > 0 && (
            <div className="tdx-sec tdx-links">
              <div className="tdx-sec-l">Reference links</div>
              {task.links.map((l, i) => (
                <a key={i} href={l} target="_blank" rel="noreferrer">{l}</a>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: notes, status, deliver ── */}
        <div className="tdx-col right">
          <div className="tdx-sec">
            <div className="tdx-sec-l">Your notes / progress update</div>
            {editable ? (
              <textarea className="tdx-ta" value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Add notes about your progress, blockers, or completion details…" />
            ) : (
              <div className={`tdx-notes-ro${task.notes ? "" : " empty"}`}>
                {task.notes || "No notes added."}
              </div>
            )}
          </div>

          {editable && (
            <div className="tdx-sec">
              <div className="tdx-sec-l">Update status</div>
              <div className="tdx-actions">
                {isPending && (
                  <button className="tdx-btn blue" disabled={!!busy}
                    onClick={() => onStatus("in_progress", "status")}>
                    {busy === "status" ? "Starting…" : "Start work"}
                  </button>
                )}
                {isProgress && (
                  <button className="tdx-btn go" disabled={!!busy}
                    onClick={() => onStatus("completed", "status")}>
                    {busy === "status" ? "Saving…" : "✓ Mark complete"}
                  </button>
                )}
                <button className="tdx-btn ghost" disabled={!!busy}
                  onClick={() => onStatus(task.status, "notes")}>
                  {busy === "notes" ? "Saving…" : "Save notes"}
                </button>
              </div>
              <div className="tdx-hint">Status updates are visible to admin in real time.</div>
            </div>
          )}

          {isCompleted && !delivered && (
            <div className="tdx-sec">
              <div className="tdx-deliver ready">
                <div className="tdx-deliver-t">This job is done</div>
                <div className="tdx-deliver-p">Once you've handed the order to the customer, mark it delivered so admin knows it's out.</div>
                <div className="tdx-actions">
                  <button className="tdx-btn primary" disabled={!!busy} onClick={() => onDeliver(true)}>
                    {busy === "deliver" ? "Marking…" : "Mark as delivered"}
                  </button>
                  <button className="tdx-btn ghost" disabled={!!busy}
                    onClick={() => onStatus("in_progress", "status")}>
                    {busy === "status" ? "Reopening…" : "Reopen task"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isCompleted && delivered && (
            <div className="tdx-sec">
              <div className="tdx-deliver done">
                <div className="tdx-deliver-t">
                  <span className="tdx-tick">✓</span>
                  Delivered {isMe ? "by you" : task.deliveredBy ? `by ${task.deliveredBy.name}` : ""} on {fmtDateTime(task.deliveredAt)}
                </div>
                <div className="tdx-deliver-p">Admin can see this order was delivered. Marked it by mistake?</div>
                <div className="tdx-actions">
                  <button className="tdx-btn ghost" disabled={!!busy} onClick={() => onDeliver(false)}>
                    {busy === "deliver" ? "Undoing…" : "Undo delivery"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {task.status === "cancelled" && (
            <div className="tdx-sec">
              <div className="tdx-notes-ro empty">This task was cancelled by admin.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}