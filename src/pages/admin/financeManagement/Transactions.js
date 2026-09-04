// src/pages/admin/financeManagement/Transactions.js
import React, { useEffect, useState } from "react";
import FinanceReportsAndStatistics from "../../../components/layouts/admin/FinanceReportsAndStatistics";
import {
  collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const TYPE_PILL = {
  income:          { background: "#e1f5ee", color: "#085041",  label: "Income"          },
  expense:         { background: "#fcebeb", color: "#791f1f",  label: "Expense"         },
  refund:          { background: "#faeeda", color: "#633806",  label: "Refund"          },
  to_be_received:  { background: "#e6f1fb", color: "#0c447c",  label: "To Be Received"  },
};

const STATUS_PILL = {
  completed: { background: "#e1f5ee", color: "#085041", label: "Completed" },
  pending:   { background: "#faeeda", color: "#633806", label: "Pending"   },
  cancelled: { background: "#fcebeb", color: "#791f1f", label: "Cancelled" },
  settled:   { background: "#e6f1fb", color: "#0c447c", label: "Settled"   },
};

const pill = (obj) => (
  <span style={{ ...obj, fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", textTransform: "uppercase", letterSpacing: "0.04em", display: "inline-block", whiteSpace: "nowrap" }}>
    {obj.label}
  </span>
);

const fmtMoney = (n, cur = "USD") => `${cur} ${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate  = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterType,   setFilterType]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth,  setFilterMonth]  = useState("all");
  const [filterYear,   setFilterYear]   = useState("all");
  const [expandedId,   setExpandedId]   = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "financialTransactions"), orderBy("createdAt", "desc")),
      snap => { setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  /* ── Derived ── */
  const years = [...new Set(transactions.map(t => {
    const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(0);
    return d.getFullYear();
  }))].filter(Boolean).sort((a, b) => b - a);

  const filtered = transactions.filter(t => {
    const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(0);
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterMonth !== "all" && d.getMonth() !== parseInt(filterMonth)) return false;
    if (filterYear !== "all" && d.getFullYear() !== parseInt(filterYear)) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        t.transactionId?.toLowerCase().includes(s) ||
        t.description?.toLowerCase().includes(s) ||
        t.relatedEntityId?.toLowerCase().includes(s) ||
        t.customerName?.toLowerCase().includes(s) ||
        t.customerEmail?.toLowerCase().includes(s) ||
        t.category?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const totalIncome  = filtered.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const totalTBR     = filtered.filter(t => t.type === "to_be_received" && t.status === "pending").reduce((s, t) => s + (t.amount || 0), 0);
  const totalRefunds = filtered.filter(t => t.type === "refund").reduce((s, t) => s + (t.amount || 0), 0);

  const totalIncomeLKR  = filtered.filter(t => t.type === "income").reduce((s, t) => s + (t.amountLKR || 0), 0);
  const totalExpenseLKR = filtered.filter(t => t.type === "expense").reduce((s, t) => s + (t.amountLKR || 0), 0);


  return (
    <FinanceReportsAndStatistics pageTitle="Transactions">

      <div style={{ marginBottom: "24px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>Financial Transactions</h3>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>
          {filtered.length} transactions · Complete audit trail of every financial event
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
        {[
          { label: "Income (USD)",       value: fmtMoney(totalIncome),    color: "#27a86e" },
          { label: "Income (LKR)",       value: `LKR ${totalIncomeLKR.toLocaleString("en-US",{minimumFractionDigits:2})}`, color: "#085041" },
          { label: "Expenses (USD)",     value: fmtMoney(totalExpense),   color: "#dc3545" },
          { label: "Expenses (LKR)",     value: `LKR ${totalExpenseLKR.toLocaleString("en-US",{minimumFractionDigits:2})}`, color: "#791f1f" },
          { label: "To Be Received",     value: fmtMoney(totalTBR),       color: "#0c447c" },
          { label: "Refunds",            value: fmtMoney(totalRefunds),   color: "#633806" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "14px 18px", flex: 1, minWidth: "130px" }}>
          <div style={{ fontSize: "10px", color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>{label}</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "18px", color }}>{value}</div>
        </div>
      ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px", alignItems: "center" }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by ID, booking ref, customer, category..."
          style={{ padding: "7px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "12px", color: "#00276b", outline: "none", flex: 1, minWidth: "220px" }}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ fontSize: "12px", padding: "7px 12px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }}>
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="refund">Refund</option>
          <option value="to_be_received">To Be Received</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: "12px", padding: "7px 12px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }}>
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="settled">Settled</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ fontSize: "12px", padding: "7px 12px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }}>
          <option value="all">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ fontSize: "12px", padding: "7px 12px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }}>
          <option value="all">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {(search || filterType !== "all" || filterStatus !== "all" || filterMonth !== "all" || filterYear !== "all") && (
          <button onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); setFilterMonth("all"); setFilterYear("all"); }}
            style={{ fontSize: "11px", color: "#7a9ab8", background: "none", border: "1px solid rgba(0,39,107,0.1)", padding: "7px 12px", borderRadius: "4px", cursor: "pointer" }}>
            Clear
          </button>
        )}
        <span style={{ fontSize: "12px", color: "#7a9ab8", marginLeft: "auto" }}>{filtered.length} results</span>
      </div>

      {/* Transaction list */}
      {loading ? <p style={{ color: "#7a9ab8" }}>Loading transactions...</p> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}>
          <div style={{ fontSize: "40px", opacity: 0.15, marginBottom: "12px" }}>◈</div>
          <p>No transactions found.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "rgba(0,39,107,0.04)" }}>
                {["Date","Transaction ID","Type","Category / Sub","Booking Ref","Customer","Method","Status","Amount",""].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const typePill   = TYPE_PILL[t.type]   || { background: "#f1f3f5", color: "#6c757d", label: t.type };
                const statusPill = STATUS_PILL[t.status] || { background: "#f1f3f5", color: "#6c757d", label: t.status };
                const isExpanded = expandedId === t.id;
                const amtColor   = t.type === "income" ? "#27a86e" : t.type === "expense" || t.type === "refund" ? "#dc3545" : "#0c447c";

                return (
                  <React.Fragment key={t.id}>
                    <tr
                      style={{ borderBottom: "1px solid rgba(0,39,107,0.05)", background: isExpanded ? "rgba(0,39,107,0.02)" : i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.005)", cursor: "pointer" }}
                      onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    >
                      <td style={{ padding: "10px 12px", color: "#7a9ab8", whiteSpace: "nowrap" }}>{fmtDate(t.createdAt)}</td>
                      <td style={{ padding: "10px 12px", color: "#adc6d8", fontSize: "11px", whiteSpace: "nowrap" }}>{t.transactionId || t.id.slice(0, 12)}</td>
                      <td style={{ padding: "10px 12px" }}>{pill(typePill)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ color: "#00276b", fontWeight: 500 }}>{t.category}</div>
                        {t.subCategory && <div style={{ fontSize: "10px", color: "#adc6d8" }}>{t.subCategory}</div>}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#adc6d8", fontSize: "11px" }}>{t.relatedEntityId || "—"}</td>
                      <td style={{ padding: "10px 12px", color: "#343a40" }}>
                        <div>{t.customerName || "—"}</div>
                        {t.customerEmail && <div style={{ fontSize: "10px", color: "#adc6d8" }}>{t.customerEmail}</div>}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#7a9ab8" }}>{t.paymentMethod || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>{pill(statusPill)}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "15px", color: amtColor, whiteSpace: "nowrap" }}>
                        {t.type === "expense" || t.type === "refund" ? "−" : ""}{fmtMoney(t.amount, t.currency)}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#adc6d8", fontSize: "10px" }}>{isExpanded ? "▲" : "▼"}</td>
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr style={{ background: "rgba(0,39,107,0.02)", borderBottom: "1px solid rgba(0,39,107,0.07)" }}>
                        <td colSpan={10} style={{ padding: "14px 20px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px 20px", fontSize: "12px" }}>
                            {[
                              ["Transaction ID",   t.transactionId || t.id],
                              ["LKR Amount", t.amountLKR ? `LKR ${t.amountLKR.toLocaleString("en-US",{minimumFractionDigits:2})}` : "—"],
                              ["Exchange Rate", t.exchangeRate ? `1 USD = LKR ${t.exchangeRate}` : "—"],
                              ["Receipt ID",       t.receiptId || "—"],
                              ["Booking ID",       t.relatedReservationId || "—"],
                              ["Booking Ref",      t.relatedEntityId || "—"],
                              ["Arrival Date",     t.arrivalDate || "—"],
                              ["Amendment",        t.isAmendment ? "Yes" : "No"],
                              ["Created By",       t.createdBy || "admin"],
                              ["Recorded At",      fmtDate(t.createdAt)],
                              
                            ].map(([k, v]) => (
                              <div key={k}>
                                <div style={{ fontSize: "10px", color: "#adc6d8", marginBottom: "2px" }}>{k}</div>
                                <div style={{ color: "#00276b", fontWeight: 500 }}>{v}</div>
                              </div>
                            ))}
                            {t.description && (
                              <div style={{ gridColumn: "1 / -1" }}>
                                <div style={{ fontSize: "10px", color: "#adc6d8", marginBottom: "2px" }}>Description</div>
                                <div style={{ color: "#343a40" }}>{t.description}</div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "rgba(0,39,107,0.03)", borderTop: "2px solid rgba(0,39,107,0.1)" }}>
                <td colSpan={8} style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase" }}>
                  Filtered Total · {filtered.length} records
                </td>
                <td style={{ padding: "12px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "15px", color: "#27a86e" }}>
                  {fmtMoney(totalIncome)} income
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </FinanceReportsAndStatistics>
  );
}