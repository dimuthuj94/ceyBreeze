// src/pages/customer/Dashboard.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, getDoc, collection, query, where, getDocs,
  orderBy, limit,
} from "firebase/firestore";
import CustomerLayout from "../../components/layouts/customer/CustomerLayout";

/* ── Profile completion fields (matches CustomerProfile.js) ── */
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
  const done  = COMPLETION_FIELDS
    .filter(f => data[f.key] && String(data[f.key]).trim() !== "")
    .reduce((s, f) => s + f.weight, 0);
  return Math.round((done / total) * 100);
};

/* ── Booking collections (matches MyReservations.js) ── */
const BOOKING_COLLECTIONS = [
  { col: "unpaidPresetBookings",     status: "pending",   type: "preset"   },
  { col: "paidPresetBookings",       status: "paid",      type: "preset"   },
  { col: "confirmedPresetBookings",  status: "confirmed", type: "preset"   },
  { col: "completedPresetBookings",  status: "completed", type: "preset"   },
  { col: "unpaidCustomBookings",     status: "pending",   type: "custom"   },
  { col: "paidCustomBookings",       status: "paid",      type: "custom"   },
  { col: "confirmedCustomBookings",  status: "confirmed", type: "custom"   },
  { col: "completedCustomBookings",  status: "completed", type: "custom"   },
  { col: "unpaidVehicleBookings",    status: "pending",   type: "vehicle"  },
  { col: "paidVehicleBookings",      status: "paid",      type: "vehicle"  },
  { col: "confirmedVehicleBookings", status: "confirmed", type: "vehicle"  },
  { col: "completedVehicleBookings", status: "completed", type: "vehicle"  },
];

const STATUS_COLORS = {
  paid:      { bg: "#eaf3de", color: "#27500a"  },
  confirmed: { bg: "#e6f1fb", color: "#0c447c"  },
  completed: { bg: "#f1efe8", color: "#444441"  },
  pending:   { bg: "#faeeda", color: "#633806"  },
};

const getTourName = (b, type) => {
  if (type === "vehicle") return "Vehicle Reservation";
  if (type === "custom")  return b["Tour Selection"]?.Tour || "Custom Tour";
  return b["Tour Info"]?.Tour || "Preset Tour";
};

const getArrivalDate = (b, type) => {
  if (type === "vehicle") return b.arrivalDate || "";
  if (type === "custom")  return b["Traveler Details"]?.["Arrival Date"] || "";
  return b.Travelers?.["Arrival Date"] || "";
};

const fmtDate = (str) => {
  if (!str) return "—";
  try { return new Date(str).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return str; }
};

const fmtTS = (ts) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return fmtDate(d.toISOString());
};

