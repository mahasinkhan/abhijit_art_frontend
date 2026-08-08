// frontend/src/components/VisitorsAdmin.tsx
import { useEffect, useState } from "react";
import api from "../api";

type Visitor = {
  _id: string; ip: string; city: string; region: string; country: string;
  page: string; referrer: string; device: string; browser: string; os: string; createdAt: string;
};
type Lead = {
  _id: string; name: string; phone: string; email: string; message: string; page: string; createdAt: string;
};

export default function VisitorsAdmin() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/api/visitors").then((r) => setVisitors(r.data || [])),
      api.get("/api/visitors/leads").then((r) => setLeads(r.data || [])),
    ])
      .catch(() => setError("Could not load visitor data."))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toDateString();
  const todayCount = visitors.filter((v) => new Date(v.createdAt).toDateString() === today).length;
  const uniqueIPs = new Set(visitors.map((v) => v.ip).filter(Boolean)).size;
  const mobileCount = visitors.filter((v) => v.device === "mobile").length;

  const fmt = (d: string) =>
    new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const place = (v: Visitor) =>
    [v.city, v.region, v.country].filter(Boolean).join(", ") || "Unknown";

  // ── CSV export of leads (for marketing) ──
  const exportLeads = () => {
    const head = ["Name", "Phone", "Email", "Message", "Page", "Date"];
    const rows = leads.map((l) => [
      l.name, l.phone, l.email, (l.message || "").replace(/\n/g, " "), l.page, fmt(l.createdAt),
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="muted" style={{ marginTop: 20 }}>Loading visitor data…</p>;
  if (error) return <p className="error" style={{ marginTop: 20 }}>{error}</p>;

  return (
    <div style={{ marginTop: 8 }}>
      {/* summary */}
      <div className="stats">
        <div className="stat"><b>{visitors.length}</b><span>Total visits</span></div>
        <div className="stat"><b>{todayCount}</b><span>Today</span></div>
        <div className="stat"><b>{uniqueIPs}</b><span>Unique visitors</span></div>
        <div className="stat"><b>{mobileCount}</b><span>On mobile</span></div>
        <div className="stat"><b style={{ color: "#2ecc71" }}>{leads.length}</b><span>Leads</span></div>
      </div>

      {/* ── LEADS (contact info from the chatbot) ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 12px" }}>
        <h3 style={{ margin: 0, fontFamily: "'Fraunces', serif" }}>💬 Leads — Contact Enquiries</h3>
        {leads.length > 0 && (
          <button className="btn" style={{ padding: "8px 16px" }} onClick={exportLeads}>⬇ Export CSV</button>
        )}
      </div>

      {leads.length === 0 ? (
        <p className="muted" style={{ marginBottom: 28 }}>No leads yet — they'll appear here when visitors use the chat widget.</p>
      ) : (
        <div className="card" style={{ overflowX: "auto", padding: 0, marginBottom: 28 }}>
          <table className="table">
            <thead>
              <tr>
                <th>When</th><th>Name</th><th>Mobile</th><th>Email</th><th>Message</th><th>Page</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l._id}>
                  <td>{fmt(l.createdAt)}</td>
                  <td>{l.name}</td>
                  <td>{l.phone ? <a href={`tel:${l.phone}`}>{l.phone}</a> : "—"}</td>
                  <td>{l.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : "—"}</td>
                  <td className="notes-cell">{l.message || "—"}</td>
                  <td>{l.page || "/"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ALL VISITS ── */}
      <h3 style={{ margin: "0 0 12px", fontFamily: "'Fraunces', serif" }}>📊 All Visits</h3>
      {visitors.length === 0 ? (
        <p className="muted">No visitors recorded yet.</p>
      ) : (
        <div className="card" style={{ overflowX: "auto", padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>When</th><th>Location</th><th>Device</th><th>Page</th><th>Came from</th><th>IP</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((v) => (
                <tr key={v._id}>
                  <td>{fmt(v.createdAt)}</td>
                  <td>{place(v)}</td>
                  <td style={{ textTransform: "capitalize" }}>
                    {v.device}{v.os ? ` · ${v.os}` : ""}{v.browser ? ` · ${v.browser}` : ""}
                  </td>
                  <td>{v.page || "/"}</td>
                  <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {v.referrer || "Direct"}
                  </td>
                  <td>{v.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
