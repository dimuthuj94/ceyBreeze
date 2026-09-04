// src/pages/admin/userManagement/Dashboard.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserManagement from "../../../components/layouts/admin/UserManagement";
import {
  collection, onSnapshot, query, orderBy, limit,
  where, getDocs,
} from "firebase/firestore";
import { db } from "../../../firebase";

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDateFull = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const now  = new Date();
  const diff = now - d;
  if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return fmtDate(ts);
};

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

const BOOKING_COLS = [
  "unpaidPresetBookings","unpaidCustomBookings","unpaidVehicleBookings",
  "paidPresetBookings","paidCustomBookings","paidVehicleBookings",
  "confirmedPresetBookings","confirmedCustomBookings","confirmedVehicleBookings",
  "completedPresetBookings","completedCustomBookings","completedVehicleBookings",
];

const NATIONALITY_COLORS = [
  "#00276b","#0c447c","#085041","#633806","#8B0000","#27a86e","#7a9ab8",
];

export default function UserDashboard() {
  const navigate = useNavigate();
  const [customers,      setCustomers]      = useState([]);
  const [recentCustomers,setRecentCustomers] = useState([]);
  const [bookingCounts,  setBookingCounts]  = useState({});
  const [loading,        setLoading]        = useState(true);

  /* ── Load customers ── */
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "customers"), orderBy("createdAt", "desc")),
      snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCustomers(all);
        setRecentCustomers(all.slice(0, 8));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  /* ── Count bookings per customer (sample last 50) ── */
  useEffect(() => {
    if (!customers.length) return;
    const emailSet = [...new Set(customers.map(c => c.email || c.id).filter(Boolean))];
    const map = {};
    let loaded = 0;
    const total = Math.min(emailSet.length, 30);

    emailSet.slice(0, 30).forEach(email => {
      let count = 0;
      let colsDone = 0;
      BOOKING_COLS.forEach(col => {
        getDocs(query(collection(db, col), where("customerEmail", "==", email)))
          .then(snap => {
            count += snap.size;
            colsDone++;
            if (colsDone === BOOKING_COLS.length) {
              map[email] = count;
              loaded++;
              if (loaded === total) setBookingCounts({ ...map });
            }
          }).catch(() => { colsDone++; });
      });
    });
  }, [customers]);

  /* ── Derived stats ── */
  const now       = new Date();
  const last7Days = new Date(now - 7  * 86400000);
  const last30Days= new Date(now - 30 * 86400000);

  const newThisWeek  = customers.filter(c => {
    const d = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt || 0);
    return d >= last7Days;
  }).length;

  const newThisMonth = customers.filter(c => {
    const d = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt || 0);
    return d >= last30Days;
  }).length;

  const completionBuckets = {
    complete: customers.filter(c => calcCompletion(c) === 100).length,
    high:     customers.filter(c => { const p = calcCompletion(c); return p >= 70 && p < 100; }).length,
    medium:   customers.filter(c => { const p = calcCompletion(c); return p >= 40 && p < 70; }).length,
    low:      customers.filter(c => calcCompletion(c) < 40).length,
  };

  const avgCompletion = customers.length
    ? Math.round(customers.reduce((s, c) => s + calcCompletion(c), 0) / customers.length)
    : 0;

  /* Nationality breakdown */
  const nationalityMap = {};
  customers.forEach(c => {
    if (c.nationality) nationalityMap[c.nationality] = (nationalityMap[c.nationality] || 0) + 1;
  });
  const topNationalities = Object.entries(nationalityMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  /* Travel style breakdown */
  const styleMap = {};
  customers.forEach(c => {
    if (c.travelStyle) styleMap[c.travelStyle] = (styleMap[c.travelStyle] || 0) + 1;
  });
  const topStyles = Object.entries(styleMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const KPI = ({ label, value, color, sub, onClick }) => (
    <div
      onClick={onClick}
      style={{
        background: "#fff", border: "1px solid rgba(0,39,107,0.07)",
        padding: "18px 20px", flex: 1, minWidth: "130px",
        borderLeft: `3px solid ${color}`,
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.18s", position: "relative",
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,39,107,0.08)")}
      onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{ fontSize: "10px", color: "#7a9ab8", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "28px", color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "4px" }}>{sub}</div>}
      {onClick && <div style={{ position: "absolute", right: "14px", bottom: "14px", fontSize: "14px", color: "#adc6d8" }}>›</div>}
    </div>
  );

  const SectionHeader = ({ title, count, action, actionLabel }) => (
    <div style={{ background: "#00276b", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "10px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>
        {title}
        {count != null && <span style={{ background: "rgba(168,237,255,0.15)", padding: "1px 7px", borderRadius: "10px", marginLeft: "8px" }}>{count}</span>}
      </span>
      {action && (
        <button onClick={action} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#a8edff", fontSize: "10px", padding: "3px 10px", cursor: "pointer", fontWeight: 700 }}>
          {actionLabel}
        </button>
      )}
    </div>
  );

  const Avatar = ({ customer, size = 36 }) => {
    const initials = `${customer.firstName?.[0] || ""}${customer.lastName?.[0] || ""}` || "?";
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "#00276b",
        border: "2px solid rgba(0,39,107,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.33 + "px", fontWeight: 700, color: "#a8edff",
        flexShrink: 0, fontFamily: "'DM Serif Display', serif",
      }}>
        {initials}
      </div>
    );
  };

  return (
    <UserManagement pageTitle="Dashboard">
      <div style={{ marginBottom: "22px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>
          User Management Dashboard
        </h3>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>
          {customers.length} registered customers · Live snapshot
        </p>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
        <KPI label="Total Customers"    value={customers.length}    color="#00276b" sub="All time"          onClick={() => navigate("/admin/users/all")} />
        <KPI label="New This Week"      value={newThisWeek}          color="#27a86e" sub="Last 7 days"       onClick={() => navigate("/admin/users/new")} />
        <KPI label="New This Month"     value={newThisMonth}         color="#0c447c" sub="Last 30 days"      onClick={() => navigate("/admin/users/new")} />
        <KPI label="Avg. Completion"    value={`${avgCompletion}%`} color={avgCompletion >= 70 ? "#27a86e" : "#633806"} sub="Profile completeness" onClick={() => navigate("/admin/users/completion")} />
        <KPI label="Complete Profiles"  value={completionBuckets.complete} color="#27a86e" sub="100% filled" onClick={() => navigate("/admin/users/completion")} />
        <KPI label="Incomplete Profiles" value={completionBuckets.low + completionBuckets.medium} color="#8B0000" sub="Need attention" onClick={() => navigate("/admin/users/completion")} />
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>

        {/* Recent Customers */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
          <SectionHeader title="Recent Registrations" count={recentCustomers.length} action={() => navigate("/admin/user-management/all-customers")} actionLabel="View All →" />
          {loading ? (
            <p style={{ padding: "20px", color: "#adc6d8", fontSize: "12px" }}>Loading...</p>
          ) : recentCustomers.length === 0 ? (
            <p style={{ padding: "20px", color: "#adc6d8", fontSize: "12px" }}>No customers registered yet.</p>
          ) : (
            recentCustomers.map(c => {
              const completion = calcCompletion(c);
              return (
                <div
                  key={c.id}
                  onClick={() => navigate("/admin/user-management/all-customers")}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderBottom: "1px solid rgba(0,39,107,0.05)", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,39,107,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <Avatar customer={c} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#00276b" }}>
                      {`${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email}
                    </div>
                    <div style={{ fontSize: "11px", color: "#adc6d8" }}>{c.email} · {c.nationality || "—"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      fontSize: "10px", fontWeight: 700,
                      color: completion === 100 ? "#27a86e" : completion >= 60 ? "#633806" : "#8B0000",
                    }}>
                      {completion}%
                    </div>
                    <div style={{ fontSize: "10px", color: "#adc6d8" }}>{fmtDateFull(c.createdAt)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Profile Completion Breakdown */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
          <SectionHeader title="Profile Completion" action={() => navigate("/admin/user-management/profile-completion")} actionLabel="Details →" />
          <div style={{ padding: "16px" }}>
            {/* Donut-style bars */}
            {[
              { label: "Complete (100%)",   count: completionBuckets.complete, color: "#27a86e", bg: "#e1f5ee" },
              { label: "High (70–99%)",     count: completionBuckets.high,     color: "#0c447c", bg: "#e6f1fb" },
              { label: "Medium (40–69%)",   count: completionBuckets.medium,   color: "#633806", bg: "#faeeda" },
              { label: "Low (< 40%)",       count: completionBuckets.low,      color: "#8B0000", bg: "#fcebeb" },
            ].map(({ label, count, color, bg }) => {
              const pct = customers.length > 0 ? (count / customers.length) * 100 : 0;
              return (
                <div key={label} style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#7a9ab8" }}>{label}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color }}>{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(0,39,107,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              );
            })}

            {/* Average */}
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(0,39,107,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#7a9ab8" }}>Fleet average</span>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "24px", color: avgCompletion >= 70 ? "#27a86e" : "#633806" }}>
                {avgCompletion}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Second row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>

        {/* Top nationalities */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
          <SectionHeader title="Customer Nationalities" />
          <div style={{ padding: "16px" }}>
            {topNationalities.length === 0 ? (
              <p style={{ color: "#adc6d8", fontSize: "12px", margin: 0 }}>No nationality data yet.</p>
            ) : (
              topNationalities.map(([nat, count], i) => {
                const pct = customers.length > 0 ? (count / customers.length) * 100 : 0;
                const color = NATIONALITY_COLORS[i % NATIONALITY_COLORS.length];
                return (
                  <div key={nat} style={{ marginBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <div style={{ width: "8px", height: "8px", background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", color: "#343a40" }}>{nat}</span>
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: 700, color }}>
                        {count} <span style={{ fontWeight: 400, color: "#adc6d8" }}>({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div style={{ height: "3px", background: "rgba(0,39,107,0.06)" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Travel Styles */}
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
          <SectionHeader title="Travel Style Preferences" />
          <div style={{ padding: "16px" }}>
            {topStyles.length === 0 ? (
              <p style={{ color: "#adc6d8", fontSize: "12px", margin: 0 }}>No preference data yet.</p>
            ) : (
              topStyles.map(([style, count], i) => {
                const pct = customers.length > 0 ? (count / customers.length) * 100 : 0;
                const color = ["#00276b","#27a86e","#633806","#0c447c","#8B0000"][i] || "#7a9ab8";
                return (
                  <div key={style} style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: "#343a40" }}>{style}</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color }}>{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div style={{ height: "5px", background: "rgba(0,39,107,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {[
          { label: "All Customers",     path: "/admin/user-management/all-customers",        color: "#00276b" },
          { label: "New Registrations", path: "/admin/user-management/new-registrations",        color: "#27a86e" },
          { label: "Profile Completion",path: "/admin/user-management/profile-completion",  color: "#0c447c" },
          { label: "Booking History",   path: "/admin/user-management/customer-bookings",   color: "#633806" },
        ].map(({ label, path, color }) => (
          <button key={label} onClick={() => navigate(path)} style={{
            background: color, color: "#fff", border: "none",
            padding: "10px 20px", fontSize: "11px", fontWeight: 700,
            cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            {label}
          </button>
        ))}
      </div>
    </UserManagement>
  );
}