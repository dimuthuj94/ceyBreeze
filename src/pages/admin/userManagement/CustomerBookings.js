// src/pages/admin/userManagement/CustomerBookings.js
import React, { useEffect, useState } from "react";
import UserManagement from "../../../components/layouts/admin/UserManagement";
import { collection, onSnapshot, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "../../../firebase";
import ViewCustomerModal from "../../../components/modals/general/ViewCustomerModal";

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtMoney = (n) => n != null ? `$${Number(n).toFixed(2)}` : "—";

const BOOKING_COLS = [
  { col: "unpaidPresetBookings",     type: "preset",   status: "unpaid"    },
  { col: "unpaidCustomBookings",     type: "custom",   status: "unpaid"    },
  { col: "unpaidVehicleBookings",    type: "vehicle",  status: "unpaid"    },
  { col: "paidPresetBookings",       type: "preset",   status: "paid"      },
  { col: "paidCustomBookings",       type: "custom",   status: "paid"      },
  { col: "paidVehicleBookings",      type: "vehicle",  status: "paid"      },
  { col: "confirmedPresetBookings",  type: "preset",   status: "confirmed" },
  { col: "confirmedCustomBookings",  type: "custom",   status: "confirmed" },
  { col: "confirmedVehicleBookings", type: "vehicle",  status: "confirmed" },
  { col: "completedPresetBookings",  type: "preset",   status: "completed" },
  { col: "completedCustomBookings",  type: "custom",   status: "completed" },
  { col: "completedVehicleBookings", type: "vehicle",  status: "completed" },
  { col: "cancelledBookings",        type: "mixed",    status: "cancelled" },
];

const TYPE_STYLE = {
  preset:   { bg: "#e6f1fb", color: "#0c447c", label: "Preset"   },
  custom:   { bg: "#e1f5ee", color: "#085041", label: "Custom"   },
  vehicle:  { bg: "#faeeda", color: "#633806", label: "Vehicle"  },
  mixed:    { bg: "#f1f3f5", color: "#6c757d", label: "Mixed"    },
};
const STATUS_STYLE = {
  unpaid:    { bg: "#fcebeb", color: "#791f1f" },
  paid:      { bg: "#faeeda", color: "#633806" },
  confirmed: { bg: "#e6f1fb", color: "#0c447c" },
  completed: { bg: "#e1f5ee", color: "#085041" },
  cancelled: { bg: "#f1f3f5", color: "#6c757d" },
};

export default function CustomerBookings() {
  const [customers,  setCustomers]  = useState([]);
  const [bookingMap, setBookingMap] = useState({}); // email → bookings[]
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [sortBy,     setSortBy]     = useState("bookings");
  const [expandedId, setExpandedId] = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [showModal,  setShowModal]  = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "customers"), orderBy("createdAt", "desc")),
      snap => { setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  /* Load bookings for customers */
  useEffect(() => {
    if (!customers.length) return;
    const emails = [...new Set(customers.map(c => c.email).filter(Boolean))];
    const map = {};
    let loaded = 0;
    const total = emails.length;

    if (total === 0) return;

    emails.forEach(email => {
      map[email] = [];
      let colsDone = 0;

      BOOKING_COLS.forEach(({ col, type, status }) => {
        getDocs(query(collection(db, col), where("customerEmail", "==", email)))
          .then(snap => {
            snap.docs.forEach(d => {
              map[email].push({ id: d.id, _col: col, _type: type, _status: status, ...d.data() });
            });
            colsDone++;
            if (colsDone === BOOKING_COLS.length) {
              loaded++;
              if (loaded === total) setBookingMap({ ...map });
            }
          }).catch(() => { colsDone++; });
      });
    });
  }, [customers]);

  const getPrice = (b) => {
    const summary = b["Pricing Summary"];
    if (summary?.["Total Price"]) return summary["Total Price"];
    if (b.totalPrice) return `$${b.totalPrice}`;
    return "—";
  };

  const getTourName = (b) => {
    if (b._type === "vehicle") return "Vehicle Reservation";
    if (b._type === "custom")  return b["Tour Selection"]?.Tour || "Custom Tour";
    return b["Tour Info"]?.Tour || b.tourName || "Preset Tour";
  };

  const withBookings = customers.map(c => ({
    ...c,
    bookings: bookingMap[c.email] || [],
  }));

  const filtered = withBookings
    .filter(c => {
      const name = `${c.firstName || ""} ${c.lastName || ""} ${c.email || ""}`.toLowerCase();
      return !search.trim() || name.includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "bookings") return b.bookings.length - a.bookings.length;
      if (sortBy === "name")     return (a.firstName || "").localeCompare(b.firstName || "");
      return 0;
    });

  const totalBookings = Object.values(bookingMap).reduce((s, arr) => s + arr.length, 0);

  const Avatar = ({ c, size = 40 }) => {
    const initials = `${c.firstName?.[0] || ""}${c.lastName?.[0] || ""}` || "?";
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: "#00276b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33 + "px", fontWeight: 700, color: "#a8edff", flexShrink: 0, fontFamily: "'DM Serif Display', serif" }}>
        {initials}
      </div>
    );
  };

  return (
    <UserManagement pageTitle="Booking History">
      <ViewCustomerModal show={showModal} onHide={() => { setShowModal(false); setSelected(null); }} customer={selected} />

      <div style={{ marginBottom: "22px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>Customer Booking History</h3>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>
          {customers.length} customers · {totalBookings} total bookings across all types
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
        {[
          { label: "Total Customers",  value: customers.length,                                                    color: "#00276b" },
          { label: "Total Bookings",   value: totalBookings,                                                       color: "#0c447c" },
          { label: "Avg. per Customer",value: customers.length ? (totalBookings / customers.length).toFixed(1) : 0, color: "#27a86e" },
          { label: "Active Travellers",value: Object.values(bookingMap).filter(arr => arr.some(b => b._status === "confirmed")).length, color: "#633806" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "14px 18px", flex: 1, minWidth: "130px", borderLeft: `3px solid ${color}` }}>
            <div style={{ fontSize: "10px", color: "#7a9ab8", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input
          placeholder="Search customer..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: "200px", padding: "8px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "12px", color: "#00276b", outline: "none" }}
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontSize: "12px", padding: "8px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b" }}>
          <option value="bookings">Most Bookings First</option>
          <option value="name">A–Z by Name</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: "#7a9ab8" }}>Loading...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map(c => {
            const isExpanded = expandedId === c.id;
            const bookings   = c.bookings;
            const completed  = bookings.filter(b => b._status === "completed").length;
            const active     = bookings.filter(b => b._status === "confirmed").length;

            return (
              <div key={c.id} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                <div style={{ height: "3px", background: bookings.length > 0 ? "#00276b" : "rgba(0,39,107,0.08)" }} />

                <div style={{ padding: "14px 18px", display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                  <Avatar c={c} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#00276b" }}>
                      {`${c.firstName || ""} ${c.lastName || ""}`.trim() || "—"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#7a9ab8" }}>{c.email} · {c.nationality || "—"}</div>
                  </div>

                  {/* Booking stats */}
                  <div style={{ display: "flex", gap: "20px" }}>
                    {[
                      ["Total", bookings.length, "#00276b"],
                      ["Completed", completed, "#27a86e"],
                      ["Active", active, "#0c447c"],
                    ].map(([label, val, color]) => (
                      <div key={label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "9px", color: "#adc6d8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>{label}</div>
                        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "20px", color, fontWeight: 700 }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => { setSelected(c); setShowModal(true); }}
                      style={{ background: "#EFFAFD", color: "#00276b", border: "1px solid rgba(0,39,107,0.15)", padding: "7px 14px", fontSize: "11px", fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em" }}
                    >
                      Profile
                    </button>
                    {bookings.length > 0 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        style={{ background: "rgba(0,39,107,0.05)", color: "#7a9ab8", border: "none", padding: "7px 14px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                      >
                        {isExpanded ? "▲ Hide" : `▼ ${bookings.length} Booking${bookings.length > 1 ? "s" : ""}`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Booking list */}
                {isExpanded && bookings.length > 0 && (
                  <div style={{ borderTop: "1px solid rgba(0,39,107,0.06)", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ background: "rgba(0,39,107,0.03)" }}>
                          {["Reference","Type","Status","Tour / Service","Arrival","Total","Booked"].map(h => (
                            <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((b, i) => {
                          const ts_ = TYPE_STYLE[b._type] || TYPE_STYLE.mixed;
                          const ss_ = STATUS_STYLE[b._status] || STATUS_STYLE.cancelled;
                          return (
                            <tr key={b.id} style={{ borderBottom: "1px solid rgba(0,39,107,0.04)", background: i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.01)" }}>
                              <td style={{ padding: "8px 14px", color: "#adc6d8", fontSize: "11px" }}>{b.bookingReference || b.id}</td>
                              <td style={{ padding: "8px 14px" }}>
                                <span style={{ background: ts_.bg, color: ts_.color, fontSize: "9px", fontWeight: 700, padding: "1px 7px", textTransform: "uppercase" }}>
                                  {ts_.label}
                                </span>
                              </td>
                              <td style={{ padding: "8px 14px" }}>
                                <span style={{ background: ss_.bg, color: ss_.color, fontSize: "9px", fontWeight: 700, padding: "1px 7px", textTransform: "uppercase" }}>
                                  {b._status}
                                </span>
                              </td>
                              <td style={{ padding: "8px 14px", color: "#343a40", maxWidth: "180px" }}>{getTourName(b)}</td>
                              <td style={{ padding: "8px 14px", color: "#7a9ab8" }}>{b.arrivalDate || b["Traveler Details"]?.["Arrival Date"] || b.Travelers?.["Arrival Date"] || "—"}</td>
                              <td style={{ padding: "8px 14px", color: "#00276b", fontFamily: "'DM Serif Display', serif", fontSize: "14px" }}>{getPrice(b)}</td>
                              <td style={{ padding: "8px 14px", color: "#adc6d8" }}>{fmtDate(b.createdAt || b.bookedDateTime)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </UserManagement>
  );
}