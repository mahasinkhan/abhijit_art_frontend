// src/components/employees/index.tsx
import { useState } from "react";
import { useEmployees } from "../../hooks/useEmployees";
import { employeeApi, type Employee } from "../../services/employee.api";
import { EmployeeCard }  from "./EmployeeCard";
import { EmployeeModal } from "./EmployeeModal";
import { TeamBoard }     from "./TeamBoard";

const ACCENT = "#d9542f";

export default function Employees({ onAssignTask }: { onAssignTask?: (id: string) => void }) {
  const {
    employees, teamBoard, loading,
    statsFor, workingNow, totalActive, totalOverdue,
    reload,
  } = useEmployees();

  const [search,    setSearch]    = useState("");
  const [teamView,  setTeamView]  = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editEmp,   setEditEmp]   = useState<Employee | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const displayed = employees.filter((e) => {
    const q = search.toLowerCase();
    return !q || e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) || e.phone.includes(q);
  });

  function openCreate() { setEditEmp(null); setFormError(""); setShowModal(true); }
  function openEdit(emp: Employee) { setEditEmp(emp); setFormError(""); setShowModal(true); }

  async function handleSave(data: { name: string; email: string; phone: string; password: string }) {
    setSaving(true); setFormError("");
    try {
      if (editEmp) await employeeApi.update(editEmp.id, data);
      else         await employeeApi.create(data);
      setShowModal(false);
      reload.employees();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.response?.data?.message || "Failed to save.");
    } finally { setSaving(false); }
  }

  async function handleDelete(emp: Employee) {
    const s      = statsFor(emp.id);
    const active = s.pending + s.in_progress;
    const msg    = active > 0
      ? `${emp.name} has ${active} active task(s). Deleting will remove those tasks too. Continue?`
      : `Delete employee "${emp.name}"? This cannot be undone.`;
    if (!confirm(msg)) return;
    setDeleting(emp.id);
    try { await employeeApi.remove(emp.id); reload.employees(); reload.tasks(); }
    catch (err: any) { alert(err.response?.data?.error || "Failed to delete."); }
    finally { setDeleting(null); }
  }

  return (
    <div className="ep">
      <style>{`
        .ep { font-family:'DM Sans',system-ui,sans-serif; color:#1f2430; font-variant-numeric:tabular-nums; }
        .ep * { box-sizing:border-box; }
        .ep-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:18px; }
        .ep-stat { background:#fff; border:1px solid #e8e8ee; border-top:3px solid #cfd3db; padding:14px 16px; }
        .ep-stat.work{ border-top-color:#1d4ed8; } .ep-stat.act{ border-top-color:#c2974a; } .ep-stat.over{ border-top-color:${ACCENT}; }
        .ep-stat-n { font-size:1.7rem; font-weight:700; line-height:1; }
        .ep-stat.over .ep-stat-n { color:${ACCENT}; }
        .ep-stat-l { font-size:.68rem; text-transform:uppercase; letter-spacing:.07em; color:#6b7280; margin-top:5px; }
        .ep-bar { display:flex; gap:8px; align-items:center; margin-bottom:16px; flex-wrap:wrap; }
        .ep-search { padding:8px 12px; border:1px solid #d9dce3; font-size:.84rem; width:240px; font-family:inherit; }
        .ep-search:focus { outline:2px solid ${ACCENT}; outline-offset:-1px; }
        .ep-add { background:${ACCENT}; color:#fff; border:none; padding:9px 18px; font-size:.84rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ep-add:hover { background:#b8421f; }
        .ep-toggle { margin-left:auto; background:#fff; color:#1f2430; border:1px solid #d9dce3; padding:9px 18px; font-size:.84rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .ep-toggle.on { background:#1d4ed8; color:#fff; border-color:#1d4ed8; }
        .ep-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:14px; }
        .ep-card { background:#fff; border:1px solid #e8e8ee; padding:18px; }
        .ep-card-top { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
        .ep-avatar { width:44px; height:44px; border-radius:50%; background:${ACCENT}; color:#fff; font-weight:700; font-size:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ep-name { font-weight:700; font-size:.98rem; }
        .ep-contact { font-size:.76rem; color:#6b7280; margin-top:1px; }
        .ep-status { font-size:.82rem; padding:9px 12px; margin-bottom:12px; border-left:3px solid; }
        .ep-status.working { background:#eff6ff; border-color:#1d4ed8; color:#1e40af; }
        .ep-status.idle { background:#f9fafb; border-color:#cfd3db; color:#6b7280; }
        .ep-status b { font-weight:700; }
        .ep-work { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px; }
        .ep-wcell { text-align:center; background:#faf9f7; border:1px solid #f0f0f4; padding:8px 4px; }
        .ep-wn { font-size:1.15rem; font-weight:700; line-height:1; }
        .ep-wl { font-size:.64rem; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; margin-top:3px; }
        .ep-over-badge { display:inline-block; background:#fef2ee; color:${ACCENT}; border:1px solid #f5c4bb; padding:3px 10px; border-radius:999px; font-size:.72rem; font-weight:700; margin-bottom:12px; }
        .ep-actions { display:flex; gap:6px; }
        .ep-btn { flex:1; padding:8px; border:1px solid #d9dce3; background:#fff; font-size:.78rem; font-weight:600; cursor:pointer; font-family:inherit; color:#1f2430; }
        .ep-btn:hover { background:#f5f5f8; }
        .ep-btn.primary { background:${ACCENT}; color:#fff; border-color:transparent; }
        .ep-btn.primary:hover { background:#b8421f; }
        .ep-btn.danger { color:${ACCENT}; border-color:#f5c4bb; flex:0 0 auto; padding:8px 12px; }
        .ep-btn.danger:hover { background:#fef2ee; }
        .ep-board { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
        .ep-bcol { background:#fff; border:1px solid #e8e8ee; }
        .ep-bcol-head { display:flex; align-items:center; gap:10px; padding:14px 16px; border-bottom:1px solid #f0f0f4; background:#fafaf8; }
        .ep-bcol-av { width:34px; height:34px; border-radius:50%; background:${ACCENT}; color:#fff; font-weight:700; font-size:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ep-bcol-name { font-weight:700; font-size:.92rem; }
        .ep-bcol-count { margin-left:auto; font-size:.72rem; font-weight:700; color:#6b7280; background:#f0f0f4; padding:2px 8px; border-radius:999px; }
        .ep-btask { padding:10px 14px; border-bottom:1px solid #f5f5f8; display:flex; align-items:flex-start; gap:8px; }
        .ep-btask:last-child { border-bottom:none; }
        .ep-btask-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:5px; }
        .ep-btask-title { font-size:.83rem; font-weight:600; color:#1f2430; line-height:1.35; }
        .ep-btask-status { font-size:.68rem; font-weight:700; padding:1px 7px; border-radius:3px; display:inline-block; margin-top:3px; }
        .ep-ov { position:fixed; inset:0; background:rgba(31,36,48,.5); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
        .ep-modal { background:#fff; width:100%; max-width:440px; padding:28px; position:relative; }
        .ep-mtitle { font-size:1.05rem; font-weight:700; margin-bottom:18px; }
        .ep-close { position:absolute; top:14px; right:16px; background:none; border:none; font-size:1.3rem; cursor:pointer; color:#6b7280; }
        .ep-lbl { display:block; font-size:.74rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; margin-bottom:5px; }
        .ep-inp { width:100%; padding:9px 12px; border:1px solid #d4c8b0; font-size:.88rem; font-family:inherit; }
        .ep-inp:focus { outline:2px solid ${ACCENT}; outline-offset:-1px; }
        .ep-pw { position:relative; }
        .ep-pw .ep-inp { padding-right:40px; }
        .ep-eye { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#9ca3af; padding:0; display:flex; }
        .ep-eye:hover { color:${ACCENT}; }
        .ep-err { background:#fef2ee; border:1px solid #f5c4bb; color:#b23c1c; padding:9px 12px; font-size:.82rem; margin-bottom:14px; }
        .ep-save { background:${ACCENT}; color:#fff; border:none; padding:11px; width:100%; font-size:.9rem; font-weight:700; cursor:pointer; font-family:inherit; margin-top:4px; }
        .ep-save:disabled { opacity:.5; cursor:not-allowed; }
        .ep-hint { font-size:.72rem; color:#9ca3af; margin-top:5px; }
        .ep-grid2 { display:grid; gap:13px; }
        @media (max-width:560px){ .ep-stats{ grid-template-columns:repeat(2,1fr); } .ep-search{ width:100%; } .ep-grid{ grid-template-columns:1fr; } }
      `}</style>

      {/* Stats */}
      <div className="ep-stats">
        <div className="ep-stat">        <div className="ep-stat-n">{employees.length}</div><div className="ep-stat-l">Employees</div></div>
        <div className="ep-stat work">   <div className="ep-stat-n">{workingNow}</div>      <div className="ep-stat-l">Working Now</div></div>
        <div className="ep-stat act">    <div className="ep-stat-n">{totalActive}</div>     <div className="ep-stat-l">Active Tasks</div></div>
        <div className="ep-stat over">   <div className="ep-stat-n">{totalOverdue}</div>    <div className="ep-stat-l">Overdue</div></div>
      </div>

      {/* Toolbar */}
      <div className="ep-bar">
        {!teamView && (
          <input className="ep-search" placeholder="Search name, email or phone…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        )}
        <button className="ep-add" onClick={openCreate}>+ Add Employee</button>
        <button className={`ep-toggle${teamView ? " on" : ""}`} onClick={() => setTeamView((v) => !v)}>
          👥 Team Board
        </button>
      </div>

      {/* View */}
      {teamView ? (
        <TeamBoard board={teamBoard} />
      ) : loading ? (
        <p style={{ color: "#9ca3af", fontSize: ".88rem" }}>Loading…</p>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af", fontSize: ".9rem" }}>
          {search ? "No employees match your search." : "No employees yet — click \"+ Add Employee\"."}
        </div>
      ) : (
        <div className="ep-grid">
          {displayed.map((emp) => (
            <EmployeeCard
              key={emp.id}
              emp={emp}
              stats={statsFor(emp.id)}
              deleting={deleting === emp.id}
              onAssign={() => onAssignTask?.(emp.id)}
              onEdit={() => openEdit(emp)}
              onDelete={() => handleDelete(emp)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <EmployeeModal
          editEmp={editEmp}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
          error={formError}
        />
      )}
    </div>
  );
}