// src/pages/admin/userManagement/ProfileCompletion.js
import React, { useEffect, useState } from "react";
import UserManagement from "../../../components/layouts/admin/UserManagement";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";
import ViewCustomerModal from "../../../components/modals/general/ViewCustomerModal";

const COMPLETION_FIELDS = [
  { key: "firstName",      label: "First Name",        weight: 15 },
  { key: "lastName",       label: "Last Name",         weight: 10 },
  { key: "contact",        label: "Phone Number",      weight: 15 },
  { key: "dateOfBirth",    label: "Date of Birth",     weight: 10 },
  { key: "nationality",    label: "Nationality",        weight: 10 },
  { key: "passportNumber", label: "Passport Number",   weight: 10 },
  { key: "address",        label: "Address",           weight: 10 },
  { key: "emergencyName",  label: "Emergency Contact", weight: 10 },
  { key: "travelStyle",    label: "Travel Style",      weight: 5  },
  { key: "dietaryNeeds",   label: "Dietary Needs",     weight: 5  },
];

const calcCompletion = (data) => {
  if (!data) return 0;
  const total = COMPLETION_FIELDS.reduce((s, f) => s + f.weight, 0);
  const done  = COMPLETION_FIELDS.filter(f => data[f.key] && String(data[f.key]).trim() !== "").reduce((s, f) => s + f.weight, 0);
  return Math.round((done / total) * 100);
};

export default function ProfileCompletion() {
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("all");   // all | complete | incomplete | low
  const [sortBy,    setSortBy]    = useState("lowest");
  const [selected,  setSelected]  = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [expandField, setExpandField] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "customers"), orderBy("createdAt", "desc")),
      snap => { setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const withCompletion = customers.map(c => ({ ...c, completion: calcCompletion(c) }));

  const filtered = withCompletion
    .filter(c => {
      if (filter === "complete")   return c.completion === 100;
      if (filter === "incomplete") return c.completion < 100;
      if (filter === "low")        return c.completion < 40;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "lowest")  return a.completion - b.completion;
      if (sortBy === "highest") return b.completion - a.completion;
      if (sortBy === "name")    return (a.firstName || "").localeCompare(b.firstName || "");
      return 0;
    });

  /* Missing fields analysis */
  const missingFieldCounts = COMPLETION_FIELDS.map(f => ({
    ...f,
    missingCount: customers.filter(c => !c[f.key] || String(c[f.key]).trim() === "").length,
    pct: customers.length > 0
      ? Math.round((customers.filter(c => !c[f.key] || String(c[f.key]).trim() === "").length / customers.length) * 100)
      : 0,
  })).sort((a, b) => b.missingCount - a.missingCount);

  const avgCompletion = withCompletion.length
    ? Math.round(withCompletion.reduce((s, c) => s + c.completion, 0) / withCompletion.length)
    : 0;

  const Avatar = ({ c, size = 36 }) => {
    const initials = `${c.firstName?.[0] || ""}${c.lastName?.[0] || ""}` || "?";
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: "#00276b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33 + "px", fontWeight: 700, color: "#a8edff", flexShrink: 0, fontFamily: "'DM Serif Display', serif" }}>
        {initials}
      </div>
    );
  };

  return (
    <UserManagement pageTitle="Profile Completion">
      <ViewCustomerModal show={showModal} onHide={() => { setShowModal(false); setSelected(null); }} customer={selected} />

      <div style={{ marginBottom: "22px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>Profile Completion</h3>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>Fleet average: <strong style={{ color: avgCompletion >= 70 ? "#27a86e" : "#633806" }}>{avgCompletion}%</strong></p>
      </div>

      {/* Missing fields analysis */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", marginBottom: "24px", overflow: "hidden" }}>
        <div style={{ background: "#00276b", padding: "10px 16px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Most Commonly Missing Fields
          </span>
        </div>
        <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
          {missingFieldCounts.map(f => (
            <div key={f.key} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span style={{ fontSize: "12px", color: "#343a40" }}>{f.label}</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: f.pct > 50 ? "#8B0000" : "#633806" }}>
                    {f.missingCount} missing ({f.pct}%)
                  </span>
                </div>
                <div style={{ height: "4px", background: "rgba(0,39,107,0.06)" }}>
                  <div style={{ height: "100%", width: `${f.pct}%`, background: f.pct > 50 ? "#8B0000" : f.pct > 25 ? "#633806" : "#adc6d8" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "4px", background: "rgba(0,39,107,0.04)", padding: "4px" }}>
          {[
            ["all",        `All (${withCompletion.length})`],
            ["complete",   `Complete (${withCompletion.filter(c => c.completion === 100).length})`],
            ["incomplete", `Incomplete (${withCompletion.filter(c => c.completion < 100).length})`],
            ["low",        `Low < 40% (${withCompletion.filter(c => c.completion < 40).length})`],
          ].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              background: filter === val ? "#00276b" : "transparent",
              color:      filter === val ? "#fff"     : "#7a9ab8",
              border: "none", padding: "6px 14px", cursor: "pointer",
              fontSize: "11px", fontWeight: 600,
            }}>
              {label}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontSize: "12px", padding: "7px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b" }}>
          <option value="lowest">Lowest First</option>
          <option value="highest">Highest First</option>
          <option value="name">A–Z by Name</option>
        </select>
        <span style={{ fontSize: "12px", color: "#7a9ab8", marginLeft: "auto" }}>{filtered.length} shown</span>
      </div>

      {loading ? <p style={{ color: "#7a9ab8" }}>Loading...</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                <Avatar c={c} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#00276b" }}>
                    {`${c.firstName || ""} ${c.lastName || ""}`.trim() || "—"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#7a9ab8" }}>{c.email}</div>
                </div>

                {/* Completion bar */}
                <div style={{ width: "220px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {COMPLETION_FIELDS.map(f => (
                        <div key={f.key} title={f.label} style={{
                          width: "8px", height: "8px", borderRadius: "50%",
                          background: (c[f.key] && String(c[f.key]).trim() !== "") ? "#27a86e" : "rgba(0,39,107,0.1)",
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: c.completion === 100 ? "#27a86e" : c.completion >= 60 ? "#0c447c" : "#8B0000" }}>
                      {c.completion}%
                    </span>
                  </div>
                  <div style={{ height: "5px", background: "rgba(0,39,107,0.06)" }}>
                    <div style={{
                      height: "100%", width: `${c.completion}%`,
                      background: c.completion === 100 ? "#27a86e" : c.completion >= 60 ? "#00276b" : "#8B0000",
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                  {c.completion < 100 && (
                    <div style={{ fontSize: "10px", color: "#adc6d8", marginTop: "3px" }}>
                      Missing: {COMPLETION_FIELDS.filter(f => !c[f.key] || String(c[f.key]).trim() === "").map(f => f.label).join(", ")}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { setSelected(c); setShowModal(true); }}
                  style={{ background: "#00276b", color: "#fff", border: "none", padding: "7px 14px", fontSize: "11px", fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </UserManagement>
  );
}