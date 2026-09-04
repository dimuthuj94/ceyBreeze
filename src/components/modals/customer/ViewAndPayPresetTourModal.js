// src/components/modals/customer/ViewAndPayPresetTourModal.js
import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Card, Spinner } from "react-bootstrap";
import { db, storage } from "../../../firebase";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import PresetBookedTourInvoiceModal from "../bookings/PresetBookedTourInvoiceModal";
import TermsAndConditionsModal from "../TermsAndConditionsModal";

export default function ViewAndPayPresetTourModal({ show, onHide, booking }) {
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
    setPaymentMethod("Credit Card");
    setPaymentAmount("full");
    setPaymentAmountValue(0);
    setReceiptFile(null);
    const fetchBank = async () => {
      try {
        const snap = await getDoc(doc(db, "invoiceTermsAndConditions", "BankDetails"));
        if (snap.exists()) setBankDetails(snap.data());
      } catch (e) { console.error(e); }
    };
    fetchBank();
  }, [show]);

  const handleConfirmPayment = async () => {
    if (!booking || !user) return;
    if (paymentMethod === "Bank Transfer" && !receiptFile) return alert("Please upload a receipt.");
    setSaving(true);
    const rawPrice = booking?.["Pricing Summary"]?.["Total Price"];
    const totalPrice = parseFloat(String(rawPrice || "0").replace(/[^\d.]/g, "")) || 0;
    const paidAmount = paymentAmount === "half" ? totalPrice / 2 : totalPrice;
    const paymentType = paymentAmount === "half" ? "50% Advance" : "Full Payment";
    let receiptURL = null;
    try {
      if (paymentMethod === "Bank Transfer") {
        const storageRef = ref(storage, `paymentReceipts/${user.email}/${booking.id}_${receiptFile.name}`);
        await uploadBytes(storageRef, receiptFile);
        receiptURL = await getDownloadURL(storageRef);
      }
      await setDoc(doc(db, "paidPresetBookings", booking.id), {
        ...booking, paymentMethod, receiptURL, paidAt: new Date(), paymentType, paidAmount,
      });
      await deleteDoc(doc(db, "unpaidPresetBookings", booking.id));
      alert("✅ Payment successful!");
      setShowTermsModal(false);
      onHide();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to confirm payment.");
    } finally { setSaving(false); }
  };

  if (!booking) return null;
  const b = booking;
  const rawPrice = b?.["Pricing Summary"]?.["Total Price"];
  const totalPrice = parseFloat(String(rawPrice || "0").replace(/[^\d.]/g, "")) || 0;
  const halfPrice = totalPrice / 2;

  const renderSection = (section, content) => {
    if (section === "Daily Plan & Destinations") {
      const hasDailyPlan = Array.isArray(content["🗓️ Daily Plan"]) && content["🗓️ Daily Plan"].length > 0;
      const hasDestinations = Array.isArray(content["🗺️ Destinations"]) && content["🗺️ Destinations"].length > 0;
      const hasActivities = Array.isArray(content["🎯 Activities Planned"]) && content["🎯 Activities Planned"].length > 0;
      if (!hasDailyPlan && !hasDestinations && !hasActivities) return null;
      return (<>
        {hasDailyPlan && (<><h6 className="fw-semibold mt-2">Daily Plan</h6><ul>{content["🗓️ Daily Plan"].map((day, i) => <li key={i}>{day}</li>)}</ul></>)}
        {hasDestinations && (<><h6 className="fw-semibold mt-3">Destinations</h6>{content["🗺️ Destinations"].map((d, i) => (<div key={i} className="mb-2">{d.city} - <ul className="mb-0">{d.destinations?.map((place, j) => <li key={j}>{place}</li>)}</ul></div>))}</>)}
        {hasActivities && (<><h6 className="fw-semibold mt-3">Activities Planned</h6><ul>{content["🎯 Activities Planned"].map((act, i) => <li key={i}>{act}</li>)}</ul></>)}
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
    if (section === "Travelers") {
      const order = ["Full Name","Arrival Date","Arrival Airport","Adults","Children","Infants","Tour Guide","Child Car Seat"];
      const filled = order.filter(k => content[k]);
      if (filled.length === 0) return null;
      return <ul className="mb-0">{filled.map(key => <li key={key}><strong>{key}:</strong> <span className="float-end fw-semibold">{content[key]}</span></li>)}</ul>;
    }
    if (section === "Accommodation") {
      const hasType = content.Type != null && content.Type.toString().trim() !== "" && content.Type !== "0" && content.Type !== "$0";
      const hasLuxuryRooms = Array.isArray(content["Luxury Rooms"]) && content["Luxury Rooms"].some(r => (r.label && r.label.toString().trim() !== "") || (r.price && r.price.toString().trim() !== "" && r.price !== 0 && r.price !== "$0"));
      const hasLuxuryTotal = content["Luxury Rooms Total"] != null && content["Luxury Rooms Total"].toString().trim() !== "" && content["Luxury Rooms Total"] !== 0 && content["Luxury Rooms Total"] !== "$0";
      if (!hasType && !hasLuxuryRooms && !hasLuxuryTotal) return null;
      return (<>
        {hasType && <p><strong>Type:</strong> <span className="float-end fw-semibold">{content.Type}</span></p>}
        {hasLuxuryRooms && (<><h6 className="fw-semibold mt-2">Luxury Rooms</h6><ul>{content["Luxury Rooms"].map((room, i) => { if ((!room.label || room.label.toString().trim() === "") && (!room.price || room.price.toString().trim() === "" || room.price === 0 || room.price === "$0")) return null; return <li key={i}>{room.label}<span className="float-end fw-semibold">{room.price}</span></li>; })}</ul></>)}
        {hasLuxuryTotal && <p className="fw-semibold">Luxury Rooms Total:<span className="float-end">{content["Luxury Rooms Total"]}</span></p>}
      </>);
    }
    if (section === "Pricing Summary") {
      const pricing = content;
      const hasPricing = pricing && Object.values(pricing).some(v => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0) && !(typeof v === "object" && Object.keys(v).length === 0));
      if (!hasPricing) return null;
      return (<>
        {pricing.Travelers && <p><strong>Travelers:</strong> <span className="float-end fw-semibold">{pricing.Travelers}</span></p>}
        {pricing.Nights && <p><strong>Nights:</strong> <span className="float-end fw-semibold">{pricing.Nights}</span></p>}
        {pricing["Tour Price"] && (<><h6 className="fw-semibold mt-2">Tour Price:</h6><ul><li>Per Night {pricing["Tour Price"]["Per Day"]}<li>Total <span className="float-end fw-semibold">{pricing["Tour Price"].Total}</span></li></li></ul></>)}
        {pricing["Accommodation"] && Object.keys(pricing["Accommodation"]).length > 0 && (<><h6 className="fw-semibold mt-2">Accommodation</h6><ul>{Object.entries(pricing["Accommodation"]).map(([key, value]) => <li key={key}><span>{key}:</span><span className="float-end fw-semibold">{value}</span></li>)}</ul></>)}
        {Array.isArray(pricing["Luxury Rooms"]) && pricing["Luxury Rooms"].filter(r => r && r.label && r.label.trim() !== "" && r.price && r.price !== "0" && r.price !== "$0").length > 0 && (<><h6 className="fw-semibold mt-2">Luxury Rooms</h6><ul className="mb-2 ps-3" style={{listStyleType:"disc"}}>{pricing["Luxury Rooms"].filter(r => r && r.label && r.label.trim() !== "" && r.price && r.price !== "0" && r.price !== "$0").map((room, i) => <li key={i}>{room.label}<span className="float-end fw-semibold">{room.price}</span></li>)}</ul></>)}
        {Array.isArray(pricing["Activities"]) && pricing["Activities"].filter(a => a && a.label && a.label.trim() !== "" && a.price && a.price !== "0" && a.price !== "$0").length > 0 && (<><h6 className="fw-semibold mt-2">Activities</h6><ul className="mb-2 ps-3" style={{listStyleType:"disc"}}>{pricing["Activities"].filter(a => a && a.label && a.label.trim() !== "" && a.price && a.price !== "0" && a.price !== "$0").map((act, i) => <li key={i}>{act.label}<span className="float-end fw-semibold">{act.price}</span></li>)}</ul></>)}
        {pricing.Transport && pricing.Transport !== "0" && pricing.Transport !== "$0" && pricing.Transport.toString().trim() !== "" && <p className="fw-semibold mb-1">Transport:<span className="float-end">{pricing.Transport}</span></p>}
        {pricing["Tour Guide"] != null && pricing["Tour Guide"].toString().trim() !== "" && pricing["Tour Guide"] !== 0 && pricing["Tour Guide"] !== "$0" && <p className="fw-semibold mb-1">Tour Guide:<span className="float-end">{pricing["Tour Guide"]}</span></p>}
        {pricing["Total Price"] && <p className="fw-semibold"><strong>Total Price:</strong><span className="float-end">{pricing["Total Price"]}</span></p>}
      </>);
    }
    if (typeof content === "object" && !Array.isArray(content)) {
      const entries = Object.entries(content).filter(([, value]) => value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0) && !(typeof value === "object" && Object.keys(value).length === 0));
      if (entries.length === 0) return null;
      return <ul className="mb-0">{entries.map(([key, value]) => <li key={key}><strong>{key}:</strong> <span className="float-end fw-semibold">{Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value, null, 2) : value}</span></li>)}</ul>;
    }
    if (Array.isArray(content)) {
      if (content.length === 0) return null;
      return <ul className="mb-0">{content.map((item, i) => <li key={i}>{item}</li>)}</ul>;
    }
    return <p>{content}</p>;
  };

  const sections = b.sectionOrder || ["Tour Info","Travelers","Accommodation","Transport Options","Tour Inclusions","Daily Plan & Destinations","Meals & Notes","Pricing Summary"];

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
        <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }}>
          <div>
            <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#fff" }}>View & Pay — Preset Tour</p>
            <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>{b.bookingReference || b.id} · {b["Tour Info"]?.Tour || "Tour"}</p>
          </div>
          <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
        </Modal.Header>

        <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto", padding: "20px", position: "relative" }}>
          {/* Header strip */}
          <div className="d-flex flex-wrap justify-content-between align-items-center text-muted small mb-3 p-2" style={{ background: "#f8fbff", borderRadius: "8px" }}>
            <div className="me-3 mb-1"><strong>Booking Reference:</strong> <span className="text-secondary">{b.bookingReference || "N/A"}</span></div>
            <div className="me-3 mb-1"><strong>Tour:</strong> <span className="text-secondary">{b["Tour Info"]?.Tour || "N/A"}</span> <span className="text-secondary small">({b["Tour Info"]?.Nights || 0} nights)</span></div>
            <div className="me-3 mb-1"><strong>Arrival Date:</strong> <span className="text-secondary">{b["Travelers"]?.["Arrival Date"] || "N/A"}</span></div>
            <div><strong>Total Price:</strong> <span className="text-success fw-semibold">{b["Pricing Summary"]?.["Total Price"] || "$0"}</span></div>
          </div>

          {/* Section cards */}
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
                <Form>
                  <Form.Group className="mb-2"><Form.Label>Card Number</Form.Label><Form.Control type="text" placeholder="Enter your card number" disabled /></Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Expiry Date</Form.Label><Form.Control type="text" placeholder="MM/YY" disabled /></Form.Group>
                  <Form.Group><Form.Label>CVV</Form.Label><Form.Control type="password" placeholder="***" disabled /></Form.Group>
                </Form>
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

          {saving && (
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
              <Spinner animation="border" variant="primary" /><p className="mt-2 fw-semibold">Processing Payment...</p>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer style={{ padding: "12px 20px" }}>
          <Button variant="secondary" onClick={onHide} style={{ fontSize: "13px" }}>Close</Button>
        </Modal.Footer>
      </Modal>

      <PresetBookedTourInvoiceModal show={showInvoiceModal} onHide={() => setShowInvoiceModal(false)} b={b} selectedBooking={b} />
      <TermsAndConditionsModal show={showTermsModal} onHide={() => setShowTermsModal(false)} onConfirm={handleConfirmPayment} />
    </>
  );
}