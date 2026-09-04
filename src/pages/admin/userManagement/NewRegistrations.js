// src/pages/admin/userManagement/NewRegistrations.js
import React, { useEffect, useState } from "react";
import UserManagement from "../../../components/layouts/admin/UserManagement";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";
import ViewCustomerModal from "../../../components/modals/general/ViewCustomerModal";

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const COMPLETION_FIELDS = ["firstName","lastName","contact","dateOfBirth","nationality","passportNumber","address","emergencyName","travelStyle","dietaryNeeds"];
const calcCompletion = (data) => {
  if (!data) return 0;
  const done = COMPLETION_FIELDS.filter(k => data[k] && String(data[k]).trim() !== "").length;
  return Math.round((done / COMPLETION_FIELDS.length) * 100);
};

export default function NewRegistrations() {
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("7");  // days
  const [selected,  setSelected]  = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "customers"), orderBy("createdAt", "desc")),
      snap => { setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const cutoff = new Date(Date.now() - parseInt(filter) * 86400000);
  const filtered = customers.filter(c => {
    const d = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt || 0);
    return d >= cutoff;
  });

  const Avatar = ({ c, size = 44 }) => {
    const initials = `${c.firstName?.[0] || ""}${c.lastName?.[0] || ""}` || "?";
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", background: "#00276b",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.33 + "px", fontWeight: 700, color: "#a8edff",
        flexShrink: 0, fontFamily: "'DM Serif Display', serif",
      }}>{initials}</div>
    );
  };

  return (
    <UserManagement pageTitle="New Registrations">
      <ViewCustomerModal show={showModal} onHide={() => { setShowModal(false); setSelected(null); }} customer={selected} />

      <div style={{ marginBottom: "22px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>New Registrations</h3>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>{filtered.length} customers in selected period</p>
      </div>

      {/* Period selector */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "24px" }}>
        {[["1","Today"],["7","Last 7 Days"],["14","Last 14 Days"],["30","Last 30 Days"],["90","Last 3 Months"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            background: filter === val ? "#00276b" : "#fff",
            color:      filter === val ? "#fff"     : "#7a9ab8",
            border: `1px solid ${filter === val ? "#00276b" : "rgba(0,39,107,0.15)"}`,
            padding: "7px 16px", fontSize: "11px", fontWeight: 600, cursor: "pointer",
          }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#7a9ab8" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#adc6d8" }}>
          <div style={{ fontSize: "48px", opacity: 0.15, marginBottom: "12px" }}>👤</div>
          <p style={{ fontSize: "14px" }}>No new registrations in this period.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map(c => {
            const completion = calcCompletion(c);
            return (
              <div key={c.id} style={{
                background: "#fff", border: "1px solid rgba(0,39,107,0.07)",
                padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap",
              }}>
                {/* New badge */}
                <div style={{ background: "#e1f5ee", color: "#085041", fontSize: "9px", fontWeight: 700, padding: "2px 7px", letterSpacing: "0.08em", flexShrink: 0 }}>NEW</div>
                <Avatar c={c} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#00276b" }}>
                    {`${c.firstName || ""} ${c.lastName || ""}`.trim() || "—"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#7a9ab8" }}>{c.email} · {c.nationality || "Nationality not set"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "#adc6d8" }}>Joined</div>
                  <div style={{ fontSize: "12px", color: "#343a40", fontWeight: 500 }}>{fmtDate(c.createdAt)}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "#adc6d8", marginBottom: "3px" }}>Profile</div>
                  <div style={{
                    fontSize: "14px", fontWeight: 700,
                    color: completion === 100 ? "#27a86e" : completion >= 60 ? "#633806" : "#8B0000",
                  }}>{completion}%</div>
                </div>
                <button
                  onClick={() => { setSelected(c); setShowModal(true); }}
                  style={{ background: "#00276b", color: "#fff", border: "none", padding: "8px 16px", fontSize: "11px", fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}
                >
                  View Profile
                </button>
              </div>
            );
          })}
        </div>
      )}
    </UserManagement>
  );
}