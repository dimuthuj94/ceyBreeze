// src/pages/booknow/presettours/presettours/Step6Payment.js
import React, { useEffect, useState } from "react";
import { db, storage } from "../../../firebase";
import { collection, doc, onSnapshot, query, where, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import PresetBookedTourInvoiceModal from "../../../components/modals/bookings/PresetBookedTourInvoiceModal";
import TermsAndConditionsModal from "../../../components/modals/TermsAndConditionsModal";

export default function Step6Payment() {
  const [paymentMethod, setPaymentMethod]         = useState("Credit Card");
  const [paymentAmount, setPaymentAmount]         = useState("full");
  const [paymentAmountValue, setPaymentAmountValue] = useState(0);
  const [unpaidBookings, setUnpaidBookings]       = useState([]);
  const [selectedBooking, setSelectedBooking]     = useState(null);
  const [expandedId, setExpandedId]               = useState(null);
  const [receiptFile, setReceiptFile]             = useState(null);
  const [loading, setLoading]                     = useState(true);
  const [saving, setSaving]                       = useState(false);
  const [showInvoiceModal, setShowInvoiceModal]   = useState(false);
  const [bankDetails, setBankDetails]             = useState(null);
  const [showTermsModal, setShowTermsModal]       = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(collection(db, "unpaidPresetBookings"), where("customerEmail", "==", user.email));
    const unsub = onSnapshot(q, (snap) => {
      setUnpaidBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    getDoc(doc(db, "invoiceTermsAndConditions", "BankDetails"))
      .then(s => { if (s.exists()) setBankDetails(s.data()); })
      .catch(console.error);
  }, []);

  const handleConfirmPayment = async () => {
    if (!selectedBooking) return alert("Please select a booking.");
    if (paymentMethod === "Bank Transfer" && !receiptFile) return alert("Please upload a receipt for Bank Transfer.");
    setSaving(true);
    const paidAmount    = selectedBooking?.paymentAmountValue || selectedBooking?.totalPrice || 0;
    const paymentType   = paymentAmount === "half" ? "50% Advance" : "Full Payment";
    let receiptURL      = null;
    try {
      if (paymentMethod === "Bank Transfer") {
        const storageRef = ref(storage, `paymentReceipts/${user.email}/${selectedBooking.id}_${receiptFile.name}`);
        await uploadBytes(storageRef, receiptFile);
        receiptURL = await getDownloadURL(storageRef);
      }
      await setDoc(doc(db, "paidPresetBookings", selectedBooking.id), { ...selectedBooking, paymentMethod, receiptURL, paidAt: new Date(), paymentType, paidAmount });
      await deleteDoc(doc(db, "unpaidPresetBookings", selectedBooking.id));
      alert("✅ Payment successful!");
      setSelectedBooking(null); setReceiptFile(null); setPaymentMethod("Credit Card"); setExpandedId(null);
    } catch (err) {
      console.error(err); alert("❌ Failed to confirm payment. Please try again.");
    } finally { setSaving(false); }
  };

  // ── renderSection (all logic preserved, keep exactly as is) ──
  const renderSection = (section, content) => {
    if (section === "Daily Plan & Destinations") {
      const hasDailyPlan   = Array.isArray(content["🗓️ Daily Plan"]) && content["🗓️ Daily Plan"].length > 0;
      const hasDestinations = Array.isArray(content["🗺️ Destinations"]) && content["🗺️ Destinations"].length > 0;
      const hasActivities  = Array.isArray(content["🎯 Activities Planned"]) && content["🎯 Activities Planned"].length > 0;
      if (!hasDailyPlan && !hasDestinations && !hasActivities) return null;
      return (
        <>
          {hasDailyPlan && (<><span className="pt-summary-sub-title">Daily Plan</span><ul className="pt-summary-list">{content["🗓️ Daily Plan"].map((d, i) => <li key={i} style={{ display: "block" }}>{d}</li>)}</ul></>)}
          {hasDestinations && (<><span className="pt-summary-sub-title">Destinations</span>{content["🗺️ Destinations"].map((d, i) => (<div key={i} style={{ marginBottom: "6px" }}><div style={{ fontSize: "12px", fontWeight: 600, color: "#00276b" }}>{d.city}</div><ul className="pt-summary-list">{d.destinations?.map((p, j) => <li key={j} style={{ display: "block" }}>{p}</li>)}</ul></div>))}</>)}
          {hasActivities && (<><span className="pt-summary-sub-title">Activities Planned</span><ul className="pt-summary-list">{content["🎯 Activities Planned"].map((a, i) => <li key={i} style={{ display: "block" }}>{a}</li>)}</ul></>)}
        </>
      );
    }
    if (section === "Meals & Notes") {
      const meal  = content["Meal Preference"];
      const notes = content["Tour Notes"];
      const showMeal = meal && meal.trim() !== "" && meal !== "N/A";
      const notesList = typeof notes === "string" ? notes.split(/\r?\n/).map(n => n.trim()).filter(n => n !== "" && n !== "N/A") : [];
      if (!showMeal && notesList.length === 0) return null;
      return (<div>{showMeal && <div className="pt-summary-item"><span className="pt-summary-key">Meal Preference</span><span className="pt-summary-val">{meal}</span></div>}{notesList.length > 0 && (<><span className="pt-summary-sub-title">Tour Notes</span><ul className="pt-summary-list">{notesList.map((n, i) => <li key={i} style={{ display: "block" }}>{n}</li>)}</ul></>)}</div>);
    }
    if (section === "Travelers") {
      const order = ["Full Name","Arrival Date","Arrival Airport","Adults","Children","Infants","Tour Guide","Child Car Seat"];
      const filled = order.filter(k => content[k]);
      if (!filled.length) return null;
      return <ul className="pt-summary-list">{filled.map(k => <li key={k}><span>{k}</span><span>{content[k]}</span></li>)}</ul>;
    }
    if (section === "Accommodation") {
      const hasType = content.Type?.toString().trim() && content.Type !== "0" && content.Type !== "$0";
      const hasLuxuryRooms = Array.isArray(content["Luxury Rooms"]) && content["Luxury Rooms"].some(r => r.label?.trim() && r.price && r.price !== "$0");
      const hasLuxuryTotal = content["Luxury Rooms Total"]?.toString().trim() && content["Luxury Rooms Total"] !== "$0";
      if (!hasType && !hasLuxuryRooms && !hasLuxuryTotal) return null;
      return (<>{hasType && <div className="pt-summary-item"><span className="pt-summary-key">Type</span><span className="pt-summary-val">{content.Type}</span></div>}{hasLuxuryRooms && (<><span className="pt-summary-sub-title">Luxury Rooms</span><ul className="pt-summary-list">{content["Luxury Rooms"].filter(r => r.label?.trim() && r.price && r.price !== "$0").map((r, i) => <li key={i}><span>{r.label}</span><span>{r.price}</span></li>)}</ul></>)}{hasLuxuryTotal && <div className="pt-summary-item"><span className="pt-summary-key">Luxury Total</span><span className="pt-summary-val">{content["Luxury Rooms Total"]}</span></div>}</>);
    }
    if (section === "Pricing Summary") {
      const p = content;
      return (<>{p.Travelers && <div className="pt-summary-item"><span className="pt-summary-key">Travelers</span><span className="pt-summary-val">{p.Travelers}</span></div>}{p.Nights && <div className="pt-summary-item"><span className="pt-summary-key">Nights</span><span className="pt-summary-val">{p.Nights}</span></div>}{p["Tour Price"] && (<><span className="pt-summary-sub-title">Tour Price</span><ul className="pt-summary-list">{Object.entries(p["Tour Price"]).map(([k, v]) => <li key={k}><span>{k}</span><span>{v}</span></li>)}</ul></>)}{p.Accommodation && Object.keys(p.Accommodation).length > 0 && (<><span className="pt-summary-sub-title">Accommodation</span><ul className="pt-summary-list">{Object.entries(p.Accommodation).map(([k, v]) => <li key={k}><span>{k}</span><span>{v}</span></li>)}</ul></>)}{Array.isArray(p["Luxury Rooms"]) && p["Luxury Rooms"].filter(r => r?.label?.trim() && r.price && r.price !== "$0").length > 0 && (<><span className="pt-summary-sub-title">Luxury Rooms</span><ul className="pt-summary-list">{p["Luxury Rooms"].filter(r => r?.label?.trim() && r.price && r.price !== "$0").map((r, i) => <li key={i}><span>{r.label}</span><span>{r.price}</span></li>)}</ul></>)}{Array.isArray(p["Activities"]) && p["Activities"].filter(a => a?.label?.trim() && a.price && a.price !== "$0").length > 0 && (<><span className="pt-summary-sub-title">Activities</span><ul className="pt-summary-list">{p["Activities"].filter(a => a?.label?.trim() && a.price && a.price !== "$0").map((a, i) => <li key={i}><span>{a.label}</span><span>{a.price}</span></li>)}</ul></>)}{p.Transport && p.Transport !== "0" && p.Transport !== "$0" && <div className="pt-summary-item"><span className="pt-summary-key">Transport</span><span className="pt-summary-val">{p.Transport}</span></div>}{p["Tour Guide"] && p["Tour Guide"] !== "0" && p["Tour Guide"] !== "$0" && <div className="pt-summary-item"><span className="pt-summary-key">Tour Guide</span><span className="pt-summary-val">{p["Tour Guide"]}</span></div>}{p["Total Price"] && <div className="pt-summary-item" style={{ borderTop: "2px solid rgba(0,39,107,0.1)", marginTop: "6px", paddingTop: "10px" }}><span className="pt-summary-key" style={{ fontWeight: 700, color: "#00276b" }}>Total Price</span><span className="pt-summary-val" style={{ fontFamily: "'DM Serif Display', serif", fontSize: "18px" }}>{p["Total Price"]}</span></div>}</>);
    }
    if (typeof content === "object" && !Array.isArray(content)) {
      const entries = Object.entries(content).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length));
      if (!entries.length) return null;
      return <ul className="pt-summary-list">{entries.map(([k, v]) => <li key={k}><span>{k}</span><span>{Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : v}</span></li>)}</ul>;
    }
    if (Array.isArray(content)) {
      if (!content.length) return null;
      return <ul className="pt-summary-list">{content.map((item, i) => <li key={i} style={{ display: "block" }}>{item}</li>)}</ul>;
    }
    return <p style={{ fontSize: "13px", color: "#7a9ab8" }}>{content}</p>;
  };

  const SECTION_ORDER = ["Tour Info","Travelers","Accommodation","Transport Options","Tour Inclusions","Daily Plan & Destinations","Meals & Notes","Pricing Summary"];

  const canConfirm = selectedBooking && paymentMethod === "Bank Transfer" && receiptFile;

  return (
    <div style={{ position: "relative" }}>

      <div className="pt-card" style={{ marginBottom: "16px" }}>
        <div className="pt-card-header">
          <span className="pt-card-header-title"><span className="pt-card-header-icon">◇</span> Select Booking to Pay</span>
        </div>
        <div className="pt-card-body">
          {loading ? (
            <div className="pt-spinner-row"><div className="pt-spinner" /> Loading bookings...</div>
          ) : unpaidBookings.length === 0 ? (
            <p style={{ color: "#adc6d8", fontSize: "13px" }}>No unpaid bookings found.</p>
          ) : (
            <div>
              {unpaidBookings.map(b => {
                const isExpanded = expandedId === b.id;
                const totalPrice = b["Pricing Summary"]?.["Total Price"] || "$0";
                return (
                  <div key={b.id} className="pt-booking-item">
                    <div
                      className={`pt-booking-item-header ${isExpanded ? "expanded" : ""}`}
                      onClick={() => {
                        if (!saving) {
                          setSelectedBooking(b);
                          setExpandedId(prev => prev === b.id ? null : b.id);
                        }
                      }}
                    >
                      <div className="pt-booking-ref">
                        {b.bookingReference || "N/A"}
                        <span style={{ float: "right" }} className="pt-booking-price">{totalPrice}</span>
                      </div>
                      <div className="pt-booking-meta-row">
                        <span className="pt-booking-meta-item"><strong>Tour:</strong> {b["Tour Info"]?.Tour || "N/A"} ({b["Tour Info"]?.Nights || 0} nights)</span>
                        <span className="pt-booking-meta-item"><strong>Arrival:</strong> {b["Travelers"]?.["Arrival Date"] || "N/A"}</span>
                        <span className="pt-booking-meta-item"><strong>Booked:</strong> {b.bookedDateTime?.toDate ? b.bookedDateTime.toDate().toLocaleDateString() : "N/A"}</span>
                      </div>
                    </div>

                    {isExpanded && selectedBooking?.id === b.id && (
                      <div className="pt-booking-item-body">
                        {(b.sectionOrder || SECTION_ORDER).map(section => {
                          const content = b[section];
                          if (!content) return null;
                          const rendered = renderSection(section, content);
                          if (!rendered) return null;
                          return (
                            <div key={section} className="pt-card" style={{ marginBottom: "10px" }}>
                              <div className="pt-card-header" style={{ cursor: "default" }}>
                                <span className="pt-card-header-title">{section}</span>
                              </div>
                              <div className="pt-card-body">{rendered}</div>
                            </div>
                          );
                        })}

                        {/* Invoice button */}
                        <button className="pt-btn accent" onClick={() => setShowInvoiceModal(true)} style={{ marginBottom: "20px" }}>
                          ◧ View Invoice
                        </button>

                        {/* Payment amount */}
                        {(() => {
                          const rawPrice = selectedBooking?.["Pricing Summary"]?.["Total Price"];
                          const totalPrice = rawPrice ? parseFloat(String(rawPrice).replace(/[^\d.]/g, "")) || 0 : 0;
                          const halfPrice  = totalPrice / 2;
                          if (paymentAmountValue === 0 && totalPrice > 0) setPaymentAmountValue(totalPrice);
                          return (
                            <>
                              <span className="pt-pay-section-title">Payment Amount</span>
                              <div
                                className={`pt-pay-option ${paymentAmount === "half" ? "selected" : ""}`}
                                onClick={() => { setPaymentAmount("half"); setPaymentAmountValue(halfPrice); }}
                              >
                                <input type="radio" readOnly checked={paymentAmount === "half"} className="pt-pay-option-radio" />
                                <div>
                                  <div className="pt-pay-option-label">50% Advance Payment</div>
                                  <div className="pt-pay-option-sub">${halfPrice.toLocaleString()}</div>
                                </div>
                              </div>
                              <div
                                className={`pt-pay-option ${paymentAmount === "full" ? "selected" : ""}`}
                                onClick={() => { setPaymentAmount("full"); setPaymentAmountValue(totalPrice); }}
                              >
                                <input type="radio" readOnly checked={paymentAmount === "full"} className="pt-pay-option-radio" />
                                <div>
                                  <div className="pt-pay-option-label">Full Payment</div>
                                  <div className="pt-pay-option-sub">${totalPrice.toLocaleString()}</div>
                                </div>
                              </div>
                            </>
                          );
                        })()}

                        {/* Payment method */}
                        <span className="pt-pay-section-title">Payment Method</span>
                        <div className={`pt-pay-option ${paymentMethod === "Bank Transfer" ? "selected" : ""}`} onClick={() => !saving && setPaymentMethod("Bank Transfer")}>
                          <input type="radio" readOnly checked={paymentMethod === "Bank Transfer"} className="pt-pay-option-radio" />
                          <div><div className="pt-pay-option-label">Bank Transfer</div><div className="pt-pay-option-sub">Upload your transfer receipt to confirm</div></div>
                        </div>
                        <div className={`pt-pay-option ${paymentMethod === "Credit Card" ? "selected" : ""}`} onClick={() => !saving && setPaymentMethod("Credit Card")}>
                          <input type="radio" readOnly checked={paymentMethod === "Credit Card"} className="pt-pay-option-radio" />
                          <div><div className="pt-pay-option-label">Credit Card</div><div className="pt-pay-option-sub">Currently unavailable</div></div>
                        </div>

                        {/* Bank Transfer details */}
                        {paymentMethod === "Bank Transfer" && (
                          <>
                            <span className="pt-pay-section-title">Bank Account Details</span>
                            <div className="pt-bank-block">
                              {bankDetails
                                ? Object.entries(bankDetails).map(([k, v]) => <div key={k} className="pt-bank-row"><span className="pt-bank-key">{k}</span><span className="pt-bank-val">{v}</span></div>)
                                : <p style={{ fontSize: "12px", color: "#adc6d8" }}>Loading bank details...</p>
                              }
                            </div>
                            <div className="pt-paying-amount">
                              Paying: ${paymentAmountValue.toLocaleString()} — {paymentAmount === "half" ? "50% Advance" : "Full Payment"}
                            </div>
                            <span className="pt-pay-section-title" style={{ marginTop: "16px" }}>Upload Receipt</span>
                            <div className="pt-upload-zone">
                              <div className="pt-upload-zone-icon">↑</div>
                              <div className="pt-upload-zone-text">
                                {receiptFile ? receiptFile.name : "Click to upload bank transfer receipt (image or PDF)"}
                              </div>
                              <input type="file" accept="image/*,application/pdf" disabled={saving} onChange={e => setReceiptFile(e.target.files[0])} />
                            </div>
                          </>
                        )}

                        {/* Credit card (disabled) */}
                        {paymentMethod === "Credit Card" && (
                          <div className="pt-bank-block" style={{ marginTop: "14px" }}>
                            <p style={{ fontSize: "13px", color: "#adc6d8", margin: 0 }}>Credit card payments are temporarily unavailable. Please use Bank Transfer.</p>
                          </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                          <button
                            className="pt-btn success"
                            onClick={() => setShowTermsModal(true)}
                            disabled={saving || paymentMethod === "Credit Card" || (paymentMethod === "Bank Transfer" && !receiptFile)}
                          >
                            {saving ? "Processing..." : "✓ Confirm & Pay"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="pt-note">
        <span className="pt-note-title">Please Note</span>
        <ul>
          <li>Payment must be completed within <strong>2 calendar days</strong> of reservation.</li>
          <li>50% advance requires the <strong>remaining balance on arrival</strong>.</li>
          <li>Bank transfers require an <strong>official receipt</strong> to be uploaded.</li>
          <li>Unprovided luxury stays or activities will be <strong>fully refunded</strong> after the tour.</li>
          <li><strong>No hidden fees.</strong></li>
        </ul>
      </div>

      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px", flexWrap: "wrap" }}>
        <button className="pt-btn primary" onClick={() => navigate("/booknow")}>Book Another Tour</button>
        <button className="pt-btn secondary" onClick={() => navigate("/customer/dashboard")}>Go to Dashboard</button>
        <button className="pt-btn danger" onClick={() => navigate("/")}>Exit</button>
      </div>

      {saving && (
        <div className="pt-processing-overlay">
          <div className="pt-spinner" style={{ width: 28, height: 28 }} />
          <span>Processing payment...</span>
        </div>
      )}

      {selectedBooking && <PresetBookedTourInvoiceModal show={showInvoiceModal} onHide={() => setShowInvoiceModal(false)} selectedBooking={selectedBooking} b={selectedBooking} paymentMethod={paymentMethod} saving={saving} canConfirm={canConfirm} setReceiptFile={setReceiptFile} handleConfirmPayment={handleConfirmPayment} />}
      {selectedBooking && <TermsAndConditionsModal show={showTermsModal} onHide={() => setShowTermsModal(false)} onConfirm={handleConfirmPayment} />}
    </div>
  );
}