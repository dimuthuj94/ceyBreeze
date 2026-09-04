import React from "react";
import { Modal, Button, Image } from "react-bootstrap";

export default function ViewDriverModal({ show, onHide, driver, onDelete, onUploadPhoto }) {
  if (!driver) return null;

  const InfoField = ({ label, value, full = false }) => (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: full ? "10px" : "0" }}>
      <span style={{ fontSize: "11px", color: "#adb5bd", marginBottom: "2px", letterSpacing: "0.02em" }}>
        {label}
      </span>
      <span style={{ fontSize: "13px", color: "#343a40" }}>{value || "—"}</span>
    </div>
  );

  const SectionHeader = ({ title }) => (
    <p style={{
      fontSize: "11px", fontWeight: 500, color: "#00276b",
      letterSpacing: "0.06em", textTransform: "uppercase",
      borderBottom: "1.5px solid #e8edf5", paddingBottom: "6px",
      marginBottom: "12px", marginTop: "0"
    }}>
      {title}
    </p>
  );

  const initials = driver.callingName
    ?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <Modal.Header
        closeButton
        style={{ backgroundColor: "#00276b", color: "#fff" }}
        className="border-0"
      >
        <Modal.Title style={{ fontSize: "16px", fontWeight: 500 }}>Driver Details</Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: "20px" }}>

        {/* Profile row */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          {driver.photo ? (
            <Image
              src={driver.photo}
              roundedCircle
              style={{ width: "72px", height: "72px", objectFit: "cover", border: "3px solid #00276b", flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: "72px", height: "72px", borderRadius: "50%",
              background: "#e8edf5", border: "3px solid #00276b",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "22px", fontWeight: 500, color: "#00276b", flexShrink: 0
            }}>
              {initials}
            </div>
          )}
          <div>
            <p style={{ fontSize: "11px", color: "#adb5bd", margin: "0 0 3px", letterSpacing: "0.04em" }}>
              {driver.id}
            </p>
            <p style={{ fontSize: "17px", fontWeight: 500, color: "#212529", margin: "0 0 2px" }}>
              {driver.title} {driver.callingName}
            </p>
            <p style={{ fontSize: "13px", color: "#6c757d", margin: 0 }}>
              {driver.gender}{driver.birthday ? ` · Born ${driver.birthday}` : ""}
            </p>
          </div>
        </div>

        {/* Contact & Address */}
        <div style={{ marginBottom: "18px" }}>
          <SectionHeader title="Contact & Address" />
          <InfoField label="Address" value={driver.address} full />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
            <InfoField label="Mobile" value={driver.mobile} />
            <InfoField label="Home" value={driver.home} />
          </div>
        </div>

        {/* Identification */}
        <div>
          <SectionHeader title="Identification" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
            <InfoField label="NIC Number" value={driver.nic} />
            <InfoField label="Driving License" value={driver.dl} />
            <InfoField label="Permit No." value={driver.permit} />
          </div>
        </div>

      </Modal.Body>

      <Modal.Footer style={{ borderTop: "1px solid #f1f3f5", padding: "12px 20px" }}>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}