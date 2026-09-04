// src/pages/admin/financeManagement/VehicleCosts.js
import React, { useEffect, useState } from "react";
import FinanceReportsAndStatistics from "../../../components/layouts/admin/FinanceReportsAndStatistics";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

const COST_CATEGORIES = [
  "Fuel","Leasing Payment","Repair & Maintenance","Insurance Premium",
  "Road Tax / Registration","Service Charge","Tires","Accident Repair","Other",
];
const VEHICLE_TYPES = ["Internal Vehicle","External Vehicle"];

const btnStyle = (bg, color) => ({ background: bg, color, border: "none", fontSize: "11px", padding: "7px 14px", cursor: "pointer", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" });
const fl = { fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" };
const fi = { width: "100%", padding: "10px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "13px", color: "#00276b", outline: "none", background: "#fff", boxSizing: "border-box" };

export default function VehicleCosts() {
  const [records,    setRecords]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [filterCat,  setFilterCat]  = useState("all");
  const [filterType, setFilterType] = useState("all");

  const now = new Date();
  const [form, setForm] = useState({
    vehicleType: VEHICLE_TYPES[0], vehicleId: "", vehicleName: "",
    category: COST_CATEGORIES[0], amount: "", description: "",
    date: now.toISOString().split("T")[0], odometer: "", serviceProvider: "", notes: "",
  });

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "financeVehicleCosts"), orderBy("createdAt", "desc")),
      snap => { setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!form.vehicleName || !form.amount) { alert("Vehicle name and amount required."); return; }
    setSaving(true);
    try {
      const record = { ...form, amount: parseFloat(form.amount) || 0, odometer: parseFloat(form.odometer) || null, createdAt: serverTimestamp(), createdBy: "admin" };
      await addDoc(collection(db, "financeVehicleCosts"), record);
      await addDoc(collection(db, "financeAuditLog"), { action: "VEHICLE_COST_ADDED", entity: "financeVehicleCosts", data: record, performedBy: "admin", performedAt: serverTimestamp() });
      setForm({ vehicleType: VEHICLE_TYPES[0], vehicleId: "", vehicleName: "", category: COST_CATEGORIES[0], amount: "", description: "", date: now.toISOString().split("T")[0], odometer: "", serviceProvider: "", notes: "" });
      setShowForm(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const filtered = records.filter(r => {
    if (filterCat !== "all" && r.category !== filterCat) return false;
    if (filterType !== "all" && r.vehicleType !== filterType) return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s, r) => s + (r.amount || 0), 0);
  const byCat = COST_CATEGORIES.map(c => ({ cat: c, total: records.filter(r => r.category === c).reduce((s, r) => s + (r.amount || 0), 0) })).filter(x => x.total > 0);
  const fmtMoney = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const fmtDate = (ts, fb) => { const d = ts?.toDate ? ts.toDate() : fb ? new Date(fb) : null; return d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"; };

  return (
    <FinanceReportsAndStatistics pageTitle="Vehicle Costs">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
        <div>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>Vehicle Cost Management</h3>
          <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>{filtered.length} records · Total: <strong style={{ color: "#dc3545" }}>{fmtMoney(totalFiltered)}</strong></p>
        </div>
        <button style={btnStyle("#00276b", "#fff")} onClick={() => setShowForm(!showForm)}>{showForm ? "✕ Cancel" : "+ Add Cost"}</button>
      </div>

      {/* Category breakdown */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
        {byCat.map(({ cat, total }) => (
          <div key={cat} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "12px 16px", minWidth: "130px" }}>
            <div style={{ fontSize: "10px", color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{cat}</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "16px", color: "#dc3545" }}>{fmtMoney(total)}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "22px", marginBottom: "24px" }}>
          <div style={{ background: "#00276b", margin: "-22px -22px 20px", padding: "13px 20px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>New Vehicle Cost</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            {[
              { label: "Vehicle Type", key: "vehicleType", type: "select", options: VEHICLE_TYPES },
              { label: "Cost Category", key: "category", type: "select", options: COST_CATEGORIES },
              { label: "Amount ($)", key: "amount", type: "number" },
              { label: "Vehicle ID (if known)", key: "vehicleId", type: "text" },
              { label: "Vehicle Name / Plate", key: "vehicleName", type: "text" },
              { label: "Date", key: "date", type: "date" },
              { label: "Odometer Reading (km)", key: "odometer", type: "number" },
              { label: "Service Provider", key: "serviceProvider", type: "text" },
            ].map(({ label, key, type, options }) => (
              <div key={key}>
                <label style={fl}>{label}</label>
                {type === "select"
                  ? <select style={fi} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}>{options.map(o => <option key={o}>{o}</option>)}</select>
                  : <input type={type} style={fi} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                }
              </div>
            ))}
          </div>
          <div style={{ marginTop: "14px" }}>
            <label style={fl}>Description</label>
            <input type="text" style={fi} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div style={{ marginTop: "14px" }}>
            <label style={fl}>Notes</label>
            <textarea style={{ ...fi, resize: "vertical", minHeight: "60px" }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
            <button style={btnStyle("rgba(0,39,107,0.08)", "#00276b")} onClick={() => setShowForm(false)}>Cancel</button>
            <button style={btnStyle("#00276b", "#fff")} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Cost"}</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <select style={{ fontSize: "12px", padding: "6px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Vehicle Types</option>
          {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={{ fontSize: "12px", padding: "6px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">All Categories</option>
          {COST_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? <p style={{ color: "#7a9ab8" }}>Loading...</p> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}><p>No vehicle cost records found.</p></div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "rgba(0,39,107,0.04)" }}>
                {["Date","Vehicle","Type","Category","Description","Odometer","Provider","Amount"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)", background: i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.01)" }}>
                  <td style={{ padding: "10px 12px", color: "#7a9ab8" }}>{fmtDate(r.createdAt, r.date)}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 500, color: "#00276b" }}>{r.vehicleName || r.vehicleId || "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#7a9ab8", fontSize: "11px" }}>{r.vehicleType}</td>
                  <td style={{ padding: "10px 12px" }}>{r.category}</td>
                  <td style={{ padding: "10px 12px", color: "#343a40" }}>{r.description || "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#adc6d8" }}>{r.odometer ? `${r.odometer} km` : "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#7a9ab8" }}>{r.serviceProvider || "—"}</td>
                  <td style={{ padding: "10px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: "#dc3545" }}>{fmtMoney(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "rgba(0,39,107,0.03)", borderTop: "2px solid rgba(0,39,107,0.1)" }}>
                <td colSpan={7} style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase" }}>Total</td>
                <td style={{ padding: "12px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "18px", color: "#dc3545" }}>{fmtMoney(totalFiltered)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </FinanceReportsAndStatistics>
  );
}