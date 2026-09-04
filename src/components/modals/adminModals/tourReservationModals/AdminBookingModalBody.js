// src/components/modals/adminModals/tourReservationModals/AdminBookingModalBody.js
import React from "react";
import { getBookingType, getCustomerName, getArrivalDate, getTourName,
  getNights, getTravelers, getTotalPrice, getPaymentType, getRef,
  formatDate, typeBadgeStyle, typeLabel } from "../../../../pages/admin/reservationManagement/manageReservations/bookingCardHelpers";

const SectionBlock = ({ title, children }) => (
  <div style={{ border: "1px solid #e9ecef", borderRadius: "8px", overflow: "hidden", marginBottom: "14px" }}>
    <div style={{ background: "#f8f9fa", padding: "7px 14px", borderBottom: "1px solid #e9ecef", display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#00276b", flexShrink: 0 }} />
      <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#00276b", letterSpacing: "0.05em", textTransform: "uppercase" }}>{title}</p>
    </div>
    <div style={{ padding: "10px 14px" }}>{children}</div>
  </div>
);

const FieldRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "3px 0", borderBottom: "1px solid #f8f9fa" }}>
    <span style={{ color: "#6c757d" }}>{label}</span>
    <span style={{ fontWeight: 500, color: "#212529" }}>{value || "N/A"}</span>
  </div>
);

export default function AdminBookingModalBody({ booking }) {
  if (!booking) return null;
  const type = getBookingType(booking);

  const renderSections = () => {
    const sections = booking.sectionOrder || (type === "vehicle"
      ? ["Booking Details", "Vehicles", "Pricing Summary"]
      : type === "custom"
      ? ["Tour Selection", "Traveler Details", "Accommodation", "Transport Options", "Tour Inclusions", "Locations, Adventures and Activities", "Meals & Notes", "Pricing Summary"]
      : ["Tour Info", "Travelers", "Accommodation", "Transport Options", "Tour Inclusions", "Daily Plan & Destinations", "Meals & Notes", "Pricing Summary"]);

    if (type === "vehicle") {
      return (
        <>
          <SectionBlock title="Booking Details">
            <FieldRow label="Customer Name" value={booking.customerName} />
            <FieldRow label="Email" value={booking.customerEmail} />
            <FieldRow label="Arrival Date" value={booking.arrivalDate} />
            <FieldRow label="Departure Date" value={booking.departureDate} />
            <FieldRow label="Duration" value={`${booking.days} days`} />
          </SectionBlock>
          <SectionBlock title="Vehicles">
            {(booking.vehicles || []).map((v, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "3px 0", borderBottom: "1px solid #f8f9fa" }}>
                <span style={{ color: "#6c757d" }}>{v.id} × {v.quantity}</span>
                <span style={{ fontWeight: 500 }}>${v.pricePerDay}/day · ${v.subtotal}</span>
              </div>
            ))}
          </SectionBlock>
          <SectionBlock title="Pricing Summary">
            <FieldRow label="Total Price" value={`$${booking.totalPrice}`} />
            <FieldRow label="Payment Method" value={booking.paymentMethod} />
            <FieldRow label="Payment Amount" value={`$${booking.paymentAmountValue?.toLocaleString() || booking.totalPrice}`} />
          </SectionBlock>
        </>
      );
    }

    return sections.map((section) => {
      const content = booking[section];
      if (!content) return null;
      const entries = typeof content === "object" && !Array.isArray(content)
        ? Object.entries(content).filter(([, v]) => v !== null && v !== undefined && v !== "")
        : [];
      if (!entries.length && !Array.isArray(content)) return null;
      return (
        <SectionBlock key={section} title={section}>
          {entries.map(([k, v]) => (
            <FieldRow key={k} label={k} value={Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v)} />
          ))}
          {Array.isArray(content) && content.map((item, i) => (
            <p key={i} style={{ fontSize: "13px", color: "#495057", margin: "2px 0" }}>- {typeof item === "object" ? JSON.stringify(item) : item}</p>
          ))}
        </SectionBlock>
      );
    });
  };

  return (
    <div style={{ padding: "18px 20px" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "18px" }}>
        <div style={{ flexGrow: 1 }}>
          <span style={typeBadgeStyle(type)}>{typeLabel(type)}</span>
          <p style={{ fontSize: "16px", fontWeight: 600, color: "#212529", margin: "4px 0 2px" }}>{getTourName(booking, type)}</p>
          <p style={{ fontSize: "12px", color: "#adb5bd", margin: 0 }}>{getRef(booking)}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "11px", color: "#adb5bd", margin: "0 0 2px" }}>Total</p>
          <p style={{ fontSize: "18px", fontWeight: 600, color: "#00276b", margin: 0 }}>{getTotalPrice(booking, type)}</p>
        </div>
      </div>

      {/* Quick summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", background: "#f8f9fa", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
        {[
          ["Customer", getCustomerName(booking, type)],
          ["Arrival Date", getArrivalDate(booking, type)],
          ["Duration", getNights(booking, type)],
          ["Travelers", getTravelers(booking, type)],
          ["Payment", getPaymentType(booking)],
          ["Email", booking.customerEmail || "N/A"],
        ].map(([label, value]) => (
          <div key={label} style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "11px", color: "#adb5bd" }}>{label}</span>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "#212529" }}>{value}</span>
          </div>
        ))}
      </div>

      {renderSections()}
    </div>
  );
}