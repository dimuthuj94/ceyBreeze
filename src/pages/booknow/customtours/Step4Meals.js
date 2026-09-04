// src/pages/booknow/customtours/Step4Meals.js
import React from "react";
import { Form } from "react-bootstrap";

export default function Step4Meals({ mealPreference, setMealPreference, tourNotes, setTourNotes, setActiveKey }) {
  return (
    <>
      <div className="pt-step-card">
        <div className="pt-step-card-header">
          <span className="pt-step-card-title"><span className="pt-step-card-icon">◆</span> Meal Preference</span>
        </div>
        <div className="pt-step-card-body">
          <div style={{ marginBottom: "14px" }}>
            <label className="pt-field-label">Select Meal Type</label>
            <Form.Select value={mealPreference} onChange={e => setMealPreference(e.target.value)} style={{ borderRadius: 0, border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "13px", color: "#00276b", padding: "10px 13px" }}>
              <option>Standard Meals</option>
              <option>Vegetarian</option>
              <option>Non Vegetarian</option>
              <option>Sri Lankan Traditional</option>
            </Form.Select>
          </div>
          <p style={{ fontSize: "12px", color: "#adc6d8", margin: 0 }}>Choose your preferred meal option for the duration of the tour.</p>
        </div>
      </div>

      <div className="pt-step-card">
        <div className="pt-step-card-header">
          <span className="pt-step-card-title"><span className="pt-step-card-icon">◎</span> Tour Notes</span>
        </div>
        <div className="pt-step-card-body">
          <label className="pt-field-label">Special Requests &amp; Notes</label>
          <textarea
            className="pt-field pt-field textarea"
            rows={4}
            placeholder="Enter any special notes — e.g. allergies, accessibility needs, specific interests..."
            value={tourNotes}
            onChange={e => setTourNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="pt-nav-row">
        <button className="pt-nav-btn secondary" onClick={() => setActiveKey("step3")}>‹ Previous</button>
        <button className="pt-nav-btn primary" onClick={() => setActiveKey("step5")}>Next ›</button>
      </div>

      <div className="pt-info-note">
        <span className="pt-info-note-title">Please Note</span>
        <ul>
          <li>Meal type is <strong>not applicable</strong> at accommodations with buffet service.</li>
          <li>Use Tour Notes for allergies, wheelchair requirements or special requests.</li>
          <li><strong>No additional charge</strong> for meal type changes.</li>
        </ul>
      </div>
    </>
  );
}