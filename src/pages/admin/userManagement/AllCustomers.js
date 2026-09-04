// src/pages/admin/userManagement/AllCustomers.js
import React, { useEffect, useState } from "react";
import UserManagement from "../../../components/layouts/admin/UserManagement";
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import ViewCustomerModal from "../../../components/modals/general/ViewCustomerModal";

const COMPLETION_FIELDS = [
  { key: "firstName" }, { key: "lastName" },   { key: "contact" },
  { key: "dateOfBirth" }, { key: "nationality" }, { key: "passportNumber" },
  { key: "address" },  { key: "emergencyName" }, { key: "travelStyle" }, { key: "dietaryNeeds" },
];
const calcCompletion = (data) => {
  if (!data) return 0;
  const done = COMPLETION_FIELDS.filter(f => data[f.key] && String(data[f.key]).trim() !== "").length;
  return Math.round((done / COMPLETION_FIELDS.length) * 100);
};

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const CompletionBadge = ({ pct }) => {
  const color = pct === 100 ? "#27a86e" : pct >= 70 ? "#0c447c" : pct >= 40 ? "#633806" : "#8B0000";
  const bg    = pct === 100 ? "#e1f5ee" : pct >= 70 ? "#e6f1fb" : pct >= 40 ? "#faeeda" : "#fcebeb";
  return (
    <span style={{ background: bg, color, fontSize: "10px", fontWeight: 700, padding: "2px 8px", display: "inline-block" }}>
      {pct}%
    </span>
  );
};

