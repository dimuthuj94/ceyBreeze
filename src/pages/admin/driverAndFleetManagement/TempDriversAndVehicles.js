// src/pages/admin/driverAndFleetManagement/TempDriversAndVehicles.js
import React, { useEffect, useState } from "react";
import { Tabs, Tab, Form, Button, Row, Col, Card } from "react-bootstrap";
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, runTransaction, getDocs,
} from "firebase/firestore";
import { db, storage } from "../../../firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

import DriverAndFleetManagement from "../../../components/layouts/admin/DriverAndFleetManagement";

// Reuse all existing modals
import ViewDriverModal from "../../../components/modals/general/ViewDriverModal";
import EditDriver from "../../../components/modals/adminModals/driverAndFleetManagementModals/EditDriver";
import ViewVehicleModal from "../../../components/modals/general/ViewVehicleModal";
import EditVehicle from "../../../components/modals/adminModals/driverAndFleetManagementModals/EditVehicle";
import DeleteConfirmationModal from "../../../components/modals/general/GeneralDeleteConfirmationModal";
import ConfirmationModal from "../../../components/modals/general/GeneralConfirmationModal";

// ── Shared UI primitives ───────────────────────────────────────────────────

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

// ── External Badge ─────────────────────────────────────────────────────────

const ExternalBadge = () => (
  <span style={{
    display: "inline-block", background: "#faeeda", color: "#633806",
    fontSize: "10px", fontWeight: 600, padding: "2px 8px",
    borderRadius: "12px", letterSpacing: "0.04em", textTransform: "uppercase",
    marginBottom: "6px",
  }}>
    External
  </span>
);

// ══════════════════════════════════════════════════════════════════════════
// DRIVER SECTION
// ══════════════════════════════════════════════════════════════════════════

function ExternalDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileKey, setFileKey] = useState(Date.now());
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const initialForm = {
    gender: "", title: "", fullName: "", callingName: "",
    house: "", street1: "", street2: "", city: "", postalCode: "",
    mobile: "", home: "", nic: "", dl: "", permit: "",
  };
  const [form, setForm] = useState(initialForm);

  // Realtime fetch
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "externalDrivers"), (snap) => {
      setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileSelect = (file) => {
    if (!file) return;
    setForm((prev) => ({ ...prev, photoFile: file }));
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const validateForm = () => {
    const required = ["gender", "title", "fullName", "callingName", "house", "street1", "city", "postalCode", "mobile", "nic", "dl", "permit"];
    for (let key of required) {
      if (!form[key]) { alert(`${key} is required`); return false; }
    }
    const nicRegex = /^(\d{9}[VXvx]|\d{12})$/;
    if (!nicRegex.test(form.nic)) { alert("Invalid NIC"); return false; }
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(form.mobile)) { alert("Invalid mobile number"); return false; }
    if (drivers.find((d) => d.nic === form.nic)) { alert("NIC already exists"); return false; }
    if (drivers.find((d) => d.mobile === form.mobile)) { alert("Mobile already exists"); return false; }
    return true;
  };

  const generateDriverId = async () => {
    const counterRef = doc(db, "counters", "externalDrivers");
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      const newId = snap.exists() ? snap.data().lastId + 1 : 1;
      transaction.set(counterRef, { lastId: newId }, { merge: true });
      return `DRV-X-${String(newId).padStart(4, "0")}`;
    });
  };

  const buildAddress = () =>
    `${form.house}, ${form.street1}, ${form.street2}, ${form.city}, ${form.postalCode}`;

  const handleSave = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { photoFile, ...cleanForm } = form;
      const id = await generateDriverId();
      await setDoc(doc(db, "externalDrivers", id), {
        ...cleanForm,
        address: buildAddress(),
      });
      if (photoFile) {
        const storageRef = ref(storage, `externalDrivers/${id}`);
        await uploadBytes(storageRef, photoFile);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "externalDrivers", id), { photo: url });
      }
      resetForm();
      setShowConfirm(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      try {
        await deleteObject(ref(storage, `externalDrivers/${selectedDriver.id}`));
      } catch (err) {
        if (err.code !== "storage/object-not-found") console.warn(err.message);
      }
      await deleteDoc(doc(db, "externalDrivers", selectedDriver.id));
      setShowDelete(false);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async (updatedData) => {
    await updateDoc(doc(db, "externalDrivers", selectedDriver.id), updatedData);
    setShowEdit(false);
  };

  const resetForm = () => {
    setForm(initialForm);
    setFileKey(Date.now());
    setPreview(null);
  };

  const filtered = drivers.filter((d) =>
    d.callingName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Form.Control
        placeholder="Search by calling name..."
        className="mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ fontSize: "13px" }}
      />

      <Tabs defaultActiveKey="view-drivers">

        {/* ── VIEW TAB ── */}
        <Tab eventKey="view-drivers" title="View External Drivers">
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px", padding: "1rem 0",
          }}>
            {filtered.map((d) => (
              <div key={d.id} style={{
                background: "white", border: "1px solid #e9ecef",
                borderRadius: "12px", overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                <img
                  src={d.photo || "/images/default-user.png"}
                  alt="Driver"
                  style={{ width: "100%", height: "160px", objectFit: "cover", display: "block", background: "#f8f9fa" }}
                />
                <div style={{ padding: "14px 16px" }}>
                  <ExternalBadge />
                  <p style={{ fontSize: "11px", color: "#adb5bd", letterSpacing: "0.04em", margin: "0 0 4px" }}>{d.id}</p>
                  <p style={{ fontSize: "15px", fontWeight: 500, color: "#212529", margin: "0 0 10px" }}>
                    {d.title} {d.callingName}
                  </p>
                  {[
                    { label: "Address", value: d.address },
                    { label: "Mobile", value: d.mobile },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", gap: "8px", marginBottom: "5px" }}>
                      <span style={{ fontSize: "12px", color: "#adb5bd", minWidth: "54px" }}>{label}</span>
                      <span style={{ fontSize: "12px", color: "#495057", lineHeight: 1.4 }}>{value}</span>
                    </div>
                  ))}
                  <hr style={{ border: "none", borderTop: "1px solid #f1f3f5", margin: "12px 0" }} />
                  <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                    <Button size="sm" variant="outline-primary" onClick={() => { setSelectedDriver(d); setShowView(true); }}>View</Button>
                    <Button size="sm" variant="outline-warning" onClick={() => { setSelectedDriver(d); setShowEdit(true); }}>Edit</Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => alert("Coming soon")}>View Schedule</Button>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <Button size="sm" variant="outline-danger" onClick={() => alert("Coming soon")}>Fire</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => { setSelectedDriver(d); setShowDelete(true); }}>Delete</Button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p style={{ color: "#adb5bd", fontSize: "13px", gridColumn: "1/-1" }}>No external drivers found.</p>
            )}
          </div>
        </Tab>

        {/* ── CREATE TAB ── */}
        <Tab eventKey="create-driver" title="Add External Driver">
          <div style={{ maxWidth: "700px", margin: "1rem 0" }}>
            <Form>

              <SectionBlock title="Personal Details">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 16px" }}>
                  <Field label="Title">
                    <select name="title" value={form.title} onChange={handleChange} style={inputStyle}>
                      <option value="">Select</option>
                      <option>Mr</option><option>Miss</option><option>Mrs</option>
                    </select>
                  </Field>
                  <Field label="Gender">
                    <select name="gender" value={form.gender} onChange={handleChange} style={inputStyle}>
                      <option value="">Select</option>
                      <option>Male</option><option>Female</option>
                    </select>
                  </Field>
                  <Field label="Birthday">
                    <input type="date" name="birthday" value={form.birthday || ""} onChange={handleChange} style={inputStyle} />
                  </Field>
                  <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                    <Field label="Full Name">
                      <input name="fullName" value={form.fullName} onChange={handleChange} style={inputStyle} />
                    </Field>
                    <Field label="Calling Name">
                      <input name="callingName" value={form.callingName} onChange={handleChange} style={inputStyle} />
                    </Field>
                  </div>
                </div>
              </SectionBlock>

              <SectionBlock title="Address Details">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="House No / Name">
                      <input name="house" value={form.house} onChange={handleChange} style={inputStyle} />
                    </Field>
                  </div>
                  <Field label="Street Line 1">
                    <input name="street1" value={form.street1} onChange={handleChange} style={inputStyle} />
                  </Field>
                  <Field label="Street Line 2">
                    <input name="street2" value={form.street2} onChange={handleChange} style={inputStyle} />
                  </Field>
                  <Field label="City">
                    <input name="city" value={form.city} onChange={handleChange} style={inputStyle} />
                  </Field>
                  <Field label="Postal Code">
                    <input name="postalCode" value={form.postalCode} onChange={handleChange} style={inputStyle} />
                  </Field>
                </div>
              </SectionBlock>

              <SectionBlock title="Contact Details">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                  <Field label="Mobile Number">
                    <input name="mobile" value={form.mobile} onChange={handleChange} style={inputStyle} />
                  </Field>
                  <Field label="Home Number">
                    <input name="home" value={form.home} onChange={handleChange} style={inputStyle} />
                  </Field>
                </div>
              </SectionBlock>

              <SectionBlock title="Identification Details">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 16px" }}>
                  <Field label="NIC Number">
                    <input name="nic" value={form.nic} onChange={handleChange} style={inputStyle} />
                  </Field>
                  <Field label="Driving License No">
                    <input name="dl" value={form.dl} onChange={handleChange} style={inputStyle} />
                  </Field>
                  <Field label="Permit Number">
                    <input name="permit" value={form.permit} onChange={handleChange} style={inputStyle} />
                  </Field>
                </div>
              </SectionBlock>

              <SectionBlock title="Driver Photo">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                  onClick={() => document.getElementById("extDriverFileInput").click()}
                  style={{
                    border: `2px dashed ${dragActive ? "#00276b" : "#dee2e6"}`,
                    borderRadius: "10px", padding: "28px",
                    textAlign: "center", cursor: "pointer",
                    background: dragActive ? "#f0f4ff" : "#fafafa",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "#495057", margin: "0 0 4px" }}>
                    Drag &amp; Drop Photo Here
                  </p>
                  <p style={{ fontSize: "12px", color: "#adb5bd", margin: 0 }}>or click to browse</p>
                  <input
                    key={fileKey}
                    id="extDriverFileInput"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                  />
                </div>
                {preview && (
                  <div style={{ marginTop: "14px", textAlign: "center" }}>
                    <img src={preview} alt="Preview" style={{ width: "160px", height: "160px", objectFit: "cover", borderRadius: "10px", border: "3px solid #00276b" }} />
                    <p style={{ fontSize: "11px", color: "#adb5bd", marginTop: "6px" }}>{form.photoFile?.name}</p>
                  </div>
                )}
              </SectionBlock>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <Button variant="secondary" onClick={resetForm}>Reset</Button>
                <Button style={{ background: "#00276b", border: "none" }} onClick={() => setShowConfirm(true)}>
                  Add External Driver
                </Button>
              </div>

            </Form>
          </div>
        </Tab>
      </Tabs>

      {/* Modals */}
      <ViewDriverModal show={showView} onHide={() => setShowView(false)} driver={selectedDriver} onDelete={() => { setShowView(false); setShowDelete(true); }} onUploadPhoto={() => {}} />
      <EditDriver show={showEdit} onHide={() => setShowEdit(false)} driver={selectedDriver} onSave={handleEditSave} />
      <DeleteConfirmationModal show={showDelete} onHide={() => setShowDelete(false)} onConfirm={handleDelete} loading={loading} message={`Delete driver ${selectedDriver?.callingName}? This cannot be undone.`} />
      <ConfirmationModal show={showConfirm} onHide={() => setShowConfirm(false)} onConfirm={handleSave} loading={loading} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VEHICLE SECTION
