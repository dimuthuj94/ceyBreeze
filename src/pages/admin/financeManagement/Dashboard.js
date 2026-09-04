// src/pages/admin/financeManagement/Dashboard.js
import React, { useEffect, useState } from "react";
import FinanceReportsAndStatistics from "../../../components/layouts/admin/FinanceReportsAndStatistics";
import {
  collection, getDocs, query, where,
  orderBy, limit, Timestamp,
} from "firebase/firestore";
import { db } from "../../../firebase";

const KPI = ({ label, value, sub, color = "#00276b", icon }) => (
  <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "20px 22px", flex: 1, minWidth: "180px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: "11px", color: "#7a9ab8", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>{label}</div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "6px" }}>{sub}</div>}
      </div>
      <span style={{ fontSize: "24px", opacity: 0.12, color }}>{icon}</span>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div style={{ marginBottom: "28px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
      <div style={{ flex: 1, height: "1px", background: "rgba(0,39,107,0.07)" }} />
      <span style={{ fontSize: "10px", fontWeight: 700, color: "#7a9ab8", letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{title}</span>
      <div style={{ flex: 1, height: "1px", background: "rgba(0,39,107,0.07)" }} />
    </div>
    {children}
  </div>
);

export default function FinanceDashboard() {
  const [stats, setStats] = useState({
    totalIncome: 0, totalExpenses: 0, netProfit: 0,
    pendingRefunds: 0, pendingPayroll: 0, unpaidExternal: 0,
    incomeThisMonth: 0, expensesThisMonth: 0,
  });
  const [recentIncome,   setRecentIncome]   = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [alerts,         setAlerts]         = useState([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const now   = new Date();
        const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const mTs    = Timestamp.fromDate(mStart);

        const [incSnap, expSnap, refSnap, paySnap, extSnap] = await Promise.all([
          getDocs(collection(db, "financeIncome")),
          getDocs(collection(db, "financeExpenses")),
          getDocs(query(collection(db, "financeRefunds"), where("status", "==", "pending"))),
          getDocs(query(collection(db, "financeDriverPayroll"), where("status", "==", "pending"))),
          getDocs(query(collection(db, "financeExternalPayments"), where("status", "==", "pending"))),
        ]);

        const totalIncome   = incSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
        const totalExpenses = expSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
        const incThisMonth  = incSnap.docs.filter(d => d.data().createdAt?.toDate?.() >= mStart).reduce((s, d) => s + (d.data().amount || 0), 0);
        const expThisMonth  = expSnap.docs.filter(d => d.data().createdAt?.toDate?.() >= mStart).reduce((s, d) => s + (d.data().amount || 0), 0);

        setStats({
          totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses,
          pendingRefunds:  refSnap.size,
          pendingPayroll:  paySnap.size,
          unpaidExternal:  extSnap.size,
          incomeThisMonth: incThisMonth,
          expensesThisMonth: expThisMonth,
        });

        const recentI = incSnap.docs
          .sort((a, b) => (b.data().createdAt?.toDate?.() || 0) - (a.data().createdAt?.toDate?.() || 0))
          .slice(0, 5)
          .map(d => ({ id: d.id, ...d.data() }));
        const recentE = expSnap.docs
          .sort((a, b) => (b.data().createdAt?.toDate?.() || 0) - (a.data().createdAt?.toDate?.() || 0))
          .slice(0, 5)
          .map(d => ({ id: d.id, ...d.data() }));

        setRecentIncome(recentI);
        setRecentExpenses(recentE);

        const al = [];
        if (refSnap.size  > 0) al.push({ type: "warn",    msg: `${refSnap.size} pending refund(s) require approval` });
        if (paySnap.size  > 0) al.push({ type: "info",    msg: `${paySnap.size} driver payroll(s) pending processing` });
        if (extSnap.size  > 0) al.push({ type: "info",    msg: `${extSnap.size} external payment(s) outstanding` });
        if (totalIncome - totalExpenses < 0) al.push({ type: "danger", msg: "Net profit is negative — review expenses" });
        setAlerts(al);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmtMoney = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate  = (ts) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const alertColor = { warn: "#faeeda", info: "#e6f1fb", danger: "#fcebeb" };
  const alertText  = { warn: "#633806", info: "#0c447c", danger: "#791f1f" };

  return (
    <FinanceReportsAndStatistics pageTitle="Finance Dashboard">
      {loading ? (
        <p style={{ color: "#7a9ab8" }}>Loading dashboard...</p>
      ) : (
        <>
          {/* Alerts */}
          {alerts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "24px" }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ background: alertColor[a.type], color: alertText[a.type], fontSize: "12px", padding: "10px 14px", borderRadius: "6px", fontWeight: 500 }}>
                  ⚠ {a.msg}
                </div>
              ))}
            </div>
          )}

          {/* KPI Row 1 */}
          <Section title="This Month">
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
              <KPI label="Income (Month)" value={fmtMoney(stats.incomeThisMonth)}   icon="↑" color="#27a86e" sub="All payment sources" />
              <KPI label="Expenses (Month)" value={fmtMoney(stats.expensesThisMonth)} icon="↓" color="#dc3545" sub="All expense categories" />
              <KPI label="Net (Month)"     value={fmtMoney(stats.incomeThisMonth - stats.expensesThisMonth)} icon="=" color={stats.incomeThisMonth - stats.expensesThisMonth >= 0 ? "#00276b" : "#dc3545"} sub="Profit / Loss" />
            </div>
          </Section>

          {/* KPI Row 2 */}
          <Section title="All Time">
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
              <KPI label="Total Income"   value={fmtMoney(stats.totalIncome)}   icon="◈" color="#27a86e" />
              <KPI label="Total Expenses" value={fmtMoney(stats.totalExpenses)} icon="◇" color="#dc3545" />
              <KPI label="Net Profit"     value={fmtMoney(stats.netProfit)}     icon="◉" color={stats.netProfit >= 0 ? "#00276b" : "#dc3545"} />
            </div>
          </Section>

          {/* Action Required */}
          <Section title="Action Required">
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {[
                { label: "Pending Refunds",   value: stats.pendingRefunds,  color: "#8B0000" },
                { label: "Pending Payroll",   value: stats.pendingPayroll,  color: "#633806" },
                { label: "Unpaid External",   value: stats.unpaidExternal,  color: "#0c447c" },
              ].map(item => (
                <div key={item.label} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "16px 20px", flex: 1, minWidth: "140px" }}>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "32px", color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: "11px", color: "#7a9ab8", marginTop: "4px" }}>{item.label}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Recent Transactions */}
          <Section title="Recent Transactions">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {/* Recent Income */}
              <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                <div style={{ background: "#00276b", padding: "10px 16px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>Recent Income</span>
                </div>
                <div style={{ padding: "0" }}>
                  {recentIncome.length === 0 ? (
                    <p style={{ padding: "16px", color: "#adc6d8", fontSize: "12px" }}>No income records yet.</p>
                  ) : recentIncome.map((r, i) => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: i < recentIncome.length - 1 ? "1px solid rgba(0,39,107,0.05)" : "none" }}>
                      <div>
                        <div style={{ fontSize: "13px", color: "#00276b", fontWeight: 500 }}>{r.description || r.category || "Income"}</div>
                        <div style={{ fontSize: "11px", color: "#adc6d8" }}>{fmtDate(r.createdAt)}</div>
                      </div>
                      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "15px", color: "#27a86e" }}>{fmtMoney(r.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Expenses */}
              <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                <div style={{ background: "#8B0000", padding: "10px 16px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#faeeda", letterSpacing: "0.12em", textTransform: "uppercase" }}>Recent Expenses</span>
                </div>
                <div>
                  {recentExpenses.length === 0 ? (
                    <p style={{ padding: "16px", color: "#adc6d8", fontSize: "12px" }}>No expense records yet.</p>
                  ) : recentExpenses.map((r, i) => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: i < recentExpenses.length - 1 ? "1px solid rgba(0,39,107,0.05)" : "none" }}>
                      <div>
                        <div style={{ fontSize: "13px", color: "#00276b", fontWeight: 500 }}>{r.description || r.category || "Expense"}</div>
                        <div style={{ fontSize: "11px", color: "#adc6d8" }}>{fmtDate(r.createdAt)}</div>
                      </div>
                      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "15px", color: "#dc3545" }}>{fmtMoney(r.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>
        </>
      )}
    </FinanceReportsAndStatistics>
  );
}