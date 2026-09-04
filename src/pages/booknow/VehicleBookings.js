// src/pages/booknow/VehicleBookings.js
import React, { useState, useEffect } from "react";
import { Form, Row, Col, Spinner, Table, Collapse, Accordion } from "react-bootstrap";
import { db, auth, storage } from "../../firebase";
import {
  collection, getDocs, doc, getDoc, runTransaction, serverTimestamp,
  query, where, onSnapshot, setDoc, deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import VehicleOnlyBookedInvoiceModal from "../../components/modals/bookings/VehicleOnlyBookedInvoiceModal";
import ConfirmBookingModal from "../../components/modals/ConfirmBookingModal";

const STEPS = [
  { key: 1, label: "Select Vehicle" },
  { key: 2, label: "Summary" },
  { key: 3, label: "Payment" },
];

export default function VehicleBookings() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [vehicles, setVehicles]             = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [customerEmail, setCustomerEmail]   = useState("");
  const [customerName, setCustomerName]     = useState("");
  const [arrivalDate, setArrivalDate]       = useState("");
  const [departureDate, setDepartureDate]   = useState("");
  const [days, setDays]                     = useState(0);
  const [selectedVehicles, setSelectedVehicles] = useState({});
  const [saving, setSaving]                 = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [bankDetails, setBankDetails]       = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [openCards, setOpenCards] = useState({ booking: true, vehicles: true, pricing: true });

  const [unpaidBookings, setUnpaidBookings]   = useState([]);
  const [loadingUnpaid, setLoadingUnpaid]     = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [expandedId, setExpandedId]           = useState(null);
  const [paymentMethod, setPaymentMethod]     = useState("Credit Card");
  const [receiptFile, setReceiptFile]         = useState(null);
  const [paymentAmount, setPaymentAmount]     = useState("full");
  const [paymentAmountValue, setPaymentAmountValue] = useState(0);

  const canConfirm = selectedBooking && paymentMethod === "Bank Transfer" && receiptFile;
  const user = auth.currentUser;

  /* ── Fetches (all logic unchanged) ── */
  useEffect(() => {
    getDocs(collection(db, "vehicles"))
      .then(snap => setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoadingVehicles(false));
  }, []);

  useEffect(() => {
    getDoc(doc(db, "invoiceTermsAndConditions", "BankDetails"))
      .then(s => { if (s.exists()) setBankDetails(s.data()); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!user) return;
    setCustomerEmail(user.email);
    getDoc(doc(db, "customers", user.uid)).then(snap => {
      if (snap.exists()) { const d = snap.data(); setCustomerName(`${d.firstName} ${d.lastName}`); }
      else setCustomerName(user.displayName || "");
    }).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (arrivalDate && departureDate) {
      const diff = (new Date(departureDate) - new Date(arrivalDate)) / (1000 * 60 * 60 * 24);
      setDays(diff > 0 ? diff : 0);
    }
  }, [arrivalDate, departureDate]);

  useEffect(() => {
    if (arrivalDate) {
      const arr = new Date(arrivalDate);
      arr.setDate(arr.getDate() + 1);
      setDepartureDate(arr.toISOString().split("T")[0]);
    }
  }, [arrivalDate]);

  useEffect(() => {
    if (selectedBooking?.totalPrice) {
      setPaymentAmount("full");
      setPaymentAmountValue(selectedBooking.totalPrice);
    }
  }, [selectedBooking]);

  useEffect(() => {
    if (!user) return;
    setLoadingUnpaid(true);
    const q = query(collection(db, "unpaidVehicleBookings"), where("customerEmail", "==", user.email));
    const unsub = onSnapshot(q,
      snap => { setUnpaidBookings(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingUnpaid(false); },
      () => setLoadingUnpaid(false)
    );
    return () => unsub();
  }, [user]);

  /* ── Derived values ── */
  const calculateTotal = () => {
    let total = 0;
    vehicles.forEach(v => { total += v.pricePerDay * (selectedVehicles[v.id] || 0) * days; });
    return total;
  };

  const selectedVehicleIds = Object.keys(selectedVehicles).filter(id => selectedVehicles[id] > 0);
  const vehiclesSummary    = selectedVehicleIds.map(id => {
    const vehicle = vehicles.find(v => v.id === id);
    return { id: vehicle?.id || id, pricePerDay: vehicle?.pricePerDay || 0, quantity: selectedVehicles[id], days, subtotal: (vehicle?.pricePerDay || 0) * selectedVehicles[id] * days };
  });
  const totalPrice = vehiclesSummary.reduce((s, v) => s + v.subtotal, 0);
  const sortedVehicles = [...vehicles].sort((a, b) => a.minimumSeatCount !== b.minimumSeatCount ? a.minimumSeatCount - b.minimumSeatCount : a.maximumSeatCount - b.maximumSeatCount);

  /* ── Save booking ── */
  const handleNext = async () => {
    if (!customerEmail || !customerName) { alert("Customer information missing!"); return; }
    if (vehiclesSummary.length === 0) { alert("Please select at least one vehicle."); return; }
    setSaving(true);
    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,"0")}${String(today.getDate()).padStart(2,"0")}`;
      const counterRef = doc(db, "vehicleBookingCounters", dateStr);
      let bookingId;
      await runTransaction(db, async tx => {
        const cSnap = await tx.get(counterRef);
        const seq = cSnap.exists() ? cSnap.data().seq + 1 : 1;
        tx.set(counterRef, { seq }, { merge: true });
        bookingId = `VEHICLEBOOK-${dateStr}-${String(seq).padStart(3,"0")}`;
        tx.set(doc(db, "unpaidVehicleBookings", bookingId), {
          bookingId, createdAt: serverTimestamp(), customerName, customerEmail,
          arrivalDate, departureDate, days, vehicles: vehiclesSummary, totalPrice, tourType: "vehicle-only",
        });
      });
      alert(`Booking saved! ID: ${bookingId}`);
      setStep(3);
    } catch (err) { console.error(err); alert("Failed to save booking."); }
    finally { setSaving(false); setShowConfirm(false); }
  };

  /* ── Confirm payment ── */
  const handleConfirmPayment = async () => {
    if (!selectedBooking) return alert("Please select a booking.");
    if (paymentMethod === "Bank Transfer" && !receiptFile) return alert("Please upload a receipt.");
    if (selectedBooking.customerEmail !== user.email) { alert("Booking email mismatch."); return; }
    setSaving(true);
    let receiptURL = null;
    try {
      if (paymentMethod === "Bank Transfer") {
        const storageRef = ref(storage, `paymentReceipts/${user.email}/${selectedBooking.id}_${receiptFile.name}`);
        await uploadBytes(storageRef, receiptFile);
        receiptURL = await getDownloadURL(storageRef);
      }
      const vehiclesArray = Array.isArray(selectedBooking.vehicles) ? selectedBooking.vehicles : Object.values(selectedBooking.vehicles || {});
      await setDoc(doc(db, "paidVehicleBookings", selectedBooking.id), { ...selectedBooking, vehicles: vehiclesArray, paymentMethod, paymentAmount, paymentAmountValue, receiptURL, paidAt: new Date() });
      await deleteDoc(doc(db, "unpaidVehicleBookings", selectedBooking.id));
      alert("✅ Payment successful!");
      setSelectedBooking(null); setReceiptFile(null); setPaymentMethod("Credit Card"); setExpandedId(null);
    } catch (err) { console.error(err); alert("❌ Failed to confirm payment."); }
    finally { setSaving(false); }
  };

  /* ════════════════════ PRICE SUMMARY (right column) ════════════════════ */
  const renderPriceSummary = () => (
    <Col md={4}>
      <div className="preset-tours-price-summary">
        <div className="preset-tours-price-summary-header">
          <h5>Price Summary</h5>
          <span className="preset-tours-price-total-preview">${calculateTotal()}</span>
        </div>

        <div className="preset-tours-price-summary-details">

          <span className="pt-price-sec-head">Booking Details</span>
          <div className="pt-price-detail-row">
            <span className="pt-price-detail-key">Duration</span>
            <span className="pt-price-detail-val">{days} days</span>
          </div>
          <div className="pt-price-detail-row">
            <span className="pt-price-detail-key">Vehicles selected</span>
            <span className="pt-price-detail-val">{Object.values(selectedVehicles).reduce((a, b) => a + b, 0)}</span>
          </div>

          <span className="pt-price-sec-head">Vehicles</span>
          {sortedVehicles.map(v => {
            const count = selectedVehicles[v.id] || 0;
            if (!count) return null;
            return (
              <div key={v.id} className="pt-price-detail-row">
                <span className="pt-price-detail-key">{v.id} × {count} × {days}d</span>
                <span className="pt-price-detail-val">${v.pricePerDay * count * days}</span>
              </div>
            );
          })}
          {Object.values(selectedVehicles).every(c => !c) && (
            <div className="pt-price-detail-row">
              <span className="pt-price-detail-key" style={{ fontStyle: "italic" }}>No vehicles selected</span>
            </div>
          )}

        </div>

        <div className="d-flex justify-content-between align-items-center preset-tours-price-summary-total">
          <h5 className="fw-bold mb-0">Total</h5>
          <h5 className="fw-bold mb-0 preset-tours-total-value">${calculateTotal()}</h5>
        </div>
      </div>
    </Col>
  );

  /* ════════════════════ STEP 1 ════════════════════ */
  const renderStep1 = () => (
    <Row>
      <Col md={8}>

        {/* Traveler info */}
        <div className="pt-step-card">
          <div className="pt-step-card-header">
            <span className="pt-step-card-title"><span className="pt-step-card-icon">◐</span> Traveler Information</span>
          </div>
          <div className="pt-step-card-body">
            <div style={{ marginBottom: "14px" }}>
              <label className="pt-field-label">Full Name</label>
              <input className="pt-field" value={customerName} readOnly />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label className="pt-field-label">Arrival Date</label>
                <input type="date" className="pt-field" value={arrivalDate} min={new Date().toISOString().split("T")[0]} onChange={e => setArrivalDate(e.target.value)} />
              </div>
              <div>
                <label className="pt-field-label">Departure Date</label>
                <input type="date" className="pt-field" value={departureDate}
                  min={arrivalDate ? new Date(new Date(arrivalDate).setDate(new Date(arrivalDate).getDate() + 1)).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]}
                  onChange={e => setDepartureDate(e.target.value)} />
              </div>
            </div>
            <div style={{ fontSize: "13px", color: "#7a9ab8" }}>
              Duration: <strong style={{ color: "#00276b" }}>{days}</strong> days
            </div>
          </div>
        </div>

        {/* Vehicle selection */}
        <div className="pt-step-card">
          <div className="pt-step-card-header">
            <span className="pt-step-card-title"><span className="pt-step-card-icon">◈</span> Vehicle Selection</span>
          </div>
          <div className="pt-step-card-body">
            {loadingVehicles ? (
              <div className="pt-spinner-inline">Loading vehicles...</div>
            ) : (
              <div className="pt-option-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                {sortedVehicles.map(v => {
                  const count = selectedVehicles[v.id] || 0;
                  return (
                    <div
                      key={v.id}
                      className={`pt-option-tile ${count > 0 ? "selected" : ""}`}
                      onClick={() => setSelectedVehicles(prev => ({ ...prev, [v.id]: count > 0 ? 0 : 1 }))}
                    >
                      <div className="pt-option-tile-name">{v.id}</div>
                      <div className="pt-option-tile-meta">
                        ${v.pricePerDay}/day<br/>
                        Seats: {v.minimumSeatCount}–{v.maximumSeatCount}
                      </div>
                      <div style={{ marginTop: "10px" }} onClick={e => e.stopPropagation()}>
                        <label className="pt-field-label" style={{ marginBottom: "4px" }}>Quantity</label>
                        <input
                          type="number" min="0"
                          className="pt-field"
                          style={{ padding: "6px 10px", textAlign: "center" }}
                          value={count}
                          onChange={e => setSelectedVehicles(prev => ({ ...prev, [v.id]: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="pt-nav-row">
          <div />
          <button
            className="pt-nav-btn primary"
            disabled={!arrivalDate || !departureDate || days <= 0}
            onClick={() => setStep(2)}
          >
            Next ›
          </button>
        </div>

        <div className="pt-info-note">
          <span className="pt-info-note-title">Please Note</span>
          <ul>
            <li>Select your arrival and departure dates to calculate the duration.</li>
            <li>Adjust the quantity of each vehicle type you require.</li>
            <li>Pricing updates live in the <strong>Price Summary</strong> panel.</li>
            <li><strong>No hidden fees.</strong></li>
          </ul>
        </div>

      </Col>
      {renderPriceSummary()}
    </Row>
  );

  /* ════════════════════ STEP 2 ════════════════════ */
  const renderStep2 = () => {
    const toggleCard = key => setOpenCards(prev => ({ ...prev, [key]: !prev[key] }));

    return (
      <Row>
        <Col md={8}>

          {/* Booking details */}
          <div className="pt-summary-card">
            <div className="pt-summary-card-header" onClick={() => toggleCard("booking")}>
              <span>Booking Details</span>
              <span>{openCards.booking ? "▲" : "▼"}</span>
            </div>
            <Collapse in={openCards.booking}>
              <div>
                <div className="pt-summary-card-body">
                  {[
                    { label: "Customer Name",  value: customerName },
                    { label: "Email",          value: customerEmail },
                    { label: "Arrival Date",   value: arrivalDate },
                    { label: "Departure Date", value: departureDate },
                    { label: "Duration",       value: `${days} days` },
                  ].map(({ label, value }) => (
                    <div key={label} className="pt-summary-row">
                      <span className="pt-summary-key">{label}</span>
                      <span className="pt-summary-val">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Collapse>
          </div>

          {/* Vehicles */}
          <div className="pt-summary-card">
            <div className="pt-summary-card-header" onClick={() => toggleCard("vehicles")}>
              <span>Selected Vehicles</span>
              <span>{openCards.vehicles ? "▲" : "▼"}</span>
            </div>
            <Collapse in={openCards.vehicles}>
              <div>
                <div className="pt-summary-card-body">
                  {vehiclesSummary.length === 0 ? (
                    <p style={{ color: "#adc6d8", fontSize: "13px" }}>No vehicles selected.</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ background: "rgba(0,39,107,0.05)" }}>
                            {["Vehicle","Price/Day","Qty","Days","Subtotal"].map(h => (
                              <th key={h} style={{ padding: "8px 10px", textAlign: h === "Vehicle" ? "left" : "right", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", color: "#00276b", textTransform: "uppercase" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {vehiclesSummary.map(v => (
                            <tr key={v.id} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)" }}>
                              <td style={{ padding: "9px 10px", color: "#00276b", fontWeight: 500 }}>{v.id}</td>
                              <td style={{ padding: "9px 10px", textAlign: "right", color: "#7a9ab8" }}>${v.pricePerDay}</td>
                              <td style={{ padding: "9px 10px", textAlign: "right", color: "#7a9ab8" }}>{v.quantity}</td>
                              <td style={{ padding: "9px 10px", textAlign: "right", color: "#7a9ab8" }}>{v.days}</td>
                              <td style={{ padding: "9px 10px", textAlign: "right", color: "#00276b", fontWeight: 600 }}>${v.subtotal}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </Collapse>
          </div>

          {/* Pricing summary */}
          <div className="pt-summary-card">
            <div className="pt-summary-card-header" onClick={() => toggleCard("pricing")}>
              <span>Pricing Summary</span>
              <span>{openCards.pricing ? "▲" : "▼"}</span>
            </div>
            <Collapse in={openCards.pricing}>
              <div>
                <div className="pt-summary-card-body">
                  {vehiclesSummary.map(v => (
                    <div key={v.id} className="pt-summary-row">
                      <span className="pt-summary-key">{v.id} (${v.pricePerDay} × {v.quantity} × {days}d)</span>
                      <span className="pt-summary-val">${v.subtotal}</span>
                    </div>
                  ))}
                  <div className="pt-summary-row" style={{ borderTop: "2px solid rgba(0,39,107,0.1)", marginTop: "6px", paddingTop: "10px" }}>
                    <span className="pt-summary-key" style={{ fontWeight: 700, color: "#00276b" }}>Total</span>
                    <span className="pt-summary-val" style={{ fontFamily: "'DM Serif Display', serif", fontSize: "18px" }}>${totalPrice}</span>
                  </div>
                </div>
              </div>
            </Collapse>
          </div>

          <div className="pt-nav-row" style={{ marginTop: "8px" }}>
            <button className="pt-nav-btn secondary" onClick={() => setStep(1)} disabled={saving}>‹ Previous</button>
            <button className="pt-nav-btn primary" onClick={() => setShowConfirm(true)} disabled={saving}>
              {saving ? "Saving..." : "Confirm Booking ›"}
            </button>
          </div>

        </Col>
        {renderPriceSummary()}
      </Row>
    );
  };

  /* ════════════════════ STEP 3 ════════════════════ */
  const renderStep3 = () => (
    <Row>
      <Col md={8}>
        <div style={{ position: "relative" }}>

          <div className="pt-step-card">
            <div className="pt-step-card-header">
              <span className="pt-step-card-title"><span className="pt-step-card-icon">◇</span> Select Booking to Pay</span>
            </div>
            <div className="pt-step-card-body">
              {loadingUnpaid ? (
                <div className="pt-spinner-inline">Loading bookings...</div>
              ) : unpaidBookings.length === 0 ? (
                <p style={{ color: "#adc6d8", fontSize: "13px" }}>No unpaid bookings found.</p>
              ) : (
                unpaidBookings.map(b => {
                  const total = b.totalPrice || 0;
                  const half  = total / 2;
                  const isExp = expandedId === b.id;

                  return (
                    <div key={b.id} className="pt-booking-accordion-item">

                      {/* Booking header */}
                      <div
                        className={`pt-booking-accordion-header ${isExp ? "expanded" : ""}`}
                        onClick={() => { if (!saving) { setSelectedBooking(b); setExpandedId(prev => prev === b.id ? null : b.id); } }}
                      >
                        <div className="pt-booking-accordion-ref">
                          {b.bookingId || "N/A"}
                          <span className="pt-booking-price-badge">${b.totalPrice || 0}</span>
                        </div>
                        <div className="pt-booking-accordion-meta">
                          <span><strong>Type:</strong> {b.tourType || "vehicle-only"}</span>
                          <span><strong>Arrival:</strong> {b.arrivalDate || "N/A"}</span>
                          <span><strong>Booked:</strong> {b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString() : "N/A"}</span>
                        </div>
                      </div>

                      {/* Booking body */}
                      {isExp && selectedBooking?.id === b.id && (
                        <div className="pt-booking-accordion-body">

                          {/* Booking summary */}
                          <div className="pt-summary-card" style={{ marginBottom: "10px" }}>
                            <div className="pt-summary-card-header" style={{ cursor: "default" }}><span>Booking Summary</span></div>
                            <div className="pt-summary-card-body">
                              {[["Customer",b.customerName],["Email",b.customerEmail],["Arrival Date",b.arrivalDate],["Departure Date",b.departureDate],["Duration",`${b.days} days`]].map(([k,v]) => (
                                <div key={k} className="pt-summary-row"><span className="pt-summary-key">{k}</span><span className="pt-summary-val">{v}</span></div>
                              ))}
                            </div>
                          </div>

                          {/* Vehicles table */}
                          <div className="pt-summary-card" style={{ marginBottom: "10px" }}>
                            <div className="pt-summary-card-header" style={{ cursor: "default" }}><span>Vehicles</span></div>
                            <div className="pt-summary-card-body">
                              <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                  <thead>
                                    <tr style={{ background: "rgba(0,39,107,0.05)" }}>
                                      {["Vehicle","Price/Day","Qty","Days","Subtotal"].map(h => (
                                        <th key={h} style={{ padding: "8px 10px", textAlign: h === "Vehicle" ? "left" : "right", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", color: "#00276b", textTransform: "uppercase" }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {b.vehicles?.map((v, i) => (
                                      <tr key={i} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)" }}>
                                        <td style={{ padding: "9px 10px", color: "#00276b", fontWeight: 500 }}>{v.id}</td>
                                        <td style={{ padding: "9px 10px", textAlign: "right", color: "#7a9ab8" }}>${v.pricePerDay}</td>
                                        <td style={{ padding: "9px 10px", textAlign: "right", color: "#7a9ab8" }}>{v.quantity}</td>
                                        <td style={{ padding: "9px 10px", textAlign: "right", color: "#7a9ab8" }}>{v.days}</td>
                                        <td style={{ padding: "9px 10px", textAlign: "right", color: "#00276b", fontWeight: 600 }}>${v.subtotal}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>

                          {/* Pricing summary */}
                          {Array.isArray(b.vehicles) && (
                            <div className="pt-summary-card" style={{ marginBottom: "10px" }}>
                              <div className="pt-summary-card-header" style={{ cursor: "default" }}><span>Price Summary</span></div>
                              <div className="pt-summary-card-body">
                                {b.vehicles.map((v, i) => (
                                  <div key={i} className="pt-summary-row">
                                    <span className="pt-summary-key">{v.id} (${v.pricePerDay} × {v.quantity} × {v.days}d)</span>
                                    <span className="pt-summary-val">${v.subtotal}</span>
                                  </div>
                                ))}
                                <div className="pt-summary-row" style={{ borderTop: "2px solid rgba(0,39,107,0.1)", marginTop: "6px", paddingTop: "10px" }}>
                                  <span className="pt-summary-key" style={{ fontWeight: 700, color: "#00276b" }}>Total</span>
                                  <span className="pt-summary-val" style={{ fontFamily: "'DM Serif Display', serif", fontSize: "18px" }}>${b.totalPrice}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Invoice button */}
                          <button className="pt-nav-btn accent" style={{ marginBottom: "20px" }} onClick={() => setShowInvoiceModal(true)} disabled={!selectedBooking}>
                            ◧ View Invoice
                          </button>

                          {/* Payment amount */}
                          <span className="pt-pay-section-head">Payment Amount</span>
                          <div className={`pt-pay-option-row ${paymentAmount === "half" ? "selected" : ""}`} onClick={() => { setPaymentAmount("half"); setPaymentAmountValue(half); }}>
                            <input type="radio" readOnly checked={paymentAmount === "half"} style={{ accentColor: "#00276b", width: 14, height: 14 }} />
                            <div><div className="pt-pay-option-label">50% Advance Payment</div><div className="pt-pay-option-sub">${half.toLocaleString()}</div></div>
                          </div>
                          <div className={`pt-pay-option-row ${paymentAmount === "full" ? "selected" : ""}`} onClick={() => { setPaymentAmount("full"); setPaymentAmountValue(total); }}>
                            <input type="radio" readOnly checked={paymentAmount === "full"} style={{ accentColor: "#00276b", width: 14, height: 14 }} />
                            <div><div className="pt-pay-option-label">Full Payment</div><div className="pt-pay-option-sub">${total.toLocaleString()}</div></div>
                          </div>

                          {/* Payment method */}
                          <span className="pt-pay-section-head">Payment Method</span>
                          <div className={`pt-pay-option-row ${paymentMethod === "Bank Transfer" ? "selected" : ""}`} onClick={() => !saving && setPaymentMethod("Bank Transfer")}>
                            <input type="radio" readOnly checked={paymentMethod === "Bank Transfer"} style={{ accentColor: "#00276b", width: 14, height: 14 }} />
                            <div><div className="pt-pay-option-label">Bank Transfer</div><div className="pt-pay-option-sub">Upload your transfer receipt to confirm</div></div>
                          </div>
                          <div className={`pt-pay-option-row ${paymentMethod === "Credit Card" ? "selected" : ""}`} onClick={() => !saving && setPaymentMethod("Credit Card")}>
                            <input type="radio" readOnly checked={paymentMethod === "Credit Card"} style={{ accentColor: "#00276b", width: 14, height: 14 }} />
                            <div><div className="pt-pay-option-label">Credit Card</div><div className="pt-pay-option-sub">Currently unavailable</div></div>
                          </div>

                          {/* Bank transfer details */}
                          {paymentMethod === "Bank Transfer" && (
                            <>
                              <span className="pt-pay-section-head">Bank Account Details</span>
                              <div className="pt-bank-detail-block">
                                {bankDetails
                                  ? Object.entries(bankDetails).map(([k, v]) => (
                                      <div key={k} className="pt-bank-detail-row">
                                        <span className="pt-bank-detail-key">{k}</span>
                                        <span className="pt-bank-detail-val">{v}</span>
                                      </div>
                                    ))
                                  : <p style={{ fontSize: "12px", color: "#adc6d8" }}>Loading bank details...</p>
                                }
                              </div>
                              <div className="pt-paying-amount-pill">
                                Paying: ${paymentAmountValue.toLocaleString()} — {paymentAmount === "half" ? "50% Advance" : "Full Payment"}
                              </div>

                              <span className="pt-pay-section-head" style={{ marginTop: "16px" }}>Upload Receipt</span>
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
              <li>Full payment must be completed within <strong>2 calendar days</strong> of reservation.</li>
              <li>50% advance — remaining balance is due <strong>on arrival</strong>.</li>
              <li>Bank transfers require an <strong>official receipt</strong> to be uploaded.</li>
              <li><strong>No hidden fees.</strong></li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px", flexWrap: "wrap" }}>
            <button className="pt-nav-btn primary"   onClick={() => navigate("/booknow")}>Book Another Tour</button>
            <button className="pt-nav-btn secondary" onClick={() => navigate("/customer/dashboard")}>Go to Dashboard</button>
            <button className="pt-nav-btn danger"    onClick={() => navigate("/")}>Exit</button>
          </div>

          {saving && (
            <div className="pt-processing-overlay">
              <div className="pt-processing-spinner" />
              <span>Processing payment...</span>
            </div>
          )}
        </div>
      </Col>
      {renderPriceSummary()}
    </Row>
  );

  /* ════════════════════ RENDER ════════════════════ */
  const currentStepIndex = step - 1;

  return (
    <>
      <div className="preset-tours-page">

        {/* Hero + step strip */}
        <div className="pt-booking-hero">
          <div className="pt-booking-hero-dots" />
          <div className="pt-booking-hero-inner">
            <span className="pt-booking-eyebrow">Step {step} of {STEPS.length}</span>
            <h1 className="pt-booking-title">Vehicle-Only Reservations</h1>
            <div className="pt-step-strip">
              {STEPS.map((s, i) => (
                <div
                  key={s.key}
                  className={`pt-step-pill ${step === s.key ? "active" : ""} ${i < currentStepIndex ? "done" : ""}`}
                >
                  <div className="pt-step-pill-num">{i < currentStepIndex ? "✓" : i + 1}</div>
                  <span className="pt-step-pill-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="container py-4">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
      </div>

      {selectedBooking && (
        <VehicleOnlyBookedInvoiceModal
          show={showInvoiceModal}
          onHide={() => setShowInvoiceModal(false)}
          selectedBooking={selectedBooking}
          b={selectedBooking}
          paymentMethod={paymentMethod}
          saving={saving}
          canConfirm={canConfirm}
          setReceiptFile={setReceiptFile}
          handleConfirmPayment={handleConfirmPayment}
        />
      )}

      <ConfirmBookingModal
        show={showConfirm}
        onHide={() => setShowConfirm(false)}
        onConfirm={handleNext}
        title="Confirm Vehicle Booking"
        message="Do you want to save this vehicle booking?"
        loading={saving}
        confirmLabel="Confirm Booking"
        cancelLabel="Cancel"
      />
    </>
  );
}