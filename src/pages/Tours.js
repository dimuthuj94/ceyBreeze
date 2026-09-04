// src/pages/Tours.js
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import TourModal from "../components/modals/TourModal";

export default function Tours() {
  const [tours, setTours]           = useState([]);
  const [selectedTour, setSelectedTour] = useState(null);

  useEffect(() => {
    getDocs(collection(db, "tours"))
      .then(s => setTours(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  return (
    <div style={{ fontFamily: "'Outfit', 'Libre Franklin', sans-serif" }}>

      {/* ── Hero ── */}
      <div className="tp-hero">
        <div className="tp-hero-bg" />
        <div className="tp-hero-pattern" />
        <div className="tp-hero-content">
          <span className="tp-hero-eyebrow">Explore Sri Lanka</span>
          <h1 className="tp-hero-title">Our Tour Collection</h1>
          <p className="tp-hero-sub">
            At CeyBreeze Tours, we believe every journey should be unique. From ancient ruins to pristine beaches,
            misty highlands to golden coastlines — discover what makes Sri Lanka truly extraordinary.
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="tp-content">
        <div className="hp-max">
          <p className="tp-count"><strong>{tours.length}</strong> tours available</p>
          <div className="tp-grid">
            {tours.map((tour, i) => (
              <div
                key={tour.id}
                className="tp-card"
                onClick={() => setSelectedTour(tour)}
                style={{ animationDelay: `${i * 0.055}s` }}
              >
                <div className="tp-card-img-wrap">
                  {tour.imageUrl
                    ? <img src={tour.imageUrl} alt={tour.title} className="tp-card-img" />
                    : <div style={{ width: "100%", height: "100%", background: "rgba(0,39,107,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px", color: "rgba(0,39,107,0.15)" }}>✈</div>
                  }
                  <div className="tp-card-overlay" />
                  <div className="tp-card-badges">
                    {tour.price  && <span className="tp-card-badge price">${tour.price}/day</span>}
                    {tour.nights && <span className="tp-card-badge nights">{tour.nights} nights</span>}
                  </div>
                </div>
                <div className="tp-card-body">
                  <h3 className="tp-card-title">{tour.title}</h3>
                  <p className="tp-card-desc">{tour.description || "No description available."}</p>
                  <button className="tp-card-cta">
                    <span className="tp-cta-line" />
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedTour && <TourModal tour={selectedTour} onClose={() => setSelectedTour(null)} />}
    </div>
  );
}