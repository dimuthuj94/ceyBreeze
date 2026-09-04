// src/pages/admin/financeManagement/ReportsAndAnalytics.js
import React, { useEffect, useState } from "react";
import FinanceReportsAndStatistics from "../../../components/layouts/admin/FinanceReportsAndStatistics";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";

const MONTHS      = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fmtUSD = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmtLKR = (n) => `LKR ${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmt    = (n, cur) => cur === "LKR" ? fmtLKR(n) : fmtUSD(n);

const TableHeader = ({ cols }) => (
  <thead>
    <tr style={{ background: "rgba(0,39,107,0.04)" }}>
      {cols.map(c => (
        <th key={c} style={{
          padding: "10px 14px", textAlign: "left", fontSize: "10px",
          fontWeight: 700, color: c.includes("LKR") ? "#633806" : "#7a9ab8",
          textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap",
        }}>{c}</th>
      ))}
    </tr>
  </thead>
);

export default function ReportsAndAnalytics() {
  const [income,     setIncome]     = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [payroll,    setPayroll]    = useState([]);
  const [external,   setExternal]   = useState([]);
  const [vehCosts,   setVehCosts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [reportType, setReportType] = useState("pl");
  const [year,       setYear]       = useState(new Date().getFullYear());
  const [plCurrency, setPlCurrency] = useState("LKR"); // LKR is primary

  useEffect(() => {
    const load = async () => {
      const [i, e, p, x, v] = await Promise.all([
        getDocs(collection(db, "financeIncome")),
        getDocs(collection(db, "financeExpenses")),
        getDocs(collection(db, "financeDriverPayroll")),
        getDocs(collection(db, "financeExternalPayments")),
        getDocs(collection(db, "financeVehicleCosts")),
      ]);
      setIncome(i.docs.map(d => ({ id: d.id, ...d.data() })));
      setExpenses(e.docs.map(d => ({ id: d.id, ...d.data() })));
      setPayroll(p.docs.map(d => ({ id: d.id, ...d.data() })));
      setExternal(x.docs.map(d => ({ id: d.id, ...d.data() })));
      setVehCosts(v.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    load();
  }, []);

  /* ── Date helper ── */
  const getDate = (r) =>
    r.createdAt?.toDate ? r.createdAt.toDate() : r.date ? new Date(r.date) : null;

  const filterYear = (arr) =>
    arr.filter(r => { const d = getDate(r); return d && d.getFullYear() === parseInt(year); });

  /* ── USD monthly figures ── */
  const monthlyIncomeUSD = MONTHS.map((_, m) =>
    filterYear(income).filter(r => getDate(r)?.getMonth() === m)
      .reduce((s, r) => s + (r.amountUSD || r.amount || 0), 0)
  );

  const allExpensesFlat = (fy) => [
    ...filterYear(expenses),
    ...filterYear(payroll).map(r => ({ ...r, amount: r.netSalary || 0, amountLKR: r.netSalaryLKR || 0 })),
    ...filterYear(external).map(r => ({ ...r, amount: r.totalAmount || 0 })),
    ...filterYear(vehCosts),
  ];

  const monthlyExpensesUSD = MONTHS.map((_, m) =>
    allExpensesFlat().filter(r => getDate(r)?.getMonth() === m)
      .reduce((s, r) => s + (r.amountUSD || r.amount || 0), 0)
  );

  /* ── LKR monthly figures ── */
  const monthlyIncomeLKR = MONTHS.map((_, m) =>
    filterYear(income).filter(r => getDate(r)?.getMonth() === m)
      .reduce((s, r) => s + (r.amountLKR || ((r.amountUSD || r.amount || 0) * (r.exchangeRate || 1))), 0)
  );

  const monthlyExpensesLKR = MONTHS.map((_, m) =>
    allExpensesFlat().filter(r => getDate(r)?.getMonth() === m)
      .reduce((s, r) => s + (r.amountLKR || r.amount || 0), 0)
  );

  /* ── Totals ── */
  const totalIncomeUSD   = monthlyIncomeUSD.reduce((a, b) => a + b, 0);
  const totalExpensesUSD = monthlyExpensesUSD.reduce((a, b) => a + b, 0);
  const netProfitUSD     = totalIncomeUSD - totalExpensesUSD;

  const totalIncomeLKR   = monthlyIncomeLKR.reduce((a, b) => a + b, 0);
  const totalExpensesLKR = monthlyExpensesLKR.reduce((a, b) => a + b, 0);
  const netProfitLKR     = totalIncomeLKR - totalExpensesLKR;

  /* ── Active currency values ── */
  const monthlyIncome_  = plCurrency === "LKR" ? monthlyIncomeLKR   : monthlyIncomeUSD;
  const monthlyExpenses_= plCurrency === "LKR" ? monthlyExpensesLKR : monthlyExpensesUSD;
  const totalIncome_    = plCurrency === "LKR" ? totalIncomeLKR     : totalIncomeUSD;
  const totalExpenses_  = plCurrency === "LKR" ? totalExpensesLKR   : totalExpensesUSD;
  const netProfit_      = plCurrency === "LKR" ? netProfitLKR       : netProfitUSD;

  const years = [...new Set([...income, ...expenses]
    .map(r => getDate(r)?.getFullYear())
    .filter(Boolean)
  )].sort((a, b) => b - a);

  const tabStyle = (t) => ({
    padding: "8px 18px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
    border: "none", background: reportType === t ? "#00276b" : "transparent",
    color: reportType === t ? "#fff" : "#7a9ab8", borderRadius: "6px", transition: "all 0.2s",
  });

  const curTabStyle = (c) => ({
    padding: "5px 14px", fontSize: "11px", fontWeight: 700, border: "none", cursor: "pointer",
    background: plCurrency === c ? (c === "LKR" ? "#633806" : "#00276b") : "transparent",
    color: plCurrency === c ? "#fff" : "#7a9ab8", transition: "all 0.2s",
  });

  const expenseCategoryBreakdown = () => {
    const map = {};
    allExpensesFlat().forEach(r => {
      const cat = r.category || "Other";
      const val = plCurrency === "LKR"
        ? (r.amountLKR || r.amount || 0)
        : (r.amountUSD || r.amount || 0);
      map[cat] = (map[cat] || 0) + val;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const incomeBreakdown = () => {
    const map = {};
    filterYear(income).forEach(r => {
      const cat = r.category || "Other";
      const val = plCurrency === "LKR"
        ? (r.amountLKR || ((r.amountUSD || r.amount || 0) * (r.exchangeRate || 1)))
        : (r.amountUSD || r.amount || 0);
      map[cat] = (map[cat] || 0) + val;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  return (
    <FinanceReportsAndStatistics pageTitle="Reports & Analytics">

      {/* ── Header row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: 0 }}>
          Financial Reports
        </h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            style={{ fontSize: "12px", padding: "6px 12px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }}
          >
            {(years.length ? years : [new Date().getFullYear()]).map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Currency toggle */}
          <div style={{ display: "flex", background: "rgba(0,39,107,0.04)", padding: "3px", gap: "2px" }}>
            <button style={curTabStyle("LKR")} onClick={() => setPlCurrency("LKR")}>LKR ★</button>
            <button style={curTabStyle("USD")} onClick={() => setPlCurrency("USD")}>USD</button>
          </div>
        </div>
      </div>

      {/* ── LKR primary statement strip (always visible) ── */}
      <div style={{
        background: "#fffbf0", border: "1px solid rgba(253,174,0,0.25)",
        padding: "16px 22px", marginBottom: "24px",
        display: "flex", gap: "28px", flexWrap: "wrap", alignItems: "flex-end",
      }}>
        {[
          { label: "LKR Revenue",    value: fmtLKR(totalIncomeLKR),   color: "#27a86e" },
          { label: "LKR Expenses",   value: fmtLKR(totalExpensesLKR), color: "#dc3545" },
          { label: "LKR Net Profit", value: fmtLKR(netProfitLKR),     color: netProfitLKR >= 0 ? "#00276b" : "#dc3545" },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div style={{ fontSize: "10px", color: "#633806", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>{label}</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color }}>{value}</div>
          </div>
        ))}
        <div style={{ fontSize: "11px", color: "#adc6d8", paddingBottom: "4px" }}>
          ★ LKR figures are your primary financial statements · USD also shown below
        </div>
      </div>

      {/* ── Report type tabs ── */}
      <div style={{ display: "flex", gap: "4px", background: "rgba(0,39,107,0.04)", borderRadius: "8px", padding: "4px", marginBottom: "28px", flexWrap: "wrap" }}>
        {[
          { key: "pl",       label: "P & L" },
          { key: "monthly",  label: "Monthly Summary" },
          { key: "expenses", label: "Expense Breakdown" },
          { key: "income",   label: "Income Breakdown" },
        ].map(t => <button key={t.key} style={tabStyle(t.key)} onClick={() => setReportType(t.key)}>{t.label}</button>)}
      </div>

      {loading ? <p style={{ color: "#7a9ab8" }}>Loading data...</p> : (
        <>
          {/* ════ P & L ════ */}
          {reportType === "pl" && (
            <>
              {/* KPI cards — active currency */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
                {[
                  { label: `Total Revenue (${plCurrency})`,  value: fmt(totalIncome_,   plCurrency), color: "#27a86e" },
                  { label: `Total Expenses (${plCurrency})`, value: fmt(totalExpenses_, plCurrency), color: "#dc3545" },
                  { label: `Net Profit (${plCurrency})`,     value: fmt(netProfit_,     plCurrency), color: netProfit_ >= 0 ? "#00276b" : "#dc3545" },
                  { label: "Profit Margin",
                    value: totalIncome_ > 0 ? `${((netProfit_ / totalIncome_) * 100).toFixed(1)}%` : "N/A",
                    color: netProfit_ >= 0 ? "#27a86e" : "#dc3545" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "20px 22px", flex: 1, minWidth: "155px" }}>
                    <div style={{ fontSize: "10px", color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>{label}</div>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "24px", color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Monthly P&L table — active currency */}
              <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "auto", marginBottom: "16px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <TableHeader cols={[
                    "Month",
                    `Revenue (${plCurrency})`,
                    `Expenses (${plCurrency})`,
                    `Gross Profit (${plCurrency})`,
                    "Margin",
                  ]} />
                  <tbody>
                    {MONTHS.map((m, i) => {
                      const rev    = monthlyIncome_[i];
                      const exp    = monthlyExpenses_[i];
                      const profit = rev - exp;
                      const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : "—";
                      return (
                        <tr key={m} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)", background: i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.01)" }}>
                          <td style={{ padding: "10px 14px", color: "#00276b", fontWeight: 500 }}>{FULL_MONTHS[i]}</td>
                          <td style={{ padding: "10px 14px", color: "#27a86e" }}>{fmt(rev, plCurrency)}</td>
                          <td style={{ padding: "10px 14px", color: "#dc3545" }}>{fmt(exp, plCurrency)}</td>
                          <td style={{ padding: "10px 14px", color: profit >= 0 ? "#27a86e" : "#dc3545", fontWeight: 600 }}>{fmt(profit, plCurrency)}</td>
                          <td style={{ padding: "10px 14px", color: "#7a9ab8" }}>{margin !== "—" ? `${margin}%` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "rgba(0,39,107,0.03)", borderTop: "2px solid rgba(0,39,107,0.1)" }}>
                      <td style={{ padding: "12px 14px", fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase" }}>Total {year}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "15px", color: "#27a86e" }}>{fmt(totalIncome_, plCurrency)}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "15px", color: "#dc3545" }}>{fmt(totalExpenses_, plCurrency)}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "15px", color: netProfit_ >= 0 ? "#00276b" : "#dc3545" }}>{fmt(netProfit_, plCurrency)}</td>
                      <td style={{ padding: "12px 14px", color: "#7a9ab8" }}>{totalIncome_ > 0 ? `${((netProfit_ / totalIncome_) * 100).toFixed(1)}%` : "—"}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Side-by-side USD vs LKR comparison table */}
              <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "auto" }}>
                <div style={{ padding: "10px 16px", background: "rgba(0,39,107,0.02)", borderBottom: "1px solid rgba(0,39,107,0.06)" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    USD vs LKR — Side by Side
                  </span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <TableHeader cols={["Month","Revenue (USD)","Revenue (LKR)","Expenses (USD)","Expenses (LKR)","Net (USD)","Net (LKR)"]} />
                  <tbody>
                    {MONTHS.map((m, i) => {
                      const rUSD = monthlyIncomeUSD[i];
                      const rLKR = monthlyIncomeLKR[i];
                      const eUSD = monthlyExpensesUSD[i];
                      const eLKR = monthlyExpensesLKR[i];
                      const nUSD = rUSD - eUSD;
                      const nLKR = rLKR - eLKR;
                      return (
                        <tr key={m} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)", background: i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.01)" }}>
                          <td style={{ padding: "9px 12px", color: "#00276b", fontWeight: 500 }}>{FULL_MONTHS[i]}</td>
                          <td style={{ padding: "9px 12px", color: "#27a86e" }}>{fmtUSD(rUSD)}</td>
                          <td style={{ padding: "9px 12px", color: "#085041" }}>{fmtLKR(rLKR)}</td>
                          <td style={{ padding: "9px 12px", color: "#dc3545" }}>{fmtUSD(eUSD)}</td>
                          <td style={{ padding: "9px 12px", color: "#791f1f" }}>{fmtLKR(eLKR)}</td>
                          <td style={{ padding: "9px 12px", color: nUSD >= 0 ? "#27a86e" : "#dc3545", fontWeight: 600 }}>{fmtUSD(nUSD)}</td>
                          <td style={{ padding: "9px 12px", color: nLKR >= 0 ? "#085041" : "#791f1f", fontWeight: 600 }}>{fmtLKR(nLKR)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "rgba(0,39,107,0.03)", borderTop: "2px solid rgba(0,39,107,0.1)" }}>
                      <td style={{ padding: "11px 12px", fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase" }}>Total</td>
                      <td style={{ padding: "11px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: "#27a86e" }}>{fmtUSD(totalIncomeUSD)}</td>
                      <td style={{ padding: "11px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: "#085041" }}>{fmtLKR(totalIncomeLKR)}</td>
                      <td style={{ padding: "11px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: "#dc3545" }}>{fmtUSD(totalExpensesUSD)}</td>
                      <td style={{ padding: "11px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: "#791f1f" }}>{fmtLKR(totalExpensesLKR)}</td>
                      <td style={{ padding: "11px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: netProfitUSD >= 0 ? "#27a86e" : "#dc3545" }}>{fmtUSD(netProfitUSD)}</td>
                      <td style={{ padding: "11px 12px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: netProfitLKR >= 0 ? "#085041" : "#791f1f" }}>{fmtLKR(netProfitLKR)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {/* ════ Monthly Summary ════ */}
          {reportType === "monthly" && (
            <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <TableHeader cols={[
                  "Month",
                  "Inc. Records",
                  `Income (${plCurrency})`,
                  "Exp. Records",
                  `Expenses (${plCurrency})`,
                  `Net (${plCurrency})`,
                ]} />
                <tbody>
                  {MONTHS.map((m, i) => {
                    const mInc  = filterYear(income).filter(r => getDate(r)?.getMonth() === i);
                    const mExp  = allExpensesFlat().filter(r => getDate(r)?.getMonth() === i);
                    const incT  = plCurrency === "LKR"
                      ? mInc.reduce((s, r) => s + (r.amountLKR || ((r.amountUSD || r.amount || 0) * (r.exchangeRate || 1))), 0)
                      : mInc.reduce((s, r) => s + (r.amountUSD || r.amount || 0), 0);
                    const expT  = plCurrency === "LKR"
                      ? mExp.reduce((s, r) => s + (r.amountLKR || r.amount || 0), 0)
                      : mExp.reduce((s, r) => s + (r.amountUSD || r.amount || 0), 0);
                    return (
                      <tr key={m} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 500, color: "#00276b" }}>{FULL_MONTHS[i]}</td>
                        <td style={{ padding: "10px 14px", color: "#7a9ab8" }}>{mInc.length}</td>
                        <td style={{ padding: "10px 14px", color: "#27a86e" }}>{fmt(incT, plCurrency)}</td>
                        <td style={{ padding: "10px 14px", color: "#7a9ab8" }}>{mExp.length}</td>
                        <td style={{ padding: "10px 14px", color: "#dc3545" }}>{fmt(expT, plCurrency)}</td>
                        <td style={{ padding: "10px 14px", color: incT - expT >= 0 ? "#27a86e" : "#dc3545", fontWeight: 600 }}>{fmt(incT - expT, plCurrency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "rgba(0,39,107,0.03)", borderTop: "2px solid rgba(0,39,107,0.1)" }}>
                    <td colSpan={2} style={{ padding: "11px 14px", fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase" }}>Total {year}</td>
                    <td style={{ padding: "11px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: "#27a86e" }}>{fmt(totalIncome_, plCurrency)}</td>
                    <td />
                    <td style={{ padding: "11px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: "#dc3545" }}>{fmt(totalExpenses_, plCurrency)}</td>
                    <td style={{ padding: "11px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: netProfit_ >= 0 ? "#00276b" : "#dc3545" }}>{fmt(netProfit_, plCurrency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ════ Expense Breakdown ════ */}
          {reportType === "expenses" && (
            <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <TableHeader cols={["Category", `Total Amount (${plCurrency})`, "% of Expenses"]} />
                <tbody>
                  {expenseCategoryBreakdown().map(([cat, total], i) => (
                    <tr key={cat} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)", background: i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.01)" }}>
                      <td style={{ padding: "10px 14px", color: "#00276b", fontWeight: 500 }}>{cat}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: "#dc3545" }}>
                        {fmt(total, plCurrency)}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#7a9ab8" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ flex: 1, height: "6px", background: "rgba(0,39,107,0.07)", overflow: "hidden" }}>
                            <div style={{ width: `${totalExpenses_ > 0 ? (total / totalExpenses_ * 100) : 0}%`, height: "100%", background: "#00276b" }} />
                          </div>
                          <span style={{ whiteSpace: "nowrap" }}>{totalExpenses_ > 0 ? `${(total / totalExpenses_ * 100).toFixed(1)}%` : "—"}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "rgba(0,39,107,0.03)", borderTop: "2px solid rgba(0,39,107,0.1)" }}>
                    <td style={{ padding: "11px 14px", fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase" }}>Total</td>
                    <td style={{ padding: "11px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "15px", color: "#dc3545" }}>{fmt(totalExpenses_, plCurrency)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ════ Income Breakdown ════ */}
          {reportType === "income" && (
            <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <TableHeader cols={["Category", `Total Amount (${plCurrency})`, "% of Income"]} />
                <tbody>
                  {incomeBreakdown().map(([cat, total], i) => (
                    <tr key={cat} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)", background: i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.01)" }}>
                      <td style={{ padding: "10px 14px", color: "#00276b", fontWeight: 500 }}>{cat}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "14px", color: "#27a86e" }}>
                        {fmt(total, plCurrency)}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#7a9ab8" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ flex: 1, height: "6px", background: "rgba(0,39,107,0.07)", overflow: "hidden" }}>
                            <div style={{ width: `${totalIncome_ > 0 ? (total / totalIncome_ * 100) : 0}%`, height: "100%", background: "#27a86e" }} />
                          </div>
                          <span style={{ whiteSpace: "nowrap" }}>{totalIncome_ > 0 ? `${(total / totalIncome_ * 100).toFixed(1)}%` : "—"}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "rgba(0,39,107,0.03)", borderTop: "2px solid rgba(0,39,107,0.1)" }}>
                    <td style={{ padding: "11px 14px", fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase" }}>Total</td>
                    <td style={{ padding: "11px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "15px", color: "#27a86e" }}>{fmt(totalIncome_, plCurrency)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </FinanceReportsAndStatistics>
  );
}