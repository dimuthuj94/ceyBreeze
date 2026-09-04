import React, { useState } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { db, auth } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function MessageCustomerModal({ show, onClose, customerEmail }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        customerEmail,
        adminEmail: auth.currentUser?.email || "admin@example.com",
        messageText: message.trim(),
        timestamp: serverTimestamp(),
        read: false,
      });
      setMessage("");
      alert("✅ Message sent successfully!");
      onClose();
    } catch (err) {
      console.error("Error sending message:", err);
      alert("❌ Failed to send message. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Message Customer</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group>
          <Form.Label>Message to {customerEmail}</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={sending}>
          Close
        </Button>
        <Button variant="primary" onClick={handleSend} disabled={sending}>
          {sending ? "Sending..." : "Send Message"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
