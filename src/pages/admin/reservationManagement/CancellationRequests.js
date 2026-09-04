// src/pages/admin/reservationManagement/CancellationRequests.js
import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";
import ApproveCancellationModal from "../../../components/modals/adminModals/tourReservationModals/ApproveCancellationModal";
import RejectCancellationModal  from "../../../components/modals/adminModals/tourReservationModals/RejectCancellationModal";
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

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function CancellationRequests() {
  const [requests,      setRequests]      = useState([]);
  const [cancelled,     setCancelled]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [cancelLoading, setCancelLoading] = useState(true);
  const [activeTab,     setActiveTab]     = useState("pending"); // pending | history
  const [selectedReq,   setSelectedReq]   = useState(null);
  const [showApprove,   setShowApprove]   = useState(false);
  const [showReject,    setShowReject]     = useState(false);

  // Filters for history
  const [filterType,  setFilterType]  = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear,  setFilterYear]  = useState("all");

  // Load cancellation requests
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "bookingCancellationRequests"), orderBy("requestedAt", "desc")),
      snap => {
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  // Load cancelled bookings
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "cancelledBookings"), orderBy("cancelledAt", "desc")),
      snap => {
        setCancelled(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCancelLoading(false);
      },
      () => setCancelLoading(false)
    );
    return () => unsub();
  }, []);

  const pending  = requests.filter(r => r.status === "pending");
  const history  = requests.filter(r => r.status !== "pending");

  // Derive available years from cancelled
  const years = [...new Set(cancelled.map(b => {
    const d = b.cancelledAt?.toDate ? b.cancelledAt.toDate() : new Date(b.cancelledAt);
    return d.getFullYear();
  }))].sort((a, b) => b - a);

  // Filter cancelled bookings
  const getBookingType = (b) => b.bookingType || (b._col?.includes("vehicle") ? "vehicle" : b._col?.includes("custom") ? "custom" : "preset");
  const filteredCancelled = cancelled.filter(b => {
    const d = b.cancelledAt?.toDate ? b.cancelledAt.toDate() : new Date(b.cancelledAt || 0);
    const type = getBookingType(b);
    if (filterType !== "all" && type !== filterType) return false;
    if (filterMonth !== "all" && d.getMonth() !== parseInt(filterMonth)) return false;
    if (filterYear !== "all" && d.getFullYear() !== parseInt(filterYear)) return false;
    return true;
  });

  // Stats
  const totalRefunded = cancelled.reduce((s, b) => s + (b.refundAmount || 0), 0);

  const tabStyle = (t) => ({
  padding: "8px 20px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
  border: "none", background: activeTab === t ? "#00276b" : "transparent",
  color: activeTab === t ? "#fff" : "#7a9ab8", /* no borderRadius */
  transition: "all 0.2s",
});

  return (
    <ReservationManagement>
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h4 style={{ color: "#00276b", fontFamily: "'DM Serif Display', serif", fontWeight: 400, margin: "0 0 4px" }}>
          Cancellation Requests
        </h4>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>
          {pending.length} pending · {cancelled.length} total cancellations · ${totalRefunded.toFixed(2)} refunded
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", background: "rgba(0,39,107,0.04)", /* borderRadius: "8px", */ padding: "4px", marginBottom: "24px", width: "fit-content" }}>
        <button style={tabStyle("pending")} onClick={() => setActiveTab("pending")}>
          Pending Requests {pending.length > 0 && <span style={{ background: "#e24b4a", color: "#fff", /* borderRadius: "10px", */ fontSize: "10px", padding: "1px 6px", marginLeft: "6px" }}>{pending.length}</span>}
        </button>
        <button style={tabStyle("history")} onClick={() => setActiveTab("history")}>All Cancellations</button>
      </div>

      {/* ── PENDING TAB ── */}
      {activeTab === "pending" && (
        <>
          {loading ? (
            <p style={{ color: "#6c757d" }}>Loading requests...</p>
          ) : pending.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: "40px", opacity: 0.15, marginBottom: "12px" }}>✓</div>
              <p style={{ color: "#7a9ab8", fontSize: "14px" }}>No pending cancellation requests.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
              {pending.map(req => (
                <div key={req.id} style={{ background: "#fff", border: "1px solid #e9ecef", /* borderRadius: "10px", */ overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f3f5" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      {pill(TYPE_PILL[req.bookingType] || TYPE_PILL.preset, TYPE_LABEL[req.bookingType] || req.bookingType)}
                      {pill(STATUS_PILL[req.status], STATUS_PILL[req.status]?.label)}
                    </div>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#00276b", margin: "0 0 2px" }}>{req.tourName}</p>
                    <p style={{ fontSize: "11px", color: "#adb5bd", margin: "0 0 10px" }}>{req.bookingReference}</p>
                    {[
                      ["Customer",     req.customerEmail],
                      ["Arrival",      req.arrivalDate || "—"],
                      ["Total Price",  req.totalPrice],
                      ["Requested",    fmtDate(req.requestedAt)],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6c757d", marginBottom: "3px" }}>
                        <span>{k}</span>
                        <span style={{ color: "#343a40", fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                    {req.reason && (
                      <div style={{ background: "rgba(0,39,107,0.03)", border: "1px solid rgba(0,39,107,0.07)", padding: "8px 10px", marginTop: "10px", fontSize: "12px", color: "#6c757d", /* borderRadius: "4px" */ }}>
                        <strong>Reason:</strong> {req.reason}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "10px 14px", background: "#fafafa", display: "flex", gap: "8px" }}>
                    {btn("Approve", "#27a86e", "#fff", () => { setSelectedReq(req); setShowApprove(true); })}
                    {btn("Reject",  "#8B0000", "#fff", () => { setSelectedReq(req); setShowReject(true); })}
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
          {/* Stats strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
            {[
              { label: "Total Cancelled",  value: cancelled.length },
              { label: "Total Refunded",   value: `$${totalRefunded.toFixed(2)}` },
              { label: "Approved",         value: history.filter(r => r.status === "approved").length },
              { label: "Rejected",         value: history.filter(r => r.status === "rejected").length },
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
              <option value="preset">Preset Tour</option>
              <option value="custom">Custom Tour</option>
              <option value="vehicle">Vehicle Only</option>
            </select>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ fontSize: "12px", padding: "5px 10px", border: "1px solid rgba(0,39,107,0.15)", /* borderRadius: "6px", */ color: "#00276b" }}>
              <option value="all">All Months</option>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ fontSize: "12px", padding: "5px 10px", border: "1px solid rgba(0,39,107,0.15)", /* borderRadius: "6px", */ color: "#00276b" }}>
              <option value="all">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {(filterType !== "all" || filterMonth !== "all" || filterYear !== "all") && (
              <button onClick={() => { setFilterType("all"); setFilterMonth("all"); setFilterYear("all"); }}
                style={{ fontSize: "11px", color: "#7a9ab8", background: "none", border: "1px solid rgba(0,39,107,0.1)", padding: "5px 10px", /* borderRadius: "6px", */ cursor: "pointer" }}>
                Clear
              </button>
            )}
            <span style={{ fontSize: "12px", color: "#7a9ab8", marginLeft: "auto" }}>{filteredCancelled.length} result{filteredCancelled.length !== 1 ? "s" : ""}</span>
          </div>

          {cancelLoading ? (
            <p style={{ color: "#6c757d" }}>Loading cancellations...</p>
          ) : filteredCancelled.length === 0 ? (
            <p style={{ color: "#7a9ab8", textAlign: "center", padding: "40px 0" }}>No cancellations match the selected filters.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
              {filteredCancelled.map(b => {
                const type = getBookingType(b);
                return (
                  <div key={b.id} style={{ background: "#fff", border: "1px solid #e9ecef", /* borderRadius: "10px", */ overflow: "hidden" }}>
                    <div style={{ background: "#8B0000", padding: "3px 12px" }}>
                      <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Cancelled</span>
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      {pill(TYPE_PILL[type] || TYPE_PILL.preset, TYPE_LABEL[type] || type)}
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#00276b", margin: "6px 0 2px" }}>
                        {b.tourName || (type === "vehicle" ? "Vehicle Reservation" : b._col?.includes("custom") ? "Custom Tour" : "Preset Tour")}
                      </p>
                      <p style={{ fontSize: "11px", color: "#adb5bd", margin: "0 0 10px" }}>
                        {b.bookingReference || b.bookingId || b.id}
                      </p>
                      {[
                        ["Customer",     b.customerEmail || "—"],
                        ["Cancelled On", fmtDate(b.cancelledAt)],
                        ["Refund Type",  b.refundType === "full" ? "Full" : b.refundType === "partial" ? "Partial" : "None"],
                        ["Refund Amt",   b.refundAmount ? `$${parseFloat(b.refundAmount).toFixed(2)}` : "$0.00"],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6c757d", marginBottom: "3px" }}>
                          <span>{k}</span>
                          <span style={{ color: "#343a40", fontWeight: 500 }}>{v}</span>
                        </div>
                      ))}
                      {b.refundNotes && (
                        <div style={{ fontSize: "11px", color: "#7a9ab8", marginTop: "8px", borderTop: "1px solid rgba(0,39,107,0.06)", paddingTop: "6px" }}>
                          Note: <em>{b.refundNotes}</em>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Request history below */}
          {history.length > 0 && (
            <>
              <h6 style={{ color: "#7a9ab8", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: "32px 0 12px" }}>
                Request History
              </h6>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {history.map(req => (
                  <div key={req.id} style={{ background: "#fff", border: "1px solid #e9ecef", /* borderRadius: "8px", */ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "3px" }}>
                        {pill(STATUS_PILL[req.status], STATUS_PILL[req.status]?.label)}
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#00276b" }}>{req.bookingReference}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#6c757d" }}>{req.tourName} · {req.customerEmail}</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "11px", color: "#7a9ab8" }}>
                      <div>Requested: {fmtDate(req.requestedAt)}</div>
                      <div>Processed: {fmtDate(req.processedAt)}</div>
                      {req.refundAmount > 0 && <div style={{ color: "#27a86e", fontWeight: 600 }}>Refund: ${parseFloat(req.refundAmount).toFixed(2)}</div>}
                      {req.rejectionReason && <div style={{ color: "#8B0000" }}>Rejected: {req.rejectionReason.slice(0, 40)}...</div>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <ApproveCancellationModal
        show={showApprove}
        onHide={() => setShowApprove(false)}
        request={selectedReq}
        onDone={() => setSelectedReq(null)}
      />
      <RejectCancellationModal
        show={showReject}
        onHide={() => setShowReject(false)}
        request={selectedReq}
        onDone={() => setSelectedReq(null)}
      />
    </div>
    </ReservationManagement>
  );
}