// src/pages/admin/financeManagement/ExternalPayments.js
import React, { useEffect, useState } from "react";
import FinanceReportsAndStatistics from "../../../components/layouts/admin/FinanceReportsAndStatistics";
import {
  collection, addDoc, onSnapshot, query,
  orderBy, serverTimestamp, doc, updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";

const ENTITY_TYPES = ["External Driver", "External Vehicle"];
const PAYMENT_METHODS = ["Bank Transfer","Cash","Cheque","Online Transfer"];

const btnStyle = (bg, color) => ({ background: bg, color, border: "none", fontSize: "11px", padding: "7px 14px", cursor: "pointer", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" });
const fl = { fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" };
const fi = { width: "100%", padding: "10px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "13px", color: "#00276b", outline: "none", background: "#fff", boxSizing: "border-box" };

export default function ExternalPayments() {
  const [records,    setRecords]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const now = new Date();
  const [form, setForm] = useState({
    entityType: ENTITY_TYPES[0], entityId: "", entityName: "",
    bookingReference: "", agreedRate: "", rateUnit: "per trip",
    bonuses: "", tips: "", totalAmount: "", paymentMethod: PAYMENT_METHODS[0],
    date: now.toISOString().split("T")[0], status: "pending", notes: "",
  });

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "financeExternalPayments"), orderBy("createdAt", "desc")),
      snap => { setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  // Auto-calculate total
  const calcTotal = (f) => (parseFloat(f.agreedRate) || 0) + (parseFloat(f.bonuses) || 0) + (parseFloat(f.tips) || 0);

  const handleSave = async () => {
    if (!form.entityName || !form.agreedRate) { alert("Entity name and agreed rate required."); return; }
    setSaving(true);
    try {
      const total = calcTotal(form);
      const record = {
        ...form,
        agreedRate: parseFloat(form.agreedRate) || 0,
        bonuses: parseFloat(form.bonuses) || 0,
        tips: parseFloat(form.tips) || 0,
        totalAmount: total,
        createdAt: serverTimestamp(), createdBy: "admin",
      };
      await addDoc(collection(db, "financeExternalPayments"), record);
      await addDoc(collection(db, "financeAuditLog"), { action: "EXTERNAL_PAYMENT_RECORDED", entity: "financeExternalPayments", data: record, performedBy: "admin", performedAt: serverTimestamp() });
      setForm({ entityType: ENTITY_TYPES[0], entityId: "", entityName: "", bookingReference: "", agreedRate: "", rateUnit: "per trip", bonuses: "", tips: "", totalAmount: "", paymentMethod: PAYMENT_METHODS[0], date: now.toISOString().split("T")[0], status: "pending", notes: "" });
      setShowForm(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const markPaid = async (id) => {
    await updateDoc(doc(db, "financeExternalPayments", id), { status: "paid", paidAt: serverTimestamp() });
    await addDoc(collection(db, "financeAuditLog"), { action: "EXTERNAL_PAYMENT_MARKED_PAID", entity: "financeExternalPayments", recordId: id, performedBy: "admin", performedAt: serverTimestamp() });
  };

  const filtered = records.filter(r => {
    if (filterType !== "all" && r.entityType !== filterType) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  const totalPending = filtered.filter(r => r.status === "pending").reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalPaid    = filtered.filter(r => r.status === "paid").reduce((s, r) => s + (r.totalAmount || 0), 0);
  const fmtMoney = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const fmtDate  = (ts) => { if (!ts) return "—"; const d = ts?.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); };

  return (
    <FinanceReportsAndStatistics pageTitle="External Payments">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
        <div>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>External Driver & Vehicle Payments</h3>
          <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>
            Pending: <strong style={{ color: "#8B0000" }}>{fmtMoney(totalPending)}</strong> · Paid: <strong style={{ color: "#27a86e" }}>{fmtMoney(totalPaid)}</strong>
          </p>
        </div>
        <button style={btnStyle("#00276b", "#fff")} onClick={() => setShowForm(!showForm)}>{showForm ? "✕ Cancel" : "+ Record Payment"}</button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "22px", marginBottom: "24px" }}>
          <div style={{ background: "#00276b", margin: "-22px -22px 20px", padding: "13px 20px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>New External Payment</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            <div>
              <label style={fl}>Entity Type</label>
              <select style={fi} value={form.entityType} onChange={e => setForm(p => ({ ...p, entityType: e.target.value }))}>
                {ENTITY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={fl}>Name</label>
              <input type="text" style={fi} value={form.entityName} onChange={e => setForm(p => ({ ...p, entityName: e.target.value }))} placeholder="Driver / vehicle provider name" />
            </div>
            <div>
              <label style={fl}>Booking Reference</label>
              <input type="text" style={fi} value={form.bookingReference} onChange={e => setForm(p => ({ ...p, bookingReference: e.target.value }))} />
            </div>
            <div>
              <label style={fl}>Agreed Rate ($)</label>
              <input type="number" style={fi} value={form.agreedRate} onChange={e => setForm(p => ({ ...p, agreedRate: e.target.value }))} />
            </div>
            <div>
              <label style={fl}>Rate Unit</label>
              <select style={fi} value={form.rateUnit} onChange={e => setForm(p => ({ ...p, rateUnit: e.target.value }))}>
                {["per trip","per day","per km","fixed"].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={fl}>Bonuses ($)</label>
              <input type="number" style={fi} value={form.bonuses} onChange={e => setForm(p => ({ ...p, bonuses: e.target.value }))} />
            </div>
            <div>
              <label style={fl}>Tips ($)</label>
              <input type="number" style={fi} value={form.tips} onChange={e => setForm(p => ({ ...p, tips: e.target.value }))} />
            </div>
            <div>
              <label style={fl}>Payment Method</label>
              <select style={fi} value={form.paymentMethod} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={fl}>Date</label>
              <input type="date" style={fi} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
          </div>
          {form.agreedRate && (
            <div style={{ background: "rgba(0,39,107,0.03)", border: "1px solid rgba(0,39,107,0.08)", padding: "12px 16px", marginTop: "14px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", color: "#7a9ab8" }}>Total to Pay</span>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "18px", color: "#00276b" }}>{fmtMoney(calcTotal(form))}</span>
            </div>
          )}
          <div style={{ marginTop: "14px" }}>
            <label style={fl}>Notes</label>
            <textarea style={{ ...fi, resize: "vertical", minHeight: "60px" }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
            <button style={btnStyle("rgba(0,39,107,0.08)", "#00276b")} onClick={() => setShowForm(false)}>Cancel</button>
            <button style={btnStyle("#00276b", "#fff")} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Payment"}</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <select style={{ fontSize: "12px", padding: "6px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={{ fontSize: "12px", padding: "6px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Table */}
      {loading ? <p style={{ color: "#7a9ab8" }}>Loading...</p> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}><p>No external payment records found.</p></div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "rgba(0,39,107,0.04)" }}>
                {["Date","Type","Name","Booking","Rate","Bonuses","Tips","Total","Status","Action"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)", background: i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.01)" }}>
                  <td style={{ padding: "10px 12px", color: "#7a9ab8" }}>{fmtDate(r.createdAt)}</td>
                  <td style={{ padding: "10px 12px", color: "#00276b" }}>{r.entityType}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{r.entityName}</td>
                  <td style={{ padding: "10px 12px", color: "#adc6d8", fontSize: "11px" }}>{r.bookingReference || "—"}</td>
                  <td style={{ padding: "10px 12px" }}>{fmtMoney(r.agreedRate)}</td>
                  <td style={{ padding: "10px 12px", color: "#27a86e" }}>{fmtMoney(r.bonuses)}</td>
                  <td style={{ padding: "10px 12px", color: "#27a86e" }}>{fmtMoney(r.tips)}</td>
                  <td style={{ padding: "10px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: "#00276b" }}>{fmtMoney(r.totalAmount)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", textTransform: "uppercase", background: r.status === "paid" ? "#e1f5ee" : "#faeeda", color: r.status === "paid" ? "#085041" : "#633806" }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {r.status === "pending" && (
                      <button onClick={() => markPaid(r.id)} style={{ ...btnStyle("#e1f5ee", "#085041"), padding: "4px 10px", fontSize: "10px" }}>Mark Paid</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FinanceReportsAndStatistics>
  );
}