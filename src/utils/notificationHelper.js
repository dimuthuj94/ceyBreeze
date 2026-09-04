// src/utils/notificationHelper.js
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/* ── Notification type registry ── */
export const NOTIF_TYPES = {
  RECEIPT_AVAILABLE:    "receipt_available",
  TOUR_CONFIRMED:       "tour_confirmed",
  DRIVER_ASSIGNED:      "driver_assigned",
  VEHICLE_ASSIGNED:     "vehicle_assigned",
  DRIVER_CHANGED:       "driver_changed",
  VEHICLE_CHANGED:      "vehicle_changed",
  TOUR_STARTED:         "tour_started",
  TOUR_COMPLETED:       "tour_completed",
  BALANCE_UPDATED:      "balance_updated",
  REFUND_PROCESSED:     "refund_processed",
  PRICE_ADJUSTED:       "price_adjusted",
  MESSAGE_RECEIVED:     "message_received",
  DELETION_APPROVED:    "deletion_approved",
  DELETION_REJECTED:    "deletion_rejected",
  DATE_CHANGE_APPROVED: "date_change_approved",
  DATE_CHANGE_REJECTED: "date_change_rejected",
  BOOKING_PAYMENT_RECEIVED: "booking_payment_received",
  TOUR_REMINDER:        "tour_reminder",
  ITINERARY_UPDATED:    "itinerary_updated",
};

/* ── Metadata per type (icon, color, label) ── */
export const NOTIF_META = {
  receipt_available:     { icon: "🧾", color: "#27a86e", bg: "#e1f5ee", label: "Receipt Available" },
  tour_confirmed:        { icon: "✅", color: "#0c447c", bg: "#e6f1fb", label: "Tour Confirmed" },
  driver_assigned:       { icon: "🧑‍✈️", color: "#00276b", bg: "#eef2ff", label: "Driver Assigned" },
  vehicle_assigned:      { icon: "🚐", color: "#00276b", bg: "#eef2ff", label: "Vehicle Assigned" },
  driver_changed:        { icon: "🔄", color: "#633806", bg: "#faeeda", label: "Driver Updated" },
  vehicle_changed:       { icon: "🔄", color: "#633806", bg: "#faeeda", label: "Vehicle Updated" },
  tour_started:          { icon: "🏁", color: "#0c447c", bg: "#e6f1fb", label: "Tour Started" },
  tour_completed:        { icon: "🎉", color: "#6b21a8", bg: "#f3e8ff", label: "Tour Completed" },
  balance_updated:       { icon: "💰", color: "#27a86e", bg: "#e1f5ee", label: "Balance Updated" },
  refund_processed:      { icon: "💸", color: "#27a86e", bg: "#e1f5ee", label: "Refund Processed" },
  price_adjusted:        { icon: "💲", color: "#633806", bg: "#faeeda", label: "Price Adjusted" },
  message_received:      { icon: "💬", color: "#0c447c", bg: "#e6f1fb", label: "New Message" },
  deletion_approved:     { icon: "✅", color: "#27a86e", bg: "#e1f5ee", label: "Cancellation Approved" },
  deletion_rejected:     { icon: "❌", color: "#791f1f", bg: "#fcebeb", label: "Cancellation Rejected" },
  date_change_approved:  { icon: "📅", color: "#27a86e", bg: "#e1f5ee", label: "Date Change Approved" },
  date_change_rejected:  { icon: "📅", color: "#791f1f", bg: "#fcebeb", label: "Date Change Rejected" },
  booking_payment_received: { icon: "💳", color: "#27a86e", bg: "#e1f5ee", label: "Payment Received" },
  tour_reminder:         { icon: "🔔", color: "#633806", bg: "#faeeda", label: "Tour Reminder" },
  itinerary_updated:     { icon: "📋", color: "#0c447c", bg: "#e6f1fb", label: "Itinerary Updated" },
};

/*
 * sendCustomerNotification
 * ─────────────────────────
 * Writes a document to customerNotifications.
 *
 * Required params:
 *   customerId      — Firebase Auth UID of the customer
 *   customerEmail   — customer email (fallback query field)
 *   bookingId       — Firestore document ID of the booking
 *   bookingReference— human-readable booking ref (e.g. PRESETBOOK-20250101-001)
 *   bookingType     — "preset" | "custom" | "vehicle"
 *   type            — one of NOTIF_TYPES values
 *   title           — short title string
 *   message         — full message string
 *   data            — optional extra payload object
 */
export const sendCustomerNotification = async ({
  customerId,
  customerEmail,
  bookingId,
  bookingReference,
  bookingType,
  type,
  title,
  message,
  data = {},
}) => {
  if (!customerId && !customerEmail) {
    console.warn("sendCustomerNotification: no customerId or customerEmail provided.");
    return;
  }
  await addDoc(collection(db, "customerNotifications"), {
    customerId:       customerId   || null,
    customerEmail:    customerEmail || null,
    bookingId,
    bookingReference: bookingReference || bookingId,
    bookingType:      bookingType || null,
    type,
    title,
    message,
    data,
    read:      false,
    createdAt: serverTimestamp(),
  });
};