/* ═══════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [customerData, setCustomerData] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [news,         setNews]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate("/customer-login"); return; }

      /* ── Load customer profile ── */
      let cData = { uid: user.uid, email: user.email, firstName: "Traveller" };
      try {
        const snap = await getDoc(doc(db, "customers", user.uid));
        if (snap.exists()) cData = { uid: user.uid, email: user.email, ...snap.data() };
      } catch (_) {}
      setCustomerData(cData);
      setLoading(false);

      /* ── Load recent reservations (same logic as MyReservations) ── */
      const all = [];
      await Promise.all(
        BOOKING_COLLECTIONS.map(async ({ col, status, type }) => {
          try {
            const q    = query(collection(db, col), where("customerEmail", "==", user.email));
            const snap = await getDocs(q);
            snap.docs.forEach(d => all.push({ id: d.id, _status: status, _type: type, _col: col, ...d.data() }));
          } catch (_) {}
        })
      );
      /* Sort by arrival date, most recent first */
      all.sort((a, b) => {
        const da  = getArrivalDate(a, a._type) || "9999";
        const db_ = getArrivalDate(b, b._type) || "9999";
        return new Date(da) - new Date(db_);
      });
      setReservations(all.slice(0, 6));

      /* ── Load news & highlights (same as Home.js) ── */
      try {
        const newsSnap = await getDocs(
          query(collection(db, "newsAndHighlights"), orderBy("createdAt", "desc"), limit(4))
        );
        setNews(
          newsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(n => n.visibility !== "No")
        );
      } catch (_) {}
    });
    return () => unsub();
  }, [navigate]);

  /* ── Derived ── */
  const firstName = customerData?.firstName || "Traveller";
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const totalRes     = reservations.length;
  const confirmedRes = reservations.filter(r => r._status === "confirmed").length;
  const completedRes = reservations.filter(r => r._status === "completed").length;
  const pendingRes   = reservations.filter(r => r._status === "pending").length;

  const completion = calcCompletion(customerData);
  const missingFields = COMPLETION_FIELDS.filter(f =>
    !customerData?.[f.key] || String(customerData[f.key]).trim() === ""
  );

  /* ─────────────────────────────────────────────────── */
  return (
    <CustomerLayout pageTitle="Dashboard">
      <div className="dash-root">

        {/* ── HERO ── */}
        <div className="dash-hero">
          <div className="dash-greeting">{greeting} ✦</div>
          <div className="dash-welcome-name">
            Welcome back, <span>{firstName}</span>
          </div>
          <div className="dash-welcome-sub">
            Your next Sri Lankan adventure awaits. Here's what's happening with your travel plans.
          </div>
          <div className="dash-hero-actions">
            <button className="dash-hero-btn primary" onClick={() => navigate("/booknow")}>
              Book a Tour
            </button>
            <button className="dash-hero-btn outline" onClick={() => navigate("/customer/my-reservations")}>
              View Reservations
            </button>
          </div>
          <div className="dash-hero-stats">
            {[
              { val: totalRes,     label: "Total Bookings"   },
              { val: confirmedRes, label: "Confirmed"        },
              { val: completedRes, label: "Completed"        },
              { val: pendingRes,   label: "Pending Payment"  },
            ].map(({ val, label }) => (
              <div className="dash-hero-stat" key={label}>
                <div className="dash-hero-stat-val">{val}</div>
                <div className="dash-hero-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── QUICK STATS ── */}
        <div className="dash-stats-row">
          {[
            { icon: "✈", val: totalRes,     label: "All Reservations",   color: "#e6f1fb", click: () => navigate("/customer/my-reservations") },
            { icon: "◉", val: confirmedRes, label: "Upcoming Tours",     color: "#eaf3de", click: () => navigate("/customer/my-reservations") },
            { icon: "◈", val: pendingRes,   label: "Pending Payments",   color: "#fcebeb", click: () => navigate("/customer/my-reservations") },
            { icon: "◐", val: `${completion}%`, label: "Profile Complete", color: "#faeeda", click: () => navigate("/customer/profile") },
          ].map(({ icon, val, label, color, click }, i) => (
            <div
              className="dash-stat-card"
              key={i}
              style={{ animationDelay: `${i * 0.05}s`, cursor: "pointer" }}
              onClick={click}
            >
              <div className="dash-stat-top">
                <div className="dash-stat-badge" style={{ background: color }}>{icon}</div>
              </div>
              <div className="dash-stat-val">{val}</div>
              <div className="dash-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div className="dash-grid">

          {/* ── News & Highlights (Firebase) ── */}
          <div className="dash-news-card">
            <div className="dash-card-header">
              <span className="dash-card-title">News &amp; Highlights</span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "10px", color: "#adc6d8" }}>From CeyBreeze Tours</span>
                <div className="dash-card-icon">◆</div>
              </div>
            </div>
            <div>
              {news.length === 0 ? (
                /* Fallback demo items when no Firebase data */
                <div style={{ padding: "20px" }}>
                  {[
                    { title: "New Ella Rock Sunrise Package Launched", desc: "Experience the magic of sunrise over Ella Rock with our brand new exclusive package.", date: "Today", icon: "🌄" },
                    { title: "Whale Watching Season Opens in Mirissa",  desc: "Blue whale season is here! Book your Mirissa day trip now.",                             date: "Yesterday", icon: "🐋" },
                    { title: "Sigiriya Heritage Tour — Early Bird Discount", desc: "Save 15% on our Sigiriya & Dambulla day tour when you book this month.",          date: "2 days ago", icon: "🏔" },
                  ].map((item, i) => (
                    <div className="dash-news-item" key={i}>
                      <div className="dash-news-thumb-placeholder">{item.icon}</div>
                      <div>
                        <div className="dash-news-title">{item.title}</div>
                        <div className="dash-news-desc">{item.desc}</div>
                        <div className="dash-news-meta">{item.date} · CeyBreeze Tours</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                news.map(n => (
                  <div className="dash-news-item" key={n.id}>
                    {n.imageUrl
                      ? <img className="dash-news-thumb" src={n.imageUrl} alt={n.title} />
                      : <div className="dash-news-thumb-placeholder">◆</div>
                    }
                    <div>
                      <div className="dash-news-title">{n.title}</div>
                      <div className="dash-news-desc">{n.body || n.description || ""}</div>
                      <div className="dash-news-meta">
                        {n.publishedDate ? fmtDate(n.publishedDate) : fmtTS(n.createdAt)} · CeyBreeze Tours
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── My Reservations (Firebase) ── */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Recent Reservations</span>
              <button
                className="dash-see-all"
                onClick={() => navigate("/customer/my-reservations")}
              >
                See all →
              </button>
            </div>
            <div className="dash-card-body">
              {loading ? (
                <p style={{ color: "#adc6d8", fontSize: "12px" }}>Loading...</p>
              ) : reservations.length === 0 ? (
                <div className="dash-coming-soon">
                  <div className="dash-coming-soon-icon">✈</div>
                  <div className="dash-coming-soon-text">
                    No reservations yet.<br />Book your first Sri Lanka tour!
                  </div>
                  <button
                    className="dash-hero-btn primary"
                    style={{ marginTop: "12px", padding: "8px 16px", fontSize: "12px" }}
                    onClick={() => navigate("/booknow")}
                  >
                    Book Now
                  </button>
                </div>
              ) : (
                reservations.map(r => (
                  <div
                    className="dash-res-item"
                    key={r.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate("/customer/my-reservations")}
                  >
                    <div
                      className="dash-res-dot"
                      style={{ background: STATUS_COLORS[r._status]?.color || "#adc6d8" }}
                    />
                    <span className="dash-res-name">{getTourName(r, r._type)}</span>
                    <span className="dash-res-date">{fmtDate(getArrivalDate(r, r._type))}</span>
                    <span
                      className="dash-res-status"
                      style={STATUS_COLORS[r._status]}
                    >
                      {r._status === "pending" ? "To Pay" : r._status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Destination teaser ── */}
          <div className="dash-dest-card">
            <div className="dash-dest-label">Featured Destination</div>
            <div className="dash-dest-name">Sigiriya</div>
            <div className="dash-dest-desc">
              The ancient rock fortress rises 200m above the jungle. A UNESCO World Heritage site and one of Sri Lanka's most iconic landmarks.
            </div>
            <div className="dash-dest-tags">
              <span className="dash-dest-tag">Heritage</span>
              <span className="dash-dest-tag">Trekking</span>
              <span className="dash-dest-tag">Photography</span>
            </div>
            <button
              className="dash-hero-btn outline"
              style={{ marginTop: "16px", padding: "8px 16px", fontSize: "12px" }}
              onClick={() => navigate("/booknow")}
            >
              Explore Tours
            </button>
          </div>

          {/* ── Quick Actions ── */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Quick Actions</span>
              <div className="dash-card-icon">⊞</div>
            </div>
            <div className="dash-card-body">
              <div className="dash-actions-grid">
                {[
                  { icon: "✈", label: "Book a Tour",   action: () => navigate("/booknow")                    },
                  { icon: "◈", label: "Pay Now",        action: () => navigate("/customer/my-reservations")  },
                  { icon: "✉", label: "Messages",       action: () => navigate("/customer/my-messages")      },
                  { icon: "◐", label: "Edit Profile",   action: () => navigate("/customer/profile")          },
                  { icon: "🔔", label: "Notifications", action: () => navigate("/customer/my-notifications") },
                  { icon: "♡", label: "Wishlist",       action: () => navigate("/customer/wishlist")         },
                ].map(({ icon, label, action }) => (
                  <button key={label} className="dash-action-btn" onClick={action}>
                    <span className="dash-action-icon">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Profile Completion (Firebase — linked to CustomerProfile) ── */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Profile Completion</span>
              <button
                className="dash-see-all"
                onClick={() => navigate("/customer/profile")}
              >
                Edit Profile →
              </button>
            </div>
            <div className="dash-card-body">
              {/* Overall bar */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#7a9ab8" }}>Overall</span>
                  <span style={{
                    fontSize: "13px", fontWeight: 700,
                    color: completion === 100 ? "#27a86e" : completion >= 60 ? "#00276b" : "#8B0000",
                  }}>
                    {completion}%
                  </span>
                </div>
                <div className="dash-progress-bar">
                  <div
                    className="dash-progress-fill"
                    style={{
                      width: `${completion}%`,
                      background: completion === 100
                        ? "#27a86e"
                        : completion >= 60
                          ? "#00276b"
                          : "#8B0000",
                    }}
                  />
                </div>
              </div>

              {/* Individual fields */}
              {COMPLETION_FIELDS.map(f => {
                const done = customerData?.[f.key] && String(customerData[f.key]).trim() !== "";
                return (
                  <div key={f.key} style={{ marginBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontSize: "12px", color: done ? "#00276b" : "#adc6d8", fontWeight: done ? 500 : 400 }}>
                        {f.label}
                      </span>
                      <span style={{ fontSize: "11px", color: done ? "#27a86e" : "#adc6d8", fontWeight: 700 }}>
                        {done ? `✓ +${f.weight}%` : `+${f.weight}%`}
                      </span>
                    </div>
                    <div className="dash-progress-bar" style={{ height: "3px" }}>
                      <div
                        className="dash-progress-fill"
                        style={{
                          width:      done ? "100%" : "0%",
                          background: done ? "#27a86e" : "transparent",
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {completion < 100 && (
                <button
                  className="dash-action-btn"
                  style={{ width: "100%", marginTop: "12px" }}
                  onClick={() => navigate("/customer/profile")}
                >
                  <span className="dash-action-icon">◐</span> Complete My Profile
                </button>
              )}

              {completion < 100 && missingFields.length > 0 && (
                <div style={{ marginTop: "8px", fontSize: "11px", color: "#adc6d8" }}>
                  Missing: {missingFields.map(f => f.label).join(", ")}
                </div>
              )}
            </div>
          </div>

          {/* ── Recent Activity (static for now) ── */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Recent Activity</span>
              <div className="dash-card-icon">◷</div>
            </div>
            <div className="dash-card-body">
              {[
                { text: "You logged in to CeyBreeze",               time: "Just now"    },
                { text: "Profile updated",                           time: "Recently"    },
                { text: "Notification marked as read",               time: "Earlier"     },
              ].map((a, i) => (
                <div className="dash-activity-item" key={i}>
                  <div
                    className="dash-activity-dot"
                    style={{ background: i === 0 ? "#56c6e8" : "#EFFAFD", border: "1.5px solid #a8edff" }}
                  />
                  <div>
                    <div className="dash-activity-text">{a.text}</div>
                    <div className="dash-activity-time">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Travel Rewards — coming soon ── */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Travel Rewards</span>
              <span style={{ fontSize: "10px", background: "#faeeda", color: "#633806", padding: "2px 8px", fontWeight: 600 }}>
                Coming Soon
              </span>
            </div>
            <div className="dash-card-body">
              <div className="dash-coming-soon">
                <div className="dash-coming-soon-icon" style={{ opacity: 0.2 }}>◈</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "24px", color: "#00276b", opacity: 0.15, marginBottom: "8px" }}>
                  0 pts
                </div>
                <div className="dash-coming-soon-text">
                  Earn points with every tour booking.<br />Redeem for discounts and exclusive perks.
                </div>
              </div>
            </div>
          </div>

          {/* ── Sri Lanka Weather — coming soon ── */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-title">Sri Lanka Weather</span>
              <span style={{ fontSize: "10px", background: "#faeeda", color: "#633806", padding: "2px 8px", fontWeight: 600 }}>
                Coming Soon
              </span>
            </div>
            <div className="dash-card-body">
              <div className="dash-coming-soon">
                <div className="dash-coming-soon-icon">☀</div>
                <div className="dash-coming-soon-text">
                  Live weather updates for your tour destinations will appear here.
                </div>
              </div>
            </div>
          </div>

        </div>

        <div style={{ height: "32px" }} />
      </div>
    </CustomerLayout>
  );
}