// src/components/modals/adminModals/tourReservationModals/ApproveDateChangeModal.js
import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner, Row, Col } from "react-bootstrap";
import {
  doc, getDoc, updateDoc, addDoc,
  collection, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../../firebase";

export default function ApproveDateChangeModal({ show, onHide, request, onDone }) {
  const [adminNote,     setAdminNote]     = useState("");
  const [newTotalPrice, setNewTotalPrice] = useState("");
  const [loading,       setLoading]       = useState(false);
  const [priceMethod,   setPriceMethod]   = useState("estimate"); // "estimate" | "custom" | "unchanged"

  useEffect(() => {
    if (!show || !request) return;
    // Pre-fill with estimated impact
    const estimatedImpact = request.estimatedPriceImpact;
    const currentTotal = parseFloat(String(request.currentTotalPrice || "0").replace(/[^\d.]/g, "")) || 0;
    if (estimatedImpact && estimatedImpact !== "To be calculated by admin") {
      const delta = parseFloat(estimatedImpact.replace(/[^\d.-]/g, "")) || 0;
      setNewTotalPrice((currentTotal + delta).toFixed(2));
    } else {
      setNewTotalPrice(currentTotal.toFixed(2));
    }
  }, [show, request]);

  if (!request) return null;

  const currentTotal = parseFloat(String(request.currentTotalPrice || "0").replace(/[^\d.]/g, "")) || 0;
  const finalPrice   = priceMethod === "unchanged" ? currentTotal : parseFloat(newTotalPrice) || currentTotal;
  const priceDiff    = finalPrice - currentTotal;

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { bookingCollection, bookingId, bookingType } = request;

      // 1. Fetch original booking
      const bookingRef = doc(db, bookingCollection, bookingId);
      const snap = await getDoc(bookingRef);
      if (!snap.exists()) throw new Error("Booking not found in " + bookingCollection);

      const original = snap.data();

      // 2. Build date update based on booking type
      let dateUpdate = {};

      if (bookingType === "vehicle") {
        const newDays = Math.ceil(
          (new Date(request.newDepartureDate) - new Date(request.newArrivalDate)) / (1000 * 60 * 60 * 24)
        );
        dateUpdate = {
          arrivalDate:   request.newArrivalDate,
          departureDate: request.newDepartureDate,
          days:          newDays > 0 ? newDays : request.currentNights,
        };
        // Recalculate vehicle totals if price changed
        if (priceMethod !== "unchanged") {
          dateUpdate.totalPrice = finalPrice;
        }
      } else if (bookingType === "custom") {
        const travelerDetails = { ...(original["Traveler Details"] || {}) };
        travelerDetails["Arrival Date"]   = request.newArrivalDate;
        travelerDetails["Departure Date"] = request.newDepartureDate;

        const tourSelection = { ...(original["Tour Selection"] || {}) };
        tourSelection.Nights = request.newNights;

        const pricingSummary = { ...(original["Pricing Summary"] || {}) };
        if (priceMethod !== "unchanged") {
          pricingSummary["Total Price"] = `$${finalPrice.toFixed(2)}`;
          pricingSummary.Nights = request.newNights;
        }

        dateUpdate = {
          "Traveler Details": travelerDetails,
          "Tour Selection":   tourSelection,
          "Pricing Summary":  pricingSummary,
        };
      } else {
        // preset — only arrival date shifts, nights fixed
        const travelers = { ...(original["Travelers"] || {}) };
        travelers["Arrival Date"] = request.newArrivalDate;

        dateUpdate = { Travelers: travelers };
        if (priceMethod !== "unchanged") {
          const pricingSummary = { ...(original["Pricing Summary"] || {}) };
          pricingSummary["Total Price"] = `$${finalPrice.toFixed(2)}`;
          dateUpdate["Pricing Summary"] = pricingSummary;
        }
      }

      // 3. Apply update to booking
      await updateDoc(bookingRef, {
        ...dateUpdate,
        dateChangeAppliedAt: serverTimestamp(),
        previousArrivalDate: request.currentArrivalDate,
      });

      // 4. Update request status
      await updateDoc(doc(db, "bookingDateChangeRequests", request.id), {
        status:           "approved",
        approvedPrice:    `$${finalPrice.toFixed(2)}`,
        priceMethod,
        adminNote:        adminNote.trim(),
        processedAt:      serverTimestamp(),
      });

      // 5. Notify customer
      await addDoc(collection(db, "customerNotifications"), {
        customerId:        request.customerId || null,   // ← ADD THIS LINE
        customerEmail:     request.customerEmail,
        type:              "date_change_approved",
        bookingReference:  request.bookingReference,
        tourName:          request.tourName,
        title:             "Date Change Request Approved",
        message:           `Your date change request for booking ${request.bookingReference} has been approved. Your new arrival date is ${request.newArrivalDate}${request.newDepartureDate ? ` and departure date is ${request.newDepartureDate}` : ""}. ${
          priceMethod === "unchanged"
            ? "The total price remains unchanged."
            : `Your new total price is $${finalPrice.toFixed(2)}.`
        }${adminNote ? ` Admin note: ${adminNote}` : ""}`,
        newArrivalDate:    request.newArrivalDate,
        newDepartureDate:  request.newDepartureDate || "",
        newNights:         request.newNights,
        newTotalPrice:     `$${finalPrice.toFixed(2)}`,
        priceChanged:      priceMethod !== "unchanged",
        priceDifference:   priceDiff,
        read:              false,
        createdAt:         serverTimestamp(),
      });

      onDone?.();
      onHide();
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { setAdminNote(""); setPriceMethod("estimate"); onHide(); };

  const fmtDate = (str) => {
    if (!str) return "—";
    try { return new Date(str).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return str; }
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton style={{ background: "#00276b", color: "#fff" }} className="border-0">
        <Modal.Title style={{ fontSize: "15px", fontWeight: 500 }}>Approve Date Change Request</Modal.Title>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body style={{ padding: "20px" }}>

        {/* Booking summary */}
        <div style={{ background: "rgba(0,39,107,0.03)", border: "1px solid rgba(0,39,107,0.08)", padding: "14px 16px", marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", color: "#adc6d8", marginBottom: "3px" }}>{request.bookingReference} · {request.bookingType}</div>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#00276b", marginBottom: "10px" }}>{request.tourName}</div>
          <Row>
            <Col xs={6}>
              <div style={{ fontSize: "10px", color: "#adc6d8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Current Dates</div>
              <div style={{ fontSize: "13px", color: "#00276b", fontWeight: 500 }}>
                {fmtDate(request.currentArrivalDate)}
                {request.currentDepartureDate && ` → ${fmtDate(request.currentDepartureDate)}`}
              </div>
              <div style={{ fontSize: "12px", color: "#7a9ab8" }}>{request.currentNights} nights · {request.currentTotalPrice}</div>
            </Col>
            <Col xs={6}>
              <div style={{ fontSize: "10px", color: "#adc6d8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Requested New Dates</div>
              <div style={{ fontSize: "13px", color: "#00276b", fontWeight: 500 }}>
                {fmtDate(request.newArrivalDate)}
                {request.newDepartureDate && ` → ${fmtDate(request.newDepartureDate)}`}
              </div>
              <div style={{ fontSize: "12px", color: "#7a9ab8" }}>{request.newNights} nights · Est. impact: {request.estimatedPriceImpact}</div>
            </Col>
          </Row>
          {request.reason && (
            <div style={{ fontSize: "12px", color: "#6c757d", marginTop: "10px", borderTop: "1px solid rgba(0,39,107,0.06)", paddingTop: "8px" }}>
              Customer reason: <em>{request.reason}</em>
            </div>
          )}
        </div>

        {/* Price adjustment */}
        <Form.Group className="mb-3">
          <Form.Label style={{ fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Price Adjustment
          </Form.Label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { val: "estimate", label: `Apply estimated price — $${newTotalPrice}` },
              { val: "custom",   label: "Set custom price" },
              { val: "unchanged",label: `Keep current price — ${request.currentTotalPrice}` },
            ].map(({ val, label }) => (
              <div
                key={val}
                onClick={() => setPriceMethod(val)}
                style={{
                  border: `1.5px solid ${priceMethod === val ? "#00276b" : "rgba(0,39,107,0.12)"}`,
                  background: priceMethod === val ? "rgba(0,39,107,0.03)" : "#fff",
                  padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px",
                }}
              >
                <input type="radio" readOnly checked={priceMethod === val} style={{ accentColor: "#00276b" }} />
                <span style={{ fontSize: "13px", color: "#00276b", fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </Form.Group>

        {priceMethod === "custom" && (
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              New Total Price ($)
            </Form.Label>
            <Form.Control
              type="number" min="0"
              value={newTotalPrice}
              onChange={e => setNewTotalPrice(e.target.value)}
              style={{ borderRadius: 0, borderColor: "rgba(0,39,107,0.2)", fontSize: "13px" }}
            />
          </Form.Group>
        )}

        {/* Price change preview */}
        {priceMethod !== "unchanged" && (
          <div style={{
            background: priceDiff > 0 ? "rgba(220,53,69,0.05)" : "rgba(39,168,110,0.05)",
            border: `1px solid ${priceDiff > 0 ? "rgba(220,53,69,0.2)" : "rgba(39,168,110,0.2)"}`,
            padding: "10px 14px", marginBottom: "16px", display: "flex", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "12px", color: "#6c757d" }}>Price difference</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: priceDiff > 0 ? "#dc3545" : "#27a86e" }}>
              {priceDiff >= 0 ? `+$${priceDiff.toFixed(2)}` : `-$${Math.abs(priceDiff).toFixed(2)}`}
            </span>
          </div>
        )}

        <Form.Group>
          <Form.Label style={{ fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Admin Notes (visible to customer)
          </Form.Label>
          <Form.Control
            as="textarea" rows={3}
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
            placeholder="Additional notes about the date change or pricing..."
            style={{ borderRadius: 0, borderColor: "rgba(0,39,107,0.2)", fontSize: "13px" }}
          />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer style={{ padding: "12px 20px" }}>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleApprove}
          disabled={loading || (priceMethod === "custom" && !newTotalPrice)}
          style={{ background: "#27a86e", borderColor: "#27a86e" }}
        >
          {loading ? <><Spinner size="sm" className="me-2" />Processing...</> : "Approve & Apply Changes"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}