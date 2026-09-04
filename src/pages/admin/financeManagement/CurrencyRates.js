// src/pages/admin/financeManagement/CurrencyRates.js
import React, { useEffect, useState } from "react";
import FinanceReportsAndStatistics from "../../../components/layouts/admin/FinanceReportsAndStatistics";
import {
  collection, onSnapshot, query, orderBy, getDocs, limit,
} from "firebase/firestore";
import { db } from "../../../firebase";
import ExchangeRateModal from "../../../components/modals/adminModals/financeManagementModals/ExchangeRateModal";

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const fmtMoney = (n, cur = "LKR") => `${cur} ${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CurrencyRates() {
  const [rates,       setRates]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [latestRate,  setLatestRate]  = useState(null);
  const [testUSD,     setTestUSD]     = useState("100");

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "financeExchangeRates"), orderBy("createdAt", "desc")),
      snap => {
        const r = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRates(r);
        if (r.length > 0) setLatestRate(r[0]);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const testLKR = latestRate ? (parseFloat(testUSD) || 0) * latestRate.rateUSDtoLKR : 0;

  const btnStyle = (bg, color) => ({
    background: bg, color, border: "none", fontSize: "11px", padding: "7px 14px",
    cursor: "pointer", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
  });

  return (
    <FinanceReportsAndStatistics pageTitle="Currency Rates">

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
        <div>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>USD → LKR Exchange Rates</h3>
          <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>
            Customer payments are in <strong style={{ color: "#00276b" }}>USD</strong> · Internal financial statements are in <strong style={{ color: "#00276b" }}>LKR</strong>
          </p>
        </div>
        <button style={btnStyle("#00276b", "#fff")} onClick={() => setShowModal(true)}>+ Set Today's Rate</button>
      </div>

      {/* Current rate hero */}
      {latestRate ? (
        <div style={{ background: "#00276b", padding: "24px 28px", marginBottom: "24px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "8px" }}>
              Current Rate · {latestRate.date}
            </div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "36px", color: "#fff", marginBottom: "6px" }}>
              1 USD = LKR {latestRate.rateUSDtoLKR?.toLocaleString()}
            </div>
            {latestRate.note && <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{latestRate.note}</div>}
          </div>
        </div>
      ) : !loading && (
        <div style={{ background: "#faeeda", border: "1px solid rgba(255,160,0,0.3)", padding: "14px 18px", marginBottom: "24px", fontSize: "13px", color: "#633806" }}>
          ⚠ No exchange rate set. Please set today's rate before recording any income.
        </div>
      )}

      {/* Currency converter */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "20px 22px", marginBottom: "24px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>Quick Converter</div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: "10px", color: "#adc6d8", display: "block", marginBottom: "4px" }}>USD Amount</label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#00276b" }}>$</span>
              <input type="number" value={testUSD} onChange={e => setTestUSD(e.target.value)} style={{ width: "140px", padding: "9px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "14px", color: "#00276b", outline: "none" }} />
            </div>
          </div>
          <div style={{ fontSize: "20px", color: "#adc6d8", marginTop: "14px" }}>→</div>
          <div>
            <label style={{ fontSize: "10px", color: "#adc6d8", display: "block", marginBottom: "4px" }}>LKR Equivalent</label>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "24px", color: "#00276b" }}>
              {latestRate ? `LKR ${testLKR.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
            </div>
          </div>
          {latestRate && (
            <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "14px" }}>
              at rate 1 USD = LKR {latestRate.rateUSDtoLKR}
            </div>
          )}
        </div>
      </div>

      {/* Rate history */}
      {loading ? <p style={{ color: "#7a9ab8" }}>Loading...</p> : rates.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}>
          <p>No exchange rates recorded yet.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "rgba(0,39,107,0.04)" }}>
                {["Date","Rate (1 USD = LKR)","Note","Set By","Recorded At"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rates.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)", background: i === 0 ? "rgba(0,39,107,0.02)" : i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.005)" }}>
                  <td style={{ padding: "10px 14px", color: "#00276b", fontWeight: i === 0 ? 700 : 400 }}>
                    {r.date} {i === 0 && <span style={{ fontSize: "9px", background: "#e1f5ee", color: "#085041", padding: "1px 6px", borderRadius: "8px", marginLeft: "6px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Current</span>}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "'DM Serif Display', serif", fontSize: "16px", color: "#00276b" }}>
                    {r.rateUSDtoLKR?.toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#7a9ab8" }}>{r.note || "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#adc6d8" }}>{r.setBy || "admin"}</td>
                  <td style={{ padding: "10px 14px", color: "#adc6d8" }}>{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ExchangeRateModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onRateSet={rate => setLatestRate(rate)}
      />
    </FinanceReportsAndStatistics>
  );
}