// src/components/modals/bookings/ViewFinalReceiptModal.js
import React, { useEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import html2pdf from "html2pdf.js";

const fmtTS = (ts) => {
  if (!ts) return "N/A";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const Row = ({ label, value, bold, color, borderBottom = true }) => (
  <div style={{
    display: "flex", justifyContent: "space-between",
    padding: "6px 0", fontSize: "13px",
    borderBottom: borderBottom ? "1px solid #f1f3f5" : "none",
  }}>
    <span style={{ color: "#6c757d" }}>{label}</span>
    <span style={{ fontWeight: bold ? 700 : 500, color: color || "#212529" }}>{value}</span>
  </div>
);

export default function ViewFinalReceiptModal({ show, onHide, bookingId }) {
  const [record,  setRecord]  = useState(null);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef();

  useEffect(() => {
    if (!bookingId || !show) return;
    setLoading(true);
    setRecord(null);
    getDoc(doc(db, "financeTobeReceived", bookingId))
      .then(snap => { if (snap.exists()) setRecord({ id: snap.id, ...snap.data() }); setLoading(false); })
      .catch(() => setLoading(false));
  }, [bookingId, show]);

  const handleDownloadPDF = () => {
    if (!pdfRef.current) return;
    html2pdf().set({
      margin: 10,
      filename: `BalanceReceipt_${record?.bookingReference || bookingId}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a5", orientation: "portrait" },
    }).from(pdfRef.current).save();
  };

  if (!bookingId) return null;

  const r = record;
  const initialPaidUSD   = r?.paidAmountUSD   || 0;
  const initialPaidLKR   = r?.paidAmountLKR   || 0;
  const settledUSD       = r?.settledAmountUSD || 0;
  const settledLKR       = r?.settledAmountLKR || 0;
  const totalPaidUSD     = initialPaidUSD + settledUSD;
  const totalPaidLKR     = initialPaidLKR + settledLKR;
  const remainingUSD     = r?.remainingBalanceUSD || 0;
  const remainingLKR     = r?.remainingBalanceLKR || 0;
  const totalUSD         = r?.totalAmountUSD || 0;
  const totalLKR         = r?.totalAmountLKR || 0;

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <Modal.Header closeButton style={{ backgroundColor: "#27a86e", color: "#fff" }} className="border-0">
        <Modal.Title style={{ fontSize: "15px", fontWeight: 500, color: "#fff" }}>
          Balance Payment Receipt
        </Modal.Title>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body style={{ padding: "20px", maxHeight: "80vh", overflowY: "auto" }}>
        {loading ? (
          <p style={{ color: "#adb5bd", textAlign: "center", padding: "40px" }}>Loading...</p>
        ) : !r ? (
          <p style={{ color: "#adb5bd", textAlign: "center", padding: "40px" }}>No balance payment record found.</p>
        ) : !settledUSD ? (
          <p style={{ color: "#adb5bd", textAlign: "center", padding: "40px" }}>No balance settlement has been recorded yet.</p>
        ) : (
          <div ref={pdfRef} style={{ fontFamily: "Arial, sans-serif" }}>

            {/* Letterhead */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "#00276b", margin: "0 0 2px" }}>CEYBREEZE TOURS (PVT) LTD</p>
                <p style={{ fontSize: "11px", color: "#6c757d", margin: 0 }}>No. 45, Beach Road, Colombo, Sri Lanka</p>
                <p style={{ fontSize: "11px", color: "#6c757d", margin: 0 }}>info@ceybreezetours.com · +94 11 234 5678</p>
              </div>
              <img src="/images/logo.png" alt="Logo" style={{ maxWidth: "80px", maxHeight: "80px", objectFit: "contain" }} />
            </div>

            {/* Title bar */}
            <div style={{ background: "#27a86e", color: "#fff", textAlign: "center", padding: "8px", fontSize: "13px", fontWeight: 600, marginBottom: "16px", letterSpacing: "0.5px" }}>
              BALANCE PAYMENT RECEIPT
            </div>

            {/* Booking meta */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 20px", marginBottom: "16px" }}>
              {[
                ["Booking Reference", r.bookingReference],
                ["Customer",          r.customerName],
                ["Tour",              r.tourName],
                ["Arrival Date",      r.arrivalDate],
                ["Settlement Date",   fmtTS(r.settledAt)],
                ["Exchange Rate",     r.settleExchangeRate ? `1 USD = LKR ${r.settleExchangeRate}` : "N/A"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", marginBottom: "4px" }}>
                  <span style={{ fontSize: "10px", color: "#adb5bd" }}>{label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#212529" }}>{value || "N/A"}</span>
                </div>
              ))}
            </div>

            {/* USD breakdown */}
            <div style={{ position: "relative", border: "1px solid #e9ecef", borderRadius: "8px", padding: "14px", marginBottom: "14px" }}>
              {/* RECEIVED stamp */}
              <div style={{
                position: "absolute", top: "10px", right: "10px",
                border: "3px solid #1d9e75", borderRadius: "6px",
                padding: "3px 10px", transform: "rotate(-8deg)", opacity: 0.85,
              }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#1d9e75", letterSpacing: "2px" }}>RECEIVED</p>
                <p style={{ margin: 0, fontSize: "9px", color: "#1d9e75", textAlign: "center" }}>{fmtTS(r.settledAt)}</p>
              </div>

              <p style={{ fontSize: "10px", fontWeight: 700, color: "#00276b", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>USD Payment Summary</p>
              <Row label="Total Tour Price"                value={`USD ${totalUSD.toFixed(2)}`} />
              <Row label="Initial Payment (Receipt)"       value={`USD ${initialPaidUSD.toFixed(2)}`} />
              <Row label="Balance Collected (This Receipt)" value={`USD ${settledUSD.toFixed(2)}`} bold color="#27a86e" />
              <Row label="Total Collected"                 value={`USD ${totalPaidUSD.toFixed(2)}`} bold color="#085041" />
              <Row label="Outstanding Balance"             value={`USD ${remainingUSD.toFixed(2)}`} bold color={remainingUSD > 0 ? "#e24b4a" : "#27a86e"} borderBottom={false} />
            </div>

            {/* LKR breakdown */}
            <div style={{ border: "1px solid #fac775", borderRadius: "8px", padding: "14px", marginBottom: "14px", background: "#fffbf0" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "#633806", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>LKR Equivalent — Internal Record</p>
              <Row label="Total Tour Price"     value={`LKR ${totalLKR.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
              <Row label="Initial Payment"      value={`LKR ${initialPaidLKR.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
              <Row label="Balance Collected"    value={`LKR ${settledLKR.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} bold color="#27a86e" />
              <Row label="Total Collected"      value={`LKR ${totalPaidLKR.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} bold color="#085041" />
              <Row label="Outstanding Balance"  value={`LKR ${remainingLKR.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} bold color={remainingLKR > 0 ? "#e24b4a" : "#27a86e"} borderBottom={false} />
            </div>

            {r.settleNotes && (
              <p style={{ fontSize: "11px", color: "#6c757d", margin: "0 0 12px" }}>
                <strong>Notes:</strong> {r.settleNotes}
              </p>
            )}

            <p style={{ fontSize: "11px", color: "#adb5bd", textAlign: "center", margin: 0 }}>
              Thank you for choosing Ceybreeze Tours. This is a computer-generated receipt.
            </p>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer style={{ padding: "12px 20px" }}>
        <Button
          onClick={handleDownloadPDF}
          disabled={!r || !r.settledAmountUSD}
          style={{ background: "#27a86e", border: "none", fontSize: "13px" }}
        >
          ⬇ Download PDF
        </Button>
        <Button variant="secondary" onClick={onHide} style={{ fontSize: "13px" }}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}