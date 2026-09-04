// E:\HDSE\Final Project\UI\application\src\components\modals\general\GeneralDeleteConfirmationModal.js
import React from "react";
import { Modal, Button, Spinner } from "react-bootstrap";

/**
 * General delete confirmation modal component.
 *
 * @param {boolean} show - Controls visibility of the modal
 * @param {function} onHide - Called when the modal is closed
 * @param {function} onConfirm - Called when the user confirms the delete action
 * @param {string} title - Modal title text (default: "Confirm Delete")
 * @param {string} message - Confirmation message text
 * @param {boolean} loading - If true, shows a loading spinner and disables buttons
 * @param {string} confirmLabel - Text for the confirm button (default: "Delete")
 * @param {string} cancelLabel - Text for the cancel button (default: "Cancel")
 */
export default function DeleteConfirmationModal({
  show,
  onHide,
  onConfirm,
  title = "Confirm Delete",
  message = "Are you sure you want to delete this item?",
  loading = false,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
}) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header
        closeButton
        style={{
          backgroundColor: "#8B0000", // Dark red header
          color: "white",
          fontFamily: "LibreFranklin, sans-serif",
          fontWeight: 400,
          padding: "8px 16px",
          borderBottom: "1px solid #dee2e6",
        }}
      >
        <Modal.Title
          style={{
            color: "white",
            fontFamily: "LibreFranklin, sans-serif",
            fontWeight: 400,
            letterSpacing: "0.5px",
          }}
        >
          {title}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body
        style={{
          fontFamily: "LibreFranklin, sans-serif",
        }}
      >
        {message}
      </Modal.Body>

      <Modal.Footer
        style={{
          backgroundColor: "#ffffff",
          fontFamily: "LibreFranklin, sans-serif",
          fontWeight: 400,
          padding: "8px 16px",
          borderTop: "1px solid #dee2e6",
          justifyContent: "flex-end",
        }}
      >
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          style={{
            backgroundColor: "#8B0000", // Red confirm button
            borderColor: "#8B0000",
          }}
        >
          {loading ? (
            <>
              <Spinner
                animation="border"
                size="sm"
                className="me-2"
                style={{ color: "#ffffff" }}
              />
              Deleting...
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}