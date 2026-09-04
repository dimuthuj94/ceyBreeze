// src/pages/admin/financeManagement/TobeReceived.js
import React, { useEffect, useState } from "react";
import FinanceReportsAndStatistics from "../../../components/layouts/admin/FinanceReportsAndStatistics";
import {
  collection, onSnapshot, query, orderBy,
  doc, updateDoc, addDoc, serverTimestamp,
  getDocs, limit,
} from "firebase/firestore";
import { db } from "../../../firebase";
import ToBeReceivedRecordPaymentModal from "../../../components/modals/adminModals/financeManagementModals/ToBeReceivedRecordPaymentModal";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STATUS_PILL = {
  pending:   { background: "#faeeda", color: "#633806", label: "Pending"   },
  settled:   { background: "#e1f5ee", color: "#085041", label: "Settled"   },
  waived:    { background: "#e6f1fb", color: "#0c447c", label: "Waived"    },
  cancelled: { background: "#fcebeb", color: "#791f1f", label: "Cancelled" },
};
const TYPE_PILL = {
  preset:  { background: "#e6f1fb", color: "#0c447c" },
  custom:  { background: "#e1f5ee", color: "#085041" },
  vehicle: { background: "#faeeda", color: "#633806" },
};
const TYPE_LABEL = { preset: "Preset Tour", custom: "Custom Tour", vehicle: "Vehicle Only" };

