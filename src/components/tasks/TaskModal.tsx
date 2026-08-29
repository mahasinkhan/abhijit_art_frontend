// src/components/tasks/TaskModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { Task, TaskPriority } from "../../services/task.api";
import type { Employee }            from "../../services/employee.api";
import type { Invoice }             from "../../hooks/useTasks";
import { PRIORITY_META }            from "./TaskStats";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const FAINT    = "#b3ab9f";

const rupees = (n?: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const money  = (v: string | number) => Math.round(parseFloat(String(v ?? "0")) || 0);

export interface ItemAssign { assignedToId: string; instruction: string; removed: boolean; }

interface Props {
  editTask:    Task | null;
  employees:   Employee[];
  invoices:    Invoice[];
  saving:      boolean;
  /** employee currently in focus in the Team strip — pre-selected for new items */
  defaultAssignee?: string;
  onGoToBilling?: () => void;
  onSaveCreate: (
    jobs: { it: Invoice["items"][0]; a: ItemAssign }[],
    form: any,
    images: File[],
    bill: Invoice,
  ) => Promise<void>;
  onSaveEdit: (id: string, form: any, images: File[], removeImages: string[]) => Promise<void>;
  onClose:    () => void;
}

export function TaskModal({
  editTask, employees, invoices, saving, defaultAssignee,
  onGoToBilling, onSaveCreate, onSaveEdit, onClose,
}: Props) {
  const mbodyRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState({
    title: editTask?.title || "",
    assignedToId: editTask?.assignedTo.id || defaultAssignee || employees[0]?.id || "",
    priority: (editTask?.priority || "medium") as TaskPriority,
    deadline:  editTask?.deadline  ? editTask.deadline.slice(0, 10)  : "",
    orderDate: editTask?.orderDate ? editTask.orderDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    links: editTask?.links.join(", ") || "",
    generalNotes: "",
    description: editTask?.description || "",
  });

  const [formImages,        setFormImages]        = useState<File[]>([]);
  const [formImagePreviews, setFormImagePreviews] = useState<string[]>([]);
  const [removeImages,      setRemoveImages]      = useState<string[]>([]);
  const [billSel,           setBillSel]           = useState<Invoice | null>(
    editTask ? invoices.find((i) => i.id === editTask.invoiceId) || null : null
  );
  const [billQuery,  setBillQuery]  = useState("");
  const [billDdOpen, setBillDdOpen] = useState(false);
  const [itemAssign, setItemAssign] = useState<ItemAssign[]>([]);

  // lock scroll + route the wheel into the modal body
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onWheel = (e: WheelEvent) => {
      const body = mbodyRef.current; if (!body) return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest(".tk-bp-dd")) return;
      e.preventDefault(); body.scrollTop += e.deltaY;
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => { document.body.style.overflow = prev; window.removeEventListener("wheel", onWheel); };
  }, []);

  const billMatches = useMemo(() => {
    const q    = billQuery.trim().toLowerCase();
    const list = invoices.filter((i) => i.status !== "cancelled");
    if (!q) return list.slice(0, 8);
    return list.filter((i) =>
      i.invoiceNo.toLowerCase().includes(q) ||
      (i.clientName  || "").toLowerCase().includes(q) ||
      (i.clientPhone || "").includes(billQuery.trim())
    ).slice(0, 8);
  }, [billQuery, invoices]);

  function selectBill(inv: Invoice) {
    setBillSel(inv);
    // pre-fill every line with the person already in focus, if any
    const preset = defaultAssignee || "";
    setItemAssign((inv.items || []).map(() => ({ assignedToId: preset, instruction: "", removed: false })));
    setBillDdOpen(false); setBillQuery("");
    setForm((f) => ({ ...f, orderDate: inv.date ? inv.date.slice(0, 10) : f.orderDate }));
  }

  function updateItem(i: number, patch: Partial<ItemAssign>) {
    setItemAssign((p) => p.map((a, idx) => idx === i ? { ...a, ...patch } : a));
  }
  function assignAll(empId: string) {
    setItemAssign((p) => p.map((a) => a.removed ? a : { ...a, assignedToId: empId }));
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setFormImages((p) => [...p, ...files]);
    files.forEach((f) => {
      const r = new FileReader();
      r.onload = (ev) => setFormImagePreviews((p) => [...p, ev.target?.result as string]);
      r.readAsDataURL(f);
    });
  }
  function toggleRemoveExisting(img: string) {
    setRemoveImages((p) => p.includes(img) ? p.filter((x) => x !== img) : [...p, img]);
  }

  const billTotal = billSel ? money(billSel.total) : 0;
  const billPaid  = billSel ? money(billSel.paidAmount) : 0;
  const billDue   = Math.max(0, billTotal - billPaid);

  const jobsToCreate = billSel
    ? (billSel.items || []).map((it, i) => ({ it, a: itemAssign[i] }))
        .filter((x) => x.a && !x.a.removed && x.a.assignedToId)
    : [];

  const canCreate = !!(billSel && jobsToCreate.length > 0);
  const canEdit   = !!(form.title.trim() && form.assignedToId);

  return (
    <div className="tk-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tk-modal">
        <button className="tk-close" onClick={onClose}>×</button>

        {editTask ? (
          <>
            <div className="tk-mhead">
              <div className="tk-mtitle">Edit task</div>
              <div className="tk-msub">Update this task, reassign it, or change its instructions.</div>
            </div>
            <div className="tk-mbody" ref={mbodyRef}>
              <div className="tk-grid">
                {billSel && (
                  <div className="tk-bill-chip">
                    <div className="tk-bill-chip-top"><b>{billSel.invoiceNo}</b></div>
                    <div className="sub">{billSel.clientName}{billSel.clientPhone ? ` · ${billSel.clientPhone}` : ""}</div>
                  </div>
                )}
                <div>
                  <label className="tk-lbl">Title *</label>
                  <input className="tk-inp" value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label className="tk-lbl">Description / instructions</label>
                  <textarea className="tk-inp tk-ta" value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="tk-2col">
                  <div>
                    <label className="tk-lbl">Order date</label>
                    <input type="date" className="tk-inp" value={form.orderDate}
                      onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="tk-lbl">Delivery estimate</label>
                    <input type="date" className="tk-inp" value={form.deadline}
                      onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
                  </div>
                </div>
                <div className="tk-2col">
                  <div>
                    <label className="tk-lbl">Assign to *</label>
                    <select className="tk-inp" value={form.assignedToId}
                      onChange={(e) => setForm((f) => ({ ...f, assignedToId: e.target.value }))}>
                      <option value="">— Select employee —</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.name} ({e._count.tasksAssigned})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="tk-lbl">Priority</label>
                    <div className="tk-seg">
                      {(["low","medium","high","urgent"] as TaskPriority[]).map((p) => (
                        <button key={p} className={form.priority === p ? "on" : ""}
                          onClick={() => setForm((f) => ({ ...f, priority: p }))}>
                          {PRIORITY_META[p].label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="tk-lbl">Reference links (comma-separated)</label>
                  <input className="tk-inp" value={form.links}
                    onChange={(e) => setForm((f) => ({ ...f, links: e.target.value }))} />
                </div>

                {editTask.images.length > 0 && (
                  <div>
                    <label className="tk-lbl">Existing images (click to remove)</label>
                    <div className="tk-imgs">
                      {editTask.images.map((img) => (
                        <div key={img}
                          className={`tk-thumb${removeImages.includes(img) ? " rm" : ""}`}
                          onClick={() => toggleRemoveExisting(img)}
                          style={{ cursor: "pointer" }}>
                          <img src={`${API_BASE}${img}`} alt="" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="tk-lbl">Upload images</label>
                  <input type="file" multiple accept="image/*" onChange={handleImageSelect}
                    style={{ fontSize: ".82rem" }} />
                  {formImagePreviews.length > 0 && (
                    <div className="tk-imgs" style={{ marginTop: 10 }}>
                      {formImagePreviews.map((src, i) => (
                        <div key={i} className="tk-thumb">
                          <img src={src} alt="" />
                          <button className="tk-thumb-x"
                            onClick={() => {
                              setFormImages((p) => p.filter((_, idx) => idx !== i));
                              setFormImagePreviews((p) => p.filter((_, idx) => idx !== i));
                            }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button className="tk-save" disabled={saving || !canEdit}
                  onClick={() => onSaveEdit(editTask.id, form, formImages, removeImages)}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="tk-mhead">
              <div className="tk-mtitle">New task order</div>
              <div className="tk-msub">Pick a bill, then assign each item to an employee. One task is created per assigned item.</div>
            </div>
            <div className="tk-mbody" ref={mbodyRef}>
              <div className="tk-grid">

                {/* Step 1: Bill */}
                <div className="tk-fieldset">
                  <div className="tk-fs-l"><span className="tk-fs-num">1</span>Bill</div>
                  {billSel ? (
                    <div className="tk-bill-chip">
                      <div className="tk-bill-chip-top">
                        <div style={{ minWidth: 0 }}>
                          <b>{billSel.invoiceNo}</b>
                          <div className="sub">{billSel.clientName || "—"}{billSel.clientPhone ? ` · ${billSel.clientPhone}` : ""}</div>
                        </div>
                        <button className="tk-change" onClick={() => { setBillSel(null); setItemAssign([]); }}>Change</button>
                      </div>
                      <div className="tk-bill-figs">
                        <div><span>Amount</span><b>{rupees(billTotal)}</b></div>
                        <div><span>Advance</span><b>{rupees(billPaid)}</b></div>
                        <div className="due"><span>Due</span><b>{rupees(billDue)}</b></div>
                      </div>
                    </div>
                  ) : (
                    <div className="tk-bp">
                      <label className="tk-lbl">Find the bill *</label>
                      <input className="tk-inp" value={billQuery}
                        onChange={(e) => { setBillQuery(e.target.value); setBillDdOpen(true); }}
                        onFocus={() => setBillDdOpen(true)}
                        onBlur={() => setTimeout(() => setBillDdOpen(false), 180)}
                        placeholder="Search by invoice no, customer name or phone…"
                        autoComplete="off" />
                      {billDdOpen && (
                        <div className="tk-bp-dd">
                          {billMatches.map((inv) => (
                            <div key={inv.id} className="tk-bp-item" onMouseDown={() => selectBill(inv)}>
                              <div className="l"><b>{inv.invoiceNo}</b><span>{inv.clientName}</span></div>
                              <div className="r">{rupees(money(inv.total))}</div>
                            </div>
                          ))}
                          {billMatches.length === 0 && (
                            <div className="tk-bp-none">
                              <p>No matching bill found.<br />Make the bill first, then come back.</p>
                              {onGoToBilling && (
                                <button className="tk-bp-mkbtn" onMouseDown={onGoToBilling}>
                                  Go to Billing →
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Step 2: Item assignment */}
                {billSel && (
                  <div className="tk-fieldset">
                    <div className="tk-fs-l">
                      <span className="tk-fs-num">2</span>Assign each item
                      {employees.length > 0 && (billSel.items || []).length > 1 && (
                        <span className="tk-fs-right">
                          Everything to:
                          <select defaultValue="" onChange={(e) => { if (e.target.value) assignAll(e.target.value); }}>
                            <option value="">— pick —</option>
                            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                        </span>
                      )}
                    </div>
                    {(billSel.items || []).length === 0 ? (
                      <div style={{ fontSize: ".82rem", color: FAINT }}>This bill has no line items.</div>
                    ) : (billSel.items || []).map((it, i) => {
                      const a = itemAssign[i]; if (!a) return null;
                      const qty = Number(it.qty) || 0, rate = Number(it.rate) || 0;
                      if (a.removed) return (
                        <div key={i} className="tk-item skipped">
                          <span className="s">{qty} × {it.desc || "Item"}</span>
                          <button onClick={() => updateItem(i, { removed: false })}>Restore</button>
                        </div>
                      );
                      return (
                        <div key={i} className="tk-item">
                          <div className="tk-item-head">
                            <b>{qty} × {it.desc || "Item"}</b>
                            <div className="r">
                              <span className="amt">{rupees(qty * rate)}</span>
                              <button className="tk-item-x" title="Skip this item"
                                onClick={() => updateItem(i, { removed: true })}>×</button>
                            </div>
                          </div>
                          <div className="tk-item-2">
                            <select
                              className={a.assignedToId ? "" : "empty"}
                              value={a.assignedToId}
                              onChange={(e) => updateItem(i, { assignedToId: e.target.value })}>
                              <option value="">— Assign to —</option>
                              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            <input value={a.instruction}
                              onChange={(e) => updateItem(i, { instruction: e.target.value })}
                              placeholder="Instruction for this item (optional)" />
                          </div>
                        </div>
                      );
                    })}
                    <div className={`tk-createcount${jobsToCreate.length === 0 ? " zero" : ""}`}>
                      {jobsToCreate.length === 0
                        ? "Assign at least one item to an employee."
                        : `${jobsToCreate.length} task${jobsToCreate.length > 1 ? "s" : ""} will be created — one per assigned item.`}
                    </div>
                  </div>
                )}

                {/* Step 3: Shared details */}
                {billSel && (
                  <div className="tk-fieldset">
                    <div className="tk-fs-l"><span className="tk-fs-num">3</span>Shared details</div>
                    <div className="tk-grid">
                      <div className="tk-2col">
                        <div>
                          <label className="tk-lbl">Order date</label>
                          <input type="date" className="tk-inp" value={form.orderDate}
                            onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))} />
                        </div>
                        <div>
                          <label className="tk-lbl">Delivery estimate</label>
                          <input type="date" className="tk-inp" value={form.deadline}
                            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label className="tk-lbl">Priority (applies to all)</label>
                        <div className="tk-seg">
                          {(["low","medium","high","urgent"] as TaskPriority[]).map((p) => (
                            <button key={p} className={form.priority === p ? "on" : ""}
                              onClick={() => setForm((f) => ({ ...f, priority: p }))}>
                              {PRIORITY_META[p].label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="tk-lbl">General notes</label>
                        <input className="tk-inp" value={form.generalNotes}
                          onChange={(e) => setForm((f) => ({ ...f, generalNotes: e.target.value }))}
                          placeholder="Anything that applies to the whole order…" />
                      </div>
                      <div>
                        <label className="tk-lbl">Reference links (comma-separated)</label>
                        <input className="tk-inp" value={form.links}
                          onChange={(e) => setForm((f) => ({ ...f, links: e.target.value }))} />
                      </div>
                      <div>
                        <label className="tk-lbl">Upload images (added to every task)</label>
                        <input type="file" multiple accept="image/*" onChange={handleImageSelect}
                          style={{ fontSize: ".82rem" }} />
                        {formImagePreviews.length > 0 && (
                          <div className="tk-imgs" style={{ marginTop: 10 }}>
                            {formImagePreviews.map((src, i) => (
                              <div key={i} className="tk-thumb">
                                <img src={src} alt="" />
                                <button className="tk-thumb-x"
                                  onClick={() => {
                                    setFormImages((p) => p.filter((_, idx) => idx !== i));
                                    setFormImagePreviews((p) => p.filter((_, idx) => idx !== i));
                                  }}>×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button className="tk-save" disabled={saving || !canCreate}
                  onClick={() => billSel && onSaveCreate(jobsToCreate, form, formImages, billSel)}>
                  {saving ? "Creating…" : jobsToCreate.length > 1 ? `Assign ${jobsToCreate.length} tasks` : "Assign task"}
                </button>
                {!canCreate && (
                  <div className="tk-hint">
                    {!billSel ? "Select a bill first — make one in the Billing tab if it doesn't exist."
                              : "Assign at least one item to an employee."}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}