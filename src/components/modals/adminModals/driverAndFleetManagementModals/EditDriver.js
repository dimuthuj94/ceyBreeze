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
};// --- paste your existing SectionBlock and Field helpers here ---

export default function EditDriver({ show, onHide, driver, onSave }) {
  const [form, setForm] = useState({});
  const [preview, setPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileKey, setFileKey] = useState(Date.now());

  useEffect(() => {
    if (driver) {
      const parts = driver.address?.split(",") || [];
      setForm({
        ...driver,
        house: parts[0]?.trim() || "",
        street1: parts[1]?.trim() || "",
        street2: parts[2]?.trim() || "",
        city: parts[3]?.trim() || "",
        postalCode: parts[4]?.trim() || "",
      });
      setPreview(null);
      setPhotoFile(null);
      setFileKey(Date.now());
    }
  }, [driver]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileSelect = (file) => {
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    const address = `${form.house}, ${form.street1}, ${form.street2}, ${form.city}, ${form.postalCode}`;
    let updatedData = { ...form, address };

    if (photoFile) {
      const storageRef = ref(storage, `drivers/${driver.id}`);
      await uploadBytes(storageRef, photoFile);
      updatedData.photo = await getDownloadURL(storageRef);
    }

    onSave(updatedData);
  };

  if (!driver) return null;

  const initials = driver.callingName?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }}>
        <Modal.Title style={{ fontSize: "15px", fontWeight: 500, color: "#fff" }}>Edit Driver</Modal.Title>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body style={{ padding: "20px", maxHeight: "75vh", overflowY: "auto" }}>

        {/* --- Personal, Address, Contact, Identification sections unchanged --- */}
        <SectionBlock title="Personal Information">
          <div style={{ background: "#f8f9fa", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px", border: "1px solid #e9ecef" }}>
          <p style={{ fontSize: "11px", color: "#adb5bd", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Read-only — Personal &amp; Identification</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 16px" }}>
            {[["Full Name", driver?.fullName], ["NIC", driver?.nic], ["DL No.", driver?.dl], ["Gender", driver?.gender], ["Birthday", driver?.birthday]].map(([label, value]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "10px", color: "#adb5bd" }}>{label}</span>
                <span style={{ fontSize: "12px", color: "#6c757d", fontWeight: 500 }}>{value || "—"}</span>
              </div>
            ))}
          </div>
        </div>
        </SectionBlock>

         {/* EDITABLE — Address */}
        <SectionBlock title="Address">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
            <div style={{ gridColumn: "1/-1" }}><Field label="House No / Name"><Form.Control name="house" value={form.house || ""} onChange={handleChange} style={inputStyle} /></Field></div>
            <Field label="Street Line 1"><Form.Control name="street1" value={form.street1 || ""} onChange={handleChange} style={inputStyle} /></Field>
            <Field label="Street Line 2"><Form.Control name="street2" value={form.street2 || ""} onChange={handleChange} style={inputStyle} /></Field>
            <Field label="City"><Form.Control name="city" value={form.city || ""} onChange={handleChange} style={inputStyle} /></Field>
            <Field label="Postal Code"><Form.Control name="postalCode" value={form.postalCode || ""} onChange={handleChange} style={inputStyle} /></Field>
          </div>
        </SectionBlock>

        {/* EDITABLE — Contact */}
        <SectionBlock title="Contact">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
            <Field label="Mobile Number"><Form.Control name="mobile" value={form.mobile || ""} onChange={handleChange} style={inputStyle} /></Field>
            <Field label="Home Number"><Form.Control name="home" value={form.home || ""} onChange={handleChange} style={inputStyle} /></Field>
          </div>
        </SectionBlock>

        {/* EDITABLE — Permit only */}
        <SectionBlock title="Permit">
          <Field label="Permit Number"><Form.Control name="permit" value={form.permit || ""} onChange={handleChange} style={inputStyle} /></Field>
        </SectionBlock>

        {/* ── Photo Section ── */}
        <SectionBlock title="Driver Photo">

          {/* Current photo preview */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "14px" }}>
            {(preview || driver.photo) ? (
              <img
                src={preview || driver.photo}
                alt="Driver"
                style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", border: "3px solid #00276b", flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: "72px", height: "72px", borderRadius: "50%",
                background: "#e8edf5", border: "3px solid #00276b",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", fontWeight: 500, color: "#00276b", flexShrink: 0,
              }}>
                {initials}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <span style={{ fontSize: "11px", color: "#adb5bd" }}>Current photo</span>
              <span style={{ fontSize: "12px", color: "#495057", fontWeight: 500 }}>
                {driver.title} {driver.callingName}
              </span>
              {preview && (
                <span style={{ fontSize: "11px", color: "#00276b" }}>
                  New photo selected: {photoFile?.name}
                </span>
              )}
              {!preview && (
                <span style={{ fontSize: "11px", color: "#adb5bd" }}>Upload a new photo below to replace it</span>
              )}
            </div>
          </div>

          {/* Drag & drop zone */}
          <div
            onClick={() => document.getElementById(`editFileInput-${driver.id}`).click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            style={{
              border: `2px dashed ${dragActive ? "#00276b" : "#dee2e6"}`,
              borderRadius: "10px",
              padding: "24px",
              textAlign: "center",
              cursor: "pointer",
              background: dragActive ? "#f0f4ff" : "#fafafa",
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            <p style={{ fontSize: "13px", fontWeight: 500, color: "#495057", margin: "0 0 4px" }}>
              Drag &amp; Drop New Photo Here
            </p>
            <p style={{ fontSize: "12px", color: "#adb5bd", margin: 0 }}>
              or click to browse &nbsp;·&nbsp; JPG, PNG accepted
            </p>
            <input
              key={fileKey}
              id={`editFileInput-${driver.id}`}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />
          </div>

        </SectionBlock>

      </Modal.Body>

      <Modal.Footer style={{ borderTop: "1px solid #f1f3f5", padding: "12px 20px" }}>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button style={{ background: "#00276b", border: "none" }} onClick={handleSubmit}>
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
}