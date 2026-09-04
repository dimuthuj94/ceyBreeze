// src/components/modals/adminModals/tourReservationModals/AdminCompletedTourModal.js
import React from "react";
import { Modal, Button } from "react-bootstrap";
import AdminBookingModalBody from "./AdminBookingModalBody";

export default function AdminCompletedTourModal({ show, onHide, booking }) {
  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }}>
        <Modal.Title style={{ fontSize: "15px", fontWeight: 500, color: "#fff" }}>Completed Reservation — Details</Modal.Title>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>
      <Modal.Body style={{ padding: 0, maxHeight: "75vh", overflowY: "auto" }}>
        <AdminBookingModalBody booking={booking} />
      </Modal.Body>
      <Modal.Footer style={{ padding: "12px 20px", borderTop: "1px solid #f1f3f5" }}>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}