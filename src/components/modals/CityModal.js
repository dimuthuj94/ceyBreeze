// src/components/modals/CityModal.js
import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function CityModal({ show, cityId, onClose }) {
  const [city, setCity]       = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityId) return;
    setLoading(true);
    getDoc(doc(db, "citiesAndDestinations", cityId))
      .then(snap => setCity(snap.exists() ? snap.data() : null))
      .catch(() => setCity(null))
      .finally(() => setLoading(false));
  }, [cityId]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!show) return null;

  const imgSrc = city?.imageUrl || city?.photo || "";
  const destinations = city
    ? Object.keys(city).filter(k => k.startsWith("destination")).map(k => city[k]).filter(Boolean)
    : [];

  return (
    <div className="tm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tm-modal sm">

        <div className="tm-modal-header">
          <div>
            <span className="tm-modal-eyebrow">Sri Lanka</span>
            <h2 className="tm-modal-title">{loading ? "Loading..." : city?.name || "City"}</h2>
          </div>
          <button className="tm-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tm-modal-body">
          {loading ? (
            <div className="tm-loading">
              <div className="tm-loading-icon">◉</div>
              <p>Loading city details...</p>
            </div>
          ) : !city ? (
            <div className="tm-modal-content"><p style={{ color: "#adc6d8", fontSize: "13px" }}>City not found.</p></div>
          ) : (
            <>
              {imgSrc && <img src={imgSrc} alt={city.name} className="tm-modal-img" />}
              <div className="tm-modal-content">

                {city.description && (
                  <div className="tm-modal-section">
                    <span className="tm-section-label">About {city.name}</span>
                    <p className="tm-desc">{city.description}</p>
                  </div>
                )}

                {destinations.length > 0 && (
                  <div className="tm-modal-section">
                    <span className="tm-section-label">Key Destinations</span>
                    <div className="tm-dest-list">
                      {[...new Set(destinations)].map((d, i) => (
                        <span key={i} className="tm-dest-tag">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="tm-modal-footer">
          <button className="tm-modal-btn ghost" onClick={onClose}>Close</button>
          <button className="tm-modal-btn primary" onClick={() => onClose()}>Explore Tours ›</button>
        </div>
      </div>
    </div>
  );
}