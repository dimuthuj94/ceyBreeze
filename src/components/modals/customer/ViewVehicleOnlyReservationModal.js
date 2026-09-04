// src/components/modals/customer/ViewVehicleOnlyReservationModal.js
import React from "react";
import { Modal, Button, Card, Table } from "react-bootstrap";

export default function ViewVehicleOnlyReservationModal({ show, onHide, booking }) {
  if (!booking) return null;
  const b = booking;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }}>
        <div>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#fff" }}>Reservation Details — Vehicle Only</p>
          <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>{b.bookingId || b.id} · {b.arrivalDate}</p>
        </div>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto", padding: "20px" }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center text-muted small mb-3 p-2" style={{ background: "#f8fbff", borderRadius: "8px" }}>
          <div className="me-3 mb-1"><strong>Booking ID:</strong> <span className="text-secondary">{b.bookingId || b.id}</span></div>
          <div className="me-3 mb-1"><strong>Arrival:</strong> <span className="text-secondary">{b.arrivalDate || "N/A"}</span></div>
          <div><strong>Total:</strong> <span className="text-success fw-semibold">${b.totalPrice || 0}</span></div>
        </div>

        <Card className="mb-3 shadow-sm step6-card">
          <Card.Header className="fw-semibold step1-header">Booking Summary</Card.Header>
          <Card.Body className="step1-body">
            <p><strong>Name:</strong> <span className="float-end">{b.customerName}</span></p>
            <p><strong>Email:</strong> <span className="float-end">{b.customerEmail}</span></p>
            <p><strong>Arrival Date:</strong> <span className="float-end">{b.arrivalDate}</span></p>
            <p><strong>Departure Date:</strong> <span className="float-end">{b.departureDate}</span></p>
            <p><strong>Duration:</strong> <span className="float-end">{b.days} days</span></p>
          </Card.Body>
        </Card>

        <Card className="mb-3 shadow-sm step6-card">
          <Card.Header className="fw-semibold step1-header">Vehicles</Card.Header>
          <Card.Body className="step1-body">
            <Table bordered hover size="sm">
              <thead><tr><th className="text-center">Vehicle</th><th className="text-center">Price/Day</th><th className="text-center">Qty</th><th className="text-center">Days</th><th className="text-center">Subtotal</th></tr></thead>
              <tbody>{b.vehicles?.map((v, i) => <tr key={i}><td>{v.id}</td><td style={{textAlign:"right"}}>${v.pricePerDay}</td><td style={{textAlign:"right"}}>{v.quantity}</td><td style={{textAlign:"right"}}>{v.days}</td><td style={{textAlign:"right"}}>${v.subtotal}</td></tr>)}</tbody>
            </Table>
          </Card.Body>
        </Card>

        {Array.isArray(b.vehicles) && (
          <Card className="mb-3 shadow-sm step6-card">
            <Card.Header className="fw-semibold step1-header">Price Summary</Card.Header>
            <Card.Body className="step1-body">
              {b.vehicles.map((v, i) => <div key={i} className="d-flex justify-content-between mb-1"><span>{v.id} (${v.pricePerDay} × {v.quantity} × {v.days})</span><span>${v.subtotal}</span></div>)}
              <div className="d-flex justify-content-between fw-bold mt-2"><span>Total</span><span>${b.totalPrice}</span></div>
            </Card.Body>
          </Card>
        )}
      </Modal.Body>
      <Modal.Footer style={{ padding: "12px 20px" }}>
        <Button variant="secondary" onClick={onHide} style={{ fontSize: "13px" }}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}