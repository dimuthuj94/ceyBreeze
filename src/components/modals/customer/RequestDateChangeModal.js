// src/components/modals/customer/RequestDateChangeModal.js
import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";

export default function RequestDateChangeModal({ show, onHide, booking }) {
  const [newArrival,   setNewArrival]   = useState("");
  const [newDeparture, setNewDeparture] = useState("");
  const [reason,       setReason]       = useState("");
  const [loading,      setLoading]      = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [basePrice,    setBasePrice]    = useState(null);

  const type = booking?._type;

  /* ── ALL hooks must come before any early return ── */

  useEffect(() => {
    if (!show || !booking) return;
    const fetchBase = async () => {
      try {
        if (type === "preset") {
          const raw = booking["Pricing Summary"]?.["Tour Price"]?.["Per Day"]
            || booking["Pricing Summary"]?.["basePerDay"]
            || null;
          setBasePrice(raw ? parseFloat(String(raw).replace(/[^\d.]/g, "")) : null);
        } else if (type === "custom") {
          const snap = await getDoc(doc(db, "prices", "Custom Tour Base Price"));
          if (snap.exists()) setBasePrice(snap.data().price || null);
        } else if (type === "vehicle") {
          const vehicles = booking.vehicles || [];
          const perDay = vehicles.reduce((s, v) => s + (v.pricePerDay || 0) * (v.quantity || 1), 0);
          setBasePrice(perDay || null);
        }
      } catch { setBasePrice(null); }
    };
    fetchBase();
  }, [show, booking]);

  useEffect(() => {
    if (!show || !booking || !newArrival || newDeparture) return;
    const next = new Date(newArrival);
    next.setDate(next.getDate() + (currentNights || 1));
    setNewDeparture(next.toISOString().split("T")[0]);
  }, [newArrival, show]);

  /* ── Early return AFTER all hooks ── */
  if (!show || !booking) return null;

  const currentArrival = type === "vehicle"
    ? booking.arrivalDate
    : type === "custom"
      ? booking["Traveler Details"]?.["Arrival Date"]
      : booking.Travelers?.["Arrival Date"] || "";

  const currentDeparture = type === "vehicle"
    ? booking.departureDate
    : type === "custom"
      ? booking["Traveler Details"]?.["Departure Date"]
      : "";

  const currentNights = type === "vehicle"
    ? (booking.days || 0)
    : type === "custom"
      ? (booking["Tour Selection"]?.Nights || 0)
      : (booking["Tour Info"]?.Nights || 0);

  const ref = booking.bookingReference || booking.bookingId || booking.id;

  const tourName = type === "vehicle" ? "Vehicle Reservation"
    : type === "custom" ? (booking["Tour Selection"]?.Tour || "Custom Tour")
    : (booking["Tour Info"]?.Tour || "Preset Tour");

  const totalPrice = type === "vehicle"
    ? `$${booking.totalPrice || 0}`
    : booking["Pricing Summary"]?.["Total Price"] || "$0";

  const calcNights = (arrival, departure) => {
    if (!arrival || !departure) return 0;
    const diff = (new Date(departure) - new Date(arrival)) / (1000 * 60 * 60 * 24);
    return diff > 0 ? Math.ceil(diff) : 0;
  };

  const newNights  = calcNights(newArrival, newDeparture);
  const nightsDiff = newNights - currentNights;
  const priceDelta = basePrice !== null ? basePrice * nightsDiff : null;
  const isPreset   = type === "preset";
  const todayStr   = new Date().toISOString().split("T")[0];

  const fmtDate = (str) => {
    if (!str) return "—";
    try { return new Date(str).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return str; }
  };

  const handleSubmit = async () => {
    if (!newArrival) { alert("Please select a new arrival date."); return; }
    if (!isPreset && !newDeparture) { alert("Please select a new departure date."); return; }
    if (!reason.trim()) { alert("Please provide a reason for the date change."); return; }
    if (newArrival === currentArrival && newDeparture === currentDeparture) {
      alert("New dates are the same as current dates. Please select different dates.");
      return;
    }
    setLoading(true);
    try {
      const newDepartureCalc = isPreset
        ? (() => {
            const d = new Date(newArrival);
            d.setDate(d.getDate() + currentNights);
            return d.toISOString().split("T")[0];
          })()
        : newDeparture;

      await addDoc(collection(db, "bookingDateChangeRequests"), {
        bookingId:            booking.id,
        bookingReference:     ref,
        bookingType:          type,
        bookingCollection:    booking._col,
        customerEmail:        booking.customerEmail,
        tourName,
        currentArrivalDate:   currentArrival || "",
        currentDepartureDate: currentDeparture || "",
        currentNights,
        newArrivalDate:   newArrival,
        newDepartureDate: newDepartureCalc,
        newNights:        isPreset ? currentNights : newNights,
        nightsDifference: isPreset ? 0 : nightsDiff,
        estimatedPriceImpact: priceDelta !== null
          ? (priceDelta >= 0 ? `+$${priceDelta.toFixed(2)}` : `-$${Math.abs(priceDelta).toFixed(2)}`)
          : "To be calculated by admin",
        currentTotalPrice: totalPrice,
        reason: reason.trim(),
        status: "pending",
        adminNote: "",
        requestedAt: serverTimestamp(),
        pricingNote: "Final pricing adjustment will be confirmed by ceyBreeze admin and communicated to the customer before the change is applied.",
      });
      setSubmitted(true);
    } catch (err) {
      alert("Failed to submit request: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewArrival(""); setNewDeparture(""); setReason("");
    setSubmitted(false); onHide();
  };

  return (
    <div className="tm-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="tm-modal sm">

        <div className="tm-modal-header">
          <div>
            <span className="tm-modal-eyebrow">Booking Management</span>
            <h2 className="tm-modal-title">Request Date Change</h2>
          </div>
          <button className="tm-modal-close" onClick={handleClose}>✕</button>
        </div>

        <div className="tm-modal-body">
          <div className="tm-modal-content">
            {submitted ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📅</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color: "#00276b", marginBottom: "8px" }}>
                  Request Submitted
                </div>
                <p style={{ fontSize: "13px", color: "#7a9ab8", lineHeight: 1.75, maxWidth: "360px", margin: "0 auto" }}>
                  Your date change request has been received. Our team will review the availability and any pricing adjustments required, and will contact you within 24–48 hours to confirm.
                </p>
              </div>
            ) : (
              <>
                {/* Current booking strip */}
                <div style={{ background: "rgba(0,39,107,0.03)", border: "1px solid rgba(0,39,107,0.08)", padding: "14px 16px", marginBottom: "20px" }}>
                  <div style={{ fontSize: "12px", color: "#7a9ab8", marginBottom: "4px" }}>{ref}</div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#00276b", marginBottom: "8px" }}>{tourName}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", fontSize: "12px" }}>
                    <div>
                      <div style={{ color: "#adc6d8", marginBottom: "2px" }}>Current Arrival</div>
                      <div style={{ color: "#00276b", fontWeight: 500 }}>{fmtDate(currentArrival)}</div>
                    </div>
                    {!isPreset && (
                      <div>
                        <div style={{ color: "#adc6d8", marginBottom: "2px" }}>Current Departure</div>
                        <div style={{ color: "#00276b", fontWeight: 500 }}>{fmtDate(currentDeparture)}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ color: "#adc6d8", marginBottom: "2px" }}>Duration</div>
                      <div style={{ color: "#00276b", fontWeight: 500 }}>{currentNights} {type === "vehicle" ? "days" : "nights"}</div>
                    </div>
                  </div>
                </div>

                {/* Pricing notice */}
                <div style={{ background: "#faeeda", border: "1px solid rgba(255,160,0,0.3)", padding: "12px 16px", marginBottom: "20px", fontSize: "12px", color: "#633806", lineHeight: 1.65 }}>
                  <strong>Pricing note:</strong> {isPreset
                    ? "For preset tours the tour duration is fixed. Only the arrival date will shift — the number of nights remains unchanged. Any accommodation or activity pricing differences due to availability on new dates will be confirmed by our team."
                    : "Changing the dates may affect the total price since pricing is calculated per night. An estimated impact is shown below, but the final adjustment will be confirmed by our team before the change is applied."
                  }
                </div>

                {/* New dates */}
                <div className="tm-modal-section">
                  <span className="tm-section-label">New {isPreset ? "Arrival Date" : "Dates"}</span>
                  <div style={{ display: "grid", gridTemplateColumns: isPreset ? "1fr" : "1fr 1fr", gap: "12px", marginBottom: "10px" }}>
                    <div>
                      <label style={{ fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" }}>
                        New Arrival Date *
                      </label>
                      <input
                        type="date" min={todayStr} value={newArrival}
                        onChange={e => setNewArrival(e.target.value)}
                        style={{ width: "100%", padding: "10px 13px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "13px", color: "#00276b", fontFamily: "'Outfit', sans-serif", outline: "none", background: "#fff" }}
                      />
                    </div>
                    {!isPreset && (
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "5px" }}>
                          New Departure Date *
                        </label>
                        <input
                          type="date" min={newArrival || todayStr} value={newDeparture}
                          onChange={e => setNewDeparture(e.target.value)}
                          style={{ width: "100%", padding: "10px 13px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "13px", color: "#00276b", fontFamily: "'Outfit', sans-serif", outline: "none", background: "#fff" }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Preview panel */}
                  {newArrival && (
                    <div style={{ background: "rgba(0,39,107,0.03)", border: "1px solid rgba(0,39,107,0.08)", padding: "12px 14px", marginTop: "8px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                        {!isPreset && newDeparture && (
                          <div>
                            <div style={{ color: "#adc6d8" }}>New Duration</div>
                            <div style={{ color: "#00276b", fontWeight: 600 }}>{newNights} nights</div>
                          </div>
                        )}
                        {!isPreset && priceDelta !== null && newDeparture && (
                          <div>
                            <div style={{ color: "#adc6d8" }}>Est. Price Impact</div>
                            <div style={{ color: nightsDiff > 0 ? "#dc3545" : nightsDiff < 0 ? "#27a86e" : "#00276b", fontWeight: 600 }}>
                              {nightsDiff === 0 ? "No change" : nightsDiff > 0 ? `+$${priceDelta.toFixed(0)} approx.` : `-$${Math.abs(priceDelta).toFixed(0)} approx.`}
                            </div>
                          </div>
                        )}
                        {isPreset && (
                          <div>
                            <div style={{ color: "#adc6d8" }}>Nights Unchanged</div>
                            <div style={{ color: "#00276b", fontWeight: 600 }}>{currentNights} nights (fixed)</div>
                          </div>
                        )}
                        <div>
                          <div style={{ color: "#adc6d8" }}>Current Total</div>
                          <div style={{ color: "#00276b", fontWeight: 600 }}>{totalPrice}</div>
                        </div>
                      </div>
                      {priceDelta !== null && !isPreset && (
                        <p style={{ fontSize: "11px", color: "#adc6d8", margin: "8px 0 0" }}>
                          * Estimate based on base price only. Final amount will be confirmed by admin.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Reason */}
                <div className="tm-modal-section">
                  <span className="tm-section-label">Reason for Date Change *</span>
                  <textarea
                    style={{ width: "100%", padding: "11px 13px", border: "1.5px solid rgba(0,39,107,0.15)", outline: "none", fontFamily: "'Outfit', sans-serif", fontSize: "13px", color: "#00276b", resize: "vertical", minHeight: "80px", background: "#fff" }}
                    placeholder="Please explain why you need to change the dates..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
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
                className="tm-modal-btn primary"
                onClick={handleSubmit}
                disabled={loading || !newArrival || !reason.trim() || (!isPreset && !newDeparture)}
                style={{ opacity: (loading || !newArrival || !reason.trim() || (!isPreset && !newDeparture)) ? 0.55 : 1 }}
              >
                {loading ? "Submitting..." : "Submit Request ›"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}