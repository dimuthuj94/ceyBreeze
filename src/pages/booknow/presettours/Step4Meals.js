// src/pages/booknow/presettours/presettours/Step4Meals.js
import React from "react";

export default function Step4Meals({ mealPreference, setMealPreference, tourNotes, setTourNotes, setActiveKey }) {
  return (
    <>
      <div className="pt-card">
        <div className="pt-card-header">
          <span className="pt-card-header-title"><span className="pt-card-header-icon">◆</span> Meal Preference</span>
        </div>
        <div className="pt-card-body">
          <div className="pt-form-group">
            <label className="pt-label">Select Meal Type</label>
            <select className="pt-input" value={mealPreference} onChange={e => setMealPreference(e.target.value)}>
              <option>Standard Meals</option>
              <option>Vegetarian</option>
              <option>Non Vegetarian</option>
              <option>Sri Lankan Traditional</option>
            </select>
          </div>
          <p style={{ fontSize: "12px", color: "#adc6d8", margin: 0 }}>Choose your preferred meal option for the duration of the tour.</p>
        </div>
      </div>

      <div className="pt-card">
        <div className="pt-card-header">
          <span className="pt-card-header-title"><span className="pt-card-header-icon">◎</span> Tour Notes</span>
        </div>
        <div className="pt-card-body">
          <div className="pt-form-group">
            <label className="pt-label">Special Requests & Notes</label>
            <textarea
              className="pt-input pt-textarea"
              rows={4}
              placeholder="Enter any special notes, preferences, or requests — e.g. allergies, accessibility needs, specific interests..."
              value={tourNotes}
              onChange={e => setTourNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="pt-nav">
        <button className="pt-btn secondary" onClick={() => setActiveKey("step3")}>‹ Previous</button>
        <button className="pt-btn primary" onClick={() => setActiveKey("step5")}>Next ›</button>
      </div>

      <div className="pt-note">
        <span className="pt-note-title">Please Note</span>
        <ul>
          <li>Meal type is <strong>not applicable</strong> at accommodations with buffet service.</li>
          <li>Use Tour Notes for allergies, wheelchair requirements or any special requests.</li>
          <li><strong>No additional charges</strong> apply for meal type changes.</li>
        </ul>
      </div>
    </>
  );
}