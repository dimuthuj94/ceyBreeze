// src/pages/admin/financeManagement/ExpenseManagement.js
import React, { useEffect, useState } from "react";
import FinanceReportsAndStatistics from "../../../components/layouts/admin/FinanceReportsAndStatistics";
import {
  collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase";

const EXPENSE_CATEGORIES = {
  "Direct Tour Costs":    ["Driver Payment (Internal)","Driver Payment (External)","Vehicle Cost (Internal)","Vehicle Cost (External)","Hotel / Accommodation","Activity Cost","Adventure Service"],
  "Operational Costs":    ["Staff Salaries","Fuel","Office / Admin","Utilities","Maintenance","Insurance"],
  "Financial Adjustments":["Refund Issued","Price Amendment","Discount Given"],
  "Other":                ["Payment Gateway Fee","Marketing / Advertising","Taxes","Miscellaneous"],
};
const ALL_CATEGORIES = Object.values(EXPENSE_CATEGORIES).flat();
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const btnStyle = (bg, color) => ({
  background: bg, color, border: "none", fontSize: "11px", padding: "7px 14px",
  cursor: "pointer", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Outfit', sans-serif",
});
const fieldLabel = { fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" };
const fieldStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "13px", color: "#00276b", fontFamily: "'Outfit', sans-serif", outline: "none", background: "#fff", boxSizing: "border-box" };

export default function ExpenseManagement() {
  const [records,     setRecords]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterCat,   setFilterCat]   = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear,  setFilterYear]  = useState("all");

  const [form, setForm] = useState({
    category: ALL_CATEGORIES[0], amount: "", description: "",
    date: new Date().toISOString().split("T")[0], paymentMethod: "Bank Transfer",
    bookingReference: "", vendorName: "", approvedBy: "admin", notes: "",
    status: "approved",
  });

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "financeExpenses"), orderBy("createdAt", "desc")),
      snap => { setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!form.amount || !form.description) { alert("Amount and description required."); return; }
    setSaving(true);
    try {
      const record = { ...form, amount: parseFloat(form.amount) || 0, createdAt: serverTimestamp(), createdBy: "admin" };
      await addDoc(collection(db, "financeExpenses"), record);
      await addDoc(collection(db, "financeAuditLog"), { action: "EXPENSE_ADDED", entity: "financeExpenses", data: record, performedBy: "admin", performedAt: serverTimestamp() });
      setForm({ category: ALL_CATEGORIES[0], amount: "", description: "", date: new Date().toISOString().split("T")[0], paymentMethod: "Bank Transfer", bookingReference: "", vendorName: "", approvedBy: "admin", notes: "", status: "approved" });
      setShowForm(false);
    } catch (e) { alert("Failed: " + e.message); }
    finally { setSaving(false); }
  };

  const years = [...new Set(records.map(r => {
    const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.date || 0);
    return d.getFullYear();
  }))].sort((a, b) => b - a);

  const filtered = records.filter(r => {
    const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.date || 0);
    if (filterGroup !== "all") {
      const groupCats = EXPENSE_CATEGORIES[filterGroup] || [];
      if (!groupCats.includes(r.category)) return false;
    }
    if (filterCat !== "all" && r.category !== filterCat) return false;
    if (filterMonth !== "all" && d.getMonth() !== parseInt(filterMonth)) return false;
    if (filterYear !== "all" && d.getFullYear() !== parseInt(filterYear)) return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s, r) => s + (r.amount || 0), 0);
  const fmtMoney = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const fmtDate = (ts, fb) => {
    const d = ts?.toDate ? ts.toDate() : fb ? new Date(fb) : null;
    return d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  };

  // Breakdown by group
  const groupTotals = Object.entries(EXPENSE_CATEGORIES).map(([group, cats]) => ({
    group,
    total: records.filter(r => cats.includes(r.category)).reduce((s, r) => s + (r.amount || 0), 0),
  }));

  return (
    <FinanceReportsAndStatistics pageTitle="Expense Management">

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>Expense Records</h3>
          <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>{filtered.length} records · Total: <strong style={{ color: "#dc3545" }}>{fmtMoney(totalFiltered)}</strong></p>
        </div>
        <button style={btnStyle("#00276b", "#fff")} onClick={() => setShowForm(!showForm)}>{showForm ? "✕ Cancel" : "+ Add Expense"}</button>
      </div>

      {/* Breakdown strip */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
        {groupTotals.map(({ group, total }) => (
          <div key={group} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "12px 16px", flex: 1, minWidth: "140px" }}>
            <div style={{ fontSize: "10px", color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{group}</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "18px", color: "#dc3545" }}>{fmtMoney(total)}</div>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "22px", marginBottom: "24px" }}>
          <div style={{ background: "#8B0000", margin: "-22px -22px 20px", padding: "13px 20px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#faeeda", letterSpacing: "0.12em", textTransform: "uppercase" }}>New Expense Record</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            <div>
              <label style={fieldLabel}>Category</label>
              <select style={fieldStyle} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {Object.entries(EXPENSE_CATEGORIES).map(([group, cats]) => (
                  <optgroup key={group} label={group}>
                    {cats.map(c => <option key={c}>{c}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Amount ($)</label>
              <input type="number" style={fieldStyle} value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label style={fieldLabel}>Date</label>
              <input type="date" style={fieldStyle} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label style={fieldLabel}>Payment Method</label>
              <select style={fieldStyle} value={form.paymentMethod} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}>
                {["Bank Transfer","Cash","Card","Cheque","Other"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Booking Reference (if linked)</label>
              <input type="text" style={fieldStyle} value={form.bookingReference} onChange={e => setForm(p => ({ ...p, bookingReference: e.target.value }))} />
            </div>
            <div>
              <label style={fieldLabel}>Vendor / Supplier Name</label>
              <input type="text" style={fieldStyle} value={form.vendorName} onChange={e => setForm(p => ({ ...p, vendorName: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginTop: "14px" }}>
            <label style={fieldLabel}>Description *</label>
            <input type="text" style={fieldStyle} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div style={{ marginTop: "14px" }}>
            <label style={fieldLabel}>Notes</label>
            <textarea style={{ ...fieldStyle, resize: "vertical", minHeight: "60px" }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
            <button style={btnStyle("rgba(0,39,107,0.08)", "#00276b")} onClick={() => setShowForm(false)}>Cancel</button>
            <button style={btnStyle("#8B0000", "#fff")} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Expense"}</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
        <select style={{ fontSize: "12px", padding: "6px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }} value={filterGroup} onChange={e => { setFilterGroup(e.target.value); setFilterCat("all"); }}>
          <option value="all">All Groups</option>
          {Object.keys(EXPENSE_CATEGORIES).map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select style={{ fontSize: "12px", padding: "6px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">All Categories</option>
          {(filterGroup === "all" ? ALL_CATEGORIES : EXPENSE_CATEGORIES[filterGroup] || []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={{ fontSize: "12px", padding: "6px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="all">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select style={{ fontSize: "12px", padding: "6px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="all">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? <p style={{ color: "#7a9ab8" }}>Loading...</p> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}>
          <div style={{ fontSize: "40px", opacity: 0.15, marginBottom: "12px" }}>↓</div>
          <p>No expense records found.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "rgba(0,39,107,0.04)" }}>
                {["Date","Category","Description","Vendor","Booking Ref","Method","Amount"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)", background: i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.01)" }}>
                  <td style={{ padding: "10px 14px", color: "#7a9ab8" }}>{fmtDate(r.createdAt, r.date)}</td>
                  <td style={{ padding: "10px 14px", color: "#00276b" }}>{r.category}</td>
                  <td style={{ padding: "10px 14px", color: "#343a40", maxWidth: "180px" }}>{r.description}</td>
                  <td style={{ padding: "10px 14px", color: "#7a9ab8" }}>{r.vendorName || "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#adc6d8", fontSize: "11px" }}>{r.bookingReference || "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#7a9ab8" }}>{r.paymentMethod}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "15px", color: "#dc3545" }}>{fmtMoney(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "rgba(0,39,107,0.03)", borderTop: "2px solid rgba(0,39,107,0.1)" }}>
                <td colSpan={6} style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase" }}>Total</td>
                <td style={{ padding: "12px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "18px", color: "#dc3545" }}>{fmtMoney(totalFiltered)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </FinanceReportsAndStatistics>
  );
}