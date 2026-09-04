// src/pages/admin/driverAndFleetManagement/VehicleStatistics.js
import React, { useEffect, useState } from "react";
import DriverAndFleetManagement from "../../../components/layouts/admin/DriverAndFleetManagement";
import {
  collection, onSnapshot, query, getDocs, where,
} from "firebase/firestore";
import { db } from "../../../firebase";

const fmtMoney = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmtDate  = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const pill = (bg, color, text) => (
  <span style={{ background: bg, color, fontSize: "9px", fontWeight: 700, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.06em", display: "inline-block" }}>
    {text}
  </span>
);

const SectionHeader = ({ title, sub }) => (
  <div style={{ background: "#00276b", padding: "10px 16px" }}>
    <span style={{ fontSize: "10px", fontWeight: 700, color: "#a8edff", letterSpacing: "0.12em", textTransform: "uppercase" }}>{title}</span>
    {sub && <span style={{ fontSize: "10px", color: "rgba(168,237,255,0.5)", marginLeft: "10px" }}>{sub}</span>}
  </div>
);

const COST_CATEGORIES = ["Fuel","Leasing Payment","Repair & Maintenance","Insurance Premium","Road Tax / Registration","Service Charge","Tires","Accident Repair","Other"];

export default function VehicleStatistics() {
  const [vehicles,     setVehicles]     = useState([]);
  const [vehicleCosts, setVehicleCosts] = useState([]);
  const [extPayments,  setExtPayments]  = useState([]);
  const [assignments,  setAssignments]  = useState({}); // vehicleId → [assignments]
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [sortBy,       setSortBy]       = useState("type");
  const [expandedId,   setExpandedId]   = useState(null);
  const [filterPool,   setFilterPool]   = useState("all");

  useEffect(() => {
    let allVehicles = [];
    let loadedCols  = 0;

    const handleSnap = (snap, pool) => {
      const fresh = snap.docs.map(d => ({ id: d.id, _pool: pool, ...d.data() }));
      allVehicles = [...allVehicles.filter(v => v._pool !== pool), ...fresh];
      loadedCols++;
      if (loadedCols >= 2) { setVehicles([...allVehicles]); setLoading(false); }
    };

    const u1 = onSnapshot(collection(db, "vehicleFleet"),     s => handleSnap(s, "internal"), () => { loadedCols++; });
    const u2 = onSnapshot(collection(db, "externalVehicles"), s => handleSnap(s, "external"), () => { loadedCols++; });
    const u3 = onSnapshot(collection(db, "financeVehicleCosts"),  s => setVehicleCosts(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    const u4 = onSnapshot(collection(db, "financeExternalPayments"), s => setExtPayments(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  /* Load schedules per vehicle */
  useEffect(() => {
    if (!vehicles.length) return;
    const map = {};
    let loaded = 0;
    vehicles.forEach(v => {
      getDocs(collection(db, "vehicleSchedules", v.id, "assignments"))
        .then(snap => {
          map[v.id] = snap.docs.map(a => ({ id: a.id, ...a.data() }));
          loaded++;
          if (loaded === vehicles.length) setAssignments({ ...map });
        }).catch(() => { loaded++; });
    });
  }, [vehicles]);

  /* Per-vehicle stats */
  const vehicleStats = vehicles.map(v => {
    const costs        = vehicleCosts.filter(c => c.vehicleId === v.id || c.vehicleName === v.registrationNumber);
    const extPays      = extPayments.filter(p => p.entityId === v.id);
    const assign       = assignments[v.id] || [];
    const completedA   = assign.filter(a => a.status === "completed");
    const activeA      = assign.filter(a => a.status === "active");

    const totalCosts   = costs.reduce((s, c) => s + (c.amount || 0), 0);
    const totalExtPays = extPays.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const totalRevenue = 0; /* Can be extended if revenue is tracked per vehicle */
    const totalTours   = completedA.length;

    const totalDaysAssigned = assign.reduce((s, a) => {
      if (!a.startDate || !a.endDate) return s;
      return s + Math.max(0, Math.ceil((new Date(a.endDate) - new Date(a.startDate)) / 86400000));
    }, 0);

    const byCat = COST_CATEGORIES.map(cat => ({
      cat, total: costs.filter(c => c.category === cat).reduce((s, c) => s + (c.amount || 0), 0),
    })).filter(x => x.total > 0);

    const latestCost = costs.sort((a, b) => {
      const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return db_ - da;
    })[0] || null;

    return {
      ...v, costs, extPays, assign, completedA, activeA,
      totalCosts, totalExtPays, totalTours, totalDaysAssigned, byCat, latestCost,
    };
  });

  const filtered = vehicleStats
    .filter(v => filterPool === "all" || v._pool === filterPool)
    .filter(v =>
      v.registrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicleType?.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicleModel?.toLowerCase().includes(search.toLowerCase()) ||
      v.id?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "type")   return (a.vehicleType || "").localeCompare(b.vehicleType || "");
      if (sortBy === "tours")  return b.totalTours - a.totalTours;
      if (sortBy === "cost")   return b.totalCosts - a.totalCosts;
      return 0;
    });

  /* Aggregate KPIs */
  const totalCostAll    = vehicleCosts.reduce((s, c) => s + (c.amount || 0), 0);
  const totalExtPayAll  = extPayments.reduce((s, p) => s + (p.totalAmount || 0), 0);
  const totalToursAll   = Object.values(assignments).reduce((s, arr) => s + arr.filter(a => a.status === "completed").length, 0);
  const activeNow       = Object.values(assignments).reduce((s, arr) => s + arr.filter(a => a.status === "active").length, 0);

  const byCatAll = COST_CATEGORIES.map(cat => ({
    cat, total: vehicleCosts.filter(c => c.category === cat).reduce((s, c) => s + (c.amount || 0), 0),
  })).filter(x => x.total > 0);

  const KPI = ({ label, value, color, sub }) => (
    <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", padding: "16px 18px", flex: 1, minWidth: "130px", borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: "10px", color: "#7a9ab8", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "4px" }}>{sub}</div>}
    </div>
  );

  return (
    <DriverAndFleetManagement pageTitle="Vehicle Statistics">
      <div style={{ marginBottom: "22px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>Vehicle Statistics</h3>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>{vehicles.length} vehicles total · Cost tracking and tour performance</p>
      </div>

      {/* Aggregate KPIs */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
        <KPI label="Internal Vehicles"  value={vehicles.filter(v => v._pool === "internal").length} color="#00276b" sub="Own fleet" />
        <KPI label="External Vehicles"  value={vehicles.filter(v => v._pool === "external").length} color="#0c447c" sub="Contracted" />
        <KPI label="Currently Active"   value={activeNow}                color="#27a86e" sub="On tour" />
        <KPI label="Total Vehicle Costs" value={fmtMoney(totalCostAll)}   color="#8B0000" sub="All time" />
        <KPI label="External Payments"  value={fmtMoney(totalExtPayAll)} color="#633806" sub="Paid out" />
        <KPI label="Tours Completed"    value={totalToursAll}             color="#7a9ab8" sub="By fleet" />
      </div>

      {/* Cost breakdown by category */}
      {byCatAll.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", marginBottom: "24px", overflow: "hidden" }}>
          <SectionHeader title="Fleet Cost Breakdown by Category" />
          <div style={{ padding: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {byCatAll.map(({ cat, total }) => (
              <div key={cat} style={{ background: "rgba(0,39,107,0.03)", border: "1px solid rgba(0,39,107,0.07)", padding: "10px 16px", minWidth: "130px" }}>
                <div style={{ fontSize: "10px", color: "#adc6d8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{cat}</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "18px", color: "#dc3545" }}>{fmtMoney(total)}</div>
                <div style={{ height: "3px", background: "#dc3545", marginTop: "6px", opacity: 0.3, width: `${Math.min(100, (total / totalCostAll) * 100)}%` }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px", alignItems: "center" }}>
        <input
          placeholder="Search by reg, type or model..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: "200px", padding: "8px 12px", border: "1.5px solid rgba(0,39,107,0.15)", fontSize: "12px", color: "#00276b", outline: "none" }}
        />
        <select value={filterPool} onChange={e => setFilterPool(e.target.value)} style={{ fontSize: "12px", padding: "8px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }}>
          <option value="all">All Vehicles</option>
          <option value="internal">Internal Only</option>
          <option value="external">External Only</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontSize: "12px", padding: "8px 10px", border: "1px solid rgba(0,39,107,0.15)", color: "#00276b", borderRadius: "4px" }}>
          <option value="type">Sort by Type</option>
          <option value="tours">Sort by Tours</option>
          <option value="cost">Sort by Cost</option>
        </select>
        <span style={{ fontSize: "12px", color: "#7a9ab8" }}>{filtered.length} vehicles</span>
      </div>

      {loading ? (
        <p style={{ color: "#7a9ab8" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#adc6d8" }}>
          <div style={{ fontSize: "40px", opacity: 0.15, marginBottom: "12px" }}>🚐</div>
          <p>No vehicles found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map(v => {
            const isExpanded = expandedId === v.id;
            return (
              <div key={v.id} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                <div style={{ height: "3px", background: v.activeA.length > 0 ? "#27a86e" : "#adc6d8" }} />

                <div style={{ padding: "14px 18px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                  {/* Photo */}
                  {v.photos?.[0]
                    ? <img src={v.photos[0]} alt="" style={{ width: "72px", height: "52px", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(0,39,107,0.08)" }} />
                    : <div style={{ width: "72px", height: "52px", background: "rgba(0,39,107,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "22px" }}>🚐</div>
                  }

                  {/* Identity */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "5px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#00276b" }}>{v.vehicleType}</span>
                      <span style={{ fontSize: "12px", color: "#7a9ab8" }}>{v.vehicleModel} · {v.vehicleMake}</span>
                      <span style={{ fontSize: "10px", color: "#adc6d8" }}>{v.id}</span>
                      {v._pool === "internal" ? pill("#e6f1fb", "#0c447c", "Internal") : pill("#faeeda", "#633806", "External")}
                      {v.activeA.length > 0 ? pill("#e1f5ee", "#085041", "On Tour") : pill("rgba(0,39,107,0.05)", "#adc6d8", "Available")}
                    </div>
                    <div style={{ fontSize: "12px", color: "#7a9ab8" }}>{v.registrationNumber} · {v.minimumSeatCount}–{v.maximumSeatCount} seats</div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0 20px", textAlign: "center" }}>
                    {[
                      ["Tours",     v.totalTours,               "#00276b"],
                      ["Days Used", v.totalDaysAssigned + "d",  "#0c447c"],
                      ["Costs",     fmtMoney(v.totalCosts),     "#dc3545"],
                      ["Ext. Pays", fmtMoney(v.totalExtPays),   "#633806"],
                    ].map(([label, value, color]) => (
                      <div key={label}>
                        <div style={{ fontSize: "9px", color: "#adc6d8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>{label}</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : v.id)}
                    style={{ background: "rgba(0,39,107,0.05)", border: "none", color: "#7a9ab8", fontSize: "11px", padding: "6px 14px", cursor: "pointer", fontWeight: 700 }}
                  >
                    {isExpanded ? "▲ Hide" : "▼ Details"}
                  </button>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid rgba(0,39,107,0.06)", padding: "20px 18px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>

                      {/* Vehicle Details */}
                      <div style={{ border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                        <SectionHeader title="Vehicle Details" />
                        <div style={{ padding: "12px" }}>
                          {[
                            ["Vehicle ID",     v.id],
                            ["Type",           v.vehicleType],
                            ["Make & Model",   `${v.vehicleMake} ${v.vehicleModel}`],
                            ["Year",           v.manufactureYear],
                            ["Plate No.",      v.registrationNumber],
                            ["Owner",          v.ownerName],
                            ["Contact",        v.ownerContact],
                            ["Seat Range",     `${v.minimumSeatCount}–${v.maximumSeatCount}`],
                            ["Pool",           v._pool === "internal" ? "Internal Fleet" : "External / Contracted"],
                          ].map(([label, value]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(0,39,107,0.04)", fontSize: "12px" }}>
                              <span style={{ color: "#adc6d8" }}>{label}</span>
                              <span style={{ color: "#00276b", fontWeight: 500 }}>{value || "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cost by Category */}
                      <div style={{ border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                        <SectionHeader title="Costs by Category" sub={`${v.costs.length} records`} />
                        <div style={{ padding: "12px" }}>
                          {v.byCat.length === 0
                            ? <p style={{ color: "#adc6d8", fontSize: "12px", margin: 0 }}>No cost records.</p>
                            : v.byCat.map(({ cat, total }) => (
                              <div key={cat} style={{ marginBottom: "8px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                                  <span style={{ color: "#7a9ab8" }}>{cat}</span>
                                  <span style={{ color: "#dc3545", fontWeight: 600 }}>{fmtMoney(total)}</span>
                                </div>
                                <div style={{ height: "3px", background: "rgba(220,53,69,0.12)", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${v.totalCosts > 0 ? (total / v.totalCosts) * 100 : 0}%`, background: "#dc3545" }} />
                                </div>
                              </div>
                            ))
                          }
                          <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(0,39,107,0.07)", display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                            <span style={{ color: "#7a9ab8", fontWeight: 700 }}>Total Costs</span>
                            <span style={{ color: "#8B0000", fontWeight: 700, fontFamily: "'DM Serif Display', serif", fontSize: "16px" }}>{fmtMoney(v.totalCosts)}</span>
                          </div>
                          {v.latestCost && (
                            <div style={{ fontSize: "11px", color: "#adc6d8", marginTop: "6px" }}>
                              Last cost: {fmtDate(v.latestCost.createdAt)} · {v.latestCost.category}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tour & Assignment History */}
                      <div style={{ border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
                        <SectionHeader title="Tour Performance" sub={`${v.assign.length} assignments`} />
                        <div style={{ padding: "12px" }}>
                          {[
                            ["Completed Tours",  v.completedA.length, "#27a86e"],
                            ["Active Tours",     v.activeA.length,    "#00276b"],
                            ["Total Assignments",v.assign.length,     "#7a9ab8"],
                            ["Total Days Used",  v.totalDaysAssigned + " days", "#0c447c"],
                          ].map(([label, value, color]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(0,39,107,0.04)", fontSize: "12px" }}>
                              <span style={{ color: "#7a9ab8" }}>{label}</span>
                              <span style={{ color, fontWeight: 600 }}>{value}</span>
                            </div>
                          ))}

                          {/* Recent assignments */}
                          {v.assign.slice(0, 3).map(a => (
                            <div key={a.id} style={{ marginTop: "6px", padding: "6px 8px", background: "rgba(0,39,107,0.02)", border: "1px solid rgba(0,39,107,0.05)", fontSize: "11px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#343a40" }}>{a.bookingReference || a.bookingId || a.id}</span>
                                <span style={{
                                  color: a.status === "completed" ? "#27a86e" : a.status === "active" ? "#00276b" : "#adc6d8",
                                  fontWeight: 700,
                                }}>
                                  {a.status}
                                </span>
                              </div>
                              {a.startDate && (
                                <div style={{ color: "#adc6d8", marginTop: "2px" }}>{a.startDate} → {a.endDate || "ongoing"}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Photos strip */}
                    {v.photos?.length > 0 && (
                      <div style={{ marginTop: "16px" }}>
                        <div style={{ fontSize: "10px", color: "#adc6d8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Photos</div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {v.photos.map((url, i) => (
                            <img key={i} src={url} alt="" style={{ height: "80px", width: "120px", objectFit: "cover", border: "1px solid rgba(0,39,107,0.08)" }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DriverAndFleetManagement>
  );
}