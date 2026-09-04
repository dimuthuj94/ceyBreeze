// E:\HDSE\Final Project\UI\application\src\components\modals\general\GeneralConfirmationModal.js
import React from "react";
import { Modal, Button, Spinner } from "react-bootstrap";


/**
 * General reusable confirmation modal component.
 *
 * @param {boolean} show - Controls visibility of the modal
 * @param {function} onHide - Called when the modal is closed
 * @param {function} onConfirm - Called when the user confirms the action
 * @param {string} title - Modal title text
 * @param {string} message - Confirmation message text
 * @param {boolean} loading - If true, shows a loading spinner and disables buttons
 * @param {string} confirmLabel - Text for the confirm button (default: "Confirm")
 * @param {string} cancelLabel - Text for the cancel button (default: "Cancel")
 */
export default function ConfirmationModal({
  show,
  onHide,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  loading = false,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header
        closeButton
        style={{
          backgroundColor: "#00276b",
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
            backgroundColor: "#00276b",
            borderColor: "#00276b",
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
              Processing...
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}