// src/components/modals/general/ViewCustomerModal.js
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase";

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtMoney = (n) => n != null ? `$${Number(n).toFixed(2)}` : "—";

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

const BOOKING_COLS = [
  { col: "unpaidPresetBookings",     type: "preset",  status: "unpaid"    },
  { col: "unpaidCustomBookings",     type: "custom",  status: "unpaid"    },
  { col: "unpaidVehicleBookings",    type: "vehicle", status: "unpaid"    },
  { col: "paidPresetBookings",       type: "preset",  status: "paid"      },
  { col: "paidCustomBookings",       type: "custom",  status: "paid"      },
  { col: "paidVehicleBookings",      type: "vehicle", status: "paid"      },
  { col: "confirmedPresetBookings",  type: "preset",  status: "confirmed" },
  { col: "confirmedCustomBookings",  type: "custom",  status: "confirmed" },
  { col: "confirmedVehicleBookings", type: "vehicle", status: "confirmed" },
  { col: "completedPresetBookings",  type: "preset",  status: "completed" },
  { col: "completedCustomBookings",  type: "custom",  status: "completed" },
  { col: "completedVehicleBookings", type: "vehicle", status: "completed" },
  { col: "cancelledBookings",        type: "mixed",   status: "cancelled" },
];

const TYPE_STYLE = {
  preset:  { bg: "#e6f1fb", color: "#0c447c", label: "Preset"   },
  custom:  { bg: "#e1f5ee", color: "#085041", label: "Custom"   },
  vehicle: { bg: "#faeeda", color: "#633806", label: "Vehicle"  },
  mixed:   { bg: "#f1f3f5", color: "#6c757d", label: "Booking"  },
};
const STATUS_STYLE = {
  unpaid:    { bg: "#fcebeb", color: "#791f1f" },
  paid:      { bg: "#faeeda", color: "#633806" },
  confirmed: { bg: "#e6f1fb", color: "#0c447c" },
  completed: { bg: "#e1f5ee", color: "#085041" },
  cancelled: { bg: "#f1f3f5", color: "#6c757d" },
};

