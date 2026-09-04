// src/pages/BookNow.js
import React from "react";
import { useNavigate } from "react-router-dom";

const MENU_ITEMS = [
  {
    icon: "✈",
    title: "Preset Tour Packages",
    desc: "Jump straight into adventure with our handcrafted itineraries. Every detail planned, every destination curated — just show up.",
    link: "/booknow/presettours",
    comingSoon: false,
  },
  {
    icon: "◎",
    title: "Configure Your Own Tour",
    desc: "Design your perfect Sri Lankan journey from scratch. Choose your cities, set your pace and build an itinerary unique to you.",
    link: "/booknow/customtours",
    comingSoon: false,
  },
  {
    icon: "◈",
    title: "Vehicle Charter",
    desc: "Need just the wheels? Reserve a premium vehicle at an affordable price and explore Sri Lanka at your own pace and schedule.",
    link: "/booknow/vehicleBookings",
    comingSoon: false,
  },
  {
    icon: "◉",
    title: "Join a Group Tour",
    desc: "Travel with like-minded adventurers on a shared group departure. New friendships, shared costs, unforgettable experiences.",
    link: null,
    comingSoon: true,
  },
];

export default function BookNow() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: "'Outfit', 'Libre Franklin', sans-serif" }}>

      {/* ── Hero ── */}
      <div className="bn-hero">
        <div className="bn-hero-dots" />
        <span className="bn-hero-eyebrow">Start Your Journey</span>
        <h1 className="bn-hero-title">How Would You<br/>Like to Travel?</h1>
        <p className="bn-hero-sub">
          From ready-to-go adventures to fully bespoke journeys — or just a ride to your next escape.
          Choose the travel style that suits you best, and let CeyBreeze do the rest.
        </p>
      </div>

      {/* ── Cards ── */}
      <div className="bn-content">
        <div className="bn-grid">
          {MENU_ITEMS.map((item, i) => (
            item.comingSoon ? (
              <div
                key={i}
                className="bn-card coming-soon"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <span className="bn-coming-tag">Coming Soon</span>
                <div className="bn-card-icon">{item.icon}</div>
                <div className="bn-card-title">{item.title}</div>
                <div className="bn-card-desc">{item.desc}</div>
                <div className="bn-card-cta" style={{ opacity: 0.35 }}>
                  <span className="bn-cta-line" />
                  Available Soon
                </div>
              </div>
            ) : (
              <div
                key={i}
                className="bn-card"
                onClick={() => navigate(item.link)}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="bn-card-icon">{item.icon}</div>
                <div className="bn-card-title">{item.title}</div>
                <div className="bn-card-desc">{item.desc}</div>
                <div className="bn-card-cta">
                  <span className="bn-cta-line" />
                  Get Started
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}