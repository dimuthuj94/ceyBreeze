// src/components/modals/customer/RequestDeletionModal.js
import React, { useState } from "react";
import { db } from "../../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function RequestDeletionModal({ show, onHide, booking }) {
  const [reason, setReason]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!show || !booking) return null;

  const tourName = (() => {
    if (booking._type === "vehicle") return "Vehicle Reservation";
    if (booking._type === "custom") return booking["Tour Selection"]?.Tour || "Custom Tour";
    return booking["Tour Info"]?.Tour || "Preset Tour";
  })();
  const ref = booking.bookingReference || booking.bookingId || booking.id;
  const totalPrice = booking._type === "vehicle"
    ? `$${booking.totalPrice || 0}`
    : booking["Pricing Summary"]?.["Total Price"] || "$0";

  const handleSubmit = async () => {
    if (!reason.trim()) { alert("Please provide a reason for cancellation."); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "bookingCancellationRequests"), {
        bookingId:         booking.id,
        bookingReference:  ref,
        bookingType:       booking._type,
        bookingCollection: booking._col,
        customerEmail:     booking.customerEmail,
        tourName,
        totalPrice,
        arrivalDate:       booking._type === "vehicle"
          ? booking.arrivalDate
          : booking._type === "custom"
            ? booking["Traveler Details"]?.["Arrival Date"]
            : booking.Travelers?.["Arrival Date"] || "",
        reason:  reason.trim(),
        status:  "pending",
        requestedAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      alert("Failed to submit request: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason(""); setSubmitted(false); onHide();
  };

  return (
    <div className="tm-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="tm-modal sm">

        <div className="tm-modal-header" style={{ background: "#8B0000" }}>
          <div>
            <span className="tm-modal-eyebrow">Booking Management</span>
            <h2 className="tm-modal-title">Request Cancellation</h2>
          </div>
          <button className="tm-modal-close" onClick={handleClose}>✕</button>
        </div>

        <div className="tm-modal-body">
          <div className="tm-modal-content">
            {submitted ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>✓</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color: "#00276b", marginBottom: "8px" }}>
                  Request Submitted
                </div>
                <p style={{ fontSize: "13px", color: "#7a9ab8", lineHeight: 1.7 }}>
                  Your cancellation request has been received. Our team will review it and contact you within 24–48 hours. No action will be taken without your confirmation.
                </p>
              </div>
            ) : (
              <>
                {/* Booking summary strip */}
                <div style={{ background: "rgba(139,0,0,0.04)", border: "1px solid rgba(139,0,0,0.1)", padding: "14px 16px", marginBottom: "20px" }}>
                  <div style={{ fontSize: "12px", color: "#7a9ab8", marginBottom: "4px" }}>{ref}</div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#00276b", marginBottom: "6px" }}>{tourName}</div>
                  <div style={{ display: "flex", gap: "20px", fontSize: "12px", color: "#7a9ab8" }}>
                    <span>Total: <strong style={{ color: "#00276b" }}>{totalPrice}</strong></span>
                    <span>Type: <strong style={{ color: "#00276b" }}>{booking._type}</strong></span>
                  </div>
                </div>

                {/* Warning */}
                <div style={{ background: "#faeeda", border: "1px solid rgba(255,160,0,0.3)", padding: "12px 16px", marginBottom: "20px", fontSize: "12px", color: "#633806", lineHeight: 1.65 }}>
                  <strong>Please read before submitting:</strong> This is a <em>cancellation request</em>, not an immediate cancellation. Our team will review your request and reach out to discuss refund eligibility based on our cancellation policy. Cancellation charges may apply depending on how close to the arrival date this request is made.
                </div>

                <div className="tm-modal-section">
                  <span className="tm-section-label">Reason for Cancellation *</span>
                  <textarea
                    style={{ width: "100%", padding: "11px 13px", border: "1.5px solid rgba(0,39,107,0.15)", outline: "none", fontFamily: "'Outfit', sans-serif", fontSize: "13px", color: "#00276b", resize: "vertical", minHeight: "100px", background: "#fff" }}
                    placeholder="Please explain why you wish to cancel this booking..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                  <p style={{ fontSize: "11px", color: "#adc6d8", margin: "6px 0 0" }}>
                    Providing a detailed reason helps us process your request faster.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="tm-modal-footer">
          {submitted ? (
            <button className="tm-modal-btn primary" onClick={handleClose}>Close</button>
          ) : (
            <>
              <button className="tm-modal-btn ghost" onClick={handleClose} disabled={loading}>Cancel</button>
              <button
                className="tm-modal-btn"
                onClick={handleSubmit}
                disabled={loading || !reason.trim()}
                style={{ background: "#8B0000", color: "#fff", opacity: (!reason.trim() || loading) ? 0.55 : 1 }}
              >
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}