const pill = (obj, text) => (
  <span style={{ ...obj, fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", textTransform: "uppercase", letterSpacing: "0.04em", display: "inline-block" }}>
    {text}
  </span>
);
const fmtUSD = (n) => `USD ${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmtLKR = (n) => `LKR ${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export default function TobeReceived() {
  const [records,      setRecords]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [filterType,   setFilterType]   = useState("all");
  const [filterMonth,  setFilterMonth]  = useState("all");
  const [filterYear,   setFilterYear]   = useState("all");
  const [search,       setSearch]       = useState("");
  const [expandedId,   setExpandedId]   = useState(null);
  const [latestRate,   setLatestRate]   = useState(null);

  /* ── Modal state ── */
  const [paymentModal, setPaymentModal] = useState({ show: false, record: null });

  useEffect(() => {
    getDocs(query(collection(db, "financeExchangeRates"), orderBy("createdAt", "desc"), limit(1)))
      .then(snap => { if (!snap.empty) setLatestRate(snap.docs[0].data()); }).catch(() => {});

    const unsub = onSnapshot(
      query(collection(db, "financeTobeReceived"), orderBy("createdAt", "desc")),
      snap => { setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const handleWaive = async (record) => {
    if (!window.confirm(`Waive the remaining balance for booking ${record.bookingReference}?`)) return;
    try {
      await updateDoc(doc(db, "financeTobeReceived", record.id), {
        status: "waived", waivedAt: serverTimestamp(), lastUpdated: serverTimestamp(),
      });
      await addDoc(collection(db, "financeAuditLog"), {
        action: "BALANCE_WAIVED", entity: "financeTobeReceived",
        bookingId: record.id, performedBy: "admin", performedAt: serverTimestamp(),
      });
    } catch (e) { alert("Failed: " + e.message); }
  };

  const years = [...new Set(records.map(r =>
    (r.createdAt?.toDate ? r.createdAt.toDate() : new Date(0)).getFullYear()
  ))].filter(Boolean).sort((a, b) => b - a);

  const filtered = records.filter(r => {
    const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(0);
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterType   !== "all" && r.bookingType !== filterType) return false;
    if (filterMonth  !== "all" && d.getMonth() !== parseInt(filterMonth)) return false;
    if (filterYear   !== "all" && d.getFullYear() !== parseInt(filterYear)) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return r.bookingReference?.toLowerCase().includes(s) ||
             r.customerName?.toLowerCase().includes(s) ||
             r.tourName?.toLowerCase().includes(s);
    }
    return true;
  });

  const totalPendingUSD = records.filter(r => r.status === "pending").reduce((s, r) => s + (r.remainingBalanceUSD || r.remainingBalance || 0), 0);
  const totalPendingLKR = records.filter(r => r.status === "pending").reduce((s, r) => s + (r.remainingBalanceLKR || 0), 0);

  const btnStyle = (bg, color) => ({
    background: bg, color, border: "none", fontSize: "11px", padding: "5px 11px",
    cursor: "pointer", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
  });

  return (
    <FinanceReportsAndStatistics pageTitle="To Be Received">

      {/* ── Modal ── */}
      <ToBeReceivedRecordPaymentModal
        show={paymentModal.show}
        onHide={() => setPaymentModal({ show: false, record: null })}
        record={paymentModal.record}
        latestRate={latestRate}
        onSettled={() => setPaymentModal({ show: false, record: null })}
      />

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>
          Payments To Be Received
        </h3>
        <div style={{ fontSize: "13px", color: "#7a9ab8" }}>
          Pending: <strong style={{ color: "#8B0000" }}>{fmtUSD(totalPendingUSD)}</strong>
          <span style={{ margin: "0 6px", color: "#adc6d8" }}>·</span>
          <strong style={{ color: "#8B0000" }}>{fmtLKR(totalPendingLKR)}</strong>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
        {[
          { label: "Pending (USD)",   value: fmtUSD(totalPendingUSD), color: "#8B0000" },
          { label: "Pending (LKR)",   value: fmtLKR(totalPendingLKR), color: "#633806" },
          { label: "Settled records", value: records.filter(r => r.status === "settled").length, color: "#27a86e" },
          { label: "Total records",   value: records.length,           color: "#00276b" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "14px 18px", flex: 1, minWidth: "140px" }}>
            <div style={{ fontSize: "10px", color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>{label}</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "18px", color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search booking, customer, tour..."
          style={{ padding: "7px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "12px", color: "#00276b", outline: "none", flex: 1, minWidth: "180px" }}
        />
        {[
          { val: filterStatus, set: setFilterStatus, opts: [["all","All Status"],["pending","Pending"],["settled","Settled"],["waived","Waived"]] },
          { val: filterType,   set: setFilterType,   opts: [["all","All Types"],["preset","Preset"],["custom","Custom"],["vehicle","Vehicle"]] },
        ].map(({ val, set, opts }, i) => (
          <select key={i} value={val} onChange={e => set(e.target.value)} style={{ fontSize: "12px", padding: "7px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }}>
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ fontSize: "12px", padding: "7px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }}>
          <option value="all">All Months</option>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ fontSize: "12px", padding: "7px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }}>
          <option value="all">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Records */}
      {loading ? <p style={{ color: "#7a9ab8" }}>Loading...</p> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}>
          <div style={{ fontSize: "40px", opacity: 0.15, marginBottom: "12px" }}>⏳</div>
          <p>No records found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map(r => {
            const statusObj  = STATUS_PILL[r.status] || { background: "#f1f3f5", color: "#6c757d", label: r.status };
            const typeObj    = TYPE_PILL[r.bookingType] || TYPE_PILL.preset;
            const isExpanded = expandedId === r.id;

            /* ── Fixed progress bar: includes settled amounts ── */
            const usdTotal   = r.totalAmountUSD  || r.totalAmount  || 0;
            const usdPaid    = (r.paidAmountUSD  || r.paidAmount   || 0) + (r.settledAmountUSD || 0);
            const pct        = usdTotal > 0 ? Math.min(100, (usdPaid / usdTotal) * 100) : 0;

            return (
              <div key={r.id} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                {/* Status stripe */}
                <div style={{ height: "3px", background: r.status === "pending" ? "#fac775" : r.status === "settled" ? "#27a86e" : r.status === "waived" ? "#56c6e8" : "#dc3545" }} />

                <div style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>

                    {/* Left info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "6px" }}>
                        {pill(typeObj, TYPE_LABEL[r.bookingType] || r.bookingType)}
                        {pill(statusObj, statusObj.label)}
                        <span style={{ fontSize: "11px", color: "#adc6d8" }}>{r.bookingReference}</span>
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#00276b", marginBottom: "2px" }}>{r.tourName}</div>
                      <div style={{ fontSize: "12px", color: "#7a9ab8" }}>{r.customerName} · {r.customerEmail}</div>
                      <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "3px" }}>
                        Arrival: {r.arrivalDate || "—"} · Receipt: {r.receiptId || "—"} · Rate: {r.exchangeRate ? `1 USD = LKR ${r.exchangeRate}` : "—"}
                      </div>
                      {(r.settledAmountUSD || 0) > 0 && (
                        <div style={{ fontSize: "11px", color: "#27a86e", marginTop: "3px" }}>
                          Previously settled: {fmtUSD(r.settledAmountUSD)}
                        </div>
                      )}
                    </div>

                    {/* Right amounts */}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                          <div style={{ fontSize: "9px", color: "#adc6d8", textAlign: "center", marginBottom: "4px" }}>USD</div>
                          <div style={{ fontSize: "10px", color: "#adc6d8" }}>Total</div>
                          <div style={{ fontSize: "13px", color: "#00276b", fontWeight: 600 }}>{fmtUSD(usdTotal)}</div>
                          <div style={{ fontSize: "10px", color: "#adc6d8", marginTop: "4px" }}>Collected</div>
                          <div style={{ fontSize: "13px", color: "#27a86e", fontWeight: 600 }}>{fmtUSD(usdPaid)}</div>
                          <div style={{ fontSize: "10px", color: "#adc6d8", marginTop: "4px" }}>Remaining</div>
                          <div style={{ fontSize: "13px", color: "#8B0000", fontWeight: 600 }}>{fmtUSD(r.remainingBalanceUSD ?? r.remainingBalance)}</div>
                        </div>
                        <div style={{ borderLeft: "1px solid rgba(0,39,107,0.07)", paddingLeft: "12px" }}>
                          <div style={{ fontSize: "9px", color: "#633806", textAlign: "center", marginBottom: "4px" }}>LKR</div>
                          <div style={{ fontSize: "10px", color: "#adc6d8" }}>Total</div>
                          <div style={{ fontSize: "13px", color: "#633806", fontWeight: 600 }}>{fmtLKR(r.totalAmountLKR)}</div>
                          <div style={{ fontSize: "10px", color: "#adc6d8", marginTop: "4px" }}>Collected</div>
                          <div style={{ fontSize: "13px", color: "#27a86e", fontWeight: 600 }}>{fmtLKR((r.paidAmountLKR || 0) + (r.settledAmountLKR || 0))}</div>
                          <div style={{ fontSize: "10px", color: "#adc6d8", marginTop: "4px" }}>Remaining</div>
                          <div style={{ fontSize: "13px", color: "#8B0000", fontWeight: 600 }}>{fmtLKR(r.remainingBalanceLKR)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ margin: "12px 0 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#adc6d8", marginBottom: "4px" }}>
                      <span>Payment Progress (USD)</span>
                      <span>{pct.toFixed(0)}% collected</span>
                    </div>
                    <div style={{ height: "5px", background: "rgba(0,39,107,0.08)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#27a86e" : "linear-gradient(90deg,#56c6e8,#00276b)", transition: "width 0.6s" }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {r.status === "pending" && (
                      <>
                        <button
                          style={btnStyle("#27a86e", "#fff")}
                          onClick={() => setPaymentModal({ show: true, record: r })}
                        >
                          + Record Payment
                        </button>
                        <button style={btnStyle("#e6f1fb", "#0c447c")} onClick={() => handleWaive(r)}>
                          Waive Balance
                        </button>
                      </>
                    )}
                    <button
                      style={btnStyle("rgba(0,39,107,0.06)", "#7a9ab8")}
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    >
                      {isExpanded ? "▲ Hide" : "▼ Details"}
                    </button>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div style={{ marginTop: "14px", borderTop: "1px solid rgba(0,39,107,0.06)", paddingTop: "14px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px 16px", fontSize: "12px" }}>
                        {[
                          ["Booking ID",       r.id],
                          ["Receipt ID",       r.receiptId || "—"],
                          ["Exchange Rate",    r.exchangeRate ? `1 USD = LKR ${r.exchangeRate}` : "—"],
                          ["Created",          fmtDate(r.createdAt)],
                          ["Last Updated",     fmtDate(r.lastUpdated)],
                          ["Settle Rate",      r.settleExchangeRate ? `1 USD = LKR ${r.settleExchangeRate}` : "—"],
                          ["Total Settled USD", r.settledAmountUSD ? fmtUSD(r.settledAmountUSD) : "—"],
                          ["Total Settled LKR", r.settledAmountLKR ? fmtLKR(r.settledAmountLKR) : "—"],
                          ["Last Settle Date",  r.settleDate || "—"],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <div style={{ fontSize: "10px", color: "#adc6d8", marginBottom: "2px" }}>{k}</div>
                            <div style={{ color: "#00276b", fontWeight: 500 }}>{v}</div>
                          </div>
                        ))}
                        {r.settleNotes && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            <div style={{ fontSize: "10px", color: "#adc6d8", marginBottom: "2px" }}>Notes</div>
                            <div style={{ color: "#343a40" }}>{r.settleNotes}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </FinanceReportsAndStatistics>
  );
}