const SectionTitle = ({ title }) => (
  <div style={{ background: "#00276b", padding: "9px 16px", marginBottom: "0" }}>
    <span style={{ fontSize: "10px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>{title}</span>
  </div>
);

const InfoRow = ({ label, value }) => value ? (
  <div style={{ display: "flex", padding: "7px 0", borderBottom: "1px solid rgba(0,39,107,0.04)", gap: "12px" }}>
    <span style={{ fontSize: "11px", color: "#adc6d8", minWidth: "130px", flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: "12px", color: "#343a40", fontWeight: 500 }}>{value}</span>
  </div>
) : null;

export default function ViewCustomerModal({ show, onHide, customer }) {
  const [bookings,     setBookings]     = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [activeTab,    setActiveTab]    = useState("profile");

  useEffect(() => {
    if (!show || !customer?.email) return;
    setBookings([]);
    setLoadingBooks(true);

    let all = [];
    let loaded = 0;

    BOOKING_COLS.forEach(({ col, type, status }) => {
      getDocs(query(collection(db, col), where("customerEmail", "==", customer.email)))
        .then(snap => {
          snap.docs.forEach(d => all.push({ id: d.id, _type: type, _status: status, ...d.data() }));
          loaded++;
          if (loaded === BOOKING_COLS.length) {
            all.sort((a, b) => {
              const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
              const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
              return db_ - da;
            });
            setBookings(all);
            setLoadingBooks(false);
          }
        }).catch(() => { loaded++; if (loaded === BOOKING_COLS.length) setLoadingBooks(false); });
    });
  }, [show, customer?.email]);

  if (!show || !customer) return null;

  const completion   = calcCompletion(customer);
  const initials     = `${customer.firstName?.[0] || ""}${customer.lastName?.[0] || ""}` || "?";
  const fullName     = `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "—";
  const completed    = bookings.filter(b => b._status === "completed").length;
  const active       = bookings.filter(b => b._status === "confirmed").length;

  const getTourName = (b) => {
    if (b._type === "vehicle") return "Vehicle Reservation";
    if (b._type === "custom")  return b["Tour Selection"]?.Tour || "Custom Tour";
    return b["Tour Info"]?.Tour || b.tourName || "Preset Tour";
  };

  const tabStyle = (t) => ({
    padding: "8px 18px", fontSize: "11px", fontWeight: 600, cursor: "pointer",
    border: "none", background: activeTab === t ? "#EFFAFD" : "transparent",
    color:  activeTab === t ? "#00276b" : "rgba(255,255,255,0.6)",
    borderRadius: activeTab === t ? "4px 4px 0 0" : "0",
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.48)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        background: "#fff", width: "760px", maxWidth: "96vw",
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* ── Header / Hero ── */}
        <div style={{ background: "#00276b", padding: "20px 24px 0", position: "relative", overflow: "hidden", flexShrink: 0 }}>
          {/* Dot pattern */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />

          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", position: "relative" }}>
            {/* Avatar */}
            <div style={{
              width: "60px", height: "60px", borderRadius: "50%",
              background: "rgba(168,237,255,0.15)", border: "2px solid rgba(168,237,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "22px", fontWeight: 700, color: "#a8edff",
              flexShrink: 0, fontFamily: "'DM Serif Display', serif",
            }}>
              {initials}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "20px", color: "#fff", marginBottom: "2px" }}>{fullName}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", marginBottom: "12px" }}>
                {customer.email}
                {customer.nationality && ` · ${customer.nationality}`}
                {customer.travelStyle && ` · ${customer.travelStyle}`}
              </div>

              {/* Quick stats */}
              <div style={{ display: "flex", gap: "20px", marginBottom: "16px" }}>
                {[
                  ["Bookings", bookings.length, "#a8edff"],
                  ["Completed", completed, "#27a86e"],
                  ["Active", active, "#56c6e8"],
                  ["Profile", `${completion}%`, completion === 100 ? "#27a86e" : "#fac775"],
                ].map(([label, value, color]) => (
                  <div key={label}>
                    <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>{label}</div>
                    <div style={{ fontSize: "18px", fontFamily: "'DM Serif Display', serif", color, lineHeight: 1 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Close */}
            <button onClick={onHide} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "20px", padding: "0", lineHeight: 1 }}>✕</button>
          </div>

          {/* Completion bar */}
          <div style={{ marginBottom: "0", position: "relative" }}>
            <div style={{ height: "3px", background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${completion}%`, background: completion === 100 ? "#27a86e" : "linear-gradient(90deg, #a8edff, #56c6e8)", transition: "width 0.8s ease" }} />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "4px", marginTop: "12px" }}>
            {[
              { key: "profile",    label: "Profile"      },
              { key: "travel",     label: "Preferences"  },
              { key: "emergency",  label: "Emergency"    },
              { key: "bookings",   label: `Bookings (${bookings.length})` },
            ].map(t => (
              <button key={t.key} style={tabStyle(t.key)} onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── Profile tab ── */}
          {activeTab === "profile" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Personal */}
                <div style={{ border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                  <SectionTitle title="Personal Information" />
                  <div style={{ padding: "12px 16px" }}>
                    <InfoRow label="Full Name"       value={fullName} />
                    <InfoRow label="Email"           value={customer.email} />
                    <InfoRow label="Phone"           value={customer.contact} />
                    <InfoRow label="Date of Birth"   value={customer.dateOfBirth} />
                    <InfoRow label="Nationality"     value={customer.nationality} />
                    <InfoRow label="Passport No."    value={customer.passportNumber} />
                    <InfoRow label="Passport Expiry" value={customer.passportExpiry} />
                    <InfoRow label="Member Since"    value={fmtDate(customer.createdAt)} />
                  </div>
                </div>

                {/* Address + Account */}
                <div>
                  <div style={{ border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden", marginBottom: "14px" }}>
                    <SectionTitle title="Address" />
                    <div style={{ padding: "12px 16px" }}>
                      <InfoRow label="Address"    value={customer.address} />
                      <InfoRow label="City"       value={customer.city} />
                      <InfoRow label="Country"    value={customer.country} />
                      <InfoRow label="Postal Code"value={customer.postalCode} />
                    </div>
                  </div>

                  {/* Completion checklist */}
                  <div style={{ border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                    <SectionTitle title="Profile Completion" />
                    <div style={{ padding: "10px 14px" }}>
                      {COMPLETION_FIELDS.map(f => {
                        const done = customer[f.key] && String(customer[f.key]).trim() !== "";
                        return (
                          <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(0,39,107,0.04)" }}>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <span style={{ fontSize: "12px", color: done ? "#27a86e" : "#dc3545" }}>{done ? "✓" : "✕"}</span>
                              <span style={{ fontSize: "11px", color: done ? "#085041" : "#7a9ab8" }}>{f.label}</span>
                            </div>
                            <span style={{ fontSize: "10px", color: done ? "#27a86e" : "#adc6d8", fontWeight: 700 }}>+{f.weight}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {customer.bio && (
                <div style={{ marginTop: "14px", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                  <SectionTitle title="About" />
                  <div style={{ padding: "14px 16px", fontSize: "13px", color: "#343a40", lineHeight: 1.6 }}>{customer.bio}</div>
                </div>
              )}
            </>
          )}

          {/* ── Travel Preferences tab ── */}
          {activeTab === "travel" && (
            <div style={{ border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
              <SectionTitle title="Travel Preferences" />
              <div style={{ padding: "14px 16px" }}>
                <InfoRow label="Travel Style"     value={customer.travelStyle} />
                <InfoRow label="Dietary Needs"    value={customer.dietaryNeeds} />
                <InfoRow label="Accommodation"    value={customer.accommodationPref} />
                <InfoRow label="Transport Pref."  value={customer.transportPref} />
                <InfoRow label="Interests"        value={customer.interests} />
                <InfoRow label="Countries Visited"value={customer.countriesVisited} />
                <InfoRow label="Travel Frequency" value={customer.travelFrequency} />
                <InfoRow label="Special Requests" value={customer.specialRequests} />
              </div>
            </div>
          )}

          {/* ── Emergency tab ── */}
          {activeTab === "emergency" && (
            <div style={{ border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
              <SectionTitle title="Emergency Contact" />
              <div style={{ padding: "14px 16px" }}>
                {(!customer.emergencyName && !customer.emergencyContact) ? (
                  <p style={{ color: "#adc6d8", fontSize: "13px", margin: 0 }}>No emergency contact on file.</p>
                ) : (
                  <>
                    <InfoRow label="Full Name"   value={customer.emergencyName} />
                    <InfoRow label="Relationship"value={customer.emergencyRelation} />
                    <InfoRow label="Phone"       value={customer.emergencyContact} />
                    <InfoRow label="Email"       value={customer.emergencyEmail} />
                    <InfoRow label="Country"     value={customer.emergencyCountry} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Bookings tab ── */}
          {activeTab === "bookings" && (
            <div style={{ border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
              <SectionTitle title={`Booking History (${bookings.length})`} />
              {loadingBooks ? (
                <p style={{ padding: "20px", color: "#adc6d8", fontSize: "12px" }}>Loading bookings...</p>
              ) : bookings.length === 0 ? (
                <p style={{ padding: "20px", color: "#adc6d8", fontSize: "12px" }}>No bookings found for this customer.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ background: "rgba(0,39,107,0.03)" }}>
                        {["Reference","Type","Status","Tour / Service","Arrival","Booked On"].map(h => (
                          <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#7a9ab8", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b, i) => {
                        const ts_ = TYPE_STYLE[b._type] || TYPE_STYLE.mixed;
                        const ss_ = STATUS_STYLE[b._status] || STATUS_STYLE.cancelled;
                        return (
                          <tr key={b.id} style={{ borderBottom: "1px solid rgba(0,39,107,0.04)", background: i % 2 === 0 ? "#fff" : "rgba(0,39,107,0.01)" }}>
                            <td style={{ padding: "9px 14px", color: "#adc6d8", fontSize: "11px" }}>{b.bookingReference || b.id?.slice(0, 12) + "..."}</td>
                            <td style={{ padding: "9px 14px" }}>
                              <span style={{ background: ts_.bg, color: ts_.color, fontSize: "9px", fontWeight: 700, padding: "1px 7px", textTransform: "uppercase" }}>{ts_.label}</span>
                            </td>
                            <td style={{ padding: "9px 14px" }}>
                              <span style={{ background: ss_.bg, color: ss_.color, fontSize: "9px", fontWeight: 700, padding: "1px 7px", textTransform: "uppercase" }}>{b._status}</span>
                            </td>
                            <td style={{ padding: "9px 14px", color: "#343a40", maxWidth: "180px" }}>{getTourName(b)}</td>
                            <td style={{ padding: "9px 14px", color: "#7a9ab8" }}>
                              {b.arrivalDate || b["Traveler Details"]?.["Arrival Date"] || b.Travelers?.["Arrival Date"] || "—"}
                            </td>
                            <td style={{ padding: "9px 14px", color: "#adc6d8" }}>{fmtDate(b.createdAt || b.bookedDateTime)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: "1px solid rgba(0,39,107,0.07)", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "#fafafa" }}>
          <div style={{ fontSize: "11px", color: "#adc6d8" }}>
            Customer ID: {customer.id} · Last updated: {fmtDate(customer.updatedAt)}
          </div>
          <button onClick={onHide} style={{ background: "rgba(0,39,107,0.08)", border: "none", color: "#00276b", fontSize: "12px", fontWeight: 700, padding: "8px 20px", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}