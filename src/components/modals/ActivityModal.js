// src/components/modals/ActivityModal.js
import React, { useEffect } from "react";

const MONTH_ORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const parseMonths = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data.map(m => String(m).slice(0, 3)).filter(m => MONTH_ORDER.includes(m));
  return String(data).split(/[\s,;-]+/).map(m => m.slice(0, 3)).filter(m => MONTH_ORDER.includes(m));
};

export default function ActivityModal({ show, activity, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!show || !activity) return null;

  const imgSrc = activity.imageUrl || activity.storageLink || activity.image || activity.photo || "";
  const months = parseMonths(activity.availableMonths);

  return (
    <div className="tm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tm-modal sm">

        <div className="tm-modal-header">
          <div>
            <span className="tm-modal-eyebrow">Additional Activity</span>
            <h2 className="tm-modal-title">{activity.name}</h2>
          </div>
          <button className="tm-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tm-modal-body">
          {imgSrc && <img src={imgSrc} alt={activity.name} className="tm-modal-img" />}
          <div className="tm-modal-content">

            {/* Quick info */}
            <div className="tm-modal-section">
              <span className="tm-section-label">Details</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
                {activity.price && (
                  <div className="tm-info-row"><span className="tm-info-label">Price</span><span className="tm-info-val">${activity.price} <span style={{ fontSize: "10px", color: "#adc6d8" }}>per person</span></span></div>
                )}
                {activity.time && (
                  <div className="tm-info-row"><span className="tm-info-label">Duration</span><span className="tm-info-val">{activity.time}</span></div>
                )}
                {activity.availability && (
                  <div className="tm-info-row"><span className="tm-info-label">Status</span>
                    <span style={{ fontSize: "9px", fontWeight: 700, padding: "3px 9px", background: activity.availability === "Yes" ? "#eaf3de" : "#fcebeb", color: activity.availability === "Yes" ? "#27500a" : "#791f1f" }}>
                      {activity.availability === "Yes" ? "Available" : "Unavailable"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {months.length > 0 && (
              <div className="tm-modal-section">
                <span className="tm-section-label">Available Months</span>
                <div className="tm-month-chips">
                  {months.map((m, i) => <span key={i} className="tm-month-chip">{m}</span>)}
                </div>
              </div>
            )}

            {activity.description && (
              <div className="tm-modal-section">
                <span className="tm-section-label">Description</span>
                <p className="tm-desc">{activity.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="tm-modal-footer">
          <button className="tm-modal-btn ghost" onClick={onClose}>Close</button>
          <button className="tm-modal-btn primary" onClick={onClose}>Add to Trip ›</button>
        </div>
      </div>
    </div>
  );
}