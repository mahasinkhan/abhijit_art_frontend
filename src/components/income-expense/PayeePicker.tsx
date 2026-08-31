// src/components/income-expense/PayeePicker.tsx
import { useMemo, useState } from "react";
import type { Payee, PayeeKind } from "../../services/payee.api";
import { normalisePhone, formatPhone } from "../../services/payee.api";
import { initials, rupees, ACCENT, GOLD, GREEN, RED, MUTED } from "./types";

interface Props {
  payees:   Payee[];
  value:    string;
  onChange: (id: string) => void;
  onCreate: (data: { name: string; phone: string; kind: PayeeKind; role?: string }) => Promise<Payee>;
  onSync?:  () => void;
  syncing?: boolean;
  /** shop sale, bus fare — entries that belong to nobody */
  allowNobody?: boolean;
}

type Filter = "" | "employee" | "outsider";

export function PayeePicker({
  payees, value, onChange, onCreate, onSync, syncing, allowNobody,
}: Props) {
  const [query,  setQuery]  = useState("");
  const [filter, setFilter] = useState<Filter>("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addErr, setAddErr] = useState("");

  const [nName,  setNName]  = useState("");
  const [nPhone, setNPhone] = useState("");
  const [nKind,  setNKind]  = useState<PayeeKind>("outsider");
  const [nRole,  setNRole]  = useState("");

  const selected = payees.find((p) => p.id === value) || null;

  const empCount = payees.filter((p) => p.kind === "employee").length;
  const outCount = payees.filter((p) => p.kind === "outsider").length;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const d = normalisePhone(query);
    return payees
      .filter((p) => {
        if (filter && p.kind !== filter) return false;
        if (!q) return true;
        return p.name.toLowerCase().includes(q)
          || (p.role || "").toLowerCase().includes(q)
          || (!!d && p.phone.includes(d));
      })
            .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20);
  }, [payees, query, filter]);

  const phoneClash = useMemo(() => {
    const d = normalisePhone(nPhone);
    if (d.length < 10) return null;
    return payees.find((p) => p.phone === d) || null;
  }, [nPhone, payees]);

  function startAdding(kind: PayeeKind = "outsider") {
    const d = normalisePhone(query);
    if (d.length >= 10) { setNPhone(query); setNName(""); }
    else                { setNName(query);  setNPhone(""); }
    setNKind(kind);
    setAddErr(""); setAdding(true);
  }

  async function saveNew() {
    const digits = normalisePhone(nPhone);
    if (!nName.trim())      { setAddErr("Name is required."); return; }
    if (digits.length < 10) { setAddErr("Enter a valid 10-digit phone number."); return; }
    setSaving(true); setAddErr("");
    try {
      const row = await onCreate({ name: nName.trim(), phone: digits, kind: nKind, role: nRole.trim() });
      onChange(row.id);
      setAdding(false); setQuery("");
      setNName(""); setNPhone(""); setNRole(""); setNKind("outsider");
    } catch (err: any) {
      setAddErr(err.response?.data?.error || "Could not save this person.");
    } finally { setSaving(false); }
  }

  /* ── already picked ── */
  if (selected && !adding) {
    return (
      <div className="ie-picked">
        <span className="ie-av" style={{ background: selected.kind === "employee" ? ACCENT : GOLD }}>
          {initials(selected.name)}
        </span>
        <div className="ie-picked-main">
          <div className="ie-picked-name">{selected.name}</div>
          <div className="ie-picked-sub">
            {formatPhone(selected.phone)}
            {" · "}{selected.kind === "employee" ? "Employee" : "Outside"}
            {selected.role ? ` · ${selected.role}` : ""}
          </div>
          {selected.net !== 0 && (
            <div className="ie-picked-bal" style={{ color: selected.net > 0 ? RED : GREEN }}>
                        {selected.net > 0
            ? `Balance due from them: ${rupees(selected.net)}`
            : `We owe them: ${rupees(-selected.net)}`}
            </div>
          )}
        </div>
        <button className="ie-change" onClick={() => { onChange(""); setQuery(""); }}>Change</button>
      </div>
    );
  }

  /* ── adding someone new ── */
  if (adding) {
    return (
      <div className="ie-newp">
        <div className="ie-newp-h">
          <b>New person</b>
          <button className="ie-link" onClick={() => { setAdding(false); setAddErr(""); }}>Back to list</button>
        </div>

        {addErr && <div className="ie-err small">{addErr}</div>}

        <label className="ie-lbl">Name *</label>
        <input className="ie-inp" value={nName} onChange={(e) => setNName(e.target.value)}
          placeholder="Full name" autoFocus />

        <label className="ie-lbl" style={{ marginTop: 11 }}>Phone *</label>
        <input className="ie-inp" value={nPhone} onChange={(e) => setNPhone(e.target.value)}
          placeholder="10-digit number" inputMode="numeric" />

        {phoneClash && (
          <div className="ie-clash">
            <span><b>{phoneClash.name}</b> already uses this number.</span>
            <button className="ie-usebtn" onClick={() => {
              onChange(phoneClash.id); setAdding(false); setQuery("");
            }}>Use {phoneClash.name}</button>
          </div>
        )}

        <label className="ie-lbl" style={{ marginTop: 11 }}>They are</label>
        <div className="ie-seg full">
          <button className={nKind === "outsider" ? "on" : ""} onClick={() => setNKind("outsider")}>Outside</button>
          <button className={nKind === "employee" ? "on" : ""} onClick={() => setNKind("employee")}>Employee</button>
        </div>

        <label className="ie-lbl" style={{ marginTop: 11 }}>Role (optional)</label>
        <input className="ie-inp" value={nRole} onChange={(e) => setNRole(e.target.value)}
          placeholder="Driver, landlord, designer…" />

        <button className="ie-savep" disabled={saving || !!phoneClash} onClick={saveNew}>
          {saving ? "Saving…" : "Add & select"}
        </button>
        <div className="ie-hint">
          One phone number = one person. Every entry for that number adds up together.
        </div>
      </div>
    );
  }

  /* ── choosing ── */
  const nobodyAtAll = payees.length === 0;

  return (
    <div className="ie-picker">
      {!nobodyAtAll && (
        <div className="ie-seg full tiny">
          <button className={!filter ? "on" : ""} onClick={() => setFilter("")}>
            All <em>{payees.length}</em>
          </button>
          <button className={filter === "employee" ? "on" : ""} onClick={() => setFilter("employee")}>
            Employees <em>{empCount}</em>
          </button>
          <button className={filter === "outsider" ? "on" : ""} onClick={() => setFilter("outsider")}>
            Outside <em>{outCount}</em>
          </button>
        </div>
      )}

      <input className="ie-inp" style={{ marginTop: nobodyAtAll ? 0 : 9 }}
        value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or phone…" autoComplete="off" />

            <div className="ie-plist" style={{ maxHeight:220, overflowY:"auto" }}>
        {nobodyAtAll ? (
          <div className="ie-pempty">
            <b>Nobody in the list yet</b>
            Pull in your staff, or add anyone by name and phone.
          </div>
        ) : matches.length === 0 ? (
          <div className="ie-pempty">
            {filter === "employee" && empCount === 0
              ? <>No employees here yet — use <b>Pull in employees</b>.</>
              : "No match for that."}
          </div>
        ) : matches.map((p) => (
          <button key={p.id} className="ie-pitem" onClick={() => { onChange(p.id); setQuery(""); }}>
            <span className="ie-av" style={{ background: p.kind === "employee" ? ACCENT : GOLD }}>
              {initials(p.name)}
            </span>
            <span className="ie-pitem-main">
              <span className="ie-pitem-name">{p.name}</span>
              <span className="ie-pitem-sub">
                {formatPhone(p.phone)}
                {p.role ? ` · ${p.role}` : p.kind === "employee" ? " · Employee" : ""}
              </span>
            </span>
            {p.net > 0 && <span className="ie-pitem-amt" style={{ color: RED }}>{rupees(p.net)} due</span>}
          </button>
        ))}
      </div>

      <div className="ie-pactions">
        {allowNobody && (
          <button className="ie-ghost" onClick={() => onChange("")}>
            Nobody — skip this
          </button>
        )}
        {onSync && (
          <button className="ie-ghost" onClick={onSync} disabled={syncing}>
            {syncing ? "Pulling…" : "Pull in employees"}
          </button>
        )}
        <button className="ie-addp" onClick={() => startAdding(filter === "employee" ? "employee" : "outsider")}>
          + Add a new person
        </button>
      </div>
    </div>
  );
}