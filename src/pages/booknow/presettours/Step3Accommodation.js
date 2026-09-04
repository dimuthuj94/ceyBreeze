// src/pages/booknow/presettours/presettours/Step3Accommodation.js
import React, { useEffect, useState } from "react";
import { Collapse } from "react-bootstrap";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";

export default function Step3Accommodation({
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
      const arr = snap.docs
        .map(d => ({ id: d.id, ...d.data(), minimumSeatCount: Number(d.data().minimumSeatCount) || 0, maximumSeatCount: Number(d.data().maximumSeatCount) || 0 }))
        .filter(v => totalPassengers >= v.minimumSeatCount && totalPassengers <= v.maximumSeatCount);
      setVehicles(arr);
      if (typeof setProvidedVehicles === "function") setProvidedVehicles(arr.map(v => v.name));
    }).catch(console.error).finally(() => setLoadingVehicles(false));
  }, [totalPassengers, setProvidedVehicles]);

  const handleDaysChange = (roomName, value) => {
    if (value < 0) value = 0;
    const others = Object.keys(selectedRooms).filter(r => r !== roomName).reduce((s, r) => s + (selectedRooms[r] || 0), 0);
    if (others + value > tourNights) { value = Math.max(tourNights - others, 0); setWarning(`Total luxury days cannot exceed ${tourNights} nights.`); }
    else setWarning("");
    setSelectedRooms(prev => ({ ...prev, [roomName]: value }));
  };

  const toggleRoom = (roomName) => {
    setSelectedRooms(prev => {
      const current = prev[roomName] || 0;
      const totalOther = Object.keys(prev).filter(r => r !== roomName).reduce((s, r) => s + (prev[r] || 0), 0);
      const max = tourNights - totalOther;
      if (current === 0 && max <= 0) { setWarning(`Luxury room limit (${tourNights} days) reached.`); return prev; }
      setWarning("");
      return { ...prev, [roomName]: current > 0 ? 0 : Math.min(1, max) };
    });
  };

  return (
    <>
      {/* Accommodation type */}
      <div className="pt-card">
        <div className="pt-card-header">
          <span className="pt-card-header-title"><span className="pt-card-header-icon">◉</span> Accommodation Type</span>
        </div>
        <div className="pt-card-body">
          {loadingAccommodation
            ? <div className="pt-spinner-row"><div className="pt-spinner" /> Loading...</div>
            : <select className="pt-input" value={accommodation} onChange={e => setAccommodation(e.target.value)}>
                {accommodationOptions.map((opt, i) => <option key={i} value={opt.name}>{opt.name}{opt.price ? ` (+ $${opt.price}/night)` : ""}</option>)}
              </select>
          }
        </div>
      </div>

      {warning && <div className="pt-alert warning">{warning}</div>}

      {/* Luxury rooms */}
      <div className="pt-card">
        <div className="pt-card-header clickable" onClick={() => setShowLuxury(p => !p)}>
          <span className="pt-card-header-title"><span className="pt-card-header-icon">◈</span> Additional Luxury Stay</span>
          <span className="pt-card-header-toggle">{showLuxury ? "▲" : "▼"}</span>
        </div>
        <Collapse in={showLuxury}>
          <div>
            <div className="pt-card-body">
              {loadingRooms
                ? <div className="pt-spinner-row"><div className="pt-spinner" /> Loading...</div>
                : roomTypes.length === 0
                  ? <p style={{ color: "#adc6d8", fontSize: "13px" }}>No room types available.</p>
                  : <div className="pt-option-grid">
                      {roomTypes.map(room => {
                        const days = selectedRooms[room.name] || 0;
                        const isSel = days > 0;
                        return (
                          <div key={room.id} className={`pt-option-card ${isSel ? "selected" : ""}`} onClick={() => toggleRoom(room.name)}>
                            <div className="pt-option-name">{room.name}</div>
                            <div className="pt-option-meta">Guests: {room.guestCount}<br/>+${room.additionalPricePerDay}/day</div>
                            <div className="pt-option-card-input" onClick={e => e.stopPropagation()}>
                              <label className="pt-label" style={{ marginBottom: "4px" }}>Days</label>
                              <input type="number" className="pt-input" min={0} max={tourNights} value={days} onChange={e => handleDaysChange(room.name, Number(e.target.value))} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
              }
            </div>
          </div>
        </Collapse>
      </div>

      {/* Vehicles */}
      <div className="pt-card">
        <div className="pt-card-header">
          <span className="pt-card-header-title"><span className="pt-card-header-icon">◇</span> Provided Vehicle Types</span>
        </div>
        <div className="pt-card-body">
          {loadingVehicles
            ? <div className="pt-spinner-row"><div className="pt-spinner" /> Loading...</div>
            : vehicles.length === 0
              ? <p style={{ color: "#adc6d8", fontSize: "13px" }}>No vehicles available for {totalPassengers} passengers.</p>
              : <div className="pt-option-grid">
                  {vehicles.map(v => (
                    <div key={v.id} className="pt-option-card info-only">
                      <div className="pt-option-name">{v.name}</div>
                      <div className="pt-option-meta">Seats: {v.minimumSeatCount}–{v.maximumSeatCount}</div>
                    </div>
                  ))}
                </div>
          }
        </div>
      </div>

      <div className="pt-nav">
        <button className="pt-btn secondary" onClick={() => setActiveKey("step2")}>‹ Previous</button>
        <button className="pt-btn primary" onClick={() => setActiveKey("step4")}>Next ›</button>
      </div>

      <div className="pt-note">
        <span className="pt-note-title">Please Note</span>
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