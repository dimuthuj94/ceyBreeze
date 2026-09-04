// src/components/modals/AdventureModal.js
import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

const MONTH_ORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const parseMonths = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data.map(m => String(m).slice(0, 3)).filter(m => MONTH_ORDER.includes(m));
  return String(data).split(/[\s,;-]+/).map(m => m.slice(0, 3)).filter(m => MONTH_ORDER.includes(m));
};

export default function AdventureModal({ show, adventureId, onClose }) {
  const [adventure, setAdventure] = useState(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!adventureId) return;
    setLoading(true);
    getDoc(doc(db, "adventure", adventureId))
      .then(snap => setAdventure(snap.exists() ? { id: snap.id, ...snap.data() } : null))
      .catch(() => setAdventure(null))
      .finally(() => setLoading(false));
  }, [adventureId]);

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

  const imgSrc = adventure?.imageUrl || adventure?.storageLink || adventure?.image || adventure?.photo || "";
  const months = parseMonths(adventure?.availableMonths);

  return (
    <div className="tm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tm-modal sm">

        <div className="tm-modal-header">
          <div>
            <span className="tm-modal-eyebrow">Adventure Experience</span>
            <h2 className="tm-modal-title">{loading ? "Loading..." : adventure?.name || "Adventure"}</h2>
          </div>
          <button className="tm-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tm-modal-body">
          {loading ? (
            <div className="tm-loading">
              <div className="tm-loading-icon">◉</div>
              <p>Loading adventure details...</p>
            </div>
          ) : !adventure ? (
            <div className="tm-modal-content"><p style={{ color: "#adc6d8", fontSize: "13px" }}>Adventure not found.</p></div>
          ) : (
            <>
              {imgSrc && <img src={imgSrc} alt={adventure.name} className="tm-modal-img" />}
              <div className="tm-modal-content">

                <div className="tm-modal-section">
                  <span className="tm-section-label">Details</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
                    {adventure.price && (
                      <div className="tm-info-row"><span className="tm-info-label">Price</span><span className="tm-info-val">${adventure.price} <span style={{ fontSize: "10px", color: "#adc6d8" }}>per person</span></span></div>
                    )}
                    {adventure.time && (
                      <div className="tm-info-row"><span className="tm-info-label">Duration</span><span className="tm-info-val">{adventure.time}</span></div>
                    )}
                    {adventure.availability && (
                      <div className="tm-info-row"><span className="tm-info-label">Status</span>
                        <span style={{ fontSize: "9px", fontWeight: 700, padding: "3px 9px", background: adventure.availability === "Yes" ? "#eaf3de" : "#fcebeb", color: adventure.availability === "Yes" ? "#27500a" : "#791f1f" }}>
                          {adventure.availability === "Yes" ? "Available" : "Unavailable"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {months.length > 0 && (
                  <div className="tm-modal-section">
                    <span className="tm-section-label">Best Months</span>
                    <div className="tm-month-chips">
                      {months.map((m, i) => <span key={i} className="tm-month-chip">{m}</span>)}
                    </div>
                  </div>
                )}

                {adventure.description && (
                  <div className="tm-modal-section">
                    <span className="tm-section-label">Description</span>
                    <p className="tm-desc">{adventure.description}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="tm-modal-footer">
          <button className="tm-modal-btn ghost" onClick={onClose}>Close</button>
          <button className="tm-modal-btn primary" onClick={onClose}>Book This ›</button>
        </div>
      </div>
    </div>
  );
}