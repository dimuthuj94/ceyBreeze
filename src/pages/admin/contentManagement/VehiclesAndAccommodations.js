// src/pages/admin/contentManagement/VehiclesAndAccommodations.js
import React, { useEffect, useState } from "react";
import { collection, getDocs, setDoc, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "../../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import ContentManagement from "../../../components/layouts/admin/ContentManagement";
import GeneralConfirmationModal from "../../../components/modals/general/GeneralConfirmationModal";
import GeneralDeleteConfirmationModal from "../../../components/modals/general/GeneralDeleteConfirmationModal";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "123456";

const emptyVehicle = { id: "", minimumSeatCount: "", maximumSeatCount: "", pricePerDay: "" };
const emptyAccomm  = { id: "", guestCount: "", additionalPricePerDay: "" };

export default function VehiclesAndAccommodations() {
  const [vehicles, setVehicles] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [newVehicle, setNewVehicle] = useState(emptyVehicle);
  const [newAccommodation, setNewAccommodation] = useState(emptyAccomm);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingAccommodation, setEditingAccommodation] = useState(null);

  // Modal state
  const [showVehicleConfirm, setShowVehicleConfirm] = useState(false);
  const [showAccommConfirm, setShowAccommConfirm] = useState(false);
  const [showDeleteVehicle, setShowDeleteVehicle] = useState(false);
  const [showDeleteAccomm, setShowDeleteAccomm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingDeleteType, setPendingDeleteType] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
      .then(() => { fetchVehicles(); fetchAccommodations(); })
      .catch((err) => console.error("Admin login failed:", err));
  }, []);

  const fetchVehicles = async () => {
    const snap = await getDocs(collection(db, "vehicles"));
    setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const fetchAccommodations = async () => {
    const snap = await getDocs(collection(db, "accommodations"));
    setAccommodations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // Vehicle save
  const handleSaveVehiclePrompt = () => {
    const { id, minimumSeatCount, maximumSeatCount, pricePerDay } = newVehicle;
    if (!id.trim() || !minimumSeatCount || !maximumSeatCount || !pricePerDay) return alert("All vehicle fields are required.");
    if (Number(maximumSeatCount) < Number(minimumSeatCount)) return alert("Max seats must be ≥ min seats.");
    setShowVehicleConfirm(true);
  };

  const confirmSaveVehicle = async () => {
    setModalLoading(true);
    await setDoc(doc(db, "vehicles", newVehicle.id.trim()), {
      name: newVehicle.id.trim(),
      minimumSeatCount: Number(newVehicle.minimumSeatCount),
      maximumSeatCount: Number(newVehicle.maximumSeatCount),
      pricePerDay: Number(newVehicle.pricePerDay),
    });
    setNewVehicle(emptyVehicle); setEditingVehicle(null);
    setShowVehicleConfirm(false); setModalLoading(false);
    fetchVehicles();
  };

  // Accommodation save
  const handleSaveAccommPrompt = () => {
    const { id, guestCount, additionalPricePerDay } = newAccommodation;
    if (!id.trim() || !guestCount || !additionalPricePerDay) return alert("All accommodation fields are required.");
    setShowAccommConfirm(true);
  };

  const confirmSaveAccomm = async () => {
    setModalLoading(true);
    await setDoc(doc(db, "accommodations", newAccommodation.id.trim()), {
      name: newAccommodation.id.trim(),
      guestCount: Number(newAccommodation.guestCount),
      additionalPricePerDay: Number(newAccommodation.additionalPricePerDay),
    });
    setNewAccommodation(emptyAccomm); setEditingAccommodation(null);
    setShowAccommConfirm(false); setModalLoading(false);
    fetchAccommodations();
  };

  // Deletes
  const promptDelete = (type, id) => { setPendingDeleteType(type); setPendingDeleteId(id); if (type === "vehicle") setShowDeleteVehicle(true); else setShowDeleteAccomm(true); };

  const confirmDeleteVehicle = async () => {
    setModalLoading(true);
    await deleteDoc(doc(db, "vehicles", pendingDeleteId));
    setShowDeleteVehicle(false); setModalLoading(false); fetchVehicles();
  };

  const confirmDeleteAccomm = async () => {
    setModalLoading(true);
    await deleteDoc(doc(db, "accommodations", pendingDeleteId));
    setShowDeleteAccomm(false); setModalLoading(false); fetchAccommodations();
  };

  const handleEditVehicle = (v) => {
    setNewVehicle({ id: v.id, minimumSeatCount: v.minimumSeatCount, maximumSeatCount: v.maximumSeatCount, pricePerDay: v.pricePerDay || "" });
    setEditingVehicle(v.id);
  };

  const handleEditAccomm = (a) => {
    setNewAccommodation({ id: a.id, guestCount: a.guestCount, additionalPricePerDay: a.additionalPricePerDay });
    setEditingAccommodation(a.id);
  };

  const VehicleForm = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
      <div style={{ gridColumn: "span 2" }}><label className="cm-label">Vehicle Type (ID)</label><input className="cm-input" placeholder="e.g. Van, Car" value={newVehicle.id} onChange={(e) => setNewVehicle({ ...newVehicle, id: e.target.value })} disabled={!!editingVehicle} /></div>
      <div><label className="cm-label">Min Seats</label><input type="number" className="cm-input" placeholder="Min" value={newVehicle.minimumSeatCount} onChange={(e) => setNewVehicle({ ...newVehicle, minimumSeatCount: e.target.value })} /></div>
      <div><label className="cm-label">Max Seats</label><input type="number" className="cm-input" placeholder="Max" value={newVehicle.maximumSeatCount} onChange={(e) => setNewVehicle({ ...newVehicle, maximumSeatCount: e.target.value })} /></div>
      <div style={{ gridColumn: "span 2" }}><label className="cm-label">Price / Day ($)</label><input type="number" className="cm-input" placeholder="0.00" value={newVehicle.pricePerDay} onChange={(e) => setNewVehicle({ ...newVehicle, pricePerDay: e.target.value })} /></div>
      <div style={{ gridColumn: "span 2", display: "flex", gap: "8px" }}>
        <button className="cm-btn primary" style={{ flex: 1 }} onClick={handleSaveVehiclePrompt}>{editingVehicle ? "✓ Update" : "+ Add"} Vehicle</button>
        {editingVehicle && <button className="cm-btn outline" onClick={() => { setNewVehicle(emptyVehicle); setEditingVehicle(null); }}>✕ Cancel</button>}
      </div>
    </div>
  );

  const AccommForm = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
      <div style={{ gridColumn: "span 2" }}><label className="cm-label">Type (ID)</label><input className="cm-input" placeholder="e.g. Standard, Deluxe" value={newAccommodation.id} onChange={(e) => setNewAccommodation({ ...newAccommodation, id: e.target.value })} disabled={!!editingAccommodation} /></div>
      <div><label className="cm-label">Guest Count</label><input type="number" className="cm-input" placeholder="Guests" value={newAccommodation.guestCount} onChange={(e) => setNewAccommodation({ ...newAccommodation, guestCount: e.target.value })} /></div>
      <div><label className="cm-label">Price / Day ($)</label><input type="number" className="cm-input" placeholder="0.00" value={newAccommodation.additionalPricePerDay} onChange={(e) => setNewAccommodation({ ...newAccommodation, additionalPricePerDay: e.target.value })} /></div>
      <div style={{ gridColumn: "span 2", display: "flex", gap: "8px" }}>
        <button className="cm-btn primary" style={{ flex: 1 }} onClick={handleSaveAccommPrompt}>{editingAccommodation ? "✓ Update" : "+ Add"} Accommodation</button>
        {editingAccommodation && <button className="cm-btn outline" onClick={() => { setNewAccommodation(emptyAccomm); setEditingAccommodation(null); }}>✕ Cancel</button>}
      </div>
    </div>
  );

  return (
    <ContentManagement pageTitle="Vehicles & Accommodations">
      <div style={{ fontFamily: "'Outfit', sans-serif" }}>

        <div className="cm-page-header">
          <h1 className="cm-page-title">Vehicles &amp; Accommodations</h1>
          <p className="cm-page-sub">Define vehicle types available for tours and accommodation tiers.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

          {/* Vehicles */}
          <div className="cm-card">
            <div className="cm-card-header">
              <span className="cm-card-title"><span>◈</span> Vehicles</span>
              <span style={{ fontSize: "11px", color: "#7a9ab8" }}>{vehicles.length} types</span>
            </div>
            <div className="cm-card-body">
              <VehicleForm />
              <div style={{ overflowX: "auto" }}>
                <table className="va-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Seats</th>
                      <th>Price/Day</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.length === 0 ? (
                      <tr><td colSpan="4" style={{ color: "#adc6d8", textAlign: "center" }}>No vehicles yet.</td></tr>
                    ) : vehicles.map((v) => (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 500 }}>{v.id}</td>
                        <td>{v.minimumSeatCount}–{v.maximumSeatCount}</td>
                        <td>${v.pricePerDay}</td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button className="cm-btn warn sm" onClick={() => handleEditVehicle(v)}>✏</button>
                            <button className="cm-btn danger sm" onClick={() => promptDelete("vehicle", v.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Accommodations */}
          <div className="cm-card">
            <div className="cm-card-header">
              <span className="cm-card-title"><span>◉</span> Accommodations</span>
              <span style={{ fontSize: "11px", color: "#7a9ab8" }}>{accommodations.length} types</span>
            </div>
            <div className="cm-card-body">
              <AccommForm />
              <div style={{ overflowX: "auto" }}>
                <table className="va-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Guests</th>
                      <th>Price/Day</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accommodations.length === 0 ? (
                      <tr><td colSpan="4" style={{ color: "#adc6d8", textAlign: "center" }}>No accommodations yet.</td></tr>
                    ) : accommodations.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 500 }}>{a.id}</td>
                        <td>{a.guestCount}</td>
                        <td>${a.additionalPricePerDay}</td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button className="cm-btn warn sm" onClick={() => handleEditAccomm(a)}>✏</button>
                            <button className="cm-btn danger sm" onClick={() => promptDelete("accommodation", a.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <GeneralConfirmationModal show={showVehicleConfirm} onHide={() => setShowVehicleConfirm(false)} onConfirm={confirmSaveVehicle} loading={modalLoading} title={editingVehicle ? "Update Vehicle" : "Add Vehicle"} message={`${editingVehicle ? "Update" : "Add"} vehicle type "${newVehicle.id}"?`} confirmLabel={editingVehicle ? "Update" : "Add"} />
      <GeneralConfirmationModal show={showAccommConfirm} onHide={() => setShowAccommConfirm(false)} onConfirm={confirmSaveAccomm} loading={modalLoading} title={editingAccommodation ? "Update Accommodation" : "Add Accommodation"} message={`${editingAccommodation ? "Update" : "Add"} accommodation type "${newAccommodation.id}"?`} confirmLabel={editingAccommodation ? "Update" : "Add"} />
      <GeneralDeleteConfirmationModal show={showDeleteVehicle} onHide={() => setShowDeleteVehicle(false)} onConfirm={confirmDeleteVehicle} loading={modalLoading} title="Delete Vehicle" message={`Permanently delete vehicle type "${pendingDeleteId}"?`} />
      <GeneralDeleteConfirmationModal show={showDeleteAccomm} onHide={() => setShowDeleteAccomm(false)} onConfirm={confirmDeleteAccomm} loading={modalLoading} title="Delete Accommodation" message={`Permanently delete accommodation type "${pendingDeleteId}"?`} />
    </ContentManagement>
  );
}