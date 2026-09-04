// src/pages/admin/reservationManagement/manageReservations/ManageReservationsLayout.js
import React, { useState } from "react";
import ReservationManagement from "../../../../components/layouts/admin/ReservationManagement";
import PaidReservations      from "./PaidReservations";
import ConfirmedReservations from "./ConfirmedReservations";
import CompletedReservations from "./CompletedReservations";

const TABS = [
  { key: "paid",      label: "Paid",      icon: "◎" },
  { key: "confirmed", label: "Confirmed", icon: "✦" },
  { key: "completed", label: "Completed", icon: "✓" },
];

export default function ManageReservationsLayout() {
  const [activeTab, setActiveTab] = useState("paid");

  return (
    <ReservationManagement pageTitle="Manage Reservations">
      <div>
        <div style={{ marginBottom: "22px" }}>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>
            Manage Reservations
          </h3>
          <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>
            Process paid bookings, confirm tours, and mark completions.
          </p>
        </div>

        {/* Tab strip */}
        <div style={{ display: "flex", gap: "0", marginBottom: "24px", borderBottom: "2px solid rgba(0,39,107,0.1)" }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: "10px 26px", fontSize: "12px", fontWeight: 600,
                cursor: "pointer", border: "none",
                background: activeTab === t.key ? "#00276b" : "transparent",
                color:      activeTab === t.key ? "#fff"     : "#7a9ab8",
                borderBottom: activeTab === t.key ? "2px solid #00276b" : "2px solid transparent",
                marginBottom: "-2px",
                transition: "all 0.18s",
                display: "flex", alignItems: "center", gap: "7px",
                letterSpacing: "0.04em",
              }}
            >
              <span style={{ fontSize: "14px" }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "paid"      && <PaidReservations />}
        {activeTab === "confirmed" && <ConfirmedReservations />}
        {activeTab === "completed" && <CompletedReservations />}
      </div>
    </ReservationManagement>
  );
}