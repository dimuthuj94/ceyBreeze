// src/pages/Reviews.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc")))
      .then(snap => setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmtDate = (ts) => {
    if (!ts?.toDate) return "Recently";
    return ts.toDate().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div style={{ fontFamily: "'Outfit', 'Libre Franklin', sans-serif" }}>

      {/* ── Hero ── */}
      <div className="rv-hero">
        <div className="bn-hero-dots" />
        <div className="rv-hero-content">
          <span className="rv-hero-eyebrow">What Travellers Say</span>
          <h1 className="rv-hero-title">Customer Reviews</h1>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="rv-content">

        {loading ? (
          <div className="gl-loading">
            <div style={{ fontSize: "40px", opacity: 0.2, marginBottom: "14px", animation: "res-pulse 2s infinite" }}>◆</div>
            <p>Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <p style={{ color: "#adc6d8", fontSize: "13px", textAlign: "center", paddingTop: "60px" }}>No reviews yet — be the first!</p>
        ) : (
          <div className="rv-grid">
            {reviews.map((rv, i) => (
              <div key={rv.id} className="rv-card" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="rv-card-header">
                  <div>
                    <div className="rv-card-name">{rv.customerName || "Anonymous"}</div>
                    {rv.customerEmail && <div className="rv-card-email">{rv.customerEmail}</div>}
                  </div>
                  <div className="rv-stars">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span key={star} className={`rv-star ${star <= (rv.starCount || 0) ? "filled" : "empty"}`}>★</span>
                    ))}
                  </div>
                </div>
                <p className="rv-card-quote">"{rv.review}"</p>
                <div className="rv-card-date">{fmtDate(rv.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}