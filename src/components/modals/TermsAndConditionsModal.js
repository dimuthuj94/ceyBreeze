// src/components/modals/TermsAndConditionsModal.js
import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import TermsAndConditions from "../../pages/TermsAndConditions";

export default function TermsAndConditionsModal({ show, onHide, onConfirm }) {
  const [agreed, setAgreed] = useState(false);

  const handleConfirm = () => {
    if (!agreed) {
      alert("You must agree to the Terms and Conditions to proceed.");
      return;
    }
    onConfirm(); // call parent confirm handler
    onHide(); // close modal
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Terms and Conditions</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <TermsAndConditions />
        <Form.Check
          type="checkbox"
          className="mt-3"
          label="I agree to the Terms and Conditions"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="success" onClick={handleConfirm}>
          Confirm & Pay
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
