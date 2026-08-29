// src/components/tasks/TaskDetail.tsx
import type { Task, TaskStatus } from "../../services/task.api";
import type { Invoice }          from "../../hooks/useTasks";
import { STATUS_META, PRIORITY_META, initials } from "./TaskStats";
import { deadlineInfo } from "./TaskList";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const INK      = "#2a231d";
const FAINT    = "#b3ab9f";
const GREEN    = "#2f7a3f";

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
            <span className="tk-who">
              <span className="tk-av sm">{initials(task.assignedTo.name)}</span>
              <b>{task.assignedTo.name}</b>
            </span>
            <span className="tk-chip" style={{ background: `${pm.color}18`, color: pm.color }}>
              <span className="tk-chip-dot" style={{ background: pm.color }} />{pm.label}
            </span>
            <span className={`tk-dl ${dl.tone}`}>{dl.text}</span>
            {delivered && (
              <span className="tk-chip" style={{ background: "#e5f2e8", color: GREEN }}>
                <span className="tk-chip-dot" style={{ background: GREEN }} />
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

        {/* Progress — horizontal, no long scroll */}
        <div className="tk-sec">
          <div className="tk-sec-l">Progress</div>
          <div className={`tk-htl${cancelled ? " c3" : ""}`}>
            <div className="tk-hstep">
              <div className="tk-hstep-t"><span className="tk-hdot done" />Assigned</div>
              <div className="tk-hstep-w">{fmtDateTime(assigned)}</div>
              <div className="tk-hstep-d">by {task.createdBy.name}</div>
            </div>

            <div className={`tk-hstep${started ? "" : " pending"}`}>
              <div className="tk-hstep-t" style={{ color: started ? INK : FAINT }}>
                <span className={`tk-hdot ${started ? "done" : cancelled ? "cancel" : ""}`} />Started
              </div>
              {started ? (
                <>
                  <div className="tk-hstep-w">{fmtDateTime(started)}</div>
                  {respDur !== null && <div className="tk-hstep-d">Picked up {fmtDuration(respDur)} after assigning</div>}
                </>
              ) : <div className="tk-hstep-w">Not started yet</div>}
            </div>

            <div className={`tk-hstep${completed || cancelled ? "" : " pending"}`}>
              <div className="tk-hstep-t" style={{ color: completed || cancelled ? INK : FAINT }}>
                <span className={`tk-hdot ${completed ? "done" : task.status === "in_progress" ? "active" : cancelled ? "cancel" : ""}`} />
                {cancelled ? "Cancelled" : "Completed"}
              </div>
              {completed ? (
                <>
                  <div className="tk-hstep-w">{fmtDateTime(completed)}</div>
                  {workDur !== null && <div className="tk-hstep-d">Took {fmtDuration(workDur)}</div>}
                </>
              ) : cancelled
                ? <div className="tk-hstep-w">This task was cancelled</div>
                : task.status === "in_progress" && workDur !== null
                  ? <div className="tk-hstep-w">Running · {fmtDuration(workDur)} so far</div>
                  : <div className="tk-hstep-w">Not completed yet</div>}
            </div>

            {!cancelled && (
              <div className={`tk-hstep${delivered ? "" : " pending"}`}>
                <div className="tk-hstep-t" style={{ color: delivered ? INK : FAINT }}>
                  <span className={`tk-hdot ${delivered ? "done" : ""}`} />Delivered
                </div>
                {delivered ? (
                  <>
                    <div className="tk-hstep-w">{fmtDateTime(task.deliveredAt)}</div>
                    {task.deliveredBy && <div className="tk-hstep-d">by {task.deliveredBy.name}</div>}
                  </>
                ) : completed
                  ? <div className="tk-hstep-w">Ready — hand over to the customer</div>
                  : <div className="tk-hstep-w">Awaiting completion</div>}
              </div>
            )}
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