// src/pages/admin/driverAndFleetManagement/internalDriversAndVehicles/InternalDriversAndVehicleLayout.js
import React, { useState } from "react";
import DriverAndFleetManagement from "../../../../components/layouts/admin/DriverAndFleetManagement";
import ViewDriver   from "./ViewDriver";
import CreateDriver from "./CreateDriver";
import ViewVehicle  from "./ViewVehicle";
import CreateVehicle from "./CreateVehicle";

const mainTabStyle = (active) => ({
  padding: "10px 24px", fontSize: "12px", fontWeight: 700,
  cursor: "pointer", border: "none", background: "none",
  color: active ? "#00276b" : "#7a9ab8",
  borderBottom: active ? "3px solid #00276b" : "3px solid transparent",
  marginBottom: "-2px", letterSpacing: "0.06em", textTransform: "uppercase",
  transition: "0.15s",
});

const subTabStyle = (active) => ({
  padding: "8px 18px", fontSize: "11px", fontWeight: 700,
  cursor: "pointer",
  border: "1px solid",
  borderColor: active ? "#00276b" : "rgba(0,39,107,0.15)",
  background: active ? "#00276b" : "#fff",
  color: active ? "#fff" : "#7a9ab8",
  marginRight: "6px", letterSpacing: "0.06em", textTransform: "uppercase",
  transition: "0.15s",
});

export default function InternalDriversAndVehicleLayout() {
  const [mainTab, setMainTab] = useState("drivers");

  return (
    <DriverAndFleetManagement>
      <div className="dfm-root">

        {/* Page heading */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <h4 style={{ fontFamily: "'DM Serif Display', serif", color: "#00276b", fontWeight: 400, margin: 0 }}>
            Internal Drivers &amp; Vehicles
          </h4>
          <span style={{ background: "#e6f1fb", color: "#0c447c", fontSize: "10px", fontWeight: 700, padding: "2px 10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            INTERNAL
          </span>
        </div>

        {/* Main tabs */}
        <div style={{ display: "flex", borderBottom: "2px solid rgba(0,39,107,0.1)", marginBottom: "24px" }}>
          <button style={mainTabStyle(mainTab === "drivers")}  onClick={() => setMainTab("drivers")}>Drivers</button>
          <button style={mainTabStyle(mainTab === "vehicles")} onClick={() => setMainTab("vehicles")}>Vehicles</button>
        </div>

        {mainTab === "drivers"  && <DriverTabs />}
        {mainTab === "vehicles" && <VehicleTabs />}
      </div>
    </DriverAndFleetManagement>
  );
}

function DriverTabs() {
  const [tab, setTab] = useState("view");
  return (
    <>
      <div style={{ display: "flex", marginBottom: "20px" }}>
        <button style={subTabStyle(tab === "view")}   onClick={() => setTab("view")}>View Drivers</button>
        <button style={subTabStyle(tab === "create")} onClick={() => setTab("create")}>+ Add Driver</button>
      </div>
      {tab === "view"   && <ViewDriver   collection="drivers"      storageFolder="drivers"      />}
      {tab === "create" && <CreateDriver collection="drivers"      storageFolder="drivers"      idPrefix="DRV-E" counterKey="drivers"         onCreated={() => setTab("view")} />}
    </>
  );
}

function VehicleTabs() {
  const [tab, setTab] = useState("view");
  return (
    <>
      <div style={{ display: "flex", marginBottom: "20px" }}>
        <button style={subTabStyle(tab === "view")}   onClick={() => setTab("view")}>View Vehicles</button>
        <button style={subTabStyle(tab === "create")} onClick={() => setTab("create")}>+ Add Vehicle</button>
      </div>
      {tab === "view"   && <ViewVehicle   collection="vehicleFleet" storageFolder="vehicleFleet"  />}
      {tab === "create" && <CreateVehicle collection="vehicleFleet" storageFolder="vehicleFleet"  idPrefix="VEH-E" counterKey="internalVehicles" onCreated={() => setTab("view")} />}
    </>
  );
}