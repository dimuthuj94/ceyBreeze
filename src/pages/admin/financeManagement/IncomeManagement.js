// src/pages/admin/financeManagement/IncomeManagement.js
import React, { useEffect, useState } from "react";
import FinanceReportsAndStatistics from "../../../components/layouts/admin/FinanceReportsAndStatistics";
import {
  collection, addDoc, onSnapshot, query,
  orderBy, serverTimestamp, getDocs, limit,
} from "firebase/firestore";
import { db } from "../../../firebase";

const INCOME_CATEGORIES = [
  "Preset Tour Payment","Custom Tour Payment","Vehicle Booking Payment",
  "Partial / Advance Payment","Balance Payment (On Tour)",
  "Activity Add-on","Accommodation Upgrade",
  "Cancellation Charge Retained","Service Charge",
  "Late Payment Penalty","Other Income",
];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const btnStyle = (bg, color) => ({
  background: bg, color, border: "none", fontSize: "11px", padding: "7px 14px",
  cursor: "pointer", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
});
const fl = { fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" };
const fi = { width: "100%", padding: "10px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "13px", color: "#00276b", outline: "none", background: "#fff", boxSizing: "border-box" };
const lkrFi = { ...fi, borderColor: "#fac775", color: "#633806", background: "#fffdf7" };

const fmtUSD = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmtLKR = (n) => `LKR ${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmtDate = (ts, fb) => {
  const d = ts?.toDate ? ts.toDate() : fb ? new Date(fb) : null;
  return d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};

export default function IncomeManagement() {
  const [records,     setRecords]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [filterCat,   setFilterCat]   = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear,  setFilterYear]  = useState("all");
  const [viewCurrency, setViewCurrency] = useState("LKR"); // "USD" | "LKR"
  const [latestRate,  setLatestRate]  = useState(null);
  const [lkrMode,     setLkrMode]     = useState("auto");

  const [form, setForm] = useState({
    bookingReference: "", category: INCOME_CATEGORIES[0],
    amount: "", amountUSD: "", amountLKR: "",
    exchangeRate: "",
    paymentMethod: "Bank Transfer",
    description: "", date: new Date().toISOString().split("T")[0],
    status: "received", notes: "",
  });

  useEffect(() => {
    getDocs(query(collection(db, "financeExchangeRates"), orderBy("createdAt", "desc"), limit(1)))
      .then(snap => {
        if (!snap.empty) {
          const r = snap.docs[0].data();
          setLatestRate(r);
          setForm(p => ({ ...p, exchangeRate: String(r.rateUSDtoLKR) }));
        }
      }).catch(() => {});
    const unsub = onSnapshot(
      query(collection(db, "financeIncome"), orderBy("createdAt", "desc")),
      snap => { setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  /* Auto-calc LKR */
  useEffect(() => {
    if (lkrMode !== "auto") return;
    const rate = parseFloat(form.exchangeRate) || 0;
    const usd  = parseFloat(form.amountUSD) || 0;
    if (rate > 0 && usd > 0) {
      setForm(p => ({ ...p, amountLKR: (usd * rate).toFixed(2), amount: usd }));
    }
  }, [form.amountUSD, form.exchangeRate, lkrMode]);

  const handleSave = async () => {
    if (!form.amountUSD || !form.amountLKR || !form.description) {
      alert("USD amount, LKR equivalent, and description are required.");
      return;
    }
    setSaving(true);
    try {
      const record = {
        ...form,
        amount:       parseFloat(form.amountUSD) || 0,
        amountUSD:    parseFloat(form.amountUSD) || 0,
        amountLKR:    parseFloat(form.amountLKR) || 0,
        exchangeRate: parseFloat(form.exchangeRate) || 0,
        createdAt:    serverTimestamp(),
        createdBy:    "admin",
      };
      await addDoc(collection(db, "financeIncome"), record);
      await addDoc(collection(db, "financeAuditLog"), {
        action: "INCOME_ADDED_MANUAL", entity: "financeIncome", data: record,
        performedBy: "admin", performedAt: serverTimestamp(),
      });
      setForm({ bookingReference: "", category: INCOME_CATEGORIES[0], amount: "", amountUSD: "", amountLKR: "", exchangeRate: latestRate ? String(latestRate.rateUSDtoLKR) : "", paymentMethod: "Bank Transfer", description: "", date: new Date().toISOString().split("T")[0], status: "received", notes: "" });
      setShowForm(false);
    } catch (e) { alert("Failed: " + e.message); }
    finally { setSaving(false); }
  };

  const years = [...new Set(records.map(r => {
    const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.date || 0);
    return d.getFullYear();
  }))].filter(Boolean).sort((a, b) => b - a);

  const filtered = records.filter(r => {
    const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.date || 0);
    if (filterCat !== "all" && r.category !== filterCat) return false;
    if (filterMonth !== "all" && d.getMonth() !== parseInt(filterMonth)) return false;
    if (filterYear !== "all" && d.getFullYear() !== parseInt(filterYear)) return false;
    return true;
  });

  const totalUSD = filtered.reduce((s, r) => s + (r.amountUSD || r.amount || 0), 0);
  const totalLKR = filtered.reduce((s, r) => s + (r.amountLKR || (r.amount * (r.exchangeRate || 1)) || 0), 0);

  const statusPill = (s) => ({
    received: { background: "#e1f5ee", color: "#085041" },
    partial:  { background: "#faeeda", color: "#633806" },
    pending:  { background: "#fcebeb", color: "#791f1f" },
  }[s] || { background: "#f1f3f5", color: "#6c757d" });

  return (
    <FinanceReportsAndStatistics pageTitle="Income Management">

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
        <div>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>Income Records</h3>
          <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "#7a9ab8" }}>
            <span>{filtered.length} records</span>
            <span>USD Total: <strong style={{ color: "#27a86e" }}>{fmtUSD(totalUSD)}</strong></span>
            <span>LKR Total: <strong style={{ color: "#27a86e" }}>{fmtLKR(totalLKR)}</strong></span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {/* Currency toggle */}
          <div style={{ display: "flex", background: "rgba(0,39,107,0.04)", padding: "3px", gap: "2px" }}>
            {["USD","LKR"].map(c => (
              <button key={c} onClick={() => setViewCurrency(c)} style={{
                padding: "5px 14px", fontSize: "11px", fontWeight: 700, border: "none", cursor: "pointer",
                background: viewCurrency === c ? "#00276b" : "transparent",
                color: viewCurrency === c ? "#fff" : "#7a9ab8",
              }}>{c}</button>
            ))}
          </div>
          <button style={btnStyle("#00276b", "#fff")} onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ Cancel" : "+ Add Income"}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "22px", marginBottom: "24px" }}>
          <div style={{ background: "#00276b", margin: "-22px -22px 20px", padding: "13px 20px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>New Income Record (Manual Entry)</span>
          </div>
          <div style={{ background: "#fffbf0", border: "1px solid rgba(253,174,0,0.25)", padding: "10px 14px", marginBottom: "18px", fontSize: "11px", color: "#633806" }}>
            For tour payments, use <strong>Generate Receipt</strong> in the Paid Reservations page — it records income automatically. Use this form for manual/non-booking income only.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            <div>
              <label style={fl}>Booking Reference (optional)</label>
              <input type="text" style={fi} value={form.bookingReference} onChange={e => setForm(p => ({ ...p, bookingReference: e.target.value }))} />
            </div>
            <div>
              <label style={fl}>Category</label>
              <select style={fi} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {INCOME_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={fl}>Date</label>
              <input type="date" style={fi} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label style={fl}>Amount (USD) *</label>
              <input type="number" style={fi} value={form.amountUSD} onChange={e => setForm(p => ({ ...p, amountUSD: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label style={fl}>Exchange Rate (1 USD = LKR) *</label>
              <input type="number" style={lkrFi} value={form.exchangeRate} onChange={e => setForm(p => ({ ...p, exchangeRate: e.target.value }))} placeholder={latestRate ? latestRate.rateUSDtoLKR : "e.g. 320"} />
            </div>
            <div>
              <label style={fl}>Amount (LKR) *</label>
              <div style={{ position: "relative" }}>
                <input type="number" style={lkrFi} value={form.amountLKR} onChange={e => { setLkrMode("manual"); setForm(p => ({ ...p, amountLKR: e.target.value })); }} placeholder="0.00" />
                <button onClick={() => {
                  const rate = parseFloat(form.exchangeRate) || 0;
                  const usd = parseFloat(form.amountUSD) || 0;
                  if (rate && usd) setForm(p => ({ ...p, amountLKR: (usd * rate).toFixed(2) }));
                  setLkrMode("auto");
                }} style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "9px", background: "#fac775", color: "#633806", border: "none", padding: "2px 6px", cursor: "pointer", fontWeight: 700 }}>
                  AUTO
                </button>
              </div>
            </div>
            <div>
              <label style={fl}>Payment Method</label>
              <select style={fi} value={form.paymentMethod} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}>
                {["Bank Transfer","Cash","Credit Card","Online Transfer","Other"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={fl}>Status</label>
              <select style={fi} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {["received","partial","pending"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: "14px" }}>
            <label style={fl}>Description *</label>
            <input type="text" style={fi} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." />
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
            <button style={btnStyle("rgba(0,39,107,0.08)", "#00276b")} onClick={() => setShowForm(false)}>Cancel</button>
            <button style={btnStyle("#00276b", "#fff")} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Record"}</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
        <select style={{ fontSize: "12px", padding: "6px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">All Categories</option>
          {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={{ fontSize: "12px", padding: "6px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="all">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select style={{ fontSize: "12px", padding: "6px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="all">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {(filterCat !== "all" || filterMonth !== "all" || filterYear !== "all") && (
          <button onClick={() => { setFilterCat("all"); setFilterMonth("all"); setFilterYear("all"); }} style={{ fontSize: "11px", color: "#7a9ab8", background: "none", border: "1px solid rgba(0,39,107,0.1)", padding: "6px 10px", cursor: "pointer" }}>Clear</button>
        )}
      </div>

      {/* Table */}
      {loading ? <p style={{ color: "#7a9ab8" }}>Loading...</p> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}>
          <div style={{ fontSize: "40px", opacity: 0.15, marginBottom: "12px" }}>↑</div>
          <p>No income records found.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "rgba(0,39,107,0.04)" }}>
                {["Date","Booking Ref","Category","Description","Method","Status","Amount (USD)","Rate","Amount (LKR)"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: h.includes("LKR") ? "#633806" : "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const sp = statusPill(r.status);
                const usd = r.amountUSD || r.amount || 0;
                const lkr = r.amountLKR || (usd * (r.exchangeRate || 1));
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)", background: i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.01)" }}>
                    <td style={{ padding: "9px 12px", color: "#7a9ab8" }}>{fmtDate(r.createdAt, r.date)}</td>
                    <td style={{ padding: "9px 12px", color: "#adc6d8", fontSize: "11px" }}>{r.bookingReference || "—"}</td>
                    <td style={{ padding: "9px 12px", color: "#00276b" }}>{r.category}</td>
                    <td style={{ padding: "9px 12px", color: "#343a40", maxWidth: "180px" }}>{r.description}</td>
                    <td style={{ padding: "9px 12px", color: "#7a9ab8" }}>{r.paymentMethod}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ ...sp, fontSize: "9px", padding: "2px 7px", borderRadius: "8px", fontWeight: 700, textTransform: "uppercase" }}>{r.status}</span>
                    </td>
                    <td style={{ padding: "9px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: "#27a86e" }}>{fmtUSD(usd)}</td>
                    <td style={{ padding: "9px 12px", color: "#adc6d8", fontSize: "11px" }}>{r.exchangeRate ? `${r.exchangeRate}` : "—"}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: "#633806" }}>{fmtLKR(lkr)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "rgba(0,39,107,0.03)", borderTop: "2px solid rgba(0,39,107,0.1)" }}>
                <td colSpan={6} style={{ padding: "11px 12px", fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase" }}>Total ({filtered.length})</td>
                <td style={{ padding: "11px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "16px", color: "#27a86e" }}>{fmtUSD(totalUSD)}</td>
                <td />
                <td style={{ padding: "11px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "16px", color: "#633806" }}>{fmtLKR(totalLKR)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </FinanceReportsAndStatistics>
  );
}