// src/pages/admin/userManagement/ActivityLogs.js
import React from "react";
import UserManagement from "../../../components/layouts/admin/UserManagement";

export default function ActivityLogs() {
  return (
    <UserManagement pageTitle="Activity Logs">
      <div style={{ maxWidth: "680px", margin: "60px auto 0", textAlign: "center" }}>

        {/* Icon */}
        <div style={{
          width: "80px", height: "80px", background: "#00276b",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "36px", margin: "0 auto 24px",
        }}>
          ◷
        </div>

        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "32px", color: "#00276b", fontWeight: 400, margin: "0 0 12px" }}>
          Activity Logs
        </h2>
        <p style={{ fontSize: "14px", color: "#7a9ab8", margin: "0 0 32px", lineHeight: 1.7 }}>
          This module is under development. Activity logs will provide a complete audit trail
          of all customer actions — logins, bookings, profile changes, messages, and more.
        </p>

        {/* Coming soon features */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "0", overflow: "hidden", textAlign: "left", marginBottom: "24px" }}>
          <div style={{ background: "#00276b", padding: "10px 18px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Planned Features
            </span>
          </div>
          <div style={{ padding: "4px 0" }}>
            {[
              ["◎", "Customer login & logout events"],
              ["◎", "Booking creation, modification, and cancellation history"],
              ["◎", "Profile update tracking with before/after diffs"],
              ["◎", "Message and inquiry history"],
              ["◎", "Payment and receipt events"],
              ["◎", "Date change and cancellation request history"],
              ["◎", "Notification read/clear events"],
              ["◎", "Export to CSV / PDF"],
              ["◎", "Filtering by customer, date range, and event type"],
            ].map(([icon, text], i) => (
              <div key={i} style={{
                display: "flex", gap: "12px", alignItems: "center",
                padding: "10px 18px", borderBottom: "1px solid rgba(0,39,107,0.04)",
              }}>
                <span style={{ color: "#a8edff", fontSize: "14px" }}>{icon}</span>
                <span style={{ fontSize: "13px", color: "#343a40" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#faeeda", border: "1px solid rgba(253,174,0,0.25)", padding: "12px 18px", fontSize: "12px", color: "#633806", textAlign: "left" }}>
          ⚠ To enable activity logs, a <strong>customerActivityLogs</strong> Firestore collection will be created.
          Each document will store the event type, timestamp, customer ID, and event payload.
        </div>
      </div>
    </UserManagement>
  );
}