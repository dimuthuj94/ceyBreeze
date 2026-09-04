// src/pages/admin/driverAndFleetManagement/VehicleManagement.js
import React, { useEffect, useState } from "react";
import { Tabs, Tab, Form, Button, Row, Col, Card } from "react-bootstrap";
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, getDocs,
} from "firebase/firestore";
import { db, storage } from "../../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import DriverAndFleetManagement from "../../../components/layouts/admin/DriverAndFleetManagement";
import ViewVehicleModal from "../../../components/modals/general/ViewVehicleModal";
import EditVehicle from "../../../components/modals/adminModals/driverAndFleetManagementModals/EditVehicle";
import DeleteConfirmationModal from "../../../components/modals/general/GeneralDeleteConfirmationModal";
import { deleteObject } from "firebase/storage";

// ── Shared primitives ──────────────────────────────────────────────────────

const SectionBlock = ({ title, children }) => (
  <div style={{ border: "1px solid #e9ecef", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
    <div style={{ background: "#f8f9fa", padding: "8px 14px", borderBottom: "1px solid #e9ecef", display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#00276b", flexShrink: 0 }} />
      <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#00276b", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {title}
      </p>
    </div>
    <div style={{ padding: "14px" }}>{children}</div>
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <label style={{ fontSize: "11px", color: "#6c757d", fontWeight: 500, marginBottom: 0 }}>{label}</label>
    {children}
  </div>
);

const inputStyle = {
  border: "1px solid #dee2e6", borderRadius: "6px",
  padding: "7px 10px", fontSize: "13px", color: "#212529",
  width: "100%", background: "#fff",
};

// ── Main Component ─────────────────────────────────────────────────────────

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const initialForm = {
    vehicleType: "",
    vehicleModel: "",
    ownerName: "",
    manufactureYear: "",
    registrationNumber: "",
    minimumSeatCount: "",
    maximumSeatCount: "",
  };
  const [form, setForm] = useState(initialForm);
  const [photoFiles, setPhotoFiles] = useState([null, null, null, null]);
  const [photoPreviews, setPhotoPreviews] = useState([null, null, null, null]);
  const [dragActiveIdx, setDragActiveIdx] = useState(null);
  const [activeTab, setActiveTab] = useState("view");
  

  // Realtime fetch from vehicleFleet
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "vehicleFleet"), (snap) => {
      setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Fetch vehicle types from vehicles collection (for the dropdown)
  useEffect(() => {
    getDocs(collection(db, "vehicles")).then((snap) => {
      setVehicleTypes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // When vehicle type changes, auto-fill seat counts from that vehicle doc
  const handleVehicleTypeChange = (e) => {
    const selected = vehicleTypes.find((v) => v.id === e.target.value);
    setForm((prev) => ({
      ...prev,
      vehicleType: e.target.value,
      minimumSeatCount: selected?.minimumSeatCount ?? "",
      maximumSeatCount: selected?.maximumSeatCount ?? "",
    }));
  };

  const handlePhotoSelect = (file, idx) => {
    if (!file) return;
    const updated = [...photoFiles];
    updated[idx] = file;
    setPhotoFiles(updated);
    const reader = new FileReader();
    reader.onloadend = () => {
      const previews = [...photoPreviews];
      previews[idx] = reader.result;
      setPhotoPreviews(previews);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    setDragActiveIdx(null);
    handlePhotoSelect(e.dataTransfer.files[0], idx);
  };

  const generateVehicleId = () => {
    const ts = Date.now().toString().slice(-6);
    return `VEH-${ts}`;
  };

  const handleCreate = async () => {
    if (!form.vehicleType || !form.vehicleModel || !form.registrationNumber || !form.ownerName) {
      alert("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      const id = generateVehicleId();
      const photoURLs = [];

      for (let i = 0; i < 4; i++) {
        if (photoFiles[i]) {
          const storageRef = ref(storage, `vehicleFleet/${id}/photo_${i + 1}`);
          await uploadBytes(storageRef, photoFiles[i]);
          const url = await getDownloadURL(storageRef);
          photoURLs.push(url);
        }
      }

      await setDoc(doc(db, "vehicleFleet", id), {
        ...form,
        photos: photoURLs,
        createdAt: new Date(),
      });

      setForm(initialForm);
      setPhotoFiles([null, null, null, null]);
      setPhotoPreviews([null, null, null, null]);
      setActiveTab("view");
      alert("Vehicle created successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to create vehicle: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  

const handleDelete = async () => {
  if (!selectedVehicle) return;
  setLoading(true);
  try {
    // Delete all photos from Storage first
    const photoCount = selectedVehicle.photos?.length || 0;
    for (let i = 1; i <= 4; i++) {
      try {
        const photoRef = ref(storage, `vehicleFleet/${selectedVehicle.id}/photo_${i}`);
        await deleteObject(photoRef);
      } catch (err) {
        // photo_i might not exist — safe to ignore
        if (err.code !== "storage/object-not-found") {
          console.warn(`Could not delete photo_${i}:`, err.message);
        }
      }
    }

    // Then delete the Firestore document
    await deleteDoc(doc(db, "vehicleFleet", selectedVehicle.id));

    setShowDelete(false);
  } catch (err) {
    console.error("Delete error:", err);
    alert("Failed to delete vehicle: " + err.message);
  } finally {
    setLoading(false);
  }
};

  const handleEditSave = async (updatedData) => {
    await updateDoc(doc(db, "vehicleFleet", selectedVehicle.id), updatedData);
    setShowEdit(false);
  };

  const filteredVehicles = vehicles.filter((v) =>
    v.registrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
    v.vehicleModel?.toLowerCase().includes(search.toLowerCase()) ||
    v.vehicleType?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DriverAndFleetManagement>
      <div className="container">
        <h4 className="mb-4" style={{ color: "#212529" }}>Vehicle Management</h4>

        <Form.Control
          placeholder="Search by registration, model or type..."
          className="mb-4"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: "13px" }}
        />

        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>

          {/* ── VIEW TAB ── */}
          <Tab eventKey="view" title="View Vehicles">
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
              padding: "1rem 0",
            }}>
              {filteredVehicles.map((v) => (
                <div key={v.id} style={{
                  background: "white", border: "1px solid #e9ecef",
                  borderRadius: "12px", overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}>
                  {/* Primary photo */}
                  {v.photos?.[0] ? (
                    <img
                      src={v.photos[0]}
                      alt="Vehicle"
                      style={{ width: "100%", height: "160px", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{
                      width: "100%", height: "160px", background: "#f8f9fa",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: "12px", color: "#adb5bd" }}>No photo</span>
                    </div>
                  )}

                  {/* Additional photo strip */}
                  {v.photos?.length > 1 && (
                    <div style={{ display: "flex", gap: "2px", padding: "2px" }}>
                      {v.photos.slice(1).map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Vehicle ${i + 2}`}
                          style={{ flex: 1, height: "40px", objectFit: "cover", borderRadius: "2px" }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Card body */}
                  <div style={{ padding: "14px 16px" }}>
                    <p style={{ fontSize: "11px", color: "#adb5bd", letterSpacing: "0.04em", margin: "0 0 2px" }}>{v.id}</p>
                    <p style={{ fontSize: "15px", fontWeight: 500, color: "#212529", margin: "0 0 2px" }}>{v.vehicleType}</p>
                    <p style={{ fontSize: "12px", color: "#6c757d", margin: "0 0 8px" }}>{v.vehicleModel}</p>

                    {[
                      ["Registration", v.registrationNumber],
                      ["Owner", v.ownerName],
                      ["Seats", `${v.minimumSeatCount} – ${v.maximumSeatCount}`],
                      ["Year", v.manufactureYear],
                    ].map(({ 0: label, 1: value }) => (
                      <div key={label} style={{ display: "flex", gap: "8px", marginBottom: "3px" }}>
                        <span style={{ fontSize: "12px", color: "#adb5bd", minWidth: "72px" }}>{label}</span>
                        <span style={{ fontSize: "12px", color: "#495057" }}>{value || "—"}</span>
                      </div>
                    ))}

                    <hr style={{ border: "none", borderTop: "1px solid #f1f3f5", margin: "10px 0" }} />

                    <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                      <Button size="sm" variant="outline-primary" onClick={() => { setSelectedVehicle(v); setShowView(true); }}>
                        View
                      </Button>
                      <Button size="sm" variant="outline-warning" onClick={() => { setSelectedVehicle(v); setShowEdit(true); }}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline-secondary" onClick={() => alert("Coming soon")}>
                        View Schedule
                      </Button>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Button size="sm" variant="outline-danger" onClick={() => { setSelectedVehicle(v); setShowDelete(true); }}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredVehicles.length === 0 && (
                <p style={{ color: "#adb5bd", fontSize: "13px", gridColumn: "1/-1" }}>No vehicles found.</p>
              )}
            </div>
          </Tab>

          {/* ── CREATE TAB ── */}
          <Tab eventKey="create" title="Add Vehicle">
            <div style={{ maxWidth: "700px", margin: "1rem 0" }}>

              <SectionBlock title="Vehicle Information">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Vehicle Type">
                      <select
                        name="vehicleType"
                        value={form.vehicleType}
                        onChange={handleVehicleTypeChange}
                        style={inputStyle}
                      >
                        <option value="">Select vehicle type</option>
                        {vehicleTypes.map((v) => (
                          <option key={v.id} value={v.id}>{v.id}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Vehicle Model">
                    <input
                      name="vehicleModel"
                      value={form.vehicleModel}
                      onChange={handleChange}
                      placeholder="e.g. Toyota HiAce"
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Manufacture Year">
                    <input
                      name="manufactureYear"
                      value={form.manufactureYear}
                      onChange={handleChange}
                      placeholder="e.g. 2019"
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Registration Number">
                    <input
                      name="registrationNumber"
                      value={form.registrationNumber}
                      onChange={handleChange}
                      placeholder="e.g. WP CAB 1234"
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Owner Name">
                    <input
                      name="ownerName"
                      value={form.ownerName}
                      onChange={handleChange}
                      placeholder="Vehicle owner"
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Min. Seating Capacity">
                    <input
                      name="minimumSeatCount"
                      value={form.minimumSeatCount}
                      onChange={handleChange}
                      placeholder="Auto-filled from type"
                      style={{ ...inputStyle, background: "#f8f9fa" }}
                      readOnly
                    />
                  </Field>

                  <Field label="Max. Seating Capacity">
                    <input
                      name="maximumSeatCount"
                      value={form.maximumSeatCount}
                      onChange={handleChange}
                      placeholder="Auto-filled from type"
                      style={{ ...inputStyle, background: "#f8f9fa" }}
                      readOnly
                    />
                  </Field>

                </div>
              </SectionBlock>

              <SectionBlock title="Vehicle Photos (up to 4)">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {[0, 1, 2, 3].map((idx) => (
                    <div key={idx}>
                      <p style={{ fontSize: "11px", color: "#6c757d", margin: "0 0 4px", fontWeight: 500 }}>
                        Photo {idx + 1}{idx === 0 ? " (primary)" : ""}
                      </p>
                      <div
                        onClick={() => document.getElementById(`vphoto-${idx}`).click()}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragOver={(e) => { e.preventDefault(); setDragActiveIdx(idx); }}
                        onDragLeave={() => setDragActiveIdx(null)}
                        style={{
                          border: `2px dashed ${dragActiveIdx === idx ? "#00276b" : "#dee2e6"}`,
                          borderRadius: "8px",
                          background: dragActiveIdx === idx ? "#f0f4ff" : "#fafafa",
                          cursor: "pointer",
                          overflow: "hidden",
                          height: "120px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.15s, border-color 0.15s",
                        }}
                      >
                        {photoPreviews[idx] ? (
                          <img
                            src={photoPreviews[idx]}
                            alt={`Preview ${idx + 1}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <div style={{ textAlign: "center", padding: "8px" }}>
                            <p style={{ fontSize: "12px", color: "#adb5bd", margin: 0 }}>
                              Drop or click
                            </p>
                          </div>
                        )}
                        <input
                          id={`vphoto-${idx}`}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => handlePhotoSelect(e.target.files[0], idx)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionBlock>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setForm(initialForm);
                    setPhotoFiles([null, null, null, null]);
                    setPhotoPreviews([null, null, null, null]);
                  }}
                >
                  Reset
                </Button>
                <Button
                  style={{ background: "#00276b", border: "none" }}
                  onClick={handleCreate}
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Add Vehicle"}
                </Button>
              </div>

            </div>
          </Tab>
        </Tabs>

        {/* Modals */}
        <ViewVehicleModal
          show={showView}
          onHide={() => setShowView(false)}
          vehicle={selectedVehicle}
        />

        <EditVehicle
          show={showEdit}
          onHide={() => setShowEdit(false)}
          vehicle={selectedVehicle}
          vehicleTypes={vehicleTypes}
          onSave={handleEditSave}
        />

        <DeleteConfirmationModal
          show={showDelete}
          onHide={() => setShowDelete(false)}
          onConfirm={handleDelete}
          loading={loading}
          message={`Delete vehicle ${selectedVehicle?.registrationNumber}? This cannot be undone.`}
        />

      </div>
    </DriverAndFleetManagement>
  );
}