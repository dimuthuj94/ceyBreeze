// src/components/modals/customer/ViewAndPayVehicleOnlyModal.js
import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Card, Spinner, Table } from "react-bootstrap";
import { db, storage } from "../../../firebase";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import VehicleOnlyBookedInvoiceModal from "../bookings/VehicleOnlyBookedInvoiceModal";
import TermsAndConditionsModal from "../TermsAndConditionsModal";

export default function ViewAndPayVehicleOnlyModal({ show, onHide, booking }) {
  const [paymentMethod, setPaymentMethod] = useState("Credit Card");
  const [paymentAmount, setPaymentAmount] = useState("full");
  const [paymentAmountValue, setPaymentAmountValue] = useState(0);
  const [receiptFile, setReceiptFile] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (!show || !booking) return;
    setPaymentMethod("Credit Card"); setPaymentAmount("full"); setReceiptFile(null);
    const total = booking.totalPrice || 0;
    setPaymentAmountValue(total);
    getDoc(doc(db, "invoiceTermsAndConditions", "BankDetails")).then(snap => { if (snap.exists()) setBankDetails(snap.data()); }).catch(console.error);
  }, [show, booking]);

  const handleConfirmPayment = async () => {
    if (!booking || !user) return;
    if (booking.customerEmail !== user.email) return alert("Email mismatch.");
    if (paymentMethod === "Bank Transfer" && !receiptFile) return alert("Please upload a receipt.");
    setSaving(true);
    let receiptURL = null;
    try {
      if (paymentMethod === "Bank Transfer") {
        const storageRef = ref(storage, `paymentReceipts/${user.email}/${booking.id}_${receiptFile.name}`);
        await uploadBytes(storageRef, receiptFile);
        receiptURL = await getDownloadURL(storageRef);
      }
      const vehiclesArray = Array.isArray(booking.vehicles) ? booking.vehicles : Object.values(booking.vehicles || {});
      await setDoc(doc(db, "paidVehicleBookings", booking.id), { ...booking, vehicles: vehiclesArray, paymentMethod, paymentAmount, paymentAmountValue, receiptURL, paidAt: new Date() });
      await deleteDoc(doc(db, "unpaidVehicleBookings", booking.id));
      alert("✅ Payment successful!");
      setShowTermsModal(false);
      onHide();
    } catch (err) { console.error(err); alert("❌ Failed to confirm payment."); }
    finally { setSaving(false); }
  };

  if (!booking) return null;
  const b = booking;
  const total = b.totalPrice || 0;
  const half = total / 2;

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }}>
          <div>
            <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#fff" }}>View & Pay — Vehicle Reservation</p>
            <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>{b.bookingId || b.id} · {b.arrivalDate}</p>
          </div>
          <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
        </Modal.Header>

        <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto", padding: "20px", position: "relative" }}>
          <div className="d-flex flex-wrap justify-content-between align-items-center text-muted small mb-3 p-2" style={{ background: "#f8fbff", borderRadius: "8px" }}>
            <div className="me-3 mb-1"><strong>Booking ID:</strong> <span className="text-secondary">{b.bookingId || b.id}</span></div>
            <div className="me-3 mb-1"><strong>Arrival Date:</strong> <span className="text-secondary">{b.arrivalDate || "N/A"}</span></div>
            <div><strong>Total:</strong> <span className="text-success fw-semibold">${b.totalPrice || 0}</span></div>
          </div>

          {/* Booking Summary */}
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

          {/* Vehicles */}
          <Card className="mb-3 shadow-sm step6-card">
            <Card.Header className="fw-semibold step1-header">Vehicles</Card.Header>
            <Card.Body className="step1-body">
              <Table bordered hover size="sm">
                <thead><tr><th className="text-center">Vehicle</th><th className="text-center">Price/Day</th><th className="text-center">Qty</th><th className="text-center">Days</th><th className="text-center">Subtotal</th></tr></thead>
                <tbody>{b.vehicles?.map((v, i) => <tr key={i}><td>{v.id}</td><td style={{textAlign:"right"}}>${v.pricePerDay}</td><td style={{textAlign:"right"}}>{v.quantity}</td><td style={{textAlign:"right"}}>{v.days}</td><td style={{textAlign:"right"}}>${v.subtotal}</td></tr>)}</tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Price Summary */}
          {Array.isArray(b.vehicles) && (
            <Card className="mb-3 shadow-sm step6-card">
              <Card.Header className="fw-semibold step1-header">Price Summary</Card.Header>
              <Card.Body className="step1-body">
                {b.vehicles.map((v, i) => <div key={i} className="d-flex justify-content-between mb-1"><span>{v.id} (${v.pricePerDay} × {v.quantity} × {v.days})</span><span>${v.subtotal}</span></div>)}
                <div className="d-flex justify-content-between fw-bold mt-2"><span>Total</span><span>${b.totalPrice}</span></div>
              </Card.Body>
            </Card>
          )}

          <Button className="step1-next-btn mb-3" onClick={() => setShowInvoiceModal(true)}>View Invoice</Button>
          <h5 className="mt-4 mb-3 text-uppercase" style={{ color: "#00276b", letterSpacing: "1px" }}>MAKE PAYMENT</h5>

          <Card className="mb-3 shadow-sm">
            <Card.Header className="fw-semibold step1-header">Select Payment Amount</Card.Header>
            <Card.Body className="step1-body">
              <Form.Check type="radio" label={`50% Advance — $${half}`} checked={paymentAmount === "half"} onChange={() => { setPaymentAmount("half"); setPaymentAmountValue(half); }} />
              <Form.Check type="radio" label={`Full Payment — $${total}`} checked={paymentAmount === "full"} onChange={() => { setPaymentAmount("full"); setPaymentAmountValue(total); }} />
            </Card.Body>
          </Card>

          <Card className="mb-3 shadow-sm">
            <Card.Header className="fw-semibold step1-header">Select Payment Method</Card.Header>
            <Card.Body className="step1-body">
              <Form.Check type="radio" label="Credit Card" value="Credit Card" checked={paymentMethod === "Credit Card"} onChange={(e) => setPaymentMethod(e.target.value)} />
              <Form.Check type="radio" label="Bank Transfer" value="Bank Transfer" checked={paymentMethod === "Bank Transfer"} onChange={(e) => setPaymentMethod(e.target.value)} />
            </Card.Body>
          </Card>

          {paymentMethod === "Credit Card" && (
            <Card className="mb-3 shadow-sm">
              <Card.Header className="fw-semibold step1-header">Credit Card Details</Card.Header>
              <Card.Body className="step1-body">
                <Form.Control placeholder="Enter Your Card Number" disabled className="mb-2" />
                <Form.Control placeholder="MM/YY" disabled className="mb-2" />
                <Form.Control className="mb-4" placeholder="CVV" disabled />
                <p className="mb-1 fw-semibold text-success">Paying Amount: ${paymentAmountValue.toLocaleString()} ({paymentAmount === "half" ? "50% Advance" : "Full Payment"})</p>
                <p className="text-muted mt-2">(Credit Card payments are disabled)</p>
              </Card.Body>
            </Card>
          )}

          {paymentMethod === "Bank Transfer" && (<>
            <Card className="mt-3 mb-3 shadow-sm">
              <Card.Header className="fw-semibold border-bottom-0" style={{ backgroundColor: "#00276b", color: "white" }}>Bank Account Details</Card.Header>
              <Card.Body className="p-3" style={{ backgroundColor: "#f8fbff" }}>
                {bankDetails ? (<ul className="mb-2">{Object.entries(bankDetails).map(([key, value]) => <li key={key}><strong>{key}:</strong> <span className="float-end">{value}</span></li>)}<p className="mb-2 fw-semibold text-success">Paying Amount: ${paymentAmountValue.toLocaleString()} ({paymentAmount === "half" ? "50% Advance" : "Full Payment"})</p></ul>) : null}
              </Card.Body>
            </Card>
            <Card className="mb-3 shadow-sm">
              <Card.Header className="fw-semibold step1-header">Upload Receipt</Card.Header>
              <Card.Body className="step1-body"><Form.Control type="file" onChange={(e) => setReceiptFile(e.target.files[0])} /></Card.Body>
            </Card>
          </>)}

          <div className="d-flex justify-content-end">
            <Button variant="success" onClick={() => setShowTermsModal(true)} disabled={saving || paymentMethod === "Credit Card" || (paymentMethod === "Bank Transfer" && !receiptFile)}>
              {saving ? "Processing..." : "Confirm & Pay"}
            </Button>
          </div>
          {saving && <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999 }}><Spinner animation="border" variant="primary" /><p className="mt-2 fw-semibold">Processing Payment...</p></div>}
        </Modal.Body>

        <Modal.Footer style={{ padding: "12px 20px" }}>
          <Button variant="secondary" onClick={onHide} style={{ fontSize: "13px" }}>Close</Button>
        </Modal.Footer>
      </Modal>
      <VehicleOnlyBookedInvoiceModal show={showInvoiceModal} onHide={() => setShowInvoiceModal(false)} b={b} selectedBooking={b} />
      <TermsAndConditionsModal show={showTermsModal} onHide={() => setShowTermsModal(false)} onConfirm={handleConfirmPayment} />
    </>
  );
}