// src/components/modals/ImageModal.js
import React from "react";
import { Modal, Button, Image } from "react-bootstrap";

export default function ImageModal({ show, onClose, imageUrl, title }) {
  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title || "Image Preview"}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {imageUrl ? (
          <Image src={imageUrl} alt={title || "Image"} fluid rounded />
        ) : (
          <p className="text-muted">No image available</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
