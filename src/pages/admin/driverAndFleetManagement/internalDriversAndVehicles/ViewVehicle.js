// src/pages/admin/driverAndFleetManagement/internalDriversAndVehicles/ViewVehicle.js
import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc, updateDoc, getDocs } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../../../../firebase";
import ViewVehicleModal         from "../../../../components/modals/general/ViewVehicleModal";
import EditVehicle              from "../../../../components/modals/adminModals/driverAndFleetManagementModals/EditVehicle";
import DeleteConfirmationModal  from "../../../../components/modals/general/GeneralDeleteConfirmationModal";
import ViewVehicleScheduleModal from "../../../../components/modals/adminModals/driverAndFleetManagementModals/ViewVehicleScheduleModal";

const Btn = ({ onClick, bg, color, border, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: disabled ? "rgba(0,39,107,0.04)" : bg,
      color:      disabled ? "#adc6d8" : color,
      border:     `1px solid ${disabled ? "rgba(0,39,107,0.08)" : border}`,
      fontSize: "10px", fontWeight: 700, padding: "5px 10px",
      cursor: disabled ? "not-allowed" : "pointer",
      letterSpacing: "0.04em", textTransform: "uppercase",
      opacity: disabled ? 0.6 : 1,
    }}
  >
    {children}
  </button>
);

export default function ViewVehicle({ collection: col, storageFolder }) {
  const [vehicles,      setVehicles]      = useState([]);
  const [vehicleTypes,  setVehicleTypes]  = useState([]);
  const [search,        setSearch]        = useState("");
  const [selected,      setSelected]      = useState(null);
  const [showView,      setShowView]      = useState(false);
  const [showEdit,      setShowEdit]      = useState(false);
  const [showDelete,    setShowDelete]    = useState(false);
  const [showSchedule,  setShowSchedule]  = useState(false);
  const [loading,       setLoading]       = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, col), snap =>
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    getDocs(collection(db, "vehicles")).then(snap =>
      setVehicleTypes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [col]);

  const handleDelete = async () => {
    setLoading(true);
    try {
      for (let i = 1; i <= 4; i++) {
        try { await deleteObject(ref(storage, `${storageFolder}/${selected.id}/photo_${i}`)); }
        catch (e) { if (e.code !== "storage/object-not-found") console.warn(e); }
      }
      await deleteDoc(doc(db, col, selected.id));
      setShowDelete(false);
    } catch (e) { alert("Delete failed: " + e.message); }
    finally { setLoading(false); }
  };

  const handleEditSave = async (data) => {
    await updateDoc(doc(db, col, selected.id), data);
    setShowEdit(false);
  };

  const filtered = vehicles.filter(v =>
    v.registrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
    v.vehicleModel?.toLowerCase().includes(search.toLowerCase()) ||
    v.vehicleType?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Search */}
      <div style={{ marginBottom: "14px" }}>
        <input
          placeholder="Search by registration, model or type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "9px 12px",
            border: "1.5px solid rgba(0,39,107,0.15)",
            fontSize: "13px", color: "#00276b",
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
        {filtered.map(v => (
          <div key={v.id} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.08)", overflow: "hidden" }}>

            {/* Primary photo */}
            {v.photos?.[0]
              ? <img src={v.photos[0]} alt="Vehicle" style={{ width: "100%", height: "160px", objectFit: "cover", display: "block" }} />
              : <div style={{ width: "100%", height: "160px", background: "rgba(0,39,107,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "12px", color: "#adc6d8" }}>No photo</span>
                </div>
            }

            {/* Thumbnail strip */}
            {v.photos?.length > 1 && (
              <div style={{ display: "flex", gap: "2px", padding: "2px", background: "rgba(0,39,107,0.03)" }}>
                {v.photos.slice(1).map((url, i) => (
                  <img key={i} src={url} alt="" style={{ flex: 1, height: "36px", objectFit: "cover" }} />
                ))}
              </div>
            )}

            {/* Info */}
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#00276b" }}>{v.vehicleType}</div>
                <span style={{ background: "#00276b", color: "#a8edff", fontSize: "9px", fontWeight: 700, padding: "2px 8px", letterSpacing: "0.08em" }}>
                  {v.id}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#7a9ab8", marginBottom: "10px" }}>
                {v.vehicleModel} · {v.vehicleMake}
              </div>

              {[
                ["Reg.",    v.registrationNumber],
                ["Owner",   v.ownerName],
                ["Contact", v.ownerContact],
                ["Seats",   `${v.minimumSeatCount}–${v.maximumSeatCount}`],
                ["Year",    v.manufactureYear],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: "8px", marginBottom: "3px" }}>
                  <span style={{ fontSize: "11px", color: "#adc6d8", minWidth: "52px" }}>{label}</span>
                  <span style={{ fontSize: "11px", color: "#495057" }}>{value || "—"}</span>
                </div>
              ))}

              <div style={{ borderTop: "1px solid rgba(0,39,107,0.06)", marginTop: "12px", paddingTop: "12px" }}>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "5px" }}>
                  <Btn onClick={() => { setSelected(v); setShowView(true); }}     bg="#00276b" color="#fff"     border="#00276b">View</Btn>
                  <Btn onClick={() => { setSelected(v); setShowEdit(true); }}     bg="#EFFAFD" color="#00276b" border="rgba(0,39,107,0.2)">Edit</Btn>
                  <Btn onClick={() => { setSelected(v); setShowSchedule(true); }} bg="#EFFAFD" color="#00276b" border="rgba(0,39,107,0.2)">Schedule</Btn>
                </div>
                <div style={{ display: "flex", gap: "5px" }}>
                  <Btn onClick={() => { setSelected(v); setShowDelete(true); }} bg="#fcebeb" color="#791f1f" border="rgba(220,53,69,0.2)">Delete</Btn>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && <p style={{ color: "#adc6d8", fontSize: "13px" }}>No vehicles found.</p>}
      </div>

      <ViewVehicleModal         show={showView}     onHide={() => setShowView(false)}     vehicle={selected} />
      <EditVehicle              show={showEdit}     onHide={() => setShowEdit(false)}     vehicle={selected} vehicleTypes={vehicleTypes} onSave={handleEditSave} storageFolder={storageFolder} />
      <DeleteConfirmationModal  show={showDelete}   onHide={() => setShowDelete(false)}   onConfirm={handleDelete} loading={loading} message={`Delete vehicle ${selected?.registrationNumber}? This cannot be undone.`} />
      <ViewVehicleScheduleModal show={showSchedule} onHide={() => setShowSchedule(false)} vehicle={selected} vehiclePool={col === "externalVehicles" ? "external" : "internal"} />
    </>
  );
}