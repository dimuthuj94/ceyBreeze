// src/components/modals/adminModals/tourReservationModals/RejectDateChangeModal.js
import React, { useState } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../firebase";

export default function RejectDateChangeModal({ show, onHide, request, onDone }) {
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);

  if (!request) return null;

  const handleReject = async () => {
    if (!reason.trim()) { alert("Please enter a rejection reason."); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db, "bookingDateChangeRequests", request.id), {
        status:          "rejected",
        rejectionReason: reason.trim(),
        processedAt:     serverTimestamp(),
      });

      await addDoc(collection(db, "customerNotifications"), {
        customerId:        request.customerId || null,   // ← ADD THIS LINE
        customerEmail:     request.customerEmail,
        type:              "date_change_rejected",
        bookingReference:  request.bookingReference,
        tourName:          request.tourName,
        title:             "Date Change Request Declined",
        message:           `Your date change request for booking ${request.bookingReference} has been declined. Reason: ${reason.trim()}. Your original dates remain unchanged. Please contact support if you need further assistance.`,
        rejectionReason:   reason.trim(),
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

  const handleClose = () => { setReason(""); onHide(); };

  const fmtDate = (str) => {
    if (!str) return "—";
    try { return new Date(str).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return str; }
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="md">
      <Modal.Header closeButton style={{ background: "#8B0000", color: "#fff" }} className="border-0">
        <Modal.Title style={{ fontSize: "15px", fontWeight: 500 }}>Reject Date Change Request</Modal.Title>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body style={{ padding: "20px" }}>
        <div style={{ background: "rgba(0,39,107,0.03)", border: "1px solid rgba(0,39,107,0.08)", padding: "14px 16px", marginBottom: "18px" }}>
          <div style={{ fontSize: "11px", color: "#adc6d8", marginBottom: "3px" }}>{request.bookingReference}</div>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#00276b", marginBottom: "6px" }}>{request.tourName}</div>
          <div style={{ fontSize: "12px", color: "#6c757d" }}>Customer: {request.customerEmail}</div>
          <div style={{ fontSize: "12px", color: "#6c757d" }}>
            Requested: {fmtDate(request.currentArrivalDate)} → {fmtDate(request.newArrivalDate)}
          </div>
          {request.reason && <div style={{ fontSize: "12px", color: "#6c757d", marginTop: "4px" }}>Customer reason: <em>{request.reason}</em></div>}
        </div>

        <Form.Group>
          <Form.Label style={{ fontSize: "11px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Reason for Rejection * (visible to customer)
          </Form.Label>
          <Form.Control
            as="textarea" rows={4}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Explain why the date change cannot be accommodated..."
            style={{ borderRadius: 0, borderColor: "rgba(0,39,107,0.2)", fontSize: "13px" }}
          />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer style={{ padding: "12px 20px" }}>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleReject}
          disabled={loading || !reason.trim()}
          style={{ background: "#8B0000", borderColor: "#8B0000" }}
        >
          {loading ? <><Spinner size="sm" className="me-2" />Processing...</> : "Reject Request"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}