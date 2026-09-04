// src/components/modals/bookings/ViewReceiptModal.js
import React, { useEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import html2pdf from "html2pdf.js";

export default function ViewReceiptModal({ show, onHide, booking }) {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef();

  useEffect(() => {
    if (!booking?.receiptId || !show) return;
    setLoading(true);
    getDoc(doc(db, "paymentReceipts", booking.receiptId)).then((snap) => {
      if (snap.exists()) setReceipt(snap.data());
      setLoading(false);
    });
  }, [booking, show]);

  const handleDownloadPDF = () => {
    const el = pdfRef.current;
    if (!el) return;
    html2pdf().set({
      margin: 10,
      filename: `Receipt_${receipt?.receiptId || "receipt"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a5", orientation: "portrait" },
    }).from(el).save();
  };

  const fmt = (d) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (!booking) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }}>
        <Modal.Title style={{ fontSize: "15px", fontWeight: 500, color: "#fff" }}>
          Payment Receipt — {booking.id}
        </Modal.Title>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body style={{ padding: "20px", maxHeight: "75vh", overflowY: "auto" }}>
        {loading ? (
          <p style={{ color: "#adb5bd", textAlign: "center", padding: "40px" }}>Loading receipt...</p>
        ) : !receipt ? (
          <p style={{ color: "#adb5bd", textAlign: "center", padding: "40px" }}>
            No receipt generated yet. Use "Gen. Receipt" first.
          </p>
        ) : (
          <div ref={pdfRef} style={{ fontFamily: "Arial, sans-serif" }}>

            {/* Letterhead */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "#00276b", margin: "0 0 3px" }}>CEYBREEZE TOURS (PVT) LTD</p>
                <p style={{ fontSize: "11px", color: "#6c757d", margin: "0 0 1px" }}>No. 45, Beach Road, Colombo, Sri Lanka</p>
                <p style={{ fontSize: "11px", color: "#6c757d", margin: 0 }}>Email - info@ceybreezetours.com</p>
                <p style={{ fontSize: "11px", color: "#6c757d", margin: 0 }}>Phone - +94 11 234 5678</p>
              </div>
              <img src="/images/logo.png" alt="Logo" style={{ maxWidth: "90px", maxHeight: "90px", objectFit: "contain" }} />
            </div>

            {/* Title bar */}
            <div style={{ background: "#00276b", color: "#fff", textAlign: "center", padding: "7px", borderRadius: "6px", fontSize: "13px", fontWeight: 500, marginBottom: "16px", letterSpacing: "0.3px" }}>
              Payment Receipt
            </div>

            {/* Receipt meta */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px", marginBottom: "16px" }}>
              {[
                ["Receipt No.", receipt.receiptId],
                ["Receipt Date", fmt(receipt.receiptDate)],
                ["Customer", receipt.customerName],
                ["Email", receipt.customerEmail],
                ["Booking ID", receipt.bookingId],
                ["Payment Method", receipt.paymentMethod],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "10px", color: "#adb5bd" }}>{label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#212529" }}>{value || "N/A"}</span>
                </div>
              ))}
            </div>

            {/* Payment details with RECEIVED stamp */}
            <div style={{ position: "relative", border: "1px solid #e9ecef", borderRadius: "8px", padding: "14px", marginBottom: "14px" }}>

              {/* RECEIVED stamp */}
              <div style={{
                position: "absolute", top: "12px", right: "100px",
                border: "3px solid #1d9e75", borderRadius: "6px",
                padding: "3px 10px", transform: "rotate(-8deg)",
                opacity: 0.85,
              }}>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#1d9e75", letterSpacing: "2px" }}>RECEIVED</p>
                <p style={{ margin: 0, fontSize: "10px", color: "#1d9e75", textAlign: "center" }}>{fmt(receipt.paymentReceivedDate)}</p>
              </div>

              {[
                ["Total Amount", `${receipt.currencyUSD} ${Number(receipt.totalAmountUSD).toFixed(2)}`],
                ["Paid Amount", `${receipt.currencyUSD} ${Number(receipt.paidAmountUSD).toFixed(2)}`],
                ["Remaining Balance", `${receipt.currencyUSD} ${Number(receipt.remainingBalanceUSD).toFixed(2)}`],
                ["Payment Received", fmt(receipt.paymentReceivedDate)],
              ].map(([label, value], i) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "5px 0", fontSize: "13px",
                  borderBottom: i < 3 ? "1px solid #f1f3f5" : "none",
                }}>
                  <span style={{ color: "#6c757d" }}>{label}</span>
                  <span style={{
                    fontWeight: label === "Paid Amount" ? 600 : 500,
                    color: label === "Remaining Balance" && receipt.remainingBalance > 0 ? "#e24b4a" : "#212529",
                  }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Footer note */}
            <p style={{ fontSize: "11px", color: "#adb5bd", textAlign: "center", margin: 0 }}>
              Thank you for choosing Ceybreeze Tours. This is a computer-generated receipt.
            </p>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer style={{ padding: "12px 20px", borderTop: "1px solid #f1f3f5" }}>
        <Button
          onClick={handleDownloadPDF}
          disabled={!receipt}
          style={{ background: "#00276b", border: "none", fontSize: "13px" }}
        >
          Download PDF
        </Button>
        <Button variant="secondary" onClick={onHide} style={{ fontSize: "13px" }}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}