// src/pages/booknow/presettours/presettours/Step2Travelers.js
import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";

const today = new Date().toISOString().split("T")[0];

export default function Step2Travelers({ travelers, setTravelers, setActiveKey }) {
  const [maxExceeded, setMaxExceeded]       = useState(false);
  const [arrivalDateError, setArrivalDateError] = useState(false);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) return;
        const snap = await getDoc(doc(db, "customers", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          const fullName = `${d.firstName || ""} ${d.lastName || ""}`.trim();
          setTravelers(prev => ({ ...prev, fullName }));
        }
      } catch (err) { console.error(err); }
    };
    fetchCustomer();
  }, [setTravelers]);

  const handleTravelerChange = (field, value) => {
    if (value < 0) return;
    const others = travelers.adults + travelers.children + travelers.infants + (travelers.guideRequired ? 1 : 0) - travelers[field];
    value = Math.min(value, 12 - others);
    const n = { ...travelers, [field]: value };
    const total = n.adults + n.children + n.infants + (n.guideRequired ? 1 : 0);
    setMaxExceeded(total > 12);
    setTravelers(n);
  };

  const handleGuideChange = (checked) => {
    const total = travelers.adults + travelers.children + travelers.infants;
    if (checked && total + 1 > 12) { setMaxExceeded(true); return; }
    const n = { ...travelers, guideRequired: checked };
    setMaxExceeded(total + (checked ? 1 : 0) > 12);
    setTravelers(n);
  };

  return (
    <>
      <div className="pt-card">
        <div className="pt-card-header">
          <span className="pt-card-header-title"><span className="pt-card-header-icon">◐</span> Traveler Information</span>
        </div>
        <div className="pt-card-body">
          {maxExceeded && <div className="pt-alert danger">Total travelers cannot exceed 12 (including adults, children, infants and guide).</div>}
          {arrivalDateError && <div className="pt-alert danger">Arrival Date is mandatory.</div>}

          <div className="pt-form-group">
            <label className="pt-label">Full Name</label>
            <input className="pt-input" value={travelers.fullName || ""} disabled />
          </div>

          <div className="pt-form-row-2" style={{ marginBottom: "14px" }}>
            <div>
              <label className="pt-label">Arrival Airport</label>
              <select
                className="pt-input"
                value={travelers.arrivalAirport || ""}
                onChange={e => setTravelers(prev => ({ ...prev, arrivalAirport: e.target.value }))}
              >
                <option value="Colombo Bandaranayake International Airport">Colombo Bandaranayake International Airport</option>
                <option value="Mattala Rajapaksha International Airport">Mattala Rajapaksha International Airport</option>
              </select>
            </div>
            <div>
              <label className="pt-label">Arrival Date *</label>
              <input
                type="date" className="pt-input"
                value={travelers.arrivalDate || ""} min={today}
                onChange={e => { setTravelers(prev => ({ ...prev, arrivalDate: e.target.value })); setArrivalDateError(!e.target.value); }}
              />
            </div>
          </div>

          <div className="pt-form-row-3" style={{ marginBottom: "16px" }}>
            <div>
              <label className="pt-label">Adults</label>
              <input type="number" className="pt-input" min={0} max={12} value={travelers.adults} onChange={e => handleTravelerChange("adults", Number(e.target.value))} />
            </div>
            <div>
              <label className="pt-label">Children</label>
              <input type="number" className="pt-input" min={0} max={12} value={travelers.children} onChange={e => handleTravelerChange("children", Number(e.target.value))} />
            </div>
            <div>
              <label className="pt-label">Infants</label>
              <input type="number" className="pt-input" min={0} max={12} value={travelers.infants} onChange={e => handleTravelerChange("infants", Number(e.target.value))} />
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(0,39,107,0.06)", paddingTop: "12px" }}>
            <label className="pt-check">
              <input type="checkbox" checked={travelers.guideRequired} onChange={e => handleGuideChange(e.target.checked)} />
              <span className="pt-check-label">Tour Guide Required</span>
            </label>
            <label className="pt-check">
              <input type="checkbox" checked={travelers.childCarSeat || false} onChange={e => setTravelers(prev => ({ ...prev, childCarSeat: e.target.checked }))} />
              <span className="pt-check-label">Child Car Seat Required</span>
            </label>
          </div>
        </div>
      </div>

      <div className="pt-nav">
        <button className="pt-btn secondary" onClick={() => setActiveKey("step1")}>‹ Previous</button>
        <button className="pt-btn primary" onClick={() => { if (!travelers.arrivalDate) { setArrivalDateError(true); return; } setActiveKey("step3"); }}>
          Next ›
        </button>
      </div>

      <div className="pt-note">
        <span className="pt-note-title">Please Note</span>
        <ul>
          <li><strong>Arrival Date</strong> is mandatory.</li>
          <li>Base price is calculated for <strong>one person per night</strong>.</li>
          <li>Kids are priced the same as adults. <strong>Infants are free.</strong></li>
          <li>Additional charges apply for a <strong>Tour Guide</strong>.</li>
          <li><strong>No hidden fees.</strong></li>
        </ul>
      </div>
    </>
  );
}