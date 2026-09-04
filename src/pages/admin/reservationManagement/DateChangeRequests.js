// src/pages/admin/reservationManagement/DateChangeRequests.js
import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";
import ApproveDateChangeModal from "../../../components/modals/adminModals/tourReservationModals/ApproveDateChangeModal";
import RejectDateChangeModal  from "../../../components/modals/adminModals/tourReservationModals/RejectDateChangeModal";
import ReservationManagement from "../../../components/layouts/admin/ReservationManagement";

const STATUS_PILL = {
  pending:  { background: "#faeeda", color: "#633806", label: "Pending" },
  approved: { background: "#e1f5ee", color: "#085041", label: "Approved" },
  rejected: { background: "#fcebeb", color: "#791f1f", label: "Rejected" },
};
const TYPE_PILL = {
  preset:  { background: "#e6f1fb", color: "#0c447c" },
  custom:  { background: "#e1f5ee", color: "#085041" },
  vehicle: { background: "#faeeda", color: "#633806" },
};
const TYPE_LABEL = { preset: "Preset Tour", custom: "Custom Tour", vehicle: "Vehicle Only" };

// pill() function — change borderRadius
const pill = (obj, text) => (
  <span style={{ ...obj, fontSize: "10px", fontWeight: 700, padding: "2px 9px",
    /* borderRadius: "12px" → */ textTransform: "uppercase", letterSpacing: "0.04em", display: "inline-block" }}>
    {text}
  </span>
);

// btn() function — remove borderRadius
const btn = (label, bg, color, onClick, disabled = false) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background: bg, color, border: "none", fontSize: "11px", padding: "5px 12px",
      /* no borderRadius */ cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, opacity: disabled ? 0.5 : 1 }}
  >
    {label}
  </button>
);

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtDateStr = (str) => {
  if (!str) return "—";
  try { return new Date(str).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return str; }
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function DateChangeRequests() {
  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState("pending");
  const [selectedReq, setSelectedReq] = useState(null);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject,  setShowReject]  = useState(false);

  // Filters for history
  const [filterType,  setFilterType]  = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear,  setFilterYear]  = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "bookingDateChangeRequests"), orderBy("requestedAt", "desc")),
      snap => {
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const pending = requests.filter(r => r.status === "pending");
  const history = requests.filter(r => r.status !== "pending");

  const years = [...new Set(history.map(r => {
    const d = r.processedAt?.toDate ? r.processedAt.toDate() : new Date(r.requestedAt?.toDate?.() || 0);
    return d.getFullYear();
  }))].sort((a, b) => b - a);

  const filteredHistory = history.filter(r => {
    const d = r.requestedAt?.toDate ? r.requestedAt.toDate() : new Date(0);
    if (filterType !== "all" && r.bookingType !== filterType) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterMonth !== "all" && d.getMonth() !== parseInt(filterMonth)) return false;
    if (filterYear !== "all" && d.getFullYear() !== parseInt(filterYear)) return false;
    return true;
  });

  const approvedCount = history.filter(r => r.status === "approved").length;
  const rejectedCount = history.filter(r => r.status === "rejected").length;