export default function AllCustomers() {
  const [customers,    setCustomers]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [sortBy,       setSortBy]       = useState("newest");
  const [filterNat,    setFilterNat]    = useState("all");
  const [filterStyle,  setFilterStyle]  = useState("all");
  const [view,         setView]         = useState("grid"); // grid | table
  const [selected,     setSelected]     = useState(null);
  const [showModal,    setShowModal]    = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "customers"), orderBy("createdAt", "desc")),
      snap => { setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const nationalities = [...new Set(customers.map(c => c.nationality).filter(Boolean))].sort();
  const styles        = [...new Set(customers.map(c => c.travelStyle).filter(Boolean))].sort();

  const filtered = customers
    .filter(c => {
      const name  = `${c.firstName || ""} ${c.lastName || ""} ${c.email || ""}`.toLowerCase();
      if (search.trim() && !name.includes(search.toLowerCase())) return false;
      if (filterNat   !== "all" && c.nationality !== filterNat)   return false;
      if (filterStyle !== "all" && c.travelStyle !== filterStyle) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return db_ - da;
      }
      if (sortBy === "name") return (a.firstName || "").localeCompare(b.firstName || "");
      if (sortBy === "completion") return calcCompletion(b) - calcCompletion(a);
      return 0;
    });

  const Avatar = ({ c, size = 44 }) => {
    const initials = `${c.firstName?.[0] || ""}${c.lastName?.[0] || ""}` || "?";
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", background: "#00276b",
        border: "2px solid rgba(0,39,107,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.33 + "px", fontWeight: 700, color: "#a8edff",
        flexShrink: 0, fontFamily: "'DM Serif Display', serif",
      }}>
        {initials}
      </div>
    );
  };

  const fi = { padding: "8px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "12px", color: "#00276b", outline: "none", background: "#fff" };

  return (
    <UserManagement pageTitle="All Customers">

      <ViewCustomerModal
        show={showModal}
        onHide={() => { setShowModal(false); setSelected(null); }}
        customer={selected}
      />

      <div style={{ marginBottom: "22px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>All Customers</h3>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>{customers.length} registered · {filtered.length} shown</p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px", alignItems: "center" }}>
        <input
          placeholder="Search by name or email..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...fi, flex: 1, minWidth: "200px" }}
        />
        <select value={filterNat} onChange={e => setFilterNat(e.target.value)} style={{ ...fi }}>
          <option value="all">All Nationalities</option>
          {nationalities.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={filterStyle} onChange={e => setFilterStyle(e.target.value)} style={{ ...fi }}>
          <option value="all">All Travel Styles</option>
          {styles.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...fi }}>
          <option value="newest">Newest First</option>
          <option value="name">A–Z by Name</option>
          <option value="completion">Profile Completion</option>
        </select>
        <div style={{ display: "flex", border: "1.5px solid rgba(0,39,107,0.15)", overflow: "hidden" }}>
          {["grid","table"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? "#00276b" : "#fff",
              color:      view === v ? "#fff"     : "#7a9ab8",
              border: "none", padding: "8px 14px", cursor: "pointer",
              fontSize: "12px", fontWeight: 600,
            }}>
              {v === "grid" ? "⊞" : "≡"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#7a9ab8" }}>Loading customers...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#adc6d8" }}>
          <div style={{ fontSize: "48px", opacity: 0.15, marginBottom: "12px" }}>👤</div>
          <p style={{ fontSize: "14px" }}>No customers found.</p>
        </div>
      ) : view === "grid" ? (

        /* ── Grid view ── */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          {filtered.map(c => {
            const completion = calcCompletion(c);
            return (
              <div key={c.id} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                {/* Completion stripe */}
                <div style={{ height: "3px", background: completion === 100 ? "#27a86e" : completion >= 60 ? "#0c447c" : "#8B0000", width: "100%" }} />

                <div style={{ padding: "16px" }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "12px" }}>
                    <Avatar c={c} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#00276b" }}>
                        {`${c.firstName || ""} ${c.lastName || ""}`.trim() || "—"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#7a9ab8", marginTop: "2px" }}>{c.email}</div>
                      {c.nationality && (
                        <div style={{ fontSize: "10px", color: "#adc6d8", marginTop: "2px" }}>{c.nationality}</div>
                      )}
                    </div>
                    <CompletionBadge pct={completion} />
                  </div>

                  {/* Info rows */}
                  {[
                    ["📞", c.contact || "—"],
                    ["✈", c.travelStyle || "No preference set"],
                    ["🍽", c.dietaryNeeds || "—"],
                    ["📅", `Member since ${fmtDate(c.createdAt)}`],
                  ].map(([icon, value], i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "4px", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "11px", flexShrink: 0 }}>{icon}</span>
                      <span style={{ fontSize: "11px", color: "#495057", lineHeight: 1.4 }}>{value}</span>
                    </div>
                  ))}

                  {/* Completion bar */}
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ height: "4px", background: "rgba(0,39,107,0.06)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${completion}%`,
                        background: completion === 100 ? "#27a86e" : completion >= 60 ? "#00276b" : "#8B0000",
                      }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ marginTop: "12px", display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => { setSelected(c); setShowModal(true); }}
                      style={{ flex: 1, background: "#00276b", color: "#fff", border: "none", padding: "7px 0", fontSize: "11px", fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => { setSelected(c); setShowModal(true); }}
                      style={{ background: "rgba(0,39,107,0.05)", color: "#00276b", border: "1px solid rgba(0,39,107,0.12)", padding: "7px 12px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                    >
                      ✈ Bookings
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* ── Table view ── */
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "rgba(0,39,107,0.04)" }}>
                {["Customer","Email","Contact","Nationality","Travel Style","Joined","Completion","Actions"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const completion = calcCompletion(c);
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid rgba(0,39,107,0.05)", background: i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.01)" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Avatar c={c} size={30} />
                        <span style={{ fontWeight: 500, color: "#00276b" }}>
                          {`${c.firstName || ""} ${c.lastName || ""}`.trim() || "—"}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#7a9ab8" }}>{c.email}</td>
                    <td style={{ padding: "10px 14px", color: "#7a9ab8" }}>{c.contact || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>{c.nationality || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>{c.travelStyle || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#adc6d8" }}>{fmtDate(c.createdAt)}</td>
                    <td style={{ padding: "10px 14px" }}><CompletionBadge pct={completion} /></td>
                    <td style={{ padding: "10px 14px" }}>
                      <button
                        onClick={() => { setSelected(c); setShowModal(true); }}
                        style={{ background: "#e6f1fb", color: "#0c447c", border: "none", fontSize: "10px", padding: "4px 10px", cursor: "pointer", fontWeight: 700, textTransform: "uppercase" }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </UserManagement>
  );
}