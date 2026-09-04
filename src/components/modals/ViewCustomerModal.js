import React from "react";
import { Modal, Button } from "react-bootstrap";

export default function ViewCustomerModal({ show, onHide, customer }) {
  if (!customer) return null;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Customer Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p><strong>Name:</strong> {customer.customerName || "N/A"}</p>
        <p><strong>Email:</strong> {customer.customerEmail || "N/A"}</p>
        <p><strong>Phone:</strong> {customer.phone || "N/A"}</p>
        {/* Add more fields as needed */}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
