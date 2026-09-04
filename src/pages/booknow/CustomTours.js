// src/pages/booknow/customtours.js
import React, { useState, useEffect } from "react";
import { Container, Row, Col, Tab } from "react-bootstrap";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import Step1SelectTravelers from "./customtours/Step1SelectTravelers";
import Step2Travelers        from "./customtours/Step2SelectLocations";
import Step3Accommodation    from "./customtours/Step3Accommodations";
import Step4Meals            from "./customtours/Step4Meals";
import Step5Summary          from "./customtours/Step5Summary";
import Step6Payment          from "./customtours/Step6Payment";

const STEPS = [
  { key: "step1", label: "Traveler Info" },
  { key: "step2", label: "Locations" },
  { key: "step3", label: "Accommodation" },
  { key: "step4", label: "Meals" },
  { key: "step5", label: "Summary" },
  { key: "step6", label: "Payment" },
];

export default function CustomTours() {
  const [activeKey, setActiveKey] = useState("step1");
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [travelers, setTravelers] = useState({
    fullName: "", adults: 1, children: 0, infants: 0, guideRequired: false,
    childCarSeat: false, arrivalAirport: "Colombo Bandaranayake International Airport",
    arrivalDate: "", days: 0, nights: 0,
  });
  const [accommodation, setAccommodation]               = useState("");
  const [accommodationOptions, setAccommodationOptions] = useState([]);
  const [mealPreference, setMealPreference]             = useState("Standard Meals");
  const [tourNotes, setTourNotes]                       = useState("");
  const [selectedActivities, setSelectedActivities]     = useState([]);
  const [additionalActivityBasePrice, setAdditionalActivityBasePrice] = useState(0);
  const [transportUnitPrice, setTransportUnitPrice]     = useState(0);
  const [tourGuidePrice, setTourGuidePrice]             = useState(0);
  const [customTourBasePrice, setCustomTourBasePrice]   = useState(0);
  const [baseAdventurePrice, setBaseAdventurePrice]     = useState(0);
  const [roomDetails, setRoomDetails]                   = useState({});
  const [selectedRooms, setSelectedRooms]               = useState({});
  const [providedVehicles, setProvidedVehicles]         = useState([]);
  const [pricing, setPricing] = useState({
    basePerDay: 0, base: 0, accommodationCost: 0, luxuryCost: 0, transport: 0,
    activities: [], additionalActivitiesPrice: 0, adventures: [],
    adventureTotal: 0, tourGuide: 0, total: 0,
  });

  const currentStepIndex = STEPS.findIndex(s => s.key === activeKey);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "locations"),
      snap => { setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingLocations(false); },
      () => setLoadingLocations(false)
    );
    return () => unsub();
  }, []);

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

  useEffect(() => {
    const fp = (name, setter) => getDoc(doc(db, "prices", name)).then(s => { if (s.exists()) setter(s.data().price || 0); }).catch(() => {});
    fp("Additional Activity Price", setAdditionalActivityBasePrice);
    fp("Additional Transport Cost", setTransportUnitPrice);
    fp("Price for Tour Guide", setTourGuidePrice);
    fp("Custom Tour Base Price", setCustomTourBasePrice);
    fp("Price for Adventure", setBaseAdventurePrice);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [activeKey]);

  useEffect(() => {
    const nights = travelers.nights || 0;
    const basePerDay = customTourBasePrice;
    const base = basePerDay * nights;
    const chargeableTravelers = travelers.adults + travelers.children;
    const accommodationCost = (roomDetails[accommodation]?.price || 0) * chargeableTravelers * nights;
    let luxuryCost = 0;
    Object.keys(selectedRooms).forEach(r => {
      const days = selectedRooms[r] || 0;
      luxuryCost += (roomDetails[r]?.additionalPricePerDay || 0) * days * chargeableTravelers;
    });
    const additionalActivitiesPrice = selectedActivities.length > 0 ? additionalActivityBasePrice : 0;
    const activityPrices = selectedActivities.map(a => {
      const pricePerPerson = Number(a.price || 0);
      return { ...a, pricePerPerson, totalPrice: pricePerPerson * chargeableTravelers };
    });
    const selectedAdventures = selectedLocations.filter(l => l.type === "Adventure");
    const adventurePrices = selectedAdventures.map(adv => {
      const pricePerPerson = Number(adv.price) || 0;
      return { ...adv, pricePerPerson, totalPrice: pricePerPerson * chargeableTravelers };
    });
    let adventureTotal = adventurePrices.reduce((s, a) => s + a.totalPrice, 0);
    if (selectedAdventures.length > 0) adventureTotal += baseAdventurePrice;
    const transport = Math.max(0, chargeableTravelers - 1) * transportUnitPrice * nights;
    const guideCost = travelers.guideRequired ? tourGuidePrice : 0;
    const total = base + accommodationCost + luxuryCost + activityPrices.reduce((s, a) => s + a.totalPrice, 0) + adventureTotal + additionalActivitiesPrice + transport + guideCost;
    setPricing({ basePerDay, base, accommodationCost, luxuryCost, transport, activities: activityPrices, additionalActivitiesPrice, adventures: adventurePrices, adventureTotal, tourGuide: guideCost, total });
  }, [selectedLocations, selectedActivities, travelers, accommodation, selectedRooms, roomDetails, baseAdventurePrice, additionalActivityBasePrice, transportUnitPrice, tourGuidePrice, customTourBasePrice]);

  const renderPricing = () => {
    const totalTravelersDisplay = travelers.adults + travelers.children + travelers.infants + (travelers.guideRequired ? 1 : 0);
    const nights = travelers.nights || 0;
    const chargeableTravelers = travelers.adults + travelers.children;
    const transportCount = Math.max(0, chargeableTravelers - 1);

    return (
      <div className="preset-tours-price-summary">
        <div className="preset-tours-price-summary-header">
          <h5>Price Summary</h5>
          <span className="preset-tours-price-total-preview">${pricing.total}</span>
        </div>

        <div className="preset-tours-price-summary-details">

          <span className="pt-price-sec-head">Tour Details</span>
          <div className="pt-price-detail-row">
            <span className="pt-price-detail-key">Locations</span>
            <span className="pt-price-detail-val">{selectedLocations.length}</span>
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
            <span className="pt-price-detail-key">Per day</span>
            <span className="pt-price-detail-val">${pricing.basePerDay}</span>
          </div>
          <div className="pt-price-detail-row">
            <span className="pt-price-detail-key">Total ({nights} nights)</span>
            <span className="pt-price-detail-val">${pricing.base}</span>
          </div>

          <span className="pt-price-sec-head">Accommodation</span>
          <div className="pt-price-detail-row">
            <span className="pt-price-detail-key">{accommodation || "N/A"} × {chargeableTravelers} × {nights}n</span>
            <span className="pt-price-detail-val">${pricing.accommodationCost}</span>
          </div>
          {pricing.luxuryCost > 0 && (
            <div className="pt-price-detail-row">
              <span className="pt-price-detail-key">Luxury rooms</span>
              <span className="pt-price-detail-val">${pricing.luxuryCost}</span>
            </div>
          )}

          {pricing.activities.length > 0 && (
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

          {pricing.adventures.length > 0 && (
            <>
              <span className="pt-price-sec-head">Adventures</span>
              <div className="pt-price-detail-row">
                <span className="pt-price-detail-key">Base adventure fee</span>
                <span className="pt-price-detail-val">${baseAdventurePrice}</span>
              </div>
              {pricing.adventures.map(a => (
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
                <span className="pt-price-detail-key">{transportCount} extra × {nights}n</span>
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

        <div className="d-flex justify-content-between align-items-center preset-tours-price-summary-total">
          <h5 className="fw-bold mb-0">Grand Total</h5>
          <h5 className="fw-bold mb-0 preset-tours-total-value">${pricing.total}</h5>
        </div>
      </div>
    );
  };

  return (
    <div className="preset-tours-page">

      {/* ── Hero + step strip ── */}
      <div className="pt-booking-hero">
        <div className="pt-booking-hero-dots" />
        <div className="pt-booking-hero-inner">
          <span className="pt-booking-eyebrow">Step {currentStepIndex + 1} of {STEPS.length}</span>
          <h1 className="pt-booking-title">Build Your Custom Tour</h1>
          <div className="pt-step-strip">
            {STEPS.map((step, i) => (
              <div
                key={step.key}
                className={`pt-step-pill ${activeKey === step.key ? "active" : ""} ${i < currentStepIndex ? "done" : ""}`}
              >
                <div className="pt-step-pill-num">{i < currentStepIndex ? "✓" : i + 1}</div>
                <span className="pt-step-pill-label">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Original Bootstrap layout unchanged ── */}
      <Container className="my-4">
        <Tab.Container activeKey={activeKey}>
          <Row>
            <Col md={8}>
              <Tab.Content>
                <Tab.Pane eventKey="step1">
                  <Step1SelectTravelers travelers={travelers} setTravelers={setTravelers} setActiveKey={setActiveKey} />
                </Tab.Pane>
                <Tab.Pane eventKey="step2">
                  <Step2Travelers
                    locations={locations} loadingLocations={loadingLocations}
                    selectedLocations={selectedLocations} setSelectedLocations={setSelectedLocations}
                    setActiveKey={setActiveKey}
                    selectedActivities={selectedActivities} setSelectedActivities={setSelectedActivities}
                    nights={travelers.nights} travellers={travelers.adults + travelers.children}
                    baseAdventurePrice={baseAdventurePrice}
                  />
                </Tab.Pane>
                <Tab.Pane eventKey="step3">
                  <Step3Accommodation
                    accommodation={accommodation} setAccommodation={setAccommodation}
                    selectedRooms={selectedRooms} setSelectedRooms={setSelectedRooms}
                    roomDetails={roomDetails} setRoomDetails={setRoomDetails}
                    setActiveKey={setActiveKey} travelers={travelers}
                    tourNights={travelers.nights || 0}
                    providedVehicles={providedVehicles} setProvidedVehicles={setProvidedVehicles}
                  />
                </Tab.Pane>
                <Tab.Pane eventKey="step4">
                  <Step4Meals mealPreference={mealPreference} setMealPreference={setMealPreference} tourNotes={tourNotes} setTourNotes={setTourNotes} setActiveKey={setActiveKey} />
                </Tab.Pane>
                <Tab.Pane eventKey="step5">
                  <Step5Summary
                    selectedTour={{ name: "Custom Tour" }} travelers={travelers}
                    accommodation={accommodation} mealPreference={mealPreference}
                    pricing={pricing} selectedRooms={selectedRooms} roomDetails={roomDetails}
                    selectedActivities={selectedActivities} tourNotes={tourNotes}
                    providedVehicles={providedVehicles} selectedLocations={selectedLocations}
                    baseAdventurePrice={baseAdventurePrice} setActiveKey={setActiveKey}
                  />
                </Tab.Pane>
                <Tab.Pane eventKey="step6">
                  <Step6Payment setActiveKey={setActiveKey} />
                </Tab.Pane>
              </Tab.Content>
            </Col>
            <Col md={4}>{renderPricing()}</Col>
          </Row>
        </Tab.Container>
      </Container>
    </div>
  );
}