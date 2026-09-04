// src/pages/admin/driverAndFleetManagement/FleetDashboard.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DriverAndFleetManagement from "../../../components/layouts/admin/DriverAndFleetManagement";
import {
  collection, onSnapshot, query, where, getDocs,
} from "firebase/firestore";
import { db } from "../../../firebase";

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

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

export default function FleetDashboard() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ internal: 0, external: 0, intVehicles: 0, extVehicles: 0, assigned: 0, idling: 0 });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [drivers,  setDrivers]  = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [pendingAdv, setPendingAdv] = useState(0);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "drivers"),          s => { setCounts(p => ({ ...p, internal: s.size })); setDrivers(s.docs.map(d => ({ id: d.id, ...d.data(), _pool: "internal" }))); }, () => {});
    const u2 = onSnapshot(collection(db, "externalDrivers"),  s => setCounts(p => ({ ...p, external: s.size })), () => {});
    const u3 = onSnapshot(collection(db, "vehicleFleet"),     s => { setCounts(p => ({ ...p, intVehicles: s.size })); setVehicles(s.docs.map(d => ({ id: d.id, ...d.data(), _pool: "internal" }))); }, () => {});
    const u4 = onSnapshot(collection(db, "externalVehicles"), s => setCounts(p => ({ ...p, extVehicles: s.size })), () => {});
    const u5 = onSnapshot(query(collection(db, "financeDriverAdvances"), where("status", "==", "pending_settlement")), s => setPendingAdv(s.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0)), () => {});
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  /* Compute assigned vs idling from driverSchedules */
  useEffect(() => {
    if (!drivers.length) return;
    let assigned = 0;
    let checked  = 0;
    drivers.forEach(d => {
      getDocs(query(collection(db, "driverSchedules", d.id, "assignments"), where("status", "==", "active")))
        .then(snap => {
          if (snap.size > 0) assigned++;
          checked++;
          if (checked === drivers.length) {
            setCounts(p => ({ ...p, assigned, idling: drivers.length - assigned }));
          }
        }).catch(() => { checked++; });
    });
  }, [drivers]);

  /* Recent 6 drivers */
  const recentDrivers = drivers.slice(0, 6);
  const recentVehicles = vehicles.slice(0, 6);

  const DriverRow = ({ d }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderBottom: "1px solid rgba(0,39,107,0.05)" }}>
      <img
        src={d.photo || "/images/default-user.png"}
        alt=""
        style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,39,107,0.1)", flexShrink: 0 }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#00276b" }}>{d.title} {d.callingName}</div>
        <div style={{ fontSize: "11px", color: "#adc6d8" }}>{d.id} · {d.mobile}</div>
      </div>
    </div>
  );

  const VehicleRow = ({ v }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderBottom: "1px solid rgba(0,39,107,0.05)" }}>
      {v.photos?.[0]
        ? <img src={v.photos[0]} alt="" style={{ width: "48px", height: "36px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} />
        : <div style={{ width: "48px", height: "36px", background: "rgba(0,39,107,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "18px" }}>🚐</div>
      }
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#00276b" }}>{v.vehicleType} · {v.vehicleModel}</div>
        <div style={{ fontSize: "11px", color: "#adc6d8" }}>{v.id} · {v.registrationNumber}</div>
      </div>
    </div>
  );

  return (
    <DriverAndFleetManagement pageTitle="Fleet Dashboard">

      <div style={{ marginBottom: "22px" }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: "0 0 4px" }}>Fleet Overview</h3>
        <p style={{ fontSize: "13px", color: "#7a9ab8", margin: 0 }}>Live snapshot of all drivers and vehicles</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
        <KPI label="Internal Drivers"   value={counts.internal}    color="#00276b" sub="On payroll"       onClick={() => navigate("/admin/fleet/internaldriversandvehicles")} />
        <KPI label="External Drivers"   value={counts.external}    color="#0c447c" sub="Contracted"       onClick={() => navigate("/admin/fleet/externaldriversandvehicles")} />
        <KPI label="Internal Vehicles"  value={counts.intVehicles} color="#085041" sub="Own fleet"        onClick={() => navigate("/admin/fleet/internaldriversandvehicles")} />
        <KPI label="External Vehicles"  value={counts.extVehicles} color="#633806" sub="Hired in"         onClick={() => navigate("/admin/fleet/externaldriversandvehicles")} />
        <KPI label="Currently Assigned" value={counts.assigned}    color="#27a86e" sub="Active tours"     onClick={() => navigate("/admin/fleet/driver-statistics")} />
        <KPI label="Currently Idling"   value={counts.idling}      color="#adc6d8" sub="Available"        onClick={() => navigate("/admin/fleet/driver-statistics")} />
      </div>

      {/* Pending advances alert */}
      {pendingAdv > 0 && (
        <div style={{ background: "#faeeda", border: "1px solid rgba(253,174,0,0.3)", padding: "12px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "13px", color: "#633806" }}>
            ⚠ <strong>Unsettled cash advances: ${pendingAdv.toFixed(2)}</strong> — action required.
          </div>
          <button
            onClick={() => navigate("/admin/finance/payroll")}
            style={{ background: "#633806", color: "#faeeda", border: "none", fontSize: "11px", fontWeight: 700, padding: "6px 14px", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Review →
          </button>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
          <SectionHeader title="Internal Drivers" count={counts.internal} action={() => navigate("/admin/fleet/internaldriversandvehicles")} actionLabel="Manage →" />
          {recentDrivers.length === 0
            ? <p style={{ padding: "20px", color: "#adc6d8", fontSize: "12px" }}>No internal drivers registered.</p>
            : recentDrivers.map(d => <DriverRow key={d.id} d={d} />)
          }
        </div>
        <div style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.07)", overflow: "hidden" }}>
          <SectionHeader title="Internal Fleet" count={counts.intVehicles} action={() => navigate("/admin/fleet/internaldriversandvehicles")} actionLabel="Manage →" />
          {recentVehicles.length === 0
            ? <p style={{ padding: "20px", color: "#adc6d8", fontSize: "12px" }}>No vehicles in fleet.</p>
            : recentVehicles.map(v => <VehicleRow key={v.id} v={v} />)
          }
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
        {[
          { label: "Manage Internal Fleet",    path: "/admin/fleet/internaldriversandvehicles",  color: "#00276b" },
          { label: "Manage External Fleet",    path: "/admin/fleet/externaldriversandvehicles",  color: "#0c447c" },
          { label: "Driver Statistics",        path: "/admin/fleet/driver-statistics",            color: "#085041" },
          { label: "Vehicle Statistics",       path: "/admin/fleet/vehicle-statistics",           color: "#633806" },
        ].map(({ label, path, color }) => (
          <button key={label} onClick={() => navigate(path)} style={{ background: color, color: "#fff", border: "none", padding: "10px 20px", fontSize: "11px", fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {label}
          </button>
        ))}
      </div>
    </DriverAndFleetManagement>
  );
}