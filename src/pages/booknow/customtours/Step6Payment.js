// src/pages/booknow/customtours/Step6Payment.js
import React, { useEffect, useState } from "react";
import { Form, Spinner } from "react-bootstrap";
import { db, storage } from "../../../firebase";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import CustomBookedTourInvoiceModal from "../../../components/modals/bookings/CustomBookedTourInvoiceModal";

const SECTION_ORDER = ["Tour Selection","Traveler Details","Accommodation","Transport Options","Tour Inclusions","Locations, Adventures and Activities","Meals & Notes","Pricing Summary"];

export default function Step6Payment() {
  const [user, setUser]                       = useState(null);
  const [paymentMethod, setPaymentMethod]     = useState("Credit Card");
  const [paymentAmount, setPaymentAmount]     = useState("full");
  const [paymentAmountValue, setPaymentAmountValue] = useState(0);
  const [unpaidBookings, setUnpaidBookings]   = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [expandedId, setExpandedId]           = useState(null);
  const [receiptFile, setReceiptFile]         = useState(null);
  const [bankDetails, setBankDetails]         = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(collection(db, "unpaidCustomBookings"), where("customerEmail", "==", user.email));
    const unsub = onSnapshot(q, snap => { setUnpaidBookings(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    getDoc(doc(db, "invoiceTermsAndConditions", "BankDetails")).then(s => { if (s.exists()) setBankDetails(s.data()); }).catch(console.error);
  }, []);

  const handleConfirmPayment = async () => {
    if (!selectedBooking) return alert("Please select a booking.");
    if (paymentMethod === "Bank Transfer" && !receiptFile) return alert("Please upload a receipt.");
    setSaving(true);
    let receiptURL = null;
    try {
      if (paymentMethod === "Bank Transfer") {
        const storageRef = ref(storage, `paymentReceipts/${user.email}/${selectedBooking.id}_${receiptFile.name}`);
        await uploadBytes(storageRef, receiptFile);
        receiptURL = await getDownloadURL(storageRef);
      }
      await setDoc(doc(db, "paidCustomBookings", selectedBooking.id), { ...selectedBooking, paymentMethod, receiptURL, paidAt: new Date(), paymentAmount, paymentAmountValue });
      await deleteDoc(doc(db, "unpaidCustomBookings", selectedBooking.id));
      alert("✅ Payment successful!");
      setSelectedBooking(null); setReceiptFile(null); setPaymentMethod("Credit Card"); setExpandedId(null);
    } catch (err) { console.error(err); alert("❌ Failed. Please try again."); }
    finally { setSaving(false); }
  };

  const canConfirm = selectedBooking && paymentMethod === "Bank Transfer" && receiptFile;

  const renderSection = (section, content) => {
    if (section === "Locations, Adventures and Activities") {
      return (
        <>
          {content["Selected Locations"] && (<><span className="pt-summary-sub-head">Selected Locations</span><ul className="pt-summary-list">{content["Selected Locations"].map((d, i) => <li key={i} style={{ display: "block" }}>{d}</li>)}</ul></>)}
          {content["Adventures"]?.length > 0 && (<><span className="pt-summary-sub-head">Adventures</span><ul className="pt-summary-list">{content["Adventures"].map((a, i) => <li key={i} style={{ display: "block" }}>{a}</li>)}</ul></>)}
          {content["Activities"]?.length > 0 && (<><span className="pt-summary-sub-head">Activities</span><ul className="pt-summary-list">{content["Activities"].map((a, i) => <li key={i} style={{ display: "block" }}>{a}</li>)}</ul></>)}
        </>
      );
    }
    if (section === "Meals & Notes") {
      const meal = content["Meal Preference"]; const notes = content["Tour Notes"];
      const showMeal = meal && meal !== "N/A";
      const notesList = typeof notes === "string" ? notes.split(/\r?\n/).map(n => n.trim()).filter(n => n && n !== "N/A") : [];
      if (!showMeal && !notesList.length) return null;
      return (<>{showMeal && <div className="pt-summary-row"><span className="pt-summary-key">Meal Preference</span><span className="pt-summary-val">{meal}</span></div>}{notesList.length > 0 && (<><span className="pt-summary-sub-head">Tour Notes</span><ul className="pt-summary-list">{notesList.map((n, i) => <li key={i} style={{ display: "block" }}>{n}</li>)}</ul></>)}</>);
    }
    if (section === "Traveler Details") {
      const order = ["Full Name","Arrival Date","Departure Date","Arrival Airport","Adults","Children","Infants","Tour Guide","Child Car Seat"];
      return <ul className="pt-summary-list">{order.filter(k => content[k]).map(k => <li key={k}><span>{k}</span><span>{content[k]}</span></li>)}</ul>;
    }
    if (section === "Accommodation") {
      return (<>{content.Type && <div className="pt-summary-row"><span className="pt-summary-key">Type</span><span className="pt-summary-val">{content.Type}</span></div>}{content["Luxury Rooms"]?.length > 0 && (<><span className="pt-summary-sub-head">Luxury Rooms</span><ul className="pt-summary-list">{content["Luxury Rooms"].filter(r => r.label?.trim()).map((r, i) => <li key={i}><span>{r.label}</span><span>{r.price}</span></li>)}</ul></>)}</>);
    }
    if (section === "Pricing Summary") {
      const p = content;
      return (<>{p.Travelers && <div className="pt-summary-row"><span className="pt-summary-key">Travelers</span><span className="pt-summary-val">{p.Travelers}</span></div>}{p.Nights && <div className="pt-summary-row"><span className="pt-summary-key">Nights</span><span className="pt-summary-val">{p.Nights}</span></div>}{Array.isArray(p["Tour Price"]) && p["Tour Price"].length > 0 && (<><span className="pt-summary-sub-head">Tour Price</span><ul className="pt-summary-list">{p["Tour Price"].map((item, i) => <li key={i}><span>{item.label}</span>{item.price && <span>{item.price}</span>}</li>)}</ul></>)}{Array.isArray(p["Accommodation"]) && p["Accommodation"].length > 0 && (<><span className="pt-summary-sub-head">Accommodation</span><ul className="pt-summary-list">{p["Accommodation"].map((item, i) => <li key={i}><span>{item.label}</span>{item.price && <span>{item.price}</span>}</li>)}</ul></>)}{p["Luxury Rooms"]?.length > 0 && (<><span className="pt-summary-sub-head">Luxury Rooms</span><ul className="pt-summary-list">{p["Luxury Rooms"].filter(r => r.label?.trim()).map((r, i) => <li key={i}><span>{r.label}</span><span>{r.price}</span></li>)}</ul></>)}{p["Adventures"]?.length > 0 && (<><span className="pt-summary-sub-head">Adventures</span><ul className="pt-summary-list">{p["Adventures"].map((a, i) => <li key={i}><span>{a.label}</span><span>{a.price}</span></li>)}</ul></>)}{p["Activities"]?.length > 0 && (<><span className="pt-summary-sub-head">Activities</span><ul className="pt-summary-list">{p["Activities"].map((a, i) => <li key={i}><span>{a.label}</span><span>{a.price}</span></li>)}</ul></>)}{p.Transport && p.Transport !== "$0" && <div className="pt-summary-row"><span className="pt-summary-key">Transport</span><span className="pt-summary-val">{p.Transport}</span></div>}{p["Tour Guide"] && p["Tour Guide"] !== "$0" && <div className="pt-summary-row"><span className="pt-summary-key">Tour Guide</span><span className="pt-summary-val">{p["Tour Guide"]}</span></div>}{p["Total Price"] && <div className="pt-summary-row" style={{ borderTop: "2px solid rgba(0,39,107,0.1)", marginTop: "6px", paddingTop: "10px" }}><span className="pt-summary-key" style={{ fontWeight: 700, color: "#00276b" }}>Total Price</span><span className="pt-summary-val" style={{ fontFamily: "'DM Serif Display', serif", fontSize: "18px" }}>{p["Total Price"]}</span></div>}</>);
    }
    if (typeof content === "object" && !Array.isArray(content)) {
      const entries = Object.entries(content).filter(([,v]) => v != null && v !== "");
      if (!entries.length) return null;
      return <ul className="pt-summary-list">{entries.map(([k, v]) => <li key={k}><span>{k}</span><span>{Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : v}</span></li>)}</ul>;
    }
    if (Array.isArray(content)) return <ul className="pt-summary-list">{content.map((item, i) => <li key={i} style={{ display: "block" }}>{item}</li>)}</ul>;
    return <p style={{ fontSize: "13px", color: "#7a9ab8" }}>{content}</p>;
  };

  return (
    <div style={{ position: "relative" }}>

      <div className="pt-step-card">
        <div className="pt-step-card-header">
          <span className="pt-step-card-title"><span className="pt-step-card-icon">◇</span> Select Booking to Pay</span>
        </div>
        <div className="pt-step-card-body">
          {loading ? (
            <div className="pt-spinner-inline">Loading bookings...</div>
          ) : unpaidBookings.length === 0 ? (
            <p style={{ color: "#adc6d8", fontSize: "13px" }}>No unpaid bookings found.</p>
          ) : (
            unpaidBookings.map(b => {
              const isExpanded = expandedId === b.id;
              const totalPrice = b["Pricing Summary"]?.["Total Price"] || "$0";
              return (
                <div key={b.id} className="pt-booking-accordion-item">
                  <div
                    className={`pt-booking-accordion-header ${isExpanded ? "expanded" : ""}`}
                    onClick={() => { if (!saving) { setSelectedBooking(b); setExpandedId(prev => prev === b.id ? null : b.id); } }}
                  >
                    <div className="pt-booking-accordion-ref">
                      {b.bookingReference || "N/A"}
                      <span className="pt-booking-price-badge">{totalPrice}</span>
                    </div>
                    <div className="pt-booking-accordion-meta">
                      <span><strong>Tour:</strong> {b["Tour Selection"]?.Tour || "N/A"} ({b["Tour Selection"]?.Nights || 0} nights)</span>
                      <span><strong>Arrival:</strong> {b["Traveler Details"]?.["Arrival Date"] || "N/A"}</span>
                      <span><strong>Booked:</strong> {b.bookedDateTime?.toDate ? b.bookedDateTime.toDate().toLocaleDateString() : "N/A"}</span>
                    </div>
                  </div>

                  {isExpanded && selectedBooking?.id === b.id && (
                    <div className="pt-booking-accordion-body">
                      {(b.sectionOrder || SECTION_ORDER).map(section => {
                        const content = b[section];
                        if (!content) return null;
                        const rendered = renderSection(section, content);
                        if (!rendered) return null;
                        return (
                          <div key={section} className="pt-summary-card" style={{ marginBottom: "10px" }}>
                            <div className="pt-summary-card-header" style={{ cursor: "default" }}><span>{section}</span></div>
                            <div className="pt-summary-card-body">{rendered}</div>
                          </div>
                        );
                      })}

                      <button className="pt-nav-btn accent" onClick={() => setShowInvoiceModal(true)} style={{ marginBottom: "20px" }}>◧ View Invoice</button>

                      {/* Payment Amount */}
                      {(() => {
                        const rawPrice = selectedBooking?.["Pricing Summary"]?.["Total Price"];
                        const totalPrice = rawPrice ? parseFloat(String(rawPrice).replace(/[^\d.]/g, "")) || 0 : 0;
                        const halfPrice = totalPrice / 2;
                        if (paymentAmountValue === 0 && totalPrice > 0) setPaymentAmountValue(totalPrice);
                        return (
                          <>
                            <span className="pt-pay-section-head">Payment Amount</span>
                            <div className={`pt-pay-option-row ${paymentAmount === "half" ? "selected" : ""}`} onClick={() => { setPaymentAmount("half"); setPaymentAmountValue(halfPrice); }}>
                              <input type="radio" readOnly checked={paymentAmount === "half"} style={{ accentColor: "#00276b", width: 14, height: 14 }} />
                              <div><div className="pt-pay-option-label">50% Advance Payment</div><div className="pt-pay-option-sub">${halfPrice.toLocaleString()}</div></div>
                            </div>
                            <div className={`pt-pay-option-row ${paymentAmount === "full" ? "selected" : ""}`} onClick={() => { setPaymentAmount("full"); setPaymentAmountValue(totalPrice); }}>
                              <input type="radio" readOnly checked={paymentAmount === "full"} style={{ accentColor: "#00276b", width: 14, height: 14 }} />
                              <div><div className="pt-pay-option-label">Full Payment</div><div className="pt-pay-option-sub">${totalPrice.toLocaleString()}</div></div>
                            </div>
                          </>
                        );
                      })()}

                      {/* Payment Method */}
                      <span className="pt-pay-section-head">Payment Method</span>
                      <div className={`pt-pay-option-row ${paymentMethod === "Bank Transfer" ? "selected" : ""}`} onClick={() => !saving && setPaymentMethod("Bank Transfer")}>
                        <input type="radio" readOnly checked={paymentMethod === "Bank Transfer"} style={{ accentColor: "#00276b", width: 14, height: 14 }} />
                        <div><div className="pt-pay-option-label">Bank Transfer</div><div className="pt-pay-option-sub">Upload your transfer receipt to confirm</div></div>
                      </div>
                      <div className={`pt-pay-option-row ${paymentMethod === "Credit Card" ? "selected" : ""}`} onClick={() => !saving && setPaymentMethod("Credit Card")}>
                        <input type="radio" readOnly checked={paymentMethod === "Credit Card"} style={{ accentColor: "#00276b", width: 14, height: 14 }} />
                        <div><div className="pt-pay-option-label">Credit Card</div><div className="pt-pay-option-sub">Currently unavailable</div></div>
                      </div>

                      {/* Bank Transfer details */}
                      {paymentMethod === "Bank Transfer" && (
                        <>
                          <span className="pt-pay-section-head">Bank Account Details</span>
                          <div className="pt-bank-detail-block">
                            {bankDetails
                              ? Object.entries(bankDetails).map(([k, v]) => <div key={k} className="pt-bank-detail-row"><span className="pt-bank-detail-key">{k}</span><span className="pt-bank-detail-val">{v}</span></div>)
                              : <p style={{ fontSize: "12px", color: "#adc6d8" }}>Loading bank details...</p>
                            }
                          </div>
                          <div className="pt-paying-amount-pill">
                            Paying: ${paymentAmountValue.toLocaleString()} — {paymentAmount === "half" ? "50% Advance" : "Full Payment"}
                          </div>
                          <span className="pt-pay-section-head" style={{ marginTop: "16px" }}>Upload Receipt</span>
                          <div className="pt-upload-zone">
                            <div className="pt-upload-zone-icon">↑</div>
                            <div className="pt-upload-zone-text">{receiptFile ? receiptFile.name : "Click to upload bank transfer receipt (image or PDF)"}</div>
                            <input type="file" accept="image/*,application/pdf" disabled={saving} onChange={e => setReceiptFile(e.target.files[0])} />
                          </div>
                        </>
                      )}
                      {paymentMethod === "Credit Card" && (
                        <div className="pt-bank-detail-block" style={{ marginTop: "14px" }}>
                          <p style={{ fontSize: "13px", color: "#adc6d8", margin: 0 }}>Credit card payments are temporarily unavailable. Please use Bank Transfer.</p>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                        <button className="pt-nav-btn success" onClick={handleConfirmPayment} disabled={saving || paymentMethod === "Credit Card" || (paymentMethod === "Bank Transfer" && !receiptFile)}>
                          {saving ? "Processing..." : "✓ Confirm & Pay"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="pt-info-note">
        <span className="pt-info-note-title">Please Note</span>
        <ul>
          <li>Full payment must be completed within <strong>2 calendar days</strong>.</li>
          <li>50% advance — remaining balance is due <strong>on arrival</strong>.</li>
          <li>Bank transfers require an <strong>official receipt</strong> to be uploaded.</li>
          <li>Unprovided services will be <strong>fully refunded</strong> after the tour.</li>
          <li><strong>No hidden fees.</strong></li>
        </ul>
      </div>

      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px", flexWrap: "wrap" }}>
        <button className="pt-nav-btn primary" onClick={() => navigate("/booknow")}>Book Another Tour</button>
        <button className="pt-nav-btn secondary" onClick={() => navigate("/customer/dashboard")}>Go to Dashboard</button>
        <button className="pt-nav-btn danger" onClick={() => navigate("/")}>Exit</button>
      </div>

      {saving && (
        <div className="pt-processing-overlay">
          <div className="pt-processing-spinner" />
          <span>Processing payment...</span>
        </div>
      )}

      {selectedBooking && <CustomBookedTourInvoiceModal show={showInvoiceModal} onHide={() => setShowInvoiceModal(false)} selectedBooking={selectedBooking} b={selectedBooking} paymentMethod={paymentMethod} saving={saving} canConfirm={canConfirm} setReceiptFile={setReceiptFile} handleConfirmPayment={handleConfirmPayment} />}
    </div>
  );
}