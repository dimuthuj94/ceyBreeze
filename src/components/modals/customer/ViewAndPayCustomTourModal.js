// src/components/modals/customer/ViewAndPayCustomTourModal.js
import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Card, Spinner } from "react-bootstrap";
import { db, storage } from "../../../firebase";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import CustomBookedTourInvoiceModal from "../bookings/CustomBookedTourInvoiceModal";
import TermsAndConditionsModal from "../TermsAndConditionsModal";

export default function ViewAndPayCustomTourModal({ show, onHide, booking }) {
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
    if (!show) return;
    setPaymentMethod("Credit Card"); setPaymentAmount("full"); setPaymentAmountValue(0); setReceiptFile(null);
    getDoc(doc(db, "invoiceTermsAndConditions", "BankDetails")).then(snap => { if (snap.exists()) setBankDetails(snap.data()); }).catch(console.error);
  }, [show]);

  const handleConfirmPayment = async () => {
    if (!booking || !user) return;
    if (paymentMethod === "Bank Transfer" && !receiptFile) return alert("Please upload a receipt.");
    setSaving(true);
    const rawPrice = booking?.["Pricing Summary"]?.["Total Price"];
    const totalPrice = parseFloat(String(rawPrice || "0").replace(/[^\d.]/g, "")) || 0;
    const paidAmount = paymentAmount === "half" ? totalPrice / 2 : totalPrice;
    let receiptURL = null;
    try {
      if (paymentMethod === "Bank Transfer") {
        const storageRef = ref(storage, `paymentReceipts/${user.email}/${booking.id}_${receiptFile.name}`);
        await uploadBytes(storageRef, receiptFile);
        receiptURL = await getDownloadURL(storageRef);
      }
      await setDoc(doc(db, "paidCustomBookings", booking.id), { ...booking, paymentMethod, receiptURL, paidAt: new Date(), paymentAmount, paymentAmountValue: paidAmount });
      await deleteDoc(doc(db, "unpaidCustomBookings", booking.id));
      alert("✅ Payment successful!");
      setShowTermsModal(false);
      onHide();
    } catch (err) { console.error(err); alert("❌ Failed to confirm payment."); }
    finally { setSaving(false); }
  };

  if (!booking) return null;
  const b = booking;
  const rawPrice = b?.["Pricing Summary"]?.["Total Price"];
  const totalPrice = parseFloat(String(rawPrice || "0").replace(/[^\d.]/g, "")) || 0;
  const halfPrice = totalPrice / 2;

  const renderSection = (section, content) => {
    if (section === "Locations, Adventures and Activities") {
      return (<>
        {content["Selected Locations"] && (<><h6 className="fw-semibold mt-2">Selected locations</h6><ul>{content["Selected Locations"].map((day, i) => <li key={i}>{day}</li>)}</ul></>)}
        {content["Adventures"]?.length > 0 && (<><h6 className="fw-semibold mt-3">Adventures</h6><ul>{content["Adventures"].map((act, i) => <li key={i}>{act}</li>)}</ul></>)}
        {content["Activities"]?.length > 0 && (<><h6 className="fw-semibold mt-3">Activities</h6><ul>{content["Activities"].map((act, i) => <li key={i}>{act}</li>)}</ul></>)}
      </>);
    }
    if (section === "Meals & Notes") {
      const meal = content["Meal Preference"];
      const notes = content["Tour Notes"];
      const showMeal = meal && meal.trim() !== "" && meal !== "N/A";
      const notesList = typeof notes === "string" ? notes.split(/\r?\n/).map(n => n.trim()).filter(n => n !== "" && n !== "N/A") : [];
      if (!showMeal && notesList.length === 0) return null;
      return (<div>
        {showMeal && <p><strong>Meal Preference:</strong> <span className="float-end fw-semibold">{meal}</span></p>}
        {notesList.length > 0 && <div className="mt-2"><strong>Tour Notes:</strong><ul className="mb-0 ps-3">{notesList.map((note, i) => <li key={i}>{note}</li>)}</ul></div>}
      </div>);
    }
    if (section === "Traveler Details") {
      const order = ["Full Name","Arrival Date","Departure Date","Arrival Airport","Adults","Children","Infants","Tour Guide","Child Car Seat"];
      return <ul className="mb-0">{order.map(key => content[key] ? <li key={key}><strong>{key}:</strong> <span className="float-end fw-semibold">{content[key]}</span></li> : null)}</ul>;
    }
    if (section === "Accommodation") {
      return (<>
        <p><strong>Type:</strong> {content.Type}</p>
        {content["Luxury Rooms"]?.length > 0 && (<><h6 className="fw-semibold mt-2">Luxury Rooms</h6><ul>{content["Luxury Rooms"].map((room, i) => <li key={i}>{room.label} <span className="float-end fw-semibold">{room.price}</span></li>)}</ul></>)}
        {content["Luxury Rooms Total"] && <p className="fw-semibold"><strong>Luxury Rooms Total:</strong><span className="float-end">{content["Luxury Rooms Total"]}</span></p>}
      </>);
    }
    if (section === "Pricing Summary") {
      const pricing = content;
      return (<>
        <p><strong>Travelers:</strong> <span className="float-end fw-semibold">{pricing.Travelers}</span></p>
        <p><strong>Nights:</strong> <span className="float-end fw-semibold">{pricing.Nights}</span></p>
        {Array.isArray(pricing["Tour Price"]) && pricing["Tour Price"].length > 0 && (<><h6 className="fw-semibold mt-2">Tour Price</h6><ul className="mb-0">{pricing["Tour Price"].map((item, i) => <li key={i} className="d-flex justify-content-between"><span>{item.label}</span>{item.price && <span className="fw-semibold">{item.price}</span>}</li>)}</ul></>)}
        {Array.isArray(pricing["Accommodation"]) && pricing["Accommodation"].length > 0 && (<><h6 className="fw-semibold mt-2">Accommodation</h6><ul className="mb-0">{pricing["Accommodation"].map((item, i) => <li key={i} className="d-flex justify-content-between"><span>{item.label}</span>{item.price && <span className="fw-semibold">{item.price}</span>}</li>)}</ul></>)}
        {pricing["Luxury Rooms"]?.length > 0 && (<><h6 className="fw-semibold mt-2">Luxury Rooms</h6><ul>{pricing["Luxury Rooms"].map((room, i) => <li key={i} className="d-flex justify-content-between"><span>{room.label}</span><span className="fw-semibold">{room.price}</span></li>)}</ul></>)}
        {pricing["Adventures"]?.length > 0 && (<><h6 className="fw-semibold mt-2">Adventures</h6><ul>{pricing["Adventures"].map((act, i) => <li key={i} className="d-flex justify-content-between"><span>{act.label}</span><span className="fw-semibold">{act.price}</span></li>)}</ul></>)}
        {pricing["Activities"]?.length > 0 && (<><h6 className="fw-semibold mt-2">Activities</h6><ul>{pricing["Activities"].map((act, i) => <li key={i} className="d-flex justify-content-between"><span>{act.label}</span><span className="fw-semibold">{act.price}</span></li>)}</ul></>)}
        {pricing.Transport && pricing.Transport !== "$0" && <p className="fw-semibold"><strong>Transport:</strong><span className="float-end">{pricing.Transport}</span></p>}
        {pricing["Tour Guide"] && pricing["Tour Guide"] !== "$0" && <p className="fw-semibold"><strong>Tour Guide:</strong><span className="float-end">{pricing["Tour Guide"]}</span></p>}
        {pricing["Total Price"] && <p className="fw-semibold border-top pt-2 mt-2"><strong>Total Price:</strong><span className="float-end">{pricing["Total Price"]}</span></p>}
      </>);
    }
    if (typeof content === "object" && !Array.isArray(content)) {
      return <ul className="mb-0">{Object.entries(content).map(([key, value]) => <li key={key}><strong>{key}:</strong> <span className="float-end fw-semibold">{Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value, null, 2) : value}</span></li>)}</ul>;
    }
    if (Array.isArray(content)) return <ul className="mb-0">{content.map((item, i) => <li key={i}>{item}</li>)}</ul>;
    return <p>{content}</p>;
  };

  const sections = b.sectionOrder || ["Tour Selection","Traveler Details","Accommodation","Transport Options","Tour Inclusions","Locations, Adventures and Activities","Meals & Notes","Pricing Summary"];

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }}>
          <div>
            <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#fff" }}>View & Pay — Custom Tour</p>
            <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>{b.bookingReference || b.id} · {b["Tour Selection"]?.Tour || "Tour"}</p>
          </div>
          <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
        </Modal.Header>

        <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto", padding: "20px", position: "relative" }}>
          <div className="d-flex flex-wrap justify-content-between align-items-center text-muted small mb-3 p-2" style={{ background: "#f8fbff", borderRadius: "8px" }}>
            <div className="me-3 mb-1"><strong>Booking Reference:</strong> <span className="text-secondary">{b.bookingReference || "N/A"}</span></div>
            <div className="me-3 mb-1"><strong>Tour:</strong> <span className="text-secondary">{b["Tour Selection"]?.Tour || "N/A"}</span> <span className="text-secondary small">({b["Tour Selection"]?.Nights || 0} nights)</span></div>
            <div className="me-3 mb-1"><strong>Arrival Date:</strong> <span className="text-secondary">{b["Traveler Details"]?.["Arrival Date"] || "N/A"}</span></div>
            <div><strong>Total Price:</strong> <span className="text-success fw-semibold">{b["Pricing Summary"]?.["Total Price"] || "$0"}</span></div>
          </div>

          {sections.map((section) => {
            const content = b[section];
            if (!content) return null;
            const rendered = renderSection(section, content);
            if (!rendered) return null;
            return (
              <Card key={section} className="mb-3 shadow-sm step6-card">
                <Card.Header className="fw-semibold step1-header">{section}</Card.Header>
                <Card.Body className="step1-body">{rendered}</Card.Body>
              </Card>
            );
          })}

          <Button className="step1-next-btn" onClick={() => setShowInvoiceModal(true)}>View Invoice</Button>
          <h5 className="mt-4 mb-3 text-uppercase" style={{ color: "#00276b", letterSpacing: "1px" }}>MAKE PAYMENT</h5>

          <Card className="mt-3 shadow-sm">
            <Card.Header className="fw-semibold border-bottom-0" style={{ backgroundColor: "#00276b", color: "white" }}>Select Payment Amount</Card.Header>
            <Card.Body className="p-3" style={{ backgroundColor: "#f8fbff" }}>
              <Form>
                <Form.Check type="radio" name="paymentAmount" id="halfPayment" label={`50% Advance Payment — $${halfPrice.toLocaleString()}`} checked={paymentAmount === "half"} onChange={() => { setPaymentAmount("half"); setPaymentAmountValue(halfPrice); }} />
                <Form.Check type="radio" name="paymentAmount" id="fullPayment" label={`Full Payment — $${totalPrice.toLocaleString()}`} checked={paymentAmount === "full"} onChange={() => { setPaymentAmount("full"); setPaymentAmountValue(totalPrice); }} />
              </Form>
            </Card.Body>
          </Card>

          <Card className="mt-3 shadow-sm">
            <Card.Header className="fw-semibold border-bottom-0" style={{ backgroundColor: "#00276b", color: "white" }}>Select Payment Method</Card.Header>
            <Card.Body className="p-3" style={{ backgroundColor: "#f8fbff" }}>
              <Form.Check type="radio" label="Credit Card" name="paymentMethod" value="Credit Card" checked={paymentMethod === "Credit Card"} onChange={(e) => setPaymentMethod(e.target.value)} disabled={saving} />
              <Form.Check type="radio" label="Bank Transfer" name="paymentMethod" value="Bank Transfer" checked={paymentMethod === "Bank Transfer"} onChange={(e) => setPaymentMethod(e.target.value)} disabled={saving} />
            </Card.Body>
          </Card>

          {paymentMethod === "Bank Transfer" && (<>
            <Card className="mt-3 shadow-sm">
              <Card.Header className="fw-semibold border-bottom-0" style={{ backgroundColor: "#00276b", color: "white" }}>Bank Account Details</Card.Header>
              <Card.Body className="p-3" style={{ backgroundColor: "#f8fbff" }}>
                {bankDetails ? (<ul className="mb-2">{Object.entries(bankDetails).map(([key, value]) => <li key={key}><strong>{key}:</strong> <span className="float-end">{value}</span></li>)}<p className="mb-2 text-success fw-semibold">Paying Amount: ${paymentAmountValue.toLocaleString()} ({paymentAmount === "half" ? "50% Advance" : "Full Payment"})</p></ul>) : <p className="text-muted small mb-0">Loading bank details...</p>}
              </Card.Body>
            </Card>
            <Card className="mt-3 shadow-sm">
              <Card.Header className="fw-semibold border-bottom-0" style={{ backgroundColor: "#00276b", color: "white" }}>Upload Bank Transfer Receipt</Card.Header>
              <Card.Body className="p-3" style={{ backgroundColor: "#f8fbff" }}>
                <Form.Control type="file" accept="image/*,application/pdf" onChange={(e) => setReceiptFile(e.target.files[0])} disabled={saving} />
              </Card.Body>
            </Card>
          </>)}

          {paymentMethod === "Credit Card" && (
            <Card className="mt-3 shadow-sm">
              <Card.Header className="fw-semibold border-bottom-0" style={{ backgroundColor: "#00276b", color: "white" }}>Credit Card Details</Card.Header>
              <Card.Body className="p-3" style={{ backgroundColor: "#f8fbff" }}>
                <Form><Form.Group className="mb-2"><Form.Label>Card Number</Form.Label><Form.Control type="text" placeholder="Enter your card number" disabled /></Form.Group><Form.Group className="mb-2"><Form.Label>Expiry Date</Form.Label><Form.Control type="text" placeholder="MM/YY" disabled /></Form.Group><Form.Group><Form.Label>CVV</Form.Label><Form.Control type="password" placeholder="***" disabled /></Form.Group></Form>
                <p className="mb-2 text-success fw-semibold">Paying Amount: ${paymentAmountValue.toLocaleString()} ({paymentAmount === "half" ? "50% Advance" : "Full Payment"})</p>
                <p className="text-muted mt-2 small">(Credit Card payments are temporarily disabled)</p>
              </Card.Body>
            </Card>
          )}

          <div className="d-flex justify-content-end mt-3">
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
      <CustomBookedTourInvoiceModal show={showInvoiceModal} onHide={() => setShowInvoiceModal(false)} b={b} selectedBooking={b} />
      <TermsAndConditionsModal show={showTermsModal} onHide={() => setShowTermsModal(false)} onConfirm={handleConfirmPayment} />
    </>
  );
}