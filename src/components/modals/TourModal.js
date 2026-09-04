// src/components/modals/TourModal.js
import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import TourInclusions from "../TourInclusions";
import { useNavigate } from "react-router-dom";

const fetchWithRetry = async (fn, retries = 2, delay = 500) => {
  try { return await fn(); }
  catch (err) {
    if (retries > 0) { await new Promise(r => setTimeout(r, delay)); return fetchWithRetry(fn, retries - 1, delay); }
    throw err;
  }
};

export default function TourModal({ tour, onClose }) {
  const [destinations, setDestinations]             = useState({});
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [accommodationOptions, setAccommodationOptions] = useState([]);
  const [transportExtraCost, setTransportExtraCost] = useState(0);
  const [selectedAccommodation, setSelectedAccommodation] = useState("");
  const [numTravelers, setNumTravelers]             = useState(1);
  const [loadingPrices, setLoadingPrices]           = useState(true);
  const navigate = useNavigate();

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll only when modal is open
  useEffect(() => {
    if (!tour) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [tour]);

  useEffect(() => {
    if (!tour) return;
    setLoadingDestinations(true);
    fetchWithRetry(() => getDocs(collection(db, "citiesAndDestinations"))).then(snap => {
      const data = {};
      snap.docs.forEach(d => {
        const cd = d.data();
        const dests = Object.keys(cd).filter(k => k.startsWith("destination")).map(k => cd[k]).filter(Boolean);
        data[d.id] = { ...cd, destinations: dests };
      });
      setDestinations(data);
    }).catch(() => setDestinations({})).finally(() => setLoadingDestinations(false));
  }, [tour]);

  useEffect(() => {
    setLoadingPrices(true);
    Promise.all([
      fetchWithRetry(() => getDoc(doc(db, "prices", "Accommodation"))),
      fetchWithRetry(() => getDoc(doc(db, "prices", "Additional Transport Cost"))),
    ]).then(([accSnap, transSnap]) => {
      if (accSnap.exists()) {
        const types = accSnap.data().types || [];
        setAccommodationOptions(types);
        setSelectedAccommodation(types[0]?.name || "");
      }
      if (transSnap.exists()) setTransportExtraCost(Number(transSnap.data().price) || 0);
    }).catch(() => {}).finally(() => setLoadingPrices(false));
  }, []);

  const handleTravelerChange = (val) => setNumTravelers(Math.min(12, Math.max(1, val)));

  const pricing = (() => {
    if (!tour || loadingPrices) return null;
    const baseTotal      = tour.price * tour.nights;
    const accObj         = accommodationOptions.find(a => a.name === selectedAccommodation);
    const accTotal       = (accObj ? Number(accObj.price) : 0) * tour.nights * numTravelers;
    const transportCost  = numTravelers > 1 ? (numTravelers - 1) * transportExtraCost * tour.nights : 0;
    const total          = baseTotal + accTotal + transportCost;
    return { baseTotal, accTotal, transportCost, total };
  })();

  if (!tour) return null;

  return (
    <div className="tm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tm-modal">

        {/* Header */}
        <div className="tm-modal-header">
          <div>
            <span className="tm-modal-eyebrow">{tour.nights ? `${tour.nights}-Night Tour` : "Tour Package"}</span>
            <h2 className="tm-modal-title">{tour.title}</h2>
          </div>
          <button className="tm-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="tm-modal-body">
          {tour.imageUrl && <img src={tour.imageUrl} alt={tour.title} className="tm-modal-img" />}

          <div className="tm-modal-content">

            {/* Description */}
            <div className="tm-modal-section">
              <span className="tm-section-label">Overview</span>
              <p className="tm-desc">{tour.description}</p>
            </div>

            {/* Pricing */}
            <div className="tm-modal-section">
              <span className="tm-section-label">Pricing & Configuration</span>
              <div className="tm-pricing-grid">

                {/* Left — controls */}
                <div className="tm-pricing-panel">
                  <div className="tm-pricing-panel-title">Customise Your Tour</div>

                  <label className="tm-input-label">Accommodation</label>
                  {loadingPrices
                    ? <p style={{ fontSize: "12px", color: "#adc6d8" }}>Loading...</p>
                    : <select className="tm-select" value={selectedAccommodation} onChange={e => setSelectedAccommodation(e.target.value)}>
                        {accommodationOptions.map((opt, i) => (
                          <option key={i} value={opt.name}>{opt.name} (+${opt.price}/night)</option>
                        ))}
                      </select>
                  }

                  <label className="tm-input-label">Number of Travelers (1–12)</label>
                  <input
                    type="number" className="tm-number-input"
                    min={1} max={12} value={numTravelers}
                    onChange={e => handleTravelerChange(Number(e.target.value))}
                  />

                  <div className="tm-info-row" style={{ marginTop: "6px" }}>
                    <span className="tm-info-label">Nights</span>
                    <span className="tm-info-val">{tour.nights}</span>
                  </div>
                  <div className="tm-info-row">
                    <span className="tm-info-label">Total Days</span>
                    <span className="tm-info-val">{tour.totalDays}</span>
                  </div>
                  <div className="tm-info-row">
                    <span className="tm-info-label">Base/Night</span>
                    <span className="tm-info-val">${tour.price}</span>
                  </div>
                </div>

                {/* Right — breakdown */}
                <div className="tm-pricing-panel">
                  <div className="tm-pricing-panel-title">Price Breakdown</div>
                  {pricing ? (
                    <table className="tm-price-table">
                      <tbody>
                        <tr><td>Base Price</td><td>${pricing.baseTotal}</td></tr>
                        <tr><td>Accommodation ({selectedAccommodation})</td><td>${pricing.accTotal}</td></tr>
                        {numTravelers > 1 && (
                          <tr><td>Transport ({numTravelers - 1} extra)</td><td>${pricing.transportCost}</td></tr>
                        )}
                        <tr className="total"><td>Total</td><td>${pricing.total}</td></tr>
                        {numTravelers > 1 && (
                          <tr className="per-person"><td>Per Traveler</td><td>${(pricing.total / numTravelers).toFixed(2)}</td></tr>
                        )}
                      </tbody>
                    </table>
                  ) : <p style={{ fontSize: "12px", color: "#adc6d8" }}>Loading pricing...</p>}
                </div>
              </div>
            </div>

            {/* Inclusions */}
            <div className="tm-modal-section">
              <span className="tm-section-label">What's Included</span>
              <TourInclusions numTravelers={numTravelers} transportCost={transportExtraCost} accommodationName={selectedAccommodation} />
            </div>

            {/* Daily Plan */}
            {tour.dailyPlan?.length > 0 && (
              <div className="tm-modal-section">
                <span className="tm-section-label">Daily Itinerary</span>
                <ul className="tm-day-list">
                  {tour.dailyPlan.map((day, i) => (
                    <li key={i} className="tm-day-item">
                      <span className="tm-day-num">Day {i + 1}</span>
                      <span>{day.type}{day.city ? ` — ${day.city}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Destinations */}
            <div className="tm-modal-section">
              <span className="tm-section-label">Destinations</span>
              {loadingDestinations
                ? <p style={{ fontSize: "12px", color: "#adc6d8" }}>Loading destinations...</p>
                : (() => {
                    const seen = new Set();
                    const blocks = tour.dailyPlan
                      ?.filter(d => d.city && destinations[d.city] && !seen.has(d.city) && seen.add(d.city))
                      .map(d => {
                        const cd = destinations[d.city];
                        if (!cd?.destinations?.length) return null;
                        return (
                          <div key={d.city} className="tm-dest-block">
                            <div className="tm-dest-city">{d.city}</div>
                            <div className="tm-dest-list">
                              {[...new Set(cd.destinations)].map((dest, i) => (
                                <span key={i} className="tm-dest-tag">{dest}</span>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    return blocks?.some(Boolean) ? blocks : <p style={{ fontSize: "12px", color: "#adc6d8" }}>No destination details available.</p>;
                  })()
              }
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="tm-modal-footer">
          <button className="tm-modal-btn ghost" onClick={onClose}>Close</button>
          <button className="tm-modal-btn accent" onClick={() => { onClose(); navigate("/contact"); }}>Enquire</button>
          <button className="tm-modal-btn primary" onClick={() => { onClose(); navigate("/booknow"); }}>Book Now ›</button>
        </div>
      </div>
    </div>
  );
}