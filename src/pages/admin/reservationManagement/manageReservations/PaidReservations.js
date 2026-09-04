// src/pages/admin/reservationManagement/manageReservations/PaidReservations.js
import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase";
import {
  getBookingType, getCustomerName, getArrivalDate, getTourName,
  getNights, getTravelers, getTotalPrice, getPaymentType,
  getRef, formatDate, typeBadgeStyle, typeLabel,
} from "./bookingCardHelpers";
import AdminPaidTourModal            from "../../../../components/modals/adminModals/tourReservationModals/AdminPaidTourModal";
import PresetBookedTourInvoiceModal  from "../../../../components/modals/bookings/PresetBookedTourInvoiceModal";
import CustomBookedTourInvoiceModal  from "../../../../components/modals/bookings/CustomBookedTourInvoiceModal";
import VehicleOnlyBookedInvoiceModal from "../../../../components/modals/bookings/VehicleOnlyBookedInvoiceModal";
import ViewPaymentProofModal         from "../../../../components/modals/bookings/ViewPaymentProofModal";
import GenerateReceiptModal          from "../../../../components/modals/adminModals/tourReservationModals/GenerateReceiptModal";
import MessageCustomerModal          from "../../../../components/modals/adminModals/tourReservationModals/MessageCustomerModal";
import ViewReceiptModal              from "../../../../components/modals/bookings/ViewReceiptModal";
import ConfirmTourModal              from "../../../../components/modals/adminModals/tourReservationModals/ConfirmTourModal";
import ViewCustomerModal             from "../../../../components/modals/general/ViewCustomerModal";

/* ── Flat button style ── */
const btn = (variant = "outline") => {
  const map = {
    primary: { background: "#00276b", color: "#fff",     border: "1px solid #00276b"            },
    outline: { background: "#fff",    color: "#00276b",  border: "1px solid rgba(0,39,107,0.3)" },
    info:    { background: "#e6f1fb", color: "#0c447c",  border: "1px solid #b5d4f4"            },
    success: { background: "#e1f5ee", color: "#085041",  border: "1px solid #9fe1cb"            },
    warn:    { background: "#faeeda", color: "#633806",  border: "1px solid #fac775"            },
    gray:    { background: "#f1f3f5", color: "#444441",  border: "1px solid #d3d1c7"            },
  };
  return { ...map[variant], fontSize: 11, padding: "4px 10px", cursor: "pointer", fontWeight: 500 };
};

