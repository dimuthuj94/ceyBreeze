// src/components/modals/bookings/ViewPaymentProofModal.js
import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";

export default function ViewPaymentProofModal({ show, onHide, booking }) {
  const [zoom, setZoom] = useState(1);

  if (!booking) return null;

  const proofUrl = booking.receiptURL;
  const isPDF = proofUrl?.toLowerCase().includes(".pdf") ||
    proofUrl?.toLowerCase().includes("application%2Fpdf");

  const handleDownload = async () => {
    if (!proofUrl) return;
    const res = await fetch(proofUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PaymentProof_${booking.id || "receipt"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const win = window.open(proofUrl, "_blank");
    win?.print();
  };

  const SectionHeader = () => (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      background: "#f8f9fa", padding: "8px 14px",
      borderBottom: "1px solid #e9ecef", marginBottom: "14px",
    }}>
      <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#00276b" }} />
      <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#00276b", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        Payment Proof Document
      </p>
    </div>
  );

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }}>
        <Modal.Title style={{ fontSize: "15px", fontWeight: 500, color: "#fff" }}>
          View Payment Proof — {booking.id}
        </Modal.Title>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body style={{ padding: 0, maxHeight: "75vh", overflowY: "auto" }}>
        <SectionHeader />

        <div style={{ padding: "0 20px 20px" }}>
          {/* Zoom controls */}
          {!isPDF && proofUrl && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", color: "#6c757d" }}>Zoom:</span>
              <button
                onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.2).toFixed(1)))}
                style={{ border: "1px solid #dee2e6", background: "#f8f9fa", borderRadius: "6px", padding: "3px 10px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}
              >−</button>
              <span style={{ fontSize: "13px", fontWeight: 500, minWidth: "40px", textAlign: "center" }}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))}
                style={{ border: "1px solid #dee2e6", background: "#f8f9fa", borderRadius: "6px", padding: "3px 10px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}
              >+</button>
              <button
                onClick={() => setZoom(1)}
                style={{ border: "1px solid #dee2e6", background: "#f8f9fa", borderRadius: "6px", padding: "3px 8px", cursor: "pointer", fontSize: "11px", color: "#6c757d" }}
              >Reset</button>
            </div>
          )}

          {!proofUrl ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#adb5bd" }}>
              <p style={{ fontSize: "14px" }}>No payment proof uploaded for this booking.</p>
            </div>
          ) : isPDF ? (
            <iframe
              src={proofUrl}
              title="Payment Proof"
              style={{ width: "100%", height: "500px", border: "1px solid #e9ecef", borderRadius: "8px" }}
            />
          ) : (
            <div style={{ overflow: "auto", border: "1px solid #e9ecef", borderRadius: "8px", background: "#f8f9fa", textAlign: "center", padding: "12px" }}>
              <img
                src={proofUrl}
                alt="Payment Proof"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                  maxWidth: "100%",
                  transition: "transform 0.2s",
                  borderRadius: "4px",
                }}
              />
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer style={{ padding: "12px 20px", borderTop: "1px solid #f1f3f5", gap: "8px" }}>
        <Button
          onClick={handlePrint}
          style={{ background: "#00276b", border: "none", fontSize: "13px" }}
          disabled={!proofUrl}
        >
          Print
        </Button>
        <Button
          onClick={handleDownload}
          style={{ background: "#185fa5", border: "none", fontSize: "13px" }}
          disabled={!proofUrl}
        >
          Download
        </Button>
        <Button variant="secondary" onClick={onHide} style={{ fontSize: "13px" }}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}