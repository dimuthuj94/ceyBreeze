// src/pages/booknow/customtours/Step1SelectTravelers.js
import React, { useEffect, useState } from "react";
import { Form, Row, Col, Alert } from "react-bootstrap";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";

export default function Step1SelectTravelers({ travelers, setTravelers, setActiveKey }) {
  const [maxExceeded, setMaxExceeded] = useState(false);
  const [errors, setErrors] = useState({});

  const safeTravelers = {
    fullName: "", arrivalAirport: "", arrivalDate: "", departureDate: "",
    days: 0, nights: 0, adults: 0, children: 0, infants: 0,
    guideRequired: false, childCarSeat: false, ...travelers,
  };

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) return;
        const snap = await getDoc(doc(db, "customers", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setTravelers(prev => ({ ...prev, fullName: `${d.firstName || ""} ${d.lastName || ""}`.trim() }));
        }
      } catch (err) { console.error(err); }
    };
    fetchCustomer();
  }, [setTravelers]);

  const handleTravelerChange = (field, value) => {
    if (value < 0) return;
    const others = safeTravelers.adults + safeTravelers.children + safeTravelers.infants + (safeTravelers.guideRequired ? 1 : 0) - safeTravelers[field];
    value = Math.min(value, 12 - others);
    const n = { ...safeTravelers, [field]: value };
    setMaxExceeded(n.adults + n.children + n.infants + (n.guideRequired ? 1 : 0) > 12);
    setTravelers(n);
  };

  const handleGuideChange = (checked) => {
    const total = safeTravelers.adults + safeTravelers.children + safeTravelers.infants;
    if (checked && total + 1 > 12) { setMaxExceeded(true); return; }
    setMaxExceeded(total + (checked ? 1 : 0) > 12);
    setTravelers({ ...safeTravelers, guideRequired: checked });
  };

  const calculateDaysAndNights = (arrival, departure) => {
    if (!arrival || !departure) return [0, 0];
    const diff = new Date(departure) - new Date(arrival);
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    return [days, Math.max(days - 1, 0)];
  };

  const handleArrivalChange = (value) => {
    let dep = safeTravelers.departureDate;
    if (!dep || new Date(dep) <= new Date(value)) {
      const next = new Date(value); next.setDate(next.getDate() + 1);
      dep = next.toISOString().split("T")[0];
    }
    const [days, nights] = calculateDaysAndNights(value, dep);
    setTravelers(prev => ({ ...prev, arrivalDate: value, departureDate: dep, days, nights }));
  };

  const handleDepartureChange = (value) => {
    const [days, nights] = calculateDaysAndNights(safeTravelers.arrivalDate, value);
    setTravelers(prev => ({ ...prev, departureDate: value, days, nights }));
  };

  const handleNextStep = () => {
    const errs = {};
    if (!safeTravelers.arrivalDate)   errs.arrivalDate = true;
    if (!safeTravelers.departureDate) errs.departureDate = true;
    if (!safeTravelers.adults || safeTravelers.adults <= 0) errs.adults = true;
    setErrors(errs);
    if (!Object.keys(errs).length) setActiveKey("step2");
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <>
      <div className="pt-step-card">
        <div className="pt-step-card-header">
          <span className="pt-step-card-title"><span className="pt-step-card-icon">◐</span> Traveler Information</span>
        </div>
        <div className="pt-step-card-body">
          {maxExceeded && <Alert variant="danger" style={{ borderRadius: 0 }}>Total travelers cannot exceed 12.</Alert>}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control type="text" value={safeTravelers.fullName} disabled />
            </Form.Group>

            <Row className="mb-3 g-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Arrival Airport</Form.Label>
                  <Form.Select value={safeTravelers.arrivalAirport} onChange={e => setTravelers(prev => ({ ...prev, arrivalAirport: e.target.value }))}>
                    <option value="">Select an airport</option>
                    <option value="Colombo Bandaranayake International Airport">Colombo Bandaranayake International Airport</option>
                    <option value="Mattala Rajapaksha International Airport">Mattala Rajapaksha International Airport</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Arrival Date *</Form.Label>
                  <Form.Control type="date" value={safeTravelers.arrivalDate} min={todayStr} isInvalid={errors.arrivalDate} onChange={e => handleArrivalChange(e.target.value)} />
                  <Form.Control.Feedback type="invalid">Arrival date is required</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3 g-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Departure Date *</Form.Label>
                  <Form.Control type="date" value={safeTravelers.departureDate} min={safeTravelers.arrivalDate || todayStr} isInvalid={errors.departureDate} onChange={e => handleDepartureChange(e.target.value)} />
                  <Form.Control.Feedback type="invalid">Departure date is required</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label>Days</Form.Label>
                  <Form.Control type="number" value={safeTravelers.days} disabled />
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label>Nights</Form.Label>
                  <Form.Control type="number" value={safeTravelers.nights} disabled />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3 g-3">
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Adult Count *</Form.Label>
                  <Form.Control type="number" value={safeTravelers.adults} min={1} max={12 - safeTravelers.children - safeTravelers.infants - (safeTravelers.guideRequired ? 1 : 0)} isInvalid={errors.adults} onChange={e => handleTravelerChange("adults", Number(e.target.value))} />
                  <Form.Control.Feedback type="invalid">Adult count is required</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Children Count</Form.Label>
                  <Form.Control type="number" value={safeTravelers.children} min={0} max={12 - safeTravelers.adults - safeTravelers.infants - (safeTravelers.guideRequired ? 1 : 0)} onChange={e => handleTravelerChange("children", Number(e.target.value))} />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label>Infant Count</Form.Label>
                  <Form.Control type="number" value={safeTravelers.infants} min={0} max={12 - safeTravelers.adults - safeTravelers.children - (safeTravelers.guideRequired ? 1 : 0)} onChange={e => handleTravelerChange("infants", Number(e.target.value))} />
                </Form.Group>
              </Col>
            </Row>

            <Form.Check type="checkbox" label="Tour Guide Required"    className="mt-3" checked={safeTravelers.guideRequired}  onChange={e => handleGuideChange(e.target.checked)} />
            <Form.Check type="checkbox" label="Child Car Seat Required" className="mt-1" checked={safeTravelers.childCarSeat}   onChange={e => setTravelers(prev => ({ ...prev, childCarSeat: e.target.checked }))} />
          </Form>
        </div>
      </div>

      <div className="pt-nav-row">
        <div />
        <button className="pt-nav-btn primary" onClick={handleNextStep}>Next ›</button>
      </div>

      <div className="pt-info-note">
        <span className="pt-info-note-title">Please Note</span>
        <ul>
          <li>Arrival and Departure dates are <strong>mandatory</strong>.</li>
          <li>Days and nights are calculated automatically.</li>
          <li>Base price is calculated for <strong>one person per night</strong>.</li>
          <li>Kids are priced the same as adults. <strong>Infants are free.</strong></li>
          <li>Additional charges apply for a <strong>Tour Guide</strong>.</li>
          <li><strong>No hidden fees.</strong></li>
        </ul>
      </div>
    </>
  );
}