// src/components/tasks/TaskDetail.tsx
import type { Task, TaskStatus } from "../../services/task.api";
import type { Invoice }          from "../../hooks/useTasks";
import { STATUS_META, PRIORITY_META } from "./TaskStats";
import { deadlineInfo } from "./TaskList";

const API_BASE   = import.meta.env.VITE_API_URL || "http://localhost:5000";
const INK        = "#2a231d";
const MUTED      = "#8a8378";
const FAINT      = "#b3ab9f";
const LINE       = "#e7e1d7";
const LINE_SOFT  = "#f1ece3";
const WASH       = "#faf8f3";
const ACCENT     = "#d9542f";
const GOLD       = "#c2974a";

const rupees = (n?: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const money  = (v: string | number) => Math.round(parseFloat(String(v ?? "0")) || 0);

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true,
  });
}
function fmtDuration(ms: number) {
  if (ms < 0) ms = 0;
  const m = Math.floor(ms / 60000);
  if (m < 1)  return "< 1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60); const rm = m % 60;
  if (h < 24) return rm ? `${h}h ${rm}m` : `${h}h`;
  const d = Math.floor(h / 24); const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

interface Props {
  task:     Task;
  bill:     Invoice | null;
  onEdit:   () => void;
  onDelete: () => void;
  onStatus: (s: TaskStatus) => void;
  onImage:  (src: string) => void;
}

export function TaskDetail({ task, bill, onEdit, onDelete, onStatus, onImage }: Props) {
  const pm        = PRIORITY_META[task.priority];
  const dl        = deadlineInfo(task);
  const assigned  = task.createdAt;
  const started   = task.startedAt;
  const completed = task.completedAt;
  const cancelled = task.status === "cancelled";
  const delivered = !!task.deliveredAt;
  const respDur   = started ? new Date(started).getTime() - new Date(assigned).getTime() : null;
  const workDur   = started
    ? (completed ? new Date(completed).getTime() : Date.now()) - new Date(started).getTime()
    : null;

  const itemValue = task.amount || 0;
  const billTotal = bill ? money(bill.total) : 0;
  const billPaid  = bill ? money(bill.paidAmount) : 0;
  const billDue   = Math.max(0, billTotal - billPaid);
  const hasOrder  = !!(task.customerName || itemValue > 0);

  return (
    <div className="tk-detail">
      {/* Head */}
      <div className="tk-d-head">
        <div className="tk-d-headmain">
          <div className="tk-d-title">{task.title}</div>
          <div className="tk-d-sub">
            <span>Assigned to <b>{task.assignedTo.name}</b></span>
            <span className="tk-chip" style={{ background: `${pm.color}18`, color: pm.color }}>
              <span className="tk-chip-dot" style={{ background: pm.color }} />{pm.label}
            </span>
            {delivered && (
              <span className="tk-chip" style={{ background: "#e5f2e8", color: "#2f7a3f" }}>
                <span className="tk-chip-dot" style={{ background: "#2f7a3f" }} />
                Delivered{task.deliveredBy ? ` · ${task.deliveredBy.name}` : ""}
              </span>
            )}
          </div>
        </div>
        <div className="tk-d-actions">
          <button className="tk-abtn"        onClick={onEdit}>Edit</button>
          <button className="tk-abtn danger" onClick={onDelete}>Delete</button>
        </div>
      </div>

      <div className="tk-d-body">
        {/* Status */}
        <div className="tk-sec">
          <div className="tk-sec-l">Status</div>
          <div className="tk-statusctl">
            {(["pending","in_progress","completed","cancelled"] as TaskStatus[]).map((s) => (
              <button key={s}
                className={`tk-sc${task.status === s ? " on" : ""}`}
                style={task.status === s ? { background: STATUS_META[s].color } : {}}
                onClick={() => task.status !== s && onStatus(s)}>
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Order cards */}
        {hasOrder && (
          <div className="tk-sec">
            <div className="tk-cards">
              <div className="tk-card">
                <div className="tk-card-l">Customer</div>
                <div className="tk-cust-name">{task.customerName || "—"}</div>
                {task.customerPhone && <div className="tk-cust-line">{task.customerPhone}</div>}
                {task.customerEmail && <div className="tk-cust-line dim">{task.customerEmail}</div>}
                {task.invoiceNo     && <div className="tk-invpill">{task.invoiceNo}</div>}
                <div className="tk-dates">Order: {fmtDate(task.orderDate)} · Delivery: {fmtDate(task.deadline)}</div>
                <div className={`tk-dl ${dl.tone}`} style={{ marginTop: 3 }}>{dl.text}</div>
              </div>
              <div className="tk-card">
                <div className="tk-card-l">Billing</div>
                <div className="tk-kv"><span className="k">This item</span><span className="v">{rupees(itemValue)}</span></div>
                {bill && (
                  <div className="tk-billsplit">
                    <div className="tk-card-l" style={{ marginBottom: 8 }}>Full bill {task.invoiceNo}</div>
                    <div className="tk-kv"><span className="k">Total</span>       <span className="v">{rupees(billTotal)}</span></div>
                    <div className="tk-kv"><span className="k">Advance paid</span><span className="v paid">{rupees(billPaid)}</span></div>
                    <div className="tk-kv"><span className="k">Balance due</span> <span className="v due">{rupees(billDue)}</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="tk-sec">
          <div className="tk-sec-l">Progress timeline</div>
          <div className="tk-tl">
            {/* Assigned */}
            <div className="tk-tl-step">
              <div className="tk-tl-rail">
                <div className="tk-tl-dot done"/>
                <div className={`tk-tl-line${started || completed ? " done" : ""}`}/>
              </div>
              <div className="tk-tl-body">
                <div className="tk-tl-t">Assigned</div>
                <div className="tk-tl-when">{fmtDateTime(assigned)} · by {task.createdBy.name}</div>
              </div>
            </div>
            {/* Started */}
            <div className="tk-tl-step">
              <div className="tk-tl-rail">
                <div className={`tk-tl-dot ${started ? "done" : cancelled ? "cancel" : ""}`}/>
                <div className={`tk-tl-line${completed ? " done" : ""}`}/>
              </div>
              <div className="tk-tl-body">
                <div className="tk-tl-t" style={{ color: started ? INK : FAINT }}>Started</div>
                {started ? (
                  <>
                    <div className="tk-tl-when">{fmtDateTime(started)}</div>
                    {respDur !== null && <div className="tk-tl-dur">Picked up {fmtDuration(respDur)} after assignment</div>}
                  </>
                ) : <div className="tk-tl-when">Not started yet</div>}
              </div>
            </div>
            {/* Completed */}
            <div className="tk-tl-step">
              <div className="tk-tl-rail">
                <div className={`tk-tl-dot ${completed ? "done" : task.status === "in_progress" ? "active" : cancelled ? "cancel" : ""}`}/>
                {!cancelled && <div className={`tk-tl-line${delivered ? " done" : ""}`}/>}
              </div>
              <div className="tk-tl-body">
                <div className="tk-tl-t" style={{ color: completed ? INK : FAINT }}>
                  {cancelled ? "Cancelled" : "Completed"}
                </div>
                {completed ? (
                  <>
                    <div className="tk-tl-when">{fmtDateTime(completed)}</div>
                    {workDur !== null && <div className="tk-tl-dur">Took {fmtDuration(workDur)} to finish</div>}
                  </>
                ) : cancelled
                  ? <div className="tk-tl-when">This task was cancelled</div>
                  : task.status === "in_progress" && workDur !== null
                    ? <div className="tk-tl-when">In progress · {fmtDuration(workDur)} elapsed</div>
                    : <div className="tk-tl-when">Not completed yet</div>}
              </div>
            </div>
            {/* Delivered */}
            {!cancelled && (
              <div className="tk-tl-step">
                <div className="tk-tl-rail">
                  <div className={`tk-tl-dot ${delivered ? "done" : ""}`}/>
                </div>
                <div className="tk-tl-body">
                  <div className="tk-tl-t" style={{ color: delivered ? INK : FAINT }}>Delivered</div>
                  {delivered
                    ? <div className="tk-tl-when">{fmtDateTime(task.deliveredAt)}{task.deliveredBy ? ` · by ${task.deliveredBy.name}` : ""}</div>
                    : completed
                      ? <div className="tk-tl-when">Not delivered yet</div>
                      : <div className="tk-tl-when" style={{ color: FAINT }}>Awaiting completion</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="tk-sec">
            <div className="tk-sec-l">Item &amp; instructions</div>
            <div className="tk-desc">{task.description}</div>
          </div>
        )}

        {/* Links */}
        {task.links.length > 0 && (
          <div className="tk-sec tk-links">
            <div className="tk-sec-l">Reference links</div>
            {task.links.map((l, i) => (
              <a key={i} href={l} target="_blank" rel="noreferrer">{l}</a>
            ))}
          </div>
        )}

        {/* Images */}
        {task.images.length > 0 && (
          <div className="tk-sec">
            <div className="tk-sec-l">Reference images</div>
            <div className="tk-imgs">
              {task.images.map((img, i) => (
                <img key={i} src={`${API_BASE}${img}`} alt={`ref-${i + 1}`}
                  className="tk-img" onClick={() => onImage(`${API_BASE}${img}`)} />
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {task.notes && (
          <div className="tk-sec">
            <div className="tk-sec-l">Employee notes</div>
            <div className="tk-notes">{task.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}