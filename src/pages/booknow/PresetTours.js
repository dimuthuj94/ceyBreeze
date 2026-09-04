// src/pages/booknow/presettours/PresetTours.js
import React, { useState, useEffect } from "react";
import { Container, Row, Col, Tab } from "react-bootstrap";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

import Step1SelectTour    from "./presettours/Step1SelectTour";
import Step2Travelers     from "./presettours/Step2Travelers";
import Step3Accommodation from "./presettours/Step3Accommodation";
import Step4Meals         from "./presettours/Step4Meals";
import Step5Summary       from "./presettours/Step5Summary";
import Step6Payment       from "./presettours/Step6Payment";

const STEPS = [
  { key: "step1", label: "Select Tour" },
  { key: "step2", label: "Arrival & Travelers" },
  { key: "step3", label: "Accommodation" },
  { key: "step4", label: "Meals" },
  { key: "step5", label: "Summary" },
  { key: "step6", label: "Payment" },
];

export default function PresetTours() {
  const [activeKey, setActiveKey] = useState("step1");
  const [tours, setTours]         = useState([]);
  const [loadingTours, setLoadingTours] = useState(true);

  const [selectedTour, setSelectedTour]   = useState(null);
  const [travelers, setTravelers]         = useState({ adults: 1, children: 0, infants: 0, guideRequired: false });
  const [accommodation, setAccommodation] = useState("");
  const [accommodationOptions, setAccommodationOptions] = useState([]);
  const [mealPreference, setMealPreference] = useState("Standard Meals");
  const [tourNotes, setTourNotes]           = useState("");
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [additionalActivityBasePrice, setAdditionalActivityBasePrice] = useState(0);
  const [transportUnitPrice, setTransportUnitPrice]   = useState(0);
  const [tourGuidePrice, setTourGuidePrice]           = useState(0);
  const [roomDetails, setRoomDetails]   = useState({});
  const [selectedRooms, setSelectedRooms] = useState({});
  const [providedVehicles, setProvidedVehicles] = useState([]);

  const [pricing, setPricing] = useState({
    base: 0, accommodationCost: 0, luxuryCost: 0, transport: 0,
    activities: [], additionalActivitiesPrice: 0, tourGuide: 0, total: 0,
  });

  const currentStepIndex = STEPS.findIndex(s => s.key === activeKey);

  // ── Fetch tours ──
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tours"),
      snap => { setTours(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingTours(false); },
      () => setLoadingTours(false)
    );
    return () => unsub();
  }, []);

  // ── Fetch accommodation ──
  useEffect(() => {
    getDoc(doc(db, "prices", "Accommodation")).then(s => {
      if (!s.exists()) return;
      const types = s.data().types || [];
      setAccommodationOptions(types);
      if (!accommodation && types.length > 0) setAccommodation(types[0].name);
      const d = {};
      types.forEach(t => { d[t.name] = { price: t.price || 0, additionalPricePerDay: t.additionalPricePerDay || 0 }; });
      setRoomDetails(prev => ({ ...prev, ...d }));
    }).catch(() => {});
  }, []);

  // ── Fetch prices ──
  useEffect(() => {
    getDoc(doc(db, "prices", "Additional Activity Price"))
      .then(s => { if (s.exists()) setAdditionalActivityBasePrice(s.data().price || 0); }).catch(() => {});
  }, []);
  useEffect(() => {
    getDoc(doc(db, "prices", "Additional Transport Cost"))
      .then(s => { if (s.exists()) setTransportUnitPrice(s.data().price || 0); }).catch(() => {});
  }, []);
  useEffect(() => {
    getDoc(doc(db, "prices", "Price for Tour Guide"))
      .then(s => { if (s.exists()) setTourGuidePrice(s.data().price || 0); }).catch(() => {});
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [activeKey]);

  // ── Pricing calculation (unchanged logic) ──
  useEffect(() => {
    if (!selectedTour) return;
    const nights          = selectedTour.nights || selectedTour.days || 1;
    const basePerDay      = Number(selectedTour.price) || 0;
    const base            = basePerDay * nights;
    const chargeableTravelers = travelers.adults + travelers.children;
    const accommodationCost = (roomDetails[accommodation]?.price || 0) * chargeableTravelers * nights;
    let luxuryCost = 0;
    Object.keys(selectedRooms).forEach(r => {
      const days = selectedRooms[r] || 0;
      if (days > 0) luxuryCost += (roomDetails[r]?.additionalPricePerDay || 0) * days * chargeableTravelers;
    });
    const additionalActivitiesPrice = selectedActivities.length > 0 ? additionalActivityBasePrice : 0;
    const activityPrices = selectedActivities.map(a => {
      const pricePerPerson = Number(a.price || 0);
      return { ...a, pricePerPerson, totalPrice: pricePerPerson * chargeableTravelers };
    });
    const transport  = Math.max(0, chargeableTravelers - 1) * transportUnitPrice * nights;
    const guideCost  = travelers.guideRequired ? tourGuidePrice : 0;
    const total      = base + accommodationCost + luxuryCost
      + activityPrices.reduce((s, a) => s + a.totalPrice, 0)
      + additionalActivitiesPrice + transport + guideCost;
    setPricing({ basePerDay, base, accommodationCost, luxuryCost, transport, activities: activityPrices, additionalActivitiesPrice, tourGuide: guideCost, total });
  }, [selectedTour, travelers, accommodation, selectedActivities, selectedRooms, roomDetails, additionalActivityBasePrice, transportUnitPrice, tourGuidePrice]);

  // ── Pricing panel (right column) ── aesthetics only ──
  const renderPricing = () => {
    if (!selectedTour) return null;

    const totalTravelersDisplay = travelers.adults + travelers.children + travelers.infants + (travelers.guideRequired ? 1 : 0);
    const nights              = selectedTour.nights || selectedTour.days || 1;
    const chargeableTravelers = travelers.adults + travelers.children;

    return (
      <div className="preset-tours-price-summary">

        {/* Header */}
        <div className="preset-tours-price-summary-header">
          <h5>Price Summary</h5>
          <span className="preset-tours-price-total-preview">${pricing.total}</span>
        </div>

        {/* Scrollable details */}
        <div className="preset-tours-price-summary-details">

          <span className="pt-price-sec-head">Tour</span>
          <div className="pt-price-detail-row">
            <span className="pt-price-detail-key">{selectedTour.name || selectedTour.title}</span>
          </div>
          <div className="pt-price-detail-row">
            <span className="pt-price-detail-key">Travelers</span>
            <span className="pt-price-detail-val">{totalTravelersDisplay}</span>
          </div>
          <div className="pt-price-detail-row">
            <span className="pt-price-detail-key">Nights</span>
            <span className="pt-price-detail-val">{nights}</span>
          </div>

          <span className="pt-price-sec-head">Base Price</span>
          <div className="pt-price-detail-row">
            <span className="pt-price-detail-key">Per night</span>
            <span className="pt-price-detail-val">${pricing.basePerDay}</span>
          </div>
          <div className="pt-price-detail-row">
            <span className="pt-price-detail-key">Total ({nights} nights)</span>
            <span className="pt-price-detail-val">${pricing.base}</span>
          </div>

          <span className="pt-price-sec-head">Accommodation</span>
          <div className="pt-price-detail-row">
            <span className="pt-price-detail-key">
              {accommodation} × {chargeableTravelers} × {nights}n
            </span>
            <span className="pt-price-detail-val">${pricing.accommodationCost}</span>
          </div>
          {pricing.luxuryCost > 0 && (
            <>
              <div className="pt-price-detail-row">
                <span className="pt-price-detail-key">Luxury rooms</span>
                <span className="pt-price-detail-val">${pricing.luxuryCost}</span>
              </div>
              {Object.keys(selectedRooms).map(roomName => {
                const days       = selectedRooms[roomName];
                const pricePerDay = roomDetails[roomName]?.additionalPricePerDay || 0;
                if (!days) return null;
                return (
                  <div key={roomName} className="pt-price-detail-row" style={{ paddingLeft: "8px" }}>
                    <span className="pt-price-detail-key" style={{ fontSize: "11px" }}>
                      {roomName}: ${pricePerDay} × {days} × {chargeableTravelers}
                    </span>
                    <span className="pt-price-detail-val" style={{ fontSize: "11px" }}>
                      ${pricePerDay * days * chargeableTravelers}
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {(pricing.activities.length > 0 || pricing.additionalActivitiesPrice > 0) && (
            <>
              <span className="pt-price-sec-head">Activities</span>
              {pricing.additionalActivitiesPrice > 0 && (
                <div className="pt-price-detail-row">
                  <span className="pt-price-detail-key">Base activity fee</span>
                  <span className="pt-price-detail-val">${pricing.additionalActivitiesPrice}</span>
                </div>
              )}
              {pricing.activities.map(a => (
                <div key={a.id} className="pt-price-detail-row">
                  <span className="pt-price-detail-key">{a.name} × {chargeableTravelers}</span>
                  <span className="pt-price-detail-val">${a.totalPrice}</span>
                </div>
              ))}
            </>
          )}

          {pricing.transport > 0 && (
            <>
              <span className="pt-price-sec-head">Transport</span>
              <div className="pt-price-detail-row">
                <span className="pt-price-detail-key">
                  {Math.max(0, chargeableTravelers - 1)} extra × {nights}n
                </span>
                <span className="pt-price-detail-val">${pricing.transport}</span>
              </div>
            </>
          )}

          {travelers.guideRequired && pricing.tourGuide > 0 && (
            <>
              <span className="pt-price-sec-head">Tour Guide</span>
              <div className="pt-price-detail-row">
                <span className="pt-price-detail-key">Guide service</span>
                <span className="pt-price-detail-val">${pricing.tourGuide}</span>
              </div>
            </>
          )}

        </div>

        {/* Total — always visible */}
        <div className="d-flex justify-content-between align-items-center preset-tours-price-summary-total">
          <h5 className="fw-bold mb-0">Total</h5>
          <h5 className="fw-bold mb-0 preset-tours-total-value">${pricing.total}</h5>
        </div>
      </div>
    );
  };

  return (
    <div className="preset-tours-page">

      {/* ── Hero + custom step strip ── */}
      <div className="pt-booking-hero">
        <div className="pt-booking-hero-dots" />
        <div className="pt-booking-hero-inner">
          <span className="pt-booking-eyebrow">
            Step {currentStepIndex + 1} of {STEPS.length}
          </span>
          <h1 className="pt-booking-title">Reserve Our Tailor-Made Packages</h1>

          {/* Custom step strip replaces Bootstrap ProgressBar */}
          <div className="pt-step-strip">
            {STEPS.map((step, i) => (
              <div
                key={step.key}
                className={`pt-step-pill
                  ${activeKey === step.key ? "active" : ""}
                  ${i < currentStepIndex ? "done" : ""}`}
              >
                <div className="pt-step-pill-num">
                  {i < currentStepIndex ? "✓" : i + 1}
                </div>
                <span className="pt-step-pill-label">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Original Bootstrap layout — unchanged ── */}
      <Container>
        <Tab.Container activeKey={activeKey}>
          <Row>
            {/* Left — step content (8 columns) */}
            <Col md={8}>
              <Tab.Content>
                <Tab.Pane eventKey="step1">
                  <Step1SelectTour
                    tours={tours}
                    loadingTours={loadingTours}
                    selectedTour={selectedTour}
                    setSelectedTour={setSelectedTour}
                    setActiveKey={setActiveKey}
                    selectedActivities={selectedActivities}
                    setSelectedActivities={setSelectedActivities}
                  />
                </Tab.Pane>
                <Tab.Pane eventKey="step2">
                  <Step2Travelers
                    travelers={travelers}
                    setTravelers={setTravelers}
                    setActiveKey={setActiveKey}
                  />
                </Tab.Pane>
                <Tab.Pane eventKey="step3">
                  <Step3Accommodation
                    accommodation={accommodation}
                    setAccommodation={setAccommodation}
                    selectedRooms={selectedRooms}
                    setSelectedRooms={setSelectedRooms}
                    roomDetails={roomDetails}
                    setRoomDetails={setRoomDetails}
                    setActiveKey={setActiveKey}
                    travelers={travelers}
                    tourNights={selectedTour?.nights || selectedTour?.days || 1}
                    providedVehicles={providedVehicles}
                    setProvidedVehicles={setProvidedVehicles}
                  />
                </Tab.Pane>
                <Tab.Pane eventKey="step4">
                  <Step4Meals
                    mealPreference={mealPreference}
                    setMealPreference={setMealPreference}
                    tourNotes={tourNotes}
                    setTourNotes={setTourNotes}
                    setActiveKey={setActiveKey}
                  />
                </Tab.Pane>
                <Tab.Pane eventKey="step5">
                  <Step5Summary
                    selectedTour={selectedTour}
                    travelers={travelers}
                    accommodation={accommodation}
                    mealPreference={mealPreference}
                    pricing={pricing}
                    selectedRooms={selectedRooms}
                    roomDetails={roomDetails}
                    selectedActivities={selectedActivities}
                    tourNotes={tourNotes}
                    providedVehicles={providedVehicles}
                    setActiveKey={setActiveKey}
                  />
                </Tab.Pane>
                <Tab.Pane eventKey="step6">
                  <Step6Payment setActiveKey={setActiveKey} />
                </Tab.Pane>
              </Tab.Content>
            </Col>

            {/* Right — pricing summary (4 columns) — same as original */}
            <Col md={4}>{renderPricing()}</Col>
          </Row>
        </Tab.Container>
      </Container>
    </div>
  );
}