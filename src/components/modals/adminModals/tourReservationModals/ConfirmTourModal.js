// src/components/modals/adminModals/tourReservationModals/ConfirmTourModal.js
import React, { useState, useEffect } from "react";
import { Modal, Button } from "react-bootstrap";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../firebase";
import { getBookingType, getCustomerName, getTourName, getArrivalDate, getTotalPrice } from "../../../../pages/admin/reservationManagement/manageReservations/bookingCardHelpers";
import { sendCustomerNotification, NOTIF_TYPES } from "../../../../utils/notificationHelper";


const sourceMap = {
  preset: "paidPresetBookings",
  custom: "paidCustomBookings",
  vehicle: "paidVehicleBookings",
};

const destMap = {
  preset: "confirmedPresetBookings",
  custom: "confirmedCustomBookings",
  vehicle: "confirmedVehicleBookings",
};

export default function ConfirmTourModal({ show, onHide, booking, onConfirmed }) {
  const [hasReceipt, setHasReceipt] = useState(false);
  const [checking, setChecking] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const type = booking ? getBookingType(booking) : null;

  useEffect(() => {
    if (!booking || !show) return;
    setConfirmed(false);
    setChecking(true);
    const check = async () => {
      const snap = await getDoc(doc(db, sourceMap[type], booking.id));
      setHasReceipt(!!(snap.exists() && snap.data().receiptId));
      setChecking(false);
    };
    check();
  }, [booking, show]);

  const handleConfirm = async () => {
    if (!booking || !hasReceipt) return;
    setConfirming(true);
    try {
      const srcSnap = await getDoc(doc(db, sourceMap[type], booking.id));
      if (!srcSnap.exists()) throw new Error("Booking not found.");

      await setDoc(doc(db, destMap[type], booking.id), {
        ...srcSnap.data(),
        confirmedAt: serverTimestamp(),
        status: "confirmed",
      });

      // Inside the confirm handler, after moving booking to confirmed collection:
      await sendCustomerNotification({
        customerId:       booking.customerId || booking.uid || null,
        customerEmail:    booking.customerEmail,
        bookingId:        booking.id,
        bookingReference: booking.bookingReference || booking.id,
        bookingType:      getBookingType(booking),
        type:             NOTIF_TYPES.TOUR_CONFIRMED,
        title:            "Your tour has been confirmed!",
        message:          "Great news — our team has reviewed your payment and officially confirmed your tour. Check your booking for details.",
        data:             {},
      });



      await deleteDoc(doc(db, sourceMap[type], booking.id));

      setConfirmed(true);
      onConfirmed?.();
    } catch (err) {
      console.error(err);
      alert("Confirmation failed: " + err.message);
    } finally {
      setConfirming(false);
    }
  };

  if (!booking) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton style={{ backgroundColor: "#00276b", color: "#fff" }}>
        <Modal.Title style={{ fontSize: "15px", fontWeight: 500, color: "#fff" }}>Confirm Reservation</Modal.Title>
        <style>{`.btn-close { filter: brightness(0) invert(1); }`}</style>
      </Modal.Header>

      <Modal.Body style={{ padding: "20px" }}>
        {confirmed ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#eaf3de", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <span style={{ fontSize: "22px", color: "#3b6d11" }}>✓</span>
            </div>
            <p style={{ fontWeight: 600, color: "#212529", margin: "0 0 4px" }}>Reservation Confirmed!</p>
            <p style={{ fontSize: "12px", color: "#6c757d", margin: 0 }}>
              {booking.id} has been moved to Confirmed Reservations.
            </p>
          </div>
        ) : checking ? (
          <p style={{ color: "#adb5bd", textAlign: "center", padding: "20px" }}>Checking payment status...</p>
        ) : (
          <>
            {/* Booking summary */}
            <div style={{ background: "#f8f9fa", borderRadius: "8px", padding: "12px 14px", marginBottom: "14px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#212529", margin: "0 0 4px" }}>{getTourName(booking, type)}</p>
              <p style={{ fontSize: "12px", color: "#6c757d", margin: "0 0 2px" }}>{getCustomerName(booking, type)}</p>
              <p style={{ fontSize: "12px", color: "#6c757d", margin: "0 0 2px" }}>Arrival: {getArrivalDate(booking, type)}</p>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#00276b", margin: 0 }}>{getTotalPrice(booking, type)}</p>
            </div>

            {!hasReceipt ? (
              <div style={{ background: "#fcebeb", border: "1px solid #f7c1c1", borderRadius: "8px", padding: "12px 14px" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#791f1f", fontWeight: 500 }}>Receipt not generated</p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#791f1f" }}>
                  You must generate a payment receipt before confirming this reservation. Use the "Gen. Receipt" button first.
                </p>
              </div>
            ) : (
              <div style={{ background: "#eaf3de", border: "1px solid #c0dd97", borderRadius: "8px", padding: "12px 14px" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#27500a", fontWeight: 500 }}>Payment verified</p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#3b6d11" }}>
                  Receipt found. This booking will be moved to Confirmed Reservations.
                </p>
              </div>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer style={{ padding: "12px 20px", borderTop: "1px solid #f1f3f5" }}>
        {confirmed ? (
          <Button style={{ background: "#00276b", border: "none", fontSize: "13px" }} onClick={onHide}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onHide} style={{ fontSize: "13px" }}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={!hasReceipt || confirming || checking}
              style={{ background: "#00276b", border: "none", fontSize: "13px", opacity: !hasReceipt ? 0.5 : 1 }}
            >
              {confirming ? "Confirming..." : "Confirm Reservation"}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}