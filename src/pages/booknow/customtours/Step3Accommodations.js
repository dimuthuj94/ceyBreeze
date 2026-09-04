// src/pages/booknow/customtours/Step3Accommodations.js
import React, { useEffect, useState } from "react";
import { Collapse, Form, Alert, Spinner, Row, Col } from "react-bootstrap";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";

export default function Step3Accommodations({
  accommodation, setAccommodation, selectedRooms, setSelectedRooms,
  roomDetails, setRoomDetails, setActiveKey, travelers = {}, tourNights = 1,
  providedVehicles, setProvidedVehicles,
}) {
  const [accommodationOptions, setAccommodationOptions] = useState([]);
  const [roomTypes, setRoomTypes]     = useState([]);
  const [vehicles, setVehicles]       = useState([]);
  const [loadingAccommodation, setLoadingAccommodation] = useState(true);
  const [loadingRooms, setLoadingRooms]     = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [warning, setWarning]         = useState("");
  const [showLuxury, setShowLuxury]   = useState(false);

  const totalPassengers = (travelers.adults || 0) + (travelers.children || 0) + (travelers.guideRequired ? 1 : 0);

  useEffect(() => {
    setLoadingAccommodation(true);
    getDoc(doc(db, "prices", "Accommodation")).then(s => {
      if (!s.exists()) return;
      const types = s.data().types || [];
      setAccommodationOptions(types);
      if (!accommodation && types.length > 0) setAccommodation(types[0].name);
      const d = {};
      types.forEach(t => { d[t.name] = { price: t.price || 0, additionalPricePerDay: t.additionalPricePerDay || 0 }; });
      setRoomDetails(prev => ({ ...d, ...prev }));
    }).catch(console.error).finally(() => setLoadingAccommodation(false));
  }, []);

  useEffect(() => {
    setLoadingRooms(true);
    getDocs(collection(db, "accommodations")).then(snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data(), additionalPricePerDay: d.data().additionalPricePerDay || 0 }));
      setRoomTypes(arr);
      const init = {};
      arr.forEach(r => { if (!(r.name in selectedRooms)) init[r.name] = 0; });
      setSelectedRooms(prev => ({ ...init, ...prev }));
      const upd = {};
      arr.forEach(r => { upd[r.name] = { ...(roomDetails[r.name] || {}), additionalPricePerDay: r.additionalPricePerDay }; });
      setRoomDetails(prev => ({ ...prev, ...upd }));
    }).catch(console.error).finally(() => setLoadingRooms(false));
  }, []);

  useEffect(() => {
    setLoadingVehicles(true);
    getDocs(collection(db, "vehicles")).then(snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data(), minimumSeatCount: Number(d.data().minimumSeatCount) || 0, maximumSeatCount: Number(d.data().maximumSeatCount) || 0 })).filter(v => totalPassengers >= v.minimumSeatCount && totalPassengers <= v.maximumSeatCount);
      setVehicles(arr);
      if (typeof setProvidedVehicles === "function") setProvidedVehicles(arr);
    }).catch(console.error).finally(() => setLoadingVehicles(false));
  }, [totalPassengers, setProvidedVehicles]);

  const handleDaysChange = (roomName, value) => {
    if (value < 0) value = 0;
    const others = Object.keys(selectedRooms).filter(r => r !== roomName).reduce((s, r) => s + (selectedRooms[r] || 0), 0);
    if (others + value > tourNights) { value = Math.max(tourNights - others, 0); setWarning(`Total luxury days cannot exceed ${tourNights} nights.`); }
    else setWarning("");
    setSelectedRooms(prev => ({ ...prev, [roomName]: value }));
  };

  const toggleRoomSelection = (roomName) => {
    setSelectedRooms(prev => {
      const current = prev[roomName] || 0;
      const totalOther = Object.keys(prev).filter(r => r !== roomName).reduce((s, r) => s + (prev[r] || 0), 0);
      const max = tourNights - totalOther;
      if (current === 0 && max <= 0) { setWarning(`Luxury room limit (${tourNights} days) reached.`); return prev; }
      setWarning(""); return { ...prev, [roomName]: current > 0 ? 0 : Math.min(1, max) };
    });
  };

  return (
    <>
      {/* Accommodation type */}
      <div className="pt-step-card">
        <div className="pt-step-card-header">
          <span className="pt-step-card-title"><span className="pt-step-card-icon">◉</span> Accommodation Type</span>
        </div>
        <div className="pt-step-card-body">
          {loadingAccommodation
            ? <div className="pt-spinner-inline">Loading...</div>
            : <Form.Select value={accommodation} onChange={e => setAccommodation(e.target.value)} style={{ borderRadius: 0, border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "13px", color: "#00276b", padding: "10px 13px" }}>
                {accommodationOptions.map((opt, i) => <option key={i} value={opt.name}>{opt.name}{opt.price ? ` (+ $${opt.price}/night)` : ""}</option>)}
              </Form.Select>
          }
        </div>
      </div>

      {warning && <Alert variant="warning" style={{ borderRadius: 0, fontSize: "13px" }}>{warning}</Alert>}

      {/* Luxury rooms */}
      <div className="pt-step-card">
        <div className="pt-step-card-header clickable" onClick={() => setShowLuxury(p => !p)}>
          <span className="pt-step-card-title"><span className="pt-step-card-icon">◈</span> Additional Luxury Stay</span>
          <span className="pt-step-card-toggle">{showLuxury ? "▲" : "▼"}</span>
        </div>
        <Collapse in={showLuxury}>
          <div>
            <div className="pt-step-card-body">
              {loadingRooms ? (
                <div className="pt-spinner-inline">Loading...</div>
              ) : roomTypes.length === 0 ? (
                <p style={{ color: "#adc6d8", fontSize: "13px" }}>No room types available.</p>
              ) : (
                <div className="pt-option-grid">
                  {roomTypes.map(room => {
                    const days = selectedRooms[room.name] || 0;
                    const isSel = days > 0;
                    return (
                      <div key={room.id} className={`pt-option-tile ${isSel ? "selected" : ""}`} onClick={() => toggleRoomSelection(room.name)}>
                        <div className="pt-option-tile-name">{room.name}</div>
                        <div className="pt-option-tile-meta">Guests: {room.guestCount}<br/>+${room.additionalPricePerDay}/day</div>
                        <div onClick={e => e.stopPropagation()} style={{ marginTop: "8px" }}>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Days</div>
                          <input type="number" className="pt-field" min={0} max={tourNights} value={days} onChange={e => handleDaysChange(room.name, Number(e.target.value))} style={{ padding: "6px 10px" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Collapse>
      </div>

      {/* Vehicles */}
      <div className="pt-step-card">
        <div className="pt-step-card-header">
          <span className="pt-step-card-title"><span className="pt-step-card-icon">◇</span> Provided Vehicle Types</span>
        </div>
        <div className="pt-step-card-body">
          {loadingVehicles ? (
            <div className="pt-spinner-inline">Loading...</div>
          ) : vehicles.length === 0 ? (
            <p style={{ color: "#adc6d8", fontSize: "13px" }}>No vehicles available for {totalPassengers} passengers.</p>
          ) : (
            <div className="pt-option-grid">
              {vehicles.map(v => (
                <div key={v.id} className="pt-option-tile info-only">
                  <div className="pt-option-tile-name">{v.name}</div>
                  <div className="pt-option-tile-meta">Seats: {v.minimumSeatCount}–{v.maximumSeatCount}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pt-nav-row">
        <button className="pt-nav-btn secondary" onClick={() => setActiveKey("step2")}>‹ Previous</button>
        <button className="pt-nav-btn primary" onClick={() => setActiveKey("step4")}>Next ›</button>
      </div>

      <div className="pt-info-note">
        <span className="pt-info-note-title">Please Note</span>
        <ul>
          <li>Accommodation type can be changed at any time.</li>
          <li>Luxury stays are arranged by <strong>ceyBreeze</strong> based on availability.</li>
          <li>If luxury stays are <strong>unavailable</strong>, a <strong>full refund</strong> will be issued.</li>
          <li><strong>No hidden fees.</strong></li>
        </ul>
      </div>
    </>
  );
}