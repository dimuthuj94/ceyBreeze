// src/components/modals/adminModals/tourReservationModals/ApproveCancellationModal.js
import React, { useState } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import {
  doc, getDoc, setDoc, deleteDoc, updateDoc,
  addDoc, collection, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../../firebase";

export default function ApproveCancellationModal({ show, onHide, request, onDone }) {
  const [refundType,    setRefundType]    = useState("full");
  const [customAmount,  setCustomAmount]  = useState("");
  const [refundNotes,   setRefundNotes]   = useState("");
  const [loading,       setLoading]       = useState(false);

  if (!request) return null;

  const rawTotal = request.totalPrice
    ? parseFloat(String(request.totalPrice).replace(/[^\d.]/g, "")) || 0
    : 0;

  const refundAmount =
    refundType === "full"    ? rawTotal :
    refundType === "none"    ? 0 :
    parseFloat(customAmount) || 0;

  const handleApprove = async () => {
    setLoading(true);
    try {
      // 1. Fetch original booking
      const bookingRef = doc(db, request.bookingCollection, request.bookingId);
      const snap = await getDoc(bookingRef);
      if (!snap.exists()) throw new Error("Original booking not found.");

      // 2. Move to cancelledBookings
      await setDoc(doc(db, "cancelledBookings", request.bookingId), {
        ...snap.data(),
        _originalCollection: request.bookingCollection,
        _cancellationRequestId: request.id,
        cancelledAt:  serverTimestamp(),
        cancelledBy:  "admin",
        refundType,
        refundAmount,
        refundNotes:  refundNotes.trim(),
      });

      // 3. Delete from original collection
      await deleteDoc(bookingRef);

      // 4. Update request status
      await updateDoc(doc(db, "bookingCancellationRequests", request.id), {
        status:        "approved",
        refundType,
        refundAmount,
        refundNotes:   refundNotes.trim(),
        processedAt:   serverTimestamp(),
      });

      // 5. Notify customer
      await addDoc(collection(db, "customerNotifications"), {
        customerId:        request.customerId || null,   // ← ADD THIS LINE
        customerEmail:     request.customerEmail,
        type:              "deletion_approved",
        bookingReference:  request.bookingReference,
        tourName:          request.tourName,
        title:             "Booking Cancellation Approved",
        message:           `Your cancellation request for booking ${request.bookingReference} (${request.tourName}) has been approved. ${
          refundType === "none"
            ? "No refund will be issued as per our cancellation policy."
            : `A ${refundType === "full" ? "full" : "partial"} refund of $${refundAmount.toFixed(2)} will be processed.`
        }${refundNotes ? ` Admin note: ${refundNotes}` : ""}`,
        refundType,
        refundAmount,
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

  const handleClose = () => {
    setRefundType("full"); setCustomAmount(""); setRefundNotes(""); onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="md">
      <Modal.Header closeButton style={{ background: "#00276b", color: "#fff" }} className="border-0">
        <Modal.Title style={{ fontSize: "15px", fontWeight: 500 }}>Approve Cancellation</Modal.Title>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body style={{ padding: "20px" }}>

        {/* Request summary */}
        <div style={{ background: "rgba(0,39,107,0.03)", border: "1px solid rgba(0,39,107,0.08)", padding: "14px 16px", marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", color: "#adc6d8", marginBottom: "3px" }}>{request.bookingReference}</div>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#00276b", marginBottom: "6px" }}>{request.tourName}</div>
          <div style={{ fontSize: "12px", color: "#6c757d" }}>Customer: <strong style={{ color: "#343a40" }}>{request.customerEmail}</strong></div>
          <div style={{ fontSize: "12px", color: "#6c757d" }}>Current Total: <strong style={{ color: "#00276b" }}>{request.totalPrice}</strong></div>
          {request.reason && <div style={{ fontSize: "12px", color: "#6c757d", marginTop: "6px" }}>Reason: <em>{request.reason}</em></div>}
        </div>

        {/* Warning */}
        <div style={{ background: "#faeeda", border: "1px solid rgba(255,160,0,0.3)", padding: "10px 14px", marginBottom: "18px", fontSize: "12px", color: "#633806" }}>
          <strong>Warning:</strong> Approving this request will permanently move the booking to Cancelled Reservations. This cannot be undone.
        </div>

        {/* Refund type */}
        <Form.Group className="mb-3">
          <Form.Label style={{ fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Refund Type
          </Form.Label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { val: "full",    label: `Full Refund — $${rawTotal.toFixed(2)}` },
              { val: "partial", label: "Partial Refund" },
              { val: "none",    label: "No Refund" },
            ].map(({ val, label }) => (
              <div
                key={val}
                onClick={() => setRefundType(val)}
                style={{
                  border: `1.5px solid ${refundType === val ? "#00276b" : "rgba(0,39,107,0.12)"}`,
                  background: refundType === val ? "rgba(0,39,107,0.03)" : "#fff",
                  padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px",
                }}
              >
                <input type="radio" readOnly checked={refundType === val} style={{ accentColor: "#00276b" }} />
                <span style={{ fontSize: "13px", color: "#00276b", fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </Form.Group>

        {refundType === "partial" && (
          <Form.Group className="mb-3">
            <Form.Label style={{ fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Refund Amount ($)
            </Form.Label>
            <Form.Control
              type="number" min="0" max={rawTotal}
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              placeholder={`Max $${rawTotal.toFixed(2)}`}
              style={{ borderRadius: 0, borderColor: "rgba(0,39,107,0.2)", fontSize: "13px" }}
            />
          </Form.Group>
        )}

        <Form.Group>
          <Form.Label style={{ fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Admin Notes (visible to customer)
          </Form.Label>
          <Form.Control
            as="textarea" rows={3}
            value={refundNotes}
            onChange={e => setRefundNotes(e.target.value)}
            placeholder="Reason for refund amount, processing time, etc..."
            style={{ borderRadius: 0, borderColor: "rgba(0,39,107,0.2)", fontSize: "13px" }}
          />
        </Form.Group>

        {/* Refund summary */}
        <div style={{ background: "rgba(39,168,110,0.06)", border: "1px solid rgba(39,168,110,0.2)", padding: "10px 14px", marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "#085041" }}>Refund Amount</span>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#27a86e" }}>
            ${refundType === "none" ? "0.00" : refundType === "full" ? rawTotal.toFixed(2) : (parseFloat(customAmount) || 0).toFixed(2)}
          </span>
        </div>
      </Modal.Body>

      <Modal.Footer style={{ padding: "12px 20px" }}>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleApprove}
          disabled={loading || (refundType === "partial" && !customAmount)}
          style={{ background: "#27a86e", borderColor: "#27a86e" }}
        >
          {loading ? <><Spinner size="sm" className="me-2" />Processing...</> : "Approve & Process"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}