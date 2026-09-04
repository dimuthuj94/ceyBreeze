// src/pages/admin/financeManagement/AuditLogs.js
import React, { useEffect, useState } from "react";
import FinanceReportsAndStatistics from "../../../components/layouts/admin/FinanceReportsAndStatistics";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../../firebase";

const ACTION_COLORS = {
  INCOME_ADDED:               { background: "#e1f5ee", color: "#085041" },
  EXPENSE_ADDED:              { background: "#fcebeb", color: "#791f1f" },
  PAYROLL_PROCESSED:          { background: "#e6f1fb", color: "#0c447c" },
  EXTERNAL_PAYMENT_RECORDED:  { background: "#faeeda", color: "#633806" },
  EXTERNAL_PAYMENT_MARKED_PAID: { background: "#e1f5ee", color: "#085041" },
  VEHICLE_COST_ADDED:         { background: "#fcebeb", color: "#791f1f" },
};

export default function AuditLogs() {
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "financeAuditLog"), orderBy("performedAt", "desc"), limit(200)),
      snap => { setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const actions = [...new Set(logs.map(l => l.action))];

  const filtered = logs.filter(l => {
    if (filterAction !== "all" && l.action !== filterAction) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return l.action?.toLowerCase().includes(s) || l.entity?.toLowerCase().includes(s) || l.performedBy?.toLowerCase().includes(s) || JSON.stringify(l.data || {}).toLowerCase().includes(s);
    }
    return true;
  });

  const fmtDate = (ts) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <FinanceReportsAndStatistics pageTitle="Audit Logs">
      <div style={{ marginBottom: "24px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>Finance Audit Trail</h3>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>
          {filtered.length} log entries · Immutable record of all financial actions
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search logs..."
          style={{ padding: "7px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "12px", color: "#00276b", outline: "none", flex: 1, minWidth: "200px" }}
        />
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ fontSize: "12px", padding: "7px 12px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }}>
          <option value="all">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Log list */}
      {loading ? <p style={{ color: "#7a9ab8" }}>Loading logs...</p> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}>
          <div style={{ fontSize: "40px", opacity: 0.15, marginBottom: "12px" }}>◎</div>
          <p>No audit log entries found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {filtered.map(log => {
            const pill = ACTION_COLORS[log.action] || { background: "#f1f3f5", color: "#6c757d" };
            return (
              <div key={log.id} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "5px" }}>
                    <span style={{ ...pill, fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {log.action?.replace(/_/g, " ")}
                    </span>
                    <span style={{ fontSize: "11px", color: "#adc6d8" }}>{log.entity}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#343a40" }}>
                    Performed by: <strong>{log.performedBy || "admin"}</strong>
                  </div>
                  {log.data && (
                    <div style={{ fontSize: "11px", color: "#7a9ab8", marginTop: "4px" }}>
                      {log.data.description && <span>{log.data.description}</span>}
                      {log.data.amount && <span> · Amount: ${parseFloat(log.data.amount || 0).toFixed(2)}</span>}
                      {log.data.category && <span> · Category: {log.data.category}</span>}
                      {log.data.driverName && <span> · Driver: {log.data.driverName}</span>}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "#adc6d8", textAlign: "right", whiteSpace: "nowrap" }}>
                  {fmtDate(log.performedAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </FinanceReportsAndStatistics>
  );
}