export default function PaidReservations() {
  const [bookings,    setBookings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [unreadMap,   setUnreadMap]   = useState({});
  const [selectedBooking, setSelectedBooking] = useState(null);

  /* Modal visibility */
  const [showView,        setShowView]        = useState(false);
  const [showInvoice,     setShowInvoice]     = useState(false);
  const [showProof,       setShowProof]       = useState(false);
  const [showGenReceipt,  setShowGenReceipt]  = useState(false);
  const [showMessage,     setShowMessage]     = useState(false);
  const [showViewReceipt, setShowViewReceipt] = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);

  /* View customer */
  const [selectedCustomer,    setSelectedCustomer]    = useState(null);
  const [showViewCustomer,    setShowViewCustomer]    = useState(false);

  useEffect(() => {
    const cols = ["paidPresetBookings", "paidCustomBookings", "paidVehicleBookings"];
    const unsubs = cols.map(col =>
      onSnapshot(collection(db, col), snap => {
        setBookings(prev => {
          const others = prev.filter(b => !snap.docs.find(d => d.id === b.id));
          const fresh  = snap.docs.map(d => ({ id: d.id, _col: col, ...d.data() }));
          return [...others, ...fresh].sort((a, b) => {
            return new Date(getArrivalDate(a, getBookingType(a))) - new Date(getArrivalDate(b, getBookingType(b)));
          });
        });
        setLoading(false);
      })
    );
    return () => unsubs.forEach(u => u());
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "bookingMessages"), snap => {
      const map = {};
      snap.docs.forEach(d => { if (d.data().adminUnread > 0) map[d.id] = d.data().adminUnread; });
      setUnreadMap(map);
    });
    return () => unsub();
  }, []);

  const handleViewCustomer = async (booking) => {
    const uid   = booking.customerId || booking.uid;
    const email = booking.customerEmail || "";
    let customer = { email, id: uid || null };
    if (uid) {
      try {
        const snap = await getDoc(doc(db, "customers", uid));
        if (snap.exists()) customer = { id: snap.id, ...snap.data(), email };
      } catch (_) {}
    }
    setSelectedCustomer(customer);
    setShowViewCustomer(true);
  };

  const open = (booking, setter) => { setSelectedBooking(booking); setter(true); };

  if (loading) return <p style={{ color: "#7a9ab8", fontSize: 13 }}>Loading paid reservations...</p>;
  if (!bookings.length) return <p style={{ color: "#7a9ab8", fontSize: 13 }}>No paid reservations found.</p>;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {bookings.map(b => {
          const type = getBookingType(b);
          return (
            <div key={b.id} style={{ background: "#fff", border: "1px solid rgba(0,39,107,0.08)", overflow: "hidden" }}>
              {/* Stripe */}
              <div style={{ height: 3, background: "#fac775" }} />

              <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(0,39,107,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <span style={typeBadgeStyle(type)}>{typeLabel(type)}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: "#faeeda", color: "#633806", padding: "2px 8px" }}>PAID</span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#00276b", margin: "0 0 2px" }}>{getTourName(b, type)}</p>
                <p style={{ fontSize: 10, color: "#adc6d8", margin: "0 0 8px" }}>{getRef(b)} · Paid {formatDate(b.paidAt || b.bookedDateTime)}</p>

                {[
                  ["Customer", getCustomerName(b, type)],
                  ["Arrival",  getArrivalDate(b, type)],
                  ["Duration", getNights(b, type)],
                  ["Travelers",getTravelers(b, type)],
                  ["Payment",  getPaymentType(b)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: "#7a9ab8" }}>{k}</span>
                    <span style={{ color: "#00276b", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(0,39,107,0.06)" }}>
                  <span style={{ fontSize: 10, color: "#adc6d8" }}>Total</span>
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: "#00276b" }}>{getTotalPrice(b, type)}</span>
                </div>
              </div>

              <div style={{ padding: "10px 14px", background: "rgba(0,39,107,0.02)", display: "flex", flexWrap: "wrap", gap: 5 }}>
                <button style={btn("primary")} onClick={() => open(b, setShowView)}>View</button>
                <button style={btn("outline")} onClick={() => open(b, setShowInvoice)}>Invoice</button>
                <button style={btn("info")}    onClick={() => open(b, setShowProof)}>Payment Proof</button>
                <button style={btn("success")} onClick={() => open(b, setShowGenReceipt)}>Gen. Receipt</button>
                <button style={btn("success")} onClick={() => open(b, setShowConfirm)}>Confirm Tour</button>
                <button style={btn("warn")}    onClick={() => open(b, setShowMessage)}>
                  Message
                  {unreadMap[b.id] > 0 && (
                    <span style={{ display: "inline-block", background: "#e24b4a", color: "#fff", fontSize: 9, fontWeight: 700, width: 14, height: 14, lineHeight: "14px", textAlign: "center", marginLeft: 5, verticalAlign: "middle" }}>
                      {unreadMap[b.id]}
                    </span>
                  )}
                </button>
                <button style={btn("gray")} onClick={() => open(b, setShowViewReceipt)}>Receipt</button>
                <button style={btn("gray")} onClick={() => handleViewCustomer(b)}>View Customer</button>
              </div>
            </div>
          );
        })}
      </div>

      <AdminPaidTourModal show={showView} onHide={() => setShowView(false)} booking={selectedBooking} />

      {selectedBooking && getBookingType(selectedBooking) === "preset" && <PresetBookedTourInvoiceModal  show={showInvoice} onHide={() => setShowInvoice(false)} b={selectedBooking} selectedBooking={selectedBooking} />}
      {selectedBooking && getBookingType(selectedBooking) === "custom" && <CustomBookedTourInvoiceModal  show={showInvoice} onHide={() => setShowInvoice(false)} b={selectedBooking} selectedBooking={selectedBooking} />}
      {selectedBooking && getBookingType(selectedBooking) === "vehicle"&& <VehicleOnlyBookedInvoiceModal show={showInvoice} onHide={() => setShowInvoice(false)} b={selectedBooking} selectedBooking={selectedBooking} />}

      <ViewPaymentProofModal show={showProof}       onHide={() => setShowProof(false)}       booking={selectedBooking} />
      <GenerateReceiptModal  show={showGenReceipt}  onHide={() => setShowGenReceipt(false)}  booking={selectedBooking} />
      <MessageCustomerModal  show={showMessage}     onHide={() => setShowMessage(false)}     booking={selectedBooking} />
      <ViewReceiptModal      show={showViewReceipt} onHide={() => setShowViewReceipt(false)} booking={selectedBooking} />
      <ConfirmTourModal      show={showConfirm}     onHide={() => setShowConfirm(false)}     booking={selectedBooking} onConfirmed={() => setShowConfirm(false)} />
      <ViewCustomerModal     show={showViewCustomer} onHide={() => { setShowViewCustomer(false); setSelectedCustomer(null); }} customer={selectedCustomer} />
    </>
  );
}