// ══════════════════════════════════════════════════════════════════════════

function ExternalVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const initialForm = {
    vehicleType: "", vehicleModel: "", ownerName: "",
    manufactureYear: "", registrationNumber: "",
    minimumSeatCount: "", maximumSeatCount: "",
  };
  const [form, setForm] = useState(initialForm);
  const [photoFiles, setPhotoFiles] = useState([null, null, null, null]);
  const [photoPreviews, setPhotoPreviews] = useState([null, null, null, null]);
  const [dragActiveIdx, setDragActiveIdx] = useState(null);
  const [activeTab, setActiveTab] = useState("view-vehicles");

  // Realtime fetch
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "externalVehicles"), (snap) => {
      setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Fetch vehicle types from existing vehicles collection
  useEffect(() => {
    getDocs(collection(db, "vehicles")).then((snap) => {
      setVehicleTypes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

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

  const generateVehicleId = async () => {
    const counterRef = doc(db, "counters", "externalVehicles");
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      const newId = snap.exists() ? snap.data().lastId + 1 : 1;
      transaction.set(counterRef, { lastId: newId }, { merge: true });
      return `VEH-X-${String(newId).padStart(4, "0")}`;
    });
  };

  const handleCreate = async () => {
    if (!form.vehicleType || !form.vehicleModel || !form.registrationNumber || !form.ownerName) {
      alert("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      const id = await generateVehicleId();
      const photoURLs = [];
      for (let i = 0; i < 4; i++) {
        if (photoFiles[i]) {
          const storageRef = ref(storage, `externalVehicles/${id}/photo_${i + 1}`);
          await uploadBytes(storageRef, photoFiles[i]);
          photoURLs.push(await getDownloadURL(storageRef));
        }
      }
      await setDoc(doc(db, "externalVehicles", id), {
        ...form,
        photos: photoURLs,
        createdAt: new Date(),
      });
      setForm(initialForm);
      setPhotoFiles([null, null, null, null]);
      setPhotoPreviews([null, null, null, null]);
      setActiveTab("view-vehicles");
      alert("External vehicle added successfully!");
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      for (let i = 1; i <= 4; i++) {
        try {
          await deleteObject(ref(storage, `externalVehicles/${selectedVehicle.id}/photo_${i}`));
        } catch (err) {
          if (err.code !== "storage/object-not-found") console.warn(err.message);
        }
      }
      await deleteDoc(doc(db, "externalVehicles", selectedVehicle.id));
      setShowDelete(false);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async (updatedData) => {
    await updateDoc(doc(db, "externalVehicles", selectedVehicle.id), updatedData);
    setShowEdit(false);
  };

  const filtered = vehicles.filter((v) =>
    v.registrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
    v.vehicleModel?.toLowerCase().includes(search.toLowerCase()) ||
    v.vehicleType?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Form.Control
        placeholder="Search by registration, model or type..."
        className="mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ fontSize: "13px" }}
      />

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>

        {/* ── VIEW TAB ── */}
        <Tab eventKey="view-vehicles" title="View External Vehicles">
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px", padding: "1rem 0",
          }}>
            {filtered.map((v) => (
              <div key={v.id} style={{
                background: "white", border: "1px solid #e9ecef",
                borderRadius: "12px", overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                {v.photos?.[0] ? (
                  <img src={v.photos[0]} alt="Vehicle" style={{ width: "100%", height: "160px", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "160px", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "12px", color: "#adb5bd" }}>No photo</span>
                  </div>
                )}
                {v.photos?.length > 1 && (
                  <div style={{ display: "flex", gap: "2px", padding: "2px" }}>
                    {v.photos.slice(1).map((url, i) => (
                      <img key={i} src={url} alt={`Vehicle ${i + 2}`} style={{ flex: 1, height: "40px", objectFit: "cover", borderRadius: "2px" }} />
                    ))}
                  </div>
                )}
                <div style={{ padding: "14px 16px" }}>
                  <ExternalBadge />
                  <p style={{ fontSize: "11px", color: "#adb5bd", letterSpacing: "0.04em", margin: "0 0 2px" }}>{v.id}</p>
                  <p style={{ fontSize: "15px", fontWeight: 500, color: "#212529", margin: "0 0 2px" }}>{v.vehicleType}</p>
                  <p style={{ fontSize: "12px", color: "#6c757d", margin: "0 0 8px" }}>{v.vehicleModel}</p>
                  {[
                    ["Registration", v.registrationNumber],
                    ["Owner", v.ownerName],
                    ["Seats", `${v.minimumSeatCount} – ${v.maximumSeatCount}`],
                    ["Year", v.manufactureYear],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: "flex", gap: "8px", marginBottom: "3px" }}>
                      <span style={{ fontSize: "12px", color: "#adb5bd", minWidth: "72px" }}>{label}</span>
                      <span style={{ fontSize: "12px", color: "#495057" }}>{value || "—"}</span>
                    </div>
                  ))}
                  <hr style={{ border: "none", borderTop: "1px solid #f1f3f5", margin: "10px 0" }} />
                  <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                    <Button size="sm" variant="outline-primary" onClick={() => { setSelectedVehicle(v); setShowView(true); }}>View</Button>
                    <Button size="sm" variant="outline-warning" onClick={() => { setSelectedVehicle(v); setShowEdit(true); }}>Edit</Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => alert("Coming soon")}>View Schedule</Button>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <Button size="sm" variant="outline-danger" onClick={() => { setSelectedVehicle(v); setShowDelete(true); }}>Delete</Button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p style={{ color: "#adb5bd", fontSize: "13px", gridColumn: "1/-1" }}>No external vehicles found.</p>
            )}
          </div>
        </Tab>

        {/* ── CREATE TAB ── */}
        <Tab eventKey="create-vehicle" title="Add External Vehicle">
          <div style={{ maxWidth: "700px", margin: "1rem 0" }}>

            <SectionBlock title="Vehicle Information">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Vehicle Type">
                    <select name="vehicleType" value={form.vehicleType} onChange={handleVehicleTypeChange} style={inputStyle}>
                      <option value="">Select vehicle type</option>
                      {vehicleTypes.map((v) => (
                        <option key={v.id} value={v.id}>{v.id}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Vehicle Model">
                  <input name="vehicleModel" value={form.vehicleModel} onChange={handleChange} placeholder="e.g. Toyota HiAce" style={inputStyle} />
                </Field>
                <Field label="Manufacture Year">
                  <input name="manufactureYear" value={form.manufactureYear} onChange={handleChange} placeholder="e.g. 2019" style={inputStyle} />
                </Field>
                <Field label="Registration Number">
                  <input name="registrationNumber" value={form.registrationNumber} onChange={handleChange} placeholder="e.g. WP CAB 1234" style={inputStyle} />
                </Field>
                <Field label="Owner Name">
                  <input name="ownerName" value={form.ownerName} onChange={handleChange} placeholder="Vehicle owner" style={inputStyle} />
                </Field>
                <Field label="Min. Seating Capacity">
                  <input name="minimumSeatCount" value={form.minimumSeatCount} readOnly style={{ ...inputStyle, background: "#f8f9fa" }} placeholder="Auto-filled from type" />
                </Field>
                <Field label="Max. Seating Capacity">
                  <input name="maximumSeatCount" value={form.maximumSeatCount} readOnly style={{ ...inputStyle, background: "#f8f9fa" }} placeholder="Auto-filled from type" />
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
                      onClick={() => document.getElementById(`extVPhoto-${idx}`).click()}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragOver={(e) => { e.preventDefault(); setDragActiveIdx(idx); }}
                      onDragLeave={() => setDragActiveIdx(null)}
                      style={{
                        border: `2px dashed ${dragActiveIdx === idx ? "#00276b" : "#dee2e6"}`,
                        borderRadius: "8px",
                        background: dragActiveIdx === idx ? "#f0f4ff" : "#fafafa",
                        cursor: "pointer", height: "120px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        overflow: "hidden", transition: "background 0.15s, border-color 0.15s",
                      }}
                    >
                      {photoPreviews[idx] ? (
                        <img src={photoPreviews[idx]} alt={`Preview ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <p style={{ fontSize: "12px", color: "#adb5bd", margin: 0 }}>Drop or click</p>
                      )}
                      <input
                        id={`extVPhoto-${idx}`}
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
              <Button variant="secondary" onClick={() => {
                setForm(initialForm);
                setPhotoFiles([null, null, null, null]);
                setPhotoPreviews([null, null, null, null]);
              }}>
                Reset
              </Button>
              <Button style={{ background: "#00276b", border: "none" }} onClick={handleCreate} disabled={loading}>
                {loading ? "Adding..." : "Add External Vehicle"}
              </Button>
            </div>

          </div>
        </Tab>
      </Tabs>

      {/* Modals — reuse the same internal modals, they're data-agnostic */}
      <ViewVehicleModal show={showView} onHide={() => setShowView(false)} vehicle={selectedVehicle} />
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
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ROOT PAGE — two top-level tabs
// ══════════════════════════════════════════════════════════════════════════

export default function TempDriversAndVehicles() {
  const [mainTab, setMainTab] = useState("ext-drivers");

  const tabStyle = (active) => ({
    padding: "9px 22px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    background: "none",
    color: active ? "#00276b" : "#6c757d",
    borderBottom: active ? "2px solid #00276b" : "2px solid transparent",
    marginBottom: "-2px",
    backgroundColor: active ? "#f0f4ff" : "transparent",
    transition: "0.15s",
  });

  return (
    <DriverAndFleetManagement>
      <div className="container">

        <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "20px" }}>
          <h4 style={{ color: "#212529", margin: 0 }}>External Drivers &amp; Vehicles</h4>
          <span style={{
            background: "#faeeda", color: "#633806",
            fontSize: "11px", fontWeight: 600, padding: "2px 10px",
            borderRadius: "12px", letterSpacing: "0.04em",
          }}>
            EXTERNAL
          </span>
        </div>

        {/* Top-level tabs */}
        <div style={{ display: "flex", borderBottom: "2px solid #00276b", marginBottom: "24px" }}>
          <button style={tabStyle(mainTab === "ext-drivers")} onClick={() => setMainTab("ext-drivers")}>
            External Drivers
          </button>
          <button style={tabStyle(mainTab === "ext-vehicles")} onClick={() => setMainTab("ext-vehicles")}>
            External Vehicles
          </button>
        </div>

        {mainTab === "ext-drivers" && <ExternalDrivers />}
        {mainTab === "ext-vehicles" && <ExternalVehicles />}

      </div>
    </DriverAndFleetManagement>
  );
}