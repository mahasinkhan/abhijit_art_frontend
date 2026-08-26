// src/components/employee/TaskDetail.tsx
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
const WASH       = "#faf8f3";

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
  const hasCustomer = !!(task.customerName || task.customerPhone || task.invoiceNo);

  return (
    <div className="ep-detail">
      <div className="ep-d-head">
        <div className="ep-d-headmain">
          <div className="ep-d-title">{task.title}</div>
          <div className="ep-d-meta">
            Assigned by <b style={{ color: INK }}>{task.createdBy.name}</b>
            {" · "}Created {fmtDate(task.createdAt)}
            {task.deadline && <> · Deliver by {fmtDate(task.deadline)}</>}
            {delivered && <> · <span style={{ color: "#2f7a3f", fontWeight: 600 }}>Delivered {fmtDate(task.deliveredAt)}</span></>}
          </div>
        </div>
        <span className="ep-prio" style={{ color: pm.color, marginTop: 4 }}>
          <span className="ep-prio-dot" style={{ background: pm.color }} />{pm.label}
        </span>
        <button className="ep-close" onClick={onClose} title="Close">×</button>
      </div>

      <div className="ep-d-body">
        {hasCustomer && (
          <div className="ep-sec">
            <div className="ep-sec-l">Order for</div>
            <div className="ep-cust">
              {task.customerName  && <div><span>Customer</span><b>{task.customerName}</b></div>}
              {task.customerPhone && <div><span>Phone</span><b>{task.customerPhone}</b></div>}
              {task.invoiceNo     && <div><span>Bill</span><b>{task.invoiceNo}</b></div>}
              {(task.amount || 0) > 0 && <div><span>Order value</span><b>{rupees(task.amount)}</b></div>}
            </div>
          </div>
        )}

        {task.description && (
          <div className="ep-sec">
            <div className="ep-sec-l">Task details</div>
            <div className="ep-desc">{task.description}</div>
          </div>
        )}

        {task.images.length > 0 && (
          <div className="ep-sec">
            <div className="ep-sec-l">Reference images</div>
            <div className="ep-imgs">
              {task.images.map((img, i) => (
                <img key={i} src={`${API_BASE}${img}`} alt={`ref-${i + 1}`}
                  className="ep-img" onClick={() => onImage(`${API_BASE}${img}`)} />
              ))}
            </div>
          </div>
        )}

        {task.links.length > 0 && (
          <div className="ep-sec ep-links">
            <div className="ep-sec-l">Reference links</div>
            {task.links.map((l, i) => (
              <a key={i} href={l} target="_blank" rel="noreferrer">{l}</a>
            ))}
          </div>
        )}

        <div className="ep-sec">
          <div className="ep-sec-l">Your notes / progress update</div>
          {editable ? (
            <textarea className="ep-ta" value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Add notes about your progress, blockers, or completion details…" />
          ) : (
            <div className={`ep-notes-ro${task.notes ? "" : " empty"}`}>
              {task.notes || "No notes added."}
            </div>
          )}
        </div>

        {editable && (
          <div className="ep-sec">
            <div className="ep-sec-l">Update status</div>
            <div className="ep-actions">
              {isPending && (
                <button className="ep-btn blue" disabled={!!busy}
                  onClick={() => onStatus("in_progress", "status")}>
                  {busy === "status" ? "Starting…" : "Start work"}
                </button>
              )}
              {isProgress && (
                <button className="ep-btn go" disabled={!!busy}
                  onClick={() => onStatus("completed", "status")}>
                  {busy === "status" ? "Saving…" : "✓ Mark complete"}
                </button>
              )}
              <button className="ep-btn ghost" disabled={!!busy}
                onClick={() => onStatus(task.status, "notes")}>
                {busy === "notes" ? "Saving…" : "Save notes"}
              </button>
            </div>
            <div className="ep-hint">Status updates are visible to admin in real time.</div>
          </div>
        )}

        {isCompleted && !delivered && (
          <div className="ep-sec">
            <div className="ep-deliver ready">
              <div className="ep-deliver-t">This job is done</div>
              <div className="ep-deliver-p">Once you've handed the order to the customer, mark it delivered so admin knows it's out.</div>
              <div className="ep-actions">
                <button className="ep-btn primary" disabled={!!busy} onClick={() => onDeliver(true)}>
                  {busy === "deliver" ? "Marking…" : "Mark as delivered"}
                </button>
                <button className="ep-btn ghost" disabled={!!busy}
                  onClick={() => onStatus("in_progress", "status")}>
                  {busy === "status" ? "Reopening…" : "Reopen task"}
                </button>
              </div>
            </div>
          </div>
        )}

        {isCompleted && delivered && (
          <div className="ep-sec">
            <div className="ep-deliver done">
              <div className="ep-deliver-t">
                <span className="ep-tick">✓</span>
                Delivered {isMe ? "by you" : task.deliveredBy ? `by ${task.deliveredBy.name}` : ""} on {fmtDateTime(task.deliveredAt)}
              </div>
              <div className="ep-deliver-p">Admin can see this order was delivered. Marked it by mistake?</div>
              <div className="ep-actions">
                <button className="ep-btn ghost" disabled={!!busy} onClick={() => onDeliver(false)}>
                  {busy === "deliver" ? "Undoing…" : "Undo delivery"}
                </button>
              </div>
            </div>
          </div>
        )}

        {task.status === "cancelled" && (
          <div className="ep-sec">
            <div className="ep-notes-ro empty">This task was cancelled by admin.</div>
          </div>
        )}
      </div>
    </div>
  );
}