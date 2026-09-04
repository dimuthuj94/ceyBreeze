// src/components/modals/adminModals/driverAndFleetManagementModals/EditVehicle.js
import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../../../firebase";

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

export default function EditVehicle({ show, onHide, vehicle, vehicleTypes = [], onSave }) {
  const [form, setForm] = useState({});
  const [photoFiles, setPhotoFiles] = useState([null, null, null, null]);
  const [photoPreviews, setPhotoPreviews] = useState([null, null, null, null]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [dragActiveIdx, setDragActiveIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setForm({ ...vehicle });
      setExistingPhotos(vehicle.photos || []);
      setPhotoFiles([null, null, null, null]);
      setPhotoPreviews([null, null, null, null]);
    }
  }, [vehicle]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleVehicleTypeChange = (e) => {
    const selected = vehicleTypes.find((v) => v.id === e.target.value);
    setForm((prev) => ({
      ...prev,
      vehicleType: e.target.value,
      minimumSeatCount: selected?.minimumSeatCount ?? prev.minimumSeatCount,
      maximumSeatCount: selected?.maximumSeatCount ?? prev.maximumSeatCount,
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

  const handleSubmit = async () => {
    if (!vehicle) return;
    setSaving(true);
    try {
      let updatedPhotos = [...existingPhotos];

      for (let i = 0; i < 4; i++) {
        if (photoFiles[i]) {
          const storageRef = ref(storage, `vehicleFleet/${vehicle.id}/photo_${i + 1}`);
          await uploadBytes(storageRef, photoFiles[i]);
          const url = await getDownloadURL(storageRef);
          updatedPhotos[i] = url;
        }
      }

      onSave({
        ownerName: form.ownerName,
        ownerContact: form.ownerContact,
        photos: updatedPhotos,
      });
    } catch (err) { alert("Failed: " + err.message); }
    finally { setSaving(false); }
  };

  if (!vehicle) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Body style={{ padding: "20px", maxHeight: "75vh", overflowY: "auto" }}>

        {/* READ-ONLY strip */}
        <div style={{ background: "#f8f9fa", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px", border: "1px solid #e9ecef" }}>
          <p style={{ fontSize: "11px", color: "#adb5bd", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Read-only — Vehicle Details</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 16px" }}>
            {[["Type", vehicle?.vehicleType], ["Make", vehicle?.vehicleMake], ["Model", vehicle?.vehicleModel], ["Registration", vehicle?.registrationNumber], ["Year", vehicle?.manufactureYear], ["Seats", `${vehicle?.minimumSeatCount}–${vehicle?.maximumSeatCount}`]].map(([label, value]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "10px", color: "#adb5bd" }}>{label}</span>
                <span style={{ fontSize: "12px", color: "#6c757d", fontWeight: 500 }}>{value || "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* EDITABLE — Owner */}
        <SectionBlock title="Owner Details">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
            <Field label="Owner Name"><Form.Control name="ownerName" value={form.ownerName || ""} onChange={handleChange} style={inputStyle} /></Field>
            <Field label="Owner Contact No"><Form.Control name="ownerContact" value={form.ownerContact || ""} onChange={handleChange} style={inputStyle} /></Field>
          </div>
        </SectionBlock>

        <SectionBlock title="Vehicle Photos">
          <p style={{ fontSize: "12px", color: "#6c757d", margin: "0 0 10px" }}>
            Drop a new image on any slot to replace it. Unchanged slots keep their existing photo.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[0, 1, 2, 3].map((idx) => {
              const currentUrl = existingPhotos[idx];
              const newPreview = photoPreviews[idx];
              const displaySrc = newPreview || currentUrl;

              return (
                <div key={idx}>
                  <p style={{ fontSize: "11px", color: "#6c757d", margin: "0 0 4px", fontWeight: 500 }}>
                    Photo {idx + 1}{idx === 0 ? " (primary)" : ""}
                    {newPreview && <span style={{ color: "#00276b", marginLeft: "6px" }}>· New</span>}
                  </p>
                  <div
                    onClick={() => document.getElementById(`editVPhoto-${vehicle.id}-${idx}`).click()}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragOver={(e) => { e.preventDefault(); setDragActiveIdx(idx); }}
                    onDragLeave={() => setDragActiveIdx(null)}
                    style={{
                      border: `2px dashed ${dragActiveIdx === idx ? "#00276b" : "#dee2e6"}`,
                      borderRadius: "8px",
                      background: dragActiveIdx === idx ? "#f0f4ff" : "#fafafa",
                      cursor: "pointer",
                      height: "110px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                  >
                    {displaySrc ? (
                      <img src={displaySrc} alt={`Vehicle ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <p style={{ fontSize: "12px", color: "#adb5bd", margin: 0 }}>Drop or click</p>
                    )}
                    <input
                      id={`editVPhoto-${vehicle.id}-${idx}`}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handlePhotoSelect(e.target.files[0], idx)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionBlock>

      </Modal.Body>

      <Modal.Footer style={{ borderTop: "1px solid #f1f3f5", padding: "12px 20px" }}>
        <Button variant="secondary" onClick={onHide} style={{ fontSize: "13px" }}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          style={{ background: "#00276b", border: "none", fontSize: "13px" }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}