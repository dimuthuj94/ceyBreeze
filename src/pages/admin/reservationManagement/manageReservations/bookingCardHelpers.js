// src/pages/admin/reservationManagement/manageReservations/bookingCardHelpers.js
export const getBookingType = (b) => {
  if (b.tourType === "vehicle-only" || b.vehicles) return "vehicle";
  if (b["Tour Selection"] || b["Traveler Details"]) return "custom";
  return "preset";
};
export const getCustomerName = (b, type) => {
  if (type === "vehicle") return b.customerName || "N/A";
  if (type === "custom")  return b["Traveler Details"]?.["Full Name"] || b.customerEmail || "N/A";
  return b.Travelers?.["Full Name"] || b.customerEmail || "N/A";
};
export const getArrivalDate = (b, type) => {
  if (type === "vehicle") return b.arrivalDate || "N/A";
  if (type === "custom")  return b["Traveler Details"]?.["Arrival Date"] || "N/A";
  return b.Travelers?.["Arrival Date"] || "N/A";
};
export const getTourName = (b, type) => {
  if (type === "vehicle") return "Vehicle Reservation";
  if (type === "custom")  return b["Tour Selection"]?.Tour || "Custom Tour";
  return b["Tour Info"]?.Tour || "Preset Tour";
};
export const getNights = (b, type) => {
  if (type === "vehicle") return `${b.days || 0} days`;
  if (type === "custom")  return `${b["Tour Selection"]?.Nights || 0} nights`;
  return `${b["Tour Info"]?.Nights || 0} nights`;
};
export const getTravelers = (b, type) => {
  if (type === "vehicle") {
    const total = (b.vehicles || []).reduce((s, v) => s + (v.quantity || 0), 0);
    return `${total} vehicle(s)`;
  }
  const src = type === "custom" ? b["Traveler Details"] : b.Travelers;
  const a = src?.Adults || 0; const c = src?.Children || 0;
  const parts = [];
  if (a) parts.push(`${a} Adult${a > 1 ? "s" : ""}`);
  if (c) parts.push(`${c} Child${c > 1 ? "ren" : ""}`);
  return parts.join(", ") || "N/A";
};
export const getTotalPrice  = (b, type) => type === "vehicle" ? `$${b.totalPrice || 0}` : b["Pricing Summary"]?.["Total Price"] || "$0";
export const getPaymentType = (b) => b.paymentType || (b.paymentAmount === "half" ? "50% Advance" : "Full Payment");
export const getRef         = (b) => b.bookingReference || b.bookingId || b.id || "N/A";
export const formatDate     = (ts) => {
  if (!ts) return "N/A";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
export const typeBadgeStyle = (type) => {
  const map = {
    preset:  { background: "#e6f1fb", color: "#0c447c" },
    custom:  { background: "#e1f5ee", color: "#085041" },
    vehicle: { background: "#faeeda", color: "#633806" },
  };
  return {
    ...map[type],
    display: "inline-block", fontSize: "10px", fontWeight: 700,
    padding: "2px 9px", marginBottom: "6px",
    textTransform: "uppercase", letterSpacing: "0.05em",
    /* NO borderRadius — flat theme */
  };
};
export const typeLabel = (type) =>
  ({ preset: "Preset Tour", custom: "Custom Tour", vehicle: "Vehicle Only" })[type];