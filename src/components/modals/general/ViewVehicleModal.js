// src/components/modals/general/ViewVehicleModal.js
import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";

export default function ViewVehicleModal({ show, onHide, vehicle }) {
  const [activePhoto, setActivePhoto] = useState(0);

  if (!vehicle) return null;

  const photos = vehicle.photos || [];

  const InfoField = ({ label, value }) => (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: "8px" }}>
      <span style={{ fontSize: "11px", color: "#adb5bd", marginBottom: "2px", letterSpacing: "0.02em" }}>
        {label}
      </span>
      <span style={{ fontSize: "13px", color: "#343a40", fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );

  const SectionHeader = ({ title }) => (
    <p style={{
      fontSize: "11px", fontWeight: 600, color: "#00276b",
      letterSpacing: "0.06em", textTransform: "uppercase",
      borderBottom: "1.5px solid #e8edf5", paddingBottom: "6px",
      marginBottom: "12px", marginTop: "0",
    }}>
      {title}
    </p>
  );

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }} className="border-0">
        <Modal.Title style={{ fontSize: "15px", fontWeight: 500, color: "#fff" }}>Vehicle Details</Modal.Title>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body style={{ padding: "20px", maxHeight: "78vh", overflowY: "auto" }}>

        {/* Photo gallery */}
        {photos.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <img
              src={photos[activePhoto]}
              alt="Vehicle"
              style={{ width: "100%", height: "220px", objectFit: "cover", borderRadius: "8px", display: "block", marginBottom: "8px" }}
            />
            {photos.length > 1 && (
              <div style={{ display: "flex", gap: "6px" }}>
                {photos.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`thumb ${i + 1}`}
                    onClick={() => setActivePhoto(i)}
                    style={{
                      width: "60px", height: "44px", objectFit: "cover",
                      borderRadius: "4px", cursor: "pointer",
                      border: activePhoto === i ? "2px solid #00276b" : "2px solid transparent",
                      opacity: activePhoto === i ? 1 : 0.7,
                      transition: "opacity 0.15s, border-color 0.15s",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Header strip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <p style={{ fontSize: "11px", color: "#adb5bd", margin: "0 0 2px", letterSpacing: "0.04em" }}>{vehicle.id}</p>
            <p style={{ fontSize: "17px", fontWeight: 600, color: "#212529", margin: "0 0 2px" }}>{vehicle.vehicleType}</p>
            <p style={{ fontSize: "13px", color: "#6c757d", margin: 0 }}>{vehicle.vehicleModel}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "11px", color: "#adb5bd", margin: "0 0 2px" }}>Seats</p>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#00276b", margin: 0 }}>
              {vehicle.minimumSeatCount} – {vehicle.maximumSeatCount}
            </p>
          </div>
        </div>

        {/* Vehicle details */}
        <div style={{ marginBottom: "18px" }}>
          <SectionHeader title="Vehicle Details" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
            <InfoField label="Registration Number" value={vehicle.registrationNumber} />
            <InfoField label="Manufacture Year" value={vehicle.manufactureYear} />
            <InfoField label="Vehicle Make" value={vehicle.vehicleMake} />
            <InfoField label="Vehicle Model" value={vehicle.vehicleModel} />
            <InfoField label="Owner Name" value={vehicle.ownerName} />
            <InfoField label="Owner Contact" value={vehicle.ownerContact} />
            <InfoField label="Min. Seats" value={vehicle.minimumSeatCount} />
            <InfoField label="Max. Seats" value={vehicle.maximumSeatCount} />
          </div>
        </div>

      </Modal.Body>

      <Modal.Footer style={{ borderTop: "1px solid #f1f3f5", padding: "12px 20px" }}>
        <Button variant="secondary" onClick={onHide} style={{ fontSize: "13px" }}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}