const tabStyle = (t) => ({
  padding: "8px 20px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
  border: "none", background: activeTab === t ? "#00276b" : "transparent",
  color: activeTab === t ? "#fff" : "#7a9ab8", /* no borderRadius */
  transition: "all 0.2s",
});


  const ImpactBadge = ({ impact }) => {
    if (!impact || impact === "To be calculated by admin") return <span style={{ fontSize: "11px", color: "#7a9ab8" }}>TBD by admin</span>;
    const isPos = impact.startsWith("+");
    return (
      <span style={{ fontSize: "12px", fontWeight: 700, color: isPos ? "#dc3545" : "#27a86e", background: isPos ? "rgba(220,53,69,0.07)" : "rgba(39,168,110,0.07)", padding: "2px 8px", /* borderRadius: "6px" */ }}>
        {impact}
      </span>
    );
  };

  return (
    <ReservationManagement>
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h4 style={{ color: "#00276b", fontFamily: "'DM Serif Display', serif", fontWeight: 400, margin: "0 0 4px" }}>
          Date Change Requests
        </h4>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>
          {pending.length} pending · {approvedCount} approved · {rejectedCount} rejected
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", background: "rgba(0,39,107,0.04)", /* borderRadius: "8px", */ padding: "4px", marginBottom: "24px", width: "fit-content" }}>
        <button style={tabStyle("pending")} onClick={() => setActiveTab("pending")}>
          Pending {pending.length > 0 && <span style={{ background: "#e24b4a", color: "#fff", /* borderRadius: "10px", */ fontSize: "10px", padding: "1px 6px", marginLeft: "6px" }}>{pending.length}</span>}
        </button>
        <button style={tabStyle("history")} onClick={() => setActiveTab("history")}>History</button>
      </div>

      {/* ── PENDING TAB ── */}
      {activeTab === "pending" && (
        <>
          {loading ? (
            <p style={{ color: "#6c757d" }}>Loading requests...</p>
          ) : pending.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: "40px", opacity: 0.15, marginBottom: "12px" }}>📅</div>
              <p style={{ color: "#7a9ab8", fontSize: "14px" }}>No pending date change requests.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
              {pending.map(req => (
                <div key={req.id} style={{ background: "#fff", border: "1px solid #e9ecef", /* borderRadius: "10px", */ overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f3f5" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      {pill(TYPE_PILL[req.bookingType] || TYPE_PILL.preset, TYPE_LABEL[req.bookingType] || req.bookingType)}
                      {pill(STATUS_PILL["pending"], "Pending")}
                    </div>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#00276b", margin: "0 0 2px" }}>{req.tourName}</p>
                    <p style={{ fontSize: "11px", color: "#adb5bd", margin: "0 0 12px" }}>{req.bookingReference} · {req.customerEmail}</p>

                    {/* Date comparison */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "8px", alignItems: "center", background: "rgba(0,39,107,0.03)", /* borderRadius: "6px", */ padding: "10px 12px", marginBottom: "10px" }}>
                      <div>
                        <div style={{ fontSize: "9px", color: "#adc6d8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>Current</div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#00276b" }}>{fmtDateStr(req.currentArrivalDate)}</div>
                        {req.currentDepartureDate && <div style={{ fontSize: "11px", color: "#7a9ab8" }}>→ {fmtDateStr(req.currentDepartureDate)}</div>}
                        <div style={{ fontSize: "11px", color: "#7a9ab8" }}>{req.currentNights} nights · {req.currentTotalPrice}</div>
                      </div>
                      <div style={{ fontSize: "18px", color: "#adc6d8" }}>→</div>
                      <div>
                        <div style={{ fontSize: "9px", color: "#adc6d8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>Requested</div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#00276b" }}>{fmtDateStr(req.newArrivalDate)}</div>
                        {req.newDepartureDate && <div style={{ fontSize: "11px", color: "#7a9ab8" }}>→ {fmtDateStr(req.newDepartureDate)}</div>}
                        <div style={{ fontSize: "11px", color: "#7a9ab8" }}>{req.newNights} nights</div>
                      </div>
                    </div>

                    {/* Price impact */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: req.reason ? "8px" : "0" }}>
                      <span style={{ fontSize: "11px", color: "#7a9ab8" }}>Est. Price Impact</span>
                      <ImpactBadge impact={req.estimatedPriceImpact} />
                    </div>

                    {req.nightsDifference !== 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#7a9ab8" }}>
                        <span>Night Difference</span>
                        <span style={{ color: req.nightsDifference > 0 ? "#dc3545" : "#27a86e", fontWeight: 600 }}>
                          {req.nightsDifference > 0 ? "+" : ""}{req.nightsDifference} nights
                        </span>
                      </div>
                    )}

                    {req.reason && (
                      <div style={{ background: "rgba(0,39,107,0.03)", border: "1px solid rgba(0,39,107,0.07)", padding: "8px 10px", marginTop: "10px", fontSize: "12px", color: "#6c757d", /* borderRadius: "4px" */ }}>
                        <strong>Customer reason:</strong> {req.reason}
                      </div>
                    )}

                    <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "8px" }}>Requested {fmtDate(req.requestedAt)}</div>
                  </div>
                  <div style={{ padding: "10px 14px", background: "#fafafa", display: "flex", gap: "8px" }}>
                    {btn("Approve & Apply", "#27a86e", "#fff", () => { setSelectedReq(req); setShowApprove(true); })}
                    {btn("Reject", "#8B0000", "#fff", () => { setSelectedReq(req); setShowReject(true); })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === "history" && (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
            {[
              { label: "Total Requests",   value: requests.length },
              { label: "Approved",         value: approvedCount },
              { label: "Rejected",         value: rejectedCount },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.08)", /* borderRadius: "8px", */ padding: "14px 16px" }}>
                <div style={{ fontSize: "11px", color: "#7a9ab8", marginBottom: "4px" }}>{label}</div>
                <div style={{ fontSize: "20px", fontFamily: "'DM Serif Display', serif", color: "#00276b" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "#7a9ab8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Filter</span>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ fontSize: "12px", padding: "5px 10px", border: "1px solid rgba(0,39,107,0.15)", /* borderRadius: "6px", */ color: "#00276b" }}>
              <option value="all">All Types</option>
              <option value="preset">Preset</option>
              <option value="custom">Custom</option>
              <option value="vehicle">Vehicle</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: "12px", padding: "5px 10px", border: "1px solid rgba(0,39,107,0.15)", /* borderRadius: "6px", */ color: "#00276b" }}>
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ fontSize: "12px", padding: "5px 10px", border: "1px solid rgba(0,39,107,0.15)", /* borderRadius: "6px", */ color: "#00276b" }}>
              <option value="all">All Months</option>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ fontSize: "12px", padding: "5px 10px", border: "1px solid rgba(0,39,107,0.15)", /* borderRadius: "6px", */ color: "#00276b" }}>
              <option value="all">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {(filterType !== "all" || filterMonth !== "all" || filterYear !== "all" || filterStatus !== "all") && (
              <button onClick={() => { setFilterType("all"); setFilterMonth("all"); setFilterYear("all"); setFilterStatus("all"); }}
                style={{ fontSize: "11px", color: "#7a9ab8", background: "none", border: "1px solid rgba(0,39,107,0.1)", padding: "5px 10px", /* borderRadius: "6px", */ cursor: "pointer" }}>
                Clear
              </button>
            )}
            <span style={{ fontSize: "12px", color: "#7a9ab8", marginLeft: "auto" }}>{filteredHistory.length} result{filteredHistory.length !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <p style={{ color: "#6c757d" }}>Loading...</p>
          ) : filteredHistory.length === 0 ? (
            <p style={{ color: "#7a9ab8", textAlign: "center", padding: "40px 0" }}>No records match the selected filters.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredHistory.map(req => (
                <div key={req.id} style={{ background: "#fff", border: "1px solid #e9ecef", /* borderRadius: "8px",  */padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "5px" }}>
                        {pill(STATUS_PILL[req.status], STATUS_PILL[req.status]?.label)}
                        {pill(TYPE_PILL[req.bookingType] || TYPE_PILL.preset, TYPE_LABEL[req.bookingType] || req.bookingType)}
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#00276b" }}>{req.bookingReference}</span>
                      </div>
                      <div style={{ fontSize: "13px", color: "#343a40", marginBottom: "3px" }}>{req.tourName}</div>
                      <div style={{ fontSize: "11px", color: "#7a9ab8" }}>{req.customerEmail}</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "11px", color: "#7a9ab8" }}>
                      <div>{fmtDateStr(req.currentArrivalDate)} → {fmtDateStr(req.newArrivalDate)}</div>
                      <div>Requested: {fmtDate(req.requestedAt)}</div>
                      <div>Processed: {fmtDate(req.processedAt)}</div>
                      {req.approvedPrice && (
                        <div style={{ color: "#27a86e", fontWeight: 600, marginTop: "2px" }}>New price: {req.approvedPrice}</div>
                      )}
                      {req.rejectionReason && (
                        <div style={{ color: "#8B0000", marginTop: "2px", maxWidth: "220px" }}>Rejected: {req.rejectionReason.slice(0, 50)}{req.rejectionReason.length > 50 ? "..." : ""}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ApproveDateChangeModal
        show={showApprove}
        onHide={() => setShowApprove(false)}
        request={selectedReq}
        onDone={() => setSelectedReq(null)}
      />
      <RejectDateChangeModal
        show={showReject}
        onHide={() => setShowReject(false)}
        request={selectedReq}
        onDone={() => setSelectedReq(null)}
      />
    </div>
  </ReservationManagement>
  );
}